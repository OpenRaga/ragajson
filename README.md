# RagaJSON

Machine-readable [JSON Schema](https://json-schema.org/) (draft 2020-12) formats for Indian classical music (Hindustani system): **ragas** and **talas**.

> 📖 **Official documentation, schema explorers, and project info are available at [openraga.org](https://openraga.org)**

> **Status:** alpha. The schema shapes may change between versions without backward compatibility.

## How to use

The canonical schemas are hosted at `openraga.org` and can be fetched directly via HTTP for data validation.

* **[Raga Schema](https://openraga.org/schema/raga/0.2/raga.schema.json)**
* **[Tala Schema](https://openraga.org/schema/tala/0.1/tala.schema.json)**

Here is an example of validating a raga document in Node.js using [Ajv](https://ajv.js.org/) and loading the schema locally (if you cloned this repository):

```js
const Ajv2020 = require("ajv/dist/2020");
const schema = require("./schema/raga.schema.json");

const ajv = new Ajv2020({ strict: false, allErrors: true });
const validate = ajv.compile(schema);

if (!validate(ragaDocument)) {
  console.error(validate.errors);
}
```
*(Note: `strict: false` is required because the schema uses the non-standard annotation keywords `displayName` and `tags`.)*

## Examples

The [`examples/`](examples/) directory holds documents that conform to the
schemas — ragas and talas — so you can see the format in use. They are
**illustrative examples, not an authoritative reference**: a small,
conservative set encoding textbook-level facts. See
[`examples/README.md`](examples/README.md) for the layout and caveats.

```
examples/
  ragas/        # <slug>.json
  talas/        # <slug>.json
```

## Contributing & Development

We welcome contributions to both the schemas and the examples!

### Data policy
Example documents contain only traditional, widely attested facts that appear across many independent sources (scale, prominent notes, canonical pakad, performance time). Authored content from specific publications — such as melodic outlines composed for a particular book — is not copied or closely paraphrased.

### Local Development
To work on the schemas or add new examples, clone the repository and run the test suite to ensure your changes are valid:

```sh
npm install
npm test
```

The test suite meta-validates the schemas against draft 2020-12, compiles all `$ref` links, enforces documentation quality rules, and validates every instance document in the `examples/` directory.

## License

The schemas and code are [MIT](LICENSE). The example **data** under
[`examples/`](examples/) is licensed **CC BY 4.0**
([`examples/LICENSE.md`](examples/LICENSE.md)) — attribute as
*© OpenRaga contributors, CC BY 4.0, openraga.org*.
