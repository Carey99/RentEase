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

    console.log(`💰 Processing M-Pesa payment for tenant ${tenant.fullName}...`);

    const amount = match.transaction.amount;
    const paymentDate = new Date(); // Use TODAY as payment date (when approved)
    const propertyId = tenant.apartmentInfo?.propertyId;

    if (!propertyId) {
      return res.status(400).json({ error: 'Tenant has no property assigned' });
    }

    // Find the MOST RECENT OUTSTANDING bill (pending or partial) - regardless of month
    // This is the bill that needs payment
    const outstandingBill = await PaymentHistory.findOne({
      tenantId,
      status: { $in: ['pending', 'partial'] },
      notes: { $not: /Payment transaction/ }
    }).sort({ forYear: -1, forMonth: -1 });

    if (!outstandingBill) {
      return res.status(404).json({ error: 'No outstanding bill found for this tenant' });
    }

    console.log(`📋 Found outstanding bill: ${outstandingBill.forMonth}/${outstandingBill.forYear}, Expected: ${outstandingBill.monthlyRent}, Already paid: ${outstandingBill.amount || 0}`);

    // Simple calculation: subtract payment from bill
    const previousAmountPaid = outstandingBill.amount || 0;
    const totalPaidNow = previousAmountPaid + amount;
    const expectedAmount = outstandingBill.monthlyRent; // Use the bill's expected amount as-is
    
    console.log(`💵 Payment: ${amount}, Previous: ${previousAmountPaid}, New Total: ${totalPaidNow}, Expected: ${expectedAmount}`);

    // Determine payment status
    const tolerance = 0.01;
    const difference = Math.abs(totalPaidNow - expectedAmount);
    let paymentStatus: 'pending' | 'partial' | 'completed' | 'overpaid';
    
    if (difference <= tolerance) {
      paymentStatus = 'completed';
      console.log(`✅ COMPLETED`);
    } else if (totalPaidNow < expectedAmount) {
      paymentStatus = 'partial';
      console.log(`⚠️  PARTIAL: ${totalPaidNow}/${expectedAmount} paid`);
    } else {
      paymentStatus = 'overpaid';
      console.log(`💰 OVERPAID`);
    }

    // Update the outstanding bill
    outstandingBill.amount = totalPaidNow;
    outstandingBill.status = paymentStatus;
    outstandingBill.mpesaReceiptNumber = match.transaction.receiptNo;
    outstandingBill.paymentDate = paymentDate; // Update to today
    outstandingBill.notes = outstandingBill.notes 
      ? `${outstandingBill.notes} | M-Pesa KSH ${amount} from ${match.transaction.senderName} (Receipt: ${match.transaction.receiptNo})`
      : `M-Pesa KSH ${amount} from ${match.transaction.senderName} (Receipt: ${match.transaction.receiptNo})`;
    
    await outstandingBill.save();

    // Create transaction record for receipt
    const paymentTransaction = new PaymentHistory({
      tenantId,
      landlordId: outstandingBill.landlordId,
      propertyId,
      amount,
      paymentDate,
      forMonth: outstandingBill.forMonth,
      forYear: outstandingBill.forYear,
      monthlyRent: outstandingBill.monthlyRent,
      paymentMethod: 'M-Pesa',
      mpesaReceiptNumber: match.transaction.receiptNo,
      status: paymentStatus,
      notes: `Payment transaction - M-Pesa from ${match.transaction.senderName} (${match.transaction.senderPhone})`,
      utilityCharges: outstandingBill.utilityCharges,
      totalUtilityCost: outstandingBill.totalUtilityCost,
    });

    await paymentTransaction.save();

    const forMonth = outstandingBill.forMonth;
    const forYear = outstandingBill.forYear;

    console.log(`✅ M-Pesa payment recorded - Bill: ${outstandingBill._id}, Transaction: ${paymentTransaction._id}`);

    // Update tenant's rent cycle
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const isCurrentMonth = forMonth === currentMonth && forYear === currentYear;
    const isFullyPaid = paymentStatus === 'completed' || paymentStatus === 'overpaid';

    await Tenant.updateOne(
      { _id: tenantId },
      {
        $set: {
          'rentCycle.lastPaymentDate': paymentDate,
          'rentCycle.lastPaymentAmount': amount,
          'rentCycle.currentMonthPaid': isCurrentMonth && isFullyPaid,
          'rentCycle.paidForMonth': forMonth,
          'rentCycle.paidForYear': forYear,
          'rentCycle.rentStatus': isFullyPaid ? 'paid' : (paymentStatus === 'partial' ? 'overdue' : 'pending'),
        },
      }
    );
    console.log(`✅ Updated tenant rent cycle - Last paid: TODAY`);

    // Activity logging & notifications
    const { logActivity, createActivityLog } = await import('./activityController');
    const { logTenantActivity, createTenantActivityLog } = await import('./tenantActivityController');

    // Log activity for LANDLORD
    await logActivity(createActivityLog(
      landlordId,
      paymentStatus === 'completed' || paymentStatus === 'overpaid' ? 'payment_received' : 'debt_created',
      paymentStatus === 'completed' ? 'M-Pesa Payment Received' : 'Partial M-Pesa Payment',
      `${tenant.fullName} paid KSH ${amount.toLocaleString()} via M-Pesa for ${forMonth}/${forYear} (Receipt: ${match.transaction.receiptNo})${paymentStatus === 'partial' ? ` (Balance: KSH ${(expectedAmount - totalPaidNow).toLocaleString()})` : ''}`,
      {
        tenantId: tenant._id?.toString(),
        tenantName: tenant.fullName,
        propertyId: propertyId.toString(),
        paymentId: outstandingBill._id?.toString(),
        amount: amount,
        unitNumber: tenant.apartmentInfo?.unitNumber,
        receiptNumber: match.transaction.receiptNo,
      },
      paymentStatus === 'completed' ? 'high' : 'medium'
    ));

    // Log activity for TENANT
    await logTenantActivity(createTenantActivityLog(
      tenantId,
      paymentStatus === 'completed' || paymentStatus === 'overpaid' ? 'payment_processed' : 'partial_payment_received',
      paymentStatus === 'completed' ? 'M-Pesa Payment Confirmed' : 'Partial M-Pesa Payment Received',
      paymentStatus === 'completed' 
        ? `Your M-Pesa payment of KSH ${amount.toLocaleString()} for ${forMonth}/${forYear} has been confirmed (Receipt: ${match.transaction.receiptNo})`
        : `Partial M-Pesa payment of KSH ${amount.toLocaleString()} received. Remaining balance: KSH ${(expectedAmount - totalPaidNow).toLocaleString()}`,
      {
        landlordId: landlordId,
        propertyId: propertyId.toString(),
        paymentId: outstandingBill._id?.toString(),
        amount: amount,
        receiptNumber: match.transaction.receiptNo,
      },
      paymentStatus === 'completed' ? 'high' : 'medium'
    ));

    // WebSocket broadcasts for real-time updates
    // Broadcast to LANDLORD
    broadcastToUser(landlordId, {
      type: 'payment_received',
      data: {
        tenantId,
        tenantName: tenant.fullName,
        amount,
        totalPaid: totalPaidNow,
        expectedAmount,
        paymentMethod: 'M-Pesa',
        status: paymentStatus,
        forMonth,
        forYear,
        receiptNumber: match.transaction.receiptNo,
        timestamp: new Date().toISOString(),
      },
    });

    // Broadcast to TENANT
    broadcastToUser(tenantId, {
      type: 'payment_confirmed',
      data: {
        amount,
        totalPaid: totalPaidNow,
        expectedAmount,
        paymentMethod: 'M-Pesa',
        status: paymentStatus,
        forMonth,
        forYear,
        balance: expectedAmount - totalPaidNow,
        receiptNumber: match.transaction.receiptNo,
        timestamp: new Date().toISOString(),
      },
    });

    console.log(`📡 WebSocket broadcasts sent to landlord and tenant`);
    console.log(`🔔 Notifications logged for both parties`);

    // Update match status
    match.status = 'approved';
    match.reviewNotes = notes;
    match.approvedBy = landlordId;
    match.approvedAt = new Date();
    match.recordedPaymentId = outstandingBill._id.toString();
    match.updatedAt = new Date();
    await match.save();

    console.log(`✅ M-Pesa payment approval completed successfully`);
    console.log(`   Bill updated: ${forMonth}/${forYear}`);
    console.log(`   Amount paid: KSH ${amount}`);
    console.log(`   New balance: KSH ${Math.max(0, expectedAmount - totalPaidNow)}`);
    console.log(`   Status: ${paymentStatus}`);

    res.status(200).json({ 
      success: true, 
      match,
      payment: {
        billId: outstandingBill._id,
        transactionId: paymentTransaction._id,
        amount: amount,
        totalPaid: totalPaidNow,
        expectedAmount: expectedAmount,
        balance: Math.max(0, expectedAmount - totalPaidNow),
        status: paymentStatus,
        method: 'M-Pesa',
        receiptNumber: match.transaction.receiptNo,
        forMonth,
        forYear,
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
 * Manually match a transaction to a specific tenant
 * POST /api/mpesa/matches/:matchId/manual-match
 * Body: { tenantId: string, notes?: string }
 */
export async function manualMatchTenant(req: Request, res: Response) {
  try {
    const { matchId } = req.params;
    const { tenantId } = req.body;
    const landlordId = req.session?.userId;

    if (!landlordId || req.session?.userRole !== 'landlord') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    // Find the match record
    const match = await MpesaTransactionMatch.findOne({ _id: matchId, landlordId });

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Verify tenant exists and belongs to this landlord
    const tenant = await Tenant.findById(tenantId);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Verify tenant belongs to this landlord
    if (tenant.apartmentInfo?.landlordId?.toString() !== landlordId) {
      return res.status(403).json({ error: 'This tenant does not belong to you' });
    }

    // Update match record with manual tenant selection
    match.matchedTenant = {
      tenantId: tenant._id.toString(),
      tenantName: tenant.fullName,
      tenantPhone: tenant.phone,
      propertyName: tenant.apartmentInfo?.propertyName || '',
      unitNumber: tenant.apartmentInfo?.unitNumber || '',
      phoneScore: 0, // Manual match - no automatic scoring
      nameScore: 0,
      amountScore: 0,
      overallScore: 100, // Manual match gets 100% since landlord confirmed it
      confidence: 'high',
      matchType: 'perfect',
    };
    match.status = 'manual'; // Mark as manually matched
    match.reviewNotes = 'Manually matched by landlord';
    match.updatedAt = new Date();
    await match.save();

    console.log(`✅ Manual match created: Transaction ${match.transaction.receiptNo} → Tenant ${tenant.fullName}`);

    res.status(200).json({ 
      success: true, 
      match,
      message: 'Transaction manually matched to tenant',
    });

  } catch (error: any) {
    console.error('Error manually matching tenant:', error);
    res.status(500).json({ error: 'Failed to manually match tenant' });
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
