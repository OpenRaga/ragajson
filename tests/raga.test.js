const { describe, test, before } = require("node:test");
const assert = require("node:assert");
const Ajv2020 = require("ajv/dist/2020");
const fs = require("fs");
const path = require("path");

function loadCollection(dir) {
  return fs
    .readdirSync(dir)
    .filter(file => file.endsWith(".json"))
    .map(file => ({
      file,
      doc: JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"))
    }));
}

function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, "-");
}

// Canonical names + aliases (lowercased) of every document in a collection.
function knownNames(documents) {
  const known = new Set();
  documents.forEach(({ doc }) => {
    known.add(doc.name.toLowerCase());
    (doc.aliases || []).forEach(alias => known.add(alias.toLowerCase()));
  });
  return known;
}

function checkSlugFilenames(documents) {
  documents.forEach(({ file, doc }) => {
    const slug = slugify(doc.name);
    assert.strictEqual(file, `${slug}.json`, `${file} should be named ${slug}.json`);
  });
}

function checkUniqueNames(documents) {
  const seen = new Map();
  documents.forEach(({ file, doc }) => {
    [doc.name, ...(doc.aliases || [])].forEach(name => {
      const key = name.toLowerCase();
      assert.ok(!seen.has(key), `"${name}" in ${file} is already used in ${seen.get(key)}`);
      seen.set(key, file);
    });
  });
}

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

  test("accepts every raga document in examples/ragas", () => {
    const documents = loadCollection("examples/ragas");
    assert.ok(documents.length > 0, "examples/ragas should not be empty");
    documents.forEach(({ file, doc }) => {
      assert.strictEqual(validate(doc), true, `${file}: ${JSON.stringify(validate.errors)}`);
    });
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

  test("example raga filenames match slugified names", () => {
    checkSlugFilenames(loadCollection("examples/ragas"));
  });

  test("example raga names and aliases are unique", () => {
    checkUniqueNames(loadCollection("examples/ragas"));
  });

  test("similar_ragas targets are known (warns on missing)", () => {
    const ragas = loadCollection("examples/ragas");
    const known = knownNames(ragas);
    ragas.forEach(({ file, doc }) => {
      (doc.similar_ragas || []).forEach(ref => {
        if (!known.has(ref.toLowerCase())) {
          console.warn(`WARN ${file}: similar_ragas target "${ref}" is not among the examples yet`);
        }
      });
    });
  });
});

describe("📼 Recording Instance Validation", () => {
  let validate;

  before(() => {
    const schema = JSON.parse(fs.readFileSync("schema/recording.schema.json", "utf8"));
    const instanceAjv = new Ajv2020({ strict: false, allErrors: true });
    validate = instanceAjv.compile(schema);
  });

  const darbarYaman = {
    source: "https://www.youtube.com/watch?v=ed4SIvGjqNI",
    artist: "Ustad Shahid Parvez",
    notes: "Tabla: Ojas Adhiya. Darbar Festival excerpt.",
    segments: [
      {
        raga: "Yaman",
        talas: ["Tintal"],
        form: "INSTRUMENTAL",
        instrument: "SITAR"
      }
    ]
  };

  test("accepts every recording document in examples/recordings", () => {
    const documents = loadCollection("examples/recordings");
    assert.ok(documents.length > 0, "examples/recordings should not be empty");
    documents.forEach(({ file, doc }) => {
      assert.strictEqual(validate(doc), true, `${file}: ${JSON.stringify(validate.errors)}`);
    });
  });

  test("recording filenames match the video id in source", () => {
    loadCollection("examples/recordings").forEach(({ file, doc }) => {
      const id = doc.source.match(/v=([A-Za-z0-9_-]{11})$/)?.[1];
      assert.strictEqual(file, `${id}.json`, `${file} should be named ${id}.json`);
    });
  });

  test("segment ragas resolve against the raga examples", () => {
    const known = knownNames(loadCollection("examples/ragas"));
    loadCollection("examples/recordings").forEach(({ file, doc }) => {
      doc.segments.forEach(segment => {
        if (segment.raga) {
          assert.ok(
            known.has(segment.raga.toLowerCase()),
            `${file}: segment raga "${segment.raga}" is not among the raga examples`
          );
        }
      });
    });
  });

  test("segment talas resolve against the tala examples (warns on missing)", () => {
    const known = knownNames(loadCollection("examples/talas"));
    loadCollection("examples/recordings").forEach(({ file, doc }) => {
      doc.segments.forEach(segment => {
        (segment.talas || []).forEach(ref => {
          if (!known.has(ref.toLowerCase())) {
            console.warn(`WARN ${file}: segment tala "${ref}" is not among the tala examples yet`);
          }
        });
      });
    });
  });

  test("accepts a typical performance (raga and tala)", () => {
    assert.strictEqual(validate(darbarYaman), true, JSON.stringify(validate.errors));
  });

  test("accepts an unmetered alap (raga only)", () => {
    const doc = {
      source: "https://www.youtube.com/watch?v=AAAAAAAAAAA",
      artist: "X",
      segments: [{ raga: "Yaman", form: "DHRUPAD" }]
    };
    assert.strictEqual(validate(doc), true, JSON.stringify(validate.errors));
  });

  test("accepts a drum solo (talas only)", () => {
    const doc = {
      source: "https://www.youtube.com/watch?v=AAAAAAAAAAA",
      artist: "X",
      segments: [{ talas: ["Tintal"], form: "INSTRUMENTAL", instrument: "TABLA" }]
    };
    assert.strictEqual(validate(doc), true, JSON.stringify(validate.errors));
  });

  test("rejects a segment with neither raga nor talas", () => {
    const doc = {
      source: "https://www.youtube.com/watch?v=AAAAAAAAAAA",
      artist: "X",
      segments: [{ form: "KHYAL" }]
    };
    assert.strictEqual(validate(doc), false);
  });

  test("rejects non-canonical source URLs (tracking parameters)", () => {
    const doc = {
      ...darbarYaman,
      source: "https://www.youtube.com/watch?v=ed4SIvGjqNI&list=RDed4SIvGjqNI"
    };
    assert.strictEqual(validate(doc), false);
  });

  test("rejects a negative segment start", () => {
    const doc = {
      ...darbarYaman,
      segments: [{ raga: "Yaman", start: -5 }]
    };
    assert.strictEqual(validate(doc), false);
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

  test("accepts every tala document in examples/talas", () => {
    const documents = loadCollection("examples/talas");
    assert.ok(documents.length > 0, "examples/talas should not be empty");
    documents.forEach(({ file, doc }) => {
      assert.strictEqual(validate(doc), true, `${file}: ${JSON.stringify(validate.errors)}`);
    });
  });

  test("example tala filenames match slugified names", () => {
    checkSlugFilenames(loadCollection("examples/talas"));
  });

  test("example tala names and aliases are unique", () => {
    checkUniqueNames(loadCollection("examples/talas"));
  });

  test("clap_pattern has one entry per vibhag", () => {
    loadCollection("examples/talas").forEach(({ file, doc }) => {
      assert.strictEqual(
        doc.clap_pattern.length,
        doc.vibhags.length,
        `${file}: clap_pattern length must equal the number of vibhags`
      );
    });
  });

  test("theka length equals the sum of vibhags", () => {
    loadCollection("examples/talas").forEach(({ file, doc }) => {
      const matras = doc.vibhags.reduce((sum, count) => sum + count, 0);
      assert.strictEqual(
        doc.theka.length,
        matras,
        `${file}: theka has ${doc.theka.length} bols for ${matras} matras`
      );
    });
  });

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
