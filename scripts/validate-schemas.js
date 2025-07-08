#!/usr/bin/env node

const Ajv = require("ajv")
const addFormats = require("ajv-formats")
const fs = require("fs")
const glob = require("glob")
const path = require("path")

class SchemaValidator {
  constructor() {
    this.ajv = new Ajv({
      strict: false,
      allErrors: true,
      validateSchema: false // disable meta-validation
    })
    addFormats(this.ajv)
  }

  validateFile(filePath) {
    const result = {
      file: filePath,
      valid: true,
      errors: []
    }

    try {
      // Check JSON syntax
      const content = fs.readFileSync(filePath, "utf8")
      const schema = JSON.parse(content)

      // Check required fields
      const requiredFields = ["$schema", "$id", "title", "description"]
      for (const field of requiredFields) {
        if (!schema[field]) {
          result.errors.push(`Missing required field: ${field}`)
          result.valid = false
        }
      }

      // Check schema version
      if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") {
        result.errors.push(
          `Expected $schema to be 'https://json-schema.org/draft/2020-12/schema', got '${schema.$schema}'`
        )
        result.valid = false
      }

      // Check basic JSON Schema structure
      if (!schema.type && !schema.enum && !schema.oneOf && !schema.anyOf && !schema.allOf) {
        result.errors.push(`Schema must have at least one of: type, enum, oneOf, anyOf, allOf`)
        result.valid = false
      }

      // Check $ref links (now relative paths)
      const refs = this.extractRefs(schema)
      for (const ref of refs) {
        if (ref.startsWith("./") || ref.startsWith("../")) {
          // Resolve relative path from the current schema file's directory
          const schemaDir = path.dirname(filePath)
          const resolvedPath = path.resolve(schemaDir, ref)

          if (!fs.existsSync(resolvedPath)) {
            result.errors.push(`$ref link not found: ${ref} (resolved to: ${resolvedPath})`)
            result.valid = false
          }
        }
      }
    } catch (error) {
      result.valid = false
      result.errors.push(`Failed to parse JSON: ${error.message}`)
    }

    return result
  }

  extractRefs(obj, refs = []) {
    if (typeof obj === "object" && obj !== null) {
      if (obj.$ref && typeof obj.$ref === "string") {
        refs.push(obj.$ref)
      }

      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          this.extractRefs(obj[key], refs)
        }
      }
    }

    return refs
  }

  async validateAll() {
    console.log("🔍 Validating JSON Schema files...\n")

    const files = glob.sync("schema/**/*.json")
    const results = []
    let hasErrors = false

    for (const file of files) {
      const result = this.validateFile(file)
      results.push(result)

      if (result.valid) {
        console.log(`✅ ${file}`)
      } else {
        console.log(`❌ ${file}`)
        result.errors.forEach(error => {
          console.log(`   ${error}`)
        })
        hasErrors = true
      }
    }

    console.log(
      `\n📊 Results: ${results.filter(r => r.valid).length}/${results.length} files valid`
    )

    if (hasErrors) {
      console.log("\n❌ Some schema files have validation errors")
      process.exit(1)
    } else {
      console.log("\n✅ All schema files are valid!")
      process.exit(0)
    }
  }
}

// Run validation
const validator = new SchemaValidator()
validator.validateAll().catch(error => {
  console.error("❌ Validation failed:", error.message)
  process.exit(1)
})
