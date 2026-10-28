# Matriz de auditoria da rc.17

SICORP – Sistema de Comparação de Referenciais de Preços.

Desenvolvido pela Coordenação-Geral de Supervisão de Obras (CGSOB), do Departamento de Obras Hídricas e Apoio a Estudos sobre Segurança Hídrica (DOH), da Secretaria Nacional de Segurança Hídrica (SNSH).

Expectativas declaradas em `testkit/spec.mjs`, sem consultar o motor. Os dados completos, os mapeamentos e as células especiais estão em `testkit/cases.json`. A execução observada é registrada separadamente em `qa/evidence/cases-report.json` e `qa/evidence/browser/report.json`. Homologação manual por pessoa: **não executada nesta entrega**.

Configuração comum: iniciar sessão limpa para cada caso. Cabeçalho indicado por caso. Orçamento A=Código, B=Fonte, C=Descrição, D=Unidade, E=Quantidade, F=Sem BDI, G=BDI, H=Com BDI, I=Total do item. Bases A=Código, B=Descrição, C=Unidade, D=Preço. Ativar remoção de separadores e comparação sem diferenciar caixa. A tolerância da conferência é R$ 0,01 por item; comparação usa a tolerância indicada (padrão zero).

| ID | Finalidade | Arquivo / aba | Cabeçalho / total geral | Resultado esperado | Contraprova |
| --- | --- | --- | --- | --- | --- |
| ORC-OK-001 | Fluxo válido: 2 × 100 × (1 + 20%) = 240 | budget.xlsx / ORC-OK-001 | 1 / 240 | 1 item(ns); avanço permitido; Nenhum | CMP-IGUAL |
| ORC-EST-1 | Identidade ausente: code | budget.xlsx / ORC-EST-1 | 1 / 240 | 0 item(ns); avanço impedido; NO_BUDGET_ITEMS; STRUCTURAL_ROW; GENERAL_TOTAL_AUDITED_MISMATCH | ORC-OK-001 |
| ORC-EST-2 | Identidade ausente: source | budget.xlsx / ORC-EST-2 | 1 / 240 | 0 item(ns); avanço impedido; NO_BUDGET_ITEMS; STRUCTURAL_ROW; GENERAL_TOTAL_AUDITED_MISMATCH | ORC-OK-001 |
| ORC-EST-3 | Identidade ausente: description | budget.xlsx / ORC-EST-3 | 1 / 240 | 0 item(ns); avanço impedido; NO_BUDGET_ITEMS; STRUCTURAL_ROW; GENERAL_TOTAL_AUDITED_MISMATCH | ORC-OK-001 |
| ORC-EST-4 | Identidade ausente: unit | budget.xlsx / ORC-EST-4 | 1 / 240 | 0 item(ns); avanço impedido; NO_BUDGET_ITEMS; STRUCTURAL_ROW; GENERAL_TOTAL_AUDITED_MISMATCH | ORC-OK-001 |
| ORC-4-VAZ | quantity: VAZ | budget.xlsx / ORC-4-VAZ | 1 / 240 | 0 item(ns); avanço impedido; NO_BUDGET_ITEMS; BUDGET_ITEM_EMPTY_OR_ZERO; GENERAL_TOTAL_AUDITED_MISMATCH | ORC-OK-001 |
| ORC-4-ZERO | quantity: ZERO | budget.xlsx / ORC-4-ZERO | 1 / 240 | 0 item(ns); avanço impedido; NO_BUDGET_ITEMS; BUDGET_ITEM_EMPTY_OR_ZERO; GENERAL_TOTAL_AUDITED_MISMATCH | ORC-OK-001 |
| ORC-4-NEG | quantity: NEG | budget.xlsx / ORC-4-NEG | 1 / 240 | 1 item(ns); avanço impedido; MAPPED_VALUE_NEGATIVE | ORC-OK-001 |
| ORC-4-TXT | quantity: TXT | budget.xlsx / ORC-4-TXT | 1 / 240 | 1 item(ns); avanço impedido; MAPPED_VALUE_NOT_NUMERIC | ORC-OK-001 |
| ORC-4-ERR | quantity: ERR | budget.xlsx / ORC-4-ERR | 1 / 240 | 1 item(ns); avanço impedido; MAPPED_FORMULA_ERROR | ORC-OK-001 |
| ORC-4-CACHE | quantity: CACHE | budget.xlsx / ORC-4-CACHE | 1 / 240 | 1 item(ns); avanço impedido; MAPPED_FORMULA_WITHOUT_VALUE | ORC-OK-001 |
| ORC-5-VAZ | priceWithoutBdi: VAZ | budget.xlsx / ORC-5-VAZ | 1 / 240 | 0 item(ns); avanço impedido; NO_BUDGET_ITEMS; BUDGET_ITEM_EMPTY_OR_ZERO; GENERAL_TOTAL_AUDITED_MISMATCH | ORC-OK-001 |
| ORC-5-ZERO | priceWithoutBdi: ZERO | budget.xlsx / ORC-5-ZERO | 1 / 240 | 0 item(ns); avanço impedido; NO_BUDGET_ITEMS; BUDGET_ITEM_EMPTY_OR_ZERO; GENERAL_TOTAL_AUDITED_MISMATCH | ORC-OK-001 |
| ORC-5-NEG | priceWithoutBdi: NEG | budget.xlsx / ORC-5-NEG | 1 / 240 | 1 item(ns); avanço impedido; MAPPED_VALUE_NEGATIVE | ORC-OK-001 |
| ORC-5-TXT | priceWithoutBdi: TXT | budget.xlsx / ORC-5-TXT | 1 / 240 | 1 item(ns); avanço impedido; MAPPED_VALUE_NOT_NUMERIC | ORC-OK-001 |
| ORC-5-ERR | priceWithoutBdi: ERR | budget.xlsx / ORC-5-ERR | 1 / 240 | 1 item(ns); avanço impedido; MAPPED_FORMULA_ERROR | ORC-OK-001 |
| ORC-5-CACHE | priceWithoutBdi: CACHE | budget.xlsx / ORC-5-CACHE | 1 / 240 | 1 item(ns); avanço impedido; MAPPED_FORMULA_WITHOUT_VALUE | ORC-OK-001 |
| ORC-6-VAZ | bdi: VAZ | budget.xlsx / ORC-6-VAZ | 1 / 240 | 0 item(ns); avanço impedido; NO_BUDGET_ITEMS; BUDGET_ITEM_EMPTY_OR_ZERO; GENERAL_TOTAL_AUDITED_MISMATCH | ORC-OK-001 |
| ORC-6-ZERO | bdi: ZERO | budget.xlsx / ORC-6-ZERO | 1 / 240 | 0 item(ns); avanço impedido; NO_BUDGET_ITEMS; BUDGET_ITEM_EMPTY_OR_ZERO; GENERAL_TOTAL_AUDITED_MISMATCH | ORC-OK-001 |
| ORC-6-NEG | bdi: NEG | budget.xlsx / ORC-6-NEG | 1 / 240 | 1 item(ns); avanço impedido; MAPPED_VALUE_NEGATIVE | ORC-OK-001 |
| ORC-6-TXT | bdi: TXT | budget.xlsx / ORC-6-TXT | 1 / 240 | 1 item(ns); avanço impedido; MAPPED_VALUE_NOT_NUMERIC | ORC-OK-001 |
| ORC-6-ERR | bdi: ERR | budget.xlsx / ORC-6-ERR | 1 / 240 | 1 item(ns); avanço impedido; MAPPED_FORMULA_ERROR | ORC-OK-001 |
| ORC-6-CACHE | bdi: CACHE | budget.xlsx / ORC-6-CACHE | 1 / 240 | 1 item(ns); avanço impedido; MAPPED_FORMULA_WITHOUT_VALUE | ORC-OK-001 |
| ORC-7-VAZ | priceWithBdi: VAZ | budget.xlsx / ORC-7-VAZ | 1 / 240 | 0 item(ns); avanço impedido; NO_BUDGET_ITEMS; BUDGET_ITEM_EMPTY_OR_ZERO; GENERAL_TOTAL_AUDITED_MISMATCH | ORC-OK-001 |
| ORC-7-ZERO | priceWithBdi: ZERO | budget.xlsx / ORC-7-ZERO | 1 / 240 | 0 item(ns); avanço impedido; NO_BUDGET_ITEMS; BUDGET_ITEM_EMPTY_OR_ZERO; GENERAL_TOTAL_AUDITED_MISMATCH | ORC-OK-001 |
| ORC-7-NEG | priceWithBdi: NEG | budget.xlsx / ORC-7-NEG | 1 / 240 | 1 item(ns); avanço impedido; MAPPED_VALUE_NEGATIVE | ORC-OK-001 |
| ORC-7-TXT | priceWithBdi: TXT | budget.xlsx / ORC-7-TXT | 1 / 240 | 1 item(ns); avanço impedido; MAPPED_VALUE_NOT_NUMERIC | ORC-OK-001 |
| ORC-7-ERR | priceWithBdi: ERR | budget.xlsx / ORC-7-ERR | 1 / 240 | 1 item(ns); avanço impedido; MAPPED_FORMULA_ERROR | ORC-OK-001 |
| ORC-7-CACHE | priceWithBdi: CACHE | budget.xlsx / ORC-7-CACHE | 1 / 240 | 1 item(ns); avanço impedido; MAPPED_FORMULA_WITHOUT_VALUE | ORC-OK-001 |
| ORC-8-VAZ | totalWithBdi: VAZ | budget.xlsx / ORC-8-VAZ | 1 / 240 | 0 item(ns); avanço impedido; NO_BUDGET_ITEMS; BUDGET_ITEM_EMPTY_OR_ZERO; GENERAL_TOTAL_AUDITED_MISMATCH | ORC-OK-001 |
| ORC-8-ZERO | totalWithBdi: ZERO | budget.xlsx / ORC-8-ZERO | 1 / 240 | 0 item(ns); avanço impedido; NO_BUDGET_ITEMS; BUDGET_ITEM_EMPTY_OR_ZERO; GENERAL_TOTAL_AUDITED_MISMATCH | ORC-OK-001 |
| ORC-8-NEG | totalWithBdi: NEG | budget.xlsx / ORC-8-NEG | 1 / 240 | 1 item(ns); avanço impedido; MAPPED_VALUE_NEGATIVE | ORC-OK-001 |
| ORC-8-TXT | totalWithBdi: TXT | budget.xlsx / ORC-8-TXT | 1 / 240 | 1 item(ns); avanço impedido; MAPPED_VALUE_NOT_NUMERIC | ORC-OK-001 |
| ORC-8-ERR | totalWithBdi: ERR | budget.xlsx / ORC-8-ERR | 1 / 240 | 1 item(ns); avanço impedido; MAPPED_FORMULA_ERROR | ORC-OK-001 |
| ORC-8-CACHE | totalWithBdi: CACHE | budget.xlsx / ORC-8-CACHE | 1 / 240 | 1 item(ns); avanço impedido; MAPPED_FORMULA_WITHOUT_VALUE | ORC-OK-001 |
| ORC-EXC-001 | Vazio/zero exclui antes de avaliar outro campo negativo | budget.xlsx / ORC-EXC-001 | 1 / 240 | 0 item(ns); avanço impedido; NO_BUDGET_ITEMS; BUDGET_ITEM_EMPTY_OR_ZERO; GENERAL_TOTAL_AUDITED_MISMATCH | ORC-OK-001 |
| ORC-EXC-002 | Estrutural tem precedência sobre finanças inválidas | budget.xlsx / ORC-EXC-002 | 1 / 240 | 0 item(ns); avanço impedido; NO_BUDGET_ITEMS; STRUCTURAL_ROW; GENERAL_TOTAL_AUDITED_MISMATCH | ORC-OK-001 |
| ORC-EXC-003 | Linha vazia é ignorada | budget.xlsx / ORC-EXC-003 | 1 / 240 | 1 item(ns); avanço permitido; Nenhum | ORC-OK-001 |
| ORC-EXC-004 | Cabeçalho repetido desconsiderado | budget.xlsx / ORC-EXC-004 | 1 / 240 | 1 item(ns); avanço permitido; REPEATED_HEADER | ORC-OK-001 |
| ORC-EXC-005 | Conteúdo antes do cabeçalho desconsiderado | budget.xlsx / ORC-EXC-005 | 2 / 240 | 1 item(ns); avanço permitido; BEFORE_HEADER | ORC-OK-001 |
| ORC-TOT-VAZ | Total geral VAZ | budget.xlsx / ORC-TOT-VAZ | 1 /  | 1 item(ns); avanço impedido; GENERAL_TOTAL_INVALID | ORC-OK-001 |
| ORC-TOT-TXT | Total geral TXT | budget.xlsx / ORC-TOT-TXT | 1 / abc | 1 item(ns); avanço impedido; GENERAL_TOTAL_INVALID | ORC-OK-001 |
| ORC-TOT-ZERO | Total geral ZERO | budget.xlsx / ORC-TOT-ZERO | 1 / 0 | 1 item(ns); avanço permitido; NON_POSITIVE_VALUE; GENERAL_TOTAL_AUDITED_MISMATCH | ORC-OK-001 |
| ORC-TOT-NEG | Total geral NEG | budget.xlsx / ORC-TOT-NEG | 1 / -1 | 1 item(ns); avanço permitido; NON_POSITIVE_VALUE; GENERAL_TOTAL_AUDITED_MISMATCH | ORC-OK-001 |
| ORC-MAP-001 | Menos de dois componentes mapeados | budget.xlsx / ORC-MAP-001 | 1 / 240 | 1 item(ns); avanço impedido; PRICE_COMPONENTS_INSUFFICIENT | ORC-OK-001 |
| ORC-MAP-002 | Total do item não mapeado | budget.xlsx / ORC-MAP-002 | 1 / 240 | 1 item(ns); avanço impedido; ITEM_TOTAL_COLUMN_MISSING | ORC-OK-001 |
| ORC-DER-SEM | Derivação de priceWithoutBdi | budget.xlsx / ORC-DER-SEM | 1 / 240 | 1 item(ns); avanço permitido; Nenhum | ORC-OK-001 |
| ORC-DER-COM | Derivação de priceWithBdi | budget.xlsx / ORC-DER-COM | 1 / 240 | 1 item(ns); avanço permitido; Nenhum | ORC-OK-001 |
| ORC-DER-BDI | Derivação de bdi | budget.xlsx / ORC-DER-BDI | 1 / 240 | 1 item(ns); avanço permitido; Nenhum | ORC-OK-001 |
| ORC-DER-ZERO | Caracterização: BDI derivado ZERO | budget.xlsx / ORC-DER-ZERO | 1 / 200 | 1 item(ns); avanço permitido; Nenhum | ORC-OK-001 |
| ORC-DER-NEG | Caracterização: BDI derivado NEG | budget.xlsx / ORC-DER-NEG | 1 / 180 | 1 item(ns); avanço permitido; Nenhum | ORC-OK-001 |
| ORC-DER-INF | Derivação impossível por estouro numérico | budget.xlsx / ORC-DER-INF | 1 / 1 | 1 item(ns); avanço impedido; PRICE_COMPONENT_DERIVATION_IMPOSSIBLE | ORC-OK-001 |
| ORC-ERR-BDI | BDI: 100 × 1,2 = 120, informado 121 | budget.xlsx / ORC-ERR-BDI | 1 / 242 | 1 item(ns); avanço permitido; BDI_APPLICATION_MISMATCH | ORC-OK-001 |
| ORC-ERR-ITEM | Total: 2 × 120 = 240, informado 241 | budget.xlsx / ORC-ERR-ITEM | 1 / 240 | 1 item(ns); avanço permitido; ITEM_TOTAL_MISMATCH | ORC-OK-001 |
| ORC-ERR-GERAL | Total geral 241 diverge da soma 240 | budget.xlsx / ORC-ERR-GERAL | 1 / 241 | 1 item(ns); avanço permitido; GENERAL_TOTAL_AUDITED_MISMATCH | ORC-OK-001 |
| ORC-ERR-COMP | Erros dos itens se compensam no geral | budget.xlsx / ORC-ERR-COMP | 1 / 480 | 2 item(ns); avanço permitido; ITEM_TOTAL_MISMATCH × 2 | ORC-OK-001 |
| ORC-ROUND-MEIO | Arredondamento decimal no meio centavo | budget.xlsx / ORC-ROUND-MEIO | 1 / 10.08 | 1 item(ns); avanço permitido; Nenhum | ORC-OK-001 |
| ORC-ROUND-ABAIXO | Arredondamento decimal no meio centavo | budget.xlsx / ORC-ROUND-ABAIXO | 1 / 10.07 | 1 item(ns); avanço permitido; Nenhum | ORC-OK-001 |
| ORC-ROUND-ACIMA | Arredondamento decimal no meio centavo | budget.xlsx / ORC-ROUND-ACIMA | 1 / 10.08 | 1 item(ns); avanço permitido; Nenhum | ORC-OK-001 |
| ORC-LIM-DENTRO | Tolerância do total do item R$ 0,01 | budget.xlsx / ORC-LIM-DENTRO | 1 / 240 | 1 item(ns); avanço permitido; Nenhum | ORC-OK-001 |
| ORC-LIM-IGUAL | Tolerância do total do item R$ 0,01 | budget.xlsx / ORC-LIM-IGUAL | 1 / 240 | 1 item(ns); avanço permitido; Nenhum | ORC-OK-001 |
| ORC-LIM-FORA | Tolerância do total do item R$ 0,01 | budget.xlsx / ORC-LIM-FORA | 1 / 240 | 1 item(ns); avanço permitido; ITEM_TOTAL_MISMATCH | ORC-OK-001 |
| ORC-LIM-GERAL | Tolerância geral = 2 × 0,01 | budget.xlsx / ORC-LIM-GERAL | 1 / 480.02 | 2 item(ns); avanço permitido; Nenhum | ORC-OK-001 |
| ORC-LIM-GERAL-FORA | Tolerância geral = 2 × 0,01 | budget.xlsx / ORC-LIM-GERAL-FORA | 1 / 480.03 | 2 item(ns); avanço permitido; GENERAL_TOTAL_AUDITED_MISMATCH | ORC-OK-001 |
| ORC-AV-DUP | Duplicidade física consecutiva | budget.xlsx / ORC-AV-DUP | 1 / 480 | 2 item(ns); avanço permitido; CONSECUTIVE_DUPLICATE_ITEM | ORC-OK-001 |
| ORC-CP-DUP | Duplicidade não consecutiva | budget.xlsx / ORC-CP-DUP | 1 / 480 | 2 item(ns); avanço permitido; Nenhum | ORC-OK-001 |
| ORC-AV-PRECO | Mesmo item com preços diferentes | budget.xlsx / ORC-AV-PRECO | 1 / 504 | 2 item(ns); avanço permitido; IDENTICAL_ITEM_DIFFERENT_PRICES | ORC-OK-001 |
| ORC-CP-PRECO | Outro código permite preço diferente | budget.xlsx / ORC-CP-PRECO | 1 / 504 | 2 item(ns); avanço permitido; Nenhum | ORC-OK-001 |
| ORC-AV-BDI | Descrição normalizada comum com BDI diferente | budget.xlsx / ORC-AV-BDI | 1 / 500 | 2 item(ns); avanço permitido; SAME_DESCRIPTION_DIFFERENT_BDI | ORC-OK-001 |
| ORC-AV-BDI-DER | Aviso usa BDI derivado | budget.xlsx / ORC-AV-BDI-DER | 1 / 500 | 2 item(ns); avanço permitido; SAME_DESCRIPTION_DIFFERENT_BDI | ORC-OK-001 |
| ORC-CP-BDI | 20%, 20 e 0,2 são equivalentes | budget.xlsx / ORC-CP-BDI | 1 / 720 | 3 item(ns); avanço permitido; Nenhum | ORC-OK-001 |
| ORC-AV-MANUAL | 4 de 5 células calculadas e uma manual | budget.xlsx / ORC-AV-MANUAL | 1 / 1200 | 5 item(ns); avanço permitido; MANUAL_VALUE_IN_FORMULA_COLUMN | ORC-OK-001 |
| ORC-CP-MANUAL | Todas as 5 fórmulas seguem o padrão | budget.xlsx / ORC-CP-MANUAL | 1 / 1200 | 5 item(ns); avanço permitido; Nenhum | ORC-OK-001 |
| ORC-AV-PADRAO | Uma fórmula diferente do padrão | budget.xlsx / ORC-AV-PADRAO | 1 / 1200 | 5 item(ns); avanço permitido; FORMULA_PATTERN_MISMATCH | ORC-OK-001 |
| ORC-VIS-001 | Linha oculta não participa do total | budget.xlsx / ORC-VIS-001 | 1 / 240 | 1 item(ns); avanço permitido; Nenhum | ORC-OK-001 |
| ORC-VIS-002 | Coluna obrigatória oculta retira identidade | budget.xlsx / ORC-VIS-002 | 1 / 240 | 0 item(ns); avanço impedido; NO_BUDGET_ITEMS; STRUCTURAL_ROW; GENERAL_TOTAL_AUDITED_MISMATCH | ORC-OK-001 |
| ORC-VIS-ANTES | Linha oculta antes do cabeçalho é ignorada | budget.xlsx / ORC-VIS-ANTES | 2 / 240 | 1 item(ns); avanço permitido; Nenhum | ORC-OK-001 |
| ORC-VIS-INTERVALO | Intervalo de linhas ocultas ignora valores inválidos | budget.xlsx / ORC-VIS-INTERVALO | 1 / 240 | 1 item(ns); avanço permitido; Nenhum | ORC-OK-001 |
| ORC-VIS-MESCLA | Título mesclado anterior é estrutural e mantém contexto | budget.xlsx / ORC-VIS-MESCLA | 2 / 240 | 1 item(ns); avanço permitido; BEFORE_HEADER | ORC-OK-001 |
| ORC-VIS-FORMULA | Fórmula visível mantém cache mesmo referindo linha oculta | budget.xlsx / ORC-VIS-FORMULA | 1 / 240 | 1 item(ns); avanço permitido; ITEM_TOTAL_MISMATCH | ORC-OK-001 |
| ORC-AV-GRUPOS | 30 achados com linhas relacionadas intercaladas | budget.xlsx / ORC-AV-GRUPOS | 1 / 15120 | 60 item(ns); avanço permitido; IDENTICAL_ITEM_DIFFERENT_PRICES × 30 | ORC-CP-PRECO |
| BASE-OK-001 | Preço positivo e identidade completa | base.xlsx / BASE-OK-001 | 1 / não se aplica | 1 item(ns); 0 conflito(s); exclusões: Nenhum | CMP-IGUAL |
| BASE-VAZ | Preço ausente | base.xlsx / BASE-VAZ | 1 / não se aplica | 0 item(ns); 0 conflito(s); exclusões: Preço ausente | BASE-OK-001 |
| BASE-ZERO | Preço zero | base.xlsx / BASE-ZERO | 1 / não se aplica | 0 item(ns); 0 conflito(s); exclusões: Preço zero | BASE-OK-001 |
| BASE-NEG | Preço negativo | base.xlsx / BASE-NEG | 1 / não se aplica | 0 item(ns); 0 conflito(s); exclusões: Preço negativo | BASE-OK-001 |
| BASE-TXT | Preço não numérico | base.xlsx / BASE-TXT | 1 / não se aplica | 0 item(ns); 0 conflito(s); exclusões: Preço não numérico | BASE-OK-001 |
| BASE-ERR | Erro de fórmula no preço | base.xlsx / BASE-ERR | 1 / não se aplica | 0 item(ns); 0 conflito(s); exclusões: Erro de fórmula no preço | BASE-OK-001 |
| BASE-CACHE | Fórmula do preço sem resultado válido | base.xlsx / BASE-CACHE | 1 / não se aplica | 0 item(ns); 0 conflito(s); exclusões: Fórmula do preço sem resultado válido | BASE-OK-001 |
| BASE-EST-1 | Identidade incompleta | base.xlsx / BASE-EST-1 | 1 / não se aplica | 0 item(ns); 0 conflito(s); exclusões: Linha estrutural | BASE-OK-001 |
| BASE-EST-2 | Identidade incompleta | base.xlsx / BASE-EST-2 | 1 / não se aplica | 0 item(ns); 0 conflito(s); exclusões: Linha estrutural | BASE-OK-001 |
| BASE-EST-3 | Identidade incompleta | base.xlsx / BASE-EST-3 | 1 / não se aplica | 0 item(ns); 0 conflito(s); exclusões: Linha estrutural | BASE-OK-001 |
| BASE-CAB | Cabeçalho repetido | base.xlsx / BASE-CAB | 1 / não se aplica | 1 item(ns); 0 conflito(s); exclusões: Cabeçalho repetido | BASE-OK-001 |
| BASE-ANTES | Linha anterior ao cabeçalho | base.xlsx / BASE-ANTES | 2 / não se aplica | 1 item(ns); 0 conflito(s); exclusões: Antes do cabeçalho | BASE-OK-001 |
| BASE-VAZIA | Linhas vazias não geram revisão | base.xlsx / BASE-VAZIA | 1 / não se aplica | 1 item(ns); 0 conflito(s); exclusões: Nenhum | BASE-OK-001 |
| BASE-EQUIV | Consolidar 2 origens equivalentes | base.xlsx / BASE-EQUIV | 1 / não se aplica | 1 item(ns); 0 conflito(s); exclusões: Nenhum | BASE-OK-001 |
| BASE-CON-PRECO | Duas referências com preço diferente | base.xlsx / BASE-CON-PRECO | 1 / não se aplica | 2 item(ns); 1 conflito(s); exclusões: Nenhum | BASE-OK-001 |
| BASE-CON-UNID | Duas referências com unidade diferente | base.xlsx / BASE-CON-UNID | 1 / não se aplica | 2 item(ns); 1 conflito(s); exclusões: Nenhum | BASE-OK-001 |
| BASE-CP-DESC | Descrições diferentes não conflitam | base.xlsx / BASE-CP-DESC | 1 / não se aplica | 2 item(ns); 0 conflito(s); exclusões: Nenhum | BASE-OK-001 |
| BASE-VIS | Conflito somente na linha oculta é ignorado | base.xlsx / BASE-VIS | 1 / não se aplica | 1 item(ns); 0 conflito(s); exclusões: Nenhum | BASE-OK-001 |
| CMP-FLUXO | Quatro resultados e ABC 50/80/95/100 | comparison.xlsx / CMP-FLUXO | 1 / 120 | abaixo, igual, acima, nao-encontrado | CMP-IGUAL |
| CMP-CRUZA-FONTES | Item cruza 50% e barras usam o total do filtro | comparison.xlsx / CMP-CRUZA-FONTES | 1 / 100 | igual, nao-encontrado | CMP-FLUXO |
| CMP-IGUAL | Limite absoluto de comparação | comparison.xlsx / CMP-IGUAL | 1 / 240 | igual | CMP-FLUXO |
| CMP-LIM | Limite absoluto de comparação | comparison.xlsx / CMP-LIM | 1 / 240 | igual | CMP-FLUXO |
| CMP-MENOS | Limite absoluto de comparação | comparison.xlsx / CMP-MENOS | 1 / 240 | igual | CMP-FLUXO |
| CMP-MAIS | Limite absoluto de comparação | comparison.xlsx / CMP-MAIS | 1 / 240 | acima | CMP-FLUXO |
| CMP-ABAIXO | Limite absoluto de comparação | comparison.xlsx / CMP-ABAIXO | 1 / 240 | abaixo | CMP-FLUXO |
| CMP-UNICO | Busca restrita a fonte/código; descrição resolve múltiplos | comparison.xlsx / CMP-UNICO | 1 / 240 | igual | CMP-FLUXO |
| CMP-MULTI | Busca restrita a fonte/código; descrição resolve múltiplos | comparison.xlsx / CMP-MULTI | 1 / 240 | igual | CMP-FLUXO |
| CMP-MULTI-AUS | Busca restrita a fonte/código; descrição resolve múltiplos | comparison.xlsx / CMP-MULTI-AUS | 1 / 240 | nao-encontrado | CMP-FLUXO |
| CMP-SEM-DESC | Busca restrita a fonte/código; descrição resolve múltiplos | comparison.xlsx / CMP-SEM-DESC | 1 / 240 | nao-encontrado | CMP-FLUXO |
| CMP-FONTE | Busca restrita a fonte/código; descrição resolve múltiplos | comparison.xlsx / CMP-FONTE | 1 / 240 | nao-encontrado | CMP-FLUXO |
| CMP-ORSE-UNICO | Busca restrita a fonte/código; descrição resolve múltiplos | comparison.xlsx / CMP-ORSE-UNICO | 1 / 240 | igual | CMP-FLUXO |
| CMP-ORSE-MULTI | Busca restrita a fonte/código; descrição resolve múltiplos | comparison.xlsx / CMP-ORSE-MULTI | 1 / 240 | igual | CMP-FLUXO |
| CMP-ORSE-AUS | Busca restrita a fonte/código; descrição resolve múltiplos | comparison.xlsx / CMP-ORSE-AUS | 1 / 240 | nao-encontrado | CMP-FLUXO |

## Reprodução por caso

As tabelas seguintes mostram os valores originais. O cabeçalho e a linha física são preservados. Fórmulas especiais são aplicadas nos arquivos XLSX após a geração para testar explicitamente ausência de cache e erros. Não abrir e salvar esses arquivos em Excel antes de carregar no SICORP, pois o recálculo pode mudar o cenário.

### ORC-OK-001

Fluxo válido: 2 × 100 × (1 + 20%) = 240.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-OK-001. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço permitido; Nenhum.

Contraprova: CMP-IGUAL.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |

### ORC-EST-1

Identidade ausente: code.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-EST-1. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 0 item(ns); avanço impedido; NO_BUDGET_ITEMS; STRUCTURAL_ROW; GENERAL_TOTAL_AUDITED_MISMATCH.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 |  | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |

### ORC-EST-2

Identidade ausente: source.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-EST-2. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 0 item(ns); avanço impedido; NO_BUDGET_ITEMS; STRUCTURAL_ROW; GENERAL_TOTAL_AUDITED_MISMATCH.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 |  | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |

### ORC-EST-3

Identidade ausente: description.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-EST-3. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 0 item(ns); avanço impedido; NO_BUDGET_ITEMS; STRUCTURAL_ROW; GENERAL_TOTAL_AUDITED_MISMATCH.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI |  | m | 2 | 100 | 0.2 | 120 | 240 |

### ORC-EST-4

Identidade ausente: unit.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-EST-4. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 0 item(ns); avanço impedido; NO_BUDGET_ITEMS; STRUCTURAL_ROW; GENERAL_TOTAL_AUDITED_MISMATCH.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC |  | 2 | 100 | 0.2 | 120 | 240 |

### ORC-4-VAZ

quantity: VAZ.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-4-VAZ. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 0 item(ns); avanço impedido; NO_BUDGET_ITEMS; BUDGET_ITEM_EMPTY_OR_ZERO; GENERAL_TOTAL_AUDITED_MISMATCH.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m |  | 100 | 0.2 | 120 | 240 |

### ORC-4-ZERO

quantity: ZERO.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-4-ZERO. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 0 item(ns); avanço impedido; NO_BUDGET_ITEMS; BUDGET_ITEM_EMPTY_OR_ZERO; GENERAL_TOTAL_AUDITED_MISMATCH.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 0 | 100 | 0.2 | 120 | 240 |

### ORC-4-NEG

quantity: NEG.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-4-NEG. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço impedido; MAPPED_VALUE_NEGATIVE.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | -1 | 100 | 0.2 | 120 | 240 |

### ORC-4-TXT

quantity: TXT.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-4-TXT. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço impedido; MAPPED_VALUE_NOT_NUMERIC.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | abc | 100 | 0.2 | 120 | 240 |

### ORC-4-ERR

quantity: ERR.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-4-ERR. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço impedido; MAPPED_FORMULA_ERROR.

Contraprova: ORC-OK-001.

Células especiais: {"E2":{"formula":"1/0","error":"#DIV/0!"}}. Fórmula sem valor original na tabela não tem cache. Erros indicados devem ser lidos como erros de fórmula.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m |  | 100 | 0.2 | 120 | 240 |

### ORC-4-CACHE

quantity: CACHE.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-4-CACHE. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço impedido; MAPPED_FORMULA_WITHOUT_VALUE.

Contraprova: ORC-OK-001.

Células especiais: {"E2":{"formula":"1+1"}}. Fórmula sem valor original na tabela não tem cache. Erros indicados devem ser lidos como erros de fórmula.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m |  | 100 | 0.2 | 120 | 240 |

### ORC-5-VAZ

priceWithoutBdi: VAZ.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-5-VAZ. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 0 item(ns); avanço impedido; NO_BUDGET_ITEMS; BUDGET_ITEM_EMPTY_OR_ZERO; GENERAL_TOTAL_AUDITED_MISMATCH.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 |  | 0.2 | 120 | 240 |

### ORC-5-ZERO

priceWithoutBdi: ZERO.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-5-ZERO. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 0 item(ns); avanço impedido; NO_BUDGET_ITEMS; BUDGET_ITEM_EMPTY_OR_ZERO; GENERAL_TOTAL_AUDITED_MISMATCH.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 0 | 0.2 | 120 | 240 |

### ORC-5-NEG

priceWithoutBdi: NEG.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-5-NEG. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço impedido; MAPPED_VALUE_NEGATIVE.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | -1 | 0.2 | 120 | 240 |

### ORC-5-TXT

priceWithoutBdi: TXT.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-5-TXT. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço impedido; MAPPED_VALUE_NOT_NUMERIC.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | abc | 0.2 | 120 | 240 |

### ORC-5-ERR

priceWithoutBdi: ERR.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-5-ERR. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço impedido; MAPPED_FORMULA_ERROR.

Contraprova: ORC-OK-001.

Células especiais: {"F2":{"formula":"1/0","error":"#DIV/0!"}}. Fórmula sem valor original na tabela não tem cache. Erros indicados devem ser lidos como erros de fórmula.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 |  | 0.2 | 120 | 240 |

### ORC-5-CACHE

priceWithoutBdi: CACHE.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-5-CACHE. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço impedido; MAPPED_FORMULA_WITHOUT_VALUE.

Contraprova: ORC-OK-001.

Células especiais: {"F2":{"formula":"1+1"}}. Fórmula sem valor original na tabela não tem cache. Erros indicados devem ser lidos como erros de fórmula.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 |  | 0.2 | 120 | 240 |

### ORC-6-VAZ

bdi: VAZ.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-6-VAZ. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 0 item(ns); avanço impedido; NO_BUDGET_ITEMS; BUDGET_ITEM_EMPTY_OR_ZERO; GENERAL_TOTAL_AUDITED_MISMATCH.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 |  | 120 | 240 |

### ORC-6-ZERO

bdi: ZERO.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-6-ZERO. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 0 item(ns); avanço impedido; NO_BUDGET_ITEMS; BUDGET_ITEM_EMPTY_OR_ZERO; GENERAL_TOTAL_AUDITED_MISMATCH.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0 | 120 | 240 |

### ORC-6-NEG

bdi: NEG.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-6-NEG. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço impedido; MAPPED_VALUE_NEGATIVE.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | -0.2 | 120 | 240 |

### ORC-6-TXT

bdi: TXT.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-6-TXT. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço impedido; MAPPED_VALUE_NOT_NUMERIC.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | abc | 120 | 240 |

### ORC-6-ERR

bdi: ERR.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-6-ERR. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço impedido; MAPPED_FORMULA_ERROR.

Contraprova: ORC-OK-001.

Células especiais: {"G2":{"formula":"1/0","error":"#DIV/0!"}}. Fórmula sem valor original na tabela não tem cache. Erros indicados devem ser lidos como erros de fórmula.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 |  | 120 | 240 |

### ORC-6-CACHE

bdi: CACHE.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-6-CACHE. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço impedido; MAPPED_FORMULA_WITHOUT_VALUE.

Contraprova: ORC-OK-001.

Células especiais: {"G2":{"formula":"1+1"}}. Fórmula sem valor original na tabela não tem cache. Erros indicados devem ser lidos como erros de fórmula.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 |  | 120 | 240 |

### ORC-7-VAZ

priceWithBdi: VAZ.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-7-VAZ. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 0 item(ns); avanço impedido; NO_BUDGET_ITEMS; BUDGET_ITEM_EMPTY_OR_ZERO; GENERAL_TOTAL_AUDITED_MISMATCH.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 |  | 240 |

### ORC-7-ZERO

priceWithBdi: ZERO.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-7-ZERO. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 0 item(ns); avanço impedido; NO_BUDGET_ITEMS; BUDGET_ITEM_EMPTY_OR_ZERO; GENERAL_TOTAL_AUDITED_MISMATCH.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 0 | 240 |

### ORC-7-NEG

priceWithBdi: NEG.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-7-NEG. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço impedido; MAPPED_VALUE_NEGATIVE.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | -1 | 240 |

### ORC-7-TXT

priceWithBdi: TXT.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-7-TXT. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço impedido; MAPPED_VALUE_NOT_NUMERIC.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | abc | 240 |

### ORC-7-ERR

priceWithBdi: ERR.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-7-ERR. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço impedido; MAPPED_FORMULA_ERROR.

Contraprova: ORC-OK-001.

Células especiais: {"H2":{"formula":"1/0","error":"#DIV/0!"}}. Fórmula sem valor original na tabela não tem cache. Erros indicados devem ser lidos como erros de fórmula.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 |  | 240 |

### ORC-7-CACHE

priceWithBdi: CACHE.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-7-CACHE. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço impedido; MAPPED_FORMULA_WITHOUT_VALUE.

Contraprova: ORC-OK-001.

Células especiais: {"H2":{"formula":"1+1"}}. Fórmula sem valor original na tabela não tem cache. Erros indicados devem ser lidos como erros de fórmula.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 |  | 240 |

### ORC-8-VAZ

totalWithBdi: VAZ.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-8-VAZ. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 0 item(ns); avanço impedido; NO_BUDGET_ITEMS; BUDGET_ITEM_EMPTY_OR_ZERO; GENERAL_TOTAL_AUDITED_MISMATCH.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 |  |

### ORC-8-ZERO

totalWithBdi: ZERO.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-8-ZERO. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 0 item(ns); avanço impedido; NO_BUDGET_ITEMS; BUDGET_ITEM_EMPTY_OR_ZERO; GENERAL_TOTAL_AUDITED_MISMATCH.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 0 |

### ORC-8-NEG

totalWithBdi: NEG.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-8-NEG. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço impedido; MAPPED_VALUE_NEGATIVE.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | -1 |

### ORC-8-TXT

totalWithBdi: TXT.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-8-TXT. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço impedido; MAPPED_VALUE_NOT_NUMERIC.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | abc |

### ORC-8-ERR

totalWithBdi: ERR.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-8-ERR. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço impedido; MAPPED_FORMULA_ERROR.

Contraprova: ORC-OK-001.

Células especiais: {"I2":{"formula":"1/0","error":"#DIV/0!"}}. Fórmula sem valor original na tabela não tem cache. Erros indicados devem ser lidos como erros de fórmula.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 |  |

### ORC-8-CACHE

totalWithBdi: CACHE.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-8-CACHE. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço impedido; MAPPED_FORMULA_WITHOUT_VALUE.

Contraprova: ORC-OK-001.

Células especiais: {"I2":{"formula":"1+1"}}. Fórmula sem valor original na tabela não tem cache. Erros indicados devem ser lidos como erros de fórmula.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 |  |

### ORC-EXC-001

Vazio/zero exclui antes de avaliar outro campo negativo.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-EXC-001. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 0 item(ns); avanço impedido; NO_BUDGET_ITEMS; BUDGET_ITEM_EMPTY_OR_ZERO; GENERAL_TOTAL_AUDITED_MISMATCH.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 0 | -1 | 0.2 | 120 | 240 |

### ORC-EXC-002

Estrutural tem precedência sobre finanças inválidas.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-EXC-002. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 0 item(ns); avanço impedido; NO_BUDGET_ITEMS; STRUCTURAL_ROW; GENERAL_TOTAL_AUDITED_MISMATCH.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 |  | SINAPI | Título |  | -1 | abc | 0 | 0 | 0 |

### ORC-EXC-003

Linha vazia é ignorada.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-EXC-003. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço permitido; Nenhum.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 |  |  |  |  |  |  |  |  |  |
| 3 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |

### ORC-EXC-004

Cabeçalho repetido desconsiderado.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-EXC-004. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço permitido; REPEATED_HEADER.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 3 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |

### ORC-EXC-005

Conteúdo antes do cabeçalho desconsiderado.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-EXC-005. Cabeçalho físico: 2.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço permitido; BEFORE_HEADER.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Relatório sintético |  |  |  |  |  |  |  |  |
| 2 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 3 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |

### ORC-TOT-VAZ

Total geral VAZ.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-TOT-VAZ. Cabeçalho físico: 1.

Total geral a digitar: **(deixar vazio)**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço impedido; GENERAL_TOTAL_INVALID.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |

### ORC-TOT-TXT

Total geral TXT.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-TOT-TXT. Cabeçalho físico: 1.

Total geral a digitar: **abc**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço impedido; GENERAL_TOTAL_INVALID.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |

### ORC-TOT-ZERO

Total geral ZERO.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-TOT-ZERO. Cabeçalho físico: 1.

Total geral a digitar: **0**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço permitido; NON_POSITIVE_VALUE; GENERAL_TOTAL_AUDITED_MISMATCH.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |

### ORC-TOT-NEG

Total geral NEG.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-TOT-NEG. Cabeçalho físico: 1.

Total geral a digitar: **-1**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço permitido; NON_POSITIVE_VALUE; GENERAL_TOTAL_AUDITED_MISMATCH.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |

### ORC-MAP-001

Menos de dois componentes mapeados.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-MAP-001. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":null,"priceWithBdi":null,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço impedido; PRICE_COMPONENTS_INSUFFICIENT.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |

### ORC-MAP-002

Total do item não mapeado.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-MAP-002. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":null} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço impedido; ITEM_TOTAL_COLUMN_MISSING.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |

### ORC-DER-SEM

Derivação de priceWithoutBdi.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-DER-SEM. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":null,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço permitido; Nenhum.

Contraprova: ORC-OK-001.

Sem BDI / BDI efetivo / com BDI esperados: 100 / 0.2 / 120.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |

### ORC-DER-COM

Derivação de priceWithBdi.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-DER-COM. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":null,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço permitido; Nenhum.

Contraprova: ORC-OK-001.

Sem BDI / BDI efetivo / com BDI esperados: 100 / 0.2 / 120.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |

### ORC-DER-BDI

Derivação de bdi.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-DER-BDI. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":null,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço permitido; Nenhum.

Contraprova: ORC-OK-001.

Sem BDI / BDI efetivo / com BDI esperados: 100 / 0.2 / 120.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |

### ORC-DER-ZERO

Caracterização: BDI derivado ZERO.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-DER-ZERO. Cabeçalho físico: 1.

Total geral a digitar: **200**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":null,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço permitido; Nenhum.

Contraprova: ORC-OK-001.

Sem BDI / BDI efetivo / com BDI esperados: 100 / 0 / 100.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 100 | 200 |

### ORC-DER-NEG

Caracterização: BDI derivado NEG.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-DER-NEG. Cabeçalho físico: 1.

Total geral a digitar: **180**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":null,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço permitido; Nenhum.

Contraprova: ORC-OK-001.

Sem BDI / BDI efetivo / com BDI esperados: 100 / -0.1 / 90.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 90 | 180 |

### ORC-DER-INF

Derivação impossível por estouro numérico.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-DER-INF. Cabeçalho físico: 1.

Total geral a digitar: **1**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":null,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço impedido; PRICE_COMPONENT_DERIVATION_IMPOSSIBLE.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 1 | SINAPI | Estouro | m | 1 | 1e+308 | 100 |  | 1 |

### ORC-ERR-BDI

BDI: 100 × 1,2 = 120, informado 121.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-ERR-BDI. Cabeçalho físico: 1.

Total geral a digitar: **242**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço permitido; BDI_APPLICATION_MISMATCH.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 1 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 121 | 242 |

### ORC-ERR-ITEM

Total: 2 × 120 = 240, informado 241.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-ERR-ITEM. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço permitido; ITEM_TOTAL_MISMATCH.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 1 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 241 |

### ORC-ERR-GERAL

Total geral 241 diverge da soma 240.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-ERR-GERAL. Cabeçalho físico: 1.

Total geral a digitar: **241**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço permitido; GENERAL_TOTAL_AUDITED_MISMATCH.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |

### ORC-ERR-COMP

Erros dos itens se compensam no geral.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-ERR-COMP. Cabeçalho físico: 1.

Total geral a digitar: **480**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 2 item(ns); avanço permitido; ITEM_TOTAL_MISMATCH × 2.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 241 |
| 3 | 2 | SINAPI | Outro | m | 2 | 100 | 0.2 | 120 | 239 |

### ORC-ROUND-MEIO

Arredondamento decimal no meio centavo.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-ROUND-MEIO. Cabeçalho físico: 1.

Total geral a digitar: **10.08**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço permitido; Nenhum.

Contraprova: ORC-OK-001.

Soma auditada esperada: 10.08. Arredondamento decimal para o centavo mais próximo; meio centavo positivo arredonda para cima.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 1 | SINAPI | Meio centavo | m | 1 | 10 | 0.0075 | 10.075 | 10.08 |

### ORC-ROUND-ABAIXO

Arredondamento decimal no meio centavo.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-ROUND-ABAIXO. Cabeçalho físico: 1.

Total geral a digitar: **10.07**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço permitido; Nenhum.

Contraprova: ORC-OK-001.

Soma auditada esperada: 10.07. Arredondamento decimal para o centavo mais próximo; meio centavo positivo arredonda para cima.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 1 | SINAPI | Meio centavo | m | 1 | 10 | 0.0075 | 10.074999 | 10.07 |

### ORC-ROUND-ACIMA

Arredondamento decimal no meio centavo.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-ROUND-ACIMA. Cabeçalho físico: 1.

Total geral a digitar: **10.08**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço permitido; Nenhum.

Contraprova: ORC-OK-001.

Soma auditada esperada: 10.08. Arredondamento decimal para o centavo mais próximo; meio centavo positivo arredonda para cima.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 1 | SINAPI | Meio centavo | m | 1 | 10 | 0.0075 | 10.075001 | 10.08 |

### ORC-LIM-DENTRO

Tolerância do total do item R$ 0,01.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-LIM-DENTRO. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço permitido; Nenhum.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240.009 |

### ORC-LIM-IGUAL

Tolerância do total do item R$ 0,01.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-LIM-IGUAL. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço permitido; Nenhum.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240.01 |

### ORC-LIM-FORA

Tolerância do total do item R$ 0,01.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-LIM-FORA. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço permitido; ITEM_TOTAL_MISMATCH.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240.02 |

### ORC-LIM-GERAL

Tolerância geral = 2 × 0,01.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-LIM-GERAL. Cabeçalho físico: 1.

Total geral a digitar: **480.02**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 2 item(ns); avanço permitido; Nenhum.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |
| 3 | 2 | SINAPI | Outro | m | 2 | 100 | 0.2 | 120 | 240 |

### ORC-LIM-GERAL-FORA

Tolerância geral = 2 × 0,01.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-LIM-GERAL-FORA. Cabeçalho físico: 1.

Total geral a digitar: **480.03**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 2 item(ns); avanço permitido; GENERAL_TOTAL_AUDITED_MISMATCH.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |
| 3 | 2 | SINAPI | Outro | m | 2 | 100 | 0.2 | 120 | 240 |

### ORC-AV-DUP

Duplicidade física consecutiva.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-AV-DUP. Cabeçalho físico: 1.

Total geral a digitar: **480**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 2 item(ns); avanço permitido; CONSECUTIVE_DUPLICATE_ITEM.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |
| 3 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |

### ORC-CP-DUP

Duplicidade não consecutiva.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-CP-DUP. Cabeçalho físico: 1.

Total geral a digitar: **480**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 2 item(ns); avanço permitido; Nenhum.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |
| 3 |  |  |  |  |  |  |  |  |  |
| 4 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |

### ORC-AV-PRECO

Mesmo item com preços diferentes.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-AV-PRECO. Cabeçalho físico: 1.

Total geral a digitar: **504**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 2 item(ns); avanço permitido; IDENTICAL_ITEM_DIFFERENT_PRICES.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |
| 3 | 1 | SINAPI | Tubo PVC | m | 2 | 110 | 0.2 | 132 | 264 |

### ORC-CP-PRECO

Outro código permite preço diferente.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-CP-PRECO. Cabeçalho físico: 1.

Total geral a digitar: **504**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 2 item(ns); avanço permitido; Nenhum.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |
| 3 | 2 | SINAPI | Outro | m | 2 | 110 | 0.2 | 132 | 264 |

### ORC-AV-BDI

Descrição normalizada comum com BDI diferente.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-AV-BDI. Cabeçalho físico: 1.

Total geral a digitar: **500**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 2 item(ns); avanço permitido; SAME_DESCRIPTION_DIFFERENT_BDI.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |
| 3 | 2 | ORSE | Túbo  PVC | un | 2 | 100 | 0.3 | 130 | 260 |

### ORC-AV-BDI-DER

Aviso usa BDI derivado.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-AV-BDI-DER. Cabeçalho físico: 1.

Total geral a digitar: **500**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":null,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 2 item(ns); avanço permitido; SAME_DESCRIPTION_DIFFERENT_BDI.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |
| 3 | 2 | ORSE | Túbo  PVC | un | 2 | 100 |  | 130 | 260 |

### ORC-CP-BDI

20%, 20 e 0,2 são equivalentes.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-CP-BDI. Cabeçalho físico: 1.

Total geral a digitar: **720**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 3 item(ns); avanço permitido; Nenhum.

Contraprova: ORC-OK-001.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |
| 3 | 2 | ORSE | Tubo PVC | un | 2 | 100 | 20% | 120 | 240 |
| 4 | 3 | SINAPI | Tubo PVC | m | 2 | 100 | 20 | 120 | 240 |

### ORC-AV-MANUAL

4 de 5 células calculadas e uma manual.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-AV-MANUAL. Cabeçalho físico: 1.

Total geral a digitar: **1200**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 5 item(ns); avanço permitido; MANUAL_VALUE_IN_FORMULA_COLUMN.

Contraprova: ORC-OK-001.

Células especiais: {"I2":{"formula":"E2*H2"},"I3":{"formula":"E3*H3"},"I4":{"formula":"E4*H4"},"I5":{"formula":"E5*H5"}}. Fórmula sem valor original na tabela não tem cache. Erros indicados devem ser lidos como erros de fórmula.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 1 | SINAPI | Item 1 | m | 2 | 100 | 0.2 | 120 | 240 |
| 3 | 2 | SINAPI | Item 2 | m | 2 | 100 | 0.2 | 120 | 240 |
| 4 | 3 | SINAPI | Item 3 | m | 2 | 100 | 0.2 | 120 | 240 |
| 5 | 4 | SINAPI | Item 4 | m | 2 | 100 | 0.2 | 120 | 240 |
| 6 | 5 | SINAPI | Item 5 | m | 2 | 100 | 0.2 | 120 | 240 |

### ORC-CP-MANUAL

Todas as 5 fórmulas seguem o padrão.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-CP-MANUAL. Cabeçalho físico: 1.

Total geral a digitar: **1200**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 5 item(ns); avanço permitido; Nenhum.

Contraprova: ORC-OK-001.

Células especiais: {"I2":{"formula":"E2*H2"},"I3":{"formula":"E3*H3"},"I4":{"formula":"E4*H4"},"I5":{"formula":"E5*H5"},"I6":{"formula":"E6*H6"}}. Fórmula sem valor original na tabela não tem cache. Erros indicados devem ser lidos como erros de fórmula.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 1 | SINAPI | Item 1 | m | 2 | 100 | 0.2 | 120 | 240 |
| 3 | 2 | SINAPI | Item 2 | m | 2 | 100 | 0.2 | 120 | 240 |
| 4 | 3 | SINAPI | Item 3 | m | 2 | 100 | 0.2 | 120 | 240 |
| 5 | 4 | SINAPI | Item 4 | m | 2 | 100 | 0.2 | 120 | 240 |
| 6 | 5 | SINAPI | Item 5 | m | 2 | 100 | 0.2 | 120 | 240 |

### ORC-AV-PADRAO

Uma fórmula diferente do padrão.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-AV-PADRAO. Cabeçalho físico: 1.

Total geral a digitar: **1200**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 5 item(ns); avanço permitido; FORMULA_PATTERN_MISMATCH.

Contraprova: ORC-OK-001.

Células especiais: {"I2":{"formula":"E2*H2"},"I3":{"formula":"E3*H3"},"I4":{"formula":"E4*H4"},"I5":{"formula":"E5*H5"},"I6":{"formula":"SUM(H6,H6)"}}. Fórmula sem valor original na tabela não tem cache. Erros indicados devem ser lidos como erros de fórmula.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 1 | SINAPI | Item 1 | m | 2 | 100 | 0.2 | 120 | 240 |
| 3 | 2 | SINAPI | Item 2 | m | 2 | 100 | 0.2 | 120 | 240 |
| 4 | 3 | SINAPI | Item 3 | m | 2 | 100 | 0.2 | 120 | 240 |
| 5 | 4 | SINAPI | Item 4 | m | 2 | 100 | 0.2 | 120 | 240 |
| 6 | 5 | SINAPI | Item 5 | m | 2 | 100 | 0.2 | 120 | 240 |

### ORC-VIS-001

Linha oculta não participa do total.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-VIS-001. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço permitido; Nenhum.

Contraprova: ORC-OK-001.

Linhas físicas ocultas no arquivo: 3. Devem ser ignoradas integralmente.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |
| 3 | 2 | SINAPI | Oculto | m | 2 | 500 | 0.2 | 600 | 1200 |

### ORC-VIS-002

Coluna obrigatória oculta retira identidade.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-VIS-002. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 0 item(ns); avanço impedido; NO_BUDGET_ITEMS; STRUCTURAL_ROW; GENERAL_TOTAL_AUDITED_MISMATCH.

Contraprova: ORC-OK-001.

Colunas ocultas: A. Devem ficar fora do mapeamento e da análise.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |

### ORC-VIS-ANTES

Linha oculta antes do cabeçalho é ignorada.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-VIS-ANTES. Cabeçalho físico: 2.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço permitido; Nenhum.

Contraprova: ORC-OK-001.

Linhas físicas ocultas no arquivo: 1. Devem ser ignoradas integralmente.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Título oculto |  |  |  |  |  |  |  |  |
| 2 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 3 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |

### ORC-VIS-INTERVALO

Intervalo de linhas ocultas ignora valores inválidos.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-VIS-INTERVALO. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço permitido; Nenhum.

Contraprova: ORC-OK-001.

Linhas físicas ocultas no arquivo: 3, 4. Devem ser ignoradas integralmente.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |
| 3 | 2 | SINAPI | Oculto | m | 0 | -1 | 0 | 0 | 0 |
| 4 | 3 | SINAPI | Oculto | m | -1 | 10 | 0.2 | 12 | -12 |

### ORC-VIS-MESCLA

Título mesclado anterior é estrutural e mantém contexto.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-VIS-MESCLA. Cabeçalho físico: 2.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço permitido; BEFORE_HEADER.

Contraprova: ORC-OK-001.

Mesclas: A1:I1.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Título mesclado |  |  |  |  |  |  |  |  |
| 2 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 3 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |

### ORC-VIS-FORMULA

Fórmula visível mantém cache mesmo referindo linha oculta.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-VIS-FORMULA. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); avanço permitido; ITEM_TOTAL_MISMATCH.

Contraprova: ORC-OK-001.

Linhas físicas ocultas no arquivo: 3. Devem ser ignoradas integralmente.

Células especiais: {"I2":{"formula":"E2*H2+I3"}}. Fórmula sem valor original na tabela não tem cache. Erros indicados devem ser lidos como erros de fórmula.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 500 |
| 3 | 2 | SINAPI | Oculto | m | 1 | 10 | 0.2 | 12 | 12 |

### ORC-AV-GRUPOS

30 achados com linhas relacionadas intercaladas.

Arquivo: testkit/fixtures/budget.xlsx. Aba: ORC-AV-GRUPOS. Cabeçalho físico: 1.

Total geral a digitar: **15120**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 60 item(ns); avanço permitido; IDENTICAL_ITEM_DIFFERENT_PRICES × 30.

Contraprova: ORC-CP-PRECO.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | g0 | SINAPI | Serviço 0 | m | 2 | 100 | 0.2 | 120 | 240 |
| 3 | g1 | SINAPI | Serviço 1 | m | 2 | 100 | 0.2 | 120 | 240 |
| 4 | g2 | SINAPI | Serviço 2 | m | 2 | 100 | 0.2 | 120 | 240 |
| 5 | g3 | SINAPI | Serviço 3 | m | 2 | 100 | 0.2 | 120 | 240 |
| 6 | g4 | SINAPI | Serviço 4 | m | 2 | 100 | 0.2 | 120 | 240 |
| 7 | g5 | SINAPI | Serviço 5 | m | 2 | 100 | 0.2 | 120 | 240 |
| 8 | g6 | SINAPI | Serviço 6 | m | 2 | 100 | 0.2 | 120 | 240 |
| 9 | g7 | SINAPI | Serviço 7 | m | 2 | 100 | 0.2 | 120 | 240 |
| 10 | g8 | SINAPI | Serviço 8 | m | 2 | 100 | 0.2 | 120 | 240 |
| 11 | g9 | SINAPI | Serviço 9 | m | 2 | 100 | 0.2 | 120 | 240 |
| 12 | g10 | SINAPI | Serviço 10 | m | 2 | 100 | 0.2 | 120 | 240 |
| 13 | g11 | SINAPI | Serviço 11 | m | 2 | 100 | 0.2 | 120 | 240 |
| 14 | g12 | SINAPI | Serviço 12 | m | 2 | 100 | 0.2 | 120 | 240 |
| 15 | g13 | SINAPI | Serviço 13 | m | 2 | 100 | 0.2 | 120 | 240 |
| 16 | g14 | SINAPI | Serviço 14 | m | 2 | 100 | 0.2 | 120 | 240 |
| 17 | g15 | SINAPI | Serviço 15 | m | 2 | 100 | 0.2 | 120 | 240 |
| 18 | g16 | SINAPI | Serviço 16 | m | 2 | 100 | 0.2 | 120 | 240 |
| 19 | g17 | SINAPI | Serviço 17 | m | 2 | 100 | 0.2 | 120 | 240 |
| 20 | g18 | SINAPI | Serviço 18 | m | 2 | 100 | 0.2 | 120 | 240 |
| 21 | g19 | SINAPI | Serviço 19 | m | 2 | 100 | 0.2 | 120 | 240 |
| 22 | g20 | SINAPI | Serviço 20 | m | 2 | 100 | 0.2 | 120 | 240 |
| 23 | g21 | SINAPI | Serviço 21 | m | 2 | 100 | 0.2 | 120 | 240 |
| 24 | g22 | SINAPI | Serviço 22 | m | 2 | 100 | 0.2 | 120 | 240 |
| 25 | g23 | SINAPI | Serviço 23 | m | 2 | 100 | 0.2 | 120 | 240 |
| 26 | g24 | SINAPI | Serviço 24 | m | 2 | 100 | 0.2 | 120 | 240 |
| 27 | g25 | SINAPI | Serviço 25 | m | 2 | 100 | 0.2 | 120 | 240 |
| 28 | g26 | SINAPI | Serviço 26 | m | 2 | 100 | 0.2 | 120 | 240 |
| 29 | g27 | SINAPI | Serviço 27 | m | 2 | 100 | 0.2 | 120 | 240 |
| 30 | g28 | SINAPI | Serviço 28 | m | 2 | 100 | 0.2 | 120 | 240 |
| 31 | g29 | SINAPI | Serviço 29 | m | 2 | 100 | 0.2 | 120 | 240 |
| 32 | g0 | SINAPI | Serviço 0 | m | 2 | 110 | 0.2 | 132 | 264 |
| 33 | g1 | SINAPI | Serviço 1 | m | 2 | 110 | 0.2 | 132 | 264 |
| 34 | g2 | SINAPI | Serviço 2 | m | 2 | 110 | 0.2 | 132 | 264 |
| 35 | g3 | SINAPI | Serviço 3 | m | 2 | 110 | 0.2 | 132 | 264 |
| 36 | g4 | SINAPI | Serviço 4 | m | 2 | 110 | 0.2 | 132 | 264 |
| 37 | g5 | SINAPI | Serviço 5 | m | 2 | 110 | 0.2 | 132 | 264 |
| 38 | g6 | SINAPI | Serviço 6 | m | 2 | 110 | 0.2 | 132 | 264 |
| 39 | g7 | SINAPI | Serviço 7 | m | 2 | 110 | 0.2 | 132 | 264 |
| 40 | g8 | SINAPI | Serviço 8 | m | 2 | 110 | 0.2 | 132 | 264 |
| 41 | g9 | SINAPI | Serviço 9 | m | 2 | 110 | 0.2 | 132 | 264 |
| 42 | g10 | SINAPI | Serviço 10 | m | 2 | 110 | 0.2 | 132 | 264 |
| 43 | g11 | SINAPI | Serviço 11 | m | 2 | 110 | 0.2 | 132 | 264 |
| 44 | g12 | SINAPI | Serviço 12 | m | 2 | 110 | 0.2 | 132 | 264 |
| 45 | g13 | SINAPI | Serviço 13 | m | 2 | 110 | 0.2 | 132 | 264 |
| 46 | g14 | SINAPI | Serviço 14 | m | 2 | 110 | 0.2 | 132 | 264 |
| 47 | g15 | SINAPI | Serviço 15 | m | 2 | 110 | 0.2 | 132 | 264 |
| 48 | g16 | SINAPI | Serviço 16 | m | 2 | 110 | 0.2 | 132 | 264 |
| 49 | g17 | SINAPI | Serviço 17 | m | 2 | 110 | 0.2 | 132 | 264 |
| 50 | g18 | SINAPI | Serviço 18 | m | 2 | 110 | 0.2 | 132 | 264 |
| 51 | g19 | SINAPI | Serviço 19 | m | 2 | 110 | 0.2 | 132 | 264 |
| 52 | g20 | SINAPI | Serviço 20 | m | 2 | 110 | 0.2 | 132 | 264 |
| 53 | g21 | SINAPI | Serviço 21 | m | 2 | 110 | 0.2 | 132 | 264 |
| 54 | g22 | SINAPI | Serviço 22 | m | 2 | 110 | 0.2 | 132 | 264 |
| 55 | g23 | SINAPI | Serviço 23 | m | 2 | 110 | 0.2 | 132 | 264 |
| 56 | g24 | SINAPI | Serviço 24 | m | 2 | 110 | 0.2 | 132 | 264 |
| 57 | g25 | SINAPI | Serviço 25 | m | 2 | 110 | 0.2 | 132 | 264 |
| 58 | g26 | SINAPI | Serviço 26 | m | 2 | 110 | 0.2 | 132 | 264 |
| 59 | g27 | SINAPI | Serviço 27 | m | 2 | 110 | 0.2 | 132 | 264 |
| 60 | g28 | SINAPI | Serviço 28 | m | 2 | 110 | 0.2 | 132 | 264 |
| 61 | g29 | SINAPI | Serviço 29 | m | 2 | 110 | 0.2 | 132 | 264 |

### BASE-OK-001

Preço positivo e identidade completa.

Arquivo: testkit/fixtures/base.xlsx. Aba: BASE-OK-001. Cabeçalho físico: 1.

Associar à fonte SINAPI.

Mapeamento: {"code":0,"description":1,"unit":2,"price":3} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); 0 conflito(s); exclusões: Nenhum.

Contraprova: CMP-IGUAL.

| Linha | A | B | C | D |
| --- | --- | --- | --- | --- |
| 1 | Código | Descrição | Unidade | Preço |
| 2 | 0001 | Tubo PVC | m | 100 |

### BASE-VAZ

Preço ausente.

Arquivo: testkit/fixtures/base.xlsx. Aba: BASE-VAZ. Cabeçalho físico: 1.

Associar à fonte SINAPI.

Mapeamento: {"code":0,"description":1,"unit":2,"price":3} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 0 item(ns); 0 conflito(s); exclusões: Preço ausente.

Contraprova: BASE-OK-001.

| Linha | A | B | C | D |
| --- | --- | --- | --- | --- |
| 1 | Código | Descrição | Unidade | Preço |
| 2 | 1 | Tubo PVC | m |  |

### BASE-ZERO

Preço zero.

Arquivo: testkit/fixtures/base.xlsx. Aba: BASE-ZERO. Cabeçalho físico: 1.

Associar à fonte SINAPI.

Mapeamento: {"code":0,"description":1,"unit":2,"price":3} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 0 item(ns); 0 conflito(s); exclusões: Preço zero.

Contraprova: BASE-OK-001.

| Linha | A | B | C | D |
| --- | --- | --- | --- | --- |
| 1 | Código | Descrição | Unidade | Preço |
| 2 | 1 | Tubo PVC | m | 0 |

### BASE-NEG

Preço negativo.

Arquivo: testkit/fixtures/base.xlsx. Aba: BASE-NEG. Cabeçalho físico: 1.

Associar à fonte SINAPI.

Mapeamento: {"code":0,"description":1,"unit":2,"price":3} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 0 item(ns); 0 conflito(s); exclusões: Preço negativo.

Contraprova: BASE-OK-001.

| Linha | A | B | C | D |
| --- | --- | --- | --- | --- |
| 1 | Código | Descrição | Unidade | Preço |
| 2 | 1 | Tubo PVC | m | -1 |

### BASE-TXT

Preço não numérico.

Arquivo: testkit/fixtures/base.xlsx. Aba: BASE-TXT. Cabeçalho físico: 1.

Associar à fonte SINAPI.

Mapeamento: {"code":0,"description":1,"unit":2,"price":3} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 0 item(ns); 0 conflito(s); exclusões: Preço não numérico.

Contraprova: BASE-OK-001.

| Linha | A | B | C | D |
| --- | --- | --- | --- | --- |
| 1 | Código | Descrição | Unidade | Preço |
| 2 | 1 | Tubo PVC | m | abc |

### BASE-ERR

Erro de fórmula no preço.

Arquivo: testkit/fixtures/base.xlsx. Aba: BASE-ERR. Cabeçalho físico: 1.

Associar à fonte SINAPI.

Mapeamento: {"code":0,"description":1,"unit":2,"price":3} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 0 item(ns); 0 conflito(s); exclusões: Erro de fórmula no preço.

Contraprova: BASE-OK-001.

Células especiais: {"D2":{"formula":"1/0","error":"#DIV/0!"}}. Fórmula sem valor original na tabela não tem cache. Erros indicados devem ser lidos como erros de fórmula.

| Linha | A | B | C | D |
| --- | --- | --- | --- | --- |
| 1 | Código | Descrição | Unidade | Preço |
| 2 | 1 | Tubo PVC | m |  |

### BASE-CACHE

Fórmula do preço sem resultado válido.

Arquivo: testkit/fixtures/base.xlsx. Aba: BASE-CACHE. Cabeçalho físico: 1.

Associar à fonte SINAPI.

Mapeamento: {"code":0,"description":1,"unit":2,"price":3} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 0 item(ns); 0 conflito(s); exclusões: Fórmula do preço sem resultado válido.

Contraprova: BASE-OK-001.

Células especiais: {"D2":{"formula":"1+1"}}. Fórmula sem valor original na tabela não tem cache. Erros indicados devem ser lidos como erros de fórmula.

| Linha | A | B | C | D |
| --- | --- | --- | --- | --- |
| 1 | Código | Descrição | Unidade | Preço |
| 2 | 1 | Tubo PVC | m |  |

### BASE-EST-1

Identidade incompleta.

Arquivo: testkit/fixtures/base.xlsx. Aba: BASE-EST-1. Cabeçalho físico: 1.

Associar à fonte SINAPI.

Mapeamento: {"code":0,"description":1,"unit":2,"price":3} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 0 item(ns); 0 conflito(s); exclusões: Linha estrutural.

Contraprova: BASE-OK-001.

| Linha | A | B | C | D |
| --- | --- | --- | --- | --- |
| 1 | Código | Descrição | Unidade | Preço |
| 2 |  | Tubo PVC | m | 100 |

### BASE-EST-2

Identidade incompleta.

Arquivo: testkit/fixtures/base.xlsx. Aba: BASE-EST-2. Cabeçalho físico: 1.

Associar à fonte SINAPI.

Mapeamento: {"code":0,"description":1,"unit":2,"price":3} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 0 item(ns); 0 conflito(s); exclusões: Linha estrutural.

Contraprova: BASE-OK-001.

| Linha | A | B | C | D |
| --- | --- | --- | --- | --- |
| 1 | Código | Descrição | Unidade | Preço |
| 2 | 1 |  | m | 100 |

### BASE-EST-3

Identidade incompleta.

Arquivo: testkit/fixtures/base.xlsx. Aba: BASE-EST-3. Cabeçalho físico: 1.

Associar à fonte SINAPI.

Mapeamento: {"code":0,"description":1,"unit":2,"price":3} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 0 item(ns); 0 conflito(s); exclusões: Linha estrutural.

Contraprova: BASE-OK-001.

| Linha | A | B | C | D |
| --- | --- | --- | --- | --- |
| 1 | Código | Descrição | Unidade | Preço |
| 2 | 1 | Tubo PVC |  | 100 |

### BASE-CAB

Cabeçalho repetido.

Arquivo: testkit/fixtures/base.xlsx. Aba: BASE-CAB. Cabeçalho físico: 1.

Associar à fonte SINAPI.

Mapeamento: {"code":0,"description":1,"unit":2,"price":3} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); 0 conflito(s); exclusões: Cabeçalho repetido.

Contraprova: BASE-OK-001.

| Linha | A | B | C | D |
| --- | --- | --- | --- | --- |
| 1 | Código | Descrição | Unidade | Preço |
| 2 | Código | Descrição | Unidade | Preço |
| 3 | 1 | Tubo PVC | m | 100 |

### BASE-ANTES

Linha anterior ao cabeçalho.

Arquivo: testkit/fixtures/base.xlsx. Aba: BASE-ANTES. Cabeçalho físico: 2.

Associar à fonte SINAPI.

Mapeamento: {"code":0,"description":1,"unit":2,"price":3} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); 0 conflito(s); exclusões: Antes do cabeçalho.

Contraprova: BASE-OK-001.

| Linha | A | B | C | D |
| --- | --- | --- | --- | --- |
| 1 | Relatório |  |  |  |
| 2 | Código | Descrição | Unidade | Preço |
| 3 | 1 | Tubo PVC | m | 100 |

### BASE-VAZIA

Linhas vazias não geram revisão.

Arquivo: testkit/fixtures/base.xlsx. Aba: BASE-VAZIA. Cabeçalho físico: 1.

Associar à fonte SINAPI.

Mapeamento: {"code":0,"description":1,"unit":2,"price":3} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); 0 conflito(s); exclusões: Nenhum.

Contraprova: BASE-OK-001.

| Linha | A | B | C | D |
| --- | --- | --- | --- | --- |
| 1 | Código | Descrição | Unidade | Preço |
| 2 |  |  |  |  |
| 3 | 1 | Tubo PVC | m | 100 |

### BASE-EQUIV

Consolidar 2 origens equivalentes.

Arquivo: testkit/fixtures/base.xlsx. Aba: BASE-EQUIV. Cabeçalho físico: 1.

Associar à fonte SINAPI.

Mapeamento: {"code":0,"description":1,"unit":2,"price":3} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); 0 conflito(s); exclusões: Nenhum.

Contraprova: BASE-OK-001.

| Linha | A | B | C | D |
| --- | --- | --- | --- | --- |
| 1 | Código | Descrição | Unidade | Preço |
| 2 | 0001 | Tubo PVC | m | 100 |
| 3 | 1 | Túbo PVC | M | 100 |

### BASE-CON-PRECO

Duas referências com preço diferente.

Arquivo: testkit/fixtures/base.xlsx. Aba: BASE-CON-PRECO. Cabeçalho físico: 1.

Associar à fonte SINAPI.

Mapeamento: {"code":0,"description":1,"unit":2,"price":3} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 2 item(ns); 1 conflito(s); exclusões: Nenhum.

Contraprova: BASE-OK-001.

| Linha | A | B | C | D |
| --- | --- | --- | --- | --- |
| 1 | Código | Descrição | Unidade | Preço |
| 2 | 1 | Tubo PVC | m | 100 |
| 3 | 1 | Tubo PVC | m | 101 |

### BASE-CON-UNID

Duas referências com unidade diferente.

Arquivo: testkit/fixtures/base.xlsx. Aba: BASE-CON-UNID. Cabeçalho físico: 1.

Associar à fonte SINAPI.

Mapeamento: {"code":0,"description":1,"unit":2,"price":3} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 2 item(ns); 1 conflito(s); exclusões: Nenhum.

Contraprova: BASE-OK-001.

| Linha | A | B | C | D |
| --- | --- | --- | --- | --- |
| 1 | Código | Descrição | Unidade | Preço |
| 2 | 1 | Tubo PVC | m | 100 |
| 3 | 1 | Tubo PVC | un | 100 |

### BASE-CP-DESC

Descrições diferentes não conflitam.

Arquivo: testkit/fixtures/base.xlsx. Aba: BASE-CP-DESC. Cabeçalho físico: 1.

Associar à fonte SINAPI.

Mapeamento: {"code":0,"description":1,"unit":2,"price":3} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 2 item(ns); 0 conflito(s); exclusões: Nenhum.

Contraprova: BASE-OK-001.

| Linha | A | B | C | D |
| --- | --- | --- | --- | --- |
| 1 | Código | Descrição | Unidade | Preço |
| 2 | 1 | Tubo PVC | m | 100 |
| 3 | 1 | Conexão | un | 101 |

### BASE-VIS

Conflito somente na linha oculta é ignorado.

Arquivo: testkit/fixtures/base.xlsx. Aba: BASE-VIS. Cabeçalho físico: 1.

Associar à fonte SINAPI.

Mapeamento: {"code":0,"description":1,"unit":2,"price":3} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: 1 item(ns); 0 conflito(s); exclusões: Nenhum.

Contraprova: BASE-OK-001.

Linhas físicas ocultas no arquivo: 3. Devem ser ignoradas integralmente.

| Linha | A | B | C | D |
| --- | --- | --- | --- | --- |
| 1 | Código | Descrição | Unidade | Preço |
| 2 | 1 | Tubo PVC | m | 100 |
| 3 | 1 | Tubo PVC | un | 101 |

### CMP-FLUXO

Quatro resultados e ABC 50/80/95/100.

Arquivo: testkit/fixtures/comparison.xlsx. Aba: CMP-FLUXO. Cabeçalho físico: 1.

Total geral a digitar: **120**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: abaixo, igual, acima, nao-encontrado.

Contraprova: CMP-IGUAL.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 0001 | SINAPI | Descrição orçamento | m | 1 | 50 | 0.2 | 60 | 60 |
| 3 | 002.0 | SINAPI | Conexão | un | 1 | 30 | 0.2 | 36 | 36 |
| 4 | A3 | SINAPI | Areia | m3 | 1 | 15 | 0.2 | 18 | 18 |
| 5 | 404 | SINAPI | Ausente | m | 1 | 5 | 0.2 | 6 | 6 |

Adicionar como base a aba CMP-FLUXO-BASE do mesmo arquivo. Fonte associada: SINAPI. Cabeçalho 1, mapeamento A:D. Tolerância: 0.

| Linha | Código | Descrição | Unidade | Preço |
| --- | --- | --- | --- | --- |
| 1 | Código | Descrição | Unidade | Preço |
| 2 | 0001 | Descrição base | un | 60 |
| 3 | 002.0 | Conexão | un | 30 |
| 4 | A3 | Areia | m3 | 10 |

Na revisão, confirmar a adição da base. Prosseguir à comparação e clicar Comparar. As linhas de orçamento válidas participam da comparação e da exportação. Itens excluídos não participam.

### CMP-CRUZA-FONTES

Item cruza 50% e barras usam o total do filtro.

Arquivo: testkit/fixtures/comparison.xlsx. Aba: CMP-CRUZA-FONTES. Cabeçalho físico: 1.

Total geral a digitar: **100**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: igual, nao-encontrado.

Contraprova: CMP-FLUXO.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 1 | SINAPI | Fonte A | m | 1 | 50 | 0.2 | 60 | 60 |
| 3 | 2 | ORSE | Fonte B | m | 1 | 33.333333 | 0.2 | 40 | 40 |

Adicionar como base a aba CMP-CRUZA-FONTES-BASE do mesmo arquivo. Fonte associada: SINAPI. Cabeçalho 1, mapeamento A:D. Tolerância: 0.

| Linha | Código | Descrição | Unidade | Preço |
| --- | --- | --- | --- | --- |
| 1 | Código | Descrição | Unidade | Preço |
| 2 | 1 | Fonte A | m | 50 |

Na revisão, confirmar a adição da base. Prosseguir à comparação e clicar Comparar. As linhas de orçamento válidas participam da comparação e da exportação. Itens excluídos não participam.

### CMP-IGUAL

Limite absoluto de comparação.

Arquivo: testkit/fixtures/comparison.xlsx. Aba: CMP-IGUAL. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: igual.

Contraprova: CMP-FLUXO.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 1 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |

Adicionar como base a aba CMP-IGUAL-BASE do mesmo arquivo. Fonte associada: SINAPI. Cabeçalho 1, mapeamento A:D. Tolerância: 0.

| Linha | Código | Descrição | Unidade | Preço |
| --- | --- | --- | --- | --- |
| 1 | Código | Descrição | Unidade | Preço |
| 2 | 1 | Tubo PVC | m | 100 |

Na revisão, confirmar a adição da base. Prosseguir à comparação e clicar Comparar. As linhas de orçamento válidas participam da comparação e da exportação. Itens excluídos não participam.

### CMP-LIM

Limite absoluto de comparação.

Arquivo: testkit/fixtures/comparison.xlsx. Aba: CMP-LIM. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: igual.

Contraprova: CMP-FLUXO.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 1 | SINAPI | Tubo PVC | m | 2 | 100.01 | 0.2 | 120.012 | 240.024 |

Adicionar como base a aba CMP-LIM-BASE do mesmo arquivo. Fonte associada: SINAPI. Cabeçalho 1, mapeamento A:D. Tolerância: 0.01.

| Linha | Código | Descrição | Unidade | Preço |
| --- | --- | --- | --- | --- |
| 1 | Código | Descrição | Unidade | Preço |
| 2 | 1 | Tubo PVC | m | 100 |

Na revisão, confirmar a adição da base. Prosseguir à comparação e clicar Comparar. As linhas de orçamento válidas participam da comparação e da exportação. Itens excluídos não participam.

### CMP-MENOS

Limite absoluto de comparação.

Arquivo: testkit/fixtures/comparison.xlsx. Aba: CMP-MENOS. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: igual.

Contraprova: CMP-FLUXO.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 1 | SINAPI | Tubo PVC | m | 2 | 100.009 | 0.2 | 120.01079999999999 | 240.02159999999998 |

Adicionar como base a aba CMP-MENOS-BASE do mesmo arquivo. Fonte associada: SINAPI. Cabeçalho 1, mapeamento A:D. Tolerância: 0.01.

| Linha | Código | Descrição | Unidade | Preço |
| --- | --- | --- | --- | --- |
| 1 | Código | Descrição | Unidade | Preço |
| 2 | 1 | Tubo PVC | m | 100 |

Na revisão, confirmar a adição da base. Prosseguir à comparação e clicar Comparar. As linhas de orçamento válidas participam da comparação e da exportação. Itens excluídos não participam.

### CMP-MAIS

Limite absoluto de comparação.

Arquivo: testkit/fixtures/comparison.xlsx. Aba: CMP-MAIS. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: acima.

Contraprova: CMP-FLUXO.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 1 | SINAPI | Tubo PVC | m | 2 | 100.011 | 0.2 | 120.01319999999998 | 240.02639999999997 |

Adicionar como base a aba CMP-MAIS-BASE do mesmo arquivo. Fonte associada: SINAPI. Cabeçalho 1, mapeamento A:D. Tolerância: 0.01.

| Linha | Código | Descrição | Unidade | Preço |
| --- | --- | --- | --- | --- |
| 1 | Código | Descrição | Unidade | Preço |
| 2 | 1 | Tubo PVC | m | 100 |

Na revisão, confirmar a adição da base. Prosseguir à comparação e clicar Comparar. As linhas de orçamento válidas participam da comparação e da exportação. Itens excluídos não participam.

### CMP-ABAIXO

Limite absoluto de comparação.

Arquivo: testkit/fixtures/comparison.xlsx. Aba: CMP-ABAIXO. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: abaixo.

Contraprova: CMP-FLUXO.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 1 | SINAPI | Tubo PVC | m | 2 | 99 | 0.2 | 118.8 | 237.6 |

Adicionar como base a aba CMP-ABAIXO-BASE do mesmo arquivo. Fonte associada: SINAPI. Cabeçalho 1, mapeamento A:D. Tolerância: 0.01.

| Linha | Código | Descrição | Unidade | Preço |
| --- | --- | --- | --- | --- |
| 1 | Código | Descrição | Unidade | Preço |
| 2 | 1 | Tubo PVC | m | 100 |

Na revisão, confirmar a adição da base. Prosseguir à comparação e clicar Comparar. As linhas de orçamento válidas participam da comparação e da exportação. Itens excluídos não participam.

### CMP-UNICO

Busca restrita a fonte/código; descrição resolve múltiplos.

Arquivo: testkit/fixtures/comparison.xlsx. Aba: CMP-UNICO. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: igual.

Contraprova: CMP-FLUXO.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 1 | SINAPI | Outra | m | 2 | 100 | 0.2 | 120 | 240 |

Adicionar como base a aba CMP-UNICO-BASE do mesmo arquivo. Fonte associada: SINAPI. Cabeçalho 1, mapeamento A:D. Tolerância: 0.

| Linha | Código | Descrição | Unidade | Preço |
| --- | --- | --- | --- | --- |
| 1 | Código | Descrição | Unidade | Preço |
| 2 | 1 | Tubo PVC | un | 100 |

Na revisão, confirmar a adição da base. Prosseguir à comparação e clicar Comparar. As linhas de orçamento válidas participam da comparação e da exportação. Itens excluídos não participam.

### CMP-MULTI

Busca restrita a fonte/código; descrição resolve múltiplos.

Arquivo: testkit/fixtures/comparison.xlsx. Aba: CMP-MULTI. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: igual.

Contraprova: CMP-FLUXO.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 1 | SINAPI | Túbo PVC | m | 2 | 100 | 0.2 | 120 | 240 |

Adicionar como base a aba CMP-MULTI-BASE do mesmo arquivo. Fonte associada: SINAPI. Cabeçalho 1, mapeamento A:D. Tolerância: 0.

| Linha | Código | Descrição | Unidade | Preço |
| --- | --- | --- | --- | --- |
| 1 | Código | Descrição | Unidade | Preço |
| 2 | 1 | Tubo PVC | m | 100 |
| 3 | 1 | Outro | m | 90 |

Na revisão, confirmar a adição da base. Prosseguir à comparação e clicar Comparar. As linhas de orçamento válidas participam da comparação e da exportação. Itens excluídos não participam.

### CMP-MULTI-AUS

Busca restrita a fonte/código; descrição resolve múltiplos.

Arquivo: testkit/fixtures/comparison.xlsx. Aba: CMP-MULTI-AUS. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: nao-encontrado.

Contraprova: CMP-FLUXO.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 1 | SINAPI | Ausente | m | 2 | 100 | 0.2 | 120 | 240 |

Adicionar como base a aba CMP-MULTI-AUS-BASE do mesmo arquivo. Fonte associada: SINAPI. Cabeçalho 1, mapeamento A:D. Tolerância: 0.

| Linha | Código | Descrição | Unidade | Preço |
| --- | --- | --- | --- | --- |
| 1 | Código | Descrição | Unidade | Preço |
| 2 | 1 | Tubo PVC | m | 100 |
| 3 | 1 | Outro | m | 90 |

Na revisão, confirmar a adição da base. Prosseguir à comparação e clicar Comparar. As linhas de orçamento válidas participam da comparação e da exportação. Itens excluídos não participam.

### CMP-SEM-DESC

Busca restrita a fonte/código; descrição resolve múltiplos.

Arquivo: testkit/fixtures/comparison.xlsx. Aba: CMP-SEM-DESC. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: nao-encontrado.

Contraprova: CMP-FLUXO.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 1 | SINAPI | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |

Adicionar como base a aba CMP-SEM-DESC-BASE do mesmo arquivo. Fonte associada: SINAPI. Cabeçalho 1, mapeamento A:D. Tolerância: 0.

| Linha | Código | Descrição | Unidade | Preço |
| --- | --- | --- | --- | --- |
| 1 | Código | Descrição | Unidade | Preço |
| 2 | 2 | Tubo PVC | m | 100 |

Na revisão, confirmar a adição da base. Prosseguir à comparação e clicar Comparar. As linhas de orçamento válidas participam da comparação e da exportação. Itens excluídos não participam.

### CMP-FONTE

Busca restrita a fonte/código; descrição resolve múltiplos.

Arquivo: testkit/fixtures/comparison.xlsx. Aba: CMP-FONTE. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: nao-encontrado.

Contraprova: CMP-FLUXO.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 1 | ORSE | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |

Adicionar como base a aba CMP-FONTE-BASE do mesmo arquivo. Fonte associada: SINAPI. Cabeçalho 1, mapeamento A:D. Tolerância: 0.

| Linha | Código | Descrição | Unidade | Preço |
| --- | --- | --- | --- | --- |
| 1 | Código | Descrição | Unidade | Preço |
| 2 | 1 | Tubo PVC | m | 100 |

Na revisão, confirmar a adição da base. Prosseguir à comparação e clicar Comparar. As linhas de orçamento válidas participam da comparação e da exportação. Itens excluídos não participam.

### CMP-ORSE-UNICO

Busca restrita a fonte/código; descrição resolve múltiplos.

Arquivo: testkit/fixtures/comparison.xlsx. Aba: CMP-ORSE-UNICO. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: igual.

Contraprova: CMP-FLUXO.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 1 | ORSE | Outra | m | 2 | 100 | 0.2 | 120 | 240 |

Adicionar como base a aba CMP-ORSE-UNICO-BASE do mesmo arquivo. Fonte associada: ORSE. Cabeçalho 1, mapeamento A:D. Tolerância: 0.

| Linha | Código | Descrição | Unidade | Preço |
| --- | --- | --- | --- | --- |
| 1 | Código | Descrição | Unidade | Preço |
| 2 | 1 | Tubo PVC | un | 100 |

Na revisão, confirmar a adição da base. Prosseguir à comparação e clicar Comparar. As linhas de orçamento válidas participam da comparação e da exportação. Itens excluídos não participam.

### CMP-ORSE-MULTI

Busca restrita a fonte/código; descrição resolve múltiplos.

Arquivo: testkit/fixtures/comparison.xlsx. Aba: CMP-ORSE-MULTI. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: igual.

Contraprova: CMP-FLUXO.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 1 | ORSE | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |

Adicionar como base a aba CMP-ORSE-MULTI-BASE do mesmo arquivo. Fonte associada: ORSE. Cabeçalho 1, mapeamento A:D. Tolerância: 0.

| Linha | Código | Descrição | Unidade | Preço |
| --- | --- | --- | --- | --- |
| 1 | Código | Descrição | Unidade | Preço |
| 2 | 1 | Tubo PVC | m | 100 |
| 3 | 1 | Outro | m | 90 |

Na revisão, confirmar a adição da base. Prosseguir à comparação e clicar Comparar. As linhas de orçamento válidas participam da comparação e da exportação. Itens excluídos não participam.

### CMP-ORSE-AUS

Busca restrita a fonte/código; descrição resolve múltiplos.

Arquivo: testkit/fixtures/comparison.xlsx. Aba: CMP-ORSE-AUS. Cabeçalho físico: 1.

Total geral a digitar: **240**.

Mapeamento: {"code":0,"source":1,"description":2,"unit":3,"quantity":4,"priceWithoutBdi":5,"bdi":6,"priceWithBdi":7,"totalWithBdi":8} (índices iniciam em zero; null significa remover o mapeamento).

Esperado: nao-encontrado.

Contraprova: CMP-FLUXO.

| Linha | A | B | C | D | E | F | G | H | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Código | Fonte | Descrição | Unidade | Quantidade | Preço sem BDI | BDI | Preço com BDI | Total do item |
| 2 | 1 | ORSE | Tubo PVC | m | 2 | 100 | 0.2 | 120 | 240 |

Adicionar como base a aba CMP-ORSE-AUS-BASE do mesmo arquivo. Fonte associada: ORSE. Cabeçalho 1, mapeamento A:D. Tolerância: 0.

| Linha | Código | Descrição | Unidade | Preço |
| --- | --- | --- | --- | --- |
| 1 | Código | Descrição | Unidade | Preço |
| 2 | 2 | Tubo PVC | m | 100 |

Na revisão, confirmar a adição da base. Prosseguir à comparação e clicar Comparar. As linhas de orçamento válidas participam da comparação e da exportação. Itens excluídos não participam.
