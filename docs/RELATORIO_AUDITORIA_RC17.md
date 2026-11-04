# Relatório de consolidação e auditoria — v4.4.0-rc.17

SICORP – Sistema de Comparação de Referenciais de Preços.

Desenvolvido pela Coordenação-Geral de Supervisão de Obras (CGSOB), do Departamento de Obras Hídricas e Apoio a Estudos sobre Segurança Hídrica (DOH), da Secretaria Nacional de Segurança Hídrica (SNSH).

Data: 28/10/2026. Situação: candidata com auditoria automatizada aprovada no escopo abaixo; homologação manual por pessoa não executada. Não é versão final.

## Identificação da saída

| Campo | Valor |
| --- | --- |
| Repositório | https://github.com/Mnx71/sicorp-comparador-orcamentos |
| Branch de saída | audit/consolidacao-rc17 |
| Main de partida | a519fc49b78ea06fe37ac4f13c3555e143651c52 |
| Commit do código efetivamente testado | 90d447e32e000389ae2158c6b2260a31543b1b7b |
| Árvore Git do código testado | b7f4be6f572e8c8eaa8ee793145ca19647b1bc98 |
| HTML distribuído | dist/sicorp_comparador_orcamento_v4.4.0-rc.17.html |
| SHA-256 do HTML | 7a275c849c2508ba64369a89e3470ecb863919f449836a98e6817f1fa73ff50b |
| Baseline preservada | v4.4.0-rc.16, SHA-256 6b7dc58fdfd79dbaec07c1004ef996b65a71f096ff5376a8860c20f14e398ac4 |

O fechamento acrescenta este relatório, o handoff e as evidências em commit posterior. O código da aplicação e o HTML continuam sendo os do commit testado acima. Os relatórios JSON registram esse commit, o hash do HTML e `codeDirty: false`. A árvore produzida pelo GitHub foi comparada com a árvore local antes da execução final. A `main` não foi alterada.

## Resultado executado

| Camada | Resultado observado | Evidência |
| --- | --- | --- |
| Integridade da candidata e histórico | Ambos preservados; 3 scripts executáveis da baseline com sintaxe válida | qa/evidence/final-check.log |
| Geração atual | HTML corresponde aos fontes e tem 3 scripts executáveis com sintaxe válida | npm run validate; dist/SHA256SUMS.txt |
| Testes de domínio, leitores, integração e exportação | 332 executados, 332 aprovados, zero falhas, zero ignorados | qa/evidence/final-check.log |
| Matriz sintética lida dos XLSX efetivos | 114 cenários executados, zero falhas | qa/evidence/cases-report.json |
| Navegador local e distribuição offline | 103 verificações aprovadas; zero erros de página e zero requisições HTTP | qa/evidence/browser/report.json |
| Persistência | Seleção/ordem conservadas ao reabrir aba e após encerrar/reiniciar Chromium com o mesmo perfil; falha de armazenamento também exercitada | UI-PERSISTENCIA, UI-PERSISTENCIA-REINICIO, UI-ARMAZENAMENTO-FALHA |
| GitHub Actions no commit testado | Job concluído com sucesso, inclusive instalação de navegador e npm run check | Execução 40755242430, job 123052295225 |
| Arquivos reais | 424 itens e 114 exclusões; cálculos independentes sem divergência após correção | qa/evidence/real-report.json |

Ambiente local: Linux, Node.js 24.22.1, Playwright 1.62.1, Chromium 141.0.7390.0. A rede foi desabilitada no contexto de navegador, com carregamento por `file://`. O navegador local foi obtido do pacote de desenvolvimento `@sparticuz/chromium` 141.0.0, pois o download padrão do Playwright não produziu um ZIP válido neste ambiente. Esse executável não integra o produto.

Na execução [GitHub Actions](https://github.com/Mnx71/sicorp-comparador-orcamentos/actions/runs/40755242430), o runner Ubuntu usou Node.js 22 e o Chrome for Testing 151.0.7922.34 instalado pelo Playwright. Os passos de testes e armazenamento de evidências terminaram com sucesso. A execução local e a remota são evidências distintas.

## Cobertura funcional

O kit contém 81 cenários de orçamento, 18 de bases e 15 de comparação, distribuídos em três XLSX, além de CSV, TXT, BIFF5, BIFF8 e ORSE sintéticos. As expectativas são declaradas antes da execução em `testkit/spec.mjs` e podem ser conferidas nas tabelas de `MATRIZ_AUDITORIA.md`. O gerador da matriz não importa o motor do SICORP.

Foram exercitados os seis avisos atuais, os três tipos de erro de cálculo, as exclusões estruturais e financeiras, impedimentos de mapeamento/entrada, os quatro resultados financeiros, derivação dos três componentes, BDI informado/derivado, fórmulas com erro/cache ausente/padrão dominante/valor manual, ocultação, conflitos e equivalências entre bases. Casos de fronteira incluem tolerâncias por item/geral/comparação, compensação de erros e arredondamento no meio centavo.

No HTML distribuído foram conferidos: revisão antes de incorporar bases; grupos com linhas relacionadas intercaladas; seleção individual; clique sem salto de rolagem; setas mantendo a seleção visível; recolhimento do motivo; orçamento novo preservando bases; mapeamento errado preservando pré-visualização; códigos com zeros e sufixo textual; seleção, ordem, aplicação/cancelamento e zero colunas; filtros; cópia; CSV; XLSX com reabertura, números tipados e preenchimentos de status/amarelo. A persistência foi testada também após reiniciar o processo do navegador.

Os arquivos BIFF são contêineres binários efetivos e contêm os registros de ocultação usados no teste. O ORSE sintético percorre descriptografia, extração, leitura MIDAS, filtragem de ativos, exclusão de equipamentos/outra fonte e geração de XLSX. A conversão real foi executada separadamente.

## Defeitos e regras

Quatro defeitos confirmados foram corrigidos: classificação no limite da tolerância; fórmula sem cache confundida com zero; alerta de pré-requisitos oculto antes do arquivo; arredondamento no meio centavo. Reprodução, impacto, contraprovas e logs anteriores à correção estão em `DECISOES_AUDITORIA.md` e `qa/evidence/`.

Não se alteraram as regras controversas da candidata: BDI derivado não positivo, total geral não positivo e precedência da exclusão por vazio/zero. A ORSE continua usando fonte/código, com descrição apenas para resolver múltiplos candidatos. A autoria foi expandida e o nome oficial do programa aplicado. A rc.16 e a referência histórica permaneceram byte a byte intactas.

## Regressão com arquivos reais

| Verificação | Observado |
| --- | ---: |
| Itens aceitos do orçamento | 424 |
| Linhas estruturais desconsideradas | 114 |
| Itens canônicos nas três bases configuradas | 18.986 |
| Linhas desconsideradas nas bases | 2.485 |
| Conflitos | 0 |
| Correspondências / iguais | 183 |
| Não encontrados | 241 |
| Abaixo / acima | 0 / 0 |
| Soma auditada independente | R$ 1.990.067,18 |
| Divergências de total de item / BDI | 0 / 0 |
| Insumos ORSE reais | 8.087 |
| Serviços ORSE reais | 9.931 |

A verificação numérica usou Python Decimal/ROUND_HALF_UP, sem os parsers/formatadores do SICORP, sobre os 424 itens. A soma anterior à correção de arredondamento era R$ 1.990.067,16. O orçamento, o catálogo e a comparação canônicos foram confrontados integralmente com a baseline, além das contagens; a auditoria corrigida foi confrontada com o cálculo independente.

Mapeamentos reais: orçamento PLANILHA ORCAMENTARIA, cabeçalho 2, B:J; serviços SEINFRA/orcamento, cabeçalho 4, código B, descrição C, unidade F, preço G; insumos SEINFRA/insumos, cabeçalho 6, A:D; SINAPI/ISD, cabeçalho 10, código B, descrição C, unidade D, preço K (CE). Os 241 Não encontrados são relativos a essas três configurações; não representam cobertura de todos os referenciais.

O total geral de entrada nessa regressão foi a soma independente, para testar a conferência. Não foi validado manualmente o total impresso da planilha. Hashes das entradas constam no relatório JSON. Nenhuma planilha real foi incluída no repositório.

## Limites de aprovação

A homologação por pessoa, a inspeção dos XLSX no aplicativo Excel/LibreOffice e Chrome/Edge no Windows continuam não executadas. Há lacunas explícitas para combinações adicionais de mesclas/ocultação e arquivos BIFF de outros produtores. A navegação em todos os sites externos da Central não foi auditada. Esses pontos não estão marcados como aprovados.

O programa não recalcula fórmulas de origem. Valores visíveis armazenados que dependam de células ocultas permanecem armazenados. O tutorial não foi implementado e exigirá nova regressão. A licença do projeto e a promoção de versão final continuam fora deste fechamento. A continuidade técnica está em `handoffs/HANDOFF_02_TUTORIAL_MANUAL.md`.
