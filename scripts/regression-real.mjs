import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync,execFileSync} from 'node:child_process';
import {core,spreadsheetRuntime} from '../tests/helpers/core.mjs';
const root=process.env.SICORP_REAL_FILES||path.resolve('../project_sources');
const names={budget:'02-PLANILHA-OR-AMENT-RIA-COMPLETA-Original-1-.xlsx',services:'01-Planos-de-Servicos-028-ENC.-SOCIAIS-114-15.xls',inputs:'03-Tabela-de-Insumos-028-ENC.-SOCIAIS-114-15.xls',sinapi:'04-SINAPI_Refer-ncia_2025_07-1-.xlsx',orse:'06-20260601-00-2-.ORSE'};
const rt=spreadsheetRuntime(),files={};
for(const [kind,name] of Object.entries(names)) {const file=path.join(root,name);if(!fs.existsSync(file))throw new Error(`Arquivo real ausente: ${file}. Regressão NÃO executada.`);files[kind]=fs.readFileSync(file);}
const workbooks=Object.fromEntries(Object.entries(names).filter(([k])=>k!=='orse').map(([kind,name])=>[kind,core.readWorkbookFile({fileName:name,bytes:files[kind]},{spreadsheetRuntime:rt})]));
const sheet=workbooks.budget.sheets.find(s=>s.name==='PLANILHA ORCAMENTARIA');
const mapping={code:1,source:2,description:3,unit:4,quantity:5,priceWithoutBdi:6,bdi:7,priceWithBdi:8,totalWithBdi:9};
const policy={caseInsensitive:true,stripSeparators:true};
const budget=core.analyzeBudget({fileName:names.budget,sheet,headerRowNumber:2,mapping,codePolicy:policy,includeAuditData:true});
const bases=[['services','SEINFRA','orcamento',4,{code:1,description:2,unit:5,price:6}],['inputs','SEINFRA','insumos',6,{code:0,description:1,unit:2,price:3}],['sinapi','SINAPI','ISD',10,{code:1,description:2,unit:3,price:10}]].map(([kind,source,name,headerRowNumber,mapping])=>({name:kind,source,fileName:names[kind],sheet:workbooks[kind].sheets.find(s=>s.name===name),headerRowNumber,mapping}));
const catalog=core.prepareReferenceCatalog({bases,codePolicy:policy});
const comparison=core.compareBudgetToCatalog({budget,catalog,tolerance:0.01});
const baselineHtml=fs.readFileSync('baseline/sicorp_comparador_orcamento_v4.4.0-rc.16.html','utf8');
vm.runInThisContext(baselineHtml.match(/<script id="sicorpV42Core">([\s\S]*?)<\/script>/)[1]);
const baseline=globalThis.SicorpCore;globalThis.SicorpCore=core;
const oldBudget=baseline.analyzeBudget({fileName:names.budget,sheet,headerRowNumber:2,mapping,codePolicy:policy,includeAuditData:true});
assert.deepEqual(budget,oldBudget);
const oldCatalog=baseline.prepareReferenceCatalog({bases,codePolicy:policy});assert.deepEqual(catalog,oldCatalog);
const oldComparison=baseline.compareBudgetToCatalog({budget:oldBudget,catalog:oldCatalog,tolerance:0.01});
assert.deepEqual(comparison,oldComparison);
const converted=await core.convertOrseFile({fileName:names.orse,bytes:files.orse});
assert.equal(converted.data.inputs.length,8087);assert.equal(converted.data.services.length,9931);
// Independent arithmetic cross-check: integer cents, with no SICORP formatter/parser.
// This regression uses typed numeric caches from Excel, not strings.
const python=process.env.CODEX_PRIMARY_RUNTIME_PYTHON||'python3';
const decimal=spawnSync(python,['-c',`import json,sys
from decimal import Decimal,ROUND_HALF_UP
rows=json.load(sys.stdin)
cent=Decimal('0.01')
total=Decimal(0);items=0;bdis=0
for q,w,b,p,t in rows:
 q,w,b,p,t=map(lambda x:Decimal(str(x)),[q,w,b,p,t])
 if abs(b)>1:b=b/100
 calculated=(q*p).quantize(cent,rounding=ROUND_HALF_UP)
 total+=calculated
 items+=abs(t-calculated)>cent
 bdis+=abs(p-(w*(1+b)).quantize(cent,rounding=ROUND_HALF_UP))>cent
print(json.dumps({'checked':len(rows),'independentCents':int(total*100),'itemMismatches':items,'bdiMismatches':bdis}))
`],{input:JSON.stringify(budget.items.map(item=>sheet.rows[item.origin.rowNumber-1].slice(5,10))),encoding:'utf8'});
if(decimal.status!==0)throw new Error(decimal.stderr);
const {independentCents,checked,itemMismatches,bdiMismatches}=JSON.parse(decimal.stdout);
const audited=core.auditBudgetCalculations({budget,totalGeneral:independentCents/100});
assert.equal(audited.totals.auditedSum,independentCents/100);
assert.equal(audited.findings.filter(f=>f.code==='ITEM_TOTAL_MISMATCH').length,itemMismatches);
assert.equal(audited.findings.filter(f=>f.code==='BDI_APPLICATION_MISMATCH').length,bdiMismatches);
assert.equal(checked,budget.items.length);
const findings=Object.fromEntries([...new Set(audited.findings.map(f=>f.code))].map(code=>[code,audited.findings.filter(f=>f.code===code).length]));
const report={version:JSON.parse(fs.readFileSync('src/manifest.json')).version,date:new Date().toISOString(),files:Object.fromEntries(Object.entries(files).map(([k,b])=>[k,{name:names[k],sha256:createHash('sha256').update(b).digest('hex')}])),budget:budget.stats,reviewReasons:Object.fromEntries([...new Set(budget.reviewRows.map(r=>r.reason))].map(reason=>[reason,budget.reviewRows.filter(r=>r.reason===reason).length])),catalog:catalog.stats,comparison:comparison.stats,baselineParity:'full canonical budget/catalog/comparison equality',independentArithmetic:{checkedItems:checked,auditedTotal:independentCents/100,itemMismatches,bdiMismatches},audit:{findings,canProceed:audited.canProceed,totalGeneralInput:'soma independente para a regressão; não representa conferência do total impresso'},orse:converted.data.stats};
report.commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
report.htmlSha256=createHash('sha256').update(fs.readFileSync(JSON.parse(fs.readFileSync('src/manifest.json')).output)).digest('hex');
report.codeDirty=Boolean(execFileSync('git',['status','--porcelain','--','src','dist','scripts','tests','testkit','package.json','package-lock.json','.github'],{encoding:'utf8'}).trim());
fs.mkdirSync('qa/evidence',{recursive:true});fs.writeFileSync('qa/evidence/real-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
