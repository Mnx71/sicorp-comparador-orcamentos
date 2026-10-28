# Handoff 01: consolidação e auditoria do SICORP

## Entrada e objetivo

Repositório: https://github.com/Mnx71/sicorp-comparador-orcamentos

Partir da `main` atual após a inicialização documental. Antes de trabalhar, registrar o SHA exato de partida e verificar mudanças concorrentes. A versão candidata é `v4.4.0-rc.16`, preservada em `baseline/`. O commit inicial do repositório, anterior a estes arquivos, era `71d48ce5b6ea9ea8eeb9f58605b1e972f06d0a7c`.

Objetivo deste chat: consolidar os fontes da candidata, construir e executar o kit de auditoria automatizada e manual, corrigir defeitos confirmados e entregar uma versão funcional validada para a etapa de tutorial e manual.

## Ler primeiro

1. `README.md`.
2. `docs/PLANO_MESTRE.md`.
3. `docs/REGRAS_DE_REFERENCIA.md`.
4. `docs/VALIDACAO_MANUAL.md`.
5. `baseline/manifest.json` e o HTML candidato.
6. O pacote histórico em `reference/`, extraído em pasta separada.

## O que está pronto

- Repositório inicializado com descrição e autoria: desenvolvido pela CGSOB, do DOH, da SNSH.
- HTML da rc.16 preservado integralmente, com SHA-256 registrado.
- Pacote da v4.3 preservado para reaproveitar fontes, testes e exemplos.
- Plano mestre, inventário inicial de regras e especificação da validação manual.
- Verificação de integridade e sintaxe executável por `npm run validate:baseline`.

Isso não significa que a auditoria completa foi executada. Ainda não há fontes modulares atualizados, geração atual, suíte completa ou relatório de homologação da rc.16 no repositório.

## Primeira entrega: fontes e regras

- Preservar a candidata e a referência histórica. Não gerar o produto atual a partir do build da v4.3 sem reconciliar as alterações.
- Extrair os módulos da candidata e aproveitar a arquitetura histórica onde for compatível. Evitar refatoração extensa sem necessidade da validação.
- Documentar comandos atuais de geração e testes. Ajustar o `.gitignore` de Node quando necessário: ele contém uma regra genérica que ignora `dist`.
- Confirmar a correspondência entre fontes e HTML. Registrar qualquer diferença e verificar o artefato gerado.
- Produzir a matriz completa das regras e dos resultados esperados, distinguindo orçamento e bases.
- Preservar comportamento da ORSE por fonte/código e descrição apenas para múltiplos candidatos, conforme a candidata. Não introduzir busca direta por descrição.
- Priorizar os pontos abertos já registrados no inventário: componente derivado não positivo, total geral não positivo e precedência de vazio/zero em linhas com outros problemas.
- Resolver escolhas rotineiras de implementação com autonomia; mudanças de regra devem ser apresentadas com reprodução, impacto e resultado esperado.

## Segunda entrega: auditoria e exemplos

- Atualizar os testes históricos que não representam mais o programa.
- Criar arquivos sintéticos que provoquem cada aviso, erro, exclusão, impedimento e resultado, com IDs estáveis e contraprovas.
- Fornecer tabelas de exemplo para reprodução manual, instruções completas de carregamento/mapeamento e valores esperados independentes do motor.
- Executar testes de domínio, leitores, integração, navegador, exportação e operação offline. Cobrir XLSX e XLS BIFF5/BIFF8, além dos demais formatos aceitos nos fluxos pertinentes.
- Verificar regressões já conhecidas: trocar o orçamento preservando bases; mapeamentos errados não devem apagar a pré-visualização; códigos não devem ganhar casas decimais; clicar numa linha da revisão não deve deslocá-la.
- Verificar agrupamentos de linhas relacionadas, seleção individual, navegação por setas e rolagem, além de ocultação completa de linhas/colunas.
- Verificar seleção e ordem de colunas em tela, Excel, CSV e cópia; persistência entre sessões do mesmo navegador; destaques amarelos no XLSX.
- Corrigir defeitos confirmados com testes de regressão e registrar evidências do HTML efetivamente distribuído.
- Quando os comandos estiverem estabilizados, adicionar um workflow simples de Actions para testes e validação do HTML, sem cron nem publicação automática.

## Planilhas reais

Os arquivos reais de orçamento, SINAPI, serviços/insumos XLS e ORSE disponíveis no projeto anterior não foram publicados no repositório. Se estiverem disponíveis no ambiente do novo chat, podem complementar a regressão. Caso contrário, registrar essa limitação e prosseguir com os casos sintéticos, sem inventar resultados.

Referência histórica relatada: a planilha orçamentária original produzia 424 itens e 114 linhas desconsideradas. Reexecutar antes de usar esses números como evidência de uma nova versão. Não basta conferir as contagens.

## Regras para entrega

- Não implementar tutorial nem promover uma versão final antes de concluir a validação funcional desta etapa.
- Manter documentação técnica objetiva e o manual futuro voltado ao usuário.
- Não publicar planilhas reais automaticamente. O kit público deve ser sintético.
- Não registrar resultado não executado como aprovado. Separar observação do código, resultado de teste e decisão de requisito.
- Associar relatório, casos e evidências ao commit e à versão efetivamente testados.

## Saída e continuidade

Entregar fontes, HTML gerado, matriz de regras/casos, planilhas de exemplo, expectativas, testes, comandos, relatório e pendências.

Criar `docs/handoffs/HANDOFF_02_TUTORIAL_MANUAL.md` com branch/commit de saída, versão validada, trabalho concluído, decisões, resultados, limitações e próximos passos. Atualizar o plano mestre com a situação real. Se for necessário interromper antes de concluir a etapa, criar um checkpoint suficiente para outra conversa retomar do commit exato.

O próximo chat implementará tutorial e manual a partir dessa saída. O chat final consolidará documentação técnica e distribuição, seguido da regressão final do HTML com tutorial.
