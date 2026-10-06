"""Hosted-only real novelWriter GUI/classes; no monkeypatch or fake parser."""
from __future__ import annotations

import hashlib
import importlib
import json
from pathlib import Path
import subprocess
import sys
import time
import traceback

from PyQt6.QtCore import QThreadPool
from PyQt6.QtWidgets import QApplication, QTreeView
from novelwriter import CONFIG, SHARED, __version__
from novelwriter.core.document import ProjectDocument
from novelwriter.core.project import NWProject
from novelwriter.core.storage import ProjectStorageCreate
from novelwriter.enum import nwItemClass, nwItemLayout
from novelwriter.gui.theme import GuiTheme
from novelwriter.guimain import GuiMain

E = Path("evidence").resolve()
E.mkdir(exist_ok=True)
SOURCE = E / "native-project"
assert not SOURCE.exists(), "Refuse stale native evidence"
assert __version__ == "26.2.1"

# Verify the installed official wheel's native classes against the immutable
# upstream commit's git blob identities before creating any fixture.
PINS = {
    "novelwriter.core.document": "67f3e5c75013c31e81b0529c2e0e61ec3e02202c",
    "novelwriter.core.project": "bd604f287123d73207f40659b2d5584f5e8b789c",
    "novelwriter.core.projectxml": "1a95082ecd9f40d4924fcab6c8556cf4458b601f",
    "novelwriter.core.tree": "3eaf2eb56537cf8e7af0fc4875a87de076d74770",
    "novelwriter.guimain": "281a9efbeee543d7f5461883de3320608baa79b9",
}
verified = {}
for name, expected in PINS.items():
    module = importlib.import_module(name)
    data = Path(module.__file__).read_bytes()
    actual = hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()
    assert actual == expected, (name, actual, expected)
    verified[name] = {"gitBlobSha1": actual, "path": str(module.__file__)}
(E / "official-class-integrity.json").write_text(json.dumps(verified, indent=2) + "\n")

app = QApplication(["novelWriter native feasibility"])
app.setStyle("Fusion")
CONFIG.initConfig(E / "profile", E / "profile")
CONFIG.loadConfig()
CONFIG.initLocalisation(app)
CONFIG.backupOnClose = False
CONFIG.guiLocale = "en_GB"
SHARED.initTheme(GuiTheme())
gui = GuiMain()
gui.resize(1360, 950)
gui.show()


def pump(seconds=.4):
    end = time.monotonic() + seconds
    while time.monotonic() < end:
        app.processEvents()
        time.sleep(.02)


def screen(name):
    for view in gui.findChildren(QTreeView):
        view.expandAll()
    pump()
    assert gui.isVisible()
    assert gui.grab().save(str(E / (name + ".png")))


def hashes():
    return {str(p.relative_to(SOURCE)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted(SOURCE.rglob("*")) if p.is_file()}


def enumerate_native(project):
    rows = []
    for item in project.tree:
        row = {"handle": item.itemHandle, "parent": item.itemParent, "root": item.itemRoot,
               "order": project.tree.subTreePos(item.itemHandle), "name": item.itemName, "type": item.itemType.name,
               "class": item.itemClass.name, "layout": item.itemLayout.name, "active": item.isActive}
        if item.isFileType():
            doc = ProjectDocument(project, item.itemHandle)
            assert doc.fileExists(), item.itemHandle
            text = doc.readDocument()
            assert text is not None, doc.error
            row["body"] = text
        rows.append(row)
    return rows


try:
    # Author through the official project API, with an actual GUI/theme in
    # place. No XML/header fixture writer and no private validity flags.
    project = NWProject()
    assert project.storage.createNewProject(SOURCE) == ProjectStorageCreate.READY
    project.setDefaultStatusImport()
    project.data.setName("DraftShelf Native Fixture")
    project.data.setAuthor("Synthetic test fixture")
    project.data.setDoBackup(False)
    project.data.setSpellCheck(False)
    roles = {}
    # Create roots out of final order, then use the native insertion position.
    roles["notes"] = project.newRoot(nwItemClass.CHARACTER)
    project.tree[roles["notes"]].setName("資料")
    roles["novel"] = project.newRoot(nwItemClass.NOVEL, pos=0)
    project.tree[roles["novel"]].setName("Novel")
    roles["part"] = project.newFolder("Part α", roles["novel"])
    roles["nested"] = project.newFolder("Nested", roles["part"])
    roles["empty_folder"] = project.newFolder("Empty", roles["novel"])

    def add(role, name, parent, text, note=False, active=True):
        handle = project.newFile(name, roles[parent])
        assert handle
        roles[role] = handle
        item = project.tree[handle]
        item.setLayout(nwItemLayout.NOTE if note else nwItemLayout.DOCUMENT)
        item.setActive(active)
        document = ProjectDocument(project, handle)
        assert document.writeDocument(text), document.error
        project.index.scanText(handle, text)

    add("two_headings", "Duplicate", "nested", "# First heading\n\nCafé by the river.\n\n## Second heading\n\n雪と星。 Both headings belong to one source document.\n")
    add("inactive_note", "Duplicate", "nested", "### Private planning note\n\n@tag: hidden-plan\n% Synopsis: Keep this exact line.\n\nInactive does not mean excluded.\n", note=True, active=False)
    add("parent_doc", "Parent", "part", "## Parent document\n\nThis document has its own child.\n")
    add("child_doc", "Child", "parent_doc", "### Child scene\n\n> Literal marker, not converted HTML.\n")
    add("unicode_note", "人物", "notes", "# 人物\n\n@tag: 星野\n\n名前は星野。 π ≠ 3.14\n", note=True)
    add("blank", "Blank", "notes", "", note=True)
    project.session.startSession()
    assert project.saveProject()
    project.closeProject()
    (E / "role-handles.json").write_text(json.dumps(roles, indent=2) + "\n")

    # Real, unchanged application handlers perform open, save, close/reopen.
    # These calls are native API/Qt integration automation, not human clicks.
    assert gui.openProject(SOURCE / "nwProject.nwx")
    pump()
    screen("01-native-project-open")
    first = enumerate_native(SHARED.project)
    (E / "native-open.json").write_text(json.dumps(first, ensure_ascii=False, indent=2) + "\n")
    for role in ("two_headings", "inactive_note", "child_doc", "unicode_note"):
        assert gui.openDocument(roles[role])
        screen("02-native-document-" + role)
    assert gui.saveProject()
    assert gui.closeProject(isYes=True)
    assert not SHARED.hasProject
    screen("03-native-project-closed")
    assert gui.openProject(SOURCE / "nwProject.nwx")
    pump()
    screen("04-native-project-reopened")
    reopened = enumerate_native(SHARED.project)
    assert reopened == first, "Official save/reopen changed tree or document body"
    (E / "native-reopened.json").write_text(json.dumps(reopened, ensure_ascii=False, indent=2) + "\n")
    assert gui.saveProject()
    assert gui.closeProject(isYes=True)
    pump()

    if pool := QThreadPool.globalInstance():
        assert pool.waitForDone(7000), "Native background work did not finish before immutability check"
    pump()

    # Hash every original project file around the independent exporter.
    # Native session maintenance occurs only before this immutable phase.
    before = hashes()
    output = E / "draft-shelf-export.zip"
    assert not output.exists()
    subprocess.run([sys.executable, "-m", "draft_shelf", str(SOURCE), str(output)], check=True)
    after = hashes()
    assert before == after, "Exporter mutated the original project"
    (E / "source-immutability.json").write_text(json.dumps({"unchanged": True, "before": before, "after": after}, indent=2) + "\n")
    (E / "native-result.json").write_text(json.dumps({"status": "pass", "version": __version__,
        "authoring": "Unmodified official NWProject and ProjectDocument APIs with real GuiMain",
        "consumer": "Real GuiMain native open/save/close/reopen handlers; official tree/document enumeration",
        "monkeypatches": False, "handwritten_native_xml": False, "ui_product_built": False}, indent=2) + "\n")
except Exception:
    traceback.print_exc()
    try:
        screen("FAILED-native-gate")
    except Exception:
        pass
    raise
finally:
    if pool := QThreadPool.globalInstance():
        pool.waitForDone(7000)
    gui.hide()
