      function comparisonText(value) {
        return String(value ?? "")
          .normalize("NFKD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLocaleLowerCase("pt-BR")
          .replace(/\s+/g, "");
      }
      
      function sourceCodeKey(sourceKey, code) {
        return `${String(sourceKey ?? "")}\u0000${String(code ?? "")}`;
      }
      
      function buildCatalogIndex(items) {
        const index = new Map();
        for (const item of items ?? []) {
          const key = sourceCodeKey(item.sourceKey, item.code);
          if (!index.has(key)) index.set(key, []);
          index.get(key).push(item);
        }
        return index;
      }
      
      function resolveCandidates(codeCandidates, budgetDescription) {
        if (codeCandidates.length <= 1) {
          return {
            candidates: codeCandidates,
            resolvedByDescription: false,
          };
        }
      
        const descriptionKey = comparisonText(budgetDescription);
        return {
          candidates: codeCandidates.filter(
            (item) => comparisonText(item.description) === descriptionKey,
          ),
          resolvedByDescription: true,
        };
      }
      
      function selectedReference(candidates) {
        return candidates.find((item) => Number.isFinite(item.price?.value))
          ?? candidates[0]
          ?? null;
      }
      
      function candidateOccurrenceCount(candidates) {
        return candidates.reduce(
          (count, item) => count + Math.max(1, item.origins?.length ?? 0),
          0,
        );
      }
      
      function unavailableResult(availabilityKey) {
        return {
          statusKey: "nao-encontrado",
          status: "Não encontrado",
          availabilityKey,
        };
      }
      
      function comparisonStatus(budgetPrice, referencePrice, referenceItem, tolerance) {
        if (!referenceItem) return unavailableResult("reference-not-found");
        if (!Number.isFinite(budgetPrice)) {
          return unavailableResult("budget-price-unavailable");
        }
        if (!Number.isFinite(referencePrice)) {
          return unavailableResult("base-price-unavailable");
        }
      
        const difference = budgetPrice - referencePrice;
        // Absorb only subtraction noise at the configured boundary (e.g. 100.01 - 100).
        const boundaryNoise = Number.EPSILON * Math.max(1, Math.abs(budgetPrice), Math.abs(referencePrice)) * 4;
        if (Math.abs(difference) <= tolerance + boundaryNoise) {
          return { statusKey: "igual", status: "Igual", availabilityKey: "available" };
        }
        if (difference < 0) {
          return { statusKey: "abaixo", status: "Abaixo", availabilityKey: "available" };
        }
        return { statusKey: "acima", status: "Acima", availabilityKey: "available" };
      }
      
      function summarize(results) {
        const stats = {
          total: results.length,
          matched: 0,
          compared: 0,
          below: 0,
          equal: 0,
          above: 0,
          notFound: 0,
          budgetPriceUnavailable: 0,
          basePriceUnavailable: 0,
        };
      
        for (const result of results) {
          if (result.referenceItem) stats.matched += 1;
          if (result.comparison.performed) stats.compared += 1;
          if (result.statusKey === "abaixo") stats.below += 1;
          if (result.statusKey === "igual") stats.equal += 1;
          if (result.statusKey === "acima") stats.above += 1;
          if (result.availabilityKey === "reference-not-found") stats.notFound += 1;
          if (result.availabilityKey === "budget-price-unavailable") {
            stats.budgetPriceUnavailable += 1;
          }
          if (result.availabilityKey === "base-price-unavailable") {
            stats.basePriceUnavailable += 1;
          }
        }
      
        return stats;
      }
      
      function roundMoneyValue(value) {
        if (!Number.isFinite(value)) return Number.NaN;
        return Math.round((value + Number.EPSILON * Math.max(1, Math.abs(value))) * 100) / 100;
      }
      
      function addFinancialValues(values) {
        return roundMoneyValue(values.reduce(
          (sum, value) => Number.isFinite(value) ? sum + value : sum,
          0,
        ));
      }
      
      function financialGroup(results, totalWithBdi) {
        const knownItemCount = results.filter(
          (result) => Number.isFinite(result.financial.totalWithBdi),
        ).length;
        const unavailableItemCount = results.length - knownItemCount;
        const groupTotal = addFinancialValues(
          results.map((result) => result.financial.totalWithBdi),
        );
        const shareOfBudget = results.length === 0
          ? 0
          : knownItemCount > 0 && totalWithBdi > 0
            ? groupTotal / totalWithBdi
            : Number.NaN;
      
        return {
          itemCount: results.length,
          totalWithBdi: groupTotal,
          knownItemCount,
          unavailableItemCount,
          shareOfBudget,
          partial: unavailableItemCount > 0,
        };
      }
      
      function groupedFinancial(results, property, keys, totalWithBdi) {
        return Object.fromEntries(keys.map((key) => [
          key,
          financialGroup(results.filter((result) => result[property] === key), totalWithBdi),
        ]));
      }
      
      function applyFinancialMetrics(results) {
        for (const result of results) {
          const quantity = result.budgetItem.quantity;
          const unitPriceWithBdi = result.budgetItem.price?.withBdi;
          const informedTotalWithBdi = result.budgetItem.totalWithBdi;
          const totalWithBdi = Number.isFinite(informedTotalWithBdi)
            ? informedTotalWithBdi
            : Number.isFinite(quantity) && Number.isFinite(unitPriceWithBdi)
              ? roundMoneyValue(quantity * unitPriceWithBdi)
              : Number.NaN;
      
          result.financial = {
            quantity,
            unitPriceWithBdi,
            totalWithBdi,
            shareOfBudget: Number.NaN,
          };
        }
      
        const totalWithBdi = addFinancialValues(
          results.map((result) => result.financial.totalWithBdi),
        );
        const knownItemCount = results.filter(
          (result) => Number.isFinite(result.financial.totalWithBdi),
        ).length;
      
        for (const result of results) {
          result.financial.shareOfBudget = totalWithBdi > 0
            && Number.isFinite(result.financial.totalWithBdi)
            ? result.financial.totalWithBdi / totalWithBdi
            : Number.NaN;
        }
      
        return {
          totalWithBdi,
          knownItemCount,
          unavailableItemCount: results.length - knownItemCount,
          partial: knownItemCount !== results.length,
          byStatus: groupedFinancial(
            results,
            "statusKey",
            ["abaixo", "igual", "acima", "nao-encontrado"],
            totalWithBdi,
          ),
          byAvailability: groupedFinancial(
            results,
            "availabilityKey",
            [
              "available",
              "reference-not-found",
              "budget-price-unavailable",
              "base-price-unavailable",
            ],
            totalWithBdi,
          ),
        };
      }
      
      function curveAbc(results) {
        let rank = 0;
        let cumulativeShare = 0;
      
        return results
          .map((result, resultIndex) => ({ result, resultIndex }))
          .sort((left, right) => {
            const leftTotal = left.result.financial.totalWithBdi;
            const rightTotal = right.result.financial.totalWithBdi;
            const leftMissing = !Number.isFinite(leftTotal);
            const rightMissing = !Number.isFinite(rightTotal);
            if (leftMissing !== rightMissing) return leftMissing ? 1 : -1;
            if (!leftMissing && leftTotal !== rightTotal) return rightTotal - leftTotal;
            return left.resultIndex - right.resultIndex;
          })
          .map(({ result, resultIndex }) => {
            const { totalWithBdi, shareOfBudget } = result.financial;
            if (!Number.isFinite(totalWithBdi)) {
              return {
                resultIndex,
                rank: null,
                totalWithBdi,
                shareOfBudget,
                cumulativeShare: Number.NaN,
              };
            }
      
            rank += 1;
            cumulativeShare = Number.isFinite(shareOfBudget)
              ? cumulativeShare + shareOfBudget
              : Number.NaN;
            return {
              resultIndex,
              rank,
              totalWithBdi,
              shareOfBudget,
              cumulativeShare,
            };
          });
      }
      
      /**
       * Compara itens canônicos do orçamento e do catálogo sem depender da interface.
       *
       * A primeira fatia funcional cobre busca por fonte e código, resolução por
       * descrição em códigos repetidos, prioridade por preço utilizável, tolerância,
       * classificações e motivos de indisponibilidade. Conflitos do catálogo são
       * bloqueantes, como no fluxo legado. O checkpoint dev.19 acrescenta totais com
       * BDI, participação, agregações financeiras e ordenação canônica da Curva ABC.
       * No dev.20, as contagens consideram todas as origens consolidadas para manter
       * paridade com a apresentação legada.
       */
      function compareBudgetToCatalog({ budget, catalog, tolerance = 0 }) {
        if ((catalog?.conflicts?.length ?? 0) > 0) {
          throw new Error(
            "Existem duplicidades bloqueantes entre as bases. Corrija ou remova as ocorrências com unidade ou preço divergente antes de comparar.",
          );
        }
      
        const catalogIndex = buildCatalogIndex(catalog?.items);
        const absoluteTolerance = Math.max(0, Number(tolerance) || 0);
        const results = [];
      
        for (const budgetItem of budget?.items ?? []) {
          const key = sourceCodeKey(budgetItem.sourceKey, budgetItem.code);
          const codeCandidates = catalogIndex.get(key) ?? [];
          const resolution = resolveCandidates(codeCandidates, budgetItem.description);
          const referenceItem = selectedReference(resolution.candidates);
          const budgetPrice = budgetItem.price?.withoutBdi;
          const referencePrice = referenceItem?.price?.value;
          const status = comparisonStatus(
            budgetPrice,
            referencePrice,
            referenceItem,
            absoluteTolerance,
          );
          const performed = Boolean(referenceItem)
            && Number.isFinite(budgetPrice)
            && Number.isFinite(referencePrice);
          const difference = performed ? budgetPrice - referencePrice : Number.NaN;
          const percentDifference = performed && referencePrice !== 0
            ? difference / referencePrice
            : Number.NaN;
      
          results.push({
            ...status,
            budgetItem,
            referenceItem,
            match: {
              codeCandidateCount: candidateOccurrenceCount(codeCandidates),
              candidateCount: candidateOccurrenceCount(resolution.candidates),
              resolvedByDescription: resolution.resolvedByDescription,
            },
            comparison: {
              performed,
              budgetPrice,
              referencePrice: referenceItem ? referencePrice : Number.NaN,
              difference,
              percentDifference,
            },
          });
        }
      
        const financial = applyFinancialMetrics(results);
      
        return {
          results,
          stats: summarize(results),
          financial,
          curveAbc: curveAbc(results),
        };
      }
      
      
