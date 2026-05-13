# AG eTax Debug & Compatibility Tooling

Pure, dependency-free helpers for reverse-engineering and comparing AG eTax
exports against Ditax-generated packages. **No production code path depends on
this folder** — all entry points are dev-only and admin-gated.

Modules:

- `xmlParser.ts` — Minimal XML tokenizer/parser → `XmlNode` AST. Captures tag,
  attributes (with namespace prefixes), text, and children. Skips comments,
  PIs and the prolog. Sufficient for AG eTax / RIAG payloads; not a full XML 1.1
  parser.
- `xmlNormalizer.ts` — Canonical pretty-printer over `XmlNode`. Stable
  attribute ordering, LF newlines, indented children — same conventions as our
  serializer so two trees can be string-compared after normalization.
- `xmlDiff.ts` — Structural diff between two `XmlNode` trees. Reports missing
  elements, extra elements, ordering mismatches, attribute deltas, namespace
  drift, and text mismatches. Path-addressed for UI rendering.
- `zipReader.ts` — Pure-JS unzip (store + deflate via `DecompressionStream`).
  Reads central directory, returns entries with name + bytes. Works on real
  AG `.etax.zip` exports and on our deterministic ZIPs.
- `structuralAnalysis.ts` — Walks an `XmlNode`, returns tag-count map,
  max depth, namespace map, reference-id stats and repeated-pattern hints.
- `importRegistry.ts` — `localStorage`-backed registry of import test cases
  (status, hashes, error notes). No DB dependency this phase.
- `compatibilityChecklist.ts` — Hardcoded capability matrix
  (taxpayer, spouse, employment, deductions, …) with localStorage status.

Out of scope: AI extraction, schema mutation, submission, production storage.
