"""
Python Business Logic Connector
Insurance Claim Processing Functions
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
import time
import random

# ==================== Type Definitions ====================

@dataclass
class ClaimData:
    """Input data for an insurance claim"""
    claim_id: str
    member_id: str
    claim_amount: float
    claim_type: str
    service_date: str
    provider_id: Optional[str] = None


@dataclass
class RiskScore:
    """Risk assessment result for a claim"""
    claim_id: str
    risk_score: float
    risk_level: str
    factors: List[str]
    timestamp: str


@dataclass
class ClaimProcessResult:
    """Result of processing a claim"""
    claim_id: str
    status: str
    approved: bool
    approved_amount: Optional[float] = None
    rejection_reason: Optional[str] = None
    processing_time: float = 0.0


@dataclass
class ClaimSummary:
    """Formatted summary of a claim"""
    claim_id: str
    member_id: str
    total_amount: float
    tax_amount: float
    net_amount: float
    status: str
    summary: str


# ==================== Helper Functions ====================

def calculate_risk_factors(claim: ClaimData) -> tuple[float, List[str]]:
    """Calculate risk factors based on claim characteristics"""
    score = 0.0
    factors = []

    # High amount risk (>$10,000)
    if claim.claim_amount > 10000:
        score += 30
        factors.append("HIGH_AMOUNT")
    elif claim.claim_amount > 5000:
        score += 15
        factors.append("MODERATE_AMOUNT")

    # Claim type risk scoring
    high_risk_types = ["SURGERY", "EMERGENCY", "SPECIALIZED"]
    moderate_risk_types = ["DIAGNOSTIC", "THERAPY", "DENTAL"]

    claim_type_upper = claim.claim_type.upper()
    if claim_type_upper in high_risk_types:
        score += 25
        factors.append("HIGH_RISK_TYPE")
    elif claim_type_upper in moderate_risk_types:
        score += 10
        factors.append("MODERATE_RISK_TYPE")

    # Recent service date (within 30 days) - lower risk
    try:
        service_date = datetime.fromisoformat(claim.service_date.replace('Z', '+00:00'))
        days_since_service = (datetime.now() - service_date).days

        if days_since_service > 90:
            score += 20
            factors.append("DELAYED_SUBMISSION")
        elif days_since_service <= 7:
            score -= 5
            factors.append("TIMELY_SUBMISSION")
    except (ValueError, AttributeError):
        score += 10
        factors.append("INVALID_DATE")

    # Missing provider ID
    if not claim.provider_id:
        score += 15
        factors.append("MISSING_PROVIDER")

    # Ensure score is between 0 and 100
    score = max(0.0, min(100.0, score))

    return score, factors


def get_risk_level(score: float) -> str:
    """Determine risk level from score"""
    if score >= 70:
        return "HIGH"
    elif score >= 40:
        return "MEDIUM"
    return "LOW"


def validate_claim(claim: ClaimData) -> tuple[bool, List[str]]:
    """Validate claim data"""
    errors = []

    if not claim.claim_id or claim.claim_id.strip() == "":
        errors.append("Missing claim ID")
    if not claim.member_id or claim.member_id.strip() == "":
        errors.append("Missing member ID")
    if claim.claim_amount <= 0:
        errors.append("Invalid claim amount")
    if claim.claim_amount > 100000:
        errors.append("Claim amount exceeds maximum limit")
    if not claim.claim_type:
        errors.append("Missing claim type")
    if not claim.service_date:
        errors.append("Missing service date")

    return len(errors) == 0, errors


# ==================== Query Functions ====================

def calculate_claim_risk(claim: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculate risk score for an insurance claim

    @query
    """
    start_time = time.time()

    # Convert dict to ClaimData
    claim_data = ClaimData(
        claim_id=claim["claim_id"],
        member_id=claim["member_id"],
        claim_amount=float(claim["claim_amount"]),
        claim_type=claim["claim_type"],
        service_date=claim["service_date"],
        provider_id=claim.get("provider_id")
    )

    score, factors = calculate_risk_factors(claim_data)
    risk_level = get_risk_level(score)

    # Simulate some processing time for realistic comparison
    processing_delay = random.random() * 0.005  # 0-5ms variance
    time.sleep(processing_delay)

    result = {
        "claim_id": claim_data.claim_id,
        "risk_score": round(score, 2),
        "risk_level": risk_level,
        "factors": factors,
        "timestamp": datetime.now().isoformat()
    }

    return result


def generate_claim_summary(claim: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate formatted summary of a claim

    @query
    """
    start_time = time.time()

    # Convert dict to ClaimData
    claim_data = ClaimData(
        claim_id=claim["claim_id"],
        member_id=claim["member_id"],
        claim_amount=float(claim["claim_amount"]),
        claim_type=claim["claim_type"],
        service_date=claim["service_date"],
        provider_id=claim.get("provider_id")
    )

    # Calculate tax (8% for this example)
    tax_rate = 0.08
    tax_amount = round(claim_data.claim_amount * tax_rate, 2)
    net_amount = round(claim_data.claim_amount + tax_amount, 2)

    # Generate summary text
    summary = (
        f"Claim {claim_data.claim_id} for member {claim_data.member_id}: "
        f"{claim_data.claim_type} service on {claim_data.service_date}. "
        f"Amount: ${claim_data.claim_amount:.2f} + tax ${tax_amount:.2f} = ${net_amount:.2f}"
    )

    result = {
        "claim_id": claim_data.claim_id,
        "member_id": claim_data.member_id,
        "total_amount": claim_data.claim_amount,
        "tax_amount": tax_amount,
        "net_amount": net_amount,
        "status": "PENDING",
        "summary": summary
    }

    return result


def batch_calculate_risk(claims: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Batch calculate risk scores for multiple claims

    @query
    """
    return [calculate_claim_risk(claim) for claim in claims]


# ==================== Mutation Functions ====================

def process_claim(claim: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process and validate an insurance claim

    @mutation
    """
    start_time = time.time()

    # Convert dict to ClaimData
    claim_data = ClaimData(
        claim_id=claim["claim_id"],
        member_id=claim["member_id"],
        claim_amount=float(claim["claim_amount"]),
        claim_type=claim["claim_type"],
        service_date=claim["service_date"],
        provider_id=claim.get("provider_id")
    )

    # Validate claim
    is_valid, errors = validate_claim(claim_data)
    if not is_valid:
        return {
            "claim_id": claim_data.claim_id,
            "status": "REJECTED",
            "approved": False,
            "rejection_reason": "; ".join(errors),
            "processing_time": time.time() - start_time
        }

    # Calculate risk
    score, factors = calculate_risk_factors(claim_data)

    # Auto-approve low risk claims under $5000
    if score < 30 and claim_data.claim_amount < 5000:
        return {
            "claim_id": claim_data.claim_id,
            "status": "APPROVED",
            "approved": True,
            "approved_amount": claim_data.claim_amount,
            "processing_time": time.time() - start_time
        }

    # Reject high risk claims
    if score >= 70:
        return {
            "claim_id": claim_data.claim_id,
            "status": "REJECTED",
            "approved": False,
            "rejection_reason": f"High risk score ({score}): {', '.join(factors)}",
            "processing_time": time.time() - start_time
        }

    # Moderate risk requires manual review
    return {
        "claim_id": claim_data.claim_id,
        "status": "PENDING_REVIEW",
        "approved": False,
        "rejection_reason": f"Requires manual review (risk score: {score})",
        "processing_time": time.time() - start_time
    }


def batch_process_claims(claims: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Batch process multiple claims

    @mutation
    """
    return [process_claim(claim) for claim in claims]


# ==================== Connector Registration ====================

# Note: Actual registration with Hasura Python SDK would happen here
# The decorators above (@query, @mutation) are for documentation
# The SDK will expose these functions based on the connector configuration
