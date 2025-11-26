/**
 * M-Pesa Statement Upload Controller
 * Handles PDF upload, parsing, and tenant matching
 */

import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { Tenant, PaymentHistory, ActivityLog } from '../database';
import { extractTextFromPDF, validatePDFFile } from '../utils/pdfParser';
import { parseStatementTransactions, getTransactionSummary } from '../utils/transactionParser';
import { matchTransactionsToTenants, getMatchingStatistics, TenantInfo } from '../utils/tenantMatcher';
import { broadcastToUser } from '../websocket';

// Extend Express Request to include session
declare module 'express-session' {
  interface SessionData {
    userId: string;
    userRole: 'landlord' | 'tenant';
  }
}

// Create Mongoose models for M-Pesa collections
const MpesaStatementUploadSchema = new mongoose.Schema({
  landlordId: { type: String, required: true },
  fileName: { type: String, required: true },
  uploadDate: { type: Date, default: Date.now },
  statementPeriod: {
    start: Date,
    end: Date,
  },
  totalTransactions: { type: Number, default: 0 },
  parsedTransactions: { type: Number, default: 0 },
  matchedTransactions: { type: Number, default: 0 },
  status: { type: String, enum: ['pending_review', 'approved', 'rejected'], default: 'pending_review' },
  processedBy: String,
  processedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const MpesaTransactionMatchSchema = new mongoose.Schema({
  statementId: { type: String, required: true },
  landlordId: { type: String, required: true },
  transaction: {
    receiptNo: String,
    completionTime: String,
    date: Date,
    details: String,
    senderPhone: String,
    senderPhoneLast3: String,
    senderName: String,
    amount: Number,
    balance: Number,
  },
  matchedTenant: {
    tenantId: String,
    tenantName: String,
    tenantPhone: String,
    propertyName: String,
    unitNumber: String,
    phoneScore: Number,
    nameScore: Number,
    amountScore: Number,
    overallScore: Number,
    confidence: { type: String, enum: ['high', 'medium', 'low', 'none'] },
    matchType: { type: String, enum: ['perfect', 'good', 'partial', 'weak', 'none'] },
  },
  alternativeMatches: [{
    tenantId: String,
    tenantName: String,
    overallScore: Number,
  }],
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'manual'], default: 'pending' },
  reviewNotes: String,
  approvedBy: String,
  approvedAt: Date,
  recordedPaymentId: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const MpesaStatementUpload = mongoose.model('MpesaStatementUpload', MpesaStatementUploadSchema);
const MpesaTransactionMatch = mongoose.model('MpesaTransactionMatch', MpesaTransactionMatchSchema);

// Configure multer for PDF upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'mpesa-statements');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `mpesa-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const isValid = validatePDFFile(file.originalname, file.mimetype);
    if (isValid) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  }
});

export const uploadMiddleware = upload.single('statement');

/**
 * Upload and parse M-Pesa statement
 * POST /api/mpesa/upload-statement
 */
export async function uploadMpesaStatement(req: Request, res: Response) {
  try {
    console.log('🔍 Session data:', {
      userId: req.session?.userId,
      userRole: req.session?.userRole,
      sessionID: req.sessionID,
      hasSession: !!req.session
    });
    
    const landlordId = req.session?.userId;
    
    if (!landlordId || req.session?.userRole !== 'landlord') {
      console.log('❌ Unauthorized - Missing landlordId or not landlord role');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const password = req.body.password; // Optional password for encrypted PDFs
    const filePath = req.file.path;

    console.log('📄 Processing M-Pesa statement:', req.file.originalname);

    // Step 1: Extract text from PDF
    console.log('1️⃣  Extracting text from PDF...');
    const text = await extractTextFromPDF(filePath, password);
    console.log(`✅ Extracted ${text.length} characters`);

    // Step 2: Parse transactions
    console.log('2️⃣  Parsing transactions...');
    console.log('📄 First 500 characters of extracted text:');
    console.log(text.substring(0, 500));
    console.log('📄 Searching for "Paid In" keyword:', text.includes('Paid In'));
    console.log('📄 Searching for alternative keywords:', {
      'Paid in': text.includes('Paid in'),
      'PAID IN': text.includes('PAID IN'),
      'paid in': text.includes('paid in'),
      'PaidIn': text.includes('PaidIn'),
    });
    
    const transactions = parseStatementTransactions(text);
    const summary = getTransactionSummary(transactions);
    console.log(`✅ Found ${transactions.length} "Paid In" transactions`);

    if (transactions.length === 0) {
      console.log('❌ No transactions found. Possible reasons:');
      console.log('   - Text format doesn\'t match expected M-Pesa statement pattern');
      console.log('   - Column headers might be different (check for "Paid In", "Received", "Credit", etc.)');
      console.log('   - PDF might be scanned image without extractable text');
      
      // Save a sample of the text for debugging
      console.log('📝 Full extracted text (first 1000 chars):');
      console.log(text.substring(0, 1000));
      
      // Clean up file
      await fs.unlink(filePath);
      return res.status(400).json({ 
        error: 'No transactions found in statement',
        message: 'The PDF does not appear to contain any M-Pesa "Paid In" transactions. Please ensure the PDF is a valid M-Pesa statement with transaction data.'
      });
    }

    // Step 3: Get landlord's tenants
    console.log('3️⃣  Fetching landlord tenants...');
    const tenantsData = await Tenant.find({ 'apartmentInfo.landlordId': landlordId }).lean();

    const tenants: TenantInfo[] = tenantsData.map((t: any) => ({
      id: t._id.toString(),
      fullName: t.fullName,
      phone: t.phone || '',
      rentAmount: parseFloat(t.apartmentInfo?.rentAmount || '0'),
      propertyName: t.apartmentInfo?.propertyName,
      unitNumber: t.apartmentInfo?.unitNumber,
    }));

    console.log(`✅ Found ${tenants.length} registered tenants`);

    // Step 4: Match transactions to tenants
    console.log('4️⃣  Matching transactions to tenants...');
    const matchResults = matchTransactionsToTenants(transactions, tenants);
    const matchStats = getMatchingStatistics(matchResults);
    console.log(`✅ Matched ${matchStats.matched} / ${matchStats.total} transactions`);

    // Step 5: Save to database
    console.log('5️⃣  Saving to database...');
    
    // Create statement upload record
    const statementUpload = {
      landlordId,
      fileName: req.file.originalname,
      uploadDate: new Date(),
      statementPeriod: {
        start: summary.dateRange.start,
        end: summary.dateRange.end,
      },
      totalTransactions: transactions.length,
      parsedTransactions: transactions.length,
      matchedTransactions: matchStats.matched,
      status: 'pending_review' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const statementDoc = await MpesaStatementUpload.create(statementUpload);
    const statementId = statementDoc._id.toString();

    // Create transaction match records
    const transactionMatches = matchResults.map(result => ({
      statementId,
      landlordId,
      transaction: {
        receiptNo: result.transaction.receiptNo,
        completionTime: result.transaction.completionTime,
        date: result.transaction.date,
        details: result.transaction.details,
        senderPhone: result.transaction.senderPhone,
        senderPhoneLast3: result.transaction.senderPhoneLast3,
        senderName: result.transaction.senderName,
        amount: result.transaction.amount,
        balance: result.transaction.balance,
      },
      matchedTenant: result.bestMatch ? {
        tenantId: result.bestMatch.tenant.id.toString(),
        tenantName: result.bestMatch.tenant.fullName,
        tenantPhone: result.bestMatch.tenant.phone,
        propertyName: result.bestMatch.tenant.propertyName,
        unitNumber: result.bestMatch.tenant.unitNumber,
        phoneScore: result.bestMatch.phoneScore,
        nameScore: result.bestMatch.nameScore,
        amountScore: result.bestMatch.amountScore,
        overallScore: result.bestMatch.overallScore,
        confidence: result.bestMatch.confidence,
        matchType: result.bestMatch.matchType,
      } : null,
      alternativeMatches: result.alternativeMatches.map(alt => ({
        tenantId: alt.tenant.id.toString(),
        tenantName: alt.tenant.fullName,
        overallScore: alt.overallScore,
      })),
      status: 'pending' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await MpesaTransactionMatch.insertMany(transactionMatches);

    console.log('✅ Statement processing completed');

    // Return summary
    res.status(200).json({
      success: true,
      statementId,
      summary: {
        fileName: req.file.originalname,
        uploadDate: statementUpload.uploadDate,
        period: statementUpload.statementPeriod,
        totalTransactions: transactions.length,
        totalAmount: summary.totalAmount,
        matching: {
          matched: matchStats.matched,
          ambiguous: matchStats.ambiguous,
          noMatch: matchStats.noMatch,
          matchRate: matchStats.matchRate,
          confidence: matchStats.confidence,
          amounts: matchStats.amounts,
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Error processing M-Pesa statement:', error);
    
    // Clean up uploaded file on error
    if (req.file?.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to delete uploaded file:', unlinkError);
      }
    }

    res.status(500).json({ 
      error: 'Failed to process M-Pesa statement',
      message: error.message 
    });
  }
}

/**
 * Get statement details with all matches
 * GET /api/mpesa/statements/:statementId
 */
export async function getStatementDetails(req: Request, res: Response) {
  try {
    const { statementId } = req.params;
    const landlordId = req.session?.userId;

    if (!landlordId || req.session?.userRole !== 'landlord') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const statement = await MpesaStatementUpload.findOne({
      _id: statementId,
      landlordId,
    });

    if (!statement) {
      return res.status(404).json({ error: 'Statement not found' });
    }

    // Get all transaction matches
    const matches = await MpesaTransactionMatch.find({ statementId }).lean();

    res.status(200).json({
      statement: {
        id: statement._id.toString(),
        fileName: statement.fileName,
        uploadDate: statement.uploadDate,
        statementPeriod: statement.statementPeriod,
        totalTransactions: statement.totalTransactions,
        matchedTransactions: statement.matchedTransactions,
        status: statement.status,
      },
      matches: matches.map(m => ({
        id: m._id.toString(),
        transaction: m.transaction,
        matchedTenant: m.matchedTenant,
        alternativeMatches: m.alternativeMatches,
        status: m.status,
        reviewNotes: m.reviewNotes,
      })),
    });

  } catch (error: any) {
    console.error('Error fetching statement details:', error);
    res.status(500).json({ error: 'Failed to fetch statement details' });
  }
}

/**
 * Get all statements for landlord
 * GET /api/mpesa/statements
 */
export async function getLandlordStatements(req: Request, res: Response) {
  try {
    const landlordId = req.session?.userId;

    if (!landlordId || req.session?.userRole !== 'landlord') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const statements = await MpesaStatementUpload.find({ landlordId })
      .sort({ uploadDate: -1 })
      .lean();

    res.status(200).json({
      statements: statements.map(s => ({
        id: s._id.toString(),
        fileName: s.fileName,
        uploadDate: s.uploadDate,
        statementPeriod: s.statementPeriod,
        totalTransactions: s.totalTransactions,
        matchedTransactions: s.matchedTransactions,
        status: s.status,
        processedAt: s.processedAt,
      })),
    });

  } catch (error: any) {
    console.error('Error fetching landlord statements:', error);
    res.status(500).json({ error: 'Failed to fetch statements' });
  }
}

/**
 * Approve a transaction match and record payment
 * POST /api/mpesa/matches/:matchId/approve
 */
export async function approveMatch(req: Request, res: Response) {
  try {
    const { matchId } = req.params;
    const { notes } = req.body;
    const landlordId = req.session?.userId;

    if (!landlordId || req.session?.userRole !== 'landlord') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const match = await MpesaTransactionMatch.findOne({ _id: matchId, landlordId });

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (!match.matchedTenant) {
      return res.status(400).json({ error: 'No tenant matched for this transaction' });
    }

    const tenantId = match.matchedTenant.tenantId;
    const tenant = await Tenant.findById(tenantId);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    console.log(`💰 Recording payment for tenant ${tenant.fullName}...`);

    // Step 1: Create PaymentHistory record
    const paymentDate = match.transaction.date;
    const paymentMonth = paymentDate.getMonth() + 1; // 1-12
    const paymentYear = paymentDate.getFullYear();

    const paymentHistory = await PaymentHistory.create({
      tenantId,
      landlordId,
      propertyId: tenant.apartmentInfo?.propertyId,
      amount: match.transaction.amount,
      paymentMethod: 'mpesa',
      mpesaReceiptNumber: match.transaction.receiptNo,
      paymentDate,
      month: paymentMonth,
      year: paymentYear,
      status: 'completed',
      notes: `M-Pesa payment from ${match.transaction.senderName} (${match.transaction.senderPhone})`,
      createdAt: new Date(),
    });

    console.log(`✅ Payment recorded: ${paymentHistory._id}`);

    // Step 2: Update tenant's rent cycle
    await Tenant.updateOne(
      { _id: tenantId },
      {
        $set: {
          'rentCycle.lastPaymentDate': paymentDate,
          'rentCycle.lastPaymentAmount': match.transaction.amount,
          'rentCycle.currentMonthPaid': true,
          'rentCycle.paidForMonth': paymentMonth,
          'rentCycle.paidForYear': paymentYear,
          'rentCycle.rentStatus': 'paid',
        },
      }
    );

    console.log(`✅ Updated tenant rent cycle`);

    // Step 3: Create activity log
    await ActivityLog.create({
      landlordId,
      tenantId,
      type: 'payment_received',
      title: 'M-Pesa Payment Received',
      description: `${tenant.fullName} paid KSH ${match.transaction.amount.toLocaleString()} via M-Pesa (Receipt: ${match.transaction.receiptNo})`,
      metadata: {
        amount: match.transaction.amount,
        paymentMethod: 'mpesa',
        receiptNumber: match.transaction.receiptNo,
        paymentId: paymentHistory._id.toString(),
        statementId: match.statementId,
        matchId: matchId,
      },
      read: false,
      createdAt: new Date(),
    });

    console.log(`✅ Activity logged`);

    // Step 4: Send WebSocket notification
    try {
      broadcastToUser(landlordId, {
        type: 'payment_received',
        tenantId,
        tenantName: tenant.fullName,
        amount: match.transaction.amount,
        paymentMethod: 'mpesa',
        receiptNumber: match.transaction.receiptNo,
      });
      console.log(`✅ WebSocket notification sent`);
    } catch (wsError) {
      console.error('⚠️  WebSocket notification failed:', wsError);
      // Don't fail the whole operation if WebSocket fails
    }

    // Step 5: Update match status
    match.status = 'approved';
    match.reviewNotes = notes;
    match.approvedBy = landlordId;
    match.approvedAt = new Date();
    match.recordedPaymentId = paymentHistory._id.toString();
    match.updatedAt = new Date();
    await match.save();

    console.log(`✅ M-Pesa payment approval completed`);

    res.status(200).json({ 
      success: true, 
      match,
      payment: {
        id: paymentHistory._id,
        amount: match.transaction.amount,
        method: 'mpesa',
        receiptNumber: match.transaction.receiptNo,
      }
    });

  } catch (error: any) {
    console.error('Error approving match:', error);
    res.status(500).json({ error: 'Failed to approve match' });
  }
}

/**
 * Reject a transaction match
 * POST /api/mpesa/matches/:matchId/reject
 */
export async function rejectMatch(req: Request, res: Response) {
  try {
    const { matchId } = req.params;
    const { notes } = req.body;
    const landlordId = req.session?.userId;

    if (!landlordId || req.session?.userRole !== 'landlord') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const match = await MpesaTransactionMatch.findOne({ _id: matchId, landlordId });

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Update match status
    match.status = 'rejected';
    match.reviewNotes = notes;
    match.approvedBy = landlordId;
    match.approvedAt = new Date();
    match.updatedAt = new Date();
    await match.save();

    res.status(200).json({ success: true, match });

  } catch (error: any) {
    console.error('Error rejecting match:', error);
    res.status(500).json({ error: 'Failed to reject match' });
  }
}

/**
 * Delete a statement and all its associated matches
 * DELETE /api/mpesa/statements/:statementId
 */
export async function deleteStatement(req: Request, res: Response) {
  try {
    const { statementId } = req.params;
    const landlordId = req.session?.userId;

    if (!landlordId || req.session?.userRole !== 'landlord') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify statement exists and belongs to this landlord
    const statement = await MpesaStatementUpload.findOne({ _id: statementId, landlordId });

    if (!statement) {
      return res.status(404).json({ error: 'Statement not found' });
    }

    // Delete all matches associated with this statement
    const deleteResult = await MpesaTransactionMatch.deleteMany({
      statementId,
      landlordId,
    });

    console.log(`🗑️  Deleted ${deleteResult.deletedCount} matches for statement ${statementId}`);

    // Delete the statement itself
    await MpesaStatementUpload.deleteOne({ _id: statementId });

    console.log(`✅ Statement ${statementId} deleted successfully`);

    res.status(200).json({ 
      success: true,
      message: 'Statement and all associated matches deleted',
      statementId,
      matchesDeleted: deleteResult.deletedCount,
    });

  } catch (error: any) {
    console.error('Error deleting statement:', error);
    res.status(500).json({ error: 'Failed to delete statement', details: error.message });
  }
}
