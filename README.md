# RagaJSON

A machine-readable [JSON Schema](https://json-schema.org/) (draft 2020-12) for describing ragas of Indian classical music (Hindustani system).

> **Status:** alpha. The schema shape may change between versions without backward compatibility.

## Schema overview

The schema lives in [`schema/raga.schema.json`](schema/raga.schema.json); the canonical URL of the current version is [`https://openraga.org/schema/raga/0.2/raga.schema.json`](https://openraga.org/schema/raga/0.2/raga.schema.json). A raga document is a single JSON object:

| Field | Type | Description |
| --- | --- | --- |
| `name` | string (**required**) | Raga name. |
| `name_devanagari` | string | Raga name in Devanagari script (भूपाली). |
| `aliases` | array of string | Alternate names and spellings (Bhup, Bhup kalyan). |
| `system` | const `"Hindustani"` (**required**) | Indian classical music system. |
| `thaat` | enum | Parent scale (thaat) per the Bhatkhande system — one of the ten canonical thaats. |
| `classification` | array of enum | Traditional categories of character, origin, and melodic movement (Upanga, Bhashanga, Vakra, …). |
| `description` | string | Free-form prose: history, character, note treatment, ornamentation — anything not expressible in structured fields. |
| `similar_ragas` | array of string | Ragas easily confused with this one; the distinctions belong in `description`. |
| `structure` | object | Structural parameters: `aroha` and `avaroha` (arrays of notes with octave), `vadi` and `samvadi` (pitch classes), `pakad` (array of phrases). |
| `performance` | object | Performance context: `time_of_day` (Samay Chakra), `season`, `rasa`. |

Unknown properties are rejected (`additionalProperties: false`).

Note that jati (Audav / Shadav / Sampurna) is intentionally not stored: it is derivable as the number of distinct pitch classes (5 / 6 / 7, ignoring octave) in `structure.aroha` / `structure.avaroha`.

### Notation

Note tokens follow the morphology `SWARA[_KOMAL|_TIVRA][_MANDRA|_TAR]`: a pitch class (`SA`, `RE`, …), an optional accidental (`_KOMAL` = flat, `_TIVRA` = sharp Ma), and an optional saptak (octave) suffix — `_MANDRA` (low) or `_TAR` (high). The unmarked octave is madhya (middle), matching the traditional convention where only the outer octaves carry dots. Transliteration never doubles long vowels: `TIVRA` (not TEEVRA), `TAR` (not TAAR).

Every token carries a human-facing `displayName` using the prime sign `′` (U+2032, immune to smart-quote substitution): prefix = mandra, suffix = tar. Mapping to Bhatkhande print notation (underline = komal, acute = tivra Ma, dot below/above = mandra/tar):

| const | displayName | Bhatkhande print |
| --- | --- | --- |
| `SA` | `Sa` | S |
| `RE_KOMAL` | `re` | R̲ |
| `MA_TIVRA` | `Má` | Ḿ |
| `NI_KOMAL_MANDRA` | `′ni` | N̲ with a dot below |
| `SA_TAR` | `Sa′` | Ṡ |

Renderers that need print-grade typography (underlines, octave dots) should derive it from `const` tokens; search should treat the ASCII apostrophe `'` as equivalent to the prime `′`.

### Reference definitions (`$defs`)

All enumerations follow one convention: a machine-friendly `const` value plus a human-facing `displayName` and a `description`.

- **`sargam_enum`** — the 12 Hindustani sargam pitch classes (octave-less), used where the octave is not meaningful (`vadi`, `samvadi`). `const` values use ASCII UPPER_SNAKE (`SA`, `RE_KOMAL`, `MA_TIVRA`, …); `displayName` follows the Bhatkhande convention (uppercase = shuddha, lowercase = komal, `Má` = tivra).
- **`note_enum`** — the 36 sargam notes with saptak: 12 pitch classes × 3 octaves (`NI_KOMAL_MANDRA`, `SA`, `SA_TAR`, …). Used in melodic sequences (`aroha`, `avaroha`, phrases).
- **`phrase`** — an ordered, non-empty sequence of `note_enum` tokens; `pakad` is an array of phrases.
- **`classification_enum`** — traditional raga categories (Upanga, Bhashanga, Vakra, Naya, Desya, Ghana, Rakti, Thaat).
- **`time_of_day_enum`** — the Ashta Prahar periods of the day, plus `Unrestricted`.
- **`season_enum`** — the six Indian seasons, plus `No Specific Season`.
- **`rasa_enum`** — emotional associations (Shringara, Karuna, Vira, …).

## Usage

An example raga document:

```json
{
  "name": "Bhupali",
  "name_devanagari": "भूपाली",
  "aliases": ["Bhup", "Bhup kalyan"],
  "system": "Hindustani",
  "thaat": "Kalyan",
  "description": "A principal pentatonic evening raga: Ma and Ni are omitted; Ga and Dha are the prominent notes.",
  "similar_ragas": ["Deshkar", "Shuddh kalyan"],
  "structure": {
    "aroha": ["SA", "RE", "GA", "PA", "DHA", "SA_TAR"],
    "avaroha": ["SA_TAR", "DHA", "PA", "GA", "RE", "SA"],
    "vadi": "GA",
    "samvadi": "DHA",
    "pakad": [
      ["GA", "RE", "SA", "DHA_MANDRA"],
      ["SA", "RE", "GA"]
    ]
  },
  "performance": {
    "time_of_day": ["Pradosh"],
    "rasa": ["Shanta", "Bhakti"]
  }
}
```

Validating with [Ajv](https://ajv.js.org/):

```js
const Ajv2020 = require("ajv/dist/2020");
const schema = require("./schema/raga.schema.json");

const ajv = new Ajv2020({ strict: false, allErrors: true });
const validate = ajv.compile(schema);

if (!validate(ragaDocument)) {
  console.error(validate.errors);
}
```

`strict: false` is required because the schema uses the non-standard annotation keywords `displayName` and `tags`.

A fuller example lives in [`examples/bhupali.json`](examples/bhupali.json); every document in `examples/` is validated by the test suite.

## Data policy

Raga documents in this repository contain only traditional, widely attested facts that appear across many independent sources: scale, prominent notes, canonical pakad, performance time. Authored content from specific publications — melodic outlines composed for a particular book, or its prose — is not copied or closely paraphrased.

## Development

```sh
npm install
npm test
```

The test suite meta-validates the schema against draft 2020-12, compiles all `$ref` links, enforces documentation quality rules (descriptions, `examples`, `displayName`) for every enum in `$defs`, and validates instance documents — including every file in `examples/` — against the schema.

## License

[MIT](LICENSE)
