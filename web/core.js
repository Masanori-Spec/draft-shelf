/* Independent original browser reader; does not call or translate Python code. */
(function (root) {
  'use strict';
  const LIMITS = Object.freeze({xml:2097152,document:4194304,total:33554432,items:2048,depth:32,header:16384});
  const HANDLE=/^[0-9a-f]{13}$/;
  const CLASSES=new Set('NOVEL PLOT CHARACTER WORLD TIMELINE OBJECT ENTITY CUSTOM ARCHIVE TEMPLATE TRASH'.split(' '));
  const META=['name','parent','handle','class','layout','textHash','createdDate','updatedDate'];
  const encoder=new TextEncoder();
  function fail(code,message){const e=new Error(message);e.code=code;throw e;}
  function need(ok,code,message){if(!ok)fail(code,message);}
  function decode(data){try{return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(data);}catch(e){fail('ENCODING','Expected valid UTF-8');}}
  async function sha(data){const bytes=await root.crypto.subtle.digest('SHA-256',data);return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');}
  const xmlSpace=s=>/^[\t\r\n ]*$/.test(s);
  const scalar=n=>Number.isInteger(n)&&n>=0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff);
  const xmlChar=n=>n===9||n===10||n===13||(n>=32&&n<=0xd7ff)||(n>=0xe000&&n<=0xfffd)||(n>=0x10000&&n<=0x10ffff);

  // Small incremental XML tokenizer. Bounds apply before a new node is kept.
  function xmlTree(data){
    need(data.length<=LIMITS.xml,'SIZE','Project XML exceeds 2 MiB');
    let text=decode(data).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
    for(const c of text)need(xmlChar(c.codePointAt(0)),'XML','Invalid XML character');
    const declaration=/^<\?xml[\t\n ]+version[\t\n ]*=[\t\n ]*(['"])(?:1\.0|1\.1)\1(?:[\t\n ]+encoding[\t\n ]*=[\t\n ]*(['"])(?:[uU][tT][fF]-?8)\2)?(?:[\t\n ]+standalone[\t\n ]*=[\t\n ]*(['"])(?:yes|no)\3)?[\t\n ]*\?>/;
    text=text.replace(declaration,'');
    need(!/<!|<\?/.test(text),'XML_META','DTD, comments and processing instructions are unsupported');
    let p=0,count=0,top=null;const stack=[];
    const white=()=>{while(p<text.length&&/[\t\n ]/.test(text[p]))p++;};
    const name=()=>{const m=/^[A-Za-z_][A-Za-z0-9_.-]*/.exec(text.slice(p));need(m,'XML','Invalid or unsupported XML name');p+=m[0].length;return m[0];};
    const entity=s=>{
      need(!s.includes('<')&&!s.includes(']]>'),'XML','Invalid XML text');
      return s.replace(/&([^;]*);|&/g,(whole,ref)=>{
        const names={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};
        if(Object.hasOwn(names,ref))return names[ref];
        let n;if(/^#[0-9]+$/.test(ref||''))n=Number(ref.slice(1));else if(/^#x[0-9a-fA-F]+$/.test(ref||''))n=parseInt(ref.slice(2),16);
        need(xmlChar(n),'XML_META','Unknown or invalid XML entity');return String.fromCodePoint(n);
      });
    };
    while(p<text.length){
      if(text[p]!=='<'){
        const end=text.indexOf('<',p),q=end<0?text.length:end,value=entity(text.slice(p,q));p=q;
        if(stack.length){const n=stack.at(-1);if(n.children.length)n.children.at(-1).tail+=value;else n.text+=value;}
        else need(xmlSpace(value),'XML','Text outside the root element');
        continue;
      }
      p++;
      if(text[p]==='/'){p++;const tag=name();white();need(text[p++]==='>'&&stack.length&&stack.at(-1).tag===tag,'XML','Mismatched close tag');stack.pop();continue;}
      const tag=name(),attrs=Object.create(null);
      need(++count<=20000&&stack.length<12,'XML_LIMIT','XML element/depth limit exceeded');
      let selfClose=false;
      while(true){
        const before=p;white();
        if(text[p]==='>'){p++;break;}
        if(text[p]==='/'&&text[p+1]==='>'){p+=2;selfClose=true;break;}
        need(p>before,'XML','Missing attribute whitespace');const key=name();need(!Object.hasOwn(attrs,key),'XML','Duplicate attribute');
        need(key!=='xmlns','XML','XML namespaces are unsupported');white();need(text[p++]==='=','XML','Missing attribute equals');white();
        const quote=text[p++];need(quote==='"'||quote==="'",'XML','Expected a quoted attribute');const end=text.indexOf(quote,p);need(end>=p,'XML','Unclosed attribute');
        attrs[key]=entity(text.slice(p,end).replace(/[\t\n]/g,' '));p=end+1;
        need(Object.keys(attrs).length<=64,'XML_LIMIT','Too many XML attributes');
      }
      const node={tag,attrs,children:[],text:'',tail:''};
      if(stack.length)stack.at(-1).children.push(node);else{need(!top,'XML','Multiple root elements');top=node;}
      if(!selfClose)stack.push(node);
    }
    need(top&&stack.length===0,'XML','Unclosed or empty XML');return top;
  }

  function tomlString(value){
    const quote=value[0];need(quote==='"'||quote==="'",'HEADER','Native header values must be strings');
    need(!value.startsWith(quote.repeat(3)),'HEADER','Multiline string syntax is unsupported');
    let out='',p=1,closed=false;
    while(p<value.length){
      let c=value[p++];if(c===quote){closed=true;break;}
      need(c==='\t'||(c.charCodeAt(0)>=32&&c.charCodeAt(0)!==127),'HEADER','Invalid string control character');
      if(quote==='"'&&c==='\\'){
        c=value[p++];const escapes={b:'\b',t:'\t',n:'\n',f:'\f',r:'\r','"':'"','\\':'\\'};
        if(Object.hasOwn(escapes,c))out+=escapes[c];
        else if(c==='u'||c==='U'){
          const size=c==='u'?4:8,hex=value.slice(p,p+size);need(new RegExp('^[0-9a-fA-F]{'+size+'}$').test(hex),'HEADER','Invalid Unicode escape');p+=size;
          const n=parseInt(hex,16);need(scalar(n),'HEADER','Invalid Unicode scalar');out+=String.fromCodePoint(n);
        }else fail('HEADER','Unsupported string escape');
      }else out+=c;
    }
    need(closed&&/^[ \t]*(?:#.*)?$/.test(value.slice(p)),'HEADER','Malformed flat native string');return out;
  }

  function document(data,handle){
    need(data.length<=LIMITS.document,'SIZE','Document exceeds 4 MiB');decode(data);
    const lines=[];let p=0,end=null,firstEnd=0;
    for(let n=0;n<21&&p<data.length;n++){
      const start=p;let stop=data.indexOf(10,p);stop=stop<0?data.length:stop+1;
      const line=decode(data.slice(p,stop)).replace(/\r?\n$/,'');lines.push(line);p=stop;
      if(n===0)firstEnd=p;
      if(n>0&&line==='+++'){need(start-firstEnd<=LIMITS.header,'HEADER','Native header exceeds 16 KiB');end=p;break;}
      need(p-firstEnd<=LIMITS.header,'HEADER','Native header exceeds 16 KiB');
    }
    need(lines[0]==='+++'&&end!==null,'HEADER','Missing or unterminated native TOML header');
    const meta=Object.create(null);
    for(const line of lines.slice(1,-1)){
      need(!/[\u0000-\u0008\u000b-\u001f\u007f]/.test(line),'HEADER','Invalid header control character');
      const m=/^([A-Za-z][A-Za-z0-9]*)[ \t]*=[ \t]*(.*)$/.exec(line);need(m&&!Object.hasOwn(meta,m[1]),'HEADER','Malformed or duplicate native header field');meta[m[1]]=tomlString(m[2]);
    }
    need(Object.keys(meta).length===8&&META.every(k=>Object.hasOwn(meta,k)),'HEADER','Unsupported native header fields');
    need(meta.handle===handle,'HEADER','Content/header handle mismatch');return {meta,body:data.slice(end)};
  }

  const nativeWhitespace=/[\u0009-\u000d\u001c-\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/gu;
  function component(label,order){
    let text=label.replace(/[\/\\:<>"|?*]|[\p{Cc}\p{Cf}\p{Cs}]/gu,'_').replace(/^[ .]+|[ .]+$/g,'')||'Untitled';
    let points=Array.from(text);while(encoder.encode(points.join('')).length>96)points.pop();text=points.join('');
    return String(order+1).padStart(4,'0')+'-'+text;
  }

  async function inspect(inputs){
    const entries=Object.entries(inputs);need(entries.length<=LIMITS.items+1,'LIMIT','Too many input files');
    let total=0;for(const [path,data]of entries){need(data instanceof Uint8Array,'INPUT','Expected file bytes');total+=data.length;need(path==='nwProject.nwx'||/^content\/[0-9a-f]{13}\.md$/.test(path),'PATH','Unsupported content path or legacy format');}
    need(total<=LIMITS.total,'SIZE','Input exceeds 32 MiB');need(Object.hasOwn(inputs,'nwProject.nwx'),'MISSING','Missing nwProject.nwx');
    const xml=xmlTree(inputs['nwProject.nwx']),a=xml.attrs;
    need(xml.tag==='novelWriterXML'&&a.fileVersion==='1.6'&&a.fileRevision==='0','VERSION','Only novelWriter project 1.6 revision 0 is supported');
    need(xml.children.map(x=>x.tag).join(',')==='project,settings,content','STRUCTURE','Unsupported project sections');
    const content=xml.children[2];need(content.children.length>0&&content.children.length<=LIMITS.items&&content.attrs.items===String(content.children.length),'LIMIT','Invalid content item count');
    const items=new Map(),groups=new Map([[null,[]]]);
    const children=h=>{if(!groups.has(h))groups.set(h,[]);return groups.get(h);};
    for(const n of content.children){
      need(n.tag==='item'&&n.children.map(x=>x.tag).join(',')==='meta,name','STRUCTURE','Unsupported item structure');const a=n.attrs;
      need(Object.keys(a).every(k=>['handle','parent','root','order','type','class','layout'].includes(k)),'STRUCTURE','Unsupported item attribute');
      need(HANDLE.test(a.handle||'')&&!items.has(a.handle),'HANDLE','Duplicate or invalid handle');
      const parent=a.parent==='None'?null:a.parent;need(['ROOT','FOLDER','FILE'].includes(a.type)&&CLASSES.has(a.class),'TYPE','Unsupported item type/class');
      need(a.type==='ROOT'?parent===null:HANDLE.test(parent||''),'PARENT','Invalid parent handle');need(/^(?:0|[1-9][0-9]{0,4})$/.test(a.order||''),'ORDER','Invalid sibling order');
      const meta=n.children[0],name=n.children[1],label=name.text;
      need(!name.children.length&&Array.from(label).length<=512,'NAME','Invalid item label');need(label===label.split(nativeWhitespace).filter(Boolean).join(' '),'NAME','Noncanonical label whitespace');
      need(!meta.children.length&&xmlSpace(meta.text)&&xmlSpace(n.text)&&n.children.every(c=>xmlSpace(c.tail)),'STRUCTURE','Unsupported item metadata/text');
      const layout=a.layout??'NO_LAYOUT';need((a.type==='FILE'?['DOCUMENT','NOTE']:['NO_LAYOUT']).includes(layout),'LAYOUT','Unsupported layout');
      const active=name.attrs.active??'no';need(['yes','no'].includes(active),'ACTIVE','Invalid active flag');
      const item={handle:a.handle,parent,root:a.root,order:Number(a.order),type:a.type,class:a.class,layout,name:label,active:active==='yes',sourceAttributes:{...a},sourceNameAttributes:{...name.attrs},sourceMetaAttributes:{...meta.attrs}};
      items.set(item.handle,item);children(parent).push(item);
    }
    for(const [parent,list]of groups){need(parent===null||items.has(parent),'PARENT','Parent does not exist');list.sort((a,b)=>a.order-b.order);need(list.every((x,i)=>x.order===i),'ORDER','Duplicate or noncontiguous sibling order');}
    need(children(null).length,'PARENT','Missing root');const seen=new Set(),ordered=[];
    function visit(item,base,rootHandle,depth){
      need(!seen.has(item.handle)&&depth<=LIMITS.depth,'CYCLE','Cycle or excessive hierarchy depth');need(item.root===rootHandle&&item.class===items.get(rootHandle).class,'ROOT','Inconsistent root');seen.add(item.handle);
      const stem=base+component(item.name,item.order);need(encoder.encode(stem).length<=900,'PATH','Export path too long');const child=children(item.handle);
      item.directory=item.type!=='FILE'||child.length?stem+'/':null;
      item.output=item.type==='FILE'?(child.length?stem+'/_document.md':stem+'.md'):null;
      ordered.push(item);for(const next of child)visit(next,stem+'/',rootHandle,depth+1);
    }
    for(const r of children(null))visit(r,'',r.handle,1);
    need(ordered.length===items.size,'CYCLE','Cycle or disconnected tree');need(ordered.every((x,i)=>x.handle===Array.from(items.keys())[i]),'ORDER','Conflicting XML traversal/order');
    const docs=ordered.filter(x=>x.type==='FILE');need(entries.length===docs.length+1,'CONTENT','Missing or orphaned content');
    const bodies=new Map();
    for(const item of docs){
      const source='content/'+item.handle+'.md';need(Object.hasOwn(inputs,source),'MISSING','Missing document content');const raw=inputs[source],d=document(raw,item.handle);
      Object.assign(item,{source,sourceSha256:await sha(raw),bodySha256:await sha(d.body),bodyBytes:d.body.length,documentHeader:d.meta});bodies.set(item.handle,d.body);
    }
    return {items:ordered,bodies,sourceXmlSha256:await sha(inputs['nwProject.nwx']),totalBytes:total,
      title:xml.children[0].children.find(n=>n.tag==='name')?.text||'Untitled project'};
  }

  function review(model,handles){
    const selected=new Set(handles),docs=model.items.filter(i=>i.type==='FILE');
    need(selected.size===handles.length&&handles.every(h=>model.bodies.has(h)),'SELECTION','Choose valid source documents');
    const files=Object.create(null),items=model.items.map(i=>({...i,...(i.type==='FILE'?{included:selected.has(i.handle)}:{})}));
    for(const i of docs)if(selected.has(i.handle))files[i.output]=model.bodies.get(i.handle);
    const manifest={product:'DraftShelf',sourceFormat:'novelWriter 1.6 revision 0',sourceXmlSha256:model.sourceXmlSha256,
      bodyPolicy:'Exact UTF-8 source bytes after native TOML header; no heading rebuild or rendering',
      selection:{mode:selected.size===docs.length?'all':'explicit',acknowledged:false,includedHandles:docs.filter(i=>selected.has(i.handle)).map(i=>i.handle),excludedHandles:docs.filter(i=>!selected.has(i.handle)).map(i=>i.handle)},
      included:'Every selected document body; all original folder paths and traceability labels retained',
      notTransferred:['Native project settings, indexes, session history and build settings','Native editability or round-trip metadata'],items};
    files['draftshelf-manifest.json']=encoder.encode(JSON.stringify(manifest,null,2)+'\n');
    return {files,directories:model.items.filter(i=>i.directory).map(i=>i.directory),manifest};
  }
  function planExport(model,handles,{acknowledged=false}={}){
    need(acknowledged,'ACK','Review acknowledgment is required');need(handles.length>0,'SELECTION','Choose at least one source document');
    const plan=review(model,handles);plan.manifest.selection.acknowledged=true;
    plan.files['draftshelf-manifest.json']=encoder.encode(JSON.stringify(plan.manifest,null,2)+'\n');return plan;
  }
  const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
  function crc32(data){let n=0xffffffff;for(const byte of data)n=crcTable[(n^byte)&255]^(n>>>8);return (n^0xffffffff)>>>0;}
  function concat(chunks){const out=new Uint8Array(chunks.reduce((n,c)=>n+c.length,0));let p=0;for(const c of chunks){out.set(c,p);p+=c.length;}return out;}
  function zip(plan){
    const local=[],central=[];let offset=0;
    const entries=[...plan.directories.map(n=>[n,new Uint8Array()]),...Object.entries(plan.files)];
    need(entries.length<=4096,'LIMIT','Too many output entries');
    for(const [name,data]of entries){
      const n=encoder.encode(name),crc=crc32(data),date=(46<<9)|(10<<5)|6;
      const h=new Uint8Array(30),v=new DataView(h.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,2048,true);v.setUint16(12,date,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,n.length,true);
      local.push(h,n,data);const c=new Uint8Array(46),w=new DataView(c.buffer);w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint16(8,2048,true);w.setUint16(14,date,true);w.setUint32(16,crc,true);w.setUint32(20,data.length,true);w.setUint32(24,data.length,true);w.setUint16(28,n.length,true);w.setUint32(38,name.endsWith('/')?16:0,true);w.setUint32(42,offset,true);central.push(c,n);offset+=h.length+n.length+data.length;
    }
    const cd=concat(central),end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,entries.length,true);v.setUint16(10,entries.length,true);v.setUint32(12,cd.length,true);v.setUint32(16,offset,true);return concat([...local,cd,end]);
  }
  const api=Object.freeze({LIMITS,inspect,review,planExport,zip,sha,component,document,xmlTree});root.DraftShelfCore=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
