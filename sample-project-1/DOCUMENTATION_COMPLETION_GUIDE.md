# Metadata Documentation Completion Guide

This guide provides the pattern and content for adding descriptions to all remaining metadata files.

## Progress Status

### ✅ Completed
1. **ARCHITECTURE_DOCUMENTATION.md** - Comprehensive Mermaid diagrams and system documentation
2. **Members.hml** - Full field descriptions added

### 🔄 In Progress
Remaining 44 files to be documented following the patterns below.

---

## Documentation Pattern

### For ObjectType Definitions

```yaml
kind: ObjectType
version: v1
definition:
  name: EntityName
  description: [1-2 sentence description of what this entity represents and its purpose]
  fields:
    - name: fieldName
      type: Type!
      description: [1-2 sentence description of the field, including valid values, format, and usage]
```

### For Model Definitions

```yaml
kind: Model
version: v2
definition:
  name: ModelName
  objectType: ModelName
  description: [Same description as ObjectType above for consistency]
```

### For Command Definitions

```yaml
kind: Command
version: v1
definition:
  name: CommandName
  description: [1-2 sentences describing what the function does, parameters, and return value]
  outputType: ReturnType
  arguments:
    - name: argName
      type: ArgType!
      description: [Description of the argument]
```

---

## File-by-File Content Guide

### 1. Members_1.hml (Insurance HMO Variant)

**Use same descriptions as Members.hml** - this is the HMO database variant with identical schema.

---

### 2. Claims.hml

**ObjectType Description:**
```
Medical claims submitted by healthcare providers for reimbursement. Represents requests for payment based on services provided, tracked through adjudication from submission to payment or denial.
```

**Field Descriptions:**
- **id**: Unique claim identifier. Primary key for billing and audit tracking.
- **memberId**: Foreign key to member who received services. Links claim to patient record.
- **providerId**: Foreign key to provider who rendered services. Links claim to billing provider.
- **dos**: Date of Service - actual date services were provided. Critical for eligibility verification and timely filing.
- **cpt**: Current Procedural Terminology code (5-digit). Standardized medical procedure code (e.g., 99213 for office visit).
- **chargeCents**: Amount provider billed in cents (e.g., 50000 = $500.00). Provider's standard charge before adjustments.
- **allowedCents**: Amount plan allows in cents. Maximum reimbursement based on contracted rates. Difference may be written off (in-network) or balance-billed (out-of-network).
- **status**: Claim adjudication status. Valid values: PENDING (awaiting review), PAID (approved and paid), DENIED (rejected, see denialReason).
- **denialReason**: Explanation for denied claims. Common values: "Not eligible on DOS", "Service not covered", "Duplicate claim", "Coding error".
- **externalReferenceId**: Cross-database correlation identifier for linking related claims across multiple systems.
- **createdAt**: Timestamp when claim was submitted to system.
- **updatedAt**: Timestamp of last status change or modification.

---

### 3. Claims_1.hml

**Use same descriptions as Claims.hml** - this is the HMO database variant with identical schema.

---

### 4. ProviderRecords.hml

**ObjectType Description:**
```
Healthcare providers (physicians, hospitals, clinics) who render services to members. Maintains network and credential information for billing and care coordination.
```

**Field Descriptions:**
- **id**: Unique provider identifier within system. Primary key for provider relationships.
- **name**: Provider's full name or facility name as registered.
- **npi**: National Provider Identifier - unique 10-digit number required by HIPAA for all healthcare providers (e.g., 1234567890). Type 1 = individuals, Type 2 = organizations.
- **specialty**: Provider's medical specialty or practice type (e.g., "Cardiology", "Family Medicine", "Radiology").
- **externalReferenceId**: Cross-database linking identifier. Set to NPI value for universal provider matching across systems.
- **createdAt**: Timestamp when provider was added to network.
- **updatedAt**: Timestamp of last credential or information update.

---

### 5. ProviderRecords_1.hml

**Use same descriptions as ProviderRecords.hml** - HMO database variant.

---

### 6. EligibilityChecks.hml & EligibilityChecks_1.hml

**ObjectType Description:**
```
Member eligibility verification results. Validates coverage status, benefits, and authorization requirements before services are rendered.
```

**Field Descriptions:**
- **id**: Unique identifier for the eligibility check transaction.
- **memberId**: Foreign key to member being verified.
- **checkedAt**: Timestamp when eligibility verification was performed.
- **result**: JSON object containing eligibility details - plan type, deductibles, coinsurance rates, out-of-pocket maximums, coverage status.
- **createdAt**: Timestamp when verification record was created.

---

### 7. Notes.hml & Notes_1.hml

**ObjectType Description:**
```
Case management notes and member communication records. Tracks interactions, care coordination activities, and important member-specific information.
```

**Field Descriptions:**
- **id**: Unique identifier for the note.
- **memberId**: Foreign key to member this note pertains to.
- **body**: Free-text note content. May include care instructions, authorization details, or communication summaries.
- **createdAt**: Timestamp when note was created.

---

### 8. AppointmentsAppointments.hml

**ObjectType Description:**
```
Scheduled healthcare appointments between members and providers. Tracks appointment lifecycle from scheduling through completion across multiple insurance systems.
```

**Field Descriptions:**
- **id**: Unique appointment identifier.
- **memberId**: Foreign key to member (may reference members from either insurance database).
- **providerId**: Foreign key to provider (may reference providers from either insurance database).
- **appointmentDate**: Scheduled date and time for the appointment.
- **status**: Appointment status. Valid values: SCHEDULED (upcoming), COMPLETED (attended), CANCELLED (canceled before date), NO_SHOW (member didn't attend).
- **notes**: Free-text notes about appointment purpose, special instructions, or outcomes.
- **externalReferenceId**: Correlation identifier for linking related appointments or tracking multi-visit care episodes.
- **createdAt**: Timestamp when appointment was originally scheduled.
- **updatedAt**: Timestamp of last appointment modification (reschedule, cancellation, completion).

---

### 9. AppointmentsBillingRecords.hml

**ObjectType Description:**
```
Billing records linking insurance claims to appointment visits. Tracks payment status and reconciliation between scheduled services and claims submitted.
```

**Field Descriptions:**
- **id**: Unique billing record identifier.
- **claimId**: Foreign key to associated insurance claim (may reference claims from either insurance database).
- **amountBilled**: Total amount billed to insurance for the visit (in cents).
- **amountPaid**: Amount actually paid by insurance (in cents). May be less than billed due to contractual adjustments.
- **paymentDate**: Date payment was received from insurance. NULL if claim still pending or denied.
- **paymentMethod**: Payment categorization. Valid values: INSURANCE (plan payment), COPAY (patient copayment), DEDUCTIBLE (applied to deductible), OUT_OF_POCKET (patient responsibility).
- **createdAt**: Timestamp when billing record was created.
- **updatedAt**: Timestamp of last payment status update.

---

### 10. MedicationsPrescriptions.hml

**ObjectType Description:**
```
Active and historical prescription medications for members. Tracks medication therapy for care coordination, drug interaction checking, and pharmacy benefit management.
```

**Field Descriptions:**
- **id**: Unique prescription identifier.
- **memberId**: Foreign key to member receiving medication (may reference members from either insurance database).
- **providerId**: Foreign key to prescribing provider (may reference providers from either insurance database).
- **medicationName**: Generic or brand name of prescribed medication.
- **dosage**: Medication strength (e.g., "10mg", "500mg", "5mg/ml").
- **frequency**: How often medication should be taken. Common values: "QD" (daily), "BID" (twice daily), "TID" (three times daily), "QID" (four times), "PRN" (as needed).
- **startDate**: Date prescription becomes active/filled.
- **endDate**: Date prescription expires or treatment ends. NULL for ongoing medications.
- **refillsRemaining**: Number of authorized refills left before new prescription required. 0 = must contact provider.
- **pharmacy**: Dispensing pharmacy name or identifier for pharmacy benefit tracking and refill management.
- **status**: Prescription status. Valid values: ACTIVE (currently prescribed), EXPIRED (past end date), CANCELLED (discontinued by provider), COMPLETED (treatment course finished).
- **notes**: Special instructions, indications, or warnings about medication use.
- **externalReferenceId**: Correlation identifier for linking related prescriptions or tracking medication changes.
- **createdAt**: Timestamp when prescription was originally written.
- **updatedAt**: Timestamp of last prescription modification (refills, dosage changes, status updates).

---

### 11. NeonAuthUsersSync.hml & NeonAuthUsersSync_1.hml

**ObjectType Description:**
```
Authentication user synchronization table. Stores user authentication records synced from external authentication service for access control and audit logging.
```

**Field Descriptions:**
- **rawJson**: Complete JSON payload from authentication service containing all user attributes.
- **id**: Generated user ID extracted from authentication payload (rawJson -> 'id').
- **name**: User display name extracted from authentication payload (rawJson -> 'display_name').
- **email**: Primary email address extracted from authentication payload (rawJson -> 'primary_email').
- **createdAt**: Account creation timestamp derived from authentication payload (rawJson -> 'signed_up_at_millis' converted to timestamp).
- **updatedAt**: Last update timestamp for user record.
- **deletedAt**: Soft delete timestamp. NULL if user is active, populated if account deleted.

---

## Business Logic Commands

### Pattern for All Command Files

Each command exists in 3 language variants (Go, TypeScript, Python) with identical logic.

#### CalculateClaimRisk.hml / CalculateClaimRisk_1.hml / CalculateClaimRisk_2.hml

**Command Description:**
```
Calculates fraud risk score (0-100) for insurance claim to identify potentially problematic claims. Scores >60 trigger manual review, >90 may auto-deny pending investigation.
```

**Algorithm Overview** (add to description):
```
Risk scoring: Base 0, +40 if amount >$10k, +20 emergency, +15 surgery, +10 unknown provider. Returns RiskScore with score, level (LOW/MEDIUM/HIGH/CRITICAL), contributing factors, and timestamp.
```

**Argument Descriptions:**
- **claim** (ClaimData): Claim information including amount, type, service date, and provider details to analyze for fraud indicators.

#### ProcessClaim.hml / ProcessClaim_1.hml / ProcessClaim_2.hml

**Command Description:**
```
Validates and adjudicates insurance claim through automated workflow. Checks eligibility, coverage, calculates risk, and determines approval/denial status or manual review requirement.
```

**Argument Descriptions:**
- **claim** (ClaimData): Complete claim information including member, provider, service details, and charges for processing through adjudication engine.

#### GenerateClaimSummary.hml / GenerateClaimSummary_1.hml / GenerateClaimSummary_2.hml

**Command Description:**
```
Generates human-readable summary of claim details for explanations of benefits (EOB), provider correspondence, or member inquiries. Formats claim data into structured summary.
```

**Argument Descriptions:**
- **claim** (ClaimData): Claim data to summarize including amounts, services, dates, and parties involved.

#### BatchCalculateRisk.hml / BatchCalculateRisk_1.hml / BatchCalculateRisk_2.hml

**Command Description:**
```
Batch risk analysis for multiple claims. Processes array of claims through risk scoring algorithm. Performance: O(n) complexity, ~1ms per claim.
```

**Argument Descriptions:**
- **claims** (ClaimData[]): Array of claims to analyze for fraud risk. Returns array of RiskScore objects in same order as input.

#### BatchProcessClaims.hml / BatchProcessClaims_1.hml / BatchProcessClaims_2.hml

**Command Description:**
```
Batch claim adjudication for high-volume processing. Validates and processes multiple claims through automated workflow. Performance: O(n) complexity, ~5ms per claim.
```

**Argument Descriptions:**
- **claims** (ClaimData[]): Array of claims to process through validation and adjudication. Returns array of ClaimProcessResult objects in same order as input.

---

## Custom Type Definitions (in Connector Type Files)

### go_buisness_logic_1-types.hml / ts_buisness_logic_1-types.hml / py_buisness_logic_1-types.hml

Add descriptions to these types in the DataConnectorLink schema section:

#### ClaimData Type

**Description:**
```
Input data structure for claim processing operations. Contains all information needed to validate, assess risk, and process healthcare claim for payment.
```

**Field Descriptions:**
- **claim_amount**: Total charged amount in dollars (e.g., 1500.00). Provider's submitted charge before adjustments or contracted rates.
- **claim_type**: Service category code. Common values: 'EMERGENCY', 'SURGERY', 'OFFICE_VISIT', 'LAB', 'IMAGING'. Determines processing rules and risk factors.
- **service_date**: Date services provided (ISO 8601: YYYY-MM-DD). Used for eligibility verification and timely filing checks.
- **provider_id**: Provider identifier. Used to verify network status and validate credentials.
- **member_id**: Member identifier. Used to verify eligibility and benefits.

#### RiskScore Type

**Description:**
```
Risk assessment result for claim fraud detection. Used in adjudication workflows to identify claims requiring manual review or investigation.
```

**Field Descriptions:**
- **risk_score**: Numerical risk score 0-100 where higher values indicate greater fraud risk. Scores >60 typically require manual review.
- **risk_level**: Categorical risk classification: LOW (<30), MEDIUM (30-60), HIGH (60-90), CRITICAL (>90). Determines workflow routing.
- **factors**: Array of contributing risk factors that increased the score (e.g., "High claim amount", "Unknown provider", "Emergency claim type").
- **timestamp**: ISO 8601 timestamp when risk analysis was performed for audit trail.

#### ClaimProcessResult Type

**Description:**
```
Result of claim adjudication process. Indicates approval status, payment amounts, or denial reasons after automated processing.
```

**Field Descriptions:**
- **status**: Processing outcome: 'APPROVED' (auto-approved for payment), 'DENIED' (rejected), 'PENDING_REVIEW' (requires manual adjudication).
- **approved_amount**: Amount approved for payment in dollars. May be less than billed amount due to contracted rates or partial approvals.
- **denial_reason**: Explanation if claim denied. Common reasons: "Not eligible on DOS", "Service not covered", "Exceeds plan limits".
- **message**: Human-readable processing result message for provider or member communication.

#### ClaimSummary Type

**Description:**
```
Formatted summary of claim details for explanations of benefits (EOB), statements, or customer service reference.
```

**Field Descriptions:**
- **summary_text**: Prose description of claim including member, provider, services, dates, and amounts.
- **total_charged**: Total amount provider charged in dollars.
- **total_allowed**: Total amount plan allows based on contracted rates in dollars.
- **member_responsibility**: Amount member owes (copays, deductibles, coinsurance) in dollars.
- **plan_paid**: Amount plan paid or will pay to provider in dollars.

---

## Data Connector Link Files

### neon_postgres_1.hml

**DataConnectorLink Description:**
```
PostgreSQL connector to Insurance database (PPO/POS plans). Contains members, providers, claims, and eligibility data for PPO and POS insurance products with flexible provider networks.
```

### neon_postgres_2.hml

**DataConnectorLink Description:**
```
PostgreSQL connector to Insurance HMO database. Contains members, providers, claims, and eligibility data for HMO insurance products with managed care requirements (PCP selection, referrals).
```

### neon_postgres_lean.hml

**DataConnectorLink Description:**
```
PostgreSQL connector to Lean database (cross-database activities). Contains appointments, prescriptions, and billing records that reference members and providers from both insurance databases.
```

### go_buisness_logic_1.hml

**DataConnectorLink Description:**
```
Go business logic connector. Implements claim risk scoring, processing, and summary generation functions. High-performance compiled implementation. Algorithmically equivalent to TypeScript and Python variants.
```

### ts_buisness_logic_1.hml

**DataConnectorLink Description:**
```
TypeScript business logic connector. Implements claim risk scoring, processing, and summary generation functions. Node.js runtime implementation. Algorithmically equivalent to Go and Python variants.
```

### py_buisness_logic_1.hml

**DataConnectorLink Description:**
```
Python business logic connector. Implements claim risk scoring, processing, and summary generation functions. Python runtime implementation. Algorithmically equivalent to Go and TypeScript variants.
```

---

## Completion Checklist

### Phase 1: Database Models (Priority: High)
- [x] Members.hml
- [ ] Members_1.hml
- [ ] Claims.hml
- [ ] Claims_1.hml
- [ ] ProviderRecords.hml
- [ ] ProviderRecords_1.hml
- [ ] EligibilityChecks.hml
- [ ] EligibilityChecks_1.hml
- [ ] Notes.hml
- [ ] Notes_1.hml
- [ ] AppointmentsAppointments.hml
- [ ] AppointmentsBillingRecords.hml
- [ ] MedicationsPrescriptions.hml
- [ ] NeonAuthUsersSync.hml
- [ ] NeonAuthUsersSync_1.hml

### Phase 2: Business Logic Commands (Priority: Medium)
- [ ] CalculateClaimRisk.hml (Go)
- [ ] CalculateClaimRisk_1.hml (TypeScript)
- [ ] CalculateClaimRisk_2.hml (Python)
- [ ] ProcessClaim.hml (Go)
- [ ] ProcessClaim_1.hml (TypeScript)
- [ ] ProcessClaim_2.hml (Python)
- [ ] GenerateClaimSummary.hml (Go)
- [ ] GenerateClaimSummary_1.hml (TypeScript)
- [ ] GenerateClaimSummary_2.hml (Python)
- [ ] BatchCalculateRisk.hml (Go)
- [ ] BatchCalculateRisk_1.hml (TypeScript)
- [ ] BatchCalculateRisk_2.hml (Python)
- [ ] BatchProcessClaims.hml (Go)
- [ ] BatchProcessClaims_1.hml (TypeScript)
- [ ] BatchProcessClaims_2.hml (Python)

### Phase 3: Type Definitions (Priority: Medium)
- [ ] go_buisness_logic_1-types.hml
- [ ] ts_buisness_logic_1-types.hml
- [ ] py_buisness_logic_1-types.hml

### Phase 4: Connector Links (Priority: Low)
- [ ] neon_postgres_1.hml
- [ ] neon_postgres_2.hml
- [ ] neon_postgres_lean.hml
- [ ] go_buisness_logic_1.hml
- [ ] ts_buisness_logic_1.hml
- [ ] py_buisness_logic_1.hml

### Phase 5: Finalization
- [ ] Rebuild supergraph: `ddn supergraph build local`
- [ ] Verify descriptions appear in GraphQL playground
- [ ] Test introspection queries
- [ ] Review documentation completeness

---

## Testing Descriptions

After completing updates, verify descriptions appear in GraphQL schema:

1. **Start local engine**: `ddn run docker-start`
2. **Open console**: `ddn console --local`
3. **Test introspection**: In GraphQL playground, hover over types/fields to see descriptions
4. **Query schema**: Use `__type` or `__schema` introspection queries to verify description content

**Example Introspection Query:**
```graphql
{
  __type(name: "Members") {
    name
    description
    fields {
      name
      description
    }
  }
}
```

---

## Automation Script (Optional)

For bulk updates, consider creating a script that:
1. Reads this guide
2. Loads each HML file
3. Finds ObjectType/Model/Command definitions
4. Adds description fields using patterns above
5. Validates YAML syntax
6. Writes updated files

This ensures consistency and speeds up the remaining 44 files.

---

*This guide provides all content needed to complete metadata documentation. Follow the patterns above to add brief, educational descriptions that will appear in the GraphQL schema introspection.*
