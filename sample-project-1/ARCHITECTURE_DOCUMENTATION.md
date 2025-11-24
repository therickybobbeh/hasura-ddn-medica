# Healthcare Insurance System - Architecture Documentation

This document provides comprehensive visual documentation of the healthcare insurance system architecture, workflows, and data relationships.

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Database Architecture](#database-architecture)
3. [Entity Relationships](#entity-relationships)
4. [Claims Processing Workflow](#claims-processing-workflow)
5. [Insurance Plan Types](#insurance-plan-types)
6. [Business Logic Functions](#business-logic-functions)
7. [Data Flow Patterns](#data-flow-patterns)

---

## System Architecture

### High-Level Component Diagram

```mermaid
graph TB
    subgraph "GraphQL API Layer"
        GQL[Hasura DDN GraphQL Engine]
    end

    subgraph "Business Logic Layer"
        GO[Go Business Logic Connector]
        TS[TypeScript Business Logic Connector]
        PY[Python Business Logic Connector]
    end

    subgraph "Data Layer - Insurance PPO DB"
        DB1[(PostgreSQL - Insurance<br/>PPO/POS Plans)]
        DB1_TABLES[Members | Claims<br/>Providers | Eligibility<br/>Notes]
    end

    subgraph "Data Layer - Insurance HMO DB"
        DB2[(PostgreSQL - Insurance HMO<br/>HMO Plans)]
        DB2_TABLES[Members | Claims<br/>Providers | Eligibility<br/>Notes]
    end

    subgraph "Data Layer - Appointments/Prescriptions"
        DB3[(PostgreSQL - Lean DB<br/>Cross-Database Activities)]
        DB3_TABLES[Appointments<br/>Prescriptions<br/>Billing Records]
    end

    CLIENT[GraphQL Client<br/>Web/Mobile App] --> GQL
    GQL --> GO
    GQL --> TS
    GQL --> PY
    GQL --> DB1
    GQL --> DB2
    GQL --> DB3

    DB1 --> DB1_TABLES
    DB2 --> DB2_TABLES
    DB3 --> DB3_TABLES

    DB3_TABLES -.member_id.-> DB1_TABLES
    DB3_TABLES -.member_id.-> DB2_TABLES

    style GQL fill:#4287f5
    style GO fill:#00ADD8
    style TS fill:#3178C6
    style PY fill:#3776AB
    style DB1 fill:#336791
    style DB2 fill:#336791
    style DB3 fill:#336791
```

### Multi-Connector Pattern

**Why Three Business Logic Connectors?**

This project demonstrates **algorithmic equivalence** across three programming languages:
- **Go Connector**: High-performance, compiled language implementation
- **TypeScript Connector**: JavaScript ecosystem, Node.js runtime
- **Python Connector**: Data science friendly, rapid development

All three implement identical business logic for:
- `CalculateClaimRisk`: Fraud detection risk scoring
- `ProcessClaim`: Claim validation and adjudication
- `GenerateClaimSummary`: Claim summary generation
- `BatchCalculateRisk`: Batch risk analysis
- `BatchProcessClaims`: Batch claim processing

---

## Database Architecture

### Three-Database Architecture

```mermaid
graph LR
    subgraph "Insurance Database (PPO)"
        M1[Members: 50<br/>35 shared, 15 PPO-only]
        C1[Claims: 150<br/>Higher reimbursements<br/>70% approved]
        P1[Providers: 20<br/>All shared]
        M1 -.external_reference_id.-> M1
        P1 -.external_reference_id.-> P1
    end

    subgraph "Insurance HMO Database"
        M2[Members: 50<br/>35 shared, 15 HMO-only]
        C2[Claims: 15<br/>Lower reimbursements<br/>More denials]
        P2[Providers: 20<br/>All shared]
        M2 -.external_reference_id.-> M2
        P2 -.external_reference_id.-> P2
    end

    subgraph "Lean Database (Activities)"
        A[Appointments: 22<br/>Cross-DB references]
        RX[Prescriptions: 20<br/>Cross-DB references]
        B[Billing Records: 8]
    end

    M1 -.Same UUID.-> M2
    P1 -.Same NPI.-> P2
    A -.member_id.-> M1
    A -.member_id.-> M2
    RX -.member_id.-> M1
    RX -.member_id.-> M2

    style M1 fill:#e1f5e1
    style M2 fill:#ffe1e1
    style A fill:#e1e5ff
```

### Cross-Database Linking Strategy

The `external_reference_id` field enables cross-database queries:

| Entity | Field Purpose | Population Strategy |
|--------|---------------|---------------------|
| **Members** | Universal member identifier | Set to member UUID (35 shared members have same UUID in both DBs) |
| **Providers** | Universal provider identifier | Set to NPI (all 20 providers shared with same NPI) |
| **Claims** | Transaction correlation | NULL initially, can be populated with correlation IDs |
| **Appointments** | Activity correlation | NULL initially, linkable via member_id/provider_id |
| **Prescriptions** | Medication correlation | NULL initially, linkable via member_id/provider_id |

---

## Entity Relationships

### Core Entity Relationship Diagram

```mermaid
erDiagram
    MEMBERS ||--o{ CLAIMS : "files"
    MEMBERS ||--o{ ELIGIBILITY_CHECKS : "has"
    MEMBERS ||--o{ NOTES : "has"
    MEMBERS ||--o{ APPOINTMENTS : "schedules"
    MEMBERS ||--o{ PRESCRIPTIONS : "receives"

    PROVIDERS ||--o{ CLAIMS : "submits"
    PROVIDERS ||--o{ APPOINTMENTS : "provides"
    PROVIDERS ||--o{ PRESCRIPTIONS : "prescribes"

    CLAIMS ||--o| BILLING_RECORDS : "generates"

    MEMBERS {
        uuid id PK
        string firstName
        string lastName
        date dob
        string plan "HMO, PPO, EPO, POS"
        string externalReferenceId "Cross-DB link"
        timestamp createdAt
        timestamp updatedAt
    }

    PROVIDERS {
        uuid id PK
        string name
        string npi "10-digit NPI"
        string specialty
        string externalReferenceId "Cross-DB link"
        timestamp createdAt
        timestamp updatedAt
    }

    CLAIMS {
        uuid id PK
        uuid memberId FK
        uuid providerId FK
        date dos "Date of Service"
        string cpt "5-digit CPT code"
        int chargeCents
        int allowedCents
        string status "PENDING, PAID, DENIED"
        string denialReason
        string externalReferenceId
        timestamp createdAt
        timestamp updatedAt
    }

    APPOINTMENTS {
        uuid id PK
        uuid memberId FK
        uuid providerId FK
        timestamp appointmentDate
        string status "SCHEDULED, COMPLETED, CANCELLED, NO_SHOW"
        string notes
        string externalReferenceId
        timestamp createdAt
        timestamp updatedAt
    }

    PRESCRIPTIONS {
        uuid id PK
        uuid memberId FK
        uuid providerId FK
        string medicationName
        string dosage "e.g., 10mg"
        string frequency "QD, BID, TID, QID, PRN"
        date startDate
        date endDate
        int refillsRemaining
        string pharmacy
        string status "ACTIVE, EXPIRED, CANCELLED"
        string externalReferenceId
        timestamp createdAt
        timestamp updatedAt
    }
```

---

## Claims Processing Workflow

### Claim Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> SUBMITTED: Provider submits claim

    SUBMITTED --> PENDING: Initial validation passes
    SUBMITTED --> DENIED: Validation fails

    PENDING --> UNDER_REVIEW: Risk score >60
    PENDING --> APPROVED: Auto-adjudication
    PENDING --> DENIED: Auto-denial rules

    UNDER_REVIEW --> APPROVED: Manual approval
    UNDER_REVIEW --> DENIED: Manual denial
    UNDER_REVIEW --> PARTIAL: Partial approval

    APPROVED --> PAID: Payment processed
    PARTIAL --> PAID: Payment processed

    DENIED --> RESUBMITTED: Provider corrects and resubmits
    RESUBMITTED --> PENDING: Re-enters workflow

    PAID --> [*]
```

### Claims Processing Function Flow

```mermaid
flowchart TD
    START([Claim Submitted]) --> VALIDATE{Validate Basic<br/>Requirements}

    VALIDATE -->|Invalid| DENY1[Deny: Validation Failed]
    VALIDATE -->|Valid| ELIGIBILITY{Check Member<br/>Eligibility}

    ELIGIBILITY -->|Not Eligible| DENY2[Deny: Not Eligible on DOS]
    ELIGIBILITY -->|Eligible| COVERAGE{Check Service<br/>Coverage}

    COVERAGE -->|Not Covered| DENY3[Deny: Service Not Covered]
    COVERAGE -->|Covered| RISK[Calculate Risk Score]

    RISK --> RISK_EVAL{Risk Score<br/>Threshold}

    RISK_EVAL -->|Score < 30<br/>LOW| AUTO_APPROVE[Auto-Approve]
    RISK_EVAL -->|30 ≤ Score < 60<br/>MEDIUM| AUTO_APPROVE
    RISK_EVAL -->|60 ≤ Score < 90<br/>HIGH| MANUAL[Manual Review Queue]
    RISK_EVAL -->|Score ≥ 90<br/>CRITICAL| AUTO_DENY[Auto-Deny: Fraud Review]

    AUTO_APPROVE --> PAYMENT[Process Payment]
    MANUAL --> DECISION{Adjudicator<br/>Decision}

    DECISION -->|Approve| PAYMENT
    DECISION -->|Partial| PARTIAL_PAY[Partial Payment]
    DECISION -->|Deny| DENY4[Deny with Reason]

    PAYMENT --> END([Claim Paid])
    PARTIAL_PAY --> END
    DENY1 --> DENIED([Claim Denied])
    DENY2 --> DENIED
    DENY3 --> DENIED
    DENY4 --> DENIED
    AUTO_DENY --> DENIED

    style START fill:#90EE90
    style END fill:#90EE90
    style DENIED fill:#FFB6C1
    style AUTO_APPROVE fill:#87CEEB
    style AUTO_DENY fill:#FFA07A
    style MANUAL fill:#FFD700
```

### Risk Scoring Algorithm

```mermaid
flowchart LR
    CLAIM[Claim Data] --> AMOUNT{Claim Amount}
    CLAIM --> TYPE{Claim Type}
    CLAIM --> PROVIDER{Provider Known?}

    AMOUNT -->|> $10,000| RISK_40[+40 Risk Points]
    TYPE -->|Emergency| RISK_20[+20 Risk Points]
    TYPE -->|Surgery| RISK_15[+15 Risk Points]
    PROVIDER -->|Unknown| RISK_10[+10 Risk Points]

    RISK_40 --> TOTAL[Total Risk Score]
    RISK_20 --> TOTAL
    RISK_15 --> TOTAL
    RISK_10 --> TOTAL

    TOTAL --> LEVEL{Categorize}
    LEVEL -->|0-29| LOW[LOW Risk]
    LEVEL -->|30-59| MEDIUM[MEDIUM Risk]
    LEVEL -->|60-89| HIGH[HIGH Risk]
    LEVEL -->|90-100| CRITICAL[CRITICAL Risk]

    style LOW fill:#90EE90
    style MEDIUM fill:#FFD700
    style HIGH fill:#FFA07A
    style CRITICAL fill:#FF6347
```

---

## Insurance Plan Types

### Plan Type Comparison

```mermaid
graph TB
    subgraph "HMO - Health Maintenance Organization"
        HMO_FEATURES["✓ Lowest premiums<br/>✓ Must select PCP<br/>✓ Referrals required for specialists<br/>✗ No out-of-network coverage (except emergency)<br/>✗ Less flexibility"]
        HMO_NETWORK[Limited Network<br/>In-Network Only]
    end

    subgraph "PPO - Preferred Provider Organization"
        PPO_FEATURES["✓ No PCP required<br/>✓ No referrals needed<br/>✓ Out-of-network coverage available<br/>✓ Maximum flexibility<br/>✗ Higher premiums<br/>✗ Higher out-of-pocket costs"]
        PPO_NETWORK[Flexible Network<br/>In + Out-of-Network]
    end

    subgraph "EPO - Exclusive Provider Organization"
        EPO_FEATURES["✓ No PCP required<br/>✓ No referrals needed<br/>✓ Lower premiums than PPO<br/>✗ No out-of-network coverage<br/>✗ Network restrictions"]
        EPO_NETWORK[Exclusive Network<br/>In-Network Only]
    end

    subgraph "POS - Point of Service"
        POS_FEATURES["✓ Hybrid HMO/PPO<br/>✓ PCP required<br/>✓ Some out-of-network coverage<br/>✗ Referrals needed<br/>✗ Higher OON costs"]
        POS_NETWORK[Hybrid Network<br/>In-Network preferred]
    end

    style HMO_FEATURES fill:#ffe1e1
    style PPO_FEATURES fill:#e1f5e1
    style EPO_FEATURES fill:#fff4e1
    style POS_FEATURES fill:#e1e5ff
```

### Database Distribution by Plan Type

```mermaid
pie title Insurance Database - Plan Distribution
    "PPO" : 35
    "POS" : 15
```

```mermaid
pie title Insurance HMO Database - Plan Distribution
    "HMO" : 50
```

---

## Business Logic Functions

### Function Overview

```mermaid
graph TB
    subgraph "Single Claim Operations"
        CALC[CalculateClaimRisk<br/>Input: ClaimData<br/>Output: RiskScore<br/>Complexity: O(1)]
        PROC[ProcessClaim<br/>Input: ClaimData<br/>Output: ClaimProcessResult<br/>Complexity: O(1)]
        SUMM[GenerateClaimSummary<br/>Input: ClaimData<br/>Output: ClaimSummary<br/>Complexity: O(1)]
    end

    subgraph "Batch Operations"
        BATCH_RISK[BatchCalculateRisk<br/>Input: ClaimData[]<br/>Output: RiskScore[]<br/>Complexity: O(n)]
        BATCH_PROC[BatchProcessClaims<br/>Input: ClaimData[]<br/>Output: ClaimProcessResult[]<br/>Complexity: O(n)]
    end

    subgraph "Language Implementations"
        GO_IMPL[Go Implementation<br/>Performance: Fastest<br/>Compiled binary]
        TS_IMPL[TypeScript Implementation<br/>Performance: Fast<br/>Node.js runtime]
        PY_IMPL[Python Implementation<br/>Performance: Good<br/>Python runtime]
    end

    CALC --> GO_IMPL
    CALC --> TS_IMPL
    CALC --> PY_IMPL

    style CALC fill:#87CEEB
    style PROC fill:#90EE90
    style SUMM fill:#FFD700
    style BATCH_RISK fill:#DDA0DD
    style BATCH_PROC fill:#DDA0DD
```

### CalculateClaimRisk Function Flow

```mermaid
sequenceDiagram
    participant Client
    participant GraphQL
    participant Connector
    participant RiskEngine

    Client->>GraphQL: Query: calculateClaimRisk(claim)
    GraphQL->>Connector: Forward request
    Connector->>RiskEngine: Analyze claim data

    Note over RiskEngine: Initialize score = 0

    alt High Amount (>$10,000)
        RiskEngine->>RiskEngine: score += 40
    end

    alt Emergency Type
        RiskEngine->>RiskEngine: score += 20
    else Surgery Type
        RiskEngine->>RiskEngine: score += 15
    end

    alt Unknown Provider
        RiskEngine->>RiskEngine: score += 10
    end

    RiskEngine->>RiskEngine: Categorize risk level
    Note over RiskEngine: 0-29: LOW<br/>30-59: MEDIUM<br/>60-89: HIGH<br/>90+: CRITICAL

    RiskEngine-->>Connector: RiskScore object
    Connector-->>GraphQL: Return result
    GraphQL-->>Client: RiskScore response
```

### ProcessClaim Function Flow

```mermaid
sequenceDiagram
    participant Client
    participant GraphQL
    participant Connector
    participant Validator
    participant RiskEngine
    participant Adjudicator

    Client->>GraphQL: Mutation: processClaim(claim)
    GraphQL->>Connector: Forward request
    Connector->>Validator: Validate claim data

    alt Validation Failed
        Validator-->>Connector: Invalid
        Connector-->>Client: Deny: Validation Failed
    else Valid
        Validator->>RiskEngine: Calculate risk
        RiskEngine-->>Adjudicator: Risk score

        alt Low/Medium Risk (<60)
            Adjudicator->>Adjudicator: Auto-approve
            Adjudicator-->>Connector: Approved
        else High/Critical Risk (≥60)
            Adjudicator->>Adjudicator: Queue for manual review
            Adjudicator-->>Connector: Pending Review
        end

        Connector-->>GraphQL: ClaimProcessResult
        GraphQL-->>Client: Process result
    end
```

---

## Data Flow Patterns

### Federated Query Pattern

```mermaid
flowchart TD
    CLIENT[GraphQL Client] --> QUERY{Query Type}

    QUERY -->|Member Profile| FEDERATION[Federated Query]

    FEDERATION --> DB1_QUERY[Query Insurance DB<br/>Get PPO claims]
    FEDERATION --> DB2_QUERY[Query Insurance HMO DB<br/>Get HMO claims]
    FEDERATION --> DB3_QUERY[Query Lean DB<br/>Get appointments & prescriptions]

    DB1_QUERY --> MERGE[Merge Results by<br/>external_reference_id]
    DB2_QUERY --> MERGE
    DB3_QUERY --> MERGE

    MERGE --> RESPONSE[Unified Response]
    RESPONSE --> CLIENT

    style FEDERATION fill:#4287f5
    style MERGE fill:#FFD700
```

### Cross-Database Linking Example

```mermaid
graph LR
    subgraph "Query: Get Complete Member History"
        Q[Member UUID:<br/>b240b73c-4903-48b2-a37d-ae1c1f0be0e5]
    end

    subgraph "Insurance DB Search"
        I1[external_reference_id =<br/>b240b73c-4903-48b2-a37d...]
        I1 --> IC[Claims: 5 found<br/>Plan: PPO]
    end

    subgraph "Insurance HMO DB Search"
        I2[external_reference_id =<br/>b240b73c-4903-48b2-a37d...]
        I2 --> IC2[Claims: 2 found<br/>Plan: HMO]
    end

    subgraph "Lean DB Search"
        I3[member_id =<br/>b240b73c-4903-48b2-a37d...]
        I3 --> IA[Appointments: 3<br/>Prescriptions: 2]
    end

    Q --> I1
    Q --> I2
    Q --> I3

    IC --> RESULT[Complete Member View:<br/>7 claims, 3 appointments,<br/>2 prescriptions, 2 plans]
    IC2 --> RESULT
    IA --> RESULT

    style Q fill:#90EE90
    style RESULT fill:#FFD700
```

---

## Key Healthcare Concepts

### CPT Codes (Current Procedural Terminology)

5-digit standardized medical procedure codes maintained by the American Medical Association (AMA).

| Code Range | Category | Example |
|------------|----------|---------|
| 00100-01999 | Anesthesia | 01967 - Neuraxial labor analgesia |
| 10021-69990 | Surgery | 25600 - Treat closed forearm fracture |
| 70010-79999 | Radiology | 70450 - CT scan of head |
| 80047-89398 | Lab/Pathology | 80053 - Comprehensive metabolic panel |
| 90281-99607 | Medicine | 90471 - Immunization administration |
| 99201-99499 | Evaluation & Management | 99213 - Office visit (established patient) |

### NPI (National Provider Identifier)

Unique 10-digit identification number for healthcare providers required by HIPAA.

- **Type 1**: Individual providers (physicians, nurses, dentists)
- **Type 2**: Organizations (hospitals, clinics, pharmacies, insurers)
- **Format**: 10 numeric digits (e.g., 1234567890)
- **Issued by**: CMS National Plan and Provider Enumeration System (NPPES)

### Claim Amounts

**chargeCents** vs **allowedCents**:

```mermaid
graph LR
    CHARGE[Provider Charges<br/>$500.00<br/>chargeCents: 50000] --> CONTRACT{Contracted<br/>Rate}

    CONTRACT --> ALLOWED[Plan Allows<br/>$300.00<br/>allowedCents: 30000]

    ALLOWED --> NETWORK{Network<br/>Status}

    NETWORK -->|In-Network| WRITEOFF[Provider writes off<br/>$200.00<br/>Contractual adjustment]
    NETWORK -->|Out-of-Network| BALANCE[Patient may be<br/>balance-billed $200.00]

    style CHARGE fill:#ffe1e1
    style ALLOWED fill:#e1f5e1
    style WRITEOFF fill:#90EE90
    style BALANCE fill:#FFB6C1
```

---

## Technical Implementation Notes

### Algorithmic Equivalence

All three connector implementations (Go, TypeScript, Python) are **algorithmically equivalent**:

1. **CalculateClaimRisk**: Identical risk scoring logic
   - Same base score initialization
   - Same risk factor thresholds
   - Same point additions
   - Same categorization levels

2. **ProcessClaim**: Identical validation and adjudication
   - Same validation rules
   - Same risk evaluation thresholds
   - Same approval/denial logic

3. **GenerateClaimSummary**: Identical summary formatting
   - Same data extraction
   - Same summary structure

**Purpose**: Demonstrates language interoperability and allows performance comparison while maintaining business logic consistency.

### Performance Characteristics

| Operation | Complexity | Typical Execution Time |
|-----------|------------|------------------------|
| CalculateClaimRisk | O(1) | < 1ms |
| ProcessClaim | O(1) | < 5ms |
| GenerateClaimSummary | O(1) | < 1ms |
| BatchCalculateRisk | O(n) | ~1ms per claim |
| BatchProcessClaims | O(n) | ~5ms per claim |

---

## Glossary

| Term | Definition |
|------|------------|
| **DOS** | Date of Service - when healthcare services were provided |
| **CPT** | Current Procedural Terminology - standardized medical procedure codes |
| **NPI** | National Provider Identifier - unique 10-digit provider ID |
| **HMO** | Health Maintenance Organization - managed care with PCP requirement |
| **PPO** | Preferred Provider Organization - flexible network with OON coverage |
| **EPO** | Exclusive Provider Organization - network-only, no referrals |
| **POS** | Point of Service - hybrid HMO/PPO plan |
| **PCP** | Primary Care Physician - required for HMO plans |
| **OON** | Out-of-Network - providers not contracted with the plan |
| **Adjudication** | Claims processing and decision-making |
| **Allowed Amount** | Maximum amount plan will pay for a service |
| **Balance Billing** | Charging patient the difference between charged and allowed amounts |
| **Coinsurance** | Percentage of costs paid by patient after deductible |
| **Copay** | Fixed amount paid by patient for a service |
| **Deductible** | Amount patient pays before insurance coverage begins |

---

*This documentation is auto-generated and synchronized with the GraphQL schema metadata descriptions.*
