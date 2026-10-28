      const PRICE_COMPONENTS = ["priceWithoutBdi", "bdi", "priceWithBdi"];
      const FINANCIAL_FIELDS = [
        "quantity",
        "priceWithoutBdi",
        "bdi",
        "priceWithBdi",
        "totalWithBdi",
      ];
      const ITEM_LEVEL_FINANCIAL_FIELDS = [
        "quantity",
        "priceWithoutBdi",
        "bdi",
        "priceWithBdi",
      ];
      
      const FIELD_LABELS = {
        code: "Código",
        source: "Base",
        description: "Descrição",
        unit: "Unidade",
        quantity: "Quantidade",
        priceWithoutBdi: "Preço sem BDI",
        bdi: "BDI",
        priceWithBdi: "Preço com BDI",
        totalWithBdi: "Valor total com BDI",
        totalGeneral: "Total geral do orçamento",
      };
      
      function compactText(value) {
        return String(value ?? "").trim().replace(/\s+/g, " ");
      }
      
      function parseStrictNumber(value) {
        if (typeof value === "number") return Number.isFinite(value) ? value : Number.NaN;
      
        let text = compactText(value);
        if (!text) return Number.NaN;
        text = text.replace(/^R\$\s*/i, "").replace(/\s*%$/, "").replace(/\s/g, "");
      
        if (/^[+\-]?(?:\d+(?:\.\d*)?|\.\d+)[eE][+\-]?\d+$/.test(text)) {
          const scientific = Number(text);
          return Number.isFinite(scientific) ? scientific : Number.NaN;
        }
      
        const hasComma = text.includes(",");
        const hasDot = text.includes(".");
        if (hasComma && hasDot) {
          if (/^[+\-]?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(text)) {
            text = text.replace(/\./g, "").replace(",", ".");
          } else if (/^[+\-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(text)) {
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
      
      function roundMoney(value) {
        if (!Number.isFinite(value)) return Number.NaN;
        return Math.round((value + Number.EPSILON * Math.max(1, Math.abs(value))) * 100) / 100;
      }
      
      function roundRate(value) {
        if (!Number.isFinite(value)) return Number.NaN;
        return Math.round((value + Number.EPSILON) * 1_000_000_000) / 1_000_000_000;
      }
      
      function mapped(value) {
        return value !== null && value !== undefined && value !== "";
      }
      
      function finiteField(field) {
        return !compactText(field?.error) && Number.isFinite(field?.value);
      }
      
      function rawHasContent(field) {
        return compactText(field?.raw) !== "" || compactText(field?.error) !== "";
      }
      
      function fieldLabel(columnLabels, key) {
        return compactText(columnLabels?.[key]) || FIELD_LABELS[key] || (key ? String(key) : "");
      }
      
      function quotedColumnLabel(columnLabels, key) {
        return `"${fieldLabel(columnLabels, key)}"`;
      }
      
      function joinedColumnLabels(columnLabels, keys) {
        return keys.map((key) => quotedColumnLabel(columnLabels, key)).join(", ");
      }
      
      function normalizedStructuralLabel(value) {
        return compactText(value)
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLocaleLowerCase("pt-BR")
          .replace(/[:.]+$/, "")
          .trim();
      }
      
      function isKnownSummaryLabel(value) {
        return /^(?:sub\s*total|total(?:\s+geral)?|valor\s+total)$/.test(
          normalizedStructuralLabel(value),
        );
      }
      
      function monetaryDifference(left, right) {
        return roundMoney(left - right);
      }
      
      function outsideTolerance(left, right, tolerance) {
        return Number.isFinite(left)
          && Number.isFinite(right)
          && Math.abs(left - right) > tolerance + 1e-9;
      }
      
      function formulaSignature(formula) {
        return compactText(formula)
          .toUpperCase()
          .replace(/\s+/g, "")
          .replace(/(\$?[A-Z]{1,3}\$?)\d+/g, "$1{R}");
      }
      
      function findingFactory(findings, columnLabels) {
        return function addFinding({
          severity,
          code,
          title,
          message,
          action,
          row,
          field,
          informed = null,
          expected = null,
          difference = null,
          details = null,
          relatedFields = null,
        }) {
          findings.push({
            id: `AUD-${String(findings.length + 1).padStart(4, "0")}`,
            severity,
            code,
            title,
            message,
            action,
            rowNumber: row?.origin?.rowNumber ?? null,
            sheet: row?.origin?.sheet ?? "",
            itemCode: row?.displayCode ?? row?.code ?? "",
            description: row?.description ?? "",
            field: field ?? "",
            fieldLabel: fieldLabel(columnLabels, field),
            relatedFields: Array.isArray(relatedFields)
              ? relatedFields
              : field ? [field] : [],
            informed,
            expected,
            difference,
            details,
          });
        };
      }
      
      function invalidFieldMessage(field) {
        if (compactText(field?.error)) return `A célula contém o erro ${compactText(field.error)}.`;
        if (!rawHasContent(field)) return "A célula está vazia.";
        return `O conteúdo “${compactText(field?.raw)}” não é um número válido.`;
      }

      function invalidFieldFinding(field, label) {
        if (compactText(field?.error)) {
          return { code: "MAPPED_FORMULA_ERROR", title: `${label} com erro de fórmula` };
        }
        if (compactText(field?.formula) && !rawHasContent(field)) {
          return { code: "MAPPED_FORMULA_WITHOUT_VALUE", title: `${label} com fórmula sem resultado válido` };
        }
        if (!rawHasContent(field)) {
          return { code: "MAPPED_VALUE_EMPTY", title: `${label} vazio` };
        }
        return { code: "MAPPED_VALUE_NOT_NUMERIC", title: `${label} não numérico` };
      }
      
      function derivePriceComponents(row, componentMappings, columnLabels, addFinding) {
        let priceWithoutBdi = row.fields?.priceWithoutBdi?.value;
        let bdiRate = row.fields?.bdi?.value;
        let priceWithBdi = row.fields?.priceWithBdi?.value;
        let derivedComponent = null;
      
        const missing = PRICE_COMPONENTS.filter((key) => !mapped(componentMappings[key]));
        if (missing.length !== 1) {
          return { priceWithoutBdi, bdiRate, priceWithBdi, derivedComponent };
        }
      
        derivedComponent = missing[0];
        if (derivedComponent === "priceWithBdi") {
          priceWithBdi = roundMoney(priceWithoutBdi * (1 + bdiRate));
        } else if (derivedComponent === "priceWithoutBdi") {
          const denominator = 1 + bdiRate;
          if (denominator === 0) priceWithoutBdi = Number.NaN;
          else priceWithoutBdi = roundMoney(priceWithBdi / denominator);
        } else if (priceWithoutBdi === 0) {
          bdiRate = Number.NaN;
        } else {
          bdiRate = roundRate((priceWithBdi / priceWithoutBdi) - 1);
        }
      
        if (![priceWithoutBdi, bdiRate, priceWithBdi].every(Number.isFinite)) {
          addFinding({
            severity: "blocker",
            code: "PRICE_COMPONENT_DERIVATION_IMPOSSIBLE",
            title: "Não foi possível calcular o componente de preço ausente",
            message: `A combinação de valores das colunas ${joinedColumnLabels(columnLabels, PRICE_COMPONENTS)} não permite calcular com segurança o componente que não foi mapeado.`,
            action: "Corrija a planilha original ou mapeie outra combinação de colunas e carregue o arquivo novamente.",
            row,
            field: derivedComponent,
            relatedFields: PRICE_COMPONENTS,
          });
        }
      
        return { priceWithoutBdi, bdiRate, priceWithBdi, derivedComponent };
      }
      
      function addFormulaFindings(itemRows, mapping, columnLabels, addFinding) {
        for (const key of FINANCIAL_FIELDS.filter((fieldKey) => mapped(mapping[fieldKey]))) {
          const eligible = itemRows.filter((row) => finiteField(row.fields?.[key]));
          const formulaRows = eligible.filter((row) => compactText(row.fields?.[key]?.formula));
          if (eligible.length >= 3 && formulaRows.length / eligible.length >= 0.8) {
            for (const row of eligible) {
              if (!compactText(row.fields?.[key]?.formula)) {
                addFinding({
                  severity: "warning",
                  code: "MANUAL_VALUE_IN_FORMULA_COLUMN",
                  title: "Valor manual em coluna predominantemente calculada",
                  message: `O valor da coluna ${quotedColumnLabel(columnLabels, key)} foi digitado diretamente, enquanto a maioria das células equivalentes contém fórmulas.`,
                  action: "Confirme se a substituição manual foi intencional.",
                  row,
                  field: key,
                  informed: row.fields[key].value,
                });
              }
            }
          }
      
          const signatureCounts = new Map();
          for (const row of formulaRows) {
            const signature = formulaSignature(row.fields[key].formula);
            signatureCounts.set(signature, (signatureCounts.get(signature) ?? 0) + 1);
          }
          const dominant = [...signatureCounts.entries()].sort((left, right) => right[1] - left[1])[0];
          if (dominant && dominant[1] >= 2) {
            for (const row of formulaRows) {
              const signature = formulaSignature(row.fields[key].formula);
              if (signature !== dominant[0]) {
                addFinding({
                  severity: "warning",
                  code: "FORMULA_PATTERN_MISMATCH",
                  title: "Fórmula diferente do padrão dominante",
                  message: `A coluna ${quotedColumnLabel(columnLabels, key)} utiliza uma fórmula estruturalmente diferente da maioria das linhas.`,
                  action: "Verifique se a fórmula excepcional é adequada para este item.",
                  row,
                  field: key,
                  details: { formula: row.fields[key].formula, dominantSignature: dominant[0] },
                });
              }
            }
          }
        }
      }

      function budgetAuditIdentityKey(row) {
        const parts = [
          compactText(row?.sourceKey),
          compactText(row?.code),
          comparisonText(row?.description),
          comparisonText(row?.unit),
        ];
        return parts.every(Boolean) ? parts.join("\u001f") : "";
      }

      function sameAuditedItemValues(left, right) {
        if (!left || !right) return false;
        const exactNumbers = ["quantity", "bdiRate"];
        const monetaryNumbers = [
          "priceWithoutBdi",
          "priceWithBdi",
          "informedTotalWithBdi",
        ];
        return exactNumbers.every((key) => Number.isFinite(left[key])
          && Number.isFinite(right[key])
          && Math.abs(left[key] - right[key]) <= 1e-9)
          && monetaryNumbers.every((key) => Number.isFinite(left[key])
            && Number.isFinite(right[key])
            && roundMoney(left[key]) === roundMoney(right[key]));
      }

      function auditMoneyText(value) {
        return Number(value).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      }

      function addRepeatedItemFindings(
        itemRows,
        auditedItems,
        mapping,
        columnLabels,
        addFinding,
      ) {
        const auditedByRow = new Map(
          auditedItems.map((item) => [item.origin?.rowNumber, item]),
        );
        const mappedFields = AUDIT_MAPPING_FIELDS.filter((key) => mapped(mapping[key]));

        for (let index = 1; index < itemRows.length; index += 1) {
          const previousRow = itemRows[index - 1];
          const currentRow = itemRows[index];
          const physicallyConsecutive = Number.isInteger(previousRow?.origin?.rowNumber)
            && currentRow?.origin?.rowNumber === previousRow.origin.rowNumber + 1;
          if (!physicallyConsecutive) continue;
          if (!budgetAuditIdentityKey(currentRow)
            || budgetAuditIdentityKey(currentRow) !== budgetAuditIdentityKey(previousRow)) continue;
          if (!sameAuditedItemValues(
            auditedByRow.get(currentRow.origin.rowNumber),
            auditedByRow.get(previousRow.origin.rowNumber),
          )) continue;

          addFinding({
            severity: "warning",
            code: "CONSECUTIVE_DUPLICATE_ITEM",
            title: "Possível item duplicado em linhas consecutivas",
            message: `A linha ${currentRow.origin.rowNumber} repete a identificação, a quantidade e os valores da linha ${previousRow.origin.rowNumber}.`,
            action: "Confirme se a repetição consecutiva é intencional. Se não for, corrija a planilha original e carregue-a novamente.",
            row: currentRow,
            relatedFields: mappedFields,
            details: { previousRowNumber: previousRow.origin.rowNumber },
          });
        }

        const groups = new Map();
        for (const row of itemRows) {
          const key = budgetAuditIdentityKey(row);
          const audited = auditedByRow.get(row?.origin?.rowNumber);
          if (!key || !Number.isFinite(audited?.priceWithoutBdi)) continue;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push({ row, audited });
        }

        for (const entries of groups.values()) {
          if (entries.length < 2) continue;
          const prices = new Map();
          for (const entry of entries) {
            const roundedPrice = roundMoney(entry.audited.priceWithoutBdi);
            const key = roundedPrice.toFixed(2);
            if (!prices.has(key)) prices.set(key, roundedPrice);
          }
          if (prices.size < 2) continue;

          const rowNumbers = entries
            .map((entry) => entry.row.origin?.rowNumber)
            .filter(Number.isInteger);
          const displayedPrices = [...prices.values()]
            .sort((left, right) => left - right)
            .map(auditMoneyText);
          const priceFields = PRICE_COMPONENTS.filter((key) => mapped(mapping[key]));
          addFinding({
            severity: "warning",
            code: "IDENTICAL_ITEM_DIFFERENT_PRICES",
            title: "Item idêntico com preços diferentes",
            message: `O mesmo item aparece nas linhas ${rowNumbers.join(", ")} com preços efetivos sem BDI diferentes: ${displayedPrices.join(", ")}.`,
            action: "Confirme se a variação de preço é intencional e se cada ocorrência utiliza o valor correto.",
            row: entries[0].row,
            field: "priceWithoutBdi",
            relatedFields: ["code", "source", "description", "unit", ...priceFields]
              .filter((key) => mapped(mapping[key])),
            details: { rowNumbers, prices: [...prices.values()] },
          });
        }
      }
      
      /**
       * Agrupa por descrição normalizada e avisa sobre BDIs efetivos diferentes.
       * A identidade por código/fonte/unidade não restringe esta verificação.
       */
      function addDescriptionBdiFindings(itemRows, auditedItems, mapping, addFinding) {
        const auditedByRow = new Map(auditedItems.map((item) => [item.origin?.rowNumber, item]));
        const groups = new Map();
        const numericKeys = ["quantity", "priceWithoutBdi", "bdi", "priceWithBdi", "totalWithBdi"]
          .filter((key) => mapped(mapping[key]));
        for (const row of itemRows) {
          const audited = auditedByRow.get(row.origin?.rowNumber);
          const descriptionKey = comparisonText(row.description);
          if (!descriptionKey || !Number.isFinite(audited?.bdiRate) || audited.bdiRate < 0) continue;
          if (!numericKeys.every((key) => finiteField(row.fields?.[key]) && row.fields[key].value > 0)) continue;
          if (!groups.has(descriptionKey)) groups.set(descriptionKey, []);
          groups.get(descriptionKey).push({ row, rate: roundRate(audited.bdiRate) });
        }
        for (const entries of groups.values()) {
          const rates = [...new Set(entries.map((entry) => entry.rate))].sort((a, b) => a - b);
          if (rates.length < 2) continue;
          const rowNumbers = entries.map((entry) => entry.row.origin.rowNumber).sort((a, b) => a - b);
          const rateText = rates.map((rate) => rate.toLocaleString("pt-BR", {
            style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 7,
          })).join(", ");
          const derived = !mapped(mapping.bdi);
          addFinding({
            severity: "warning",
            code: "SAME_DESCRIPTION_DIFFERENT_BDI",
            title: "Itens com a mesma descrição e BDI diferente",
            message: `A mesma descrição aparece nas linhas ${rowNumbers.join(", ")} com percentuais de BDI diferentes: ${rateText}. A verificação considera a descrição normalizada, independentemente do código, da fonte ou da unidade.${derived ? " O BDI foi calculado a partir dos preços sem e com BDI, pois a coluna de BDI não foi mapeada." : ""}`,
            action: "Confirme se os diferentes percentuais de BDI são adequados para estas ocorrências do serviço. Este aviso permite prosseguir.",
            row: entries[0].row,
            field: "bdi",
            relatedFields: derived ? ["priceWithoutBdi", "priceWithBdi"] : ["bdi"],
            details: {
              rowNumbers,
              bdiRates: rates,
              bdiByRow: entries.map((entry) => ({ rowNumber: entry.row.origin.rowNumber, rate: entry.rate })),
              derived,
            },
          });
        }
      }

      /** Audita os cálculos e os itens sem alterar os valores informados. */
      function auditBudgetCalculations({ budget, totalGeneral, tolerance = 0.01 } = {}) {
        const audit = budget?.audit ?? {};
        const mapping = audit.mapping ?? {};
        const columnLabels = audit.columnLabels ?? {};
        const rows = Array.isArray(audit.rows) ? audit.rows : [];
        const itemRows = rows.filter((row) => row?.kind === "item" && !row.hiddenRow);
        const findings = [];
        const addFinding = findingFactory(findings, columnLabels);
        const absoluteTolerance = Math.max(0, Number(tolerance) || 0.01);
        const itemCount = Array.isArray(budget?.items) ? budget.items.length : itemRows.length;
        const generalTotalTolerance = roundMoney(itemCount * absoluteTolerance);
      
        if (itemRows.length === 0) {
          addFinding({
            severity: "blocker",
            code: "NO_BUDGET_ITEMS",
            title: "Nenhum item orçamentário foi identificado",
            message: "Não há linhas de item suficientes para realizar a conferência dos cálculos.",
            action: "Revise o cabeçalho e o mapeamento das colunas antes de continuar.",
          });
        }
      
        const mappedComponents = PRICE_COMPONENTS.filter((key) => mapped(mapping[key]));
        if (mappedComponents.length < 2) {
          addFinding({
            severity: "blocker",
            code: "PRICE_COMPONENTS_INSUFFICIENT",
            title: "Mapeamento de preços insuficiente",
            message: "É necessário mapear pelo menos dois entre preço sem BDI, BDI e preço com BDI.",
            action: "Revise o mapeamento das colunas antes de continuar.",
          });
        }
        if (!mapped(mapping.totalWithBdi)) {
          addFinding({
            severity: "blocker",
            code: "ITEM_TOTAL_COLUMN_MISSING",
            title: "Coluna de valor total com BDI não mapeada",
            message: `A auditoria e os resultados da v4.4.0 dependem da coluna ${quotedColumnLabel(columnLabels, "totalWithBdi")}.`,
            action: `Mapeie a coluna ${quotedColumnLabel(columnLabels, "totalWithBdi")} antes de continuar.`,
            field: "totalWithBdi",
          });
        }
      
        const declared = parseStrictNumber(totalGeneral);
        if (!Number.isFinite(declared)) {
          addFinding({
            severity: "blocker",
            code: "GENERAL_TOTAL_INVALID",
            title: "Total geral ausente ou inválido",
            message: "O total geral do orçamento deve ser digitado como um número válido.",
            action: "Informe o total geral exibido na planilha antes de continuar.",
            field: "totalGeneral",
          });
        }
      
        const requiredMappedFields = ["quantity", ...mappedComponents];
        if (mapped(mapping.totalWithBdi)) requiredMappedFields.push("totalWithBdi");
      
        const auditedItems = [];
        let informedSum = 0;
        let auditedSum = 0;
        let absoluteItemDifferenceSum = 0;
        let totalsComplete = true;
      
        for (const row of itemRows) {
          let rowValid = true;
          if (!compactText(row.sourceKey)) {
            rowValid = false;
            totalsComplete = false;
            addFinding({
              severity: "blocker",
              code: "REFERENCE_SOURCE_MISSING",
              title: "Base de referência ausente",
              message: `A linha de item não possui um identificador válido na coluna ${quotedColumnLabel(columnLabels, "source")}.`,
              action: "Corrija a planilha original e carregue o arquivo novamente.",
              row,
              field: "source",
            });
          }
          for (const key of requiredMappedFields) {
            const currentField = row.fields?.[key];
            if (!finiteField(currentField)) {
              rowValid = false;
              totalsComplete = false;
              const invalid = invalidFieldFinding(currentField, fieldLabel(columnLabels, key));
              addFinding({
                severity: "blocker",
                code: invalid.code,
                title: invalid.title,
                message: `${invalidFieldMessage(currentField)} Verifique a coluna ${quotedColumnLabel(columnLabels, key)}.`,
                action: "Corrija a planilha original e carregue o arquivo novamente.",
                row,
                field: key,
              });
            }
          }
      
          for (const key of requiredMappedFields) {
            const value = row.fields?.[key]?.value;
            if (!Number.isFinite(value) || value > 0) continue;
            rowValid = false;
            totalsComplete = false;
            const isZero = value === 0;
            addFinding({
              severity: "blocker",
              code: isZero ? "MAPPED_VALUE_ZERO" : "MAPPED_VALUE_NEGATIVE",
              title: `${fieldLabel(columnLabels, key)} ${isZero ? "igual a zero" : "negativo"}`,
              message: `O valor informado na coluna ${quotedColumnLabel(columnLabels, key)} é ${value}. Itens do orçamento exigem valores numéricos válidos e maiores que zero nas colunas mapeadas.`,
              action: "Corrija a planilha original e carregue o arquivo novamente.",
              row,
              field: key,
              informed: value,
            });
          }
      
          const prices = derivePriceComponents(row, mapping, columnLabels, addFinding);
          const quantity = row.fields?.quantity?.value;
          const informedTotal = row.fields?.totalWithBdi?.value;
          const auditedTotal = Number.isFinite(quantity) && Number.isFinite(prices.priceWithBdi)
            ? roundMoney(quantity * prices.priceWithBdi)
            : Number.NaN;
      
          if (mappedComponents.length === 3 && rowValid) {
            const expectedWithBdi = roundMoney(prices.priceWithoutBdi * (1 + prices.bdiRate));
            if (outsideTolerance(prices.priceWithBdi, expectedWithBdi, absoluteTolerance)) {
              addFinding({
                severity: "error",
                code: "BDI_APPLICATION_MISMATCH",
                title: "Aplicação do BDI divergente",
                message: `O valor de ${quotedColumnLabel(columnLabels, "priceWithBdi")} não corresponde à aplicação de ${quotedColumnLabel(columnLabels, "bdi")} sobre ${quotedColumnLabel(columnLabels, "priceWithoutBdi")}.`,
                action: `Revise as colunas ${joinedColumnLabels(columnLabels, PRICE_COMPONENTS)} na planilha. O SICORP preservará os valores informados.`,
                row,
                field: "priceWithBdi",
                relatedFields: PRICE_COMPONENTS,
                informed: prices.priceWithBdi,
                expected: expectedWithBdi,
                difference: monetaryDifference(prices.priceWithBdi, expectedWithBdi),
              });
            }
          }
      
          if (rowValid && Number.isFinite(auditedTotal)
            && outsideTolerance(informedTotal, auditedTotal, absoluteTolerance)) {
            addFinding({
              severity: "error",
              code: "ITEM_TOTAL_MISMATCH",
              title: "Valor total do item divergente",
              message: `O valor de ${quotedColumnLabel(columnLabels, "totalWithBdi")} não corresponde a ${quotedColumnLabel(columnLabels, "quantity")} multiplicada por ${quotedColumnLabel(columnLabels, "priceWithBdi")}.`,
              action: `Revise as colunas ${joinedColumnLabels(columnLabels, ["quantity", "priceWithBdi", "totalWithBdi"])} na planilha.`,
              row,
              field: "totalWithBdi",
              relatedFields: ["quantity", "priceWithBdi", "totalWithBdi"],
              informed: informedTotal,
              expected: auditedTotal,
              difference: monetaryDifference(informedTotal, auditedTotal),
            });
          }
      
          if (rowValid && Number.isFinite(informedTotal) && Number.isFinite(auditedTotal)) {
            informedSum = roundMoney(informedSum + informedTotal);
            auditedSum = roundMoney(auditedSum + auditedTotal);
            absoluteItemDifferenceSum = roundMoney(
              absoluteItemDifferenceSum + Math.abs(informedTotal - auditedTotal),
            );
          } else {
            totalsComplete = false;
          }
      
          auditedItems.push({
            origin: row.origin,
            priceWithoutBdi: prices.priceWithoutBdi,
            bdiRate: prices.bdiRate,
            priceWithBdi: prices.priceWithBdi,
            quantity,
            informedTotalWithBdi: informedTotal,
            auditedTotalWithBdi: auditedTotal,
            itemDifference: Number.isFinite(informedTotal) && Number.isFinite(auditedTotal)
              ? monetaryDifference(informedTotal, auditedTotal)
              : null,
            derivedComponent: prices.derivedComponent,
          });
        }

        addRepeatedItemFindings(itemRows, auditedItems, mapping, columnLabels, addFinding);
        addDescriptionBdiFindings(itemRows, auditedItems, mapping, addFinding);
      
        addFormulaFindings(itemRows, mapping, columnLabels, addFinding);
      
        if (Number.isFinite(declared) && declared <= 0) {
          addFinding({
            severity: "warning",
            code: "NON_POSITIVE_VALUE",
            title: "Total geral igual a zero ou negativo",
            message: `O Total geral digitado é ${declared}.`,
            action: "Confirme se o valor é intencional.",
            field: "totalGeneral",
            informed: declared,
          });
        }
      
        if (Number.isFinite(declared) && totalsComplete) {
          if (outsideTolerance(declared, auditedSum, generalTotalTolerance)) {
            addFinding({
              severity: "error",
              code: "GENERAL_TOTAL_AUDITED_MISMATCH",
              title: "Total geral diverge da soma auditada",
              message: `O total geral digitado não corresponde à soma auditada a partir das colunas ${joinedColumnLabels(columnLabels, ["quantity", "priceWithBdi"])}.`,
              action: `Revise as colunas ${joinedColumnLabels(columnLabels, ["quantity", "priceWithBdi", "totalWithBdi"])} e o total geral da planilha.`,
              field: "totalGeneral",
              relatedFields: ["quantity", "priceWithBdi", "totalWithBdi"],
              informed: declared,
              expected: auditedSum,
              difference: monetaryDifference(declared, auditedSum),
            });
          }
        }
      
        const summary = {
          total: findings.length,
          blockers: findings.filter((finding) => finding.severity === "blocker").length,
          errors: findings.filter((finding) => finding.severity === "error").length,
          warnings: findings.filter((finding) => finding.severity === "warning").length,
        };
      
        return {
          status: summary.blockers > 0 ? "blocked" : summary.total > 0 ? "issues" : "approved",
          canProceed: summary.blockers === 0,
          findings,
          summary,
          totals: {
            declared: Number.isFinite(declared) ? declared : null,
            informedSum: totalsComplete ? informedSum : null,
            auditedSum: totalsComplete ? auditedSum : null,
            differenceFromInformed: totalsComplete && Number.isFinite(declared)
              ? monetaryDifference(declared, informedSum)
              : null,
            differenceFromAudited: totalsComplete && Number.isFinite(declared)
              ? monetaryDifference(declared, auditedSum)
              : null,
            absoluteItemDifferenceSum: totalsComplete ? absoluteItemDifferenceSum : null,
            itemCount,
            generalTotalTolerance,
            complete: totalsComplete,
          },
          auditedItems,
        };
      }
      
      
