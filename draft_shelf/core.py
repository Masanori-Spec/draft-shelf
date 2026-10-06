"""Independent bounded reader. No novelWriter runtime dependency or renderer."""
from __future__ import annotations

import hashlib
import json
import re
import tomllib
import unicodedata
import xml.etree.ElementTree as ET
from collections import defaultdict
from dataclasses import dataclass

MAX_XML = 2 * 1024 * 1024
MAX_DOCUMENT = 4 * 1024 * 1024
MAX_TOTAL = 32 * 1024 * 1024
MAX_ITEMS = 2048
MAX_DEPTH = 32
HANDLE = re.compile(r"[0-9a-f]{13}\Z")
CLASSES = set("NOVEL PLOT CHARACTER WORLD TIMELINE OBJECT ENTITY CUSTOM ARCHIVE TEMPLATE TRASH".split())
META_KEYS = set("name parent handle class layout textHash createdDate updatedDate".split())


class InvalidProject(ValueError):
    pass


class BoundedTreeBuilder(ET.TreeBuilder):
    """Stop before allocating an element beyond the XML limits."""
    def __init__(self):
        super().__init__()
        self.depth = 0
        self.count = 0

    def start(self, tag, attrs):
        self.depth += 1
        self.count += 1
        require(self.depth <= 12 and self.count <= 20000, "XML nesting or element limit exceeded")
        return super().start(tag, attrs)

    def end(self, tag):
        node = super().end(tag)
        self.depth -= 1
        return node


def require(condition: bool, message: str) -> None:
    if not condition:
        raise InvalidProject(message)


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def component(name: str, order: int) -> str:
    # Keep Unicode labels readable; remove path/control characters. Ordinals
    # distinguish duplicate/case-equivalent labels without using their headings.
    clean = "".join("_" if c in '/\\:<>"|?*' or unicodedata.category(c) in ("Cc", "Cf", "Cs") else c for c in name)
    clean = clean.strip(" .") or "Untitled"
    while len(clean.encode("utf-8")) > 96:
        clean = clean[:-1]
    return f"{order + 1:04d}-{clean}"


def split_document(raw: bytes, handle: str) -> tuple[dict, bytes]:
    require(len(raw) <= MAX_DOCUMENT, "Document exceeds 4 MiB")
    try:
        raw.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        raise InvalidProject("Document must be UTF-8") from exc
    # Keep the original byte slice after the native +++ TOML header. Never
    # split/rebuild the body, normalize line endings, or interpret headings.
    lines = []
    offset = 0
    for _ in range(21):
        if offset >= len(raw):
            break
        stop = raw.find(b"\n", offset)
        stop = len(raw) if stop < 0 else stop + 1
        lines.append(raw[offset:stop])
        offset = stop
    require(bool(lines) and lines[0].rstrip(b"\r\n") == b"+++", "Missing native TOML header")
    end = next((i for i in range(1, min(len(lines), 21)) if lines[i].rstrip(b"\r\n") == b"+++"), None)
    require(end is not None, "Unterminated or oversized native TOML header")
    header = b"".join(lines[1:end])
    require(len(header) <= 16384, "Native header exceeds 16 KiB")
    # Native headers are flat string assignments. Reject compound TOML values
    # before invoking its recursive parser, rather than merely checking types
    # after a deeply nested array/table has already been parsed.
    require(all(re.match(rb"[A-Za-z][A-Za-z0-9]*[ \t]*=[ \t]*(?!\"\"\"|''')['\"]", line) for line in lines[1:end]), "Native header must contain flat single-line string fields")
    try:
        meta = tomllib.loads(header.decode("utf-8"))
    except (tomllib.TOMLDecodeError, UnicodeDecodeError, RecursionError) as exc:
        raise InvalidProject("Invalid native TOML header") from exc
    require(set(meta) == META_KEYS and all(isinstance(v, str) for v in meta.values()), "Unsupported native header fields")
    require(meta["handle"] == handle, "Content/header handle mismatch")
    body = raw[sum(map(len, lines[:end + 1])):]
    return meta, body


@dataclass(frozen=True)
class Export:
    files: dict[str, bytes]
    directories: tuple[str, ...]
    manifest: dict


def export_project(inputs: dict[str, bytes]) -> Export:
    require(isinstance(inputs, dict) and len(inputs) <= MAX_ITEMS + 1, "Too many input files")
    require(all(isinstance(v, bytes) for v in inputs.values()), "Input must contain bytes")
    require(sum(map(len, inputs.values())) <= MAX_TOTAL, "Input exceeds 32 MiB")
    require("nwProject.nwx" in inputs, "Missing nwProject.nwx")
    require(all(k == "nwProject.nwx" or re.fullmatch(r"content/[0-9a-f]{13}\.md", k) for k in inputs), "Unsupported content path or legacy format")
    raw_xml = inputs["nwProject.nwx"]
    require(len(raw_xml) <= MAX_XML, "Project XML exceeds 2 MiB")
    try:
        xml = raw_xml.decode("utf-8", errors="strict")
        require(not re.search(r"<!|<\?(?!xml\s)", xml, re.I), "DTD, comments, entities and processing instructions are unsupported")
        declaration = re.match(r"<\?xml\s+[^?]*\?>", xml.removeprefix("\ufeff"))
        if declaration:
            encoding = re.search(r"encoding\s*=\s*['\"]([^'\"]+)['\"]", declaration[0], re.I)
            require(not encoding or encoding[1].lower() in ("utf-8", "utf8"), "XML must declare UTF-8")
        root = ET.fromstring(xml, parser=ET.XMLParser(target=BoundedTreeBuilder()))
    except (UnicodeDecodeError, ET.ParseError) as exc:
        raise InvalidProject("Malformed UTF-8 project XML") from exc
    require(root.tag == "novelWriterXML" and root.get("fileVersion") == "1.6" and root.get("fileRevision") == "0", "Only project format 1.6 revision 0 is supported")
    require([n.tag for n in root] == ["project", "settings", "content"], "Unsupported project sections")
    content = root.find("content")
    require(content is not None and 1 <= len(content) <= MAX_ITEMS, "Invalid project item count")
    require(content.get("items") == str(len(content)), "Content item count mismatch")
    items = {}
    groups = defaultdict(list)
    for node in content:
        require(node.tag == "item" and [n.tag for n in node] == ["meta", "name"], "Unsupported item structure")
        attrs = dict(node.attrib)
        require(set(attrs) <= {"handle", "parent", "root", "order", "type", "class", "layout"}, "Unsupported item attributes")
        handle = attrs.get("handle", "")
        require(bool(HANDLE.fullmatch(handle)) and handle not in items, "Duplicate or invalid handle")
        parent = attrs.get("parent")
        parent = None if parent == "None" else parent
        kind = attrs.get("type")
        require(kind in ("ROOT", "FOLDER", "FILE") and attrs.get("class") in CLASSES, "Unsupported item type or class")
        require((kind == "ROOT" and parent is None) or (kind != "ROOT" and isinstance(parent, str) and bool(HANDLE.fullmatch(parent))), "Invalid parent")
        order = attrs.get("order", "")
        require(bool(re.fullmatch(r"0|[1-9][0-9]{0,4}", order)), "Invalid sibling order")
        label_node = node.find("name")
        name = label_node.text or ""
        require(not list(label_node) and len(name) <= 512, "Invalid item label")
        require(name == " ".join(name.split()), "Noncanonical native label whitespace")
        require(not list(node.find("meta")) and not (node.find("meta").text or "").strip(), "Unsupported item metadata")
        require(not (node.text or "").strip() and all(not (n.tail or "").strip() for n in node), "Unsupported item text")
        layout = attrs.get("layout", "NO_LAYOUT")
        require(layout in (("DOCUMENT", "NOTE") if kind == "FILE" else ("NO_LAYOUT",)), "Unsupported item layout")
        active = label_node.get("active", "no")
        require(active in ("yes", "no"), "Invalid active flag")
        item = {"handle": handle, "parent": parent, "root": attrs.get("root"), "order": int(order), "type": kind,
                "class": attrs["class"], "layout": layout, "name": name, "active": active == "yes",
                "sourceAttributes": attrs, "sourceNameAttributes": dict(label_node.attrib), "sourceMetaAttributes": dict(node.find("meta").attrib)}
        items[handle] = item
        groups[parent].append(item)
    for parent, children in groups.items():
        require(parent is None or parent in items, "Parent handle does not exist")
        orders = sorted(c["order"] for c in children)
        require(orders == list(range(len(children))), "Duplicate or noncontiguous sibling order")
        children.sort(key=lambda i: i["order"])
    require(bool(groups[None]), "Missing root")
    seen = set()
    ordered = []

    def visit(item: dict, base: str, root_handle: str, depth: int) -> None:
        h = item["handle"]
        require(h not in seen and depth <= MAX_DEPTH, "Cycle or excessive hierarchy depth")
        require(item["root"] == root_handle, "Inconsistent root handle")
        require(item["class"] == items[root_handle]["class"], "Inconsistent root class")
        seen.add(h)
        stem = base + component(item["name"], item["order"])
        require(len(stem.encode("utf-8")) <= 900, "Export path too long")
        children = groups[h]
        is_dir = item["type"] != "FILE" or bool(children)
        item["directory"] = stem + "/" if is_dir else None
        item["output"] = (stem + "/_document.md" if children else stem + ".md") if item["type"] == "FILE" else None
        ordered.append(item)
        for child in children:
            visit(child, stem + "/", root_handle, depth + 1)

    for item in groups[None]:
        visit(item, "", item["handle"], 1)
    require(len(seen) == len(items), "Cycle or disconnected project tree")
    # Official 26.2.1 stores the tree in traversal order; its loader does not
    # use the redundant order attribute to reorder arbitrary XML. Reject a
    # conflicting representation rather than silently interpreting it differently.
    require([i["handle"] for i in ordered] == list(items), "Noncanonical XML tree order; save in novelWriter 26.2.1 first")
    expected = {f"content/{i['handle']}.md" for i in ordered if i["type"] == "FILE"}
    require(set(inputs) - {"nwProject.nwx"} == expected, "Missing or orphaned document content")
    files = {}
    for item in ordered:
        if item["type"] != "FILE":
            continue
        source = f"content/{item['handle']}.md"
        meta, body = split_document(inputs[source], item["handle"])
        files[item["output"]] = body
        item.update(source=source, sourceSha256=sha(inputs[source]), bodySha256=sha(body), bodyBytes=len(body), documentHeader=meta)
    manifest = {"product": "DraftShelf", "sourceFormat": "novelWriter 1.6 revision 0", "sourceXmlSha256": sha(raw_xml),
                "bodyPolicy": "Exact UTF-8 source bytes after native TOML header; no heading rebuild or rendering",
                "included": "Every tree document, including inactive notes; every folder including empty folders",
                "notTransferred": ["Native project settings, indexes, session history and build settings", "Native editability or round-trip metadata"],
                "items": ordered}
    files["draftshelf-manifest.json"] = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    return Export(files, tuple(i["directory"] for i in ordered if i["directory"]), manifest)
