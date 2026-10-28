// Oráculo declarativo: expectativas derivadas das regras documentadas, nunca do motor.
export const budgetHeader = ['Código','Fonte','Descrição','Unidade','Quantidade','Preço sem BDI','BDI','Preço com BDI','Total do item'];
export const baseHeader = ['Código','Descrição','Unidade','Preço'];
export const mapping = {code:0,source:1,description:2,unit:3,quantity:4,priceWithoutBdi:5,bdi:6,priceWithBdi:7,totalWithBdi:8};
export const baseMapping = {code:0,description:1,unit:2,price:3};
export const policy = {caseInsensitive:true,stripSeparators:true};
const row = () => ['0001','SINAPI','Tubo PVC','m',2,100,0.2,120,240];
export const cases = [];
function add(id,title,rows,expected={},extra={}) {
  cases.push({id,title,kind:'budget',header:1,total:240,rows:[budgetHeader,...rows],
    expected:{accepted:1,codes:[],canProceed:true,...expected},counter:'ORC-OK-001',...extra});
}
add('ORC-OK-001','Fluxo válido: 2 × 100 × (1 + 20%) = 240',[row()]);
for (const [field,col] of Object.entries(mapping).filter(([,c])=>c<4)) {
  const r=row();r[col]='';add(`ORC-EST-${col+1}`,`Identidade ausente: ${field}`,[r],{accepted:0,codes:['NO_BUDGET_ITEMS','STRUCTURAL_ROW'],canProceed:false});
}
for (const [field,col] of Object.entries(mapping).filter(([,c])=>c>=4)) {
  for (const [suffix,value,code] of [['VAZ','', 'BUDGET_ITEM_EMPTY_OR_ZERO'],['ZERO',0,'BUDGET_ITEM_EMPTY_OR_ZERO'],['NEG',-1,'MAPPED_VALUE_NEGATIVE'],['TXT','abc','MAPPED_VALUE_NOT_NUMERIC']]) {
    const r=row();r[col]=suffix==='NEG'&&field==='bdi'?-0.2:value;
    const excluded=['VAZ','ZERO'].includes(suffix);
    add(`ORC-${col}-${suffix}`,`${field}: ${suffix}`,[r],{accepted:excluded?0:1,codes:excluded?['NO_BUDGET_ITEMS',code]:[code],canProceed:false});
  }
  for(const [suffix,meta,code] of [['ERR',{formula:'1/0',error:'#DIV/0!'},'MAPPED_FORMULA_ERROR'],['CACHE',{formula:'1+1'},'MAPPED_FORMULA_WITHOUT_VALUE']]) {
    const r=row();r[col]='';add(`ORC-${col}-${suffix}`,`${field}: ${suffix}`,[r],{codes:[code],canProceed:false},{cells:{[`${String.fromCharCode(65+col)}2`]:meta}});
  }
}
add('ORC-EXC-001','Vazio/zero exclui antes de avaliar outro campo negativo',[[...row().slice(0,4),0,-1,0.2,120,240]],{accepted:0,codes:['NO_BUDGET_ITEMS','BUDGET_ITEM_EMPTY_OR_ZERO'],canProceed:false});
add('ORC-EXC-002','Estrutural tem precedência sobre finanças inválidas', [['','SINAPI','Título','',-1,'abc',0,0,0]],{accepted:0,codes:['NO_BUDGET_ITEMS','STRUCTURAL_ROW'],canProceed:false});
add('ORC-EXC-003','Linha vazia é ignorada',[[],row()]);
add('ORC-EXC-004','Cabeçalho repetido desconsiderado',[budgetHeader,row()],{codes:['REPEATED_HEADER']});
add('ORC-EXC-005','Conteúdo antes do cabeçalho desconsiderado',[row()],{codes:['BEFORE_HEADER']},{header:2,rows:[['Relatório sintético'],budgetHeader,row()]});
for(const [name,value] of [['VAZ',''],['TXT','abc'],['ZERO',0],['NEG',-1]]) {
  const valid=['ZERO','NEG'].includes(name);
  add(`ORC-TOT-${name}`,`Total geral ${name}`,[row()],{codes:valid?['NON_POSITIVE_VALUE','GENERAL_TOTAL_AUDITED_MISMATCH']:['GENERAL_TOTAL_INVALID'],canProceed:valid},{total:value});
}
add('ORC-MAP-001','Menos de dois componentes mapeados',[row()],{codes:['PRICE_COMPONENTS_INSUFFICIENT'],canProceed:false},{mapping:{...mapping,bdi:null,priceWithBdi:null}});
add('ORC-MAP-002','Total do item não mapeado',[row()],{codes:['ITEM_TOTAL_COLUMN_MISSING'],canProceed:false},{mapping:{...mapping,totalWithBdi:null}});
for(const [id,missing,expectedPrices] of [['ORC-DER-SEM','priceWithoutBdi',[100,0.2,120]],['ORC-DER-COM','priceWithBdi',[100,0.2,120]],['ORC-DER-BDI','bdi',[100,0.2,120]]])
  add(id,`Derivação de ${missing}`,[row()],{prices:expectedPrices},{mapping:{...mapping,[missing]:null}});
for(const [name,withPrice,total,rate] of [['ZERO',100,200,0],['NEG',90,180,-0.1]]) {
  const r=row();r[7]=withPrice;r[8]=total;
  add(`ORC-DER-${name}`,`Caracterização: BDI derivado ${name}`,[r],{prices:[100,rate,withPrice]},{mapping:{...mapping,bdi:null},total});
}
add('ORC-DER-INF','Derivação impossível por estouro numérico',[['1','SINAPI','Estouro','m',1,1e308,100,'',1]],{codes:['PRICE_COMPONENT_DERIVATION_IMPOSSIBLE'],canProceed:false},{mapping:{...mapping,priceWithBdi:null},total:1});
add('ORC-ERR-BDI','BDI: 100 × 1,2 = 120, informado 121',[['1','SINAPI','Tubo PVC','m',2,100,0.2,121,242]],{codes:['BDI_APPLICATION_MISMATCH']},{total:242});
add('ORC-ERR-ITEM','Total: 2 × 120 = 240, informado 241',[['1','SINAPI','Tubo PVC','m',2,100,0.2,120,241]],{codes:['ITEM_TOTAL_MISMATCH']});
add('ORC-ERR-GERAL','Total geral 241 diverge da soma 240',[row()],{codes:['GENERAL_TOTAL_AUDITED_MISMATCH']},{total:241});
add('ORC-ERR-COMP','Erros dos itens se compensam no geral',[[...row().slice(0,8),241],['2','SINAPI','Outro','m',2,100,0.2,120,239]],{accepted:2,codes:['ITEM_TOTAL_MISMATCH','ITEM_TOTAL_MISMATCH']},{total:480});
for(const [suffix,price,total] of [['MEIO',10.075,10.08],['ABAIXO',10.074999,10.07],['ACIMA',10.075001,10.08]])
 add(`ORC-ROUND-${suffix}`,'Arredondamento decimal no meio centavo',[['1','SINAPI','Meio centavo','m',1,10,0.0075,price,total]],{auditedSum:total},{total});
for(const [id,delta,trigger] of [['ORC-LIM-DENTRO',0.009,false],['ORC-LIM-IGUAL',0.01,false],['ORC-LIM-FORA',0.02,true]])
  add(id,'Tolerância do total do item R$ 0,01',[[...row().slice(0,8),240+delta]],{codes:trigger?['ITEM_TOTAL_MISMATCH']:[]});
for(const [id,total,trigger] of [['ORC-LIM-GERAL',480.02,false],['ORC-LIM-GERAL-FORA',480.03,true]])
  add(id,'Tolerância geral = 2 × 0,01',[row(),['2','SINAPI','Outro','m',2,100,0.2,120,240]],{accepted:2,codes:trigger?['GENERAL_TOTAL_AUDITED_MISMATCH']:[]},{total});
add('ORC-AV-DUP','Duplicidade física consecutiva',[row(),row()],{accepted:2,codes:['CONSECUTIVE_DUPLICATE_ITEM']},{total:480});
add('ORC-CP-DUP','Duplicidade não consecutiva',[row(),[],row()],{accepted:2},{total:480});
add('ORC-AV-PRECO','Mesmo item com preços diferentes',[row(),['1','SINAPI','Tubo PVC','m',2,110,0.2,132,264]],{accepted:2,codes:['IDENTICAL_ITEM_DIFFERENT_PRICES']},{total:504});
add('ORC-CP-PRECO','Outro código permite preço diferente',[row(),['2','SINAPI','Outro','m',2,110,0.2,132,264]],{accepted:2},{total:504});
add('ORC-AV-BDI','Descrição normalizada comum com BDI diferente',[row(),['2','ORSE','Túbo  PVC','un',2,100,0.3,130,260]],{accepted:2,codes:['SAME_DESCRIPTION_DIFFERENT_BDI']},{total:500});
add('ORC-AV-BDI-DER','Aviso usa BDI derivado',[row(),['2','ORSE','Túbo  PVC','un',2,100,'',130,260]],{accepted:2,codes:['SAME_DESCRIPTION_DIFFERENT_BDI']},{total:500,mapping:{...mapping,bdi:null}});
add('ORC-CP-BDI','20%, 20 e 0,2 são equivalentes',[row(),['2','ORSE','Tubo PVC','un',2,100,'20%',120,240],['3','SINAPI','Tubo PVC','m',2,100,20,120,240]],{accepted:3},{total:720});
const formulas=Array.from({length:5},(_,i)=>[String(i+1),'SINAPI',`Item ${i+1}`,'m',2,100,0.2,120,240]);
const formulaCells=Object.fromEntries([2,3,4,5].map(r=>[`I${r}`,{formula:`E${r}*H${r}`} ]));
add('ORC-AV-MANUAL','4 de 5 células calculadas e uma manual',formulas,{accepted:5,codes:['MANUAL_VALUE_IN_FORMULA_COLUMN']},{total:1200,cells:formulaCells});
add('ORC-CP-MANUAL','Todas as 5 fórmulas seguem o padrão',formulas,{accepted:5},{total:1200,cells:{...formulaCells,I6:{formula:'E6*H6'}}});
add('ORC-AV-PADRAO','Uma fórmula diferente do padrão',formulas,{accepted:5,codes:['FORMULA_PATTERN_MISMATCH']},{total:1200,cells:{...formulaCells,I6:{formula:'SUM(H6,H6)'}}});
add('ORC-VIS-001','Linha oculta não participa do total',[row(),['2','SINAPI','Oculto','m',2,500,0.2,600,1200]],{},{hiddenRows:[2]});
add('ORC-VIS-002','Coluna obrigatória oculta retira identidade',[row()],{accepted:0,codes:['NO_BUDGET_ITEMS','STRUCTURAL_ROW'],canProceed:false},{hiddenColumns:[0]});
add('ORC-VIS-ANTES','Linha oculta antes do cabeçalho é ignorada',[row()],{},{header:2,rows:[['Título oculto'],budgetHeader,row()],hiddenRows:[0]});
add('ORC-VIS-INTERVALO','Intervalo de linhas ocultas ignora valores inválidos',[row(),['2','SINAPI','Oculto','m',0,-1,0,0,0],['3','SINAPI','Oculto','m',-1,10,0.2,12,-12]],{},{hiddenRows:[2,3]});
add('ORC-VIS-MESCLA','Título mesclado anterior é estrutural e mantém contexto',[row()],{codes:['BEFORE_HEADER']},{header:2,rows:[['Título mesclado'],budgetHeader,row()],merges:['A1:I1']});
add('ORC-VIS-FORMULA','Fórmula visível mantém cache mesmo referindo linha oculta',[[...row().slice(0,8),500],['2','SINAPI','Oculto','m',1,10,0.2,12,12]],{codes:['ITEM_TOTAL_MISMATCH']},{hiddenRows:[2],cells:{I2:{formula:'E2*H2+I3'}}});
const intercalados=Array.from({length:60},(_,i)=>[`g${i%30}`,'SINAPI',`Serviço ${i%30}`,'m',2,i<30?100:110,0.2,i<30?120:132,i<30?240:264]);
add('ORC-AV-GRUPOS','30 achados com linhas relacionadas intercaladas',intercalados,{accepted:60,codes:Array(30).fill('IDENTICAL_ITEM_DIFFERENT_PRICES')},{total:15120,counter:'ORC-CP-PRECO'});
function base(id,title,rows,expected={},extra={}) {cases.push({id,title,kind:'base',header:1,source:'SINAPI',rows:[baseHeader,...rows],expected:{accepted:1,reasons:[],conflicts:0,...expected},counter:'BASE-OK-001',...extra});}
base('BASE-OK-001','Preço positivo e identidade completa',[['0001','Tubo PVC','m',100]]);
for(const [id,value,reason] of [['VAZ','','Preço ausente'],['ZERO',0,'Preço zero'],['NEG',-1,'Preço negativo'],['TXT','abc','Preço não numérico']]) base(`BASE-${id}`,reason,[['1','Tubo PVC','m',value]],{accepted:0,reasons:[reason]});
for(const [id,meta,reason] of [['ERR',{formula:'1/0',error:'#DIV/0!'},'Erro de fórmula no preço'],['CACHE',{formula:'1+1'},'Fórmula do preço sem resultado válido']]) base(`BASE-${id}`,reason,[['1','Tubo PVC','m','']],{accepted:0,reasons:[reason]},{cells:{D2:meta}});
for(const col of [0,1,2]) {const r=['1','Tubo PVC','m',100];r[col]='';base(`BASE-EST-${col+1}`,'Identidade incompleta',[r],{accepted:0,reasons:['Linha estrutural']});}
base('BASE-CAB','Cabeçalho repetido',[baseHeader,['1','Tubo PVC','m',100]],{reasons:['Cabeçalho repetido']});
base('BASE-ANTES','Linha anterior ao cabeçalho',[['1','Tubo PVC','m',100]],{reasons:['Antes do cabeçalho']},{header:2,rows:[['Relatório'],baseHeader,['1','Tubo PVC','m',100]]});
base('BASE-VAZIA','Linhas vazias não geram revisão',[[],['1','Tubo PVC','m',100]]);
base('BASE-EQUIV','Consolidar 2 origens equivalentes',[['0001','Tubo PVC','m',100],['1','Túbo PVC','M',100]],{origins:2});
base('BASE-CON-PRECO','Duas referências com preço diferente',[['1','Tubo PVC','m',100],['1','Tubo PVC','m',101]],{accepted:2,conflicts:1});
base('BASE-CON-UNID','Duas referências com unidade diferente',[['1','Tubo PVC','m',100],['1','Tubo PVC','un',100]],{accepted:2,conflicts:1});
base('BASE-CP-DESC','Descrições diferentes não conflitam',[['1','Tubo PVC','m',100],['1','Conexão','un',101]],{accepted:2});
base('BASE-VIS','Conflito somente na linha oculta é ignorado',[['1','Tubo PVC','m',100],['1','Tubo PVC','un',101]],{},{hiddenRows:[2]});
function comparison(id,title,budgetRows,baseRows,expected,extra={}) {
 cases.push({id,title,kind:'comparison',header:1,rows:[budgetHeader,...budgetRows],baseRows:[baseHeader,...baseRows],source:'SINAPI',total:240,expected,counter:'CMP-FLUXO',...extra});
}
comparison('CMP-FLUXO','Quatro resultados e ABC 50/80/95/100',[
 ['0001','SINAPI','Descrição orçamento','m',1,50,0.2,60,60],
 ['002.0','SINAPI','Conexão','un',1,30,0.2,36,36],
 ['A3','SINAPI','Areia','m3',1,15,0.2,18,18],
 ['404','SINAPI','Ausente','m',1,5,0.2,6,6]],
 [['0001','Descrição base','un',60],['002.0','Conexão','un',30],['A3','Areia','m3',10]],
 {statuses:['abaixo','igual','acima','nao-encontrado'],differences:[-10,0,5,null],total:120,abc:['A','B','C','C']},{total:120});
comparison('CMP-CRUZA-FONTES','Item cruza 50% e barras usam o total do filtro',[
 ['1','SINAPI','Fonte A','m',1,50,0.2,60,60],['2','ORSE','Fonte B','m',1,33.333333,0.2,40,40]],
 [['1','Fonte A','m',50]],{statuses:['igual','nao-encontrado'],total:100,abc:['B','C']},{total:100});
for(const [id,p,tol,status] of [['IGUAL',100,0,'igual'],['LIM',100.01,0.01,'igual'],['MENOS',100.009,0.01,'igual'],['MAIS',100.011,0.01,'acima'],['ABAIXO',99,0.01,'abaixo']])
 comparison(`CMP-${id}`,'Limite absoluto de comparação',[['1','SINAPI','Tubo PVC','m',2,p,0.2,p*1.2,p*2.4]],[['1','Tubo PVC','m',100]],{statuses:[status]},{tolerance:tol});
for(const [id,desc,bases,status,source='SINAPI'] of [
 ['UNICO','Outra',[['1','Tubo PVC','un',100]],'igual'],
 ['MULTI','Túbo PVC',[['1','Tubo PVC','m',100],['1','Outro','m',90]],'igual'],
 ['MULTI-AUS','Ausente',[['1','Tubo PVC','m',100],['1','Outro','m',90]],'nao-encontrado'],
 ['SEM-DESC','Tubo PVC',[['2','Tubo PVC','m',100]],'nao-encontrado'],
 ['FONTE','Tubo PVC',[['1','Tubo PVC','m',100]],'nao-encontrado','ORSE'],
 ['ORSE-UNICO','Outra',[['1','Tubo PVC','un',100]],'igual','ORSE'],
 ['ORSE-MULTI','Tubo PVC',[['1','Tubo PVC','m',100],['1','Outro','m',90]],'igual','ORSE'],
 ['ORSE-AUS','Tubo PVC',[['2','Tubo PVC','m',100]],'nao-encontrado','ORSE']])
 comparison(`CMP-${id}`,'Busca restrita a fonte/código; descrição resolve múltiplos',[['1',source,desc,'m',2,100,0.2,120,240]],bases,{statuses:[status]},{source:id==='FONTE'?'SINAPI':source});
for(const c of cases.filter(c=>c.kind==='budget'&&c.expected.accepted===0)) c.expected.codes.push('GENERAL_TOTAL_AUDITED_MISMATCH');
export function sheetFor(c) {
 const sheet={name:c.id,rows:structuredClone(c.rows),formulas:[],cellErrors:[],hiddenRows:[],hiddenColumns:[],merges:[]};
 for(const i of c.hiddenRows||[]) sheet.hiddenRows[i]=true;
 for(const i of c.hiddenColumns||[]) sheet.hiddenColumns[i]=true;
 for(const ref of c.merges||[]) {const [a,b]=ref.split(':');sheet.merges.push({startRow:Number(a.slice(1))-1,startColumn:a.charCodeAt(0)-65,endRow:Number(b.slice(1))-1,endColumn:b.charCodeAt(0)-65});}
 for(const [ref,meta] of Object.entries(c.cells||{})) {
  const [,col,r]=ref.match(/^([A-Z])(\d+)$/);const ri=Number(r)-1,ci=col.charCodeAt(0)-65;
  (sheet.formulas[ri]??=[])[ci]=meta.formula||'';(sheet.cellErrors[ri]??=[])[ci]=meta.error||'';
 }
 return sheet;
}
