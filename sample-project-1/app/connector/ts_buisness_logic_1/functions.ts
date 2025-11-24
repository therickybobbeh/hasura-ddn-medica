/**
 * Insurance Claim Processing Business Logic - TypeScript Implementation
 *
 * This connector implements identical business logic to the Go and Python connectors
 * for fair performance comparison. All algorithms have O(1) complexity for single
 * operations and O(n) for batch operations.
 */

// Data Types
interface ClaimData {
  claimId: string;
  memberId: string;
  claimAmount: number;
  claimType: string;
  serviceDate: string;
  providerId?: string;
}

interface RiskScore {
  claimId: string;
  riskScore: number;
  riskLevel: string;
  factors: string[];
  timestamp: string;
}

interface ClaimSummary {
  claimId: string;
  memberId: string;
  summary: string;
  totalAmount: number;
  taxAmount: number;
  netAmount: number;
  status: string;
}

interface ClaimProcessResult {
  claimId: string;
  status: string;
  approved: boolean;
  approvedAmount?: number;
  rejectionReason?: string;
  processingTime: number;
}

// Helper Functions - Enhanced with CPU-intensive computations for stress testing
function calculateRiskFactors(claim: ClaimData): { score: number; factors: string[] } {
  let score = 0;
  const factors: string[] = [];

  // CPU-intensive: Calculate fraud probability using statistical analysis
  const fraudProbability = calculateFraudProbability(claim);
  if (fraudProbability > 0.7) {
    score += 35;
    factors.push("HIGH_FRAUD_PROBABILITY");
  } else if (fraudProbability > 0.4) {
    score += 20;
    factors.push("MODERATE_FRAUD_PROBABILITY");
  }

  // High amount risk with pattern analysis
  if (claim.claimAmount > 10000) {
    const amountPattern = analyzeAmountPattern(claim.claimAmount);
    score += 30;
    factors.push("HIGH_AMOUNT");
    if (amountPattern > 0.8) {
      score += 15;
      factors.push("SUSPICIOUS_AMOUNT_PATTERN");
    }
  } else if (claim.claimAmount > 5000) {
    score += 15;
    factors.push("MODERATE_AMOUNT");
  }

  // Claim type risk scoring with ML-style scoring
  const highRiskTypes = ["surgery", "emergency", "specialized"];
  const moderateRiskTypes = ["diagnostic", "therapy", "dental"];
  const claimTypeUpper = claim.claimType.toUpperCase();

  // CPU-intensive: Calculate type similarity scores
  const typeRiskScore = calculateTypeRiskScore(claimTypeUpper, highRiskTypes, moderateRiskTypes);
  score += typeRiskScore;

  if (highRiskTypes.includes(claim.claimType.toLowerCase())) {
    factors.push("HIGH_RISK_TYPE");
  } else if (moderateRiskTypes.includes(claim.claimType.toLowerCase())) {
    factors.push("MODERATE_RISK_TYPE");
  }

  // Service date with temporal analysis
  const serviceDate = new Date(claim.serviceDate);
  const now = new Date();
  const daysSinceService = Math.floor((now.getTime() - serviceDate.getTime()) / (1000 * 60 * 60 * 24));

  // CPU-intensive: Temporal pattern analysis
  const temporalRisk = analyzeTemporalPatterns(daysSinceService, claim.claimAmount);
  score += temporalRisk;

  if (daysSinceService > 90) {
    factors.push("DELAYED_SUBMISSION");
  } else if (daysSinceService <= 7) {
    score -= 5;
    factors.push("TIMELY_SUBMISSION");
  }

  // Missing provider ID with network analysis
  if (!claim.providerId) {
    score += 15;
    factors.push("MISSING_PROVIDER");
  } else {
    // CPU-intensive: Provider reputation scoring
    const providerRisk = analyzeProviderRisk(claim.providerId);
    score += providerRisk;
    if (providerRisk > 15) {
      factors.push("HIGH_RISK_PROVIDER");
    }
  }

  // CPU-intensive: Cross-factor correlation analysis
  const correlationScore = analyzeCrossFactorCorrelations(claim, factors);
  score += correlationScore;

  // Ensure score is between 0 and 100
  score = Math.max(0, Math.min(100, score));

  return { score, factors };
}

function calculateFraudProbability(claim: ClaimData): number {
  let probability = 0;

  // Simulate complex statistical calculations
  for (let i = 0; i < 1000; i++) {
    // Benford's Law analysis on claim amount
    const firstDigit = Math.floor(claim.claimAmount / Math.pow(10, Math.floor(Math.log10(claim.claimAmount))));
    const benfordExpected = Math.log10(1 + 1 / firstDigit);
    probability += benfordExpected * 0.0001;

    // Hash-based pattern matching
    const hash = claim.claimId.length * claim.memberId.length;
    probability += Math.sin(hash) * 0.00005;
  }

  // Normalize to 0-1 range
  probability = Math.abs(probability);
  if (probability > 1) {
    probability = 1 - (probability - Math.floor(probability));
  }

  return probability;
}

function analyzeAmountPattern(amount: number): number {
  let suspiciousScore = 0;

  // Check for round numbers (often associated with fraud)
  if (amount % 1000 === 0) {
    suspiciousScore += 0.3;
  }
  if (amount % 100 === 0) {
    suspiciousScore += 0.2;
  }

  // Statistical distribution analysis
  for (let i = 0; i < 500; i++) {
    const normalizedAmount = amount / 10000.0;
    const deviation = Math.abs(Math.sin(normalizedAmount * i));
    suspiciousScore += deviation * 0.001;
  }

  return Math.min(1.0, suspiciousScore);
}

function calculateTypeRiskScore(claimType: string, highRisk: string[], moderateRisk: string[]): number {
  let score = 0;

  // Levenshtein-style distance calculations (CPU-intensive)
  for (const hrType of highRisk) {
    const similarity = calculateStringSimilarity(claimType, hrType.toUpperCase());
    if (similarity > 0.8) {
      score += 25 * similarity;
    }
  }

  for (const mrType of moderateRisk) {
    const similarity = calculateStringSimilarity(claimType, mrType.toUpperCase());
    if (similarity > 0.8) {
      score += 10 * similarity;
    }
  }

  return score;
}

function calculateStringSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;

  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;

  // Simple character-based similarity
  let matches = 0;
  const s1Lower = s1.toLowerCase();
  const s2Lower = s2.toLowerCase();

  for (let i = 0; i < Math.min(s1Lower.length, s2Lower.length); i++) {
    if (s1Lower[i] === s2Lower[i]) {
      matches++;
    }
  }

  return matches / maxLen;
}

function analyzeTemporalPatterns(daysSince: number, amount: number): number {
  let risk = 0;

  // Seasonal pattern analysis (CPU-intensive)
  for (let i = 0; i < 300; i++) {
    const seasonalFactor = Math.sin((daysSince + i) * Math.PI / 180);
    const amountFactor = Math.log10(amount + 1);
    risk += Math.abs(seasonalFactor * amountFactor) * 0.01;
  }

  if (daysSince > 90) {
    risk += 20;
  }

  return Math.min(25, risk);
}

function analyzeProviderRisk(providerId: string): number {
  let risk = 0;

  // Pattern analysis on provider ID
  for (let i = 0; i < 400; i++) {
    for (let j = 0; j < providerId.length; j++) {
      const charValue = providerId.charCodeAt(j);
      const hashValue = Math.cos(charValue * (j + i));
      risk += Math.abs(hashValue) * 0.002;
    }
  }

  // Check for suspicious patterns
  if (providerId.length < 5) {
    risk += 5;
  }

  return Math.min(20, risk);
}

function analyzeCrossFactorCorrelations(claim: ClaimData, factors: string[]): number {
  let score = 0;

  // Matrix-based correlation calculations (CPU-intensive)
  const factorCount = factors.length;
  if (factorCount > 2) {
    // Calculate correlation matrix
    for (let i = 0; i < 200; i++) {
      const correlation = Math.pow(factorCount, 0.5) * Math.sin(i * 0.1);
      score += Math.abs(correlation) * 0.05;
    }
  }

  // Amount and factor count correlation
  if (claim.claimAmount > 5000 && factorCount > 3) {
    score += 10;
  }

  return Math.min(15, score);
}

function getRiskLevel(score: number): string {
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

// Query Functions

/**
 * @readonly Calculates risk score for an insurance claim
 */
export function calculateClaimRisk(claim: ClaimData): RiskScore {
  // STRESS TEST: Heavy computational operations to test language performance

  // 1. Matrix multiplication (O(n³) complexity) - simulates complex data correlations
  const matrixSize = 50;
  const resultMatrix = multiplyMatrices(matrixSize, claim.claimAmount);
  const matrixComplexity = calculateMatrixComplexity(resultMatrix);

  // 2. Recursive Fibonacci (exponential complexity) - simulates recursive computations
  const fibValue = recursiveFibonacci(20);

  // 3. Heavy array operations with memory allocations
  const arrayComplexity = performHeavyArrayOperations(1000, claim.claimAmount);

  // 4. Nested loops with complex calculations
  const nestedComplexity = nestedLoopComputation(claim.claimId, claim.memberId);

  // Original risk calculation
  let { score, factors } = calculateRiskFactors(claim);
  const riskLevel = getRiskLevel(score);

  // Incorporate computational complexity into score (subtle adjustment)
  const computationalFactor = (matrixComplexity + fibValue + arrayComplexity + nestedComplexity) / 1000000.0;
  score = Math.min(100, score + computationalFactor);

  return {
    claimId: claim.claimId,
    riskScore: score,
    riskLevel,
    factors,
    timestamp: new Date().toISOString(),
  };
}

// multiplyMatrices performs matrix multiplication - O(n³) complexity
function multiplyMatrices(size: number, seed: number): number[][] {
  // Create two matrices filled with pseudo-random values based on seed
  const matrixA: number[][] = [];
  const matrixB: number[][] = [];
  const result: number[][] = [];

  for (let i = 0; i < size; i++) {
    matrixA[i] = [];
    matrixB[i] = [];
    result[i] = [];

    for (let j = 0; j < size; j++) {
      matrixA[i][j] = Math.sin((i + j) * seed * 0.001);
      matrixB[i][j] = Math.cos((i * j) * seed * 0.001);
      result[i][j] = 0;
    }
  }

  // Matrix multiplication - O(n³)
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      let sum = 0;
      for (let k = 0; k < size; k++) {
        sum += matrixA[i][k] * matrixB[k][j];
      }
      result[i][j] = sum;
    }
  }

  return result;
}

// calculateMatrixComplexity sums all elements - used to prevent optimization
function calculateMatrixComplexity(matrix: number[][]): number {
  let sum = 0;
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      sum += Math.abs(matrix[i][j]);
    }
  }
  return sum;
}

// recursiveFibonacci calculates Fibonacci without memoization - exponential complexity
function recursiveFibonacci(n: number): number {
  if (n <= 1) return n;
  return recursiveFibonacci(n - 1) + recursiveFibonacci(n - 2);
}

// performHeavyArrayOperations creates and manipulates large arrays
function performHeavyArrayOperations(size: number, seed: number): number {
  // Create large array with allocations
  let data: number[] = new Array(size);

  // Fill with computed values
  for (let i = 0; i < size; i++) {
    data[i] = Math.pow(i, 2) * seed * 0.0001;
  }

  // Perform multiple passes with different operations
  for (let pass = 0; pass < 5; pass++) {
    // Transform array
    const transformed: number[] = new Array(size);
    for (let i = 0; i < size; i++) {
      transformed[i] = Math.sqrt(Math.abs(data[i])) * (pass + 1);
    }

    // Sort-like operation (bubble sort variant for consistent O(n²))
    for (let i = 0; i < size - 1; i++) {
      for (let j = 0; j < size - i - 1; j++) {
        if (transformed[j] > transformed[j + 1]) {
          [transformed[j], transformed[j + 1]] = [transformed[j + 1], transformed[j]];
        }
      }
    }

    // Aggregate back
    for (let i = 0; i < size; i++) {
      data[i] = (data[i] + transformed[i]) / 2.0;
    }
  }

  // Calculate final sum
  let sum = 0;
  for (const v of data) {
    sum += v;
  }

  return sum;
}

// nestedLoopComputation performs nested string/hash operations
function nestedLoopComputation(claimId: string, memberId: string): number {
  let complexity = 0;

  // Nested loops with string operations
  for (let i = 0; i < 100; i++) {
    for (let j = 0; j < 100; j++) {
      // String concatenation and hashing
      const combined = `${claimId}-${i}-${memberId}-${j}`;

      // Hash computation
      let hash = 0;
      for (let k = 0; k < combined.length; k++) {
        hash += combined.charCodeAt(k) * Math.pow(k + 1, 1.5);
      }

      complexity += Math.sin(hash * 0.0001);
    }
  }

  return Math.abs(complexity);
}

/**
 * @readonly Generates formatted summary of a claim
 */
export function generateClaimSummary(claim: ClaimData): ClaimSummary {
  const taxRate = 0.08;
  const taxAmount = claim.claimAmount * taxRate;
  const netAmount = claim.claimAmount - taxAmount;

  const summary = `Claim ${claim.claimId} for member ${claim.memberId}: ${claim.claimType} service on ${claim.serviceDate}. Amount: $${claim.claimAmount.toFixed(2)}`;

  return {
    claimId: claim.claimId,
    memberId: claim.memberId,
    summary,
    totalAmount: claim.claimAmount,
    taxAmount,
    netAmount,
    status: "PENDING",
  };
}

/**
 * @readonly Batch calculates risk scores for multiple claims (O(n) complexity)
 */
export function batchCalculateRisk(claims: ClaimData[]): RiskScore[] {
  return claims.map(claim => calculateClaimRisk(claim));
}

// Mutation Functions

/**
 * Processes and validates an insurance claim
 */
export function processClaim(claim: ClaimData): ClaimProcessResult {
  const startTime = Date.now();

  // Validation
  if (claim.claimAmount <= 0) {
    return {
      claimId: claim.claimId,
      status: "REJECTED",
      approved: false,
      rejectionReason: "Invalid claim amount",
      processingTime: Date.now() - startTime,
    };
  }

  if (!claim.memberId || !claim.claimType) {
    return {
      claimId: claim.claimId,
      status: "REJECTED",
      approved: false,
      rejectionReason: "Missing required fields",
      processingTime: Date.now() - startTime,
    };
  }

  // Risk assessment
  const { score } = calculateRiskFactors(claim);
  const riskLevel = getRiskLevel(score);

  // Approval logic
  if (riskLevel === "HIGH") {
    return {
      claimId: claim.claimId,
      status: "PENDING_REVIEW",
      approved: false,
      rejectionReason: "Requires manual review due to high risk",
      processingTime: Date.now() - startTime,
    };
  }

  // Auto-approve with adjustment for medium risk
  let approvedAmount = claim.claimAmount;
  if (riskLevel === "MEDIUM") {
    approvedAmount = claim.claimAmount * 0.9; // 10% reduction
  }

  return {
    claimId: claim.claimId,
    status: "APPROVED",
    approved: true,
    approvedAmount,
    processingTime: Date.now() - startTime,
  };
}

/**
 * Batch processes multiple claims (O(n) complexity)
 */
export function batchProcessClaims(claims: ClaimData[]): ClaimProcessResult[] {
  return claims.map(claim => processClaim(claim));
}
