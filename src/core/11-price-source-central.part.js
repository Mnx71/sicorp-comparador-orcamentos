      const schemaVersion = 3;
      const storageSchemaVersion = 1;
      const portableFormat = "Catálogo de bases de preços do SICORP";
      
      const defaultRecords = [
        {
          id: "agesul",
          acronym: "AGESUL",
          agency: "Agência Estadual de Gestão de Empreendimentos de MS",
          url: "https://www.agesul.ms.gov.br/boletim-de-precos-de-obra-civil/",
        },
        {
          id: "caesb",
          acronym: "CAESB",
          agency: "Companhia de Saneamento Ambiental do Distrito Federal",
          url: "https://sistemas.caesb.df.gov.br/gcpo/app/publico/relatorioItensPorDatabaseVersaoTabela",
        },
        {
          id: "caern",
          acronym: "CAERN",
          agency: "Companhia de Águas e Esgotos do RN",
          url: "https://ri.caern.com.br/servicos/tabela-de-precos/",
        },
        {
          id: "compesa",
          acronym: "COMPESA",
          agency: "Companhia Pernambucana de Saneamento",
          url: "https://servicos.compesa.com.br/engenharia/",
        },
        {
          id: "copasa",
          acronym: "COPASA",
          agency: "Companhia de Saneamento de Minas Gerais",
          url: "https://www2.copasa.com.br/servicos/portalTransparencia/obraservico/visao/opcaoFiltroServico.asp?modalidade=Servico",
        },
        {
          id: "corsan",
          acronym: "CORSAN",
          agency: "Companhia Riograndense de Saneamento",
          url: "https://www.corsan.com.br/precos-unitarios-compostos/",
        },
        {
          id: "der-es",
          acronym: "DER-ES_Edif",
          agency: "Departamento de Edificações e de Rodovias do ES",
          url: "https://der.es.gov.br/referencial-de-precos-edificacoes",
        },
        {
          id: "der-es-rodo",
          acronym: "DER-ES_Rodo",
          agency: "Departamento de Edificações e de Rodovias do ES",
          url: "https://der.es.gov.br/referencial-de-precos-rodovias",
        },
        {
          id: "sicor-mg",
          acronym: "DER-MG / SICOR",
          agency: "Departamento de Estradas de Rodagem de Minas Gerais",
          url: "https://www.der.mg.gov.br/536-obras/sistema-referencial-de-custos",
        },
        {
          id: "der-pb",
          acronym: "DER-PB",
          agency: "Departamento de Estradas de Rodagem da Paraíba",
          url: "https://www.der.pb.gov.br/informacoes/tabela-de-precos-der-pb",
        },
        {
          id: "der-pr",
          acronym: "DER-PR",
          agency: "Departamento de Estradas de Rodagem do Paraná",
          url: "https://www.der.pr.gov.br/Pagina/Normas-e-Custos-Rodoviarios",
        },
        {
          id: "der-sp",
          acronym: "DER-SP",
          agency: "Departamento de Estradas de Rodagem de São Paulo",
          url: "https://www.der.sp.gov.br/der/biblioteca/manuais_e_normas/tabelas",
        },
        {
          id: "embasa",
          acronym: "EMBASA",
          agency: "Empresa Baiana de Águas e Saneamento",
          url: "https://www.embasa.ba.gov.br/559",
        },
        {
          id: "goinfra",
          acronym: "GOINFRA",
          agency: "Agência Goiana de Infraestrutura e Transportes",
          url: "https://www.goinfra.go.gov.br/relatorio-sintetico-de-composicoes/118",
        },
        {
          id: "orse",
          acronym: "ORSE",
          agency: "CEHOP / Governo de Sergipe",
          url: "https://orse.cehop.se.gov.br/downloads.asp",
        },
        {
          id: "sanepar",
          acronym: "SANEPAR",
          agency: "Companhia de Saneamento do Paraná",
          url: "https://www.sanepar.com.br/tabelas-de-precos",
        },
        {
          id: "seinfra-ce",
          acronym: "SEINFRA-CE",
          agency: "Secretaria da Infraestrutura do Ceará",
          url: "https://www.ce.gov.br/seinfra/tabela-de-custos/",
        },
        {
          id: "seop-pa",
          acronym: "SEOP-PA",
          agency: "Secretaria de Estado de Obras Públicas do Pará",
          url: "https://www.seop.pa.gov.br/planilha-de-custo",
        },
        {
          id: "sicro",
          acronym: "SICRO",
          agency: "DNIT",
          url: "https://www.gov.br/dnit/pt-br/assuntos/planejamento-e-pesquisa/custos-referenciais/sistemas-de-custos/sicro",
        },
        {
          id: "sinapi",
          acronym: "SINAPI",
          agency: "CAIXA / IBGE",
          url: "https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi/Paginas/default.aspx",
        },
      ];
      
      function compact(value) {
        return String(value ?? "").trim().replace(/\s+/g, " ");
      }
      
      function normalized(value) {
        return compact(value)
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLocaleLowerCase("pt-BR")
          .replace(/[^a-z0-9]+/g, " ")
          .trim();
      }
      
      const brazilianStateCodes = new Set([
        "ac", "al", "ap", "am", "ba", "ce", "df", "es", "go", "ma", "mt", "ms",
        "mg", "pa", "pb", "pr", "pe", "pi", "rj", "rn", "rs", "ro", "rr", "sc",
        "sp", "se", "to",
      ]);
      
      function identifierParts(value) {
        return String(value ?? "")
          .split(/[\/|;]+/)
          .map((part) => normalized(part))
          .filter(Boolean)
          .map((text) => {
            const tokens = text.split(" ").filter(Boolean);
            return {
              text,
              tokens,
              compact: tokens.join(""),
              root: tokens[0],
            };
          });
      }
      
      function isQualifierSuffix(value) {
        if (!value) return false;
        if (/^\d+$/.test(value)) return true;
        const match = value.match(/^([a-z]{2})(\d*)$/);
        return Boolean(match && brazilianStateCodes.has(match[1]));
      }
      
      function tokensStartWith(tokens, prefix) {
        return prefix.length <= tokens.length
          && prefix.every((token, index) => tokens[index] === token);
      }
      
      function uniqueMatches(identifiers, kind) {
        return [...new Set(identifiers.map((identifier) => identifier.id))]
          .map((id) => ({ id, kind }));
      }
      
      function matchIdentifier(source, identifiers) {
        const byRoot = identifiers.filter((identifier) => identifier.root === source.root);
      
        if (source.tokens.length === 1) {
          if (byRoot.length && source.text === source.root) return uniqueMatches(byRoot, "family");
      
          const compactExact = identifiers.filter((identifier) => identifier.compact === source.compact);
          if (compactExact.length) return uniqueMatches(compactExact, "compact");
      
          const compactFamily = identifiers.filter((identifier) => (
            identifier.compact.startsWith(source.compact)
            && identifier.compact.length > source.compact.length
          ));
          if (compactFamily.length) return uniqueMatches(compactFamily, "family");
      
          const compactPrefixes = identifiers.filter((identifier) => (
            source.compact.startsWith(identifier.compact)
            && isQualifierSuffix(source.compact.slice(identifier.compact.length))
          ));
          if (compactPrefixes.length) {
            const longest = Math.max(...compactPrefixes.map((identifier) => identifier.compact.length));
            return uniqueMatches(
              compactPrefixes.filter((identifier) => identifier.compact.length === longest),
              "compact",
            );
          }
      
          const withoutTrailingNumber = source.compact.replace(/\d+$/, "");
          if (withoutTrailingNumber && withoutTrailingNumber !== source.compact) {
            const qualifiedFamily = identifiers.filter((identifier) => (
              identifier.compact.startsWith(withoutTrailingNumber)
            ));
            if (qualifiedFamily.length) return uniqueMatches(qualifiedFamily, "family");
          }
      
          const rootPrefixes = identifiers.filter((identifier) => (
            source.compact.startsWith(identifier.root)
            && isQualifierSuffix(source.compact.slice(identifier.root.length))
          ));
          if (rootPrefixes.length) {
            const root = rootPrefixes[0].root;
            return uniqueMatches(identifiers.filter((identifier) => identifier.root === root), "family");
          }
          return [];
        }
      
        const exact = identifiers.filter((identifier) => identifier.text === source.text);
        if (exact.length) return uniqueMatches(exact, "exact");
      
        const prefixes = identifiers.filter((identifier) => (
          tokensStartWith(source.tokens, identifier.tokens)
          && source.tokens.length > identifier.tokens.length
        ));
        if (prefixes.length) {
          const longest = Math.max(...prefixes.map((identifier) => identifier.tokens.length));
          return uniqueMatches(
            prefixes.filter((identifier) => identifier.tokens.length === longest),
            "exact",
          );
        }
      
        const familyChildren = identifiers.filter((identifier) => (
          tokensStartWith(identifier.tokens, source.tokens)
          && identifier.tokens.length > source.tokens.length
        ));
        if (familyChildren.length) return uniqueMatches(familyChildren, "family");
      
        const sourceWithoutTrailingNumbers = source.tokens.filter((token, index) => (
          index < source.tokens.length - 1 || !/^\d+$/.test(token)
        ));
        if (sourceWithoutTrailingNumbers.length < source.tokens.length) {
          const qualifiedFamily = identifiers.filter((identifier) => (
            tokensStartWith(identifier.tokens, sourceWithoutTrailingNumbers)
            && identifier.tokens.length > sourceWithoutTrailingNumbers.length
          ));
          if (qualifiedFamily.length) return uniqueMatches(qualifiedFamily, "family");
        }
      
        if (byRoot.length && source.tokens.slice(1).every((token) => /^\d+$/.test(token))) {
          return uniqueMatches(byRoot, "family");
        }
        return [];
      }
      
      function cloneRecord(record) {
        return { ...record };
      }
      
      function sortRecords(records) {
        return [...records].sort((left, right) => (
          left.acronym.localeCompare(right.acronym, "pt-BR", {
            sensitivity: "base",
            numeric: true,
          })
          || left.agency.localeCompare(right.agency, "pt-BR", { sensitivity: "base" })
          || left.id.localeCompare(right.id, "pt-BR", { sensitivity: "base" })
        ));
      }
      
      function validateRecord(input, { id, custom } = {}) {
        const acronym = compact(input?.acronym);
        const agency = compact(input?.agency);
        const url = compact(input?.url);
        if (!acronym) throw new Error("Informe a sigla da base.");
        if (!agency) throw new Error("Informe o órgão responsável.");
        if (!url) throw new Error("Informe o link oficial.");
      
        return {
          id: compact(id || input?.id),
          acronym,
          agency,
          url,
          custom: Boolean(custom),
        };
      }
      
      function slug(value) {
        return normalized(value).replace(/\s+/g, "-") || "base";
      }
      
      function emptyState() {
        return { schemaVersion, overrides: [], additions: [], removedIds: [] };
      }
      
      function validateStateRecords(overrides, additions, removedIds = []) {
        const defaultsById = new Map(defaultRecords.map((record) => [record.id, record]));
        const removed = [...new Set(removedIds.map(compact).filter(Boolean))];
        if (removed.some((id) => !defaultsById.has(id))) {
          throw new Error("O estado interno possui uma base padrão removida desconhecida.");
        }
        if (overrides.some((record) => !defaultsById.has(record.id) || removed.includes(record.id))) {
          throw new Error("O estado interno possui uma personalização de base inválida.");
        }
        if (additions.some((record) => defaultsById.has(record.id))) {
          throw new Error("O estado interno possui uma base adicionada com identificação inválida.");
        }
        const ids = [...overrides, ...additions].map((record) => record.id);
        if (new Set(ids).size !== ids.length) throw new Error("O estado interno possui identificadores duplicados.");
      
        const merged = defaultRecords
          .filter((record) => !removed.includes(record.id))
          .map((record) => overrides.find((entry) => entry.id === record.id) || record)
          .concat(additions);
        const acronyms = merged.map((record) => normalized(record.acronym));
        if (new Set(acronyms).size !== acronyms.length) throw new Error("O JSON possui sigla já cadastrada.");
      
        return { schemaVersion, overrides, additions, removedIds: removed };
      }
      
      function parseStorageState(parsed) {
        if (
          parsed?.storageVersion !== storageSchemaVersion
          || !Array.isArray(parsed.overrides)
          || !Array.isArray(parsed.additions)
          || !Array.isArray(parsed.removedIds)
        ) {
          throw new Error("As configurações locais usam um formato incompatível com esta versão.");
        }
      
        const defaultsById = new Map(defaultRecords.map((record) => [record.id, record]));
        const overrides = parsed.overrides.map((entry) => {
          const base = defaultsById.get(compact(entry?.id));
          if (!base) throw new Error("Uma personalização local não pertence ao catálogo padrão.");
          return validateRecord(entry, {
            id: base.id,
            custom: false,
          });
        });
        const additions = parsed.additions.map((entry) => {
          const id = compact(entry?.id);
          if (!id || defaultsById.has(id)) throw new Error("Uma base adicionada possui identificação interna inválida.");
          return validateRecord(entry, { id, custom: true });
        });
      
        return validateStateRecords(overrides, additions, parsed.removedIds);
      }
      
      function parsePortableState(parsed) {
        if (
          !parsed
          || typeof parsed !== "object"
          || Array.isArray(parsed)
          || parsed.formato !== portableFormat
          || !Array.isArray(parsed.bases)
        ) {
          throw new Error("O JSON usa um formato incompatível com esta versão.");
        }
      
        const requiredFields = ["sigla", "orgao", "link"];
        if (parsed.bases.some((entry) => (
          !entry
          || typeof entry !== "object"
          || Array.isArray(entry)
          || requiredFields.some((field) => !Object.prototype.hasOwnProperty.call(entry, field))
        ))) {
          throw new Error("O JSON usa um formato incompatível com esta versão.");
        }
      
        const normalizedEntries = parsed.bases.map((entry) => ({
          acronym: compact(entry?.sigla),
          agency: compact(entry?.orgao),
          url: compact(entry?.link),
        }));
        const acronyms = normalizedEntries.map((entry) => normalized(entry.acronym));
        if (acronyms.some((value) => !value)) throw new Error("O JSON possui uma base sem sigla.");
        if (new Set(acronyms).size !== acronyms.length) throw new Error("O JSON possui sigla já cadastrada.");
      
        const usedIds = new Set(defaultRecords.map((record) => record.id));
        const matchedDefaultIds = new Set();
        const overrides = [];
        const additions = [];
      
        for (const entry of normalizedEntries) {
          const base = defaultRecords.find(
            (record) => normalized(record.acronym) === normalized(entry.acronym),
          );
          if (!base) {
            const stem = `custom-${slug(entry.acronym)}`;
            let id = stem;
            let suffix = 2;
            while (usedIds.has(id)) id = `${stem}-${suffix++}`;
            usedIds.add(id);
            additions.push(validateRecord(entry, { id, custom: true }));
            continue;
          }
          matchedDefaultIds.add(base.id);
          const record = validateRecord(entry, {
            id: base.id,
            custom: false,
          });
          const sameAsDefault = record.acronym === base.acronym
            && record.agency === base.agency
            && record.url === base.url;
          if (!sameAsDefault) overrides.push(record);
        }
      
        const removedIds = defaultRecords
          .filter((record) => !matchedDefaultIds.has(record.id))
          .map((record) => record.id);
        return validateStateRecords(overrides, additions, removedIds);
      }
      
      function parseJson(value, invalidMessage) {
        try {
          return typeof value === "string" ? JSON.parse(value) : value;
        } catch {
          throw new Error(invalidMessage);
        }
      }
      
      function parseState(savedState) {
        if (savedState == null || savedState === "") {
          return emptyState();
        }
        return parseStorageState(parseJson(savedState, "As configurações locais do catálogo são inválidas."));
      }
      
      function parsePortableJson(text) {
        return parsePortableState(parseJson(text, "O JSON do catálogo é inválido."));
      }
      
      function stateForExport(records) {
        return {
          formato: portableFormat,
          observacao: "Edite sigla, orgao e link. A sigla deve ser única, o link é obrigatório e os identificadores técnicos são criados internamente pelo SICORP.",
          bases: sortRecords(records).map((record) => ({
            sigla: record.acronym,
            orgao: record.agency,
            link: record.url,
          })),
        };
      }
      
      /**
       * Mantém o registro das páginas oficiais desacoplado do catálogo de preços
       * carregado no comparador. O JSON portátil contém o catálogo completo em um
       * formato legível, enquanto o estado local mantém identificadores técnicos e
       * exclusões sem expô-los ao usuário.
       */
      function createPriceSourceCentral({ savedState } = {}) {
        let state = parseState(savedState);
      
        function currentRecords() {
          const overrides = new Map(state.overrides.map((record) => [record.id, record]));
          return sortRecords(defaultRecords
            .filter((record) => !state.removedIds.includes(record.id))
            .map((record) => validateRecord(overrides.get(record.id) || record, {
              id: record.id,
              custom: false,
            }))
            .concat(state.additions.map((record) => validateRecord(record, {
              id: record.id,
              custom: true,
            }))));
        }
      
        function records() {
          return currentRecords().map(cloneRecord);
        }
      
        function query({ budgetSources = [], search = "", showAll = false } = {}) {
          const all = currentRecords();
          const identifiers = all.flatMap((record) => identifierParts(record.acronym)
            .map((identifier) => ({ ...identifier, id: record.id })));
      
          const suggestionPriority = { family: 1, compact: 2, exact: 3 };
          const suggestions = new Map();
          const addSuggestion = (id, kind, source) => {
            const current = suggestions.get(id);
            if (!current || suggestionPriority[kind] > suggestionPriority[current.kind]) {
              suggestions.set(id, { kind, sources: [source] });
              return;
            }
            if (suggestionPriority[kind] !== suggestionPriority[current.kind]) return;
            if (!current.sources.some((entry) => normalized(entry) === normalized(source))) {
              current.sources.push(source);
            }
          };
          const unknownBudgetSources = [];
          for (const source of budgetSources || []) {
            const text = compact(source);
            if (!text) continue;
            const matches = identifierParts(text).flatMap((sourcePart) => matchIdentifier(sourcePart, identifiers));
            const bestById = new Map();
            for (const match of matches) {
              const current = bestById.get(match.id);
              if (!current || suggestionPriority[match.kind] > suggestionPriority[current.kind]) {
                bestById.set(match.id, match);
              }
            }
            for (const match of bestById.values()) addSuggestion(match.id, match.kind, text);
      
            if (!bestById.size && !unknownBudgetSources.some((entry) => normalized(entry) === normalized(text))) {
              unknownBudgetSources.push(text);
            }
          }
      
          const identified = new Set(suggestions.keys());
      
          const searchTokens = normalized(search).split(" ").filter(Boolean);
          const matchesSearch = (record) => {
            const haystack = normalized([record.acronym, record.agency].join(" "));
            return searchTokens.every((token) => haystack.includes(token));
          };
          const items = searchTokens.length
            ? all.filter(matchesSearch)
            : showAll ? all : all.filter((record) => identified.has(record.id));
          const identifiedIds = all.filter((record) => identified.has(record.id)).map((record) => record.id);
      
          return {
            items: items.map((record) => {
              const item = cloneRecord(record);
              const suggestion = suggestions.get(record.id);
              if (suggestion) item.suggestion = { ...suggestion, sources: [...suggestion.sources] };
              return item;
            }),
            identifiedIds,
            unknownBudgetSources,
            total: all.length,
            hiddenCount: Math.max(0, all.length - items.length),
          };
        }
      
        function save(input) {
          const all = currentRecords();
          const existing = all.find((record) => record.id === compact(input?.id));
          let id = existing?.id;
          let custom = existing?.custom ?? true;
          if (!id) {
            const stem = `custom-${slug(input?.acronym)}`;
            id = stem;
            let suffix = 2;
            const used = new Set(all.map((record) => record.id));
            while (used.has(id)) id = `${stem}-${suffix++}`;
          }
      
          const record = validateRecord(input, {
            id,
            custom,
          });
          const duplicate = all.find(
            (candidate) => candidate.id !== id && normalized(candidate.acronym) === normalized(record.acronym),
          );
          if (duplicate) throw new Error(`A sigla já cadastrada pertence à base ${duplicate.acronym}.`);
      
          if (custom) {
            state.additions = state.additions.filter((entry) => entry.id !== id).concat(record);
          } else {
            const base = defaultRecords.find((entry) => entry.id === id);
            const sameAsDefault = base
              && record.acronym === base.acronym
              && record.agency === base.agency
              && record.url === base.url;
            state.overrides = state.overrides.filter((entry) => entry.id !== id);
            if (!sameAsDefault) state.overrides.push(record);
          }
          return cloneRecord(record);
        }
      
        function remove(id) {
          const key = compact(id);
          if (defaultRecords.some((record) => record.id === key)) {
            if (state.removedIds.includes(key)) return false;
            state.overrides = state.overrides.filter((record) => record.id !== key);
            state.removedIds = [...state.removedIds, key];
            return true;
          }
          const before = state.additions.length;
          state.additions = state.additions.filter((record) => record.id !== key);
          return state.additions.length < before;
        }
      
        function reset() {
          state = emptyState();
        }
      
        function exportPortableJson() {
          return JSON.stringify(stateForExport(currentRecords()), null, 2);
        }
      
        function importPortableJson(text) {
          const candidate = parsePortableJson(text);
          state = candidate;
          return records();
        }
      
        function exportStorageJson() {
          return JSON.stringify({
            storageVersion: storageSchemaVersion,
            overrides: state.overrides,
            additions: state.additions,
            removedIds: state.removedIds,
          });
        }
      
        return Object.freeze({
          records,
          query,
          save,
          remove,
          reset,
          exportPortableJson,
          exportStorageJson,
          importPortableJson,
        });
      }
      
