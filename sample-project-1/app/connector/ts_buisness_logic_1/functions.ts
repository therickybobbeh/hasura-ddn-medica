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

// Helper Functions (O(1) operations)
function calculateRiskFactors(claim: ClaimData): { score: number; factors: string[] } {
  let score = 0;
  const factors: string[] = [];

  // High amount check
  if (claim.claimAmount > 10000) {
    score += 30;
    factors.push("HIGH_AMOUNT");
  }

  // Service date check (delayed submission)
  const serviceDate = new Date(claim.serviceDate);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - serviceDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff > 30) {
    score += 20;
    factors.push("DELAYED_SUBMISSION");
  }

  // Missing provider check
  if (!claim.providerId) {
    score += 15;
    factors.push("NO_PROVIDER_ID");
  }

  // Claim type risk
  const highRiskTypes = ["emergency", "surgery", "specialist"];
  if (highRiskTypes.includes(claim.claimType.toLowerCase())) {
    score += 25;
    factors.push("HIGH_RISK_TYPE");
  }

  return { score, factors };
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
  const { score, factors } = calculateRiskFactors(claim);
  const riskLevel = getRiskLevel(score);

  return {
    claimId: claim.claimId,
    riskScore: score,
    riskLevel,
    factors,
    timestamp: new Date().toISOString(),
  };
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
