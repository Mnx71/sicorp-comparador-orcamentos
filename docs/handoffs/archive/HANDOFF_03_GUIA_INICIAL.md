# Handoff 03 — documentação e distribuição

SICORP – Sistema de Comparação de Referenciais de Preços.

Desenvolvido pela Coordenação-Geral de Supervisão de Obras (CGSOB), do Departamento de Obras Hídricas e Apoio a Estudos sobre Segurança Hídrica (DOH), da Secretaria Nacional de Segurança Hídrica (SNSH).

## Saída da etapa

- PR #1 integrado à main em `93a7f510c9c61446a54cb675339c2d90f55c2ab7`.
- Final preservada: `dist/sicorp_comparador_orcamento_v4.4.0.html`, SHA-256 `75cabf1c665b4c356e918d94ea5dc62169b111558a35f43e6ffeb886c8d364d2`.
- Branch: `feature/manual-tutorial`, PR #2.
- Commit de saída do código e manual: `635a47ecf928ed07f4b9d870de22c81c9899f6cc`.
- Candidata: **4.5.0-rc.1**, `dist/sicorp_comparador_orcamento_v4.5.0-rc.1.html`, SHA-256 `c4c1abfb8231510c97c32c04b5739ce0c77704bac11300ef73d084e59e939f11`.
- Manual: `docs/manual/MANUAL_USUARIO.md`. O botão Tutorial pertence somente à candidata; o fluxo restante também descreve a final.

O tutorial apresenta sete etapas, aberto voluntariamente pelo botão Tutorial. Inclui Anterior/Próximo, conclusão, fechamento, Escape e reabertura. Não aparece automaticamente nem preenche campos, muda páginas do assistente, carrega exemplos ou substitui a sessão. A prática com o kit é feita manualmente em outra aba.

## Validação executada

`npm run check` aprovado no HTML final da candidata: integridade, geração/paridade, 364 testes, 103 fluxos originais e 27 agrupados de navegador, 27 casos agrupados de arquivo e 84 combinações de layout. O tutorial foi percorrido em 1600×1000, 390×844 e 320×568: 21 etapas, com voltar, concluir, fechar, Escape, foco de retorno e reinício ao reabrir. Estado completo da aplicação e armazenamento local comparados antes e depois: preservados. Sem erros de página ou requisições HTTP. Evidências: `qa/evidence/tutorial-v450-rc1/`.

O núcleo e as regras não foram alterados. A regressão real não foi repetida nesta etapa de interface; a origem final aprovada registra 424 itens e R$ 1.990.067,18 por cálculo independente. O workflow registra separadamente o CI do PR; não presumir aprovação antes da conclusão.

## Próximas ações

1. Revisar manual e tutorial por pessoa. Registrar resultados em `testkit/agrupados/execucao-manual.csv` sem aprovar testes não executados.
2. Completar comparação, exportações e formatos no Windows; conferir XLSX no Excel/LibreOffice. Essa verificação direta não foi executada no ambiente Linux. O relato do usuário sobre orçamento e bases não equivale à homologação de todos os casos.
3. Consolidar documentação técnica e pacote de distribuição, preservando hashes, fontes e avisos de terceiros. A escolha de licença continua pendente.
4. Após aceitar a candidata, decidir a promoção da próxima final. A v4.4.0 está congelada; nunca substituir seu arquivo pelo HTML com tutorial.
5. Preservar os comportamentos de BDI derivado, exclusões, busca fonte/código e ABC documentados em `docs/DECISOES_AUDITORIA.md`.

Manual e tutorial estão implementados e testados no escopo acima. A homologação humana completa e Windows/Excel/LibreOffice permanecem pendentes. Documentos e evidências anteriores foram preservados.
