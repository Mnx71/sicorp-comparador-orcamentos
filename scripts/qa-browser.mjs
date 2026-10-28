import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {cases,mapping} from '../testkit/spec.mjs';
import {spreadsheetRuntime} from '../tests/helpers/core.mjs';
const require=createRequire(import.meta.url);
let playwright;
try {playwright=require('playwright');} catch {playwright=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'));}
const manifest=JSON.parse(fs.readFileSync('src/manifest.json'));
const output='qa/evidence/browser';fs.mkdirSync(output,{recursive:true});
const launch={headless:true,args:['--no-sandbox','--disable-dev-shm-usage']};
if(process.env.SICORP_CHROMIUM_PATH) launch.executablePath=process.env.SICORP_CHROMIUM_PATH;
const browser=await playwright.chromium.launch(launch);
const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
await context.setOffline(true);
await context.addInitScript(()=>{
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{globalThis.__copied=text;}}});
});
let page=await context.newPage();
page.setDefaultTimeout(10000);
const errors=[],requests=[],results=[];
context.on('page',p=>{p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());});
page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
context.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
const url=pathToFileURL(path.resolve(manifest.output)).href;
async function record(id,fn) {try {const observed=await fn();results.push({id,status:'passed',observed:observed??null});console.log(`PASS ${id}`);}catch(error){results.push({id,status:'failed',error:error.message});throw error;}}
const selectors={code:'projectCodeCol',source:'projectSourceCol',description:'projectDescCol',unit:'projectUnitCol',quantity:'projectQuantityCol',priceWithoutBdi:'projectWithoutBdiCol',bdi:'projectBdiCol',priceWithBdi:'projectWithBdiCol',totalWithBdi:'projectTotalWithBdiCol'};
async function select(id,value) {await page.locator('#'+id).selectOption(String(value??''),{force:true});}
async function configure(c) {
 await select('projectSheet',c.id);
 await page.locator('#projectHeaderRow').fill(String(c.header));await page.locator('#projectHeaderRow').dispatchEvent('change');
 await page.locator('#projectHeaderRow').press('Tab');
 for(const [field,id] of Object.entries(selectors)) {
  const col=(c.mapping||mapping)[field];
  await select(id,c.hiddenColumns?.includes(col)?'':col);
 }
 await page.locator('#projectGeneralTotal').fill(String(c.total));
}
async function loadBudget(file,sheet,total) {
 await page.setInputFiles('#projectFile',path.resolve(file));
 await page.waitForFunction(name=>state.projectWorkbook?.fileName===name,path.basename(file));
 await page.locator('#projectConfigArea:not(.hidden)').waitFor();
 await configure({...cases.find(c=>c.id===sheet),total});
}
async function auditAndProceed() {
 await page.click('#projectNextBtn');await page.locator('#budgetAuditDialog[open]').waitFor();
 await page.click('#budgetAuditProceedBtn');
}
async function download(button,name) {
 const pending=page.waitForEvent('download');await page.click(button);const d=await pending;
 const target=`${output}/${name}`;await d.saveAs(target);return target;
}
try {
 await page.goto(url);await page.click('#betaNoticeContinue');
 await record('HTML-CMP-ORACULOS',async()=>{
  for(const c of cases.filter(c=>c.kind==='comparison')) {
   const actual=await page.evaluate(c=>{
    const mapping={code:0,source:1,description:2,unit:3,quantity:4,priceWithoutBdi:5,bdi:6,priceWithBdi:7,totalWithBdi:8};
    const policy={caseInsensitive:true,stripSeparators:true};
    const budget=SicorpCore.analyzeBudget({fileName:'sintetico.xlsx',sheet:{name:c.id,rows:c.rows},headerRowNumber:1,mapping,codePolicy:policy,includeAuditData:true});
    const catalog=SicorpCore.prepareReferenceCatalog({bases:[{name:c.id,source:c.source,fileName:'base.xlsx',sheet:{name:'Base',rows:c.baseRows},headerRowNumber:1,mapping:{code:0,description:1,unit:2,price:3}}],codePolicy:policy});
    const compared=SicorpCore.compareBudgetToCatalog({budget,catalog,tolerance:c.tolerance||0});const view=SicorpCore.adaptComparisonToLegacyView(compared);
    return {statuses:compared.results.map(r=>r.statusKey),abc:[...curveAbcClassMap(view.results).values()],chart:sourceValueChartData(view.results)};
   },c);
   assert.deepEqual(actual.statuses,c.expected.statuses,c.id);if(c.expected.abc)assert.deepEqual(actual.abc,c.expected.abc,c.id);
   if(c.id==='CMP-CRUZA-FONTES') {
    assert.equal(actual.chart.coveredValue,100);assert.deepEqual(actual.chart.bars.map(b=>b.share),[0.6,0.4]);
    assert.deepEqual(actual.chart.bars.map(b=>b.segments.reduce((s,v)=>s+v.scopeShare,0)),[0.6,0.4]);
   }
  }
 });
 await record('UI-PRE-001',async()=>{await page.click('#projectNextBtn');assert.equal(await page.locator('#projectPrerequisiteMessage').isVisible(),true);});
 await page.setInputFiles('#projectFile',path.resolve('testkit/fixtures/budget.xlsx'));
 await page.locator('#projectConfigArea:not(.hidden)').waitFor();
 for(const c of cases.filter(c=>c.kind==='budget')) await record(`UI/${c.id}`,async()=>{
  await configure(c);await page.click('#projectNextBtn');
  const prerequisite=!Number.isFinite(Number(c.total))||c.total===''||c.hiddenColumns?.includes(0)||c.mapping?.totalWithBdi===null||Object.entries(c.mapping||mapping).filter(([k,v])=>['priceWithoutBdi','bdi','priceWithBdi'].includes(k)&&v!==null).length<2;
  if(prerequisite) {assert.equal(await page.locator('#projectPrerequisiteMessage').isVisible(),true);assert.equal(await page.locator('#budgetAuditDialog').evaluate(e=>e.open),false);return {prerequisite:true};}
  await page.locator('#budgetAuditDialog[open]').waitFor();
  const actual=await page.evaluate(()=>({codes:state.budgetAudit.findings.map(f=>f.code).sort(),accepted:state.budgetAuditBudget.items.length,canProceed:state.budgetAudit.canProceed}));
  assert.deepEqual(actual.codes,[...c.expected.codes].sort());assert.equal(actual.accepted,c.expected.accepted);assert.equal(actual.canProceed,c.expected.canProceed);
  assert.equal(await page.locator('#budgetAuditProceedBtn').isEnabled(),c.expected.canProceed);
  if(['ORC-EXC-004','ORC-EXC-005','ORC-EST-1','ORC-AV-DUP'].includes(c.id)) assert.equal(await page.locator('#budgetAuditGroups .related').count(),0);
  if(c.id==='ORC-AV-BDI') assert.equal(await page.locator('[data-budget-audit-category-panel="warning"] .related').count(),2);
  if(['ORC-AV-BDI','ORC-4-NEG','ORC-ERR-ITEM','ORC-EXC-004'].includes(c.id)) await page.locator('#budgetAuditDialog').screenshot({path:`${output}/${c.id}.png`});
  await page.click('#budgetAuditCloseBtn');return actual;
 });
 await record('UI-MAP-PREVIEW',async()=>{
  await configure(cases.find(c=>c.id==='ORC-OK-001'));
  const before=await page.locator('#projectPreviewTable tbody tr').count();
  await select('projectQuantityCol',2);assert.equal(await page.locator('#projectPreviewTable tbody tr').count(),before);
  await select('projectQuantityCol',4);
 });
 await record('UI-REVISAO-GRUPOS',async()=>{
  await configure(cases.find(c=>c.id==='ORC-AV-GRUPOS'));await page.click('#projectNextBtn');await page.locator('#budgetAuditDialog[open]').waitFor();
  const rows=page.locator('[data-budget-audit-category-panel="warning"] [data-budget-audit-row-key]');
  assert.equal(await rows.count(),60);
  const numbers=await rows.locator('th.row-number').allTextContents();assert.deepEqual(numbers.slice(0,4),['2','32','3','33']);
  await rows.nth(1).click();const first=await page.evaluate(()=>state.budgetAuditSelectedRowKey);
  await rows.nth(0).click();assert.notEqual(await page.evaluate(()=>state.budgetAuditSelectedRowKey),first);
  const scroller=page.locator('[data-budget-audit-category-panel="warning"] .review-unified-wrap');
  await scroller.evaluate(e=>{e.scrollTop=500});
  const row=rows.nth(14);await row.scrollIntoViewIfNeeded();const before=await scroller.evaluate(e=>e.scrollTop);
  await row.click();assert.equal(await scroller.evaluate(e=>e.scrollTop),before);
  await row.press('ArrowDown');const selected=page.locator('[data-budget-audit-category-panel="warning"] tr.selected');
  assert.equal(await selected.count(),1);assert.notEqual(await selected.getAttribute('data-budget-audit-row-key'),await row.getAttribute('data-budget-audit-row-key'));
  const visibility=await selected.evaluate(e=>{const r=e.getBoundingClientRect(),p=e.closest('.review-unified-wrap').getBoundingClientRect();return r.bottom<=p.bottom+1&&r.top>=p.top;});assert.equal(visibility,true);
  const toggle=page.locator('[data-budget-audit-category-panel="warning"] [data-review-reason-toggle]');await toggle.click();assert.equal(await rows.first().isVisible(),false);await toggle.click();assert.equal(await rows.first().isVisible(),true);
  await page.locator('#budgetAuditDialog').screenshot({path:`${output}/grupos.png`});await page.click('#budgetAuditCloseBtn');
 });
 await loadBudget('testkit/fixtures/comparison.xlsx','CMP-FLUXO',120);await auditAndProceed();
 await record('UI-BASE-PREREQ',async()=>{await page.click('#basesNextBtn');await page.locator('#blockingDialog[open]').waitFor();assert.match(await page.locator('#blockingDialogMessage').textContent(),/Adicione pelo menos/);await page.click('#blockingDialogReturn');});
 await page.setInputFiles('#baseFile',path.resolve('testkit/fixtures/comparison.xlsx'));await page.locator('#baseConfigArea:not(.hidden)').waitFor();
 await select('baseSheet','CMP-FLUXO-BASE');await select('baseSourceIdentifier','sinapi');
 for(const [id,value] of Object.entries({baseCodeCol:0,baseDescCol:1,baseUnitCol:2,baseValueCol:3})) await select(id,value);
 await record('UI-BASE-MAP-PREVIEW',async()=>{
  const count=await page.locator('#basePreviewTable tbody tr').count();await select('baseValueCol',1);assert.equal(await page.locator('#basePreviewTable tbody tr').count(),count);await select('baseValueCol',3);
 });
 await record('UI-BASE-REVISAO',async()=>{
  await page.click('#addBaseBtn');await page.locator('#reviewDialog[open]').waitFor();
  assert.equal(await page.evaluate(()=>state.bases.length),0);
  await page.click('#reviewConfirmAddBtn');assert.equal(await page.evaluate(()=>state.bases.length),1);
 });
 await page.click('#basesNextBtn');await page.click('#compareBtn');await page.waitForFunction(()=>state.results.length===4);
 await record('UI-CMP-FLUXO',async()=>{
  const actual=await page.evaluate(()=>({statuses:state.results.map(r=>r.statusKey),codes:state.results.map(r=>r.code),abc:[...curveAbcClassMap(state.results).values()],columns:visibleComparisonColumnDefinitions().length}));
  assert.deepEqual(actual.statuses,['abaixo','igual','acima','nao-encontrado']);assert.deepEqual(actual.codes,['0001','002.0','A3','404']);assert.deepEqual(actual.abc,['A','B','C','C']);assert.equal(actual.columns,17);
  assert.equal(await page.locator('#resultTable tbody tr').count(),4);
  await page.locator('#resultPanel').screenshot({path:`${output}/resultado.png`});return actual;
 });
 await record('UI-EXPORT-COMPLETO',async()=>{
  const xlsx=await download('#exportXlsxBtn','resultado.xlsx');const csv=await download('#exportCsvBtn','resultado.csv');
  await page.click('#copyTableBtn');const copied=await page.evaluate(()=>globalThis.__copied);fs.writeFileSync(`${output}/resultado.tsv`,copied);
  const rt=spreadsheetRuntime(),w=rt.read(fs.readFileSync(xlsx),{type:'array',cellStyles:true});const s=w.Sheets[w.SheetNames[0]];
  assert.equal(s.C2.v,'0001');assert.equal(s.C3.v,'002.0');assert.equal(s.G2.v,50);assert.equal(s.E2.s.fgColor.rgb,'FDE68A');assert.equal(s.F2.s.fgColor.rgb,'FDE68A');
  assert.equal(s.M2.s.fgColor.rgb,'FDE68A');assert.equal(s.N2.s.fgColor.rgb,'FDE68A');
  assert.equal(s.A2.s.fgColor.rgb,'E6F2F8');
  assert.ok(fs.readFileSync(csv,'utf8').includes('"002.0"'));assert.equal(copied.split('\n').length,5);assert.equal(copied.split('\n')[0].split('\t').length,17);
 });
 await record('UI-COLUNAS',async()=>{
  await page.click('#selectResultColumnsBtn');await page.click('#resultColumnsClearAllBtn');await page.click('#resultColumnsApplyBtn');
  assert.match(await page.locator('#resultColumnsError').textContent(),/pelo menos uma/);
  for(const key of ['code','projectDescription','baseDescription','status']) await page.locator(`[data-result-column-key="${key}"]`).check();
  await page.locator('[data-result-column-row="code"] [data-column-move="up"]').click();await page.locator('[data-result-column-row="code"] [data-column-move="up"]').click();
  await page.click('#resultColumnsApplyBtn');
  assert.deepEqual((await page.locator('#resultTable thead th').allTextContents()).map(v=>v.replace(/[▲▼↕]/g,'')),['Código','Status','Descrição orçamento','Descrição base']);
  const saved=await page.evaluate(()=>localStorage.getItem(RESULT_COLUMN_STORAGE_KEY));assert.ok(saved.includes('code'));
  await page.click('#selectResultColumnsBtn');await page.click('#resultColumnsSelectAllBtn');await page.click('#resultColumnsCancelBtn');
  assert.equal(await page.locator('#resultTable thead th').count(),4);
  const csv=await download('#exportCsvBtn','colunas.csv');const xlsx=await download('#exportXlsxBtn','colunas.xlsx');await page.click('#copyTableBtn');
  const copied=await page.evaluate(()=>globalThis.__copied);assert.equal(copied.split('\n')[0],'Código\tStatus\tDescrição orçamento\tDescrição base');
  const rt=spreadsheetRuntime(),w=rt.read(fs.readFileSync(xlsx),{type:'array'});assert.equal(w.Sheets[w.SheetNames[0]].A1.v,'Código');assert.equal(w.Sheets[w.SheetNames[0]]['!ref'],'A1:D5');
  assert.ok(fs.readFileSync(csv,'utf8').startsWith('\uFEFF"Código";"Status";'));
 });
 await record('UI-FILTROS-EXPORT',async()=>{
  await page.click('#hideAllStatuses');assert.equal(await page.locator('#resultTable tbody tr').count(),0);
  await page.locator('[data-status="acima"] input').check();assert.equal(await page.locator('#resultTable tbody tr').count(),1);
  const file=await download('#exportCsvBtn','filtro.csv');assert.match(fs.readFileSync(file,'utf8'),/A3/);assert.doesNotMatch(fs.readFileSync(file,'utf8'),/002\.0/);
  await page.click('#showAllStatuses');await page.locator('#searchText').fill('002.0');assert.equal(await page.locator('#resultTable tbody tr').count(),1);await page.locator('#searchText').fill('');
 });
 await record('UI-TROCA-ORCAMENTO',async()=>{
  await page.click('[data-step-target="1"]');await loadBudget('testkit/fixtures/budget.xlsx','ORC-OK-001',240);
  assert.equal(await page.evaluate(()=>state.bases.length),1);assert.equal(await page.evaluate(()=>state.results.length),0);
 });
 await record('UI-PERSISTENCIA',async()=>{
  await page.close();page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());await page.goto(url);await page.click('#betaNoticeContinue');
  assert.deepEqual(await page.evaluate(()=>visibleComparisonColumnDefinitions().map(c=>c.key)),['code','status','projectDescription','baseDescription']);
 });
 await record('UI-ORSE-OFFLINE',async()=>{
  await loadBudget('testkit/fixtures/budget.xlsx','ORC-OK-001',240);await auditAndProceed();
  const pending=page.waitForEvent('download');await page.setInputFiles('#baseFile',path.resolve('testkit/fixtures/sintetico.ORSE'));const d=await pending;await d.saveAs(`${output}/sintetico_ORSE.xlsx`);
  await page.waitForFunction(()=>state.pendingBaseWorkbook?.format==='orse');
  assert.deepEqual(await page.locator('#baseSheet option').evaluateAll(options=>options.map(o=>o.value)),['Insumos','Servicos']);
 });
 await record('UI-BASE-EXCLUSAO-CONFLITO',async()=>{
  await page.setInputFiles('#baseFile',path.resolve('testkit/fixtures/base.xlsx'));await page.locator('#baseConfigArea:not(.hidden)').waitFor();
  await select('baseSheet','BASE-ZERO');await select('baseSourceIdentifier','sinapi');
  for(const [id,v] of Object.entries({baseCodeCol:0,baseDescCol:1,baseUnitCol:2,baseValueCol:3}))await select(id,v);
  assert.equal(await page.locator('#addBaseBtn').isEnabled(),false);
  await page.click('#baseReviewBtn');await page.locator('#reviewDialog[open]').waitFor();assert.match(await page.locator('#reviewDialog').textContent(),/Preço zero/);await page.click('#reviewCloseBtn');
  assert.equal(await page.evaluate(()=>state.bases.length),0);
  await select('baseSheet','BASE-CON-PRECO');await select('baseSourceIdentifier','sinapi');
  for(const [id,v] of Object.entries({baseCodeCol:0,baseDescCol:1,baseUnitCol:2,baseValueCol:3}))await select(id,v);
  await page.click('#addBaseBtn');await page.locator('#reviewDialog[open]').waitFor();await page.click('#reviewConfirmAddBtn');
  assert.equal(await page.evaluate(()=>state.conflicts.length),1);
  await page.click('#basesNextBtn');await page.locator('#blockingDialog[open]').waitFor();assert.match(await page.locator('#blockingDialogMessage').textContent(),/bloqueantes/);await page.click('#blockingDialogReturn');
 });
 for(const format of ['biff5','biff8','txt','csv']) await record(`UI-LEITOR-${format}`,async()=>{
  await page.click('[data-step-target="1"]');
  const file=format==='txt'?'fluxo.txt':format==='csv'?'csv/CMP-FLUXO.csv':format+'.xls';
  await page.setInputFiles('#projectFile',path.resolve('testkit/fixtures/'+file));await page.locator('#projectConfigArea:not(.hidden)').waitFor();
  await page.waitForFunction(name=>state.projectWorkbook?.fileName===name,path.basename(file));
  const c=format==='txt'||format==='csv'?{...cases.find(c=>c.id==='CMP-FLUXO'),id:'CSV',total:120}:cases.find(c=>c.id==='ORC-OK-001');
  await configure(c);await page.click('#projectNextBtn');await page.locator('#budgetAuditDialog[open]').waitFor();
  assert.equal(await page.evaluate(()=>state.budgetAudit.canProceed),true);assert.equal(await page.evaluate(()=>state.budgetAuditBudget.items.length),format==='txt'||format==='csv'?4:1);await page.click('#budgetAuditCloseBtn');
 });
 await record('UI-ARMAZENAMENTO-FALHA',async()=>{
  const isolated=await browser.newContext();await isolated.setOffline(true);
  await isolated.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new Error('armazenamento indisponível')};Storage.prototype.setItem=()=>{throw new Error('armazenamento indisponível')};});
  const p=await isolated.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.click('#betaNoticeContinue');
  assert.equal(await p.evaluate(()=>visibleComparisonColumnDefinitions().length),17);
  await p.evaluate(()=>saveResultColumnConfiguration(allResultColumnKeys(),['code']));assert.equal(await p.evaluate(()=>visibleComparisonColumnDefinitions()[0].key),'code');await isolated.close();
 });
 await record('UI-PERSISTENCIA-REINICIO',async()=>{
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'sicorp-persistencia-'));
  let persistent;
  try {
   persistent=await playwright.chromium.launchPersistentContext(profile,launch);await persistent.setOffline(true);
   let p=persistent.pages()[0]||await persistent.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.click('#betaNoticeContinue');
   await p.evaluate(()=>saveResultColumnConfiguration(allResultColumnKeys().reverse(),['code','status']));await persistent.close();persistent=null;
   persistent=await playwright.chromium.launchPersistentContext(profile,launch);await persistent.setOffline(true);
   p=persistent.pages()[0]||await persistent.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.click('#betaNoticeContinue');
   assert.deepEqual(await p.evaluate(()=>visibleComparisonColumnDefinitions().map(c=>c.key)),['code','status']);
   assert.equal(await p.evaluate(()=>resultColumnOrderKeys().length),17);
  } finally {if(persistent)await persistent.close();fs.rmSync(profile,{recursive:true,force:true});}
 });
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
 results.push({id:'OFFLINE',status:'passed',observed:{httpRequests:0,pageErrors:0}});
} catch(error) {
 await page.screenshot({path:`${output}/failure.png`,fullPage:true}).catch(()=>{});console.error(error);process.exitCode=1;
} finally {
 const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const codeDirty=Boolean(execFileSync('git',['status','--porcelain','--','src','dist','scripts','tests','testkit','package.json','package-lock.json','.github'],{encoding:'utf8'}).trim());
 fs.writeFileSync(`${output}/report.json`,JSON.stringify({version:manifest.version,commit,codeDirty,htmlSha256:createHash('sha256').update(fs.readFileSync(manifest.output)).digest('hex'),browser:browser.version(),playwright:require(path.join(path.dirname(require.resolve('playwright/package.json')),'package.json')).version,date:new Date().toISOString(),offline:true,results,errors,requests},null,2));
 await browser.close();
}
