# Plano mestre: auditoria, tutorial e documentação

SICORP – Sistema de Comparação de Referenciais de Preços.

Desenvolvido pela Coordenação-Geral de Supervisão de Obras (CGSOB), do Departamento de Obras Hídricas e Apoio a Estudos sobre Segurança Hídrica (DOH), da Secretaria Nacional de Segurança Hídrica (SNSH).

Referência inicial: `v4.4.0-rc.16`. Saída da auditoria: `v4.4.0-rc.17`. Data: 28/10/2026. Commit e evidências: `handoffs/HANDOFF_02_TUTORIAL_MANUAL.md` e `RELATORIO_AUDITORIA_RC17.md`.

## Objetivo

Entregar uma versão verificável do SICORP, acompanhada de fontes reproduzíveis, testes automatizados, planilhas de exemplo, resultados esperados, roteiro de validação manual, manual objetivo e tutorial guiado embutido.

A rc.16 é uma candidata preservada. Sua aprovação depende da auditoria; se houver correções, a versão aprovada será a revisão corrigida. O tutorial exigirá nova regressão antes da distribuição final.

## Situação após a auditoria

| Entrega | Situação |
| --- | --- |
| HTML da rc.16 e pacote histórico da v4.3 | Preservados, com integridade registrada |
| Fontes atuais separados e geração reproduzível | Concluídos; extração com paridade e geração rc.17 |
| Matriz das regras e casos | 114 casos, contraprovas e lacunas explícitas |
| Testes automatizados atualizados | 332 testes executados; navegador e regressão real registrados |
| Kit manual e contraprovas | Produzidos; execução por pessoa pendente |
| Auditoria e relatório | Automação concluída, quatro defeitos corrigidos; limitações documentadas |
| Manual do usuário | Pendente |
| Tutorial guiado | Pendente |
| Documentação técnica final e distribuição | Pendentes |

Etapas 1 e 2 concluídas. Etapa 3 concluída no escopo automatizado documentado. A homologação por pessoa, o Excel/LibreOffice e os navegadores Windows não foram executados. O tutorial e o manual podem ser preparados a partir da saída, sem promover versão final nem converter essas pendências em aprovações. Os três pontos de regra controversa foram caracterizados e preservados em `DECISOES_AUDITORIA.md`.

## Etapas e critérios de aceitação

### 1. Consolidar a versão de referência

- Conferir `baseline/manifest.json` e executar `npm run validate:baseline`.
- Inspecionar o HTML atual e o material histórico. Extrair a v4.3 em pasta separada para reaproveitar os módulos e testes compatíveis.
- Reconstruir os fontes da candidata e um processo de geração que reproduza o comportamento do HTML preservado. Comparar o artefato gerado com a candidata; diferenças de empacotamento precisam ser explicadas e verificadas.
- Manter a baseline imutável. Não substituir o HTML atual pelo resultado da geração antiga.
- Consolidar uma matriz de regras por domínio: leitura, orçamento, bases, comparação, interface e exportação.

Aceitação: comandos documentados e executáveis; fontes atuais identificados; diferenças em relação à candidata registradas; nenhuma funcionalidade perdida na consolidação.

### 2. Preparar o kit de auditoria

- Criar casos com identificadores estáveis e resultados esperados definidos independentemente do SICORP.
- Produzir tabelas e arquivos sintéticos pequenos para cada aviso, erro de cálculo, impedimento, exclusão e resultado da comparação.
- Incluir casos normais, limites, falsos positivos e combinações de problemas.
- Separar cenários bloqueantes para que um impedimento não impeça a execução dos demais testes manuais.
- Vincular regra, caso, arquivo, execução e evidência. Seguir `VALIDACAO_MANUAL.md`.

Aceitação: cada comportamento possui caso reproduzível ou lacuna explícita; arquivos, mapeamentos, valores esperados e consequências estão descritos; nenhuma expectativa é copiada automaticamente da saída do programa.

### 3. Executar, corrigir e registrar

- Executar testes de domínio, leitores, integração, interface, exportações e distribuição offline.
- Reaproveitar a estrutura histórica sem transportar expectativas incompatíveis.
- Usar dados pequenos na suíte rápida; planilhas reais em regressões e desempenho. Resultados históricos de 424 itens e 114 linhas desconsideradas são referências de contagem, não prova suficiente de correção.
- Para cada defeito confirmado, registrar reprodução, correção e teste que proteja contra regressão.
- Distinguir defeito de implementação, mudança de requisito e limitação conhecida. Não alterar regras controversas silenciosamente.
- Produzir relatório por execução: versão/commit, ambiente, data, casos, esperado, observado, evidências e pendências.
- Após estabilizar os comandos, configurar um único workflow simples de Actions para testes e validação do HTML. Sem execução diária ou publicação automática nesta etapa.

Aceitação: casos obrigatórios aprovados; divergências explicadas; pendências relevantes resolvidas ou submetidas à decisão; evidências ligadas ao código efetivamente testado. O HTML distribuído deve ser testado, não apenas funções isoladas.

### 4. Tutorial e manual do usuário

- Produzir manual curto e objetivo: preparar arquivos, mapear orçamento, conferir, adicionar bases, comparar, interpretar e exportar.
- Explicar categorias, destaques, exclusões, ocultação e dificuldades frequentes.
- Implementar tutorial guiado offline, opcional e reabrível, coerente com o manual.
- Se houver demonstração, usar exemplos sintéticos e um fluxo que preserve a sessão de trabalho do usuário.
- Verificar teclado, rolagem, foco, diálogos, seleção/ordenação de colunas e persistência no navegador.

Aceitação: usuário consegue concluir o fluxo seguindo as orientações; tutorial não prejudica o uso normal; regressão após a integração aprovada.

### 5. Documentação final e distribuição

- Consolidar manual, regras aprovadas, arquitetura, comandos de desenvolvimento, execução dos testes, registro de alterações e limitações.
- Preparar HTML, fontes, kit manual e relatório associados à mesma versão e a um commit exato.
- Registrar hashes dos arquivos de distribuição e versões das dependências relevantes.
- Preservar avisos/licenças de terceiros. A escolha da licença do projeto é uma decisão separada.
- Promover a versão candidata somente após a aceitação das etapas aplicáveis; não apresentar o estado inicial como homologação concluída.

Aceitação: pacote reproduzível, documentação consistente com o comportamento testado e instruções suficientes para repetir as validações.

## Organização dos chats

| Chat | Escopo | Saída para o próximo |
| --- | --- | --- |
| 1 | Consolidação, kit de testes, auditoria, correções e evidências | Versão validada e `HANDOFF_02_TUTORIAL_MANUAL.md` |
| 2 | Tutorial embutido, manual objetivo e regressão | HTML atualizado e `HANDOFF_03_DOCUMENTACAO_DISTRIBUICAO.md` |
| 3 | Documentação técnica final, evidências organizadas e distribuição | Pacote final e continuidade para manutenção |

Este documento é a referência mestre. Os handoffs são sequenciais: cada chat escreve sua saída com o estado real alcançado, sem presumir que tarefas futuras já terminaram. Se um chat precisar continuar em outro antes de concluir sua etapa, ele entrega um checkpoint com a mesma disciplina.

## Conteúdo obrigatório de cada handoff

1. Repositório, branch, commit de partida e commit de saída.
2. Versão do HTML e caminho dos arquivos relevantes.
3. O que foi concluído, alterado e preservado.
4. Comandos executados, resultados e evidências; o que não pôde ser verificado.
5. Decisões aprovadas, pendências e problemas conhecidos.
6. Próximas ações e critérios de aceitação.

## Publicação de exemplos

O kit público utiliza dados sintéticos e explicações técnicas. Planilhas reais usadas na análise não entram automaticamente no repositório; sua eventual inclusão deve ser decidida separadamente. A autoria institucional completa consta no início deste documento.
