      function normalizedExportComparisonField(value) {
        return String(value ?? "")
          .normalize("NFKD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLocaleLowerCase("pt-BR")
          .replace(/\s+/g, "");
      }

      function exportFieldDiffers(result, field) {
        const keys = field === "description"
          ? ["projectDescription", "baseDescription"]
          : field === "unit"
            ? ["projectUnit", "baseUnit"]
            : [];
        if (!keys.length) return false;
        const hasReference = [result.baseName, result.baseFile, result.baseRow]
          .some((value) => String(value ?? "").trim() !== "");
        return hasReference && normalizedExportComparisonField(result[keys[0]])
          !== normalizedExportComparisonField(result[keys[1]]);
      }

      function exportColumnDefinitions() {
        return [
          { key: "status", header: "Status", type: "text", width: 34, value: (row) => row.status },
          { key: "projectRow", header: "Linha orçamento", type: "integer", width: 16, value: (row) => row.projectRow },
          { key: "code", header: "Código", type: "text", width: 18, value: (row) => row.code },
          { key: "projectSource", header: "Base / referência", type: "text", width: 22, value: (row) => row.projectSource },
          { key: "projectDescription", header: "Descrição orçamento", type: "text", width: 48, divergenceField: "description", value: (row) => row.projectDescription },
          { key: "projectUnit", header: "Unid. orçamento", type: "text", width: 18, divergenceField: "unit", value: (row) => row.projectUnit },
          {
            key: "projectValue",
            header: "Preço sem BDI",
            type: "money",
            width: 18,
            value: (row) => Number.isFinite(row.projectValue) ? row.projectValue : row.projectValueRaw,
          },
          {
            key: "projectBdiRate",
            header: "BDI",
            type: "percent",
            width: 13,
            value: (row) => Number.isFinite(row.projectBdiRate) ? row.projectBdiRate : row.projectBdiRaw,
          },
          {
            key: "projectQuantity",
            header: "Quantidade",
            type: "quantity",
            width: 14,
            value: (row) => Number.isFinite(row.projectQuantity) ? row.projectQuantity : row.projectQuantityRaw,
          },
          {
            key: "projectTotalWithBdi",
            header: "Valor total com BDI",
            type: "money",
            width: 22,
            value: (row) => Number.isFinite(row.projectTotalWithBdi) ? row.projectTotalWithBdi : "",
          },
          {
            key: "projectTotalShare",
            header: "Participação (%)",
            type: "percent",
            width: 18,
            value: (row) => Number.isFinite(row.projectTotalShare) ? row.projectTotalShare : "",
          },
          { key: "baseRow", header: "Origem / linha da base", type: "text", width: 38, value: (row) => row.baseRow },
          { key: "baseDescription", header: "Descrição base", type: "text", width: 48, divergenceField: "description", value: (row) => row.baseDescription },
          { key: "baseUnit", header: "Unid. base", type: "text", width: 15, divergenceField: "unit", value: (row) => row.baseUnit },
          {
            key: "baseValue",
            header: "Preço base",
            type: "money",
            width: 16,
            value: (row) => Number.isFinite(row.baseValue) ? row.baseValue : row.baseValueRaw,
          },
          {
            key: "difference",
            header: "Diferença",
            type: "money",
            width: 16,
            value: (row) => Number.isFinite(row.difference) ? row.difference : "",
          },
          {
            key: "percentDifference",
            header: "Diferença %",
            type: "percent",
            width: 15,
            value: (row) => Number.isFinite(row.percentDifference) ? row.percentDifference : "",
          },
        ];
      }
      
      function roundedNumber(value, type) {
        if (!Number.isFinite(value)) return value;
        const decimals = type === "money" ? 2 : type === "percent" ? 10 : type === "integer" ? 0 : 12;
        const rounded = type === "money" ? roundMoneyValue(value) : Number(value.toFixed(decimals));
        return Object.is(rounded, -0) ? 0 : rounded;
      }
      
      function textValue(value, type) {
        if (value === null || value === undefined || value === "") return "";
        if (typeof value === "number" && Number.isFinite(value)) {
          if (type === "money") {
            return roundedNumber(value, type).toLocaleString("pt-BR", {
              useGrouping: false,
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
          }
          if (type === "percent") {
            return roundedNumber(value, type).toLocaleString("pt-BR", {
              style: "percent",
              useGrouping: false,
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
          }
          if (type === "integer") {
            return roundedNumber(value, type).toLocaleString("pt-BR", {
              useGrouping: false,
              maximumFractionDigits: 0,
            });
          }
          return value.toLocaleString("pt-BR", {
            useGrouping: false,
            maximumFractionDigits: 12,
          });
        }
        return String(value);
      }
      
      function csvText(table) {
        const rows = [table.headers, ...table.rows];
        return "\ufeff" + rows.map((row) => row.map((value) => {
          const escaped = String(value ?? "").replaceAll('"', '""');
          return `"${escaped}"`;
        }).join(";")).join("\r\n");
      }
      
      function clipboardText(table) {
        return [table.headers, ...table.rows]
          .map((row) => row.join("\t"))
          .join("\n");
      }
      
      function exportStem(fileName) {
        const original = String(fileName || "orcamento")
          .trim()
          .replace(/\.[^.]+$/, "");
        return original
          .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
          .replace(/\s+/g, "_")
          .replace(/_+/g, "_")
          .replace(/^_+|_+$/g, "")
          .slice(0, 80) || "orcamento";
      }
      
      function escapeXml(value) {
        return String(value ?? "").replace(/[&<>"']/g, (character) => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&apos;",
        })[character]);
      }
      
      function columnName(index) {
        let value = Number(index) + 1;
        let name = "";
        while (value > 0) {
          value -= 1;
          name = String.fromCharCode(65 + (value % 26)) + name;
          value = Math.floor(value / 26);
        }
        return name;
      }
      
      const statusStyles = [
        { key: "acima", color: "FFFBE9DD" },
        { key: "abaixo", color: "FFE6F2F8" },
        { key: "igual", color: "FFE4F4EF" },
        { key: "nao-encontrado", color: "FFE5E7EB" },
      ];
      
      function cellStyleId(type, statusKey = "", header = false, highlighted = false) {
        if (header) return 1;
        const baseStyle = type === "money" ? 2 : type === "percent" ? 3 : type === "integer" ? 4 : 0;
        const typeOffset = type === "money" ? 1 : type === "percent" ? 2 : type === "integer" ? 3 : 0;
        if (highlighted) return 5 + (statusStyles.length * 4) + typeOffset;
        const statusIndex = statusStyles.findIndex((status) => status.key === statusKey);
        if (statusIndex < 0) return baseStyle;
        return 5 + (statusIndex * 4) + typeOffset;
      }
      
      function cellXml(reference, value, type, header = false, statusKey = "", highlighted = false) {
        const style = cellStyleId(type, statusKey, header, highlighted);
        if (header) {
          return `<c r="${reference}" t="inlineStr" s="${style}"><is><t>${escapeXml(value)}</t></is></c>`;
        }
        if (typeof value === "number" && Number.isFinite(value)) {
          return `<c r="${reference}"${style ? ` s="${style}"` : ""}><v>${roundedNumber(value, type)}</v></c>`;
        }
        const text = String(value ?? "");
        return `<c r="${reference}" t="inlineStr"${style ? ` s="${style}"` : ""}><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`;
      }
      
      function worksheetXml(table) {
        const allRows = [table.columns.map((column) => column.header), ...table.rows];
        const sheetRows = allRows.map((row, rowIndex) => {
          const statusKey = rowIndex > 0 ? table.statusKeys[rowIndex - 1] || "" : "";
          const cells = row.map((value, columnIndex) => cellXml(
            `${columnName(columnIndex)}${rowIndex + 1}`,
            value,
            table.columns[columnIndex]?.type || "text",
            rowIndex === 0,
            statusKey,
            rowIndex > 0 && Boolean(table.highlightCells?.[rowIndex - 1]?.[columnIndex]),
          )).join("");
          return `<row r="${rowIndex + 1}"${rowIndex === 0 ? ' ht="24" customHeight="1"' : ""}>${cells}</row>`;
        }).join("");
        const lastCell = `${columnName(Math.max(0, table.columns.length - 1))}${Math.max(1, allRows.length)}`;
        const widths = table.columns.map(
          (column, index) => `<col min="${index + 1}" max="${index + 1}" width="${column.width || 16}" customWidth="1"/>`,
        ).join("");
        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <dimension ref="A1:${lastCell}"/>
        <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
        <sheetFormatPr defaultRowHeight="18"/>
        <cols>${widths}</cols>
        <sheetData>${sheetRows}</sheetData>
        <autoFilter ref="A1:${lastCell}"/>
      </worksheet>`;
      }
      
      function stylesXml() {
        const fills = statusStyles.map((status) =>
          `<fill><patternFill patternType="solid"><fgColor rgb="${status.color}"/><bgColor indexed="64"/></patternFill></fill>`
        ).join("");
        const statusCellXfs = statusStyles.map((_, statusIndex) => {
          const fillId = statusIndex + 3;
          return [
            `<xf numFmtId="0" fontId="0" fillId="${fillId}" borderId="1" xfId="0" applyFill="1" applyBorder="1"/>`,
            `<xf numFmtId="164" fontId="0" fillId="${fillId}" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/>`,
            `<xf numFmtId="165" fontId="0" fillId="${fillId}" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/>`,
            `<xf numFmtId="1" fontId="0" fillId="${fillId}" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/>`,
          ].join("");
        }).join("");
        const highlightedFillId = 3 + statusStyles.length;
        const highlightedCellXfs = [
          `<xf numFmtId="0" fontId="0" fillId="${highlightedFillId}" borderId="1" xfId="0" applyFill="1" applyBorder="1"/>`,
          `<xf numFmtId="164" fontId="0" fillId="${highlightedFillId}" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/>`,
          `<xf numFmtId="165" fontId="0" fillId="${highlightedFillId}" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/>`,
          `<xf numFmtId="1" fontId="0" fillId="${highlightedFillId}" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/>`,
        ].join("");
        const fillCount = 4 + statusStyles.length;
        const xfCount = 9 + (statusStyles.length * 4);
        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;R$&quot; #,##0.00;[Red]-&quot;R$&quot; #,##0.00"/><numFmt numFmtId="165" formatCode="0.00%;[Red]-0.00%"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="${fillCount}"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1D4ED8"/><bgColor indexed="64"/></patternFill></fill>${fills}<fill><patternFill patternType="solid"><fgColor rgb="FFFDE68A"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD1D5DB"/></left><right style="thin"><color rgb="FFD1D5DB"/></right><top style="thin"><color rgb="FFD1D5DB"/></top><bottom style="thin"><color rgb="FFD1D5DB"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfCount}"><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyAlignment="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/><xf numFmtId="1" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>${statusCellXfs}${highlightedCellXfs}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
      }
      
      function crc32(bytes) {
        if (!crc32.table) {
          crc32.table = Array.from({ length: 256 }, (_, index) => {
            let value = index;
            for (let bit = 0; bit < 8; bit += 1) {
              value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : value >>> 1;
            }
            return value >>> 0;
          });
        }
        let crc = 0xffffffff;
        for (const byte of bytes) crc = crc32.table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
        return (crc ^ 0xffffffff) >>> 0;
      }
      
      function concatBytes(parts) {
        const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
        const output = new Uint8Array(totalLength);
        let offset = 0;
        for (const part of parts) {
          output.set(part, offset);
          offset += part.length;
        }
        return output;
      }
      
      function zipStoredFiles(files, generatedAt) {
        const encoder = new TextEncoder();
        const localParts = [];
        const centralParts = [];
        let localOffset = 0;
        const now = generatedAt instanceof Date && Number.isFinite(generatedAt.getTime())
          ? generatedAt
          : new Date();
        const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
        const dosDate = ((Math.max(1980, now.getFullYear()) - 1980) << 9)
          | ((now.getMonth() + 1) << 5) | now.getDate();
      
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
      
        const centralDirectory = concatBytes(centralParts);
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
        return concatBytes([...localParts, centralDirectory, end]);
      }
      
      function xlsxBytes(table, generatedAt) {
        return zipStoredFiles({
          "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
          "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
          "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Comparação" sheetId="1" r:id="rId1"/></sheets></workbook>`,
          "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
          "xl/styles.xml": stylesXml(),
          "xl/worksheets/sheet1.xml": worksheetXml(table),
        }, generatedAt);
      }
      
      /**
       * Prepara todos os formatos de exportação a partir da visão já filtrada e
       * ordenada. Não lê DOM, estado global nem workbooks de origem.
       */
      function prepareComparisonExport(input = {}) {
        const results = Array.isArray(input.results) ? input.results : [];
        const allDefinitions = exportColumnDefinitions();
        const definitionsByKey = new Map(allDefinitions.map((column) => [column.key, column]));
        const selectedDefinitions = Array.isArray(input.columnKeys)
          ? input.columnKeys.map((key) => definitionsByKey.get(key)).filter(Boolean)
          : allDefinitions;
        const definitions = selectedDefinitions.length ? selectedDefinitions : allDefinitions;
        const columns = definitions.map(({ key, header, type, width }) => ({
          key,
          header,
          type,
          width,
        }));
        const rows = results.map((result) => definitions.map((column) => column.value(result)));
        const table = {
          columns,
          rows,
          statusKeys: results.map((result) => result.statusKey || ""),
          highlightCells: results.map((result) => definitions.map((column) =>
            Boolean(column.divergenceField && exportFieldDiffers(result, column.divergenceField))
          )),
        };
        const textTable = {
          headers: columns.map((column) => column.header),
          rows: rows.map((row) => row.map(
            (value, index) => textValue(value, columns[index].type),
          )),
        };
        const stem = exportStem(input.projectFileName);
      
        return {
          hasRows: rows.length > 0,
          table,
          textTable,
          csv: {
            filename: `sicorp_v4_comparacao_${stem}.csv`,
            mime: "text/csv;charset=utf-8",
            text: csvText(textTable),
          },
          xlsx: {
            filename: `sicorp_v4_comparacao_${stem}.xlsx`,
            mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            bytes: xlsxBytes(table, input.generatedAt),
          },
          clipboardText: clipboardText(textTable),
        };
      }
      
      
