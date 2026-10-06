(function(){
  'use strict';
  const C=globalThis.DraftShelfCore,$=id=>document.getElementById(id),enc=new TextEncoder();
  const words={
    ja:{skip:'本文へ移動',local:'ローカル処理・通信なし',headline:'原稿を、ひとつずつ。',intro:'novelWriter の構成と本文を、読みやすいフォルダーへ。見出しで分割せず、元の文書をそのまま残します。',heroNote:'構成を選ぶ。\n本文を確かめる。\nコピーを持ち出す。',scope:'本文のコピー専用。標準 Markdown への変換や、元のプロジェクトへの書き戻しは行いません。',sourceStep:'SOURCE',sourceTitle:'閉じたプロジェクトを選ぶ',sourceHelp:'nwProject.nwx と content 内の .md を読み込みます。キャッシュや履歴はコピーしません。',choose:'フォルダーを選ぶ',orDrop:'または、プロジェクト XML と文書ファイルをまとめてドロップ',sample:'サンプルで試す',clear:'クリア',ready:'ファイルはこのブラウザの中だけで処理されます。',loading:'選択したファイルを、このブラウザ内で確認しています…',loaded:'文書を確認しました。選択内容と出力先を確認してください。',reviewStep:'REVIEW',reviewTitle:'元の文書と、出力先を確かめる',selectedLabel:'選択した本文',documentLabel:'元の文書',directoryLabel:'出力フォルダー',treeTitle:'プロジェクトの構成',selectAll:'全選択',selectNone:'解除',treeHelp:'本文のチェックを外すと、その本文だけを除外します。名前を選ぶとプレビューできます。',categoryTitle:'含める本文を確認',notes:'ノート',inactive:'非アクティブ',previewCaption:'SOURCE TEXT / NO RENDERING',previewFoot:'本文は表示のために変換しません。書き出すバイト列も元のままです。',mappingTitle:'すべての出力先',mappingHelp:'番号は元の並び順です。子を持つ文書は同名フォルダーの _document.md に入ります。出力名の調整は本文を変えません。',thIncluded:'本文',thSource:'元のラベル',thPath:'出力パス',thBytes:'バイト',exportStep:'COPY',exportTitle:'確認したコピーを書き出す',retainedWarning:'除外した本文は ZIP に入りません。構成・元の名前・メタデータは、確認用 manifest に残ります。',copyLimit:'これは本文と構成のコピーです。設定・履歴を含む完全なバックアップとしては、元のプロジェクトを保管してください。',ack:'選択した本文、除外した本文、出力名とレポートに残る情報を確認しました。',download:'コピー ZIP を書き出す',report:'JSON レポート',print:'確認表を印刷',limitsTitle:'範囲を小さく、コピーを確かに。',limitsText:'XML 2 MiB・文書ごと 4 MiB・合計 32 MiB・最大 2048 項目。古い .nwd 形式、欠けた本文、重複した識別子、不正な親子関係は読み込めません。ZIP の本文は novelWriter の記法をそのまま残します。',footer:'原稿を勝手に組み替えない、小さなコピー道具。',sourceLink:'ソースと検証記録',included:'含める',excluded:'除外',folder:'フォルダー',folderBody:'この項目はフォルダーです。本文はありません。元の階層を出力に残します。',empty:'空の本文（0 バイト）',adjusted:'ファイル名を調整',sourceFile:'元ファイル',preview:'プレビュー',downloaded:'コピー ZIP を書き出しました。元のプロジェクトは変更していません。',selectionEmpty:'本文を1つ以上選び、確認欄にチェックしてください。',reportSaved:'確認用 JSON レポートを書き出しました。',ignored:'設定・履歴など、本文以外の選択ファイルは読みません。',unsupportedFolder:'フォルダー内に nwProject.nwx が1つ必要です。ZIP や古い .nwd 形式は対象外です。',locked:'プロジェクトのロックファイルがあります。novelWriter で保存して閉じてから、もう一度選んでください。',bad:'読み込めません。対応形式・ファイル数・本文と構成の整合性を確認してください。',sizeError:'サイズまたは項目数の上限を超えています。ファイルの内容は書き換えていません。',encodingError:'UTF-8 のファイルが必要です。文字コードの変換は行いません。',pathError:'読み込み対象のパスが不正、または曖昧です。1つのプロジェクトだけを選んでください。',versionError:'novelWriter のプロジェクト形式 1.6 revision 0 だけが対象です。',headerError:'文書の TOML ヘッダーが不正、未対応、または識別子と一致しません。',missingError:'参照される本文が不足しているか、構成にない本文が混在しています。'},
    en:{skip:'Skip to main content',local:'Local files · no network',headline:'Keep each draft intact.',intro:'Take your novelWriter source into a readable folder tree. Keep original documents together, with their full text and order.',heroNote:'Choose the structure.\nCheck the source.\nTake a readable copy.',scope:'A source-text copy. No conversion to standard Markdown and no editing back into the original project.',sourceStep:'SOURCE',sourceTitle:'Choose a closed project',sourceHelp:'Reads nwProject.nwx and the .md files in content. Caches and session history stay outside the copy.',choose:'Choose project folder',orDrop:'Or drop the project XML and document files together',sample:'Try the sample',clear:'Clear',ready:'Files are processed inside this browser only.',loading:'Checking selected files inside this browser…',loaded:'Source documents checked. Review the selection and output paths.',reviewStep:'REVIEW',reviewTitle:'Check the source and its destination',selectedLabel:'selected bodies',documentLabel:'source documents',directoryLabel:'output folders',treeTitle:'Original project tree',selectAll:'Select all',selectNone:'Clear selection',treeHelp:'Uncheck a document to omit only its body. Select a name to preview its source.',categoryTitle:'Review included bodies',notes:'Notes',inactive:'Inactive',previewCaption:'SOURCE TEXT / NO RENDERING',previewFoot:'Source is displayed as text. Export keeps its original body bytes.',mappingTitle:'Every output path',mappingHelp:'Numbers preserve the original order. A document with children uses _document.md inside its named folder. Filename adjustments do not alter body text.',thIncluded:'Body',thSource:'Original label',thPath:'Output path',thBytes:'Bytes',exportStep:'COPY',exportTitle:'Export the copy you reviewed',retainedWarning:'Excluded body text stays out of the ZIP. Structure, original labels and metadata remain in the traceability manifest.',copyLimit:'This is a copy of source text and structure. Keep the original project for a full backup of settings and history.',ack:'I reviewed included and excluded bodies, output names, and the information retained in the report.',download:'Export copy ZIP',report:'JSON report',print:'Print review',limitsTitle:'A small scope. A faithful copy.',limitsText:'2 MiB XML · 4 MiB per document · 32 MiB total · 2048 items. Legacy .nwd files, missing bodies, duplicate handles and invalid hierarchies are rejected. Exported text retains novelWriter source syntax.',footer:'A small copy tool that keeps your drafts together.',sourceLink:'Source and verification',included:'Included',excluded:'Excluded',folder:'Folder',folderBody:'This item is a folder with no body. Its place in the original hierarchy is retained.',empty:'Empty source body (0 bytes)',adjusted:'Filename adjusted',sourceFile:'Source file',preview:'Preview',downloaded:'Copy ZIP exported. The original project was not changed.',selectionEmpty:'Select at least one body and acknowledge the review.',reportSaved:'Review JSON exported.',ignored:'Selected settings/history files are not read.',unsupportedFolder:'Choose one project containing nwProject.nwx. ZIP and legacy .nwd input are unsupported.',locked:'A project lock file is present. Save and close the project in novelWriter, then choose it again.',bad:'Cannot read this project. Check the supported format, input limits and tree/content consistency.',sizeError:'An input size or item limit was exceeded. No source file was changed.',encodingError:'Files must be UTF-8. Character encodings are not converted.',pathError:'Input paths are invalid or ambiguous. Select exactly one project.',versionError:'Only novelWriter project format 1.6 revision 0 is supported.',headerError:'A native TOML header is malformed, unsupported, or does not match its handle.',missingError:'A referenced document is missing, or an orphaned document is present.'}
  };
  let lang='ja',model=null,selected=new Set(),active=null,revision=0,busy=false,lastError=null,statusKey='ready';
  const t=k=>words[lang][k]||k;
  const groupFilters={notes:i=>i.layout==='NOTE',inactive:i=>!i.active,archive:i=>i.class==='ARCHIVE',trash:i=>i.class==='TRASH'};
  const docs=()=>model?model.items.filter(i=>i.type==='FILE'):[];
  const issue=(code,message)=>{const e=new Error(message||code);e.code=code;throw e;};
  function errorText(error){const k={SIZE:'sizeError',LIMIT:'sizeError',XML_LIMIT:'sizeError',ENCODING:'encodingError',PATH:'pathError',VERSION:'versionError',HEADER:'headerError',MISSING:'missingError',CONTENT:'missingError',FOLDER:'unsupportedFolder',LOCK:'locked'}[error.code]||'bad';return t(k);}
  function status(key){statusKey=key;$('status').textContent=t(key);}
  function language(next){lang=next;document.documentElement.lang=lang;$('lang-ja').setAttribute('aria-pressed',String(lang==='ja'));$('lang-en').setAttribute('aria-pressed',String(lang==='en'));for(const n of document.querySelectorAll('[data-i18n]'))n.textContent=t(n.dataset.i18n);$('file-input').setAttribute('aria-label',t('choose'));$('tree').setAttribute('aria-label',t('treeTitle'));$('status').textContent=t(statusKey);if(lastError)$('error').textContent=errorText(lastError);if(model)renderModel();}
  function reset(){model=null;selected=new Set();active=null;lastError=null;$('error').hidden=true;$('workbench').hidden=true;$('ack').checked=false;$('download').disabled=true;$('tree').replaceChildren();$('mapping-rows').replaceChildren();for(const id of ['body-preview','project-title','preview-heading','preview-source','preview-bytes','mapping-count'])$(id).textContent='';for(const id of ['selected-count','document-count','directory-count'])$(id).textContent='0';document.body.dataset.state='empty';}
  function clear(){revision++;busy=false;reset();$('file-input').value='';status('ready');}
  function invalidateAck(){$('ack').checked=false;}

  function normalize(files){
    if(!files.length)return null;
    if(files.length>4096)issue('LIMIT');
    const records=files.map(file=>({file,path:file.webkitRelativePath||file.name}));
    for(const r of records)if(!r.path||r.path.startsWith('/')||/^[A-Za-z]:/.test(r.path)||r.path.includes('\\')||r.path.split('/').some(x=>!x||x==='.'||x==='..')||/[\u0000-\u001f]/.test(r.path))issue('PATH');
    const projects=records.filter(r=>r.path==='nwProject.nwx'||r.path.endsWith('/nwProject.nwx'));
    if(projects.length!==1)issue('FOLDER');
    const prefix=projects[0].path.slice(0,-'nwProject.nwx'.length),map=new Map(),flattened=!prefix&&records.every(r=>!r.path.includes('/'));
    if(records.some(r=>r.path===prefix+'nwProject.lock'))issue('LOCK');
    for(const r of records){
      let key=null;
      if(r.path===prefix+'nwProject.nwx')key='nwProject.nwx';
      else if(flattened)key='content/'+r.path;
      else if(r.path.startsWith(prefix+'content/'))key=r.path.slice(prefix.length);
      else if(!r.path.startsWith(prefix))issue('PATH');
      if(key){if(map.has(key))issue('PATH');if(key!=='nwProject.nwx'&&!/^content\/[0-9a-f]{13}\.md$/.test(key))issue('PATH');map.set(key,r.file);}
    }
    let size=0;if(map.size>C.LIMITS.items+1)issue('LIMIT');
    for(const [path,file]of map){if(file.size>(path==='nwProject.nwx'?C.LIMITS.xml:C.LIMITS.document))issue('SIZE');size+=file.size;}
    if(size>C.LIMITS.total)issue('SIZE');return map;
  }
  async function loadFiles(files){
    const token=++revision;reset();busy=true;document.body.dataset.state='loading';status('loading');
    try{
      const map=normalize(Array.from(files));if(!map){busy=false;document.body.dataset.state='empty';status('ready');return;}
      const input=Object.create(null);
      for(const [name,file]of map){const data=await file.arrayBuffer();if(token!==revision)return;input[name]=new Uint8Array(data);}
      const result=await C.inspect(input);if(token!==revision)return;
      model=result;selected=new Set(docs().map(i=>i.handle));active=docs()[0]?.handle||model.items[0]?.handle;busy=false;document.body.dataset.state='ready';status('loaded');renderModel();
    }catch(error){if(token!==revision)return;busy=false;lastError=error;$('error').textContent=errorText(error);$('error').hidden=false;document.body.dataset.state='error';status('ready');}
  }
  function depth(item){let n=0,p=item.parent;const map=new Map(model.items.map(i=>[i.handle,i]));while(p){n++;p=map.get(p).parent;}return n;}
  function setActive(handle){active=handle;renderPreview();for(const row of $('tree').children){row.classList.toggle('current',row.dataset.handle===active);row.querySelector('button').setAttribute('aria-pressed',String(row.dataset.handle===active));}}
  function renderTree(){
    const fragment=document.createDocumentFragment();
    for(const item of model.items){
      const row=document.createElement('div');row.className='tree-row';row.dataset.handle=item.handle;row.style.setProperty('--depth',String(depth(item)));
      if(item.type==='FILE'){
        const check=document.createElement('input');check.type='checkbox';check.checked=selected.has(item.handle);check.dataset.handle=item.handle;check.setAttribute('aria-label',t('included')+': '+item.output);
        check.addEventListener('change',()=>{check.checked?selected.add(item.handle):selected.delete(item.handle);invalidateAck();renderSelection();});row.append(check);
      }else{const space=document.createElement('span');space.className='placeholder';row.append(space);}
      const button=document.createElement('button');button.type='button';button.dataset.preview=item.handle;button.setAttribute('aria-label',t('preview')+': '+(item.output||item.directory));button.setAttribute('aria-pressed',String(item.handle===active));
      const icon=document.createElement('span');icon.className=item.type==='FILE'?'file-icon':'folder-icon';icon.setAttribute('aria-hidden','true');const label=document.createElement('span');label.textContent=item.name||'Untitled';button.append(icon,label);
      button.addEventListener('click',()=>setActive(item.handle));button.addEventListener('keydown',event=>{const all=[...$('tree').querySelectorAll('button')],index=all.indexOf(button);let target;if(event.key==='ArrowDown')target=Math.min(all.length-1,index+1);if(event.key==='ArrowUp')target=Math.max(0,index-1);if(event.key==='Home')target=0;if(event.key==='End')target=all.length-1;if(target!==undefined){event.preventDefault();all[target].focus();setActive(all[target].dataset.preview);}});row.append(button);
      const badge=document.createElement('small');badge.textContent=item.type==='FILE'?(item.class==='TRASH'?'Trash':item.class==='ARCHIVE'?'Archive':!item.active?t('inactive'):item.layout==='NOTE'?t('notes'):''):'';row.append(badge);row.classList.toggle('current',item.handle===active);fragment.append(row);
    }
    $('tree').replaceChildren(fragment);
  }
  function renderPreview(){
    const item=model.items.find(i=>i.handle===active);if(!item)return;
    $('preview-heading').textContent=item.name||'Untitled';$('preview-source').textContent=item.source||item.directory;
    const file=item.type==='FILE';$('body-preview').hidden=!file;$('folder-preview').hidden=file;$('folder-preview').textContent=t('folderBody');
    $('preview-bytes').textContent=file?String(item.bodyBytes)+' B':t('folder');
    $('body-preview').textContent=file?(item.bodyBytes?new TextDecoder('utf-8',{ignoreBOM:true}).decode(model.bodies.get(item.handle)):t('empty')):'';
  }
  function renderSelection(){
    $('selected-count').textContent=String(selected.size);$('download').disabled=busy||!selected.size||!$('ack').checked;
    for(const input of $('tree').querySelectorAll('input'))input.checked=selected.has(input.dataset.handle);
    for(const [key,filter]of Object.entries(groupFilters)){const members=docs().filter(filter),n=members.filter(i=>selected.has(i.handle)).length,control=$('group-'+key);control.disabled=!members.length;control.checked=members.length>0&&n===members.length;control.indeterminate=n>0&&n<members.length;$('count-'+key).textContent='('+members.length+')';}
    const fragment=document.createDocumentFragment();
    for(const item of docs()){
      const included=selected.has(item.handle),row=document.createElement('tr');row.dataset.handle=item.handle;if(!included)row.className='excluded';
      for(const [className,value]of [['included',t(included?'included':'excluded')],['source',item.name],['path',item.output],['bytes',String(item.bodyBytes)]]){const cell=document.createElement('td');cell.className=className;cell.textContent=value;if(className==='source'&&C.component(item.name,item.order)!==String(item.order+1).padStart(4,'0')+'-'+item.name){const note=document.createElement('small');note.className='adjusted';note.textContent=t('adjusted');cell.append(note);}row.append(cell);}fragment.append(row);
    }
    $('mapping-rows').replaceChildren(fragment);$('mapping-count').textContent=selected.size+' / '+docs().length+' '+t('documentLabel');
  }
  function renderModel(){
    $('workbench').hidden=false;$('project-title').textContent=model.title;$('document-count').textContent=String(docs().length);$('directory-count').textContent=String(model.items.filter(i=>i.directory).length);renderTree();renderPreview();renderSelection();
  }
  function save(data,name,type){const blob=new Blob([data],{type}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.hidden=true;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  $('lang-ja').addEventListener('click',()=>language('ja'));$('lang-en').addEventListener('click',()=>language('en'));
  $('choose').addEventListener('click',()=>$('file-input').click());$('file-input').addEventListener('change',()=>loadFiles($('file-input').files));$('clear').addEventListener('click',clear);
  $('sample').addEventListener('click',()=>{const files=Object.entries(globalThis.DraftShelfSample).map(([path,text])=>{const f=new File([enc.encode(text)],path.split('/').at(-1),{type:'text/plain'});Object.defineProperty(f,'webkitRelativePath',{value:'DraftShelf sample/'+path});return f;});loadFiles(files);});
  for(const event of ['dragenter','dragover'])$('drop-zone').addEventListener(event,e=>{e.preventDefault();$('drop-zone').classList.add('dragging');});
  $('drop-zone').addEventListener('dragleave',()=>$('drop-zone').classList.remove('dragging'));$('drop-zone').addEventListener('drop',e=>{e.preventDefault();$('drop-zone').classList.remove('dragging');loadFiles(e.dataTransfer.files);});
  $('select-all').addEventListener('click',()=>{if(model){selected=new Set(docs().map(i=>i.handle));invalidateAck();renderSelection();}});$('select-none').addEventListener('click',()=>{selected.clear();invalidateAck();if(model)renderSelection();});
  for(const [key,filter]of Object.entries(groupFilters))$('group-'+key).addEventListener('change',e=>{for(const item of docs().filter(filter))e.target.checked?selected.add(item.handle):selected.delete(item.handle);invalidateAck();renderSelection();});
  $('ack').addEventListener('change',()=>{if(model)renderSelection();});
  $('download').addEventListener('click',()=>{if(!model||busy||!selected.size||!$('ack').checked)return;const plan=C.planExport(model,[...selected],{acknowledged:$('ack').checked});save(C.zip(plan),'draft-shelf-copy.zip','application/zip');status('downloaded');});
  $('report').addEventListener('click',()=>{if(!model||busy)return;const report=C.review(model,[...selected]).manifest;report.selection.acknowledged=$('ack').checked;save(JSON.stringify(report,null,2)+'\n','draft-shelf-review.json','application/json');status('reportSaved');});
  $('print').addEventListener('click',()=>window.print());language('ja');
})();
