# Handoff 02 — manual e tutorial após a versão final 4.4.0

SICORP – Sistema de Comparação de Referenciais de Preços.

Desenvolvido pela Coordenação-Geral de Supervisão de Obras (CGSOB), do Departamento de Obras Hídricas e Apoio a Estudos sobre Segurança Hídrica (DOH), da Secretaria Nacional de Segurança Hídrica (SNSH).

## Etapa executada

O PR #1 foi integrado em `93a7f510c9c61446a54cb675339c2d90f55c2ab7`. Manual e tutorial foram preparados na candidata 4.5.0-rc.1. A continuidade vigente passa a ser `HANDOFF_03_DOCUMENTACAO_DISTRIBUICAO.md`; o texto abaixo conserva o estado de entrada desta etapa.

## Ponto de continuidade — 04/11/2026

O responsável solicitou expressamente salvar o programa como versão final. A versão vigente é **4.4.0**, no arquivo `dist/sicorp_comparador_orcamento_v4.4.0.html`. SHA-256: `75cabf1c665b4c356e918d94ea5dc62169b111558a35f43e6ffeb886c8d364d2`.

- Repositório: https://github.com/Mnx71/sicorp-comparador-orcamentos.
- Branch de trabalho e PR: `audit/consolidacao-rc17`, PR #1; integração na main ainda pendente.
- Commit da promoção final: `c2ab5dc6af2f02e6a704bfd9d2de15b080a1d933`.
- Origem funcional aprovada: `d1ea4f92087b07c899f5e826408aa7e2c01a4175`.
- Registro definitivo da versão: `docs/releases/v4.4.0.md`.

O HTML final difere da origem aprovada exclusivamente pela versão exibida no rodapé. A rc.20 anterior foi preservada. Duas revisões antigas receberam o mesmo nome rc.20; o registro da versão final distingue ambas por commit e hash. Usar o arquivo **v4.4.0**, e não escolher a rc.20 somente pelo nome.

**Congelar a v4.4.0.** Para qualquer alteração futura do HTML, definir uma nova versão no manifesto, no pacote e no rodapé, além de um novo caminho de saída. A geração rejeita sobrescrever uma versão final com conteúdo diferente. Um manual externo pode acompanhar a v4.4.0 sem alterar o programa; tutorial embutido requer outra versão.

## Leitura obrigatória

1. `README.md`, `docs/PLANO_MESTRE.md` e `docs/releases/v4.4.0.md`.
2. `docs/DECISOES_AUDITORIA.md`, `docs/REGRAS_DE_REFERENCIA.md` e `docs/RELATORIO_AUDITORIA_RC17.md`.
3. `docs/ARQUITETURA_E_COMANDOS.md` e `src/manifest.json`.
4. `testkit/agrupados/LEIA-ME.md`, `testkit/ROTEIRO_VALIDACAO.md`, `docs/MATRIZ_AUDITORIA.md` e `testkit/cases.json`.
5. Evidências finais da candidata em `qa/evidence/fechamento-botao-base/` e da promoção em `qa/evidence/release-4.4.0/`.

O handoff anterior foi preservado em `archive/HANDOFF_02_ATE_RC20.md` como histórico. Suas referências a candidatas e restrições de promoção foram superadas pela decisão explícita atual; não são instruções para rebaixar a versão final.

## O que está concluído

- Fontes separados e geração reproduzível do HTML único. Baseline rc.16 e ZIP da v4.3 preservados.
- Quatro defeitos corrigidos na auditoria; limites numéricos, fórmulas sem cache, alerta de pré-requisitos e arredondamento protegidos por regressões.
- 114 cenários independentes, contraprovas, três XLSX agrupados, formatos legados, CSV/TXT e ORSE sintético. Não publicar as planilhas reais.
- Revisões amplas com margem ao redor, rolagem integral e espaço da explicação. Ambos os botões superiores “Fechar” foram removidos. Abertura sem introdução. Versão e autoria no rodapé.
- Na origem aprovada: 363 testes, 114 cenários, 103 fluxos originais de navegador, 27 casos agrupados de arquivo, 27 fluxos agrupados de navegador e 84 combinações de layout aprovados; CI também aprovado (execução 41873395692).
- Regressão real reexecutada na origem: 424 itens, 114 linhas estruturais, 183 correspondências, 241 não encontrados e soma independente de R$ 1.990.067,18. ORSE: 8.087 insumos e 9.931 serviços.
- Na promoção: suíte completa local reexecutada no HTML final; 364 testes, incluindo proteção contra sobrescrita, e os mesmos fluxos de navegador/arquivos/layout. CI do commit publicado é registrado separadamente.

## Regras a preservar

- BDI derivado zero/negativo é aceito na regra preservada; BDI mapeado zero exclui e negativo bloqueia. Total geral zero/negativo produz os achados documentados e permite prosseguir. Estrutura e depois vazio/zero têm precedência. Não alterar essas regras silenciosamente.
- Busca começa por fonte/código, inclusive ORSE; descrição desambigua candidatos do mesmo código.
- O leitor usa valores armazenados e ignora conteúdo oculto; não recalcula fórmulas.
- As 17 colunas são selecionáveis e ordenáveis; tela, CSV, Excel e cópia respeitam os filtros e a configuração. XLSX preserva status e amarelos.
- A classe ABC usa o acumulado após incluir o item que cruza o limite. Barras por fonte usam o total do filtro como escala.
- As partes do núcleo compartilham a mesma IIFE e ordem do manifesto. Não tratá-las como módulos independentes sem refatoração e regressão próprias.

## Pendências e próximos trabalhos

1. Integrar o PR #1 à main, se ainda estiver aberto, preservando a identificação desta final.
2. Criar manual curto: preparar arquivos, mapear orçamento, conferir ocorrências, adicionar bases, comparar, interpretar, filtrar e exportar. Usar exemplos agrupados e resultados declarados, nunca gerar expectativas a partir da saída do programa.
3. Preparar tutorial opcional, reabrível e sem rede, em uma nova versão. Preservar a sessão e os dados; uma demonstração não pode substituir o trabalho existente sem fluxo explícito e reversível.
4. Completar a conferência humana dos grupos de comparação e formatos, e verificar Windows e Excel/LibreOffice. O usuário relatou orçamento e bases agrupadas funcionando, mas não identificou todas as abas, versões ou plataformas; não transformar esse relato em homologação integral.
5. Atualizar o plano mestre e produzir `HANDOFF_03_DOCUMENTACAO_DISTRIBUICAO.md` com a versão seguinte, commit, hashes, regressão e pendências reais. Licença de distribuição continua sem decisão.

A promoção para final foi autorizada; ela não aprova testes não executados. Continuar com entregas substanciais, sem pedir confirmação para escolhas rotineiras. O histórico completo e as limitações adicionais permanecem nos documentos da auditoria.
