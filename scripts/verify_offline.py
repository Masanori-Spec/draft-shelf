"""Verify the exact shipped bundle and materialize it for every browser test."""
from pathlib import Path
import hashlib,json,stat,zipfile
root=Path(__file__).resolve().parents[1]
expected={'index.html','web/core.js','web/app.js','web/sample.js','web/style.css','README-OFFLINE.txt'}
manifest=json.loads((root/'offline-manifest.json').read_text());archive=root/'draft-shelf-offline.zip'
assert set(manifest['files'])==expected
assert hashlib.sha256(archive.read_bytes()).hexdigest()==manifest['zip_sha256']
output=root/'evidence/offline-app';output.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(archive)as z:
    assert len(z.infolist())==len(expected)and set(z.namelist())==expected
    assert sum(i.file_size for i in z.infolist())<1048576
    for info in z.infolist():
        assert not stat.S_ISLNK(info.external_attr>>16)
        data=z.read(info.filename);assert hashlib.sha256(data).hexdigest()==manifest['files'][info.filename]
        assert data==(root/info.filename).read_bytes()
        dest=output/info.filename;assert output.resolve()in dest.resolve().parents
        dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
(root/'evidence/offline-package-result.json').write_text(json.dumps({'status':'pass','zip_sha256':manifest['zip_sha256'],'files':manifest['files'],'browserAppRoot':'evidence/offline-app'},indent=2)+'\n')
print('Exact shipped offline ZIP verified and materialized')
