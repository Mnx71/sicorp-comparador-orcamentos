# SICORP – Sistema de Comparação de Referenciais de Preços

Aplicação offline para conferir cálculos de orçamentos de obras e comparar preços sem BDI com bases referenciais.

**Desenvolvido pela Coordenação-Geral de Supervisão de Obras (CGSOB), do Departamento de Obras Hídricas e Apoio a Estudos sobre Segurança Hídrica (DOH), da Secretaria Nacional de Segurança Hídrica (SNSH).**

A candidata de saída desta auditoria é **v4.4.0-rc.17**. O HTML está em [dist/](dist/sicorp_comparador_orcamento_v4.4.0-rc.17.html), com hash em [SHA256SUMS.txt](dist/SHA256SUMS.txt). Baixar e abrir o arquivo no navegador; o uso do programa não requer Node.js ou servidor. A versão continua beta, sujeita à conferência pelo analista. Não foi promovida a versão final.

A rc.16 e o pacote histórico da v4.3 permanecem intactos em `baseline/` e `reference/`. A extração inicial reproduziu a rc.16 byte a byte. A rc.17 contém os fontes separados, geração determinística, quatro correções documentadas e o kit sintético de auditoria.

## Entregas

| Local | Conteúdo |
| --- | --- |
| [Plano mestre](docs/PLANO_MESTRE.md) | Situação real e critérios das próximas etapas |
| [Arquitetura e comandos](docs/ARQUITETURA_E_COMANDOS.md) | Composição dos fontes, geração e execução |
| [Matriz](docs/MATRIZ_AUDITORIA.md) | 114 casos, dados, mapeamentos, expectativas e contraprovas |
| [Roteiro independente](testkit/ROTEIRO_VALIDACAO.md) | Passos e valores esperados para execução manual |
| [Kit sintético](testkit/fixtures/) | XLSX, BIFF5/BIFF8, CSV, TXT e ORSE |
| [Decisões e defeitos](docs/DECISOES_AUDITORIA.md) | Correções, regras preservadas e lacunas explícitas |
| [Relatório](docs/RELATORIO_AUDITORIA_RC17.md) | Resultados e vínculo ao código testado |
| [Handoff 02](docs/handoffs/HANDOFF_02_TUTORIAL_MANUAL.md) | Entrada da etapa de tutorial e manual |

## Desenvolvimento

Com Node.js 20 ou superior:

```bash
npm ci
npm run build
npx playwright install --with-deps chromium
npm run check
npm run audit:cases
```

`npm run build` produz um único HTML a partir de `src/`, sem usar o build histórico. `npm run validate` falha se o HTML distribuído divergir dos fontes. `npm run validate:baseline` verifica integridade e sintaxe dos arquivos preservados, sem constituir auditoria funcional.

`npm test` executa 332 testes de domínio, leitores, integração e exportação. `npm run qa:browser` exercita o HTML efetivo com rede desabilitada. O workflow de Actions roda em push/PR, sem cron ou publicação. `SICORP_CHROMIUM_PATH` permite usar um executável local de Chromium/Chrome/Edge.

`npm run fixtures:build` regenera os exemplos no ambiente de autoria com Artifact Tool. `npm run regression:real` utiliza os arquivos reais do projeto, quando presentes; eles não fazem parte do repositório. Ausência de arquivo produz falha explícita.

Os relatórios distinguem resultado automatizado, observação do código e homologação por pessoa. A validação manual por pessoa, a conferência visual em Excel/LibreOffice e a execução no Windows permanecem pendentes. O tutorial será desenvolvido na próxima etapa, seguido de nova regressão. A escolha da licença do projeto continua separada.
