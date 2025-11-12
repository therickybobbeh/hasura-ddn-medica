# Hasura DDN v3 Examples

This directory contains complete, working examples of various Hasura DDN v3 features and patterns.

**⚠️ Important**: These are **reference implementations** to learn from, not meant to be modified directly. Copy what you need into your project and adapt as necessary.

---

## Available Examples

### 1. TypeScript Connector (`typescript-connector/`)

**What it demonstrates**:
- Custom business logic functions exposed as GraphQL operations
- TypeScript type safety for inputs and outputs
- Database queries within connector functions
- OpenTelemetry tracing integration
- Proper error handling
- Testing patterns

**When to use**:
- You need custom business logic beyond database operations
- You want to integrate third-party APIs
- You need complex calculations or data transformations
- You want to combine data from multiple sources

**How to use**:
See `typescript-connector/HOW_TO_USE.md`

**🔗 Official Docs**:
- [TypeScript Connector Guide](https://hasura.io/docs/3.0/connectors/typescript/)
- [Business Logic Basics](https://hasura.io/docs/3.0/business-logic/typescript/)

---

### 2. REST API Connector (`rest-api-connector/`)

**What it demonstrates**:
- Wrapping REST APIs as GraphQL endpoints
- HTTP connector configuration
- Authentication and header management
- Request/response transformation

**When to use**:
- You need to expose existing REST APIs through GraphQL
- You want to combine REST APIs with your database in a single graph
- You're migrating from REST to GraphQL gradually

**How to use**:
See `rest-api-connector/README.md`

**🔗 Official Docs**:
- [HTTP Connector Guide](https://hasura.io/docs/3.0/how-to-build-with-ddn/with-http/)
- [ndc-http-recipes](https://github.com/hasura/ndc-http-recipes)

---

### 3. Sample Models (`sample-models/`)

**What it demonstrates**:
- Typical `.hml` model files
- Relationships between models
- Permission configurations
- Common field types and validations

**When to use**:
- You're learning the `.hml` format
- You want to see relationship examples
- You need permission pattern references

**How to use**:
See `sample-models/README.md`

**🔗 Official Docs**:
- [Metadata Reference](https://hasura.io/docs/3.0/reference/metadata-reference/)
- [Supergraph Modeling](https://hasura.io/docs/3.0/supergraph-modeling/introduction/)

---

## How to Use These Examples

### Option 1: Copy Individual Examples

```bash
# Copy TypeScript connector to your project
cp -r examples/typescript-connector connectors/my-custom-logic

# Customize for your needs
cd connectors/my-custom-logic
npm install
# Edit src/functions/ to add your business logic

# Reference it in a subgraph
# Create subgraphs/my-logic/connector/my-connector/connector.yaml
```

### Option 2: Reference for Learning

Read through the examples to understand patterns, then implement from scratch in your project.

### Option 3: Use as Starting Point

For new subgraphs or connectors, copy the example and adapt it to your specific use case.

---

## Not Finding What You Need?

### Additional Resources

**Official Examples**:
- [DDN Sample App](https://github.com/hasura/ddn-sample-app)
- [TypeScript Connector Learn Course](https://github.com/hasura/ndc-typescript-learn-course)
- [HTTP Connector Recipes](https://github.com/hasura/ndc-http-recipes)

**Documentation**:
- [Hasura DDN v3 Docs](https://hasura.io/docs/3.0/)
- [Connector Catalog](https://hasura.io/connectors/)
- [DDN CLI Reference](https://hasura.io/docs/3.0/reference/cli/)

**Community**:
- [Hasura Discord](https://discord.com/invite/hasura)
- [Hasura GitHub Discussions](https://github.com/hasura/graphql-engine/discussions)

---

## Contributing

Have a useful pattern or example to share? Consider:
1. Opening an issue to discuss the example
2. Creating a pull request with your example
3. Ensuring it's well-documented and generic
4. Adding it to this README

---

## Example Structure Best Practices

When creating your own examples (or contributing):

1. **Complete and Working**: Example should run without errors
2. **Well-Documented**: Inline comments explaining WHY, not just WHAT
3. **Generic**: Remove project-specific details
4. **Self-Contained**: Include all necessary files
5. **Tested**: Include test cases where applicable
6. **Linked**: Reference official documentation

---

## Questions?

If you're unsure which pattern to use:
- **Simple database operations** → Use database connector (no custom code needed)
- **Complex business logic** → TypeScript connector
- **External REST APIs** → HTTP/REST connector
- **GraphQL federation** → Multiple subgraphs
- **Real-time subscriptions** → Database connector with subscriptions enabled

Still unclear? Check the [Hasura DDN FAQ](https://hasura.io/docs/3.0/help/faq/) or ask in Discord.
