// Agrupamento declarativo. Não importa o motor nem calcula esperados com o SICORP.
import {cases,budgetHeader,baseHeader,mapping,baseMapping} from './spec.mjs';
export const books={budget:'orcamento-agrupado.xlsx',base:'bases-agrupadas.xlsx',comparison:'comparacao-agrupada.xlsx'};
export const groups=[];
const find=id=>cases.find(c=>c.id===id);
const normal=v=>String(v).toUpperCase().replace(/[\s.\-/\\]/g,'').replace(/^0+(?=.)/,'');
function group(kind,name,title,header=1) {
 const g={kind,name,title,header,rows:header===2?[[title],kind==='base'?baseHeader:budgetHeader]:[kind==='base'?baseHeader:budgetHeader],cells:{},hiddenRows:[],hiddenColumns:[],merges:header===2?[`A1:${kind==='base'?'D':'I'}1`]:[],members:[],expected:{accepted:0,codes:[],reasons:[],conflicts:0,canProceed:true},total:0};
 groups.push(g);return g;
}
function append(g,c,{scope=true}={}) {
 const prefix=`T${cases.indexOf(c)+1}X`,start=c.header,offset=g.rows.length-start,physical=[];
 for(let i=start;i<c.rows.length;i++) {
  const r=structuredClone(c.rows[i]);const has=r.some(v=>String(v??'').trim());
  const repeated=JSON.stringify(r)===JSON.stringify(c.kind==='base'?baseHeader:budgetHeader);
  if(has&&!repeated&&scope) {
   if(r[0])r[0]=prefix+normal(r[0]);
   const d=c.kind==='base'?1:2;if(r[d])r[d]=prefix+' '+r[d];
  }
  if(has) {while(r.length<(g.kind==='base'?4:9))r.push(null);r.push(c.id,c.title);}
  g.rows.push(r);physical.push(g.rows.length);
  if(c.hiddenRows?.includes(i))g.hiddenRows.push(g.rows.length-1);
 }
 for(const [ref,meta] of Object.entries(c.cells||{})) {
  const target=ref.replace(/\d+$/,n=>Number(n)+offset);
  g.cells[target]={...meta,formula:meta.formula.replace(/(\$?[A-Z]+\$?)(\d+)/g,(_,a,n)=>a+(Number(n)+offset))};
 }
 g.members.push({id:c.id,rows:physical,originalExpected:c.expected});
 return offset;
}
const controls=new Set(['ORC-TOT-VAZ','ORC-TOT-TXT','ORC-TOT-ZERO','ORC-TOT-NEG','ORC-MAP-001','ORC-MAP-002','ORC-DER-SEM','ORC-DER-COM','ORC-DER-BDI','ORC-DER-ZERO','ORC-DER-NEG','ORC-DER-INF','ORC-AV-BDI-DER','ORC-ERR-GERAL','ORC-LIM-GERAL','ORC-LIM-GERAL-FORA','ORC-VIS-002']);
const formulaIds=new Set(['ORC-AV-MANUAL','ORC-CP-MANUAL','ORC-AV-PADRAO']);
const review=group('budget','01_Revisao','Revisão conjunta: exclusões, erros e avisos',2);
const blocked=group('budget','02_Impedimentos','Impedimentos simultâneos');
const formulas=group('budget','03_Formulas','Predominância e padrão de fórmulas');
for(const c of cases.filter(c=>c.kind==='budget'&&!controls.has(c.id))) {
 const g=formulaIds.has(c.id)?formulas:(!c.expected.canProceed&&c.expected.accepted>0)?blocked:review;
 append(g,c);
 g.expected.accepted+=c.expected.accepted;
 g.expected.codes.push(...c.expected.codes.filter(code=>!['NO_BUDGET_ITEMS','GENERAL_TOTAL_AUDITED_MISMATCH','BEFORE_HEADER'].includes(code)));
 if(c.expected.accepted>0)g.total+=c.expected.auditedSum??c.total;
}
review.total=Math.round(review.total*100)/100;
review.expected.auditedSum=review.total;
// Um erro geral explícito, maior que a tolerância global acumulada.
review.total+=10;review.expected.codes.push('BEFORE_HEADER','GENERAL_TOTAL_AUDITED_MISMATCH');
// Um título oculto antes do título mesclado exercita a precedência da ocultação.
review.rows.unshift(['Título oculto']);review.header=3;review.merges=['A2:I2'];
review.hiddenRows=review.hiddenRows.map(i=>i+1);review.hiddenRows.push(0);
review.cells=Object.fromEntries(Object.entries(review.cells).map(([r,m])=>[r.replace(/\d+$/,n=>Number(n)+1),{...m,formula:m.formula.replace(/(\$?[A-Z]+\$?)(\d+)/g,(_,a,n)=>a+(Number(n)+1))}]));
for(const m of review.members)m.rows=m.rows.map(r=>r+1);
blocked.total=240;blocked.expected.canProceed=false;
formulas.expected.auditedSum=formulas.total;
const empty=group('budget','04_Sem_itens','Somente linhas desconsideradas');
for(const id of ['ORC-4-VAZ','ORC-EST-1'])append(empty,find(id));empty.total=240;
empty.expected={accepted:0,codes:['BUDGET_ITEM_EMPTY_OR_ZERO','STRUCTURAL_ROW','NO_BUDGET_ITEMS','GENERAL_TOTAL_AUDITED_MISMATCH'],canProceed:false,auditedSum:0};
const derived=group('budget','05_Derivados','BDI derivado zero/negativo e estouro');
for(const id of ['ORC-DER-ZERO','ORC-DER-NEG','ORC-DER-INF'])append(derived,find(id));
derived.rows[3][7]=1; // Cache positivo disponível; fica ignorado no ensaio de H não mapeado.
append(derived,find('ORC-AV-BDI-DER'));
derived.rows[5][6]=0.2; // Ignorado no ensaio de BDI derivado; permite remapear H na mesma aba.
derived.mapping={...mapping,bdi:null};derived.total=881;
derived.expected={accepted:5,codes:['SAME_DESCRIPTION_DIFFERENT_BDI'],canProceed:true,auditedSum:881};
const control=group('budget','06_Controle','Contraprova limpa e parâmetros globais');
control.rows.push(['C1','SINAPI','Controle A','m',2,100,0.2,120,240,'CONTROLE','Sem ocorrência'],['C2','SINAPI','Controle B','m',2,100,0.2,120,240,'CONTROLE','Sem ocorrência']);
control.total=480;control.expected={accepted:2,codes:[],canProceed:true,auditedSum:480};
const hidden=group('budget','07_Coluna_oculta','Coluna A oculta não pode ser mapeada');
append(hidden,find('ORC-VIS-002'));hidden.hiddenColumns=[0];hidden.total=240;
hidden.expected={accepted:0,codes:['STRUCTURAL_ROW','NO_BUDGET_ITEMS','GENERAL_TOTAL_AUDITED_MISMATCH'],canProceed:false,auditedSum:0};
export const runs=[
 {id:'CTRL-OK',sheet:control.name,total:480,covers:['ORC-OK-001'],codes:[],canProceed:true},
 ...['SEM','COM','BDI'].map((suffix,i)=>({id:`CTRL-DER-${suffix}`,sheet:control.name,total:480,mapping:{...mapping,[['priceWithoutBdi','priceWithBdi','bdi'][i]]:null},covers:[`ORC-DER-${suffix}`],codes:[],canProceed:true})),
 ...[['VAZ',''],['TXT','abc'],['ZERO',0],['NEG',-1]].map(([id,total])=>({id:`CTRL-TOT-${id}`,sheet:control.name,total,covers:[`ORC-TOT-${id}`],codes:['VAZ','TXT'].includes(id)?['GENERAL_TOTAL_INVALID']:['NON_POSITIVE_VALUE','GENERAL_TOTAL_AUDITED_MISMATCH'],canProceed:['ZERO','NEG'].includes(id),prerequisite:['VAZ','TXT'].includes(id)})),
 ...[[480.02,'ORC-LIM-GERAL',[]],[480.03,'ORC-LIM-GERAL-FORA',['GENERAL_TOTAL_AUDITED_MISMATCH']],[481,'ORC-ERR-GERAL',['GENERAL_TOTAL_AUDITED_MISMATCH']]].map(([total,id,codes])=>({id:`CTRL-${id}`,sheet:control.name,total,covers:[id],codes,canProceed:true})),
 {id:'CTRL-MAP-001',sheet:control.name,total:480,mapping:{...mapping,bdi:null,priceWithBdi:null},covers:['ORC-MAP-001'],codes:['PRICE_COMPONENTS_INSUFFICIENT'],canProceed:false,prerequisite:true},
 {id:'CTRL-MAP-002',sheet:control.name,total:480,mapping:{...mapping,totalWithBdi:null},covers:['ORC-MAP-002'],codes:['ITEM_TOTAL_COLUMN_MISSING'],canProceed:false,prerequisite:true},
 {id:'DER-ESTOURO',sheet:derived.name,total:881,mapping:{...mapping,priceWithBdi:null},covers:['ORC-DER-INF'],codes:['PRICE_COMPONENT_DERIVATION_IMPOSSIBLE','ITEM_TOTAL_MISMATCH','ITEM_TOTAL_MISMATCH','ITEM_TOTAL_MISMATCH'],canProceed:false},
];
const baseOk=group('base','01_Revisao','Todas as exclusões e contraprovas de base',2);
const baseConflict=group('base','02_Conflitos','Conflitos de preço e unidade');
for(const c of cases.filter(c=>c.kind==='base')) {
 const g=c.expected.conflicts?baseConflict:baseOk;
 append(g,c);g.expected.accepted+=c.expected.accepted;g.expected.reasons.push(...c.expected.reasons.filter(x=>x!=='Antes do cabeçalho'));g.expected.conflicts+=c.expected.conflicts;
}
baseOk.expected.reasons.push('Antes do cabeçalho');
const baseEmpty=group('base','03_Sem_validos','Todos os preços excluídos');
for(const c of cases.filter(c=>c.kind==='base'&&c.expected.accepted===0)) {append(baseEmpty,c);baseEmpty.expected.reasons.push(...c.expected.reasons);}
const cmp=group('comparison','01_Comparacao','Resultados de comparação e contraprovas');
cmp.expected={statuses:[],total:0};
export const comparisonBases={SINAPI:[baseHeader],ORSE:[baseHeader]};
for(const c of cases.filter(c=>c.kind==='comparison')) {
 append(cmp,c,{scope:c.id!=='CMP-FLUXO'});
 const prefix=`T${cases.indexOf(c)+1}X`;
 for(const original of c.baseRows.slice(1)) {
  const r=structuredClone(original);if(c.id!=='CMP-FLUXO'){r[0]=prefix+normal(r[0]);r[1]=prefix+' '+r[1];}
  comparisonBases[c.source].push([...r,c.id,c.title]);
 }
 cmp.expected.statuses.push(...c.expected.statuses);
 // Soma aritmética dos valores informados; sem consulta ao motor.
 cmp.expected.total+=c.rows.slice(1).reduce((s,r)=>s+Number(r[8]),0);
}
cmp.expected.total=Math.round(cmp.expected.total*100)/100;cmp.total=cmp.expected.total;cmp.tolerance=0.01;
for(const [source,rows] of Object.entries(comparisonBases)) {
 groups.push({kind:'comparison-base',name:source,source,rows,header:1,cells:{},hiddenRows:[],hiddenColumns:[],merges:[],members:[]});
}
for(const [id,name] of [['CMP-FLUXO','02_ABC_limites'],['CMP-CRUZA-FONTES','03_ABC_cruzamento']]) {
 const c=find(id),g=group('comparison',name,c.title);append(g,c,{scope:id!=='CMP-FLUXO'});g.total=c.total;g.tolerance=0;g.expected={...c.expected};
}
// Cabeçalhos de rastreabilidade ficam fora do mapeamento do programa.
for(const g of groups) {
 const h=g.rows[g.header-1];g.rows[g.header-1]=[...h,'Caso','Objetivo'];
}
export const coverage=cases.map(c=>({id:c.id,locations:groups.flatMap(g=>g.members.filter(m=>m.id===c.id).map(m=>({file:books[g.kind],sheet:g.name,rows:m.rows}))),runs:runs.filter(r=>r.covers.includes(c.id)).map(r=>r.id)}));
export {mapping,baseMapping};
