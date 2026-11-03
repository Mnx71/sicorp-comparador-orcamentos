import test from 'node:test';
import assert from 'node:assert/strict';
import {groups,runs,coverage} from '../../testkit/grouped-spec.mjs';
import {cases} from '../../testkit/spec.mjs';
import {loadGrouped,executeGrouped,verifyGrouped} from '../helpers/grouped.mjs';
const files=loadGrouped();
for(const g of groups.filter(g=>g.kind!=='comparison-base'))test(`AGRUPADO/${g.kind}/${g.name}`,()=>verifyGrouped(g,executeGrouped(g,files)));
for(const run of runs)test(`AGRUPADO/${run.id}`,()=>{const g=groups.find(g=>g.name===run.sheet);verifyGrouped(g,executeGrouped(g,files,run),run);});
test('AGRUPADO/cobertura de todos os IDs originais',()=>{
 assert.equal(coverage.length,cases.length);
 for(const c of coverage)assert.ok(c.locations.length||c.runs.length,`sem localização: ${c.id}`);
});
test('AGRUPADO/contraprovas não adquirem achados de outros casos',()=>{
 for(const g of groups.filter(g=>g.kind==='budget'&&['01_Revisao','03_Formulas'].includes(g.name))) {
  const a=executeGrouped(g,files);
  for(const m of g.members.filter(m=>m.originalExpected.codes.length===0)) {
   const direct=a.audit.findings.filter(f=>m.rows.includes(f.rowNumber));
   assert.deepEqual(direct,[],`${m.id}: contraprova contaminada`);
  }
 }
});
test('AGRUPADO/achados permanecem ligados às linhas de cada caso',()=>{
 for(const g of groups.filter(g=>g.kind==='budget'&&['01_Revisao','02_Impedimentos','03_Formulas'].includes(g.name))) {
  const a=executeGrouped(g,files);
  for(const m of g.members) {
   const expected=m.originalExpected.codes.filter(c=>!['NO_BUDGET_ITEMS','GENERAL_TOTAL_AUDITED_MISMATCH','BEFORE_HEADER'].includes(c));
   const actual=a.audit.findings.filter(f=>m.rows.includes(f.rowNumber)).map(f=>f.code);
   assert.deepEqual(actual.sort(),expected.sort(),`${m.id}: achado na linha incorreta`);
  }
 }
});
test('AGRUPADO/códigos textuais e zeros sobrevivem no arquivo salvo',()=>{
 const s=files.comparison.sheets.find(s=>s.name==='01_Comparacao');
 assert.equal(s.rows[1][0],'0001');assert.equal(s.rows[2][0],'002.0');
});
