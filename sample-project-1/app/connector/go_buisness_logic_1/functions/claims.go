package functions

import (
	"context"
	"fmt"
	"math"
	"math/rand"
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
func calculateRiskFactors(claim ClaimData) (float64, []string) {
	score := 0.0
	factors := []string{}

	// High amount risk (>$10,000)
	if claim.ClaimAmount > 10000 {
		score += 30
		factors = append(factors, "HIGH_AMOUNT")
	} else if claim.ClaimAmount > 5000 {
		score += 15
		factors = append(factors, "MODERATE_AMOUNT")
	}

	// Claim type risk scoring
	highRiskTypes := []string{"SURGERY", "EMERGENCY", "SPECIALIZED"}
	moderateRiskTypes := []string{"DIAGNOSTIC", "THERAPY", "DENTAL"}

	claimTypeUpper := strings.ToUpper(claim.ClaimType)
	if contains(highRiskTypes, claimTypeUpper) {
		score += 25
		factors = append(factors, "HIGH_RISK_TYPE")
	} else if contains(moderateRiskTypes, claimTypeUpper) {
		score += 10
		factors = append(factors, "MODERATE_RISK_TYPE")
	}

	// Recent service date (within 30 days) - lower risk
	serviceDate, err := time.Parse(time.RFC3339, claim.ServiceDate)
	if err != nil {
		// Try alternative format
		serviceDate, err = time.Parse("2006-01-02", claim.ServiceDate)
	}

	if err == nil {
		daysSinceService := int(time.Since(serviceDate).Hours() / 24)

		if daysSinceService > 90 {
			score += 20
			factors = append(factors, "DELAYED_SUBMISSION")
		} else if daysSinceService <= 7 {
			score -= 5
			factors = append(factors, "TIMELY_SUBMISSION")
		}
	} else {
		score += 10
		factors = append(factors, "INVALID_DATE")
	}

	// Missing provider ID
	if claim.ProviderID == nil || *claim.ProviderID == "" {
		score += 15
		factors = append(factors, "MISSING_PROVIDER")
	}

	// Ensure score is between 0 and 100
	score = math.Max(0, math.Min(100, score))

	return score, factors
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
	startTime := time.Now()

	score, factors := calculateRiskFactors(args.Claim)
	riskLevel := getRiskLevel(score)

	// Simulate some processing time for realistic comparison
	processingDelay := time.Duration(rand.Float64()*5) * time.Millisecond
	time.Sleep(processingDelay)

	result := &RiskScore{
		ClaimID:   args.Claim.ClaimID,
		RiskScore: round(score),
		RiskLevel: riskLevel,
		Factors:   factors,
		Timestamp: time.Now().Format(time.RFC3339),
	}

	_ = startTime // Use startTime to avoid unused variable warning

	return result, nil
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
