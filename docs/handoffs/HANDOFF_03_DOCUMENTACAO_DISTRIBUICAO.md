# Handoff 03 — tutorial integrado de acompanhamento do uso

SICORP – Sistema de Comparação de Referenciais de Preços.

Desenvolvido pela Coordenação-Geral de Supervisão de Obras (CGSOB), do Departamento de Obras Hídricas e Apoio a Estudos sobre Segurança Hídrica (DOH), da Secretaria Nacional de Segurança Hídrica (SNSH).

## Objetivo definido pelo usuário

O tutorial integrado **precisa acompanhar o uso real da interface**, porque há muitas informações. O guia atual de sete páginas é uma introdução de consulta e **não conclui esse requisito**. Implementar orientações curtas próximas aos campos e botões, destaque visual e avanço conforme as ações efetivamente realizadas. Não entregar outra apresentação com páginas de texto como se fosse o acompanhamento solicitado.

Este chat prepara a continuidade; a implementação ficará para o próximo. O handoff anterior foi preservado em `archive/HANDOFF_03_GUIA_INICIAL.md` como histórico.

## Ponto de partida

| Referência | Identificação |
| --- | --- |
| Repositório | https://github.com/Mnx71/sicorp-comparador-orcamentos |
| Final na main | 4.4.0; PR #1 integrado em `93a7f510c9c61446a54cb675339c2d90f55c2ab7` |
| Arquivo final | `dist/sicorp_comparador_orcamento_v4.4.0.html` |
| SHA-256 da final | `75cabf1c665b4c356e918d94ea5dc62169b111558a35f43e6ffeb886c8d364d2` |
| Branch de desenvolvimento | `feature/manual-tutorial` |
| PR da candidata | https://github.com/Mnx71/sicorp-comparador-orcamentos/pull/2 — aberto, não integrado |
| Código do guia e manual | `635a47ecf928ed07f4b9d870de22c81c9899f6cc` |
| Ponta antes desta revisão documental | `cc75a5475849aa2158989d7f5c667c231835dcc3` |
| Candidata atual | 4.5.0-rc.1; `dist/sicorp_comparador_orcamento_v4.5.0-rc.1.html` |
| SHA-256 da candidata | `c4c1abfb8231510c97c32c04b5739ce0c77704bac11300ef73d084e59e939f11` |
| Manual | `docs/manual/MANUAL_USUARIO.md` |

Começar da ponta atual da branch, que terá este fechamento documental em commit posterior. Conferir o PR e seu CI: na preparação deste handoff, a execução `41878200904` estava em fila, sem aprovação presumida.

**Congelar a final 4.4.0 e preservar a rc.1.** Implementar inicialmente na **4.5.0-rc.2**, com manifesto, pacote, rodapé e novo nome de HTML coerentes. Não reutilizar um arquivo já entregue para outro conteúdo. A geração bloqueia sobrescrita de versões finais.

## Ler antes de implementar

1. `README.md`, `docs/PLANO_MESTRE.md`, este handoff e `docs/releases/v4.4.0.md`.
2. Manual, `docs/DECISOES_AUDITORIA.md`, `docs/REGRAS_DE_REFERENCIA.md` e `docs/ARQUITETURA_E_COMANDOS.md`.
3. `src/manifest.json`, `src/ui/tutorial.js`, `src/ui/app.js` e elementos/estilos de `src/shell.html`.
4. `testkit/agrupados/LEIA-ME.md`, `testkit/grouped-spec.mjs`, `scripts/qa-grouped-browser.mjs`, `scripts/qa-budget-layout.mjs` e evidências em `qa/evidence/tutorial-v450-rc1/`.

## Experiência exigida

- Início voluntário pelo botão Tutorial; não reintroduzir apresentação automática ao abrir o programa.
- Uma tarefa e uma orientação curta por passo, com destaque do alvo e balão próximo. Detalhes extensos ficam no manual ou em ajuda complementar.
- O usuário opera os controles reais. O guia deve permitir selecionar arquivos, preencher campos, mapear, rolar e consultar revisões durante o acompanhamento.
- Avançar após confirmar a ação válida no estado da aplicação. Em passos explicativos, permitir Próximo; nas ações necessárias, indicar o que falta, sem declarar sucesso apenas por um clique.
- Aguardar leitura/conversão e resultados efetivos. Não usar tempo fixo como condição de sucesso.
- Permitir pausar, retomar, encerrar, voltar às explicações e reiniciar sem apagar o trabalho. Voltar no tutorial não desfaz ações do programa.
- Ao iniciar em sessão já preenchida, partir da etapa compatível e permitir revisitar orientações; não exigir começar com sessão vazia.
- Fechar ou pausar remove todos os destaques e bloqueios do guia e devolve o foco adequadamente.

## Percurso mínimo acompanhado

| Momento | Orientação/alvo | Condição de avanço |
| --- | --- | --- |
| Importar orçamento | Área visível de upload | Arquivo lido e configuração disponível |
| Aba e cabeçalho | Seletores e pré-visualização; linha física | Configuração válida |
| Mapear | Campos e colunas, um vínculo por vez | Obrigatórios e pelo menos dois componentes de preço vinculados |
| Total e conferência | Total geral e Conferir e continuar | Pré-requisitos válidos e revisão aberta |
| Revisar orçamento | Categorias, linhas e explicação presentes | Usuário consulta e decide; impedimentos precisam de correção |
| Configurar bases | Arquivo, aba, fonte, cabeçalho e quatro campos | Configuração apta; ORSE tratado conforme conversão |
| Revisar base | Exclusões, conflitos e Adicionar base | Incorporação confirmada pelo usuário; respeitar conflitos |
| Comparar | Tolerância e Comparar | Resultados realmente disponíveis |
| Interpretar | Status, amarelos e Não encontrado | Explicação contextual, sem inventar ocorrências ausentes |
| Organizar | Filtros, ABC e seleção/ordem de colunas | Uso pelo usuário; orientações opcionais podem ser puladas |
| Exportar e concluir | Excel, CSV ou cópia à escolha | Ação voluntária; não disparar download ou cópia automaticamente |

Não é obrigatório manter onze passos: subdividir para reduzir a carga de informação. Conferir os IDs atuais: `projectHeaderRow`, `projectGeneralTotal`, `projectMappingFieldPool`, `projectNextBtn`, `baseReviewBtn`, `addBaseBtn`, `compareBtn`, `resultColumnsDialog`, `exportXlsxBtn`. Destacar controles visíveis usados pelo usuário, não inputs ocultos.

## Sessão, erros e recuperação

Manter o progresso do tutorial separado do estado do programa. Não limpar/substituir arquivos, remapear campos, alterar totais/tolerância/bases/filtros/colunas, confirmar revisões, comparar ou exportar em nome do usuário. Ações voluntárias do usuário ao seguir o guia são esperadas e precisam ser distinguidas das ações do controlador.

Se o usuário trocar arquivo, aba ou cabeçalho, remover base, retornar uma etapa ou corrigir um erro, recalcular a orientação pelo estado real e invalidar o progresso dependente quando necessário. Nunca apontar para alvo inexistente ou invisível, nem fazer do tutorial um novo impedimento da análise. Se o alvo não puder ser apresentado, permitir recuperação e uso normal.

Não carregar demonstração sobre a sessão atual. A primeira implementação deve acompanhar os arquivos escolhidos pelo usuário. Uma eventual demonstração futura exige sessão isolada e início explícito. Salvar progresso do tutorial não equivale a salvar arquivos/resultados; não prometer recuperação de dados que o programa não oferece.

## Integração visual e acessibilidade

Reposicionar destaque e balão ao rolar, redimensionar ou alterar o conteúdo. Manter campos, ações, mensagens de erro e barras de rolagem acessíveis em telas estreitas e com zoom.

As revisões usam diálogos nativos na camada superior do navegador. Orientações dentro deles precisam de contexto compatível: um overlay comum no body pode ficar atrás do diálogo. Verificar revisões e seletor de colunas expressamente.

Não bloquear os alvos nem prender o foco apenas no balão. Permitir teclado, Tab/Shift+Tab, anúncio da instrução e foco visível. Definir Escape para encerrar o tutorial sem fechar indevidamente a revisão em uso. Funcionar sem rede no HTML único e preservar avisos/licenças existentes.

## Critérios de aceitação e testes

1. Percorrer o fluxo completo com ações reais e verificar as condições de avanço, além dos textos.
2. Iniciar/pausar/retomar/fechar/reiniciar em sessões preenchidas e com resultados, comprovando que o tutorial não altera dados por conta própria.
3. Testar arquivo inválido, pré-requisito ausente, impedimento, retorno para corrigir, base sem referências e conflitos; manter recuperação e bloqueios do programa.
4. Testar troca de arquivo/aba/cabeçalho e remoção de base no meio do percurso, inclusive durante leitura assíncrona. Não usar informação antiga.
5. Testar diálogos, rolagem nos dois eixos, redimensionamento, zoom, teclado, Escape e retorno de foco.
6. Confirmar ausência de abertura automática, requisições de rede e erros de página. Atualizar manual e textos contextuais juntos.
7. Executar `npm run check` no novo HTML e as novas verificações de acompanhamento. Registrar versão, commit, hash, esperado/observado e evidências. Preservar o hash da final 4.4.0 e não mudar regras para facilitar o tutorial.

A rc.1 passou localmente por 364 testes, 103 fluxos originais e 27 agrupados de navegador, 27 casos agrupados de arquivo e 84 combinações de layout. O guia de consulta percorreu 21 páginas em três tamanhos, preservando estado e armazenamento local. Isso comprova o guia existente, **não o acompanhamento a desenvolver**. Não atribuir esses resultados à rc.2. A regressão real não foi repetida nessa etapa de interface; a origem aprovada registra 424 itens e R$ 1.990.067,18 por cálculo independente.

## Entrega do próximo chat

Implementar o acompanhamento na nova candidata, atualizar manual, testes e evidências e produzir `HANDOFF_04_DOCUMENTACAO_DISTRIBUICAO.md` com versão, commit, hash, resultados e pendências. Atualizar o plano mestre e a descrição do PR. Não promover a candidata nem integrar o PR #2 apenas porque o guia de texto passou nos testes anteriores.

Homologação humana completa, Windows, Excel/LibreOffice e escolha de licença continuam pendentes. Não transformar o relato parcial de funcionamento do kit em aprovação integral. Trabalhar com entregas substanciais e sem pedir confirmação para escolhas rotineiras.
