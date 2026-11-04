      function budgetSheet(workbook, sheetName) {
        return workbook?.sheets?.find((sheet) => sheet.name === sheetName) ?? null;
      }
      
      function auditDependencies(overrides) {
        const core = overrides ?? globalThis.SicorpCore ?? {};
        for (const name of ["analyzeBudget", "auditBudgetCalculations"]) {
          if (typeof core[name] !== "function") {
            throw new Error(`Dependência modular indisponível: ${name}.`);
          }
        }
        return core;
      }
      
      function compactReviewText(value) {
        return String(value ?? "").trim().replace(/\s+/g, " ");
      }
      
      function discardedFinding(row, index) {
        const reason = compactReviewText(row?.reason) || "Linha desconsiderada";
        const details = Array.isArray(row?.reasonDetails)
          ? row.reasonDetails.map(compactReviewText).filter(Boolean)
          : [];
        const isStructural = reason === "Linha estrutural";
        const message = isStructural
          ? "A linha não possui Código, Fonte/Base, Descrição e Unidade suficientes para ser tratada como item do orçamento e não participa da conferência item a item."
          : details.length
            ? details.join(" ")
            : `A linha foi classificada como “${reason}” e não será usada na comparação.`;
        return {
          id: `REV-${String(index + 1).padStart(4, "0")}`,
          category: "discarded",
          severity: "discarded",
          code: row?.reasonCode || (reason === "Cabeçalho repetido"
            ? "REPEATED_HEADER"
            : reason === "Antes do cabeçalho"
              ? "BEFORE_HEADER"
              : isStructural ? "STRUCTURAL_ROW" : "DISCARDED_ROW"),
          title: reason,
          message,
          action: isStructural
            ? "Nenhuma correção é necessária se a linha for apenas parte da estrutura do orçamento."
            : "Confirme se a linha deve permanecer fora dos itens do orçamento.",
          rowNumber: row?.origin?.rowNumber ?? null,
          sheet: row?.origin?.sheet ?? "",
          itemCode: compactReviewText(row?.values?.code),
          description: compactReviewText(row?.values?.description),
          field: "",
          fieldLabel: "",
          relatedFields: Array.isArray(row?.relatedFields) ? row.relatedFields : [],
          informed: null,
          expected: null,
          difference: null,
          details: { treatment: row?.treatment ?? "Removida", values: row?.values ?? {} },
        };
      }
      
      function mergeBudgetReviewFindings(budget, audit) {
        const rowsWithAuditFinding = new Set(
          audit.findings
            .map((finding) => finding.rowNumber)
            .filter((rowNumber) => Number.isInteger(rowNumber)),
        );
        const discarded = (budget.reviewRows ?? [])
          .filter((row) => !rowsWithAuditFinding.has(row?.origin?.rowNumber))
          .map(discardedFinding)
          .sort((left, right) => Number(right.code === "BUDGET_ITEM_EMPTY_OR_ZERO")
            - Number(left.code === "BUDGET_ITEM_EMPTY_OR_ZERO"));
        const findings = [
          ...audit.findings.map((finding) => ({ ...finding, category: finding.severity })),
          ...discarded,
        ];
        const summary = {
          total: findings.length,
          blockers: audit.summary.blockers,
          errors: audit.summary.errors,
          warnings: audit.summary.warnings,
          discarded: discarded.length,
        };
        const actionable = summary.blockers + summary.errors + summary.warnings;
        return {
          ...audit,
          status: summary.blockers > 0 ? "blocked" : actionable > 0 ? "issues" : "approved",
          findings,
          summary,
        };
      }
      
      /**
       * Traduz o estado da primeira página para o analisador e a auditoria canônicos.
       * Esta etapa não depende das bases referenciais e, portanto, pode bloquear a
       * navegação antes de o usuário configurar a página seguinte.
       */
      function runBudgetAuditFromLegacyState(input, dependencyOverrides) {
        const dependencies = auditDependencies(dependencyOverrides);
        const projectWorkbook = input?.projectWorkbook;
        if (!projectWorkbook) throw new Error("Carregue a planilha do projeto.");
      
        const sheet = budgetSheet(projectWorkbook, input.projectSheetName);
        if (!sheet) throw new Error("Selecione uma aba válida do orçamento.");
      
        const budget = dependencies.analyzeBudget({
          fileName: projectWorkbook.fileName || "",
          sheet,
          headerRowNumber: input.projectHeaderRow,
          mapping: input.projectMapping,
          codePolicy: {
            caseInsensitive: Boolean(input?.codePolicy?.caseInsensitive),
            stripSeparators: Boolean(input?.codePolicy?.stripSeparators),
          },
          includeAuditData: true,
        });
        const calculationAudit = dependencies.auditBudgetCalculations({
          budget,
          totalGeneral: input.totalGeneral,
          tolerance: input.auditTolerance,
        });
        const audit = mergeBudgetReviewFindings(budget, calculationAudit);
      
        const auditByRow = new Map(
          audit.auditedItems.map((item) => [item.origin?.rowNumber, item]),
        );
        for (const item of budget.items) {
          const audited = auditByRow.get(item.origin?.rowNumber);
          if (!audited) continue;
          item.price.withoutBdi = audited.priceWithoutBdi;
          item.price.bdiRate = audited.bdiRate;
          item.price.withBdi = audited.priceWithBdi;
        }
      
        return { budget, audit };
      }
      
      
