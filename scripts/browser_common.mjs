import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
export const E=path.resolve('evidence');
export const NATIVE=path.join(E,'native-project');
export async function openApp(){
 const browser=await chromium.launch({chromiumSandbox:true});
 try{
  const commands=execFileSync('ps',['-eo','pid=,ppid=,args='],{encoding:'utf8'}).split('\n').filter(line=>{const m=line.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/);return m&&Number(m[2])===process.pid&&/chrome(?:-headless-shell)?(?:\s|$)/.test(m[3]);});
  assert.equal(commands.length,1,'Expected one observable Chromium main process');assert.ok(!commands[0].includes('--no-sandbox')&&!commands[0].includes('--disable-setuid-sandbox'));
  let records=[];try{records=JSON.parse(await fs.readFile(path.join(E,'browser-launches.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  records.push({script:path.basename(process.argv[1]),chromiumSandbox:true,command:commands[0].trim()});await fs.writeFile(path.join(E,'browser-launches.json'),JSON.stringify(records,null,2)+'\n');
 }catch(error){await browser.close();throw error;}
 const context=await browser.newContext({viewport:{width:1440,height:1040},acceptDownloads:true});await context.setOffline(true);const page=await context.newPage();page.setDefaultTimeout(10000);
 const errors=[],network=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
 await page.goto(pathToFileURL(path.join(E,'offline-app/index.html')).href);await page.locator('#sample').waitFor();return {browser,context,page,errors,network};
}
export async function ready(page){await page.waitForFunction(()=>document.body.dataset.state==='ready');}
export async function loadNative(page){await page.locator('#file-input').setInputFiles(NATIVE);await ready(page);}
export async function saveDownload(page,button,name){
 const dest=path.join(E,name);await assert.rejects(fs.stat(dest),{code:'ENOENT'});const pending=page.waitForEvent('download');await page.locator(button).click();const d=await pending;await d.saveAs(dest);assert.ok((await fs.stat(dest)).size>0);return dest;
}
export async function dropSample(page,{xmlReplace=null,body=null,delay=0}={}){
 await page.evaluate(({xmlReplace,body,delay})=>{
  const transfer=new DataTransfer();for(let [name,text]of Object.entries(globalThis.DraftShelfSample)){
   if(name==='nwProject.nwx'&&xmlReplace)text=text.replace(xmlReplace[0],xmlReplace[1]);
   if(body!==null&&name.endsWith('.md')){const p=text.indexOf('\n+++\n',4);text=text.slice(0,p+5)+body;}
   const f=new File([text],name.split('/').at(-1),{type:'text/plain'});if(delay)Object.defineProperty(f,'_testDelay',{value:delay});transfer.items.add(f);
  }
  document.getElementById('drop-zone').dispatchEvent(new DragEvent('drop',{dataTransfer:transfer,bubbles:true}));
 },{xmlReplace,body,delay});
}
