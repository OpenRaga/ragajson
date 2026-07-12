const { describe, test, before } = require("node:test");
const assert = require("node:assert");
const Ajv2020 = require("ajv/dist/2020");
const fs = require("fs");

const schemaFiles = fs
  .readdirSync("schema")
  .filter(file => file.endsWith(".schema.json"))
  .map(file => `schema/${file}`);

describe("Schema discovery", () => {
  test("schema/ contains at least one schema file", () => {
    assert.ok(schemaFiles.length > 0, "schema/ should not be empty");
  });
});

for (const filePath of schemaFiles) {
  describe(`${filePath} — Validation & Quality`, () => {
    let ajv;
    let mainSchema;

    before(() => {
      ajv = new Ajv2020({
        strict: false,
        allErrors: true,
        validateSchema: true // Ajv will automatically meta-validate against draft-2020-12
      });
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
}

describe("🎵 Raga Instance Validation", () => {
  let validate;

  before(() => {
    const schema = JSON.parse(fs.readFileSync("schema/raga.schema.json", "utf8"));
    const instanceAjv = new Ajv2020({ strict: false, allErrors: true });
    validate = instanceAjv.compile(schema);
  });

  test("accepts a document with octave tokens and pakad phrases", () => {
    const bhupali = {
      name: "Bhupali",
      system: "Hindustani",
      thaat: "Kalyan",
      structure: {
        aroha: ["SA", "RE", "GA", "PA", "DHA", "SA_TAR"],
        avaroha: ["SA_TAR", "DHA", "PA", "GA", "RE", "SA"],
        vadi: "GA",
        samvadi: "DHA",
        pakad: [
          ["GA", "RE", "SA", "DHA_MANDRA"],
          ["SA", "RE", "GA"]
        ]
      },
      performance: {
        time_of_day: ["Pradosh"],
        rasa: ["Shanta", "Bhakti"]
      }
    };
    assert.strictEqual(validate(bhupali), true, JSON.stringify(validate.errors));
  });

  test("rejects octave tokens in vadi (pitch class only)", () => {
    const doc = {
      name: "X",
      system: "Hindustani",
      structure: { vadi: "SA_TAR" }
    };
    assert.strictEqual(validate(doc), false);
  });

  test("rejects transliteration variants outside the convention (SA_TAAR)", () => {
    const doc = {
      name: "X",
      system: "Hindustani",
      structure: { aroha: ["SA", "SA_TAAR"] }
    };
    assert.strictEqual(validate(doc), false);
  });

  test("rejects pakad as a plain string", () => {
    const doc = {
      name: "X",
      system: "Hindustani",
      structure: { pakad: "GA RE SA" }
    };
    assert.strictEqual(validate(doc), false);
  });

  test("rejects empty phrases in pakad", () => {
    const doc = {
      name: "X",
      system: "Hindustani",
      structure: { pakad: [[]] }
    };
    assert.strictEqual(validate(doc), false);
  });

  test("rejects an empty aliases array", () => {
    const doc = {
      name: "X",
      system: "Hindustani",
      aliases: []
    };
    assert.strictEqual(validate(doc), false);
  });

  test("rejects non-Devanagari name_devanagari", () => {
    const doc = {
      name: "X",
      system: "Hindustani",
      name_devanagari: "Bhupali"
    };
    assert.strictEqual(validate(doc), false);
  });

  test("accepts every document in examples/", () => {
    const files = fs.readdirSync("examples").filter(file => file.endsWith(".json"));
    assert.ok(files.length > 0, "examples/ should contain at least one document");
    files.forEach(file => {
      const doc = JSON.parse(fs.readFileSync(`examples/${file}`, "utf8"));
      assert.strictEqual(validate(doc), true, `${file}: ${JSON.stringify(validate.errors)}`);
    });
  });
});

describe("🥁 Tala Instance Validation", () => {
  let validate;

  before(() => {
    const schema = JSON.parse(fs.readFileSync("schema/tala.schema.json", "utf8"));
    const instanceAjv = new Ajv2020({ strict: false, allErrors: true });
    validate = instanceAjv.compile(schema);
  });

  const tintal = {
    name: "Tintal",
    name_devanagari: "तीनताल",
    aliases: ["Teental", "Trital"],
    system: "Hindustani",
    vibhags: [4, 4, 4, 4],
    clap_pattern: ["TALI", "TALI", "KHALI", "TALI"],
    theka: [
      "DHA", "DHIN", "DHIN", "DHA",
      "DHA", "DHIN", "DHIN", "DHA",
      "DHA", "TIN", "TIN", "TA",
      "TA", "DHIN", "DHIN", "DHA"
    ],
    description: "The universal sixteen-beat cycle of Hindustani music."
  };

  test("accepts a canonical Tintal document", () => {
    assert.strictEqual(validate(tintal), true, JSON.stringify(validate.errors));
  });

  test("accepts khali on sam (Rupak)", () => {
    const rupak = {
      name: "Rupak",
      system: "Hindustani",
      vibhags: [3, 2, 2],
      clap_pattern: ["KHALI", "TALI", "TALI"],
      theka: ["TIN", "TIN", "NA", "DHIN", "NA", "DHIN", "NA"]
    };
    assert.strictEqual(validate(rupak), true, JSON.stringify(validate.errors));
  });

  test("rejects unknown bols (transliteration guard)", () => {
    const doc = { ...tintal, theka: ["DHAA", ...tintal.theka.slice(1)] };
    assert.strictEqual(validate(doc), false);
  });

  test("rejects invalid clap values", () => {
    const doc = { ...tintal, clap_pattern: ["CLAP", "TALI", "KHALI", "TALI"] };
    assert.strictEqual(validate(doc), false);
  });

  test("rejects a document without vibhags", () => {
    const { vibhags, ...rest } = tintal;
    assert.strictEqual(validate(rest), false);
  });
});
