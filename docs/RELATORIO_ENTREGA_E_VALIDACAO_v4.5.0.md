# Relatório de Entrega e Validação — SICORP v4.5.0

**Data:** 05/11/2026. **Sistema:** SICORP — Sistema de Comparação de Referenciais de Preços.

## 1. Objeto
Registrar a disponibilização da versão 4.5.0 do SICORP, ferramenta em HTML único que opera localmente, destinada à conferência de planilhas orçamentárias e à comparação de preços com bases referenciais.

## 2. Entregas
- Programa `sicorp_comparador_orcamento_v4.5.0.html` (versão final homologada).
- Manual do Usuário v4.5.0 em PDF, com 10 páginas e capturas reais.
- Tutorial interativo incorporado ao programa.
- Fontes recuperados, registro dos hashes e verificações automatizadas no GitHub.

## 3. Verificação
- O HTML individual e o contido no pacote de distribuição do usuário foram confrontados: conteúdo idêntico.
- SHA-256 do HTML final: `33807e74bdb45c0bb081bb2001a40cb1c16394144dfad7c9930e2cde4aaa6905`.
- A reconstrução a partir dos componentes extraídos gerou o mesmo HTML, byte a byte.
- GitHub Actions para integridade da recuperação e pipeline histórico do repositório: aprovados (PR #3, commit `386a667`; integração na `main` em `88e3d613`).
- Teste de navegação no Chromium: abertura, tutorial, pausa/retomada, importação de orçamento agrupado, mapeamento e revisão da aba de controle, sem erro de página.

## 4. Limites da validação
As verificações atuais de recuperação e o teste pontual em navegador não substituem integralmente os testes funcionais e de regressão executados no ambiente de desenvolvimento anterior (400 testes e 27 verificações agrupadas relatados historicamente). O pacote técnico original e os commits locais originais da v4.5.0 não estavam acessíveis; os fontes publicados foram reconstruídos a partir do HTML entregue. A versão 4.4.0 foi preservada como histórico.

## 5. Disponibilização
Repositório: https://github.com/Mnx71/sicorp-comparador-orcamentos

Aplicação: https://github.com/Mnx71/sicorp-comparador-orcamentos/blob/main/dist/sicorp_comparador_orcamento_v4.5.0.html

Manual: https://github.com/Mnx71/sicorp-comparador-orcamentos/blob/main/docs/manual/SICORP_Manual_Usuario_v4.5.0.pdf

A ferramenta executa localmente no navegador, sem envio das planilhas a servidor. O arquivo HTML pode ser utilizado sem instalação.

**Providência remanescente:** criação da página da release `v4.5.0` com ZIPs de distribuição; eventual reconciliação posterior com o pacote técnico original, se recuperado.
