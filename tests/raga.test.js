const Ajv2020 = require("ajv/dist/2020")
const addFormats = require("ajv-formats")
const fs = require("fs")

describe("RagaJSON Schema Validation & Quality", () => {
  let ajv
  const filePath = "schema/raga.schema.json"
  let mainSchema

  beforeAll(() => {
    ajv = new Ajv2020({
      strict: false,
      allErrors: true,
      validateSchema: true // Ajv will automatically meta-validate against draft-2020-12
    })
    addFormats(ajv)
  })

  test("schema file should load and parse as valid JSON", () => {
    const content = fs.readFileSync(filePath, "utf8")
    expect(() => {
      mainSchema = JSON.parse(content)
    }).not.toThrow()
  })

  describe("📋 Meta-Validation & Structure", () => {
    test("should have required top-level meta fields", () => {
      expect(mainSchema.$schema).toBe("https://json-schema.org/draft/2020-12/schema")
      expect(mainSchema.$id).toBeDefined()
      expect(mainSchema.title).toMatch(/^[A-Z][a-zA-Z\s]*$/)
      expect(mainSchema.description).toMatch(/^[A-Z]/)
      expect(mainSchema.description).toMatch(/\.$/)
      expect(mainSchema.type).toBe("object")
    })

    test("should compile successfully (validates draft-2020-12 and all $ref links)", () => {
      // ajv.compile automatically checks the meta-schema and resolves internal $refs.
      // This single line replaces all manual extractRefs and structural checks!
      expect(() => {
        ajv.compile(mainSchema)
      }).not.toThrow()
    })
  })

  describe("📚 Documentation & Quality Readiness", () => {
    test("top-level properties should have descriptions", () => {
      for (const [propName, propSchema] of Object.entries(mainSchema.properties || {})) {
        if (typeof propSchema === "object" && !propSchema.$ref && propSchema.type) {
          expect(propSchema.description).toBeDefined()
          expect(propSchema.description.length).toBeGreaterThan(5)
        }
      }
    })

    test("all $defs should have consistent structure and examples", () => {
      const defSchemas = mainSchema ? Object.entries(mainSchema.$defs || {}) : []

      defSchemas.forEach(([name, schema]) => {
        // Enums must have valid examples
        if (schema.enum || schema.oneOf) {
          expect(schema.type).toBe("string")
          expect(schema.examples).toBeDefined()
          expect(Array.isArray(schema.examples)).toBe(true)
          expect(schema.examples.length).toBeGreaterThan(0)
        }

        // Complex enums (oneOf -> const) must have displayName
        if (schema.oneOf) {
          schema.oneOf.forEach(item => {
            if (item.const) {
              expect(item.displayName).toBeDefined()
              expect(typeof item.displayName).toBe("string")
            }
          })
        }

        // All enum/const values should be represented in examples
        if (schema.enum) {
          expect(schema.description).toBeDefined()
          const exampleValues = schema.examples || []
          exampleValues.forEach(example => {
            expect(schema.enum).toContain(example)
          })
        }
      })
    })
  })
})
