# Offline browser verification

## Result and exact evidence

**Passed for the shipped offline app and official novelWriter 26.2.1, project format 1.6 revision 0.** The tested files came from actual browser downloads of the packaged app, opened directly with `file://`.

- Producer commit: `d33ba649e6f3949674d887d5305084809470f82e`
- [Successful run 37538622578](https://github.com/Masanori-Spec/draft-shelf/actions/runs/37538622578), completed 2026-10-06
- [Evidence artifact 11447292020](https://github.com/Masanori-Spec/draft-shelf/actions/runs/37538622578/artifacts/11447292020): 63 files, 2,378,967 bytes
- Downloaded artifact SHA-256: `f39a69266ce792613e6b9c8a925283fce1e5382d0dd8d23795b475f816af7ed1`
- Shipped six-file offline ZIP SHA-256: `d6bb56fa1e12792c0c6eee24b2d404fcd9ebed2abaa2aaba45d3244a24a1d9a7`
- Actual eight-body download SHA-256: `8e99c7557a98cb33e3b369abd748e10d8235dbab96e880c58dda34ba0ea1363d`
- Actual five-body selected download SHA-256: `742c182bf103a684611748faadd737acac4c89b6540c9b4bb03073b904f4e127`

GitHub artifacts expire after 14 days. Exact source, offline package and proof are retained in separate private backups. No real writing project or vendor binary is included in the repository or offline package.

## Native input and actual browser output

The fixture was **API-authored** using unchanged official `NWProject` and `ProjectDocument` with a real Qt `GuiMain`. The actual native open/save/close/reopen handlers consumed the same files. This is native API/GUI integration automation, not mouse-authored project creation or coverage of every menu click. The official wheel digest and five native class Git blob pins passed before authoring; no parser or GUI monkeypatch was used.

The fresh fixture contains 15 nodes, eight documents and eight output directories: two content roots, nested and empty folders, a parent document with a child, duplicate labels, Unicode, an inactive note, a blank note, Archive and Trash. One document contains two headings and remains one output file. Native open/reopened enumeration is identical. Actual screenshots retain the original tree, selected source text, empty closed state and restored reopened state.

The hosted browser opens the exact extracted offline package with networking disabled, selects that closed native project through its real folder input, acknowledges the review and downloads a ZIP. A second actual download explicitly excludes the inactive note and Archive/Trash bodies. Both ZIPs keep all eight original directories and original ordinal paths. The selected ZIP contains exactly five body files plus the manifest; excluded body bytes are absent, while the disclosed source tree, labels and header metadata remain.

A handwritten oracle checks all 15 nodes' handle, parent, root, order, label, type, class, persisted layout and active flag, all eight literal body byte sequences, exact path sets, source/header hashes and manifest mappings. The original independent Python reader separately matches the full browser output. Standalone browser review JSON matches each ZIP manifest. All 13 original project-file hashes remain unchanged across the browser tests and exports. Missing-document, heading-split and rewritten-body negative controls each fail the same exact-output assertions.

## Browser and visual checks

The run passed 61 JavaScript and 28 Python tests, including 30 independent reader comparisons, and 23 actual browser scenarios. These cover keyboard entry and acknowledgment, tree navigation, repeated input/downloads, explicit exclusions, malformed/missing/oversized input, safe filename mapping, supplied traversal/drive-path rejection, literal script-looking text, stale asynchronous reads, Clear and an explicitly dispatched empty input change. The last case does not claim operating-system picker cancellation.

Japanese/English desktop and 390px mobile screenshots retain all mapping rows. The horizontally scrollable mobile table exposes its complete rightmost column. A two-page landscape PDF repeats the table header on page two and retains all eight rows plus the omission/full-backup limits; print review is not a manuscript rendering. Actual screenshots and both rendered PDF pages were inspected.

Both recorded Chromium main-process commands retain sandboxing and omit sandbox-disabling flags. The local-file CSP works with the packaged scripts/styles. No HTTP requests, console errors or page errors were recorded. The run used standard Ubuntu 22.04, Python 3.12.14, Node 22.23.3, Playwright 1.63.0/Chromium 153, PyQt6 6.11.0, Qt 6.11.2 and PyEnchant 3.3.0. Browser/native dependencies are fetched only for CI and are not shipped.

## Scope

This verifies a readable source-body/tree copy for the pinned native version and tested desktop Chromium. Responsive screenshots do not certify every mobile folder picker or every browser. Source syntax remains literal; standard-Markdown rendering, complete native settings/history backup, native restoration and round-trip editing are outside scope. Other project versions and legacy/compressed inputs are rejected. Keep the original project for a full backup.

The separate [earlier Python proof](VERIFICATION.md) is preserved unchanged. A changed browser producer must pass the real-download/native gate again. Delivery is GitHub source plus the offline ZIP; there is no hosted-service requirement or original-code license grant.
