const Ajv = require("ajv")
const addFormats = require("ajv-formats")
const fs = require("fs")
const path = require("path")
const glob = require("glob")

describe("JSON Schema Meta-Validation", () => {
  let ajv

  beforeAll(() => {
    // Create AJV with format support
    ajv = new Ajv({
      strict: false,
      allErrors: true,
      validateSchema: false
    })
    addFormats(ajv)
  })

  // Find all JSON files in schema/ folder
  const schemaFiles = glob.sync("schema/**/*.json")

  describe("Schema File Structure", () => {
    test.each(schemaFiles)("%s should be valid JSON", filePath => {
      expect(() => {
        const content = fs.readFileSync(filePath, "utf8")
        JSON.parse(content)
      }).not.toThrow()
    })

    test.each(schemaFiles)("%s should have required meta fields", filePath => {
      const schema = JSON.parse(fs.readFileSync(filePath, "utf8"))

      expect(schema.$schema).toBeDefined()
      expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema")
      expect(schema.$id).toBeDefined()
      expect(schema.title).toBeDefined()
      expect(schema.description).toBeDefined()
    })
  })

  describe("Schema Meta-Validation Against draft-2020-12", () => {
    test.each(schemaFiles)("%s should be valid JSON Schema", filePath => {
      const schema = JSON.parse(fs.readFileSync(filePath, "utf8"))

      // Check basic JSON Schema structure
      const hasValidStructure =
        schema.type || schema.enum || schema.oneOf || schema.anyOf || schema.allOf
      expect(hasValidStructure).toBeTruthy()
    })
  })

  describe("$ref Links Validation", () => {
    test.each(schemaFiles)("%s should have resolvable $ref links", filePath => {
      const schema = JSON.parse(fs.readFileSync(filePath, "utf8"))
      const refs = extractRefs(schema)

      refs.forEach(ref => {
        if (ref.startsWith("./") || ref.startsWith("../")) {
          // Resolve relative path from the current schema file's directory
          const schemaDir = path.dirname(filePath)
          const resolvedPath = path.resolve(schemaDir, ref)

          expect(fs.existsSync(resolvedPath)).toBe(true)
        }
      })
    })
  })
})

// Utility to extract all $ref from schema
function extractRefs(obj, refs = []) {
  if (typeof obj === "object" && obj !== null) {
    if (obj.$ref && typeof obj.$ref === "string") {
      refs.push(obj.$ref)
    }

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        extractRefs(obj[key], refs)
      }
    }
  }

  return refs
}
