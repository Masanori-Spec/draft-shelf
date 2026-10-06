"""Hosted-only real novelWriter GUI/classes; no monkeypatch or fake parser."""
from __future__ import annotations

import hashlib
import importlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import traceback

import enchant
from PyQt6.QtCore import QThreadPool, QTimer
from PyQt6.QtWidgets import QApplication, QLabel, QTreeView
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

def stage(name):
    print("NATIVE_STAGE: " + name, flush=True)
    (E / "native-stage.json").write_text(json.dumps({"stage":name}) + "\n")


def timed_out():
    # A real modal runs its own Qt event loop, so this captures its actual
    # pixels without suppressing it or replacing its return value.
    if screen := app.primaryScreen():
        screen.grabWindow(0).save(str(E / "FAILED-native-timeout.png"))
    windows = [{"title":w.windowTitle(), "class":type(w).__name__,
                "labels":[x.text() for x in w.findChildren(QLabel)]}
               for w in app.topLevelWidgets() if w.isVisible()]
    (E / "FAILED-native-windows.json").write_text(json.dumps(windows, ensure_ascii=False, indent=2)+"\n")
    print("Native gate exceeded its 90-second deadline", flush=True)
    os._exit(124)


stage("initialize official GUI")
assert enchant.dict_exists("en_GB"), "Official distro English dictionary is required"

app = QApplication(["novelWriter native feasibility"])
app.setStyle("Fusion")
watchdog = QTimer()
watchdog.setSingleShot(True)
watchdog.timeout.connect(timed_out)
watchdog.start(90000)
CONFIG.initConfig(E / "profile", E / "profile")
CONFIG.loadConfig()
CONFIG.initLocalisation(app)
CONFIG.backupOnClose = False
CONFIG.guiLocale = "en_GB"
CONFIG.spellLanguage = "en_GB"
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
        persisted = item.pack()
        row = {"handle": item.itemHandle, "parent": item.itemParent, "root": item.itemRoot,
               "order": project.tree.subTreePos(item.itemHandle), "name": item.itemName, "type": item.itemType.name,
               "class": item.itemClass.name,
               # Folder layout/active defaults exist in memory but are not
               # serialized. Use the official serializer for persisted meaning.
               "layout": persisted["itemAttr"].get("layout", "NO_LAYOUT"),
               "active": persisted["nameAttr"].get("active", "no") == "yes",
               "runtimeLayout": item.itemLayout.name, "runtimeActive": item.isActive}
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
    stage("author native fixture through official APIs")
    project = NWProject()
    assert project.storage.createNewProject(SOURCE) == ProjectStorageCreate.READY
    # Give the native fixture its own project identity before emitting tree
    # signals; an empty identity would also match the GUI's unopened project.
    project.data.setUuid("e813ac77-9420-4cde-b316-27182a46431a")
    project.setDefaultStatusImport()
    project.data.setName("DraftShelf Native Fixture")
    project.data.setAuthor("Synthetic test fixture")
    project.data.setDoBackup(False)
    project.data.setSpellCheck(False)
    project.data.setSpellLang("en_GB")
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
    roles["archive"] = project.newRoot(nwItemClass.ARCHIVE)
    add("archived_doc", "Archived", "archive", "## Archived draft\n\nArchived text is included unless explicitly excluded.\n")
    # The official loader creates this system root if absent. Author it through
    # the native API so the first and reopened project contain the same nodes.
    roles["trash"] = project.newRoot(nwItemClass.TRASH)
    add("trash_doc", "Discarded", "trash", "## Discarded draft\n\nTrash text is still source text.\n")
    project.session.startSession()
    assert project.saveProject()
    project.closeProject()
    (E / "role-handles.json").write_text(json.dumps(roles, indent=2) + "\n")

    # Real, unchanged application handlers perform open, save, close/reopen.
    # These calls are native API/Qt integration automation, not human clicks.
    stage("open API-authored fixture in real GUI")
    assert gui.openProject(SOURCE / "nwProject.nwx")
    pump()
    screen("01-native-project-open")
    first = enumerate_native(SHARED.project)
    (E / "native-open.json").write_text(json.dumps(first, ensure_ascii=False, indent=2) + "\n")
    for role in ("two_headings", "inactive_note", "child_doc", "unicode_note", "archived_doc", "trash_doc"):
        assert gui.openDocument(roles[role])
        screen("02-native-document-" + role)
    stage("save and close native GUI project")
    assert gui.saveProject()
    assert gui.closeProject(isYes=True)
    assert not SHARED.hasProject
    screen("03-native-project-closed")
    stage("reopen native GUI project")
    assert gui.openProject(SOURCE / "nwProject.nwx")
    pump()
    screen("04-native-project-reopened")
    reopened = enumerate_native(SHARED.project)
    (E / "native-reopened.json").write_text(json.dumps(reopened, ensure_ascii=False, indent=2) + "\n")
    assert reopened == first, "Official save/reopen changed tree or document body"
    assert gui.saveProject()
    assert gui.closeProject(isYes=True)
    pump()

    if pool := QThreadPool.globalInstance():
        assert pool.waitForDone(7000), "Native background work did not finish before immutability check"
    pump()

    # Hash every original project file around the independent exporter.
    # Native session maintenance occurs only before this immutable phase.
    stage("export closed project and check immutable source")
    before = hashes()
    assert not (E / "draft-shelf-export.zip").exists()
    # Only actual packaged offline UI downloads produce the tested ZIPs.
    subprocess.run(["node", "scripts/browser_test.mjs"], check=True)
    subprocess.run(["node", "scripts/browser_convert.mjs"], check=True)
    subprocess.run([sys.executable, "scripts/compare_browser_python.py"], check=True)
    after = hashes()
    assert before == after, "Exporter mutated the original project"
    (E / "source-immutability.json").write_text(json.dumps({"unchanged": True, "before": before, "after": after}, indent=2) + "\n")
    (E / "native-result.json").write_text(json.dumps({"status": "pass", "version": __version__,
        "authoring": "Unmodified official NWProject and ProjectDocument APIs with real GuiMain",
        "consumer": "Real GuiMain native open/save/close/reopen handlers; official tree/document enumeration",
        "monkeypatches": False, "handwritten_native_xml": False,
        "producer": "Actual packaged offline browser UI downloads"}, indent=2) + "\n")
    watchdog.stop()
    stage("native gate complete")
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
