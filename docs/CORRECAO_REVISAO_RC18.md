# Correção da revisão do orçamento — v4.4.0-rc.18

Data: 02/11/2026. Partida: `0aac15e9f1095bd601fc261a3471b63db65142f5`, branch `audit/consolidacao-rc17`.

SICORP – Sistema de Comparação de Referenciais de Preços.

Desenvolvido pela Coordenação-Geral de Supervisão de Obras (CGSOB), do Departamento de Obras Hídricas e Apoio a Estudos sobre Segurança Hídrica (DOH), da Secretaria Nacional de Segurança Hídrica (SNSH).

## Problema e correção

A janela de revisão do orçamento limitava a altura do corpo com `overflow: hidden` e permitia que seus filhos fossem comprimidos. Em alturas menores, isso recortava a tabela, suas barras de rolagem e a explicação. Na rc.17, o novo ensaio reproduziu a compressão da explicação em 1366×768: apenas 10,52 px entre o texto da ação e o limite inferior, em vez do espaço interno de pelo menos 13 px.

Na rc.18, o corpo da janela permite rolagem e mantém a altura natural dos seus blocos. O cabeçalho não encolhe, a altura máxima acompanha o viewport dinâmico e a tabela mantém a rolagem nos dois eixos. A explicação cresce com seu texto e os botões podem quebrar de linha em telas estreitas. O botão “Fechar” do cabeçalho e seu evento foram removidos; “Retornar para corrigir” fecha a janela.

Não houve alteração do núcleo, dos cálculos, das regras ou das planilhas de teste. `baseline/`, `reference/` e o HTML rc.17 foram preservados. A candidata permanece beta.

## Verificação executada

`npm run check` passou em Linux, Node.js 24.22.1, Playwright 1.62.1 e Chromium 141.0.7390.0, com `SICORP_CHROMIUM_PATH=/tmp/sicorp-grouped-chromium/chromium`:

| Verificação | Resultado |
| --- | --- |
| Integridade da baseline; geração, sintaxe e paridade do HTML | Aprovadas |
| Testes de domínio, leitores, integração, exportação e agrupamento | 363 aprovados |
| Fluxos originais de navegador | 103 aprovados |
| Casos agrupados de arquivo | 27 aprovados |
| Fluxos agrupados de navegador | 27 aprovados |
| Combinações de aba, tamanho e categoria na revisão | 56 aprovadas |
| `npm run audit:cases`, executado separadamente | 114 casos, zero falhas |

O ensaio de layout importa o XLSX efetivo, abre `01_Revisao` e `02_Impedimentos` e redimensiona a janela já aberta. Tamanhos: 1600×1000, 1366×768, 1024×600, 800×450, 640×360, 390×844 e 320×568; quatro categorias em cada combinação. Verifica o alcance do fim da tabela nos dois eixos, seus limites dentro do corpo, a seleção da ocorrência “Total geral diverge da soma auditada”, o espaço inferior da ação, o alcance dos botões, a ausência de “Fechar” e o fechamento por “Retornar para corrigir”. O navegador opera sem rede. Também foram inspecionadas capturas de 1024×600 e 640×360.

Evidências: `qa/evidence/budget-layout/report.json` e capturas da tabela/explicação; relatórios e logs dos demais comandos em `qa/evidence/rc18/`, preservando os relatórios históricos em seus caminhos anteriores. O relatório de layout identifica o hash do HTML. Os resultados são de execução local; a execução de CI é registrada separadamente pelo workflow. Não houve nova regressão com as planilhas reais nesta correção de interface. As evidências reais da rc.17 permanecem históricas. Homologação por pessoa e execução no Windows não foram realizadas.

## Repetição manual

1. Abra `dist/sicorp_comparador_orcamento_v4.4.0-rc.18.html` e importe `testkit/agrupados/orcamento-agrupado.xlsx`, aba `01_Revisao`, cabeçalho 3, total 22.190,23.
2. Abra a conferência, selecione “Erros de cálculo” e reduza a janela. Role a tabela até o final; a ocorrência do total geral e as barras devem continuar acessíveis. A rolagem horizontal permite consultar todas as colunas.
3. Selecione a ocorrência do total geral. Role o corpo da janela para conferir toda a explicação, incluindo “Ação recomendada”, com espaço até a borda inferior.
4. Confira as outras categorias e os botões no fim do corpo. “Retornar para corrigir” deve fechar a janela. Não deve existir o botão superior “Fechar”.

Em telas menores, é esperado rolar o corpo da janela para alcançar os blocos inferiores e rolar a própria tabela para percorrer linhas e colunas. Nada deve ficar inacessível por recorte.
