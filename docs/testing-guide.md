# Testing Guide for RagaJSON

## Overview

The RagaJSON testing system ensures comprehensive validation of the project's JSON Schema files. This guarantees that all schemas are correctly written according to the JSON Schema draft-2020-12 specification and meet high quality standards.

## Test Structure

```
ragajson/
├── tests/
│   ├── schema-validation.test.js    # Schema validation tests
│   └── schema-quality.test.js       # Quality and best practices tests
├── scripts/
│   └── validate-schemas.js          # Quick schema validation
└── docs/
    └── testing-guide.md             # This documentation
```

## Commands

### Quick Validation

```bash
npm run validate
```

Runs a quick check of all schemas with visual output:

```
🔍 Validating JSON Schema files...

✅ schema/raga.schema.json
✅ schema/components/system_enum.json
❌ schema/components/broken_enum.json
   Missing required field: title
   root: must have property 'enum'

📊 Results: 12/13 files valid
❌ Some schema files have validation errors
```

### Comprehensive Testing

```bash
npm run test:schemas           # Basic schema validation
npm run test:schema-quality    # Advanced quality checks
```

Runs detailed Jest tests with comprehensive reports.

### All Tests

```bash
npm test
```

Runs all project tests (validation + quality + any other tests).

## Three-Tier Testing Strategy

This project uses three complementary validation approaches, following industry best practices:

### 1. Quick Validation Script (`npm run validate`)

- **Purpose**: Fast feedback during development
- **Output**: Visual, human-readable with emojis and colors
- **When to use**: Daily development, before commits, debugging
- **Audience**: Developers
- **Performance**: Fast execution, immediate results

### 2. Schema Validation Tests (`npm run test:schemas`)

- **Purpose**: Formal JSON Schema compliance testing
- **Validates**: Syntax, meta-schema compliance, $ref links
- **Output**: Structured test reports for basic validation
- **When to use**: CI/CD pipelines, ensuring schema correctness
- **Focus**: Technical correctness

### 3. Schema Quality Tests (`npm run test:schema-quality`)

- **Purpose**: Enforce quality standards and best practices
- **Validates**: Metadata completeness, documentation quality, naming conventions
- **Output**: Detailed quality reports with comprehensive checks
- **When to use**: Code reviews, maintaining high standards
- **Focus**: Developer experience and maintainability

### Why Three Tiers?

This comprehensive approach provides several benefits:

1. **Developer Experience**: Quick script gives instant, visual feedback while coding
2. **Technical Assurance**: Validation tests ensure schemas meet JSON Schema standards
3. **Quality Standards**: Quality tests enforce documentation and maintainability best practices
4. **Automation Integration**: Jest tests integrate seamlessly with CI/CD systems
5. **Gradual Validation**: From quick checks to deep quality analysis
6. **Industry Standard**: Layered testing pattern used by major projects

### Example Workflow

```bash
# During development
npm run validate              # Quick visual check

# Before committing
npm run validate && \
npm run test:schemas && \
git commit

# Code review process
npm run test:schema-quality   # Comprehensive quality checks

# In CI/CD pipeline
npm run validate              # Fast gate check
npm run test                  # All tests including quality
```

## What is Tested

### Basic Validation (`npm run test:schemas`)

#### 1. File Structure

- ✅ Valid JSON syntax
- ✅ Presence of required fields:
  - `$schema` = `"https://json-schema.org/draft/2020-12/schema"`
  - `$id` (unique identifier)
  - `title` (schema name)
  - `description` (schema description)

#### 2. Meta-Validation

- ✅ Compliance with JSON Schema draft-2020-12
- ✅ Correct data types
- ✅ Proper keyword syntax

#### 3. $ref Links

- ✅ All local `$ref` links exist
- ✅ File paths are correct

### Quality Standards (`npm run test:schema-quality`)

#### 📋 Schema Structure Validation

- ✅ Valid object structure
- ✅ Required JSON Schema fields
- ✅ Proper schema format validation

#### 📝 Metadata Requirements

- ✅ All required metadata fields present
- ✅ Examples provided for enum schemas
- ✅ Correct schema version usage
- ✅ Meaningful descriptions
- ✅ Proper capitalization and punctuation

#### 🎯 Structure Consistency

- ✅ Consistent `$id` pattern formatting
- ✅ Enum schemas follow standard structure
- ✅ Type schemas follow standard structure
- ✅ Cross-schema consistency checks

#### 🏷️ displayName and Custom Properties

- ✅ `displayName` present for complex enums

- ✅ Validation of enum display names

#### 🔗 $ref Link Validation

- ✅ All `$ref` links are valid and resolvable
- ✅ Cross-references work within project
- ✅ Local path validation

#### 📚 Documentation Readiness

- ✅ All properties have descriptive documentation
- ✅ Meaningful enum descriptions
- ✅ All enum values properly documented
- ✅ Description quality standards

#### 🎨 Style and Formatting

- ✅ Naming conventions followed (PascalCase titles)
- ✅ Proper JSON formatting and indentation
- ✅ Descriptions end with periods
- ✅ Consistent style across all schemas

## Error Examples and Solutions

### Basic Validation Errors

#### Missing Required Field

**Error:**

```
❌ schema/components/my_enum.json
   Missing required field: title
```

**Solution:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "my_enum.json",
  "title": "MyEnum", // ← add this
  "description": "Description of my enum.",
  "type": "string",
  "enum": ["value1", "value2"]
}
```

#### Incorrect Schema Version

**Error:**

```
Expected $schema to be 'https://json-schema.org/draft/2020-12/schema', got 'http://json-schema.org/draft-07/schema#'
```

**Solution:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema" // ← fix this
  // ...
}
```

### Quality Standard Errors

#### Missing displayName for Complex Enums

**Error:**

```
✕ schema/components/my_enum.json should have displayName for complex enums
```

**Solution:**

```json
{
  "oneOf": [
    {
      "const": "value1",
      "displayName": "Value One" // ← add this
    },
    {
      "const": "value2",
      "displayName": "Value Two" // ← add this
    }
  ]
}
```

#### Description Quality Issues

**Error:**

```
✕ schema/components/my_enum.json should have meaningful enum descriptions
```

**Solution:**

```json
{
  "title": "MyEnum",
  "description": "A comprehensive enumeration of valid values for my specific use case." // ← make it meaningful and end with period
}
```

#### Missing Examples

**Error:**

```
✕ schema/components/my_enum.json should have examples where appropriate
```

**Solution:**

```json
{
  "type": "string",
  "enum": ["value1", "value2"],
  "examples": ["value1", "value2"] // ← add this
}
```

#### Incorrect $id Pattern

**Error:**

```
✕ schema/components/my_enum.json should have consistent $id pattern
```

**Solution:**

```json
{
  "$id": "my_enum.json" // ← use correct pattern (filename only)
}
```

## Configuration

### Jest

Tests use Jest with default configuration. Test files are located in the `tests/` folder.

### AJV

The validator uses AJV with these settings:

- `strict: false` - less strict rules for compatibility
- `allErrors: true` - show all errors, not just the first one
- `validateSchema: false` - disable schema validation

## CI/CD Integration

Add comprehensive schema validation to your CI pipeline:

```yaml
# .github/workflows/test.yml
name: Test Schemas
on: [push, pull_request]
jobs:
  validate-schemas:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm ci
      - run: npm run validate # Quick validation
      - run: npm run test:schemas # Technical validation
      - run: npm run test:schema-quality # Quality standards
```

### Staged Pipeline (Recommended)

For faster feedback, consider a staged approach:

```yaml
jobs:
  quick-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm ci
      - run: npm run validate

  comprehensive-test:
    needs: quick-check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm ci
      - run: npm test # All tests including quality
```

## Adding New Schemas

When creating a new schema, follow these quality standards:

### 1. Basic Structure Requirements

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "your_schema.json",
  "title": "YourSchemaName",
  "description": "Clear, detailed description ending with a period.",
  "type": "string|object|array",
  "examples": ["example1", "example2"]
  // ... your schema
}
```

### 2. Quality Standards Checklist

- ✅ **Title**: PascalCase, descriptive
- ✅ **Description**: Meaningful, ends with period
- ✅ **Examples**: Provided for all enum schemas
- ✅ **displayName**: Added to all oneOf const values
- ✅ **$id**: Uses correct filename pattern (e.g., "my_enum.json")
- ✅ **Properties**: All have meaningful descriptions

### 3. For Enum Schemas

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "my_enum.json",
  "title": "MyEnum",
  "description": "A comprehensive enumeration of valid values for specific use case.",
  "type": "string",
  "oneOf": [
    {
      "const": "value1",
      "displayName": "Display Name One"
    },
    {
      "const": "value2",
      "displayName": "Display Name Two"
    }
  ],
  "examples": ["value1", "value2"]
}
```

### 4. Validation Steps

```bash
# Step 1: Quick check
npm run validate

# Step 2: Technical validation
npm run test:schemas

# Step 3: Quality validation
npm run test:schema-quality

# Step 4: Full test suite
npm test
```

### 5. Common Quality Issues to Avoid

- ❌ Short or meaningless descriptions
- ❌ Missing examples for enums
- ❌ Missing displayName for oneOf const
- ❌ Incorrect $id pattern
- ❌ Descriptions not ending with periods

## Debugging

### For Basic Validation Issues

```bash
npm run test:schemas -- --verbose
```

### For Quality Standard Issues

```bash
npm run test:schema-quality -- --verbose
```

### For Specific Schema Debugging

```bash
# Test only one file
npm run test:schema-quality -- --testNamePattern="schema/components/my_enum.json"

# Show all error details
npm run test:schema-quality -- --verbose --no-coverage
```

### Common Debugging Commands

```bash
# Quick visual check
npm run validate

# Detailed technical validation
npm run test:schemas -- --verbose

# Comprehensive quality analysis
npm run test:schema-quality -- --verbose

# All tests with maximum detail
npm test -- --verbose --detectOpenHandles
```

This will show detailed information about each test, error messages, and quality violations.

## Useful Links

- [JSON Schema Specification draft-2020-12](https://json-schema.org/specification-links.html#draft-2020-12)
- [AJV JSON Schema Validator](https://ajv.js.org/)
- [Jest Testing Framework](https://jestjs.io/)
