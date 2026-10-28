      function cell(row, index) {
        if (index === null || index === undefined || index === "") return "";
        return row?.[Number(index)] ?? "";
      }
      
      function compactText(value) {
        return String(value ?? "").trim().replace(/\s+/g, " ");
      }
      
      function normalizedHeaderText(value) {
        return compactText(value)
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLocaleLowerCase("pt-BR");
      }
      
      function headerSignature(sheet, headerRowNumber, mapping) {
        const header = sheet.rows?.[Number(headerRowNumber) - 1] ?? [];
        return [
          mapping.code,
          mapping.source,
          mapping.description,
          mapping.unit,
          mapping.quantity,
          mapping.priceWithoutBdi,
          mapping.bdi,
          mapping.priceWithBdi,
          mapping.totalWithBdi,
        ]
          .filter((index) => index !== null && index !== undefined && index !== "")
          .map(Number)
          .filter(Number.isInteger)
          .map((index) => ({ index, text: normalizedHeaderText(cell(header, index)) }))
          .filter(({ text }) => text !== "");
      }
      
      function matchesHeaderSignature(row, signature) {
        return signature.length >= 3
          && signature.every(({ index, text }) => normalizedHeaderText(cell(row, index)) === text);
      }
      
      function isHeaderCodeLabel(value) {
        const text = normalizedHeaderText(value);
        return text.length <= 80 && /^(?:cod|codigo)(?:\b|[.:_\-/])/.test(text);
      }
      
      function isGenericHeaderCodeLabel(value) {
        const text = normalizedHeaderText(value);
        return text.length <= 80 && /^(?:insumo|item|composicao|servico)(?:\b|[.:_\-/])/.test(text);
      }
      
      function isDescriptionHeaderLabel(value) {
        const text = normalizedHeaderText(value);
        return /\bdescricao\b|^servico(?:s)?\b|^insumo(?:s)?\b/.test(text);
      }
      
      function isUnitHeaderLabel(value) {
        const text = normalizedHeaderText(value);
        return /^unid(?:ade)?\b|^und\b|\bunidade\b/.test(text);
      }
      
      function isQuantityHeaderLabel(value) {
        const text = normalizedHeaderText(value);
        return /\bquantidade\b|^qtd\b|^quant\b|\bcoeficiente\b/.test(text);
      }
      
      function isPriceHeaderLabel(value) {
        const text = normalizedHeaderText(value);
        return /\bpreco\b|\bcusto\b|^valor(?:\b|\s*\()|\bvalor\s+unitario\b|\bvalor\s+mediano\b|\b[cp]\.\s*unit\b/.test(text);
      }
      
      function isRepeatedHeader(row, signature, mapping) {
        if (matchesHeaderSignature(row, signature)) return true;
      
        const selectedPriceHeaders = [
          mapping.priceWithoutBdi,
          mapping.priceWithBdi,
          mapping.totalWithBdi,
        ]
          .filter((index) => index !== null && index !== undefined && index !== "")
          .map((index) => cell(row, index));
      
        const codeLabel = cell(row, mapping.code);
        return (isHeaderCodeLabel(codeLabel) || isGenericHeaderCodeLabel(codeLabel))
          && isDescriptionHeaderLabel(cell(row, mapping.description))
          && isUnitHeaderLabel(cell(row, mapping.unit))
          && isQuantityHeaderLabel(cell(row, mapping.quantity))
          && selectedPriceHeaders.some(isPriceHeaderLabel);
      }
      
      function rowHasContent(row) {
        return Array.isArray(row) && row.some((value) => compactText(value) !== "");
      }
      
      function normalizeCode(value, policy) {
        let code = compactText(value);
        if (policy?.caseInsensitive) code = code.toUpperCase();
        if (policy?.stripSeparators) code = code.replace(/[\s.\-/\\]/g, "");
        return code.replace(/^0+(?=.)/, "");
      }
      
      function normalizeSourceKey(value) {
        return compactText(value)
          .normalize("NFKD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLocaleLowerCase("pt-BR")
          .replace(/[^a-z0-9]+/g, " ")
          .trim();
      }
      
      function parseStrictNumber(value) {
        if (typeof value === "number") return Number.isFinite(value) ? value : Number.NaN;
      
        let text = String(value ?? "").replace(/\u00a0/g, " ").trim();
        if (!text) return Number.NaN;
      
        text = text
          .replace(/^R\$\s*/i, "")
          .replace(/\s*%$/, "")
          .replace(/\s/g, "");
      
        if (/^[+\-]?(?:\d+(?:\.\d*)?|\.\d+)[eE][+\-]?\d+$/.test(text)) {
          const scientific = Number(text);
          return Number.isFinite(scientific) ? scientific : Number.NaN;
        }
      
        const hasComma = text.includes(",");
        const hasDot = text.includes(".");
      
        if (hasComma && hasDot) {
          const brazilian = /^[+\-]?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/;
          const international = /^[+\-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/;
          if (brazilian.test(text)) {
            text = text.replace(/\./g, "").replace(",", ".");
          } else if (international.test(text)) {
            text = text.replace(/,/g, "");
          } else {
            return Number.NaN;
          }
        } else if (hasComma) {
          if (!/^[+\-]?\d+(?:,\d+)?$/.test(text)) return Number.NaN;
          text = text.replace(",", ".");
        } else if (hasDot) {
          if (!/^[+\-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return Number.NaN;
        } else if (!/^[+\-]?\d+$/.test(text)) {
          return Number.NaN;
        }
      
        const parsed = Number(text);
        return Number.isFinite(parsed) ? parsed : Number.NaN;
      }
      
      function parseBdiRate(value) {
        const parsed = parseStrictNumber(value);
        if (!Number.isFinite(parsed)) return Number.NaN;
      
        const hasPercentSign = String(value ?? "").includes("%");
        const rate = hasPercentSign || Math.abs(parsed) > 1 ? parsed / 100 : parsed;
        return rate > -1 ? rate : Number.NaN;
      }
      
      function usablePrice(value) {
        return Number.isFinite(value) && value > 0;
      }
      
      function roundMoneyValue(value) {
        if (!Number.isFinite(value)) return Number.NaN;
        return Math.round((value + Number.EPSILON * Math.max(1, Math.abs(value))) * 100) / 100;
      }
      
      function metadataCell(matrix, rowIndex, columnIndex, fallback = "") {
        if (columnIndex === null || columnIndex === undefined || columnIndex === "") return fallback;
        return matrix?.[rowIndex]?.[Number(columnIndex)] ?? fallback;
      }
      
      function auditField(sheet, row, rowIndex, columnIndex, parser = parseStrictNumber) {
        const raw = cell(row, columnIndex);
        return {
          raw,
          value: parser(raw),
          numberFormat: metadataCell(sheet?.numberFormats, rowIndex, columnIndex),
          formula: metadataCell(sheet?.formulas, rowIndex, columnIndex),
          error: metadataCell(sheet?.cellErrors, rowIndex, columnIndex),
          hiddenColumn: columnIndex !== null
            && columnIndex !== undefined
            && columnIndex !== ""
            && Boolean(sheet?.hiddenColumns?.[Number(columnIndex)]),
        };
      }
      
      function priceForRow(row, mapping) {
        const withoutBdiRaw = cell(row, mapping.priceWithoutBdi);
        let withoutBdi = parseStrictNumber(withoutBdiRaw);
        let withoutBdiSource = usablePrice(withoutBdi) ? "Informado" : "Indisponível";
        const bdiRaw = cell(row, mapping.bdi);
        let bdiRate = parseBdiRate(bdiRaw);
        const withBdiRaw = cell(row, mapping.priceWithBdi);
        let withBdi = parseStrictNumber(withBdiRaw);
        let withBdiSource = usablePrice(withBdi) ? "Informado" : "Indisponível";
      
        const bdiNotMapped = mapping.bdi === null || mapping.bdi === undefined || mapping.bdi === "";
        if (bdiNotMapped && !Number.isFinite(bdiRate) && usablePrice(withoutBdi) && usablePrice(withBdi)) {
          bdiRate = (withBdi / withoutBdi) - 1;
        }
      
        if (!usablePrice(withoutBdi) && usablePrice(withBdi) && Number.isFinite(bdiRate)) {
          withoutBdi = roundMoneyValue(withBdi / (1 + bdiRate));
          withoutBdiSource = "Calculado com BDI";
        }
      
        if (!usablePrice(withBdi) && usablePrice(withoutBdi) && Number.isFinite(bdiRate)) {
          withBdi = roundMoneyValue(withoutBdi * (1 + bdiRate));
          withBdiSource = "Calculado sem BDI + BDI";
        }
      
        return {
          withoutBdiRaw,
          withoutBdi,
          withoutBdiSource,
          bdiRaw,
          bdiRate,
          withBdiRaw,
          withBdi,
          withBdiSource,
        };
      }
      
      function reviewPriceText(price) {
        return [price.withoutBdiRaw, price.withBdiRaw]
          .filter((value) => compactText(value) !== "")
          .map(compactText)
          .join(" / ");
      }
      
      const AUDIT_MAPPING_FIELDS = [
        "code",
        "source",
        "description",
        "unit",
        "quantity",
        "priceWithoutBdi",
        "bdi",
        "priceWithBdi",
        "totalWithBdi",
      ];
      
      function mappedColumnLabels(sheet, headerRowIndex, mapping) {
        const header = sheet?.rows?.[headerRowIndex] ?? [];
        return Object.fromEntries(AUDIT_MAPPING_FIELDS.map((key) => [
          key,
          compactText(cell(header, mapping?.[key])),
        ]));
      }
      
      /**
       * Analisa uma aba canônica de orçamento sem depender de DOM, File ou readers.
       *
       * O checkpoint dev.10 cobre uma linha válida com preços informados e a remoção
       * de linhas sem identidade completa como Linha estrutural e mantém linhas
       * com identidade completa para a auditoria numérica. Também cobre os cálculos entre
       * preços com e sem BDI, cabeçalhos repetidos por assinatura ou rótulos
       * equivalentes, linhas anteriores ao cabeçalho e números com separadores
       * brasileiros ou em notação científica. Os demais casos serão acrescentados
       * separadamente.
       */
      function analyzeBudget({
        fileName,
        sheet,
        headerRowNumber,
        mapping,
        codePolicy,
        includeAuditData = false,
      }) {
        sheet = visibleSheet(sheet);
        const items = [];
        const reviewRows = [];
        const auditRows = [];
        const headerRowIndex = Math.max(0, Number(headerRowNumber) - 1);
        const firstDataRowIndex = headerRowIndex + 1;
        const repeatedHeaderSignature = headerSignature(sheet, headerRowNumber, mapping);
        const columnLabels = mappedColumnLabels(sheet, headerRowIndex, mapping);
      
        for (let rowIndex = 0; rowIndex < headerRowIndex; rowIndex += 1) {
          const row = sheet.rows[rowIndex] ?? [];
          if (!rowHasContent(row)) continue;
      
          const price = priceForRow(row, mapping);
          const totalWithBdiRaw = cell(row, mapping.totalWithBdi);
          const totalWithBdi = parseStrictNumber(totalWithBdiRaw);
          reviewRows.push({
            treatment: "Removida",
            reason: "Antes do cabeçalho",
            reasonDetails: [
              "Linha anterior ao cabeçalho selecionado; exibida apenas como contexto na pré-visualização.",
            ],
            origin: {
              fileName,
              sheet: sheet.name,
              rowNumber: rowIndex + 1,
            },
            values: {
              code: cell(row, mapping.code),
              source: cell(row, mapping.source),
              description: cell(row, mapping.description),
              unit: cell(row, mapping.unit),
              quantity: cell(row, mapping.quantity),
              price: reviewPriceText(price),
            },
          });
        }
      
        for (let rowIndex = firstDataRowIndex; rowIndex < sheet.rows.length; rowIndex += 1) {
          const row = sheet.rows[rowIndex] ?? [];
          if (!rowHasContent(row)) continue;
      
          const codeRaw = cell(row, mapping.code);
          const code = normalizeCode(codeRaw, codePolicy);
          const sourceRaw = cell(row, mapping.source);
          const source = compactText(sourceRaw);
          const sourceKey = normalizeSourceKey(source);
          const descriptionRaw = cell(row, mapping.description);
          const description = compactText(descriptionRaw);
          const unitRaw = cell(row, mapping.unit);
          const unit = compactText(unitRaw);
          const quantityRaw = cell(row, mapping.quantity);
          const quantity = parseStrictNumber(quantityRaw);
          const price = priceForRow(row, mapping);
          const totalWithBdiRaw = cell(row, mapping.totalWithBdi);
          const totalWithBdi = parseStrictNumber(totalWithBdiRaw);
      
          if (isRepeatedHeader(row, repeatedHeaderSignature, mapping)) {
            reviewRows.push({
              treatment: "Removida",
              reason: "Cabeçalho repetido",
              reasonDetails: [],
              origin: {
                fileName,
                sheet: sheet.name,
                rowNumber: rowIndex + 1,
              },
              values: {
                code: codeRaw,
                source: sourceRaw,
                description: descriptionRaw,
                unit: unitRaw,
                quantity: quantityRaw,
                price: reviewPriceText(price),
              },
            });
            continue;
          }
      
          const identityProblems = [];
          if (!code) identityProblems.push("Código ausente ou inválido");
          if (!sourceKey) identityProblems.push("Fonte/base de referência ausente");
          if (!description) identityProblems.push("Descrição ausente");
          if (!unit) identityProblems.push("Unidade ausente");

          const structural = identityProblems.length > 0;
          const numericFields = {
            quantity: auditField(sheet, row, rowIndex, mapping.quantity),
            priceWithoutBdi: auditField(sheet, row, rowIndex, mapping.priceWithoutBdi),
            bdi: auditField(sheet, row, rowIndex, mapping.bdi, parseBdiRate),
            priceWithBdi: auditField(sheet, row, rowIndex, mapping.priceWithBdi),
            totalWithBdi: auditField(sheet, row, rowIndex, mapping.totalWithBdi),
          };
          const emptyOrZeroFields = structural ? [] : Object.keys(numericFields).filter((key) => {
            if (mapping[key] === null || mapping[key] === undefined || mapping[key] === "") return false;
            const field = numericFields[key];
            if (compactText(field.error)) return false;
            const emptyCell = compactText(field.raw) === "" && compactText(field.formula) === "";
            return emptyCell || field.value === 0;
          });
          const excludedForEmptyOrZero = emptyOrZeroFields.length > 0;
          if (includeAuditData) {
            auditRows.push({
              kind: structural || excludedForEmptyOrZero ? "excluded" : "item",
              origin: {
                fileName,
                sheet: sheet.name,
                rowNumber: rowIndex + 1,
              },
              code,
              displayCode: compactText(codeRaw),
              sourceKey,
              displaySource: source,
              description,
              unit,
              hiddenRow: Boolean(sheet?.hiddenRows?.[rowIndex]),
              fields: numericFields,
            });
          }
          if (structural) {
            reviewRows.push({
              treatment: "Removida",
              reason: "Linha estrutural",
              reasonDetails: identityProblems,
              origin: {
                fileName,
                sheet: sheet.name,
                rowNumber: rowIndex + 1,
              },
              values: {
                code: codeRaw,
                source: sourceRaw,
                description: descriptionRaw,
                unit: unitRaw,
                quantity: quantityRaw,
                price: reviewPriceText(price),
              },
            });
            continue;
          }

          if (excludedForEmptyOrZero) {
            reviewRows.push({
              treatment: "Removida",
              reason: "Item com quantidade ou valor vazio/zero",
              reasonCode: "BUDGET_ITEM_EMPTY_OR_ZERO",
              reasonDetails: emptyOrZeroFields.map((key) =>
                `${columnLabels[key] || key}: ${compactText(numericFields[key].raw) === "" ? "célula vazia" : "valor igual a zero"}.`
              ),
              relatedFields: emptyOrZeroFields,
              origin: { fileName, sheet: sheet.name, rowNumber: rowIndex + 1 },
              values: {
                code: codeRaw, source: sourceRaw, description: descriptionRaw, unit: unitRaw,
                quantity: quantityRaw, price: reviewPriceText(price),
              },
            });
            continue;
          }
      
          items.push({
            origin: {
              fileName,
              sheet: sheet.name,
              rowNumber: rowIndex + 1,
            },
            codeRaw,
            code,
            source,
            sourceKey,
            description,
            unit,
            quantityRaw,
            quantity,
            price,
            ...(includeAuditData ? { totalWithBdiRaw, totalWithBdi } : {}),
          });
        }
      
        const result = {
          items,
          reviewRows,
          stats: {
            accepted: items.length,
            reviewed: reviewRows.length,
          },
        };
        if (includeAuditData) {
          result.audit = {
            mapping: { ...mapping },
            columnLabels,
            headerRowNumber: headerRowIndex + 1,
            rows: auditRows,
          };
        }
        return result;
      }
      
      
