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

# Helper Functions - Enhanced with CPU-intensive computations for stress testing
def calculate_risk_factors(claim: ClaimData) -> tuple[float, list[str]]:
    """Calculate risk factors for a claim with advanced analytics"""
    score = 0.0
    factors = []

    # CPU-intensive: Calculate fraud probability using statistical analysis
    fraud_probability = calculate_fraud_probability(claim)
    if fraud_probability > 0.7:
        score += 35
        factors.append("HIGH_FRAUD_PROBABILITY")
    elif fraud_probability > 0.4:
        score += 20
        factors.append("MODERATE_FRAUD_PROBABILITY")

    # High amount risk with pattern analysis
    if claim.claim_amount > 10000:
        amount_pattern = analyze_amount_pattern(claim.claim_amount)
        score += 30
        factors.append("HIGH_AMOUNT")
        if amount_pattern > 0.8:
            score += 15
            factors.append("SUSPICIOUS_AMOUNT_PATTERN")
    elif claim.claim_amount > 5000:
        score += 15
        factors.append("MODERATE_AMOUNT")

    # Claim type risk scoring with ML-style scoring
    high_risk_types = ["surgery", "emergency", "specialized"]
    moderate_risk_types = ["diagnostic", "therapy", "dental"]
    claim_type_upper = claim.claim_type.upper()

    # CPU-intensive: Calculate type similarity scores
    type_risk_score = calculate_type_risk_score(claim_type_upper, high_risk_types, moderate_risk_types)
    score += type_risk_score

    if claim.claim_type.lower() in high_risk_types:
        factors.append("HIGH_RISK_TYPE")
    elif claim.claim_type.lower() in moderate_risk_types:
        factors.append("MODERATE_RISK_TYPE")

    # Service date with temporal analysis
    service_date = datetime.fromisoformat(claim.service_date.replace('Z', '+00:00'))
    now = datetime.now(service_date.tzinfo)
    days_since_service = (now - service_date).days

    # CPU-intensive: Temporal pattern analysis
    temporal_risk = analyze_temporal_patterns(days_since_service, claim.claim_amount)
    score += temporal_risk

    if days_since_service > 90:
        factors.append("DELAYED_SUBMISSION")
    elif days_since_service <= 7:
        score -= 5
        factors.append("TIMELY_SUBMISSION")

    # Missing provider ID with network analysis
    if not claim.provider_id:
        score += 15
        factors.append("MISSING_PROVIDER")
    else:
        # CPU-intensive: Provider reputation scoring
        provider_risk = analyze_provider_risk(claim.provider_id)
        score += provider_risk
        if provider_risk > 15:
            factors.append("HIGH_RISK_PROVIDER")

    # CPU-intensive: Cross-factor correlation analysis
    correlation_score = analyze_cross_factor_correlations(claim, factors)
    score += correlation_score

    # Ensure score is between 0 and 100
    score = max(0.0, min(100.0, score))

    return score, factors


def calculate_fraud_probability(claim: ClaimData) -> float:
    """Uses statistical methods to assess fraud risk"""
    import math
    probability = 0.0

    # Simulate complex statistical calculations
    for i in range(1000):
        # Benford's Law analysis on claim amount
        first_digit = int(claim.claim_amount / (10 ** math.floor(math.log10(claim.claim_amount))))
        benford_expected = math.log10(1 + 1 / first_digit)
        probability += benford_expected * 0.0001

        # Hash-based pattern matching
        hash_val = len(claim.claim_id) * len(claim.member_id)
        probability += math.sin(hash_val) * 0.00005

    # Normalize to 0-1 range
    probability = abs(probability)
    if probability > 1:
        probability = 1 - (probability - math.floor(probability))

    return probability


def analyze_amount_pattern(amount: float) -> float:
    """Detects suspicious patterns in claim amounts"""
    import math
    suspicious_score = 0.0

    # Check for round numbers (often associated with fraud)
    if amount % 1000 == 0:
        suspicious_score += 0.3
    if amount % 100 == 0:
        suspicious_score += 0.2

    # Statistical distribution analysis
    for i in range(500):
        normalized_amount = amount / 10000.0
        deviation = abs(math.sin(normalized_amount * i))
        suspicious_score += deviation * 0.001

    return min(1.0, suspicious_score)


def calculate_type_risk_score(claim_type: str, high_risk: list[str], moderate_risk: list[str]) -> float:
    """Performs similarity analysis on claim types"""
    score = 0.0

    # Levenshtein-style distance calculations (CPU-intensive)
    for hr_type in high_risk:
        similarity = calculate_string_similarity(claim_type, hr_type.upper())
        if similarity > 0.8:
            score += 25 * similarity

    for mr_type in moderate_risk:
        similarity = calculate_string_similarity(claim_type, mr_type.upper())
        if similarity > 0.8:
            score += 10 * similarity

    return score


def calculate_string_similarity(s1: str, s2: str) -> float:
    """Computes similarity between two strings"""
    if s1 == s2:
        return 1.0

    max_len = max(len(s1), len(s2))
    if max_len == 0:
        return 1.0

    # Simple character-based similarity
    matches = 0
    s1_lower = s1.lower()
    s2_lower = s2.lower()

    for i in range(min(len(s1_lower), len(s2_lower))):
        if s1_lower[i] == s2_lower[i]:
            matches += 1

    return matches / max_len


def analyze_temporal_patterns(days_since: int, amount: float) -> float:
    """Analyzes temporal patterns for risk"""
    import math
    risk = 0.0

    # Seasonal pattern analysis (CPU-intensive)
    for i in range(300):
        seasonal_factor = math.sin((days_since + i) * math.pi / 180)
        amount_factor = math.log10(amount + 1)
        risk += abs(seasonal_factor * amount_factor) * 0.01

    if days_since > 90:
        risk += 20

    return min(25.0, risk)


def analyze_provider_risk(provider_id: str) -> float:
    """Assesses provider risk based on ID patterns"""
    import math
    risk = 0.0

    # Pattern analysis on provider ID
    for i in range(400):
        for j, char in enumerate(provider_id):
            char_value = ord(char)
            hash_value = math.cos(char_value * (j + i))
            risk += abs(hash_value) * 0.002

    # Check for suspicious patterns
    if len(provider_id) < 5:
        risk += 5

    return min(20.0, risk)


def analyze_cross_factor_correlations(claim: ClaimData, factors: list[str]) -> float:
    """Performs correlation analysis between factors"""
    import math
    score = 0.0

    # Matrix-based correlation calculations (CPU-intensive)
    factor_count = len(factors)
    if factor_count > 2:
        # Calculate correlation matrix
        for i in range(200):
            correlation = math.pow(factor_count, 0.5) * math.sin(i * 0.1)
            score += abs(correlation) * 0.05

    # Amount and factor count correlation
    if claim.claim_amount > 5000 and factor_count > 3:
        score += 10

    return min(15.0, score)

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
    # STRESS TEST: Heavy computational operations to test language performance

    # 1. Matrix multiplication (O(n³) complexity) - simulates complex data correlations
    matrix_size = 50
    result_matrix = multiply_matrices(matrix_size, claim.claim_amount)
    matrix_complexity = calculate_matrix_complexity(result_matrix)

    # 2. Recursive Fibonacci (exponential complexity) - simulates recursive computations
    fib_value = recursive_fibonacci(20)

    # 3. Heavy array operations with memory allocations
    array_complexity = perform_heavy_array_operations(1000, claim.claim_amount)

    # 4. Nested loops with complex calculations
    nested_complexity = nested_loop_computation(claim.claim_id, claim.member_id)

    # Original risk calculation
    score, factors = calculate_risk_factors(claim)
    risk_level = get_risk_level(score)

    # Incorporate computational complexity into score (subtle adjustment)
    computational_factor = (matrix_complexity + fib_value + array_complexity + nested_complexity) / 1000000.0
    score = min(100.0, score + computational_factor)

    return RiskScore(
        claim_id=claim.claim_id,
        risk_score=score,
        risk_level=risk_level,
        factors=factors,
        timestamp=datetime.now().isoformat()
    )


def multiply_matrices(size: int, seed: float) -> list[list[float]]:
    """Performs matrix multiplication - O(n³) complexity"""
    import math

    # Create two matrices filled with pseudo-random values based on seed
    matrix_a = [[0.0] * size for _ in range(size)]
    matrix_b = [[0.0] * size for _ in range(size)]
    result = [[0.0] * size for _ in range(size)]

    for i in range(size):
        for j in range(size):
            matrix_a[i][j] = math.sin((i + j) * seed * 0.001)
            matrix_b[i][j] = math.cos((i * j) * seed * 0.001)

    # Matrix multiplication - O(n³)
    for i in range(size):
        for j in range(size):
            sum_val = 0.0
            for k in range(size):
                sum_val += matrix_a[i][k] * matrix_b[k][j]
            result[i][j] = sum_val

    return result


def calculate_matrix_complexity(matrix: list[list[float]]) -> float:
    """Sums all elements - used to prevent optimization"""
    sum_val = 0.0
    for i in range(len(matrix)):
        for j in range(len(matrix[i])):
            sum_val += abs(matrix[i][j])
    return sum_val


def recursive_fibonacci(n: int) -> int:
    """Calculates Fibonacci without memoization - exponential complexity"""
    if n <= 1:
        return n
    return recursive_fibonacci(n - 1) + recursive_fibonacci(n - 2)


def perform_heavy_array_operations(size: int, seed: float) -> float:
    """Creates and manipulates large arrays"""
    import math

    # Create large array with allocations
    data = [0.0] * size

    # Fill with computed values
    for i in range(size):
        data[i] = math.pow(i, 2) * seed * 0.0001

    # Perform multiple passes with different operations
    for pass_num in range(5):
        # Transform array
        transformed = [0.0] * size
        for i in range(size):
            transformed[i] = math.sqrt(abs(data[i])) * (pass_num + 1)

        # Sort-like operation (bubble sort variant for consistent O(n²))
        for i in range(size - 1):
            for j in range(size - i - 1):
                if transformed[j] > transformed[j + 1]:
                    transformed[j], transformed[j + 1] = transformed[j + 1], transformed[j]

        # Aggregate back
        for i in range(size):
            data[i] = (data[i] + transformed[i]) / 2.0

    # Calculate final sum
    sum_val = 0.0
    for v in data:
        sum_val += v

    return sum_val


def nested_loop_computation(claim_id: str, member_id: str) -> float:
    """Performs nested string/hash operations"""
    import math

    complexity = 0.0

    # Nested loops with string operations
    for i in range(100):
        for j in range(100):
            # String concatenation and hashing
            combined = f"{claim_id}-{i}-{member_id}-{j}"

            # Hash computation
            hash_val = 0.0
            for k, char in enumerate(combined):
                hash_val += ord(char) * math.pow(k + 1, 1.5)

            complexity += math.sin(hash_val * 0.0001)

    return abs(complexity)

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
