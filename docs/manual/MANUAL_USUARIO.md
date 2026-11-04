# Manual do usuário — SICORP

SICORP – Sistema de Comparação de Referenciais de Preços.

Desenvolvido pela Coordenação-Geral de Supervisão de Obras (CGSOB), do Departamento de Obras Hídricas e Apoio a Estudos sobre Segurança Hídrica (DOH), da Secretaria Nacional de Segurança Hídrica (SNSH).

Este manual descreve a versão final 4.4.0 e o mesmo fluxo na candidata 4.5.0-rc.1. O botão Tutorial existe apenas na candidata. A final permanece preservada.

## Preparar os arquivos

Abra o HTML no navegador. Não é necessário servidor ou conexão para analisar os arquivos. Orçamentos aceitam XLSX, XLS, CSV e TXT; bases também aceitam ORSE com conversão integrada. Identifique a fonte, período, unidade e regime dos referenciais antes de comparar. Os arquivos importados permanecem na sessão do navegador; exporte os resultados que deseja conservar. A configuração de colunas pode ficar salva localmente, mas isso não equivale a salvar todo o trabalho.

Linhas e colunas ocultas são ignoradas. O programa usa resultados salvos das fórmulas e não recalcula a planilha. Em arquivos próprios, calcule e salve as fórmulas antes da importação. No kit sintético, importe os arquivos originais sem abri-los e salvá-los previamente no Excel: resultados ausentes e erros podem ser intencionais.

## 1. Importar e mapear o orçamento

Selecione arquivo e aba. Informe o número físico da linha que contém o cabeçalho, contando também linhas ocultas ou vazias anteriores. Associe os campos às colunas mostradas na pré-visualização:

| Campo | Necessidade |
| --- | --- |
| Código, Fonte, Descrição e Unidade | Obrigatórios para identificar cada item |
| Quantidade e Total do item | Obrigatórios |
| Preço sem BDI, BDI e Preço com BDI | Pelo menos dois devem estar mapeados; o terceiro pode ser derivado |
| Total geral | Digite o total informado no orçamento |

Confira os vínculos na pré-visualização e clique em **Conferir e continuar**. Se faltar uma coluna ou o total geral estiver vazio/inválido, a tela indica o pré-requisito a corrigir.

## 2. Conferir as ocorrências

| Categoria | Como tratar |
| --- | --- |
| Impedimentos | Corrigir antes de avançar; incluem conteúdo numérico inválido e fórmulas sem resultado |
| Erros de cálculo | Verificar BDI, total do item e fechamento geral; o programa permite prosseguir |
| Avisos | Analisar duplicidades, preços/BDIs diferentes e padrões de fórmulas; o programa permite prosseguir |
| Linhas desconsideradas | Não entram na comparação; confira se títulos, estruturas, cabeçalhos e vazios/zeros foram corretamente excluídos |

Clique na categoria e na linha para consultar explicação, valores envolvidos e ação recomendada. Recolha ou expanda os motivos. Use as barras da tabela para consultar todas as linhas e colunas e role o corpo da janela para alcançar explicação e botões. As setas para cima/baixo permitem percorrer as linhas selecionadas. **Retornar para corrigir** fecha a revisão; refaça a conferência após corrigir o arquivo ou o mapeamento.

A tolerância da conferência é R$ 0,01 por item. Para o fechamento geral, usa-se R$ 0,01 multiplicado pelo número de itens considerado. Ela é distinta da tolerância configurável da comparação.

Linhas sem Código, Fonte, Descrição ou Unidade são estruturais. Nas demais linhas, vazio/zero em campo numérico mapeado exclui antes da análise de outros problemas. Uma coluna não mapeada, quando derivável, não é uma célula vazia. O BDI derivado zero/negativo e o total geral não positivo possuem comportamentos preservados descritos em `docs/DECISOES_AUDITORIA.md`; a possibilidade de avançar não substitui a avaliação do analista.

## 3. Adicionar e revisar bases

Selecione o arquivo, a aba, a fonte associada ao orçamento e a linha do cabeçalho. Mapeie Código, Descrição, Unidade e Preço. Cada configuração aceita uma fonte. No ORSE, confira as abas Insumos e Servicos após a conversão e o download do Excel correspondente.

Clique em **Adicionar configuração**, confira a revisão e confirme **Adicionar base**. Preços ausentes, zero, negativos ou inválidos e identidades incompletas são desconsiderados. Se não houver referência válida, não é possível adicionar a configuração; use a revisão para entender as exclusões.

Referências da mesma fonte, código e descrição com preço ou unidade divergentes criam conflitos bloqueantes, inclusive entre bases diferentes. Referências equivalentes podem ser consolidadas. Corrija a origem/configuração dos conflitos antes de comparar. O botão inferior **Fechar** retorna à configuração sem confirmar a inclusão.

## 4. Comparar e interpretar

Avance à comparação, ajuste a tolerância e clique em **Comparar**. O programa compara preços sem BDI e classifica cada item como Abaixo, Igual, Acima ou Não encontrado. A busca começa por fonte e código. A descrição resolve múltiplos candidatos do mesmo código, inclusive ORSE; não existe busca global por descrição em códigos diferentes.

Um candidato único pode ser selecionado mesmo com descrição ou unidade diferentes. O amarelo destaca essas divergências e não altera, por si só, a classificação financeira. Confira se os serviços e unidades são realmente comparáveis. Não encontrado não significa preço adequado: significa ausência de referência selecionável nas bases configuradas.

Na curva ABC, A vai até 50% acumulados, B até 80% e C acima de 80%. O item que cruza o limite usa o acumulado após sua inclusão: um primeiro item com 60% pertence a B. As barras por fonte usam o total do filtro ABC como escala e agrupam a fonte declarada no orçamento.

## 5. Filtrar e exportar

Use categorias de resultado, busca e filtros ABC. Em **Selecionar e ordenar colunas**, escolha e organize as 17 colunas disponíveis; mantenha pelo menos uma. Tela, exportações e cópia respeitam os filtros e essa ordem. A configuração pode ser preservada ao reabrir no mesmo navegador; se o armazenamento local estiver bloqueado, ela pode voltar ao padrão.

Exporte a seleção em Excel ou CSV ou copie a tabela. O Excel preserva status e destaques amarelos; CSV e cópia não conservam estilos. Confira quantidade de linhas, valores, códigos textuais, filtros e colunas antes de compartilhar o resultado.

## Exemplo conferível

Em uma nova aba do navegador, importe `comparacao-agrupada.xlsx`, aba `01_Comparacao`, cabeçalho 1, total 3.337,67. Mapeie A:I, nesta ordem: Código, Fonte, Descrição, Unidade, Quantidade, Preço sem BDI, BDI, Preço com BDI, Total do item.

Na etapa Bases, importe o mesmo arquivo e adicione as abas SINAPI e ORSE associadas às respectivas fontes. Cabeçalho 1; A:D = Código, Descrição, Unidade e Preço. Com tolerância 0,01, o esperado é **19 resultados: 2 Abaixo, 9 Iguais, 2 Acima e 6 Não encontrados**.

O roteiro `testkit/agrupados/LEIA-ME.md` detalha os demais grupos, ABC, formatos e contraprovas. Registre o observado em `execucao-manual.csv`; não marque testes não executados como aprovados.

## Tutorial opcional e dificuldades frequentes

Na 4.5.0-rc.1, clique em **Tutorial** no cabeçalho. Use Próximo e Anterior; Fechar tutorial ou Escape retornam ao trabalho. Concluir fecha a última etapa. Reabrir começa na primeira etapa. O guia não carrega arquivos, não muda mapeamentos, não compara, não apaga dados e não abre automaticamente na inicialização. O kit de prática é importado manualmente em outra aba.

- Cabeçalho deslocado ou coluna errada: refaça a configuração e a conferência usando a numeração física.
- Fórmula sem resultado: confira o cálculo e salvamento na origem; o SICORP não recalcula.
- Total incompleto: examine as linhas desconsideradas e impedimentos antes de concluir que o fechamento está errado.
- Não encontrado: confira fonte, código e, se houver múltiplos candidatos, descrição. Não substitua códigos pela semelhança do texto.
- Exportação diferente do esperado: confira filtros, busca, ABC e seleção/ordem das colunas.

A validação automatizada cobre os cenários documentados; a inspeção direta em Windows e Excel/LibreOffice e a homologação humana completa continuam pendentes. Este manual não altera as regras de análise nem substitui o julgamento técnico.
