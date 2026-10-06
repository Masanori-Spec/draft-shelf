"""Independent literal oracle: does not import the exporter or fixture author."""
import hashlib
import json
from pathlib import Path
import tomllib
import zipfile

E = Path("evidence")
roles = json.loads((E / "role-handles.json").read_text())
# Each row is handwritten: role, parent role, sibling order, label, type, body.
EXPECTED = [
 ("novel",None,0,"Novel","ROOT",None),
 ("part","novel",0,"Part α","FOLDER",None),
 ("nested","part",0,"Nested","FOLDER",None),
 ("two_headings","nested",0,"Duplicate","FILE","# First heading\n\nCafé by the river.\n\n## Second heading\n\n雪と星。 Both headings belong to one source document.\n"),
 ("inactive_note","nested",1,"Duplicate","FILE","### Private planning note\n\n@tag: hidden-plan\n% Synopsis: Keep this exact line.\n\nInactive does not mean excluded.\n"),
 ("parent_doc","part",1,"Parent","FILE","## Parent document\n\nThis document has its own child.\n"),
 ("child_doc","parent_doc",0,"Child","FILE","### Child scene\n\n> Literal marker, not converted HTML.\n"),
 ("empty_folder","novel",1,"Empty","FOLDER",None),
 ("notes",None,1,"資料","ROOT",None),
 ("unicode_note","notes",0,"人物","FILE","# 人物\n\n@tag: 星野\n\n名前は星野。 π ≠ 3.14\n"),
 ("blank","notes",1,"Blank","FILE",""),
]
PATHS = {
 "two_headings":"0001-Novel/0001-Part α/0001-Nested/0001-Duplicate.md",
 "inactive_note":"0001-Novel/0001-Part α/0001-Nested/0002-Duplicate.md",
 "parent_doc":"0001-Novel/0001-Part α/0002-Parent/_document.md",
 "child_doc":"0001-Novel/0001-Part α/0002-Parent/0001-Child.md",
 "unicode_note":"0002-資料/0001-人物.md",
 "blank":"0002-資料/0002-Blank.md",
}
DIRECTORIES = {
 "0001-Novel/", "0001-Novel/0001-Part α/", "0001-Novel/0001-Part α/0001-Nested/",
 "0001-Novel/0001-Part α/0002-Parent/", "0001-Novel/0002-Empty/", "0002-資料/",
}
LITERAL_METADATA = []
for role,parent,order,name,kind,body in EXPECTED:
    notes_root = role in ("notes", "unicode_note", "blank")
    LITERAL_METADATA.append({"handle":roles[role], "parent":roles[parent] if parent else None,
        "root":roles["notes" if notes_root else "novel"], "order":order, "name":name, "type":kind,
        "class":"CHARACTER" if notes_root else "NOVEL",
        "layout":("NOTE" if role in ("inactive_note","unicode_note","blank") else "DOCUMENT") if kind=="FILE" else "NO_LAYOUT",
        "active":kind=="FILE" and role!="inactive_note"})
for filename in ("native-open.json", "native-reopened.json"):
    rows = json.loads((E / filename).read_text())
    assert len(rows) == len(EXPECTED) == len(roles)
    for actual, literal, (role,parent,order,name,kind,body) in zip(rows, LITERAL_METADATA, EXPECTED):
        assert {k:actual[k] for k in literal} == literal
        assert actual["handle"] == roles[role]
        assert actual["parent"] == (roles[parent] if parent else None)
        assert (actual["order"],actual["name"],actual["type"]) == (order,name,kind)
        assert actual.get("body") == body
        if role == "inactive_note":
            assert actual["layout"] == "NOTE" and actual["active"] is False

def check_export(payload):
    assert set(payload) == set(PATHS.values())
    for role, parent, order, name, kind, body in EXPECTED:
        if body is not None:
            assert payload[PATHS[role]] == body.encode("utf-8"), role

with zipfile.ZipFile(E / "draft-shelf-export.zip") as archive:
    assert len(archive.namelist()) == len(set(archive.namelist()))
    assert {n for n in archive.namelist() if n.endswith("/")} == DIRECTORIES
    payload = {n:archive.read(n) for n in archive.namelist() if not n.endswith("/") and n != "draftshelf-manifest.json"}
    check_export(payload)
    manifest = json.loads(archive.read("draftshelf-manifest.json"))
    source_xml = (E / "native-project/nwProject.nwx").read_bytes()
    assert manifest["sourceXmlSha256"] == hashlib.sha256(source_xml).hexdigest()
    assert len(manifest["items"]) == len(LITERAL_METADATA)
    for item,literal in zip(manifest["items"],LITERAL_METADATA):
        assert {k:item[k] for k in literal} == literal
    exported = {item["handle"]:item for item in manifest["items"] if item["type"] == "FILE"}
    assert set(exported) == {roles[r] for r in PATHS}
    for role,path in PATHS.items():
        item = exported[roles[role]]
        assert item["output"] == path
        assert item["bodySha256"] == hashlib.sha256(payload[path]).hexdigest()
        source_name = f"content/{roles[role]}.md"
        raw = (E / "native-project" / source_name).read_bytes()
        # Independent split for this native LF fixture, not the exporter helper.
        assert raw.startswith(b"+++\n")
        close = raw.index(b"\n+++\n",4)
        header = tomllib.loads(raw[4:close].decode("utf-8"))
        native_body = raw[close+5:]
        assert item["source"] == source_name
        assert item["sourceSha256"] == hashlib.sha256(raw).hexdigest()
        assert item["bodyBytes"] == len(native_body)
        assert item["documentHeader"] == header
        assert native_body == payload[path]

# Negative controls must fail the same independent exact-output oracle.
negative = []
for label, mutate in [
    ("missing document", lambda p:p.pop(PATHS["inactive_note"])),
    ("heading split", lambda p:p.update({PATHS["two_headings"]:b"# First heading\n"})),
    ("body rewrite", lambda p:p.update({PATHS["unicode_note"]:p[PATHS["unicode_note"]].replace("星野".encode(),b"changed")})),
]:
    broken = dict(payload)
    mutate(broken)
    try:
        check_export(broken)
    except AssertionError:
        negative.append(label)
    else:
        raise AssertionError(f"Negative control unexpectedly passed: {label}")
immutability = json.loads((E / "source-immutability.json").read_text())
assert immutability["unchanged"] and immutability["before"] == immutability["after"]
(E / "independent-oracle-result.json").write_text(json.dumps({"status":"pass", "documents":6, "items":11,
    "exactPathsAndBodies":True, "nativeOpenSaveReopen":True, "sourceUnchanged":True,
    "negativeControls":negative, "exportSha256":hashlib.sha256((E/"draft-shelf-export.zip").read_bytes()).hexdigest()}, indent=2)+"\n")
print("Independent literal native tree/body/output oracle passed, including three negatives")
