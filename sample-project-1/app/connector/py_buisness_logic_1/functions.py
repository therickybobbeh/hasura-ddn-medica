"""
Insurance Claim Processing Business Logic - Python Implementation

This connector implements identical business logic to the Go and TypeScript connectors
for fair performance comparison. All algorithms have O(1) complexity for single
operations and O(n) for batch operations.
"""
from ndc_sdk_python import start
from ndc_sdk_python.function_connector import FunctionConnector
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

connector = FunctionConnector()

# Data Types
class ClaimData(BaseModel):
    claim_id: str
    member_id: str
    claim_amount: float
    claim_type: str
    service_date: str
    provider_id: Optional[str] = None

class RiskScore(BaseModel):
    claim_id: str
    risk_score: float
    risk_level: str
    factors: list[str]
    timestamp: str

class ClaimSummary(BaseModel):
    claim_id: str
    member_id: str
    summary: str
    total_amount: float
    tax_amount: float
    net_amount: float
    status: str

class ClaimProcessResult(BaseModel):
    claim_id: str
    status: str
    approved: bool
    approved_amount: Optional[float] = None
    rejection_reason: Optional[str] = None
    processing_time: float

# Helper Functions (O(1) operations)
def calculate_risk_factors(claim: ClaimData) -> tuple[float, list[str]]:
    """Calculate risk factors for a claim"""
    score = 0.0
    factors = []

    # High amount check
    if claim.claim_amount > 10000:
        score += 30
        factors.append("HIGH_AMOUNT")

    # Service date check (delayed submission)
    service_date = datetime.fromisoformat(claim.service_date.replace('Z', '+00:00'))
    now = datetime.now(service_date.tzinfo)
    days_diff = (now - service_date).days

    if days_diff > 30:
        score += 20
        factors.append("DELAYED_SUBMISSION")

    # Missing provider check
    if not claim.provider_id:
        score += 15
        factors.append("NO_PROVIDER_ID")

    # Claim type risk
    high_risk_types = ["emergency", "surgery", "specialist"]
    if claim.claim_type.lower() in high_risk_types:
        score += 25
        factors.append("HIGH_RISK_TYPE")

    return score, factors

def get_risk_level(score: float) -> str:
    """Determine risk level from score"""
    if score >= 70:
        return "HIGH"
    elif score >= 40:
        return "MEDIUM"
    return "LOW"

# Query Functions

@connector.register_query
def calculate_claim_risk(claim: ClaimData) -> RiskScore:
    """Calculates risk score for an insurance claim"""
    score, factors = calculate_risk_factors(claim)
    risk_level = get_risk_level(score)

    return RiskScore(
        claim_id=claim.claim_id,
        risk_score=score,
        risk_level=risk_level,
        factors=factors,
        timestamp=datetime.now().isoformat()
    )

@connector.register_query
def generate_claim_summary(claim: ClaimData) -> ClaimSummary:
    """Generates formatted summary of a claim"""
    tax_rate = 0.08
    tax_amount = claim.claim_amount * tax_rate
    net_amount = claim.claim_amount - tax_amount

    summary = (
        f"Claim {claim.claim_id} for member {claim.member_id}: "
        f"{claim.claim_type} service on {claim.service_date}. "
        f"Amount: ${claim.claim_amount:.2f}"
    )

    return ClaimSummary(
        claim_id=claim.claim_id,
        member_id=claim.member_id,
        summary=summary,
        total_amount=claim.claim_amount,
        tax_amount=tax_amount,
        net_amount=net_amount,
        status="PENDING"
    )

@connector.register_query
def batch_calculate_risk(claims: list[ClaimData]) -> list[RiskScore]:
    """Batch calculates risk scores for multiple claims (O(n) complexity)"""
    return [calculate_claim_risk(claim) for claim in claims]

# Mutation Functions

@connector.register_mutation
def process_claim(claim: ClaimData) -> ClaimProcessResult:
    """Processes and validates an insurance claim"""
    start_time = datetime.now()

    # Validation
    if claim.claim_amount <= 0:
        return ClaimProcessResult(
            claim_id=claim.claim_id,
            status="REJECTED",
            approved=False,
            rejection_reason="Invalid claim amount",
            processing_time=(datetime.now() - start_time).total_seconds() * 1000
        )

    if not claim.member_id or not claim.claim_type:
        return ClaimProcessResult(
            claim_id=claim.claim_id,
            status="REJECTED",
            approved=False,
            rejection_reason="Missing required fields",
            processing_time=(datetime.now() - start_time).total_seconds() * 1000
        )

    # Risk assessment
    score, _ = calculate_risk_factors(claim)
    risk_level = get_risk_level(score)

    # Approval logic
    if risk_level == "HIGH":
        return ClaimProcessResult(
            claim_id=claim.claim_id,
            status="PENDING_REVIEW",
            approved=False,
            rejection_reason="Requires manual review due to high risk",
            processing_time=(datetime.now() - start_time).total_seconds() * 1000
        )

    # Auto-approve with adjustment for medium risk
    approved_amount = claim.claim_amount
    if risk_level == "MEDIUM":
        approved_amount = claim.claim_amount * 0.9  # 10% reduction

    return ClaimProcessResult(
        claim_id=claim.claim_id,
        status="APPROVED",
        approved=True,
        approved_amount=approved_amount,
        processing_time=(datetime.now() - start_time).total_seconds() * 1000
    )

@connector.register_mutation
def batch_process_claims(claims: list[ClaimData]) -> list[ClaimProcessResult]:
    """Batch processes multiple claims (O(n) complexity)"""
    return [process_claim(claim) for claim in claims]

if __name__ == "__main__":
    start(connector)
