# Authentication Setup for Hasura DDN

How to enable OAuth/OIDC authentication for your self-hosted Hasura DDN deployment.

## Default: No Authentication ⚠️

By default, this template has **authentication disabled** for quick testing:

```yaml
# globals/metadata/AuthConfig.hml
mode:
  noAuth:
    role: admin
    sessionVariables: {}
```

**This means:**
- ✅ You can test immediately without auth setup
- ✅ Perfect for local development
- ❌ **INSECURE for production!** All requests have admin access

## Why Authentication Matters

Without authentication:
- Anyone can query your API
- All users have full admin permissions
- No user-specific data filtering
- No audit trail of who did what

**Enable authentication before deploying to production!**

## Authentication Architecture

Hasura DDN v3 supports **JWT-based OAuth/OIDC authentication**:

```
┌─────────┐         ┌─────────────┐         ┌─────────┐
│ Client  │ ──JWT──>│ Hasura DDN  │ ──SQL──>│Database │
└─────────┘         └─────────────┘         └─────────┘
                           │
                           │ Verifies JWT
                           ▼
                    ┌─────────────┐
                    │  Identity   │
                    │  Provider   │
                    │ (Auth0/etc) │
                    └─────────────┘
```

**How it works:**
1. User logs in via your identity provider (Auth0, Keycloak, etc.)
2. Identity provider returns a JWT token
3. Client sends JWT in `Authorization: Bearer <token>` header
4. Hasura DDN validates JWT against JWKS endpoint
5. Extracts user claims (user ID, roles, org ID, etc.)
6. Applies permissions based on role
7. Filters data using session variables

## Quick Setup: Auth0

### 1. Create Auth0 Application

```bash
# Login to Auth0 Dashboard
# https://manage.auth0.com

# Create new application:
# - Type: Single Page Application (SPA) or Regular Web App
# - Name: My Hasura API
```

### 2. Configure Application

**Settings:**
- **Allowed Callback URLs**: `http://localhost:3000/callback`
- **Allowed Web Origins**: `http://localhost:3000`

**Copy these values:**
- Domain: `your-tenant.auth0.com`
- Client ID: `abc123...`

### 3. Create API in Auth0

```bash
# In Auth0 Dashboard → Applications → APIs
# Click "Create API"

# Settings:
# - Name: Hasura DDN API
# - Identifier: https://hasura.example.com (your API identifier)
# - Signing Algorithm: RS256
```

**Copy the Identifier** - this is your `OAUTH_AUDIENCE`

### 4. Add Custom Claims Rule

In Auth0, create a custom Action/Rule to add Hasura claims:

```javascript
// Auth0 Action: Add Hasura Claims
exports.onExecutePostLogin = async (event, api) => {
  const namespace = "https://hasura.io/jwt/claims";

  api.accessToken.setCustomClaim(namespace, {
    "x-hasura-default-role": "user",
    "x-hasura-allowed-roles": ["user", "admin"],
    "x-hasura-user-id": event.user.user_id,
    // Add organization ID if using multi-tenancy
    "x-hasura-org-id": event.user.app_metadata?.organization_id || ""
  });
};
```

### 5. Update AuthConfig.hml

Replace the contents of `globals/metadata/AuthConfig.hml`:

```yaml
kind: AuthConfig
version: v2
definition:
  mode:
    jwt:
      # Your Auth0 API identifier
      audience:
        valueFromEnv: OAUTH_AUDIENCE

      # Your Auth0 domain
      issuer:
        valueFromEnv: OAUTH_ISSUER_URL

      # JWT claims configuration
      claims:
        namespace:
          claimsFormat: Json
          location: $.https://hasura\.io/jwt/claims

        # Extract user ID from sub claim
        userIdPath: $.sub

        # Extract default role
        defaultRolePath: $.https://hasura\.io/jwt/claims.x-hasura-default-role

        # Extract allowed roles
        allowedRolesPath: $.https://hasura\.io/jwt/claims.x-hasura-allowed-roles

      # JWKS URL for token verification
      jwksUri:
        valueFromEnv: OAUTH_JWKS_URL
```

### 6. Set Environment Variables

```bash
# In your .env.local or Kubernetes secrets
OAUTH_ISSUER_URL=https://your-tenant.auth0.com/
OAUTH_AUDIENCE=https://hasura.example.com
OAUTH_JWKS_URL=https://your-tenant.auth0.com/.well-known/jwks.json
```

### 7. Rebuild and Deploy

```bash
# Rebuild supergraph with auth enabled
ddn supergraph build local

# Test locally
ddn run docker-start

# Build new Docker image
../docker-helpers/scripts/build-engine.sh v1.1.0

# Deploy
docker push your-registry/ddn-engine:v1.1.0
kubectl set image deployment/ddn-engine engine=your-registry/ddn-engine:v1.1.0
```

### 8. Test Authentication

```bash
# Get token from Auth0
# (Use Auth0 test application or your frontend)

# Query with token
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGc..." \
  -d '{"query": "{ users { id email } }"}'

# Without token = error
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ users { id email } }"}'
# Error: No authorization header found
```

## Setup: Keycloak

### 1. Create Keycloak Realm

```bash
# In Keycloak Admin Console
# http://localhost:8080 (or your Keycloak URL)

# Create realm: hasura-ddn
```

### 2. Create Client

```bash
# Clients → Create Client
# - Client ID: hasura-api
# - Client Protocol: openid-connect
# - Access Type: confidential
```

### 3. Configure Client Mappers

Add protocol mappers to include Hasura claims:

**Mapper 1: User ID**
- Name: `x-hasura-user-id`
- Mapper Type: `User Property`
- Property: `id`
- Token Claim Name: `https://hasura\.io/jwt/claims.x-hasura-user-id`
- Claim JSON Type: `String`

**Mapper 2: Default Role**
- Name: `x-hasura-default-role`
- Mapper Type: `Hardcoded claim`
- Token Claim Name: `https://hasura\.io/jwt/claims.x-hasura-default-role`
- Claim Value: `user`
- Claim JSON Type: `String`

**Mapper 3: Allowed Roles**
- Name: `x-hasura-allowed-roles`
- Mapper Type: `User Realm Role`
- Token Claim Name: `https://hasura\.io/jwt/claims.x-hasura-allowed-roles`
- Claim JSON Type: `JSON`

### 4. Update AuthConfig.hml

```yaml
kind: AuthConfig
version: v2
definition:
  mode:
    jwt:
      audience:
        stringValue: "hasura-api"

      issuer:
        valueFromEnv: OAUTH_ISSUER_URL

      claims:
        namespace:
          claimsFormat: Json
          location: $.https://hasura\.io/jwt/claims

        userIdPath: $.sub
        defaultRolePath: $.https://hasura\.io/jwt/claims.x-hasura-default-role
        allowedRolesPath: $.https://hasura\.io/jwt/claims.x-hasura-allowed-roles

      jwksUri:
        valueFromEnv: OAUTH_JWKS_URL
```

### 5. Environment Variables

```bash
OAUTH_ISSUER_URL=http://localhost:8080/realms/hasura-ddn
OAUTH_AUDIENCE=hasura-api
OAUTH_JWKS_URL=http://localhost:8080/realms/hasura-ddn/protocol/openid-connect/certs
```

## Setup: Azure AD (Entra ID)

### 1. Register Application

```bash
# Azure Portal → Azure Active Directory → App Registrations
# Click "New registration"

# Settings:
# - Name: Hasura DDN API
# - Supported account types: Single tenant
# - Redirect URI: (leave blank for API)
```

### 2. Configure API Permissions

```bash
# API Permissions → Add permission
# - Microsoft Graph → Delegated → User.Read
```

### 3. Create App Roles

```bash
# App roles → Create app role

# Role 1: User
# - Display name: User
# - Value: user
# - Description: Regular user role

# Role 2: Admin
# - Display name: Admin
# - Value: admin
# - Description: Administrator role
```

### 4. Expose an API

```bash
# Expose an API → Add a scope
# - Scope name: access_api
# - Admin consent display name: Access Hasura API
```

Copy the **Application ID URI** (e.g., `api://abc-123-def`)

### 5. Update AuthConfig.hml

```yaml
kind: AuthConfig
version: v2
definition:
  mode:
    jwt:
      audience:
        valueFromEnv: OAUTH_AUDIENCE  # Application ID URI

      issuer:
        valueFromEnv: OAUTH_ISSUER_URL

      claims:
        namespace:
          claimsFormat: Json
          location: $.

        userIdPath: $.oid
        defaultRolePath: $.roles[0]
        allowedRolesPath: $.roles

      jwksUri:
        valueFromEnv: OAUTH_JWKS_URL
```

### 6. Environment Variables

```bash
OAUTH_ISSUER_URL=https://login.microsoftonline.com/{tenant-id}/v2.0
OAUTH_AUDIENCE=api://your-app-id-uri
OAUTH_JWKS_URL=https://login.microsoftonline.com/{tenant-id}/discovery/v2.0/keys
```

## Setup: Okta

### 1. Create Okta Application

```bash
# Okta Admin Dashboard → Applications → Create App Integration
# - Sign-in method: OIDC
# - Application type: Single-Page Application
```

### 2. Configure Authorization Server

```bash
# Security → API → Authorization Servers
# Use "default" or create custom

# Copy the Issuer URI:
# https://your-domain.okta.com/oauth2/default
```

### 3. Add Custom Claims

```bash
# Authorization Server → Claims → Add Claim

# Claim 1: x-hasura-user-id
# - Name: x-hasura-user-id
# - Include in: Access Token
# - Value type: Expression
# - Value: user.id

# Claim 2: x-hasura-default-role
# - Name: x-hasura-default-role
# - Include in: Access Token
# - Value type: Expression
# - Value: "user"

# Claim 3: x-hasura-allowed-roles
# - Name: x-hasura-allowed-roles
# - Include in: Access Token
# - Value type: Expression
# - Value: user.roles (or hardcode ["user", "admin"])
```

### 4. Update AuthConfig.hml

```yaml
kind: AuthConfig
version: v2
definition:
  mode:
    jwt:
      audience:
        stringValue: "api://default"

      issuer:
        valueFromEnv: OAUTH_ISSUER_URL

      claims:
        namespace:
          claimsFormat: Json
          location: $.

        userIdPath: $.x-hasura-user-id
        defaultRolePath: $.x-hasura-default-role
        allowedRolesPath: $.x-hasura-allowed-roles

      jwksUri:
        valueFromEnv: OAUTH_JWKS_URL
```

### 5. Environment Variables

```bash
OAUTH_ISSUER_URL=https://your-domain.okta.com/oauth2/default
OAUTH_AUDIENCE=api://default
OAUTH_JWKS_URL=https://your-domain.okta.com/oauth2/default/v1/keys
```

## Custom OAuth Provider

For any OAuth/OIDC provider, you need:

### 1. Requirements

- **JWT tokens** signed with RS256, RS384, or RS512
- **JWKS endpoint** for public key verification
- **Custom claims** in JWT payload

### 2. JWT Payload Example

```json
{
  "sub": "user_12345",
  "iss": "https://your-idp.example.com",
  "aud": "https://hasura.example.com",
  "exp": 1234567890,
  "https://hasura.io/jwt/claims": {
    "x-hasura-user-id": "user_12345",
    "x-hasura-default-role": "user",
    "x-hasura-allowed-roles": ["user", "admin"],
    "x-hasura-org-id": "org_67890"
  }
}
```

### 3. Generic AuthConfig

```yaml
kind: AuthConfig
version: v2
definition:
  mode:
    jwt:
      audience:
        valueFromEnv: OAUTH_AUDIENCE

      issuer:
        valueFromEnv: OAUTH_ISSUER_URL

      claims:
        namespace:
          claimsFormat: Json
          location: $.https://hasura\.io/jwt/claims

        userIdPath: $.sub
        defaultRolePath: $.https://hasura\.io/jwt/claims.x-hasura-default-role
        allowedRolesPath: $.https://hasura\.io/jwt/claims.x-hasura-allowed-roles

      jwksUri:
        valueFromEnv: OAUTH_JWKS_URL
```

## Session Variables Explained

Session variables are extracted from the JWT and used in permissions:

### Common Session Variables

```yaml
x-hasura-user-id: "user_12345"      # Current user's ID
x-hasura-default-role: "user"        # User's default role
x-hasura-allowed-roles: ["user"]     # Roles user can assume
x-hasura-org-id: "org_67890"         # Organization ID (multi-tenancy)
x-hasura-team-id: "team_abc"         # Team ID
```

### Using in Permissions

```yaml
# app/subgraphs/default/metadata/Users.hml
---
kind: ModelPermissions
version: v1
definition:
  modelName: Users
  permissions:
    - role: user
      select:
        filter:
          fieldComparison:
            field: id
            operator: _eq
            value:
              sessionVariable: x-hasura-user-id
```

**What this does:**
- User with `x-hasura-user-id: "123"` can only see their own user record (WHERE id = 123)

### Multi-Tenancy Example

```yaml
---
kind: ModelPermissions
version: v1
definition:
  modelName: Documents
  permissions:
    - role: user
      select:
        filter:
          fieldComparison:
            field: organization_id
            operator: _eq
            value:
              sessionVariable: x-hasura-org-id
```

**What this does:**
- Users only see documents from their organization

## Testing Authentication

### 1. Get a Test Token

**Using Auth0:**
```bash
curl --request POST \
  --url https://your-tenant.auth0.com/oauth/token \
  --header 'content-type: application/json' \
  --data '{
    "client_id":"YOUR_CLIENT_ID",
    "client_secret":"YOUR_CLIENT_SECRET",
    "audience":"https://hasura.example.com",
    "grant_type":"client_credentials"
  }'
```

**Using Keycloak:**
```bash
curl -X POST \
  http://localhost:8080/realms/hasura-ddn/protocol/openid-connect/token \
  -d "client_id=hasura-api" \
  -d "client_secret=YOUR_SECRET" \
  -d "grant_type=client_credentials"
```

### 2. Decode Token (for debugging)

```bash
# Visit https://jwt.io and paste your token
# Or use command line:
echo "YOUR_TOKEN" | cut -d. -f2 | base64 -d | jq .
```

### 3. Test Authenticated Request

```bash
# Set token
TOKEN="eyJhbGc..."

# Test query
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "query": "{ users { id email } }"
  }'
```

### 4. Test Role-Based Access

```bash
# Query as user role
curl -X POST http://localhost:3000/graphql \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"query": "{ users { id } }"}'

# Query as admin role
curl -X POST http://localhost:3000/graphql \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"query": "{ users { id email created_at } }"}'
```

## Troubleshooting

### "Invalid JWT" Error

```bash
# Check JWT is well-formed
echo $TOKEN | cut -d. -f2 | base64 -d | jq .

# Verify issuer matches config
# Verify audience matches config
# Check token hasn't expired (exp claim)
```

### "No authorization header found"

```bash
# Ensure header is included:
-H "Authorization: Bearer YOUR_TOKEN"

# NOT:
-H "Authorization: YOUR_TOKEN"  # Missing "Bearer"
```

### "Unable to verify JWT"

```bash
# Check JWKS URL is accessible
curl $OAUTH_JWKS_URL

# Verify issuer URL matches exactly (with/without trailing slash)
# Auth0: https://tenant.auth0.com/
# Keycloak: http://localhost:8080/realms/hasura-ddn

# Check Hasura can reach JWKS endpoint (network/firewall)
```

### Permissions Not Working

```bash
# Check session variables are being set
# View token payload at jwt.io

# Verify claim paths match your JWT structure
# Example: If claims are at root level, use location: $.

# Check permission filters reference correct session variables
```

## Production Considerations

### 1. Use Environment Variables

**Never hardcode** sensitive values:

```yaml
# ✅ Good
audience:
  valueFromEnv: OAUTH_AUDIENCE

# ❌ Bad
audience:
  stringValue: "https://hasura.example.com"
```

### 2. Secure JWKS Endpoint

- Use HTTPS for JWKS URL
- Ensure endpoint is highly available
- Consider caching JWKS keys

### 3. Token Expiration

- Keep token lifetime reasonable (1 hour recommended)
- Implement token refresh on client side
- Don't use long-lived tokens in production

### 4. Role Management

- Start with minimal roles (user, admin)
- Add granular roles as needed
- Document role permissions

### 5. Audit Trail

Enable logging to track:
- Who made requests
- What data was accessed
- Failed auth attempts

## Resources

- **Official DDN Auth Docs**: https://hasura.io/docs/3.0/auth/overview/
- **JWT Spec**: https://jwt.io
- **Auth0 Hasura Integration**: https://auth0.com/docs/integrations/hasura
- **Keycloak OIDC**: https://www.keycloak.org/docs/latest/server_admin/#_oidc
- **Azure AD Custom Claims**: https://learn.microsoft.com/en-us/azure/active-directory/develop/

---

**Next**: [Environment Setup](./ENVIRONMENT_SETUP.md) | [Security Hardening](./SECURITY.md)
