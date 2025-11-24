package functions

import (
	"context"
	"fmt"
	"math"
	"strings"
	"time"

	"hasura-ndc.dev/ndc-go/types"
)

// ==================== Type Definitions ====================

// ClaimData represents input data for an insurance claim
type ClaimData struct {
	ClaimID     string  `json:"claim_id"`
	MemberID    string  `json:"member_id"`
	ClaimAmount float64 `json:"claim_amount"`
	ClaimType   string  `json:"claim_type"`
	ServiceDate string  `json:"service_date"`
	ProviderID  *string `json:"provider_id,omitempty"`
}

// RiskScore represents risk assessment result for a claim
type RiskScore struct {
	ClaimID   string   `json:"claim_id"`
	RiskScore float64  `json:"risk_score"`
	RiskLevel string   `json:"risk_level"`
	Factors   []string `json:"factors"`
	Timestamp string   `json:"timestamp"`
}

// ClaimProcessResult represents the result of processing a claim
type ClaimProcessResult struct {
	ClaimID         string   `json:"claim_id"`
	Status          string   `json:"status"`
	Approved        bool     `json:"approved"`
	ApprovedAmount  *float64 `json:"approved_amount,omitempty"`
	RejectionReason *string  `json:"rejection_reason,omitempty"`
	ProcessingTime  float64  `json:"processing_time"`
}

// ClaimSummary represents a formatted summary of a claim
type ClaimSummary struct {
	ClaimID     string  `json:"claim_id"`
	MemberID    string  `json:"member_id"`
	TotalAmount float64 `json:"total_amount"`
	TaxAmount   float64 `json:"tax_amount"`
	NetAmount   float64 `json:"net_amount"`
	Status      string  `json:"status"`
	Summary     string  `json:"summary"`
}

// ==================== Helper Functions ====================

// calculateRiskFactors calculates risk factors based on claim characteristics
// Enhanced with CPU-intensive computations for stress testing
func calculateRiskFactors(claim ClaimData) (float64, []string) {
	score := 0.0
	factors := []string{}

	// CPU-intensive: Calculate fraud probability using statistical analysis
	fraudProbability := calculateFraudProbability(claim)
	if fraudProbability > 0.7 {
		score += 35
		factors = append(factors, "HIGH_FRAUD_PROBABILITY")
	} else if fraudProbability > 0.4 {
		score += 20
		factors = append(factors, "MODERATE_FRAUD_PROBABILITY")
	}

	// High amount risk (>$10,000) with pattern analysis
	if claim.ClaimAmount > 10000 {
		// CPU-intensive: Analyze amount patterns
		amountPattern := analyzeAmountPattern(claim.ClaimAmount)
		score += 30
		factors = append(factors, "HIGH_AMOUNT")
		if amountPattern > 0.8 {
			score += 15
			factors = append(factors, "SUSPICIOUS_AMOUNT_PATTERN")
		}
	} else if claim.ClaimAmount > 5000 {
		score += 15
		factors = append(factors, "MODERATE_AMOUNT")
	}

	// Claim type risk scoring with ML-style scoring
	highRiskTypes := []string{"SURGERY", "EMERGENCY", "SPECIALIZED"}
	moderateRiskTypes := []string{"DIAGNOSTIC", "THERAPY", "DENTAL"}

	claimTypeUpper := strings.ToUpper(claim.ClaimType)

	// CPU-intensive: Calculate type similarity scores
	typeRiskScore := calculateTypeRiskScore(claimTypeUpper, highRiskTypes, moderateRiskTypes)
	score += typeRiskScore

	if contains(highRiskTypes, claimTypeUpper) {
		factors = append(factors, "HIGH_RISK_TYPE")
	} else if contains(moderateRiskTypes, claimTypeUpper) {
		factors = append(factors, "MODERATE_RISK_TYPE")
	}

	// Recent service date with temporal analysis
	serviceDate, err := time.Parse(time.RFC3339, claim.ServiceDate)
	if err != nil {
		serviceDate, err = time.Parse("2006-01-02", claim.ServiceDate)
	}

	if err == nil {
		daysSinceService := int(time.Since(serviceDate).Hours() / 24)

		// CPU-intensive: Temporal pattern analysis
		temporalRisk := analyzeTemporalPatterns(daysSinceService, claim.ClaimAmount)
		score += temporalRisk

		if daysSinceService > 90 {
			factors = append(factors, "DELAYED_SUBMISSION")
		} else if daysSinceService <= 7 {
			score -= 5
			factors = append(factors, "TIMELY_SUBMISSION")
		}
	} else {
		score += 10
		factors = append(factors, "INVALID_DATE")
	}

	// Missing provider ID with network analysis
	if claim.ProviderID == nil || *claim.ProviderID == "" {
		score += 15
		factors = append(factors, "MISSING_PROVIDER")
	} else {
		// CPU-intensive: Provider reputation scoring
		providerRisk := analyzeProviderRisk(*claim.ProviderID)
		score += providerRisk
		if providerRisk > 15 {
			factors = append(factors, "HIGH_RISK_PROVIDER")
		}
	}

	// CPU-intensive: Cross-factor correlation analysis
	correlationScore := analyzeCrossFactorCorrelations(claim, factors)
	score += correlationScore

	// Ensure score is between 0 and 100
	score = math.Max(0, math.Min(100, score))

	return score, factors
}

// calculateFraudProbability uses statistical methods to assess fraud risk
func calculateFraudProbability(claim ClaimData) float64 {
	probability := 0.0

	// Simulate complex statistical calculations
	for i := 0; i < 1000; i++ {
		// Benford's Law analysis on claim amount
		firstDigit := int(math.Floor(claim.ClaimAmount / math.Pow(10, math.Floor(math.Log10(claim.ClaimAmount)))))
		benfordExpected := math.Log10(1 + 1/float64(firstDigit))
		probability += benfordExpected * 0.0001

		// Hash-based pattern matching
		hash := float64(len(claim.ClaimID) * len(claim.MemberID))
		probability += math.Sin(hash) * 0.00005
	}

	// Normalize to 0-1 range
	probability = math.Abs(probability)
	if probability > 1 {
		probability = 1 - (probability - math.Floor(probability))
	}

	return probability
}

// analyzeAmountPattern detects suspicious patterns in claim amounts
func analyzeAmountPattern(amount float64) float64 {
	suspiciousScore := 0.0

	// Check for round numbers (often associated with fraud)
	if math.Mod(amount, 1000) == 0 {
		suspiciousScore += 0.3
	}
	if math.Mod(amount, 100) == 0 {
		suspiciousScore += 0.2
	}

	// Statistical distribution analysis
	for i := 0; i < 500; i++ {
		normalizedAmount := amount / 10000.0
		deviation := math.Abs(math.Sin(normalizedAmount * float64(i)))
		suspiciousScore += deviation * 0.001
	}

	return math.Min(1.0, suspiciousScore)
}

// calculateTypeRiskScore performs similarity analysis on claim types
func calculateTypeRiskScore(claimType string, highRisk, moderateRisk []string) float64 {
	score := 0.0

	// Levenshtein-style distance calculations (CPU-intensive)
	for _, hrType := range highRisk {
		similarity := calculateStringSimilarity(claimType, hrType)
		if similarity > 0.8 {
			score += 25 * similarity
		}
	}

	for _, mrType := range moderateRisk {
		similarity := calculateStringSimilarity(claimType, mrType)
		if similarity > 0.8 {
			score += 10 * similarity
		}
	}

	return score
}

// calculateStringSimilarity computes similarity between two strings
func calculateStringSimilarity(s1, s2 string) float64 {
	if s1 == s2 {
		return 1.0
	}

	maxLen := math.Max(float64(len(s1)), float64(len(s2)))
	if maxLen == 0 {
		return 1.0
	}

	// Simple character-based similarity
	matches := 0.0
	s1Lower := strings.ToLower(s1)
	s2Lower := strings.ToLower(s2)

	for i := 0; i < len(s1Lower) && i < len(s2Lower); i++ {
		if s1Lower[i] == s2Lower[i] {
			matches++
		}
	}

	return matches / maxLen
}

// analyzeTemporalPatterns analyzes temporal patterns for risk
func analyzeTemporalPatterns(daysSince int, amount float64) float64 {
	risk := 0.0

	// Seasonal pattern analysis (CPU-intensive)
	for i := 0; i < 300; i++ {
		seasonalFactor := math.Sin(float64(daysSince+i) * math.Pi / 180)
		amountFactor := math.Log10(amount + 1)
		risk += math.Abs(seasonalFactor*amountFactor) * 0.01
	}

	if daysSince > 90 {
		risk += 20
	}

	return math.Min(25, risk)
}

// analyzeProviderRisk assesses provider risk based on ID patterns
func analyzeProviderRisk(providerID string) float64 {
	risk := 0.0

	// Pattern analysis on provider ID
	for i := 0; i < 400; i++ {
		for j, char := range providerID {
			charValue := float64(char)
			hashValue := math.Cos(charValue * float64(j+i))
			risk += math.Abs(hashValue) * 0.002
		}
	}

	// Check for suspicious patterns
	if len(providerID) < 5 {
		risk += 5
	}

	return math.Min(20, risk)
}

// analyzeCrossFactorCorrelations performs correlation analysis between factors
func analyzeCrossFactorCorrelations(claim ClaimData, factors []string) float64 {
	score := 0.0

	// Matrix-based correlation calculations (CPU-intensive)
	factorCount := float64(len(factors))
	if factorCount > 2 {
		// Calculate correlation matrix
		for i := 0; i < 200; i++ {
			correlation := math.Pow(factorCount, 0.5) * math.Sin(float64(i)*0.1)
			score += math.Abs(correlation) * 0.05
		}
	}

	// Amount and factor count correlation
	if claim.ClaimAmount > 5000 && factorCount > 3 {
		score += 10
	}

	return math.Min(15, score)
}

// getRiskLevel determines risk level from score
func getRiskLevel(score float64) string {
	if score >= 70 {
		return "HIGH"
	} else if score >= 40 {
		return "MEDIUM"
	}
	return "LOW"
}

// validateClaim validates claim data
func validateClaim(claim ClaimData) (bool, []string) {
	errors := []string{}

	if claim.ClaimID == "" || strings.TrimSpace(claim.ClaimID) == "" {
		errors = append(errors, "Missing claim ID")
	}
	if claim.MemberID == "" || strings.TrimSpace(claim.MemberID) == "" {
		errors = append(errors, "Missing member ID")
	}
	if claim.ClaimAmount <= 0 {
		errors = append(errors, "Invalid claim amount")
	}
	if claim.ClaimAmount > 100000 {
		errors = append(errors, "Claim amount exceeds maximum limit")
	}
	if claim.ClaimType == "" {
		errors = append(errors, "Missing claim type")
	}
	if claim.ServiceDate == "" {
		errors = append(errors, "Missing service date")
	}

	return len(errors) == 0, errors
}

// contains checks if a slice contains a string
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// round rounds a float to 2 decimal places
func round(num float64) float64 {
	return math.Round(num*100) / 100
}

// ==================== Query Functions ====================

// CalculateClaimRiskArguments wraps the claim argument
type CalculateClaimRiskArguments struct {
	Claim ClaimData `json:"claim"`
}

// FunctionCalculateClaimRisk calculates risk score for an insurance claim
// Query functions in Go start with "Function" prefix
func FunctionCalculateClaimRisk(ctx context.Context, state *types.State, args *CalculateClaimRiskArguments) (*RiskScore, error) {
	// STRESS TEST: Heavy computational operations to test language performance

	// 1. Matrix multiplication (O(n³) complexity) - simulates complex data correlations
	matrixSize := 50
	resultMatrix := multiplyMatrices(matrixSize, args.Claim.ClaimAmount)
	matrixComplexity := calculateMatrixComplexity(resultMatrix)

	// 2. Recursive Fibonacci (exponential complexity) - simulates recursive computations
	fibValue := recursiveFibonacci(20)

	// 3. Heavy array operations with memory allocations
	arrayComplexity := performHeavyArrayOperations(1000, args.Claim.ClaimAmount)

	// 4. Nested loops with complex calculations
	nestedComplexity := nestedLoopComputation(args.Claim.ClaimID, args.Claim.MemberID)

	// Original risk calculation
	score, factors := calculateRiskFactors(args.Claim)
	riskLevel := getRiskLevel(score)

	// Incorporate computational complexity into score (subtle adjustment)
	computationalFactor := (matrixComplexity + float64(fibValue) + arrayComplexity + nestedComplexity) / 1000000.0
	score = math.Min(100, score+computationalFactor)

	result := &RiskScore{
		ClaimID:   args.Claim.ClaimID,
		RiskScore: round(score),
		RiskLevel: riskLevel,
		Factors:   factors,
		Timestamp: time.Now().Format(time.RFC3339),
	}

	return result, nil
}

// multiplyMatrices performs matrix multiplication - O(n³) complexity
func multiplyMatrices(size int, seed float64) [][]float64 {
	// Create two matrices filled with pseudo-random values based on seed
	matrixA := make([][]float64, size)
	matrixB := make([][]float64, size)
	result := make([][]float64, size)

	for i := 0; i < size; i++ {
		matrixA[i] = make([]float64, size)
		matrixB[i] = make([]float64, size)
		result[i] = make([]float64, size)

		for j := 0; j < size; j++ {
			matrixA[i][j] = math.Sin(float64(i+j) * seed * 0.001)
			matrixB[i][j] = math.Cos(float64(i*j) * seed * 0.001)
		}
	}

	// Matrix multiplication - O(n³)
	for i := 0; i < size; i++ {
		for j := 0; j < size; j++ {
			sum := 0.0
			for k := 0; k < size; k++ {
				sum += matrixA[i][k] * matrixB[k][j]
			}
			result[i][j] = sum
		}
	}

	return result
}

// calculateMatrixComplexity sums all elements - used to prevent optimization
func calculateMatrixComplexity(matrix [][]float64) float64 {
	sum := 0.0
	for i := range matrix {
		for j := range matrix[i] {
			sum += math.Abs(matrix[i][j])
		}
	}
	return sum
}

// recursiveFibonacci calculates Fibonacci without memoization - exponential complexity
func recursiveFibonacci(n int) int {
	if n <= 1 {
		return n
	}
	return recursiveFibonacci(n-1) + recursiveFibonacci(n-2)
}

// performHeavyArrayOperations creates and manipulates large arrays
func performHeavyArrayOperations(size int, seed float64) float64 {
	// Create large array with allocations
	data := make([]float64, size)

	// Fill with computed values
	for i := 0; i < size; i++ {
		data[i] = math.Pow(float64(i), 2) * seed * 0.0001
	}

	// Perform multiple passes with different operations
	for pass := 0; pass < 5; pass++ {
		// Transform array
		transformed := make([]float64, size)
		for i := 0; i < size; i++ {
			transformed[i] = math.Sqrt(math.Abs(data[i])) * float64(pass+1)
		}

		// Sort-like operation (bubble sort variant for consistent O(n²))
		for i := 0; i < size-1; i++ {
			for j := 0; j < size-i-1; j++ {
				if transformed[j] > transformed[j+1] {
					transformed[j], transformed[j+1] = transformed[j+1], transformed[j]
				}
			}
		}

		// Aggregate back
		for i := 0; i < size; i++ {
			data[i] = (data[i] + transformed[i]) / 2.0
		}
	}

	// Calculate final sum
	sum := 0.0
	for _, v := range data {
		sum += v
	}

	return sum
}

// nestedLoopComputation performs nested string/hash operations
func nestedLoopComputation(claimID, memberID string) float64 {
	complexity := 0.0

	// Nested loops with string operations
	for i := 0; i < 100; i++ {
		for j := 0; j < 100; j++ {
			// String concatenation and hashing
			combined := fmt.Sprintf("%s-%d-%s-%d", claimID, i, memberID, j)

			// Hash computation
			hash := 0.0
			for k, char := range combined {
				hash += float64(char) * math.Pow(float64(k+1), 1.5)
			}

			complexity += math.Sin(hash * 0.0001)
		}
	}

	return math.Abs(complexity)
}

// GenerateClaimSummaryArguments wraps the claim argument
type GenerateClaimSummaryArguments struct {
	Claim ClaimData `json:"claim"`
}

// FunctionGenerateClaimSummary generates formatted summary of a claim
func FunctionGenerateClaimSummary(ctx context.Context, state *types.State, args *GenerateClaimSummaryArguments) (*ClaimSummary, error) {
	startTime := time.Now()

	// Calculate tax (8% for this example)
	taxRate := 0.08
	taxAmount := round(args.Claim.ClaimAmount * taxRate)
	netAmount := round(args.Claim.ClaimAmount + taxAmount)

	// Generate summary text
	summary := fmt.Sprintf(
		"Claim %s for member %s: %s service on %s. Amount: $%.2f + tax $%.2f = $%.2f",
		args.Claim.ClaimID,
		args.Claim.MemberID,
		args.Claim.ClaimType,
		args.Claim.ServiceDate,
		args.Claim.ClaimAmount,
		taxAmount,
		netAmount,
	)

	result := &ClaimSummary{
		ClaimID:     args.Claim.ClaimID,
		MemberID:    args.Claim.MemberID,
		TotalAmount: args.Claim.ClaimAmount,
		TaxAmount:   taxAmount,
		NetAmount:   netAmount,
		Status:      "PENDING",
		Summary:     summary,
	}

	_ = startTime // Use startTime to avoid unused variable warning

	return result, nil
}

// BatchCalculateRiskArguments for batch processing
type BatchCalculateRiskArguments struct {
	Claims []ClaimData `json:"claims"`
}

// FunctionBatchCalculateRisk batch calculates risk scores for multiple claims
func FunctionBatchCalculateRisk(ctx context.Context, state *types.State, args *BatchCalculateRiskArguments) ([]RiskScore, error) {
	results := make([]RiskScore, len(args.Claims))
	for i, claim := range args.Claims {
		claimArgs := &CalculateClaimRiskArguments{Claim: claim}
		result, err := FunctionCalculateClaimRisk(ctx, state, claimArgs)
		if err != nil {
			return nil, err
		}
		results[i] = *result
	}
	return results, nil
}

// ==================== Mutation Functions ====================

// ProcessClaimArguments wraps the claim argument
type ProcessClaimArguments struct {
	Claim ClaimData `json:"claim"`
}

// ProcedureProcessClaim processes and validates an insurance claim
// Mutation functions in Go start with "Procedure" prefix
func ProcedureProcessClaim(ctx context.Context, state *types.State, args *ProcessClaimArguments) (*ClaimProcessResult, error) {
	startTime := time.Now()

	// Validate claim
	isValid, validationErrors := validateClaim(args.Claim)
	if !isValid {
		rejectionReason := strings.Join(validationErrors, "; ")
		return &ClaimProcessResult{
			ClaimID:         args.Claim.ClaimID,
			Status:          "REJECTED",
			Approved:        false,
			RejectionReason: &rejectionReason,
			ProcessingTime:  time.Since(startTime).Seconds(),
		}, nil
	}

	// Calculate risk
	score, factors := calculateRiskFactors(args.Claim)

	// Auto-approve low risk claims under $5000
	if score < 30 && args.Claim.ClaimAmount < 5000 {
		approvedAmount := args.Claim.ClaimAmount
		return &ClaimProcessResult{
			ClaimID:        args.Claim.ClaimID,
			Status:         "APPROVED",
			Approved:       true,
			ApprovedAmount: &approvedAmount,
			ProcessingTime: time.Since(startTime).Seconds(),
		}, nil
	}

	// Reject high risk claims
	if score >= 70 {
		rejectionReason := fmt.Sprintf("High risk score (%.0f): %s", score, strings.Join(factors, ", "))
		return &ClaimProcessResult{
			ClaimID:         args.Claim.ClaimID,
			Status:          "REJECTED",
			Approved:        false,
			RejectionReason: &rejectionReason,
			ProcessingTime:  time.Since(startTime).Seconds(),
		}, nil
	}

	// Moderate risk requires manual review
	rejectionReason := fmt.Sprintf("Requires manual review (risk score: %.0f)", score)
	return &ClaimProcessResult{
		ClaimID:         args.Claim.ClaimID,
		Status:          "PENDING_REVIEW",
		Approved:        false,
		RejectionReason: &rejectionReason,
		ProcessingTime:  time.Since(startTime).Seconds(),
	}, nil
}

// BatchProcessClaimsArguments for batch processing
type BatchProcessClaimsArguments struct {
	Claims []ClaimData `json:"claims"`
}

// ProcedureBatchProcessClaims batch processes multiple claims
func ProcedureBatchProcessClaims(ctx context.Context, state *types.State, args *BatchProcessClaimsArguments) ([]ClaimProcessResult, error) {
	results := make([]ClaimProcessResult, len(args.Claims))
	for i, claim := range args.Claims {
		claimArgs := &ProcessClaimArguments{Claim: claim}
		result, err := ProcedureProcessClaim(ctx, state, claimArgs)
		if err != nil {
			return nil, err
		}
		results[i] = *result
	}
	return results, nil
}
