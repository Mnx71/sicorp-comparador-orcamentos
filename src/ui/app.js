
    "use strict";

    const state = {
      projectWorkbook: null,
      pendingBaseWorkbook: null,
      pendingBaseAutoSourceKey: "",
      bases: [],
      conflicts: [],
      repeatedCodeCount: 0,
      consistentDuplicateCount: 0,
      nextBaseId: 1,
      results: [],
      resultSort: { key: "projectTotalWithBdi", direction: "desc" },
      resultVisibleColumnKeys: null,
      resultColumnOrderKeys: null,
      resultColumnDragKey: "",
      sourceValueAbcFilter: "all",
      currentPage: 1,
      projectAnalysisCache: null,
      pendingBaseAnalysisCache: null,
      reviewRows: [],
      reviewFilter: "discarded",
      reviewOccurrences: [],
      reviewSelectedId: "",
      reviewSelectedRowKey: "",
      reviewContext: null,
      pendingBaseDraft: null,
      auditGroups: [],
      auditDetailsOpen: false,
    };

    const el = (id) => document.getElementById(id);

    const columns = [
      "A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z",
      "AA","AB","AC","AD","AE","AF","AG","AH","AI","AJ","AK","AL","AM","AN","AO","AP","AQ","AR","AS","AT","AU","AV","AW","AX","AY","AZ",
      "BA","BB","BC","BD","BE","BF","BG","BH"
    ];

    function showError(err) {
      const box = el("errorBox");
      const msg = err instanceof Error ? `${err.message}\n\n${err.stack || ""}` : String(err);
      box.textContent = msg;
      box.style.display = "block";
      console.error(err);
    }

    function clearError() {
      el("errorBox").textContent = "";
      el("errorBox").style.display = "none";
    }

    function setLoading(active, title = "Carregando arquivo…", detail = "") {
      const overlay = el("loadingOverlay");
      el("loadingTitle").textContent = title;
      el("loadingDetail").textContent = detail;
      overlay.classList.toggle("hidden", !active);
      overlay.setAttribute("aria-hidden", active ? "false" : "true");
      document.body.setAttribute("aria-busy", active ? "true" : "false");
    }

    function yieldForPaint() {
      return new Promise((resolve) => setTimeout(resolve, 30));
    }

    function escapeHtml(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function showBlockingIssue(message) {
      const dialog = el("blockingDialog");
      el("blockingDialogMessage").textContent = String(message || "Revise as informações desta etapa antes de continuar.");
      if (typeof dialog.showModal === "function") dialog.showModal();
      else window.alert(el("blockingDialogMessage").textContent);
    }

    function refreshWizardState() {
      const hasProject = Boolean(state.projectWorkbook);
      const hasProjectMapping = projectConfigurationValid();
      const hasBases = state.bases.length > 0;
      const hasBlockingConflicts = state.conflicts.length > 0;
      for (const button of document.querySelectorAll(".step-button")) {
        const step = Number(button.dataset.stepTarget);
        button.disabled = false;
        const completed = step === 1 ? (hasProject && hasProjectMapping)
          : step === 2 ? (hasBases && !hasBlockingConflicts)
          : state.results.length > 0;
        button.classList.toggle("completed", completed);
        button.classList.toggle("active", step === state.currentPage);
      }
      el("projectNextBtn").disabled = false;
      el("basesNextBtn").disabled = false;
    }

    function goToPage(page) {
      const target = Number(page);
      if ((target === 2 || target === 3) && !state.projectWorkbook) {
        showBlockingIssue("Carregue um arquivo de orçamento antes de continuar.");
        return;
      }
      if ((target === 2 || target === 3) && !projectConfigurationValid()) {
        showBlockingIssue("Conclua o mapeamento das colunas obrigatórias do orçamento antes de continuar.");
        return;
      }
      if (target === 3 && !state.bases.length) {
        showBlockingIssue("Adicione pelo menos uma base de preços antes de continuar para a comparação.");
        return;
      }
      if (target === 3 && state.conflicts.length) {
        showBlockingIssue("Existem duplicidades bloqueantes entre as bases. Corrija ou remova as ocorrências com unidade ou preço divergente antes de continuar.");
        return;
      }
      clearError();
      state.currentPage = target;
      for (const pageEl of document.querySelectorAll(".wizard-page")) {
        pageEl.classList.toggle("page-hidden", Number(pageEl.dataset.page) !== target);
      }
      refreshWizardState();
      if (typeof window.scrollTo === "function") window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function configureDropzone(dropzoneId, onFile) {
      const zone = el(dropzoneId);
      for (const eventName of ["dragenter", "dragover"]) {
        zone.addEventListener(eventName, (evt) => {
          evt.preventDefault();
          zone.classList.add("dragover");
        });
      }
      for (const eventName of ["dragleave", "drop"]) {
        zone.addEventListener(eventName, (evt) => {
          evt.preventDefault();
          zone.classList.remove("dragover");
        });
      }
      zone.addEventListener("drop", (evt) => {
        const file = evt.dataTransfer?.files?.[0];
        if (file) onFile(file);
      });
    }

    function previewNumericParts(value) {
      if (typeof value === "number" && Number.isFinite(value)) return { number: value, prefix: "", suffix: "" };
      const raw = String(value ?? "").trim();
      if (!raw) return null;
      const prefix = /^R\$\s*/i.test(raw) ? "R$ " : "";
      const suffix = /%$/.test(raw) ? "%" : "";
      const numericText = raw.replace(/^R\$\s*/i, "").replace(/%$/, "").trim();
      const brazilian = /^[+\-]?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?$/;
      const decimalOrScientific = /^[+\-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+\-]?\d+)?$/i;
      if (!brazilian.test(numericText) && !decimalOrScientific.test(numericText)) return null;
      const number = parseBrazilianNumber(numericText);
      return Number.isFinite(number) ? { number, prefix, suffix } : null;
    }

    function isPercentageNumberFormat(numberFormat) {
      const visibleFormat = String(numberFormat || "")
        .replace(/"(?:[^"]|"")*"/g, "")
        .replace(/\\./g, "");
      return visibleFormat.includes("%");
    }

    function formatPreviewValue(value, columnIndex, codeColumnIndex, numberFormat = "") {
      const raw = String(value ?? "");
      if (Number(columnIndex) === Number(codeColumnIndex)) return raw;
      const parsed = previewNumericParts(value);
      if (!parsed) return raw;
      const styledAsPercent = !parsed.suffix && isPercentageNumberFormat(numberFormat);
      const numericValue = styledAsPercent ? parsed.number * 100 : parsed.number;
      const formatted = numericValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return `${parsed.prefix}${formatted}${parsed.suffix || (styledAsPercent ? "%" : "")}`;
    }

    function previewCodeColumnIndex(sheet, headerIndex, mappedCodeColumnIndex) {
      const mappedIndex = Number(mappedCodeColumnIndex);
      if (Number.isInteger(mappedIndex)) return mappedIndex;
      const header = sheet?.rows?.[headerIndex] || [];
      const candidates = [];
      header.forEach((value, columnIndex) => {
        if (isHeaderCodeLabel(value) || isGenericHeaderCodeLabel(value)) candidates.push(columnIndex);
      });
      return candidates.length === 1 ? candidates[0] : undefined;
    }

    function selectedPreviewColumns(selections) {
      return selections.filter((selection) => selection.index !== "" && Number.isInteger(Number(selection.index)));
    }

    function previewClassNames(selections, activeField) {
      const activeSelection = selections.find((selection) => selection.field === activeField);
      if (!activeSelection) return "";
      return `preview-selected-column preview-col-${activeSelection.field}`;
    }

    function previewVisibleRowIndexes(rowCount, headerIndex, itemRowIndexes = null, hiddenRows = []) {
      const safeRowCount = Math.max(0, Number(rowCount) || 0);
      if (!safeRowCount) return [];
      const safeHeaderIndex = Math.min(safeRowCount - 1, Math.max(0, Number(headerIndex) || 0));
      const beforeHeader = [];
      for (let index = safeHeaderIndex - 1; index >= 0 && beforeHeader.length < 2; index -= 1) {
        if (!hiddenRows[index]) beforeHeader.unshift(index);
      }
      const headerRows = hiddenRows[safeHeaderIndex] ? [] : [safeHeaderIndex];
      if (Array.isArray(itemRowIndexes)) {
        const acceptedItems = itemRowIndexes
          .filter((rowIndex) => rowIndex > safeHeaderIndex && rowIndex < safeRowCount && !hiddenRows[rowIndex])
          .slice(0, 11);
        return [...beforeHeader, ...headerRows, ...acceptedItems];
      }
      const headerAndItems = [];
      for (let index = safeHeaderIndex; index < safeRowCount && headerAndItems.length < 12; index += 1) {
        if (!hiddenRows[index]) headerAndItems.push(index);
      }
      return [...beforeHeader, ...headerAndItems];
    }

    function renderPreview(tableId, sheet, headerRowNumber, selections = [], activeField = null, itemRowIndexes = null) {
      const table = el(tableId);
      const body = table.tBodies[0];
      table.tHead.innerHTML = "";
      body.innerHTML = "";
      if (!sheet) return;
      if (!Array.isArray(selections)) selections = [{ field: "code", label: "Código", shortLabel: "Código", index: selections }];
      const activeSelections = selectedPreviewColumns(selections);
      const codeSelection = activeSelections.find((selection) => selection.field === "code");
      const byColumn = new Map();
      for (const selection of activeSelections) {
        const index = Number(selection.index);
        if (!byColumn.has(index)) byColumn.set(index, []);
        byColumn.get(index).push(selection);
      }
      const headerIndex = Math.max(0, Number(headerRowNumber || 1) - 1);
      const displayCodeColumnIndex = previewCodeColumnIndex(sheet, headerIndex, codeSelection?.index);
      const visibleIndexes = previewVisibleRowIndexes(sheet.rows.length, headerIndex, itemRowIndexes, sheet.hiddenRows);
      const visibleRows = visibleIndexes.map((rowIndex) => sheet.rows[rowIndex] || []);
      const maxCols = Math.max(1, ...visibleRows.map((row) => row.length));
      const visibleColumns = Array.from({ length: maxCols }, (_, i) => i)
        .filter((i) => !sheet.hiddenColumns?.[i]).slice(0, 60);
      table.tHead.innerHTML = `<tr><th class="row-number">Linha</th>${visibleColumns.map((i) => {
        const columnSelections = byColumn.get(i) || [];
        const labels = columnSelections.map((selection) => selection.shortLabel || selection.label).join(" / ");
        const badge = labels ? `<span class="preview-field-badge">${escapeHtml(labels)}</span>` : "";
        return `<th data-column-index="${i}" class="${previewClassNames(columnSelections, activeField)}">${columns[i] || i + 1}${badge}</th>`;
      }).join("")}</tr>`;
      visibleRows.forEach((row, offset) => {
        const absoluteIndex = visibleIndexes[offset];
        const tr = document.createElement("tr");
        if (absoluteIndex < headerIndex) tr.classList.add("preview-before-header");
        if (absoluteIndex === headerIndex) tr.classList.add("preview-header");
        tr.innerHTML = `<td class="row-number">${absoluteIndex + 1}</td>${visibleColumns.map((i) => {
          const numberFormat = sheet.numberFormats?.[absoluteIndex]?.[i] || "";
          const previewValue = formatPreviewValue(row?.[i] ?? "", i, displayCodeColumnIndex, numberFormat);
          const columnSelections = byColumn.get(i) || [];
          return `<td data-column-index="${i}" class="${previewClassNames(columnSelections, activeField)}" title="${escapeHtml(previewValue)}">${escapeHtml(previewValue)}</td>`;
        }).join("")}`;
        body.appendChild(tr);
      });
    }

    function renderColumnSummary(containerId, tableId, selections, activeField = null) {
      const container = el(containerId);
      container.innerHTML = "";
      for (const selection of selectedPreviewColumns(selections)) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `column-chip field-${selection.field}${selection.field === activeField ? " active" : ""}`;
        button.dataset.previewTable = tableId;
        button.dataset.previewColumn = String(selection.index);
        button.dataset.previewField = selection.field;
        button.title = `Ir para a coluna ${columns[Number(selection.index)] || Number(selection.index) + 1}`;
        button.innerHTML = `<span>${escapeHtml(selection.label)}</span><span class="column-letter">${columns[Number(selection.index)] || Number(selection.index) + 1}</span>`;
        container.appendChild(button);
      }
    }

    function scrollPreviewToColumn(tableId, columnIndex, smooth = true) {
      if (columnIndex === "" || !Number.isInteger(Number(columnIndex))) return;
      const table = el(tableId);
      const wrap = table?.closest(".compact-table-wrap");
      const cell = table?.tHead?.querySelector(`[data-column-index="${Number(columnIndex)}"]`);
      if (!wrap || !cell) return;
      const target = Math.max(0, cell.offsetLeft - (wrap.clientWidth / 2) + (cell.offsetWidth / 2));
      if (typeof wrap.scrollTo === "function") wrap.scrollTo({ left: target, behavior: smooth ? "smooth" : "auto" });
      else wrap.scrollLeft = target;
    }

    function schedulePreviewScroll(tableId, columnIndex) {
      setTimeout(() => scrollPreviewToColumn(tableId, columnIndex), 0);
    }

    function adjustHeaderRow(inputId, delta) {
      const input = el(inputId);
      const min = Number(input.min || 1);
      const max = input.max ? Number(input.max) : Number.POSITIVE_INFINITY;
      const current = Number.isFinite(Number(input.value)) ? Number(input.value) : min;
      let next = Math.min(max, Math.max(min, current + Number(delta)));
      const sheet = inputId === "projectHeaderRow"
        ? sheetByName(state.projectWorkbook, el("projectSheet").value)
        : representativeBaseSheet();
      const step = Number(delta) < 0 ? -1 : 1;
      while (next >= min && next <= max && sheet?.hiddenRows?.[next - 1]) next += step;
      if (next < min || next > max) return;
      if (next === current) return;
      input.value = String(next);
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function arrayBufferToText(buffer) {
      return new TextDecoder("utf-8").decode(buffer);
    }

    function readFileAsArrayBuffer(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
      });
    }

    function detectDelimiter(text) {
      const sample = text.split(/\r?\n/).slice(0, 10).join("\n");
      const delimiters = [";", ",", "\t", "|"];
      let best = ";";
      let bestScore = -1;
      for (const d of delimiters) {
        const score = sample.split("\n").reduce((acc, line) => acc + Math.max(0, line.split(d).length - 1), 0);
        if (score > bestScore) {
          bestScore = score;
          best = d;
        }
      }
      return best;
    }

    function parseCSV(text) {
      const delimiter = detectDelimiter(text);
      const rows = [];
      let row = [];
      let cur = "";
      let inQuotes = false;

      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const next = text[i + 1];

        if (inQuotes) {
          if (ch === '"' && next === '"') {
            cur += '"';
            i++;
          } else if (ch === '"') {
            inQuotes = false;
          } else {
            cur += ch;
          }
        } else {
          if (ch === '"') {
            inQuotes = true;
          } else if (ch === delimiter) {
            row.push(cur);
            cur = "";
          } else if (ch === "\n") {
            row.push(cur.replace(/\r$/, ""));
            rows.push(row);
            row = [];
            cur = "";
          } else {
            cur += ch;
          }
        }
      }
      row.push(cur.replace(/\r$/, ""));
      if (row.length > 1 || row[0] !== "") rows.push(row);
      return rows;
    }

    function u16(view, offset) { return view.getUint16(offset, true); }
    function u32(view, offset) { return view.getUint32(offset, true); }

    async function inflateRaw(buffer) {
      if (typeof DecompressionStream === "undefined") {
        throw new Error("Este navegador não oferece DecompressionStream. Use Chrome ou Edge atual, ou carregue CSV em vez de XLSX.");
      }
      const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return await new Response(stream).arrayBuffer();
    }

    function findEndOfCentralDirectory(bytes) {
      for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 66000); i--) {
        if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) {
          return i;
        }
      }
      throw new Error("Arquivo XLSX inválido: diretório central ZIP não encontrado.");
    }

    async function unzipEntries(arrayBuffer) {
      const bytes = new Uint8Array(arrayBuffer);
      const view = new DataView(arrayBuffer);
      const eocd = findEndOfCentralDirectory(bytes);
      const totalEntries = u16(view, eocd + 10);
      const centralDirOffset = u32(view, eocd + 16);
      const entries = new Map();
      let ptr = centralDirOffset;

      for (let i = 0; i < totalEntries; i++) {
        if (u32(view, ptr) !== 0x02014b50) throw new Error("Arquivo XLSX inválido: cabeçalho central ZIP corrompido.");
        const method = u16(view, ptr + 10);
        const compSize = u32(view, ptr + 20);
        const nameLen = u16(view, ptr + 28);
        const extraLen = u16(view, ptr + 30);
        const commentLen = u16(view, ptr + 32);
        const localOffset = u32(view, ptr + 42);
        const name = new TextDecoder().decode(bytes.slice(ptr + 46, ptr + 46 + nameLen));

        if (u32(view, localOffset) !== 0x04034b50) throw new Error(`Arquivo XLSX inválido: cabeçalho local ausente em ${name}.`);
        const localNameLen = u16(view, localOffset + 26);
        const localExtraLen = u16(view, localOffset + 28);
        const dataStart = localOffset + 30 + localNameLen + localExtraLen;
        const compressed = arrayBuffer.slice(dataStart, dataStart + compSize);
        let data;
        if (method === 0) data = compressed;
        else if (method === 8) data = await inflateRaw(compressed);
        else throw new Error(`Método de compressão ZIP não suportado (${method}) no arquivo ${name}.`);
        entries.set(name.replace(/^\//, ""), data);
        ptr += 46 + nameLen + extraLen + commentLen;
      }
      return entries;
    }

    function parseXml(bufferOrText) {
      const text = typeof bufferOrText === "string" ? bufferOrText : arrayBufferToText(bufferOrText);
      const xml = new DOMParser().parseFromString(text, "application/xml");
      const parserError = xml.getElementsByTagName("parsererror")[0];
      if (parserError) throw new Error(`Erro ao ler XML do XLSX: ${parserError.textContent}`);
      return xml;
    }

    function colLettersToIndex(ref) {
      const letters = String(ref || "").match(/[A-Z]+/i)?.[0]?.toUpperCase() || "A";
      let n = 0;
      for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
      return n - 1;
    }

    function getTextFromSi(si) {
      const parts = [...si.getElementsByTagName("t")].map((t) => t.textContent || "");
      return parts.join("");
    }

    function parseSharedStrings(entries) {
      if (!entries.has("xl/sharedStrings.xml")) return [];
      const xml = parseXml(entries.get("xl/sharedStrings.xml"));
      return [...xml.getElementsByTagName("si")].map(getTextFromSi);
    }

    function parseXlsxNumberFormats(entries) {
      if (!entries.has("xl/styles.xml")) return [];
      const xml = parseXml(entries.get("xl/styles.xml"));
      const builtIn = new Map([
        [0, "General"], [1, "0"], [2, "0.00"], [3, "#,##0"], [4, "#,##0.00"],
        [9, "0%"], [10, "0.00%"], [14, "mm-dd-yy"], [49, "@"],
      ]);
      const custom = new Map();
      for (const numFmt of [...xml.getElementsByTagName("numFmt")]) {
        custom.set(Number(numFmt.getAttribute("numFmtId")), numFmt.getAttribute("formatCode") || "");
      }
      const cellXfs = xml.getElementsByTagName("cellXfs")[0];
      if (!cellXfs) return [];
      return [...cellXfs.children]
        .filter((node) => node.localName === "xf" || node.nodeName.endsWith(":xf"))
        .map((xf) => {
          const id = Number(xf.getAttribute("numFmtId") || 0);
          return custom.get(id) || builtIn.get(id) || "";
        });
    }

    function splitFormulaArguments(text) {
      const args = [];
      let current = "";
      let depth = 0;
      let inString = false;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const next = text[i + 1];
        if (ch === '"') {
          current += ch;
          if (inString && next === '"') {
            current += next;
            i++;
          } else {
            inString = !inString;
          }
          continue;
        }
        if (!inString) {
          if (ch === "(") depth++;
          else if (ch === ")") depth--;
          else if ((ch === "," || ch === ";") && depth === 0) {
            args.push(current.trim());
            current = "";
            continue;
          }
        }
        current += ch;
      }
      args.push(current.trim());
      return args;
    }

    function hyperlinkFormulaLabel(formula) {
      const normalized = String(formula || "").trim().replace(/^=/, "");
      const match = normalized.match(/^(?:_xlfn\.)?HYPERLINK\s*\(([\s\S]*)\)$/i);
      if (!match) return null;
      const args = splitFormulaArguments(match[1]);
      if (args.length < 2) return null;
      const label = args[1].trim();
      if (/^"(?:[^"]|"")*"$/.test(label)) return label.slice(1, -1).replaceAll('""', '"');
      if (/^[+\-]?\d+(?:\.\d+)?$/.test(label)) return label;
      return null;
    }

    function cellText(cell, sharedStrings) {
      const type = cell.getAttribute("t");
      if (type === "inlineStr") {
        const t = cell.getElementsByTagName("t")[0];
        return t ? t.textContent || "" : "";
      }
      const formulaNode = cell.getElementsByTagName("f")[0];
      const formulaLabel = hyperlinkFormulaLabel(formulaNode?.textContent || "");
      if (formulaLabel !== null) return formulaLabel;
      const v = cell.getElementsByTagName("v")[0];
      const raw = v ? v.textContent || "" : "";
      if (type === "s") return sharedStrings[Number(raw)] ?? "";
      if (type === "b") return raw === "1" ? "VERDADEIRO" : "FALSO";
      return raw;
    }

    function parseSheetData(sheetXmlBuffer, sharedStrings, styleFormats = []) {
      const xml = parseXml(sheetXmlBuffer);
      const rows = [];
      const numberFormats = [];
      const rowNodes = [...xml.getElementsByTagName("row")];
      for (const rowNode of rowNodes) {
        const rAttr = rowNode.getAttribute("r");
        const rowIndex = rAttr ? Number(rAttr) - 1 : rows.length;
        const row = rows[rowIndex] || [];
        const formatRow = numberFormats[rowIndex] || [];
        const cells = [...rowNode.getElementsByTagName("c")];
        let fallbackIndex = 0;
        for (const c of cells) {
          const ref = c.getAttribute("r");
          const colIndex = ref ? colLettersToIndex(ref) : fallbackIndex;
          row[colIndex] = cellText(c, sharedStrings);
          const styleIndex = Number(c.getAttribute("s") || 0);
          formatRow[colIndex] = styleFormats[styleIndex] || "";
          fallbackIndex = colIndex + 1;
        }
        rows[rowIndex] = row;
        numberFormats[rowIndex] = formatRow;
      }
      return {
        rows: Array.from({ length: rows.length }, (_, index) => rows[index] || []),
        numberFormats: Array.from({ length: rows.length }, (_, index) => numberFormats[index] || []),
      };
    }

    function parseSheetRows(sheetXmlBuffer, sharedStrings, styleFormats = []) {
      return parseSheetData(sheetXmlBuffer, sharedStrings, styleFormats).rows;
    }

    function resolveSheetTarget(target) {
      let normalized = target.replace(/^\//, "");
      if (!normalized.startsWith("xl/")) normalized = "xl/" + normalized;
      return normalized.replaceAll("\\", "/");
    }

    async function parseXlsx(arrayBuffer) {
      return globalThis.SicorpCore.readWorkbookFile({ fileName: "planilha.xlsx", bytes: arrayBuffer }, {
        spreadsheetRuntime: await ensureLegacyXlsReader(),
      });
    }

    let legacyXlsReaderPromise = null;

    async function ensureLegacyXlsReader() {
      if (globalThis.XLSX?.read && globalThis.XLSX?.utils) return globalThis.XLSX;
      if (!legacyXlsReaderPromise) {
        legacyXlsReaderPromise = (async () => {
          if (typeof DecompressionStream === "undefined") {
            throw new Error("Este navegador não oferece o recurso necessário para ler arquivos XLS antigos. Use Chrome ou Edge atual.");
          }
          const payload = el("legacyXlsRuntime")?.textContent?.replace(/\s+/g, "") || "";
          if (!payload) throw new Error("O leitor de arquivos XLS antigos não está disponível neste arquivo.");
          const compressed = Uint8Array.from(atob(payload), (character) => character.charCodeAt(0));
          const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("gzip"));
          const source = await new Response(stream).text();
          new Function(source)();
          if (!globalThis.XLSX?.read || !globalThis.XLSX?.utils) {
            throw new Error("Não foi possível inicializar o leitor de arquivos XLS antigos.");
          }
          return globalThis.XLSX;
        })();
      }
      return legacyXlsReaderPromise;
    }

    async function parseLegacyXls(arrayBuffer) {
      return globalThis.SicorpCore.readWorkbookFile({ fileName: "planilha.xls", bytes: arrayBuffer }, {
        spreadsheetRuntime: await ensureLegacyXlsReader(),
      });
    }

    /* SICORP_V41_READER_INTEGRATION_START */
    function updateOrseLoadingStage(fileName, stage, fraction, detail = null) {
      const percent = Math.max(0, Math.min(100, Math.round((Number(fraction) || 0) * 100)));
      const titles = {
        decrypt: "Decodificando arquivo ORSE…",
        extract: "Extraindo tabelas do ORSE…",
        parse: "Preparando insumos e serviços…",
        done: "Gerando a planilha Excel…",
      };
      const table = detail?.name ? ` · ${detail.name}` : "";
      setLoading(true, titles[stage] || "Convertendo arquivo ORSE…", `${fileName} · ${percent}%${table}`);
    }

    async function loadWorkbook(file) {
      const buffer = await readFileAsArrayBuffer(file);
      const isOrse = /\.orse$/i.test(file.name || "");
      const binary = /\.xlsx?$/i.test(file.name || "") || isOrse;
      const spreadsheetRuntime = binary ? await ensureLegacyXlsReader() : undefined;
      if (isOrse) {
        const converted = await globalThis.SicorpCore.convertOrseFile({
          fileName: file.name,
          bytes: buffer,
          onStage: (stage, fraction, detail) => updateOrseLoadingStage(file.name, stage, fraction, detail),
        });
        const xlsxBytes = globalThis.SicorpCore.writeOrseWorkbookXlsx(
          converted.exportWorkbook,
          spreadsheetRuntime,
        );
        downloadBlob(
          xlsxBytes,
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          converted.outputFileName,
        );
        return converted.workbook;
      }
      return globalThis.SicorpCore.readWorkbookFile({
        fileName: file.name,
        bytes: buffer,
      }, { spreadsheetRuntime });
    }
    /* SICORP_V41_READER_INTEGRATION_END */
    function sheetByName(workbook, name) {
      return workbook?.sheets.find((s) => s.name === name) || null;
    }

    function getHeader(sheet, headerRowNumber) {
      const idx = Math.max(0, Number(headerRowNumber || 1) - 1);
      const header = [...(sheet?.rows[idx] || [])];
      Object.defineProperty(header, "hiddenColumns", { value: sheet?.hiddenColumns || [] });
      return header;
    }

    function nonEmptyRows(rows) {
      return rows.filter((r) => r && r.some((c) => String(c ?? "").trim() !== "")).length;
    }

    function columnName(index, header) {
      const letter = columns[index] || `Col ${index + 1}`;
      const title = String(header[index] ?? "").trim();
      return title ? `${letter} — ${title}` : `${letter} — sem título`;
    }

    function populateSheetSelect(select, workbook, includeAll = false) {
      select.innerHTML = "";
      if (!workbook) {
        select.disabled = true;
        return;
      }
      if (includeAll) {
        const opt = document.createElement("option");
        opt.value = "__ALL__";
        opt.textContent = "Todas as abas";
        select.appendChild(opt);
      }
      for (const sheet of workbook.sheets) {
        const opt = document.createElement("option");
        opt.value = sheet.name;
        opt.textContent = `${sheet.name} (${nonEmptyRows(sheet.rows)} linhas)`;
        select.appendChild(opt);
      }
      select.disabled = false;
    }

    function populateColumnSelect(select, header, optional = false, blankLabel = "Não usar") {
      select.innerHTML = "";
      if (optional) {
        const blank = document.createElement("option");
        blank.value = "";
        blank.textContent = blankLabel;
        select.appendChild(blank);
      }
      const max = Math.max(header.length, 12);
      for (let i = 0; i < max; i++) {
        if (header.hiddenColumns?.[i]) continue;
        const opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = columnName(i, header);
        select.appendChild(opt);
      }
      select.disabled = false;
    }

    function findColumn(header, patterns) {
      const normalized = Array.from(header || [], (h) => normalizeText(h));
      for (const pattern of patterns) {
        const idx = normalized.findIndex((h) => pattern.test(h));
        if (idx >= 0) return idx;
      }
      return -1;
    }

    function normalizeText(v) {
      return String(v ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    }

    function normalizedHeaderText(value) {
      return normalizeText(value).replace(/\s+/g, " ");
    }

    function isHeaderCodeLabel(value) {
      const text = normalizedHeaderText(value);
      return text.length <= 80 && /^(?:cod|codigo)(?:\b|[.:_\-/])/.test(text);
    }

    function isGenericHeaderCodeLabel(value) {
      const text = normalizedHeaderText(value);
      return text.length <= 80 && /^(?:insumo|item|composicao|servico)(?:\b|[.:_\-/])/.test(text);
    }

    function headerFieldsInRow(row) {
      const fields = new Set();
      for (const value of row || []) {
        const text = normalizedHeaderText(value);
        if (!text || text.length > 100) continue;
        if (isHeaderCodeLabel(text)) fields.add("code");
        if (/\bdescricao\b|^servico\b|^insumo\b/.test(text)) fields.add("description");
        if (/^unid(?:ade)?\b|^und\b|\bunidade\b/.test(text)) fields.add("unit");
        if (/^(?:fonte|base|banco|referencia|ref\.?)(?:\b|$)/.test(text)) fields.add("source");
        if (/\bquantidade\b|^qtd\b|^quant\b|\bcoeficiente\b/.test(text)) fields.add("quantity");
        if (/\bpreco\b|\bcusto\b|^valor(?:\b|\s*\()|\bvalor\s+unitario\b|\bvalor\s+mediano\b|\b[cp]\.\s*unit\b/.test(text)) fields.add("price");
        if (/\b(?:preco|custo|valor)\b.*\bsem\s+bdi\b/.test(text)) fields.add("priceWithoutBdi");
        if (/\b(?:preco|custo|valor)\b.*\bcom\s+bdi\b/.test(text)) fields.add("priceWithBdi");
        if (/^c\.\s*unit\b/.test(text)) fields.add("priceWithoutBdi");
        if (/^p\.\s*unit\b/.test(text)) fields.add("priceWithBdi");
        if (/^bdi\b|\bbdi\s*\(%?\)/.test(text)) fields.add("bdi");
        if (/\bvalor\s+total\b|\bpreco\s+total\b|\bcusto\s+total\b|^total$/.test(text)) fields.add("total");
      }
      return fields;
    }

    function detectHeaderRow(sheet, profile = "base") {
      if (!sheet?.rows?.length) return null;
      for (let rowIndex = 0; rowIndex < sheet.rows.length; rowIndex++) {
        const row = sheet.rows[rowIndex] || [];
        const explicitCodeColumns = [];
        const genericCodeColumns = [];
        row.forEach((value, columnIndex) => {
          if (isHeaderCodeLabel(value)) explicitCodeColumns.push(columnIndex);
          else if (isGenericHeaderCodeLabel(value)) genericCodeColumns.push(columnIndex);
        });
        const codeColumns = explicitCodeColumns.length ? explicitCodeColumns : genericCodeColumns;
        if (!codeColumns.length) continue;

        const fields = headerFieldsInRow(row);
        fields.add("code");
        const previousHeaderBand = rowIndex > 0 ? headerFieldsInRow(sheet.rows[rowIndex - 1] || []) : new Set();
        const hasPrice = fields.has("price") || fields.has("priceWithoutBdi") || fields.has("priceWithBdi")
          || previousHeaderBand.has("price") || previousHeaderBand.has("priceWithoutBdi") || previousHeaderBand.has("priceWithBdi");
        const requiredFieldsPresent = profile === "project"
          ? fields.has("description") && fields.has("unit") && fields.has("quantity") && hasPrice
          : fields.has("description") && fields.has("unit") && hasPrice;
        if (!requiredFieldsPresent) continue;

        for (const codeColumn of codeColumns) {
          let dataCount = 0;
          const validationEnd = Math.min(sheet.rows.length, rowIndex + 31);
          for (let dataRow = rowIndex + 1; dataRow < validationEnd; dataRow++) {
            const candidateRow = sheet.rows[dataRow] || [];
            const rawCode = String(candidateRow[codeColumn] ?? "").trim();
            if (!candidateRow.some((value) => String(value ?? "").trim())) continue;
            if (rawCode && rawCode.length <= 100 && !isHeaderCodeLabel(rawCode) && !isGenericHeaderCodeLabel(rawCode)) dataCount++;
            if (dataCount >= 1) break;
          }
          if (!dataCount) continue;
          return { rowNumber: rowIndex + 1, codeColumn, fields: [...fields], dataCount };
        }
      }
      return null;
    }

    function detectAndApplyHeader(kind) {
      const isProject = kind === "project";
      const sheet = isProject
        ? sheetByName(state.projectWorkbook, el("projectSheet").value)
        : representativeBaseSheet();
      const input = el(isProject ? "projectHeaderRow" : "baseHeaderRow");
      const result = detectHeaderRow(sheet, isProject ? "project" : "base");
      input.max = String(Math.max(1, sheet?.rows?.length || 1));
      if (result) {
        input.value = String(result.rowNumber);
      } else {
        input.value = "1";
      }
      if (isProject) updateProjectColumns();
      else updateBaseColumns();
      return result;
    }

    const projectPreviewFieldDefinitions = [
      { selectId: "projectCodeCol", field: "code", label: "Código", shortLabel: "Código" },
      { selectId: "projectSourceCol", field: "source", label: "Base / referência", shortLabel: "Base" },
      { selectId: "projectDescCol", field: "description", label: "Descrição", shortLabel: "Descrição" },
      { selectId: "projectUnitCol", field: "unit", label: "Unidade", shortLabel: "Unidade" },
      { selectId: "projectQuantityCol", field: "quantity", label: "Quantidade", shortLabel: "Qtd." },
      { selectId: "projectWithoutBdiCol", field: "priceWithoutBdi", label: "Preço sem BDI", shortLabel: "Sem BDI" },
      { selectId: "projectBdiCol", field: "bdi", label: "BDI (%)", shortLabel: "BDI" },
      { selectId: "projectWithBdiCol", field: "priceWithBdi", label: "Preço com BDI", shortLabel: "Com BDI" },
    ];

    const basePreviewFieldDefinitions = [
      { selectId: "baseCodeCol", field: "code", label: "Código", shortLabel: "Código" },
      { selectId: "baseDescCol", field: "description", label: "Descrição", shortLabel: "Descrição" },
      { selectId: "baseUnitCol", field: "unit", label: "Unidade", shortLabel: "Unidade" },
      { selectId: "baseValueCol", field: "price", label: "Preço", shortLabel: "Preço" },
    ];

    function previewSelectionsFromDefinitions(definitions) {
      return definitions.map((definition) => ({
        field: definition.field,
        label: definition.label,
        shortLabel: definition.shortLabel,
        index: el(definition.selectId).value,
      }));
    }

    function projectPreviewSelections() {
      return previewSelectionsFromDefinitions(projectPreviewFieldDefinitions);
    }

    function basePreviewSelections() {
      return previewSelectionsFromDefinitions(basePreviewFieldDefinitions);
    }

    function previewSelectionsWithOverride(selections, focusField, previewColumn) {
      if (!focusField || previewColumn === undefined) return selections;
      return selections.map((selection) => selection.field === focusField
        ? { ...selection, index: previewColumn }
        : selection);
    }

    function renderProjectPreview(focusField = null, previewColumn = undefined) {
      const sheet = sheetByName(state.projectWorkbook, el("projectSheet").value);
      const selections = previewSelectionsWithOverride(projectPreviewSelections(), focusField, previewColumn);
      const analysis = getProjectAnalysis();
      renderPreview(
        "projectPreviewTable",
        sheet,
        el("projectHeaderRow").value,
        selections,
        focusField
      );
      renderColumnSummary("projectColumnSummary", "projectPreviewTable", selections, focusField);
      renderProjectFilterSummary(analysis);
      if (focusField) schedulePreviewScroll("projectPreviewTable", selections.find((item) => item.field === focusField)?.index);
    }

    function renderBasePreview(focusField = null, previewColumn = undefined) {
      const sheet = representativeBaseSheet();
      const selections = previewSelectionsWithOverride(basePreviewSelections(), focusField, previewColumn);
      const analysis = getPendingBaseAnalysis();
      renderPreview("basePreviewTable", sheet, el("baseHeaderRow").value, selections, focusField);
      renderColumnSummary("baseColumnSummary", "basePreviewTable", selections, focusField);
      renderBaseFilterSummary(analysis);
      if (focusField) schedulePreviewScroll("basePreviewTable", selections.find((item) => item.field === focusField)?.index);
    }

    let previewSelectMenuState = null;

    function renderPreviewSelectCandidate(kind, field, columnIndex) {
      if (kind === "project") renderProjectPreview(field, columnIndex);
      else renderBasePreview(field, columnIndex);
    }

    function closePreviewSelectMenu(clearPreviewHighlight = true) {
      if (!previewSelectMenuState) return;
      const { menu, kind } = previewSelectMenuState;
      previewSelectMenuState = null;
      menu.remove();
      if (clearPreviewHighlight) renderPreviewSelectCandidate(kind, null, undefined);
    }

    function positionPreviewSelectMenu(menu, select) {
      const rect = select.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
      const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
      const width = Math.max(rect.width, 220);
      menu.style.width = `${Math.min(width, viewportWidth - 16)}px`;
      let left = Math.max(8, Math.min(rect.left, viewportWidth - menu.offsetWidth - 8));
      let top = rect.bottom + 4;
      if (top + menu.offsetHeight > viewportHeight - 8 && rect.top > menu.offsetHeight + 12) {
        top = rect.top - menu.offsetHeight - 4;
      }
      menu.style.left = `${left}px`;
      menu.style.top = `${Math.max(8, top)}px`;
    }

    function openPreviewSelectMenu(select, kind, field) {
      closePreviewSelectMenu(true);
      const menu = document.createElement("div");
      menu.className = "preview-select-menu";
      menu.setAttribute("role", "listbox");
      menu.setAttribute("aria-label", select.previousElementSibling?.textContent || "Selecionar coluna");
      for (const option of [...select.options]) {
        const item = document.createElement("button");
        item.type = "button";
        item.className = `preview-select-option${option.value === select.value ? " selected" : ""}`;
        item.setAttribute("role", "option");
        item.setAttribute("aria-selected", option.value === select.value ? "true" : "false");
        item.textContent = option.textContent;
        item.addEventListener("pointerenter", () => {
          for (const sibling of menu.querySelectorAll(".preview-select-option")) sibling.classList.remove("previewing");
          item.classList.add("previewing");
          renderPreviewSelectCandidate(kind, field, option.value);
        });
        item.addEventListener("click", (event) => {
          event.preventDefault();
          const chosenValue = option.value;
          previewSelectMenuState = null;
          menu.remove();
          select.value = chosenValue;
          select.dispatchEvent(new Event("change", { bubbles: true }));
          select.focus({ preventScroll: true });
        });
        menu.appendChild(item);
      }
      document.body.appendChild(menu);
      previewSelectMenuState = { menu, select, kind, field };
      positionPreviewSelectMenu(menu, select);
      renderPreviewSelectCandidate(kind, field, select.value);
      const selectedOption = menu.querySelector(".selected");
      if (typeof selectedOption?.scrollIntoView === "function") {
        selectedOption.scrollIntoView({ block: "nearest" });
      }
    }

    function configurePreviewColumnSelect(select, kind, field) {
      select.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || select.disabled) return;
        event.preventDefault();
        select.focus({ preventScroll: true });
        openPreviewSelectMenu(select, kind, field);
      });
    }

    function selectIfFound(select, idx) {
      if (idx >= 0) select.value = String(idx);
    }

    function findProjectBudgetColumns(header) {
      const normalized = Array.from(header || [], (value) => normalizedHeaderText(value));
      const hasPriceWord = (text) => /\b(?:preco|valor|custo)\b/.test(text);
      const isTotal = (text) => /\btotal\b/.test(text);
      const isWithBdi = (text) => /\bcom\s+(?:o\s+)?bdi\b|\bc\s*\/\s*bdi\b/.test(text);
      const isWithoutBdi = (text) => /\bsem\s+bdi\b|\bs\s*\/\s*bdi\b/.test(text);
      let withoutBdi = normalized.findIndex((text) => hasPriceWord(text) && !isTotal(text) && isWithoutBdi(text));
      let withBdi = normalized.findIndex((text) => hasPriceWord(text) && !isTotal(text) && isWithBdi(text));
      const bdi = normalized.findIndex((text) => /\bbdi\b/.test(text) && !hasPriceWord(text));
      const abbreviatedCost = normalized.findIndex((text) => /^c\.?\s*unit(?:ario)?\b/.test(text));
      const abbreviatedPrice = normalized.findIndex((text) => /^p\.?\s*unit(?:ario)?\b/.test(text));
      if (bdi >= 0 && abbreviatedCost >= 0 && abbreviatedPrice >= 0) {
        if (withoutBdi < 0) withoutBdi = abbreviatedCost;
        if (withBdi < 0) withBdi = abbreviatedPrice;
      }
      const explicitGenericUnitPrice = normalized.findIndex((text) =>
        hasPriceWord(text) && !isTotal(text) && !/\bbdi\b/.test(text)
        && (/\bunit/.test(text) || /\bmediano\b/.test(text) || /\breferencia\b/.test(text))
      );
      const genericCandidates = normalized
        .map((text, index) => ({ text, index }))
        .filter(({ text }) => hasPriceWord(text) && !isTotal(text) && !/\bbdi\b/.test(text));
      const genericUnitPrice = explicitGenericUnitPrice >= 0
        ? explicitGenericUnitPrice
        : genericCandidates.length === 1 ? genericCandidates[0].index : -1;
      return {
        withoutBdi: withoutBdi >= 0 ? withoutBdi : genericUnitPrice,
        bdi,
        withBdi,
      };
    }

    function findProjectSourceColumn(header) {
      return findColumn(header, [
        /^(?:fonte|base|banco|referencia|referencia de preco|ref\.?)$/,
        /^(?:fonte|base|banco|referencia|ref\.?)\b/,
        /\bfonte\b/, /\bbanco\b/, /\breferencia\b/
      ]);
    }

    function normalizeSourceKey(value) {
      return normalizeText(value).replace(/[^a-z0-9]+/g, " ").trim();
    }

    function projectSourceMapping() {
      const sourceCol = el("projectSourceCol")?.value ?? "";
      return { sourceCol, valid: sourceCol !== "" };
    }

    function projectItemMapping() {
      const codeCol = el("projectCodeCol")?.value ?? "";
      const descriptionCol = el("projectDescCol")?.value ?? "";
      const unitCol = el("projectUnitCol")?.value ?? "";
      const quantityCol = el("projectQuantityCol")?.value ?? "";
      const sourceCol = el("projectSourceCol")?.value ?? "";
      return {
        codeCol,
        descriptionCol,
        unitCol,
        quantityCol,
        sourceCol,
        valid: [codeCol, descriptionCol, unitCol, quantityCol, sourceCol].every((value) => value !== ""),
      };
    }

    function projectRowEligibility(row) {
      const mapping = projectItemMapping();
      if (!mapping.valid || !projectPriceMapping().valid) return { eligible: false, problems: ["Mapeamento incompleto"] };
      const rawCode = cell(row, mapping.codeCol);
      const code = normalizeCode(rawCode);
      const description = String(cell(row, mapping.descriptionCol) ?? "").trim().replace(/\s+/g, " ");
      const unit = String(cell(row, mapping.unitCol) ?? "").trim().replace(/\s+/g, " ");
      const quantityRaw = cell(row, mapping.quantityCol);
      const quantity = parseBrazilianNumber(quantityRaw);
      const source = String(cell(row, mapping.sourceCol) ?? "").trim().replace(/\s+/g, " ");
      const sourceKey = normalizeSourceKey(source);
      const projectPrice = projectPriceForRow(row);
      const problems = [];
      if (!code || isHeaderCodeLabel(rawCode) || isGenericHeaderCodeLabel(rawCode)) problems.push("Código ausente ou inválido");
      if (!sourceKey) problems.push("Fonte/base de referência ausente");
      if (!description) problems.push("Descrição ausente");
      if (!unit) problems.push("Unidade ausente");
      return {
        eligible: problems.length === 0,
        problems,
        rawCode,
        code,
        description,
        unit,
        quantityRaw,
        quantity,
        source,
        sourceKey,
        projectPrice,
      };
    }

    function projectAnalysisCacheKey() {
      const mapping = projectItemMapping();
      const prices = projectPriceMapping();
      return JSON.stringify([
        el("projectSheet")?.value || "",
        el("projectHeaderRow")?.value || "",
        mapping.codeCol,
        mapping.descriptionCol,
        mapping.unitCol,
        mapping.quantityCol,
        mapping.sourceCol,
        prices.withoutBdiCol,
        prices.bdiCol,
        prices.withBdiCol,
        Boolean(el("normalizeCodes")?.checked),
        Boolean(el("caseInsensitive")?.checked),
      ]);
    }

    function analyzeProjectRows() {
      const empty = { ready: false, validItems: [], acceptedRowIndexes: [], reviewRows: [], discardedCount: 0 };
      if (!state.projectWorkbook || !projectItemMapping().valid || !projectPriceMapping().valid) return empty;
      const sheet = sheetByName(state.projectWorkbook, el("projectSheet").value);
      if (!sheet) return empty;
      const headerRow = Math.max(0, Number(el("projectHeaderRow").value || 1) - 1);
      const validItems = [];
      const acceptedRowIndexes = [];
      const reviewRows = [];
      const preHeaderMapping = projectItemMapping();
      const preHeaderPriceMapping = projectPriceMapping();
      for (let rowIndex = 0; rowIndex < headerRow; rowIndex++) {
        const row = sheet.rows[rowIndex] || [];
        if (!rowHasContent(row)) continue;
        const withoutBdiRaw = cell(row, preHeaderPriceMapping.withoutBdiCol);
        const withBdiRaw = cell(row, preHeaderPriceMapping.withBdiCol);
        reviewRows.push(reviewEntry({
          reason: "Antes do cabeçalho",
          reasonDetails: ["Linha anterior ao cabeçalho selecionado; exibida apenas como contexto na pré-visualização."],
          fileName: state.projectWorkbook.fileName,
          sheet: sheet.name,
          rowNumber: rowIndex + 1,
          code: cell(row, preHeaderMapping.codeCol),
          source: cell(row, preHeaderMapping.sourceCol),
          description: cell(row, preHeaderMapping.descriptionCol),
          unit: cell(row, preHeaderMapping.unitCol),
          quantity: cell(row, preHeaderMapping.quantityCol),
          price: [withoutBdiRaw, withBdiRaw].filter(hasCellValue).map(compactCellText).join(" / "),
        }));
      }
      for (let rowIndex = headerRow + 1; rowIndex < sheet.rows.length; rowIndex++) {
        const row = sheet.rows[rowIndex] || [];
        if (!rowHasContent(row)) continue;
        const mapping = projectItemMapping();
        const priceMapping = projectPriceMapping();
        const codeRaw = cell(row, mapping.codeCol);
        const sourceRaw = cell(row, mapping.sourceCol);
        const descriptionRaw = cell(row, mapping.descriptionCol);
        const unitRaw = cell(row, mapping.unitCol);
        const quantityRaw = cell(row, mapping.quantityCol);
        const withoutBdiRaw = cell(row, priceMapping.withoutBdiCol);
        const withBdiRaw = cell(row, priceMapping.withBdiCol);
        const priceRaw = [withoutBdiRaw, withBdiRaw].filter(hasCellValue).map(compactCellText).join(" / ");

        if (isRepeatedProjectHeader(row, sheet)) {
          reviewRows.push(reviewEntry({
            reason: "Cabeçalho repetido",
            fileName: state.projectWorkbook.fileName,
            sheet: sheet.name,
            rowNumber: rowIndex + 1,
            code: codeRaw,
            source: sourceRaw,
            description: descriptionRaw,
            unit: unitRaw,
            quantity: quantityRaw,
            price: priceRaw,
          }));
          continue;
        }

        const item = projectRowEligibility(row);
        if (item.eligible) {
          validItems.push({ rowIndex, row, item });
          acceptedRowIndexes.push(rowIndex);
          continue;
        }

        const structural = !normalizeCode(codeRaw)
          || !normalizeSourceKey(sourceRaw)
          || !compactCellText(descriptionRaw)
          || !compactCellText(unitRaw);
        reviewRows.push(reviewEntry({
          reason: structural ? "Linha estrutural" : "Linha desconsiderada",
          reasonDetails: item.problems,
          fileName: state.projectWorkbook.fileName,
          sheet: sheet.name,
          rowNumber: rowIndex + 1,
          code: codeRaw,
          source: sourceRaw,
          description: descriptionRaw,
          unit: unitRaw,
          quantity: quantityRaw,
          price: priceRaw,
        }));
      }
      return { ready: true, validItems, acceptedRowIndexes, reviewRows, discardedCount: reviewRows.length };
    }

    function getProjectAnalysis() {
      const key = projectAnalysisCacheKey();
      if (state.projectAnalysisCache?.key === key) return state.projectAnalysisCache.value;
      const value = analyzeProjectRows();
      state.projectAnalysisCache = { key, value };
      return value;
    }

    function invalidateProjectAnalysis() {
      state.projectAnalysisCache = null;
    }

    function renderProjectFilterSummary(analysis = getProjectAnalysis()) {
      const button = el("projectReviewBtn");
      const rows = analysis.reviewRows || [];
      button.disabled = !rows.length;
      button.textContent = `Revisar linhas (${rows.length})`;
      el("projectFilterSummary").innerHTML = analysis.ready
        ? `<span><strong>${analysis.validItems.length}</strong> item(ns) aceito(s)</span><span><strong>${analysis.discardedCount}</strong> linha(s) desconsiderada(s)</span>`
        : `<span>Conclua o mapeamento para filtrar os itens.</span>`;
    }

    function projectConfigurationValid() {
      return projectItemMapping().valid && projectPriceMapping().valid && projectSourceIdentifierOptions().length > 0;
    }

    function projectSourceIdentifierOptions() {
      if (!state.projectWorkbook || !projectItemMapping().valid) return [];
      const byKey = new Map();
      for (const { item } of getProjectAnalysis().validItems) {
        const { source: label, sourceKey: key } = item;
        if (!byKey.has(key)) byKey.set(key, { key, label, count: 0 });
        byKey.get(key).count++;
      }
      return [...byKey.values()];
    }

    function renderProjectSourceIdentifiers() {
      const container = el("projectSourceIdentifiers");
      const options = projectSourceIdentifierOptions();
      container.innerHTML = "";
      if (!options.length) {
        const empty = document.createElement("span");
        empty.className = "source-identifiers-empty";
        empty.textContent = projectItemMapping().valid
          ? "Nenhum identificador foi encontrado nas linhas de itens."
          : "Selecione as colunas Código, Descrição, Unidade, Quantidade e Fonte.";
        container.appendChild(empty);
        return;
      }
      for (const option of options) {
        const chip = document.createElement("span");
        chip.className = "source-identifier-chip";
        chip.textContent = option.label;
        chip.title = `${option.count} item(ns) identificado(s)`;
        container.appendChild(chip);
      }
    }

    function projectPriceMapping() {
      const withoutBdiCol = el("projectWithoutBdiCol")?.value ?? "";
      const bdiCol = el("projectBdiCol")?.value ?? "";
      const withBdiCol = el("projectWithBdiCol")?.value ?? "";
      const direct = withoutBdiCol !== "";
      const hasBdi = bdiCol !== "";
      const hasWithBdi = withBdiCol !== "";
      const calculated = hasBdi && hasWithBdi;
      const calculateWithBdi = direct && hasBdi;
      return { withoutBdiCol, bdiCol, withBdiCol, direct, hasBdi, hasWithBdi, calculated, calculateWithBdi, valid: direct || calculated };
    }

    function renderProjectPriceRule() {
      const message = el("projectPriceRule");
      const mapping = projectPriceMapping();
      message.className = `audit-message${mapping.valid ? "" : " warn"}`;
      if (mapping.direct && mapping.calculated) {
        message.textContent = "O preço sem BDI informado será usado. Se estiver vazio em alguma linha, o programa tentará calculá-lo usando o preço com BDI e o percentual de BDI.";
      } else if (mapping.calculateWithBdi) {
        message.textContent = "O preço sem BDI informado será usado na comparação e o preço com BDI será calculado por linha: preço sem BDI × (1 + BDI).";
      } else if (mapping.direct) {
        message.textContent = "O preço sem BDI informado será usado diretamente na comparação.";
      } else if (mapping.calculated) {
        message.textContent = "O preço sem BDI será calculado por linha: preço com BDI ÷ (1 + BDI).";
      } else {
        message.textContent = "Selecione a coluna Preço sem BDI ou selecione, em conjunto, as colunas BDI (%) e Preço com BDI.";
      }
    }

    function updateProjectColumns() {
      invalidateProjectAnalysis();
      const sheet = sheetByName(state.projectWorkbook, el("projectSheet").value);
      const header = getHeader(sheet, el("projectHeaderRow").value);
      populateColumnSelect(el("projectCodeCol"), header, false);
      populateColumnSelect(el("projectDescCol"), header, true, "Selecione uma coluna");
      populateColumnSelect(el("projectUnitCol"), header, true, "Selecione uma coluna");
      populateColumnSelect(el("projectQuantityCol"), header, true, "Selecione uma coluna");
      populateColumnSelect(el("projectSourceCol"), header, true, "Selecione uma coluna");
      populateColumnSelect(el("projectWithoutBdiCol"), header, true);
      populateColumnSelect(el("projectBdiCol"), header, true);
      populateColumnSelect(el("projectWithBdiCol"), header, true);

      selectIfFound(el("projectCodeCol"), findColumn(header, [/^cod/i, /codigo/, /composicao/, /item/i]));
      selectIfFound(el("projectDescCol"), findColumn(header, [/descricao/, /servico/, /composicao/, /insumo/]));
      selectIfFound(el("projectUnitCol"), findColumn(header, [/^unid/, /^und/, /unidade/]));
      selectIfFound(el("projectQuantityCol"), findColumn(header, [/quantidade/, /^qtd\b/, /^quant\b/, /coeficiente/]));
      selectIfFound(el("projectSourceCol"), findProjectSourceColumn(header));
      const priceColumns = findProjectBudgetColumns(header);
      selectIfFound(el("projectWithoutBdiCol"), priceColumns.withoutBdi);
      selectIfFound(el("projectBdiCol"), priceColumns.bdi);
      selectIfFound(el("projectWithBdiCol"), priceColumns.withBdi);
      renderProjectPriceRule();
      renderProjectSourceIdentifiers();
      renderProjectPreview();
      populateBaseSourceIdentifierSelect(false);
      refreshWizardState();
    }

    function representativeBaseSheet() {
      if (!state.pendingBaseWorkbook) return null;
      const selected = el("baseSheet").value;
      if (selected) return sheetByName(state.pendingBaseWorkbook, selected);
      return null;
    }

    function updateBaseColumns() {
      invalidatePendingBaseAnalysis();
      const sheet = representativeBaseSheet();
      if (!sheet) {
        for (const id of ["baseCodeCol", "baseValueCol", "baseDescCol", "baseUnitCol"]) {
          el(id).innerHTML = "";
          el(id).disabled = true;
        }
        el("basePreviewTable").tHead.innerHTML = "";
        el("basePreviewTable").tBodies[0].innerHTML = "";
        el("baseColumnSummary").innerHTML = "";
        renderBaseFilterSummary();
        return;
      }
      const header = getHeader(sheet, el("baseHeaderRow").value);
      populateColumnSelect(el("baseCodeCol"), header, true, "Selecione uma coluna");
      populateColumnSelect(el("baseValueCol"), header, true, "Selecione uma coluna");
      populateColumnSelect(el("baseDescCol"), header, true, "Selecione uma coluna");
      populateColumnSelect(el("baseUnitCol"), header, true, "Selecione uma coluna");

      selectIfFound(el("baseCodeCol"), findColumn(header, [/codigo.*composicao/i, /^cod/i, /codigo/, /^insumo$/i, /composicao/, /item/i]));
      selectIfFound(el("baseValueCol"), findColumn(header, [/preco.*mediano/, /custo total/, /valor.*unit/, /preco.*unit/, /custo.*unit/, /valor/, /preco/, /custo/]))
      selectIfFound(el("baseDescCol"), findColumn(header, [/descricao.*composicao/i, /descricao/, /servico/, /composicao/, /insumo/]))
      selectIfFound(el("baseUnitCol"), findColumn(header, [/^unid/, /^und/, /unidade/]))
      renderBasePreview();
    }

    function refreshCompareButton() {
      el("compareBtn").disabled = !(state.projectWorkbook && projectConfigurationValid() && state.bases.length && !state.conflicts.length);
      const selectedSheet = el("baseSheet").value;
      const sourceCheck = renderBaseSourceValidation();
      const pendingAnalysis = state.pendingBaseWorkbook && selectedSheet && baseMappingValid()
        ? getPendingBaseAnalysis()
        : null;
      el("addBaseBtn").disabled = !state.pendingBaseWorkbook || !selectedSheet || !sourceCheck.valid || !pendingAnalysis?.records.length;
      refreshWizardState();
    }

    function statusBadges(container, workbook) {
      container.innerHTML = "";
      if (!workbook) return;
      const totalRows = workbook.sheets.reduce((acc, s) => acc + nonEmptyRows(s.rows), 0);
      const badges = [
        ["ok", workbook.fileName || "arquivo carregado"],
        ["info", `${workbook.sheets.length} aba(s)`],
        ["info", `${totalRows} linha(s) não vazias`],
      ];
      for (const [cls, txt] of badges) {
        const b = document.createElement("span");
        b.className = `badge ${cls}`;
        b.textContent = txt;
        container.appendChild(b);
      }
    }

    async function loadProjectFile(file) {
      if (!file) return;
      setLoading(true, "Carregando orçamento…", file.name);
      await yieldForPaint();
      try {
        clearError();
        invalidateProjectAnalysis();
        state.projectWorkbook = await loadWorkbook(file);
        state.results = [];
        populateSheetSelect(el("projectSheet"), state.projectWorkbook, false);
        const preferredSheet = state.projectWorkbook.sheets.find((sheet) => {
          const name = normalizeText(sheet.name);
          return name === "planilha orcamentaria" || name === "orcamento" || name.includes("orcamentaria");
        });
        if (preferredSheet) el("projectSheet").value = preferredSheet.name;
        statusBadges(el("projectStatus"), state.projectWorkbook);
        el("projectConfigArea").classList.remove("hidden");
        detectAndApplyHeader("project");
        clearResults();
        refreshCompareButton();
      } catch (err) {
        showError(err);
      } finally {
        setLoading(false);
      }
    }

    async function onProjectFileChange(evt) {
      await loadProjectFile(evt.target.files?.[0]);
    }

    async function loadPendingBaseFile(file) {
      if (!file) return;
      setLoading(true, "Carregando base de dados…", file.name);
      await yieldForPaint();
      try {
        clearError();
        invalidatePendingBaseAnalysis();
        state.pendingBaseWorkbook = await loadWorkbook(file);
        state.pendingBaseAutoSourceKey = "";
        populatePendingBaseSheetSelect();
        statusBadges(el("baseStatus"), state.pendingBaseWorkbook);
        const alreadyAddedCount = pendingBaseAddedSheetCount();
        const feedback = el("baseAddFeedback");
        if (alreadyAddedCount) {
          feedback.textContent = `${alreadyAddedCount} aba(s) deste arquivo já estão adicionadas. Uma nova configuração será aceita e verificada pela auditoria de duplicidades.`;
          feedback.classList.remove("hidden");
        } else {
          feedback.textContent = "";
          feedback.classList.add("hidden");
        }
        el("baseConfigArea").classList.remove("hidden");
        populateBaseSourceIdentifierSelect(true);
        detectAndApplyHeader("base");
        refreshCompareButton();
      } catch (err) {
        showError(err);
      } finally {
        setLoading(false);
      }
    }

    async function onBaseFileChange(evt) {
      await loadPendingBaseFile(evt.target.files?.[0]);
    }

    function normalizeCode(code) {
      let s = String(code ?? "").trim();
      if (el("caseInsensitive").checked) s = s.toUpperCase();
      if (el("normalizeCodes").checked) s = s.replace(/[\s\.\-\/\\]/g, "");
      s = s.replace(/^0+(?=.)/, "");
      return s;
    }

    function parseBrazilianNumber(value) {
      if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
      let s = String(value ?? "").replace(/\u00a0/g, " ").trim();
      if (!s) return NaN;
      s = s.replace(/^R\$\s*/i, "").replace(/\s*%$/, "").replace(/\s/g, "");
      if (/^[+\-]?(?:\d+(?:\.\d*)?|\.\d+)[eE][+\-]?\d+$/.test(s)) {
        const scientific = Number(s);
        return Number.isFinite(scientific) ? scientific : NaN;
      }
      const hasComma = s.includes(",");
      const hasDot = s.includes(".");
      if (hasComma && hasDot) {
        const brazilian = /^[+\-]?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/;
        const international = /^[+\-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/;
        if (brazilian.test(s)) s = s.replace(/\./g, "").replace(",", ".");
        else if (international.test(s)) s = s.replace(/,/g, "");
        else return NaN;
      } else if (hasComma && !hasDot) {
        if (!/^[+\-]?\d+(?:,\d+)?$/.test(s)) return NaN;
        s = s.replace(",", ".");
      } else if (hasDot) {
        if (!/^[+\-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)) return NaN;
      } else if (!/^[+\-]?\d+$/.test(s)) {
        return NaN;
      }
      const n = Number(s);
      return Number.isFinite(n) ? n : NaN;
    }

    function isUsablePrice(value) {
      return Number.isFinite(value) && value > 0;
    }

    function parseBdiRate(value) {
      const parsed = parseBrazilianNumber(value);
      if (!Number.isFinite(parsed)) return NaN;
      const hasPercentSign = String(value ?? "").includes("%");
      const rate = hasPercentSign || Math.abs(parsed) > 1 ? parsed / 100 : parsed;
      return Number.isFinite(rate) && rate > -1 ? rate : NaN;
    }

    function roundMoneyValue(value) {
      if (!Number.isFinite(value)) return NaN;
      return Math.round((value + Number.EPSILON) * 100) / 100;
    }

    function projectPriceForRow(row) {
      const mapping = projectPriceMapping();
      const withoutBdiRaw = cell(row, mapping.withoutBdiCol);
      const withoutBdi = parseBrazilianNumber(withoutBdiRaw);
      const bdiRaw = cell(row, mapping.bdiCol);
      const bdiRate = parseBdiRate(bdiRaw);
      const withBdiRaw = cell(row, mapping.withBdiCol);
      const providedWithBdi = parseBrazilianNumber(withBdiRaw);
      let value = NaN;
      let source = "Indisponível";
      if (mapping.direct && isUsablePrice(withoutBdi)) {
        value = withoutBdi;
        source = "Informado";
      } else if (mapping.calculated && isUsablePrice(providedWithBdi) && Number.isFinite(bdiRate)) {
        value = roundMoneyValue(providedWithBdi / (1 + bdiRate));
        source = "Calculado com BDI";
      }

      let withBdi = NaN;
      let withBdiSource = "Indisponível";
      if (mapping.hasWithBdi && isUsablePrice(providedWithBdi)) {
        withBdi = providedWithBdi;
        withBdiSource = "Informado";
      } else if (mapping.calculateWithBdi && isUsablePrice(value) && Number.isFinite(bdiRate)) {
        withBdi = roundMoneyValue(value * (1 + bdiRate));
        withBdiSource = "Calculado sem BDI + BDI";
      }

      return {
        value,
        source,
        withoutBdiRaw,
        bdiRaw,
        bdiRate,
        withBdiRaw,
        withBdi,
        withBdiSource,
      };
    }

    function money(n) {
      if (!Number.isFinite(n)) return "";
      return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }

    function percent(n) {
      if (!Number.isFinite(n)) return "";
      return n.toLocaleString("pt-BR", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function cell(row, idx) {
      if (idx === "" || idx === null || idx === undefined) return "";
      return row[Number(idx)] ?? "";
    }

    function hasCellValue(value) {
      return value !== null && value !== undefined && String(value).trim() !== "";
    }

    function rowHasContent(row) {
      return Array.isArray(row) && row.some(hasCellValue);
    }

    function compactCellText(value) {
      return String(value ?? "").trim().replace(/\s+/g, " ");
    }

    function headerSignature(sheet, headerRowNumber, fields) {
      const header = getHeader(sheet, headerRowNumber);
      return fields
        .filter(({ index }) => index !== "" && Number.isInteger(Number(index)))
        .map(({ field, index }) => ({ field, index: Number(index), text: normalizedHeaderText(cell(header, index)) }))
        .filter(({ text }) => text);
    }

    function matchesHeaderSignature(row, signature) {
      return signature.length >= 3 && signature.every(({ index, text }) => normalizedHeaderText(cell(row, index)) === text);
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

    function isRepeatedBaseHeader(row, base, sheet) {
      const signature = headerSignature(sheet, base.headerRow, [
        { field: "code", index: base.codeCol },
        { field: "description", index: base.descCol },
        { field: "unit", index: base.unitCol },
        { field: "price", index: base.valueCol },
      ]);
      if (matchesHeaderSignature(row, signature)) return true;
      const codeLabel = cell(row, base.codeCol);
      return (isHeaderCodeLabel(codeLabel) || isGenericHeaderCodeLabel(codeLabel))
        && isDescriptionHeaderLabel(cell(row, base.descCol))
        && isUnitHeaderLabel(cell(row, base.unitCol))
        && isPriceHeaderLabel(cell(row, base.valueCol));
    }

    function isRepeatedProjectHeader(row, sheet) {
      const itemMapping = projectItemMapping();
      const priceMapping = projectPriceMapping();
      const signature = headerSignature(sheet, el("projectHeaderRow").value, [
        { field: "code", index: itemMapping.codeCol },
        { field: "source", index: itemMapping.sourceCol },
        { field: "description", index: itemMapping.descriptionCol },
        { field: "unit", index: itemMapping.unitCol },
        { field: "quantity", index: itemMapping.quantityCol },
        { field: "withoutBdi", index: priceMapping.withoutBdiCol },
        { field: "bdi", index: priceMapping.bdiCol },
        { field: "withBdi", index: priceMapping.withBdiCol },
      ]);
      if (matchesHeaderSignature(row, signature)) return true;
      const codeLabel = cell(row, itemMapping.codeCol);
      const selectedPriceHeaders = [priceMapping.withoutBdiCol, priceMapping.withBdiCol]
        .filter((index) => index !== "")
        .map((index) => cell(row, index));
      return (isHeaderCodeLabel(codeLabel) || isGenericHeaderCodeLabel(codeLabel))
        && isDescriptionHeaderLabel(cell(row, itemMapping.descriptionCol))
        && isUnitHeaderLabel(cell(row, itemMapping.unitCol))
        && isQuantityHeaderLabel(cell(row, itemMapping.quantityCol))
        && selectedPriceHeaders.some(isPriceHeaderLabel);
    }

    function reviewEntry({ treatment = "Removida", reason = "", reasonDetails = [], fileName = "", sheet = "", rowNumber = "", code = "", source = "", description = "", unit = "", quantity = "", price = "" }) {
      return { treatment, reason, reasonDetails: Array.isArray(reasonDetails) ? reasonDetails : [], fileName, sheet, rowNumber, code, source, description, unit, quantity, price };
    }

    function baseReviewReasonFields(reason) {
      if (["Antes do cabeçalho", "Linha estrutural", "Cabeçalho repetido"].includes(reason)) return [];
      if (/preço|fórmula/i.test(reason)) return ["price"];
      return ["code", "description", "unit", "price"];
    }

    function baseReviewDescriptor(base, row, occurrenceId, relatedFields = []) {
      return {
        occurrenceId,
        workbook: base.workbook,
        fileName: base.fileName,
        sheetName: row.sheet,
        headerRowNumber: base.headerRow,
        rowNumber: Number(row.rowNumber),
        mapping: {
          code: base.codeCol,
          description: base.descCol,
          unit: base.unitCol,
          price: base.valueCol,
        },
        relatedFields,
      };
    }

    function baseReviewOccurrences(targetBase, auditBases) {
      const occurrences = (targetBase.reviewRows || []).map((row, index) => {
        const id = `BASE-REV-${targetBase.id}-${index + 1}`;
        const details = (row.reasonDetails || []).map(compactCellText).filter(Boolean);
        return {
          id,
          category: "discarded",
          reasonKey: `discarded:${row.reason}`,
          title: row.reason || "Linha desconsiderada",
          message: details.length
            ? details.join(" ")
            : `A linha foi desconsiderada pelo motivo “${row.reason || "não informado"}”.`,
          action: row.reason === "Linha estrutural"
            ? "Nenhuma correção é necessária se a linha fizer parte da estrutura da base."
            : "Corrija o valor na planilha de origem se esta linha deveria participar da comparação.",
          descriptors: [baseReviewDescriptor(
            targetBase,
            row,
            id,
            baseReviewReasonFields(row.reason),
          )],
        };
      });

      const audit = buildBaseAudit(auditBases);
      const conflicts = audit.conflicts.filter((conflict) =>
        conflict.records.some((record) => String(record.baseId) === String(targetBase.id))
      );
      conflicts.forEach((conflict, index) => {
        const reasons = [...conflict.reasons].sort();
        const id = `BASE-BLOCK-${targetBase.id}-${index + 1}`;
        const reasonLabel = reasons.length > 1
          ? "Duplicidade com unidade e preço divergentes"
          : reasons[0] === "unidade"
            ? "Duplicidade com unidade divergente"
            : "Duplicidade com preço divergente";
        const descriptors = conflict.records.map((record) => {
          const owner = auditBases.find((base) => String(base.id) === String(record.baseId));
          if (!owner) return null;
          const related = [
            ...(reasons.includes("unidade") ? ["unit"] : []),
            ...(reasons.includes("valor referencial") ? ["price"] : []),
          ];
          return baseReviewDescriptor(owner, record, id, related);
        }).filter(Boolean);
        occurrences.push({
          id,
          category: "blocker",
          reasonKey: `blocker:${reasons.join("+")}`,
          title: reasonLabel,
          message: `A mesma Fonte/Base, o mesmo Código e a mesma Descrição aparecem com divergência em ${reasons.join(" e ")}.`,
          action: "A base pode ser adicionada para inspeção, mas a comparação permanecerá bloqueada até que o conflito seja corrigido ou uma das ocorrências seja removida.",
          descriptors,
        });
      });
      return occurrences;
    }

    function reviewSchemaKey(descriptor) {
      return [
        descriptor.fileName || descriptor.workbook?.fileName || "",
        descriptor.sheetName || "",
        descriptor.headerRowNumber || 1,
        JSON.stringify(descriptor.mapping || {}),
      ].join("\u0000");
    }

    function reviewDescriptorSheet(descriptor) {
      return sheetByName(descriptor.workbook, descriptor.sheetName);
    }

    function reviewDescriptorColumnCount(descriptor) {
      const sheet = reviewDescriptorSheet(descriptor);
      if (!sheet || !Number.isInteger(descriptor.rowNumber)) return 0;
      const headerRowIndex = Math.max(0, Number(descriptor.headerRowNumber || 1) - 1);
      const rowIndex = descriptor.rowNumber - 1;
      const mergeLastColumn = (sheet.merges || [])
        .filter((merge) => rowIndex >= merge.startRow && rowIndex <= merge.endRow)
        .reduce((maximum, merge) => Math.max(maximum, merge.endColumn + 1), 0);
      return Math.max(
        sheet.rows?.[headerRowIndex]?.length || 0,
        sheet.rows?.[rowIndex]?.length || 0,
        mergeLastColumn,
      );
    }

    function reviewHeaderCellsHtml(descriptor, maxColumns) {
      const sheet = reviewDescriptorSheet(descriptor);
      const headerRowIndex = Math.max(0, Number(descriptor.headerRowNumber || 1) - 1);
      return Array.from({ length: maxColumns }, (_, index) => index)
        .filter((columnIndex) => !sheet?.hiddenColumns?.[columnIndex]).map((columnIndex) => {
        const label = budgetAuditOriginalValue(sheet, headerRowIndex, columnIndex)
          || budgetAuditColumnLetter(columnIndex);
        return `<th title="Coluna ${budgetAuditColumnLetter(columnIndex)}">${escapeHtml(label)}</th>`;
      }).join("");
    }

    function reviewOriginalCellsHtml(descriptor, maxColumns) {
      const sheet = reviewDescriptorSheet(descriptor);
      if (!sheet) return "";
      const rowIndex = descriptor.rowNumber - 1;
      const relatedColumns = (descriptor.relatedFields || [])
        .map((key) => Number(descriptor.mapping?.[key]))
        .filter(Number.isInteger);
      const cells = [];
      for (let columnIndex = 0; columnIndex < maxColumns; columnIndex += 1) {
        if (sheet.hiddenColumns?.[columnIndex]) continue;
        const merge = budgetAuditMergeAt(sheet, rowIndex, columnIndex);
        const visibleMergeColumns = merge ? Array.from(
          { length: Math.min(maxColumns - merge.startColumn, merge.endColumn - merge.startColumn + 1) },
          (_, offset) => merge.startColumn + offset,
        ).filter((index) => !sheet.hiddenColumns?.[index]) : [];
        if (merge && columnIndex !== visibleMergeColumns[0]) continue;
        const sourceRow = merge?.startRow ?? rowIndex;
        const sourceColumn = merge?.startColumn ?? columnIndex;
        const colspan = merge ? visibleMergeColumns.length : 1;
        const value = budgetAuditOriginalValue(sheet, sourceRow, sourceColumn);
        const related = relatedColumns.some((candidate) => merge
          ? visibleMergeColumns.includes(candidate) : candidate === columnIndex);
        const classes = related ? "related" : "";
        cells.push(`<td${classes ? ` class="${classes}"` : ""}${colspan > 1 ? ` colspan="${colspan}"` : ""}>${escapeHtml(value) || "&nbsp;"}</td>`);
      }
      return cells.join("");
    }

    function reviewSortedDescriptors(occurrence) {
      return (occurrence.descriptors || [])
        .map((descriptor, index) => ({ descriptor, index }))
        .filter(({ descriptor }) => Number.isInteger(descriptor.rowNumber)
          && !reviewDescriptorSheet(descriptor)?.hiddenRows?.[descriptor.rowNumber - 1])
        .sort((left, right) => left.descriptor.rowNumber - right.descriptor.rowNumber || left.index - right.index);
    }

    function reviewRowSelectionKey(occurrence, descriptor, index) {
      if (!descriptor) return `${occurrence.id}::summary`;
      return [
        occurrence.id,
        descriptor.fileName || descriptor.workbook?.fileName || "",
        descriptor.sheetName || "",
        descriptor.rowNumber,
        index,
      ].join("::");
    }

    function reviewOccurrenceFirstRowKey(occurrence) {
      const first = reviewSortedDescriptors(occurrence)[0];
      return reviewRowSelectionKey(occurrence, first?.descriptor, first?.index ?? 0);
    }

    function reviewOccurrenceHasRowKey(occurrence, rowKey) {
      if (!occurrence || !rowKey) return false;
      const sorted = reviewSortedDescriptors(occurrence);
      if (!sorted.length) return rowKey === reviewRowSelectionKey(occurrence, null, 0);
      return sorted.some(({ descriptor, index }) => reviewRowSelectionKey(occurrence, descriptor, index) === rowKey);
    }

    function reviewSelectedDescriptor(occurrences, occurrenceId, rowKey) {
      const occurrence = (occurrences || []).find((item) => item.id === occurrenceId);
      if (!occurrence) return null;
      for (const { descriptor, index } of reviewSortedDescriptors(occurrence)) {
        if (reviewRowSelectionKey(occurrence, descriptor, index) === rowKey) return descriptor;
      }
      return null;
    }

    function reviewReasonGroups(occurrences, reasonKey = (occurrence) => occurrence.reasonKey) {
      const grouped = new Map();
      (occurrences || []).forEach((occurrence, index) => {
        const key = reasonKey(occurrence);
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push({ occurrence, index });
      });
      return [...grouped.values()].map((entries) => entries
        .sort((left, right) => {
          const leftRow = reviewSortedDescriptors(left.occurrence)[0]?.descriptor.rowNumber ?? Number.POSITIVE_INFINITY;
          const rightRow = reviewSortedDescriptors(right.occurrence)[0]?.descriptor.rowNumber ?? Number.POSITIVE_INFINITY;
          return leftRow - rightRow || left.index - right.index;
        })
        .map((entry) => entry.occurrence));
    }

    function unifiedReviewTableHtml(reasonGroups, {
      selectedRowKey = "",
      findingAttribute,
      rowKeyAttribute,
      summaryHtml = (occurrence) => escapeHtml(occurrence.title || "Ocorrência geral"),
    }) {
      const occurrences = reasonGroups.flat();
      const descriptors = occurrences.flatMap((occurrence) => reviewSortedDescriptors(occurrence).map((entry) => entry.descriptor));
      const primary = descriptors[0] || null;
      const maxColumns = Math.max(3, ...descriptors.map(reviewDescriptorColumnCount));
      const totalColumns = 1 + Math.max(3, ...descriptors.map((descriptor) => {
        const sheet = reviewDescriptorSheet(descriptor);
        return Array.from({ length: maxColumns }, (_, index) => index)
          .filter((index) => !sheet?.hiddenColumns?.[index]).length;
      }));
      const primarySchema = primary ? reviewSchemaKey(primary) : "";
      const header = primary
        ? `<thead><tr><th class="row-number">Linha</th>${reviewHeaderCellsHtml(primary, maxColumns)}</tr></thead>`
        : "";
      let currentSchema = primarySchema;
      const body = [];
      let reasonGroupIndex = 0;

      for (const group of reasonGroups) {
        if (!group.length) continue;
        const reasonGroupId = `review-reason-group-${reasonGroupIndex += 1}`;
        const lineCount = new Set(group.flatMap((occurrence) => reviewSortedDescriptors(occurrence)
          .map(({ descriptor }) => `${descriptor.fileName}\u0000${descriptor.sheetName}\u0000${descriptor.rowNumber}`))).size;
        const reasonClass = group[0].finding?.code === "BUDGET_ITEM_EMPTY_OR_ZERO" ? " review-empty-or-zero" : "";
        body.push(`<tr class="review-reason-row${reasonClass}"><td colspan="${totalColumns}"><button type="button" class="review-reason-toggle" data-review-reason-toggle="${reasonGroupId}" aria-expanded="true"><span>${escapeHtml(group[0].title || "Ocorrência")}</span><span class="review-reason-count">${group.length} ocorrência(s)${lineCount ? ` · ${lineCount} linha(s)` : ""}</span></button></td></tr>`);
        for (const occurrence of group) {
          const sorted = reviewSortedDescriptors(occurrence);
          if (!sorted.length) {
            const rowKey = reviewRowSelectionKey(occurrence, null, 0);
            body.push(`<tr class="review-summary-row ${rowKey === selectedRowKey ? "selected" : ""}" data-review-reason-member="${reasonGroupId}" ${findingAttribute}="${escapeHtml(occurrence.id)}" ${rowKeyAttribute}="${escapeHtml(rowKey)}" tabindex="0"><td colspan="${totalColumns}">${summaryHtml(occurrence)}</td></tr>`);
            continue;
          }
          sorted.forEach(({ descriptor, index }, position) => {
            const schema = reviewSchemaKey(descriptor);
            if (schema !== currentSchema) {
              const location = [descriptor.fileName || descriptor.workbook?.fileName, descriptor.sheetName].filter(Boolean).join(" / ");
              body.push(`<tr class="review-schema-row" data-review-reason-member="${reasonGroupId}"><td colspan="${totalColumns}">${escapeHtml(location)}</td></tr>`);
              body.push(`<tr class="review-schema-header-row" data-review-reason-member="${reasonGroupId}"><th class="row-number">Linha</th>${reviewHeaderCellsHtml(descriptor, maxColumns)}</tr>`);
              currentSchema = schema;
            }
            const rowKey = reviewRowSelectionKey(occurrence, descriptor, index);
            const rowClasses = [
              rowKey === selectedRowKey ? "selected" : "",
              sorted.length > 1 && position === 0 ? "review-related-start" : "",
              sorted.length > 1 && position === sorted.length - 1 ? "review-related-end" : "",
            ].filter(Boolean).join(" ");
            body.push(`<tr data-review-reason-member="${reasonGroupId}" ${findingAttribute}="${escapeHtml(occurrence.id)}" ${rowKeyAttribute}="${escapeHtml(rowKey)}" tabindex="0" class="${rowClasses}"><th class="row-number" scope="row">${descriptor.rowNumber}</th>${reviewOriginalCellsHtml(descriptor, maxColumns)}</tr>`);
          });
        }
      }
      return `<div class="review-unified-panel"><div class="review-unified-wrap"><table class="review-original-table review-unified-table">${header}<tbody>${body.join("")}</tbody></table></div></div>`;
    }

    function visibleBaseReviewOccurrences() {
      return (state.reviewOccurrences || []).filter((occurrence) => occurrence.category === state.reviewFilter);
    }

    function updateReviewSelectedRow(container, rowKeyAttribute, selectedRowKey) {
      if (!container) return;
      container.querySelectorAll(`[${rowKeyAttribute}]`).forEach((row) => {
        row.classList.toggle("selected", row.getAttribute(rowKeyAttribute) === selectedRowKey);
      });
    }

    function toggleReviewReasonGroup(button) {
      const groupId = button?.dataset.reviewReasonToggle;
      const tbody = button?.closest("tbody");
      if (!groupId || !tbody) return;
      const collapsing = button.getAttribute("aria-expanded") !== "false";
      button.setAttribute("aria-expanded", String(!collapsing));
      tbody.querySelectorAll("[data-review-reason-member]").forEach((row) => {
        if (row.dataset.reviewReasonMember === groupId) row.classList.toggle("hidden", collapsing);
      });
    }

    function focusReviewRow(row, ensureVisible = false) {
      if (!row) return;
      row.focus({ preventScroll: true });
      if (!ensureVisible) return;
      const viewport = row.closest(".review-unified-wrap");
      if (!viewport) return;
      const viewportRect = viewport.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      const stickyHeaderHeight = viewport.querySelector("thead")?.getBoundingClientRect().height || 0;
      const visibleTop = viewportRect.top + stickyHeaderHeight;
      if (rowRect.top < visibleTop) viewport.scrollTop -= visibleTop - rowRect.top;
      else if (rowRect.bottom > viewportRect.bottom) viewport.scrollTop += rowRect.bottom - viewportRect.bottom;
    }

    function activateBaseReviewFilter(filter) {
      state.reviewFilter = filter;
      const visible = visibleBaseReviewOccurrences();
      state.reviewSelectedId = visible[0]?.id || "";
      state.reviewSelectedRowKey = visible[0] ? reviewOccurrenceFirstRowKey(visible[0]) : "";
      el("reviewTreatmentCards").querySelectorAll("[data-review-filter]").forEach((card) => {
        card.setAttribute("aria-pressed", String(card.dataset.reviewFilter === filter));
      });
      el("reviewGroups").querySelectorAll("[data-review-category-panel]").forEach((panel) => {
        panel.classList.toggle("hidden", panel.dataset.reviewCategoryPanel !== filter);
      });
      updateReviewSelectedRow(el("reviewGroups"), "data-review-row-key", state.reviewSelectedRowKey);
      renderBaseReviewExplanation();
    }

    function renderBaseReviewExplanation() {
      const occurrence = (state.reviewOccurrences || []).find((item) => item.id === state.reviewSelectedId);
      const container = el("reviewExplanation");
      if (!occurrence) {
        container.innerHTML = state.reviewOccurrences.length
          ? "<h3>Selecione uma linha</h3><p>O motivo e a orientação aparecerão neste bloco.</p>"
          : "<h3>Base conferida</h3><p>Nenhuma linha foi desconsiderada e nenhuma duplicidade bloqueante foi encontrada.</p>";
        return;
      }
      const descriptor = reviewSelectedDescriptor(
        state.reviewOccurrences,
        state.reviewSelectedId,
        state.reviewSelectedRowKey,
      );
      const origin = descriptor
        ? `<p><strong>Origem selecionada:</strong> ${escapeHtml(descriptor.fileName || descriptor.workbook?.fileName || "Arquivo")}, ${escapeHtml(descriptor.sheetName || "planilha")}, linha ${descriptor.rowNumber}</p>`
        : "";
      container.innerHTML = `<h3>${escapeHtml(occurrence.title)}</h3><p>${escapeHtml(occurrence.message)}</p>${origin}<p class="action"><strong>Ação recomendada:</strong> ${escapeHtml(occurrence.action)}</p>`;
    }

    function renderReviewDialog() {
      const occurrences = state.reviewOccurrences || [];
      const blockerCount = occurrences.filter((item) => item.category === "blocker").length;
      const discardedCount = occurrences.filter((item) => item.category === "discarded").length;
      const cards = [
        { key: "blocker", label: "Impedimentos", count: blockerCount, detail: "Duplicidades bloqueantes" },
        { key: "discarded", label: "Linhas desconsideradas", count: discardedCount, detail: "Não usadas na comparação" },
      ];
      el("reviewTreatmentCards").innerHTML = cards.map((card) =>
        `<button type="button" class="review-treatment-card" data-review-filter="${card.key}" aria-pressed="${state.reviewFilter === card.key}"><span class="review-treatment-number">${card.count}</span><span class="review-treatment-label">${card.label}</span><span class="review-treatment-detail">${card.detail}</span></button>`
      ).join("");

      const visible = visibleBaseReviewOccurrences();
      if (!visible.some((occurrence) => occurrence.id === state.reviewSelectedId)) {
        state.reviewSelectedId = visible[0]?.id || "";
        state.reviewSelectedRowKey = "";
      }
      const selectedOccurrence = visible.find((occurrence) => occurrence.id === state.reviewSelectedId);
      if (selectedOccurrence && !reviewOccurrenceHasRowKey(selectedOccurrence, state.reviewSelectedRowKey)) {
        state.reviewSelectedRowKey = reviewOccurrenceFirstRowKey(selectedOccurrence);
      }
      el("reviewGroups").innerHTML = cards.map((card) => {
        const categoryOccurrences = occurrences.filter((occurrence) => occurrence.category === card.key);
        const grouped = reviewReasonGroups(categoryOccurrences);
        const content = grouped.length
          ? unifiedReviewTableHtml(grouped, {
            selectedRowKey: card.key === state.reviewFilter ? state.reviewSelectedRowKey : "",
            findingAttribute: "data-review-occurrence",
            rowKeyAttribute: "data-review-row-key",
          })
          : `<div class="budget-audit-empty">Nenhuma ocorrência nesta categoria.</div>`;
        return `<section data-review-category-panel="${card.key}" class="${card.key === state.reviewFilter ? "" : "hidden"}">${content}</section>`;
      }).join("");
      renderBaseReviewExplanation();
    }

    async function openBaseReview(base, { confirmAdd = false, auditBases = null } = {}) {
      const dialog = el("reviewDialog");
      setLoading(true, "Preparando revisão da base…", "Organizando as ocorrências para consulta.");
      await yieldForPaint();
      try {
        const bases = auditBases || state.bases;
        state.reviewContext = { base, bases, confirmAdd };
        state.reviewOccurrences = baseReviewOccurrences(base, bases);
        state.reviewFilter = state.reviewOccurrences.some((item) => item.category === "blocker") ? "blocker" : "discarded";
        state.reviewSelectedId = state.reviewOccurrences.find((item) => item.category === state.reviewFilter)?.id || "";
        state.reviewSelectedRowKey = "";
        el("reviewDialogTitle").textContent = `Revisão da base — ${base.fileName} / ${base.sheetNames.join(", ")}`;
        el("reviewConfirmAddBtn").classList.toggle("hidden", !confirmAdd);
        renderReviewDialog();
        await yieldForPaint();
      } catch (error) {
        showError(error);
        return;
      } finally {
        setLoading(false);
      }
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }

    function closeReviewDialog() {
      const dialog = el("reviewDialog");
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
      if (state.reviewContext?.confirmAdd) state.pendingBaseDraft = null;
      state.reviewContext = null;
    }

    function sourceMatchTokens(value) {
      const ignored = new Set(["base", "banco", "fonte", "referencia", "preco", "custos", "tabela", "arquivo", "planilha"]);
      return normalizeSourceKey(value).split(" ").filter((token) => token && !ignored.has(token) && !/^\d+$/.test(token));
    }

    function sourceFilenameScore(option, fileName, sheetName = "") {
      const fileStem = String(fileName ?? "").replace(/\.[^.]+$/, "");
      const fileKey = normalizeSourceKey(fileStem);
      const sheetKey = normalizeSourceKey(sheetName);
      if (!fileKey || !option?.key) return 0;
      let score = 0;
      if (fileKey === option.key) score += 500;
      if (option.key.length >= 3 && fileKey.includes(option.key)) score += 140 + Math.min(option.key.length, 40);
      const fileTokens = sourceMatchTokens(fileStem);
      const sheetTokens = sourceMatchTokens(sheetName);
      for (const token of sourceMatchTokens(option.label)) {
        if (fileTokens.includes(token)) score += 36 + Math.min(token.length, 12);
        else if (token.length >= 4 && fileTokens.some((candidate) => candidate.startsWith(token) || token.startsWith(candidate))) score += 18;
        if (sheetTokens.includes(token)) score += 8;
        else if (token.length >= 4 && sheetTokens.some((candidate) => candidate.startsWith(token) || token.startsWith(candidate))) score += 4;
      }
      if (sheetKey && option.key.length >= 3 && sheetKey.includes(option.key)) score += 20;
      return score;
    }

    function bestAutomaticSourceOption(options, fileName, sheetName = "") {
      const ranked = options
        .map((option) => ({ option, score: sourceFilenameScore(option, fileName, sheetName) }))
        .sort((left, right) => right.score - left.score);
      if (!ranked.length || ranked[0].score < 30) return null;
      if (ranked[1] && ranked[0].score - ranked[1].score < 5) return null;
      return ranked[0].option;
    }

    function generatedBaseName(sourceIdentifier, fileName, sheetName) {
      const fileStem = String(fileName || "Base").replace(/\.(xlsx|csv|txt)$/i, "").trim();
      return `${sourceIdentifier} — ${fileStem} / ${sheetName}`;
    }

    function validateBaseSourceIdentifier() {
      const key = el("baseSourceIdentifier")?.value || "";
      const source = projectSourceIdentifierOptions().find((option) => option.key === key);
      if (!source) return { valid: false, source: null, message: "Selecione uma das fontes identificadas no orçamento." };
      const sheetName = el("baseSheet")?.value || "";
      const name = generatedBaseName(source.label, state.pendingBaseWorkbook?.fileName || "", sheetName);
      const duplicate = state.bases.find((base) => normalizeText(base.name) === normalizeText(name));
      return { valid: true, source, name, duplicate: duplicate || null, message: "" };
    }

    function duplicateBaseConfirmationMessage(baseName) {
      return "A base “" + String(baseName || "selecionada") + "” já foi adicionada. Deseja adicioná-la mesmo assim?";
    }

    function openDuplicateBaseDialog(baseName) {
      const dialog = el("duplicateBaseDialog");
      const message = duplicateBaseConfirmationMessage(baseName);
      el("duplicateBaseDialogMessage").textContent = message;
      if (typeof dialog.showModal === "function") dialog.showModal();
      else if (typeof window.confirm === "function" && window.confirm(message)) addPendingBase({ allowDuplicate: true });
    }

    function closeDuplicateBaseDialog() {
      const dialog = el("duplicateBaseDialog");
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }

    function renderBaseSourceValidation() {
      const result = validateBaseSourceIdentifier();
      const feedback = el("baseSourceFeedback");
      const shouldShowError = Boolean(state.pendingBaseWorkbook) && !result.valid;
      if (shouldShowError) feedback.textContent = result.message;
      else if (result.valid && result.source.key === state.pendingBaseAutoSourceKey) feedback.textContent = "Selecionado automaticamente pelo nome do arquivo.";
      else feedback.textContent = "";
      feedback.classList.toggle("error", shouldShowError);
      return result;
    }

    function populateBaseSourceIdentifierSelect(forceAutomatic = false) {
      const select = el("baseSourceIdentifier");
      if (!select) return;
      const previous = select.value;
      const options = projectSourceIdentifierOptions();
      select.innerHTML = '<option value="">Selecione a fonte</option>';
      for (const option of options) {
        const element = document.createElement("option");
        element.value = option.key;
        element.textContent = option.label;
        select.appendChild(element);
      }
      select.disabled = !state.pendingBaseWorkbook || !options.length;
      if (select.disabled) {
        state.pendingBaseAutoSourceKey = "";
        renderBaseSourceValidation();
        return;
      }
      const previousExists = options.some((option) => option.key === previous);
      const shouldChooseAutomatically = forceAutomatic || !previousExists || !previous || previous === state.pendingBaseAutoSourceKey;
      const automatic = shouldChooseAutomatically
        ? bestAutomaticSourceOption(options, state.pendingBaseWorkbook.fileName, el("baseSheet").value)
        : null;
      if (automatic) {
        select.value = automatic.key;
        state.pendingBaseAutoSourceKey = automatic.key;
      } else if (previousExists && !forceAutomatic) {
        select.value = previous;
        if (previous !== state.pendingBaseAutoSourceKey) state.pendingBaseAutoSourceKey = "";
      } else {
        select.value = "";
        state.pendingBaseAutoSourceKey = "";
      }
      renderBaseSourceValidation();
    }

    function baseFileSheetKey(fileName, sheetName) {
      const normalizeIdentityPart = (value) => String(value ?? "").trim().toLocaleLowerCase("pt-BR");
      return JSON.stringify([normalizeIdentityPart(fileName), normalizeIdentityPart(sheetName)]);
    }

    function addedBaseSheetKeys() {
      const keys = new Set();
      for (const base of state.bases) {
        for (const sheetName of base.sheetNames) keys.add(baseFileSheetKey(base.fileName, sheetName));
      }
      return keys;
    }

    function isPendingBaseSheetAdded(sheetName) {
      if (!state.pendingBaseWorkbook || !sheetName) return false;
      return addedBaseSheetKeys().has(baseFileSheetKey(state.pendingBaseWorkbook.fileName, sheetName));
    }

    function pendingBaseAddedSheetCount() {
      if (!state.pendingBaseWorkbook) return 0;
      return state.pendingBaseWorkbook.sheets.filter((sheet) => isPendingBaseSheetAdded(sheet.name)).length;
    }

    function populatePendingBaseSheetSelect(preferredName = "") {
      const select = el("baseSheet");
      select.innerHTML = "";
      if (!state.pendingBaseWorkbook) {
        select.disabled = true;
        return;
      }
      let firstAvailable = "";
      let firstSheet = "";
      for (const sheet of state.pendingBaseWorkbook.sheets) {
        const alreadyAdded = isPendingBaseSheetAdded(sheet.name);
        const option = document.createElement("option");
        option.value = sheet.name;
        option.textContent = `${sheet.name} (${nonEmptyRows(sheet.rows)} linhas)${alreadyAdded ? " — já adicionada" : ""}`;
        select.appendChild(option);
        if (!firstSheet) firstSheet = sheet.name;
        if (!alreadyAdded && !firstAvailable) firstAvailable = sheet.name;
      }
      const preferredExists = preferredName
        && state.pendingBaseWorkbook.sheets.some((sheet) => sheet.name === preferredName);
      select.value = preferredExists ? preferredName : (firstAvailable || firstSheet);
      select.disabled = !firstSheet;
    }

    function selectedPendingBaseSheet() {
      if (!state.pendingBaseWorkbook) return null;
      const sheetName = el("baseSheet").value;
      if (!sheetName) return null;
      return sheetByName(state.pendingBaseWorkbook, sheetName);
    }

    function baseMappingValid(base = null) {
      const values = base
        ? [base.codeCol, base.descCol, base.unitCol, base.valueCol]
        : [el("baseCodeCol")?.value, el("baseDescCol")?.value, el("baseUnitCol")?.value, el("baseValueCol")?.value];
      return values.every((value) => value !== "" && value !== null && value !== undefined);
    }

    function analyzeBaseRows(base) {
      const records = [];
      const reviewRows = [];
      const discardedRows = [];
      const acceptedRowIndexesBySheet = new Map();
      if (!base?.workbook || !baseMappingValid(base)) {
        return { ready: false, records, reviewRows, discardedRows, acceptedRowIndexesBySheet };
      }
      const headerRow = Math.max(0, Number(base.headerRow || 1) - 1);
      for (const sheetName of base.sheetNames) {
        const sheet = sheetByName(base.workbook, sheetName);
        if (!sheet) continue;
        const acceptedRowIndexes = [];
        acceptedRowIndexesBySheet.set(sheet.name, acceptedRowIndexes);
        for (let r = 0; r < headerRow; r++) {
          const row = sheet.rows[r] || [];
          if (!rowHasContent(row)) continue;
          const entry = reviewEntry({
            reason: "Antes do cabeçalho",
            reasonDetails: ["Linha anterior ao cabeçalho selecionado; exibida apenas como contexto na pré-visualização."],
            fileName: base.fileName,
            sheet: sheet.name,
            rowNumber: r + 1,
            code: cell(row, base.codeCol),
            source: base.sourceIdentifier,
            description: compactCellText(cell(row, base.descCol)),
            unit: compactCellText(cell(row, base.unitCol)),
            price: cell(row, base.valueCol),
          });
          discardedRows.push(entry);
          reviewRows.push(entry);
        }
        for (let r = headerRow + 1; r < sheet.rows.length; r++) {
          const row = sheet.rows[r] || [];
          if (!rowHasContent(row)) continue;
          const codeRaw = cell(row, base.codeCol);
          const code = normalizeCode(codeRaw);
          const valueRaw = cell(row, base.valueCol);
          const description = compactCellText(cell(row, base.descCol));
          const unit = compactCellText(cell(row, base.unitCol));

          if (isRepeatedBaseHeader(row, base, sheet)) {
            const entry = reviewEntry({
              reason: "Cabeçalho repetido",
              fileName: base.fileName,
              sheet: sheet.name,
              rowNumber: r + 1,
              code: codeRaw,
              source: base.sourceIdentifier,
              description,
              unit,
              price: valueRaw,
            });
            discardedRows.push(entry);
            reviewRows.push(entry);
            continue;
          }

          const missingFields = [];
          if (!code) missingFields.push("código");
          if (!description) missingFields.push("descrição");
          if (!unit) missingFields.push("unidade");
          if (missingFields.length) {
            const entry = reviewEntry({
              reason: "Linha estrutural",
              reasonDetails: missingFields.map((field) => field.charAt(0).toUpperCase() + field.slice(1) + " ausente"),
              fileName: base.fileName,
              sheet: sheet.name,
              rowNumber: r + 1,
              code: codeRaw,
              source: base.sourceIdentifier,
              description,
              unit,
              price: valueRaw,
            });
            discardedRows.push(entry);
            reviewRows.push(entry);
            continue;
          }

          const parsedValue = parseBrazilianNumber(valueRaw);
          const valueColumn = Number(base.valueCol);
          const priceError = compactCellText(sheet?.cellErrors?.[r]?.[valueColumn]);
          const priceFormula = compactCellText(sheet?.formulas?.[r]?.[valueColumn]);
          let priceIssue = "";
          if (priceError) priceIssue = "Erro de fórmula no preço";
          else if (!hasCellValue(valueRaw) && priceFormula) priceIssue = "Fórmula do preço sem resultado válido";
          else if (!hasCellValue(valueRaw)) priceIssue = "Preço ausente";
          else if (!Number.isFinite(parsedValue)) priceIssue = "Preço não numérico";
          else if (parsedValue === 0) priceIssue = "Preço zero";
          else if (parsedValue < 0) priceIssue = "Preço negativo";

          if (priceIssue) {
            const entry = reviewEntry({
              treatment: "Removida",
              reason: priceIssue,
              fileName: base.fileName,
              sheet: sheet.name,
              rowNumber: r + 1,
              code: codeRaw,
              source: base.sourceIdentifier,
              description,
              unit,
              price: valueRaw,
            });
            discardedRows.push(entry);
            reviewRows.push(entry);
            continue;
          }

          records.push({
            baseId: base.id,
            baseName: base.name,
            sourceIdentifier: base.sourceIdentifier,
            sourceKey: base.sourceKey,
            fileName: base.fileName,
            codeRaw,
            code,
            valueRaw,
            value: parsedValue,
            priceIssue: "",
            description,
            unit,
            sheet: sheet.name,
            rowNumber: r + 1,
          });
          acceptedRowIndexes.push(r);
        }
      }
      return { ready: true, records, reviewRows, discardedRows, acceptedRowIndexesBySheet };
    }

    function updateBaseData(base) {
      const analysis = analyzeBaseRows(base);
      base.records = analysis.records;
      base.reviewRows = analysis.reviewRows;
      base.discardedRows = analysis.discardedRows;
      base.stats = {
        records: base.records.length,
        discardedRows: base.discardedRows.length,
      };
      return analysis;
    }

    function pendingBaseDefinition() {
      const sheet = selectedPendingBaseSheet();
      if (!state.pendingBaseWorkbook || !sheet) return null;
      const sourceOption = projectSourceIdentifierOptions().find((option) => option.key === el("baseSourceIdentifier")?.value);
      return {
        id: 0,
        name: sourceOption?.label || "Base em configuração",
        sourceIdentifier: sourceOption?.label || "",
        sourceKey: sourceOption?.key || "",
        fileName: state.pendingBaseWorkbook.fileName || "",
        workbook: state.pendingBaseWorkbook,
        sheetNames: [sheet.name],
        headerRow: Math.max(1, Number(el("baseHeaderRow").value || 1)),
        codeCol: el("baseCodeCol")?.value ?? "",
        valueCol: el("baseValueCol")?.value ?? "",
        descCol: el("baseDescCol")?.value ?? "",
        unitCol: el("baseUnitCol")?.value ?? "",
      };
    }

    function pendingBaseAnalysisCacheKey() {
      const base = pendingBaseDefinition();
      if (!base) return "";
      return JSON.stringify([
        base.fileName,
        base.sheetNames[0],
        base.sourceKey,
        base.sourceIdentifier,
        base.headerRow,
        base.codeCol,
        base.descCol,
        base.unitCol,
        base.valueCol,
        Boolean(el("normalizeCodes")?.checked),
        Boolean(el("caseInsensitive")?.checked),
      ]);
    }

    function getPendingBaseAnalysis() {
      const key = pendingBaseAnalysisCacheKey();
      if (!key) return { ready: false, records: [], reviewRows: [], discardedRows: [], acceptedRowIndexesBySheet: new Map() };
      if (state.pendingBaseAnalysisCache?.key === key) return state.pendingBaseAnalysisCache.value;
      const value = analyzeBaseRows(pendingBaseDefinition());
      state.pendingBaseAnalysisCache = { key, value };
      return value;
    }

    function invalidatePendingBaseAnalysis() {
      state.pendingBaseAnalysisCache = null;
    }

    function renderBaseFilterSummary(analysis = getPendingBaseAnalysis()) {
      const button = el("baseReviewBtn");
      const rows = analysis.reviewRows || [];
      button.disabled = !rows.length;
      button.textContent = `Revisar linhas (${rows.length})`;
      el("baseFilterSummary").innerHTML = analysis.ready
        ? `<span><strong>${analysis.records.length}</strong> item(ns) válido(s)</span><span><strong>${analysis.discardedRows.length}</strong> linha(s) desconsiderada(s)</span>`
        : `<span>Conclua o mapeamento para filtrar os itens.</span>`;
    }

    function addPendingBase({ allowDuplicate = false } = {}) {
      try {
        clearError();
        if (!state.pendingBaseWorkbook) throw new Error("Selecione um arquivo de base antes de adicionar.");
        const sheet = selectedPendingBaseSheet();
        if (!sheet) throw new Error("Selecione uma aba da base.");
        const sourceCheck = renderBaseSourceValidation();
        if (!sourceCheck.valid) throw new Error(sourceCheck.message);
        if (!baseMappingValid()) throw new Error("Selecione as colunas Código, Descrição, Unidade e Preço da base.");
        if (sourceCheck.duplicate && !allowDuplicate) {
          openDuplicateBaseDialog(sourceCheck.duplicate.name);
          return;
        }

        const base = {
          id: state.nextBaseId,
          name: sourceCheck.name,
          sourceIdentifier: sourceCheck.source.label,
          sourceKey: sourceCheck.source.key,
          fileName: state.pendingBaseWorkbook.fileName || "",
          workbook: state.pendingBaseWorkbook,
          sheetNames: [sheet.name],
          headerRow: Math.max(1, Number(el("baseHeaderRow").value || 1)),
          codeCol: el("baseCodeCol").value,
          valueCol: el("baseValueCol").value,
          descCol: el("baseDescCol").value,
          unitCol: el("baseUnitCol").value,
          records: [],
          reviewRows: [],
          discardedRows: [],
          stats: null,
        };
        updateBaseData(base);
        if (!base.records.length) {
          throw new Error("Nenhum item com código, descrição, unidade e preço válido foi encontrado. Verifique o cabeçalho, o mapeamento e os valores da base.");
        }
        state.pendingBaseDraft = base;
        openBaseReview(base, { confirmAdd: true, auditBases: [...state.bases, base] });
      } catch (err) { showError(err); }
    }

    function commitPendingBaseDraft() {
      const base = state.pendingBaseDraft;
      if (!base) return;
      try {
        if (state.bases.some((item) => item.id === base.id)) return;
        state.nextBaseId += 1;
        state.bases.push(base);
        auditBaseConflicts();
        renderBaseList();
        clearResults();
        const dialog = el("reviewDialog");
        if (typeof dialog.close === "function") dialog.close();
        else dialog.removeAttribute("open");
        state.reviewContext = null;
        state.pendingBaseDraft = null;
        populatePendingBaseSheetSelect();
        const feedback = el("baseAddFeedback");
        const remaining = state.pendingBaseWorkbook.sheets.length - pendingBaseAddedSheetCount();
        feedback.textContent = remaining > 0
          ? `Base “${base.name}” adicionada. Selecione outra aba disponível deste arquivo.`
          : `Base “${base.name}” adicionada. Todas as abas deste arquivo já foram incluídas.`;
        feedback.classList.remove("hidden");
        if (el("baseSheet").value) {
          populateBaseSourceIdentifierSelect(false);
          detectAndApplyHeader("base");
        } else {
          el("baseSourceIdentifier").value = "";
          state.pendingBaseAutoSourceKey = "";
          for (const id of ["baseCodeCol", "baseValueCol", "baseDescCol", "baseUnitCol"]) {
            el(id).innerHTML = "";
            el(id).disabled = true;
          }
          el("basePreviewTable").tHead.innerHTML = "";
          el("basePreviewTable").tBodies[0].innerHTML = "";
          el("baseColumnSummary").innerHTML = "";
          invalidatePendingBaseAnalysis();
          renderBaseFilterSummary();
        }
        refreshCompareButton();
      } catch (err) { showError(err); }
    }

    function resetPendingBaseForm() {
      invalidatePendingBaseAnalysis();
      state.pendingBaseDraft = null;
      state.pendingBaseWorkbook = null;
      state.pendingBaseAutoSourceKey = "";
      el("baseFile").value = "";
      el("baseSourceIdentifier").innerHTML = "";
      el("baseSourceIdentifier").disabled = true;
      el("baseSourceFeedback").textContent = "";
      el("baseSourceFeedback").classList.remove("error");
      el("baseStatus").innerHTML = "";
      el("baseAddFeedback").textContent = "";
      el("baseAddFeedback").classList.add("hidden");
      el("baseConfigArea").classList.add("hidden");
      for (const id of ["baseSheet", "baseCodeCol", "baseValueCol", "baseDescCol", "baseUnitCol"]) {
        el(id).innerHTML = "";
        el(id).disabled = true;
      }
      el("basePreviewTable").tHead.innerHTML = "";
      el("basePreviewTable").tBodies[0].innerHTML = "";
      el("baseColumnSummary").innerHTML = "";
      renderBaseFilterSummary();
      refreshCompareButton();
    }

    function renderBaseList() {
      const body = el("baseListTable").tBodies[0];
      body.innerHTML = "";
      state.bases.forEach((base) => {
        const tr = document.createElement("tr");
        const sheetLabel = base.sheetNames.join(", ");
        tr.innerHTML = `
          <td><strong>${escapeHtml(base.sourceIdentifier)}</strong></td>
          <td>${escapeHtml(base.fileName)}<br><span class="small">${escapeHtml(sheetLabel)}</span></td>
          <td class="num">${base.stats.records}</td>
          <td class="num">${base.stats.discardedRows}</td>
          <td><div class="table-actions">
            <button class="secondary" data-base-action="review" data-base-id="${base.id}">Revisar</button>
            <button class="danger" data-base-action="remove" data-base-id="${base.id}">Remover</button>
          </div></td>`;
        body.appendChild(tr);
      });
      el("baseListEmpty").classList.toggle("hidden", state.bases.length > 0);
      el("baseListWrap").classList.toggle("hidden", state.bases.length === 0);
      el("auditBases").textContent = state.bases.length;
    }

    function handleBaseListAction(evt) {
      const button = evt.target.closest("button[data-base-action]");
      if (!button) return;
      const id = Number(button.dataset.baseId);
      const index = state.bases.findIndex((base) => base.id === id);
      if (index < 0) return;
      const action = button.dataset.baseAction;
      if (action === "review") {
        const base = state.bases[index];
        openBaseReview(base, { auditBases: state.bases });
        return;
      }
      if (action !== "remove") return;
      state.bases.splice(index, 1);
      auditBaseConflicts();
      renderBaseList();
      if (state.pendingBaseWorkbook) {
        const preferredSheet = el("baseSheet").value;
        populatePendingBaseSheetSelect(preferredSheet);
        if (el("baseSheet").value) {
          populateBaseSourceIdentifierSelect(false);
          detectAndApplyHeader("base");
        }
      }
      clearResults();
      refreshCompareButton();
    }

    function normalizedComparisonText(value) {
      return String(value ?? "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("pt-BR")
        .replace(/\s+/g, "");
    }

    function normalizedBasePriceKey(record) {
      return Number.isFinite(record.value)
        ? `n:${record.value.toFixed(8)}`
        : "i:indisponivel";
    }

    function groupRecordsBy(records, mapper) {
      const groups = new Map();
      for (const record of records) {
        const key = mapper(record);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(record);
      }
      return groups;
    }

    function buildBaseAudit(bases) {
      const byCode = new Map();
      for (const base of bases || []) {
        for (const record of base.records || []) {
          const key = sourceCodeKey(record.sourceKey, record.code);
          if (!byCode.has(key)) byCode.set(key, []);
          byCode.get(key).push(record);
        }
      }

      const conflicts = [];
      const groups = [];
      let repeatedCodeCount = 0;
      let consistentDuplicateCount = 0;
      for (const [key, records] of byCode) {
        if (records.length < 2) continue;
        repeatedCodeCount++;
        const code = records[0]?.code || "";
        const sourceIdentifier = records[0]?.sourceIdentifier || "";
        const byDescription = groupRecordsBy(records, (record) => normalizedComparisonText(record.description));
        const groupReasons = new Set();
        let hasConflict = false;
        let hasConsistentDuplicate = false;

        for (const [descriptionKey, descriptionRecords] of byDescription) {
          if (descriptionRecords.length < 2) continue;
          const units = new Set(descriptionRecords.map((record) => normalizedComparisonText(record.unit)));
          const prices = new Set(descriptionRecords.map(normalizedBasePriceKey));
          if (units.size === 1 && prices.size === 1) {
            consistentDuplicateCount++;
            hasConsistentDuplicate = true;
            continue;
          }
          hasConflict = true;
          const reasons = [];
          if (units.size > 1) reasons.push("unidade");
          if (prices.size > 1) reasons.push("valor referencial");
          reasons.forEach((reason) => groupReasons.add(reason));
          conflicts.push({
            key: key + "\u0000" + descriptionKey,
            code,
            sourceIdentifier,
            descriptionKey,
            description: descriptionRecords.find((record) => String(record.description ?? "").trim())?.description || "",
            reasons,
            records: descriptionRecords,
          });
        }

        let statusKey;
        let statusLabel;
        let reason;
        if (hasConflict) {
          statusKey = "blocking";
          statusLabel = "Bloqueante";
          reason = "Mesma descrição com divergência em " + [...groupReasons].join(" e ") + ".";
        } else if (byDescription.size > 1) {
          statusKey = "distinct";
          statusLabel = "Descrições distintas";
          reason = "O mesmo código possui descrições diferentes e será tratado como itens distintos.";
        } else {
          statusKey = "consistent";
          statusLabel = "Consolidada";
          reason = hasConsistentDuplicate
            ? "Descrição, unidade e preço iguais; as ocorrências serão consolidadas."
            : "Ocorrências equivalentes serão consolidadas.";
        }
        groups.push({ key, code, sourceIdentifier, statusKey, statusLabel, reason, records });
      }
      return { repeatedCodeCount, consistentDuplicateCount, conflicts, groups };
    }

    function auditBaseConflicts() {
      const audit = buildBaseAudit(state.bases);
      state.repeatedCodeCount = audit.repeatedCodeCount;
      state.consistentDuplicateCount = audit.consistentDuplicateCount;
      state.conflicts = audit.conflicts;
      state.auditGroups = audit.groups;
      state.auditDetailsOpen = false;
      renderConflictAudit();
    }

    function renderConflictAudit() {
      el("auditBases").textContent = state.bases.length;
      el("auditRepeated").textContent = state.repeatedCodeCount;
      el("auditConflicts").textContent = state.conflicts.length;
      const message = el("conflictMessage");
      const button = el("auditDetailsBtn");
      const wrap = el("conflictTableWrap");
      const body = el("conflictTable").tBodies[0];
      body.innerHTML = "";

      const hasDetails = state.auditGroups.length > 0;
      button.classList.toggle("hidden", !hasDetails);
      button.setAttribute("aria-expanded", state.auditDetailsOpen ? "true" : "false");
      button.textContent = state.auditDetailsOpen
        ? "Ocultar detalhes"
        : "Ver detalhes (" + state.auditGroups.length + ")";

      if (!state.bases.length) {
        message.className = "audit-message";
        message.textContent = "Adicione uma base para verificar códigos repetidos e possíveis conflitos.";
        wrap.classList.add("hidden");
        return;
      }

      if (state.conflicts.length) {
        message.className = "audit-message warn";
        message.textContent = state.conflicts.length + " duplicidade(s) têm a mesma fonte, código e descrição, mas apresentam unidade ou preço divergente. Corrija ou remova essas ocorrências antes de continuar para a comparação.";
      } else if (state.repeatedCodeCount) {
        message.className = "audit-message";
        const consistent = state.consistentDuplicateCount
          ? " " + state.consistentDuplicateCount + " grupo(s) equivalente(s) serão consolidados no resultado."
          : "";
        message.textContent = state.repeatedCodeCount + " grupo(s) de fonte e código se repetem. Descrições diferentes serão tratadas como itens distintos." + consistent + " Nenhum conflito bloqueante foi encontrado.";
      } else {
        message.className = "audit-message";
        message.textContent = "Nenhum código repetido foi encontrado dentro da mesma fonte associada.";
        wrap.classList.add("hidden");
        return;
      }

      for (const group of state.auditGroups) {
        const tr = document.createElement("tr");
        const occurrences = group.records.map((record) => {
          const location = [record.fileName, record.sheet].filter(Boolean).join(" / ");
          const value = money(record.value) || record.valueRaw || "valor vazio";
          return "<li><strong>" + escapeHtml(record.baseName) + "</strong> — "
            + escapeHtml(location) + ", linha " + escapeHtml(record.rowNumber) + ": "
            + escapeHtml(value) + "; " + escapeHtml(record.unit || "sem unidade") + "; "
            + escapeHtml(record.description || "sem descrição") + "</li>";
        }).join("");
        tr.innerHTML = "<td><span class=\"audit-status " + group.statusKey + "\">" + escapeHtml(group.statusLabel) + "</span></td>"
          + "<td><strong>" + escapeHtml(group.sourceIdentifier) + "</strong></td>"
          + "<td><strong>" + escapeHtml(group.code) + "</strong></td>"
          + "<td>" + escapeHtml(group.reason) + "</td>"
          + "<td><ul class=\"conflict-list\">" + occurrences + "</ul></td>";
        body.appendChild(tr);
      }
      wrap.classList.toggle("hidden", !state.auditDetailsOpen);
    }

    function toggleAuditDetails() {
      if (!state.auditGroups.length) return;
      state.auditDetailsOpen = !state.auditDetailsOpen;
      renderConflictAudit();
    }

    function rebuildAllBaseRecords() {
      invalidateProjectAnalysis();
      invalidatePendingBaseAnalysis();
      for (const base of state.bases) {
        updateBaseData(base);
      }
      auditBaseConflicts();
      renderBaseList();
      if (state.projectWorkbook) {
        renderProjectSourceIdentifiers();
        renderProjectPreview();
      }
      if (state.pendingBaseWorkbook) renderBasePreview();
      if (state.conflicts.length) clearResults();
      else if (state.results.length && state.projectWorkbook && state.bases.length) compare();
      refreshCompareButton();
    }

    function sourceCodeKey(sourceKey, code) {
      return `${sourceKey || ""}\u0000${code || ""}`;
    }

    function buildBaseIndex() {
      const index = new Map();
      for (const base of state.bases) {
        for (const record of base.records) {
          const key = sourceCodeKey(record.sourceKey, record.code);
          if (!index.has(key)) index.set(key, []);
          index.get(key).push(record);
        }
      }
      return index;
    }

    function resolveBaseMatches(matches, projectDescription) {
      if (matches.length <= 1) return { records: matches, usedDescription: false };
      const descriptionKey = normalizedComparisonText(projectDescription);
      return {
        records: matches.filter((record) => normalizedComparisonText(record.description) === descriptionKey),
        usedDescription: true,
      };
    }

    function joinUniqueRecordValues(records, mapper, separator = "; ") {
      const values = [];
      const seen = new Set();
      for (const record of records) {
        const value = String(mapper(record) ?? "").trim();
        if (!value || seen.has(value)) continue;
        seen.add(value);
        values.push(value);
      }
      return values.join(separator);
    }

    function joinedBaseRows(records) {
      return joinUniqueRecordValues(records, (record) =>
        `${record.fileName || record.baseName} / ${record.sheet}, linha ${record.rowNumber}`
      );
    }

    function classify(projectValue, baseValue, tolerance) {
      const diff = projectValue - baseValue;
      if (Math.abs(diff) <= tolerance) return { key: "igual", label: "Igual" };
      if (diff < 0) return { key: "abaixo", label: "Abaixo" };
      return { key: "acima", label: "Acima" };
    }

    function comparisonClassification(projectValue, baseValue, tolerance) {
      if (!Number.isFinite(projectValue) || !Number.isFinite(baseValue)) {
        return { key: "nao-encontrado", label: "Não encontrado" };
      }
      return classify(projectValue, baseValue, tolerance);
    }

    function applyBudgetParticipation(results) {
      const totalWithBdi = results.reduce((sum, result) => Number.isFinite(result.projectTotalWithBdi)
        ? sum + result.projectTotalWithBdi
        : sum, 0);
      for (const result of results) {
        result.projectTotalShare = totalWithBdi > 0 && Number.isFinite(result.projectTotalWithBdi)
          ? result.projectTotalWithBdi / totalWithBdi
          : NaN;
      }
      return totalWithBdi;
    }

    /* SICORP_V41_INTEGRATION_START */
    async function compare() {
      try {
        clearError();
        if (!state.projectWorkbook) throw new Error("Carregue a planilha do projeto.");
        if (!state.budgetAudit?.canProceed) throw new Error("Conclua a conferência dos cálculos do orçamento.");
        if (!state.bases.length) throw new Error("Adicione pelo menos uma base referencial.");
        const projectSheetName = el("projectSheet").value;
        const itemMapping = projectItemMapping();
        const priceMapping = projectPriceMapping();
        if (!itemMapping.valid) throw new Error("Selecione as colunas Código, Descrição, Unidade, Quantidade e Fonte do orçamento.");
        if (!priceMapping.valid) throw new Error("Mapeie o total do item e pelo menos dois componentes de preço.");
        setLoading(true, "Calculando resultados…", "Comparando o orçamento com as bases referenciais.");
        await yieldForPaint();
        const execution = globalThis.SicorpCore.runComparisonFromLegacyState({
          projectWorkbook: state.projectWorkbook,
          projectSheetName,
          projectHeaderRow: Math.max(1, Number(el("projectHeaderRow").value || 1)),
          projectMapping: {
            code: itemMapping.codeCol,
            source: itemMapping.sourceCol,
            description: itemMapping.descriptionCol,
            unit: itemMapping.unitCol,
            quantity: itemMapping.quantityCol,
            priceWithoutBdi: priceMapping.withoutBdiCol,
            bdi: priceMapping.bdiCol,
            priceWithBdi: priceMapping.withBdiCol,
            totalWithBdi: priceMapping.totalWithBdiCol,
          },
          bases: state.bases,
          tolerance: Math.max(0, Number(el("tolerance").value || 0)),
          codePolicy: {
            caseInsensitive: el("caseInsensitive").checked,
            stripSeparators: el("normalizeCodes").checked,
          },
        });
        state.results = execution.view.results;
        state.resultSort = execution.view.defaultSort;
        state.sourceValueAbcFilter = "all";
        renderResults();
        refreshWizardState();
      } catch (err) { showError(err); }
      finally { setLoading(false); }
    }
    /* SICORP_V41_INTEGRATION_END */
    function resultClass(key) {
      return {
        "acima": "status-acima",
        "abaixo": "status-abaixo",
        "igual": "status-igual",
        "nao-encontrado": "status-nao",
      }[key] || "";
    }

    function visibleStatuses() {
      return new Set([...document.querySelectorAll("#statusFilters [data-status] input[type='checkbox']")]
        .filter((input) => input.checked)
        .map((input) => input.closest("[data-status]").dataset.status));
    }

    function setAllStatusVisibility(visible) {
      for (const input of document.querySelectorAll("#statusFilters [data-status] input[type='checkbox']")) input.checked = visible;
      renderResults();
    }

    function setOnlyStatusVisibility(statusKey) {
      for (const input of document.querySelectorAll("#statusFilters [data-status] input[type='checkbox']")) {
        input.checked = input.closest("[data-status]").dataset.status === statusKey;
      }
      renderResults();
    }

    function filteredResults() {
      const statuses = visibleStatuses();
      const query = normalizeText(el("searchText").value);
      const filtered = state.results.filter((r) => {
        if (!statuses.has(r.statusKey)) return false;
        if (!query) return true;
        const hay = normalizeText([
          r.status, r.code, r.normalizedCode, r.projectDescription, r.projectUnit,
          r.projectSource, r.projectValueSource, r.baseName, r.baseDescription, r.baseUnit
        ].join(" "));
        return hay.includes(query);
      });
      return sortComparisonResults(filtered);
    }

    function sortComparisonResults(results) {
      const column = comparisonColumnDefinitions().find((definition) => definition.key === state.resultSort.key)
        || comparisonColumnDefinitions().find((definition) => definition.key === "projectTotalWithBdi");
      const direction = state.resultSort.direction === "asc" ? 1 : -1;
      const numeric = ["money", "percent", "integer"].includes(column.type);
      return results.map((result, index) => ({ result, index })).sort((aEntry, bEntry) => {
        const a = column.sortValue ? column.sortValue(aEntry.result) : column.value(aEntry.result);
        const b = column.sortValue ? column.sortValue(bEntry.result) : column.value(bEntry.result);
        const aMissing = numeric ? !Number.isFinite(a) : String(a ?? "").trim() === "";
        const bMissing = numeric ? !Number.isFinite(b) : String(b ?? "").trim() === "";
        if (aMissing !== bMissing) return aMissing ? 1 : -1;
        if (aMissing && bMissing) return aEntry.index - bEntry.index;
        let comparison;
        if (numeric) comparison = a - b;
        else comparison = String(a).localeCompare(String(b), "pt-BR", { numeric: true, sensitivity: "base" });
        if (comparison) return comparison * direction;
        const rowDifference = Number(aEntry.result.projectRow || 0) - Number(bEntry.result.projectRow || 0);
        return rowDifference || aEntry.index - bEntry.index;
      }).map((entry) => entry.result);
    }

    function setResultSort(key) {
      if (!comparisonColumnDefinitions().some((column) => column.key === key)) return;
      if (state.resultSort.key === key) {
        state.resultSort.direction = state.resultSort.direction === "asc" ? "desc" : "asc";
      } else {
        state.resultSort = { key, direction: "asc" };
      }
      renderResults();
    }

    function updateStatusFilterCounts() {
      const counts = { acima: 0, abaixo: 0, igual: 0, "nao-encontrado": 0 };
      for (const result of state.results) counts[result.statusKey] = (counts[result.statusKey] || 0) + 1;
      for (const marker of document.querySelectorAll("[data-count]")) {
        marker.textContent = `(${counts[marker.dataset.count] || 0})`;
      }
    }

    function summarizeBudgetValues(results) {
      let value = 0;
      let knownItems = 0;
      let unavailableItems = 0;
      for (const result of results) {
        const itemTotal = result.projectTotalWithBdi;
        if (Number.isFinite(itemTotal)) {
          value += itemTotal;
          knownItems++;
        } else {
          unavailableItems++;
        }
      }
      return { value, knownItems, unavailableItems };
    }

    function metricValueText(results) {
      if (!results.length) return money(0);
      const totals = summarizeBudgetValues(results);
      if (!totals.unavailableItems) return money(totals.value);
      if (!totals.knownItems) return "indisponível";
      return `${money(totals.value)}*`;
    }

    function metricPercentText(results, overallTotals) {
      if (!results.length) return percent(0);
      const totals = summarizeBudgetValues(results);
      if (!totals.knownItems || !(overallTotals.value > 0)) return "indisponível";
      const value = percent(totals.value / overallTotals.value);
      return totals.unavailableItems ? `${value}*` : value;
    }

    function updateSummaryCardSelection() {
      const inputs = [...document.querySelectorAll("#statusFilters [data-status] input[type='checkbox']")];
      const selected = visibleStatuses();
      const allSelected = inputs.length > 0 && selected.size === inputs.length;
      for (const card of document.querySelectorAll("#summary [data-summary-status]")) {
        const statusKey = card.dataset.summaryStatus;
        const active = statusKey === "all" ? allSelected : selected.size === 1 && selected.has(statusKey);
        card.classList.toggle("active", active);
        card.setAttribute("aria-pressed", active ? "true" : "false");
      }
    }

    function renderSummary() {
      const cards = [
        { statusKey: null, countId: "mTotal", valueId: "mTotalValue", percentId: "mTotalPercent" },
        { statusKey: "acima", countId: "mAbove", valueId: "mAboveValue", percentId: "mAbovePercent" },
        { statusKey: "abaixo", countId: "mBelow", valueId: "mBelowValue", percentId: "mBelowPercent" },
        { statusKey: "igual", countId: "mEqual", valueId: "mEqualValue", percentId: "mEqualPercent" },
        { statusKey: "nao-encontrado", countId: "mMissing", valueId: "mMissingValue", percentId: "mMissingPercent" },
      ];
      const overallTotals = summarizeBudgetValues(state.results);
      for (const card of cards) {
        const results = card.statusKey
          ? state.results.filter((result) => result.statusKey === card.statusKey)
          : state.results;
        el(card.countId).textContent = String(results.length);
        el(card.valueId).textContent = metricValueText(results);
        el(card.percentId).textContent = metricPercentText(results, overallTotals);
      }
      el("summaryPanel").classList.toggle("hidden", state.results.length === 0);
      updateStatusFilterCounts();
      updateSummaryCardSelection();
    }

    function normalizedResultComparisonField(value) {
      return String(value ?? "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("pt-BR")
        .replace(/\s+/g, "");
    }

    function resultFieldDiffers(result, field) {
      const keys = field === "description"
        ? ["projectDescription", "baseDescription"]
        : field === "unit"
          ? ["projectUnit", "baseUnit"]
          : [];
      if (!keys.length) return false;
      const hasReference = [result.baseName, result.baseFile, result.baseRow]
        .some((value) => String(value ?? "").trim() !== "");
      if (!hasReference) return false;
      return normalizedResultComparisonField(result[keys[0]])
        !== normalizedResultComparisonField(result[keys[1]]);
    }

    function curveAbcClassMap(results) {
      const classes = new Map();
      const sortable = results
        .map((result, index) => ({ result, index, value: result.projectTotalWithBdi }))
        .filter((entry) => Number.isFinite(entry.value) && entry.value >= 0)
        .sort((left, right) => right.value - left.value || left.index - right.index);
      const total = sortable.reduce((sum, entry) => sum + entry.value, 0);
      if (!(total > 0)) return classes;
      let cumulative = 0;
      for (const entry of sortable) {
        cumulative += entry.value / total;
        const abcClass = cumulative <= 0.50 ? "A" : cumulative <= 0.80 ? "B" : "C";
        classes.set(entry.result, abcClass);
      }
      return classes;
    }

    const sourceValueStatusDefinitions = [
      { key: "acima", label: "Acima" },
      { key: "abaixo", label: "Abaixo" },
      { key: "igual", label: "Igual" },
      { key: "nao-encontrado", label: "Não encontrado" },
    ];

    function sourceValueChartData(results, abcFilter = "all") {
      const classes = curveAbcClassMap(results);
      const scoped = abcFilter === "all"
        ? results
        : results.filter((result) => classes.get(result) === abcFilter);
      const groups = new Map();
      let withoutSource = 0;
      let withoutValue = 0;
      for (const result of scoped) {
        const sourceName = String(result.projectSource || "").trim();
        const sourceKey = String(result.projectSourceKey || normalizeSourceKey(sourceName)).trim();
        const value = result.projectTotalWithBdi;
        if (!sourceKey) withoutSource += 1;
        if (!Number.isFinite(value) || value < 0) withoutValue += 1;
        if (!sourceKey || !Number.isFinite(value) || value < 0) continue;
        if (!groups.has(sourceKey)) {
          groups.set(sourceKey, {
            sourceKey,
            sourceName: sourceName || sourceKey,
            value: 0,
            itemCount: 0,
            statusValues: Object.fromEntries(sourceValueStatusDefinitions.map(({ key }) => [key, {
              value: 0,
              itemCount: 0,
            }])),
          });
        }
        const group = groups.get(sourceKey);
        group.value += value;
        group.itemCount += 1;
        const statusKey = sourceValueStatusDefinitions.some(({ key }) => key === result.statusKey)
          ? result.statusKey
          : "nao-encontrado";
        group.statusValues[statusKey].value += value;
        group.statusValues[statusKey].itemCount += 1;
      }
      const coveredValue = [...groups.values()].reduce((sum, group) => sum + group.value, 0);
      const bars = [...groups.values()]
        .map((group) => ({
          ...group,
          share: coveredValue > 0 ? group.value / coveredValue : 0,
          segments: sourceValueStatusDefinitions.map(({ key, label }) => ({
            key,
            label,
            value: group.statusValues[key].value,
            itemCount: group.statusValues[key].itemCount,
            share: group.value > 0 ? group.statusValues[key].value / group.value : 0,
            scopeShare: coveredValue > 0 ? group.statusValues[key].value / coveredValue : 0,
          })),
        }))
        .sort((left, right) => right.value - left.value || left.sourceName.localeCompare(right.sourceName, "pt-BR"));
      return {
        abcFilter,
        scopedItemCount: scoped.length,
        coveredItemCount: bars.reduce((sum, bar) => sum + bar.itemCount, 0),
        coveredValue,
        withoutSource,
        withoutValue,
        bars,
      };
    }

    function setSourceValueAbcFilter(filter) {
      if (!["all", "A", "B", "C"].includes(filter)) return;
      state.sourceValueAbcFilter = filter;
      renderSourceValueChart();
    }

    function selectedProjectColumnLabel(selectId, fallback) {
      const sheet = sheetByName(state.projectWorkbook, el("projectSheet")?.value);
      const index = Number(el(selectId)?.value);
      if (!sheet || !Number.isInteger(index) || index < 0) return fallback;
      const header = getHeader(sheet, el("projectHeaderRow")?.value);
      return String(header?.[index] ?? "").trim().replace(/\s+/g, " ") || fallback;
    }

    function renderSourceValueChart() {
      const panel = el("sourceValueChartPanel");
      const hasResults = state.results.length > 0;
      panel.classList.toggle("hidden", !hasResults);
      if (!hasResults) {
        el("sourceValueChartSummary").innerHTML = "";
        el("sourceValueChartBars").innerHTML = "";
        return;
      }
      const totalColumnLabel = selectedProjectColumnLabel("projectTotalWithBdiCol", "Valor total com BDI");
      el("sourceValueChartDescription").textContent = `Distribuição calculada pela coluna "${totalColumnLabel}", agrupada pela Fonte declarada no orçamento e dividida pelo resultado da comparação.`;
      const data = sourceValueChartData(state.results, state.sourceValueAbcFilter);
      for (const button of document.querySelectorAll("#sourceValueChartFilters [data-abc-filter]")) {
        const active = button.dataset.abcFilter === state.sourceValueAbcFilter;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      }
      const classLabel = data.abcFilter === "all" ? "Todas as classes" : `Classe ${data.abcFilter}`;
      el("sourceValueChartSummary").innerHTML = [
        `<span><strong>${escapeHtml(classLabel)}</strong></span>`,
        `<span><strong>${data.coveredItemCount}</strong> item(ns) com Fonte declarada e valor</span>`,
        `<span><strong>${money(data.coveredValue)}</strong> analisados</span>`,
        data.withoutSource ? `<span><strong>${data.withoutSource}</strong> sem Fonte declarada</span>` : "",
        data.withoutValue ? `<span><strong>${data.withoutValue}</strong> sem valor disponível</span>` : "",
      ].filter(Boolean).join("");
      const bars = el("sourceValueChartBars");
      if (!data.bars.length || !(data.coveredValue > 0)) {
        bars.innerHTML = '<div class="source-value-chart-empty">Não há itens com Fonte declarada e valor disponível neste filtro da Curva ABC.</div>';
        bars.setAttribute("aria-label", `Gráfico sem dados para ${classLabel}`);
        return;
      }
      bars.innerHTML = data.bars.map((bar) => {
        const percentageOfScope = percent(bar.share);
        const segmentSummary = bar.segments
          .filter((segment) => segment.itemCount > 0)
          .map((segment) => `${segment.label}: ${money(segment.value)} (${percent(segment.share)})`)
          .join("; ");
        const segments = bar.segments
          .filter((segment) => segment.value > 0)
          .map((segment) => {
            const width = Math.max(0, Math.min(100, segment.scopeShare * 100));
            const title = `${segment.label}: ${money(segment.value)}, ${percent(segment.share)} da Fonte e ${percent(segment.scopeShare)} do filtro, ${segment.itemCount} item(ns)`;
            return `<div class="source-value-chart-segment status-${segment.key}" style="width:${width.toFixed(4)}%" title="${escapeHtml(title)}"></div>`;
          }).join("");
        const rowTitle = `${bar.sourceName}: ${money(bar.value)}, ${percentageOfScope} do filtro. ${segmentSummary}`;
        return `<div class="source-value-chart-row" title="${escapeHtml(rowTitle)}">
          <div class="source-value-chart-label">${escapeHtml(bar.sourceName)}</div>
          <div class="source-value-chart-track" role="img" aria-label="${escapeHtml(`${bar.sourceName}. ${segmentSummary}`)}">${segments}</div>
          <div class="source-value-chart-value"><strong>${escapeHtml(money(bar.value))}</strong> · ${escapeHtml(percentageOfScope)} do filtro · ${bar.itemCount} item(ns)</div>
        </div>`;
      }).join("");
      bars.setAttribute(
        "aria-label",
        `Gráfico com ${data.bars.length} Fonte(s) declarada(s) no orçamento em ${classLabel}.`,
      );
    }

    const RESULT_COLUMN_STORAGE_KEY = "sicorp.result.visibleColumns.v1";

    function allResultColumnKeys() {
      return comparisonColumnDefinitions().map((column) => column.key);
    }

    function uniqueValidResultColumnKeys(keys, validKeys) {
      const seen = new Set();
      return (Array.isArray(keys) ? keys : []).filter((key) => {
        if (!validKeys.has(key) || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    function loadResultColumnConfiguration() {
      const defaultOrder = allResultColumnKeys();
      const validKeys = new Set(defaultOrder);
      try {
        const saved = JSON.parse(globalThis.localStorage?.getItem(RESULT_COLUMN_STORAGE_KEY) || "null");
        if (Array.isArray(saved)) {
          const visible = uniqueValidResultColumnKeys(saved, validKeys);
          if (visible.length) return { order: defaultOrder, visible };
        }
        if (saved && typeof saved === "object") {
          const savedOrder = uniqueValidResultColumnKeys(saved.order, validKeys);
          const orderSet = new Set(savedOrder);
          const order = [...savedOrder, ...defaultOrder.filter((key) => !orderSet.has(key))];
          const visibleSet = new Set(uniqueValidResultColumnKeys(saved.visible, validKeys));
          const visible = order.filter((key) => visibleSet.has(key));
          if (visible.length) return { order, visible };
        }
      } catch (error) {
        console.warn("Não foi possível carregar a seleção de colunas salva.", error);
      }
      return { order: defaultOrder, visible: [...defaultOrder] };
    }

    function ensureResultColumnConfiguration() {
      if (Array.isArray(state.resultColumnOrderKeys) && state.resultColumnOrderKeys.length
        && Array.isArray(state.resultVisibleColumnKeys) && state.resultVisibleColumnKeys.length) return;
      const configuration = loadResultColumnConfiguration();
      state.resultColumnOrderKeys = configuration.order;
      state.resultVisibleColumnKeys = configuration.visible;
    }

    function resultColumnOrderKeys() {
      ensureResultColumnConfiguration();
      return state.resultColumnOrderKeys;
    }

    function resultVisibleColumnKeys() {
      ensureResultColumnConfiguration();
      return state.resultVisibleColumnKeys;
    }

    function visibleComparisonColumnDefinitions() {
      const definitions = comparisonColumnDefinitions();
      const definitionsByKey = new Map(definitions.map((column) => [column.key, column]));
      const selected = new Set(resultVisibleColumnKeys());
      const visible = resultColumnOrderKeys()
        .filter((key) => selected.has(key))
        .map((key) => definitionsByKey.get(key))
        .filter(Boolean);
      return visible.length ? visible : definitions;
    }

    function saveResultColumnConfiguration(order, visible) {
      state.resultColumnOrderKeys = [...order];
      state.resultVisibleColumnKeys = [...visible];
      try {
        globalThis.localStorage?.setItem(RESULT_COLUMN_STORAGE_KEY, JSON.stringify({
          schemaVersion: 2,
          order: state.resultColumnOrderKeys,
          visible: state.resultVisibleColumnKeys,
        }));
      } catch (error) {
        console.warn("Não foi possível salvar a seleção de colunas neste navegador.", error);
      }
    }

    function renderResultColumnCount() {
      const selectedCount = visibleComparisonColumnDefinitions().length;
      const totalCount = comparisonColumnDefinitions().length;
      el("resultColumnCount").textContent = `${selectedCount} de ${totalCount} colunas visíveis e exportadas`;
    }

    function renderResultColumnSelector() {
      const selected = new Set(resultVisibleColumnKeys());
      const definitionsByKey = new Map(comparisonColumnDefinitions().map((column) => [column.key, column]));
      const orderedDefinitions = resultColumnOrderKeys().map((key) => definitionsByKey.get(key)).filter(Boolean);
      el("resultColumnsGrid").innerHTML = orderedDefinitions.map((column, index) => `
        <div class="column-selector-option" draggable="true" data-result-column-row="${escapeHtml(column.key)}">
          <span class="column-drag-handle" aria-hidden="true" title="Arraste para mudar a ordem">⠿</span>
          <label class="column-selector-label">
            <input type="checkbox" data-result-column-key="${escapeHtml(column.key)}" ${selected.has(column.key) ? "checked" : ""} />
            <span>${escapeHtml(column.header)}</span>
          </label>
          <span class="column-order-controls">
            <button type="button" class="column-order-button" data-column-move="up" aria-label="Mover ${escapeHtml(column.header)} para cima" ${index === 0 ? "disabled" : ""}>↑</button>
            <button type="button" class="column-order-button" data-column-move="down" aria-label="Mover ${escapeHtml(column.header)} para baixo" ${index === orderedDefinitions.length - 1 ? "disabled" : ""}>↓</button>
          </span>
        </div>
      `).join("");
      el("resultColumnsError").textContent = "";
      updateResultColumnSelectorState();
    }

    function openResultColumnSelector() {
      renderResultColumnSelector();
      const dialog = el("resultColumnsDialog");
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }

    function closeResultColumnSelector() {
      const dialog = el("resultColumnsDialog");
      if (typeof dialog.close === "function" && dialog.open) dialog.close();
      else dialog.removeAttribute("open");
      el("resultColumnsError").textContent = "";
    }

    function setAllResultColumnSelectorCheckboxes(checked) {
      for (const checkbox of el("resultColumnsGrid").querySelectorAll("[data-result-column-key]")) {
        checkbox.checked = checked;
      }
      el("resultColumnsError").textContent = "";
      updateResultColumnSelectorState();
    }

    function updateResultColumnSelectorState() {
      const rows = [...el("resultColumnsGrid").querySelectorAll("[data-result-column-row]")];
      rows.forEach((row, index) => {
        const up = row.querySelector('[data-column-move="up"]');
        const down = row.querySelector('[data-column-move="down"]');
        if (up) up.disabled = index === 0;
        if (down) down.disabled = index === rows.length - 1;
      });
      const selectedCount = el("resultColumnsGrid").querySelectorAll("[data-result-column-key]:checked").length;
      el("resultColumnsDialogCount").textContent = `${selectedCount} coluna(s) selecionada(s)`;
    }

    function moveResultColumnSelectorRow(button) {
      const row = button.closest("[data-result-column-row]");
      if (!row) return;
      if (button.dataset.columnMove === "up" && row.previousElementSibling) {
        row.parentElement.insertBefore(row, row.previousElementSibling);
      } else if (button.dataset.columnMove === "down" && row.nextElementSibling) {
        row.parentElement.insertBefore(row.nextElementSibling, row);
      }
      updateResultColumnSelectorState();
      button.focus();
    }

    function restoreDefaultResultColumnOrder() {
      const grid = el("resultColumnsGrid");
      const rowsByKey = new Map(
        [...grid.querySelectorAll("[data-result-column-row]")]
          .map((row) => [row.dataset.resultColumnRow, row]),
      );
      for (const key of allResultColumnKeys()) {
        const row = rowsByKey.get(key);
        if (row) grid.appendChild(row);
      }
      updateResultColumnSelectorState();
    }

    function startResultColumnDrag(event) {
      const row = event.target.closest("[data-result-column-row]");
      if (!row) return;
      state.resultColumnDragKey = row.dataset.resultColumnRow;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", state.resultColumnDragKey);
      row.classList.add("dragging");
    }

    function moveDraggedResultColumn(event) {
      if (!state.resultColumnDragKey) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      const grid = el("resultColumnsGrid");
      const dragged = [...grid.querySelectorAll("[data-result-column-row]")]
        .find((row) => row.dataset.resultColumnRow === state.resultColumnDragKey);
      const target = event.target.closest("[data-result-column-row]");
      if (!dragged) return;
      for (const row of grid.querySelectorAll(".drag-over")) row.classList.remove("drag-over");
      if (!target || target === dragged) {
        if (!target && event.target === grid) grid.appendChild(dragged);
        return;
      }
      target.classList.add("drag-over");
      const after = event.clientY > target.getBoundingClientRect().top + target.offsetHeight / 2;
      grid.insertBefore(dragged, after ? target.nextElementSibling : target);
      updateResultColumnSelectorState();
    }

    function finishResultColumnDrag() {
      state.resultColumnDragKey = "";
      for (const row of el("resultColumnsGrid").querySelectorAll(".dragging, .drag-over")) {
        row.classList.remove("dragging", "drag-over");
      }
      updateResultColumnSelectorState();
    }

    function applyResultColumnSelection() {
      const rows = [...el("resultColumnsGrid").querySelectorAll("[data-result-column-row]")];
      const order = rows.map((row) => row.dataset.resultColumnRow);
      const checked = rows
        .filter((row) => row.querySelector("[data-result-column-key]")?.checked)
        .map((row) => row.dataset.resultColumnRow);
      if (!checked.length) {
        el("resultColumnsError").textContent = "Selecione pelo menos uma coluna para visualizar e exportar.";
        return;
      }
      const checkedSet = new Set(checked);
      saveResultColumnConfiguration(order, checked);
      if (!checkedSet.has(state.resultSort.key)) {
        const preferredKey = checked.includes("projectTotalWithBdi")
          ? "projectTotalWithBdi"
          : checked.includes("projectRow") ? "projectRow" : checked[0];
        state.resultSort = {
          key: preferredKey,
          direction: preferredKey === "projectTotalWithBdi" ? "desc" : "asc",
        };
      }
      renderResults();
      closeResultColumnSelector();
    }

    function renderResults() {
      renderSummary();
      renderSourceValueChart();
      const rows = filteredResults();
      const table = el("resultTable");
      const columns = visibleComparisonColumnDefinitions();
      table.style.minWidth = columns.length < 8 ? "100%" : "1120px";
      table.tHead.innerHTML = `<tr>${columns.map((column) => {
        const active = state.resultSort.key === column.key;
        const ariaSort = active ? (state.resultSort.direction === "asc" ? "ascending" : "descending") : "none";
        const indicator = active ? (state.resultSort.direction === "asc" ? "▲" : "▼") : "↕";
        return `<th aria-sort="${ariaSort}"><button type="button" class="result-sort-button" data-result-sort="${escapeHtml(column.key)}" title="Ordenar por ${escapeHtml(column.header)}"><span>${escapeHtml(column.header)}</span><span class="result-sort-indicator" aria-hidden="true">${indicator}</span></button></th>`;
      }).join("")}</tr>`;
      const body = table.tBodies[0];
      body.innerHTML = "";
      for (const r of rows) {
        const tr = document.createElement("tr");
        tr.className = resultClass(r.statusKey);
        tr.innerHTML = columns.map((column) => {
          const value = column.value(r);
          const numeric = ["money", "percent", "integer", "quantity"].includes(column.type);
          const divergence = column.divergenceField && resultFieldDiffers(r, column.divergenceField);
          const classes = [numeric ? "num" : "", divergence ? "result-field-divergence" : ""].filter(Boolean).join(" ");
          const title = divergence
            ? ` title="Divergência de ${column.divergenceField === "description" ? "descrição" : "unidade"} entre orçamento e base referencial"`
            : "";
          return `<td class="${classes}"${title}>${escapeHtml(formatComparisonDisplayValue(value, column.type))}</td>`;
        }).join("");
        body.appendChild(tr);
      }
      renderResultColumnCount();
      el("resultPanel").classList.toggle("hidden", state.results.length === 0);
    }

    function formatComparisonDisplayValue(value, type) {
      if (value === null || value === undefined || value === "") return "";
      if (typeof value === "number" && Number.isFinite(value)) {
        if (type === "money") return money(value);
        if (type === "percent") return percent(value);
        if (type === "integer") return String(Math.round(value));
        if (type === "quantity") return value.toLocaleString("pt-BR", { useGrouping: false, maximumFractionDigits: 12 });
      }
      return String(value);
    }

    function comparisonColumnDefinitions() {
      return [
        { key: "status", header: "Status", type: "text", width: 34, value: (r) => r.status },
        { key: "projectRow", header: "Linha orçamento", type: "integer", width: 16, value: (r) => r.projectRow },
        { key: "code", header: "Código", type: "text", width: 18, value: (r) => r.code },
        { key: "projectSource", header: "Base / referência", type: "text", width: 22, value: (r) => r.projectSource },
        { key: "projectDescription", header: "Descrição orçamento", type: "text", width: 48, divergenceField: "description", value: (r) => r.projectDescription },
        { key: "projectUnit", header: "Unid. orçamento", type: "text", width: 18, divergenceField: "unit", value: (r) => r.projectUnit },
        { key: "projectValue", header: "Preço sem BDI", type: "money", width: 18, value: (r) => Number.isFinite(r.projectValue) ? r.projectValue : r.projectValueRaw, sortValue: (r) => r.projectValue },
        { key: "projectBdiRate", header: "BDI", type: "percent", width: 13, value: (r) => Number.isFinite(r.projectBdiRate) ? r.projectBdiRate : r.projectBdiRaw, sortValue: (r) => r.projectBdiRate },
        { key: "projectQuantity", header: "Quantidade", type: "quantity", width: 14, value: (r) => Number.isFinite(r.projectQuantity) ? r.projectQuantity : r.projectQuantityRaw, sortValue: (r) => r.projectQuantity },
        { key: "projectTotalWithBdi", header: "Valor total com BDI", type: "money", width: 22, value: (r) => Number.isFinite(r.projectTotalWithBdi) ? r.projectTotalWithBdi : "", sortValue: (r) => r.projectTotalWithBdi },
        { key: "projectTotalShare", header: "Participação (%)", type: "percent", width: 18, value: (r) => Number.isFinite(r.projectTotalShare) ? r.projectTotalShare : "", sortValue: (r) => r.projectTotalShare },
        { key: "baseRow", header: "Origem / linha da base", type: "text", width: 38, value: (r) => r.baseRow },
        { key: "baseDescription", header: "Descrição base", type: "text", width: 48, divergenceField: "description", value: (r) => r.baseDescription },
        { key: "baseUnit", header: "Unid. base", type: "text", width: 15, divergenceField: "unit", value: (r) => r.baseUnit },
        { key: "baseValue", header: "Preço base", type: "money", width: 16, value: (r) => Number.isFinite(r.baseValue) ? r.baseValue : r.baseValueRaw, sortValue: (r) => r.baseValue },
        { key: "difference", header: "Diferença", type: "money", width: 16, value: (r) => Number.isFinite(r.difference) ? r.difference : "", sortValue: (r) => r.difference },
        { key: "percentDifference", header: "Diferença %", type: "percent", width: 15, value: (r) => Number.isFinite(r.percentDifference) ? r.percentDifference : "", sortValue: (r) => r.percentDifference },
      ];
    }

    function exportColumnDefinitions() {
      return visibleComparisonColumnDefinitions();
    }

    function exportTableData() {
      const columns = exportColumnDefinitions();
      const results = filteredResults();
      return {
        columns,
        rows: results.map((result) => columns.map((column) => column.value(result))),
        statusKeys: results.map((result) => result.statusKey),
      };
    }

    function rowsForExport() {
      const table = exportTableData();
      return table.rows.map((row) => Object.fromEntries(table.columns.map((column, index) => [column.header, row[index]])));
    }

    function roundedExportNumber(value, type) {
      if (!Number.isFinite(value)) return value;
      const decimals = type === "money" ? 2 : type === "percent" ? 10 : type === "integer" ? 0 : 12;
      const rounded = Number(value.toFixed(decimals));
      return Object.is(rounded, -0) ? 0 : rounded;
    }

    function formatTextExportValue(value, type) {
      if (value === null || value === undefined || value === "") return "";
      if (typeof value === "number" && Number.isFinite(value)) {
        if (type === "money") {
          return roundedExportNumber(value, type).toLocaleString("pt-BR", { useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        if (type === "percent") {
          return roundedExportNumber(value, type).toLocaleString("pt-BR", { style: "percent", useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        if (type === "integer") return roundedExportNumber(value, type).toLocaleString("pt-BR", { useGrouping: false, maximumFractionDigits: 0 });
        return value.toLocaleString("pt-BR", { useGrouping: false, maximumFractionDigits: 12 });
      }
      return String(value);
    }

    function textExportTable() {
      const table = exportTableData();
      return {
        headers: table.columns.map((column) => column.header),
        rows: table.rows.map((row) => row.map((value, index) => formatTextExportValue(value, table.columns[index].type))),
      };
    }

    function projectExportStem() {
      const original = String(state.projectWorkbook?.fileName || "orcamento").replace(/\.[^.]+$/, "");
      return original
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
        .replace(/\s+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 80) || "orcamento";
    }

    function exportFilename(extension) {
      return `sicorp_v4_comparacao_${projectExportStem()}.${extension}`;
    }

    function downloadBlob(content, mime, filename) {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    function buildCsvText(table = textExportTable()) {
      const sep = ";";
      return "\ufeff" + [table.headers, ...table.rows].map((row) => row.map((value) => {
        const v = String(value ?? "").replaceAll('"', '""');
        return `"${v}"`;
      }).join(sep)).join("\r\n");
    }

    /* SICORP_V41_EXPORT_INTEGRATION_START */
    function preparedVisibleExport() {
      return globalThis.SicorpCore.prepareComparisonExport({
        results: filteredResults(),
        projectFileName: state.projectWorkbook?.fileName || "orcamento",
        columnKeys: resultVisibleColumnKeys(),
      });
    }

    function exportCsv() {
      const prepared = preparedVisibleExport();
      if (!prepared.hasRows) return;
      downloadBlob(prepared.csv.text, prepared.csv.mime, prepared.csv.filename);
    }

    function exportXlsx() {
      const prepared = preparedVisibleExport();
      if (!prepared.hasRows) return;
      downloadBlob(prepared.xlsx.bytes, prepared.xlsx.mime, prepared.xlsx.filename);
    }

    async function copyTable() {
      const prepared = preparedVisibleExport();
      if (!prepared.hasRows) return;
      await navigator.clipboard.writeText(prepared.clipboardText);
      alert("Tabela copiada para a área de transferência.");
    }
    /* SICORP_V41_EXPORT_INTEGRATION_END */
    function escapeXml(value) {
      return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;"
      })[character]);
    }

    function xlsxColumnName(index) {
      let value = Number(index) + 1;
      let name = "";
      while (value > 0) {
        value--;
        name = String.fromCharCode(65 + (value % 26)) + name;
        value = Math.floor(value / 26);
      }
      return name;
    }

    const xlsxStatusStyles = [
      { key: "acima", color: "FFFBE9DD" },
      { key: "abaixo", color: "FFE6F2F8" },
      { key: "igual", color: "FFE4F4EF" },
      { key: "nao-encontrado", color: "FFE5E7EB" },
    ];

    function xlsxCellStyleId(type, statusKey = "", header = false) {
      if (header) return 1;
      const baseStyle = type === "money" ? 2 : type === "percent" ? 3 : type === "integer" ? 4 : 0;
      const statusIndex = xlsxStatusStyles.findIndex((status) => status.key === statusKey);
      if (statusIndex < 0) return baseStyle;
      const typeOffset = type === "money" ? 1 : type === "percent" ? 2 : type === "integer" ? 3 : 0;
      return 5 + (statusIndex * 4) + typeOffset;
    }

    function xlsxCellXml(reference, value, type, header = false, statusKey = "") {
      const style = xlsxCellStyleId(type, statusKey, header);
      if (header) return `<c r="${reference}" t="inlineStr" s="${style}"><is><t>${escapeXml(value)}</t></is></c>`;
      if (typeof value === "number" && Number.isFinite(value)) {
        return `<c r="${reference}"${style ? ` s="${style}"` : ""}><v>${roundedExportNumber(value, type)}</v></c>`;
      }
      const text = String(value ?? "");
      return `<c r="${reference}" t="inlineStr"${style ? ` s="${style}"` : ""}><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`;
    }

    function buildXlsxWorksheet(table) {
      const allRows = [table.columns.map((column) => column.header), ...table.rows];
      const sheetRows = allRows.map((row, rowIndex) => {
        const statusKey = rowIndex > 0 ? table.statusKeys?.[rowIndex - 1] || "" : "";
        const cells = row.map((value, columnIndex) => xlsxCellXml(
          `${xlsxColumnName(columnIndex)}${rowIndex + 1}`,
          value,
          table.columns[columnIndex]?.type || "text",
          rowIndex === 0,
          statusKey
        )).join("");
        return `<row r="${rowIndex + 1}"${rowIndex === 0 ? ' ht="24" customHeight="1"' : ""}>${cells}</row>`;
      }).join("");
      const lastCell = `${xlsxColumnName(Math.max(0, table.columns.length - 1))}${Math.max(1, allRows.length)}`;
      const columnWidths = table.columns.map((column, index) => `<col min="${index + 1}" max="${index + 1}" width="${column.width || 16}" customWidth="1"/>`).join("");
      return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastCell}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>${columnWidths}</cols>
  <sheetData>${sheetRows}</sheetData>
  <autoFilter ref="A1:${lastCell}"/>
</worksheet>`;
    }

    function buildXlsxStyles() {
      const fills = xlsxStatusStyles.map((status) =>
        `<fill><patternFill patternType="solid"><fgColor rgb="${status.color}"/><bgColor indexed="64"/></patternFill></fill>`
      ).join("");
      const statusCellXfs = xlsxStatusStyles.map((_, statusIndex) => {
        const fillId = statusIndex + 3;
        return [
          `<xf numFmtId="0" fontId="0" fillId="${fillId}" borderId="1" xfId="0" applyFill="1" applyBorder="1"/>`,
          `<xf numFmtId="164" fontId="0" fillId="${fillId}" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/>`,
          `<xf numFmtId="165" fontId="0" fillId="${fillId}" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/>`,
          `<xf numFmtId="1" fontId="0" fillId="${fillId}" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/>`,
        ].join("");
      }).join("");
      const fillCount = 3 + xlsxStatusStyles.length;
      const xfCount = 5 + (xlsxStatusStyles.length * 4);
      return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;R$&quot; #,##0.00;[Red]-&quot;R$&quot; #,##0.00"/><numFmt numFmtId="165" formatCode="0.00%;[Red]-0.00%"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts><fills count="${fillCount}"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1D4ED8"/><bgColor indexed="64"/></patternFill></fill>${fills}</fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD1D5DB"/></left><right style="thin"><color rgb="FFD1D5DB"/></right><top style="thin"><color rgb="FFD1D5DB"/></top><bottom style="thin"><color rgb="FFD1D5DB"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfCount}"><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyAlignment="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/><xf numFmtId="1" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>${statusCellXfs}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
    }

    function crc32(bytes) {
      if (!crc32.table) {
        crc32.table = Array.from({ length: 256 }, (_, index) => {
          let value = index;
          for (let bit = 0; bit < 8; bit++) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
          return value >>> 0;
        });
      }
      let crc = 0xffffffff;
      for (const byte of bytes) crc = crc32.table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
      return (crc ^ 0xffffffff) >>> 0;
    }

    function concatUint8Arrays(parts) {
      const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
      const output = new Uint8Array(totalLength);
      let offset = 0;
      for (const part of parts) {
        output.set(part, offset);
        offset += part.length;
      }
      return output;
    }

    function zipStoredFiles(files) {
      const encoder = new TextEncoder();
      const localParts = [];
      const centralParts = [];
      let localOffset = 0;
      const now = new Date();
      const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
      const dosDate = ((Math.max(1980, now.getFullYear()) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

      for (const [name, content] of Object.entries(files)) {
        const nameBytes = encoder.encode(name);
        const dataBytes = typeof content === "string" ? encoder.encode(content) : content;
        const checksum = crc32(dataBytes);
        const local = new Uint8Array(30 + nameBytes.length + dataBytes.length);
        const localView = new DataView(local.buffer);
        localView.setUint32(0, 0x04034b50, true);
        localView.setUint16(4, 20, true);
        localView.setUint16(6, 0x0800, true);
        localView.setUint16(8, 0, true);
        localView.setUint16(10, dosTime, true);
        localView.setUint16(12, dosDate, true);
        localView.setUint32(14, checksum, true);
        localView.setUint32(18, dataBytes.length, true);
        localView.setUint32(22, dataBytes.length, true);
        localView.setUint16(26, nameBytes.length, true);
        localView.setUint16(28, 0, true);
        local.set(nameBytes, 30);
        local.set(dataBytes, 30 + nameBytes.length);
        localParts.push(local);

        const central = new Uint8Array(46 + nameBytes.length);
        const centralView = new DataView(central.buffer);
        centralView.setUint32(0, 0x02014b50, true);
        centralView.setUint16(4, 20, true);
        centralView.setUint16(6, 20, true);
        centralView.setUint16(8, 0x0800, true);
        centralView.setUint16(10, 0, true);
        centralView.setUint16(12, dosTime, true);
        centralView.setUint16(14, dosDate, true);
        centralView.setUint32(16, checksum, true);
        centralView.setUint32(20, dataBytes.length, true);
        centralView.setUint32(24, dataBytes.length, true);
        centralView.setUint16(28, nameBytes.length, true);
        centralView.setUint16(30, 0, true);
        centralView.setUint16(32, 0, true);
        centralView.setUint16(34, 0, true);
        centralView.setUint16(36, 0, true);
        centralView.setUint32(38, 0, true);
        centralView.setUint32(42, localOffset, true);
        central.set(nameBytes, 46);
        centralParts.push(central);
        localOffset += local.length;
      }

      const centralDirectory = concatUint8Arrays(centralParts);
      const end = new Uint8Array(22);
      const endView = new DataView(end.buffer);
      endView.setUint32(0, 0x06054b50, true);
      endView.setUint16(4, 0, true);
      endView.setUint16(6, 0, true);
      endView.setUint16(8, centralParts.length, true);
      endView.setUint16(10, centralParts.length, true);
      endView.setUint32(12, centralDirectory.length, true);
      endView.setUint32(16, localOffset, true);
      endView.setUint16(20, 0, true);
      return concatUint8Arrays([...localParts, centralDirectory, end]);
    }

    function buildXlsxBytes(table = exportTableData()) {
      const files = {
        "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
        "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
        "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Comparação" sheetId="1" r:id="rId1"/></sheets></workbook>`,
        "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
        "xl/styles.xml": buildXlsxStyles(),
        "xl/worksheets/sheet1.xml": buildXlsxWorksheet(table),
      };
      return zipStoredFiles(files);
    }

    function buildClipboardText(table = textExportTable()) {
      return [table.headers, ...table.rows].map((row) => row.join("\t")).join("\n");
    }

    function clearResults() {
      state.results = [];
      state.resultSort = { key: "projectTotalWithBdi", direction: "desc" };
      state.sourceValueAbcFilter = "all";
      renderResults();
      el("resultPanel").classList.add("hidden");
      el("summaryPanel").classList.add("hidden");
      el("sourceValueChartPanel").classList.add("hidden");
      refreshWizardState();
    }

    function closeComparisonHelpPanels(exceptId = "") {
      for (const button of document.querySelectorAll("[data-comparison-help]")) {
        const panelId = button.dataset.comparisonHelp;
        if (panelId === exceptId) continue;
        button.setAttribute("aria-expanded", "false");
        el(panelId)?.classList.add("hidden");
      }
    }

    function toggleComparisonHelp(button) {
      const panelId = button.dataset.comparisonHelp;
      const panel = el(panelId);
      if (!panel) return;
      const willOpen = button.getAttribute("aria-expanded") !== "true";
      closeComparisonHelpPanels(willOpen ? panelId : "");
      button.setAttribute("aria-expanded", String(willOpen));
      panel.classList.toggle("hidden", !willOpen);
    }

    function wireEvents() {
      el("projectFile").addEventListener("change", onProjectFileChange);
      el("baseFile").addEventListener("change", onBaseFileChange);
      el("baseSourceIdentifier").addEventListener("change", () => {
        state.pendingBaseAutoSourceKey = "";
        invalidatePendingBaseAnalysis();
        el("baseAddFeedback").classList.add("hidden");
        renderBasePreview();
        refreshCompareButton();
      });
      el("projectSheet").addEventListener("change", () => {
        if (state.results.length) clearResults();
        detectAndApplyHeader("project");
      });
      el("baseSheet").addEventListener("change", () => {
        populateBaseSourceIdentifierSelect(false);
        detectAndApplyHeader("base");
        refreshCompareButton();
      });
      el("projectHeaderRow").addEventListener("change", () => {
        if (state.results.length) clearResults();
        updateProjectColumns();
      });
      el("baseHeaderRow").addEventListener("change", () => {
        updateBaseColumns();
      });
      for (const inputId of ["projectHeaderRow", "baseHeaderRow"]) {
        el(inputId).addEventListener("keydown", (evt) => {
          if (evt.key === "ArrowDown" || evt.key === "ArrowUp") {
            evt.preventDefault();
            adjustHeaderRow(inputId, evt.key === "ArrowDown" ? 1 : -1);
          }
        });
      }
      for (const button of document.querySelectorAll("[data-line-target]")) {
        button.addEventListener("click", () => adjustHeaderRow(button.dataset.lineTarget, button.dataset.lineDelta));
      }
      el("addBaseBtn").addEventListener("click", () => addPendingBase());
      el("cancelBaseBtn").addEventListener("click", resetPendingBaseForm);
      el("duplicateBaseCancelBtn").addEventListener("click", closeDuplicateBaseDialog);
      el("duplicateBaseConfirmBtn").addEventListener("click", () => {
        closeDuplicateBaseDialog();
        addPendingBase({ allowDuplicate: true });
      });
      /* A conferência do orçamento é iniciada somente por Conferir e continuar. */
      el("baseReviewBtn").addEventListener("click", () => {
        const previewBase = pendingBaseDefinition();
        if (!previewBase) return;
        updateBaseData(previewBase);
        openBaseReview(previewBase, { auditBases: [...state.bases, previewBase] });
      });
      el("reviewCloseBtn").addEventListener("click", closeReviewDialog);
      el("reviewReturnBtn").addEventListener("click", closeReviewDialog);
      el("reviewConfirmAddBtn").addEventListener("click", commitPendingBaseDraft);
      el("reviewDialog").addEventListener("cancel", (evt) => {
        evt.preventDefault();
        closeReviewDialog();
      });
      el("reviewTreatmentCards").addEventListener("click", (evt) => {
        const card = evt.target.closest("[data-review-filter]");
        if (!card) return;
        activateBaseReviewFilter(card.dataset.reviewFilter);
      });
      el("reviewGroups").addEventListener("click", (evt) => {
        const reasonToggle = evt.target.closest("[data-review-reason-toggle]");
        if (reasonToggle) {
          toggleReviewReasonGroup(reasonToggle);
          return;
        }
        const row = evt.target.closest("[data-review-occurrence]");
        if (!row) return;
        state.reviewSelectedId = row.dataset.reviewOccurrence;
        state.reviewSelectedRowKey = row.dataset.reviewRowKey || "";
        updateReviewSelectedRow(el("reviewGroups"), "data-review-row-key", state.reviewSelectedRowKey);
        renderBaseReviewExplanation();
        focusReviewRow(row, false);
      });
      el("reviewGroups").addEventListener("keydown", (evt) => {
        if (evt.key !== "ArrowDown" && evt.key !== "ArrowUp") return;
        const activePanel = el("reviewGroups").querySelector(`[data-review-category-panel="${state.reviewFilter}"]`);
        const rows = [...(activePanel?.querySelectorAll("[data-review-occurrence][data-review-row-key]") || [])]
          .filter((row) => !row.classList.contains("hidden"));
        if (!rows.length) return;
        evt.preventDefault();
        const current = rows.findIndex((row) => row.dataset.reviewRowKey === state.reviewSelectedRowKey);
        const next = Math.max(0, Math.min(rows.length - 1, (current < 0 ? 0 : current) + (evt.key === "ArrowDown" ? 1 : -1)));
        state.reviewSelectedId = rows[next].dataset.reviewOccurrence;
        state.reviewSelectedRowKey = rows[next].dataset.reviewRowKey;
        updateReviewSelectedRow(el("reviewGroups"), "data-review-row-key", state.reviewSelectedRowKey);
        renderBaseReviewExplanation();
        focusReviewRow(rows[next], true);
      });
      el("baseListTable").addEventListener("click", handleBaseListAction);
      el("auditDetailsBtn").addEventListener("click", toggleAuditDetails);
      el("compareBtn").addEventListener("click", compare);
      document.querySelector(".comparison-options").addEventListener("click", (evt) => {
        const button = evt.target.closest("[data-comparison-help]");
        if (button) toggleComparisonHelp(button);
      });
      el("resultTable").addEventListener("click", (evt) => {
        const button = evt.target.closest("[data-result-sort]");
        if (button) setResultSort(button.dataset.resultSort);
      });
      el("statusFilters").addEventListener("change", renderResults);
      el("showAllStatuses").addEventListener("click", () => setAllStatusVisibility(true));
      el("hideAllStatuses").addEventListener("click", () => setAllStatusVisibility(false));
      el("summary").addEventListener("click", (evt) => {
        const card = evt.target.closest("[data-summary-status]");
        if (!card) return;
        if (card.dataset.summaryStatus === "all") setAllStatusVisibility(true);
        else setOnlyStatusVisibility(card.dataset.summaryStatus);
      });
      el("sourceValueChartFilters").addEventListener("click", (evt) => {
        const button = evt.target.closest("[data-abc-filter]");
        if (button) setSourceValueAbcFilter(button.dataset.abcFilter);
      });
      el("searchText").addEventListener("input", renderResults);
      el("selectResultColumnsBtn").addEventListener("click", openResultColumnSelector);
      el("resultColumnsCancelBtn").addEventListener("click", closeResultColumnSelector);
      el("resultColumnsSelectAllBtn").addEventListener("click", () => setAllResultColumnSelectorCheckboxes(true));
      el("resultColumnsClearAllBtn").addEventListener("click", () => setAllResultColumnSelectorCheckboxes(false));
      el("resultColumnsResetOrderBtn").addEventListener("click", restoreDefaultResultColumnOrder);
      el("resultColumnsApplyBtn").addEventListener("click", applyResultColumnSelection);
      el("resultColumnsGrid").addEventListener("change", () => {
        el("resultColumnsError").textContent = "";
        updateResultColumnSelectorState();
      });
      el("resultColumnsGrid").addEventListener("click", (evt) => {
        const button = evt.target.closest("[data-column-move]");
        if (button) moveResultColumnSelectorRow(button);
      });
      el("resultColumnsGrid").addEventListener("dragstart", startResultColumnDrag);
      el("resultColumnsGrid").addEventListener("dragover", moveDraggedResultColumn);
      el("resultColumnsGrid").addEventListener("drop", (evt) => {
        evt.preventDefault();
        finishResultColumnDrag();
      });
      el("resultColumnsGrid").addEventListener("dragend", finishResultColumnDrag);
      el("resultColumnsDialog").addEventListener("cancel", (evt) => {
        evt.preventDefault();
        closeResultColumnSelector();
      });
      el("exportCsvBtn").addEventListener("click", exportCsv);
      el("exportXlsxBtn").addEventListener("click", exportXlsx);
      el("copyTableBtn").addEventListener("click", copyTable);
      el("clearBtn").addEventListener("click", clearResults);
      el("normalizeCodes").addEventListener("change", rebuildAllBaseRecords);
      el("caseInsensitive").addEventListener("change", rebuildAllBaseRecords);
      for (const button of document.querySelectorAll(".step-button")) {
        button.addEventListener("click", () => goToPage(button.dataset.stepTarget));
      }
      document.addEventListener("click", (evt) => {
        if (!evt.target.closest("[data-comparison-help], .comparison-option-help")) closeComparisonHelpPanels();
        const button = evt.target.closest("[data-go-page]");
        if (button) goToPage(button.dataset.goPage);
        const columnChip = evt.target.closest("[data-preview-table][data-preview-column]");
        if (columnChip?.dataset.previewTable === "projectPreviewTable") renderProjectPreview(columnChip.dataset.previewField);
        else if (columnChip?.dataset.previewTable === "basePreviewTable") renderBasePreview(columnChip.dataset.previewField);
        else if (columnChip) scrollPreviewToColumn(columnChip.dataset.previewTable, columnChip.dataset.previewColumn);
      });
      document.addEventListener("pointerdown", (evt) => {
        if (!previewSelectMenuState) return;
        if (previewSelectMenuState.menu.contains(evt.target) || evt.target === previewSelectMenuState.select) return;
        closePreviewSelectMenu(true);
      }, true);
      document.addEventListener("keydown", (evt) => {
        if (evt.key === "Escape" && previewSelectMenuState) {
          evt.preventDefault();
          closePreviewSelectMenu(true);
        }
        if (evt.key === "Escape") closeComparisonHelpPanels();
      });
      window.addEventListener("resize", () => closePreviewSelectMenu(true));
      for (const { selectId: id, field } of projectPreviewFieldDefinitions) {
        configurePreviewColumnSelect(el(id), "project", field);
        el(id).addEventListener("change", () => {
          if (state.results.length) clearResults();
          invalidateProjectAnalysis();
          renderProjectPriceRule();
          if (["projectCodeCol", "projectDescCol", "projectUnitCol", "projectQuantityCol", "projectSourceCol"].includes(id)) {
            renderProjectSourceIdentifiers();
            populateBaseSourceIdentifierSelect(false);
          }
          renderProjectPreview(field);
          refreshWizardState();
        });
      }
      for (const { selectId: id, field } of basePreviewFieldDefinitions) {
        configurePreviewColumnSelect(el(id), "base", field);
        el(id).addEventListener("change", () => {
          invalidatePendingBaseAnalysis();
          renderBasePreview(field);
          refreshCompareButton();
        });
      }
      configureDropzone("projectDropzone", loadProjectFile);
      configureDropzone("baseDropzone", loadPendingBaseFile);
    }

    /* SICORP_V44_BUDGET_AUDIT_RUNTIME_START */
    state.budgetAudit = null;
    state.budgetAuditBudget = null;
    state.budgetAuditFilter = "blocker";
    state.budgetAuditSelectedId = "";
    state.budgetAuditSelectedRowKey = "";
    state.projectValidationAttempted = false;
    projectPreviewFieldDefinitions.push({
      selectId: "projectTotalWithBdiCol",
      field: "totalWithBdi",
      label: "Valor total com BDI",
      shortLabel: "Total c/ BDI",
    });
    const projectMappingFieldDefinitions = [
      { field: "code", selectId: "projectCodeCol", label: "Código" },
      { field: "source", selectId: "projectSourceCol", label: "Base" },
      { field: "description", selectId: "projectDescCol", label: "Descrição" },
      { field: "unit", selectId: "projectUnitCol", label: "Unidade" },
      { field: "quantity", selectId: "projectQuantityCol", label: "Quantidade" },
      { field: "priceWithoutBdi", selectId: "projectWithoutBdiCol", label: "Preço sem BDI" },
      { field: "bdi", selectId: "projectBdiCol", label: "BDI (%)" },
      { field: "priceWithBdi", selectId: "projectWithBdiCol", label: "Preço com BDI" },
      { field: "totalWithBdi", selectId: "projectTotalWithBdiCol", label: "Valor total com BDI" },
    ];
    state.projectMappingSelectedField = "";
    state.projectMappingInstructionMessage = "";
    state.projectMappingInstructionAwaiting = false;
    const baseMappingFieldDefinitions = [
      { field: "code", selectId: "baseCodeCol", label: "Código" },
      { field: "description", selectId: "baseDescCol", label: "Descrição" },
      { field: "unit", selectId: "baseUnitCol", label: "Unidade" },
      { field: "price", selectId: "baseValueCol", label: "Preço" },
    ];
    state.baseMappingSelectedField = "";
    state.baseMappingInstructionMessage = "";
    state.baseMappingInstructionAwaiting = false;

    function projectMappingDefinition(field) {
      return projectMappingFieldDefinitions.find((definition) => definition.field === field) || null;
    }

    function projectMappingSelect(field) {
      const definition = projectMappingDefinition(field);
      return definition ? el(definition.selectId) : null;
    }

    function projectMappingFieldForColumn(columnIndex) {
      const value = String(columnIndex);
      return projectMappingFieldDefinitions.find((definition) =>
        el(definition.selectId)?.value === value
      )?.field || "";
    }

    function defaultProjectMappingInstruction() {
      return "<strong>1.</strong> Clique em uma função. <strong>2.</strong> Passe o mouse sobre as colunas para conferir. <strong>3.</strong> Clique na coluna para confirmar. Você também pode usar <strong>Mapear automaticamente</strong>.";
    }

    function setProjectMappingInstruction(message = "", awaiting = false) {
      state.projectMappingInstructionMessage = message || defaultProjectMappingInstruction();
      state.projectMappingInstructionAwaiting = awaiting;
      const instruction = el("projectMappingInstruction");
      instruction.innerHTML = state.projectMappingInstructionMessage;
      instruction.classList.toggle("awaiting", awaiting);
    }

    function renderProjectMappingUi() {
      const sheet = sheetByName(state.projectWorkbook, el("projectSheet").value);
      const header = getHeader(sheet, el("projectHeaderRow").value);
      let hasMapping = false;
      for (const chip of document.querySelectorAll("[data-project-mapping-field]")) {
        const definition = projectMappingDefinition(chip.dataset.projectMappingField);
        const select = definition ? el(definition.selectId) : null;
        const mapped = Boolean(select && select.value !== "");
        const selected = definition?.field === state.projectMappingSelectedField;
        hasMapping ||= mapped;
        chip.classList.toggle("mapped", mapped);
        chip.classList.toggle("selected", selected);
        const code = chip.querySelector(".project-field-chip-code");
        const main = chip.querySelector(".project-field-chip-main");
        const columnIndex = mapped ? Number(select.value) : -1;
        const column = mapped ? (columns[columnIndex] || String(columnIndex + 1)) : "";
        const originalHeader = mapped ? String(header?.[columnIndex] ?? "").trim() : "";
        code.textContent = mapped ? "· " + column + " ✓" : "";
        main.setAttribute("aria-pressed", selected ? "true" : "false");
        main.setAttribute(
          "aria-label",
          mapped
            ? definition.label + " mapeado para a coluna " + column
              + (originalHeader ? ', "' + originalHeader + '"' : "") + ". Clique para remapear."
            : "Selecionar " + definition.label,
        );
        chip.title = mapped
          ? definition.label + " → coluna " + column + (originalHeader ? ': "' + originalHeader + '"' : "")
          : definition.label + " ainda não mapeado";
      }
      el("projectAutoMapBtn").disabled = !sheet;
      el("projectClearMappingBtn").disabled = !hasMapping;
      el("projectPreviewTable").classList.toggle(
        "mapping-awaiting-column",
        Boolean(state.projectMappingSelectedField),
      );
      setProjectMappingInstruction(
        state.projectMappingInstructionMessage,
        state.projectMappingInstructionAwaiting,
      );
    }

    function clearProjectMappingColumnHighlight() {
      el("projectPreviewTable").querySelectorAll(".project-mapping-target-column")
        .forEach((cell) => cell.classList.remove("project-mapping-target-column"));
    }

    function highlightProjectMappingColumn(columnIndex, centerColumn = false) {
      clearProjectMappingColumnHighlight();
      if (!Number.isInteger(Number(columnIndex))) return;
      el("projectPreviewTable").querySelectorAll('[data-column-index="' + Number(columnIndex) + '"]')
        .forEach((cell) => cell.classList.add("project-mapping-target-column"));
      if (centerColumn) scrollPreviewToColumn("projectPreviewTable", Number(columnIndex));
    }

    function refreshProjectMapping(message = "", awaiting = false, focusField = null) {
      if (state.results.length) clearResults();
      invalidateProjectAnalysis();
      state.projectMappingInstructionMessage = message || defaultProjectMappingInstruction();
      state.projectMappingInstructionAwaiting = awaiting;
      renderProjectPriceRule();
      renderProjectSourceIdentifiers();
      renderProjectPreview(focusField);
      populateBaseSourceIdentifierSelect(false);
      renderProjectMappingUi();
      refreshWizardState();
    }

    function selectProjectMappingField(field) {
      clearProjectMappingColumnHighlight();
      if (state.projectMappingSelectedField === field) {
        state.projectMappingSelectedField = "";
        state.projectMappingInstructionMessage = defaultProjectMappingInstruction();
        state.projectMappingInstructionAwaiting = false;
        renderProjectPreview();
        renderProjectMappingUi();
        return;
      }
      const definition = projectMappingDefinition(field);
      if (!definition) return;
      state.projectMappingSelectedField = field;
      const select = el(definition.selectId);
      const current = select.value !== ""
        ? " Atualmente está na coluna <strong>" + escapeHtml(columns[Number(select.value)] || String(Number(select.value) + 1)) + "</strong>."
        : "";
      state.projectMappingInstructionMessage = "<strong>" + escapeHtml(definition.label)
        + "</strong> está selecionado." + current
        + " Passe o mouse pelas colunas e clique na coluna correta.";
      state.projectMappingInstructionAwaiting = true;
      renderProjectPreview(field);
      renderProjectMappingUi();
    }

    function assignProjectMappingColumn(field, columnIndex) {
      const definition = projectMappingDefinition(field);
      if (!definition || !Number.isInteger(Number(columnIndex))) return;
      const occupiedField = projectMappingFieldForColumn(columnIndex);
      if (occupiedField && occupiedField !== field) projectMappingSelect(occupiedField).value = "";
      el(definition.selectId).value = String(Number(columnIndex));
      state.projectMappingSelectedField = "";
      const column = columns[Number(columnIndex)] || String(Number(columnIndex) + 1);
      refreshProjectMapping(
        "✓ <strong>" + escapeHtml(definition.label) + "</strong> → coluna <strong>"
          + escapeHtml(column) + "</strong>. Selecione outra função para continuar.",
      );
    }

    function removeProjectMapping(field) {
      const definition = projectMappingDefinition(field);
      if (!definition) return;
      const select = el(definition.selectId);
      const previous = select.value;
      select.value = "";
      if (state.projectMappingSelectedField === field) state.projectMappingSelectedField = "";
      clearProjectMappingColumnHighlight();
      refreshProjectMapping(
        "Mapeamento de <strong>" + escapeHtml(definition.label) + "</strong>"
          + (previous !== "" ? " removido." : " já estava vazio.")
          + " Selecione uma função para mapear novamente.",
      );
    }

    function clearProjectMapping() {
      for (const definition of projectMappingFieldDefinitions) el(definition.selectId).value = "";
      state.projectMappingSelectedField = "";
      clearProjectMappingColumnHighlight();
      refreshProjectMapping("Todos os vínculos entre funções e colunas foram removidos.");
    }

    function invalidateBudgetAudit() {
      state.budgetAudit = null;
      state.budgetAuditBudget = null;
      state.budgetAuditSelectedId = "";
      state.budgetAuditSelectedRowKey = "";
      const compareButton = el("compareBtn");
      if (compareButton) compareButton.disabled = true;
      const totals = el("budgetAuditTotals");
      const cards = el("budgetAuditCards");
      const status = el("budgetAuditStatus");
      const explanation = el("budgetAuditExplanation");
      const groups = el("budgetAuditGroups");
      if (totals) totals.textContent = "";
      if (cards) cards.textContent = "";
      if (status) status.textContent = "";
      if (explanation) explanation.textContent = "";
      if (groups) groups.textContent = "";
    }

    function invalidateProjectAnalysis() {
      state.projectAnalysisCache = null;
      invalidateBudgetAudit();
    }

    function renderProjectFilterSummary() {
      const audit = state.budgetAudit;
      el("projectFilterSummary").innerHTML = audit
        ? `<span><strong>${audit.totals.itemCount}</strong> item(ns) conferido(s)</span><span><strong>${audit.summary.discarded}</strong> linha(s) desconsiderada(s)</span>`
        : `<span>A conferência será executada somente ao selecionar <strong>Conferir e continuar</strong>.</span>`;
    }

    function renderProjectPreview(focusField = null, previewColumn = undefined) {
      const sheet = sheetByName(state.projectWorkbook, el("projectSheet").value);
      const selections = previewSelectionsWithOverride(projectPreviewSelections(), focusField, previewColumn);
      renderPreview(
        "projectPreviewTable",
        sheet,
        el("projectHeaderRow").value,
        selections,
        focusField,
        null,
      );
      renderColumnSummary("projectColumnSummary", "projectPreviewTable", selections, focusField);
      renderProjectFilterSummary();
      if (focusField) schedulePreviewScroll("projectPreviewTable", selections.find((item) => item.field === focusField)?.index);
    }

    function projectAuditPrerequisites() {
      const workbookValid = Boolean(state.projectWorkbook);
      const sheet = workbookValid ? sheetByName(state.projectWorkbook, el("projectSheet").value) : null;
      const sheetValid = Boolean(sheet);
      const headerRowNumber = Number(el("projectHeaderRow").value);
      const headerRowIndex = headerRowNumber - 1;
      const headerValid = sheetValid
        && Number.isInteger(headerRowNumber)
        && headerRowNumber >= 1
        && headerRowIndex < (sheet.rows?.length || 0)
        && rowHasContent(sheet.rows?.[headerRowIndex]);
      const requiredFields = ["code", "source", "description", "unit", "quantity", "totalWithBdi"];
      const missingRequiredFields = requiredFields.filter((field) => projectMappingSelect(field)?.value === "");
      const bdiValid = projectPriceMapping().componentCount >= 2;
      const declaredText = el("projectGeneralTotal").value.trim();
      const declaredTotal = parseBrazilianNumber(declaredText);
      const totalValid = Boolean(declaredText) && Number.isFinite(declaredTotal);
      return {
        workbookValid,
        sheetValid,
        headerValid,
        missingRequiredFields,
        bdiValid,
        totalValid,
        valid: workbookValid && sheetValid && headerValid
          && missingRequiredFields.length === 0 && bdiValid && totalValid,
      };
    }

    function setProjectValidationError(element, invalid) {
      if (!element) return;
      element.classList.toggle("project-validation-error", invalid);
      element.setAttribute("aria-invalid", invalid ? "true" : "false");
    }

    function firstProjectValidationTarget(status) {
      if (!status.workbookValid) return el("projectDropzone");
      if (!status.sheetValid) return el("projectSheet");
      if (!status.headerValid) return el("projectHeaderRow");
      if (!status.totalValid) return el("projectGeneralTotal");
      if (status.missingRequiredFields.length) {
        return document.querySelector('[data-project-mapping-field="' + status.missingRequiredFields[0] + '"]');
      }
      if (!status.bdiValid) return el("projectBdiMappingGroup");
      return null;
    }

    function renderProjectPrerequisiteValidation({ reveal = state.projectValidationAttempted, focus = false } = {}) {
      const status = projectAuditPrerequisites();
      const invalid = (condition) => Boolean(reveal && condition);
      setProjectValidationError(el("projectDropzone"), invalid(!status.workbookValid));
      setProjectValidationError(el("projectSheet"), invalid(status.workbookValid && !status.sheetValid));
      setProjectValidationError(el("projectHeaderRow"), invalid(status.sheetValid && !status.headerValid));
      setProjectValidationError(el("projectGeneralTotal"), invalid(status.workbookValid && !status.totalValid));
      for (const field of ["code", "source", "description", "unit", "quantity", "totalWithBdi"]) {
        setProjectValidationError(
          document.querySelector('[data-project-mapping-field="' + field + '"]'),
          invalid(status.headerValid && status.missingRequiredFields.includes(field)),
        );
      }
      setProjectValidationError(el("projectBdiMappingGroup"), invalid(status.headerValid && !status.bdiValid));
      const message = el("projectPrerequisiteMessage");
      message.classList.toggle("hidden", !(reveal && !status.valid));
      if (focus && !status.valid) {
        const target = firstProjectValidationTarget(status);
        target?.scrollIntoView?.({ behavior: "smooth", block: "center", inline: "nearest" });
        const focusable = target?.matches?.("button, input, select, [tabindex]")
          ? target
          : target?.querySelector?.("button, input, select, [tabindex]");
        focusable?.focus?.({ preventScroll: true });
      }
      return status;
    }

    function findProjectBudgetColumns(header) {
      const normalized = Array.from(header || [], (value) => normalizedHeaderText(value));
      const hasPriceWord = (text) => /\b(?:preco|valor|custo)\b|^p\.?\s*/.test(text);
      const isTotal = (text) => /\btotal\b/.test(text);
      const isWithBdi = (text) => /\bcom\s+(?:o\s+)?bdi\b|\bc\s*\/\s*bdi\b/.test(text);
      const isWithoutBdi = (text) => /\bsem\s+bdi\b|\bs\s*\/\s*bdi\b/.test(text);
      let withoutBdi = normalized.findIndex((text) => hasPriceWord(text) && !isTotal(text) && isWithoutBdi(text));
      let withBdi = normalized.findIndex((text) => hasPriceWord(text) && !isTotal(text) && isWithBdi(text));
      const bdi = normalized.findIndex((text) => /\bbdi\b/.test(text) && !hasPriceWord(text));
      const abbreviatedCost = normalized.findIndex((text) => /^c\.?\s*unit(?:ario)?\b/.test(text));
      const abbreviatedPrice = normalized.findIndex((text) => /^p\.?\s*unit(?:ario)?\b/.test(text));
      if (bdi >= 0 && abbreviatedCost >= 0 && abbreviatedPrice >= 0) {
        if (withoutBdi < 0) withoutBdi = abbreviatedCost;
        if (withBdi < 0) withBdi = abbreviatedPrice;
      }
      const unitPriceCandidates = normalized
        .map((text, index) => ({ text, index }))
        .filter(({ text }) =>
          !isTotal(text)
          && !(/\bbdi\b/.test(text) && !isWithBdi(text) && !isWithoutBdi(text))
          && (
            hasPriceWord(text)
            || /^c\.?\s*unit(?:ario)?\b/.test(text)
            || /^p\.?\s*unit(?:ario)?\b/.test(text)
          )
        );
      const maxNonTotalPriceColumn = Math.max(
        -1,
        bdi,
        withoutBdi,
        withBdi,
        ...unitPriceCandidates.map(({ index }) => index),
      );
      const totalCandidates = normalized
        .map((text, index) => ({ text, index }))
        .filter(({ text }) => isTotal(text))
        .filter(({ text, index }) =>
          isWithBdi(text) || maxNonTotalPriceColumn < 0 || index > maxNonTotalPriceColumn
        )
        .map(({ text, index }) => ({
          index,
          score: (isWithBdi(text) ? 120 : 0)
            + (hasPriceWord(text) ? 70 : 0)
            + (/^p\.?\s*total\b/.test(text) ? 50 : 0)
            + (/^total$/.test(text) ? 35 : 0)
            + (index > maxNonTotalPriceColumn ? 80 : 0)
            + index,
        }))
        .sort((left, right) => right.score - left.score || right.index - left.index);
      const totalWithBdi = totalCandidates[0]?.index ?? -1;
      const beforeTotal = (candidate) => totalWithBdi < 0 || candidate.index < totalWithBdi;
      if (withoutBdi < 0) {
        const beforeBdi = unitPriceCandidates
          .filter(beforeTotal)
          .filter(({ index }) => bdi < 0 || index < bdi)
          .at(-1);
        withoutBdi = beforeBdi?.index ?? (unitPriceCandidates.filter(beforeTotal)[0]?.index ?? -1);
      }
      if (withBdi < 0) {
        const lowerBound = Math.max(withoutBdi, bdi);
        const afterComponents = unitPriceCandidates
          .filter(beforeTotal)
          .find(({ index }) => index > lowerBound && index !== withoutBdi);
        withBdi = afterComponents?.index ?? -1;
      }
      return {
        withoutBdi,
        bdi,
        withBdi,
        totalWithBdi,
      };
    }

    function projectAutomaticMappingSuggestions(header) {
      const priceColumns = findProjectBudgetColumns(header);
      return {
        code: findColumn(header, [/^cod/i, /codigo/, /composicao/, /item/i]),
        source: findProjectSourceColumn(header),
        description: findColumn(header, [/descricao/, /servico/, /composicao/, /insumo/]),
        unit: findColumn(header, [/^unid/, /^und/, /unidade/]),
        quantity: findColumn(header, [/quantidade/, /^qtd\b/, /^quant\b/, /coeficiente/]),
        priceWithoutBdi: priceColumns.withoutBdi,
        bdi: priceColumns.bdi,
        priceWithBdi: priceColumns.withBdi,
        totalWithBdi: priceColumns.totalWithBdi,
      };
    }

    function applyProjectAutomaticMapping() {
      const sheet = sheetByName(state.projectWorkbook, el("projectSheet").value);
      if (!sheet) return;
      const header = getHeader(sheet, el("projectHeaderRow").value);
      const suggestions = projectAutomaticMappingSuggestions(header);
      for (const definition of projectMappingFieldDefinitions) el(definition.selectId).value = "";
      const usedColumns = new Set();
      let changed = false;
      for (const definition of projectMappingFieldDefinitions) {
        const select = el(definition.selectId);
        const suggestion = suggestions[definition.field];
        if (!Number.isInteger(suggestion) || suggestion < 0) continue;
        const value = String(suggestion);
        if (usedColumns.has(value)) continue;
        select.value = value;
        usedColumns.add(value);
        changed = true;
      }
      state.projectMappingSelectedField = "";
      clearProjectMappingColumnHighlight();
      refreshProjectMapping(
        changed
          ? "O mapeamento anterior foi apagado e as correspondências seguras foram refeitas automaticamente. Revise os vínculos antes de conferir o orçamento."
          : "O mapeamento anterior foi apagado, mas nenhuma correspondência segura foi encontrada. Faça o mapeamento manualmente.",
      );
    }

    function baseMappingDefinition(field) {
      return baseMappingFieldDefinitions.find((definition) => definition.field === field) || null;
    }

    function baseMappingSelect(field) {
      const definition = baseMappingDefinition(field);
      return definition ? el(definition.selectId) : null;
    }

    function baseMappingFieldForColumn(columnIndex) {
      const value = String(columnIndex);
      return baseMappingFieldDefinitions.find((definition) =>
        el(definition.selectId)?.value === value
      )?.field || "";
    }

    function defaultBaseMappingInstruction() {
      return "<strong>1.</strong> Clique em uma função. <strong>2.</strong> Passe o mouse sobre as colunas para conferir. <strong>3.</strong> Clique na coluna para confirmar. Você também pode usar <strong>Mapear automaticamente</strong>.";
    }

    function setBaseMappingInstruction(message = "", awaiting = false) {
      state.baseMappingInstructionMessage = message || defaultBaseMappingInstruction();
      state.baseMappingInstructionAwaiting = awaiting;
      const instruction = el("baseMappingInstruction");
      instruction.innerHTML = state.baseMappingInstructionMessage;
      instruction.classList.toggle("awaiting", awaiting);
    }

    function renderBaseMappingUi() {
      const sheet = representativeBaseSheet();
      const header = getHeader(sheet, el("baseHeaderRow").value);
      let hasMapping = false;
      for (const chip of document.querySelectorAll("[data-base-mapping-field]")) {
        const definition = baseMappingDefinition(chip.dataset.baseMappingField);
        const select = definition ? el(definition.selectId) : null;
        const mapped = Boolean(select && select.value !== "");
        const selected = definition?.field === state.baseMappingSelectedField;
        hasMapping ||= mapped;
        chip.classList.toggle("mapped", mapped);
        chip.classList.toggle("selected", selected);
        const code = chip.querySelector(".project-field-chip-code");
        const main = chip.querySelector(".project-field-chip-main");
        const columnIndex = mapped ? Number(select.value) : -1;
        const column = mapped ? (columns[columnIndex] || String(columnIndex + 1)) : "";
        const originalHeader = mapped ? String(header?.[columnIndex] ?? "").trim() : "";
        code.textContent = mapped ? "· " + column + " ✓" : "";
        main.setAttribute("aria-pressed", selected ? "true" : "false");
        main.setAttribute(
          "aria-label",
          mapped
            ? definition.label + " mapeado para a coluna " + column
              + (originalHeader ? ', "' + originalHeader + '"' : "") + ". Clique para remapear."
            : "Selecionar " + definition.label,
        );
        chip.title = mapped
          ? definition.label + " → coluna " + column + (originalHeader ? ': "' + originalHeader + '"' : "")
          : definition.label + " ainda não mapeado";
      }
      el("baseAutoMapBtn").disabled = !sheet;
      el("baseClearMappingBtn").disabled = !hasMapping;
      el("basePreviewTable").classList.toggle(
        "mapping-awaiting-column",
        Boolean(state.baseMappingSelectedField),
      );
      setBaseMappingInstruction(
        state.baseMappingInstructionMessage,
        state.baseMappingInstructionAwaiting,
      );
    }

    function clearBaseMappingColumnHighlight() {
      el("basePreviewTable").querySelectorAll(".project-mapping-target-column")
        .forEach((cell) => cell.classList.remove("project-mapping-target-column"));
    }

    function highlightBaseMappingColumn(columnIndex, centerColumn = false) {
      clearBaseMappingColumnHighlight();
      if (!Number.isInteger(Number(columnIndex))) return;
      el("basePreviewTable").querySelectorAll('[data-column-index="' + Number(columnIndex) + '"]')
        .forEach((cell) => cell.classList.add("project-mapping-target-column"));
      if (centerColumn) scrollPreviewToColumn("basePreviewTable", Number(columnIndex));
    }

    function refreshBaseMapping(message = "", awaiting = false, focusField = null) {
      invalidatePendingBaseAnalysis();
      state.baseMappingInstructionMessage = message || defaultBaseMappingInstruction();
      state.baseMappingInstructionAwaiting = awaiting;
      renderBasePreview(focusField);
      renderBaseMappingUi();
      refreshCompareButton();
    }

    function selectBaseMappingField(field) {
      clearBaseMappingColumnHighlight();
      if (state.baseMappingSelectedField === field) {
        state.baseMappingSelectedField = "";
        state.baseMappingInstructionMessage = defaultBaseMappingInstruction();
        state.baseMappingInstructionAwaiting = false;
        renderBasePreview();
        renderBaseMappingUi();
        return;
      }
      const definition = baseMappingDefinition(field);
      if (!definition) return;
      state.baseMappingSelectedField = field;
      const select = el(definition.selectId);
      const current = select.value !== ""
        ? " Atualmente está na coluna <strong>" + escapeHtml(columns[Number(select.value)] || String(Number(select.value) + 1)) + "</strong>."
        : "";
      state.baseMappingInstructionMessage = "<strong>" + escapeHtml(definition.label)
        + "</strong> está selecionado." + current
        + " Passe o mouse pelas colunas e clique na coluna correta.";
      state.baseMappingInstructionAwaiting = true;
      renderBasePreview(field);
      renderBaseMappingUi();
    }

    function assignBaseMappingColumn(field, columnIndex) {
      const definition = baseMappingDefinition(field);
      if (!definition || !Number.isInteger(Number(columnIndex))) return;
      const occupiedField = baseMappingFieldForColumn(columnIndex);
      if (occupiedField && occupiedField !== field) baseMappingSelect(occupiedField).value = "";
      el(definition.selectId).value = String(Number(columnIndex));
      state.baseMappingSelectedField = "";
      const column = columns[Number(columnIndex)] || String(Number(columnIndex) + 1);
      refreshBaseMapping(
        "✓ <strong>" + escapeHtml(definition.label) + "</strong> → coluna <strong>"
          + escapeHtml(column) + "</strong>. Selecione outra função para continuar.",
      );
    }

    function removeBaseMapping(field) {
      const definition = baseMappingDefinition(field);
      if (!definition) return;
      const select = el(definition.selectId);
      const previous = select.value;
      select.value = "";
      if (state.baseMappingSelectedField === field) state.baseMappingSelectedField = "";
      clearBaseMappingColumnHighlight();
      refreshBaseMapping(
        "Mapeamento de <strong>" + escapeHtml(definition.label) + "</strong>"
          + (previous !== "" ? " removido." : " já estava vazio.")
          + " Selecione uma função para mapear novamente.",
      );
    }

    function clearBaseMapping() {
      for (const definition of baseMappingFieldDefinitions) el(definition.selectId).value = "";
      state.baseMappingSelectedField = "";
      clearBaseMappingColumnHighlight();
      refreshBaseMapping("Todos os vínculos entre funções e colunas da base foram removidos.");
    }

    function baseAutomaticMappingSuggestions(header) {
      return {
        code: findColumn(header, [/codigo.*composicao/i, /^cod/i, /codigo/, /^insumo$/i, /composicao/, /item/i]),
        description: findColumn(header, [/descricao.*composicao/i, /descricao/, /servico/, /composicao/, /insumo/]),
        unit: findColumn(header, [/^unid/, /^und/, /unidade/]),
        price: findColumn(header, [/preco.*mediano/, /custo total/, /valor.*unit/, /preco.*unit/, /custo.*unit/, /valor/, /preco/, /custo/]),
      };
    }

    function applyBaseAutomaticMapping() {
      const sheet = representativeBaseSheet();
      if (!sheet) return;
      const header = getHeader(sheet, el("baseHeaderRow").value);
      const suggestions = baseAutomaticMappingSuggestions(header);
      for (const definition of baseMappingFieldDefinitions) el(definition.selectId).value = "";
      const usedColumns = new Set();
      let changed = false;
      for (const definition of baseMappingFieldDefinitions) {
        const select = el(definition.selectId);
        const suggestion = suggestions[definition.field];
        if (!Number.isInteger(suggestion) || suggestion < 0) continue;
        const value = String(suggestion);
        if (usedColumns.has(value)) continue;
        select.value = value;
        usedColumns.add(value);
        changed = true;
      }
      state.baseMappingSelectedField = "";
      clearBaseMappingColumnHighlight();
      refreshBaseMapping(
        changed
          ? "O mapeamento anterior foi apagado e as correspondências seguras foram refeitas automaticamente. Revise os vínculos antes de adicionar a base."
          : "O mapeamento anterior foi apagado, mas nenhuma correspondência segura foi encontrada. Faça o mapeamento manualmente.",
      );
    }

    function projectPriceMapping() {
      const withoutBdiCol = el("projectWithoutBdiCol")?.value ?? "";
      const bdiCol = el("projectBdiCol")?.value ?? "";
      const withBdiCol = el("projectWithBdiCol")?.value ?? "";
      const totalWithBdiCol = el("projectTotalWithBdiCol")?.value ?? "";
      const direct = withoutBdiCol !== "";
      const hasBdi = bdiCol !== "";
      const hasWithBdi = withBdiCol !== "";
      const componentCount = [direct, hasBdi, hasWithBdi].filter(Boolean).length;
      return {
        withoutBdiCol,
        bdiCol,
        withBdiCol,
        totalWithBdiCol,
        direct,
        hasBdi,
        hasWithBdi,
        calculated: hasBdi && hasWithBdi,
        calculateWithBdi: direct && hasBdi,
        calculateBdi: direct && hasWithBdi,
        componentCount,
        hasItemTotal: totalWithBdiCol !== "",
        valid: componentCount >= 2 && totalWithBdiCol !== "",
      };
    }

    function renderProjectPriceRule() {
      const message = el("projectPriceRule");
      const mapping = projectPriceMapping();
      message.className = `audit-message${mapping.valid ? "" : " warn hidden"}`;
      if (!mapping.valid) {
        message.textContent = "";
      } else if (mapping.componentCount === 3) {
        message.textContent = "Os três componentes serão preservados e conferidos. Divergências serão apresentadas antes de avançar.";
      } else if (!mapping.hasWithBdi) {
        message.textContent = "O preço com BDI será calculado por linha: preço sem BDI × (1 + BDI).";
      } else if (!mapping.hasBdi) {
        message.textContent = "O BDI será calculado por linha: preço com BDI ÷ preço sem BDI − 1.";
      } else {
        message.textContent = "O preço sem BDI será calculado por linha: preço com BDI ÷ (1 + BDI).";
      }
    }

    function updateProjectColumns() {
      invalidateProjectAnalysis();
      const sheet = sheetByName(state.projectWorkbook, el("projectSheet").value);
      const header = getHeader(sheet, el("projectHeaderRow").value);
      populateColumnSelect(el("projectCodeCol"), header, true, "Selecione uma coluna");
      populateColumnSelect(el("projectDescCol"), header, true, "Selecione uma coluna");
      populateColumnSelect(el("projectUnitCol"), header, true, "Selecione uma coluna");
      populateColumnSelect(el("projectQuantityCol"), header, true, "Selecione uma coluna");
      populateColumnSelect(el("projectSourceCol"), header, true, "Selecione uma coluna");
      populateColumnSelect(el("projectWithoutBdiCol"), header, true, "Selecione uma coluna");
      populateColumnSelect(el("projectBdiCol"), header, true, "Selecione uma coluna");
      populateColumnSelect(el("projectWithBdiCol"), header, true, "Selecione uma coluna");
      populateColumnSelect(el("projectTotalWithBdiCol"), header, true, "Selecione uma coluna");
      state.projectMappingSelectedField = "";
      state.projectMappingInstructionMessage = defaultProjectMappingInstruction();
      state.projectMappingInstructionAwaiting = false;
      renderProjectPriceRule();
      renderProjectSourceIdentifiers();
      renderProjectPreview();
      populateBaseSourceIdentifierSelect(false);
      renderProjectMappingUi();
      refreshWizardState();
    }

    function updateBaseColumns() {
      invalidatePendingBaseAnalysis();
      const sheet = representativeBaseSheet();
      if (!sheet) {
        for (const definition of baseMappingFieldDefinitions) {
          const select = el(definition.selectId);
          select.innerHTML = "";
          select.disabled = true;
        }
        state.baseMappingSelectedField = "";
        state.baseMappingInstructionMessage = defaultBaseMappingInstruction();
        state.baseMappingInstructionAwaiting = false;
        el("basePreviewTable").tHead.innerHTML = "";
        el("basePreviewTable").tBodies[0].innerHTML = "";
        el("baseColumnSummary").innerHTML = "";
        renderBaseFilterSummary();
        renderBaseMappingUi();
        return;
      }
      const header = getHeader(sheet, el("baseHeaderRow").value);
      for (const definition of baseMappingFieldDefinitions) {
        populateColumnSelect(el(definition.selectId), header, true, "Selecione uma coluna");
      }
      state.baseMappingSelectedField = "";
      state.baseMappingInstructionMessage = defaultBaseMappingInstruction();
      state.baseMappingInstructionAwaiting = false;
      renderBasePreview();
      renderBaseMappingUi();
    }

    function projectConfigurationValid() {
      return projectItemMapping().valid
        && projectPriceMapping().valid
        && projectSourceIdentifierOptions().length > 0
        && Boolean(state.budgetAudit?.canProceed);
    }

    function projectSourceIdentifierOptions() {
      if (!state.projectWorkbook || !projectItemMapping().valid) return [];
      const sheet = sheetByName(state.projectWorkbook, el("projectSheet").value);
      if (!sheet) return [];
      const mapping = projectItemMapping();
      const headerRow = Math.max(0, Number(el("projectHeaderRow").value || 1) - 1);
      const byKey = new Map();
      for (let rowIndex = headerRow + 1; rowIndex < sheet.rows.length; rowIndex += 1) {
        const row = sheet.rows[rowIndex] || [];
        if (!rowHasContent(row) || isRepeatedProjectHeader(row, sheet)) continue;
        const code = normalizeCode(cell(row, mapping.codeCol));
        const description = compactCellText(cell(row, mapping.descriptionCol));
        const unit = compactCellText(cell(row, mapping.unitCol));
        if (!code || !description || !unit) continue;
        const label = compactCellText(cell(row, mapping.sourceCol));
        const key = normalizeSourceKey(label);
        if (!key) continue;
        if (!byKey.has(key)) byKey.set(key, { key, label, count: 0 });
        byKey.get(key).count += 1;
      }
      return [...byKey.values()];
    }

    function budgetAuditLegacyInput() {
      const item = projectItemMapping();
      const price = projectPriceMapping();
      return {
        projectWorkbook: state.projectWorkbook,
        projectSheetName: el("projectSheet").value,
        projectHeaderRow: Math.max(1, Number(el("projectHeaderRow").value || 1)),
        projectMapping: {
          code: item.codeCol,
          source: item.sourceCol,
          description: item.descriptionCol,
          unit: item.unitCol,
          quantity: item.quantityCol,
          priceWithoutBdi: price.withoutBdiCol,
          bdi: price.bdiCol,
          priceWithBdi: price.withBdiCol,
          totalWithBdi: price.totalWithBdiCol,
        },
        totalGeneral: el("projectGeneralTotal").value,
        auditTolerance: 0.01,
        codePolicy: {
          caseInsensitive: el("caseInsensitive").checked,
          stripSeparators: el("normalizeCodes").checked,
        },
      };
    }

    function budgetAuditSeverityLabel(severity) {
      return { blocker: "Impedimento", error: "Erro de cálculo", warning: "Aviso", discarded: "Desconsiderada" }[severity] || severity;
    }

    function budgetAuditCategory(finding) {
      return finding?.category || finding?.severity || "warning";
    }

    function firstBudgetAuditFilter(audit) {
      const categories = [
        ["blocker", audit.summary.blockers],
        ["error", audit.summary.errors],
        ["warning", audit.summary.warnings],
        ["discarded", audit.summary.discarded],
      ];
      return categories.find(([, count]) => count > 0)?.[0] || "blocker";
    }

    function budgetAuditValue(value, field) {
      if (!Number.isFinite(value)) return "—";
      if (field === "bdi") return percent(value);
      if (field === "quantity") return value.toLocaleString("pt-BR", { maximumFractionDigits: 8 });
      return money(value);
    }

    function budgetAuditColumnLetter(index) {
      let value = Number(index) + 1;
      let letters = "";
      while (value > 0) {
        value -= 1;
        letters = String.fromCharCode(65 + (value % 26)) + letters;
        value = Math.floor(value / 26);
      }
      return letters;
    }

    function budgetAuditOriginalValue(sheet, rowIndex, columnIndex) {
      if (sheet?.hiddenRows?.[rowIndex] || sheet?.hiddenColumns?.[columnIndex]) return "";
      const value = sheet?.rows?.[rowIndex]?.[columnIndex];
      if (value === null || value === undefined || value === "") return "";
      if (typeof value !== "number" || !Number.isFinite(value)) return String(value);
      const format = String(sheet?.numberFormats?.[rowIndex]?.[columnIndex] || "");
      if (format.includes("%")) {
        return (value * 100).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }) + "%";
      }
      const formatted = value.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return /R\$/.test(format) ? "R$ " + formatted : formatted;
    }

    function budgetAuditMergeAt(sheet, rowIndex, columnIndex) {
      return (sheet?.merges || []).find((merge) =>
        rowIndex >= merge.startRow && rowIndex <= merge.endRow
        && columnIndex >= merge.startColumn && columnIndex <= merge.endColumn
      ) || null;
    }

    function budgetFindingRowNumbers(finding) {
      const values = [];
      if (Number.isInteger(finding?.rowNumber)) values.push(finding.rowNumber);
      if (Number.isInteger(finding?.details?.previousRowNumber)) values.push(finding.details.previousRowNumber);
      for (const value of finding?.details?.rowNumbers || []) {
        if (Number.isInteger(value)) values.push(value);
      }
      return [...new Set(values)].sort((left, right) => left - right);
    }

    function budgetFindingReasonKey(finding) {
      return [finding.code || finding.title, finding.field || "", finding.title || ""].join(":");
    }

    function budgetFindingDescriptors(finding) {
      const mapping = state.budgetAuditBudget?.audit?.mapping || {};
      const headerRowNumber = state.budgetAuditBudget?.audit?.headerRowNumber || el("projectHeaderRow").value || 1;
      const relatedFields = finding.code === "CONSECUTIVE_DUPLICATE_ITEM"
        ? []
        : finding.code === "IDENTICAL_ITEM_DIFFERENT_PRICES"
          ? (mapping.priceWithoutBdi !== "" && mapping.priceWithoutBdi !== null && mapping.priceWithoutBdi !== undefined
            ? ["priceWithoutBdi"]
            : ["bdi", "priceWithBdi"].filter((field) => mapping[field] !== "" && mapping[field] !== null && mapping[field] !== undefined))
        : Array.isArray(finding.relatedFields) && finding.relatedFields.length
          ? finding.relatedFields
          : finding.field ? [finding.field] : [];
      return budgetFindingRowNumbers(finding).map((rowNumber) => ({
        occurrenceId: finding.id,
        workbook: state.projectWorkbook,
        fileName: state.projectWorkbook?.fileName || "",
        sheetName: finding.sheet || el("projectSheet").value,
        headerRowNumber,
        rowNumber,
        mapping,
        relatedFields,
      }));
    }

    function budgetReviewOccurrence(finding) {
      return {
        id: finding.id,
        title: finding.title,
        reasonKey: budgetFindingReasonKey(finding),
        descriptors: budgetFindingDescriptors(finding),
        finding,
      };
    }

    function budgetGlobalSummaryHtml(occurrence) {
      const finding = occurrence.finding;
      const hasComparison = [finding.informed, finding.expected, finding.difference].some(Number.isFinite);
      if (!hasComparison) {
        return `<div class="review-summary-grid"><div class="review-summary-cell review-summary-title">${escapeHtml(finding.title)}</div><div class="review-summary-cell review-summary-message">${escapeHtml(finding.message)}</div></div>`;
      }
      const format = (value, fallback) => Number.isFinite(value)
        ? budgetAuditValue(value, finding.field === "bdi" ? "bdi" : "totalWithBdi")
        : fallback;
      return `<div class="review-summary-grid">
        <div class="review-summary-cell review-summary-title">Comparação global</div>
        <div class="review-summary-cell">Informado<strong>${escapeHtml(format(finding.informed, "Não informado"))}</strong></div>
        <div class="review-summary-cell">Esperado<strong>${escapeHtml(format(finding.expected, "Não disponível"))}</strong></div>
        <div class="review-summary-cell">Diferença<strong>${escapeHtml(format(finding.difference, "Não disponível"))}</strong></div>
      </div>`;
    }

    function renderBudgetAuditExplanation() {
      const container = el("budgetAuditExplanation");
      const audit = state.budgetAudit;
      const finding = audit?.findings.find((item) => item.id === state.budgetAuditSelectedId);
      if (!finding) {
        container.innerHTML = audit?.summary.total
          ? "<h3>Selecione uma linha da tabela</h3><p>Os detalhes e a orientação para análise aparecerão neste bloco.</p>"
          : "<h3>Cálculos conferidos</h3><p>Não foram encontrados impedimentos, erros de cálculo ou avisos nos itens analisados.</p>";
        return;
      }
      const occurrence = budgetReviewOccurrence(finding);
      const descriptor = reviewSelectedDescriptor(
        [occurrence],
        state.budgetAuditSelectedId,
        state.budgetAuditSelectedRowKey,
      );
      const relatedRows = budgetFindingRowNumbers(finding);
      const origin = descriptor
        ? `<p><strong>Origem selecionada:</strong> ${escapeHtml(descriptor.sheetName || finding.sheet || "Planilha")}, linha ${descriptor.rowNumber}${finding.itemCode ? ` · item ${escapeHtml(finding.itemCode)}` : ""}${relatedRows.length > 1 ? ` · linhas relacionadas ${escapeHtml(relatedRows.join(", "))}` : ""}</p>`
        : "";
      const values = [
        Number.isFinite(finding.informed) ? `<strong>Informado:</strong> ${budgetAuditValue(finding.informed, finding.field)}` : "",
        Number.isFinite(finding.expected) ? `<strong>Esperado:</strong> ${budgetAuditValue(finding.expected, finding.field)}` : "",
        Number.isFinite(finding.difference) ? `<strong>Diferença:</strong> ${budgetAuditValue(finding.difference, finding.field)}` : "",
      ].filter(Boolean);
      const valuesHtml = values.length ? `<p>${values.join(" · ")}</p>` : "";
      container.innerHTML = `<h3>${escapeHtml(finding.title)}</h3><p>${escapeHtml(finding.message)}</p>${origin}${valuesHtml}<p class="action"><strong>Ação recomendada:</strong> ${escapeHtml(finding.action)}</p>`;
    }

    function activateBudgetAuditFilter(filter) {
      state.budgetAuditFilter = filter;
      const finding = state.budgetAudit?.findings.find((item) => budgetAuditCategory(item) === filter);
      const occurrence = finding ? budgetReviewOccurrence(finding) : null;
      state.budgetAuditSelectedId = occurrence?.id || "";
      state.budgetAuditSelectedRowKey = occurrence ? reviewOccurrenceFirstRowKey(occurrence) : "";
      el("budgetAuditCards").querySelectorAll("[data-budget-audit-filter]").forEach((card) => {
        card.setAttribute("aria-pressed", String(card.dataset.budgetAuditFilter === filter));
      });
      el("budgetAuditGroups").querySelectorAll("[data-budget-audit-category-panel]").forEach((panel) => {
        panel.classList.toggle("hidden", panel.dataset.budgetAuditCategoryPanel !== filter);
      });
      updateReviewSelectedRow(el("budgetAuditGroups"), "data-budget-audit-row-key", state.budgetAuditSelectedRowKey);
      renderBudgetAuditExplanation();
    }

    function renderBudgetAuditDialog() {
      const audit = state.budgetAudit;
      if (!audit) return;
      const cards = [
        { key: "blocker", label: "Impedimentos", count: audit.summary.blockers, detail: "Bloqueiam o avanço" },
        { key: "error", label: "Erros de cálculo", count: audit.summary.errors, detail: "Permitem prosseguir" },
        { key: "warning", label: "Avisos", count: audit.summary.warnings, detail: "Exigem atenção" },
        { key: "discarded", label: "Linhas desconsideradas", count: audit.summary.discarded, detail: "Não usadas na comparação" },
      ];
      el("budgetAuditCards").innerHTML = cards.map((card) =>
        `<button type="button" class="budget-audit-card" data-budget-audit-filter="${card.key}" aria-pressed="${state.budgetAuditFilter === card.key}"><span class="budget-audit-card-number">${card.count}</span><span><span class="budget-audit-card-label">${card.label}</span><span class="budget-audit-card-detail">${card.detail}</span></span></button>`
      ).join("");
      const visible = audit.findings.filter((finding) =>
        budgetAuditCategory(finding) === state.budgetAuditFilter
      );
      const occurrences = visible.map(budgetReviewOccurrence);
      if (!occurrences.some((occurrence) => occurrence.id === state.budgetAuditSelectedId)) {
        state.budgetAuditSelectedId = occurrences[0]?.id || "";
        state.budgetAuditSelectedRowKey = "";
      }
      const selectedOccurrence = occurrences.find((occurrence) => occurrence.id === state.budgetAuditSelectedId);
      if (selectedOccurrence && !reviewOccurrenceHasRowKey(selectedOccurrence, state.budgetAuditSelectedRowKey)) {
        state.budgetAuditSelectedRowKey = reviewOccurrenceFirstRowKey(selectedOccurrence);
      }
      el("budgetAuditGroups").innerHTML = cards.map((card) => {
        const categoryOccurrences = audit.findings
          .filter((finding) => budgetAuditCategory(finding) === card.key)
          .map(budgetReviewOccurrence);
        const grouped = reviewReasonGroups(categoryOccurrences);
        const content = grouped.length
          ? unifiedReviewTableHtml(grouped, {
            selectedRowKey: card.key === state.budgetAuditFilter ? state.budgetAuditSelectedRowKey : "",
            findingAttribute: "data-budget-audit-finding",
            rowKeyAttribute: "data-budget-audit-row-key",
            summaryHtml: budgetGlobalSummaryHtml,
          })
          : `<div class="budget-audit-empty">${audit.summary.total ? "Nenhuma ocorrência nesta categoria." : "Nenhuma ocorrência encontrada."}</div>`;
        return `<section data-budget-audit-category-panel="${card.key}" class="${card.key === state.budgetAuditFilter ? "" : "hidden"}">${content}</section>`;
      }).join("");
      const totals = audit.totals;
      el("budgetAuditTotals").innerHTML = [
        ["Total geral digitado", totals.declared],
        ["Soma dos totais auditados", totals.auditedSum],
        ["Diferenças absolutas dos itens", totals.absoluteItemDifferenceSum],
      ].map(([label, value]) => `<span><strong>${label}:</strong> ${budgetAuditValue(value, "totalWithBdi")}</span>`).join("")
        + `<span><strong>Tolerância do total geral:</strong> ${budgetAuditValue(totals.generalTotalTolerance, "totalWithBdi")} (${totals.itemCount} item(ns) × R$ 0,01)</span>`;
      const proceed = el("budgetAuditProceedBtn");
      proceed.disabled = !audit.canProceed;
      proceed.textContent = audit.summary.errors || audit.summary.warnings
        ? "Prosseguir mesmo assim"
        : "Continuar para as bases";
      renderBudgetAuditExplanation();
    }

    function focusSelectedBudgetAuditRow(ensureVisible = false) {
      const selected = [...el("budgetAuditGroups").querySelectorAll("[data-budget-audit-row-key]")]
        .find((row) => row.dataset.budgetAuditRowKey === state.budgetAuditSelectedRowKey);
      if (!selected) return;
      focusReviewRow(selected, ensureVisible);
    }

    function selectBudgetAuditFinding(findingId, rowKey = "", focusRow = false, ensureVisible = false) {
      state.budgetAuditSelectedId = findingId || "";
      state.budgetAuditSelectedRowKey = rowKey || "";
      updateReviewSelectedRow(el("budgetAuditGroups"), "data-budget-audit-row-key", state.budgetAuditSelectedRowKey);
      renderBudgetAuditExplanation();
      if (focusRow) focusSelectedBudgetAuditRow(ensureVisible);
    }

    function moveBudgetAuditSelection(offset) {
      const activePanel = el("budgetAuditGroups").querySelector(`[data-budget-audit-category-panel="${state.budgetAuditFilter}"]`);
      const visible = [...(activePanel?.querySelectorAll("[data-budget-audit-finding][data-budget-audit-row-key]") || [])]
        .filter((row) => !row.classList.contains("hidden"));
      if (!visible.length) return;
      const currentIndex = visible.findIndex((row) => row.dataset.budgetAuditRowKey === state.budgetAuditSelectedRowKey);
      const startIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextIndex = Math.max(0, Math.min(visible.length - 1, startIndex + offset));
      selectBudgetAuditFinding(
        visible[nextIndex].dataset.budgetAuditFinding,
        visible[nextIndex].dataset.budgetAuditRowKey,
        true,
        true,
      );
    }

    async function openBudgetAudit() {
      state.projectValidationAttempted = true;
      const prerequisites = renderProjectPrerequisiteValidation({ reveal: true, focus: true });
      if (!prerequisites.valid) return;
      clearError();
      setLoading(true, "Conferindo orçamento…", "Validando linhas e cálculos da planilha.");
      await yieldForPaint();
      let auditReady = false;
      try {
        const execution = globalThis.SicorpCore.runBudgetAuditFromLegacyState(budgetAuditLegacyInput());
        state.budgetAudit = execution.audit;
        state.budgetAuditBudget = execution.budget;
        state.budgetAuditFilter = firstBudgetAuditFilter(execution.audit);
        state.budgetAuditSelectedId = execution.audit.findings.find((finding) =>
          budgetAuditCategory(finding) === state.budgetAuditFilter
        )?.id || "";
        state.budgetAuditSelectedRowKey = "";
        renderBudgetAuditDialog();
        renderProjectFilterSummary();
        refreshCompareButton();
        auditReady = true;
      } catch (error) {
        showError(error);
      } finally {
        setLoading(false);
      }
      if (!auditReady) return;
      const dialog = el("budgetAuditDialog");
      if (typeof dialog.showModal === "function") dialog.showModal();
      else showBlockingIssue("Seu navegador não oferece suporte à janela de auditoria.");
    }

    function activateWizardPage(target) {
      clearError();
      state.currentPage = target;
      for (const pageEl of document.querySelectorAll(".wizard-page")) {
        pageEl.classList.toggle("page-hidden", Number(pageEl.dataset.page) !== target);
      }
      refreshWizardState();
      if (typeof window.scrollTo === "function") window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function refreshWizardState() {
      const hasProject = Boolean(state.projectWorkbook);
      const auditedProject = Boolean(state.budgetAudit?.canProceed);
      const hasBases = state.bases.length > 0;
      const hasBlockingConflicts = state.conflicts.length > 0;
      for (const button of document.querySelectorAll(".step-button")) {
        const step = Number(button.dataset.stepTarget);
        button.disabled = false;
        const completed = step === 1 ? (hasProject && auditedProject)
          : step === 2 ? (hasBases && !hasBlockingConflicts)
          : state.results.length > 0;
        button.classList.toggle("completed", completed);
        button.classList.toggle("active", step === state.currentPage);
      }
      el("projectNextBtn").disabled = false;
      el("basesNextBtn").disabled = false;
      renderProjectPrerequisiteValidation();
    }

    function goToPage(page) {
      const target = Number(page);
      if ((target === 2 || target === 3) && state.currentPage === 1) {
        openBudgetAudit();
        return;
      }
      if (target === 3 && !state.budgetAudit?.canProceed) {
        showBlockingIssue("Conclua a conferência dos cálculos do orçamento antes de continuar.");
        return;
      }
      if (target === 3 && !state.bases.length) {
        showBlockingIssue("Adicione pelo menos uma base de preços antes de continuar para a comparação.");
        return;
      }
      if (target === 3 && state.conflicts.length) {
        showBlockingIssue("Existem duplicidades bloqueantes entre as bases. Corrija ou remova as ocorrências com unidade ou preço divergente antes de continuar.");
        return;
      }
      activateWizardPage(target);
    }

    el("projectGeneralTotal").addEventListener("input", () => {
      invalidateBudgetAudit();
      renderProjectFilterSummary();
      refreshWizardState();
    });
    el("projectFile").addEventListener("change", () => {
      el("projectGeneralTotal").value = "";
      state.projectValidationAttempted = false;
      invalidateBudgetAudit();
      renderProjectPrerequisiteValidation();
    });
    el("projectDropzone").addEventListener("drop", () => {
      el("projectGeneralTotal").value = "";
      state.projectValidationAttempted = false;
      invalidateBudgetAudit();
      renderProjectPrerequisiteValidation();
    });
    el("projectAutoMapBtn").addEventListener("click", applyProjectAutomaticMapping);
    el("projectClearMappingBtn").addEventListener("click", clearProjectMapping);
    el("baseAutoMapBtn").addEventListener("click", applyBaseAutomaticMapping);
    el("baseClearMappingBtn").addEventListener("click", clearBaseMapping);
    el("projectMappingFieldPool").addEventListener("click", (event) => {
      const chip = event.target.closest("[data-project-mapping-field]");
      if (!chip) return;
      if (event.target.closest(".project-field-chip-remove")) {
        removeProjectMapping(chip.dataset.projectMappingField);
        return;
      }
      if (event.target.closest(".project-field-chip-main")) {
        selectProjectMappingField(chip.dataset.projectMappingField);
      }
    });
    el("projectMappingFieldPool").addEventListener("pointerover", (event) => {
      const chip = event.target.closest("[data-project-mapping-field]");
      if (!chip || chip.contains(event.relatedTarget)) return;
      const select = projectMappingSelect(chip.dataset.projectMappingField);
      if (select?.value !== "") highlightProjectMappingColumn(select.value, true);
    });
    el("projectMappingFieldPool").addEventListener("pointerout", (event) => {
      const chip = event.target.closest("[data-project-mapping-field]");
      if (!chip || chip.contains(event.relatedTarget)) return;
      clearProjectMappingColumnHighlight();
    });
    el("projectPreviewTable").addEventListener("pointerover", (event) => {
      if (!state.projectMappingSelectedField) return;
      const cell = event.target.closest("[data-column-index]");
      if (!cell) return;
      const relatedColumn = event.relatedTarget?.closest?.("[data-column-index]")?.dataset.columnIndex;
      if (relatedColumn === cell.dataset.columnIndex) return;
      highlightProjectMappingColumn(cell.dataset.columnIndex);
    });
    el("projectPreviewTable").addEventListener("pointerout", (event) => {
      if (!state.projectMappingSelectedField) return;
      const cell = event.target.closest("[data-column-index]");
      if (!cell) return;
      const relatedColumn = event.relatedTarget?.closest?.("[data-column-index]")?.dataset.columnIndex;
      if (relatedColumn === cell.dataset.columnIndex) return;
      clearProjectMappingColumnHighlight();
    });
    el("projectPreviewTable").addEventListener("click", (event) => {
      if (!state.projectMappingSelectedField) return;
      const cell = event.target.closest("[data-column-index]");
      if (!cell) return;
      assignProjectMappingColumn(state.projectMappingSelectedField, Number(cell.dataset.columnIndex));
    });
    el("baseMappingFieldPool").addEventListener("click", (event) => {
      const chip = event.target.closest("[data-base-mapping-field]");
      if (!chip) return;
      if (event.target.closest(".project-field-chip-remove")) {
        removeBaseMapping(chip.dataset.baseMappingField);
        return;
      }
      if (event.target.closest(".project-field-chip-main")) {
        selectBaseMappingField(chip.dataset.baseMappingField);
      }
    });
    el("baseMappingFieldPool").addEventListener("pointerover", (event) => {
      const chip = event.target.closest("[data-base-mapping-field]");
      if (!chip || chip.contains(event.relatedTarget)) return;
      const select = baseMappingSelect(chip.dataset.baseMappingField);
      if (select?.value !== "") highlightBaseMappingColumn(select.value, true);
    });
    el("baseMappingFieldPool").addEventListener("pointerout", (event) => {
      const chip = event.target.closest("[data-base-mapping-field]");
      if (!chip || chip.contains(event.relatedTarget)) return;
      clearBaseMappingColumnHighlight();
    });
    el("basePreviewTable").addEventListener("pointerover", (event) => {
      if (!state.baseMappingSelectedField) return;
      const cell = event.target.closest("[data-column-index]");
      if (!cell) return;
      const relatedColumn = event.relatedTarget?.closest?.("[data-column-index]")?.dataset.columnIndex;
      if (relatedColumn === cell.dataset.columnIndex) return;
      highlightBaseMappingColumn(cell.dataset.columnIndex);
    });
    el("basePreviewTable").addEventListener("pointerout", (event) => {
      if (!state.baseMappingSelectedField) return;
      const cell = event.target.closest("[data-column-index]");
      if (!cell) return;
      const relatedColumn = event.relatedTarget?.closest?.("[data-column-index]")?.dataset.columnIndex;
      if (relatedColumn === cell.dataset.columnIndex) return;
      clearBaseMappingColumnHighlight();
    });
    el("basePreviewTable").addEventListener("click", (event) => {
      if (!state.baseMappingSelectedField) return;
      const cell = event.target.closest("[data-column-index]");
      if (!cell) return;
      assignBaseMappingColumn(state.baseMappingSelectedField, Number(cell.dataset.columnIndex));
    });
    el("budgetAuditCloseBtn").addEventListener("click", () => el("budgetAuditDialog").close());
    el("budgetAuditReturnBtn").addEventListener("click", () => el("budgetAuditDialog").close());
    el("budgetAuditProceedBtn").addEventListener("click", () => {
      if (!state.budgetAudit?.canProceed) return;
      el("budgetAuditDialog").close();
      activateWizardPage(2);
    });
    el("budgetAuditCards").addEventListener("click", (event) => {
      const button = event.target.closest("[data-budget-audit-filter]");
      if (!button) return;
      activateBudgetAuditFilter(button.dataset.budgetAuditFilter);
    });
    el("budgetAuditGroups").addEventListener("click", (event) => {
      const reasonToggle = event.target.closest("[data-review-reason-toggle]");
      if (reasonToggle) {
        toggleReviewReasonGroup(reasonToggle);
        return;
      }
      const row = event.target.closest("[data-budget-audit-finding]");
      if (!row) return;
      selectBudgetAuditFinding(
        row.dataset.budgetAuditFinding,
        row.dataset.budgetAuditRowKey || "",
        true,
        false,
      );
    });
    el("budgetAuditGroups").addEventListener("keydown", (event) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      moveBudgetAuditSelection(event.key === "ArrowDown" ? 1 : -1);
    });
    /* SICORP_V44_BUDGET_AUDIT_RUNTIME_END */

    const priceSourceCentralUi = globalThis.SicorpPriceSourceUi.installPriceSourceCentralUi({
      createCentral: globalThis.SicorpCore.createPriceSourceCentral,
      getBudgetSources: () => projectSourceIdentifierOptions().map((option) => option.label),
      downloadBlob,
      reportError: showError,
    });
    wireEvents();
    renderBaseList();
    renderConflictAudit();
    goToPage(1);
    const betaNoticeDialog = el("betaNoticeDialog");
    betaNoticeDialog.addEventListener("cancel", (event) => event.preventDefault());
    el("betaNoticeContinue").addEventListener("click", () => {
      if (typeof betaNoticeDialog.close === "function") betaNoticeDialog.close();
      else betaNoticeDialog.removeAttribute("open");
    });
    if (typeof betaNoticeDialog.showModal === "function") betaNoticeDialog.showModal();
    else betaNoticeDialog.setAttribute("open", "");
  