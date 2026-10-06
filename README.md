# DraftShelf: native-first source-tree export

**Native feasibility passed for novelWriter 26.2.1 / project format 1.6 revision 0. This is a Python source prototype; no product UI has been built.**

[Verified native run](https://github.com/Masanori-Spec/draft-shelf/actions/runs/37456245967) · [Evidence and limits](docs/VERIFICATION.md)

DraftShelf reads a closed, unpacked novelWriter **project format 1.6 revision 0** and creates an ordered, readable ZIP of its original document bodies. Each source document becomes exactly one `.md` file. Nested folders, document children, inactive notes, duplicate labels and Unicode remain represented. It does not rebuild the project from headings or render novelWriter's extended markup as standard Markdown.

This is a small source-preservation utility. novelWriter already builds manuscripts, and Kindling already imports/exports novelWriter projects. The narrower aim here is to keep the source document boundaries and project tree in a readable folder copy. [novelWriter issue #1108](https://github.com/saga-soft/novelWriter/issues/1108) asks for this kind of export and is planned upstream, so this should not be presented as a novel category or a replacement writing application. See [the source comparison](docs/SOURCES.md).

## Prototype use

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

An independent handwritten oracle checks the complete tree and all six bodies against exact output paths. The exporter runs only after the native GUI closes the project; every original project file is hashed before and after export. Missing-document, heading-split and body-rewrite negative controls must fail the same exact-output assertions. See [the complete acceptance contract](docs/TEST-DESIGN.md).

The complete native gate passed at `a8b3584760daf9d87263a9ccc6e57a073b67a4d4`, with the downloaded evidence independently checked. A future browser producer must pass again using its own actual downloaded files; this Python result is not a substitute for that test.

## Input limits and distribution

Limits: 2 MiB XML, 4 MiB per document, 32 MiB combined input, 2048 tree items, 16 KiB flat native headers, 32 hierarchy levels and 900-byte generated path stems. The reader rejects DTDs, comments, processing instructions, non-UTF-8 files, unsupported document headers, duplicate handles, invalid parents, cycles and conflicting native order representations. CLI source files must be regular files; content symlinks are rejected.

Source only. No novelWriter/Qt binaries, vendor implementation, real writing projects or original-code license grant is distributed. The official application and dependencies are fetched from official package registries only within hosted CI. No fees, hosting service or account is needed to use the exporter.
