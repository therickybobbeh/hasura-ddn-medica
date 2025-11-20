/**
 * TypeScript Business Logic Connector
 * Insurance Claim Processing Functions
 */

// ==================== Type Definitions ====================

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

interface ClaimProcessResult {
  claimId: string;
  status: string;
  approved: boolean;
  approvedAmount?: number;
  rejectionReason?: string;
  processingTime: number;
}

interface ClaimSummary {
  claimId: string;
  memberId: string;
  totalAmount: number;
  taxAmount: number;
  netAmount: number;
  status: string;
  summary: string;
}

// ==================== Helper Functions ====================

/**
 * Calculate risk factors based on claim characteristics
 */
function calculateRiskFactors(claim: ClaimData): { score: number; factors: string[] } {
  let score = 0;
  const factors: string[] = [];

  // High amount risk (>$10,000)
  if (claim.claimAmount > 10000) {
    score += 30;
    factors.push("HIGH_AMOUNT");
  } else if (claim.claimAmount > 5000) {
    score += 15;
    factors.push("MODERATE_AMOUNT");
  }

  // Claim type risk scoring
  const highRiskTypes = ["SURGERY", "EMERGENCY", "SPECIALIZED"];
  const moderateRiskTypes = ["DIAGNOSTIC", "THERAPY", "DENTAL"];

  if (highRiskTypes.includes(claim.claimType.toUpperCase())) {
    score += 25;
    factors.push("HIGH_RISK_TYPE");
  } else if (moderateRiskTypes.includes(claim.claimType.toUpperCase())) {
    score += 10;
    factors.push("MODERATE_RISK_TYPE");
  }

  // Recent service date (within 30 days) - lower risk
  const serviceDate = new Date(claim.serviceDate);
  const daysSinceService = Math.floor(
    (Date.now() - serviceDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceService > 90) {
    score += 20;
    factors.push("DELAYED_SUBMISSION");
  } else if (daysSinceService <= 7) {
    score -= 5;
    factors.push("TIMELY_SUBMISSION");
  }

  // Missing provider ID
  if (!claim.providerId) {
    score += 15;
    factors.push("MISSING_PROVIDER");
  }

  return { score: Math.max(0, Math.min(100, score)), factors };
}

/**
 * Determine risk level from score
 */
function getRiskLevel(score: number): string {
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

/**
 * Validate claim data
 */
function validateClaim(claim: ClaimData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!claim.claimId || claim.claimId.trim() === "") {
    errors.push("Missing claim ID");
  }
  if (!claim.memberId || claim.memberId.trim() === "") {
    errors.push("Missing member ID");
  }
  if (claim.claimAmount <= 0) {
    errors.push("Invalid claim amount");
  }
  if (claim.claimAmount > 100000) {
    errors.push("Claim amount exceeds maximum limit");
  }
  if (!claim.claimType) {
    errors.push("Missing claim type");
  }
  if (!claim.serviceDate) {
    errors.push("Missing service date");
  }

  return { valid: errors.length === 0, errors };
}

// ==================== Query Functions ====================

/**
 * Calculate risk score for an insurance claim
 * @readonly
 */
export function calculateClaimRisk(claim: ClaimData): RiskScore {
  const startTime = Date.now();

  const { score, factors } = calculateRiskFactors(claim);
  const riskLevel = getRiskLevel(score);

  const result: RiskScore = {
    claimId: claim.claimId,
    riskScore: Math.round(score * 100) / 100,
    riskLevel,
    factors,
    timestamp: new Date().toISOString(),
  };

  // Simulate some processing time for realistic comparison
  const processingDelay = Math.random() * 5; // 0-5ms variance
  const elapsed = Date.now() - startTime;
  if (elapsed < processingDelay) {
    // This would be async in real scenarios, but kept sync for simplicity
  }

  return result;
}

/**
 * Generate formatted summary of a claim
 * @readonly
 */
export function generateClaimSummary(claim: ClaimData): ClaimSummary {
  const startTime = Date.now();

  // Calculate tax (8% for this example)
  const taxRate = 0.08;
  const taxAmount = Math.round(claim.claimAmount * taxRate * 100) / 100;
  const netAmount = Math.round((claim.claimAmount + taxAmount) * 100) / 100;

  // Generate summary text
  const summary = `Claim ${claim.claimId} for member ${claim.memberId}: ${claim.claimType} service on ${claim.serviceDate}. Amount: $${claim.claimAmount.toFixed(2)} + tax $${taxAmount.toFixed(2)} = $${netAmount.toFixed(2)}`;

  const result: ClaimSummary = {
    claimId: claim.claimId,
    memberId: claim.memberId,
    totalAmount: claim.claimAmount,
    taxAmount,
    netAmount,
    status: "PENDING",
    summary,
  };

  return result;
}

/**
 * Batch calculate risk scores for multiple claims
 * @readonly
 */
export function batchCalculateRisk(claims: ClaimData[]): RiskScore[] {
  return claims.map(claim => calculateClaimRisk(claim));
}

// ==================== Mutation Functions ====================

/**
 * Process and validate an insurance claim
 */
export function processClaim(claim: ClaimData): ClaimProcessResult {
  const startTime = Date.now();

  // Validate claim
  const validation = validateClaim(claim);
  if (!validation.valid) {
    return {
      claimId: claim.claimId,
      status: "REJECTED",
      approved: false,
      rejectionReason: validation.errors.join("; "),
      processingTime: Date.now() - startTime,
    };
  }

  // Calculate risk
  const { score, factors } = calculateRiskFactors(claim);

  // Auto-approve low risk claims under $5000
  if (score < 30 && claim.claimAmount < 5000) {
    return {
      claimId: claim.claimId,
      status: "APPROVED",
      approved: true,
      approvedAmount: claim.claimAmount,
      processingTime: Date.now() - startTime,
    };
  }

  // Reject high risk claims
  if (score >= 70) {
    return {
      claimId: claim.claimId,
      status: "REJECTED",
      approved: false,
      rejectionReason: `High risk score (${score}): ${factors.join(", ")}`,
      processingTime: Date.now() - startTime,
    };
  }

  // Moderate risk requires manual review
  return {
    claimId: claim.claimId,
    status: "PENDING_REVIEW",
    approved: false,
    rejectionReason: `Requires manual review (risk score: ${score})`,
    processingTime: Date.now() - startTime,
  };
}

/**
 * Batch process multiple claims
 */
export function batchProcessClaims(claims: ClaimData[]): ClaimProcessResult[] {
  return claims.map(claim => processClaim(claim));
}
