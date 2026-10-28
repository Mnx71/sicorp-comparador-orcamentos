import test from "node:test";
import assert from "node:assert/strict";

import { prepareComparisonExport } from "../helpers/core.mjs";

function result(overrides = {}) {
  return {
    statusKey: "igual",
    status: "Igual",
    projectRow: 7,
    code: "001.001",
    projectSource: "SINAPI",
    projectDescription: "Tubo PVC \"série A\" & conexões",
    projectUnit: "m",
    projectValueRaw: "110,00",
    projectValue: 110,
    projectBdiRaw: "10%",
    projectBdiRate: 0.1,
    projectQuantityRaw: "2,5",
    projectQuantity: 2.5,
    projectTotalWithBdi: 242,
    projectTotalShare: 0.125,
    baseRow: "sinapi.xlsx / PREÇOS, linha 2",
    baseDescription: "Tubo PVC <série A>",
    baseUnit: "m",
    baseValueRaw: "110,00",
    baseValue: 110,
    difference: 0,
    percentDifference: 0,
    baseName: "SINAPI oficial",
    ...overrides,
  };
}

function extractStoredZipFile(bytes, expectedName) {
  const decoder = new TextDecoder();
  let offset = 0;
  while (offset + 30 <= bytes.length) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset);
    if (view.getUint32(0, true) !== 0x04034b50) break;
    const compressedSize = view.getUint32(18, true);
    const nameLength = view.getUint16(26, true);
    const extraLength = view.getUint16(28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameLength));
    if (name === expectedName) {
      return decoder.decode(bytes.subarray(dataStart, dataStart + compressedSize));
    }
    offset = dataStart + compressedSize;
  }
  throw new Error(`Arquivo ${expectedName} não encontrado no ZIP.`);
}

test("visão adaptada produz tabela tipada com as 17 colunas da interface", () => {
  const source = [result()];
  const before = structuredClone(source);
  const prepared = prepareComparisonExport({
    results: source,
    projectFileName: "Orçamento principal.xlsx",
    generatedAt: new Date("2026-08-21T12:00:00-03:00"),
  });

  assert.equal(prepared.hasRows, true);
  assert.equal(prepared.table.columns.length, 17);
  assert.deepEqual(
    prepared.table.columns.map((column) => column.header),
    [
      "Status", "Linha orçamento", "Código", "Base / referência",
      "Descrição orçamento", "Unid. orçamento", "Preço sem BDI", "BDI",
      "Quantidade", "Valor total com BDI", "Participação (%)", "Origem / linha da base",
      "Descrição base", "Unid. base", "Preço base", "Diferença",
      "Diferença %",
    ],
  );
  assert.equal(prepared.table.rows[0][6], 110);
  assert.equal(prepared.table.rows[0][8], 2.5);
  assert.equal(prepared.table.rows[0][10], 0.125);
  assert.deepEqual(prepared.table.statusKeys, ["igual"]);
  assert.deepEqual(source, before);
});

test("CSV preserva BOM, separador, decimal brasileiro e aspas escapadas", () => {
  const prepared = prepareComparisonExport({
    results: [result()],
    projectFileName: "Orçamento principal.xlsx",
  });

  assert.ok(prepared.csv.text.startsWith("\ufeff\"Status\";\"Linha orçamento\""));
  assert.match(prepared.csv.text, /\"110,00\"/);
  assert.match(prepared.csv.text, /\"2,5\"/);
  assert.match(prepared.csv.text, /\"12,50%\"/);
  assert.match(prepared.csv.text, /Tubo PVC \"\"série A\"\" & conexões/);
  assert.ok(prepared.csv.text.includes("\r\n"));
  assert.equal(prepared.csv.mime, "text/csv;charset=utf-8");
});

test("clipboard usa tabulação e quebra de linha simples", () => {
  const prepared = prepareComparisonExport({ results: [result()] });

  assert.ok(prepared.clipboardText.startsWith("Status\tLinha orçamento\tCódigo"));
  assert.match(prepared.clipboardText, /\nIgual\t7\t001\.001\tSINAPI/);
  assert.match(prepared.clipboardText, /\t10,00%\t2,5\t242,00\t/);
  assert.doesNotMatch(prepared.clipboardText, /\r\n/);
});

test("nomes de arquivo são saneados e mantêm as extensões esperadas", () => {
  const prepared = prepareComparisonExport({
    results: [result()],
    projectFileName: "  Orçamento: adutora / trecho 01?.xlsx  ",
  });

  assert.equal(
    prepared.csv.filename,
    "sicorp_v4_comparacao_Orçamento_adutora_trecho_01.csv",
  );
  assert.equal(
    prepared.xlsx.filename,
    "sicorp_v4_comparacao_Orçamento_adutora_trecho_01.xlsx",
  );
});

test("valores indisponíveis preservam o texto bruto e não inventam totais", () => {
  const prepared = prepareComparisonExport({
    results: [result({
      statusKey: "nao-encontrado",
      status: "Não encontrado",
      projectValue: Number.NaN,
      projectValueRaw: "sem preço",
      projectTotalWithBdi: Number.NaN,
      projectTotalShare: Number.NaN,
      baseValue: Number.NaN,
      baseValueRaw: "",
      difference: Number.NaN,
      percentDifference: Number.NaN,
    })],
  });

  assert.equal(prepared.table.rows[0][6], "sem preço");
  assert.equal(prepared.table.rows[0][9], "");
  assert.equal(prepared.table.rows[0][14], "");
  assert.equal(prepared.table.rows[0][15], "");
  assert.equal(prepared.textTable.rows[0][9], "");
});

test("XLSX mantém números tipados, filtros, linha congelada e cores por status", () => {
  const prepared = prepareComparisonExport({
    results: [result()],
    generatedAt: new Date("2026-08-21T12:00:00-03:00"),
  });

  assert.equal(prepared.xlsx.bytes[0], 0x50);
  assert.equal(prepared.xlsx.bytes[1], 0x4b);
  assert.equal(
    prepared.xlsx.mime,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  const sheet = extractStoredZipFile(
    prepared.xlsx.bytes,
    "xl/worksheets/sheet1.xml",
  );
  const styles = extractStoredZipFile(prepared.xlsx.bytes, "xl/styles.xml");
  assert.match(sheet, /<pane ySplit="1"/);
  assert.match(sheet, /<autoFilter ref="A1:Q2"\/>/);
  assert.match(sheet, /<c r="G2" s="14"><v>110<\/v><\/c>/);
  assert.match(sheet, /<c r="I2" s="13"><v>2\.5<\/v><\/c>/);
  assert.match(styles, /FFE4F4EF/);
  assert.match(styles, /formatCode="0\.00%;\[Red\]-0\.00%"/);
});

test("XLSX serializa a fonte do cabeçalho na ordem canônica aceita pelo Excel", () => {
  const prepared = prepareComparisonExport({ results: [result()] });
  const styles = extractStoredZipFile(prepared.xlsx.bytes, "xl/styles.xml");

  assert.match(
    styles,
    /<font><b\/><sz val="11"\/><color rgb="FFFFFFFF"\/><name val="Calibri"\/><\/font>/,
  );
  assert.doesNotMatch(styles, /<font><b\/><color/);
});

test("seleção vazia produz artefatos vazios sinalizados sem lançar erro", () => {
  const prepared = prepareComparisonExport({ results: [] });

  assert.equal(prepared.hasRows, false);
  assert.deepEqual(prepared.table.rows, []);
  assert.deepEqual(prepared.textTable.rows, []);
  assert.equal(prepared.clipboardText.split("\n").length, 1);
  assert.ok(prepared.xlsx.bytes.length > 0);
});
