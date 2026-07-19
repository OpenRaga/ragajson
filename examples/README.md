# RagaJSON examples

Illustrative documents that conform to the RagaJSON schemas. They exist to
show the format in use and to give the test suite real instances to validate
against — **not** as an authoritative reference on the ragas and talas they
describe.

> **Status:** early alpha, alongside the format itself. The set is small and
> deliberately conservative: it encodes widely attested, textbook-level facts
> (mostly following the Bhatkhande tradition). Where authorities disagree —
> as they often do on *vadi*/*samvadi*, thaat assignment or time of day —
> treat these values as one common reading, not the last word.

## Layout

| Folder | Schema | Filename rule |
| --- | --- | --- |
| `ragas/` | [raga](../schema/raga.schema.json) | `<slug>.json`, slug = lowercased name, spaces → hyphens |
| `talas/` | [tala](../schema/tala.schema.json) | same slug rule |
| `recordings/` | [recording](../schema/recording.schema.json) | `<video-id>.json` |

`npm test` (from the repository root) validates every document here against its
schema and runs referential checks (unique names, theka length, recording
segments resolving to known ragas/talas).

## License & attribution

The example **data** in this directory is licensed **CC BY 4.0**, separately
from the MIT license that covers the schemas and code in the rest of the
repository. See [`LICENSE.md`](LICENSE.md).

Attribution string:

> © OpenRaga contributors, CC BY 4.0, openraga.org
