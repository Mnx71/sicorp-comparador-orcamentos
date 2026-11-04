      globalThis.SicorpCore = Object.freeze({
        ...(globalThis.SicorpCore || {}),
        buildOrseDataset,
        prepareOrseWorkbooks,
        convertOrseFile,
        writeOrseWorkbookXlsx,
        readWorkbookFile,
        analyzeBudget,
        auditBudgetCalculations,
        prepareReferenceCatalog,
        compareBudgetToCatalog,
        adaptComparisonToLegacyView,
        runComparisonFromLegacyState,
        runBudgetAuditFromLegacyState,
        prepareComparisonExport,
        createPriceSourceCentral,
      });
    })();
  
