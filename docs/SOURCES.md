# Primary sources and existing tools

Checked 2026-10-06.

## Official version and package pins

- [novelWriter v26.2.1 release](https://github.com/saga-soft/novelWriter/releases/tag/v26.2.1), published 2026-09-26
- Source commit: `99b0f48d923c80ed0301f690f5253795cfbfc466`
- [Official PyPI wheel](https://pypi.org/project/novelWriter/26.2.1/): `novelwriter-26.2.1-py3-none-any.whl`, SHA-256 `81e65e8e602b798250d4236a6c139ab22b2d2deaca041db110e82b829a15066d`; this is the hosted test runtime
- [Release API](https://api.github.com/repos/saga-soft/novelWriter/releases/tags/v26.2.1): alternative official Linux AppImage asset `591121994`, 83,769,848 bytes, SHA-256 `5fd64d6fe91334d5dc3da13e7ae60dbaf8223e4024c960fa65647cf03d0fde41`. The test uses the official wheel, not this alternative binary
- [Package configuration](https://github.com/saga-soft/novelWriter/blob/99b0f48d923c80ed0301f690f5253795cfbfc466/pyproject.toml): Python 3.11+, PyQt6 and PyEnchant; no Electron/browser engine

The wheel digest is checked before installation. Five installed native class files are additionally matched against the pinned commit's Git blob SHA-1 identities; see `scripts/native_gate.py`. Native dependency versions are recorded in the evidence. No vendor package is committed or bundled with DraftShelf.

## Native format and API evidence

- [ProjectDocument](https://github.com/saga-soft/novelWriter/blob/99b0f48d923c80ed0301f690f5253795cfbfc466/novelwriter/core/document.py): current files are `content/<handle>.md`, with a bounded `+++` TOML header and a separate body. Native writing can add a missing final newline; DraftShelf preserves the body actually saved by the application
- [Project XML reader/writer](https://github.com/saga-soft/novelWriter/blob/99b0f48d923c80ed0301f690f5253795cfbfc466/novelwriter/core/projectxml.py): project format 1.6, native item metadata and tree serialization
- [NWProject](https://github.com/saga-soft/novelWriter/blob/99b0f48d923c80ed0301f690f5253795cfbfc466/novelwriter/core/project.py): native root/folder/document creation, open, save and close
- [ProjectTree](https://github.com/saga-soft/novelWriter/blob/99b0f48d923c80ed0301f690f5253795cfbfc466/novelwriter/core/tree.py) and [ProjectModel](https://github.com/saga-soft/novelWriter/blob/99b0f48d923c80ed0301f690f5253795cfbfc466/novelwriter/models/itemmodel.py): traversal, actual sibling position and native order metadata. The loader follows serialized traversal; DraftShelf rejects XML whose traversal conflicts with its order fields
- [GuiMain](https://github.com/saga-soft/novelWriter/blob/99b0f48d923c80ed0301f690f5253795cfbfc466/novelwriter/guimain.py): the real open/save/close/reopen consumer used by the hosted integration test

## Demand and the modest difference

[Issue #1108](https://github.com/saga-soft/novelWriter/issues/1108) requests a readable file per original document, ordered names and the project folder hierarchy. It remains open and planned upstream at the check date. Its eventual implementation may make this utility unnecessary.

novelWriter's [Markdown build writer](https://github.com/saga-soft/novelWriter/blob/99b0f48d923c80ed0301f690f5253795cfbfc466/novelwriter/formats/tomarkdown.py) assembles its pages into one output document. Its native project table of contents is a flat list. Those are useful existing features, but neither is the exact source-tree copy being tested here.

[Kindling](https://github.com/smith-and-web/kindling) is a broader free writing application with novelWriter import/export, prose sync and folder-oriented exports. In the [reviewed importer](https://github.com/smith-and-web/kindling/blob/ceaff780e395510cd019a710b3bc102f99204cb9/src-tauri/src/parsers/novelwriter.rs), non-file folder nodes are not imported as a direct filesystem mirror, selected root classes are skipped, and document headings can be mapped to its chapter/scene model. It also has unsplit-document handling, so this is not a claim that it always splits every document. DraftShelf's narrower contract is every original tree document, one body file each, including inactive notes and empty folders, without interpreting or rebuilding headings.

This comparison supports a small preservation-focused workflow, not a claim of universal superiority, market uniqueness or a finished product.
