import fs from 'node:fs';
import {cases,mapping,baseMapping} from './spec.mjs';
const format=v=>v===null?'(não mapeado)':typeof v==='object'?JSON.stringify(v):String(v??'');
const cell=v=>format(v).replaceAll('|','\\|').replaceAll('\n',' ');
const counts=list=>Object.entries((list||[]).reduce((a,k)=>(a[k]=(a[k]||0)+1,a),{})).map(([k,n])=>`${k}${n>1?' × '+n:''}`).join('; ')||'Nenhum';
const expected=c=>c.kind==='budget'?`${c.expected.accepted} item(ns); ${c.expected.canProceed?'avanço permitido':'avanço impedido'}; ${counts(c.expected.codes)}`:c.kind==='base'?`${c.expected.accepted} item(ns); ${c.expected.conflicts} conflito(s); exclusões: ${counts(c.expected.reasons)}`:c.expected.statuses.join(', ');
const lines=['# Matriz de auditoria da rc.17','','SICORP – Sistema de Comparação de Referenciais de Preços.','','Desenvolvido pela Coordenação-Geral de Supervisão de Obras (CGSOB), do Departamento de Obras Hídricas e Apoio a Estudos sobre Segurança Hídrica (DOH), da Secretaria Nacional de Segurança Hídrica (SNSH).','','Expectativas declaradas em `testkit/spec.mjs`, sem consultar o motor. Os dados completos, os mapeamentos e as células especiais estão em `testkit/cases.json`. A execução observada é registrada separadamente em `qa/evidence/cases-report.json` e `qa/evidence/browser/report.json`. Homologação manual por pessoa: **não executada nesta entrega**.','','Configuração comum: iniciar sessão limpa para cada caso. Cabeçalho indicado por caso. Orçamento A=Código, B=Fonte, C=Descrição, D=Unidade, E=Quantidade, F=Sem BDI, G=BDI, H=Com BDI, I=Total do item. Bases A=Código, B=Descrição, C=Unidade, D=Preço. Ativar remoção de separadores e comparação sem diferenciar caixa. A tolerância da conferência é R$ 0,01 por item; comparação usa a tolerância indicada (padrão zero).','','| ID | Finalidade | Arquivo / aba | Cabeçalho / total geral | Resultado esperado | Contraprova |','| --- | --- | --- | --- | --- | --- |'];
for(const c of cases) lines.push(`| ${c.id} | ${cell(c.title)} | ${c.kind}.xlsx / ${c.id} | ${c.header} / ${c.kind==='base'?'não se aplica':cell(c.total)} | ${cell(expected(c))} | ${c.counter===c.id?'CMP-IGUAL':c.counter} |`);
lines.push('','## Reprodução por caso','','As tabelas seguintes mostram os valores originais. O cabeçalho e a linha física são preservados. Fórmulas especiais são aplicadas nos arquivos XLSX após a geração para testar explicitamente ausência de cache e erros. Não abrir e salvar esses arquivos em Excel antes de carregar no SICORP, pois o recálculo pode mudar o cenário.');
for(const c of cases) {
 lines.push('',`### ${c.id}`,'',c.title+'.','',`Arquivo: testkit/fixtures/${c.kind}.xlsx. Aba: ${c.id}. Cabeçalho físico: ${c.header}.`, '',c.kind==='base'?`Associar à fonte ${c.source}.`:`Total geral a digitar: **${cell(c.total)||'(deixar vazio)'}**.`, '',`Mapeamento: ${JSON.stringify(c.kind==='base'?baseMapping:c.mapping||mapping)} (índices iniciam em zero; null significa remover o mapeamento).`,'',`Esperado: ${expected(c)}.`, '',`Contraprova: ${c.counter===c.id?'CMP-IGUAL':c.counter}.`);
 if(c.hiddenRows)lines.push('',`Linhas físicas ocultas no arquivo: ${c.hiddenRows.map(r=>r+1).join(', ')}. Devem ser ignoradas integralmente.`);
 if(c.hiddenColumns)lines.push('',`Colunas ocultas: ${c.hiddenColumns.map(i=>String.fromCharCode(65+i)).join(', ')}. Devem ficar fora do mapeamento e da análise.`);
 if(c.cells)lines.push('',`Células especiais: ${JSON.stringify(c.cells)}. Fórmula sem valor original na tabela não tem cache. Erros indicados devem ser lidos como erros de fórmula.`);
 if(c.merges)lines.push('',`Mesclas: ${c.merges.join(', ')}.`);
 if(c.expected.prices)lines.push('',`Sem BDI / BDI efetivo / com BDI esperados: ${c.expected.prices.join(' / ')}.`);
 if(c.expected.auditedSum!==undefined)lines.push('',`Soma auditada esperada: ${c.expected.auditedSum}. Arredondamento decimal para o centavo mais próximo; meio centavo positivo arredonda para cima.`);
 lines.push('','| Linha | '+Array.from({length:c.kind==='base'?4:9},(_,i)=>String.fromCharCode(65+i)).join(' | ')+' |','| --- | '+Array(c.kind==='base'?4:9).fill('---').join(' | ')+' |');
 c.rows.forEach((r,i)=>lines.push(`| ${i+1} | ${Array.from({length:c.kind==='base'?4:9},(_,j)=>cell(r[j])).join(' | ')} |`));
 if(c.kind==='comparison') {
  lines.push('',`Adicionar como base a aba ${c.id}-BASE do mesmo arquivo. Fonte associada: ${c.source}. Cabeçalho 1, mapeamento A:D. Tolerância: ${c.tolerance||0}.`,'','| Linha | Código | Descrição | Unidade | Preço |','| --- | --- | --- | --- | --- |');
  c.baseRows.forEach((r,i)=>lines.push(`| ${i+1} | ${r.map(cell).join(' | ')} |`));
  lines.push('','Na revisão, confirmar a adição da base. Prosseguir à comparação e clicar Comparar. As linhas de orçamento válidas participam da comparação e da exportação. Itens excluídos não participam.');
 }
}
fs.writeFileSync('docs/MATRIZ_AUDITORIA.md',lines.join('\n')+'\n');
const csv=[['ID','Finalidade','Arquivo','Aba','Cabecalho','TotalGeral','Mapeamento','Esperado','Contraprova','ValidacaoManual'],...cases.map(c=>[c.id,c.title,`${c.kind}.xlsx`,c.id,c.header,c.kind==='base'?'':c.total,JSON.stringify(c.mapping||(c.kind==='base'?baseMapping:mapping)),expected(c),c.counter===c.id?'CMP-IGUAL':c.counter,'Não executada por pessoa'])];
fs.writeFileSync('testkit/matriz.csv','\uFEFF'+csv.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(';')).join('\r\n'));
const manual=[['ID','Versao','Commit','Ambiente','Data','Executor','Observado','Evidencia','Situacao'],...cases.map(c=>[c.id,'4.4.0-rc.17','','','','','','','Não executado'])];
fs.writeFileSync('testkit/execucao-manual.csv','\uFEFF'+manual.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';')).join('\r\n'));
console.log(`Matriz independente: ${cases.length} casos.`);
