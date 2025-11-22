/**
 * Parse M-Pesa statement transactions
 * Extracts "Paid In" transactions with phone numbers (last 3 digits) and names
 * Supports real M-Pesa format from Safaricom statements
 */

export interface ParsedTransaction {
  receiptNo: string;
  completionTime: string;
  date: Date;
  details: string;
  senderPhone: string; // Format: 0****393
  senderPhoneLast3: string; // Only last 3 digits: "393"
  senderName: string; // Full name from statement
  amount: number;
  balance: number;
  rawLine: string;
}

/**
 * Normalize name from M-Pesa statement
 * Converts "EDWINE ABIDA" to "Edwine Abida"
 */
function normalizeName(name: string): string {
  return name
    .split(' ')
    .map(part => {
      if (part.length === 0) return '';
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(' ')
    .trim();
}

/**
 * Extract phone and name from details text
 * Real M-Pesa format: "Customer Transfer Fuliza MPesa to - 0****393 EDWINE ABIDA"
 */
function extractPhoneAndName(details: string): { phone: string; name: string; phoneLast3: string } | null {
  // Pattern 1: Real M-Pesa format "to - 0****393 EDWINE ABIDA"
  const pattern1 = /to\s*-\s*(0\*+(\d{3}))\s+([A-Z][A-Za-z\s\.]+)/i;
  const match1 = details.match(pattern1);
  if (match1) {
    return {
      phone: match1[1],
      phoneLast3: match1[2],
      name: normalizeName(match1[3].trim()),
    };
  }

  // Pattern 2: Alternative with 254 prefix "to - 254*****492 NAME"
  const pattern2 = /to\s*-\s*(254\*+(\d{3}))\s+([A-Z][A-Za-z\s\.]+)/i;
  const match2 = details.match(pattern2);
  if (match2) {
    return {
      phone: match2[1],
      phoneLast3: match2[2],
      name: normalizeName(match2[3].trim()),
    };
  }

  // Pattern 3: Without "to -" prefix "0****393 NAME"
  const pattern3 = /(0\*+(\d{3}))\s+([A-Z][A-Za-z\s\.]+)/i;
  const match3 = details.match(pattern3);
  if (match3) {
    return {
      phone: match3[1],
      phoneLast3: match3[2],
      name: normalizeName(match3[3].trim()),
    };
  }

  // Pattern 4: Test format "254XXXXXXX445 - CORNELIUS OTIENO"
  const pattern4 = /(254[X*x\d]+(\d{3}))\s*[-–]\s*([a-zA-Z\s\.]+)/i;
  const match4 = details.match(pattern4);
  if (match4) {
    return {
      phone: match4[1],
      phoneLast3: match4[2],
      name: normalizeName(match4[3].trim()),
    };
  }

  return null;
}

/**
 * Extract phone and name from a separate line
 * Formats:
 * - "07******892 mary muchina"
 * - "2547******784 DELILLAH AKIDA"
 * - "to - 07******892 mary muchina"
 */
function extractPhoneAndNameFromLine(line: string): { phone: string; name: string; phoneLast3: string } | null {
  // Remove "to - " prefix if present
  const cleanLine = line.replace(/^to\s*-\s*/i, '').trim();
  
  // Pattern 1: "07******892 mary muchina" or "0****393 EDWINE ABIDA"
  const pattern1 = /(0[17]\*+(\d{3}))\s+(.+)/i;
  const match1 = cleanLine.match(pattern1);
  if (match1) {
    return {
      phone: match1[1],
      phoneLast3: match1[2],
      name: normalizeName(match1[3].trim()),
    };
  }

  // Pattern 2: "2547******784 DELILLAH AKIDA" (with 254 prefix)
  const pattern2 = /(254[17]\*+(\d{3}))\s+(.+)/i;
  const match2 = cleanLine.match(pattern2);
  if (match2) {
    return {
      phone: match2[1],
      phoneLast3: match2[2],
      name: normalizeName(match2[3].trim()),
    };
  }

  return null;
}

/**
 * Parse a single transaction line with phone/name on next line
 * Real M-Pesa format:
 * Line 1: TK2RJ91M5Z 2025-11-02 21:05:35 Customer Transfer Fuliza MPesa Completed 80.00 0.00
 * Line 2: to - 07******892 mary muchina
 */
function parseTransactionLine(line: string, nextLine?: string): ParsedTransaction | null {
  // Pattern for real M-Pesa format
  // Captures: ReceiptNo Date Time Details Status Amount1 Amount2
  // Note: Amount can be negative (withdrawals)
  const pattern = /^(\w+)\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\s+(.+?)\s+(Completed|Pending|Failed|COMPLETED|PENDING|FAILED)\s+(-?[\d,]+\.?\d{0,2})\s+(-?[\d,]*\.?\d{0,2})\s*$/i;
  
  const match = line.match(pattern);
  
  if (!match || !nextLine) {
    return null;
  }

  const [, receiptNo, dateStr, timeStr, details, status, col1Str, col2Str] = match;

  // Parse amounts
  const col1 = parseFloat(col1Str.replace(/,/g, '') || '0');
  const col2 = parseFloat((col2Str || '0').replace(/,/g, ''));

  // Only process positive amounts (Paid In / Received money)
  // Negative values are withdrawals/sent money
  if (col1 <= 0) {
    return null;
  }

  const paidIn = col1;
  const balance = col2;

  // Extract phone and name from next line
  const phoneNameInfo = extractPhoneAndNameFromLine(nextLine);
  if (!phoneNameInfo) {
    return null;
  }

  // Parse date
  const date = new Date(`${dateStr}T${timeStr}`);

  return {
    receiptNo,
    completionTime: `${dateStr} ${timeStr}`,
    date,
    details: details.trim(),
    senderPhone: phoneNameInfo.phone,
    senderPhoneLast3: phoneNameInfo.phoneLast3,
    senderName: phoneNameInfo.name,
    amount: paidIn,
    balance: balance,
    rawLine: line + '\n' + nextLine,
  };
}

/**
 * Parse M-Pesa statement text and extract all "Paid In" transactions
 */
export function parseStatementTransactions(statementText: string): ParsedTransaction[] {
  const lines = statementText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const transactions: ParsedTransaction[] = [];

  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1];
    
    const transaction = parseTransactionLine(line, nextLine);
    if (transaction) {
      transactions.push(transaction);
      i++; // Skip the next line (phone/name) as we've already used it
    }
  }

  return transactions;
}

/**
 * Get summary statistics from parsed transactions
 */
export function getTransactionSummary(transactions: ParsedTransaction[]) {
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  const uniqueSenders = new Set(transactions.map(t => t.senderPhoneLast3)).size;
  const dateRange = {
    start: transactions.length > 0 ? new Date(Math.min(...transactions.map(t => t.date.getTime()))) : null,
    end: transactions.length > 0 ? new Date(Math.max(...transactions.map(t => t.date.getTime()))) : null,
  };

  return {
    totalTransactions: transactions.length,
    totalAmount,
    uniqueSenders,
    dateRange,
  };
}
