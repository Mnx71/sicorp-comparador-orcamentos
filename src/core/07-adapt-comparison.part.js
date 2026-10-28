      function uniqueTexts(values) {
        const seen = new Set();
        const texts = [];
        for (const value of values) {
          const text = String(value ?? "").trim();
          if (!text || seen.has(text)) continue;
          seen.add(text);
          texts.push(text);
        }
        return texts;
      }
      
      function referenceOrigins(referenceItem) {
        return Array.isArray(referenceItem?.origins) ? referenceItem.origins : [];
      }
      
      function joinedOriginRows(referenceItem) {
        return uniqueTexts(referenceOrigins(referenceItem).map((origin) => {
          const fileName = origin.fileName || referenceItem?.baseName || "";
          const sheet = String(origin.sheet ?? "").trim();
          const rowNumber = origin.rowNumber ?? "";
          if (!fileName && !sheet && rowNumber === "") return "";
          return `${fileName} / ${sheet}, linha ${rowNumber}`;
        })).join("; ");
      }
      
      function matchingBaseCount(referenceItem) {
        if (!referenceItem) return 0;
        const origins = referenceOrigins(referenceItem);
        if (!origins.length) return 1;
        return new Set(origins.map(
          (origin) => `${String(origin.fileName ?? "")}\u0000${String(origin.sheet ?? "")}`,
        )).size;
      }
      
      function legacyResult(result) {
        const budget = result.budgetItem ?? {};
        const budgetPrice = budget.price ?? {};
        const reference = result.referenceItem;
        const referencePrice = reference?.price ?? {};
        const origins = referenceOrigins(reference);
      
        return {
          statusKey: result.statusKey,
          status: result.status,
          availabilityKey: result.availabilityKey,
          projectRow: budget.origin?.rowNumber ?? "",
          code: budget.codeRaw ?? budget.code ?? "",
          normalizedCode: budget.code ?? "",
          projectDescription: budget.description ?? "",
          projectUnit: budget.unit ?? "",
          projectQuantityRaw: budget.quantityRaw ?? "",
          projectQuantity: budget.quantity,
          projectSource: budget.source ?? "",
          projectSourceKey: budget.sourceKey ?? "",
          projectValueRaw: budgetPrice.withoutBdiRaw ?? "",
          projectValue: budgetPrice.withoutBdi,
          projectValueSource: budgetPrice.withoutBdiSource ?? "Indisponível",
          projectBdiRaw: budgetPrice.bdiRaw ?? "",
          projectBdiRate: budgetPrice.bdiRate,
          projectWithBdiRaw: budgetPrice.withBdiRaw ?? "",
          projectWithBdi: budgetPrice.withBdi,
          projectWithBdiSource: budgetPrice.withBdiSource ?? "Indisponível",
          projectTotalWithBdi: result.financial?.totalWithBdi,
          projectTotalShare: result.financial?.shareOfBudget,
          baseSource: reference?.source ?? budget.source ?? "",
          baseSourceKey: reference?.sourceKey ?? budget.sourceKey ?? "",
          baseName: reference?.baseName ?? "",
          baseFile: uniqueTexts(origins.map((origin) => origin.fileName)).join("; "),
          baseSheet: uniqueTexts(origins.map((origin) => origin.sheet)).join("; "),
          baseRow: joinedOriginRows(reference),
          baseDescription: reference?.description ?? "",
          baseUnit: reference?.unit ?? "",
          baseValueRaw: referencePrice.raw ?? "",
          baseValue: result.comparison?.referencePrice ?? Number.NaN,
          comparisonPerformed: result.comparison?.performed ?? false,
          difference: result.comparison?.difference ?? Number.NaN,
          percentDifference: result.comparison?.percentDifference ?? Number.NaN,
          matchCount: result.match?.candidateCount ?? 0,
          codeMatchCount: result.match?.codeCandidateCount ?? 0,
          matchingBaseCount: matchingBaseCount(reference),
          resolvedByDescription: result.match?.resolvedByDescription ?? false,
        };
      }
      
      function totalSummary(comparison) {
        const financial = comparison.financial ?? {};
        const itemCount = comparison.results?.length ?? 0;
        const shareOfBudget = itemCount === 0
          ? 0
          : financial.knownItemCount > 0 && financial.totalWithBdi > 0
            ? 1
            : Number.NaN;
      
        return {
          itemCount,
          totalWithBdi: financial.totalWithBdi ?? 0,
          knownItemCount: financial.knownItemCount ?? 0,
          unavailableItemCount: financial.unavailableItemCount ?? itemCount,
          shareOfBudget,
          partial: financial.partial ?? itemCount > 0,
        };
      }
      
      function copyGroup(group) {
        return group ? { ...group } : {
          itemCount: 0,
          totalWithBdi: 0,
          knownItemCount: 0,
          unavailableItemCount: 0,
          shareOfBudget: 0,
          partial: false,
        };
      }
      
      /**
       * Adapta o modelo canônico de comparação para os campos já consumidos pela
       * tabela, pelos cartões e pelas exportações da interface v4.0.5.
       *
       * A função é pura: não acessa DOM nem modifica o resultado canônico recebido.
       */
      function adaptComparisonToLegacyView(comparison) {
        const canonicalResults = comparison?.results ?? [];
        const results = canonicalResults.map(legacyResult);
        const byStatus = comparison?.financial?.byStatus ?? {};
        const byAvailability = comparison?.financial?.byAvailability ?? {};
      
        return {
          results,
          curveAbcResults: (comparison?.curveAbc ?? [])
            .map(({ resultIndex }) => results[resultIndex])
            .filter(Boolean),
          summary: {
            total: totalSummary(comparison ?? {}),
            abaixo: copyGroup(byStatus.abaixo),
            igual: copyGroup(byStatus.igual),
            acima: copyGroup(byStatus.acima),
            "nao-encontrado": copyGroup(byStatus["nao-encontrado"]),
            "reference-not-found": copyGroup(byAvailability["reference-not-found"]),
            "budget-price-unavailable": copyGroup(
              byAvailability["budget-price-unavailable"],
            ),
            "base-price-unavailable": copyGroup(byAvailability["base-price-unavailable"]),
          },
          defaultSort: {
            key: "projectTotalWithBdi",
            direction: "desc",
          },
        };
      }
      
      
