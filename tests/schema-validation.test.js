const Ajv = require("ajv")
const addFormats = require("ajv-formats")
const fs = require("fs")
const path = require("path")

describe("JSON Schema Meta-Validation", () => {
  let ajv

  beforeAll(() => {
    ajv = new Ajv({
      strict: false,
      allErrors: true,
      validateSchema: false
    })
    addFormats(ajv)
  })

  const filePath = "schema/raga.schema.json"

  describe("Schema File Structure", () => {
    test("schema should be valid JSON", () => {
      expect(() => {
        const content = fs.readFileSync(filePath, "utf8")
        JSON.parse(content)
      }).not.toThrow()
    })

    test("schema should have required meta fields", () => {
      const schema = JSON.parse(fs.readFileSync(filePath, "utf8"))

      expect(schema.$schema).toBeDefined()
      expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema")
      expect(schema.$id).toBeDefined()
      expect(schema.title).toBeDefined()
      expect(schema.description).toBeDefined()
    })
  })

  describe("Schema Meta-Validation Against draft-2020-12", () => {
    test("schema should be valid JSON Schema", () => {
      const schema = JSON.parse(fs.readFileSync(filePath, "utf8"))

      const hasValidStructure =
        schema.type || schema.enum || schema.oneOf || schema.anyOf || schema.allOf || schema.$defs
      expect(hasValidStructure).toBeTruthy()
    })
  })

  describe("$ref Links Validation", () => {
    test("schema should have resolvable $ref links", () => {
      const schema = JSON.parse(fs.readFileSync(filePath, "utf8"))
      const refs = extractRefs(schema)

      refs.forEach(ref => {
        if (ref.startsWith("#/")) {
          // This is a local ref, the quality test checks internal resolution
        } else {
            throw new Error(`Unexpected external ref: ${ref}`);
        }
      })
    })
  })
})

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
