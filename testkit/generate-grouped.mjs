import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
const root=process.argv[2];
const {groups,books,runs,coverage}=await import(pathToFileURL(`${root}/testkit/grouped-spec.mjs`));
const outputDir=`${root}/outputs/grouped-rc17`;
await fs.mkdir(outputDir,{recursive:true});
await fs.mkdir(`${root}/testkit/agrupados`,{recursive:true});
await fs.mkdir(`${root}/qa/previews/grouped`,{recursive:true});
for(const kind of ['budget','base','comparison']) {
 const wb=Workbook.create();
 for(const g of groups.filter(g=>g.kind===kind||(kind==='comparison'&&g.kind==='comparison-base'))) {
  const sheet=wb.worksheets.add(g.name),width=['base','comparison-base'].includes(g.kind)?6:11;
  const rows=g.rows.map(r=>Array.from({length:width},(_,i)=>r[i]??null));
  sheet.showGridLines=false;
  const all=sheet.getRangeByIndexes(0,0,rows.length,width);all.values=rows;
  all.format.font={name:'Arial',size:10,color:'#172033'};
  all.format.rowHeight=24;all.format.columnWidth=19;all.format.verticalAlignment='center';
  sheet.getRangeByIndexes(0,0,rows.length,1).setNumberFormat('@');
  sheet.getRangeByIndexes(0,width===6?1:2,rows.length,1).format.columnWidth=48;
  sheet.getRangeByIndexes(0,width-2,rows.length,1).format.columnWidth=27;
  sheet.getRangeByIndexes(0,width-1,rows.length,1).format.columnWidth=88;
  if(width===11)sheet.getRange(`E${g.header+1}:I${rows.length}`).setNumberFormat('General');
  const h=sheet.getRangeByIndexes(g.header-1,0,1,width);
  h.format={fill:'#233B57',font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'},horizontalAlignment:'center',rowHeight:30};
  sheet.freezePanes.freezeRows(g.header);
  for(const ref of g.merges)sheet.mergeCells(ref);
  for(const [ref,meta] of Object.entries(g.cells)) {
   const val=g.rows[Number(ref.slice(1))-1]?.[ref.charCodeAt(0)-65];
   if(val!==''&&!meta.error)sheet.getRange(ref).formulas=[['='+meta.formula]];
  }
 }
 wb.recalculate();
 const scan=await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!',options:{useRegex:true,maxResults:30},maxChars:2000});
 await fs.writeFile(`${root}/qa/previews/grouped/${kind}-scan.ndjson`,scan.ndjson);
 for(const g of groups.filter(g=>g.kind===kind||(kind==='comparison'&&g.kind==='comparison-base'))) {
  const preview=await wb.render({sheetName:g.name,range:['base','comparison-base'].includes(g.kind)?'A1:F9':'A1:K9',scale:1,format:'png'});
  await fs.writeFile(`${root}/qa/previews/grouped/${kind}-${g.name}.png`,new Uint8Array(await preview.arrayBuffer()));
 }
 const out=await SpreadsheetFile.exportXlsx(wb);await out.save(`${outputDir}/${books[kind]}`);
 await fs.copyFile(`${outputDir}/${books[kind]}`,`${root}/testkit/agrupados/${books[kind]}`);
 console.log(`${books[kind]}: ${wb.worksheets.items.length} abas`);
}
await fs.writeFile(`${root}/testkit/agrupados/spec.json`,JSON.stringify({groups,runs,coverage},null,2)+'\n');
const quote=x=>'"'+String(x??'').replaceAll('"','""')+'"';
await fs.writeFile(`${root}/testkit/agrupados/cobertura.csv`,'Caso;Arquivo;Aba;Linhas;Reexecuções\n'+coverage.flatMap(c=>c.locations.length?c.locations.map(l=>[c.id,l.file,l.sheet,l.rows.join(', '),c.runs.join(', ')].map(quote).join(';')):[[c.id,'orcamento-agrupado.xlsx','06_Controle','',c.runs.join(', ')].map(quote).join(';')]).join('\n')+'\n');
await fs.writeFile(`${root}/testkit/agrupados/execucao-manual.csv`,'Execução;Situação;Observado;Executor;Data;Navegador;Sistema;Evidência\n'+[...groups.filter(g=>g.kind!=='comparison-base').map(g=>`${g.kind}/${g.name}`),...runs.map(r=>r.id)].map(id=>[id,'Não executado','','','','','',''].map(quote).join(';')).join('\n')+'\n');
