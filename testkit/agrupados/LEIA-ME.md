# Testes agrupados — SICORP rc.17

SICORP – Sistema de Comparação de Referenciais de Preços.

Desenvolvido pela Coordenação-Geral de Supervisão de Obras (CGSOB), do Departamento de Obras Hídricas e Apoio a Estudos sobre Segurança Hídrica (DOH), da Secretaria Nacional de Segurança Hídrica (SNSH).

Este é o percurso principal de homologação. O kit anterior, com uma aba por caso, permanece para diagnóstico. Os 114 IDs originais têm localização ou reexecução em [cobertura.csv](cobertura.csv). As expectativas são declaradas em `testkit/grouped-spec.mjs`, sem consulta ao motor. O HTML continua rc.17, SHA-256 `7a275c849c2508ba64369a89e3470ecb863919f449836a98e6817f1fa73ff50b`.

## Começar por três revisões conjuntas

1. Abrir o HTML em `dist/`. Importar **orcamento-agrupado.xlsx**, aba **01_Revisao**, cabeçalho físico **3**, total geral **22.190,23**. Mapear A=Código, B=Fonte, C=Descrição, D=Unidade, E=Quantidade, F=Preço sem BDI, G=BDI, H=Preço com BDI, I=Total. Não mapear J/K: são identificação e objetivo do caso. Clicar **Conferir e continuar**.
   Esperado: **92 itens**, **7 erros de cálculo**, **33 avisos**, **18 linhas desconsideradas**, **nenhum impedimento**. Soma auditada **22.180,23**. A diferença geral de **10,00** é intencional. Na categoria desconsideradas, esperar 11 ocorrências por vazio/zero, cinco estruturais, um cabeçalho repetido e um título anterior ao cabeçalho. As linhas vazias e ocultas não geram ocorrência.
2. Fechar a revisão, selecionar **02_Impedimentos**, cabeçalho **1**, total **240**, manter A:I. Uma única conferência mostra **20 impedimentos**: negativo, texto, erro de fórmula e fórmula sem cache em cada um dos cinco campos financeiros. Continuar fica desabilitado. A soma fica incompleta, portanto não se exige erro de fechamento geral neste grupo.
3. Em nova aba do navegador, importar **comparacao-agrupada.xlsx**, aba **01_Comparacao**, cabeçalho **1**, total **3.337,67**, mapear A:I e prosseguir. Na etapa Bases, importar esse mesmo arquivo, adicionar aba **SINAPI** associada a SINAPI e aba **ORSE** associada a ORSE. Em ambas, cabeçalho 1, A=Código, B=Descrição, C=Unidade, D=Preço. Confirmar a revisão de cada base. Comparar com tolerância **0,01**. Esperado: **19 resultados**, sendo **2 Abaixo, 9 Iguais, 2 Acima e 6 Não encontrados**. Os 15 cenários de comparação e suas contraprovas estão juntos nessa tabela.

Essas três operações concentram as detecções de linha e os resultados mais frequentes. Os grupos adicionais abaixo tratam condições que usam configuração global, predominância de fórmulas ou ausência de itens. Não precisam ser repetidos caso a caso.

Importar os arquivos originais do kit diretamente no SICORP. Não abrir e salvar no Excel/LibreOffice antes do teste: isso pode recalcular caches, preencher fórmulas sem resultado ou alterar erros intencionais. O programa lê os valores salvos e não recalcula as fórmulas. Números como `20`, `20%` e `0,2` na coluna de BDI são contraprovas equivalentes. Os códigos T… identificam os blocos e impedem colisões entre casos. Dentro de cada bloco são preservadas as relações de igualdade de código e descrição.

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

São **15 abas no conjunto** (7 orçamento, 3 base e 5 comparação, incluindo duas fontes de base), em vez de 129. As abas principais concentram muitos casos simultâneos. CSV/TXT, BIFF5/BIFF8, ORSE válido e ORSE inválido continuam como arquivos próprios em `testkit/fixtures/`: testar um leitor diferente exige um arquivo daquele formato. Não é possível embuti-los em uma aba XLSX mantendo o mesmo teste de leitura.

## Registro e expectativas completas

Preencher [execucao-manual.csv](execucao-manual.csv), inicialmente **Não executado**. Automação não substitui execução por pessoa. Registrar versão, navegador/sistema, executor, observado e evidência. A inspeção no Excel/LibreOffice e no Windows continua pendente.

As tabelas seguintes são geradas somente do oráculo declarativo. Repetições indicam ocorrências distintas. “Aceitos” significa itens preservados para conferência no orçamento ou referências canônicas na base; um item aceito ainda pode conter impedimento numérico.

## Esperado por grupo

| Arquivo / aba | Cabeçalho | Total | Aceitos/resultados | Esperado |
| --- | ---: | ---: | ---: | --- |
| orcamento-agrupado.xlsx / 01_Revisao | 3 | 22190.23 | 92 | 5 × STRUCTURAL_ROW; 11 × BUDGET_ITEM_EMPTY_OR_ZERO; 1 × REPEATED_HEADER; 1 × BDI_APPLICATION_MISMATCH; 5 × ITEM_TOTAL_MISMATCH; 1 × CONSECUTIVE_DUPLICATE_ITEM; 31 × IDENTICAL_ITEM_DIFFERENT_PRICES; 1 × SAME_DESCRIPTION_DIFFERENT_BDI; 1 × BEFORE_HEADER; 1 × GENERAL_TOTAL_AUDITED_MISMATCH |
| orcamento-agrupado.xlsx / 02_Impedimentos | 1 | 240 | 20 | 5 × MAPPED_VALUE_NEGATIVE; 5 × MAPPED_VALUE_NOT_NUMERIC; 5 × MAPPED_FORMULA_ERROR; 5 × MAPPED_FORMULA_WITHOUT_VALUE |
| orcamento-agrupado.xlsx / 03_Formulas | 1 | 3600 | 15 | 1 × MANUAL_VALUE_IN_FORMULA_COLUMN; 1 × FORMULA_PATTERN_MISMATCH |
| orcamento-agrupado.xlsx / 04_Sem_itens | 1 | 240 | 0 | 1 × BUDGET_ITEM_EMPTY_OR_ZERO; 1 × STRUCTURAL_ROW; 1 × NO_BUDGET_ITEMS; 1 × GENERAL_TOTAL_AUDITED_MISMATCH |
| orcamento-agrupado.xlsx / 05_Derivados | 1 | 881 | 5 | 1 × SAME_DESCRIPTION_DIFFERENT_BDI |
| orcamento-agrupado.xlsx / 06_Controle | 1 | 480 | 2 | Nenhum |
| orcamento-agrupado.xlsx / 07_Coluna_oculta | 1 | 240 | 0 | 1 × STRUCTURAL_ROW; 1 × NO_BUDGET_ITEMS; 1 × GENERAL_TOTAL_AUDITED_MISMATCH |
| bases-agrupadas.xlsx / 01_Revisao | 2 | — | 8 | 1 × Preço ausente; 1 × Preço zero; 1 × Preço negativo; 1 × Preço não numérico; 1 × Erro de fórmula no preço; 1 × Fórmula do preço sem resultado válido; 3 × Linha estrutural; 1 × Cabeçalho repetido; 1 × Antes do cabeçalho; 0 conflitos |
| bases-agrupadas.xlsx / 02_Conflitos | 1 | — | 4 | Nenhum; 2 conflitos |
| bases-agrupadas.xlsx / 03_Sem_validos | 1 | — | 0 | 1 × Preço ausente; 1 × Preço zero; 1 × Preço negativo; 1 × Preço não numérico; 1 × Erro de fórmula no preço; 1 × Fórmula do preço sem resultado válido; 3 × Linha estrutural; 0 conflitos |
| comparacao-agrupada.xlsx / 01_Comparacao | 1 | 3337.67 | 19 | 2 × abaixo; 9 × igual; 2 × acima; 6 × nao-encontrado |
| comparacao-agrupada.xlsx / 02_ABC_limites | 1 | 120 | 4 | 1 × abaixo; 1 × igual; 1 × acima; 1 × nao-encontrado |
| comparacao-agrupada.xlsx / 03_ABC_cruzamento | 1 | 100 | 2 | 1 × igual; 1 × nao-encontrado |

## Localização das linhas e contraprovas

As linhas são físicas, incluindo cabeçalhos, linhas vazias e ocultas. O título antes do cabeçalho é uma ocorrência global comum na primeira revisão. Os esperados originais NO_BUDGET_ITEMS e fechamento contra zero não se repetem em cada bloco excluído, pois o grupo possui itens válidos. O ensaio 04_Sem_itens cobre essas consequências. BEFORE_HEADER foi consolidado no título comum.

| Caso | Arquivo / aba | Linhas ou reexecução | Esperado no bloco |
| --- | --- | --- | --- |
| ORC-OK-001 | orcamento-agrupado.xlsx / 01_Revisao | 4 | Nenhum |
| ORC-OK-001 | orcamento-agrupado.xlsx | CTRL-OK | Ver parâmetros globais e spec.json |
| ORC-EST-1 | orcamento-agrupado.xlsx / 01_Revisao | 5 | 1 × STRUCTURAL_ROW |
| ORC-EST-1 | orcamento-agrupado.xlsx / 04_Sem_itens | 3 | 1 × BUDGET_ITEM_EMPTY_OR_ZERO; 1 × STRUCTURAL_ROW; 1 × NO_BUDGET_ITEMS; 1 × GENERAL_TOTAL_AUDITED_MISMATCH |
| ORC-EST-2 | orcamento-agrupado.xlsx / 01_Revisao | 6 | 1 × STRUCTURAL_ROW |
| ORC-EST-3 | orcamento-agrupado.xlsx / 01_Revisao | 7 | 1 × STRUCTURAL_ROW |
| ORC-EST-4 | orcamento-agrupado.xlsx / 01_Revisao | 8 | 1 × STRUCTURAL_ROW |
| ORC-4-VAZ | orcamento-agrupado.xlsx / 01_Revisao | 9 | 1 × BUDGET_ITEM_EMPTY_OR_ZERO |
| ORC-4-VAZ | orcamento-agrupado.xlsx / 04_Sem_itens | 2 | 1 × BUDGET_ITEM_EMPTY_OR_ZERO; 1 × STRUCTURAL_ROW; 1 × NO_BUDGET_ITEMS; 1 × GENERAL_TOTAL_AUDITED_MISMATCH |
| ORC-4-ZERO | orcamento-agrupado.xlsx / 01_Revisao | 10 | 1 × BUDGET_ITEM_EMPTY_OR_ZERO |
| ORC-4-NEG | orcamento-agrupado.xlsx / 02_Impedimentos | 2 | 1 × MAPPED_VALUE_NEGATIVE |
| ORC-4-TXT | orcamento-agrupado.xlsx / 02_Impedimentos | 3 | 1 × MAPPED_VALUE_NOT_NUMERIC |
| ORC-4-ERR | orcamento-agrupado.xlsx / 02_Impedimentos | 4 | 1 × MAPPED_FORMULA_ERROR |
| ORC-4-CACHE | orcamento-agrupado.xlsx / 02_Impedimentos | 5 | 1 × MAPPED_FORMULA_WITHOUT_VALUE |
| ORC-5-VAZ | orcamento-agrupado.xlsx / 01_Revisao | 11 | 1 × BUDGET_ITEM_EMPTY_OR_ZERO |
| ORC-5-ZERO | orcamento-agrupado.xlsx / 01_Revisao | 12 | 1 × BUDGET_ITEM_EMPTY_OR_ZERO |
| ORC-5-NEG | orcamento-agrupado.xlsx / 02_Impedimentos | 6 | 1 × MAPPED_VALUE_NEGATIVE |
| ORC-5-TXT | orcamento-agrupado.xlsx / 02_Impedimentos | 7 | 1 × MAPPED_VALUE_NOT_NUMERIC |
| ORC-5-ERR | orcamento-agrupado.xlsx / 02_Impedimentos | 8 | 1 × MAPPED_FORMULA_ERROR |
| ORC-5-CACHE | orcamento-agrupado.xlsx / 02_Impedimentos | 9 | 1 × MAPPED_FORMULA_WITHOUT_VALUE |
| ORC-6-VAZ | orcamento-agrupado.xlsx / 01_Revisao | 13 | 1 × BUDGET_ITEM_EMPTY_OR_ZERO |
| ORC-6-ZERO | orcamento-agrupado.xlsx / 01_Revisao | 14 | 1 × BUDGET_ITEM_EMPTY_OR_ZERO |
| ORC-6-NEG | orcamento-agrupado.xlsx / 02_Impedimentos | 10 | 1 × MAPPED_VALUE_NEGATIVE |
| ORC-6-TXT | orcamento-agrupado.xlsx / 02_Impedimentos | 11 | 1 × MAPPED_VALUE_NOT_NUMERIC |
| ORC-6-ERR | orcamento-agrupado.xlsx / 02_Impedimentos | 12 | 1 × MAPPED_FORMULA_ERROR |
| ORC-6-CACHE | orcamento-agrupado.xlsx / 02_Impedimentos | 13 | 1 × MAPPED_FORMULA_WITHOUT_VALUE |
| ORC-7-VAZ | orcamento-agrupado.xlsx / 01_Revisao | 15 | 1 × BUDGET_ITEM_EMPTY_OR_ZERO |
| ORC-7-ZERO | orcamento-agrupado.xlsx / 01_Revisao | 16 | 1 × BUDGET_ITEM_EMPTY_OR_ZERO |
| ORC-7-NEG | orcamento-agrupado.xlsx / 02_Impedimentos | 14 | 1 × MAPPED_VALUE_NEGATIVE |
| ORC-7-TXT | orcamento-agrupado.xlsx / 02_Impedimentos | 15 | 1 × MAPPED_VALUE_NOT_NUMERIC |
| ORC-7-ERR | orcamento-agrupado.xlsx / 02_Impedimentos | 16 | 1 × MAPPED_FORMULA_ERROR |
| ORC-7-CACHE | orcamento-agrupado.xlsx / 02_Impedimentos | 17 | 1 × MAPPED_FORMULA_WITHOUT_VALUE |
| ORC-8-VAZ | orcamento-agrupado.xlsx / 01_Revisao | 17 | 1 × BUDGET_ITEM_EMPTY_OR_ZERO |
| ORC-8-ZERO | orcamento-agrupado.xlsx / 01_Revisao | 18 | 1 × BUDGET_ITEM_EMPTY_OR_ZERO |
| ORC-8-NEG | orcamento-agrupado.xlsx / 02_Impedimentos | 18 | 1 × MAPPED_VALUE_NEGATIVE |
| ORC-8-TXT | orcamento-agrupado.xlsx / 02_Impedimentos | 19 | 1 × MAPPED_VALUE_NOT_NUMERIC |
| ORC-8-ERR | orcamento-agrupado.xlsx / 02_Impedimentos | 20 | 1 × MAPPED_FORMULA_ERROR |
| ORC-8-CACHE | orcamento-agrupado.xlsx / 02_Impedimentos | 21 | 1 × MAPPED_FORMULA_WITHOUT_VALUE |
| ORC-EXC-001 | orcamento-agrupado.xlsx / 01_Revisao | 19 | 1 × BUDGET_ITEM_EMPTY_OR_ZERO |
| ORC-EXC-002 | orcamento-agrupado.xlsx / 01_Revisao | 20 | 1 × STRUCTURAL_ROW |
| ORC-EXC-003 | orcamento-agrupado.xlsx / 01_Revisao | 21, 22 | Nenhum |
| ORC-EXC-004 | orcamento-agrupado.xlsx / 01_Revisao | 23, 24 | 1 × REPEATED_HEADER |
| ORC-EXC-005 | orcamento-agrupado.xlsx / 01_Revisao | 25 | Nenhum |
| ORC-TOT-VAZ | orcamento-agrupado.xlsx | CTRL-TOT-VAZ | Ver parâmetros globais e spec.json |
| ORC-TOT-TXT | orcamento-agrupado.xlsx | CTRL-TOT-TXT | Ver parâmetros globais e spec.json |
| ORC-TOT-ZERO | orcamento-agrupado.xlsx | CTRL-TOT-ZERO | Ver parâmetros globais e spec.json |
| ORC-TOT-NEG | orcamento-agrupado.xlsx | CTRL-TOT-NEG | Ver parâmetros globais e spec.json |
| ORC-MAP-001 | orcamento-agrupado.xlsx | CTRL-MAP-001 | Ver parâmetros globais e spec.json |
| ORC-MAP-002 | orcamento-agrupado.xlsx | CTRL-MAP-002 | Ver parâmetros globais e spec.json |
| ORC-DER-SEM | orcamento-agrupado.xlsx | CTRL-DER-SEM | Ver parâmetros globais e spec.json |
| ORC-DER-COM | orcamento-agrupado.xlsx | CTRL-DER-COM | Ver parâmetros globais e spec.json |
| ORC-DER-BDI | orcamento-agrupado.xlsx | CTRL-DER-BDI | Ver parâmetros globais e spec.json |
| ORC-DER-ZERO | orcamento-agrupado.xlsx / 05_Derivados | 2 | Nenhum |
| ORC-DER-NEG | orcamento-agrupado.xlsx / 05_Derivados | 3 | Nenhum |
| ORC-DER-INF | orcamento-agrupado.xlsx / 05_Derivados | 4 | BDI derivado −1 sem impedimento; DER-ESTOURO testa H não mapeado |
| ORC-DER-INF | orcamento-agrupado.xlsx | DER-ESTOURO | Ver parâmetros globais e spec.json |
| ORC-ERR-BDI | orcamento-agrupado.xlsx / 01_Revisao | 26 | 1 × BDI_APPLICATION_MISMATCH |
| ORC-ERR-ITEM | orcamento-agrupado.xlsx / 01_Revisao | 27 | 1 × ITEM_TOTAL_MISMATCH |
| ORC-ERR-GERAL | orcamento-agrupado.xlsx | CTRL-ORC-ERR-GERAL | Ver parâmetros globais e spec.json |
| ORC-ERR-COMP | orcamento-agrupado.xlsx / 01_Revisao | 28, 29 | 2 × ITEM_TOTAL_MISMATCH |
| ORC-ROUND-MEIO | orcamento-agrupado.xlsx / 01_Revisao | 30 | Nenhum |
| ORC-ROUND-ABAIXO | orcamento-agrupado.xlsx / 01_Revisao | 31 | Nenhum |
| ORC-ROUND-ACIMA | orcamento-agrupado.xlsx / 01_Revisao | 32 | Nenhum |
| ORC-LIM-DENTRO | orcamento-agrupado.xlsx / 01_Revisao | 33 | Nenhum |
| ORC-LIM-IGUAL | orcamento-agrupado.xlsx / 01_Revisao | 34 | Nenhum |
| ORC-LIM-FORA | orcamento-agrupado.xlsx / 01_Revisao | 35 | 1 × ITEM_TOTAL_MISMATCH |
| ORC-LIM-GERAL | orcamento-agrupado.xlsx | CTRL-ORC-LIM-GERAL | Ver parâmetros globais e spec.json |
| ORC-LIM-GERAL-FORA | orcamento-agrupado.xlsx | CTRL-ORC-LIM-GERAL-FORA | Ver parâmetros globais e spec.json |
| ORC-AV-DUP | orcamento-agrupado.xlsx / 01_Revisao | 36, 37 | 1 × CONSECUTIVE_DUPLICATE_ITEM |
| ORC-CP-DUP | orcamento-agrupado.xlsx / 01_Revisao | 38, 39, 40 | Nenhum |
| ORC-AV-PRECO | orcamento-agrupado.xlsx / 01_Revisao | 41, 42 | 1 × IDENTICAL_ITEM_DIFFERENT_PRICES |
| ORC-CP-PRECO | orcamento-agrupado.xlsx / 01_Revisao | 43, 44 | Nenhum |
| ORC-AV-BDI | orcamento-agrupado.xlsx / 01_Revisao | 45, 46 | 1 × SAME_DESCRIPTION_DIFFERENT_BDI |
| ORC-AV-BDI-DER | orcamento-agrupado.xlsx / 05_Derivados | 5, 6 | 1 × SAME_DESCRIPTION_DIFFERENT_BDI |
| ORC-CP-BDI | orcamento-agrupado.xlsx / 01_Revisao | 47, 48, 49 | Nenhum |
| ORC-AV-MANUAL | orcamento-agrupado.xlsx / 03_Formulas | 2, 3, 4, 5, 6 | 1 × MANUAL_VALUE_IN_FORMULA_COLUMN |
| ORC-CP-MANUAL | orcamento-agrupado.xlsx / 03_Formulas | 7, 8, 9, 10, 11 | Nenhum |
| ORC-AV-PADRAO | orcamento-agrupado.xlsx / 03_Formulas | 12, 13, 14, 15, 16 | 1 × FORMULA_PATTERN_MISMATCH |
| ORC-VIS-001 | orcamento-agrupado.xlsx / 01_Revisao | 50, 51 | Nenhum |
| ORC-VIS-002 | orcamento-agrupado.xlsx / 07_Coluna_oculta | 2 | 1 × STRUCTURAL_ROW; 1 × NO_BUDGET_ITEMS; 1 × GENERAL_TOTAL_AUDITED_MISMATCH |
| ORC-VIS-ANTES | orcamento-agrupado.xlsx / 01_Revisao | 52 | Nenhum |
| ORC-VIS-INTERVALO | orcamento-agrupado.xlsx / 01_Revisao | 53, 54, 55 | Nenhum |
| ORC-VIS-MESCLA | orcamento-agrupado.xlsx / 01_Revisao | 56 | Nenhum |
| ORC-VIS-FORMULA | orcamento-agrupado.xlsx / 01_Revisao | 57, 58 | 1 × ITEM_TOTAL_MISMATCH |
| ORC-AV-GRUPOS | orcamento-agrupado.xlsx / 01_Revisao | 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118 | 30 × IDENTICAL_ITEM_DIFFERENT_PRICES |
| BASE-OK-001 | bases-agrupadas.xlsx / 01_Revisao | 3 | Nenhum |
| BASE-VAZ | bases-agrupadas.xlsx / 01_Revisao | 4 | 1 × Preço ausente |
| BASE-VAZ | bases-agrupadas.xlsx / 03_Sem_validos | 2 | 1 × Preço ausente |
| BASE-ZERO | bases-agrupadas.xlsx / 01_Revisao | 5 | 1 × Preço zero |
| BASE-ZERO | bases-agrupadas.xlsx / 03_Sem_validos | 3 | 1 × Preço zero |
| BASE-NEG | bases-agrupadas.xlsx / 01_Revisao | 6 | 1 × Preço negativo |
| BASE-NEG | bases-agrupadas.xlsx / 03_Sem_validos | 4 | 1 × Preço negativo |
| BASE-TXT | bases-agrupadas.xlsx / 01_Revisao | 7 | 1 × Preço não numérico |
| BASE-TXT | bases-agrupadas.xlsx / 03_Sem_validos | 5 | 1 × Preço não numérico |
| BASE-ERR | bases-agrupadas.xlsx / 01_Revisao | 8 | 1 × Erro de fórmula no preço |
| BASE-ERR | bases-agrupadas.xlsx / 03_Sem_validos | 6 | 1 × Erro de fórmula no preço |
| BASE-CACHE | bases-agrupadas.xlsx / 01_Revisao | 9 | 1 × Fórmula do preço sem resultado válido |
| BASE-CACHE | bases-agrupadas.xlsx / 03_Sem_validos | 7 | 1 × Fórmula do preço sem resultado válido |
| BASE-EST-1 | bases-agrupadas.xlsx / 01_Revisao | 10 | 1 × Linha estrutural |
| BASE-EST-1 | bases-agrupadas.xlsx / 03_Sem_validos | 8 | 1 × Linha estrutural |
| BASE-EST-2 | bases-agrupadas.xlsx / 01_Revisao | 11 | 1 × Linha estrutural |
| BASE-EST-2 | bases-agrupadas.xlsx / 03_Sem_validos | 9 | 1 × Linha estrutural |
| BASE-EST-3 | bases-agrupadas.xlsx / 01_Revisao | 12 | 1 × Linha estrutural |
| BASE-EST-3 | bases-agrupadas.xlsx / 03_Sem_validos | 10 | 1 × Linha estrutural |
| BASE-CAB | bases-agrupadas.xlsx / 01_Revisao | 13, 14 | 1 × Cabeçalho repetido |
| BASE-ANTES | bases-agrupadas.xlsx / 01_Revisao | 15 | 1 × Antes do cabeçalho |
| BASE-VAZIA | bases-agrupadas.xlsx / 01_Revisao | 16, 17 | Nenhum |
| BASE-EQUIV | bases-agrupadas.xlsx / 01_Revisao | 18, 19 | Nenhum |
| BASE-CON-PRECO | bases-agrupadas.xlsx / 02_Conflitos | 2, 3 | Nenhum |
| BASE-CON-UNID | bases-agrupadas.xlsx / 02_Conflitos | 4, 5 | Nenhum |
| BASE-CP-DESC | bases-agrupadas.xlsx / 01_Revisao | 20, 21 | Nenhum |
| BASE-VIS | bases-agrupadas.xlsx / 01_Revisao | 22, 23 | Nenhum |
| CMP-FLUXO | comparacao-agrupada.xlsx / 01_Comparacao | 2, 3, 4, 5 | 1 × abaixo; 1 × igual; 1 × acima; 1 × nao-encontrado |
| CMP-FLUXO | comparacao-agrupada.xlsx / 02_ABC_limites | 2, 3, 4, 5 | 1 × abaixo; 1 × igual; 1 × acima; 1 × nao-encontrado |
| CMP-CRUZA-FONTES | comparacao-agrupada.xlsx / 01_Comparacao | 6, 7 | 1 × igual; 1 × nao-encontrado |
| CMP-CRUZA-FONTES | comparacao-agrupada.xlsx / 03_ABC_cruzamento | 2, 3 | 1 × igual; 1 × nao-encontrado |
| CMP-IGUAL | comparacao-agrupada.xlsx / 01_Comparacao | 8 | 1 × igual |
| CMP-LIM | comparacao-agrupada.xlsx / 01_Comparacao | 9 | 1 × igual |
| CMP-MENOS | comparacao-agrupada.xlsx / 01_Comparacao | 10 | 1 × igual |
| CMP-MAIS | comparacao-agrupada.xlsx / 01_Comparacao | 11 | 1 × acima |
| CMP-ABAIXO | comparacao-agrupada.xlsx / 01_Comparacao | 12 | 1 × abaixo |
| CMP-UNICO | comparacao-agrupada.xlsx / 01_Comparacao | 13 | 1 × igual |
| CMP-MULTI | comparacao-agrupada.xlsx / 01_Comparacao | 14 | 1 × igual |
| CMP-MULTI-AUS | comparacao-agrupada.xlsx / 01_Comparacao | 15 | 1 × nao-encontrado |
| CMP-SEM-DESC | comparacao-agrupada.xlsx / 01_Comparacao | 16 | 1 × nao-encontrado |
| CMP-FONTE | comparacao-agrupada.xlsx / 01_Comparacao | 17 | 1 × nao-encontrado |
| CMP-ORSE-UNICO | comparacao-agrupada.xlsx / 01_Comparacao | 18 | 1 × igual |
| CMP-ORSE-MULTI | comparacao-agrupada.xlsx / 01_Comparacao | 19 | 1 × igual |
| CMP-ORSE-AUS | comparacao-agrupada.xlsx / 01_Comparacao | 20 | 1 × nao-encontrado |
