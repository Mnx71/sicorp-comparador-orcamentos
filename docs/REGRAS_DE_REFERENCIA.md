# Regras de referência para iniciar a auditoria

Continuidade da rc.17: a matriz executável está em `MATRIZ_AUDITORIA.md`. Resultados, quatro correções e limites constam em `RELATORIO_AUDITORIA_RC17.md` e `DECISOES_AUDITORIA.md`. O texto abaixo conserva o inventário inicial da rc.16; os três pontos de requisito aberto foram testados e preservados, sem alteração silenciosa.

Versão: `v4.4.0-rc.16`. Este inventário registra comportamentos atuais para orientar a matriz de testes. Não é um relatório de aprovação nem substitui a confirmação das regras esperadas.

## Leitura e visibilidade

- O fluxo atual aceita XLSX, XLS e texto delimitado; as bases também aceitam ORSE com conversão integrada.
- Linhas e colunas ocultas em XLS/XLSX são ignoradas na leitura, pré-visualização, mapeamento, revisão e análise. Preservam-se as coordenadas originais dos dados visíveis.
- A pré-visualização mostra até duas linhas visíveis acima do cabeçalho.
- CSV/TXT não possuem metadados de ocultação. ORSE é interpretado pelo conversor especializado.
- Fórmulas visíveis usam o resultado armazenado no arquivo; o SICORP não recalcula a pasta de trabalho nem reescreve referências a conteúdo oculto.
- A apresentação e as exportações devem preservar códigos, inclusive zeros à esquerda e sufixos textuais como `.0`. A normalização para busca é distinta da apresentação.

## Orçamento

- Cabeçalho e mapeamento precisam estar definidos. Código, Fonte, Descrição, Unidade, Quantidade e Total do item são colunas obrigatórias.
- Pelo menos dois entre Preço sem BDI, BDI e Preço com BDI devem estar mapeados. A coluna não mapeada é calculada com os outros dois componentes.
- O total geral é informado pelo usuário. Ausência ou conteúdo não numérico impede a conferência.
- Linha vazia é ignorada. Conteúdo anterior ao cabeçalho e cabeçalhos repetidos são desconsiderados.
- A identidade de item exige Código, Fonte, Descrição e Unidade. Ausência de identidade leva a Linha estrutural, independentemente do conteúdo financeiro.
- Item com célula numérica mapeada vazia ou zero é desconsiderado na categoria própria, apresentada primeiro e com destaque amarelo. A ausência da coluna não é uma célula vazia. Fórmula sem resultado não é tratada como simples célula vazia.
- Itens restantes com valor negativo, texto inválido ou erro de fórmula em campo numérico mapeado geram impedimento. A impossibilidade de derivar um componente também é bloqueante.
- Se não restar item para conferir, o avanço é bloqueado.
- Divergências na aplicação do BDI, no total do item e no total geral contra a soma auditada são erros de cálculo que permitem prosseguir.
- A tolerância da auditoria é R$ 0,01 por item; para o fechamento geral, R$ 0,01 multiplicado pela quantidade de itens considerada pela auditoria.

### Avisos atuais

1. Possível item duplicado em linhas físicas consecutivas, com mesma identidade, quantidade e valores.
2. Item de mesma fonte, código, descrição e unidade com preços efetivos sem BDI diferentes.
3. Mesma descrição normalizada com percentuais de BDI diferentes, independentemente de código, fonte ou unidade; também considera o BDI derivado.
4. Valor manual em coluna predominantemente calculada.
5. Fórmula diferente do padrão dominante da coluna.
6. Total geral digitado igual a zero ou negativo.

O aviso de conteúdo em linhas/colunas ocultas foi removido porque esse conteúdo passou a ser ignorado.

## Bases

- A configuração exige arquivo, aba, fonte associada ao orçamento e mapeamento de Código, Descrição, Unidade e Preço.
- Linhas vazias são ignoradas; cabeçalhos repetidos e linhas sem Código, Descrição ou Unidade são desconsiderados.
- Preço vazio, zero, negativo, não numérico ou com erro de fórmula desconsidera a linha. Não há categoria de avisos nas bases.
- Sem item válido, a configuração não pode ser adicionada.
- Mesma fonte, código e descrição normalizados com unidade e preço iguais: consolidação, preservando origens.
- Mesma fonte, código e descrição com unidade ou preço divergente: conflito bloqueante para a comparação, inclusive entre bases. Uma base conflitante pode ser adicionada para inspeção.
- Mesmo código com descrições diferentes não constitui, por si só, conflito.
- A revisão abre antes da incorporação da base e pode ser reaberta depois.

## Comparação e resultados

- A busca começa por fonte e código. A descrição normalizada é exigida para resolver múltiplos candidatos. A ORSE segue o mesmo comportamento atual, por decisão de continuidade.
- Um candidato único pode ser selecionado mesmo com descrição diferente; o destaque amarelo indica a divergência. Não há busca global por descrição em outros códigos.
- Descrição e unidade divergentes destacam as duas células correspondentes, sem substituir a classificação financeira da linha.
- Referência ausente produz Não encontrado, sem bloquear as demais comparações.
- A tolerância de comparação é configurável, separada da tolerância da conferência.
- A participação por fonte agrupa pela fonte declarada no orçamento e divide os valores por resultado. Cada faixa usa como escala o total do filtro ABC, deixando branco o restante da barra.
- A Curva ABC usa A até 50% acumulados, B acima de 50% até 80%, C acima de 80%. Limites e tratamento do item que cruza a faixa precisam de casos explícitos.
- Existem 17 colunas selecionáveis e ordenáveis. Seleção e ordem valem para tabela, CSV, Excel e cópia e são salvas no navegador. Nenhuma coluna visível é uma configuração proibida.
- Exportações devem preservar dados, filtros, ordem e, no Excel, destaques amarelos e cores do resultado.

## Revisão

- Hierarquia: categoria principal, linha de motivo e ocorrências numa tabela compacta com rolagem interna.
- Linhas relacionadas à mesma ocorrência devem permanecer juntas. A seleção de cada linha deve ser independente, inclusive em achados com várias linhas.
- Clique mantém a posição da tabela; navegação por setas deve manter a linha selecionada visível.
- Motivos podem ser recolhidos. A explicação mostra detalhes e cálculos; não repete a linha original exibida na tabela.
- Antes do cabeçalho, Linha estrutural, Cabeçalho repetido e duplicidade consecutiva não devem receber amarelo indiscriminado.
- Divergência de preços destaca preços; divergência de BDI destaca BDI ou os preços usados para derivá-lo, quando a coluna não existe.

## Pontos que exigem teste e decisão explícita

- BDI derivado zero ou negativo atualmente não recebe a mesma validação de positividade de uma coluna mapeada. Não corrigir isso silenciosamente durante a consolidação.
- Total geral zero/negativo atualmente é aviso; vazio/inválido é bloqueante.
- A exclusão por vazio/zero ocorre antes da auditoria de outros campos da linha. Testar a combinação com outro campo negativo ou inválido e confirmar a regra esperada.
- Testar arredondamentos e limites monetários, percentuais derivados e tolerância acumulada com um oráculo independente.
- Testar efeito de linhas desconsideradas e ocultas nos totais, gráfico e ABC; os resultados armazenados de fórmulas visíveis não são recalculados.
- Validar a persistência de configuração reabrindo o mesmo HTML no mesmo navegador, incluindo falha/indisponibilidade do armazenamento local.
