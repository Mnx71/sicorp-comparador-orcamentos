      function legacySheet(workbook, sheetName) {
        return workbook?.sheets?.find((sheet) => sheet.name === sheetName) ?? null;
      }
      
      function requiredDependencies(overrides) {
        const core = overrides ?? globalThis.SicorpCore ?? {};
        const names = [
          "analyzeBudget",
          "prepareReferenceCatalog",
          "compareBudgetToCatalog",
          "adaptComparisonToLegacyView",
        ];
      
        for (const name of names) {
          if (typeof core[name] !== "function") {
            throw new Error(`Dependência modular indisponível: ${name}.`);
          }
        }
        return core;
      }
      
      function canonicalBases(legacyBases) {
        const bases = [];
      
        for (const legacyBase of legacyBases ?? []) {
          if (!legacyBase?.workbook) {
            throw new Error(`Workbook da base “${legacyBase?.name ?? ""}” indisponível.`);
          }
      
          for (const sheetName of legacyBase.sheetNames ?? []) {
            const sheet = legacySheet(legacyBase.workbook, sheetName);
            if (!sheet) {
              throw new Error(
                `Aba da base “${sheetName}” não encontrada em ${legacyBase.fileName ?? "arquivo"}.`,
              );
            }
      
            bases.push({
              name: legacyBase.name,
              source: legacyBase.sourceIdentifier,
              fileName: legacyBase.fileName || legacyBase.workbook.fileName || "",
              sheet,
              headerRowNumber: legacyBase.headerRow,
              mapping: {
                code: legacyBase.codeCol,
                description: legacyBase.descCol,
                unit: legacyBase.unitCol,
                price: legacyBase.valueCol,
              },
            });
          }
        }
      
        return bases;
      }
      
      /**
       * Traduz o estado de configuração da interface v4.0.5 para os três seams de
       * domínio e para o adaptador de apresentação.
       *
       * No navegador, as dependências são obtidas de globalThis.SicorpCore. Testes
       * podem fornecê-las explicitamente pelo segundo argumento.
       */
      function runComparisonFromLegacyState(input, dependencyOverrides) {
        const dependencies = requiredDependencies(dependencyOverrides);
        const projectWorkbook = input?.projectWorkbook;
        if (!projectWorkbook) throw new Error("Carregue a planilha do projeto.");
      
        const projectSheet = legacySheet(projectWorkbook, input.projectSheetName);
        if (!projectSheet) throw new Error("Selecione uma aba válida do orçamento.");
        if (!(input?.bases?.length > 0)) throw new Error("Adicione pelo menos uma base referencial.");
      
        const codePolicy = {
          caseInsensitive: Boolean(input?.codePolicy?.caseInsensitive),
          stripSeparators: Boolean(input?.codePolicy?.stripSeparators),
        };
        const budget = dependencies.analyzeBudget({
          fileName: projectWorkbook.fileName || "",
          sheet: projectSheet,
          headerRowNumber: input.projectHeaderRow,
          mapping: input.projectMapping,
          codePolicy,
          includeAuditData: input.projectMapping?.totalWithBdi !== null
            && input.projectMapping?.totalWithBdi !== undefined
            && input.projectMapping?.totalWithBdi !== "",
        });
        const catalog = dependencies.prepareReferenceCatalog({
          bases: canonicalBases(input.bases),
          codePolicy,
        });
        const comparison = dependencies.compareBudgetToCatalog({
          budget,
          catalog,
          tolerance: input.tolerance,
        });
        const view = dependencies.adaptComparisonToLegacyView(comparison);
      
        return {
          budget,
          catalog,
          comparison,
          view,
        };
      }
      
      
