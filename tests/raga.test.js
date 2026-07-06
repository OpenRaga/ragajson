const { describe, test, before } = require("node:test");
const assert = require("node:assert");
const Ajv2020 = require("ajv/dist/2020");
const addFormats = require("ajv-formats");
const fs = require("fs");

describe("RagaJSON Schema Validation & Quality", () => {
  let ajv;
  const filePath = "schema/raga.schema.json";
  let mainSchema;

  before(() => {
    ajv = new Ajv2020({
      strict: false,
      allErrors: true,
      validateSchema: true // Ajv will automatically meta-validate against draft-2020-12
    });
    addFormats(ajv);
  });

  test("schema file should load and parse as valid JSON", () => {
    const content = fs.readFileSync(filePath, "utf8");
    assert.doesNotThrow(() => {
      mainSchema = JSON.parse(content);
    });
  });

  describe("📋 Meta-Validation & Structure", () => {
    test("should have required top-level meta fields", () => {
      assert.strictEqual(mainSchema.$schema, "https://json-schema.org/draft/2020-12/schema");
      assert.ok(mainSchema.$id !== undefined, "$id should be defined");
      assert.match(mainSchema.title, /^[A-Z][a-zA-Z\s]*$/);
      assert.match(mainSchema.description, /^[A-Z]/);
      assert.match(mainSchema.description, /\.$/);
      assert.strictEqual(mainSchema.type, "object");
    });

    test("should compile successfully (validates draft-2020-12 and all $ref links)", () => {
      // ajv.compile automatically checks the meta-schema and resolves internal $refs.
      assert.doesNotThrow(() => {
        ajv.compile(mainSchema);
      });
    });
  });

  describe("📚 Documentation & Quality Readiness", () => {
    test("top-level properties should have descriptions", () => {
      for (const [propName, propSchema] of Object.entries(mainSchema.properties || {})) {
        if (typeof propSchema === "object" && !propSchema.$ref && propSchema.type) {
          assert.ok(propSchema.description !== undefined, `Property ${propName} missing description`);
          assert.ok(propSchema.description.length > 5, `Property ${propName} description too short`);
        }
      }
    });

    test("all $defs should have consistent structure and examples", () => {
      const defSchemas = mainSchema ? Object.entries(mainSchema.$defs || {}) : [];

      defSchemas.forEach(([name, schema]) => {
        // Enums must have valid examples
        if (schema.enum || schema.oneOf) {
          assert.strictEqual(schema.type, "string");
          assert.ok(schema.examples !== undefined, `$def ${name} missing examples`);
          assert.ok(Array.isArray(schema.examples), `$def ${name} examples should be an array`);
          assert.ok(schema.examples.length > 0, `$def ${name} examples array empty`);
        }

        // Complex enums (oneOf -> const) must have displayName
        if (schema.oneOf) {
          schema.oneOf.forEach(item => {
            if (item.const) {
              assert.ok(item.displayName !== undefined, `$def ${name} missing displayName in oneOf`);
              assert.strictEqual(typeof item.displayName, "string");
            }
          });
        }

        // All enum/const values should be represented in examples
        if (schema.enum) {
          assert.ok(schema.description !== undefined, `$def ${name} missing description`);
          const exampleValues = schema.examples || [];
          exampleValues.forEach(example => {
            assert.ok(schema.enum.includes(example), `$def ${name} has example not in enum`);
          });
        }
      });
    });
  });
});
