# Especificação do kit de validação manual

Status: especificação atendida pelo kit em `testkit/fixtures/`, pela matriz `MATRIZ_AUDITORIA.md` e pelo roteiro `testkit/ROTEIRO_VALIDACAO.md`. Expectativas independentes e campos de registro estão disponíveis. Execução humana: não realizada nesta etapa. Evidências automatizadas e limitações: `RELATORIO_AUDITORIA_RC17.md`.

## Princípio

Uma pessoa deve conseguir baixar uma versão do HTML e os exemplos, seguir instruções e confrontar a saída com um resultado conhecido, sem precisar ler o código ou os chats.

## Matriz por caso

Cada caso deve registrar:

| Campo | Conteúdo obrigatório |
| --- | --- |
| ID | Identificador estável, por exemplo `ORC-AV-001` |
| Regra e finalidade | Comportamento e risco de erro que está sendo verificado |
| Arquivo e aba | Caminho no kit e aba a selecionar |
| Configuração | Cabeçalho, fonte, mapeamento, tolerâncias e opções |
| Preparação e passos | Sequência completa, incluindo a necessidade de iniciar uma sessão limpa |
| Dados relevantes | Linhas/células envolvidas e valores informados |
| Esperado | Categoria, motivo, contagem, linhas, valores calculados, cores e avanço permitido/bloqueado |
| Comparação e exportação | Se a linha participa, resultado esperado e conteúdo a exportar |
| Contraprova | Variação que não deve disparar a detecção |
| Execução | Versão/commit, ambiente, data e executor |
| Observado e evidência | Resultado, arquivo de saída ou captura e identificação do achado |
| Situação | Planejado, aprovado, reprovado, bloqueado ou não executado |

O cálculo esperado deve ser explicado, incluindo a política de arredondamento. O programa pode fornecer a saída observada, mas não o oráculo de aprovação.

## Conjuntos de arquivos

1. **Fluxo válido:** orçamento e bases mínimos, com correspondências e resultados financeiros calculáveis à mão.
2. **Classificação e exclusões:** linhas vazias, anteriores ao cabeçalho, estruturais, cabeçalhos repetidos e itens com campos vazios/zero.
3. **Impedimentos:** um cenário isolado por tipo de falha, sem impedir a observação de outros cenários.
4. **Erros de cálculo:** aplicação de BDI, total do item e fechamento geral, incluindo diferenças que se compensam.
5. **Avisos:** um caso positivo e uma contraprova para cada aviso atual.
6. **Bases:** exclusões, consolidação equivalente e conflitos de unidade/preço dentro da base e entre bases.
7. **Busca e comparação:** código único, repetido, diferenças de fonte e descrição, ORSE, normalização e limites de tolerância.
8. **Revisão e interface:** grupos, seleção de todas as linhas relacionadas, clique sem salto de rolagem, setas, recolhimento e explicações.
9. **Resultados e exportação:** categorias, filtros, ordenação, gráfico por fonte, ABC, cores, códigos e seleção/ordem de colunas.
10. **Leitores e visibilidade:** XLSX, XLS com BIFF5/BIFF8, CSV/TXT e ORSE; metadados de ocultação onde o formato os suporta.

Os arquivos podem ter abas independentes para reduzir a quantidade de downloads. Casos que se influenciam devem ser separados e sua ordem de execução deve estar explícita.

Cada arquivo de exemplo deve conter uma tabela de identificação dos casos ou permitir vinculá-los claramente pela matriz, sem confundir essa tabela com dados de entrada. Definir exatamente a aba e o cabeçalho a mapear.

## Cobertura mínima

- Para cada aviso, erro, impedimento e motivo de exclusão: caso que dispara e contraprova pertinente.
- Para busca, consolidação, conflitos e ORSE: demonstrar seleção correta e situações que devem resultar em Não encontrado.
- Para vazios/zeros/negativos: cobrir individualmente quantidade, preços, BDI e total; testar combinações.
- Para fórmulas: resultado válido, erro, ausência de cache, valor manual e desvio de padrão.
- Para ocultação: linha/coluna antes e depois do cabeçalho, intervalos, colunas obrigatórias, mesclas e conflito que existiria apenas no conteúdo oculto.
- Para revisão: vários itens relacionados intercalados no arquivo de origem; conferir que aparecem juntos e que cada clique seleciona a linha correta.
- Para números/códigos: `R$`, separadores, percentuais equivalentes, zeros à esquerda, texto com `.0` e códigos obtidos de hyperlinks.
- Para limites: igualdade e imediatamente acima/abaixo da tolerância; faixas ABC e arredondamentos.
- Para persistência: aplicar, cancelar, reabrir diálogo, fechar/reabrir o programa no mesmo navegador e falha de armazenamento.
- Para exportação: reabrir o XLSX, conferir valores e estilos, validar conteúdo do CSV e texto copiado. CSV não é formato de estilos de células.
- Para operação offline: testar o HTML distribuído com rede desabilitada.

## Relatórios e evidências

Criar um relatório por versão validada e identificar o commit exato. Guardar entradas sintéticas, configuração, esperado, observado, saídas exportadas e defeitos com reprodução. Não marcar caso não executado como aprovado.

As contagens das planilhas reais complementam a validação. Elas não substituem a verificação de correspondências, valores e cálculos nos casos controlados.

## Critério de conclusão

O kit estará pronto quando todos os casos obrigatórios puderem ser repetidos manualmente e comparados com expectativas explicadas, com lacunas e limitações documentadas. Os mesmos IDs devem ser reutilizados nos testes automatizados quando houver correspondência.
