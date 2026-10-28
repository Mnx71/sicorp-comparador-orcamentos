      function fileExtension(fileName) {
        const match = String(fileName || "").trim().toLowerCase().match(/\.([^.]+)$/);
        return match?.[1] || "";
      }
      
      function byteView(value) {
        if (value instanceof Uint8Array) return value;
        if (value instanceof ArrayBuffer) return new Uint8Array(value);
        if (ArrayBuffer.isView(value)) {
          return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
        }
        throw new Error("O conteúdo do arquivo não foi fornecido em bytes válidos.");
      }
      
      function decodeText(bytes) {
        if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
          return new TextDecoder("utf-16le").decode(bytes.subarray(2));
        }
        if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
          const swapped = new Uint8Array(bytes.length - 2);
          for (let index = 2; index + 1 < bytes.length; index += 2) {
            swapped[index - 2] = bytes[index + 1];
            swapped[index - 1] = bytes[index];
          }
          return new TextDecoder("utf-16le").decode(swapped);
        }
        return new TextDecoder("utf-8").decode(bytes).replace(/^\ufeff/, "");
      }
      
      function delimiterProfile(text, delimiter) {
        const counts = [];
        let count = 0;
        let inQuotes = false;
        const limit = Math.min(text.length, 100_000);
      
        for (let index = 0; index < limit; index += 1) {
          const character = text[index];
          const next = text[index + 1];
          if (character === '"') {
            if (inQuotes && next === '"') index += 1;
            else inQuotes = !inQuotes;
            continue;
          }
          if (inQuotes) continue;
          if (character === delimiter) count += 1;
          if (character === "\n") {
            counts.push(count);
            count = 0;
            if (counts.length >= 20) break;
          }
        }
        if (counts.length < 20 && (count > 0 || !counts.length)) counts.push(count);
      
        const frequencies = new Map();
        for (const value of counts) {
          if (value > 0) frequencies.set(value, (frequencies.get(value) || 0) + 1);
        }
        let mode = 0;
        let modeFrequency = 0;
        for (const [value, frequency] of frequencies) {
          if (frequency > modeFrequency || (frequency === modeFrequency && value > mode)) {
            mode = value;
            modeFrequency = frequency;
          }
        }
        return {
          score: (modeFrequency * 1_000_000) + (mode * 1_000) + counts.reduce((sum, value) => sum + value, 0),
          separators: counts.reduce((sum, value) => sum + value, 0),
        };
      }
      
      function detectDelimiter(text) {
        const candidates = [";", ",", "\t", "|"];
        let selected = ";";
        let selectedProfile = { score: -1, separators: -1 };
        for (const candidate of candidates) {
          const profile = delimiterProfile(text, candidate);
          if (
            profile.score > selectedProfile.score
            || (profile.score === selectedProfile.score && profile.separators > selectedProfile.separators)
          ) {
            selected = candidate;
            selectedProfile = profile;
          }
        }
        return selected;
      }
      
      function parseDelimitedText(text) {
        const delimiter = detectDelimiter(text);
        const rows = [];
        let row = [];
        let field = "";
        let inQuotes = false;
      
        for (let index = 0; index < text.length; index += 1) {
          const character = text[index];
          const next = text[index + 1];
          if (inQuotes) {
            if (character === '"' && next === '"') {
              field += '"';
              index += 1;
            } else if (character === '"') {
              inQuotes = false;
            } else {
              field += character;
            }
            continue;
          }
          if (character === '"') {
            inQuotes = true;
          } else if (character === delimiter) {
            row.push(field);
            field = "";
          } else if (character === "\n") {
            row.push(field.replace(/\r$/, ""));
            rows.push(row);
            row = [];
            field = "";
          } else {
            field += character;
          }
        }
      
        row.push(field.replace(/\r$/, ""));
        if (row.length > 1 || row[0] !== "") rows.push(row);
        return rows;
      }
      
      function splitFormulaArguments(text) {
        const argumentsList = [];
        let current = "";
        let depth = 0;
        let inString = false;
        for (let index = 0; index < text.length; index += 1) {
          const character = text[index];
          const next = text[index + 1];
          if (character === '"') {
            current += character;
            if (inString && next === '"') {
              current += next;
              index += 1;
            } else {
              inString = !inString;
            }
            continue;
          }
          if (!inString) {
            if (character === "(") depth += 1;
            else if (character === ")") depth -= 1;
            else if ((character === "," || character === ";") && depth === 0) {
              argumentsList.push(current.trim());
              current = "";
              continue;
            }
          }
          current += character;
        }
        argumentsList.push(current.trim());
        return argumentsList;
      }
      
      function hyperlinkFormulaLabel(formula) {
        const normalized = String(formula || "").trim().replace(/^=/, "");
        const match = normalized.match(/^(?:_xlfn\.)?HYPERLINK\s*\(([\s\S]*)\)$/i);
        if (!match) return null;
        const argumentsList = splitFormulaArguments(match[1]);
        if (argumentsList.length < 2) return null;
        const label = argumentsList[1].trim();
        if (/^"(?:[^"]|"")*"$/.test(label)) return label.slice(1, -1).replaceAll('""', '"');
        if (/^[+\-]?\d+(?:\.\d+)?$/.test(label)) return label;
        return null;
      }
      
      function cellValue(cell) {
        const formulaLabel = hyperlinkFormulaLabel(cell?.f);
        if (formulaLabel !== null) return formulaLabel;
        // SheetJS represents formulas without a cached result as stubs with v: 0.
        // Preserve absence so the audit can distinguish it from a real zero.
        if (cell?.t === "z" && cell?.f) return "";
        if (cell?.t === "e") return cell.w || cell.v || "";
        if (cell?.t === "d" && cell.w) return cell.w;
        return cell?.v ?? cell?.w ?? "";
      }
      
      function binarySheets(runtime, bytes) {
        if (!runtime?.read || !runtime?.utils?.decode_range || !runtime?.utils?.decode_cell) {
          throw new Error("O leitor XLS/XLSX não foi fornecido ou está incompleto.");
        }
        const workbook = runtime.read(bytes, {
          type: "array",
          cellFormula: true,
          cellNF: true,
          cellStyles: true,
          cellText: true,
          cellDates: false,
        });
        const sheets = [];
        for (const name of workbook?.SheetNames || []) {
          const worksheet = workbook?.Sheets?.[name];
          if (!worksheet?.["!ref"]) continue;
          const range = runtime.utils.decode_range(worksheet["!ref"]);
          const rows = Array.from({ length: range.e.r + 1 }, () => []);
          const numberFormats = Array.from({ length: range.e.r + 1 }, () => []);
          const formulas = Array.from({ length: range.e.r + 1 }, () => []);
          const cellErrors = Array.from({ length: range.e.r + 1 }, () => []);
          for (const [reference, sourceCell] of Object.entries(worksheet)) {
            if (reference.startsWith("!")) continue;
            const address = runtime.utils.decode_cell(reference);
            rows[address.r][address.c] = cellValue(sourceCell);
            numberFormats[address.r][address.c] = sourceCell?.z || "";
            formulas[address.r][address.c] = sourceCell?.f || "";
            cellErrors[address.r][address.c] = sourceCell?.t === "e"
              ? sourceCell?.w || sourceCell?.v || "Erro de fórmula"
              : "";
          }
          const hiddenRows = Array.from(
            { length: range.e.r + 1 },
            (_, index) => Boolean(worksheet?.["!rows"]?.[index]?.hidden),
          );
          const hiddenColumns = Array.from(
            { length: range.e.c + 1 },
            (_, index) => Boolean(worksheet?.["!cols"]?.[index]?.hidden),
          );
          const merges = Array.from(worksheet?.["!merges"] || [], (merge) => ({
            startRow: Number(merge?.s?.r),
            startColumn: Number(merge?.s?.c),
            endRow: Number(merge?.e?.r),
            endColumn: Number(merge?.e?.c),
          })).filter((merge) => Object.values(merge).every(Number.isInteger));
          sheets.push(visibleSheet({
            name,
            rows,
            numberFormats,
            formulas,
            cellErrors,
            hiddenRows,
            hiddenColumns,
            merges,
          }));
        }
        if (!sheets.length) {
          throw new Error("Nenhuma aba de planilha utilizável foi encontrada no arquivo.");
        }
        return sheets;
      }
      
      // Preserve physical coordinates, while removing hidden content from every consumer.
      function visibleSheet(sheet) {
        if (!sheet || sheet.visibleContentOnly) return sheet;
        const hiddenRows = sheet.hiddenRows || [];
        const hiddenColumns = sheet.hiddenColumns || [];
        if (!hiddenRows.some(Boolean) && !hiddenColumns.some(Boolean)) return sheet;
        const visible = { ...sheet, visibleContentOnly: true };
        for (const key of ["rows", "numberFormats", "formulas", "cellErrors"]) {
          if (!Array.isArray(sheet[key])) continue;
          visible[key] = sheet[key].map((row, rowIndex) => hiddenRows[rowIndex]
            ? []
            : Array.from(row || [], (value, columnIndex) => hiddenColumns[columnIndex] ? "" : value));
        }
        return visible;
      }

      function readWorkbookFile(input = {}, dependencies = {}) {
        const fileName = String(input.fileName || "").trim();
        if (!fileName) throw new Error("Informe o nome do arquivo a ser lido.");
        if (input.bytes === undefined && input.text === undefined) {
          throw new Error("O conteúdo do arquivo não foi fornecido.");
        }
      
        const extension = fileExtension(fileName);
        if (["csv", "txt", "tsv"].includes(extension)) {
          const text = input.text === undefined ? decodeText(byteView(input.bytes)) : String(input.text);
          return {
            fileName,
            format: "csv",
            sheets: [{
              name: "CSV",
              rows: parseDelimitedText(text.replace(/^\ufeff/, "")),
              numberFormats: [],
              formulas: [],
              cellErrors: [],
              hiddenRows: [],
              hiddenColumns: [],
              merges: [],
            }],
          };
        }
        if (extension === "xls" || extension === "xlsx") {
          return {
            fileName,
            format: extension,
            sheets: binarySheets(dependencies.spreadsheetRuntime, byteView(input.bytes)),
          };
        }
        throw new Error(`Formato não suportado: .${extension || "(sem extensão)"}. Use XLS, XLSX ou CSV.`);
      }
      
      
