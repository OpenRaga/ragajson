# RagaJSON

**A unified, theoretically rigorous JSON format for describing Hindustani classical ragas.**

> Making the rich musical heritage of Indian classical ragas accessible to the digital world through standardized, strictly-validated, machine-readable data.

## The Problem

Raga information is scattered across books, websites, and oral traditions with no standard format. Furthermore, many existing digital representations mix pure music theory with subjective performance metadata (like specific tempos, compositions, or notable performers), making it difficult to use the data systematically across different applications.

## The Solution

**RagaJSON** is a highly minimized, purely theoretical JSON schema for Hindustani classical music.

### Key Architectural Principles

- **Strictly Hindustani**: The schema self-documents by strictly enforcing `"system": "Hindustani"`. It utilizes Bhatkhande notation and grammar.
- **Single-File & Portable**: The entire schema is defined in a single, portable `raga.schema.json` file. All enums and definitions are contained within the `$defs` block.
- **Pure Music Theory (DRY)**: We have stripped out all redundant derived fields (like `jaati` or `varjit_svaras` which can be calculated from `aroha`/`avaroha`) and all subjective metadata (like `tempo`, `form`, or `performers`). RagaJSON represents the timeless structure of a Raga, not a specific performance.

## Example

A valid RagaJSON instance is incredibly compact:

```json
{
  "name": "Yaman",
  "system": "Hindustani",
  "classification": "Thaat",
  "structure": {
    "aroha": ["NI_KOMAL", "RE", "GA", "MA_TIVRA", "DHA", "NI", "SA"],
    "avaroha": ["SA", "NI", "DHA", "MA_TIVRA", "GA", "RE", "SA"],
    "vadi": "GA",
    "samvadi": "NI",
    "pakad": "NI_KOMAL RE GA, RE SA, PA MA_TIVRA GA RE SA"
  },
  "performance": {
    "time_of_day": ["Pradosh"],
    "season": "No Specific Season",
    "rasa": ["Shanti", "Bhakti"]
  }
}
```

## Quick Start

```bash
# Install dependencies
npm install

# Run comprehensive tests (validates the JSON schema and tests structure)
npm test
```

## Documentation

- [Schema Reference](schema/raga.schema.json) - Explore the complete schema

---

_Made with love for the global Indian classical music community_

Copyright © 2026 OpenRaga Contributors
