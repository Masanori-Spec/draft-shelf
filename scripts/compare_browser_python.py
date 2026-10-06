"""Compare actual browser ZIP against the separate original Python reader."""
import hashlib
import json
from pathlib import Path
import sys
import zipfile
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from draft_shelf.core import export_project

E=Path('evidence');source=E/'native-project'
inputs={'nwProject.nwx':(source/'nwProject.nwx').read_bytes()}
inputs.update({f'content/{p.name}':p.read_bytes() for p in(source/'content').glob('*.md')})
independent=export_project(inputs)
with zipfile.ZipFile(E/'draft-shelf-export.zip')as z:
    assert z.testzip() is None
    assert set(z.namelist())==set(independent.files)|set(independent.directories)
    for name,data in independent.files.items():
        if name!='draftshelf-manifest.json':assert z.read(name)==data,name
    manifest=json.loads(z.read('draftshelf-manifest.json'))
    assert manifest['sourceXmlSha256']==independent.manifest['sourceXmlSha256']
    assert len(manifest['items'])==len(independent.manifest['items'])
    for browser,python in zip(manifest['items'],independent.manifest['items']):
        browser.pop('included',None)
        assert browser==python
(E/'browser-python-parity.json').write_text(json.dumps({'status':'pass','independentImplementation':True,
    'exactBodiesPathsDirectoriesMetadata':True,'documents':len(independent.files)-1},indent=2)+'\n')
