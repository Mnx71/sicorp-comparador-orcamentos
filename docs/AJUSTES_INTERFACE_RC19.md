# Ajustes da interface — v4.4.0-rc.19

Data: 04/11/2026. Partida: `53c69969a4619306e59883b378d868434be0cac4`, branch `audit/consolidacao-rc17`.

A janela “Revisão e conferência do orçamento” ocupa toda a largura e altura disponível do navegador, inclusive após redimensionamento. O corpo continua rolável e preserva o acesso ao final da tabela, à explicação e aos botões.

A versão e a autoria institucional foram movidas para um rodapé após o conteúdo principal, com fonte de 0,65 rem (10,4 px na configuração padrão), cor discreta e quebra de linha natural. O indicador “Offline” foi removido do cabeçalho. A autoria conserva o texto: “Desenvolvido pela Coordenação-Geral de Supervisão de Obras (CGSOB), do Departamento de Obras Hídricas e Apoio a Estudos sobre Segurança Hídrica (DOH), da Secretaria Nacional de Segurança Hídrica (SNSH).”

HTML: `dist/sicorp_comparador_orcamento_v4.4.0-rc.19.html`. SHA-256: `7a09eb262aad3d566b9fedeaae9f052d1d3d2fb0661f22b791d03788fcf45d61`.

Verificações locais executadas:

- `npm run validate:baseline` e `npm run validate`: aprovados.
- `npm test`: 363 aprovados, zero falhas.
- `npm run qa:layout`: 56 combinações aprovadas, incluindo verificação das quatro bordas da revisão em sete tamanhos de tela e a rolagem já coberta na rc.18.
- Conferência do cabeçalho e rodapé em 1600×1000 e 390×844: texto institucional completo, versão no rodapé, fonte de 10,4 px, ausência das informações extras no cabeçalho e rodapé abaixo do conteúdo principal, sem transbordamento horizontal. Capturas de 390 px e da revisão em 1600×1000 foram inspecionadas.

Ambiente: Linux, Node.js 24.22.1, Playwright 1.62.1 e Chromium 141.0.7390.0. O download padrão do navegador não forneceu um ZIP válido neste ambiente; a execução local usou o Chromium do pacote `@sparticuz/chromium@141.0.0`, extraído em diretório temporário. Isso não adicionou dependências à aplicação ou ao repositório. Os testes de navegador funcionaram sem rede. Evidências e logs estão em `qa/evidence/rc19/`.

O núcleo de cálculo e as planilhas não foram alterados. A baseline, os HTML anteriores e suas evidências foram preservados. A execução completa de CI será identificada pelo workflow do commit publicado; os resultados locais acima não são uma aprovação antecipada do CI. A validação por pessoa e no Windows continua pendente. A candidata permanece beta.
