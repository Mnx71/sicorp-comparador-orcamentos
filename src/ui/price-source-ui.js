
    (() => {
      "use strict";
      const storageKey = "sicorp.priceSourceCentral.v1";
      
      function requiredElement(id) {
        const element = document.getElementById(id);
        if (!element) throw new Error(`Elemento da Central de Bases não encontrado: ${id}.`);
        return element;
      }
      
      function navigableLink(value) {
        const link = String(value ?? "").trim();
        if (!link) return "";
        if (/^[a-z][a-z0-9+.-]*:/i.test(link) || link.startsWith("//") || link.startsWith("/") || link.startsWith("#")) {
          return link;
        }
        return `https://${link}`;
      }
      
      function openModal(dialog) {
        if (typeof dialog.showModal === "function") {
          if (!dialog.open) dialog.showModal();
          return;
        }
        dialog.setAttribute("open", "");
      }
      
      function closeModal(dialog) {
        if (typeof dialog.close === "function" && dialog.open) {
          dialog.close();
          return;
        }
        dialog.removeAttribute("open");
      }
      
      /**
       * Conecta o registro puro da Central de Bases à interface, mantendo rede,
       * localStorage e downloads fora do núcleo do comparador.
       */
      function installPriceSourceCentralUi({
        createCentral,
        getBudgetSources,
        downloadBlob,
        reportError = console.error,
      } = {}) {
        if (typeof createCentral !== "function") throw new TypeError("A fábrica da Central de Bases é obrigatória.");
        if (typeof getBudgetSources !== "function") throw new TypeError("A leitura das fontes do orçamento é obrigatória.");
        if (typeof downloadBlob !== "function") throw new TypeError("A função de download é obrigatória.");
      
        const elements = {
          search: requiredElement("priceSourceSearch"),
          summary: requiredElement("priceSourceSummary"),
          unknown: requiredElement("priceSourceUnknown"),
          links: requiredElement("priceSourceLinks"),
          empty: requiredElement("priceSourceEmpty"),
          showAll: requiredElement("priceSourceShowAll"),
          dialog: requiredElement("priceSourceEditorDialog"),
          dialogTitle: requiredElement("priceSourceEditorTitle"),
          close: requiredElement("priceSourceEditorClose"),
          cancel: requiredElement("priceSourceCancel"),
          form: requiredElement("priceSourceEditorForm"),
          acronym: requiredElement("priceSourceAcronym"),
          agency: requiredElement("priceSourceAgency"),
          url: requiredElement("priceSourceUrl"),
          save: requiredElement("priceSourceSave"),
          remove: requiredElement("priceSourceRemove"),
          export: requiredElement("priceSourceExport"),
          importButton: requiredElement("priceSourceImportButton"),
          importFile: requiredElement("priceSourceImportFile"),
          resetAll: requiredElement("priceSourceResetAll"),
          status: requiredElement("priceSourceStatus"),
          editorStatus: requiredElement("priceSourceEditorStatus"),
        };
      
        let startupWarning = "";
        let savedState = null;
        try {
          savedState = globalThis.localStorage?.getItem(storageKey) || null;
        } catch {
          startupWarning = "O navegador bloqueou o armazenamento local. Use Exportar JSON para preservar alterações.";
        }
      
        let central;
        try {
          central = createCentral({ savedState });
        } catch (error) {
          central = createCentral();
          startupWarning = `As alterações locais não puderam ser lidas: ${error.message}`;
        }
      
        let showAll = false;
        let selectedId = "";
        let statusTimer = null;
        let statusPersistent = false;
      
        function clearStatus(force = false) {
          if (statusPersistent && !force) return;
          if (statusTimer != null) globalThis.clearTimeout(statusTimer);
          statusTimer = null;
          statusPersistent = false;
          elements.status.textContent = "";
          elements.status.classList.remove("error");
        }
      
        function setStatus(message, { error = false, persistent = error, duration = 3000 } = {}) {
          clearStatus(true);
          elements.status.textContent = message || "";
          elements.status.classList.toggle("error", Boolean(error));
          statusPersistent = Boolean(message && persistent);
          if (message && !statusPersistent) {
            statusTimer = globalThis.setTimeout(() => clearStatus(true), duration);
          }
        }
      
        function setEditorStatus(message, error = false) {
          elements.editorStatus.textContent = message || "";
          elements.editorStatus.classList.toggle("error", Boolean(error));
        }
      
        function budgetSources() {
          try {
            const sources = getBudgetSources();
            return Array.isArray(sources) ? sources : [];
          } catch (error) {
            reportError(error);
            return [];
          }
        }
      
        function createSourceCard(record) {
          const card = document.createElement("article");
          card.className = "price-source-card";
          card.setAttribute("role", "listitem");
      
          const link = document.createElement("a");
          link.className = "price-source-link";
          const href = navigableLink(record.url);
          if (href) {
            link.href = href;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
          } else {
            link.classList.add("no-link");
            link.setAttribute("aria-disabled", "true");
            link.addEventListener("click", (event) => event.preventDefault());
          }
          link.setAttribute("aria-label", `Abrir o portal oficial ${record.acronym}, ${record.agency}`);
          link.title = record.url || "Link não informado";
      
          const acronym = document.createElement("strong");
          acronym.textContent = record.acronym;
          const agency = document.createElement("span");
          agency.textContent = record.agency;
          link.append(acronym, agency);
      
          if (record.suggestion) {
            const badge = document.createElement("span");
            badge.className = `price-source-match-badge ${record.suggestion.kind}`;
            const source = record.suggestion.sources?.[0] || record.acronym;
            badge.textContent = `Sugestão para “${source}”`;
            link.appendChild(badge);
          }
      
          const settings = document.createElement("button");
          settings.type = "button";
          settings.className = "price-source-settings";
          settings.dataset.priceSourceEdit = record.id;
          settings.textContent = "⚙";
          settings.title = `Configurar ${record.acronym}`;
          settings.setAttribute("aria-label", `Configurar a base ${record.acronym}`);
      
          card.append(link, settings);
          return card;
        }
      
        function createAddCard() {
          const wrapper = document.createElement("article");
          wrapper.className = "price-source-add-wrapper";
          wrapper.setAttribute("role", "listitem");
          const button = document.createElement("button");
          button.id = "priceSourceNew";
          button.type = "button";
          button.className = "price-source-add-card";
          button.dataset.priceSourceAdd = "true";
          button.setAttribute("aria-label", "Adicionar nova base de preços");
          button.title = "Adicionar nova base";
          const symbol = document.createElement("span");
          symbol.textContent = "+";
          symbol.setAttribute("aria-hidden", "true");
          const label = document.createElement("small");
          label.textContent = "Nova base";
          button.append(symbol, label);
          wrapper.appendChild(button);
          return wrapper;
        }
      
        function renderLinks() {
          const search = elements.search.value.trim();
          const result = central.query({
            budgetSources: budgetSources(),
            search,
            showAll,
          });
      
          const visibleCards = result.items.map(createSourceCard);
          if (showAll) visibleCards.push(createAddCard());
          elements.links.replaceChildren(...visibleCards);
          elements.empty.classList.toggle("hidden", result.items.length > 0);
          if (result.unknownBudgetSources.length) {
            elements.unknown.textContent = `Não identificadas automaticamente: ${result.unknownBudgetSources.join(", ")}.`;
            elements.unknown.classList.remove("hidden");
          } else {
            elements.unknown.textContent = "";
            elements.unknown.classList.add("hidden");
          }
          if (search) {
            elements.summary.textContent = `${result.items.length} resultado(s) encontrado(s) no catálogo.`;
            elements.showAll.classList.add("hidden");
          } else if (showAll) {
            elements.summary.textContent = `Exibindo todas as ${result.total} bases cadastradas.`;
            elements.showAll.textContent = "Mostrar somente identificadas";
            elements.showAll.classList.remove("hidden");
          } else if (result.identifiedIds.length) {
            elements.summary.textContent = `${result.identifiedIds.length} base(s) identificada(s) no orçamento.`;
            elements.showAll.textContent = `Ver outras (${result.total - result.identifiedIds.length})`;
            elements.showAll.classList.remove("hidden");
          } else {
            elements.summary.textContent = "Nenhuma base cadastrada foi identificada no orçamento.";
            elements.showAll.textContent = `Ver outras (${result.total})`;
            elements.showAll.classList.remove("hidden");
          }
        }
      
        function fillEditor(record) {
          selectedId = record?.id || "";
          elements.dialogTitle.textContent = record ? `Configurar ${record.acronym}` : "Adicionar nova base";
          elements.acronym.value = record?.acronym || "";
          elements.agency.value = record?.agency || "";
          elements.url.value = record?.url || "";
          elements.save.textContent = record ? "Salvar alterações" : "Adicionar base";
          elements.remove.classList.toggle("hidden", !record);
          setEditorStatus("");
        }
      
        function showEditor(record = null) {
          clearStatus(true);
          fillEditor(record);
          openModal(elements.dialog);
          globalThis.setTimeout(() => elements.acronym.focus(), 0);
        }
      
        function closeEditor() {
          setEditorStatus("");
          closeModal(elements.dialog);
        }
      
        function persist(message) {
          try {
            globalThis.localStorage?.setItem(storageKey, central.exportStorageJson());
            setStatus(message);
            return true;
          } catch {
            setStatus(
              "Alteração aplicada nesta sessão, mas o navegador bloqueou o armazenamento local. Exporte o JSON para preservá-la.",
              { error: true, persistent: true },
            );
            return false;
          }
        }
      
        elements.search.addEventListener("input", () => {
          clearStatus(true);
          renderLinks();
        });
        elements.showAll.addEventListener("click", () => {
          clearStatus(true);
          showAll = !showAll;
          renderLinks();
        });
        elements.links.addEventListener("click", (event) => {
          const editButton = event.target.closest("[data-price-source-edit]");
          if (editButton) {
            const record = central.records().find((entry) => entry.id === editButton.dataset.priceSourceEdit);
            if (record) showEditor(record);
            return;
          }
          if (event.target.closest("[data-price-source-add]")) showEditor();
        });
        elements.close.addEventListener("click", closeEditor);
        elements.cancel.addEventListener("click", closeEditor);
        elements.dialog.addEventListener("click", (event) => {
          if (event.target === elements.dialog) closeEditor();
        });
        for (const input of [elements.acronym, elements.agency, elements.url]) {
          input.addEventListener("input", () => setEditorStatus(""));
          input.addEventListener("change", () => setEditorStatus(""));
        }
        elements.form.addEventListener("submit", (event) => {
          event.preventDefault();
          const wasEditing = Boolean(selectedId);
          try {
            const saved = central.save({
              id: selectedId || undefined,
              acronym: elements.acronym.value,
              agency: elements.agency.value,
              url: elements.url.value,
            });
            persist(wasEditing ? "Alterações salvas." : "Base adicionada.");
            selectedId = saved.id;
            if (!wasEditing) {
              showAll = true;
              elements.search.value = "";
            }
            renderLinks();
            closeEditor();
          } catch (error) {
            setEditorStatus(error.message, true);
          }
        });
        elements.remove.addEventListener("click", () => {
          if (!selectedId) return;
          const record = central.records().find((entry) => entry.id === selectedId);
          if (!record) return;
          if (!globalThis.confirm(`Excluir a base ${record.acronym}?`)) return;
          central.remove(selectedId);
          selectedId = "";
          persist("Base excluída.");
          renderLinks();
          closeEditor();
        });
        elements.resetAll.addEventListener("click", () => {
          if (!globalThis.confirm("Restaurar o catálogo federal e estadual padrão e excluir todas as alterações manuais?")) return;
          central.reset();
          selectedId = "";
          showAll = false;
          elements.search.value = "";
          persist("Catálogo restaurado.");
          renderLinks();
        });
        elements.export.addEventListener("click", () => {
          downloadBlob(
            central.exportPortableJson(),
            "application/json;charset=utf-8",
            "sicorp_catalogo_bases.json",
          );
          setStatus("JSON exportado.");
        });
        elements.importButton.addEventListener("click", () => elements.importFile.click());
        elements.importFile.addEventListener("change", async () => {
          const file = elements.importFile.files?.[0];
          elements.importFile.value = "";
          if (!file) return;
          try {
            central.importPortableJson(await file.text());
            selectedId = "";
            showAll = false;
            elements.search.value = "";
            persist("JSON importado.");
            renderLinks();
          } catch (error) {
            setStatus(`Não foi possível importar: ${error.message}`, { error: true, persistent: true });
          }
        });
      
        for (const id of [
          "projectFile",
          "projectSheet",
          "projectHeaderRow",
          "projectSourceCol",
          "projectCodeCol",
          "projectDescCol",
          "projectUnitCol",
          "projectQuantityCol",
          "projectWithoutBdiCol",
          "projectBdiCol",
          "projectWithBdiCol",
        ]) {
          document.getElementById(id)?.addEventListener("change", () => {
            clearStatus(true);
            showAll = false;
            renderLinks();
          });
        }
        document.addEventListener("click", (event) => {
          if (event.target.closest('[data-go-page="2"], [data-step-target="2"]')) {
            clearStatus(true);
            renderLinks();
          }
        });
        const sourceIdentifiers = document.getElementById("projectSourceIdentifiers");
        const observer = sourceIdentifiers && typeof MutationObserver === "function"
          ? new MutationObserver(() => {
            clearStatus(true);
            renderLinks();
          })
          : null;
        observer?.observe(sourceIdentifiers, { childList: true, subtree: true });
      
        renderLinks();
        if (startupWarning) setStatus(startupWarning, { error: true, persistent: true });
      
        return Object.freeze({
          render: renderLinks,
          exportPortableJson: () => central.exportPortableJson(),
          destroy: () => {
            observer?.disconnect();
            clearStatus(true);
          },
        });
      }
      
      globalThis.SicorpPriceSourceUi = Object.freeze({
        installPriceSourceCentralUi,
      });
    })();
  