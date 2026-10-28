import fs from 'node:fs';
import {deflateSync} from 'node:zlib';
import {spreadsheetRuntime} from '../tests/helpers/core.mjs';
import {cases} from './spec.mjs';
const dir='testkit/fixtures';
fs.mkdirSync(`${dir}/csv`,{recursive:true});
const quoted=v=>'"'+String(v??'').replaceAll('"','""')+'"';
for(const c of cases.filter(c=>!c.cells&&!c.hiddenRows&&!c.hiddenColumns))
 fs.writeFileSync(`${dir}/csv/${c.id}.csv`,'\uFEFF'+c.rows.map(r=>r.map(quoted).join(';')).join('\r\n'));
const flow=cases.find(c=>c.id==='CMP-FLUXO');
fs.writeFileSync(`${dir}/fluxo.txt`,flow.rows.map(r=>r.join('\t')).join('\r\n'));
fs.writeFileSync(`${dir}/base-fluxo.csv`,'\uFEFF'+flow.baseRows.map(r=>r.map(quoted).join(';')).join('\r\n'));
const rt=spreadsheetRuntime();
const book=rt.read(fs.readFileSync(`${dir}/budget.xlsx`),{type:'array',cellStyles:true});
book.SheetNames=['ORC-OK-001','ORC-VIS-001','ORC-VIS-002'];
for(const bookType of ['biff5','biff8']) {
 // The legacy writer omits ROW records (and BIFF5 COLINFO). Add the metadata
 // explicitly so the test files truly contain hidden rows/columns.
 const cfb=rt.CFB.read(rt.write(book,{type:'buffer',bookType}),{type:'buffer'});
 const stream=cfb.FileIndex.find(e=>/^(Workbook|Book)$/.test(e.name));
 const bytes=Buffer.from(stream.content),bounds=[];
 for(let p=0;p+4<=bytes.length;) {const t=bytes.readUInt16LE(p),l=bytes.readUInt16LE(p+2);if(t===0x85)bounds.push({pos:p+4,offset:bytes.readUInt32LE(p+4)});p+=l+4;}
 const global=Buffer.from(bytes.subarray(0,bounds[0].offset)),sheets=[];let offset=global.length;
 for(let i=0;i<bounds.length;i++) {
  global.writeUInt32LE(offset,bounds[i].pos);
  let sheet=bytes.subarray(bounds[i].offset,bounds[i+1]?.offset??bytes.length);
  let eof=0;for(let p=0;p+4<=sheet.length;) {const t=sheet.readUInt16LE(p),l=sheet.readUInt16LE(p+2);if(t===0x0a){eof=p;break;}p+=l+4;}
  const extra=[];
  if(i===1) {const r=Buffer.alloc(20);r.writeUInt16LE(0x208);r.writeUInt16LE(16,2);r.writeUInt16LE(2,4);r.writeUInt16LE(9,8);r.writeUInt16LE(255,10);r.writeUInt16LE(0x20,16);extra.push(r);}
  if(i===2&&bookType==='biff5') {const c=Buffer.alloc(16);c.writeUInt16LE(0x7d);c.writeUInt16LE(12,2);c.writeUInt16LE(19*256,8);c.writeUInt16LE(1,12);extra.push(c);}
  sheet=Buffer.concat([sheet.subarray(0,eof),...extra,sheet.subarray(eof)]);
  sheets.push(sheet);offset+=sheet.length;
 }
 stream.content=Buffer.concat([global,...sheets]);stream.size=stream.content.length;
 fs.writeFileSync(`${dir}/${bookType}.xls`,rt.CFB.write(cfb,{type:'buffer'}));
}
// Synthetic MIDAS fixture. Field encodings and row statuses are explicit.
function packet(fields,rows) {
 const meta=[];
 for(const [name,type,size] of fields) {
  const n=Buffer.from(name,'latin1'),d=Buffer.alloc(8);d.writeUInt16LE(size,0);d.writeUInt16LE(type,2);
  meta.push(Buffer.from([n.length]),n,d);
 }
 meta.push(Buffer.alloc(2));
 const header=Buffer.alloc(24);header.set([0x96,0x19,0xe0,0xbd]);header.writeUInt32LE(1,4);
 header.writeUInt16LE(fields.length,12);header.writeUInt32LE(rows.length,14);
 header.writeUInt16LE(24+Buffer.concat(meta).length,22);
 const data=[];
 for(const values of rows) {
  const statuses=Buffer.alloc(Math.ceil(fields.length/4));const row=[];
  fields.forEach(([name,type,size],i)=>{
   const value=values[i];if(value===null) {statuses[Math.floor(i/4)]|=1<<((i%4)*2);return;}
   const b=Buffer.alloc(size);
   if(type===1) b.writeInt32LE(value);else if(type===4) b.writeDoubleLE(value);else b.write(value,0,size,'latin1');
   row.push(b);
  });
  data.push(Buffer.from([0]),statuses,...row);
 }
 return Buffer.concat([header,...meta,...data]);
}
const n=name=>[name,1,4],s=name=>[name,9,64],v=name=>[name,4,8];
const tables={
 0:packet([n('peri_nr_ano'),n('peri_nr_mes'),n('peri_nr_ordem')],[[2026,6,0]]),
 11:packet([n('gpin_nr_codigo'),s('gpin_in_tipo')],[[1,'M'],[2,'E']]),
 13:packet([s('font_sg_fonte'),n('insu_nr_codigo'),s('insu_tx_descricao'),s('insu_sg_unidade'),n('gpin_nr_codigo'),s('insu_in_desativado')],[
  ['ORSE',1,'Material ativo','kg',1,'N'],['ORSE',2,'Material sem preco','m',1,'N'],['ORSE',3,'Inativo','un',1,'S'],['ORSE',4,'Equipamento','h',2,'N'],['SINAPI',5,'Outra fonte','kg',1,'N']]),
 14:packet([s('font_sg_fonte'),n('insu_nr_codigo'),v('inpr_vl_adotado')],[['ORSE',1,12.34],['ORSE',2,null],['SINAPI',5,99]]),
 17:packet([s('font_sg_fonte'),n('serv_nr_codigo'),s('serv_tx_descricao'),s('serv_sg_unidade'),s('serv_in_desativado')],[['ORSE',10,'Servico ativo','m','N'],['ORSE',11,'Servico sem preco','un','N'],['ORSE',12,'Inativo','m','S']]),
 18:packet([s('font_sg_fonte'),n('serv_nr_codigo'),v('svpr_vl_unitario')],[['ORSE',10,45.67],['ORSE',11,null]])
};
const header=Buffer.alloc(24);header.set([0x96,0x19,0xe0,0xbd]);header.writeUInt32LE(1,4);header.writeUInt32LE(21,14);header.writeUInt16LE(24,22);
const parts=[header];
for(let i=0;i<21;i++) {
 const compressed=deflateSync(tables[i]||packet([],[]));
 const before=Buffer.alloc(8);before.set([4,0,32]);before.writeUInt32LE(i+1,3);before[7]=4;
 const date=Buffer.alloc(10);date.writeUInt16LE(2026);date.writeUInt16LE(6,2);date.writeUInt32LE(compressed.length,6);
 parts.push(before,Buffer.from('ORSE'),date,compressed);
}
const plain=Buffer.concat(parts),encrypted=Buffer.alloc(plain.length);let seed=0x0174;
for(let i=0;i<plain.length;i++) {encrypted[i]=plain[i]^(seed>>>8);seed=((seed+encrypted[i])*0xce6d+0x58bf)&0xffff;}
fs.writeFileSync(`${dir}/sintetico.ORSE`,encrypted);
fs.writeFileSync(`${dir}/invalido.ORSE`,Buffer.from([1,2,3,4]));
console.log('CSV, TXT, BIFF5, BIFF8 e ORSE sintéticos gerados.');
