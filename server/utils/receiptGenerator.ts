/**
 * Receipt Generator
 * 
 * Generates PDF receipts for successful payments
 */

import PDFDocument from 'pdfkit';
import type { Response } from 'express';

interface UtilityCharge {
  type: string;
  units: number;
  pricePerUnit: number;
  total: number;
}

interface ReceiptData {
  // Payment Info
  receiptNumber: string;
  transactionId: string;
  mpesaReceiptNumber?: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: string;
  
  // Bill Breakdown
  monthlyRent: number;
  utilityCharges?: UtilityCharge[];
  historicalDebt?: number;
  historicalDebtDetails?: string;
  
  // Tenant Info
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  
  // Property Info
  propertyName: string;
  propertyType: string;
  unitNumber: string;
  
  // Landlord Info
  landlordName: string;
  landlordEmail?: string;
  landlordPhone?: string;
  
  // Period covered
  paymentPeriod: string; // e.g., "November 2025"
  
  // Additional details
  description?: string;
  notes?: string;
}

/**
 * Generate a PDF receipt and stream it to the response
 */
export function generateReceipt(data: ReceiptData, res: Response): void {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  
  // Set response headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=receipt-${data.receiptNumber}.pdf`
  );
  
  // Pipe the PDF directly to the response
  doc.pipe(res);
  
  // Yellow header bar
  doc
    .rect(0, 0, 612, 60)
    .fill('#FDB913');
  
  // Header text
  doc
    .fontSize(20)
    .font('Helvetica-Bold')
    .fillColor('#000000')
    .text('Payment Receipt', 50, 20, { align: 'center' });
  
  doc.moveDown(3);
  
  // Invoice To Section
  doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .fillColor('#000000')
    .text('Invoice to:', 50)
    .moveDown(0.3);
  
  doc
    .fontSize(10)
    .font('Helvetica')
    .text(`Name:`, 50, doc.y, { continued: true })
    .text(`    ${data.tenantName}`)
    .text(`Address:`, 50, doc.y, { continued: true })
    .text(`    ${data.propertyName}`)
    .text(``, 50, doc.y, { continued: true })
    .text(`    Unit ${data.unitNumber}, ${data.propertyType}`)
    .text(`Date:`, 50, doc.y, { continued: true })
    .text(`    ${formatDateShort(data.paymentDate)}`)
    .text(`Payment Method:`, 50, doc.y, { continued: true })
    .text(`    ${data.paymentMethod}`);
  
  if (data.mpesaReceiptNumber) {
    doc.text(`Receipt No:`, 50, doc.y, { continued: true })
       .text(`    ${data.mpesaReceiptNumber}`);
  }
  
  doc.moveDown(2);
  
  // Products/Bill Breakdown Section
  doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('Products', 50);
  
  doc.moveDown(0.5);
  
  // Table header with yellow background
  const tableTop = doc.y;
  const tableLeft = 50;
  const tableWidth = 495;
  
  // Yellow header row
  doc
    .rect(tableLeft, tableTop, tableWidth, 25)
    .fill('#FDB913');
  
  // Header text
  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .fillColor('#000000')
    .text('Description', tableLeft + 10, tableTop + 8, { width: 220 })
    .text('Quantity', tableLeft + 240, tableTop + 8, { width: 60, align: 'center' })
    .text('Unit Price', tableLeft + 310, tableTop + 8, { width: 80, align: 'center' })
    .text('Amount', tableLeft + 400, tableTop + 8, { width: 85, align: 'right' });
  
  let currentY = tableTop + 30;
  doc.fillColor('#000000');
  
  // Rent row
  doc
    .fontSize(9)
    .font('Helvetica')
    .text(`Rent - ${data.paymentPeriod}`, tableLeft + 10, currentY, { width: 220 })
    .text('1', tableLeft + 240, currentY, { width: 60, align: 'center' })
    .text(formatAmount(data.monthlyRent), tableLeft + 310, currentY, { width: 80, align: 'center' })
    .text(formatAmount(data.monthlyRent), tableLeft + 400, currentY, { width: 85, align: 'right' });
  
  currentY += 20;
  
  // Utility rows
  let totalUtilities = 0;
  if (data.utilityCharges && data.utilityCharges.length > 0) {
    data.utilityCharges.forEach((utility) => {
      doc
        .text(utility.type, tableLeft + 10, currentY, { width: 220 })
        .text(utility.units.toString(), tableLeft + 240, currentY, { width: 60, align: 'center' })
        .text(formatAmount(utility.pricePerUnit), tableLeft + 310, currentY, { width: 80, align: 'center' })
        .text(formatAmount(utility.total), tableLeft + 400, currentY, { width: 85, align: 'right' });
      
      totalUtilities += utility.total;
      currentY += 20;
    });
  }
  
  // Historical debt row (if any)
  if (data.historicalDebt && data.historicalDebt > 0) {
    doc
      .font('Helvetica-Bold')
      .fillColor('#DC2626')
      .text('Previous Balance', tableLeft + 10, currentY, { width: 220 })
      .font('Helvetica')
      .fillColor('#000000')
      .text('1', tableLeft + 240, currentY, { width: 60, align: 'center' })
      .text(formatAmount(data.historicalDebt), tableLeft + 310, currentY, { width: 80, align: 'center' })
      .text(formatAmount(data.historicalDebt), tableLeft + 400, currentY, { width: 85, align: 'right' });
    
    currentY += 15;
    
    // Add historical debt details as a note
    if (data.historicalDebtDetails) {
      doc
        .fontSize(7)
        .fillColor('#666666')
        .text(`(${data.historicalDebtDetails})`, tableLeft + 10, currentY, { width: 475 });
      currentY += 15;
    } else {
      currentY += 5;
    }
  }
  
  // Total row with yellow background
  currentY += 5;
  doc
    .rect(tableLeft, currentY, tableWidth, 25)
    .fill('#FDB913');
  
  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor('#000000')
    .text('Total', tableLeft + 10, currentY + 8, { width: 220 })
    .text(formatAmount(data.amount), tableLeft + 400, currentY + 8, { width: 85, align: 'right' });
  
  currentY += 35;
  
  // Payment details box
  doc.fillColor('#000000');
  doc
    .fontSize(9)
    .font('Helvetica')
    .text(`Transaction ID: ${data.transactionId}`, tableLeft, currentY)
    .text(`Receipt Number: ${data.receiptNumber}`, tableLeft, currentY + 15)
    .text(`Payment Period: ${data.paymentPeriod}`, tableLeft, currentY + 30);
  
  // Footer
  doc
    .fontSize(8)
    .font('Helvetica')
    .fillColor('#666666')
    .text(
      'This is a computer-generated receipt. Thank you for your payment!',
      50,
      750,
      { align: 'center', width: 495 }
    )
    .text('Powered by RentEase - Property Management Made Easy', 50, 765, {
      align: 'center',
      width: 495,
    });
  
  // Finalize the PDF
  doc.end();
}

/**
 * Format date for display (short format)
 */
function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

/**
 * Format amount with thousand separators
 */
function formatAmount(amount: number): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
