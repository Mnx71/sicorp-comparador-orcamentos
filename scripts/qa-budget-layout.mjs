import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {groups,mapping} from '../testkit/grouped-spec.mjs';

const manifest=JSON.parse(fs.readFileSync('src/manifest.json'));
const out='qa/evidence/budget-layout';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,ignoreDefaultArgs:['--hide-scrollbars'],args:['--no-sandbox','--disable-dev-shm-usage','--disable-features=OverlayScrollbar'],...(process.env.SICORP_CHROMIUM_PATH?{executablePath:process.env.SICORP_CHROMIUM_PATH}:{})});
const context=await browser.newContext({viewport:{width:1600,height:1000}});
await context.setOffline(true);
const p=await context.newPage(),results=[],errors=[],requests=[];
p.on('pageerror',e=>errors.push(e.message));
p.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
const selectors={code:'projectCodeCol',source:'projectSourceCol',description:'projectDescCol',unit:'projectUnitCol',quantity:'projectQuantityCol',priceWithoutBdi:'projectWithoutBdiCol',bdi:'projectBdiCol',priceWithBdi:'projectWithBdiCol',totalWithBdi:'projectTotalWithBdiCol'};
try {
 await p.goto(pathToFileURL(path.resolve(manifest.output)).href);
 await p.click('#betaNoticeContinue');
 await p.setInputFiles('#projectFile',path.resolve('testkit/agrupados/orcamento-agrupado.xlsx'));
 await p.locator('#projectConfigArea:not(.hidden)').waitFor();
 for(const sheet of ['01_Revisao','02_Impedimentos']) {
  const g=groups.find(g=>g.name===sheet);
  await p.selectOption('#projectSheet',sheet);
  await p.fill('#projectHeaderRow',String(g.header));await p.locator('#projectHeaderRow').dispatchEvent('change');
  for(const [field,id] of Object.entries(selectors))await p.locator('#'+id).selectOption(String(mapping[field]),{force:true});
  await p.fill('#projectGeneralTotal',String(g.total));await p.click('#projectNextBtn');
  await p.locator('#budgetAuditDialog[open]').waitFor();
  // Resize the already open dialog, including a low desktop and a phone in landscape.
  for(const [width,height] of [[1600,1000],[1366,768],[1024,600],[800,450],[640,360],[390,844],[320,568]]) {
   await p.setViewportSize({width,height});
   for(const category of ['error','warning','discarded','blocker']) {
    await p.locator(`[data-budget-audit-filter="${category}"]`).click();
    const panel=p.locator(`[data-budget-audit-category-panel="${category}"]`);
    const wrap=panel.locator('.review-unified-wrap');
    if(await wrap.count()) {
     await wrap.evaluate(e=>e.scrollIntoView({block:'center',inline:'nearest'}));
     const geometry=await wrap.evaluate(e=>{
      e.scrollTop=e.scrollHeight;e.scrollLeft=e.scrollWidth;
      const r=e.getBoundingClientRect(),body=e.closest('.budget-audit-body'),b=body.getBoundingClientRect();
      const last=e.querySelector('tbody tr:last-child').getBoundingClientRect();
      return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,bodyTop:b.top,bodyBottom:b.bottom,clientHeight:e.clientHeight,scrollHeight:e.scrollHeight,scrollTop:e.scrollTop,clientWidth:e.clientWidth,scrollWidth:e.scrollWidth,scrollLeft:e.scrollLeft,lastBottom:last.bottom};
     });
     assert.ok(geometry.bottom<=geometry.bodyBottom+1,`${width}x${height}/${category}: barra horizontal cortada ${JSON.stringify(geometry)}`);
     assert.ok(geometry.top>=geometry.bodyTop-1,`${width}x${height}/${category}: início da tabela cortado`);
     assert.ok(geometry.lastBottom<=geometry.bottom+1,`${width}x${height}/${category}: última linha cortada`);
     assert.ok(geometry.scrollTop+geometry.clientHeight>=geometry.scrollHeight-1);
     assert.ok(geometry.scrollLeft+geometry.clientWidth>=geometry.scrollWidth-1);
     assert.ok(geometry.right<=width&&geometry.left>=0);
     // The global total finding is deliberately at the end of the error table.
     if(sheet==='01_Revisao'&&category==='error') {
      const last=panel.locator('tr.review-summary-row').last();
      await last.click();
      assert.match(await p.locator('#budgetAuditExplanation h3').innerText(),/Total geral diverge da soma auditada/);
      await p.locator('#budgetAuditDialog').screenshot({path:`${out}/${sheet}-${width}x${height}-tabela.png`});
     } else {
      const last=panel.locator('[data-budget-audit-row-key]').last();
      if(await last.count())await last.click();
     }
    }
    const action=p.locator('#budgetAuditExplanation .action');
    if(await action.count()) {
     await action.scrollIntoViewIfNeeded();
     const spacing=await action.evaluate(e=>{
      const a=e.getBoundingClientRect(),box=e.closest('#budgetAuditExplanation').getBoundingClientRect();
      return {bottom:box.bottom-a.bottom,top:a.top,bottomOnScreen:a.bottom};
     });
     assert.ok(spacing.bottom>=13,`${width}x${height}/${category}: explicação comprimida ${JSON.stringify(spacing)}`);
     assert.ok(spacing.top>=0&&spacing.bottomOnScreen<=height,`${width}x${height}/${category}: ação inacessível`);
     if(sheet==='01_Revisao'&&category==='error')await p.locator('#budgetAuditDialog').screenshot({path:`${out}/${sheet}-${width}x${height}-explicacao.png`});
    }
    await p.locator('#budgetAuditReturnBtn').scrollIntoViewIfNeeded();
    const bounds=await p.locator('#budgetAuditDialog').boundingBox();
    assert.ok(Math.abs(bounds.x)<=1&&Math.abs(bounds.y)<=1, 'Revisão deve começar no canto da tela');
    assert.ok(Math.abs(bounds.width-width)<=1&&Math.abs(bounds.height-height)<=1, 'Revisão deve ocupar toda a tela');
    results.push({sheet,width,height,category,status:'passed'});
   }
  }
  assert.equal(await p.locator('#budgetAuditCloseBtn').count(),0);
  await p.click('#budgetAuditReturnBtn');
  assert.equal(await p.locator('#budgetAuditDialog').evaluate(e=>e.open),false);
  await p.setViewportSize({width:1600,height:1000});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
} finally {
 fs.writeFileSync(`${out}/report.json`,JSON.stringify({date:new Date().toISOString(),version:manifest.version,browser:browser.version(),htmlSha256:createHash('sha256').update(fs.readFileSync(manifest.output)).digest('hex'),results,errors,requests},null,2)+'\n');
 await browser.close();
}
console.log(`${results.length} verificações de layout aprovadas.`);
