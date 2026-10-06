# Native feasibility verification

## Result and exact evidence

**Passed for the documented Python prototype and official novelWriter 26.2.1, project format 1.6 revision 0.**

- Code commit: `a8b3584760daf9d87263a9ccc6e57a073b67a4d4`
- [Successful GitHub Actions run 37456245967](https://github.com/Masanori-Spec/draft-shelf/actions/runs/37456245967), completed 2026-10-06
- [Native evidence artifact 11409383339](https://github.com/Masanori-Spec/draft-shelf/actions/runs/37456245967/artifacts/11409383339)
- Downloaded evidence: 468,305 bytes; SHA-256 `a5835bb36e3f1eac136a512cbc95aa1f072c6103a7721a2a8f7d28ce2a1399cc`
- Actual export ZIP SHA-256: `ecc65036314367d5d1499ac9264a20c9a32318379f3afd4f288cbe8d695f7e43`

The official PyPI wheel digest and all five native class Git blob identities passed their pins before fixture authoring. The hosted runtime used Python 3.12, PyQt6 6.11.0 / Qt 6.11.2 and PyEnchant 3.3.0, with the standard Ubuntu English dictionary. No vendor code was patched. GitHub artifacts expire after 14 days; the exact source and proof are retained in a separate private backup.

## Actual application path

The fixture was **API-authored** through unchanged `NWProject` and `ProjectDocument`, with an actual Qt `GuiMain`. The real application handlers opened the saved project, displayed its tree and selected documents, saved it, fully closed it, and reopened it. This is native API/GUI integration automation, not mouse-authored creation or a claim that every menu click was tested.

Actual screenshots show the open project with both headings in one source document, an inactive note, document children and Unicode. The closed-state screenshot has an empty project tree/editor; the reopened screenshot restores the original tree and selected Unicode note. Native open/reopened enumeration records are identical, including separately recorded runtime fields.

The fixture contains **six source documents, twelve items and seven exported directories**: two content roots, nested/empty folders, a parent document with a child, duplicate labels, an inactive note, a blank note and the native empty Trash root. Trash is explicitly authored through the official API because the native loader creates it if missing. Persisted folder layout/active semantics come from the application's own serializer; transient runtime defaults remain separately recorded.

## Independent checks

- All 26 source tests passed in hosted CI
- A separate handwritten oracle checked every item handle, parent, root, order, name, type, class, persisted layout and active flag
- All six output paths and complete body byte sequences matched literal expectations; the two-heading document remained one file
- Every original content/header hash, body-byte length and exported body hash matched the actual native files
- All source document handles appeared exactly once; every expected directory, including empty folders and Trash, was present
- Every original project file's SHA-256 was unchanged across the exporter invocation, after the native GUI closed and background work finished
- Independent missing-document, heading-split and rewritten-body controls each failed the same exact path/body oracle
- The downloaded artifact digest, original file hashes, native open/closed/reopened pixels, source body slices and manifest mappings were independently inspected

| Original document | Output path | Body bytes |
| --- | --- | ---: |
| First Duplicate, two headings | `0001-Novel/0001-Part α/0001-Nested/0001-Duplicate.md` | 115 |
| Second Duplicate, inactive note | `0001-Novel/0001-Part α/0001-Nested/0002-Duplicate.md` | 113 |
| Parent | `0001-Novel/0001-Part α/0002-Parent/_document.md` | 53 |
| Child | `0001-Novel/0001-Part α/0002-Parent/0001-Child.md` | 55 |
| 人物 | `0002-資料/0001-人物.md` | 55 |
| Blank | `0002-資料/0002-Blank.md` | 0 |

## Limits and next-producer gate

This result establishes the documented Python prototype on the pinned native version. It does not certify other novelWriter versions, Windows/macOS CLI behavior, a finished browser UI, standard-Markdown rendering, native restoration or round-trip editing. The copy omits native project settings, indexes, history and build configuration; keep the original project as the full backup.

Any later browser implementation must be tested using its actual downloaded ZIP against a freshly authored and GUI-reopened native fixture, the independent native enumeration and literal path/body oracle, and source immutability checks. A self-consistent replacement parser is insufficient. The rejection and resource bounds in the README remain in force.
