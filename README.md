# SICORP

Comparação de preços e conferência de orçamentos de obras com bases referenciais. Aplicação em HTML com funcionamento offline.

**Desenvolvido pela CGSOB, do DOH, da SNSH.**

## Situação do projeto

A versão `v4.4.0-rc.16` é a candidata de referência para a auditoria. Ainda não foi promovida à versão final. Este repositório inicia a consolidação dos fontes, dos testes e da documentação dessa candidata.

O HTML preservado está em [baseline/sicorp_comparador_orcamento_v4.4.0-rc.16.html](baseline/sicorp_comparador_orcamento_v4.4.0-rc.16.html). Baixe o arquivo e abra-o em um navegador compatível. O uso cotidiano não exige Node.js ou servidor.

O programa apresenta um aviso de versão beta: os resultados devem ser conferidos pelo analista antes da utilização.

## Próximo trabalho

Comece pelo [handoff de consolidação e auditoria](docs/handoffs/HANDOFF_01_AUDITORIA.md). A sequência completa está no [plano mestre](docs/PLANO_MESTRE.md).

O primeiro trabalho deve reconstruir os fontes correspondentes à candidata, atualizar os testes históricos e criar planilhas sintéticas com resultados conhecidos para validação manual. O tutorial e o manual serão elaborados após a estabilização das regras e dos fluxos.

## Material disponível

| Local | Conteúdo |
| --- | --- |
| `baseline/` | HTML da candidata, preservado sem alterações |
| `reference/` | Pacote histórico da v4.3 com fontes, testes e exemplos; não representa a versão atual |
| `docs/PLANO_MESTRE.md` | Etapas, entregas e critérios de aceitação |
| `docs/REGRAS_DE_REFERENCIA.md` | Comportamentos atuais e pontos para confirmação durante a auditoria |
| `docs/VALIDACAO_MANUAL.md` | Especificação do kit de exemplos e das evidências a produzir |
| `docs/handoffs/` | Continuidade sequencial dos trabalhos |
| `scripts/verify-baseline.mjs` | Verificação de integridade dos dois arquivos de referência e sintaxe JavaScript do HTML |

## Verificação inicial

Com Node.js 20 ou superior:

```bash
npm run validate:baseline
```

Esse comando verifica integridade e sintaxe; não representa aprovação da auditoria funcional. Ainda não há uma suíte atualizada da v4.4 integrada neste repositório nem workflow de Actions habilitado.

O pacote histórico deve ser usado como material para reaproveitamento. Seu comando de geração produz a v4.3, não a candidata atual.

## Contribuições e versões

Cada correção deverá registrar o caso de teste, o comportamento esperado e a verificação executada. O pacote final terá fontes reproduzíveis, HTML, manual do usuário e evidências de validação associados à mesma versão.

A inclusão do tutorial será seguida de nova regressão antes da distribuição. Novas versões não devem sobrescrever a candidata preservada em `baseline/`.

As planilhas reais usadas em verificações anteriores não estão publicadas aqui. O kit público de validação será composto por exemplos sintéticos.
