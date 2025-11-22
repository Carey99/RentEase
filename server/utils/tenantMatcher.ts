/**
 * Tenant matching algorithm for M-Pesa transactions
 * Matches transactions to tenants using last 3 phone digits + name similarity
 */

import { ParsedTransaction } from './transactionParser';

export interface TenantInfo {
  id: number;
  fullName: string;
  phone: string;
  rentAmount: number;
  propertyName?: string;
  unitNumber?: string;
}

export interface TenantMatch {
  tenant: TenantInfo;
  phoneScore: number; // 0-100
  nameScore: number; // 0-100
  amountScore: number; // 0-100
  overallScore: number; // Weighted composite 0-100
  confidence: 'high' | 'medium' | 'low' | 'none';
  matchType: 'perfect' | 'good' | 'partial' | 'weak' | 'none';
  matchFactors: {
    phoneLast3: string;
    nameSimilarity: number;
    amountDifference: number;
    hasUtilities: boolean;
  };
}

export interface TransactionMatchResult {
  transaction: ParsedTransaction;
  bestMatch: TenantMatch | null;
  alternativeMatches: TenantMatch[];
  status: 'matched' | 'ambiguous' | 'no_match';
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for name similarity scoring
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate name similarity score (0-100)
 */
function calculateNameSimilarity(name1: string, name2: string): number {
  const norm1 = name1.toLowerCase().trim();
  const norm2 = name2.toLowerCase().trim();

  if (norm1 === norm2) return 100;

  const distance = levenshteinDistance(norm1, norm2);
  const maxLength = Math.max(norm1.length, norm2.length);
  const similarity = ((maxLength - distance) / maxLength) * 100;

  return Math.max(0, Math.min(100, similarity));
}

/**
 * Match transaction amount against tenant's expected rent
 * Accounts for utilities being included
 */
function calculateAmountMatch(
  transactionAmount: number,
  expectedRent: number
): { score: number; type: 'exact' | 'with_utilities' | 'partial' | 'mismatch' } {
  const difference = Math.abs(transactionAmount - expectedRent);
  const percentDiff = (difference / expectedRent) * 100;

  if (difference === 0) {
    return { score: 100, type: 'exact' };
  }

  // If amount is higher by 5-25%, might include utilities
  if (transactionAmount > expectedRent && percentDiff >= 5 && percentDiff <= 25) {
    const score = 100 - percentDiff;
    return { score: Math.max(75, score), type: 'with_utilities' };
  }

  // If within 5%, consider it close enough
  if (percentDiff <= 5) {
    return { score: 95, type: 'exact' };
  }

  // Partial payment or significant mismatch
  if (percentDiff <= 20) {
    return { score: 80 - percentDiff, type: 'partial' };
  }

  return { score: Math.max(0, 50 - percentDiff), type: 'mismatch' };
}

/**
 * Find all tenants with matching phone last 3 digits
 */
function findTenantsWithPhoneLast3(
  phoneLast3: string,
  tenants: TenantInfo[]
): TenantInfo[] {
  return tenants.filter(tenant => {
    const tenantLast3 = tenant.phone.slice(-3);
    return tenantLast3 === phoneLast3;
  });
}

/**
 * Score a single tenant match against a transaction
 */
function scoreTenantMatch(
  transaction: ParsedTransaction,
  tenant: TenantInfo
): TenantMatch {
  // Phone score: 100 if last 3 match, 0 otherwise
  const tenantLast3 = tenant.phone.slice(-3);
  const phoneScore = tenantLast3 === transaction.senderPhoneLast3 ? 100 : 0;

  // Name similarity score
  const nameScore = calculateNameSimilarity(transaction.senderName, tenant.fullName);

  // Amount match score
  const amountMatch = calculateAmountMatch(transaction.amount, tenant.rentAmount);
  const amountScore = amountMatch.score;

  // Composite weighted score
  // Weights: Phone (30%), Name (50%), Amount (20%)
  const overallScore = (phoneScore * 0.3) + (nameScore * 0.5) + (amountScore * 0.2);

  // Determine confidence level
  let confidence: 'high' | 'medium' | 'low' | 'none';
  if (overallScore >= 90) {
    confidence = 'high';
  } else if (overallScore >= 75) {
    confidence = 'medium';
  } else if (overallScore >= 60) {
    confidence = 'low';
  } else {
    confidence = 'none';
  }

  // Determine match type
  let matchType: 'perfect' | 'good' | 'partial' | 'weak' | 'none';
  if (phoneScore === 100 && nameScore >= 95 && amountScore >= 95) {
    matchType = 'perfect';
  } else if (phoneScore === 100 && nameScore >= 80 && amountScore >= 75) {
    matchType = 'good';
  } else if (phoneScore === 100 && nameScore >= 60) {
    matchType = 'partial';
  } else if (phoneScore === 100) {
    matchType = 'weak';
  } else {
    matchType = 'none';
  }

  return {
    tenant,
    phoneScore,
    nameScore,
    amountScore,
    overallScore,
    confidence,
    matchType,
    matchFactors: {
      phoneLast3: transaction.senderPhoneLast3,
      nameSimilarity: nameScore,
      amountDifference: Math.abs(transaction.amount - tenant.rentAmount),
      hasUtilities: amountMatch.type === 'with_utilities',
    },
  };
}

/**
 * Match a transaction to tenants
 * Returns best match and alternatives
 */
export function matchTransactionToTenants(
  transaction: ParsedTransaction,
  tenants: TenantInfo[]
): TransactionMatchResult {
  // Step 1: Filter tenants by phone last 3 digits
  const phoneCandidates = findTenantsWithPhoneLast3(
    transaction.senderPhoneLast3,
    tenants
  );

  // Step 2: Score all candidates
  const allMatches = phoneCandidates
    .map(tenant => scoreTenantMatch(transaction, tenant))
    .sort((a, b) => b.overallScore - a.overallScore); // Sort by score descending

  // Step 3: Determine best match and alternatives
  if (allMatches.length === 0) {
    return {
      transaction,
      bestMatch: null,
      alternativeMatches: [],
      status: 'no_match',
    };
  }

  const bestMatch = allMatches[0];
  // Show alternatives with score >= 50 (lower threshold to show ambiguous cases)
  const alternativeMatches = allMatches.slice(1).filter(m => m.overallScore >= 50);

  // Status logic
  let status: 'matched' | 'ambiguous' | 'no_match';
  if (bestMatch.overallScore < 60) {
    status = 'no_match';
  } else if (alternativeMatches.length > 0 && alternativeMatches[0].overallScore >= 75) {
    status = 'ambiguous'; // Multiple strong candidates
  } else {
    status = 'matched';
  }

  return {
    transaction,
    bestMatch,
    alternativeMatches,
    status,
  };
}

/**
 * Batch match multiple transactions to tenants
 */
export function matchTransactionsToTenants(
  transactions: ParsedTransaction[],
  tenants: TenantInfo[]
): TransactionMatchResult[] {
  return transactions.map(transaction => 
    matchTransactionToTenants(transaction, tenants)
  );
}

/**
 * Get matching statistics
 */
export function getMatchingStatistics(results: TransactionMatchResult[]) {
  const total = results.length;
  const matched = results.filter(r => r.status === 'matched').length;
  const ambiguous = results.filter(r => r.status === 'ambiguous').length;
  const noMatch = results.filter(r => r.status === 'no_match').length;

  const highConfidence = results.filter(r => r.bestMatch?.confidence === 'high').length;
  const mediumConfidence = results.filter(r => r.bestMatch?.confidence === 'medium').length;
  const lowConfidence = results.filter(r => r.bestMatch?.confidence === 'low').length;

  const totalAmount = results.reduce((sum, r) => sum + r.transaction.amount, 0);
  const matchedAmount = results
    .filter(r => r.status === 'matched')
    .reduce((sum, r) => sum + r.transaction.amount, 0);

  return {
    total,
    matched,
    ambiguous,
    noMatch,
    matchRate: (matched / total) * 100,
    confidence: {
      high: highConfidence,
      medium: mediumConfidence,
      low: lowConfidence,
    },
    amounts: {
      total: totalAmount,
      matched: matchedAmount,
      unmatched: totalAmount - matchedAmount,
      matchedPercentage: (matchedAmount / totalAmount) * 100,
    },
  };
}
