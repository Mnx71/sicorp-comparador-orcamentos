import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
// Run a copy in a temporary directory linked to the primary artifact runtime.
const root=process.argv[2];
if(!root) throw new Error('Informe o caminho absoluto do repositório.');
const {cases}=await import(pathToFileURL(`${root}/testkit/spec.mjs`));
const outputDir=`${root}/outputs/audit-rc17`;
await fs.mkdir(outputDir,{recursive:true});
await fs.mkdir(`${root}/testkit/fixtures`,{recursive:true});
await fs.mkdir(`${root}/qa/previews`,{recursive:true});
const manifest=[];
for(const kind of ['budget','base','comparison']) {
 const workbook=Workbook.create();
 const current=cases.filter(c=>c.kind===kind);
 for(const c of current) {
  const entries=[[c.id,c.rows,c.cells,c.header]];
  if(kind==='comparison') entries.push([c.id+'-BASE',c.baseRows,{},1]);
  for(const [name,rows,cells,header] of entries) {
   const sheet=workbook.worksheets.add(name);
   for(const ref of c.merges||[]) if(!name.endsWith('-BASE')) sheet.mergeCells(ref);
   sheet.showGridLines=false;
   const width=kind==='base'||name.endsWith('-BASE')?4:9;
   const padded=rows.map(r=>Array.from({length:width},(_,i)=>r[i]??null));
   const range=sheet.getRangeByIndexes(0,0,padded.length,width);
   range.values=padded;
   range.format.font={name:'Arial',size:10,color:'#172033'};
   range.format.rowHeight=22;
   range.format.columnWidth=19;
   sheet.getRangeByIndexes(0,0,padded.length,1).format.numberFormat='@';
   sheet.getRangeByIndexes(0,width===4?1:2,padded.length,1).format.columnWidth=36;
   const h=sheet.getRangeByIndexes(header-1,0,1,width);
   h.format={fill:'#233B57',font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'}};
   h.format.horizontalAlignment='center';
   sheet.freezePanes.freezeRows(header);
   for(const [ref,meta] of Object.entries(cells||{})) if(!meta.error&&!name.endsWith('-BASE')&&rows[Number(ref.slice(1))-1]?.[ref.charCodeAt(0)-65]!=='') sheet.getRange(ref).formulas=[['='+meta.formula]];
   if(width===9) sheet.getRange(`F${header+1}:I${padded.length}`).format.numberFormat='General';
  }
 }
 workbook.recalculate();
 for(const c of current) {
  for(const name of [c.id,...(kind==='comparison'?[c.id+'-BASE']:[])]) {
   const image=await workbook.render({sheetName:name,range:kind==='base'||name.endsWith('-BASE')?'A1:D8':'A1:I8',scale:1,format:'png'});
   await fs.writeFile(`${root}/qa/previews/${name}.png`,new Uint8Array(await image.arrayBuffer()));
  }
 }
 const scan=await workbook.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!',options:{useRegex:true,maxResults:30},maxChars:2000});
 await fs.writeFile(`${root}/qa/previews/${kind}-scan.ndjson`,scan.ndjson);
 const out=await SpreadsheetFile.exportXlsx(workbook);
 await out.save(`${outputDir}/${kind}.xlsx`);
 await fs.copyFile(`${outputDir}/${kind}.xlsx`,`${root}/testkit/fixtures/${kind}.xlsx`);
 manifest.push({kind,cases:current.length,sheets:current.flatMap(c=>[c.id,...(kind==='comparison'?[c.id+'-BASE']:[])]),file:`testkit/fixtures/${kind}.xlsx`});
 console.log(`${kind}: ${current.length} casos exportados`);
}
await fs.writeFile(`${root}/testkit/cases.json`,JSON.stringify(cases,null,2)+'\n');
await fs.writeFile(`${root}/testkit/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
