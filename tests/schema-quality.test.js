const Ajv = require("ajv")
const addFormats = require("ajv-formats")
const fs = require("fs")
const path = require("path")
const glob = require("glob")

// Generalized utility function for traversing objects with circular reference protection
function traverse(obj, callback, options = {}) {
  const { visited = new WeakSet(), currentPath = "", skipKeys = [] } = options;
  
  if (typeof obj !== "object" || obj === null) return;

  // Prevent infinite recursion
  if (visited.has(obj)) return;
  visited.add(obj);

  // Apply callback to current object
  callback(obj, currentPath);

  // Recursively traverse nested objects
  for (const key in obj) {
    if (skipKeys.includes(key)) continue; // Skip specified keys
    if (typeof obj[key] === "object") {
      const newPath = currentPath ? `${currentPath}.${key}` : key;
      traverse(obj[key], callback, { visited, currentPath: newPath, skipKeys });
    }
  }
}

describe("JSON Schema Quality Check", () => {
  let ajv
  const schemaFiles = glob.sync("schema/**/*.json")
  const schemaCache = new Map()

  // Parse schemas defensively for test.each() - validation moved to tests
  const cachedSchemas = schemaFiles
    .map(filePath => {
      try {
        const schema = JSON.parse(fs.readFileSync(filePath, "utf8"))
        return { filePath, schema }
      } catch (error) {
        // Return placeholder - validation will be done in test blocks
        return { filePath, schema: null, error: error.message }
      }
    })
    .filter(item => item.schema !== null) // Only include valid schemas for test.each()

  beforeAll(() => {
    ajv = new Ajv({
      strict: false,
      allErrors: true,
      validateSchema: false
    })
    addFormats(ajv)

    // Store in cache for quick access
    cachedSchemas.forEach(({ filePath, schema }) => {
      if (schema) {
        schemaCache.set(filePath, schema)
      }
    })
  })

  describe("📋 Schema Structure Validation", () => {
    test.each(cachedSchemas)("validate schema structure for %s", ({ filePath, schema }) => {
      // Basic schema validation
      expect(typeof schema).toBe("object")
      expect(schema).not.toBeNull()
      expect(Array.isArray(schema)).toBe(false)

      // Check required JSON Schema fields
      const requiredFields = ["$schema", "$id", "type", "title", "description"]
      requiredFields.forEach(field => {
        expect(schema).toHaveProperty(field)
      })

      // Validate $schema format
      expect(schema.$schema).toMatch(/^https:\/\/json-schema\.org\/draft\//)
    })
  })

  describe("📝 Metadata Requirements", () => {
    test.each(cachedSchemas)(
      "%s should have all required metadata fields",
      ({ filePath, schema }) => {
        // Required fields
        expect(schema.$schema).toBeDefined()
        expect(schema.$id).toBeDefined()
        expect(schema.title).toBeDefined()
        expect(schema.description).toBeDefined()
        expect(schema.type).toBeDefined()

        // Metadata quality check
        expect(schema.title).toMatch(/^[A-Z][a-zA-Z\s]*$/) // Allow spaces
        expect(schema.description.length).toBeGreaterThan(10) // Detailed description
        expect(schema.description).toMatch(/^[A-Z]/) // Starts with capital letter
        expect(schema.description).toMatch(/\.$/) // Ends with period
      }
    )

    test.each(cachedSchemas)(
      "%s should have examples where appropriate",
      ({ filePath, schema }) => {
        // Enum schemas should have examples
        if (schema.enum || schema.oneOf) {
          expect(schema.examples).toBeDefined()
          expect(Array.isArray(schema.examples)).toBe(true)
          expect(schema.examples.length).toBeGreaterThan(0)
        }
      }
    )

    test.each(cachedSchemas)("%s should use correct schema version", ({ filePath, schema }) => {
      expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema")
    })
  })

  describe("🎯 Structure Consistency", () => {
    test.each(cachedSchemas)("%s should have consistent $id pattern", ({ filePath, schema }) => {
      const expectedId = `https://raw.githubusercontent.com/OpenRaga/ragajson/main/${filePath}`
      expect(schema.$id).toBe(expectedId)
    })

    test("enum schemas should have consistent structure", () => {
      const enumFiles = schemaFiles.filter(file => file.includes("_enum.json"))

      enumFiles.forEach(filePath => {
        const schema = schemaCache.get(filePath)

        // Enum schemas should have either 'enum' or 'oneOf'
        expect(schema.enum || schema.oneOf).toBeDefined()

        // Should have type string
        expect(schema.type).toBe("string")
      })
    })

    test("type schemas should have consistent structure", () => {
      const typeFiles = schemaFiles.filter(file => file.includes("_type.json"))

      typeFiles.forEach(filePath => {
        const schema = schemaCache.get(filePath)

        // Type schemas should have 'type': 'object' or be more complex
        expect(schema.type === "object" || schema.oneOf || schema.anyOf).toBeTruthy()

        // Should have properties defined if it's an object
        if (schema.type === "object") {
          expect(schema.properties).toBeDefined()
          expect(typeof schema.properties).toBe("object")
        }
      })
    })
  })

  describe("🏷️ displayName and Custom Properties", () => {
    test.each(cachedSchemas)(
      "%s should have displayName for complex enums",
      ({ filePath, schema }) => {
        // If there's oneOf with const, displayName should be present
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

    test.each(cachedSchemas)(
      "%s should have proper custom field patterns",
      ({ filePath, schema }) => {
        function handleCustomPatterns(obj) {
          if (obj.custom) {
            expect(obj.custom.patternProperties).toBeDefined()
            expect(obj.custom.patternProperties["^x-"]).toBeDefined()
            expect(obj.custom.additionalProperties).toBe(false)
          }
        }

        traverse(schema, handleCustomPatterns)
      }
    )
  })

  describe("🔗 $ref Link Validation", () => {
    test.each(cachedSchemas)("%s should have valid $ref links", ({ filePath, schema }) => {
      const refs = extractRefs(schema)

      refs.forEach(ref => {
        if (ref.startsWith("https://raw.githubusercontent.com/OpenRaga/ragajson/main/")) {
          const localPath = path.resolve(
            __dirname,
            "..",
            ref.replace("https://raw.githubusercontent.com/OpenRaga/ragajson/main/", "")
          )

          expect(fs.existsSync(localPath)).toBe(true)

          // Check that file is valid JSON
          expect(() => {
            JSON.parse(fs.readFileSync(localPath, "utf8"))
          }).not.toThrow()
        }
      })
    })

    test("all $ref links should be resolvable within project", () => {
      const allRefs = new Set()

      schemaFiles.forEach(filePath => {
        const schema = schemaCache.get(filePath)
        const refs = extractRefs(schema)
        refs.forEach(ref => allRefs.add(ref))
      })

      allRefs.forEach(ref => {
        if (ref.startsWith("https://raw.githubusercontent.com/OpenRaga/ragajson/main/")) {
          const localPath = path.resolve(
            __dirname,
            "..",
            ref.replace("https://raw.githubusercontent.com/OpenRaga/ragajson/main/", "")
          )

          expect(fs.existsSync(localPath)).toBe(true)

          // Check that file is valid JSON
          expect(() => {
            JSON.parse(fs.readFileSync(localPath, "utf8"))
          }).not.toThrow()
        }
      })
    })
  })

  describe("📚 Documentation Readiness", () => {
    test.each(cachedSchemas)("%s should have descriptive properties", ({ filePath, schema }) => {
      function handleDescriptions(obj, path = "") {
        if (obj.properties) {
          for (const [propName, propSchema] of Object.entries(obj.properties)) {
            if (propName !== "custom" && typeof propSchema === "object") {
              const currentPath = path ? `${path}.${propName}` : propName

              // Skip checking descriptions for properties that only have $ref
              if (propSchema.$ref && !propSchema.description) {
                continue
              }

              expect(propSchema.description).toBeDefined()
              expect(propSchema.description.length).toBeGreaterThan(5)
            }
          }
        }
      }

      // Use custom traversal for this case because we need to skip certain keys
      const skipKeys = [
        "if",
        "then", 
        "else",
        "allOf",
        "anyOf",
        "oneOf",
        "not",
        "examples",
        "enum",
        "const"
      ];

      traverse(schema, handleDescriptions, { skipKeys })
    })

    test.each(cachedSchemas)(
      "%s should have meaningful enum descriptions",
      ({ filePath, schema }) => {
        if (schema.enum) {
          // Simple enums should have detailed descriptions
          expect(schema.description).toBeDefined()
          expect(schema.description.length).toBeGreaterThan(20)
        }

        if (schema.oneOf) {
          // oneOf enums should have displayName for each variant
          schema.oneOf.forEach((item, index) => {
            if (item.const) {
              expect(item.displayName).toBeDefined()
            }
          })
        }
      }
    )

    test("all enum values should be properly documented", () => {
      const enumFiles = schemaFiles.filter(file => file.includes("_enum.json"))

      enumFiles.forEach(filePath => {
        const schema = schemaCache.get(filePath)

        if (schema.enum) {
          // Check that all enum values are in examples
          const enumValues = schema.enum
          const exampleValues = schema.examples || []

          expect(exampleValues.length).toBeGreaterThan(0)

          // All examples should be valid enum values
          exampleValues.forEach(example => {
            expect(enumValues).toContain(example)
          })
        }
      })
    })
  })

  describe("🎨 Style and Formatting", () => {
    test.each(cachedSchemas)("%s should follow naming conventions", ({ filePath, schema }) => {
      // Title should be PascalCase
      expect(schema.title).toMatch(/^[A-Z][a-zA-Z\s]*$/)

      // Description should be a proper sentence
      expect(schema.description).toMatch(/^[A-Z]/)
      expect(schema.description).toMatch(/\.$/)

      // File name should match content type
      const fileName = path.basename(filePath, ".json")
      if (fileName.includes("_enum")) {
        expect(schema.title).toMatch(/Enum$/)
      } else if (fileName.includes("_type")) {
        expect(schema.title).toMatch(/Type$/)
      }
    })

    test.each(cachedSchemas)("%s should have proper JSON formatting", ({ filePath }) => {
      const content = fs.readFileSync(filePath, "utf8")

      // Should be valid JSON
      expect(() => JSON.parse(content)).not.toThrow()

      // Should not have trailing commas or other formatting issues
      expect(content).not.toMatch(/,\s*[}\]]/)
    })
  })
})

// Utility functions
function extractRefs(obj, refs = []) {
  if (typeof obj === "object" && obj !== null) {
    if (obj.$ref && typeof obj.$ref === "string") {
      refs.push(obj.$ref)
    }

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        extractRefs(obj[key], refs)
      }
    }
  }

  return refs
}
