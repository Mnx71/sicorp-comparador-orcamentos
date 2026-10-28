# Decisões e defeitos da auditoria — rc.17

SICORP – Sistema de Comparação de Referenciais de Preços.

Desenvolvido pela Coordenação-Geral de Supervisão de Obras (CGSOB), do Departamento de Obras Hídricas e Apoio a Estudos sobre Segurança Hídrica (DOH), da Secretaria Nacional de Segurança Hídrica (SNSH).

## Requisitos preservados

| ID | Reprodução | Comportamento preservado | Consequência |
| --- | --- | --- | --- |
| DEC-01 | ORC-DER-ZERO / NEG | BDI não mapeado é derivado em 0 ou -0,1 | Avanço permitido. Coluna mapeada com zero é excluída e negativa é bloqueante. A assimetria fica explícita para decisão futura |
| DEC-02 | ORC-TOT-ZERO / NEG | Total geral não positivo produz aviso e divergência de fechamento | Não bloqueia por si só. Vazio/inválido bloqueia |
| DEC-03 | ORC-EXC-001 / 002 | Identidade incompleta torna estrutural; depois, vazio/zero exclui antes de avaliar outros problemas | Uma linha excluída não recebe impedimento financeiro adicional |
| DEC-04 | CMP-ORSE-* | ORSE busca fonte/código; descrição resolve múltiplos candidatos | Não existe busca direta global por descrição |
| DEC-05 | CMP-FLUXO / CMP-CRUZA-FONTES | ABC usa acumulado após inclusão, A ≤ 50%, B ≤ 80%, C > 80% | Um primeiro item com 60% pertence a B |

Essas decisões documentam continuidade da candidata. Não significam aprovação nova dos três pontos abertos pelo usuário. Alterações futuras exigem registrar reprodução, impacto e novo esperado. Não são impedimentos novos introduzidos nesta auditoria.

## Defeitos corrigidos

| ID | Antes | Correção e impacto | Regressão |
| --- | --- | --- | --- |
| DEF-01 | 100,01 - 100 era ligeiramente maior que 0,01 em ponto flutuante; resultado Acima | Compensar apenas ruído de subtração proporcional à magnitude. Não ampliar a tolerância de negócio. 100,011 continua Acima | CMP-LIM, MENOS, MAIS; log `tolerance-before-fix.log` |
| DEF-02 | SheetJS representa fórmula sem cache como stub `t:z, v:0`; orçamento excluía como zero e base indicava Preço zero | Preservar ausência do valor em stubs com fórmula. Orçamento bloqueia por fórmula sem resultado; base exclui com motivo específico | ORC-4/5/6/7/8-CACHE e BASE-CACHE, em objetos e XLSX; `formula-cache-before-fix.log` |
| DEF-03 | Mensagem de pré-requisitos ficava dentro da configuração oculta antes do arquivo | Mover o alerta para fora dessa área. O pedido de correção fica visível antes de carregar arquivo | UI-PRE-001 |
| DEF-04 | 10,075 arredondava para 10,07; soma real auditada ficava R$ 0,02 abaixo do cálculo decimal | Escalar a compensação numérica na passagem ao centavo e alinhar valores monetários da exportação. Meio centavo positivo resulta 10,08, conforme arredondamento ao centavo usado na auditoria | ORC-ROUND-MEIO/ABAIXO/ACIMA; `rounding-before-fix.log`; 424 itens conferidos com Decimal/ROUND_HALF_UP |

As correções numéricas estabilizam os limites da regra existente; não mudam R$ 0,01 por item nem a tolerância configurada da comparação. Não houve reescrita dos dados de entrada. Os logs anteriores às correções incluem falhas esperadas de reprodução, identificadas pelo caso.

## Migração dos testes históricos

A primeira execução da estrutura reaproveitada encontrou 78 aprovações e 21 falhas em 99 testes. Expectativas da v4.3 foram revisadas quando contrariavam a rc.16 documentada: base com preço inválido deixa de ser mantida; estrutural substitui Título/categoria; item negativo segue para auditoria; exportação tem 17 colunas; leitor preserva metadados; visão inclui a fonte da base. Um teste antigo com BDI mapeado zero passou a usar 20% para testar somente normalização. Casos específicos de zero foram acrescentados separadamente.

O histórico é preservado integralmente em `reference/`. A suíte migrada contém 98 testes, pois dois snapshots antigos de orçamento foram substituídos por um teste de comportamento e pela matriz parametrizada atual. Nenhuma falha foi declarada aprovada sem execução. Asserções do roteiro de navegador foram ajustadas para separar texto das setas de ordenação, ler valores das opções de aba e verificar o botão indisponível para base sem itens válidos.

## Limitações e pendências

- Homologação por pessoa e conferência visual no Excel/LibreOffice não executadas. A reabertura automatizada dos XLSX e os estilos das células foram verificados.
- Navegador exercitado: Chromium 141 em Linux. Chrome/Edge no Windows e outros navegadores precisam de execução própria. O workflow usa a versão de Chromium instalada pelo Playwright e não constitui evidência até executar.
- O runtime lê resultados armazenados; não recalcula fórmulas visíveis dependentes de linhas/colunas ocultas. ORC-VIS-FORMULA demonstra isso.
- Estados defensivos `REFERENCE_SOURCE_MISSING`, `MAPPED_VALUE_EMPTY` e `MAPPED_VALUE_ZERO` podem ser obtidos chamando a auditoria com modelo artificial. Com arquivo e pré-processamento normais, a ausência de identidade ou vazio/zero é desconsiderada antes. Não se atribui a esses estados um arquivo que contradiga o fluxo real.
- As fixtures cobrem ocultação antes/depois do cabeçalho, intervalos de linhas, coluna obrigatória, mescla anterior e conflito apenas oculto. Combinações de mesclas atravessando múltiplas linhas/colunas ocultas e arquivos BIFF de vários produtores não foram esgotadas.
- A Central de Bases mantém seu módulo e runtime de UI intactos; testes históricos de catálogo/portabilidade foram reaproveitados. A navegação em todos os sites externos do catálogo não foi auditada.
- `localStorage` pode ser bloqueado: a seleção funciona na sessão e volta ao padrão na reabertura. Foi exercitada falha de leitura e escrita, sem erro fatal de página.
- Não foi escolhida licença do projeto nem publicada versão final. Arquivos reais não fazem parte do kit público. O tutorial não foi implementado.
