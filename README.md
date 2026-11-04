# SICORP – Sistema de Comparação de Referenciais de Preços

Aplicação offline para conferir cálculos de orçamentos de obras e comparar preços sem BDI com bases referenciais.

**Desenvolvido pela Coordenação-Geral de Supervisão de Obras (CGSOB), do Departamento de Obras Hídricas e Apoio a Estudos sobre Segurança Hídrica (DOH), da Secretaria Nacional de Segurança Hídrica (SNSH).**

A candidata atual é **v4.4.0-rc.19**. O HTML está em [dist/](dist/sicorp_comparador_orcamento_v4.4.0-rc.19.html), com hash em [SHA256SUMS.txt](dist/SHA256SUMS.txt). Baixar e abrir o arquivo no navegador; o uso do programa não requer Node.js ou servidor. A versão continua beta, sujeita à conferência pelo analista. Não foi promovida a versão final.

A rc.19 amplia a revisão do orçamento para toda a tela e move versão e autoria para um rodapé discreto, retirando “Offline” do cabeçalho. Ver [ajustes da interface](docs/AJUSTES_INTERFACE_RC19.md).

A rc.18 corrige o recorte da revisão do orçamento em telas menores, preserva o espaço da explicação e remove o botão superior “Fechar”. Ver [correção e evidências](docs/CORRECAO_REVISAO_RC18.md). O HTML da rc.17 permanece em `dist/`; os três XLSX agrupados continuam válidos.

A rc.16 e o pacote histórico da v4.3 permanecem intactos em `baseline/` e `reference/`. A extração inicial reproduziu a rc.16 byte a byte. A rc.17 contém os fontes separados, geração determinística, quatro correções documentadas e o kit sintético de auditoria.

## Entregas

| Local | Conteúdo |
| --- | --- |
| [Plano mestre](docs/PLANO_MESTRE.md) | Situação real e critérios das próximas etapas |
| [Arquitetura e comandos](docs/ARQUITETURA_E_COMANDOS.md) | Composição dos fontes, geração e execução |
| [Matriz](docs/MATRIZ_AUDITORIA.md) | 114 casos, dados, mapeamentos, expectativas e contraprovas |
| [Testes agrupados — começar aqui](testkit/agrupados/LEIA-ME.md) | Casos simultâneos por aba, três XLSX e rastreabilidade dos 114 IDs |
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

`npm test` executa os testes de domínio, leitores, integração e exportação, incluindo os agrupados. `npm run qa:browser` exercita o HTML efetivo com rede desabilitada. `npm run audit:grouped` e `npm run qa:grouped` verificam os novos arquivos e seu uso na interface. `npm run qa:layout` verifica a revisão do orçamento em sete tamanhos de tela. Todos estão em `npm run check`. O workflow de Actions roda em push/PR, sem cron ou publicação. `SICORP_CHROMIUM_PATH` permite usar um executável local de Chromium/Chrome/Edge.

`npm run fixtures:build` regenera os exemplos individuais no ambiente de autoria com Artifact Tool. `npm run fixtures:grouped` gera o percurso principal de testes agrupados e seu roteiro. `npm run regression:real` utiliza os arquivos reais do projeto, quando presentes; eles não fazem parte do repositório. Ausência de arquivo produz falha explícita.

Os relatórios distinguem resultado automatizado, observação do código e homologação por pessoa. A validação manual por pessoa, a conferência visual em Excel/LibreOffice e a execução no Windows permanecem pendentes. O tutorial será desenvolvido na próxima etapa, seguido de nova regressão. A escolha da licença do projeto continua separada.
