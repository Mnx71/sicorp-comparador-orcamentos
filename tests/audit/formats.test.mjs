import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {core,spreadsheetRuntime} from '../helpers/core.mjs';
import {mapping,policy,cases} from '../../testkit/spec.mjs';
const rt=spreadsheetRuntime();
for(const format of ['biff5','biff8']) test(`LEIT-${format}: arquivo binário real, códigos e ocultação`,()=>{
 const bytes=fs.readFileSync(`testkit/fixtures/${format}.xls`);
 // CFB container holds an actual BIFF stream, not renamed OOXML.
 assert.deepEqual([...bytes.subarray(0,4)],[0xd0,0xcf,0x11,0xe0]);
 const raw=rt.read(bytes,{type:'array',bookFiles:true});
 const workbook=core.readWorkbookFile({fileName:`${format}.xls`,bytes},{spreadsheetRuntime:rt});
 assert.equal(workbook.format,'xls');assert.equal(workbook.sheets.length,3);
 const plain=workbook.sheets[0];assert.equal(plain.rows[1][0],'0001');
 const visible=workbook.sheets[1];assert.deepEqual(visible.rows[2],[]);
 const budget=core.analyzeBudget({fileName:'teste.xls',sheet:visible,headerRowNumber:1,mapping,codePolicy:policy,includeAuditData:true});
 assert.equal(budget.items.length,1);assert.equal(budget.items[0].totalWithBdi,240);
 assert.equal(workbook.sheets[2].rows[1][0],'');
});
test('LEIT-CSV-TXT: decimais brasileiros, aspas, código textual e tabulação',()=>{
 for(const name of ['csv/CMP-FLUXO.csv','fluxo.txt']) {
  const workbook=core.readWorkbookFile({fileName:name,bytes:fs.readFileSync(`testkit/fixtures/${name}`)});
  assert.deepEqual(workbook.sheets[0].rows[2].slice(0,4),['002.0','SINAPI','Conexão','un']);
 }
 const workbook=core.readWorkbookFile({fileName:'teste.csv',text:'Código;Fonte;Descrição;Unidade;Quantidade;Preço;BDI;Com;Total\n0001;SINAPI;"Tubo; PVC";m;2;"R$ 1.234,56";20%;1481,472;2962,944'});
 const budget=core.analyzeBudget({fileName:'teste.csv',sheet:workbook.sheets[0],headerRowNumber:1,mapping,codePolicy:policy});
 assert.equal(budget.items[0].price.withoutBdi,1234.56);assert.equal(budget.items[0].price.bdiRate,0.2);
});
test('LEIT-ORSE: pacote sintético completo, ativos, preços e rejeição',async()=>{
 const converted=await core.convertOrseFile({fileName:'sintetico.ORSE',bytes:fs.readFileSync('testkit/fixtures/sintetico.ORSE')});
 assert.deepEqual(converted.data.inputs,[{codigo:'00001/ORSE',descricao:'Material ativo',unidade:'kg',custoUnitario:12.34},{codigo:'00002/ORSE',descricao:'Material sem preco',unidade:'m',custoUnitario:null}]);
 assert.equal(converted.data.services[0].custoUnitario,45.67);assert.equal(converted.data.services.length,2);
 assert.deepEqual(converted.workbook.sheets.map(s=>s.name),['Insumos','Servicos']);
 const bytes=core.writeOrseWorkbookXlsx(converted.exportWorkbook,null,{generatedAt:new Date('2026-06-01T00:00:00Z')});
 const reopened=core.readWorkbookFile({fileName:'sintetico.xlsx',bytes},{spreadsheetRuntime:rt});
 assert.deepEqual(reopened.sheets.map(s=>s.name),['Resumo','Insumos','Servicos']);
 const base=core.prepareReferenceCatalog({bases:[{name:'ORSE',source:'ORSE',fileName:'orse.xlsx',sheet:converted.workbook.sheets[0],headerRowNumber:1,mapping:{code:0,description:1,unit:2,price:3}}],codePolicy:policy});
 assert.equal(base.items.length,1);assert.equal(base.reviewRows[0].reason,'Preço ausente');
 await assert.rejects(core.convertOrseFile({fileName:'invalido.ORSE',bytes:fs.readFileSync('testkit/fixtures/invalido.ORSE')}),/assinatura/);
});
