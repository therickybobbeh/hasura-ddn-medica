# Security Guide

Comprehensive security guide for Hasura DDN v3 deployments covering authentication, authorization, secrets management, network security, and compliance.

## Table of Contents

1. [Authentication](#authentication)
2. [Authorization & RBAC](#authorization--rbac)
3. [Secrets Management](#secrets-management)
4. [Network Security](#network-security)
5. [API Security](#api-security)
6. [Database Security](#database-security)
7. [Compliance](#compliance)
8. [Security Checklist](#security-checklist)

## Authentication

### OAuth 2.0 / OIDC Setup

Hasura DDN v3 validates JWT tokens from your OAuth provider.

#### Auth0 Configuration

**1. Configure Auth0 Application**:

```bash
# In Auth0 Dashboard:
# - Create new application (Single Page Application)
# - Note: Domain, Client ID, Client Secret
# - Add Allowed Callback URLs
# - Add Allowed Logout URLs
```

**2. Update `globals/metadata/AuthConfig.hml`**:

```yaml
kind: AuthConfig
version: v2
definition:
  # Allow role emulation (development only!)
  allowRoleEmulationBy: null  # Set to null in production

  # JWT configuration
  mode:
    jwt:
      # Auth0 JWT configuration
      issuer: https://your-tenant.auth0.com/
      audience: https://your-api.example.com

      # Claims mapping
      claimsConfig:
        namespace:
          claimsFormat: Json
          location: $.https://hasura\.io/jwt/claims

        # Map JWT claims to session variables
        mapping:
          x-hasura-user-id:
            literal: $.sub
          x-hasura-default-role:
            literal: $.https://hasura\.io/jwt/claims.x-hasura-default-role
          x-hasura-allowed-roles:
            literal: $.https://hasura\.io/jwt/claims.x-hasura-allowed-roles
          x-hasura-org-id:
            literal: $.https://hasura\.io/jwt/claims.x-hasura-org-id

      # JWT validation
      key:
        # JWKs URL for public key
        jwksUrl: https://your-tenant.auth0.com/.well-known/jwks.json
        # Optional: Cache duration for JWKs
        jwksCacheTtl: 3600

      # Token location
      tokenLocation:
        type: BearerToken
        header: Authorization
```

**3. Configure Auth0 Custom Claims**:

Create an Auth0 Action to add Hasura claims:

```javascript
// Auth0 Action: Add Hasura Claims
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://hasura.io/jwt/claims';

  // Get user metadata
  const userId = event.user.user_id;
  const email = event.user.email;

  // Fetch user role from your database
  const userRole = await getUserRole(userId);
  const orgId = await getUserOrgId(userId);

  // Add Hasura claims to ID token
  api.idToken.setCustomClaim(namespace, {
    'x-hasura-default-role': userRole || 'user',
    'x-hasura-allowed-roles': [userRole || 'user'],
    'x-hasura-user-id': userId,
    'x-hasura-org-id': orgId
  });
};
```

#### Keycloak Configuration

**1. Create Keycloak Client**:

```bash
# In Keycloak Admin Console:
# - Create new client: hasura-ddn
# - Client Protocol: openid-connect
# - Access Type: confidential
# - Valid Redirect URIs: https://your-app.example.com/*
```

**2. Add Client Mappers**:

```bash
# Add User ID Mapper:
# - Name: hasura-user-id
# - Mapper Type: User Property
# - Property: id
# - Token Claim Name: https://hasura.io/jwt/claims/x-hasura-user-id

# Add Role Mapper:
# - Name: hasura-default-role
# - Mapper Type: User Realm Role
# - Token Claim Name: https://hasura.io/jwt/claims/x-hasura-default-role
```

**3. Update AuthConfig.hml**:

```yaml
kind: AuthConfig
version: v2
definition:
  mode:
    jwt:
      issuer: https://keycloak.example.com/realms/your-realm
      audience: hasura-ddn

      claimsConfig:
        namespace:
          claimsFormat: Json
          location: $.https://hasura\.io/jwt/claims

        mapping:
          x-hasura-user-id:
            literal: $.https://hasura\.io/jwt/claims.x-hasura-user-id
          x-hasura-default-role:
            literal: $.https://hasura\.io/jwt/claims.x-hasura-default-role
          x-hasura-allowed-roles:
            literal: $.https://hasura\.io/jwt/claims.x-hasura-allowed-roles

      key:
        jwksUrl: https://keycloak.example.com/realms/your-realm/protocol/openid-connect/certs
```

#### Azure AD Configuration

**1. Register Application**:

```bash
# In Azure Portal:
# - Azure Active Directory → App registrations → New registration
# - Name: hasura-ddn
# - Supported account types: Single tenant
# - Redirect URI: https://your-app.example.com/callback
```

**2. Configure Token Claims**:

```bash
# Azure AD → App registrations → Token configuration
# - Add optional claims
# - Add custom claims via App Roles
```

**3. Update AuthConfig.hml**:

```yaml
kind: AuthConfig
version: v2
definition:
  mode:
    jwt:
      issuer: https://login.microsoftonline.com/{tenant-id}/v2.0
      audience: {application-client-id}

      claimsConfig:
        namespace:
          claimsFormat: Json
          location: $.

        mapping:
          x-hasura-user-id:
            literal: $.oid  # Azure AD object ID
          x-hasura-default-role:
            literal: $.roles[0]  # From App Roles
          x-hasura-allowed-roles:
            literal: $.roles

      key:
        jwksUrl: https://login.microsoftonline.com/{tenant-id}/discovery/v2.0/keys
```

### Session Variables

Session variables are extracted from JWT claims and used in permissions:

```yaml
# Common session variables
x-hasura-user-id      # User's unique identifier
x-hasura-role         # Current role for request
x-hasura-default-role # Default role from JWT
x-hasura-allowed-roles # List of allowed roles
x-hasura-org-id       # Organization ID
x-hasura-team-id      # Team ID
```

**Usage in permissions**:

```yaml
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

## Authorization & RBAC

### Role Hierarchy

Design a role hierarchy for your application:

```
admin
  ├── manager
  │   ├── team_lead
  │   │   └── user
  │   └── analyst
  └── support
```

### Permission Patterns

#### 1. Owner-Based Access

```yaml
# Users can only access their own data
- role: user
  select:
    filter:
      fieldComparison:
        field: user_id
        operator: _eq
        value:
          sessionVariable: x-hasura-user-id
```

#### 2. Organization-Based Access

```yaml
# Users can access data in their organization
- role: user
  select:
    filter:
      fieldComparison:
        field: organization_id
        operator: _eq
        value:
          sessionVariable: x-hasura-org-id
```

#### 3. Multi-Tenant Access

```yaml
# Strict tenant isolation
- role: user
  select:
    filter:
      and:
        - fieldComparison:
            field: tenant_id
            operator: _eq
            value:
              sessionVariable: x-hasura-tenant-id
        - fieldComparison:
            field: deleted_at
            operator: _is_null
            value: true
```

#### 4. Hierarchical Permissions

```yaml
# Managers can see their team's data
- role: manager
  select:
    filter:
      or:
        - fieldComparison:
            field: user_id
            operator: _eq
            value:
              sessionVariable: x-hasura-user-id
        - fieldComparison:
            field: manager_id
            operator: _eq
            value:
              sessionVariable: x-hasura-user-id
```

### Relationship Permissions

```yaml
# Users can only access comments on posts they can see
kind: ModelPermissions
version: v1
definition:
  modelName: Comments
  permissions:
    - role: user
      select:
        filter:
          relationship:
            name: post
            predicate:
              fieldComparison:
                field: user_id
                operator: _eq
                value:
                  sessionVariable: x-hasura-user-id
```

## Secrets Management

### Environment Variables

**Never commit secrets to Git!**

✅ **Good**: Use environment variables
```bash
# .env.local (NOT committed)
DATABASE_1_URL="postgresql://user:password@host/db"
JWT_SECRET="super-secret-key-here"
```

❌ **Bad**: Hardcoded secrets
```yaml
# AuthConfig.hml (committed to Git)
key:
  secret: "super-secret-key-here"  # NEVER DO THIS
```

### Kubernetes Secrets

**Create secrets**:

```bash
# Create secret for database URLs
kubectl create secret generic hasura-db-secrets \
  --from-literal=DATABASE_1_URL="postgresql://user:pass@host1/db1" \
  --from-literal=DATABASE_2_URL="postgresql://user:pass@host2/db2" \
  -n hasura-local

# Create secret for JWT
kubectl create secret generic hasura-jwt-secret \
  --from-literal=JWT_SECRET="your-jwt-secret-key" \
  -n hasura-local
```

**Reference in deployment**:

```yaml
# Kubernetes deployment
spec:
  template:
    spec:
      containers:
        - name: engine
          env:
            - name: DATABASE_1_URL
              valueFrom:
                secretKeyRef:
                  name: hasura-db-secrets
                  key: DATABASE_1_URL

            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: hasura-jwt-secret
                  key: JWT_SECRET
```

### Azure Key Vault (Optional)

For enhanced security, use Azure Key Vault:

```bash
# Install CSI driver
kubectl apply -f https://raw.githubusercontent.com/Azure/secrets-store-csi-driver-provider-azure/master/deployment/provider-azure-installer.yaml

# Create SecretProviderClass
cat <<EOF | kubectl apply -f -
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: hasura-secrets
  namespace: hasura-local
spec:
  provider: azure
  parameters:
    keyvaultName: "your-key-vault"
    tenantId: "your-tenant-id"
    objects: |
      array:
        - |
          objectName: database-url
          objectType: secret
        - |
          objectName: jwt-secret
          objectType: secret
EOF
```

## Network Security

### TLS/SSL Configuration

**1. Ingress with TLS**:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hasura-ingress
  namespace: hasura-local
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - api.example.com
      secretName: hasura-tls-cert
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: hasura-ddn-engine
                port:
                  number: 3000
```

**2. Force HTTPS**:

```yaml
# In globals/metadata/GraphqlConfig.hml
kind: GraphqlConfig
version: v2
definition:
  query:
    # ... other config
  security:
    # Force HTTPS in production
    requireHttps: true

    # HSTS headers
    headers:
      Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### Network Policies

**Restrict ingress traffic**:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: hasura-engine-policy
  namespace: hasura-local
spec:
  podSelector:
    matchLabels:
      app: hasura-ddn-engine

  policyTypes:
    - Ingress
    - Egress

  ingress:
    # Only allow from ingress controller
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 3000

  egress:
    # Allow to connectors
    - to:
        - podSelector:
            matchLabels:
              app: postgres-connector
      ports:
        - protocol: TCP
          port: 8080

    # Allow to external databases
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: TCP
          port: 5432

    # Allow DNS
    - to:
        - namespaceSelector:
            matchLabels:
              name: kube-system
      ports:
        - protocol: UDP
          port: 53
```

### Firewall Rules

**Database access**:
```bash
# Only allow connections from Kubernetes cluster IPs
# In your cloud provider firewall:
# - Source: <k8s-cluster-ip-range>
# - Destination: <database-ip>
# - Port: 5432
# - Action: Allow
```

## API Security

### CORS Configuration

```yaml
# In globals/metadata/GraphqlConfig.hml
kind: GraphqlConfig
version: v2
definition:
  query:
    # ... other config

  cors:
    # Allowed origins
    allowedOrigins:
      - https://app.example.com
      - https://admin.example.com

    # For development (INSECURE)
    # allowedOrigins:
    #   - "*"

    # Allowed headers
    allowedHeaders:
      - Content-Type
      - Authorization
      - X-Request-ID

    # Exposed headers
    exposedHeaders:
      - X-Request-ID

    # Allow credentials
    allowCredentials: true

    # Preflight cache
    maxAge: 3600
```

### Rate Limiting

```yaml
kind: GraphqlConfig
version: v2
definition:
  rateLimiting:
    # Global rate limit
    global:
      uniqueParams: IP
      maxRequests: 100
      perMinutes: 1

    # Per-user rate limit
    perRole:
      - role: user
        uniqueParams: SESSION_VARIABLE
        maxRequests: 60
        perMinutes: 1

      - role: admin
        uniqueParams: SESSION_VARIABLE
        maxRequests: 1000
        perMinutes: 1

      # Unauthenticated users
      - role: anonymous
        uniqueParams: IP
        maxRequests: 10
        perMinutes: 1
```

### Query Depth & Complexity Limits

```yaml
kind: GraphqlConfig
version: v2
definition:
  query:
    # Prevent deeply nested queries
    maxDepth: 10

    # Limit number of nodes
    maxNodes: 100

    # Timeout queries
    timeout: 30

  security:
    # Disable introspection in production
    disableIntrospection: true

    # Disable GraphiQL in production
    disableGraphiql: true
```

### Request Headers

```yaml
kind: GraphqlConfig
version: v2
definition:
  security:
    headers:
      # Security headers
      X-Content-Type-Options: nosniff
      X-Frame-Options: DENY
      X-XSS-Protection: 1; mode=block
      Referrer-Policy: strict-origin-when-cross-origin
      Content-Security-Policy: "default-src 'self'"
      Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## Database Security

### Connection Security

**Always use SSL**:

```bash
# .env.local
DATABASE_1_URL="postgresql://user:pass@host/db?sslmode=require"
DATABASE_2_URL="postgresql://user:pass@host/db?sslmode=verify-full&sslrootcert=/path/to/ca-cert.pem"
```

### Principle of Least Privilege

```sql
-- Create read-only role
CREATE ROLE hasura_readonly;
GRANT CONNECT ON DATABASE mydb TO hasura_readonly;
GRANT USAGE ON SCHEMA public TO hasura_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO hasura_readonly;

-- Create application role with limited permissions
CREATE ROLE hasura_app;
GRANT CONNECT ON DATABASE mydb TO hasura_app;
GRANT USAGE ON SCHEMA public TO hasura_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hasura_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO hasura_app;

-- Revoke dangerous permissions
REVOKE CREATE ON SCHEMA public FROM hasura_app;
REVOKE DROP ON ALL TABLES IN SCHEMA public FROM hasura_app;
```

### Audit Logging

```sql
-- Enable audit logging in PostgreSQL
ALTER SYSTEM SET log_statement = 'mod';  -- Log all modifications
ALTER SYSTEM SET log_connections = 'on';
ALTER SYSTEM SET log_disconnections = 'on';
ALTER SYSTEM SET log_duration = 'on';
SELECT pg_reload_conf();

-- Add audit columns to all tables
ALTER TABLE users
  ADD COLUMN created_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN created_by INT,
  ADD COLUMN updated_at TIMESTAMP,
  ADD COLUMN updated_by INT;

-- Create audit trigger
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_audit
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_func();
```

## Compliance

### GDPR Compliance

**1. Data Access**:

```graphql
# Users can request their data
query {
  myData: users(where: { id: { _eq: $userId } }) {
    id
    email
    name
    # ... all fields
  }
}
```

**2. Data Deletion**:

```sql
-- Soft delete with retention period
UPDATE users
SET deleted_at = NOW(),
    email = 'deleted-' || id || '@example.com',
    name = 'Deleted User'
WHERE id = $userId;

-- Hard delete after retention period
DELETE FROM users
WHERE deleted_at < NOW() - INTERVAL '30 days';
```

**3. Data Portability**:

```typescript
// Export user data in JSON format
export async function exportUserData(userId: number) {
  const user = await db.users.findOne({ id: userId });
  const posts = await db.posts.find({ user_id: userId });
  const comments = await db.comments.find({ user_id: userId });

  return {
    user,
    posts,
    comments,
    exportedAt: new Date().toISOString()
  };
}
```

### HIPAA Compliance

- **Encryption at rest**: Use encrypted database storage
- **Encryption in transit**: Always use TLS/SSL
- **Access controls**: Implement strict RBAC
- **Audit logging**: Log all data access
- **Data retention**: Implement retention policies

### SOC 2 Compliance

- **Access logging**: Track all GraphQL operations
- **Change management**: Git-based metadata versioning
- **Incident response**: Set up monitoring and alerting
- **Vendor management**: Document all third-party services

## Security Checklist

### Development

- [ ] Never commit secrets to Git
- [ ] Use `.env.local` for local secrets
- [ ] Enable role emulation only in development
- [ ] Use test data, not production data

### Staging

- [ ] Use separate database from production
- [ ] Enable authentication (no anonymous access)
- [ ] Test permissions thoroughly
- [ ] Run security scanning tools

### Production

- [ ] Disable role emulation (`allowRoleEmulationBy: null`)
- [ ] Enable HTTPS/TLS everywhere
- [ ] Disable GraphiQL (`disableGraphiql: true`)
- [ ] Disable introspection (`disableIntrospection: true`)
- [ ] Configure CORS restrictively
- [ ] Enable rate limiting
- [ ] Set up monitoring and alerting
- [ ] Use strong JWT secrets (minimum 256 bits)
- [ ] Rotate secrets regularly
- [ ] Implement audit logging
- [ ] Set up backup and disaster recovery
- [ ] Document incident response procedures
- [ ] Conduct regular security audits

---

**Security is an ongoing process.** Regularly review and update your security posture.
