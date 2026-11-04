# Complemento do kit de auditoria — 02/11/2026

SICORP – Sistema de Comparação de Referenciais de Preços.

Desenvolvido pela Coordenação-Geral de Supervisão de Obras (CGSOB), do Departamento de Obras Hídricas e Apoio a Estudos sobre Segurança Hídrica (DOH), da Secretaria Nacional de Segurança Hídrica (SNSH).

## Alteração solicitada

O kit inicial distribuía os 114 cenários em 129 abas, exigindo muitas seleções e conferências. O percurso principal agora é [testkit/agrupados/LEIA-ME.md](../testkit/agrupados/LEIA-ME.md). Os casos individuais permanecem para diagnóstico e regressão.

Três novos XLSX reúnem os casos compatíveis em 15 abas: sete de orçamento, três de base e cinco no arquivo de comparação, das quais duas são bases por fonte. A revisão principal contém 92 itens, 7 erros, 33 avisos e 18 linhas desconsideradas. A aba seguinte reúne os 20 impedimentos por campo. A comparação principal contém os 15 cenários em 19 linhas: 2 Abaixo, 9 Iguais, 2 Acima, 6 Não encontrados. Uma revisão de base reúne 11 exclusões de todos os tipos exercitados.

As separações restantes têm efeito observável: soma incompleta suprime fechamento, predominância de fórmulas depende da coluna inteira, Nenhum item exige ausência de itens, ocultação obrigatória impede mapeamento, derivação depende de coluna não mapeada, conflitos impedem comparar e ABC depende do total global. Parâmetros globais são reexecutados na mesma aba. As razões e as configurações completas estão no roteiro.

## Rastreabilidade e contraprovas

- `testkit/grouped-spec.mjs` declara grupos, linhas, parâmetros e expectativas sem importar o SICORP. Os prefixos T… isolam códigos e descrições entre cenários, conservando as igualdades internas. `CMP-FLUXO` conserva 0001 e 002.0 como texto.
- `testkit/agrupados/cobertura.csv` localiza os 114 IDs e suas reexecuções. O roteiro contém resultados por grupo e localização física de cada bloco. Algumas consequências globais mudam legitimamente no agrupamento: excluir uma linha não produz Nenhum item quando outras são válidas. A aba 04_Sem_itens conserva essa contraprova.
- As fórmulas são deslocadas para as linhas físicas novas. Caches, erros e ocultação intencionais são inseridos em OOXML após autoria com Artifact Tool, sem planilhas reais. Os arquivos devem entrar no SICORP sem recálculo externo.
- `testkit/agrupados/execucao-manual.csv` começa em Não executado. Nenhuma aprovação humana foi presumida.

CSV/TXT, BIFF5/BIFF8 e ORSE continuam como arquivos separados no kit original. Um XLSX não exercita esses leitores. O roteiro agrupado indica esse complemento de formato.

## Verificação

As novas verificações leem os XLSX efetivamente salvos, comparam listas exatas de achados e classificações, conferem vínculos de achados às linhas de cada cenário, ausência de contaminação nas contraprovas, zeros/sufixos textuais e cobertura de IDs. As comparações são novamente importadas pela interface do HTML distribuído; os testes também exercitam bases bloqueantes, todos os motivos de exclusão, remapeamentos, totais e fronteiras ABC.

Comandos: `npm run fixtures:grouped` para autoria, `npm run audit:grouped` para 27 execuções de arquivo, `npm run qa:grouped` para 27 verificações de interface. `npm test` incorpora 31 novas verificações, além das 332 anteriores. O comando `npm run check` inclui as duas rotinas agrupadas e a suíte de navegador original. Resultados desta execução e hashes das entradas ficam em `qa/evidence/grouped/`.

Aplicação preservada: v4.4.0-rc.17, código de `90d447e32e000389ae2158c6b2260a31543b1b7b`, HTML SHA-256 `7a275c849c2508ba64369a89e3470ecb863919f449836a98e6817f1fa73ff50b`. O complemento parte de `8a57bdc8023cd041a4225b85490e8aa283bc8921` e acrescenta kit, verificações e documentação. Baseline, fontes, HTML e evidências originais permanecem intactos. Não houve nova correção nem mudança de regra de negócio.

Resultado executado: `npm run check` aprovado, **363 testes**, **103 verificações originais no navegador**, **27 execuções agrupadas de arquivo** e **27 verificações agrupadas no HTML**. Zero falhas, erros de página ou requisições HTTP. Ambiente local: Linux, Node.js 24.22.1, Playwright 1.62.1 e Chromium 141.0.7390.0. O log está em `qa/evidence/grouped/check.log`; relatórios em `cases-report.json`, `browser-report.json` e `regression-browser/report.json`. As evidências da execução original de outubro não foram substituídas. O relatório de regressão desta execução identifica a base Git e as alterações do kit como árvore de trabalho, sem declarar falsamente código limpo; a aplicação não foi alterada e o manifesto de execução registra os hashes dos arquivos do complemento.

Excel/LibreOffice, Windows e homologação por pessoa permanecem pendentes. A regressão com planilhas reais não foi repetida neste complemento, que não altera o motor nem o HTML. O tutorial segue na etapa seguinte.
