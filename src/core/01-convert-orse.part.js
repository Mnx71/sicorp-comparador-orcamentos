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
      
      
