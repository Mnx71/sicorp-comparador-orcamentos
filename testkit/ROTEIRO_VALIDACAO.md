# Roteiro de validação independente — rc.17

SICORP – Sistema de Comparação de Referenciais de Preços.

Desenvolvido pela Coordenação-Geral de Supervisão de Obras (CGSOB), do Departamento de Obras Hídricas e Apoio a Estudos sobre Segurança Hídrica (DOH), da Secretaria Nacional de Segurança Hídrica (SNSH).

Este roteiro valida o programa. O tutorial e o manual do usuário pertencem à próxima etapa. Expectativas completas: [matriz de auditoria](../docs/MATRIZ_AUDITORIA.md). Dados declarativos: [cases.json](cases.json). Registro manual a preencher: [execucao-manual.csv](execucao-manual.csv).

## Preparação

1. Baixar o repositório da branch de auditoria. Conferir a versão e o SHA-256 do HTML em `dist/SHA256SUMS.txt`.
2. Abrir `dist/sicorp_comparador_orcamento_v4.4.0-rc.17.html` no Chrome ou Edge. Fechar o aviso beta com Continuar.
3. Desconectar a rede para validar a operação offline. Links externos da Central de Bases exigem rede; não são necessários para importar e comparar.
4. Usar uma aba nova para cada caso. A seleção de colunas persiste no mesmo navegador. No início de cada comparação, selecionar todas as colunas e restaurar a ordem padrão no diálogo de colunas.
5. Usar os arquivos de `testkit/fixtures/` sem abrir/salvar em um editor de planilhas. Alguns casos contêm erros e fórmulas sem cache intencionais. Um recálculo externo altera esses casos.

## Carregamento e mapeamento

Para cada linha da matriz, escolher exatamente o arquivo, a aba e o cabeçalho físico indicados. A aba tem o ID do caso. Orçamentos ficam em `budget.xlsx`, bases em `base.xlsx`, comparações em `comparison.xlsx`.

No orçamento, mapear A=Código, B=Base/Fonte, C=Descrição, D=Unidade, E=Quantidade, F=Preço sem BDI, G=BDI, H=Preço com BDI, I=Valor total com BDI. Clicar na função e depois na coluna da pré-visualização. Se a matriz informar `null`, remover esse vínculo. As colunas ocultas não podem ser escolhidas. Informar o total geral indicado no caso e clicar Conferir e continuar.

O cabeçalho costuma ser a linha 1. Nos casos anteriores ao cabeçalho ou com título mesclado, usar a linha 2. A matriz é a referência para essas exceções.

Na base, associar o identificador da fonte indicado, selecionar a aba e mapear A=Código, B=Descrição, C=Unidade, D=Preço. Clicar Adicionar configuração. A revisão abre antes da incorporação. Confirmar Adicionar base dentro da revisão. Se não houver item válido, Adicionar configuração deve ficar indisponível. Conflitos podem ser incorporados para inspeção e impedem a comparação.

Nos casos `BASE-*`, primeiro carregar o orçamento `ORC-OK-001`, total 240, conferir e continuar. Isso disponibiliza a fonte SINAPI para associação. Nos casos `CMP-*`, carregar a aba do orçamento no arquivo `comparison.xlsx` e adicionar a aba de mesmo ID com sufixo `-BASE` como base, usando a fonte indicada na matriz. Não misturar casos em uma mesma sessão, pois isso pode criar conflitos adicionais.

## Consequências esperadas

| Categoria | Consequência |
| --- | --- |
| Impedimento | Não permite continuar; corrigir entrada ou mapeamento |
| Erro de cálculo | Mantém os dados informados e permite prosseguir mesmo assim |
| Aviso | Permite prosseguir; exige avaliação do analista |
| Desconsiderada | Linha não participa da conferência, comparação, ABC, gráfico ou exportação |
| Linha vazia/oculta | Não gera ocorrência de revisão e não participa da análise |

No orçamento, vazio/zero em campo numérico mapeado produz a categoria própria, apresentada primeiro entre as linhas desconsideradas e com destaque amarelo na célula envolvida. Linha estrutural, antes do cabeçalho, cabeçalho repetido e duplicidade consecutiva não devem ganhar amarelo indiscriminado. Divergência de BDI destaca G; quando derivado, destaca F e H. As exclusões podem coexistir com o impedimento Nenhum item e o erro de fechamento contra soma zero, conforme a matriz.

Nos três pontos de requisito preservados, o comportamento é: BDI derivado zero/negativo é aceito, total geral zero/negativo gera aviso e erro de fechamento, e vazio/zero exclui antes de outro campo negativo/inválido. A caracterização desses pontos não constitui nova aprovação de requisito. Ver `docs/DECISOES_AUDITORIA.md`.

## Fluxo de comparação calculável à mão

Usar `CMP-FLUXO`, total geral **120**, fonte SINAPI, tolerância de comparação **0**. Na página Comparação, clicar Comparar.

| Código textual | Sem BDI | Referência | Diferença | Quantidade × com BDI | Resultado | ABC |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| 0001 | 50 | 60 | -10 | 1 × 60 = 60 | Abaixo | A |
| 002.0 | 30 | 30 | 0 | 1 × 36 = 36 | Igual | B |
| A3 | 15 | 10 | 5 | 1 × 18 = 18 | Acima | C |
| 404 | 5 | ausente | indisponível | 1 × 6 = 6 | Não encontrado | C |

Soma 120. Participações: 50%, 30%, 15%, 5%. Acumulados: 50%, 80%, 95%, 100%. A classificação usa o acumulado após incluir o item. Por isso, em `CMP-CRUZA-FONTES`, os itens de 60 e 40 pertencem a B e C. As barras SINAPI e ORSE ocupam 60% e 40% da escala total 100; o restante de cada barra fica branco. A ausência da referência ORSE é intencional nesse caso.

Em `CMP-FLUXO`, a primeira linha continua Abaixo embora descrição e unidade sejam diferentes. As células das duas descrições e das duas unidades ficam amarelas. Código 0001 deve conservar os zeros e 002.0 deve conservar o sufixo textual. A busca não salta para outro código por descrição, inclusive ORSE.

## Cálculos e limites

Sem BDI × (1 + BDI) = com BDI. Quantidade × com BDI = total auditado do item. O total geral é comparado à soma dos totais auditados. Arredondar valores monetários positivos ao centavo mais próximo, com meio centavo para cima: 10,075 → 10,08; 10,074999 → 10,07; 10,075001 → 10,08. Não recalcular nem substituir os valores informados no orçamento.

Uma diferença de exatamente R$ 0,01 está dentro da tolerância por item. Para dois itens, o fechamento admite exatamente R$ 0,02. Diferenças de sinais opostos em dois itens não apagam os erros individuais: `ORC-ERR-COMP` contém 241 e 239, contra 240 e 240 esperados. O geral fecha em 480 e ainda devem existir dois erros do item.

Na comparação, `CMP-LIM` usa 100,01 contra 100 e tolerância 0,01: Igual. `CMP-MAIS` usa 100,011: Acima. A tolerância de comparação é independente da conferência.

## Revisão e interface

1. Carregar `ORC-AV-GRUPOS`, total 15.120. Na revisão, devem existir 30 avisos e 60 linhas relacionadas. A ordem começa 2, 32, 3, 33. Cada par deve permanecer junto.
2. Clicar separadamente nas duas linhas do mesmo achado. A seleção deve mudar individualmente. Rolar a tabela e clicar numa linha visível: a rolagem deve permanecer na mesma posição.
3. Usar as setas para cima/baixo. A linha selecionada deve permanecer visível. Recolher o motivo e reabri-lo. Conferir a explicação e seus cálculos.
4. Remapear Quantidade para Descrição e restaurar. Repetir na base, remapeando Preço para Descrição. A pré-visualização deve permanecer disponível.
5. Depois de uma comparação, voltar à página 1 e trocar o orçamento. As bases devem permanecer adicionadas e os resultados anteriores devem ser limpos.

## Exportação e persistência

1. Em `CMP-FLUXO`, conferir 17 colunas e quatro linhas. Exportar Excel, CSV e copiar a seleção. O XLSX deve conservar os números como números, os códigos como texto, o cabeçalho congelado, filtros e os destaques amarelos.
2. Cores de preenchimento do XLSX: Abaixo `E6F2F8`, Igual `E4F4EF`, Acima `FBE9DD`, Não encontrado `F3F4F6`, amarelo `FDE68A`. CSV e cópia não transportam estilos.
3. No diálogo de colunas, limpar tudo e aplicar: deve impedir zero colunas. Selecionar Código, Status, Descrição orçamento e Descrição base. Mover Código para o início e aplicar. A tela, o XLSX, o CSV e a cópia devem usar essa ordem e quatro colunas.
4. Reabrir o diálogo, selecionar todas e cancelar. A escolha aplicada anteriormente deve permanecer. Fechar a aba e reabrir o mesmo HTML no mesmo navegador: a seleção e a ordem devem permanecer.
5. Ocultar todas as categorias e ativar apenas Acima: uma linha, A3. Exportar: apenas essa linha. Buscar 002.0: apenas a segunda linha. Restaurar todos os filtros ao concluir.

## Leitores

Carregar `biff5.xls` e `biff8.xls`. Em cada um, `ORC-OK-001` deve aceitar um item. `ORC-VIS-001` deve ignorar a linha oculta e somar 240. `ORC-VIS-002` não oferece a coluna A oculta, exigindo revisão do mapeamento. São arquivos BIFF efetivos, com registros de ocultação inseridos explicitamente pelo gerador.

`fluxo.txt` e `csv/CMP-FLUXO.csv` reproduzem o orçamento do fluxo válido; o nome da aba lida é CSV. Usar `base-fluxo.csv` como base SINAPI. CSV/TXT não possuem ocultação ou cache de fórmula.

Carregar `sintetico.ORSE` na página Bases. Deve baixar `sintetico_ORSE.xlsx`, com Resumo, Insumos e Servicos. Apenas Insumos e Servicos aparecem como opções internas. Insumos contém 00001/ORSE, preço 12,34, e 00002/ORSE sem preço. Servicos contém 00010/ORSE, 45,67, e 00011/ORSE sem preço. Inativos, equipamentos e outra fonte não entram no catálogo ORSE. Ao adicionar, as linhas sem preço são desconsideradas. `invalido.ORSE` deve apresentar erro de assinatura.

## Registro da execução

Preencher versão, commit, navegador/sistema, data, executor, observado, evidência e situação em `execucao-manual.csv`. Uma execução humana não foi realizada nesta entrega. Os resultados automatizados estão em `qa/evidence/`; não copiar seu status para a planilha manual sem reproduzir o caso. Registrar qualquer divergência com ID e arquivo de saída. A abertura dos XLSX no Excel/LibreOffice para conferência visual permanece uma validação externa distinta da reabertura automatizada pelo leitor.
