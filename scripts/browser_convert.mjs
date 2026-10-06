// Only real file input, selection controls, acknowledgment and browser downloads.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {openApp,loadNative,saveDownload,E} from './browser_common.mjs';
const app=await openApp(),{page}=app;
try{
 await page.locator('#lang-en').click();await loadNative(page);
 assert.equal(await page.locator('#document-count').textContent(),'8');assert.equal(await page.locator('#selected-count').textContent(),'8');assert.equal(await page.locator('#download').isDisabled(),true);
 await page.screenshot({path:path.join(E,'browser-native-all-review.png'),fullPage:true});
 await page.locator('#ack').check();await saveDownload(page,'#download','draft-shelf-export.zip');await saveDownload(page,'#report','browser-all-review.json');
 await page.locator('#group-inactive').uncheck();await page.locator('#group-archive').uncheck();await page.locator('#group-trash').uncheck();
 assert.equal(await page.locator('#selected-count').textContent(),'5');assert.equal(await page.locator('#ack').isChecked(),false);assert.equal(await page.locator('#download').isDisabled(),true);
 await page.screenshot({path:path.join(E,'browser-native-selected-review.png'),fullPage:true});
 await page.locator('#ack').check();await saveDownload(page,'#download','draft-shelf-selected.zip');await saveDownload(page,'#report','browser-selected-review.json');
 assert.deepEqual(app.errors,[]);assert.deepEqual(app.network,[]);
 const files={};for(const n of ['draft-shelf-export.zip','draft-shelf-selected.zip','browser-all-review.json','browser-selected-review.json'])files[n]=crypto.createHash('sha256').update(await fs.readFile(path.join(E,n))).digest('hex');
 await fs.writeFile(path.join(E,'browser-download-result.json'),JSON.stringify({status:'pass',producer:'actual packaged offline browser file input and downloads',noNetworkRequests:true,files},null,2)+'\n');
 console.log('Actual offline browser ZIPs retained for native/literal/Python checks');
}finally{await app.browser.close();}
