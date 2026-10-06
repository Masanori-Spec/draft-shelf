import copy
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
import zipfile

from draft_shelf.core import InvalidProject, export_project, split_document, MAX_DOCUMENT, MAX_XML
from draft_shelf.__main__ import main

ROOT = "a000000000001"
DOC = "b000000000001"
CHILD = "c000000000001"


def document(h=DOC, body=b"# One\n\nLiteral body.\n\n## Two\n\nStill one file.\n"):
    meta = {"name": "A", "parent": ROOT, "handle": h, "class": "NOVEL", "layout": "DOCUMENT", "textHash": hashlib.sha1(body).hexdigest(), "createdDate": "2026-10-06", "updatedDate": "2026-10-06"}
    return ("+++\n" + "\n".join(k + " = " + json.dumps(v) for k, v in meta.items()) + "\n+++\n").encode() + body


def fixture():
    x = ET.Element("novelWriterXML", fileVersion="1.6", fileRevision="0", appVersion="26.2.1")
    ET.SubElement(x, "project")
    ET.SubElement(x, "settings")
    c = ET.SubElement(x, "content", items="2")
    for h,p,o,t,n in [(ROOT,"None","0","ROOT","Novel"),(DOC,ROOT,"0","FILE","Chapter")]:
        a = {"handle":h,"parent":p,"root":ROOT,"order":o,"type":t,"class":"NOVEL"}
        if t == "FILE": a["layout"] = "DOCUMENT"
        i=ET.SubElement(c,"item",a);ET.SubElement(i,"meta");ET.SubElement(i,"name",active="yes").text=n
    return {"nwProject.nwx":ET.tostring(x),f"content/{DOC}.md":document()}


def change(files, action):
    x=ET.fromstring(files["nwProject.nwx"]);action(x);files["nwProject.nwx"]=ET.tostring(x);return files


class CoreTests(unittest.TestCase):
    def reject(self, files):
        with self.assertRaises(InvalidProject): export_project(files)

    def test_body_not_split_on_two_headings(self):
        f=fixture(); before=copy.deepcopy(f); r=export_project(f)
        self.assertEqual(r.files["0001-Novel/0001-Chapter.md"],split_document(f[f"content/{DOC}.md"],DOC)[1])
        self.assertEqual(len(r.files),2);self.assertEqual(f,before)

    def test_body_bytes_crlf_unicode_blank(self):
        for b in [b"", "# 雪\r\n\r\nπ and café\r\n".encode(),b"+++\nnot a header\n"]:
            f=fixture();f[f"content/{DOC}.md"]=document(body=b)
            self.assertEqual(export_project(f).files["0001-Novel/0001-Chapter.md"],b)

    def test_inactive_note_included(self):
        f=change(fixture(),lambda x:(x.find(".//item[@type='FILE']").set("layout","NOTE"),x.find(".//item[@type='FILE']/name").set("active","no")))
        r=export_project(f);self.assertFalse(r.manifest["items"][1]["active"]);self.assertEqual(len(r.files),2)

    def test_document_children_have_body_file(self):
        f=fixture()
        def add(x):
            c=x.find("content");n=copy.deepcopy(c[1]);n.set("handle",CHILD);n.set("parent",DOC);n.find("name").text="Child";c.append(n);c.set("items","3")
        change(f,add);f[f"content/{CHILD}.md"]=document(CHILD,b"Child\n")
        r=export_project(f);self.assertIn("0001-Novel/0001-Chapter/_document.md",r.files);self.assertIn("0001-Novel/0001-Chapter/0001-Child.md",r.files)

    def test_duplicate_names_preserved_by_order(self):
        f=fixture()
        def add(x):
            c=x.find("content");n=copy.deepcopy(c[1]);n.set("handle",CHILD);n.set("order","1");c.append(n);c.set("items","3")
        change(f,add);f[f"content/{CHILD}.md"]=document(CHILD,b"Second\n")
        self.assertEqual(list(export_project(f).files)[:2],["0001-Novel/0001-Chapter.md","0001-Novel/0002-Chapter.md"])

    def test_safe_paths_keep_original_label_in_manifest(self):
        name='../CON:雪? '
        f=change(fixture(),lambda x:x.find(".//item[@type='FILE']/name").__setattr__("text",name.strip()))
        r=export_project(f);p=next(iter(r.files));self.assertNotIn('/../',p);self.assertNotIn(':',p);self.assertEqual(r.manifest['items'][1]['name'],name.strip())

    def test_empty_folder_preserved(self):
        f=fixture();f.pop(f"content/{DOC}.md")
        change(f,lambda x:(x.find(".//item[@type='FILE']").set("type","FOLDER"),x.find(".//item[@type='FOLDER']").attrib.pop("layout")))
        self.assertIn("0001-Novel/0001-Chapter/",export_project(f).directories)

    def test_invalid_parent(self): self.reject(change(fixture(),lambda x:x.find(".//item[@type='FILE']").set("parent",CHILD)))
    def test_cycle(self): self.reject(change(fixture(),lambda x:x.find(".//item[@type='FILE']").set("parent",DOC)))
    def test_duplicate_handle(self): self.reject(change(fixture(),lambda x:x.find(".//item[@type='FILE']").set("handle",ROOT)))
    def test_wrong_root(self): self.reject(change(fixture(),lambda x:x.find(".//item[@type='FILE']").set("root",DOC)))
    def test_bad_order(self): self.reject(change(fixture(),lambda x:x.find(".//item[@type='FILE']").set("order","2")))
    def test_conflicting_xml_traversal_order(self):
        def swap(x):
            c=x.find('content');first=c[0];c.remove(first);c.append(first)
        self.reject(change(fixture(),swap))
    def test_missing_content(self):
        f=fixture();f.pop(f"content/{DOC}.md");self.reject(f)
    def test_orphan_content(self):
        f=fixture();f[f"content/{CHILD}.md"]=document(CHILD);self.reject(f)
    def test_legacy_format(self): self.reject(change(fixture(),lambda x:x.set("fileVersion","1.5")))
    def test_future_revision(self): self.reject(change(fixture(),lambda x:x.set("fileRevision","1")))
    def test_metadata_text_rejected(self): self.reject(change(fixture(),lambda x:x.find('.//meta').__setattr__('text','unsupported payload')))
    def test_legacy_nwd(self):
        f=fixture();f[f"content/{DOC}.nwd"]=f.pop(f"content/{DOC}.md");self.reject(f)
    def test_xml_entity_utf16_pi_comment(self):
        for prefix in ['<!DOCTYPE novelWriterXML [<!ENTITY x "A">]>','<?danger x?>','<!-- comment -->']:
            f=fixture();f['nwProject.nwx']=prefix.encode()+f['nwProject.nwx'];self.reject(f)
        f=fixture();f['nwProject.nwx']=f['nwProject.nwx'].decode().encode('utf-16');self.reject(f)
    def test_bom_does_not_bypass_encoding_declaration(self):
        f=fixture();f['nwProject.nwx']=b'\xef\xbb\xbf<?xml version="1.0" encoding="ISO-8859-1"?>'+f['nwProject.nwx'];self.reject(f)
        f=fixture();f['nwProject.nwx']=b'\xef\xbb\xbf<?xml version="1.0" encoding="UTF-8"?>'+f['nwProject.nwx'];self.assertEqual(len(export_project(f).files),2)
    def test_invalid_content_header(self):
        for raw in [b'no header',b'+++\ninvalid = \n+++\n',document(CHILD),b'+++\n'+b'x\n'*21+b'+++\n']:
            f=fixture();f[f'content/{DOC}.md']=raw;self.reject(f)
    def test_toml_nesting_and_header_bytes_bounded(self):
        for raw in [b'+++\nname = '+b'['*1200+b'0'+b']'*1200+b'\n+++\n',b'+++\nname = "'+b'x'*16384+b'"\n+++\n']:
            f=fixture();f[f'content/{DOC}.md']=raw;self.reject(f)
    def test_toml_control_whitespace_and_triple_string_rejections(self):
        for old,new in [(b'"A"',b'"A\x7f"'),(b'name =',b'name\xc2\xa0='),(b'"A"',b'"A"\xc2\xa0'),(b'"A"',b'"""A"""')]:
            f=fixture();f[f'content/{DOC}.md']=f[f'content/{DOC}.md'].replace(old,new);self.reject(f)
    def test_size_bounds(self):
        f=fixture();f[f'content/{DOC}.md']=b'x'*(MAX_DOCUMENT+1);self.reject(f)
        f=fixture();f['nwProject.nwx']=b'x'*(MAX_XML+1);self.reject(f)
    def test_xml_limits_apply_during_parse(self):
        for raw in [b'<x>'*13+b'</x>'*13,b'<x>'+b'<y/>'*20000+b'</x>']:
            f=fixture();f['nwProject.nwx']=raw
            with self.assertRaisesRegex(InvalidProject,'nesting or element'):
                export_project(f)
    def test_cli_fifo_rejected_without_blocking(self):
        with tempfile.TemporaryDirectory() as td:
            base=Path(td);src=base/'project';(src/'content').mkdir(parents=True)
            (src/'nwProject.nwx').write_bytes(fixture()['nwProject.nwx'])
            os.mkfifo(src/f'content/{DOC}.md')
            result=subprocess.run([sys.executable,'-m','draft_shelf',str(src),str(base/'out.zip')],capture_output=True,timeout=3)
            self.assertEqual(result.returncode,2)
            self.assertIn(b'not a regular file',result.stderr)
            self.assertFalse((base/'out.zip').exists())
    def test_cli_immutable_exclusive_and_symlink(self):
        with tempfile.TemporaryDirectory() as td:
            base=Path(td);src=base/'project';(src/'content').mkdir(parents=True)
            f=fixture()
            for p,b in f.items():(src/p).write_bytes(b)
            out=base/'out.zip';self.assertEqual(main([str(src),str(out)]),0)
            with zipfile.ZipFile(out) as z:self.assertEqual(z.read('0001-Novel/0001-Chapter.md'),split_document(f[f'content/{DOC}.md'],DOC)[1])
            self.assertEqual({p:(src/p).read_bytes() for p in f},f)
            self.assertEqual(main([str(src),str(out)]),2)
            self.assertEqual(main([str(src),str(src/'inside.zip')]),2)
            doc=src/f'content/{DOC}.md';doc.unlink();doc.symlink_to(base/'out.zip')
            self.assertEqual(main([str(src),str(base/'again.zip')]),2)


if __name__=='__main__':unittest.main()
