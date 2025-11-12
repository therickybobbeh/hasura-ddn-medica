# Globals Subgraph

The **globals** subgraph contains shared configuration that applies to the entire supergraph. This is where you configure:

- **Authentication**: OAuth/OIDC, JWT validation, webhook auth
- **GraphQL API settings**: Query depth limits, CORS, rate limiting, caching
- **Security policies**: HSTS, CSP, frame options
- **Observability**: Logging levels, OpenTelemetry sampling

## Table of Contents

1. [What is the Globals Subgraph?](#what-is-the-globals-subgraph)
2. [Directory Structure](#directory-structure)
3. [Authentication Configuration](#authentication-configuration)
4. [GraphQL Configuration](#graphql-configuration)
5. [OAuth/OIDC Provider Setup](#oauthoidc-provider-setup)
6. [Session Variables](#session-variables)
7. [Production Hardening](#production-hardening)
8. [Troubleshooting](#troubleshooting)
9. [Further Reading](#further-reading)

---

## What is the Globals Subgraph?

**Purpose**: Centralize configuration that affects the entire supergraph

**Why separate from other subgraphs?**
- **Single source of truth**: Auth and GraphQL settings in one place
- **Environment-specific**: Different configs for dev/staging/prod
- **Security isolation**: Auth changes don't require touching data subgraphs
- **Reusability**: Same auth config across multiple supergraphs

**Key files**:
- `metadata/AuthConfig.hml` - Authentication and authorization
- `metadata/GraphqlConfig.hml` - GraphQL API behavior

---

## Directory Structure

```
globals/
├── README.md              # This file
├── subgraph.yaml          # Subgraph definition
└── metadata/
    ├── AuthConfig.hml     # Authentication configuration
    └── GraphqlConfig.hml  # GraphQL API configuration
```

---

## Authentication Configuration

### File: `metadata/AuthConfig.hml`

Hasura DDN v3 supports two authentication modes:

### 1. JWT Mode (Recommended)

**Use when**: You have an OAuth/OIDC provider (Keycloak, Auth0, Azure AD, Okta, etc.)

**How it works**:
1. User authenticates with your IdP
2. IdP returns JWT token
3. Client sends JWT in `Authorization: Bearer <token>` header
4. Hasura validates JWT signature using JWKS
5. Hasura extracts session variables from JWT claims
6. Permissions are enforced based on session variables

**Configuration**:
```yaml
kind: AuthConfig
version: v2
definition:
  mode: jwt

  jwt:
    # Token location
    tokenLocation:
      type: BearerAuthorization

    # Claims configuration
    claimsConfig:
      namespace:
        claimsFormat: Json
        location: "https://hasura.io/jwt/claims"

      # Validate audience claim
      audience:
        - valueFromEnv: OAUTH_AUDIENCE

    # JWKS for signature verification
    jwksConfig:
      jwksUrl:
        valueFromEnv: OAUTH_JWKS_URL

    # Validate issuer claim
    issuer:
      valueFromEnv: OAUTH_ISSUER_URL

  # Session variables available in permissions
  allowedSessionVariableNames:
    - x-hasura-user-id
    - x-hasura-role
    - x-hasura-org-id
    - x-hasura-allowed-roles
    - x-hasura-default-role
    - x-hasura-email
    - x-hasura-user-name

  # Unauthenticated access (for public APIs)
  allowUnauthenticatedAccess: false
```

**Environment variables required**:
```bash
OAUTH_JWKS_URL=https://your-idp.com/.well-known/jwks.json
OAUTH_ISSUER_URL=https://your-idp.com
OAUTH_AUDIENCE=your-audience
```

### 2. Webhook Mode (Advanced)

**Use when**: You need custom authentication logic or non-standard IdP

**How it works**:
1. Client sends request with auth headers
2. Hasura forwards headers to your webhook
3. Webhook validates and returns session variables
4. Hasura enforces permissions based on session variables

**Configuration**:
```yaml
kind: AuthConfig
version: v2
definition:
  mode: webhook

  webhook:
    url:
      valueFromEnv: AUTH_WEBHOOK_URL

    method: POST

    forwardHeaders:
      - Authorization
      - X-Custom-Header

  allowedSessionVariableNames:
    - x-hasura-user-id
    - x-hasura-role

  allowUnauthenticatedAccess: false
```

**Environment variables required**:
```bash
AUTH_WEBHOOK_URL=https://your-webhook.com/validate
```

### Public Access (No Authentication)

**Use when**: Building a public API with no authentication required

**Configuration**:
```yaml
kind: AuthConfig
version: v2
definition:
  allowUnauthenticatedAccess: true
  unauthorizedRole: anonymous  # Role for unauthenticated users
```

**Note**: You still need to define permissions for the `anonymous` role in your models.

---

## GraphQL Configuration

### File: `metadata/GraphqlConfig.hml`

Controls the behavior, performance, and security of your GraphQL API.

### Query Settings

**Aggregation functions**:
```yaml
query:
  aggregateFunctionsEnabled: true  # Enable count, sum, avg, etc.
```

**Nested filtering**:
```yaml
query:
  nestedFilteringEnabled: true  # Filter by nested array fields
```

### Security Settings

**Query depth limiting** (prevents deeply nested malicious queries):
```yaml
depthLimit:
  enabled: true
  maxDepth: 15  # TODO: Adjust based on your schema complexity
```

**Node limiting** (prevents overly complex queries):
```yaml
nodeLimit:
  enabled: true
  maxNodes: 1000  # TODO: Adjust based on your use case
```

**Introspection** (disable in production):
```yaml
features:
  introspection:
    enabled: true  # TODO: Set to false in production
```

**Playground** (disable in production):
```yaml
features:
  playground:
    enabled: true  # TODO: Set to false in production
```

### CORS Configuration

**Development** (allow all origins):
```yaml
cors:
  allowedOrigins:
    - "*"  # ⚠️ NOT FOR PRODUCTION
```

**Production** (specific origins only):
```yaml
cors:
  allowedOrigins:
    - "https://app.example.com"
    - "https://admin.example.com"
  allowCredentials: true
```

### Rate Limiting

**Global rate limit**:
```yaml
rateLimit:
  enabled: true
  global:
    maxRequests: 1000  # Requests per window
    windowSeconds: 60  # Time window
```

**Per-user rate limit**:
```yaml
rateLimit:
  perUser:
    maxRequests: 100  # Per user
    windowSeconds: 60
    sessionVariable: x-hasura-user-id
```

### Response Caching

```yaml
cache:
  enabled: true
  defaultTtl: 60    # Cache for 60 seconds
  maxTtl: 3600      # Maximum cache time
```

**When to use**:
- ✅ Read-heavy APIs with low data volatility
- ✅ Public data that changes infrequently
- ❌ Real-time data or user-specific queries

### Observability

**OpenTelemetry**:
```yaml
observability:
  openTelemetry:
    enabled: true
    samplingRate: 0.1  # Trace 10% of requests
```

**Logging**:
```yaml
observability:
  logging:
    enabled: true
    level: info           # debug | info | warn | error
    logQueries: false     # Set true for debugging
    logMutations: true    # Log data modifications
```

**Sampling rate recommendations**:
- Development: `1.0` (trace everything)
- Staging: `0.5` (trace 50%)
- Production: `0.1` (trace 10%) or lower for high-traffic

---

## OAuth/OIDC Provider Setup

### General JWT Structure

Hasura expects JWT tokens with this structure:

```json
{
  "iss": "https://your-idp.com",
  "aud": "your-audience",
  "sub": "user-123",
  "exp": 1234567890,
  "iat": 1234567890,
  "https://hasura.io/jwt/claims": {
    "x-hasura-user-id": "user-123",
    "x-hasura-role": "user",
    "x-hasura-allowed-roles": ["user", "admin"],
    "x-hasura-default-role": "user",
    "x-hasura-org-id": "org-456",
    "x-hasura-email": "user@example.com",
    "x-hasura-user-name": "John Doe"
  }
}
```

**Critical claims**:
- `iss` (issuer): Must match `OAUTH_ISSUER_URL`
- `aud` (audience): Must match `OAUTH_AUDIENCE`
- `https://hasura.io/jwt/claims`: Contains session variables

---

### Keycloak Setup

**Step 1: Create Realm**
```
Admin Console → Create Realm → Name: "my-realm"
```

**Step 2: Create Client**
```
Clients → Create Client
- Client ID: hasura-ddn
- Client Protocol: openid-connect
- Access Type: confidential
- Valid Redirect URIs: https://hasura.example.com/*
```

**Step 3: Configure Protocol Mapper**
```
Clients → hasura-ddn → Client Scopes → Add mapper
- Name: hasura-claims
- Mapper Type: User Attribute
- Token Claim Name: https://hasura.io/jwt/claims
- Claim JSON Type: JSON
```

**Step 4: Set User Attributes**
```
Users → Select User → Attributes → Add
- Key: hasura-claims
- Value: {"x-hasura-user-id":"123","x-hasura-role":"user","x-hasura-allowed-roles":["user"]}
```

**Environment Variables**:
```bash
OAUTH_JWKS_URL=https://keycloak.example.com/realms/my-realm/protocol/openid-connect/certs
OAUTH_ISSUER_URL=https://keycloak.example.com/realms/my-realm
OAUTH_AUDIENCE=hasura-ddn
```

---

### Auth0 Setup

**Step 1: Create Application**
```
Applications → Create Application
- Name: Hasura DDN
- Type: Single Page Application (or Regular Web App)
```

**Step 2: Add Rule for Custom Claims**
```
Auth Pipeline → Rules → Create Rule

function (user, context, callback) {
  const namespace = "https://hasura.io/jwt/claims";
  context.idToken[namespace] = {
    'x-hasura-user-id': user.user_id,
    'x-hasura-role': user.app_metadata?.role || 'user',
    'x-hasura-allowed-roles': user.app_metadata?.roles || ['user'],
    'x-hasura-default-role': 'user',
    'x-hasura-email': user.email
  };
  callback(null, user, context);
}
```

**Step 3: Configure Application**
```
Settings:
- Domain: YOUR_DOMAIN.auth0.com
- Client ID: <copy this>
- Allowed Callback URLs: https://hasura.example.com/callback
```

**Environment Variables**:
```bash
OAUTH_JWKS_URL=https://YOUR_DOMAIN.auth0.com/.well-known/jwks.json
OAUTH_ISSUER_URL=https://YOUR_DOMAIN.auth0.com/
OAUTH_AUDIENCE=YOUR_API_IDENTIFIER
OAUTH_CLIENT_ID=<your_client_id>
```

---

### Azure AD Setup

**Step 1: Register App**
```
Azure Portal → App Registrations → New registration
- Name: Hasura DDN
- Supported account types: Single tenant
- Redirect URI: https://hasura.example.com/callback
```

**Step 2: Configure App Roles**
```
App registrations → Hasura DDN → App roles → Create app role
- Display name: User
- Allowed member types: Users/Groups
- Value: user
- Description: Standard user role
```

**Step 3: Configure Optional Claims**
```
Token configuration → Add optional claim
- Token type: ID
- Claims: email, preferred_username
```

**Step 4: Create Claims Mapping Policy** (requires Azure AD Premium)

See: https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-claims-mapping

**Environment Variables**:
```bash
OAUTH_JWKS_URL=https://login.microsoftonline.com/TENANT_ID/discovery/v2.0/keys
OAUTH_ISSUER_URL=https://login.microsoftonline.com/TENANT_ID/v2.0
OAUTH_AUDIENCE=YOUR_CLIENT_ID
```

---

### Okta Setup

**Step 1: Create Application**
```
Applications → Create App Integration
- Sign-in method: OIDC
- Application type: Web Application (or SPA)
```

**Step 2: Add Custom Claims**
```
Security → API → Authorization Servers → default → Claims → Add Claim

Name: x-hasura-user-id
Include in token type: ID Token
Value type: Expression
Value: user.id

Name: x-hasura-role
Include in token type: ID Token
Value type: Expression
Value: user.role
```

**Step 3: Add Custom Scope** (optional)
```
Security → API → Authorization Servers → default → Scopes → Add Scope
- Name: hasura
- Description: Hasura GraphQL access
```

**Environment Variables**:
```bash
OAUTH_JWKS_URL=https://YOUR_DOMAIN.okta.com/oauth2/default/v1/keys
OAUTH_ISSUER_URL=https://YOUR_DOMAIN.okta.com/oauth2/default
OAUTH_AUDIENCE=api://default
```

---

### Generic OIDC Provider

For any OIDC-compliant provider:

**Step 1: Get OIDC Configuration**
```
https://your-idp.com/.well-known/openid-configuration
```

**Step 2: Extract Values**
```json
{
  "issuer": "https://your-idp.com",
  "jwks_uri": "https://your-idp.com/.well-known/jwks.json",
  "authorization_endpoint": "...",
  "token_endpoint": "..."
}
```

**Step 3: Configure Custom Claims**

Consult your IdP's documentation for adding custom claims to JWT tokens.

**Environment Variables**:
```bash
OAUTH_JWKS_URL=<jwks_uri from config>
OAUTH_ISSUER_URL=<issuer from config>
OAUTH_AUDIENCE=<your audience>
```

---

## Session Variables

Session variables are extracted from JWT claims and used in permission rules.

### Standard Variables

**Required**:
- `x-hasura-user-id`: Unique user identifier
- `x-hasura-role`: Current user role
- `x-hasura-default-role`: Fallback role
- `x-hasura-allowed-roles`: Array of roles user can assume

**Optional**:
- `x-hasura-org-id`: Organization/tenant ID (for multi-tenancy)
- `x-hasura-email`: User email
- `x-hasura-user-name`: Display name

### Custom Variables

You can add any custom session variables:

**Step 1: Add to AuthConfig.hml**
```yaml
allowedSessionVariableNames:
  - x-hasura-user-id
  - x-hasura-role
  - x-hasura-department-id  # Custom variable
  - x-hasura-region         # Custom variable
```

**Step 2: Include in JWT claims**
```json
{
  "https://hasura.io/jwt/claims": {
    "x-hasura-user-id": "123",
    "x-hasura-role": "user",
    "x-hasura-department-id": "dept-456",
    "x-hasura-region": "us-west"
  }
}
```

**Step 3: Use in permissions**
```yaml
kind: ModelPermissions
version: v1
definition:
  modelName: Document
  permissions:
    - role: user
      select:
        filter:
          fieldComparison:
            field: department_id
            operator: _eq
            value:
              sessionVariable: x-hasura-department-id
```

### Session Variable Best Practices

**DO**:
- ✅ Use meaningful prefixes (`x-hasura-`)
- ✅ Keep variable names lowercase with hyphens
- ✅ Use UUIDs for IDs, not sequential integers
- ✅ Validate variables on the IdP side
- ✅ Include only necessary claims (smaller tokens)

**DON'T**:
- ❌ Put sensitive data in session variables (they're in the JWT)
- ❌ Use session variables for authorization logic (use roles + permissions)
- ❌ Include large objects (bloats token size)
- ❌ Use PII without encryption/obfuscation

---

## Production Hardening

### Security Checklist

**Authentication**:
- [ ] Use HTTPS for all IdP endpoints
- [ ] Rotate JWKS keys regularly (IdP configuration)
- [ ] Set appropriate JWT expiration times (15-60 minutes)
- [ ] Implement refresh token rotation
- [ ] Validate `aud` and `iss` claims strictly

**GraphQL API**:
- [ ] Disable introspection (`introspection.enabled: false`)
- [ ] Disable playground (`playground.enabled: false`)
- [ ] Set CORS to specific origins (not `*`)
- [ ] Configure query depth limit (10-15)
- [ ] Configure node limit (500-1000)
- [ ] Enable rate limiting
- [ ] Disable stack traces (`errors.includeStackTrace: false`)

**Headers**:
- [ ] Enable HSTS (`strictTransportSecurity.enabled: true`)
- [ ] Set CSP directives (`contentSecurityPolicy`)
- [ ] Set `X-Frame-Options: DENY`
- [ ] Set `X-Content-Type-Options: nosniff`

**Observability**:
- [ ] Set log level to `warn` or `error` (not `debug`)
- [ ] Disable query logging (`logQueries: false`)
- [ ] Set OTEL sampling rate to 0.1 or lower
- [ ] Configure log retention policies
- [ ] Set up alerting for error rates

### Environment-Specific Configs

**Development**:
```yaml
# AuthConfig.hml
allowUnauthenticatedAccess: true  # Optional for testing

# GraphqlConfig.hml
features:
  introspection:
    enabled: true
  playground:
    enabled: true
cors:
  allowedOrigins:
    - "*"
observability:
  logging:
    level: debug
    logQueries: true
  openTelemetry:
    samplingRate: 1.0  # Trace everything
```

**Staging**:
```yaml
# AuthConfig.hml
allowUnauthenticatedAccess: false

# GraphqlConfig.hml
features:
  introspection:
    enabled: true  # For testing
  playground:
    enabled: true  # For testing
cors:
  allowedOrigins:
    - "https://staging.example.com"
observability:
  logging:
    level: info
    logQueries: false
  openTelemetry:
    samplingRate: 0.5
```

**Production**:
```yaml
# AuthConfig.hml
allowUnauthenticatedAccess: false

# GraphqlConfig.hml
features:
  introspection:
    enabled: false  # Security
  playground:
    enabled: false  # Security
cors:
  allowedOrigins:
    - "https://app.example.com"
    - "https://admin.example.com"
observability:
  logging:
    level: warn
    logQueries: false
  openTelemetry:
    samplingRate: 0.1
errors:
  includeStackTrace: false
```

**How to manage**: Use separate branches or Git tags for each environment, or use environment variable substitution in CI/CD.

---

## Troubleshooting

### "Invalid JWT token"

**Cause**: Token signature verification failed

**Check**:
1. JWKS URL is correct:
   ```bash
   curl $OAUTH_JWKS_URL
   # Should return JSON with keys
   ```

2. Issuer matches:
   ```bash
   # Decode JWT token (use jwt.io)
   # Check "iss" claim matches OAUTH_ISSUER_URL
   ```

3. Audience matches:
   ```bash
   # Check "aud" claim matches OAUTH_AUDIENCE
   ```

4. Token not expired:
   ```bash
   # Check "exp" claim is in the future (Unix timestamp)
   date -d @<exp_value>
   ```

**Fix**:
```bash
# Test JWKS endpoint
curl -v $OAUTH_JWKS_URL

# Verify environment variables are set
kubectl get secret hasura-secrets -o jsonpath='{.data.OAUTH_JWKS_URL}' | base64 -d
```

---

### "Missing session variable"

**Cause**: Required session variable not in JWT claims

**Check**:
```bash
# Decode JWT at jwt.io
# Look for "https://hasura.io/jwt/claims" namespace
# Verify it contains required variables
```

**Fix**:

1. Update IdP to include claims (see provider setup above)

2. Add variable to `allowedSessionVariableNames`:
   ```yaml
   # metadata/AuthConfig.hml
   allowedSessionVariableNames:
     - x-hasura-user-id
     - x-hasura-missing-variable  # Add this
   ```

3. Rebuild and redeploy:
   ```bash
   ddn supergraph build local
   ./scripts/build-engine.sh v1.0.1
   ./scripts/deploy-metadata.sh production v1.0.1
   ```

---

### "CORS error in browser"

**Cause**: Origin not in `allowedOrigins`

**Check**:
```yaml
# metadata/GraphqlConfig.hml
cors:
  allowedOrigins:
    - "https://app.example.com"  # Must match exactly
```

**Fix**:

1. Add your origin:
   ```yaml
   cors:
     allowedOrigins:
       - "https://your-app.com"
       - "https://www.your-app.com"  # Don't forget www variant
   ```

2. For local development:
   ```yaml
   cors:
     allowedOrigins:
       - "http://localhost:3000"
       - "http://localhost:8080"
   ```

3. Rebuild and redeploy.

---

### "Rate limit exceeded"

**Cause**: Too many requests from user or globally

**Check**:
```yaml
# metadata/GraphqlConfig.hml
rateLimit:
  global:
    maxRequests: 1000  # Requests per minute
  perUser:
    maxRequests: 100   # Per user per minute
```

**Fix**:

1. Increase limits (if legitimate traffic):
   ```yaml
   rateLimit:
     global:
       maxRequests: 5000
     perUser:
       maxRequests: 500
   ```

2. Implement tiered rate limiting based on subscription level

3. Add caching to reduce request count:
   ```yaml
   cache:
     enabled: true
     defaultTtl: 300  # Cache for 5 minutes
   ```

---

### "Query too complex"

**Cause**: Query exceeds depth or node limits

**Check**:
```yaml
# metadata/GraphqlConfig.hml
depthLimit:
  maxDepth: 15
nodeLimit:
  maxNodes: 1000
```

**Fix**:

1. Increase limits (if query is legitimate):
   ```yaml
   depthLimit:
     maxDepth: 20
   nodeLimit:
     maxNodes: 2000
   ```

2. Optimize query (use fragments, pagination)

3. Split complex query into multiple simpler queries

---

### "Introspection disabled"

**Cause**: Production security setting

**Fix**:

For development only:
```yaml
# metadata/GraphqlConfig.hml
features:
  introspection:
    enabled: true
```

For production: Use a separate development endpoint or environment.

---

## Further Reading

### Official Hasura DDN v3 Documentation

**Authentication**:
- [Authentication Overview](https://hasura.io/docs/3.0/auth/overview/)
- [JWT Authentication](https://hasura.io/docs/3.0/auth/jwt/)
- [Webhook Authentication](https://hasura.io/docs/3.0/auth/webhook/)
- [Session Variables](https://hasura.io/docs/3.0/auth/session-variables/)

**GraphQL Configuration**:
- [GraphQL API Configuration](https://hasura.io/docs/3.0/api-reference/graphql-config/)
- [Query Complexity Analysis](https://hasura.io/docs/3.0/security/query-complexity/)
- [Rate Limiting](https://hasura.io/docs/3.0/security/rate-limiting/)
- [Response Caching](https://hasura.io/docs/3.0/caching/overview/)

**Security**:
- [Security Best Practices](https://hasura.io/docs/3.0/security/best-practices/)
- [Production Checklist](https://hasura.io/docs/3.0/deployment/production-checklist/)
- [CORS Configuration](https://hasura.io/docs/3.0/api-reference/cors/)

**Observability**:
- [OpenTelemetry Integration](https://hasura.io/docs/3.0/observability/opentelemetry/)
- [Logging Configuration](https://hasura.io/docs/3.0/observability/logging/)
- [Monitoring Guide](https://hasura.io/docs/3.0/observability/monitoring/)

### OAuth/OIDC Provider Documentation

**Keycloak**:
- [Server Administration Guide](https://www.keycloak.org/docs/latest/server_admin/)
- [Protocol Mappers](https://www.keycloak.org/docs/latest/server_admin/#_protocol-mappers)

**Auth0**:
- [Rules Documentation](https://auth0.com/docs/rules)
- [Custom Claims](https://auth0.com/docs/secure/tokens/json-web-tokens/create-custom-claims)

**Azure AD**:
- [App Registration](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [Optional Claims](https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-optional-claims)

**Okta**:
- [Custom Claims](https://developer.okta.com/docs/guides/customize-tokens-returned-from-okta/main/)
- [Authorization Server](https://developer.okta.com/docs/concepts/auth-servers/)

### Related Documentation

- **Main README**: `../README.md` - Project overview
- **QUICKSTART**: `../QUICKSTART.md` - Get started in 15 minutes
- **ARCHITECTURE**: `../ARCHITECTURE.md` - Understanding DDN v3 architecture
- **Examples**: `../examples/sample-models/README.md` - Permission examples

---

## Questions?

**Common scenarios**:
- Multi-tenancy? Use `x-hasura-org-id` session variable
- Role-based access? Use `x-hasura-role` with model permissions
- Public + private API? Use `allowUnauthenticatedAccess: true` + `anonymous` role
- Custom auth logic? Use webhook mode

**Need help?**
- [Hasura Discord](https://discord.com/invite/hasura)
- [GitHub Discussions](https://github.com/hasura/graphql-engine/discussions)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/hasura)
