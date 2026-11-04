# Plano mestre: auditoria, tutorial e documentação

SICORP – Sistema de Comparação de Referenciais de Preços.

Desenvolvido pela Coordenação-Geral de Supervisão de Obras (CGSOB), do Departamento de Obras Hídricas e Apoio a Estudos sobre Segurança Hídrica (DOH), da Secretaria Nacional de Segurança Hídrica (SNSH).

## Estado atual — 04/11/2026

**Versão final 4.4.0**, promovida por solicitação expressa do responsável. Distribuir `dist/sicorp_comparador_orcamento_v4.4.0.html`. Registro: `releases/v4.4.0.md`. Commit da promoção: `c2ab5dc6af2f02e6a704bfd9d2de15b080a1d933`. Origem funcional testada: `d1ea4f92087b07c899f5e826408aa7e2c01a4175`.

A promoção altera apenas o número da versão no rodapé e os metadados de geração. O HTML anterior foi preservado. Qualquer mudança futura do programa exige novo número e outro arquivo; a versão final não deve ser sobrescrita. A aprovação da versão não equivale a concluir verificações manuais que não foram executadas.

| Entrega | Estado atual |
| --- | --- |
| Baseline rc.16 e pacote histórico | Preservados |
| Fontes e geração reproduzível | Concluídos; final 4.4.0 identificada por hash |
| Auditoria e correções | Concluídas no escopo automatizado documentado |
| Kit de testes | 114 cenários, arquivos agrupados e contraprovas preservados |
| Testes da promoção | 364 testes, 130 fluxos de navegador, 27 casos agrupados de arquivo e 84 combinações de layout aprovados localmente |
| Regressão real da origem aprovada | 424 itens e R$ 1.990.067,18, com cálculo decimal independente |
| Validação manual | Usuário relatou orçamento e bases agrupadas funcionando; homologação integral pendente |
| Windows e inspeção no Excel/LibreOffice | Verificação complementar pendente |
| Manual do usuário e tutorial | Próxima etapa |
| Integração na main e licença | Pendentes |

As etapas 1 a 3 foram concluídas no escopo automatizado documentado. A finalização da versão foi autorizada antes do manual e tutorial; as restrições de promoção das candidatas ficam superadas por essa decisão. A inclusão posterior de tutorial no HTML deverá usar uma nova versão. O handoff vigente é `handoffs/HANDOFF_02_TUTORIAL_MANUAL.md`.

A sequência abaixo conserva o planejamento e o histórico. As situações datadas das candidatas descrevem aquelas execuções, não substituem o estado atual acima.

## Etapas e critérios de aceitação

### Complemento de 02/11/2026: homologação por grupos

O percurso principal passa a ser `testkit/agrupados/LEIA-ME.md`: três XLSX, 15 abas (7 orçamento, 3 base, 5 comparação, incluindo duas fontes). Os 114 IDs possuem rastreabilidade em `cobertura.csv`; casos compatíveis compartilham a mesma conferência. Parâmetros globais são reconfigurados na mesma aba. As separações restantes decorrem de conflitos documentados. Os arquivos individuais e as evidências da auditoria original permanecem preservados.

Nenhuma regra ou código da aplicação mudou. A versão e o SHA do HTML permanecem os da rc.17. A homologação por pessoa continua pendente; `testkit/agrupados/execucao-manual.csv` inicia sem aprovação. Geradores e novas verificações de arquivos/HTML são parte da suíte; evidências deste complemento ficam em `qa/evidence/grouped/`.

Execução do complemento: `npm run check` aprovado com 363 testes, 103 verificações originais no navegador, 27 execuções agrupadas de arquivo e 27 verificações agrupadas no HTML. Relatório: `COMPLEMENTO_KIT_AGRUPADO.md`.

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
- Agrupar casos compatíveis na mesma aba. Separar impedimentos quando a soma incompleta ocultar o fechamento, fórmulas quando a proporção global mudar o aviso, ausência de itens e conflitos de base. Reutilizar a mesma aba para parâmetros globais e documentar cada configuração.
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
