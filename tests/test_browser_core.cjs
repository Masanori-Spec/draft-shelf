const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const C=require('../web/core.js');
require('../web/sample.js');
const enc=new TextEncoder(),R='a000000000001',D='b000000000001',X='c000000000001';
const clone=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,v.slice()]));
const text=u=>new TextDecoder().decode(u);
function doc(handle=D,body='# One\n\nText.\n\n## Two\n\n同じ文書。\n'){
 const meta={name:'Chapter',parent:R,handle,class:'NOVEL',layout:'DOCUMENT',textHash:'fixture',createdDate:'2026-10-06',updatedDate:'2026-10-06'};
 return enc.encode('+++\n'+Object.entries(meta).map(([k,v])=>k+' = '+JSON.stringify(v)).join('\n')+'\n+++\n'+body);
}
function fixture(label='Chapter'){
 return {'nwProject.nwx':enc.encode(`<?xml version="1.0" encoding="utf-8"?><novelWriterXML fileVersion="1.6" fileRevision="0"><project><name>Original fixture</name></project><settings/><content items="2"><item handle="${R}" parent="None" root="${R}" order="0" type="ROOT" class="NOVEL"><meta/><name>Novel</name></item><item handle="${D}" parent="${R}" root="${R}" order="0" type="FILE" class="NOVEL" layout="DOCUMENT"><meta/><name active="yes">${label}</name></item></content></novelWriterXML>`),['content/'+D+'.md']:doc()};
}
function mutate(f,old,value){f['nwProject.nwx']=enc.encode(text(f['nwProject.nwx']).replace(old,value));return f;}
function sample(){return Object.fromEntries(Object.entries(globalThis.DraftShelfSample).map(([k,v])=>[k,enc.encode(v)]));}
test('actual native sample: all original documents, folders and two headings',async()=>{
 const m=await C.inspect(sample());assert.equal(m.items.length,12);assert.equal(m.bodies.size,6);assert.equal(m.items.filter(i=>i.directory).length,7);
 const target=m.items.find(i=>i.bodyBytes===115);assert.ok(text(m.bodies.get(target.handle)).includes('## Second heading'));
 assert.equal(target.output,'0001-Novel/0001-Part α/0001-Nested/0001-Duplicate.md');
});
test('body bytes preserve CRLF, Unicode, empty bodies and literal markup',async()=>{
 for(const body of ['', '# 雪\r\n\r\nπ and café\r\n','<img src="https://example.invalid/">\n+++\n']){
  const f=fixture();f['content/'+D+'.md']=doc(D,body);const m=await C.inspect(f);assert.deepEqual(m.bodies.get(D),enc.encode(body));
 }
});
test('selection is explicit, preserves full traceability, and resets export acknowledgment',async()=>{
 const m=await C.inspect(sample()),all=[...m.bodies.keys()],chosen=all.slice(0,2);
 assert.throws(()=>C.planExport(m,all),/acknowledgment/);assert.throws(()=>C.planExport(m,[],{acknowledged:true}),/at least/);
 const review=C.review(m,chosen);assert.equal(review.manifest.selection.acknowledged,false);assert.equal(review.manifest.selection.excludedHandles.length,4);
 const plan=C.planExport(m,chosen,{acknowledged:true});assert.equal(Object.keys(plan.files).length,3);assert.equal(plan.manifest.items.length,12);assert.equal(plan.manifest.selection.acknowledged,true);
 assert.throws(()=>C.planExport(m,[all[0],all[0]],{acknowledged:true}));assert.throws(()=>C.planExport(m,['unknown'],{acknowledged:true}));
});
test('source bytes never change during inspection or export',async()=>{
 const source=sample(),copy=clone(source),m=await C.inspect(source);C.zip(C.planExport(m,[...m.bodies.keys()],{acknowledged:true}));assert.deepEqual(source,copy);
});
test('safe readable names retain Unicode and distinguish duplicate/case-equivalent labels',()=>{
 assert.equal(C.component('../CON:雪? ',0),'0001-_CON_雪_');assert.equal(C.component('Café 星野',1),'0002-Café 星野');
 assert.notEqual(C.component('same',0).toLowerCase(),C.component('SAME',1).toLowerCase());assert.ok(enc.encode(C.component('雪'.repeat(200),0)).length<=101);
 assert.equal(C.component('a\u202eb',0),'0001-a_b');
});
test('native header escaped strings and literal strings',()=>{
 let a=text(doc()).replace('name = "Chapter"',String.raw`name = "A\u96ea\U0001f642\tB"`);
 assert.equal(C.document(enc.encode(a),D).meta.name,'A雪🙂\tB');
 a=text(doc()).replace('name = "Chapter"',"name = 'A literal \\ path'");assert.equal(C.document(enc.encode(a),D).meta.name,'A literal \\ path');
});
const invalid=[
 ['duplicate handle',f=>mutate(f,`handle="${D}"`,`handle="${R}"`)],
 ['missing parent',f=>mutate(f,`parent="${R}"`,`parent="${X}"`)],
 ['cycle',f=>mutate(f,`parent="${R}"`,`parent="${D}"`)],
 ['wrong root',f=>mutate(f,`root="${R}" order="0" type="FILE"`,`root="${D}" order="0" type="FILE"`)],
 ['invalid order',f=>mutate(f,'order="0" type="FILE"','order="1" type="FILE"')],
 ['invalid type',f=>mutate(f,'type="FILE"','type="LINK"')],
 ['invalid class',f=>mutate(f,'class="NOVEL" layout','class="ALIEN" layout')],
 ['invalid layout',f=>mutate(f,'layout="DOCUMENT"','layout="ALIEN"')],
 ['empty layout',f=>mutate(f,'layout="DOCUMENT"','layout=""')],
 ['invalid active flag',f=>mutate(f,'active="yes"','active="maybe"')],
 ['empty active flag',f=>mutate(f,'active="yes"','active=""')],
 ['item count',f=>mutate(f,'items="2"','items="3"')],
 ['old version',f=>mutate(f,'fileVersion="1.6"','fileVersion="1.5"')],
 ['future revision',f=>mutate(f,'fileRevision="0"','fileRevision="1"')],
 ['metadata text',f=>mutate(f,'<meta/>','<meta>unknown</meta>')],
 ['unknown item field',f=>mutate(f,`handle="${D}"`,`surprise="1" handle="${D}"`)],
 ['invalid name whitespace',f=>mutate(f,'>Chapter<','>  Chapter <')],
 ['undeclared namespace',f=>mutate(f,'<settings/>','<settings><x:thing/></settings>')],
 ['missing content',f=>{delete f['content/'+D+'.md'];return f;}],
 ['orphan content',f=>{f['content/'+X+'.md']=doc(X);return f;}],
 ['legacy nwd',f=>{f['content/'+D+'.nwd']=f['content/'+D+'.md'];delete f['content/'+D+'.md'];return f;}],
 ['path traversal',f=>{f['../escape.md']=doc();return f;}],
 ['wrong header handle',f=>{f['content/'+D+'.md']=doc(X);return f;}],
 ['absent header',f=>{f['content/'+D+'.md']=enc.encode('# No header\n');return f;}],
 ['document BOM before header',f=>{f['content/'+D+'.md']=enc.encode('\ufeff'+text(doc()));return f;}],
 ['deep TOML array',f=>{f['content/'+D+'.md']=enc.encode('+++\nname = '+'['.repeat(1200)+'0'+']'.repeat(1200)+'\n+++\n');return f;}],
 ['oversized header',f=>{f['content/'+D+'.md']=enc.encode('+++\nname = "'+'x'.repeat(17000)+'"\n+++\n');return f;}],
 ['unknown header field',f=>{f['content/'+D+'.md']=enc.encode(text(doc()).replace('name =','unknown ='));return f;}],
 ['duplicate header key',f=>{f['content/'+D+'.md']=enc.encode(text(doc()).replace('parent =','name ='));return f;}],
 ['raw DEL in header',f=>{f['content/'+D+'.md']=enc.encode(text(doc()).replace('Chapter','Chap\u007fter'));return f;}],
 ['non-TOML assignment whitespace',f=>{f['content/'+D+'.md']=enc.encode(text(doc()).replace('name =','name\u00a0='));return f;}],
 ['non-TOML trailing whitespace',f=>{f['content/'+D+'.md']=enc.encode(text(doc()).replace('"Chapter"','"Chapter"\u00a0'));return f;}],
 ['triple-quoted header string',f=>{f['content/'+D+'.md']=enc.encode(text(doc()).replace('"Chapter"','"""Chapter"""'));return f;}],
 ['invalid scalar escape',f=>{f['content/'+D+'.md']=enc.encode(text(doc()).replace('"Chapter"','"\\uD800"'));return f;}],
 ['bad UTF-8 document',f=>{f['content/'+D+'.md']=Uint8Array.from([0xff,0xfe]);return f;}],
 ['DOCTYPE',f=>{f['nwProject.nwx']=enc.encode('<!DOCTYPE novelWriterXML>'+text(f['nwProject.nwx']));return f;}],
 ['entity subset',f=>mutate(f,'<settings/>','<!DOCTYPE x [<!ENTITY a "x">]><settings/>')],
 ['PI',f=>mutate(f,'<settings/>','<?thing value?><settings/>')],
 ['comment',f=>mutate(f,'<settings/>','<!--hidden--><settings/>')],
 ['raw invalid attribute',f=>mutate(f,'fileRevision="0"','fileRevision="<bad>"')],
 ['unknown XML entity',f=>mutate(f,'>Chapter<','>A&nbsp;B<')],
 ['invalid XML numeric entity',f=>mutate(f,'>Chapter<','>A&#0;B<')],
 ['BOM non-UTF8 declaration',f=>{f['nwProject.nwx']=enc.encode('\ufeff'+text(f['nwProject.nwx']).replace('utf-8','ISO-8859-1'));return f;}],
 ['declaration leading whitespace',f=>{f['nwProject.nwx']=enc.encode(' \n'+text(f['nwProject.nwx']));return f;}],
 ['uppercase declaration keyword',f=>mutate(f,'<?xml','<?XML')],
 ['non-XML declaration whitespace',f=>mutate(f,'<?xml ','<?xml\u00a0')],
 ['XML depth limit',f=>{f['nwProject.nwx']=enc.encode('<x>'.repeat(13)+'</x>'.repeat(13));return f;}],
 ['XML element limit',f=>{f['nwProject.nwx']=enc.encode('<x>'+'<y/>'.repeat(20000)+'</x>');return f;}],
 ['document byte limit',f=>{f['content/'+D+'.md']=new Uint8Array(C.LIMITS.document+1);return f;}],
 ['XML byte limit',f=>{f['nwProject.nwx']=new Uint8Array(C.LIMITS.xml+1);return f;}],
];
for(const [name,mutator]of invalid)test('reject '+name,async()=>{await assert.rejects(C.inspect(mutator(fixture())));});
test('UTF-8 BOM and XML numeric/predefined entities are accepted correctly',async()=>{
 const f=fixture('Caf&#233; &amp; 星');f['nwProject.nwx']=enc.encode('\ufeff'+text(f['nwProject.nwx']));assert.equal((await C.inspect(f)).items[1].name,'Café & 星');
});
test('combined byte and file-count limits are checked before parsing',async()=>{
 const f=fixture(),shared=new Uint8Array(C.LIMITS.document);for(let i=0;i<9;i++)f['content/'+i.toString(16).padStart(13,'0')+'.md']=shared;await assert.rejects(C.inspect(f),/32 MiB/);
 const many=fixture();for(let i=0;i<2048;i++)many['content/'+i.toString(16).padStart(13,'0')+'.md']=new Uint8Array();await assert.rejects(C.inspect(many),/Too many/);
});
test('native header byte boundary is exact',()=>{
 const raw=doc(),s=text(raw),headerBytes=Buffer.from(s).indexOf('\n+++\n',4)+1-4;
 const make=n=>enc.encode(s.replace('name = "Chapter"','name = "'+'x'.repeat(n)+'"'));
 const n=16384-headerBytes+7;assert.equal(C.document(make(n),D).meta.name.length,n);assert.throws(()=>C.document(make(n+1),D),/16 KiB/);
});
test('actual browser-core ZIP validates CRCs and exact body bytes with Python zipfile',async()=>{
 const m=await C.inspect(sample()),zip=C.zip(C.planExport(m,[...m.bodies.keys()],{acknowledged:true}));const dir=fs.mkdtempSync(path.join(os.tmpdir(),'draftshelf-'));
 try{const f=path.join(dir,'copy.zip');fs.writeFileSync(f,zip);const out=execFileSync('python3',['-c','import zipfile,sys,json;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;print(json.dumps({n:z.read(n).hex() for n in z.namelist() if n.endswith(".md")}))',f],{encoding:'utf8'});const values=JSON.parse(out);assert.equal(Object.keys(values).length,6);for(const i of m.items.filter(x=>x.type==='FILE'))assert.equal(values[i.output],Buffer.from(m.bodies.get(i.handle)).toString('hex'));}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('30 independent Python comparisons for Unicode/path/header/body cases',async()=>{
 const names=['Café','雪と星','Duplicate','../CON:?.','a\u202eb','Private\ue000','🙂 draft'];const cases=[];
 for(let i=0;i<30;i++){const f=fixture(names[i%names.length]);f['content/'+D+'.md']=doc(D,`# Case ${i}\n\nπ ${'文'.repeat(i)}\n\n## Kept together\n`);cases.push(f);}
 const request=cases.map(f=>Object.fromEntries(Object.entries(f).map(([k,v])=>[k,Buffer.from(v).toString('base64')])));
 const program='import json,sys,base64\nfrom draft_shelf.core import export_project\nr=[]\nfor f in json.load(sys.stdin):\n e=export_project({k:base64.b64decode(v) for k,v in f.items()});r.append({"items":e.manifest["items"],"dirs":e.directories,"xml":e.manifest["sourceXmlSha256"]})\nprint(json.dumps(r,ensure_ascii=False))';
 const native=JSON.parse(execFileSync('python3',['-c',program],{input:JSON.stringify(request),encoding:'utf8',cwd:path.resolve(__dirname,'..')}));
 for(let i=0;i<cases.length;i++){const m=await C.inspect(cases[i]);assert.deepEqual(JSON.parse(JSON.stringify(m.items)),native[i].items);assert.deepEqual(m.items.filter(x=>x.directory).map(x=>x.directory),native[i].dirs);assert.equal(m.sourceXmlSha256,native[i].xml);}
});
