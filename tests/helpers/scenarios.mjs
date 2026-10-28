import assert from 'node:assert/strict';
import {core} from './core.mjs';
import {sheetFor,mapping,baseMapping,policy} from '../../testkit/spec.mjs';
export function execute(c,sheet=sheetFor(c)) {
 if(c.kind==='base') return core.prepareReferenceCatalog({bases:[{name:c.id,source:c.source,fileName:'casos.xlsx',sheet,headerRowNumber:c.header,mapping:baseMapping}],codePolicy:policy});
 const input={projectWorkbook:{fileName:'casos.xlsx',sheets:[sheet]},projectSheetName:c.id,projectHeaderRow:c.header,projectMapping:c.mapping||mapping,totalGeneral:c.total,codePolicy:policy};
 const audited=core.runBudgetAuditFromLegacyState(input);
 if(c.kind==='budget') return audited;
 const catalog=core.prepareReferenceCatalog({bases:[{name:c.id,source:c.source,fileName:'bases.xlsx',sheet:{name:'BASE',rows:c.baseRows},headerRowNumber:1,mapping:baseMapping}],codePolicy:policy});
 return core.compareBudgetToCatalog({budget:audited.budget,catalog,tolerance:c.tolerance||0});
}
export function verify(c,actual) {
 const e=c.expected;
 if(c.kind==='budget') {
  assert.equal(actual.budget.items.length,e.accepted,'itens aceitos');
  assert.deepEqual(actual.audit.findings.map(x=>x.code).sort(),[...e.codes].sort(),'códigos dos achados');
  assert.equal(actual.audit.canProceed,e.canProceed,'avanço');
  if(e.auditedSum!==undefined) assert.equal(actual.audit.totals.auditedSum,e.auditedSum,'soma auditada independente');
  if(e.prices) {const i=actual.audit.auditedItems[0];assert.deepEqual([i.priceWithoutBdi,i.bdiRate,i.priceWithBdi],e.prices);}
 } else if(c.kind==='base') {
  assert.equal(actual.items.length,e.accepted,'itens de base');
  assert.deepEqual(actual.reviewRows.map(x=>x.reason).sort(),[...e.reasons].sort(),'exclusões da base');
  assert.equal(actual.conflicts.length,e.conflicts,'conflitos');
  if(e.origins) assert.equal(actual.items[0].origins.length,e.origins);
 } else {
  assert.deepEqual(actual.results.map(x=>x.statusKey),e.statuses,'classificações');
  if(e.differences) assert.deepEqual(actual.results.map(x=>Number.isFinite(x.comparison.difference)?x.comparison.difference:null),e.differences);
  if(e.total) assert.equal(actual.financial.totalWithBdi,e.total);
 }
}
