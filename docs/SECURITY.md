# Security Best Practices for Hasura DDN

Production security guidelines for your self-hosted Hasura DDN deployment.

## ⚠️ Critical: Default No-Auth Configuration

**This template has authentication DISABLED by default.**

```yaml
# globals/metadata/AuthConfig.hml (default)
mode:
  noAuth:
    role: admin
    sessionVariables: {}
```

**What this means:**
- 🚨 **ALL requests are treated as admin**
- 🚨 **No user authentication required**
- 🚨 **No authorization checks**
- 🚨 **Anyone can access your API**

**For production:**
1. **MUST** enable authentication before deploying
2. See [AUTHENTICATION.md](./AUTHENTICATION.md) for setup instructions
3. Use OAuth/OIDC with JWT validation
4. Configure proper role-based permissions

**This is safe for:**
- ✅ Local development
- ✅ Quick testing
- ✅ Proof of concepts

**This is UNSAFE for:**
- ❌ Production deployments
- ❌ Staging environments with real data
- ❌ Any internet-accessible deployment
- ❌ Multi-user applications

---

## Security Checklist

Before deploying to production, verify:

### Authentication ✅

- [ ] **JWT authentication enabled** (not noAuth)
- [ ] **JWKS URL configured** for token verification
- [ ] **Issuer URL validated** matches your identity provider
- [ ] **Audience claim** properly configured
- [ ] **Token expiration** enforced (reasonable TTL)
- [ ] **Session variables** extracted from JWT claims

**See:** [AUTHENTICATION.md](./AUTHENTICATION.md)

### Authorization ✅

- [ ] **Model permissions defined** for all models
- [ ] **Role-based access control** configured
- [ ] **Row-level security** implemented where needed
- [ ] **Admin role** restricted to authorized users only
- [ ] **Default role** is least-privileged (e.g., "user", not "admin")
- [ ] **Field-level permissions** for sensitive data

### Network Security ✅

- [ ] **TLS/HTTPS enabled** for all external traffic
- [ ] **Ingress configured** with valid SSL certificates
- [ ] **Internal traffic encrypted** (service mesh or mTLS)
- [ ] **Network policies** restrict pod-to-pod communication
- [ ] **No public database access** (database only accessible from cluster)
- [ ] **Firewall rules** limit inbound/outbound traffic

### Secrets Management ✅

- [ ] **Database passwords** stored in Kubernetes Secrets (not env files)
- [ ] **OAuth client secrets** stored securely
- [ ] **API keys** never committed to Git
- [ ] **Secrets encrypted at rest** (KMS, Vault, External Secrets Operator)
- [ ] **Service accounts** use least-privilege IAM roles
- [ ] **Secret rotation** policy in place

### Container Security ✅

- [ ] **Base images** from trusted sources (official Hasura images)
- [ ] **Image scanning** enabled (Trivy, Snyk, or registry scanning)
- [ ] **No vulnerabilities** above acceptable threshold
- [ ] **Images signed** (Docker Content Trust or Cosign)
- [ ] **Non-root user** in containers (if applicable)
- [ ] **Read-only root filesystem** where possible

### Kubernetes Security ✅

- [ ] **RBAC enabled** on cluster
- [ ] **Service accounts** have minimal permissions
- [ ] **Pod Security Standards** enforced (restricted or baseline)
- [ ] **Resource limits** configured (CPU, memory)
- [ ] **Network policies** in place
- [ ] **Secrets not mounted** as environment variables (use volume mounts)
- [ ] **Admission controllers** enabled (OPA, Kyverno)

### Observability & Monitoring ✅

- [ ] **Audit logging** enabled
- [ ] **Failed auth attempts** logged and monitored
- [ ] **Anomaly detection** for unusual query patterns
- [ ] **Rate limiting** configured (at ingress or application level)
- [ ] **Alerting** for security events (failed logins, permission errors)
- [ ] **Log aggregation** (CloudWatch, Stackdriver, ELK)

---

## Authentication Setup

### Enable JWT Authentication

**1. Edit `globals/metadata/AuthConfig.hml`:**

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

**2. Configure environment variables:**

```bash
# In Kubernetes Secret
kubectl create secret generic hasura-env \
  --from-literal=OAUTH_ISSUER_URL='https://your-idp.example.com' \
  --from-literal=OAUTH_AUDIENCE='https://hasura.example.com' \
  --from-literal=OAUTH_JWKS_URL='https://your-idp.example.com/.well-known/jwks.json' \
  -n hasura
```

**3. Rebuild and redeploy:**

```bash
ddn supergraph build local
./scripts/build-engine.sh v1.1.0
docker push your-registry/ddn-engine:v1.1.0
kubectl set image deployment/ddn-engine engine=your-registry/ddn-engine:v1.1.0
```

**See:** [AUTHENTICATION.md](./AUTHENTICATION.md) for provider-specific setup (Auth0, Keycloak, Azure AD, Okta).

---

## Authorization Best Practices

### Model Permissions

Define permissions for every model in your `.hml` files.

**Example: User can only see their own data**

```yaml
# app/subgraphs/default/metadata/Users.hml
---
kind: ModelPermissions
version: v1
definition:
  modelName: Users
  permissions:
    # Admin sees everything
    - role: admin
      select:
        filter: null

    # User sees only themselves
    - role: user
      select:
        filter:
          fieldComparison:
            field: id
            operator: _eq
            value:
              sessionVariable: x-hasura-user-id
```

**Example: Multi-tenancy with organization isolation**

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

### Default to Deny

- **No permissions = no access** (secure by default)
- Define explicit permissions for each role
- Use most restrictive permissions first
- Avoid `filter: null` except for admin role

### Least Privilege

- Users get minimal necessary permissions
- Separate read/write permissions
- Field-level restrictions for sensitive data (SSNs, passwords, payment info)

---

## Network Security

### TLS/HTTPS

**1. Use cert-manager for automatic certificate management:**

```yaml
# cert-manager Issuer
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```

**2. Configure Ingress with TLS:**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hasura-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  tls:
    - hosts:
        - hasura.example.com
      secretName: hasura-tls
  rules:
    - host: hasura.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: ddn-engine
                port:
                  number: 3000
```

### Network Policies

**Restrict pod-to-pod communication:**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: hasura-network-policy
spec:
  podSelector:
    matchLabels:
      app: ddn-engine
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Allow from ingress controller
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
  egress:
    # Allow to database
    - to:
        - podSelector:
            matchLabels:
              app: postgres-connector
      ports:
        - protocol: TCP
          port: 8080
    # Allow DNS
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: UDP
          port: 53
```

---

## Secrets Management

### Never Commit Secrets

```bash
# Add to .gitignore
echo ".env.local" >> .gitignore
echo ".env.*.local" >> .gitignore
echo "*.secret" >> .gitignore
echo "secrets/" >> .gitignore
```

### Use Kubernetes Secrets

**Create from file:**

```bash
kubectl create secret generic hasura-env \
  --from-env-file=.env.production \
  -n hasura
```

**Mount as volumes (not environment variables):**

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: engine
          volumeMounts:
            - name: env-secrets
              mountPath: /secrets
              readOnly: true
      volumes:
        - name: env-secrets
          secret:
            secretName: hasura-env
```

### External Secret Management

**Use External Secrets Operator with AWS Secrets Manager:**

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: hasura-sa

---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: hasura-env
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets
  target:
    name: hasura-env
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: hasura/database-url
    - secretKey: OAUTH_ISSUER_URL
      remoteRef:
        key: hasura/oauth-issuer
```

### Secret Rotation

- **Database passwords:** Rotate quarterly (minimum)
- **OAuth client secrets:** Rotate on compromise or annually
- **API keys:** Rotate on developer offboarding
- **Certificates:** Automated renewal (cert-manager)

---

## Container Security

### Image Scanning

**Scan before deploying:**

```bash
# Using Trivy
trivy image your-registry/ddn-engine:v1.0.0

# Using Snyk
snyk container test your-registry/ddn-engine:v1.0.0

# Fail on high/critical vulnerabilities
trivy image --exit-code 1 --severity HIGH,CRITICAL your-registry/ddn-engine:v1.0.0
```

### Image Signing

**Sign with Cosign:**

```bash
# Generate keys
cosign generate-key-pair

# Sign image
cosign sign --key cosign.key your-registry/ddn-engine:v1.0.0

# Verify signature
cosign verify --key cosign.pub your-registry/ddn-engine:v1.0.0
```

**Enforce signature verification in Kubernetes (Kyverno):**

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signature
spec:
  validationFailureAction: enforce
  rules:
    - name: verify-hasura-signature
      match:
        resources:
          kinds:
            - Pod
      verifyImages:
        - image: "your-registry/ddn-engine:*"
          key: |-
            -----BEGIN PUBLIC KEY-----
            <your-cosign-public-key>
            -----END PUBLIC KEY-----
```

---

## Rate Limiting

### Application-Level Rate Limiting

Configure in Ingress:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hasura-ingress
  annotations:
    nginx.ingress.kubernetes.io/rate-limit: "100"  # requests per second
    nginx.ingress.kubernetes.io/rate-limit-burst: "50"
spec:
  # ... rest of config
```

### API Gateway Rate Limiting

If using cloud provider API gateways (AWS API Gateway, Google Cloud Endpoints, Azure API Management), configure there.

---

## Monitoring & Alerting

### Log Audit Events

- Failed authentication attempts
- Permission denied errors
- Unusual query patterns (deeply nested, large result sets)
- Admin role usage

### Alerts

Configure alerts for:

```yaml
# Example Prometheus AlertManager rule
groups:
  - name: hasura-security
    rules:
      - alert: HighFailedAuthRate
        expr: rate(hasura_auth_failures[5m]) > 10
        annotations:
          summary: "High rate of authentication failures"

      - alert: AdminRoleUsage
        expr: increase(hasura_admin_requests[1h]) > 100
        annotations:
          summary: "Unusual admin role activity"
```

### Anomaly Detection

- Monitor query complexity scores
- Track response sizes
- Alert on sudden traffic spikes
- Detect credential stuffing attempts

---

## Database Security

### Connection Security

- **Use SSL/TLS** for database connections (`sslmode=require`)
- **Restrict database access** to cluster IP range only
- **Use read replicas** for reporting queries
- **Connection pooling** to prevent resource exhaustion

### Database User Permissions

```sql
-- Create dedicated user for Hasura
CREATE USER hasura_user WITH PASSWORD 'secure-password';

-- Grant minimal permissions
GRANT CONNECT ON DATABASE mydb TO hasura_user;
GRANT USAGE ON SCHEMA public TO hasura_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hasura_user;

-- Revoke dangerous permissions
REVOKE CREATE ON SCHEMA public FROM hasura_user;
REVOKE DROP ON ALL TABLES IN SCHEMA public FROM hasura_user;
```

---

## Compliance

### Data Privacy (GDPR, CCPA)

- **Data encryption at rest** (database encryption)
- **Data encryption in transit** (TLS)
- **Right to deletion** (implement data purge endpoints)
- **Data portability** (export user data functionality)
- **Audit trails** for data access

### SOC 2 / ISO 27001

- **Access controls** (RBAC, MFA for administrative access)
- **Change management** (GitOps, approval workflows)
- **Incident response** plan documented
- **Regular security reviews** and penetration testing

---

## Incident Response

### When Security Incident Occurs

**1. Contain:**
- Revoke compromised credentials immediately
- Block malicious IPs at ingress
- Scale down if under attack (DDoS)

**2. Investigate:**
- Review audit logs
- Identify scope of breach
- Preserve evidence

**3. Remediate:**
- Rotate all secrets
- Patch vulnerabilities
- Update permissions

**4. Communicate:**
- Notify affected users (if PII exposed)
- Document incident in post-mortem
- Update security policies

### Emergency Procedures

```bash
# Revoke all user sessions (rotate JWT signing key)
# Update OAUTH_JWKS_URL to new key

# Scale down deployment (emergency stop)
kubectl scale deployment/ddn-engine --replicas=0 -n hasura

# Review recent logs
kubectl logs deployment/ddn-engine -n hasura --since=1h

# Block IP at ingress
kubectl patch ingress hasura-ingress -n hasura \
  --type=json -p='[{"op": "add", "path": "/spec/rules/0/http/paths/0/backend/service/port/number", "value": 0}]'
```

---

## Security Tools

### Recommended

- **cert-manager** - Automatic TLS certificate management
- **External Secrets Operator** - Sync secrets from cloud providers
- **Trivy / Snyk** - Container image scanning
- **Falco** - Runtime security monitoring
- **OPA / Kyverno** - Policy enforcement
- **Vault** - Secret management (alternative to cloud providers)

### Kubernetes Security Hardening

- **kube-bench** - CIS Kubernetes Benchmark checks
- **kube-hunter** - Penetration testing
- **Polaris** - Cluster configuration validation

---

## Resources

- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **CIS Kubernetes Benchmark**: https://www.cisecurity.org/benchmark/kubernetes
- **Hasura Security**: https://hasura.io/docs/latest/security/
- **NIST Cybersecurity Framework**: https://www.nist.gov/cyberframework

---

**Next:** [Authentication Setup](./AUTHENTICATION.md) | [Environment Variables](./ENVIRONMENT_SETUP.md)
