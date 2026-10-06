# Offline browser acceptance

The independent Python feasibility proof remains in VERIFICATION.md. It does not establish the browser implementation's correctness. Product acceptance requires a fresh exact-commit hosted run and independent inspection of its actual downloaded files and native evidence.

## User selection and fidelity

The user explicitly selects a closed, unpacked project folder, or supplies its index and document files together. The app reads only the supplied `nwProject.nwx` and `content/<handle>.md` files. Other selected cache/history files are not read. Multiple project indexes, traversal-like supplied paths, lock files, unsupported content names, malformed trees and unsupported formats are rejected. No filesystem-handle walking or external-path resolution occurs.

Every document starts selected. Notes, inactive documents, Archive and Trash have explicit controls. A user may exclude body text, but the review clearly states that the original tree, labels and header metadata remain in the manifest. Paths keep original ordinals; they are not renumbered after exclusion. All original folder paths, including empty folders and document-parent folders, remain. Every selected source document contributes exactly one byte-preserved body file.

The screen shows literal source text, not rendered Markdown/HTML. Output never splits documents by headings or normalizes body bytes. Filename changes are limited to bounded length and unsafe path/control characters; original labels and the complete mapping remain visible. The two readers use the same explicit control-character policy without sharing implementation.

## Actual browser downloads

Hosted CI verifies the exact six-file offline ZIP against its manifest and current source, then opens its packaged `index.html` using `file://` with networking disabled. The test selects the freshly API-authored and GUI-reopened official native project through the real folder input. It operates selection/acknowledgment buttons and captures actual browser downloads. It never calls the production converter API to generate tested output.

The fresh fixture extends the preserved prototype with an Archive document and a Trash document: **15 nodes, eight bodies and eight output directories**. The real official novelWriter GUI still opens, saves, closes and reopens those same input files. Its unchanged project/document classes enumerate complete source text and persisted metadata; raw runtime metadata is retained separately. The native file and class pins remain mandatory.

The first browser ZIP includes all eight bodies. The second explicitly excludes the inactive note, Archive body and Trash body, producing five bodies while retaining the original path/tree mapping. A separate handwritten oracle checks both actual ZIPs, all source metadata and hashes, literal body bytes and every explicit exclusion. The original independent Python reader checks all-body path/directory/metadata/body equality. Missing-document, heading-split and body-rewrite negatives still fail the exact-output assertions.

All original project files are hashed before and after the complete browser test/export phase. No native source-file writes are allowed in that phase. A browser ZIP is not silently replaced by a Python-produced ZIP.

## Bounds, interruption and UI evidence

- 2 MiB XML, 4 MiB per document, 32 MiB combined selected content, 2048 source items, 32 hierarchy levels and 16 KiB flat native headers
- XML element/depth bounds during tokenization; no DTD resolver, comments, processing instructions or unsupported namespaces
- TOML is restricted to native flat single-line string fields; nested values, raw forbidden controls and incompatible syntax are rejected
- File metadata bounds before reading bytes; strict UTF-8 and header-handle checks after reading
- Every new selection clears the previous review; newer asynchronous reads win and Clear prevents late results from reappearing
- Explicit selection changes invalidate acknowledgment; repeated downloads must remain complete and deterministic
- Japanese/English desktop and 390px layouts, keyboard sample/acknowledgment/tree navigation, rejected-input messages and all-row print PNG/PDF retained
- Script-looking source text must remain text and make no network requests; console and page errors are captured
- A local-file CSP permits only local scripts/styles (and the required inline depth styling), disables connection/object/base/form/frame/worker sources, and blocks image/font resource loading; system fonts and inline SVG markup need no network

The standard Ubuntu 22.04 runner uses a pinned official Python setup action for Python 3.12 and the pinned official novelWriter wheel. Chromium is launched with `chromiumSandbox:true`; actual main-process commands are recorded and rejected if they contain sandbox-disabling flags. No kernel, AppArmor or browser-security setting is weakened. Browser versions are development/test dependencies only and are not shipped.

## Delivery and limits

Delivery is GitHub source plus a ready-to-open source-only offline ZIP. There is no Pages/Sites deployment or hosted-service requirement. The app is a readable source-body/tree copy, not a standard-Markdown renderer, full native backup or round-trip editor. Responsive screenshots do not certify every mobile browser's folder picker; desktop Chrome/Chromium is the tested launch target. No vendor binaries or original-code license grant are included.
