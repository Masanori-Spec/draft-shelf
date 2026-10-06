# DraftShelf: keep each source document intact

**Offline Japanese/English source-tree copy for novelWriter 26.2.1 / project format 1.6 revision 0. Actual packaged-browser downloads passed the fresh native application and independent byte/tree checks.**

[Verified browser/native run](https://github.com/Masanori-Spec/draft-shelf/actions/runs/37538622578) · [Browser evidence and limits](docs/UI-VERIFICATION.md) · [Earlier Python proof](docs/VERIFICATION.md)

DraftShelf reads a closed, unpacked novelWriter **project format 1.6 revision 0** and creates an ordered, readable ZIP of its original document bodies. Each source document becomes exactly one `.md` file. Nested folders, document children, inactive notes, duplicate labels and Unicode remain represented. It does not rebuild the project from headings or render novelWriter's extended markup as standard Markdown.

This is a small source-preservation utility. novelWriter already builds manuscripts, and Kindling already imports/exports novelWriter projects. The narrower aim here is to keep the source document boundaries and project tree in a readable folder copy. [novelWriter issue #1108](https://github.com/saga-soft/novelWriter/issues/1108) asks for this kind of export and is planned upstream, so this should not be presented as a novel category or a replacement writing application. See [the source comparison](docs/SOURCES.md).

## Offline app

Extract [draft-shelf-offline.zip](draft-shelf-offline.zip) and open `index.html` in desktop Chrome/Chromium. Choose a saved, closed project folder. The Japanese/English interface previews the original tree, literal source text and every output path, then requires explicit review before downloading a copy. No server, account or background network access is used.

All bodies are included initially, including notes, inactive documents, Archive and Trash. Per-document/category controls make exclusions explicit. Excluded **body text** is omitted; the full source tree, labels and header metadata remain in the traceability manifest. Empty folders and original ordinal paths remain even when bodies are excluded. Selection changes and newer input clear acknowledgment; Clear cancels pending reads.

Only files the user explicitly supplies are read. The app does not walk filesystem handles, open external paths or evaluate source markup. A present native lock file is rejected. Print review covers the complete selection/path table, not the full manuscript. See [browser acceptance](docs/BROWSER-ACCEPTANCE.md).

## Python prototype use

Python 3.11+ on Linux; no dependencies are needed for the exporter itself:

```sh
python3 -m draft_shelf /path/to/closed/project /path/outside/project/draft-copy.zip
python3 -m unittest discover -s tests -v
```

The source directory must contain `nwProject.nwx` and `content/<handle>.md`. Legacy `.nwd`, other format versions, compressed native projects, orphaned/missing documents and inconsistent trees are rejected. Existing output files are never overwritten. Output must be outside the source project.

## Output convention

- Four-digit sibling numbers record the native tree order; labels supply readable names
- Root and folder nodes become directories, including empty folders
- A leaf document becomes `0001-Label.md`
- A document with children becomes `0001-Label/_document.md`; its children stay inside that same directory
- The manifest maps original handles, labels, parentage, order, active/layout flags, native header metadata and body hashes to every output path
- Unsafe filename characters are replaced and long labels shortened; original labels remain in the manifest

Bodies retain the exact UTF-8 source bytes after the native TOML header, including whitespace and line endings. Heading, comment, synopsis and cross-reference syntax remains literal. A body containing two headings remains one output document. The output is a readable copy, not a complete native-project backup, standard-Markdown conversion, or round-trip editor. Native project settings, indexes, history and build settings are not transferred.

## Mandatory native gate

The hosted workflow verifies the official novelWriter 26.2.1 wheel and the native class files against the pinned source commit. Its fixture is **API-authored**, using unchanged `NWProject` and `ProjectDocument`, with a real `GuiMain`. The actual GUI's native open/save/close/reopen handlers consume those same files. Screenshots and native enumeration are retained. No parser patch, fake GUI, private validity flag or hand-written native XML replaces the real application.

An independent handwritten oracle checks the complete tree and all eight bodies against exact output paths. The exporter runs only after the native GUI closes the project; every original project file is hashed before and after export. Missing-document, heading-split and body-rewrite negative controls must fail the same exact-output assertions. See [the complete acceptance contract](docs/TEST-DESIGN.md).

The actual offline browser producer passed at `d33ba649e6f3949674d887d5305084809470f82e`. Both its eight-body ZIP and explicit five-body selection were checked against fresh native input files and literal expectations. The earlier six-body Python proof remains recorded separately.

## Input limits and distribution

Limits: 2 MiB XML, 4 MiB per document, 32 MiB combined input, 2048 tree items, 16 KiB flat native headers, 32 hierarchy levels and 900-byte generated path stems. The reader rejects DTDs, comments, processing instructions, non-UTF-8 files, unsupported document headers, duplicate handles, invalid parents, cycles and conflicting native order representations. CLI source files must be regular files; content symlinks are rejected.

Source only. No novelWriter/Qt binaries, vendor implementation, real writing projects or original-code license grant is distributed. The official application and dependencies are fetched from official package registries only within hosted CI. No fees, hosting service or account is needed to use the exporter.

## Browser verification

The JavaScript reader is an independent implementation. The successful hosted run passed 61 JavaScript tests and 28 Python tests, including 30 direct implementation comparisons, plus 23 browser scenarios. It opened the exact shipped offline ZIP, captured real full/selected downloads, and checked them against fresh official native enumeration, the Python reader and a separate handwritten oracle. Japanese/English desktop and 390px screenshots, keyboard/race/bounds checks, and a two-page print review are retained. Both browser launches kept the sandbox enabled; the offline app made no HTTP requests and reported no console/page errors. See [the exact evidence and limits](docs/UI-VERIFICATION.md).
