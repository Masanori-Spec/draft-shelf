# Native acceptance contract

## Required actual application path

The native fixture is created with unchanged official novelWriter 26.2.1 APIs in hosted Xvfb, with a real Qt `GuiMain` instance. This is explicitly API authoring, not mouse-authored project creation. It uses `NWProject`, its native storage/tree methods, and `ProjectDocument.writeDocument`; the harness does not write native XML or TOML headers itself.

The saved fixture is then opened by the actual `GuiMain.openProject` handler, displayed, saved, fully closed, and reopened by that same unchanged application. The GUI is visible and screenshots retain the tree and selected document bodies. The test does not monkeypatch alerts, parsers, classes or return values. It does not fabricate a GUI or set internal validity flags. Closing the synthetic test project uses the native handler's existing `isYes` parameter.

Unchanged official `NWProject`/`ProjectDocument` enumerate the real open and reopened files. Actual sibling positions come from the native tree. Persisted layout/active meaning comes from native `ProjectItem.pack()`; folder runtime defaults are not serialized, and their raw values are recorded separately. A separate oracle imports neither DraftShelf nor the fixture author and compares these records with literal expected labels, parent roles, order, document types and complete bodies.

## Handwritten fixture

The source has twelve items and six original documents, in two content roots plus the native empty Trash root:

```text
Novel
  Part α
    Nested
      Duplicate       document with two headings and Unicode
      Duplicate       inactive NOTE with tag and synopsis syntax
    Parent            document with its own body
      Child           child document
  Empty               empty folder
資料
  人物                 Unicode note
  Blank               empty-body note
Trash                 native system root, empty
```

The two content roots are API-created in the opposite order, then inserted at the intended native position. Trash is authored explicitly through the official API, because the native loader creates it if absent; it is included in output rather than dropped. This checks that output follows native tree order rather than creation order or alphabetical sorting. Duplicate labels must remain distinct. The two headings in the first document must remain in one body file; no extraction by heading is permitted.

Expected path examples are literal oracle data, including `0001-Novel/0001-Part α/0002-Parent/_document.md` and `0001-Novel/0001-Part α/0002-Parent/0001-Child.md`. The oracle also verifies every empty/root/folder directory and every body byte. All six source document handles must occur exactly once in the export manifest.

## Immutability and rejection

The native GUI closes the project before export. SHA-256 is collected for every file in the original project directory immediately before and after running DraftShelf. The maps must be identical; native session bookkeeping is outside this comparison phase.

Source tests reject duplicate handles, missing/invalid parents, cycles, inconsistent roots, conflicting or invalid sibling order, missing/orphaned content, old `.nwd` files, unsupported project versions/revisions, malformed or nested TOML headers, UTF-16/entity/PI/comment XML, BOM-hidden incompatible declarations and oversized inputs. XML depth/element limits apply while parsing. CLI checks cover nonblocking FIFO rejection, source symlinks, output inside the project and existing output files. Blank bodies, CRLF bodies, Unicode, duplicate labels and empty folders are retained.

Three independent output negative controls remove a document, truncate a multi-heading body and rewrite Unicode content. Each must fail the same exact path/body oracle used for the real export.

## Honest stopping condition

Native success requires the pinned application, real open/save/close/reopen evidence, literal oracle success and unchanged source hashes. Local reader/writer agreement alone is insufficient. If hosted native verification fails, the source remains an unverified feasibility prototype; no product UI starts until the failure is resolved and the actual evidence is independently reviewed.

The exported `.md` files contain novelWriter source syntax verbatim. Standard-Markdown rendering, native project restoration, annotation return and full-project backup are outside scope. This gate uses synthetic content only.

## Verified prototype outcome

The full Python native gate passed in [run 37456245967](https://github.com/Masanori-Spec/draft-shelf/actions/runs/37456245967) at commit `a8b3584760daf9d87263a9ccc6e57a073b67a4d4`. See [the verification record](VERIFICATION.md) for the exact downloaded artifact, actual output and scope. A later browser producer must pass with its own real downloads; this prototype result does not pre-approve a different implementation.
