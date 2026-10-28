import test from "node:test";
import assert from "node:assert/strict";

import { adaptComparisonToLegacyView } from "../helpers/core.mjs";
import { compareBudgetToCatalog } from "../helpers/core.mjs";
import { prepareReferenceCatalog } from "../helpers/core.mjs";

function completeBudgetItem({
  code = "1001",
  codeRaw = "001.001",
  value = 110,
  withBdi = 121,
  quantity = 2,
} = {}) {
  return {
    origin: {
      fileName: "orcamento.xlsx",
      sheet: "ORÇAMENTO",
      rowNumber: 7,
    },
    codeRaw,
    code,
    source: "SINAPI",
    sourceKey: "sinapi",
    description: "Tubo PVC",
    unit: "m",
    quantityRaw: String(quantity).replace(".", ","),
    quantity,
    price: {
      withoutBdiRaw: String(value).replace(".", ","),
      withoutBdi: value,
      withoutBdiSource: "Informado",
      bdiRaw: "10%",
      bdiRate: 0.1,
      withBdiRaw: String(withBdi).replace(".", ","),
      withBdi,
      withBdiSource: "Informado",
    },
  };
}

function completeReferenceItem({
  code = "1001",
  value = 100,
  baseName = "SINAPI sintética",
  origins = [
    {
      fileName: "sinapi.xlsx",
      sheet: "PREÇOS",
      rowNumber: 12,
    },
  ],
} = {}) {
  return {
    baseName,
    source: "SINAPI",
    sourceKey: "sinapi",
    codeRaw: "001.001",
    code,
    description: "Tubo PVC",
    unit: "m",
    price: {
      raw: String(value).replace(".", ","),
      value,
      issue: "",
    },
    origins,
  };
}

function compare(budgetItems, catalogItems) {
  return compareBudgetToCatalog({
    budget: { items: budgetItems },
    catalog: { items: catalogItems, conflicts: [] },
    tolerance: 0,
  });
}

test("resultado canônico completo é adaptado para todos os campos da linha legada", () => {
  const comparison = compare([completeBudgetItem()], [completeReferenceItem()]);
  const view = adaptComparisonToLegacyView(comparison);

  assert.deepEqual(view.results[0], {
    statusKey: "acima",
    status: "Acima",
    availabilityKey: "available",
    projectRow: 7,
    code: "001.001",
    normalizedCode: "1001",
    projectDescription: "Tubo PVC",
    projectUnit: "m",
    projectQuantityRaw: "2",
    projectQuantity: 2,
    projectSource: "SINAPI",
    projectSourceKey: "sinapi",
    projectValueRaw: "110",
    projectValue: 110,
    projectValueSource: "Informado",
    projectBdiRaw: "10%",
    projectBdiRate: 0.1,
    projectWithBdiRaw: "121",
    projectWithBdi: 121,
    projectWithBdiSource: "Informado",
    projectTotalWithBdi: 242,
    projectTotalShare: 1,
    baseSource: "SINAPI",
    baseSourceKey: "sinapi",
    baseName: "SINAPI sintética",
    baseFile: "sinapi.xlsx",
    baseSheet: "PREÇOS",
    baseRow: "sinapi.xlsx / PREÇOS, linha 12",
    baseDescription: "Tubo PVC",
    baseUnit: "m",
    baseValueRaw: "100",
    baseValue: 100,
    comparisonPerformed: true,
    difference: 10,
    percentDifference: 0.1,
    matchCount: 1,
    codeMatchCount: 1,
    matchingBaseCount: 1,
    resolvedByDescription: false,
  });
});

test("bases equivalentes consolidadas preservam nomes e todas as origens na visão", () => {
  const catalog = prepareReferenceCatalog({
    bases: [
      {
        name: "SINAPI sintética",
        source: "SINAPI",
        fileName: "sinapi_sintetica.xlsx",
        sheet: {
          name: "PREÇOS",
          rows: [
            ["Código", "Descrição", "Unidade", "Preço"],
            ["001.001", "Tubo PVC", "m", "100,00"],
          ],
        },
        headerRowNumber: 1,
        mapping: { code: 0, description: 1, unit: 2, price: 3 },
      },
      {
        name: "SINAPI analítica",
        source: "sinapi",
        fileName: "sinapi_analitica.xlsx",
        sheet: {
          name: "ANALÍTICA",
          rows: [
            ["Código", "Descrição", "Unidade", "Preço"],
            ["0001001", "tubo pvc", "M", 100],
          ],
        },
        headerRowNumber: 1,
        mapping: { code: 0, description: 1, unit: 2, price: 3 },
      },
    ],
    codePolicy: { caseInsensitive: true, stripSeparators: true },
  });
  const comparison = compare([completeBudgetItem()], catalog.items);
  const row = adaptComparisonToLegacyView(comparison).results[0];

  assert.equal(row.baseName, "SINAPI sintética; SINAPI analítica");
  assert.equal(row.baseFile, "sinapi_sintetica.xlsx; sinapi_analitica.xlsx");
  assert.equal(row.baseSheet, "PREÇOS; ANALÍTICA");
  assert.equal(
    row.baseRow,
    "sinapi_sintetica.xlsx / PREÇOS, linha 2; sinapi_analitica.xlsx / ANALÍTICA, linha 2",
  );
  assert.equal(row.matchCount, 2);
  assert.equal(row.codeMatchCount, 2);
  assert.equal(row.matchingBaseCount, 2);
});

test("motivos de indisponibilidade mantêm campos legados vazios ou não numéricos", () => {
  const comparison = compare(
    [completeBudgetItem({ code: "9999", codeRaw: "009.999" })],
    [],
  );
  const row = adaptComparisonToLegacyView(comparison).results[0];

  assert.equal(row.statusKey, "nao-encontrado");
  assert.equal(row.availabilityKey, "reference-not-found");
  assert.equal(row.baseName, "");
  assert.equal(row.baseFile, "");
  assert.equal(row.baseRow, "");
  assert.equal(row.comparisonPerformed, false);
  assert.ok(Number.isNaN(row.baseValue));
  assert.ok(Number.isNaN(row.difference));
  assert.ok(Number.isNaN(row.percentDifference));
});

test("cartões recebem quantidade, total, participação e indicação de parcialidade", () => {
  const comparison = compare(
    [
      completeBudgetItem({ code: "1", codeRaw: "1", value: 110, withBdi: 120 }),
      completeBudgetItem({ code: "2", codeRaw: "2", value: 90, withBdi: 100 }),
      completeBudgetItem({ code: "3", codeRaw: "3", value: 100, withBdi: Number.NaN }),
    ],
    [
      completeReferenceItem({ code: "1", value: 100 }),
      completeReferenceItem({ code: "2", value: 100 }),
      completeReferenceItem({ code: "3", value: 100 }),
    ],
  );
  const summary = adaptComparisonToLegacyView(comparison).summary;

  assert.deepEqual(summary.total, {
    itemCount: 3,
    totalWithBdi: 440,
    knownItemCount: 2,
    unavailableItemCount: 1,
    shareOfBudget: 1,
    partial: true,
  });
  assert.equal(summary.acima.totalWithBdi, 240);
  assert.equal(summary.acima.shareOfBudget, 240 / 440);
  assert.equal(summary.abaixo.totalWithBdi, 200);
  assert.equal(summary.igual.partial, true);
  assert.ok(Number.isNaN(summary.igual.shareOfBudget));
});

test("visão fornece a ordenação ABC e o sort padrão esperados pela tabela", () => {
  const comparison = compare(
    [
      completeBudgetItem({ code: "1", codeRaw: "1", quantity: 1, withBdi: 100 }),
      completeBudgetItem({ code: "2", codeRaw: "2", quantity: 1, withBdi: 200 }),
      completeBudgetItem({ code: "3", codeRaw: "3", quantity: 1, withBdi: Number.NaN }),
    ],
    [
      completeReferenceItem({ code: "1" }),
      completeReferenceItem({ code: "2" }),
      completeReferenceItem({ code: "3" }),
    ],
  );
  const view = adaptComparisonToLegacyView(comparison);

  assert.deepEqual(view.defaultSort, {
    key: "projectTotalWithBdi",
    direction: "desc",
  });
  assert.deepEqual(view.curveAbcResults.map((row) => row.normalizedCode), ["2", "1", "3"]);
  assert.equal(view.curveAbcResults[0], view.results[1]);
  assert.equal(view.curveAbcResults[2], view.results[2]);
});

test("adaptação não modifica o resultado canônico recebido", () => {
  const comparison = compare([completeBudgetItem()], [completeReferenceItem()]);
  const snapshot = structuredClone(comparison);

  adaptComparisonToLegacyView(comparison);

  assert.deepEqual(comparison, snapshot);
});
