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

/**
 * Generate a PDF receipt and return it as a Buffer for email attachments
 */
export function generateReceiptBuffer(data: ReceiptData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Yellow header bar
    doc
      .rect(0, 0, 612, 60)
      .fill('#FDB913');

    // Header text
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text('PAYMENT RECEIPT', 50, 20);

    // Receipt number in top right
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#666666')
      .text(`Receipt #${data.receiptNumber}`, 400, 25, { width: 162, align: 'right' });

    // Reset position and color
    doc.fillColor('#000000');
    let yPos = 90;

    // Property and tenant information
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Property Information', 50, yPos);

    yPos += 25;
    doc
      .fontSize(11)
      .font('Helvetica')
      .text(`${data.propertyName}`, 50, yPos)
      .text(`Unit ${data.unitNumber}`, 50, yPos + 15)
      .text(`Property Type: ${data.propertyType}`, 50, yPos + 30);

    yPos += 60;
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Tenant Information', 50, yPos);

    yPos += 25;
    doc
      .fontSize(11)
      .font('Helvetica')
      .text(data.tenantName, 50, yPos)
      .text(data.tenantEmail, 50, yPos + 15)
      .text(data.tenantPhone, 50, yPos + 30);

    // Payment details box
    yPos += 60;
    doc
      .rect(50, yPos, 512, 120)
      .fillAndStroke('#F0FDF4', '#10B981');

    yPos += 20;
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#065F46')
      .text('PAYMENT DETAILS', 70, yPos);

    yPos += 30;
    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#000000')
      .text('Payment Period:', 70, yPos)
      .font('Helvetica-Bold')
      .text(data.paymentPeriod, 200, yPos);

    yPos += 20;
    doc
      .font('Helvetica')
      .text('Payment Date:', 70, yPos)
      .font('Helvetica-Bold')
      .text(formatDateShort(data.paymentDate), 200, yPos);

    yPos += 20;
    doc
      .font('Helvetica')
      .text('Payment Method:', 70, yPos)
      .font('Helvetica-Bold')
      .text(data.paymentMethod, 200, yPos);

    if (data.mpesaReceiptNumber) {
      yPos += 20;
      doc
        .font('Helvetica')
        .text('M-Pesa Receipt:', 70, yPos)
        .font('Helvetica-Bold')
        .text(data.mpesaReceiptNumber, 200, yPos);
    }

    // Bill breakdown
    yPos += 50;
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Bill Breakdown', 50, yPos);

    yPos += 30;

    // Monthly Rent
    doc
      .fontSize(11)
      .font('Helvetica')
      .text('Monthly Rent', 70, yPos)
      .text(`KES ${formatAmount(data.monthlyRent)}`, 400, yPos, { width: 162, align: 'right' });

    yPos += 25;

    // Utility charges
    if (data.utilityCharges && data.utilityCharges.length > 0) {
      data.utilityCharges.forEach(utility => {
        doc
          .text(`${utility.type} (${utility.units} units @ KES ${formatAmount(utility.pricePerUnit)})`, 70, yPos)
          .text(`KES ${formatAmount(utility.total)}`, 400, yPos, { width: 162, align: 'right' });
        yPos += 20;
      });
      yPos += 5;
    }

    // Historical debt
    if (data.historicalDebt && data.historicalDebt > 0) {
      doc
        .text('Previous Balance', 70, yPos)
        .text(`KES ${formatAmount(data.historicalDebt)}`, 400, yPos, { width: 162, align: 'right' });
      
      if (data.historicalDebtDetails) {
        yPos += 15;
        doc
          .fontSize(9)
          .fillColor('#666666')
          .text(data.historicalDebtDetails, 90, yPos, { width: 300 })
          .fillColor('#000000')
          .fontSize(11);
      }
      yPos += 25;
    }

    // Total line
    doc
      .moveTo(50, yPos)
      .lineTo(562, yPos)
      .stroke('#CCCCCC');

    yPos += 15;
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Total Amount Paid', 70, yPos)
      .text(`KES ${formatAmount(data.amount)}`, 400, yPos, { width: 162, align: 'right' });

    // Landlord information
    yPos += 60;
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Issued by:', 50, yPos);

    yPos += 20;
    doc
      .fontSize(11)
      .font('Helvetica')
      .text(data.landlordName, 50, yPos);

    if (data.landlordEmail) {
      doc.text(data.landlordEmail, 50, yPos + 15);
    }
    if (data.landlordPhone) {
      doc.text(data.landlordPhone, 50, yPos + (data.landlordEmail ? 30 : 15));
    }

    // Footer
    doc
      .fontSize(9)
      .fillColor('#999999')
      .text(
        'This is an official receipt generated by RentEase Property Management System',
        50,
        750,
        { align: 'center', width: 512 }
      );

    doc.end();
  });
}
