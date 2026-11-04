import test from "node:test";
import assert from "node:assert/strict";

import { readWorkbookFile } from "../helpers/core.mjs";

function columnIndex(letters) {
  let value = 0;
  for (const character of letters) value = (value * 26) + character.charCodeAt(0) - 64;
  return value - 1;
}

function fakeRuntime(workbook, capture = {}) {
  return {
    read(bytes, options) {
      capture.bytes = bytes;
      capture.options = options;
      return workbook;
    },
    utils: {
      decode_cell(reference) {
        const match = String(reference).match(/^([A-Z]+)(\d+)$/i);
        if (!match) throw new Error(`Referência inválida: ${reference}`);
        return { r: Number(match[2]) - 1, c: columnIndex(match[1].toUpperCase()) };
      },
      decode_range(reference) {
        const [start, end] = String(reference).split(":");
        return {
          s: this.decode_cell(start),
          e: this.decode_cell(end || start),
        };
      },
    },
  };
}

function binaryWorkbook() {
  return {
    SheetNames: ["ORÇAMENTO", "VAZIA"],
    Sheets: {
      "ORÇAMENTO": {
        "!ref": "A1:D3",
        A1: { t: "s", v: "Código" },
        B1: { t: "s", v: "Descrição" },
        C1: { t: "s", v: "Preço" },
        D1: { t: "s", v: "Disponível" },
        A2: { t: "s", f: "HYPERLINK(\"https://exemplo\";\"001.002\")" },
        B2: { t: "s", v: "Tubo PVC" },
        C2: { t: "n", v: 123.45, z: "#,##0.00" },
        D2: { t: "b", v: true },
        A3: { t: "e", v: "#N/A", w: "#N/A" },
        C3: { t: "d", v: new Date("2026-08-21T00:00:00Z"), w: "21/08/2026", z: "dd/mm/yyyy" },
      },
      VAZIA: {},
    },
  };
}

test("CSV com BOM preserva delimitador brasileiro, aspas, quebras internas e linhas", () => {
  const workbook = readWorkbookFile({
    fileName: "orçamento.csv",
    bytes: new TextEncoder().encode(
      "\ufeffCódigo;Descrição;Preço\r\n001;\"Tubo; PVC\";\"1.234,56\"\r\n002;\"Linha 1\nLinha 2\";10",
    ),
  });

  assert.equal(workbook.fileName, "orçamento.csv");
  assert.equal(workbook.format, "csv");
  assert.deepEqual(workbook.sheets, [{
    name: "CSV",
    rows: [
      ["Código", "Descrição", "Preço"],
      ["001", "Tubo; PVC", "1.234,56"],
      ["002", "Linha 1\nLinha 2", "10"],
    ],
    numberFormats: [],
    formulas: [], cellErrors: [], hiddenRows: [], hiddenColumns: [], merges: [],
  }]);
});

test("detecção de delimitador ignora separadores dentro de campos entre aspas", () => {
  const workbook = readWorkbookFile({
    fileName: "base.csv",
    bytes: new TextEncoder().encode("Código,Descrição,Unidade\n1,\"Tubo; PVC\",m"),
  });

  assert.deepEqual(workbook.sheets[0].rows, [
    ["Código", "Descrição", "Unidade"],
    ["1", "Tubo; PVC", "m"],
  ]);
});

test("TXT tabulado é lido pelo mesmo contrato canônico", () => {
  const workbook = readWorkbookFile({
    fileName: "insumos.txt",
    bytes: new TextEncoder().encode("Código\tDescrição\n001\tRegistro"),
  });

  assert.equal(workbook.format, "csv");
  assert.deepEqual(workbook.sheets[0].rows[1], ["001", "Registro"]);
});

test("XLSX usa runtime injetado e preserva células tipadas, formatos e hyperlink", () => {
  const sourceWorkbook = binaryWorkbook();
  const capture = {};
  const runtime = fakeRuntime(sourceWorkbook, capture);
  const inputBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
  const workbook = readWorkbookFile({
    fileName: "ORÇAMENTO.XLSX",
    bytes: inputBytes,
  }, { spreadsheetRuntime: runtime });

  assert.equal(workbook.format, "xlsx");
  assert.equal(workbook.sheets.length, 1);
  assert.equal(workbook.sheets[0].name, "ORÇAMENTO");
  assert.equal(workbook.sheets[0].rows[1][0], "001.002");
  assert.equal(workbook.sheets[0].rows[1][2], 123.45);
  assert.equal(workbook.sheets[0].rows[1][3], true);
  assert.equal(workbook.sheets[0].rows[2][0], "#N/A");
  assert.equal(workbook.sheets[0].rows[2][2], "21/08/2026");
  assert.equal(workbook.sheets[0].numberFormats[1][2], "#,##0.00");
  assert.equal(workbook.sheets[0].numberFormats[2][2], "dd/mm/yyyy");
  assert.ok(capture.bytes instanceof Uint8Array);
  assert.deepEqual(capture.options, {
    type: "array",
    cellFormula: true,
    cellNF: true,
    cellStyles: true,
    cellText: true,
    cellDates: false,
  });
});

test("XLS reutiliza o contrato binário sem modificar o workbook do runtime", () => {
  const sourceWorkbook = binaryWorkbook();
  const before = sourceWorkbook.Sheets["ORÇAMENTO"].C2.v;
  const workbook = readWorkbookFile({
    fileName: "serviços.xls",
    bytes: new Uint8Array([0xd0, 0xcf, 0x11, 0xe0]).buffer,
  }, { spreadsheetRuntime: fakeRuntime(sourceWorkbook) });

  workbook.sheets[0].rows[1][2] = 999;
  assert.equal(workbook.format, "xls");
  assert.equal(sourceWorkbook.Sheets["ORÇAMENTO"].C2.v, before);
});

test("arquivo binário sem runtime produz erro explícito", () => {
  assert.throws(
    () => readWorkbookFile({ fileName: "base.xlsx", bytes: new Uint8Array([1]) }),
    /leitor XLS\/XLSX não foi fornecido/i,
  );
});

test("workbook binário sem aba utilizável produz erro explícito", () => {
  const runtime = fakeRuntime({ SheetNames: ["VAZIA"], Sheets: { VAZIA: {} } });
  assert.throws(
    () => readWorkbookFile(
      { fileName: "vazia.xls", bytes: new Uint8Array([1]) },
      { spreadsheetRuntime: runtime },
    ),
    /nenhuma aba de planilha/i,
  );
});

test("extensão não suportada e entrada sem bytes são rejeitadas", () => {
  assert.throws(
    () => readWorkbookFile({ fileName: "base.ods", bytes: new Uint8Array([1]) }),
    /formato não suportado/i,
  );
  assert.throws(
    () => readWorkbookFile({ fileName: "base.csv" }),
    /conteúdo do arquivo não foi fornecido/i,
  );
});
