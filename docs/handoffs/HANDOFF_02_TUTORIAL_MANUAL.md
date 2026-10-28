# Handoff 02 — tutorial e manual do SICORP

SICORP – Sistema de Comparação de Referenciais de Preços.

Desenvolvido pela Coordenação-Geral de Supervisão de Obras (CGSOB), do Departamento de Obras Hídricas e Apoio a Estudos sobre Segurança Hídrica (DOH), da Secretaria Nacional de Segurança Hídrica (SNSH).

## Ponto de continuidade

- Repositório: https://github.com/Mnx71/sicorp-comparador-orcamentos.
- Branch: `audit/consolidacao-rc17`.
- Main de partida: `a519fc49b78ea06fe37ac4f13c3555e143651c52`.
- **Commit de saída do código/HTML validado: `90d447e32e000389ae2158c6b2260a31543b1b7b`.**
- Árvore do código testado: `b7f4be6f572e8c8eaa8ee793145ca19647b1bc98`.
- Versão: **v4.4.0-rc.17**, candidata, sem tutorial, não promovida a final.
- HTML: `dist/sicorp_comparador_orcamento_v4.4.0-rc.17.html`.
- SHA-256: `7a275c849c2508ba64369a89e3470ecb863919f449836a98e6817f1fa73ff50b`.

Este documento e as evidências entram em commit de fechamento posterior, sem mudar o código da aplicação/HTML do commit validado. Começar da ponta atual da branch, conservar esse vínculo e registrar o novo SHA antes de implementar o tutorial. Se houver merge posterior na main, verificar o commit que incorporou a branch e possíveis mudanças concorrentes. Não regenerar a versão a partir do pacote da v4.3.

## Ler antes de alterar

1. `README.md` e `docs/PLANO_MESTRE.md`.
2. `docs/RELATORIO_AUDITORIA_RC17.md`.
3. `docs/DECISOES_AUDITORIA.md`, inclusive os três pontos de requisito preservados.
4. `docs/ARQUITETURA_E_COMANDOS.md`.
5. `testkit/ROTEIRO_VALIDACAO.md`, `docs/MATRIZ_AUDITORIA.md` e `testkit/cases.json`.
6. `src/manifest.json`, que define a ordem de montagem.

## Entregas concluídas

- Fontes extraídos diretamente da rc.16 e geração de HTML único. A extração inicial teve paridade byte a byte. Os fontes foram separados por responsabilidade sem isolar/reordenar funções auxiliares do script clássico.
- Baseline rc.16 e ZIP histórico preservados integralmente.
- Quatro defeitos confirmados corrigidos e protegidos por regressões: limite de comparação, fórmula sem cache, alerta oculto e arredondamento monetário.
- 114 cenários sintéticos com IDs estáveis, dados originais, configuração, resultados esperados e contraprovas. Três XLSX, BIFF5/BIFF8 reais, CSV/TXT e ORSE sintético. Arquivos reais do projeto ficaram fora do repositório.
- Roteiro de validação independente e formulário de execução humana sem aprovação pré-preenchida.
- 332 testes aprovados, 114 cenários de arquivo aprovados e 103 verificações no navegador aprovadas.
- Exportações sintéticas, capturas, logs e JSON em `qa/evidence/`, ligados ao commit validado.
- Operação do HTML distribuído sem rede; zero erros de página e requisições HTTP. Persistência verificada ao reabrir a aba e após reiniciar Chromium com o mesmo perfil; falhas de localStorage exercitadas.
- Regressão real: 424 itens, 114 linhas estruturais desconsideradas; três bases configuradas com 183 iguais e 241 Não encontrados; soma independente R$ 1.990.067,18; ORSE real com 8.087 insumos e 9.931 serviços.
- Workflow único em push/PR, sem cron nem publicação automática. [Execução no commit validado](https://github.com/Mnx71/sicorp-comparador-orcamentos/actions/runs/40755242430) concluída com sucesso.

## Comandos executados

```bash
npm run validate:baseline
npm run validate
npm test
npm run audit:cases
npm run regression:real
npm run qa:browser
```

`npm run check` executa integridade, paridade/sintaxe, testes e navegador. O desenvolvimento local pode definir `SICORP_CHROMIUM_PATH` com um executável existente. A evidência local usou Node.js 24.22.1, Playwright 1.62.1 e Chromium 141.0.7390.0 em Linux. O CI aprovado usou Node 22 e Chrome for Testing 151.0.7922.34.

O gerador de XLSX requer o runtime de autoria Artifact Tool; os fixtures versionados bastam para executar a suíte. A regressão real requer as entradas externas e falha explicitamente se ausentes. As contagens e os cálculos foram reexecutados; números históricos não foram usados como aprovação automática.

## Regras a preservar na etapa de tutorial

- BDI derivado zero/negativo é aceito pela candidata, embora BDI mapeado zero exclua e negativo bloqueie. Total geral zero/negativo gera aviso e erro de fechamento; vazio/inválido bloqueia. Identidade estrutural e depois vazio/zero têm precedência sobre outros problemas. Essas assimetrias foram documentadas e não alteradas silenciosamente.
- Busca sempre parte de fonte/código. Descrição resolve múltiplos candidatos; ORSE segue essa regra. Não introduzir busca direta global por descrição.
- O SICORP usa resultados armazenados de fórmulas e ignora o conteúdo oculto. Não recalcula a pasta de trabalho.
- As 17 colunas são selecionáveis e ordenáveis. Tela, Excel, CSV e cópia respeitam seleção/ordem/filtros. Zero colunas é proibido. O XLSX conserva status e destaques amarelos.
- O item que cruza o limite ABC pertence à faixa do acumulado após inclusão. As barras por fonte usam o total do filtro ABC como escala.
- Em `src/core/`, os arquivos `.part.js` compartilham a mesma IIFE e a ordem do manifesto. Não tratá-los como ES modules independentes sem refatoração e regressão próprias.

## Pendências reais

Não foram executadas homologação por pessoa, inspeção no Excel/LibreOffice nem Chrome/Edge no Windows. O roteiro e `testkit/execucao-manual.csv` estão prontos para essas verificações. Há lacunas de combinações adicionais de mesclas/ocultação e BIFF de outros produtores. Nem todos os links externos do catálogo foram visitados. Ver a lista completa em `DECISOES_AUDITORIA.md`.

Os três pontos de regra controversa permanecem decisões de requisito para o responsável. A caracterização atual pode ser explicada no manual, sem inventar aprovação de mudança. Uma alteração futura precisa de reprodução, impacto e novo esperado. A versão continua beta. Licença e promoção final não foram decididas.

## Próximo escopo

1. Criar manual curto e objetivo para preparar arquivos, mapear, conferir, adicionar bases, comparar, interpretar, filtrar e exportar. Explicar categorias, ocultação, amarelos e casos difíceis com os exemplos sintéticos.
2. Implementar tutorial offline, opcional, reabrível e coerente com o comportamento validado. Preservar os dados e a sessão do usuário. Não carregar demonstração por cima do trabalho existente sem um fluxo explícito e reversível.
3. Usar os valores de `CMP-FLUXO` e outros exemplos declarados na matriz. Não gerar expectativas consultando a saída do programa.
4. Verificar foco, teclado, rolagem, diálogos, seleção/ordem de colunas e persistência. Executar nova regressão do HTML efetivo após integrar o tutorial; resultados desta rc.17 não aprovam automaticamente a próxima versão.
5. Atualizar o plano mestre e produzir `HANDOFF_03_DOCUMENTACAO_DISTRIBUICAO.md`, com novo commit, versão, hashes, testes, limitações e pendências.

Não promover versão final nem marcar execução humana como aprovada por causa deste handoff. As escolhas rotineiras de implementação podem ser resolvidas com autonomia dentro das regras registradas.
