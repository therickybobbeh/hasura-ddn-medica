# Business Logic Implementation Guide

This guide covers implementing business logic in your Hasura DDN v3 project, including data modeling, permissions, relationships, computed fields, and custom functions.

## Table of Contents

1. [Data Modeling with HML](#data-modeling-with-hml)
2. [Permissions and Authorization](#permissions-and-authorization)
3. [Relationships](#relationships)
4. [Computed Fields](#computed-fields)
5. [Custom Functions](#custom-functions)
6. [Data Validations](#data-validations)
7. [Business Rules](#business-rules)
8. [Best Practices](#best-practices)

## Data Modeling with HML

### HML (Hasura Metadata Language)

HML files define your GraphQL schema, permissions, and business logic. They're generated from database introspection and enhanced with custom logic.

### Basic Model Structure

```yaml
# subgraphs/database-1/metadata/Users.hml
kind: Model
version: v1
definition:
  name: Users
  objectType: Users

  # Data connector configuration
  source:
    dataConnectorName: postgres
    collection: users

  # Field mapping
  typeMapping:
    Users:
      fieldMapping:
        id:
          column:
            name: id
        email:
          column:
            name: email
        name:
          column:
            name: name

  # GraphQL configuration
  graphql:
    selectUniques:
      - queryRootField: userById
        uniqueIdentifier:
          - id
      - queryRootField: userByEmail
        uniqueIdentifier:
          - email
    selectMany:
      queryRootField: users
    orderableFields:
      - fieldName: id
        orderByDirections:
          enableAll: true
      - fieldName: name
        orderByDirections:
          enableAll: true
```

### Object Types

Define the shape of your data:

```yaml
# subgraphs/database-1/metadata/Users.hml
kind: ObjectType
version: v1
definition:
  name: Users
  fields:
    - name: id
      type: Int!
    - name: email
      type: String!
    - name: name
      type: String
    - name: role
      type: String!
    - name: organization_id
      type: Int
    - name: created_at
      type: Timestamp!
    - name: updated_at
      type: Timestamp

  # Add computed fields (see Computed Fields section)
  computedFields:
    - name: fullName
      type: String
    - name: isActive
      type: Boolean!

  graphql:
    typeName: User
```

## Permissions and Authorization

### Role-Based Access Control (RBAC)

Define permissions per role:

```yaml
kind: ModelPermissions
version: v1
definition:
  modelName: Users
  permissions:
    # Admin role - full access
    - role: admin
      select:
        filter: null  # No filter = access to all rows

    # User role - can only see themselves
    - role: user
      select:
        filter:
          fieldComparison:
            field: id
            operator: _eq
            value:
              sessionVariable: x-hasura-user-id

    # Manager role - can see their team
    - role: manager
      select:
        filter:
          fieldComparison:
            field: organization_id
            operator: _eq
            value:
              sessionVariable: x-hasura-org-id
```

### Row-Level Security

Filter data based on session variables:

```yaml
# Users can only see active records in their organization
- role: user
  select:
    filter:
      and:
        - fieldComparison:
            field: organization_id
            operator: _eq
            value:
              sessionVariable: x-hasura-org-id
        - fieldComparison:
            field: status
            operator: _eq
            value:
              literal: active
        - fieldComparison:
            field: deleted_at
            operator: _is_null
            value: true
```

### Column-Level Permissions

Restrict access to specific fields:

```yaml
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

        # Only allow access to specific columns
        columns:
          - id
          - email
          - name
          - created_at

        # Exclude sensitive fields
        # (password_hash, ssn, etc. are not in the list)
```

### Insert/Update/Delete Permissions

```yaml
kind: ModelPermissions
version: v1
definition:
  modelName: Users
  permissions:
    # Users can update their own profile
    - role: user
      update:
        filter:
          fieldComparison:
            field: id
            operator: _eq
            value:
              sessionVariable: x-hasura-user-id

        # Can only update certain fields
        columns:
          - name
          - email
          - avatar_url

        # Cannot update
        # - id
        # - role
        # - organization_id

    # Admins can insert new users
    - role: admin
      insert:
        check: null  # No restrictions on insert
        columns:
          - email
          - name
          - role
          - organization_id

    # Managers can delete users in their org
    - role: manager
      delete:
        filter:
          fieldComparison:
            field: organization_id
            operator: _eq
            value:
              sessionVariable: x-hasura-org-id
```

### Complex Permission Logic

Use `and`, `or`, `not` operators:

```yaml
# Users can see records if they're:
# - The owner, OR
# - It's marked as public, OR
# - They're in the same organization AND it's shared
- role: user
  select:
    filter:
      or:
        - fieldComparison:
            field: user_id
            operator: _eq
            value:
              sessionVariable: x-hasura-user-id
        - fieldComparison:
            field: is_public
            operator: _eq
            value:
              literal: true
        - and:
            - fieldComparison:
                field: organization_id
                operator: _eq
                value:
                  sessionVariable: x-hasura-org-id
            - fieldComparison:
                field: is_shared
                operator: _eq
                value:
                  literal: true
```

## Relationships

### One-to-Many Relationships

```yaml
# In Users.hml - One user has many posts
kind: Model
version: v1
definition:
  name: Users
  # ... other config ...

  relationships:
    - name: posts
      target:
        model: Posts
      mapping:
        - source:
            fieldPath:
              - fieldName: id
          target:
            fieldPath:
              - fieldName: user_id
```

Usage:
```graphql
query {
  users {
    id
    name
    posts {
      id
      title
      created_at
    }
  }
}
```

### Many-to-One Relationships

```yaml
# In Posts.hml - Many posts belong to one user
kind: Model
version: v1
definition:
  name: Posts
  # ... other config ...

  relationships:
    - name: author
      target:
        model: Users
      mapping:
        - source:
            fieldPath:
              - fieldName: user_id
          target:
            fieldPath:
              - fieldName: id
```

Usage:
```graphql
query {
  posts {
    id
    title
    author {
      id
      name
      email
    }
  }
}
```

### Cross-Database Relationships

```yaml
# In database-1/Users.hml - User belongs to organization in database-2
kind: Model
version: v1
definition:
  name: Users
  # ... other config ...

  relationships:
    - name: organization
      target:
        subgraph: database-2  # Different database!
        model: Organizations
      mapping:
        - source:
            fieldPath:
              - fieldName: organization_id
          target:
            fieldPath:
              - fieldName: id
```

### Many-to-Many Relationships

Using a junction table:

```yaml
# In Users.hml
relationships:
  - name: teams
    target:
      model: UserTeams  # Junction table
    mapping:
      - source:
          fieldPath:
            - fieldName: id
        target:
          fieldPath:
            - fieldName: user_id

---
# In UserTeams.hml
kind: Model
version: v1
definition:
  name: UserTeams
  # ... config ...

  relationships:
    - name: user
      target:
        model: Users
      mapping:
        - source:
            fieldPath:
              - fieldName: user_id
          target:
            fieldPath:
              - fieldName: id

    - name: team
      target:
        model: Teams
      mapping:
        - source:
            fieldPath:
              - fieldName: team_id
          target:
            fieldPath:
              - fieldName: id
```

## Computed Fields

Add fields that don't exist in the database:

### Simple Computed Fields

```yaml
# In Users.hml ObjectType
kind: ObjectType
version: v1
definition:
  name: Users
  fields:
    - name: first_name
      type: String
    - name: last_name
      type: String

  computedFields:
    - name: fullName
      type: String!
      # Computed via SQL function
      source:
        dataConnectorName: postgres
        function: get_full_name
        arguments:
          first_name: $.first_name
          last_name: $.last_name
```

Create the SQL function:

```sql
CREATE OR REPLACE FUNCTION get_full_name(first_name TEXT, last_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN first_name || ' ' || last_name;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### Computed Fields with Business Logic

```yaml
computedFields:
  - name: isActive
    type: Boolean!
    source:
      dataConnectorName: postgres
      function: check_user_active
      arguments:
        user_id: $.id
```

```sql
CREATE OR REPLACE FUNCTION check_user_active(user_id INT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT
      email_verified = true
      AND deleted_at IS NULL
      AND status = 'active'
      AND last_login_at > NOW() - INTERVAL '90 days'
    FROM users
    WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql STABLE;
```

## Custom Functions

### Native Queries (Read-Only)

Define custom SQL queries:

```yaml
# In metadata/CustomQueries.hml
kind: NativeQuery
version: v1
definition:
  name: searchUsers

  # SQL query
  query: |
    SELECT
      id,
      email,
      name,
      ts_rank(search_vector, plainto_tsquery('english', {{search_term}})) AS rank
    FROM users
    WHERE search_vector @@ plainto_tsquery('english', {{search_term}})
    ORDER BY rank DESC
    LIMIT {{limit}}

  # Arguments
  arguments:
    search_term:
      type: String!
    limit:
      type: Int!
      default: 10

  # Return type
  returns:
    model: Users
```

Usage:
```graphql
query {
  searchUsers(search_term: "john", limit: 5) {
    id
    name
    email
  }
}
```

### Native Mutations (Write Operations)

```yaml
kind: NativeMutation
version: v1
definition:
  name: assignUserToTeam

  mutation: |
    INSERT INTO user_teams (user_id, team_id, role, assigned_at)
    VALUES ({{user_id}}, {{team_id}}, {{role}}, NOW())
    ON CONFLICT (user_id, team_id)
    DO UPDATE SET role = {{role}}, updated_at = NOW()
    RETURNING *

  arguments:
    user_id:
      type: Int!
    team_id:
      type: Int!
    role:
      type: String!

  returns:
    model: UserTeams
```

### TypeScript Functions (Custom Logic)

For complex business logic, use TypeScript connectors:

```typescript
// In connectors/typescript-connector/src/functions/userLogic.ts
export async function promoteUser(userId: number, newRole: string) {
  // Complex validation
  const user = await db.users.findOne({ id: userId });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.role === 'admin') {
    throw new Error('Admins cannot be promoted');
  }

  // Audit log
  await db.auditLog.insert({
    action: 'user_promoted',
    user_id: userId,
    old_role: user.role,
    new_role: newRole,
    timestamp: new Date()
  });

  // Update user
  return await db.users.update(
    { id: userId },
    { role: newRole, updated_at: new Date() }
  );
}
```

## Data Validations

### Database-Level Constraints

```sql
-- In your database migrations
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  age INT CHECK (age >= 18 AND age <= 120),
  phone VARCHAR(20) CHECK (phone ~ '^\+?[1-9]\d{1,14}$'),
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'suspended', 'deleted'))
);
```

### Application-Level Validations

Use TypeScript connectors for complex validations:

```typescript
// In connectors/typescript-connector/src/validators/userValidator.ts
export function validateUserInput(data: any) {
  const errors = [];

  // Email validation
  if (!data.email || !isValidEmail(data.email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }

  // Password strength
  if (data.password && !isStrongPassword(data.password)) {
    errors.push({
      field: 'password',
      message: 'Password must be at least 8 characters with uppercase, lowercase, and numbers'
    });
  }

  // Business rule: email domain whitelist
  if (data.email && !isAllowedDomain(data.email)) {
    errors.push({
      field: 'email',
      message: 'Email domain not allowed'
    });
  }

  if (errors.length > 0) {
    throw new ValidationError(errors);
  }

  return true;
}
```

## Business Rules

### Workflow Automation

```typescript
// Auto-assign users to default team on creation
export async function onUserCreated(userId: number) {
  const user = await db.users.findOne({ id: userId });

  // Get default team for organization
  const defaultTeam = await db.teams.findOne({
    organization_id: user.organization_id,
    is_default: true
  });

  if (defaultTeam) {
    await db.userTeams.insert({
      user_id: userId,
      team_id: defaultTeam.id,
      role: 'member'
    });
  }

  // Send welcome email
  await sendWelcomeEmail(user.email, user.name);

  // Create audit log
  await db.auditLog.insert({
    action: 'user_created',
    user_id: userId,
    timestamp: new Date()
  });
}
```

### State Machines

```typescript
// Order status state machine
const ORDER_TRANSITIONS = {
  'pending': ['confirmed', 'cancelled'],
  'confirmed': ['shipped', 'cancelled'],
  'shipped': ['delivered', 'returned'],
  'delivered': ['returned'],
  'cancelled': [],
  'returned': []
};

export async function transitionOrderStatus(
  orderId: number,
  newStatus: string
) {
  const order = await db.orders.findOne({ id: orderId });

  const allowedTransitions = ORDER_TRANSITIONS[order.status];

  if (!allowedTransitions.includes(newStatus)) {
    throw new Error(
      `Cannot transition from ${order.status} to ${newStatus}`
    );
  }

  await db.orders.update(
    { id: orderId },
    {
      status: newStatus,
      status_changed_at: new Date()
    }
  );

  // Trigger side effects
  if (newStatus === 'shipped') {
    await sendShippingNotification(order);
  }
}
```

## Best Practices

### 1. Keep Business Logic Close to Data

**Good**: Use SQL functions for simple computed fields
```sql
CREATE FUNCTION get_order_total(order_id INT) RETURNS DECIMAL AS $$
  SELECT SUM(quantity * unit_price) FROM order_items WHERE order_id = $1;
$$ LANGUAGE sql STABLE;
```

**Avoid**: Fetching data to application layer for simple calculations

### 2. Use Permissions for Authorization

**Good**: Define permissions in HML
```yaml
permissions:
  - role: user
    select:
      filter:
        fieldComparison:
          field: user_id
          operator: _eq
          value:
            sessionVariable: x-hasura-user-id
```

**Avoid**: Filtering in application code

### 3. Validate at Multiple Layers

1. **Database**: Constraints, NOT NULL, CHECK
2. **GraphQL**: Input validations in HML
3. **Application**: Complex business rules in TypeScript

### 4. Design for Auditability

```sql
-- Add audit fields to all tables
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  -- ... other fields ...
  created_at TIMESTAMP DEFAULT NOW(),
  created_by INT REFERENCES users(id),
  updated_at TIMESTAMP,
  updated_by INT REFERENCES users(id),
  deleted_at TIMESTAMP,
  deleted_by INT REFERENCES users(id)
);
```

### 5. Use Transactions

```typescript
export async function transferFunds(
  fromUserId: number,
  toUserId: number,
  amount: number
) {
  return await db.transaction(async (trx) => {
    // Debit from source
    await trx.accounts.update(
      { user_id: fromUserId },
      { balance: db.raw('balance - ?', [amount]) }
    );

    // Credit to destination
    await trx.accounts.update(
      { user_id: toUserId },
      { balance: db.raw('balance + ?', [amount]) }
    );

    // Record transaction
    await trx.transactions.insert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      amount: amount,
      timestamp: new Date()
    });
  });
}
```

### 6. Document Your Schema

Add comments to HML files:

```yaml
# Users.hml
kind: Model
version: v1
definition:
  name: Users
  description: |
    Represents application users. Each user belongs to one organization
    and can be assigned to multiple teams. Users authenticate via OAuth2.

  # ... rest of config
```

### 7. Test Your Permissions

```graphql
# Test as different roles
# As admin (should see all users)
query @role(name: "admin") {
  users {
    id
    email
  }
}

# As user (should only see self)
query @role(name: "user") {
  users {
    id
    email
  }
}
```

---

**Next Steps**: See [SECURITY.md](./SECURITY.md) for authentication and authorization patterns.
