      function catalogCell(row, index) {
        if (index === null || index === undefined || index === "") return "";
        return row?.[Number(index)] ?? "";
      }
      
      function catalogText(value) {
        return String(value ?? "").trim().replace(/\s+/g, " ");
      }
      
      function catalogRowHasContent(row) {
        return Array.isArray(row) && row.some((value) => catalogText(value) !== "");
      }
      
      function catalogHeaderText(value) {
        return catalogText(value)
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLocaleLowerCase("pt-BR");
      }
      
      function catalogHeaderSignature(base) {
        const headerIndex = Math.max(0, Number(base.headerRowNumber) - 1);
        const header = base.sheet?.rows?.[headerIndex] ?? [];
        return [base.mapping.code, base.mapping.description, base.mapping.unit, base.mapping.price]
          .filter((index) => index !== null && index !== undefined && index !== "")
          .map(Number)
          .filter(Number.isInteger)
          .map((index) => ({ index, text: catalogHeaderText(catalogCell(header, index)) }))
          .filter(({ text }) => text !== "");
      }
      
      function catalogMatchesHeaderSignature(row, signature) {
        return signature.length >= 3
          && signature.every(({ index, text }) => catalogHeaderText(catalogCell(row, index)) === text);
      }
      
      function catalogIsCodeHeader(value) {
        const text = catalogHeaderText(value);
        return text.length <= 80
          && /^(?:(?:cod|codigo|item|insumo|composicao|servico))(?:\b|[.:_\-/])/.test(text);
      }
      
      function catalogIsDescriptionHeader(value) {
        const text = catalogHeaderText(value);
        return /\bdescricao\b|^servico(?:s)?\b|^insumo(?:s)?\b/.test(text);
      }
      
      function catalogIsUnitHeader(value) {
        const text = catalogHeaderText(value);
        return /^unid(?:ade)?\b|^und\b|\bunidade\b/.test(text);
      }
      
      function catalogIsPriceHeader(value) {
        const text = catalogHeaderText(value);
        return /\bpreco\b|\bcusto\b|^valor(?:\b|\s*\()|\bvalor\s+unitario\b|\bvalor\s+mediano\b|\b[cp]\.\s*unit\b/.test(text);
      }
      
      function catalogIsRepeatedHeader(row, signature, mapping) {
        if (catalogMatchesHeaderSignature(row, signature)) return true;
        return catalogIsCodeHeader(catalogCell(row, mapping.code))
          && catalogIsDescriptionHeader(catalogCell(row, mapping.description))
          && catalogIsUnitHeader(catalogCell(row, mapping.unit))
          && catalogIsPriceHeader(catalogCell(row, mapping.price));
      }
      
      function catalogCode(value, policy) {
        let code = catalogText(value);
        if (policy?.caseInsensitive) code = code.toUpperCase();
        if (policy?.stripSeparators) code = code.replace(/[\s.\-/\\]/g, "");
        return code.replace(/^0+(?=.)/, "");
      }
      
      function catalogSourceKey(value) {
        return catalogText(value)
          .normalize("NFKD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLocaleLowerCase("pt-BR")
          .replace(/[^a-z0-9]+/g, " ")
          .trim();
      }
      
      function catalogNumber(value) {
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
          if (brazilian.test(text)) text = text.replace(/\./g, "").replace(",", ".");
          else if (international.test(text)) text = text.replace(/,/g, "");
          else return Number.NaN;
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
      
      function catalogOrigin(base, rowIndex) {
        return {
          fileName: base.fileName,
          sheet: base.sheet.name,
          rowNumber: rowIndex + 1,
        };
      }
      
      function catalogReviewValues(row, base, source) {
        return {
          code: catalogCell(row, base.mapping.code),
          source,
          description: catalogCell(row, base.mapping.description),
          unit: catalogCell(row, base.mapping.unit),
          price: catalogCell(row, base.mapping.price),
        };
      }
      
      function catalogComparisonText(value) {
        return String(value ?? "")
          .normalize("NFKD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLocaleLowerCase("pt-BR")
          .replace(/\s+/g, "");
      }
      
      function catalogPriceKey(price) {
        return Number.isFinite(price.value)
          ? `n:${price.value.toFixed(8)}`
          : "i:indisponivel";
      }
      
      function catalogGroupBy(values, keyForValue) {
        const groups = new Map();
        for (const value of values) {
          const key = keyForValue(value);
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(value);
        }
        return groups;
      }
      
      function catalogConflictOccurrence(item) {
        return {
          baseName: item.baseName,
          description: item.description,
          unit: item.unit,
          price: item.price,
          origins: item.origins,
        };
      }
      
      function catalogAuditItems(rawItems) {
        const items = [];
        const conflicts = [];
        const bySourceAndCode = catalogGroupBy(
          rawItems,
          (item) => `${item.sourceKey}\u0000${item.code}`,
        );
      
        for (const codeItems of bySourceAndCode.values()) {
          const byDescription = catalogGroupBy(
            codeItems,
            (item) => catalogComparisonText(item.description),
          );
      
          for (const descriptionItems of byDescription.values()) {
            if (descriptionItems.length === 1) {
              items.push(descriptionItems[0]);
              continue;
            }
      
            const units = new Set(
              descriptionItems.map((item) => catalogComparisonText(item.unit)),
            );
            const prices = new Set(descriptionItems.map((item) => catalogPriceKey(item.price)));
      
            if (units.size === 1 && prices.size === 1) {
              const [first, ...duplicates] = descriptionItems;
              items.push({
                ...first,
                baseName: [...new Set(
                  descriptionItems.map((item) => item.baseName).filter(Boolean),
                )].join("; "),
                origins: [
                  ...first.origins,
                  ...duplicates.flatMap((item) => item.origins),
                ],
              });
              continue;
            }
      
            const reasons = [];
            if (units.size > 1) reasons.push("unidade");
            if (prices.size > 1) reasons.push("valor referencial");
      
            items.push(...descriptionItems);
            conflicts.push({
              source: descriptionItems[0].source,
              sourceKey: descriptionItems[0].sourceKey,
              code: descriptionItems[0].code,
              description: descriptionItems[0].description,
              reasons,
              occurrences: descriptionItems.map(catalogConflictOccurrence),
            });
          }
        }
      
        return { items, conflicts };
      }
      
      /**
       * Prepara registros canônicos de bases sem depender de DOM, File ou readers.
       *
       * O checkpoint dev.17 também cobre auditoria de duplicidades por fonte, código
       * e descrição normalizados. Ocorrências equivalentes são consolidadas com
       * todas as origens; divergências de unidade ou preço produzem conflitos
       * bloqueantes; fontes ou descrições diferentes permanecem distintas. No
       * dev.20, a consolidação também preserva todos os nomes das bases para a visão.
       */
      function prepareReferenceCatalog({ bases, codePolicy }) {
        const items = [];
        const reviewRows = [];
      
        for (const originalBase of bases ?? []) {
          const base = { ...originalBase, sheet: visibleSheet(originalBase.sheet) };
          const source = catalogText(base.source);
          const sourceKey = catalogSourceKey(source);
          const headerRowIndex = Math.max(0, Number(base.headerRowNumber) - 1);
          const firstDataRowIndex = headerRowIndex + 1;
          const repeatedHeaderSignature = catalogHeaderSignature(base);
      
          for (let rowIndex = 0; rowIndex < headerRowIndex; rowIndex += 1) {
            const row = base.sheet?.rows?.[rowIndex] ?? [];
            if (!catalogRowHasContent(row)) continue;
      
            reviewRows.push({
              treatment: "Removida",
              reason: "Antes do cabeçalho",
              reasonDetails: [
                "Linha anterior ao cabeçalho selecionado; exibida apenas como contexto na pré-visualização.",
              ],
              origin: catalogOrigin(base, rowIndex),
              values: catalogReviewValues(row, base, source),
            });
          }
      
          for (
            let rowIndex = firstDataRowIndex;
            rowIndex < (base.sheet?.rows?.length ?? 0);
            rowIndex += 1
          ) {
            const row = base.sheet.rows[rowIndex] ?? [];
            if (!catalogRowHasContent(row)) continue;
      
            const codeRaw = catalogCell(row, base.mapping.code);
            const code = catalogCode(codeRaw, codePolicy);
            const description = catalogText(catalogCell(row, base.mapping.description));
            const unit = catalogText(catalogCell(row, base.mapping.unit));
            const priceRaw = catalogCell(row, base.mapping.price);
            const priceValue = catalogNumber(priceRaw);
            const priceError = catalogText(base.sheet?.cellErrors?.[rowIndex]?.[Number(base.mapping.price)]);
            const priceFormula = catalogText(base.sheet?.formulas?.[rowIndex]?.[Number(base.mapping.price)]);
            const origin = catalogOrigin(base, rowIndex);
      
            if (catalogIsRepeatedHeader(row, repeatedHeaderSignature, base.mapping)) {
              reviewRows.push({
                treatment: "Removida",
                reason: "Cabeçalho repetido",
                reasonDetails: [],
                origin,
                values: catalogReviewValues(row, base, source),
              });
              continue;
            }
      
            const identityProblems = [];
            if (!code) identityProblems.push("Código ausente");
            if (!description) identityProblems.push("Descrição ausente");
            if (!unit) identityProblems.push("Unidade ausente");
      
            if (identityProblems.length) {
              reviewRows.push({
                treatment: "Removida",
                reason: "Linha estrutural",
                reasonDetails: identityProblems,
                origin,
                values: catalogReviewValues(row, base, source),
              });
              continue;
            }
      
            const priceText = catalogText(priceRaw);
            const priceIssue = priceError
              ? "Erro de fórmula no preço"
              : priceText === "" && priceFormula
                ? "Fórmula do preço sem resultado válido"
                : priceText === ""
                  ? "Preço ausente"
              : !Number.isFinite(priceValue)
                ? "Preço não numérico"
                : priceValue === 0
                  ? "Preço zero"
                  : priceValue < 0
                    ? "Preço negativo"
                    : "";
      
            if (priceIssue) {
              reviewRows.push({
                treatment: "Removida",
                reason: priceIssue,
                reasonDetails: [],
                origin,
                values: catalogReviewValues(row, base, source),
              });
              continue;
            }

            if (!(Number.isFinite(priceValue) && priceValue > 0)) continue;

            items.push({
              baseName: catalogText(base.name),
              source,
              sourceKey,
              codeRaw,
              code,
              description,
              unit,
              price: {
                raw: priceRaw,
                value: priceValue,
                issue: "",
              },
              origins: [origin],
            });
          }
        }
      
        const audit = catalogAuditItems(items);
      
        return {
          items: audit.items,
          reviewRows,
          conflicts: audit.conflicts,
          stats: {
            accepted: audit.items.length,
            reviewed: reviewRows.length,
            conflicts: audit.conflicts.length,
          },
        };
      }
      
      
