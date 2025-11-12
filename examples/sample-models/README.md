# Sample Hasura Metadata Language (HML) Models

This directory contains example `.hml` files showing common patterns and best practices for Hasura DDN v3 models.

**📝 What is HML?**
HML (Hasura Metadata Language) is the format used to define models, permissions, and relationships in Hasura DDN v3. These files are the **source code** for your GraphQL API.

---

## Available Examples

### `User.hml`
**Demonstrates**:
- Basic model structure
- Common field types (String, Int, UUID, DateTime)
- Nullable vs non-nullable fields
- Timestamps (created_at, updated_at)
- Permissions (admin vs user role)
- Select permissions with row-level filters

### `Product.hml`
**Demonstrates**:
- Decimal/Money types
- Boolean flags
- Array fields
- Enums (product_status)
- Field-level permissions
- Aggregation permissions

### `Order.hml`
**Demonstrates**:
- Relationships to other models
- Foreign key references
- One-to-many relationships
- Nested object permissions
- Computed fields

---

## How to Use These Examples

### 1. Copy to Your Project

```bash
# After running `ddn model add postgres '*'`, you'll have auto-generated models
# Use these examples as reference to enhance them

# Example: Add permissions to an auto-generated model
# Open subgraphs/database/metadata/YourModel.hml
# Copy permission patterns from User.hml
```

### 2. Learn the Patterns

**Basic Model Structure**:
```yaml
kind: ObjectType
version: v1
definition:
  name: ModelName
  fields:
    - name: id
      type: Uuid!
    - name: name
      type: String!
```

**Adding Permissions**:
```yaml
kind: ModelPermissions
version: v1
definition:
  modelName: ModelName
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

**Adding Relationships**:
```yaml
kind: Relationship
version: v1
definition:
  name: orders
  source: User
  target:
    model:
      name: Order
      relationshipType: Array
  mapping:
    - source:
        fieldPath:
          - fieldName: id
      target:
        modelField:
          - fieldName: user_id
```

---

## Common Patterns

### Pattern 1: User Model with Roles

See `User.hml` for a complete example showing:
- Admin can see all users
- Users can only see themselves
- Field-level permissions (hiding sensitive data)

### Pattern 2: E-commerce Models

See `Product.hml` and `Order.hml` for:
- Product catalog with inventory
- Orders with line items
- Price calculations
- Stock management

### Pattern 3: Multi-Tenant with Row-Level Security

```yaml
# In your model permissions:
select:
  filter:
    fieldComparison:
      field: organization_id
      operator: _eq
      value:
        sessionVariable: x-hasura-org-id
```

### Pattern 4: Soft Deletes

```yaml
# Add a deleted_at field
- name: deleted_at
  type: DateTime

# Filter out deleted records in permissions:
select:
  filter:
    fieldComparison:
      field: deleted_at
      operator: _is_null
```

---

## Field Type Reference

Common field types you'll use:

| Type | Example | Use Case |
|------|---------|----------|
| `String!` | "hello" | Text (required) |
| `String` | "hello" or null | Optional text |
| `Int!` | 42 | Integer numbers |
| `Float!` | 3.14 | Decimal numbers |
| `Boolean!` | true/false | Flags |
| `Uuid!` | "550e8400-..." | Unique IDs |
| `DateTime!` | "2024-01-15T10:30:00Z" | Timestamps |
| `Json` | {"key": "value"} | Flexible data |
| `[String!]!` | ["a", "b"] | Array of strings |

**Note**: `!` means required (non-nullable)

---

## Auto-Generation vs Manual Creation

### When to Use Auto-Generated Models

```bash
# Introspect your database
ddn connector introspect postgres

# Generate models for all tables
ddn model add postgres '*'
```

**Pros**:
- ✅ Fast - seconds to generate
- ✅ Accurate - matches database exactly
- ✅ Complete - includes all tables and columns

**Cons**:
- ⚠️ No permissions by default
- ⚠️ No relationships by default
- ⚠️ Raw table names (not cleaned up)

### When to Manually Create/Edit

After auto-generation, manually edit to add:
1. **Permissions** - Who can access what
2. **Relationships** - Connect models together
3. **Computed Fields** - Derived values
4. **Custom Names** - Clean up table/field names
5. **Descriptions** - Document your schema

---

## Best Practices

### 1. Start with Auto-Generation
```bash
ddn connector introspect postgres
ddn model add postgres '*'
```

### 2. Add Permissions Immediately
Don't deploy without permissions! Use these examples as a guide.

### 3. Define Relationships
Make your GraphQL API useful by connecting models:
```graphql
# Without relationships:
query {
  users { id, name }
  orders { id, user_id }  # 😞 Need to join manually
}

# With relationships:
query {
  users {
    id
    name
    orders {  # 🎉 Nested query!
      id
      total
    }
  }
}
```

### 4. Use Descriptive Names
```yaml
# ❌ Avoid
name: usr_tbl_001

# ✅ Better
name: User
```

### 5. Document Your Models
```yaml
definition:
  name: User
  description: "Represents an application user with authentication and profile data"
  fields:
    - name: email
      type: String!
      description: "User's email address - must be unique"
```

---

## Updating Models After Database Changes

### The Workflow

1. **Change your database** (add table, add column, etc.)

2. **Re-introspect**:
   ```bash
   ddn connector introspect postgres
   ```

3. **Add new models/fields**:
   ```bash
   # Add specific table
   ddn model add postgres my_new_table

   # Or re-add all
   ddn model add postgres '*'
   ```

4. **Review changes**:
   ```bash
   git diff subgraphs/database/metadata/
   ```

5. **Update permissions** for new fields/models

6. **Build and deploy**:
   ```bash
   ddn supergraph build local
   ./scripts/build-engine.sh v1.x.x
   ```

---

## Common Issues

### Issue: "Model not found in GraphQL schema"

**Cause**: Model file exists but not included in subgraph

**Fix**: Check `subgraph.yaml` includes the metadata directory:
```yaml
definition:
  includePaths:
    - metadata  # ← Make sure this is here
```

### Issue: "Permission denied" errors

**Cause**: No permissions defined for the role

**Fix**: Add permissions to the model:
```yaml
kind: ModelPermissions
version: v1
definition:
  modelName: YourModel
  permissions:
    - role: user
      select:
        filter: null  # Allow all for now, restrict later
```

### Issue: "Relationship not found"

**Cause**: Relationship defined but models don't match

**Fix**: Verify field names and types match exactly between source and target models.

---

## Further Reading

**Official Documentation**:
- [Models Overview](https://hasura.io/docs/3.0/supergraph-modeling/models/)
- [Permissions](https://hasura.io/docs/3.0/supergraph-modeling/permissions/)
- [Relationships](https://hasura.io/docs/3.0/supergraph-modeling/relationships/)
- [Metadata Reference](https://hasura.io/docs/3.0/reference/metadata-reference/)

**Tutorials**:
- [Working with Models](https://hasura.io/docs/3.0/getting-started/models/)
- [Define Relationships](https://hasura.io/docs/3.0/getting-started/relationships/)
- [Add Permissions](https://hasura.io/docs/3.0/getting-started/permissions/)

---

## Questions?

- Can't find a specific pattern? Check the [official examples](https://github.com/hasura/ddn-sample-app)
- Need help with permissions? See the [permissions guide](https://hasura.io/docs/3.0/supergraph-modeling/permissions/)
- Have a complex relationship? Ask in [Hasura Discord](https://discord.com/invite/hasura)
