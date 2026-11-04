import fs from 'node:fs';
import assert from 'node:assert/strict';
import {core,spreadsheetRuntime} from './core.mjs';
import {groups,books,mapping,baseMapping} from '../../testkit/grouped-spec.mjs';
import {policy} from '../../testkit/spec.mjs';
export function loadGrouped() {
 const rt=spreadsheetRuntime();
 return Object.fromEntries(Object.entries(books).map(([kind,name])=>[kind,core.readWorkbookFile({fileName:name,bytes:fs.readFileSync(`testkit/agrupados/${name}`)},{spreadsheetRuntime:rt})]));
}
export function executeGrouped(g,files,run) {
 const sheet=files[g.kind].sheets.find(s=>s.name===g.name);
 if(g.kind==='base')return core.prepareReferenceCatalog({bases:[{name:g.name,source:'SINAPI',fileName:books.base,sheet,headerRowNumber:g.header,mapping:baseMapping}],codePolicy:policy});
 const a=core.runBudgetAuditFromLegacyState({projectWorkbook:files[g.kind],projectSheetName:g.name,projectHeaderRow:g.header,projectMapping:run?.mapping||g.mapping||mapping,totalGeneral:run?run.total:g.total,codePolicy:policy});
 if(g.kind==='budget')return a;
 const catalog=core.prepareReferenceCatalog({bases:['SINAPI','ORSE'].map(source=>({name:source,source,fileName:books.comparison,sheet:files.comparison.sheets.find(s=>s.name===source),headerRowNumber:1,mapping:baseMapping})),codePolicy:policy});
 assert.equal(catalog.conflicts.length,0,'base de comparação sem conflito');
 return core.compareBudgetToCatalog({budget:a.budget,catalog,tolerance:g.tolerance});
}
export function verifyGrouped(g,actual,run) {
 const e=run||g.expected;
 if(g.kind==='budget') {
  assert.equal(actual.budget.items.length,g.expected.accepted,'itens aceitos');
  assert.deepEqual(actual.audit.findings.map(f=>f.code).sort(),[...e.codes].sort(),'achados conjuntos exatos');
  assert.equal(actual.audit.canProceed,e.canProceed,'avanço');
  if(!run&&e.auditedSum!==undefined)assert.equal(actual.audit.totals.auditedSum,e.auditedSum,'soma independente');
 }else if(g.kind==='base') {
  assert.equal(actual.items.length,e.accepted,'referências canônicas');
  assert.deepEqual(actual.reviewRows.map(r=>r.reason).sort(),[...e.reasons].sort(),'exclusões conjuntas');
  assert.equal(actual.conflicts.length,e.conflicts,'conflitos');
 }else {
  assert.deepEqual(actual.results.map(r=>r.statusKey),e.statuses,'resultados por linha');
  if(e.differences)assert.deepEqual(actual.results.map(r=>Number.isFinite(r.comparison.difference)?r.comparison.difference:null),e.differences);
  assert.ok(Math.abs(actual.financial.totalWithBdi-e.total)<1e-8,'soma da comparação');
 }
}
