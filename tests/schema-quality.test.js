const Ajv = require("ajv")
const addFormats = require("ajv-formats")
const fs = require("fs")
const path = require("path")

// Generalized utility function for traversing objects with circular reference protection
function traverse(obj, callback, options = {}) {
  const { visited = new WeakSet(), currentPath = "", skipKeys = [] } = options

  if (typeof obj !== "object" || obj === null) return

  // Prevent infinite recursion
  if (visited.has(obj)) return
  visited.add(obj)

  // Apply callback to current object
  callback(obj, currentPath)

  // Recursively traverse nested objects
  Object.keys(obj).forEach(key => {
    if (skipKeys.includes(key)) return // Skip specified keys
    if (typeof obj[key] === "object") {
      const newPath = currentPath ? `${currentPath}.${key}` : key
      traverse(obj[key], callback, { visited, currentPath: newPath, skipKeys })
    }
  })
}

describe("JSON Schema Quality Check", () => {
  let ajv
  const filePath = "schema/raga.schema.json"
  let mainSchema

  try {
    mainSchema = JSON.parse(fs.readFileSync(filePath, "utf8"))
  } catch (error) {
    mainSchema = null
  }

  // Extract all definitions for localized testing
  const defSchemas = mainSchema && mainSchema.$defs 
    ? Object.entries(mainSchema.$defs).map(([name, schema]) => ({ name, schema })) 
    : []

  beforeAll(() => {
    ajv = new Ajv({
      strict: false,
      allErrors: true,
      validateSchema: false
    })
    addFormats(ajv)
  })

  describe("📋 Schema Structure Validation", () => {
    test("validate main schema structure", () => {
      expect(typeof mainSchema).toBe("object")
      expect(mainSchema).not.toBeNull()
      expect(Array.isArray(mainSchema)).toBe(false)

      const requiredFields = ["$schema", "$id", "type", "title", "description"]
      requiredFields.forEach(field => {
        expect(mainSchema).toHaveProperty(field)
      })

      expect(mainSchema.$schema).toBe("https://json-schema.org/draft/2020-12/schema")
    })
  })

  describe("📝 Metadata Requirements", () => {
    test("main schema should have all required metadata fields", () => {
      expect(mainSchema.title).toMatch(/^[A-Z][a-zA-Z\s]*$/)
      expect(mainSchema.description.length).toBeGreaterThan(10)
      expect(mainSchema.description).toMatch(/^[A-Z]/)
      expect(mainSchema.description).toMatch(/\.$/)
    })

    test.each(defSchemas)(
      "def %s should have examples where appropriate",
      ({ name, schema }) => {
        if (schema.enum || schema.oneOf) {
          expect(schema.examples).toBeDefined()
          expect(Array.isArray(schema.examples)).toBe(true)
          expect(schema.examples.length).toBeGreaterThan(0)
        }
      }
    )
  })

  describe("🎯 Structure Consistency", () => {
    test.each(defSchemas)("def %s should have consistent enum structure", ({ name, schema }) => {
      expect(schema.enum || schema.oneOf).toBeDefined()
      expect(schema.type).toBe("string")
    })
  })

  describe("🏷️ displayName and Custom Properties", () => {
    test.each(defSchemas)(
      "def %s should have displayName for complex enums",
      ({ name, schema }) => {
        if (schema.oneOf && Array.isArray(schema.oneOf)) {
          schema.oneOf.forEach(item => {
            if (item.const) {
              expect(item.displayName).toBeDefined()
              expect(typeof item.displayName).toBe("string")
              expect(item.displayName.length).toBeGreaterThan(0)
            }
          })
        }
      }
    )
  })

  describe("🔗 $ref Link Validation", () => {
    test("main schema should have valid local $ref links", () => {
      const refs = extractRefs(mainSchema)

      refs.forEach(ref => {
        if (ref.startsWith("#/")) {
          const pointer = ref.substring(2)
          const parts = pointer.split("/")

          let current = mainSchema
          for (const part of parts) {
            expect(current).toHaveProperty(part)
            current = current[part]
          }
        } else {
          // No external refs should exist
          throw new Error(`External ref not expected: ${ref}`)
        }
      })
    })
  })

  describe("📚 Documentation Readiness", () => {
    test("main schema should have descriptive properties", () => {
      function handleDescriptions(obj, path = "") {
        if (obj.properties) {
          for (const [propName, propSchema] of Object.entries(obj.properties)) {
            if (typeof propSchema === "object") {
              if (propSchema.$ref && !propSchema.description) continue
              
              // Description should be defined for structural properties
              if (propSchema.type) {
                 expect(propSchema.description).toBeDefined()
                 expect(propSchema.description.length).toBeGreaterThan(5)
              }
            }
          }
        }
      }

      const skipKeys = ["if", "then", "else", "allOf", "anyOf", "oneOf", "not", "examples", "enum", "const"]
      traverse(mainSchema, handleDescriptions, { skipKeys })
    })

    test.each(defSchemas)(
      "def %s should have meaningful enum descriptions",
      ({ name, schema }) => {
        if (schema.enum) {
          expect(schema.description).toBeDefined()
          expect(schema.description.length).toBeGreaterThan(20)
        }

        if (schema.oneOf) {
          schema.oneOf.forEach((item) => {
            if (item.const) {
              expect(item.displayName).toBeDefined()
            }
          })
        }
      }
    )

    test("all enum values should be properly documented", () => {
      defSchemas.forEach(({ name, schema }) => {
        if (schema.enum) {
          const enumValues = schema.enum
          const exampleValues = schema.examples || []

          expect(exampleValues.length).toBeGreaterThan(0)

          exampleValues.forEach(example => {
            expect(enumValues).toContain(example)
          })
        }
      })
    })
  })

  describe("🎨 Style and Formatting", () => {
    test("main schema should follow naming conventions", () => {
      expect(mainSchema.title).toMatch(/^[A-Z][a-zA-Z\s]*$/)
      expect(mainSchema.description).toMatch(/^[A-Z]/)
      expect(mainSchema.description).toMatch(/\.$/)
    })

    test("schema file should have proper JSON formatting", () => {
      const content = fs.readFileSync(filePath, "utf8")
      expect(() => JSON.parse(content)).not.toThrow()
      expect(content).not.toMatch(/,\s*[}\]]/)
    })
  })
})

function extractRefs(obj, refs = new Set()) {
  if (typeof obj === "object" && obj !== null) {
    if (obj.$ref && typeof obj.$ref === "string") {
      refs.add(obj.$ref)
    }

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        extractRefs(obj[key], refs)
      }
    }
  }

  return Array.from(refs)
}
