import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {readCoreSource} from '../../scripts/source.mjs';
import {core,spreadsheetRuntime} from '../helpers/core.mjs';
import {cases,sheetFor,mapping,baseMapping,policy} from '../../testkit/spec.mjs';
import {execute,verify} from '../helpers/scenarios.mjs';
for(const c of cases) test(`${c.id}: ${c.title}`,()=>verify(c,execute(c)));
const readerRuntime=spreadsheetRuntime();
const files=Object.fromEntries(['budget','base','comparison'].map(kind=>[kind,core.readWorkbookFile({fileName:`${kind}.xlsx`,bytes:fs.readFileSync(`testkit/fixtures/${kind}.xlsx`)},{spreadsheetRuntime:readerRuntime})]));
for(const c of cases) test(`XLSX/${c.id}: leitura do arquivo efetivo`,()=>{
 const sheet=files[c.kind].sheets.find(s=>s.name===c.id);
 assert.ok(sheet);
 const input=c.kind==='comparison'?{...c,baseRows:files.comparison.sheets.find(s=>s.name===c.id+'-BASE').rows}:c;
 verify(input,execute(input,sheet));
});

test('BASE-ENTRE: equivalências e conflitos entre arquivos',()=>{
 const original=cases.find(c=>c.id==='BASE-OK-001');
 const bases=[0,1].map(i=>({name:`Base ${i}`,source:'SINAPI',fileName:`base${i}.xlsx`,sheet:sheetFor(original),headerRowNumber:1,mapping:baseMapping}));
 let catalog=core.prepareReferenceCatalog({bases,codePolicy:policy});
 assert.equal(catalog.items.length,1);assert.equal(catalog.items[0].origins.length,2);
 bases[1].sheet.rows[1][3]=101;
 catalog=core.prepareReferenceCatalog({bases,codePolicy:policy});assert.equal(catalog.conflicts.length,1);
 assert.throws(()=>core.compareBudgetToCatalog({budget:{items:[]},catalog}),/bloqueantes/);
});
test('BUILD-PARIDADE: núcleo distribuído idêntico ao núcleo fonte',()=>{
 const manifest=JSON.parse(fs.readFileSync('src/manifest.json'));
 const html=fs.readFileSync(manifest.output,'utf8');
 const source=html.match(/<script id="sicorpV42Core">([\s\S]*?)<\/script>/)[1];
 assert.equal(source,readCoreSource());
 const context=vm.createContext({TextDecoder,TextEncoder,Uint8Array,ArrayBuffer,DataView,Blob,Response,DecompressionStream,setTimeout});
 vm.runInContext(source,context);
 const c=cases.find(c=>c.id==='ORC-OK-001');
 const result=context.SicorpCore.runBudgetAuditFromLegacyState({projectWorkbook:{fileName:'test.xlsx',sheets:[sheetFor(c)]},projectSheetName:c.id,projectHeaderRow:1,projectMapping:mapping,totalGeneral:240,codePolicy:policy});
 assert.equal(result.audit.canProceed,true);assert.equal(result.audit.totals.auditedSum,240);
});
