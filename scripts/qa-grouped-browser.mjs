import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {groups,runs,books,mapping} from '../testkit/grouped-spec.mjs';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const launch={headless:true,args:['--no-sandbox','--disable-dev-shm-usage']};
if(process.env.SICORP_CHROMIUM_PATH)launch.executablePath=process.env.SICORP_CHROMIUM_PATH;
const browser=await chromium.launch(launch),out='qa/evidence/grouped';fs.mkdirSync(out,{recursive:true});
const manifest=JSON.parse(fs.readFileSync('src/manifest.json'));
const results=[],errors=[],requests=[];
const selectors={code:'projectCodeCol',source:'projectSourceCol',description:'projectDescCol',unit:'projectUnitCol',quantity:'projectQuantityCol',priceWithoutBdi:'projectWithoutBdiCol',bdi:'projectBdiCol',priceWithBdi:'projectWithBdiCol',totalWithBdi:'projectTotalWithBdiCol'};
async function fresh() {
 const ctx=await browser.newContext({viewport:{width:1600,height:1000}});await ctx.setOffline(true);
 const p=await ctx.newPage();p.setDefaultTimeout(10000);
 p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
 p.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
 await p.goto(pathToFileURL(path.resolve(manifest.output)).href);await p.click('#betaNoticeContinue');return p;
}
async function budget(p,g,run) {
 await p.setInputFiles('#projectFile',path.resolve('testkit/agrupados/'+books[g.kind]));
 await p.locator('#projectConfigArea:not(.hidden)').waitFor();
 await p.selectOption('#projectSheet',g.name);await p.fill('#projectHeaderRow',String(g.header));await p.locator('#projectHeaderRow').dispatchEvent('change');
 for(const [field,id] of Object.entries(selectors)) {const col=(run?.mapping||g.mapping||mapping)[field];await p.locator('#'+id).selectOption(String(g.hiddenColumns.includes(col)?'':col??''),{force:true});}
 await p.fill('#projectGeneralTotal',String(run?run.total:g.total));await p.click('#projectNextBtn');
 if(run?.prerequisite||g.hiddenColumns.length) {
  assert.equal(await p.locator('#projectPrerequisiteMessage').isVisible(),true);
  assert.equal(await p.locator('#budgetAuditDialog').evaluate(e=>e.open),false);return {prerequisite:true};
 }
 await p.locator('#budgetAuditDialog[open]').waitFor();
 const a=await p.evaluate(()=>({accepted:state.budgetAuditBudget.items.length,codes:state.budgetAudit.findings.map(f=>f.code).sort(),canProceed:state.budgetAudit.canProceed,summary:state.budgetAudit.summary}));
 if(g.kind==='budget') {assert.deepEqual(a.codes,[...(run||g.expected).codes].sort());assert.equal(a.accepted,g.expected.accepted);assert.equal(a.canProceed,(run||g.expected).canProceed);}
 assert.equal(await p.locator('#budgetAuditProceedBtn').isEnabled(),a.canProceed);return a;
}
async function record(id,fn) {
 try{results.push({id,status:'passed',observed:await fn()});console.log('PASS '+id);}
 catch(e){results.push({id,status:'failed',error:e.message});throw e;}
}
async function baseConfig(p,sheet,source,file=books.base) {
 await p.setInputFiles('#baseFile',path.resolve('testkit/agrupados/'+file));await p.locator('#baseConfigArea:not(.hidden)').waitFor();
 await p.selectOption('#baseSheet',sheet);await p.selectOption('#baseSourceIdentifier',source.toLowerCase());
 const g=groups.find(g=>g.kind==='base'&&g.name===sheet);
 await p.fill('#baseHeaderRow',String(g?.header||1));await p.locator('#baseHeaderRow').dispatchEvent('change');
 for(const [id,col] of Object.entries({baseCodeCol:0,baseDescCol:1,baseUnitCol:2,baseValueCol:3}))await p.locator('#'+id).selectOption(String(col),{force:true});
}
try {
 for(const g of groups.filter(g=>g.kind==='budget'))await record('UI/'+g.name,async()=>{
  const p=await fresh(),a=await budget(p,g);
  if(['01_Revisao','02_Impedimentos','03_Formulas'].includes(g.name))await p.locator('#budgetAuditDialog').screenshot({path:`${out}/${g.name}.png`});
  await p.context().close();return a;
 });
 for(const run of runs)await record('UI/'+run.id,async()=>{const p=await fresh();const a=await budget(p,groups.find(g=>g.name===run.sheet),run);await p.context().close();return a;});
 for(const g of groups.filter(g=>g.kind==='base'))await record('UI/BASE/'+g.name,async()=>{
  const p=await fresh();await budget(p,groups.find(g=>g.name==='06_Controle'));await p.click('#budgetAuditProceedBtn');
  await baseConfig(p,g.name,'SINAPI');
  if(!g.expected.accepted) {assert.equal(await p.locator('#addBaseBtn').isDisabled(),true);await p.click('#baseReviewBtn');}
  else await p.click('#addBaseBtn');
  await p.locator('#reviewDialog[open]').waitFor();
  const review=await p.evaluate(()=>({reasons:state.reviewOccurrences.filter(r=>r.category==='discarded').map(r=>r.title),blockers:state.reviewOccurrences.filter(r=>r.category==='blocker').length}));
  assert.deepEqual([...review.reasons].sort(),[...g.expected.reasons].sort());
  assert.equal(review.blockers,g.expected.conflicts);
  const rendered=await p.locator('#reviewDialog').textContent();
  for(const reason of new Set(review.reasons))assert.ok(rendered.includes(reason),`Motivo não renderizado: ${reason}`);
  if(g.expected.accepted) {await p.click('#reviewConfirmAddBtn');assert.equal(await p.evaluate(()=>state.conflicts.length),g.expected.conflicts);
   if(g.expected.conflicts) {await p.click('#basesNextBtn');await p.locator('#blockingDialog[open]').waitFor();}
  }
  await p.context().close();return {reasons:review.reasons,conflicts:review.blockers};
 });
 for(const g of groups.filter(g=>g.kind==='comparison'))await record('UI/CMP/'+g.name,async()=>{
  const p=await fresh();await budget(p,g);await p.click('#budgetAuditProceedBtn');
  for(const source of ['SINAPI','ORSE'].filter(source=>g.rows.some(r=>r[1]===source))) {
   await baseConfig(p,source,source,books.comparison);await p.click('#addBaseBtn');await p.locator('#reviewDialog[open]').waitFor();await p.click('#reviewConfirmAddBtn');
  }
  await p.click('#basesNextBtn');await p.fill('#tolerance',String(g.tolerance));await p.click('#compareBtn');
  await p.waitForFunction(n=>state.results.length===n,g.expected.statuses.length);
  const a=await p.evaluate(()=>({statuses:state.results.map(r=>r.statusKey),abc:[...curveAbcClassMap(state.results).values()]}));
  assert.deepEqual(a.statuses,g.expected.statuses);if(g.expected.abc)assert.deepEqual(a.abc,g.expected.abc);
  await p.locator('#resultTable').screenshot({path:`${out}/${g.name}.png`});await p.context().close();return a;
 });
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
}finally {
 const inputs=Object.fromEntries(Object.values(books).map(f=>[f,createHash('sha256').update(fs.readFileSync('testkit/agrupados/'+f)).digest('hex')]));
 fs.writeFileSync(`${out}/browser-report.json`,JSON.stringify({date:new Date().toISOString(),version:manifest.version,browser:browser.version(),platform:process.platform,node:process.version,htmlSha256:createHash('sha256').update(fs.readFileSync(manifest.output)).digest('hex'),inputs,results,errors,requests},null,2)+'\n');
 await browser.close();
}
console.log(`${results.length} verificações agrupadas no HTML efetivo.`);
