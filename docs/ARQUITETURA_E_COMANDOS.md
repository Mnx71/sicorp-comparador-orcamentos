# Fontes e execução da rc.17

SICORP – Sistema de Comparação de Referenciais de Preços.

Desenvolvido pela Coordenação-Geral de Supervisão de Obras (CGSOB), do Departamento de Obras Hídricas e Apoio a Estudos sobre Segurança Hídrica (DOH), da Secretaria Nacional de Segurança Hídrica (SNSH).

Denominações institucionais verificadas em 28/10/2026 na [página oficial do DOH](https://www.gov.br/mdr/pt-br/acesso-a-informacao/institucional/quem-e-quem/secretario-nacional-de-seguranca-hidrica/departamento-de-obras-hidricas-e). O nome oficial do programa foi informado pelo responsável pelo projeto.

## Composição

| Caminho | Responsabilidade |
| --- | --- |
| src/shell.html | Documento, estilos, estrutura da interface e marcadores de inclusão |
| src/manifest.json | Versão, saída e ordem explícita das partes |
| src/core/01-convert-orse.part.js | Conversor especializado e XLSX ORSE |
| src/core/02-read-workbook.part.js | Leitores canônicos e ocultação |
| src/core/03-analyze-budget.part.js | Identificação, exclusões e metadados do orçamento |
| src/core/04-audit-budget.part.js | Conferência, cálculos, avisos e impedimentos |
| src/core/05-reference-catalog.part.js | Exclusões, equivalências e conflitos das bases |
| src/core/06-compare-budget.part.js | Busca, classificações e agregados financeiros |
| src/core/07-adapt-comparison.part.js | Visão da interface |
| src/core/08-run-comparison.part.js e 09-run-audit.part.js | Adaptação do estado da interface aos contratos públicos |
| src/core/10-comparison-export.part.js | CSV, XLSX e cópia |
| src/core/11-price-source-central.part.js | Catálogo da Central de Bases |
| src/ui/ | Interface principal e UI da Central |
| src/vendor/legacy-xls-runtime.b64 | Runtime comprimido preservado da candidata |
| scripts/source.mjs e build.mjs | Leitura ordenada dos fontes, montagem, sintaxe e hash |

Os arquivos `*.part.js` são partes ordenadas de um script clássico, dentro da mesma IIFE. Não são ES modules independentes. Foram preservadas a ordem e as declarações auxiliares repetidas da candidata para evitar mudanças de resolução de funções durante esta auditoria. Não reordenar nem isolar essas partes sem regressão. Essa dívida técnica é explícita; o acoplamento legado não foi ampliado para produzir um refactor sem necessidade.

A extração inicial de shell, núcleo, UI e runtime reproduziu a rc.16 byte a byte: SHA-256 `6b7dc58fdfd79dbaec07c1004ef996b65a71f096ff5376a8860c20f14e398ac4`. A separação posterior em partes preservou a concatenação exata. A rc.17 difere por quatro correções registradas, versão/nome institucional e autoria expandida. `baseline/` e o ZIP histórico permanecem intactos.

Os testes carregam a concatenação atual e exercitam as funções públicas `SicorpCore`, não os módulos antigos da v4.3. O teste de paridade compara o núcleo distribuído com a concatenação fonte. A geração não usa o build histórico nem lê o HTML de baseline como fonte mutável.

## Comandos

Executar na raiz, com Node.js 20 ou superior. O usuário do HTML não precisa de Node.js.

```bash
npm ci
npm run build
npm run validate:baseline
npm run validate
npm test
npx playwright install --with-deps chromium
npm run qa:browser
npm run audit:cases
```

`npm run check` agrupa integridade da baseline, paridade/sintaxe do HTML, suíte e navegador. Não regenera automaticamente o HTML: uma distribuição desatualizada deve falhar. Para usar Chrome/Edge/Chromium já instalado, definir `SICORP_CHROMIUM_PATH` com seu executável. O roteiro registra a versão efetivamente iniciada.

O ambiente desta auditoria usou Playwright 1.62.1 e Chromium 141.0.7390.0, obtido do pacote `@sparticuz/chromium` 141.0.0 porque o download padrão do Playwright retornou conteúdo inválido. Esse executável não integra a distribuição. Nenhuma falha de download foi registrada como aprovação de navegador.

```bash
npm run fixtures:build
npm run regression:real
```

`fixtures:build` requer as variáveis do runtime primário com Artifact Tool instalado e Python 3 para as alterações OOXML intencionais. A autoria dos três XLSX é feita com Artifact Tool; depois são aplicados erros/cache/ocultação de teste. Os XLS são serializações BIFF5/BIFF8 dos dados sintéticos e recebem registros ROW/COLINFO explícitos, pois o serializador histórico omitia parte desses metadados. Não são arquivos OOXML apenas renomeados. O conversor de fixtures ORSE constrói e cifra um pacote MIDAS mínimo, sem dados reais.

Os fixtures versionados permitem executar a suíte sem o ambiente de autoria. `generate-matrix.mjs` depende somente da especificação declarativa e não importa o motor. O workflow testa os fixtures existentes e guarda evidências; não há cron nem publicação automática.

`regression:real` requer os cinco arquivos do projeto em `../project_sources`, ou `SICORP_REAL_FILES`. Se faltarem, falha explicitamente e não gera uma aprovação. Usa Python Decimal/ROUND_HALF_UP como verificação aritmética independente. Não envia os arquivos reais ao repositório. A conferência real desta etapa usa como total geral de entrada a soma independente; não representa validação manual do total impresso da planilha.

## Evidências e licenças

`qa/evidence/` contém logs, relatórios JSON, capturas e exportações sintéticas. Os hashes ficam no manifesto da execução e em `dist/SHA256SUMS.txt`. Relatórios registram o commit do código testado. Um commit posterior pode apenas consolidar evidências/documentação; verificar a ausência de mudanças nos fontes/HTML entre os dois.

O runtime embutido e seus avisos foram preservados integralmente, assim como os materiais históricos. Não foi escolhida uma licença para o projeto nesta etapa. A seleção da licença continua sendo uma decisão própria.
