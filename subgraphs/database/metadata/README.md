# PostgreSQL Subgraph Metadata

This directory contains Hasura DDN metadata files (HML format) for the PostgreSQL subgraph.

## Metadata Files

Metadata files are generated using the Hasura DDN CLI after introspecting your database schema.

### Getting Started

1. **Configure your Neon database connection** in `../connector/neon-postgres/configuration.json`

2. **Introspect the database schema:**
   ```bash
   ddn connector introspect neon_postgres
   ```

3. **Add models to the metadata:**
   ```bash
   # Add all tables
   ddn model add neon_postgres '*'

   # Or add specific tables
   ddn model add neon_postgres users
   ddn model add neon_postgres organizations
   ```

4. **Add permissions:**
   ```bash
   ddn permissions add neon_postgres users
   ```

## File Structure

After introspection and model generation, you'll have files like:

```
metadata/
├── README.md (this file)
├── Users.hml                 # User table model
├── Organizations.hml         # Organization table model
├── Claims.hml                # Claims table model
├── relationships.hml         # Cross-table relationships
└── permissions.hml           # Access control permissions
```

## Example Model File

```hml
---
kind: Model
version: v1
definition:
  name: Users
  objectType: Users
  source:
    dataConnectorName: neon_postgres
    collection: users

  filterExpressionType: UsersBoolExp
  orderableFields:
    - fieldName: id
      orderByDirections:
        enableAll: true
    - fieldName: email
      orderByDirections:
        enableAll: true
    - fieldName: createdAt
      orderByDirections:
        enableAll: true

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

  description: "User accounts in the system"
```

## Example Permissions File

```hml
---
kind: ModelPermissions
version: v1
definition:
  modelName: Users
  permissions:
    # Users can read their own data
    - role: user
      select:
        filter:
          fieldComparison:
            field: id
            operator: _eq
            value:
              sessionVariable: x-hasura-user-id

    # Admins can read all users
    - role: admin
      select:
        filter: null  # No filter = access to all rows
```

## Next Steps

1. Set up your Neon database schema using Liquibase migrations
2. Run `ddn connector introspect neon_postgres` to discover tables
3. Generate models with `ddn model add neon_postgres '*'`
4. Configure permissions based on your role-based access control requirements
5. Build the supergraph with `ddn supergraph build local`
