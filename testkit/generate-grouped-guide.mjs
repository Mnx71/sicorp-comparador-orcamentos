import fs from 'node:fs';
import {groups,runs,books,coverage,mapping} from './grouped-spec.mjs';
const count=xs=>Object.entries(xs.reduce((a,x)=>(a[x]=(a[x]||0)+1,a),{})).map(([x,n])=>`${n} × ${x}`).join('; ')||'Nenhum';
let text=`# Testes agrupados — SICORP rc.17

SICORP – Sistema de Comparação de Referenciais de Preços.

Desenvolvido pela Coordenação-Geral de Supervisão de Obras (CGSOB), do Departamento de Obras Hídricas e Apoio a Estudos sobre Segurança Hídrica (DOH), da Secretaria Nacional de Segurança Hídrica (SNSH).

Este é o percurso principal de homologação. O kit anterior, com uma aba por caso, permanece para diagnóstico. Os 114 IDs originais têm localização ou reexecução em [cobertura.csv](cobertura.csv). As expectativas são declaradas em \`testkit/grouped-spec.mjs\`, sem consulta ao motor. O HTML continua rc.17, SHA-256 \`7a275c849c2508ba64369a89e3470ecb863919f449836a98e6817f1fa73ff50b\`.

## Começar por três revisões conjuntas

1. Abrir o HTML em \`dist/\`. Importar **orcamento-agrupado.xlsx**, aba **01_Revisao**, cabeçalho físico **3**, total geral **22.190,23**. Mapear A=Código, B=Fonte, C=Descrição, D=Unidade, E=Quantidade, F=Preço sem BDI, G=BDI, H=Preço com BDI, I=Total. Não mapear J/K: são identificação e objetivo do caso. Clicar **Conferir e continuar**.
   Esperado: **92 itens**, **7 erros de cálculo**, **33 avisos**, **18 linhas desconsideradas**, **nenhum impedimento**. Soma auditada **22.180,23**. A diferença geral de **10,00** é intencional. Na categoria desconsideradas, esperar 11 ocorrências por vazio/zero, cinco estruturais, um cabeçalho repetido e um título anterior ao cabeçalho. As linhas vazias e ocultas não geram ocorrência.
2. Fechar a revisão, selecionar **02_Impedimentos**, cabeçalho **1**, total **240**, manter A:I. Uma única conferência mostra **20 impedimentos**: negativo, texto, erro de fórmula e fórmula sem cache em cada um dos cinco campos financeiros. Continuar fica desabilitado. A soma fica incompleta, portanto não se exige erro de fechamento geral neste grupo.
3. Em nova aba do navegador, importar **comparacao-agrupada.xlsx**, aba **01_Comparacao**, cabeçalho **1**, total **3.337,67**, mapear A:I e prosseguir. Na etapa Bases, importar esse mesmo arquivo, adicionar aba **SINAPI** associada a SINAPI e aba **ORSE** associada a ORSE. Em ambas, cabeçalho 1, A=Código, B=Descrição, C=Unidade, D=Preço. Confirmar a revisão de cada base. Comparar com tolerância **0,01**. Esperado: **19 resultados**, sendo **2 Abaixo, 9 Iguais, 2 Acima e 6 Não encontrados**. Os 15 cenários de comparação e suas contraprovas estão juntos nessa tabela.

Essas três operações concentram as detecções de linha e os resultados mais frequentes. Os grupos adicionais abaixo tratam condições que usam configuração global, predominância de fórmulas ou ausência de itens. Não precisam ser repetidos caso a caso.

Importar os arquivos originais do kit diretamente no SICORP. Não abrir e salvar no Excel/LibreOffice antes do teste: isso pode recalcular caches, preencher fórmulas sem resultado ou alterar erros intencionais. O programa lê os valores salvos e não recalcula as fórmulas. Números como \`20\`, \`20%\` e \`0,2\` na coluna de BDI são contraprovas equivalentes. Os códigos T… identificam os blocos e impedem colisões entre casos. Dentro de cada bloco são preservadas as relações de igualdade de código e descrição.

## Demais grupos de orçamento

| Aba | Cabeçalho | Total digitado | Configuração e resultado esperado |
| --- | ---: | ---: | --- |
| 03_Formulas | 1 | 3.600 | A:I; 15 itens, dois avisos: um valor manual e uma fórmula fora do padrão. Quatorze fórmulas em 15 itens preservam a predominância de 80%. As outras linhas são contraprovas. |
| 04_Sem_itens | 1 | 240 | A:I; zero itens, duas desconsideradas, um impedimento Nenhum item e um erro de fechamento contra soma zero. |
| 05_Derivados | 1 | 881 | Mapear A:F e H:I, deixar G/BDI sem vínculo. Cinco itens, um aviso de BDI diferente na mesma descrição. BDI derivado 0 e negativo são aceitos pela regra preservada. A linha extrema deriva BDI −1 com preço sem BDI 1e308 e preço com BDI 1. |
| 06_Controle | 1 | 480 | A:I; dois itens válidos e nenhuma ocorrência. Reutilizar para as variações globais abaixo. |
| 07_Coluna_oculta | 1 | 240 | A está oculta e não aparece como opção de mapeamento. A interface impede conferir por falta de Código. O motor, testado separadamente, vê linha estrutural e nenhum item. |

Em 05_Derivados, retirar H do mapeamento e vincular G reproduz o estouro de derivação: **um impedimento** de derivação impossível e **três erros do total do item** nas linhas cujos totais foram preparados para outro BDI. Restaurar G sem vínculo e H vinculado elimina o impedimento. Não confundir os valores preenchidos em G, ignorados nessa configuração, com o BDI efetivamente derivado de F/H.

## Parâmetros globais sem novas abas

Reutilizar **06_Controle**. Restaurar A:I e total 480 antes de cada variação. A conferência pode ser fechada e refeita na mesma sessão. Não editar o XLSX.

| Variação | Resultado esperado |
| --- | --- |
| Retirar apenas F | Deriva preço sem BDI 100 em cada item; nenhum achado |
| Retirar apenas H | Deriva preço com BDI 120; nenhum achado |
| Retirar apenas G | Deriva BDI 20%; nenhum achado |
| Total vazio ou abc | A interface mostra pré-requisito e não abre conferência. O motor registra GENERAL_TOTAL_INVALID. |
| Total 0 ou −1 | Um aviso de total não positivo e um erro de fechamento; permite prosseguir |
| Total 480,02 | Sem erro: dois itens admitem diferença geral até 0,02 |
| Total 480,03 ou 481 | Um erro de fechamento |
| Retirar G e H | A interface pede pelo menos dois componentes de preço. O motor registra PRICE_COMPONENTS_INSUFFICIENT. |
| Retirar I | A interface pede o total do item. O motor registra ITEM_TOTAL_COLUMN_MISSING. |

## Todas as exclusões de base em uma revisão

Abrir uma sessão limpa, carregar o orçamento **06_Controle**, conferir e continuar. Importar **bases-agrupadas.xlsx**, selecionar **01_Revisao**, fonte SINAPI, cabeçalho **2**, A=Código, B=Descrição, C=Unidade, D=Preço. E/F são notas e ficam sem mapeamento. Clicar Adicionar configuração.

Esperado antes da confirmação: **11 linhas desconsideradas**, reunindo preço ausente, zero, negativo, texto, erro de fórmula, fórmula sem resultado, três identidades incompletas, cabeçalho repetido e título anterior. Há **nove linhas válidas**, consolidadas em **oito referências canônicas**, pois duas são equivalentes. Nenhum conflito. A linha oculta não gera revisão.

Repetir em sessões limpas com **02_Conflitos**, cabeçalho 1: quatro referências e **dois conflitos** (preço e unidade). Após incorporar, a comparação fica impedida. Em **03_Sem_validos**, cabeçalho 1: **nove exclusões**, nenhum item válido, Adicionar configuração desabilitado. Usar o botão de revisão para ver todos os motivos. Não incorporar essas abas na mesma sessão da comparação principal.

## ABC, exportação e contraprovas visuais

As duas abas menores de orçamento em comparacao-agrupada.xlsx são necessárias porque a curva ABC depende do total do orçamento inteiro. Usar as bases já presentes no mesmo arquivo, em nova sessão para cada execução. Para 02_ABC_limites basta SINAPI. Para 03_ABC_cruzamento adicionar SINAPI e ORSE.

| Aba de orçamento | Total | Tolerância | Esperado |
| --- | ---: | ---: | --- |
| 02_ABC_limites | 120 | 0 | 0001 Abaixo/A, 002.0 Igual/B, A3 Acima/C, 404 Não encontrado/C. Participações 50/30/15/5%, acumulados 50/80/95/100%. |
| 03_ABC_cruzamento | 100 | 0 | Primeiro item Igual/B e segundo Não encontrado/C. O item que ultrapassa 50% entra em B. Barras por fonte usam escala 100, com 60% e 40%. |

Em 01_Comparacao, os casos CMP-LIM e CMP-MENOS são Iguais, CMP-MAIS é Acima. Fonte/código vêm antes da descrição, inclusive ORSE: descrições iguais com outro código não devem encontrar referência. CMP-UNICO e CMP-ORSE-UNICO com candidato único são Iguais mesmo com descrição/unidade diferentes. Nos demais casos, a descrição desambigua os candidatos do mesmo código.

Verificar amarelos nas descrições/unidades divergentes. Exportar Excel/CSV e copiar. Na comparação principal devem sair 19 linhas, respeitando filtros e ordem de colunas. CSV/cópia não conservam estilos. No XLSX, verificar status, amarelos, números numéricos, códigos textuais e cabeçalho congelado. O roteiro geral anterior detalha seleção de 17 colunas, persistência, teclado e rolagem.

## Por que não há somente uma aba

- Orçamento e base possuem esquemas e etapas diferentes.
- Impedimentos deixam a soma incompleta e suprimem o fechamento. Separá-los permite observar todos os erros de cálculo e o fechamento no primeiro grupo.
- Misturar as 15 linhas de fórmula com todas as linhas manuais faria desaparecer o aviso de predominância de 80%.
- “Nenhum item” conflita com a presença de itens válidos. Coluna obrigatória oculta impede o mapeamento antes da conferência.
- Derivação depende de uma coluna inteira sem vínculo. Parâmetros globais, como total e tolerância, têm apenas um valor por execução e são reconfigurados sem novas abas.
- Conflitos de base precisam ficar fora das bases usadas na comparação. Cada configuração de base aceita uma fonte, por isso SINAPI e ORSE estão separadas.
- ABC de 120 e ABC de 100 não podem compartilhar o mesmo total. Essas duas abas pequenas preservam as contraprovas exatas de fronteira.

São **15 abas no conjunto** (7 orçamento, 3 base e 5 comparação, incluindo duas fontes de base), em vez de 129. As abas principais concentram muitos casos simultâneos. CSV/TXT, BIFF5/BIFF8, ORSE válido e ORSE inválido continuam como arquivos próprios em \`testkit/fixtures/\`: testar um leitor diferente exige um arquivo daquele formato. Não é possível embuti-los em uma aba XLSX mantendo o mesmo teste de leitura.

## Registro e expectativas completas

Preencher [execucao-manual.csv](execucao-manual.csv), inicialmente **Não executado**. Automação não substitui execução por pessoa. Registrar versão, navegador/sistema, executor, observado e evidência. A inspeção no Excel/LibreOffice e no Windows continua pendente.

As tabelas seguintes são geradas somente do oráculo declarativo. Repetições indicam ocorrências distintas. “Aceitos” significa itens preservados para conferência no orçamento ou referências canônicas na base; um item aceito ainda pode conter impedimento numérico.

## Esperado por grupo

| Arquivo / aba | Cabeçalho | Total | Aceitos/resultados | Esperado |
| --- | ---: | ---: | ---: | --- |
`;
for(const g of groups.filter(g=>g.kind!=='comparison-base'))text+=`| ${books[g.kind]} / ${g.name} | ${g.header} | ${g.kind==='base'?'—':g.total} | ${g.expected.accepted??g.expected.statuses.length} | ${g.kind==='base'?count(g.expected.reasons)+`; ${g.expected.conflicts} conflitos`:g.kind==='comparison'?count(g.expected.statuses):count(g.expected.codes)} |\n`;
text+='\n## Localização das linhas e contraprovas\n\nAs linhas são físicas, incluindo cabeçalhos, linhas vazias e ocultas. O título antes do cabeçalho é uma ocorrência global comum na primeira revisão. Os esperados originais NO_BUDGET_ITEMS e fechamento contra zero não se repetem em cada bloco excluído, pois o grupo possui itens válidos. O ensaio 04_Sem_itens cobre essas consequências. BEFORE_HEADER foi consolidado no título comum.\n\n| Caso | Arquivo / aba | Linhas ou reexecução | Esperado no bloco |\n| --- | --- | --- | --- |\n';
for(const c of coverage) {
 for(const l of c.locations) {
  const g=groups.find(g=>books[g.kind]===l.file&&g.name===l.sheet),m=g.members.find(m=>m.id===c.id),e=m.originalExpected;
  let expected=g.kind==='comparison'?count(e.statuses):g.kind==='base'?count(e.reasons):count(e.codes.filter(code=>!['NO_BUDGET_ITEMS','GENERAL_TOTAL_AUDITED_MISMATCH','BEFORE_HEADER'].includes(code)));
  if(g.name==='04_Sem_itens'||g.name==='07_Coluna_oculta')expected=count(g.expected.codes);
  if(c.id==='ORC-DER-INF'&&g.name==='05_Derivados')expected='BDI derivado −1 sem impedimento; DER-ESTOURO testa H não mapeado';
  text+=`| ${c.id} | ${l.file} / ${l.sheet} | ${l.rows.join(', ')} | ${expected} |\n`;
 }
 if(c.runs.length)text+=`| ${c.id} | orcamento-agrupado.xlsx | ${c.runs.join(', ')} | Ver parâmetros globais e spec.json |\n`;
}
fs.writeFileSync('testkit/agrupados/LEIA-ME.md',text);
