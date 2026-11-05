
    (() => {
      "use strict";
      const tableNames = [
        "periodo",
        "bdi",
        "encargo_social",
        "encargo_social_2",
        "admin_local_01",
        "admin_local_02",
        "admin_local_03",
        "insumo_frete",
        "fonte",
        "indice",
        "indice_periodo",
        "grupo_insumo",
        "grupo_servico",
        "insumo",
        "insumo_preco",
        "insumo_preco_equipamento",
        "insumo_preco_equipamento_maodeobra",
        "servico",
        "servico_preco",
        "composicao",
        "composicao_resumo",
      ];
      
      const requiredTables = new Set([0, 11, 13, 14, 17, 18]);
      const magic = [0x96, 0x19, 0xe0, 0xbd];
      const typeMask = 0x3f;
      const varying = 0x40;
      const array = 0x80;
      const monthNames = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
      ];
      
      const windows1252 = new TextDecoder("windows-1252");
      const utf16le = new TextDecoder("utf-16le");
      
      function invariant(condition, message) {
        if (!condition) throw new Error(message);
      }
      
      function orseByteView(value) {
        if (value instanceof Uint8Array) return value;
        if (value instanceof ArrayBuffer) return new Uint8Array(value);
        if (ArrayBuffer.isView(value)) {
          return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
        }
        throw new Error("O conteúdo do arquivo ORSE não foi fornecido em bytes válidos.");
      }
      
      function hasMagic(bytes) {
        return magic.every((value, index) => bytes[index] === value);
      }
      
      function u16(view, position) {
        return view.getUint16(position, true);
      }
      
      function u32(view, position) {
        return view.getUint32(position, true);
      }
      
      function signedInteger(bytes) {
        let value = 0n;
        for (let index = bytes.length - 1; index >= 0; index -= 1) {
          value = (value << 8n) | BigInt(bytes[index]);
        }
        const bits = BigInt(bytes.length * 8);
        if (bits && (value & (1n << (bits - 1n)))) value -= 1n << bits;
        return Number(value);
      }
      
      function unsignedInteger(bytes) {
        let value = 0n;
        for (let index = bytes.length - 1; index >= 0; index -= 1) {
          value = (value << 8n) | BigInt(bytes[index]);
        }
        return Number(value);
      }
      
      async function defaultYieldControl() {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      
      async function decryptOrse(encrypted, onProgress, yieldControl) {
        const output = new Uint8Array(encrypted.length);
        let seed = 0x0174;
        const blockSize = 1024 * 1024;
        for (let start = 0; start < encrypted.length; start += blockSize) {
          const end = Math.min(start + blockSize, encrypted.length);
          for (let index = start; index < end; index += 1) {
            const encryptedByte = encrypted[index];
            output[index] = encryptedByte ^ (seed >>> 8);
            seed = ((seed + encryptedByte) * 0xce6d + 0x58bf) & 0xffff;
          }
          onProgress(end / encrypted.length);
          await yieldControl();
        }
        invariant(hasMagic(output), "O arquivo não possui a assinatura interna esperada do ORSE.");
        return output;
      }
      
      function packetHeader(bytes) {
        invariant(bytes.length >= 24 && hasMagic(bytes), "Pacote MIDAS inválido.");
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        return {
          version: u32(view, 4),
          fieldCount: u16(view, 12),
          rowCount: u32(view, 14),
          dataOffset: u16(view, 22),
        };
      }
      
      async function defaultInflateZlib(compressed) {
        invariant(
          typeof DecompressionStream !== "undefined" && typeof Blob !== "undefined",
          "Este navegador não oferece descompactação compatível com arquivos ORSE.",
        );
        const stream = new Blob([compressed])
          .stream()
          .pipeThrough(new DecompressionStream("deflate"));
        return new Uint8Array(await new Response(stream).arrayBuffer());
      }
      
      function readShortString(bytes, position) {
        const length = bytes[position];
        const start = position + 1;
        const end = start + length;
        invariant(end <= bytes.length, "Texto fora dos limites do pacote.");
        return [windows1252.decode(bytes.subarray(start, end)), end];
      }
      
      function readProperty(bytes, view, position) {
        let name;
        [name, position] = readShortString(bytes, position);
        const size = u16(view, position);
        const fieldType = u16(view, position + 2);
        position += 4;
        let dataSize = 0;
        if (fieldType & array) {
          const count = u32(view, position);
          position += 4;
          dataSize = count * size;
        } else if (size) {
          dataSize = size;
          if (fieldType & varying) {
            dataSize = unsignedInteger(bytes.subarray(position, position + size));
            position += size;
          }
        }
        const end = position + dataSize;
        invariant(end <= bytes.length, `Propriedade ${name} fora dos limites do pacote.`);
        return [{ name, size, fieldType, data: bytes.subarray(position, end) }, end];
      }
      
      function decodeBcd(raw) {
        invariant(raw.length >= 2, "Valor BCD inválido.");
        const precision = raw[0];
        const signAndScale = raw[1];
        const scale = signAndScale & 0x3f;
        const negative = Boolean(signAndScale & 0x80);
        let digits = "";
        for (const packed of raw.subarray(2)) {
          digits += String(packed >>> 4) + String(packed & 0x0f);
        }
        digits = digits.slice(0, precision) || "0";
        invariant(!/[^0-9]/.test(digits), "Dígitos BCD inválidos.");
        let text;
        if (scale === 0) text = digits;
        else if (digits.length <= scale) text = `0.${"0".repeat(scale - digits.length)}${digits}`;
        else text = `${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
        const value = Number(text);
        return negative ? -value : value;
      }
      
      function decodeTimestamp(raw) {
        if (raw.length !== 8) return null;
        const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
        const milliseconds = view.getFloat64(0, true);
        return milliseconds > 0 ? milliseconds : null;
      }
      
      function decodeValue(bytes, view, field, position) {
        const baseType = field.fieldType & typeMask;
        let raw;
        if (field.fieldType & varying) {
          const valueSize = unsignedInteger(bytes.subarray(position, position + field.size));
          position += field.size;
          raw = bytes.subarray(position, position + valueSize);
          position += valueSize;
        } else {
          const storageSize = baseType === 5 || baseType === 18 ? 18 : field.size;
          raw = bytes.subarray(position, position + storageSize);
          position += storageSize;
        }
        invariant(position <= bytes.length, `Campo ${field.name} fora dos limites do pacote.`);
      
        let value;
        switch (baseType) {
          case 1:
            value = signedInteger(raw);
            break;
          case 2:
            value = unsignedInteger(raw);
            break;
          case 3:
            value = Boolean(unsignedInteger(raw));
            break;
          case 4:
            value = new DataView(raw.buffer, raw.byteOffset, raw.byteLength).getFloat64(0, true);
            break;
          case 5:
          case 18:
            value = decodeBcd(raw);
            break;
          case 6:
          case 7:
            value = signedInteger(raw);
            break;
          case 8:
            value = decodeTimestamp(raw);
            break;
          case 9:
            value = windows1252.decode(raw).replace(/\0+$/g, "");
            break;
          case 10:
            value = utf16le.decode(raw).replace(/\0+$/g, "");
            break;
          case 11:
            value = raw;
            break;
          default:
            value = raw;
        }
        return [value, position];
      }
      
      function parseClientDataSet(bytes, selectedFields = null) {
        const header = packetHeader(bytes);
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        let position = 24;
        const fields = [];
      
        for (let index = 0; index < header.fieldCount; index += 1) {
          let name;
          [name, position] = readShortString(bytes, position);
          const size = u16(view, position);
          const fieldType = u16(view, position + 2);
          const attributes = u16(view, position + 4);
          const propertyCount = u16(view, position + 6);
          position += 8;
          const properties = [];
          for (let count = 0; count < propertyCount; count += 1) {
            let property;
            [property, position] = readProperty(bytes, view, position);
            properties.push(property);
          }
          fields.push({ name, size, fieldType, attributes, properties });
        }
      
        const packetPropertyCount = u16(view, position);
        position += 2;
        const properties = [];
        for (let count = 0; count < packetPropertyCount; count += 1) {
          let property;
          [property, position] = readProperty(bytes, view, position);
          properties.push(property);
        }
        invariant(position === header.dataOffset, "Os metadados do pacote não terminam no ponto esperado.");
      
        const selected = selectedFields ? new Set(selectedFields) : null;
        const rows = new Array(header.rowCount);
        const statusByteCount = Math.floor((header.fieldCount + 3) / 4);
        position = header.dataOffset;
        for (let rowIndex = 0; rowIndex < header.rowCount; rowIndex += 1) {
          const recordStatus = bytes[position];
          position += 1;
          const fieldStatus = bytes.subarray(position, position + statusByteCount);
          position += statusByteCount;
          const row = { __record_status__: recordStatus };
          for (let fieldIndex = 0; fieldIndex < fields.length; fieldIndex += 1) {
            const field = fields[fieldIndex];
            const byteOffset = Math.floor(fieldIndex / 4);
            const bitOffset = (fieldIndex % 4) * 2;
            const blankStatus = (fieldStatus[byteOffset] >>> bitOffset) & 0x03;
            if (blankStatus) {
              if (!selected || selected.has(field.name)) row[field.name] = null;
            } else {
              let value;
              [value, position] = decodeValue(bytes, view, field, position);
              if (!selected || selected.has(field.name)) row[field.name] = value;
            }
          }
          rows[rowIndex] = row;
        }
        invariant(position === bytes.length, `O pacote terminou com ${bytes.length - position} bytes inesperados.`);
        return { ...header, fields, properties, rows };
      }
      
      async function extractRequiredPackets(decrypted, inflateZlib, onProgress, yieldControl) {
        const outerHeader = packetHeader(decrypted);
        invariant(
          outerHeader.rowCount === tableNames.length,
          `Esperadas 21 tabelas; foram encontradas ${outerHeader.rowCount}.`,
        );
        const view = new DataView(decrypted.buffer, decrypted.byteOffset, decrypted.byteLength);
        let position = outerHeader.dataOffset;
        const packets = new Map();
        const tableInfo = [];
      
        for (let tableIndex = 0; tableIndex < tableNames.length; tableIndex += 1) {
          const prefix = decrypted.subarray(position, position + 3);
          position += 3;
          const recordId = u32(view, position);
          position += 4;
          const sourcesLength = decrypted[position];
          position += 1;
          const sources = windows1252.decode(decrypted.subarray(position, position + sourcesLength));
          position += sourcesLength;
          const year = u16(view, position);
          const month = u16(view, position + 2);
          const order = u16(view, position + 4);
          position += 6;
          const compressedSize = u32(view, position);
          position += 4;
          const end = position + compressedSize;
          invariant(end <= decrypted.length, `Tabela ${tableNames[tableIndex]} incompleta.`);
          const compressed = decrypted.subarray(position, end);
          position = end;
      
          invariant(
            prefix[0] === 0x04 && prefix[1] === 0x00 && prefix[2] === 0x20,
            `Prefixo inválido na tabela ${tableIndex + 1}.`,
          );
          invariant(recordId === tableIndex + 1, `Ordem inválida na tabela ${tableIndex + 1}.`);
          const info = {
            index: tableIndex + 1,
            name: tableNames[tableIndex],
            sources,
            year,
            month,
            order,
            compressedSize,
          };
          if (requiredTables.has(tableIndex)) {
            const packet = orseByteView(await inflateZlib(compressed));
            info.rowCount = packetHeader(packet).rowCount;
            packets.set(tableNames[tableIndex], packet);
          }
          tableInfo.push(info);
          onProgress((tableIndex + 1) / tableNames.length, info);
          await yieldControl();
        }
        invariant(position === decrypted.length, `Há ${decrypted.length - position} bytes após a última tabela.`);
        return { packets, tableInfo };
      }
      
      function recordKey(source, code) {
        return `${String(source ?? "").trim().toUpperCase()}\u0000${code}`;
      }
      
      function formatCode(source, code) {
        return `${String(code).padStart(5, "0")}/${source}`;
      }
      
      function isOrse(source) {
        return String(source ?? "").trim().toUpperCase() === "ORSE";
      }
      
      function isActive(value) {
        return String(value ?? "").trim().toUpperCase() === "N";
      }
      
      function priceOrNull(value) {
        return typeof value === "number" && Number.isFinite(value) ? value : null;
      }
      
      function summarizeOrseRows(rows) {
        const withoutPrice = rows.filter((row) => row.custoUnitario === null).length;
        return { total: rows.length, withPrice: rows.length - withoutPrice, withoutPrice };
      }
      
      /** Aplica exatamente as regras de seleção homologadas no Conversor ORSE v1.3.0. */
      function buildOrseDataset(parsed) {
        const periodRows = parsed?.periodo?.rows || [];
        invariant(periodRows.length === 1, "A tabela de período deve conter uma linha.");
        const period = periodRows[0];
        const inputTypes = new Map(
          parsed.grupo_insumo.rows.map((row) => [
            row.gpin_nr_codigo,
            String(row.gpin_in_tipo ?? "").trim().toUpperCase(),
          ]),
        );
        const inputPrices = new Map();
        for (const row of parsed.insumo_preco.rows) {
          if (isOrse(row.font_sg_fonte)) {
            inputPrices.set(recordKey("ORSE", row.insu_nr_codigo), priceOrNull(row.inpr_vl_adotado));
          }
        }
        const inputs = parsed.insumo.rows
          .filter((master) => isOrse(master.font_sg_fonte)
            && inputTypes.get(master.gpin_nr_codigo) === "M"
            && isActive(master.insu_in_desativado))
          .map((master) => ({
            codigo: formatCode("ORSE", master.insu_nr_codigo),
            descricao: String(master.insu_tx_descricao || "").trim(),
            unidade: String(master.insu_sg_unidade || "").trim(),
            custoUnitario: inputPrices.get(recordKey("ORSE", master.insu_nr_codigo)) ?? null,
          }));
      
        const servicePrices = new Map();
        for (const row of parsed.servico_preco.rows) {
          if (isOrse(row.font_sg_fonte)) {
            servicePrices.set(recordKey("ORSE", row.serv_nr_codigo), priceOrNull(row.svpr_vl_unitario));
          }
        }
        const services = parsed.servico.rows
          .filter((master) => isOrse(master.font_sg_fonte) && isActive(master.serv_in_desativado))
          .map((master) => ({
            codigo: formatCode("ORSE", master.serv_nr_codigo),
            descricao: String(master.serv_tx_descricao || "").trim(),
            unidade: String(master.serv_sg_unidade || "").trim(),
            custoUnitario: servicePrices.get(recordKey("ORSE", master.serv_nr_codigo)) ?? null,
          }));
      
        return {
          period: {
            year: period.peri_nr_ano,
            month: period.peri_nr_mes,
            order: period.peri_nr_ordem,
          },
          inputs,
          services,
          stats: { inputs: summarizeOrseRows(inputs), services: summarizeOrseRows(services) },
        };
      }
      
      function cleanExcelText(value) {
        return String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, " ");
      }
      
      function outputFileName(inputFileName) {
        const original = String(inputFileName || "base.ORSE").trim();
        const stem = original.replace(/\.orse$/i, "")
          .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
          .replace(/\s+/g, " ")
          .trim() || "base";
        return `${stem}_ORSE.xlsx`;
      }
      
      function dataSheet(name, rows) {
        return {
          name,
          rows: [
            ["Código", "Descrição", "Unidade", "Custo Unitário"],
            ...rows.map((row) => [
              row.codigo,
              cleanExcelText(row.descricao),
              cleanExcelText(row.unidade),
              row.custoUnitario,
            ]),
          ],
          numberFormats: [[], ...rows.map(() => ["@", "", "", "#,##0.00"])],
          columnWidths: [18, 78, 13, 19],
          autoFilter: "A1:D1",
          freezeRows: 1,
        };
      }
      
      function summarySheet(data, inputFileName) {
        const { year, month, order } = data.period;
        const periodLabel = `${monthNames[month - 1] || month}/${year}`;
        const numberFormat = new Intl.NumberFormat("pt-BR");
        const rows = Array.from({ length: 14 }, () => []);
        rows[0] = [`ORSE — ${periodLabel}`];
        rows[2] = ["Arquivo analisado", inputFileName];
        rows[3] = ["Período interno", periodLabel];
        rows[4] = ["Ordem do período", order];
        rows[5] = ["Resultado", "Somente materiais e serviços ORSE ativos"];
        rows[8] = ["Categoria", "Registros encontrados", "Incluída na planilha", "Validação"];
        rows[9] = [
          "Insumos materiais ORSE ativos",
          data.stats.inputs.total,
          "Sim",
          `${numberFormat.format(data.stats.inputs.withPrice)} com custo · ${numberFormat.format(data.stats.inputs.withoutPrice)} sem custo`,
        ];
        rows[10] = [
          "Serviços ORSE ativos",
          data.stats.services.total,
          "Sim",
          `${numberFormat.format(data.stats.services.withPrice)} com custo · ${numberFormat.format(data.stats.services.withoutPrice)} sem custo`,
        ];
        rows[12] = [
          "Foram excluídos todos os registros SINAPI e todos os itens inativos. Nos insumos, foram mantidos somente os materiais ativos. Itens ativos sem preço permanecem nas tabelas com o custo vazio.",
        ];
        return {
          name: "Resumo",
          rows,
          numberFormats: [],
          columnWidths: [28, 31, 24, 35],
          merges: ["A1:D1", "A13:D14"],
        };
      }
      
      /** Monta a visão interna e a pasta de trabalho completa destinada ao download. */
      function prepareOrseWorkbooks(data, inputFileName) {
        const fileName = outputFileName(inputFileName);
        const inputs = dataSheet("Insumos", data.inputs);
        const services = dataSheet("Servicos", data.services);
        return {
          outputFileName: fileName,
          workbook: {
            fileName,
            format: "orse",
            sheets: [inputs, services],
            orse: { period: { ...data.period }, stats: structuredClone(data.stats) },
          },
          exportWorkbook: {
            fileName,
            format: "xlsx",
            sheets: [summarySheet(data, inputFileName), inputs, services],
          },
        };
      }
      
      /** Converte o conteúdo binário de um arquivo .ORSE sem acessar DOM ou estado global. */
      async function convertOrseFile(input = {}, dependencies = {}) {
        const fileName = String(input.fileName || "").trim();
        invariant(fileName, "Informe o nome do arquivo ORSE.");
        invariant(/\.orse$/i.test(fileName), "Selecione um arquivo com a extensão .ORSE.");
        const encrypted = orseByteView(input.bytes);
        const onStage = typeof input.onStage === "function" ? input.onStage : () => {};
        const inflateZlib = dependencies.inflateZlib || defaultInflateZlib;
        const yieldControl = dependencies.yieldControl || defaultYieldControl;
      
        onStage("decrypt", 0);
        const decrypted = await decryptOrse(
          encrypted,
          (fraction) => onStage("decrypt", fraction),
          yieldControl,
        );
        onStage("extract", 0);
        const { packets, tableInfo } = await extractRequiredPackets(
          decrypted,
          inflateZlib,
          (fraction, info) => onStage("extract", fraction, info),
          yieldControl,
        );
      
        const definitions = {
          periodo: ["peri_nr_ano", "peri_nr_mes", "peri_nr_ordem"],
          grupo_insumo: ["gpin_nr_codigo", "gpin_in_tipo"],
          insumo: ["font_sg_fonte", "insu_nr_codigo", "insu_tx_descricao", "insu_sg_unidade", "gpin_nr_codigo", "insu_in_desativado"],
          insumo_preco: ["font_sg_fonte", "insu_nr_codigo", "inpr_vl_adotado"],
          servico: ["font_sg_fonte", "serv_nr_codigo", "serv_tx_descricao", "serv_sg_unidade", "serv_in_desativado"],
          servico_preco: ["font_sg_fonte", "serv_nr_codigo", "svpr_vl_unitario"],
        };
        const parsed = {};
        const names = Object.keys(definitions);
        for (let index = 0; index < names.length; index += 1) {
          const name = names[index];
          onStage("parse", index / names.length, { name });
          parsed[name] = parseClientDataSet(packets.get(name), definitions[name]);
          await yieldControl();
        }
        onStage("parse", 1);
        const data = buildOrseDataset(parsed);
        const workbooks = prepareOrseWorkbooks(data, fileName);
        onStage("done", 1, { stats: data.stats });
        return { ...workbooks, data, tableInfo };
      }
      
      function orseEscapeXml(value) {
        return String(value ?? "")
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&apos;");
      }
      
      function orseColumnName(index) {
        let value = index + 1;
        let name = "";
        while (value > 0) {
          value -= 1;
          name = String.fromCharCode(65 + (value % 26)) + name;
          value = Math.floor(value / 26);
        }
        return name;
      }
      
      function orseInlineCell(reference, value, style = 0) {
        const styleAttribute = style ? ` s="${style}"` : "";
        return `<c r="${reference}" t="inlineStr"${styleAttribute}><is><t xml:space="preserve">${orseEscapeXml(value)}</t></is></c>`;
      }
      
      function orseNumberCell(reference, value, style = 0) {
        const styleAttribute = style ? ` s="${style}"` : "";
        return `<c r="${reference}"${styleAttribute}><v>${Number(value)}</v></c>`;
      }
      
      function orseEmptyCell(reference, style = 0) {
        return `<c r="${reference}"${style ? ` s="${style}"` : ""}/>`;
      }
      
      function orseSummaryWorksheetXml(sheet) {
        const row = (number, cells, attributes = "") => `<row r="${number}"${attributes}>${cells}</row>`;
        const rows = [
          row(1, orseInlineCell("A1", sheet.rows[0]?.[0] || "", 1), ' ht="30" customHeight="1"'),
          ...[3, 4, 5, 6].map((rowNumber) => {
            const values = sheet.rows[rowNumber - 1] || [];
            const valueCell = typeof values[1] === "number"
              ? orseNumberCell(`B${rowNumber}`, values[1])
              : orseInlineCell(`B${rowNumber}`, values[1] || "");
            return row(rowNumber, orseInlineCell(`A${rowNumber}`, values[0] || "", 2) + valueCell);
          }),
          row(9, (sheet.rows[8] || []).map((value, index) =>
            orseInlineCell(`${orseColumnName(index)}9`, value, 3)).join(""), ' ht="25" customHeight="1"'),
          ...[10, 11].map((rowNumber) => {
            const values = sheet.rows[rowNumber - 1] || [];
            return row(rowNumber, values.map((value, index) => {
              const reference = `${orseColumnName(index)}${rowNumber}`;
              return index === 1 && typeof value === "number"
                ? orseNumberCell(reference, value, 5)
                : orseInlineCell(reference, value, 4);
            }).join(""));
          }),
          row(13, orseInlineCell("A13", sheet.rows[12]?.[0] || "", 6), ' ht="25" customHeight="1"'),
          row(14, "", ' ht="25" customHeight="1"'),
        ].join("");
        const widths = sheet.columnWidths.map((width, index) =>
          `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("");
        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <dimension ref="A1:D14"/>
        <sheetViews><sheetView showGridLines="0" workbookViewId="0"/></sheetViews>
        <sheetFormatPr defaultRowHeight="15"/>
        <cols>${widths}</cols>
        <sheetData>${rows}</sheetData>
        <mergeCells count="2"><mergeCell ref="A1:D1"/><mergeCell ref="A13:D14"/></mergeCells>
      </worksheet>`;
      }
      
      function orseDataWorksheetXml(sheet) {
        const rows = sheet.rows.map((values, rowIndex) => {
          const rowNumber = rowIndex + 1;
          const cells = values.map((value, columnIndex) => {
            const reference = `${orseColumnName(columnIndex)}${rowNumber}`;
            if (rowIndex === 0) return orseInlineCell(reference, value, 10);
            if (columnIndex === 0) return orseInlineCell(reference, value, 7);
            if (columnIndex === 3) {
              return typeof value === "number" && Number.isFinite(value)
                ? orseNumberCell(reference, value, 9)
                : orseEmptyCell(reference, 9);
            }
            return orseInlineCell(reference, value);
          }).join("");
          return `<row r="${rowNumber}"${rowIndex === 0 ? ' ht="24" customHeight="1"' : ""}>${cells}</row>`;
        }).join("");
        const widths = sheet.columnWidths.map((width, index) =>
          `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("");
        const lastRow = Math.max(1, sheet.rows.length);
        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <dimension ref="A1:D${lastRow}"/>
        <sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
        <sheetFormatPr defaultRowHeight="18"/>
        <cols>${widths}</cols>
        <sheetData>${rows}</sheetData>
        <autoFilter ref="A1:D1"/>
      </worksheet>`;
      }
      
      function orseStylesXml() {
        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts>
        <fonts count="5">
          <font><sz val="11"/><name val="Calibri"/></font>
          <font><b/><sz val="17"/><color rgb="FFFFFFFF"/><name val="Aptos Display"/></font>
          <font><b/><sz val="11"/><color rgb="FF17365D"/><name val="Calibri"/></font>
          <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
          <font><sz val="11"/><color rgb="FF7F6000"/><name val="Calibri"/></font>
        </fonts>
        <fills count="6">
          <fill><patternFill patternType="none"/></fill>
          <fill><patternFill patternType="gray125"/></fill>
          <fill><patternFill patternType="solid"><fgColor rgb="FF17365D"/><bgColor indexed="64"/></patternFill></fill>
          <fill><patternFill patternType="solid"><fgColor rgb="FFD9EAF7"/><bgColor indexed="64"/></patternFill></fill>
          <fill><patternFill patternType="solid"><fgColor rgb="FF1F4E78"/><bgColor indexed="64"/></patternFill></fill>
          <fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor indexed="64"/></patternFill></fill>
        </fills>
        <borders count="3">
          <border><left/><right/><top/><bottom/><diagonal/></border>
          <border><left/><right/><top/><bottom style="thin"><color rgb="FFD6E1EC"/></bottom><diagonal/></border>
          <border><left/><right/><top/><bottom style="medium"><color rgb="FF17365D"/></bottom><diagonal/></border>
        </borders>
        <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
        <cellXfs count="11">
          <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
          <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
          <xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
          <xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
          <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
          <xf numFmtId="3" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
          <xf numFmtId="0" fontId="4" fillId="5" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
          <xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
          <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
          <xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right"/></xf>
          <xf numFmtId="0" fontId="3" fillId="4" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
        </cellXfs>
        <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
      </styleSheet>`;
      }
      
      function orseCrc32(bytes) {
        if (!orseCrc32.table) {
          orseCrc32.table = Array.from({ length: 256 }, (_, index) => {
            let value = index;
            for (let bit = 0; bit < 8; bit += 1) {
              value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : value >>> 1;
            }
            return value >>> 0;
          });
        }
        let crc = 0xffffffff;
        for (const byte of bytes) crc = orseCrc32.table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
        return (crc ^ 0xffffffff) >>> 0;
      }
      
      function orseConcatBytes(parts) {
        const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
        const output = new Uint8Array(totalLength);
        let offset = 0;
        for (const part of parts) {
          output.set(part, offset);
          offset += part.length;
        }
        return output;
      }
      
      function orseZipStoredFiles(files, generatedAt = new Date()) {
        const encoder = new TextEncoder();
        const localParts = [];
        const centralParts = [];
        let localOffset = 0;
        const now = generatedAt instanceof Date && Number.isFinite(generatedAt.getTime()) ? generatedAt : new Date();
        const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
        const dosDate = ((Math.max(1980, now.getFullYear()) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
      
        for (const [name, content] of Object.entries(files)) {
          const nameBytes = encoder.encode(name);
          const dataBytes = typeof content === "string" ? encoder.encode(content) : content;
          const checksum = orseCrc32(dataBytes);
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
          centralView.setUint32(42, localOffset, true);
          central.set(nameBytes, 46);
          centralParts.push(central);
          localOffset += local.length;
        }
      
        const centralDirectory = orseConcatBytes(centralParts);
        const end = new Uint8Array(22);
        const endView = new DataView(end.buffer);
        endView.setUint32(0, 0x06054b50, true);
        endView.setUint16(8, centralParts.length, true);
        endView.setUint16(10, centralParts.length, true);
        endView.setUint32(12, centralDirectory.length, true);
        endView.setUint32(16, localOffset, true);
        return orseConcatBytes([...localParts, centralDirectory, end]);
      }
      
      function orseWorkbookFiles(workbook, generatedAt) {
        const sheetNames = workbook.sheets.map((sheet) => sheet.name);
        const worksheets = Object.fromEntries(workbook.sheets.map((sheet, index) => [
          `xl/worksheets/sheet${index + 1}.xml`,
          index === 0 ? orseSummaryWorksheetXml(sheet) : orseDataWorksheetXml(sheet),
        ]));
        const sheetsXml = sheetNames.map((name, index) =>
          `<sheet name="${orseEscapeXml(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("");
        const sheetRelationships = sheetNames.map((_, index) =>
          `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("");
        const created = (generatedAt instanceof Date && Number.isFinite(generatedAt.getTime()) ? generatedAt : new Date()).toISOString();
        return {
          "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>${sheetNames.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`,
          "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`,
          "docProps/core.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${orseEscapeXml(workbook.fileName)}</dc:title><dc:subject>Extração de base mensal ORSE</dc:subject><dc:creator>Conversor ORSE para Excel</dc:creator><cp:lastModifiedBy>Conversor ORSE para Excel</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${created}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${created}</dcterms:modified></cp:coreProperties>`,
          "docProps/app.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>SICORP</Application><Company>ORSE</Company><TitlesOfParts><vt:vector size="${sheetNames.length}" baseType="lpstr">${sheetNames.map((name) => `<vt:lpstr>${orseEscapeXml(name)}</vt:lpstr>`).join("")}</vt:vector></TitlesOfParts></Properties>`,
          "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${sheetsXml}</sheets><calcPr calcId="191029"/></workbook>`,
          "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheetRelationships}<Relationship Id="rId${sheetNames.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
          "xl/styles.xml": orseStylesXml(),
          ...worksheets,
        };
      }
      
      /** Serializa o workbook completo com a mesma identidade visual do Conversor ORSE v1.3.0. */
      function writeOrseWorkbookXlsx(workbook, _spreadsheetRuntime, options = {}) {
        invariant(
          workbook?.sheets?.length === 3
            && workbook.sheets[0]?.name === "Resumo"
            && workbook.sheets[1]?.name === "Insumos"
            && workbook.sheets[2]?.name === "Servicos",
          "O workbook ORSE precisa conter as abas Resumo, Insumos e Servicos nesta ordem.",
        );
        const generatedAt = options.generatedAt instanceof Date ? options.generatedAt : new Date();
        return orseZipStoredFiles(orseWorkbookFiles(workbook, generatedAt), generatedAt);
      }
      
      
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
      
      
      function cell(row, index) {
        if (index === null || index === undefined || index === "") return "";
        return row?.[Number(index)] ?? "";
      }
      
      function compactText(value) {
        return String(value ?? "").trim().replace(/\s+/g, " ");
      }
      
      function normalizedHeaderText(value) {
        return compactText(value)
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLocaleLowerCase("pt-BR");
      }
      
      function headerSignature(sheet, headerRowNumber, mapping) {
        const header = sheet.rows?.[Number(headerRowNumber) - 1] ?? [];
        return [
          mapping.code,
          mapping.source,
          mapping.description,
          mapping.unit,
          mapping.quantity,
          mapping.priceWithoutBdi,
          mapping.bdi,
          mapping.priceWithBdi,
          mapping.totalWithBdi,
        ]
          .filter((index) => index !== null && index !== undefined && index !== "")
          .map(Number)
          .filter(Number.isInteger)
          .map((index) => ({ index, text: normalizedHeaderText(cell(header, index)) }))
          .filter(({ text }) => text !== "");
      }
      
      function matchesHeaderSignature(row, signature) {
        return signature.length >= 3
          && signature.every(({ index, text }) => normalizedHeaderText(cell(row, index)) === text);
      }
      
      function isHeaderCodeLabel(value) {
        const text = normalizedHeaderText(value);
        return text.length <= 80 && /^(?:cod|codigo)(?:\b|[.:_\-/])/.test(text);
      }
      
      function isGenericHeaderCodeLabel(value) {
        const text = normalizedHeaderText(value);
        return text.length <= 80 && /^(?:insumo|item|composicao|servico)(?:\b|[.:_\-/])/.test(text);
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
      
      function isRepeatedHeader(row, signature, mapping) {
        if (matchesHeaderSignature(row, signature)) return true;
      
        const selectedPriceHeaders = [
          mapping.priceWithoutBdi,
          mapping.priceWithBdi,
          mapping.totalWithBdi,
        ]
          .filter((index) => index !== null && index !== undefined && index !== "")
          .map((index) => cell(row, index));
      
        const codeLabel = cell(row, mapping.code);
        return (isHeaderCodeLabel(codeLabel) || isGenericHeaderCodeLabel(codeLabel))
          && isDescriptionHeaderLabel(cell(row, mapping.description))
          && isUnitHeaderLabel(cell(row, mapping.unit))
          && isQuantityHeaderLabel(cell(row, mapping.quantity))
          && selectedPriceHeaders.some(isPriceHeaderLabel);
      }
      
      function rowHasContent(row) {
        return Array.isArray(row) && row.some((value) => compactText(value) !== "");
      }
      
      function normalizeCode(value, policy) {
        let code = compactText(value);
        if (policy?.caseInsensitive) code = code.toUpperCase();
        if (policy?.stripSeparators) code = code.replace(/[\s.\-/\\]/g, "");
        return code.replace(/^0+(?=.)/, "");
      }
      
      function normalizeSourceKey(value) {
        return compactText(value)
          .normalize("NFKD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLocaleLowerCase("pt-BR")
          .replace(/[^a-z0-9]+/g, " ")
          .trim();
      }
      
      function parseStrictNumber(value) {
        if (typeof value === "number") return Number.isFinite(value) ? value : Number.NaN;
      
        let text = String(value ?? "").replace(/\u00a0/g, " ").trim();
        if (!text) return Number.NaN;
      
        text = text
          .replace(/^R\$\s*/i, "")
          .replace(/\s*%$/, "")
          .replace(/\s/g, "");
      
        if (/^[+\-]?(?:\d+(?:\.\d*)?|\.\d+)[eE][+\-]?\d+$/.test(text)) {
          const scientific = Number(text);
          return Number.isFinite(scientific) ? scientific : Number.NaN;
        }
      
        const hasComma = text.includes(",");
        const hasDot = text.includes(".");
      
        if (hasComma && hasDot) {
          const brazilian = /^[+\-]?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/;
          const international = /^[+\-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/;
          if (brazilian.test(text)) {
            text = text.replace(/\./g, "").replace(",", ".");
          } else if (international.test(text)) {
            text = text.replace(/,/g, "");
          } else {
            return Number.NaN;
          }
        } else if (hasComma) {
          if (!/^[+\-]?\d+(?:,\d+)?$/.test(text)) return Number.NaN;
          text = text.replace(",", ".");
        } else if (hasDot) {
          if (!/^[+\-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return Number.NaN;
        } else if (!/^[+\-]?\d+$/.test(text)) {
          return Number.NaN;
        }
      
        const parsed = Number(text);
        return Number.isFinite(parsed) ? parsed : Number.NaN;
      }
      
      function parseBdiRate(value) {
        const parsed = parseStrictNumber(value);
        if (!Number.isFinite(parsed)) return Number.NaN;
      
        const hasPercentSign = String(value ?? "").includes("%");
        const rate = hasPercentSign || Math.abs(parsed) > 1 ? parsed / 100 : parsed;
        return rate > -1 ? rate : Number.NaN;
      }
      
      function usablePrice(value) {
        return Number.isFinite(value) && value > 0;
      }
      
      function roundMoneyValue(value) {
        if (!Number.isFinite(value)) return Number.NaN;
        return Math.round((value + Number.EPSILON * Math.max(1, Math.abs(value))) * 100) / 100;
      }
      
      function metadataCell(matrix, rowIndex, columnIndex, fallback = "") {
        if (columnIndex === null || columnIndex === undefined || columnIndex === "") return fallback;
        return matrix?.[rowIndex]?.[Number(columnIndex)] ?? fallback;
      }
      
      function auditField(sheet, row, rowIndex, columnIndex, parser = parseStrictNumber) {
        const raw = cell(row, columnIndex);
        return {
          raw,
          value: parser(raw),
          numberFormat: metadataCell(sheet?.numberFormats, rowIndex, columnIndex),
          formula: metadataCell(sheet?.formulas, rowIndex, columnIndex),
          error: metadataCell(sheet?.cellErrors, rowIndex, columnIndex),
          hiddenColumn: columnIndex !== null
            && columnIndex !== undefined
            && columnIndex !== ""
            && Boolean(sheet?.hiddenColumns?.[Number(columnIndex)]),
        };
      }
      
      function priceForRow(row, mapping) {
        const withoutBdiRaw = cell(row, mapping.priceWithoutBdi);
        let withoutBdi = parseStrictNumber(withoutBdiRaw);
        let withoutBdiSource = usablePrice(withoutBdi) ? "Informado" : "Indisponível";
        const bdiRaw = cell(row, mapping.bdi);
        let bdiRate = parseBdiRate(bdiRaw);
        const withBdiRaw = cell(row, mapping.priceWithBdi);
        let withBdi = parseStrictNumber(withBdiRaw);
        let withBdiSource = usablePrice(withBdi) ? "Informado" : "Indisponível";
      
        const bdiNotMapped = mapping.bdi === null || mapping.bdi === undefined || mapping.bdi === "";
        if (bdiNotMapped && !Number.isFinite(bdiRate) && usablePrice(withoutBdi) && usablePrice(withBdi)) {
          bdiRate = (withBdi / withoutBdi) - 1;
        }
      
        if (!usablePrice(withoutBdi) && usablePrice(withBdi) && Number.isFinite(bdiRate)) {
          withoutBdi = roundMoneyValue(withBdi / (1 + bdiRate));
          withoutBdiSource = "Calculado com BDI";
        }
      
        if (!usablePrice(withBdi) && usablePrice(withoutBdi) && Number.isFinite(bdiRate)) {
          withBdi = roundMoneyValue(withoutBdi * (1 + bdiRate));
          withBdiSource = "Calculado sem BDI + BDI";
        }
      
        return {
          withoutBdiRaw,
          withoutBdi,
          withoutBdiSource,
          bdiRaw,
          bdiRate,
          withBdiRaw,
          withBdi,
          withBdiSource,
        };
      }
      
      function reviewPriceText(price) {
        return [price.withoutBdiRaw, price.withBdiRaw]
          .filter((value) => compactText(value) !== "")
          .map(compactText)
          .join(" / ");
      }
      
      const AUDIT_MAPPING_FIELDS = [
        "code",
        "source",
        "description",
        "unit",
        "quantity",
        "priceWithoutBdi",
        "bdi",
        "priceWithBdi",
        "totalWithBdi",
      ];
      
      function mappedColumnLabels(sheet, headerRowIndex, mapping) {
        const header = sheet?.rows?.[headerRowIndex] ?? [];
        return Object.fromEntries(AUDIT_MAPPING_FIELDS.map((key) => [
          key,
          compactText(cell(header, mapping?.[key])),
        ]));
      }
      
      /**
       * Analisa uma aba canônica de orçamento sem depender de DOM, File ou readers.
       *
       * O checkpoint dev.10 cobre uma linha válida com preços informados e a remoção
       * de linhas sem identidade completa como Linha estrutural e mantém linhas
       * com identidade completa para a auditoria numérica. Também cobre os cálculos entre
       * preços com e sem BDI, cabeçalhos repetidos por assinatura ou rótulos
       * equivalentes, linhas anteriores ao cabeçalho e números com separadores
       * brasileiros ou em notação científica. Os demais casos serão acrescentados
       * separadamente.
       */
      function analyzeBudget({
        fileName,
        sheet,
        headerRowNumber,
        mapping,
        codePolicy,
        includeAuditData = false,
      }) {
        sheet = visibleSheet(sheet);
        const items = [];
        const reviewRows = [];
        const auditRows = [];
        const headerRowIndex = Math.max(0, Number(headerRowNumber) - 1);
        const firstDataRowIndex = headerRowIndex + 1;
        const repeatedHeaderSignature = headerSignature(sheet, headerRowNumber, mapping);
        const columnLabels = mappedColumnLabels(sheet, headerRowIndex, mapping);
      
        for (let rowIndex = 0; rowIndex < headerRowIndex; rowIndex += 1) {
          const row = sheet.rows[rowIndex] ?? [];
          if (!rowHasContent(row)) continue;
      
          const price = priceForRow(row, mapping);
          const totalWithBdiRaw = cell(row, mapping.totalWithBdi);
          const totalWithBdi = parseStrictNumber(totalWithBdiRaw);
          reviewRows.push({
            treatment: "Removida",
            reason: "Antes do cabeçalho",
            reasonDetails: [
              "Linha anterior ao cabeçalho selecionado; exibida apenas como contexto na pré-visualização.",
            ],
            origin: {
              fileName,
              sheet: sheet.name,
              rowNumber: rowIndex + 1,
            },
            values: {
              code: cell(row, mapping.code),
              source: cell(row, mapping.source),
              description: cell(row, mapping.description),
              unit: cell(row, mapping.unit),
              quantity: cell(row, mapping.quantity),
              price: reviewPriceText(price),
            },
          });
        }
      
        for (let rowIndex = firstDataRowIndex; rowIndex < sheet.rows.length; rowIndex += 1) {
          const row = sheet.rows[rowIndex] ?? [];
          if (!rowHasContent(row)) continue;
      
          const codeRaw = cell(row, mapping.code);
          const code = normalizeCode(codeRaw, codePolicy);
          const sourceRaw = cell(row, mapping.source);
          const source = compactText(sourceRaw);
          const sourceKey = normalizeSourceKey(source);
          const descriptionRaw = cell(row, mapping.description);
          const description = compactText(descriptionRaw);
          const unitRaw = cell(row, mapping.unit);
          const unit = compactText(unitRaw);
          const quantityRaw = cell(row, mapping.quantity);
          const quantity = parseStrictNumber(quantityRaw);
          const price = priceForRow(row, mapping);
          const totalWithBdiRaw = cell(row, mapping.totalWithBdi);
          const totalWithBdi = parseStrictNumber(totalWithBdiRaw);
      
          if (isRepeatedHeader(row, repeatedHeaderSignature, mapping)) {
            reviewRows.push({
              treatment: "Removida",
              reason: "Cabeçalho repetido",
              reasonDetails: [],
              origin: {
                fileName,
                sheet: sheet.name,
                rowNumber: rowIndex + 1,
              },
              values: {
                code: codeRaw,
                source: sourceRaw,
                description: descriptionRaw,
                unit: unitRaw,
                quantity: quantityRaw,
                price: reviewPriceText(price),
              },
            });
            continue;
          }
      
          const identityProblems = [];
          if (!code) identityProblems.push("Código ausente ou inválido");
          if (!sourceKey) identityProblems.push("Fonte/base de referência ausente");
          if (!description) identityProblems.push("Descrição ausente");
          if (!unit) identityProblems.push("Unidade ausente");

          const structural = identityProblems.length > 0;
          const numericFields = {
            quantity: auditField(sheet, row, rowIndex, mapping.quantity),
            priceWithoutBdi: auditField(sheet, row, rowIndex, mapping.priceWithoutBdi),
            bdi: auditField(sheet, row, rowIndex, mapping.bdi, parseBdiRate),
            priceWithBdi: auditField(sheet, row, rowIndex, mapping.priceWithBdi),
            totalWithBdi: auditField(sheet, row, rowIndex, mapping.totalWithBdi),
          };
          const emptyOrZeroFields = structural ? [] : Object.keys(numericFields).filter((key) => {
            if (mapping[key] === null || mapping[key] === undefined || mapping[key] === "") return false;
            const field = numericFields[key];
            if (compactText(field.error)) return false;
            const emptyCell = compactText(field.raw) === "" && compactText(field.formula) === "";
            return emptyCell || field.value === 0;
          });
          const excludedForEmptyOrZero = emptyOrZeroFields.length > 0;
          if (includeAuditData) {
            auditRows.push({
              kind: structural || excludedForEmptyOrZero ? "excluded" : "item",
              origin: {
                fileName,
                sheet: sheet.name,
                rowNumber: rowIndex + 1,
              },
              code,
              displayCode: compactText(codeRaw),
              sourceKey,
              displaySource: source,
              description,
              unit,
              hiddenRow: Boolean(sheet?.hiddenRows?.[rowIndex]),
              fields: numericFields,
            });
          }
          if (structural) {
            reviewRows.push({
              treatment: "Removida",
              reason: "Linha estrutural",
              reasonDetails: identityProblems,
              origin: {
                fileName,
                sheet: sheet.name,
                rowNumber: rowIndex + 1,
              },
              values: {
                code: codeRaw,
                source: sourceRaw,
                description: descriptionRaw,
                unit: unitRaw,
                quantity: quantityRaw,
                price: reviewPriceText(price),
              },
            });
            continue;
          }

          if (excludedForEmptyOrZero) {
            reviewRows.push({
              treatment: "Removida",
              reason: "Item com quantidade ou valor vazio/zero",
              reasonCode: "BUDGET_ITEM_EMPTY_OR_ZERO",
              reasonDetails: emptyOrZeroFields.map((key) =>
                `${columnLabels[key] || key}: ${compactText(numericFields[key].raw) === "" ? "célula vazia" : "valor igual a zero"}.`
              ),
              relatedFields: emptyOrZeroFields,
              origin: { fileName, sheet: sheet.name, rowNumber: rowIndex + 1 },
              values: {
                code: codeRaw, source: sourceRaw, description: descriptionRaw, unit: unitRaw,
                quantity: quantityRaw, price: reviewPriceText(price),
              },
            });
            continue;
          }
      
          items.push({
            origin: {
              fileName,
              sheet: sheet.name,
              rowNumber: rowIndex + 1,
            },
            codeRaw,
            code,
            source,
            sourceKey,
            description,
            unit,
            quantityRaw,
            quantity,
            price,
            ...(includeAuditData ? { totalWithBdiRaw, totalWithBdi } : {}),
          });
        }
      
        const result = {
          items,
          reviewRows,
          stats: {
            accepted: items.length,
            reviewed: reviewRows.length,
          },
        };
        if (includeAuditData) {
          result.audit = {
            mapping: { ...mapping },
            columnLabels,
            headerRowNumber: headerRowIndex + 1,
            rows: auditRows,
          };
        }
        return result;
      }
      
      
      const PRICE_COMPONENTS = ["priceWithoutBdi", "bdi", "priceWithBdi"];
      const FINANCIAL_FIELDS = [
        "quantity",
        "priceWithoutBdi",
        "bdi",
        "priceWithBdi",
        "totalWithBdi",
      ];
      const ITEM_LEVEL_FINANCIAL_FIELDS = [
        "quantity",
        "priceWithoutBdi",
        "bdi",
        "priceWithBdi",
      ];
      
      const FIELD_LABELS = {
        code: "Código",
        source: "Base",
        description: "Descrição",
        unit: "Unidade",
        quantity: "Quantidade",
        priceWithoutBdi: "Preço sem BDI",
        bdi: "BDI",
        priceWithBdi: "Preço com BDI",
        totalWithBdi: "Valor total com BDI",
        totalGeneral: "Total geral do orçamento",
      };
      
      function compactText(value) {
        return String(value ?? "").trim().replace(/\s+/g, " ");
      }
      
      function parseStrictNumber(value) {
        if (typeof value === "number") return Number.isFinite(value) ? value : Number.NaN;
      
        let text = compactText(value);
        if (!text) return Number.NaN;
        text = text.replace(/^R\$\s*/i, "").replace(/\s*%$/, "").replace(/\s/g, "");
      
        if (/^[+\-]?(?:\d+(?:\.\d*)?|\.\d+)[eE][+\-]?\d+$/.test(text)) {
          const scientific = Number(text);
          return Number.isFinite(scientific) ? scientific : Number.NaN;
        }
      
        const hasComma = text.includes(",");
        const hasDot = text.includes(".");
        if (hasComma && hasDot) {
          if (/^[+\-]?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(text)) {
            text = text.replace(/\./g, "").replace(",", ".");
          } else if (/^[+\-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(text)) {
            text = text.replace(/,/g, "");
          } else {
            return Number.NaN;
          }
        } else if (hasComma) {
          if (!/^[+\-]?\d+(?:,\d+)?$/.test(text)) return Number.NaN;
          text = text.replace(",", ".");
        } else if (hasDot) {
          if (!/^[+\-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return Number.NaN;
        } else if (!/^[+\-]?\d+$/.test(text)) {
          return Number.NaN;
        }
      
        const parsed = Number(text);
        return Number.isFinite(parsed) ? parsed : Number.NaN;
      }
      
      function roundMoney(value) {
        if (!Number.isFinite(value)) return Number.NaN;
        return Math.round((value + Number.EPSILON * Math.max(1, Math.abs(value))) * 100) / 100;
      }
      
      function roundRate(value) {
        if (!Number.isFinite(value)) return Number.NaN;
        return Math.round((value + Number.EPSILON) * 1_000_000_000) / 1_000_000_000;
      }
      
      function mapped(value) {
        return value !== null && value !== undefined && value !== "";
      }
      
      function finiteField(field) {
        return !compactText(field?.error) && Number.isFinite(field?.value);
      }
      
      function rawHasContent(field) {
        return compactText(field?.raw) !== "" || compactText(field?.error) !== "";
      }
      
      function fieldLabel(columnLabels, key) {
        return compactText(columnLabels?.[key]) || FIELD_LABELS[key] || (key ? String(key) : "");
      }
      
      function quotedColumnLabel(columnLabels, key) {
        return `"${fieldLabel(columnLabels, key)}"`;
      }
      
      function joinedColumnLabels(columnLabels, keys) {
        return keys.map((key) => quotedColumnLabel(columnLabels, key)).join(", ");
      }
      
      function normalizedStructuralLabel(value) {
        return compactText(value)
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLocaleLowerCase("pt-BR")
          .replace(/[:.]+$/, "")
          .trim();
      }
      
      function isKnownSummaryLabel(value) {
        return /^(?:sub\s*total|total(?:\s+geral)?|valor\s+total)$/.test(
          normalizedStructuralLabel(value),
        );
      }
      
      function monetaryDifference(left, right) {
        return roundMoney(left - right);
      }
      
      function outsideTolerance(left, right, tolerance) {
        return Number.isFinite(left)
          && Number.isFinite(right)
          && Math.abs(left - right) > tolerance + 1e-9;
      }
      
      function formulaSignature(formula) {
        return compactText(formula)
          .toUpperCase()
          .replace(/\s+/g, "")
          .replace(/(\$?[A-Z]{1,3}\$?)\d+/g, "$1{R}");
      }
      
      function findingFactory(findings, columnLabels) {
        return function addFinding({
          severity,
          code,
          title,
          message,
          action,
          row,
          field,
          informed = null,
          expected = null,
          difference = null,
          details = null,
          relatedFields = null,
        }) {
          findings.push({
            id: `AUD-${String(findings.length + 1).padStart(4, "0")}`,
            severity,
            code,
            title,
            message,
            action,
            rowNumber: row?.origin?.rowNumber ?? null,
            sheet: row?.origin?.sheet ?? "",
            itemCode: row?.displayCode ?? row?.code ?? "",
            description: row?.description ?? "",
            field: field ?? "",
            fieldLabel: fieldLabel(columnLabels, field),
            relatedFields: Array.isArray(relatedFields)
              ? relatedFields
              : field ? [field] : [],
            informed,
            expected,
            difference,
            details,
          });
        };
      }
      
      function invalidFieldMessage(field) {
        if (compactText(field?.error)) return `A célula contém o erro ${compactText(field.error)}.`;
        if (!rawHasContent(field)) return "A célula está vazia.";
        return `O conteúdo “${compactText(field?.raw)}” não é um número válido.`;
      }

      function invalidFieldFinding(field, label) {
        if (compactText(field?.error)) {
          return { code: "MAPPED_FORMULA_ERROR", title: `${label} com erro de fórmula` };
        }
        if (compactText(field?.formula) && !rawHasContent(field)) {
          return { code: "MAPPED_FORMULA_WITHOUT_VALUE", title: `${label} com fórmula sem resultado válido` };
        }
        if (!rawHasContent(field)) {
          return { code: "MAPPED_VALUE_EMPTY", title: `${label} vazio` };
        }
        return { code: "MAPPED_VALUE_NOT_NUMERIC", title: `${label} não numérico` };
      }
      
      function derivePriceComponents(row, componentMappings, columnLabels, addFinding) {
        let priceWithoutBdi = row.fields?.priceWithoutBdi?.value;
        let bdiRate = row.fields?.bdi?.value;
        let priceWithBdi = row.fields?.priceWithBdi?.value;
        let derivedComponent = null;
      
        const missing = PRICE_COMPONENTS.filter((key) => !mapped(componentMappings[key]));
        if (missing.length !== 1) {
          return { priceWithoutBdi, bdiRate, priceWithBdi, derivedComponent };
        }
      
        derivedComponent = missing[0];
        if (derivedComponent === "priceWithBdi") {
          priceWithBdi = roundMoney(priceWithoutBdi * (1 + bdiRate));
        } else if (derivedComponent === "priceWithoutBdi") {
          const denominator = 1 + bdiRate;
          if (denominator === 0) priceWithoutBdi = Number.NaN;
          else priceWithoutBdi = roundMoney(priceWithBdi / denominator);
        } else if (priceWithoutBdi === 0) {
          bdiRate = Number.NaN;
        } else {
          bdiRate = roundRate((priceWithBdi / priceWithoutBdi) - 1);
        }
      
        if (![priceWithoutBdi, bdiRate, priceWithBdi].every(Number.isFinite)) {
          addFinding({
            severity: "blocker",
            code: "PRICE_COMPONENT_DERIVATION_IMPOSSIBLE",
            title: "Não foi possível calcular o componente de preço ausente",
            message: `A combinação de valores das colunas ${joinedColumnLabels(columnLabels, PRICE_COMPONENTS)} não permite calcular com segurança o componente que não foi mapeado.`,
            action: "Corrija a planilha original ou mapeie outra combinação de colunas e carregue o arquivo novamente.",
            row,
            field: derivedComponent,
            relatedFields: PRICE_COMPONENTS,
          });
        }
      
        return { priceWithoutBdi, bdiRate, priceWithBdi, derivedComponent };
      }
      
      function addFormulaFindings(itemRows, mapping, columnLabels, addFinding) {
        for (const key of FINANCIAL_FIELDS.filter((fieldKey) => mapped(mapping[fieldKey]))) {
          const eligible = itemRows.filter((row) => finiteField(row.fields?.[key]));
          const formulaRows = eligible.filter((row) => compactText(row.fields?.[key]?.formula));
          if (eligible.length >= 3 && formulaRows.length / eligible.length >= 0.8) {
            for (const row of eligible) {
              if (!compactText(row.fields?.[key]?.formula)) {
                addFinding({
                  severity: "warning",
                  code: "MANUAL_VALUE_IN_FORMULA_COLUMN",
                  title: "Valor manual em coluna predominantemente calculada",
                  message: `O valor da coluna ${quotedColumnLabel(columnLabels, key)} foi digitado diretamente, enquanto a maioria das células equivalentes contém fórmulas.`,
                  action: "Confirme se a substituição manual foi intencional.",
                  row,
                  field: key,
                  informed: row.fields[key].value,
                });
              }
            }
          }
      
          const signatureCounts = new Map();
          for (const row of formulaRows) {
            const signature = formulaSignature(row.fields[key].formula);
            signatureCounts.set(signature, (signatureCounts.get(signature) ?? 0) + 1);
          }
          const dominant = [...signatureCounts.entries()].sort((left, right) => right[1] - left[1])[0];
          if (dominant && dominant[1] >= 2) {
            for (const row of formulaRows) {
              const signature = formulaSignature(row.fields[key].formula);
              if (signature !== dominant[0]) {
                addFinding({
                  severity: "warning",
                  code: "FORMULA_PATTERN_MISMATCH",
                  title: "Fórmula diferente do padrão dominante",
                  message: `A coluna ${quotedColumnLabel(columnLabels, key)} utiliza uma fórmula estruturalmente diferente da maioria das linhas.`,
                  action: "Verifique se a fórmula excepcional é adequada para este item.",
                  row,
                  field: key,
                  details: { formula: row.fields[key].formula, dominantSignature: dominant[0] },
                });
              }
            }
          }
        }
      }

      function budgetAuditIdentityKey(row) {
        const parts = [
          compactText(row?.sourceKey),
          compactText(row?.code),
          comparisonText(row?.description),
          comparisonText(row?.unit),
        ];
        return parts.every(Boolean) ? parts.join("\u001f") : "";
      }

      function sameAuditedItemValues(left, right) {
        if (!left || !right) return false;
        const exactNumbers = ["quantity", "bdiRate"];
        const monetaryNumbers = [
          "priceWithoutBdi",
          "priceWithBdi",
          "informedTotalWithBdi",
        ];
        return exactNumbers.every((key) => Number.isFinite(left[key])
          && Number.isFinite(right[key])
          && Math.abs(left[key] - right[key]) <= 1e-9)
          && monetaryNumbers.every((key) => Number.isFinite(left[key])
            && Number.isFinite(right[key])
            && roundMoney(left[key]) === roundMoney(right[key]));
      }

      function auditMoneyText(value) {
        return Number(value).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      }

      function addRepeatedItemFindings(
        itemRows,
        auditedItems,
        mapping,
        columnLabels,
        addFinding,
      ) {
        const auditedByRow = new Map(
          auditedItems.map((item) => [item.origin?.rowNumber, item]),
        );
        const mappedFields = AUDIT_MAPPING_FIELDS.filter((key) => mapped(mapping[key]));

        for (let index = 1; index < itemRows.length; index += 1) {
          const previousRow = itemRows[index - 1];
          const currentRow = itemRows[index];
          const physicallyConsecutive = Number.isInteger(previousRow?.origin?.rowNumber)
            && currentRow?.origin?.rowNumber === previousRow.origin.rowNumber + 1;
          if (!physicallyConsecutive) continue;
          if (!budgetAuditIdentityKey(currentRow)
            || budgetAuditIdentityKey(currentRow) !== budgetAuditIdentityKey(previousRow)) continue;
          if (!sameAuditedItemValues(
            auditedByRow.get(currentRow.origin.rowNumber),
            auditedByRow.get(previousRow.origin.rowNumber),
          )) continue;

          addFinding({
            severity: "warning",
            code: "CONSECUTIVE_DUPLICATE_ITEM",
            title: "Possível item duplicado em linhas consecutivas",
            message: `A linha ${currentRow.origin.rowNumber} repete a identificação, a quantidade e os valores da linha ${previousRow.origin.rowNumber}.`,
            action: "Confirme se a repetição consecutiva é intencional. Se não for, corrija a planilha original e carregue-a novamente.",
            row: currentRow,
            relatedFields: mappedFields,
            details: { previousRowNumber: previousRow.origin.rowNumber },
          });
        }

        const groups = new Map();
        for (const row of itemRows) {
          const key = budgetAuditIdentityKey(row);
          const audited = auditedByRow.get(row?.origin?.rowNumber);
          if (!key || !Number.isFinite(audited?.priceWithoutBdi)) continue;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push({ row, audited });
        }

        for (const entries of groups.values()) {
          if (entries.length < 2) continue;
          const prices = new Map();
          for (const entry of entries) {
            const roundedPrice = roundMoney(entry.audited.priceWithoutBdi);
            const key = roundedPrice.toFixed(2);
            if (!prices.has(key)) prices.set(key, roundedPrice);
          }
          if (prices.size < 2) continue;

          const rowNumbers = entries
            .map((entry) => entry.row.origin?.rowNumber)
            .filter(Number.isInteger);
          const displayedPrices = [...prices.values()]
            .sort((left, right) => left - right)
            .map(auditMoneyText);
          const priceFields = PRICE_COMPONENTS.filter((key) => mapped(mapping[key]));
          addFinding({
            severity: "warning",
            code: "IDENTICAL_ITEM_DIFFERENT_PRICES",
            title: "Item idêntico com preços diferentes",
            message: `O mesmo item aparece nas linhas ${rowNumbers.join(", ")} com preços efetivos sem BDI diferentes: ${displayedPrices.join(", ")}.`,
            action: "Confirme se a variação de preço é intencional e se cada ocorrência utiliza o valor correto.",
            row: entries[0].row,
            field: "priceWithoutBdi",
            relatedFields: ["code", "source", "description", "unit", ...priceFields]
              .filter((key) => mapped(mapping[key])),
            details: { rowNumbers, prices: [...prices.values()] },
          });
        }
      }
      
      /**
       * Agrupa por descrição normalizada e avisa sobre BDIs efetivos diferentes.
       * A identidade por código/fonte/unidade não restringe esta verificação.
       */
      function addDescriptionBdiFindings(itemRows, auditedItems, mapping, addFinding) {
        const auditedByRow = new Map(auditedItems.map((item) => [item.origin?.rowNumber, item]));
        const groups = new Map();
        const numericKeys = ["quantity", "priceWithoutBdi", "bdi", "priceWithBdi", "totalWithBdi"]
          .filter((key) => mapped(mapping[key]));
        for (const row of itemRows) {
          const audited = auditedByRow.get(row.origin?.rowNumber);
          const descriptionKey = comparisonText(row.description);
          if (!descriptionKey || !Number.isFinite(audited?.bdiRate) || audited.bdiRate < 0) continue;
          if (!numericKeys.every((key) => finiteField(row.fields?.[key]) && row.fields[key].value > 0)) continue;
          if (!groups.has(descriptionKey)) groups.set(descriptionKey, []);
          groups.get(descriptionKey).push({ row, rate: roundRate(audited.bdiRate) });
        }
        for (const entries of groups.values()) {
          const rates = [...new Set(entries.map((entry) => entry.rate))].sort((a, b) => a - b);
          if (rates.length < 2) continue;
          const rowNumbers = entries.map((entry) => entry.row.origin.rowNumber).sort((a, b) => a - b);
          const rateText = rates.map((rate) => rate.toLocaleString("pt-BR", {
            style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 7,
          })).join(", ");
          const derived = !mapped(mapping.bdi);
          addFinding({
            severity: "warning",
            code: "SAME_DESCRIPTION_DIFFERENT_BDI",
            title: "Itens com a mesma descrição e BDI diferente",
            message: `A mesma descrição aparece nas linhas ${rowNumbers.join(", ")} com percentuais de BDI diferentes: ${rateText}. A verificação considera a descrição normalizada, independentemente do código, da fonte ou da unidade.${derived ? " O BDI foi calculado a partir dos preços sem e com BDI, pois a coluna de BDI não foi mapeada." : ""}`,
            action: "Confirme se os diferentes percentuais de BDI são adequados para estas ocorrências do serviço. Este aviso permite prosseguir.",
            row: entries[0].row,
            field: "bdi",
            relatedFields: derived ? ["priceWithoutBdi", "priceWithBdi"] : ["bdi"],
            details: {
              rowNumbers,
              bdiRates: rates,
              bdiByRow: entries.map((entry) => ({ rowNumber: entry.row.origin.rowNumber, rate: entry.rate })),
              derived,
            },
          });
        }
      }

      /** Audita os cálculos e os itens sem alterar os valores informados. */
      function auditBudgetCalculations({ budget, totalGeneral, tolerance = 0.01 } = {}) {
        const audit = budget?.audit ?? {};
        const mapping = audit.mapping ?? {};
        const columnLabels = audit.columnLabels ?? {};
        const rows = Array.isArray(audit.rows) ? audit.rows : [];
        const itemRows = rows.filter((row) => row?.kind === "item" && !row.hiddenRow);
        const findings = [];
        const addFinding = findingFactory(findings, columnLabels);
        const absoluteTolerance = Math.max(0, Number(tolerance) || 0.01);
        const itemCount = Array.isArray(budget?.items) ? budget.items.length : itemRows.length;
        const generalTotalTolerance = roundMoney(itemCount * absoluteTolerance);
      
        if (itemRows.length === 0) {
          addFinding({
            severity: "blocker",
            code: "NO_BUDGET_ITEMS",
            title: "Nenhum item orçamentário foi identificado",
            message: "Não há linhas de item suficientes para realizar a conferência dos cálculos.",
            action: "Revise o cabeçalho e o mapeamento das colunas antes de continuar.",
          });
        }
      
        const mappedComponents = PRICE_COMPONENTS.filter((key) => mapped(mapping[key]));
        if (mappedComponents.length < 2) {
          addFinding({
            severity: "blocker",
            code: "PRICE_COMPONENTS_INSUFFICIENT",
            title: "Mapeamento de preços insuficiente",
            message: "É necessário mapear pelo menos dois entre preço sem BDI, BDI e preço com BDI.",
            action: "Revise o mapeamento das colunas antes de continuar.",
          });
        }
        if (!mapped(mapping.totalWithBdi)) {
          addFinding({
            severity: "blocker",
            code: "ITEM_TOTAL_COLUMN_MISSING",
            title: "Coluna de valor total com BDI não mapeada",
            message: `A auditoria e os resultados da v4.4.0 dependem da coluna ${quotedColumnLabel(columnLabels, "totalWithBdi")}.`,
            action: `Mapeie a coluna ${quotedColumnLabel(columnLabels, "totalWithBdi")} antes de continuar.`,
            field: "totalWithBdi",
          });
        }
      
        const declared = parseStrictNumber(totalGeneral);
        if (!Number.isFinite(declared)) {
          addFinding({
            severity: "blocker",
            code: "GENERAL_TOTAL_INVALID",
            title: "Total geral ausente ou inválido",
            message: "O total geral do orçamento deve ser digitado como um número válido.",
            action: "Informe o total geral exibido na planilha antes de continuar.",
            field: "totalGeneral",
          });
        }
      
        const requiredMappedFields = ["quantity", ...mappedComponents];
        if (mapped(mapping.totalWithBdi)) requiredMappedFields.push("totalWithBdi");
      
        const auditedItems = [];
        let informedSum = 0;
        let auditedSum = 0;
        let absoluteItemDifferenceSum = 0;
        let totalsComplete = true;
      
        for (const row of itemRows) {
          let rowValid = true;
          if (!compactText(row.sourceKey)) {
            rowValid = false;
            totalsComplete = false;
            addFinding({
              severity: "blocker",
              code: "REFERENCE_SOURCE_MISSING",
              title: "Base de referência ausente",
              message: `A linha de item não possui um identificador válido na coluna ${quotedColumnLabel(columnLabels, "source")}.`,
              action: "Corrija a planilha original e carregue o arquivo novamente.",
              row,
              field: "source",
            });
          }
          for (const key of requiredMappedFields) {
            const currentField = row.fields?.[key];
            if (!finiteField(currentField)) {
              rowValid = false;
              totalsComplete = false;
              const invalid = invalidFieldFinding(currentField, fieldLabel(columnLabels, key));
              addFinding({
                severity: "blocker",
                code: invalid.code,
                title: invalid.title,
                message: `${invalidFieldMessage(currentField)} Verifique a coluna ${quotedColumnLabel(columnLabels, key)}.`,
                action: "Corrija a planilha original e carregue o arquivo novamente.",
                row,
                field: key,
              });
            }
          }
      
          for (const key of requiredMappedFields) {
            const value = row.fields?.[key]?.value;
            if (!Number.isFinite(value) || value > 0) continue;
            rowValid = false;
            totalsComplete = false;
            const isZero = value === 0;
            addFinding({
              severity: "blocker",
              code: isZero ? "MAPPED_VALUE_ZERO" : "MAPPED_VALUE_NEGATIVE",
              title: `${fieldLabel(columnLabels, key)} ${isZero ? "igual a zero" : "negativo"}`,
              message: `O valor informado na coluna ${quotedColumnLabel(columnLabels, key)} é ${value}. Itens do orçamento exigem valores numéricos válidos e maiores que zero nas colunas mapeadas.`,
              action: "Corrija a planilha original e carregue o arquivo novamente.",
              row,
              field: key,
              informed: value,
            });
          }
      
          const prices = derivePriceComponents(row, mapping, columnLabels, addFinding);
          const quantity = row.fields?.quantity?.value;
          const informedTotal = row.fields?.totalWithBdi?.value;
          const auditedTotal = Number.isFinite(quantity) && Number.isFinite(prices.priceWithBdi)
            ? roundMoney(quantity * prices.priceWithBdi)
            : Number.NaN;
      
          if (mappedComponents.length === 3 && rowValid) {
            const expectedWithBdi = roundMoney(prices.priceWithoutBdi * (1 + prices.bdiRate));
            if (outsideTolerance(prices.priceWithBdi, expectedWithBdi, absoluteTolerance)) {
              addFinding({
                severity: "error",
                code: "BDI_APPLICATION_MISMATCH",
                title: "Aplicação do BDI divergente",
                message: `O valor de ${quotedColumnLabel(columnLabels, "priceWithBdi")} não corresponde à aplicação de ${quotedColumnLabel(columnLabels, "bdi")} sobre ${quotedColumnLabel(columnLabels, "priceWithoutBdi")}.`,
                action: `Revise as colunas ${joinedColumnLabels(columnLabels, PRICE_COMPONENTS)} na planilha. O SICORP preservará os valores informados.`,
                row,
                field: "priceWithBdi",
                relatedFields: PRICE_COMPONENTS,
                informed: prices.priceWithBdi,
                expected: expectedWithBdi,
                difference: monetaryDifference(prices.priceWithBdi, expectedWithBdi),
              });
            }
          }
      
          if (rowValid && Number.isFinite(auditedTotal)
            && outsideTolerance(informedTotal, auditedTotal, absoluteTolerance)) {
            addFinding({
              severity: "error",
              code: "ITEM_TOTAL_MISMATCH",
              title: "Valor total do item divergente",
              message: `O valor de ${quotedColumnLabel(columnLabels, "totalWithBdi")} não corresponde a ${quotedColumnLabel(columnLabels, "quantity")} multiplicada por ${quotedColumnLabel(columnLabels, "priceWithBdi")}.`,
              action: `Revise as colunas ${joinedColumnLabels(columnLabels, ["quantity", "priceWithBdi", "totalWithBdi"])} na planilha.`,
              row,
              field: "totalWithBdi",
              relatedFields: ["quantity", "priceWithBdi", "totalWithBdi"],
              informed: informedTotal,
              expected: auditedTotal,
              difference: monetaryDifference(informedTotal, auditedTotal),
            });
          }
      
          if (rowValid && Number.isFinite(informedTotal) && Number.isFinite(auditedTotal)) {
            informedSum = roundMoney(informedSum + informedTotal);
            auditedSum = roundMoney(auditedSum + auditedTotal);
            absoluteItemDifferenceSum = roundMoney(
              absoluteItemDifferenceSum + Math.abs(informedTotal - auditedTotal),
            );
          } else {
            totalsComplete = false;
          }
      
          auditedItems.push({
            origin: row.origin,
            priceWithoutBdi: prices.priceWithoutBdi,
            bdiRate: prices.bdiRate,
            priceWithBdi: prices.priceWithBdi,
            quantity,
            informedTotalWithBdi: informedTotal,
            auditedTotalWithBdi: auditedTotal,
            itemDifference: Number.isFinite(informedTotal) && Number.isFinite(auditedTotal)
              ? monetaryDifference(informedTotal, auditedTotal)
              : null,
            derivedComponent: prices.derivedComponent,
          });
        }

        addRepeatedItemFindings(itemRows, auditedItems, mapping, columnLabels, addFinding);
        addDescriptionBdiFindings(itemRows, auditedItems, mapping, addFinding);
      
        addFormulaFindings(itemRows, mapping, columnLabels, addFinding);
      
        if (Number.isFinite(declared) && declared <= 0) {
          addFinding({
            severity: "warning",
            code: "NON_POSITIVE_VALUE",
            title: "Total geral igual a zero ou negativo",
            message: `O Total geral digitado é ${declared}.`,
            action: "Confirme se o valor é intencional.",
            field: "totalGeneral",
            informed: declared,
          });
        }
      
        if (Number.isFinite(declared) && totalsComplete) {
          if (outsideTolerance(declared, auditedSum, generalTotalTolerance)) {
            addFinding({
              severity: "error",
              code: "GENERAL_TOTAL_AUDITED_MISMATCH",
              title: "Total geral diverge da soma auditada",
              message: `O total geral digitado não corresponde à soma auditada a partir das colunas ${joinedColumnLabels(columnLabels, ["quantity", "priceWithBdi"])}.`,
              action: `Revise as colunas ${joinedColumnLabels(columnLabels, ["quantity", "priceWithBdi", "totalWithBdi"])} e o total geral da planilha.`,
              field: "totalGeneral",
              relatedFields: ["quantity", "priceWithBdi", "totalWithBdi"],
              informed: declared,
              expected: auditedSum,
              difference: monetaryDifference(declared, auditedSum),
            });
          }
        }
      
        const summary = {
          total: findings.length,
          blockers: findings.filter((finding) => finding.severity === "blocker").length,
          errors: findings.filter((finding) => finding.severity === "error").length,
          warnings: findings.filter((finding) => finding.severity === "warning").length,
        };
      
        return {
          status: summary.blockers > 0 ? "blocked" : summary.total > 0 ? "issues" : "approved",
          canProceed: summary.blockers === 0,
          findings,
          summary,
          totals: {
            declared: Number.isFinite(declared) ? declared : null,
            informedSum: totalsComplete ? informedSum : null,
            auditedSum: totalsComplete ? auditedSum : null,
            differenceFromInformed: totalsComplete && Number.isFinite(declared)
              ? monetaryDifference(declared, informedSum)
              : null,
            differenceFromAudited: totalsComplete && Number.isFinite(declared)
              ? monetaryDifference(declared, auditedSum)
              : null,
            absoluteItemDifferenceSum: totalsComplete ? absoluteItemDifferenceSum : null,
            itemCount,
            generalTotalTolerance,
            complete: totalsComplete,
          },
          auditedItems,
        };
      }
      
      
      function catalogCell(row, index) {
        if (index === null || index === undefined || index === "") return "";
        return row?.[Number(index)] ?? "";
      }
      
      function catalogText(value) {
        return String(value ?? "").trim().replace(/\s+/g, " ");
      }
      
      function catalogRowHasContent(row) {
        return Array.isArray(row) && row.some((value) => catalogText(value) !== "");
      }
      
      function catalogHeaderText(value) {
        return catalogText(value)
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLocaleLowerCase("pt-BR");
      }
      
      function catalogHeaderSignature(base) {
        const headerIndex = Math.max(0, Number(base.headerRowNumber) - 1);
        const header = base.sheet?.rows?.[headerIndex] ?? [];
        return [base.mapping.code, base.mapping.description, base.mapping.unit, base.mapping.price]
          .filter((index) => index !== null && index !== undefined && index !== "")
          .map(Number)
          .filter(Number.isInteger)
          .map((index) => ({ index, text: catalogHeaderText(catalogCell(header, index)) }))
          .filter(({ text }) => text !== "");
      }
      
      function catalogMatchesHeaderSignature(row, signature) {
        return signature.length >= 3
          && signature.every(({ index, text }) => catalogHeaderText(catalogCell(row, index)) === text);
      }
      
      function catalogIsCodeHeader(value) {
        const text = catalogHeaderText(value);
        return text.length <= 80
          && /^(?:(?:cod|codigo|item|insumo|composicao|servico))(?:\b|[.:_\-/])/.test(text);
      }
      
      function catalogIsDescriptionHeader(value) {
        const text = catalogHeaderText(value);
        return /\bdescricao\b|^servico(?:s)?\b|^insumo(?:s)?\b/.test(text);
      }
      
      function catalogIsUnitHeader(value) {
        const text = catalogHeaderText(value);
        return /^unid(?:ade)?\b|^und\b|\bunidade\b/.test(text);
      }
      
      function catalogIsPriceHeader(value) {
        const text = catalogHeaderText(value);
        return /\bpreco\b|\bcusto\b|^valor(?:\b|\s*\()|\bvalor\s+unitario\b|\bvalor\s+mediano\b|\b[cp]\.\s*unit\b/.test(text);
      }
      
      function catalogIsRepeatedHeader(row, signature, mapping) {
        if (catalogMatchesHeaderSignature(row, signature)) return true;
        return catalogIsCodeHeader(catalogCell(row, mapping.code))
          && catalogIsDescriptionHeader(catalogCell(row, mapping.description))
          && catalogIsUnitHeader(catalogCell(row, mapping.unit))
          && catalogIsPriceHeader(catalogCell(row, mapping.price));
      }
      
      function catalogCode(value, policy) {
        let code = catalogText(value);
        if (policy?.caseInsensitive) code = code.toUpperCase();
        if (policy?.stripSeparators) code = code.replace(/[\s.\-/\\]/g, "");
        return code.replace(/^0+(?=.)/, "");
      }
      
      function catalogSourceKey(value) {
        return catalogText(value)
          .normalize("NFKD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLocaleLowerCase("pt-BR")
          .replace(/[^a-z0-9]+/g, " ")
          .trim();
      }
      
      function catalogNumber(value) {
        if (typeof value === "number") return Number.isFinite(value) ? value : Number.NaN;
      
        let text = String(value ?? "").replace(/\u00a0/g, " ").trim();
        if (!text) return Number.NaN;
        text = text
          .replace(/^R\$\s*/i, "")
          .replace(/\s*%$/, "")
          .replace(/\s/g, "");
      
        if (/^[+\-]?(?:\d+(?:\.\d*)?|\.\d+)[eE][+\-]?\d+$/.test(text)) {
          const scientific = Number(text);
          return Number.isFinite(scientific) ? scientific : Number.NaN;
        }
      
        const hasComma = text.includes(",");
        const hasDot = text.includes(".");
        if (hasComma && hasDot) {
          const brazilian = /^[+\-]?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/;
          const international = /^[+\-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/;
          if (brazilian.test(text)) text = text.replace(/\./g, "").replace(",", ".");
          else if (international.test(text)) text = text.replace(/,/g, "");
          else return Number.NaN;
        } else if (hasComma) {
          if (!/^[+\-]?\d+(?:,\d+)?$/.test(text)) return Number.NaN;
          text = text.replace(",", ".");
        } else if (hasDot) {
          if (!/^[+\-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return Number.NaN;
        } else if (!/^[+\-]?\d+$/.test(text)) {
          return Number.NaN;
        }
      
        const parsed = Number(text);
        return Number.isFinite(parsed) ? parsed : Number.NaN;
      }
      
      function catalogOrigin(base, rowIndex) {
        return {
          fileName: base.fileName,
          sheet: base.sheet.name,
          rowNumber: rowIndex + 1,
        };
      }
      
      function catalogReviewValues(row, base, source) {
        return {
          code: catalogCell(row, base.mapping.code),
          source,
          description: catalogCell(row, base.mapping.description),
          unit: catalogCell(row, base.mapping.unit),
          price: catalogCell(row, base.mapping.price),
        };
      }
      
      function catalogComparisonText(value) {
        return String(value ?? "")
          .normalize("NFKD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLocaleLowerCase("pt-BR")
          .replace(/\s+/g, "");
      }
      
      function catalogPriceKey(price) {
        return Number.isFinite(price.value)
          ? `n:${price.value.toFixed(8)}`
          : "i:indisponivel";
      }
      
      function catalogGroupBy(values, keyForValue) {
        const groups = new Map();
        for (const value of values) {
          const key = keyForValue(value);
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(value);
        }
        return groups;
      }
      
      function catalogConflictOccurrence(item) {
        return {
          baseName: item.baseName,
          description: item.description,
          unit: item.unit,
          price: item.price,
          origins: item.origins,
        };
      }
      
      function catalogAuditItems(rawItems) {
        const items = [];
        const conflicts = [];
        const bySourceAndCode = catalogGroupBy(
          rawItems,
          (item) => `${item.sourceKey}\u0000${item.code}`,
        );
      
        for (const codeItems of bySourceAndCode.values()) {
          const byDescription = catalogGroupBy(
            codeItems,
            (item) => catalogComparisonText(item.description),
          );
      
          for (const descriptionItems of byDescription.values()) {
            if (descriptionItems.length === 1) {
              items.push(descriptionItems[0]);
              continue;
            }
      
            const units = new Set(
              descriptionItems.map((item) => catalogComparisonText(item.unit)),
            );
            const prices = new Set(descriptionItems.map((item) => catalogPriceKey(item.price)));
      
            if (units.size === 1 && prices.size === 1) {
              const [first, ...duplicates] = descriptionItems;
              items.push({
                ...first,
                baseName: [...new Set(
                  descriptionItems.map((item) => item.baseName).filter(Boolean),
                )].join("; "),
                origins: [
                  ...first.origins,
                  ...duplicates.flatMap((item) => item.origins),
                ],
              });
              continue;
            }
      
            const reasons = [];
            if (units.size > 1) reasons.push("unidade");
            if (prices.size > 1) reasons.push("valor referencial");
      
            items.push(...descriptionItems);
            conflicts.push({
              source: descriptionItems[0].source,
              sourceKey: descriptionItems[0].sourceKey,
              code: descriptionItems[0].code,
              description: descriptionItems[0].description,
              reasons,
              occurrences: descriptionItems.map(catalogConflictOccurrence),
            });
          }
        }
      
        return { items, conflicts };
      }
      
      /**
       * Prepara registros canônicos de bases sem depender de DOM, File ou readers.
       *
       * O checkpoint dev.17 também cobre auditoria de duplicidades por fonte, código
       * e descrição normalizados. Ocorrências equivalentes são consolidadas com
       * todas as origens; divergências de unidade ou preço produzem conflitos
       * bloqueantes; fontes ou descrições diferentes permanecem distintas. No
       * dev.20, a consolidação também preserva todos os nomes das bases para a visão.
       */
      function prepareReferenceCatalog({ bases, codePolicy }) {
        const items = [];
        const reviewRows = [];
      
        for (const originalBase of bases ?? []) {
          const base = { ...originalBase, sheet: visibleSheet(originalBase.sheet) };
          const source = catalogText(base.source);
          const sourceKey = catalogSourceKey(source);
          const headerRowIndex = Math.max(0, Number(base.headerRowNumber) - 1);
          const firstDataRowIndex = headerRowIndex + 1;
          const repeatedHeaderSignature = catalogHeaderSignature(base);
      
          for (let rowIndex = 0; rowIndex < headerRowIndex; rowIndex += 1) {
            const row = base.sheet?.rows?.[rowIndex] ?? [];
            if (!catalogRowHasContent(row)) continue;
      
            reviewRows.push({
              treatment: "Removida",
              reason: "Antes do cabeçalho",
              reasonDetails: [
                "Linha anterior ao cabeçalho selecionado; exibida apenas como contexto na pré-visualização.",
              ],
              origin: catalogOrigin(base, rowIndex),
              values: catalogReviewValues(row, base, source),
            });
          }
      
          for (
            let rowIndex = firstDataRowIndex;
            rowIndex < (base.sheet?.rows?.length ?? 0);
            rowIndex += 1
          ) {
            const row = base.sheet.rows[rowIndex] ?? [];
            if (!catalogRowHasContent(row)) continue;
      
            const codeRaw = catalogCell(row, base.mapping.code);
            const code = catalogCode(codeRaw, codePolicy);
            const description = catalogText(catalogCell(row, base.mapping.description));
            const unit = catalogText(catalogCell(row, base.mapping.unit));
            const priceRaw = catalogCell(row, base.mapping.price);
            const priceValue = catalogNumber(priceRaw);
            const priceError = catalogText(base.sheet?.cellErrors?.[rowIndex]?.[Number(base.mapping.price)]);
            const priceFormula = catalogText(base.sheet?.formulas?.[rowIndex]?.[Number(base.mapping.price)]);
            const origin = catalogOrigin(base, rowIndex);
      
            if (catalogIsRepeatedHeader(row, repeatedHeaderSignature, base.mapping)) {
              reviewRows.push({
                treatment: "Removida",
                reason: "Cabeçalho repetido",
                reasonDetails: [],
                origin,
                values: catalogReviewValues(row, base, source),
              });
              continue;
            }
      
            const identityProblems = [];
            if (!code) identityProblems.push("Código ausente");
            if (!description) identityProblems.push("Descrição ausente");
            if (!unit) identityProblems.push("Unidade ausente");
      
            if (identityProblems.length) {
              reviewRows.push({
                treatment: "Removida",
                reason: "Linha estrutural",
                reasonDetails: identityProblems,
                origin,
                values: catalogReviewValues(row, base, source),
              });
              continue;
            }
      
            const priceText = catalogText(priceRaw);
            const priceIssue = priceError
              ? "Erro de fórmula no preço"
              : priceText === "" && priceFormula
                ? "Fórmula do preço sem resultado válido"
                : priceText === ""
                  ? "Preço ausente"
              : !Number.isFinite(priceValue)
                ? "Preço não numérico"
                : priceValue === 0
                  ? "Preço zero"
                  : priceValue < 0
                    ? "Preço negativo"
                    : "";
      
            if (priceIssue) {
              reviewRows.push({
                treatment: "Removida",
                reason: priceIssue,
                reasonDetails: [],
                origin,
                values: catalogReviewValues(row, base, source),
              });
              continue;
            }

            if (!(Number.isFinite(priceValue) && priceValue > 0)) continue;

            items.push({
              baseName: catalogText(base.name),
              source,
              sourceKey,
              codeRaw,
              code,
              description,
              unit,
              price: {
                raw: priceRaw,
                value: priceValue,
                issue: "",
              },
              origins: [origin],
            });
          }
        }
      
        const audit = catalogAuditItems(items);
      
        return {
          items: audit.items,
          reviewRows,
          conflicts: audit.conflicts,
          stats: {
            accepted: audit.items.length,
            reviewed: reviewRows.length,
            conflicts: audit.conflicts.length,
          },
        };
      }
      
      
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
  
