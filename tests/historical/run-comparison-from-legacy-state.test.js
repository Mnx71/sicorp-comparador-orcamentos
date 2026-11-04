import test from "node:test";
import assert from "node:assert/strict";

import { adaptComparisonToLegacyView } from "../helpers/core.mjs";
import { analyzeBudget } from "../helpers/core.mjs";
import { compareBudgetToCatalog } from "../helpers/core.mjs";
import { prepareReferenceCatalog } from "../helpers/core.mjs";
import { runComparisonFromLegacyState } from "../helpers/core.mjs";

const dependencies = {
  analyzeBudget,
  prepareReferenceCatalog,
  compareBudgetToCatalog,
  adaptComparisonToLegacyView,
};

function projectWorkbook(rows = [
  ["Código", "Fonte", "Descrição", "Unidade", "Quantidade", "Sem BDI", "BDI", "Com BDI"],
  ["001.001", "SINAPI", "Tubo PVC", "m", "2", "110,00", "10%", "121,00"],
]) {
  return {
    fileName: "orcamento.xlsx",
    sheets: [{ name: "ORÇAMENTO", rows }],
  };
}

function referenceWorkbook({
  sheetName = "PREÇOS",
  rows = [
    ["Código", "Descrição", "Unidade", "Preço"],
    ["001.001", "Tubo PVC", "m", "100,00"],
  ],
} = {}) {
  return {
    fileName: "sinapi.xlsx",
    sheets: [{ name: sheetName, rows }],
  };
}

function legacyBase({
  workbook = referenceWorkbook(),
  sheetNames = ["PREÇOS"],
  name = "SINAPI sintética",
  sourceIdentifier = "SINAPI",
} = {}) {
  return {
    id: 1,
    name,
    sourceIdentifier,
    sourceKey: sourceIdentifier.toLowerCase(),
    fileName: workbook.fileName,
    workbook,
    sheetNames,
    headerRow: 1,
    codeCol: "0",
    descCol: "1",
    unitCol: "2",
    valueCol: "3",
  };
}

function input(overrides = {}) {
  return {
    projectWorkbook: projectWorkbook(),
    projectSheetName: "ORÇAMENTO",
    projectHeaderRow: 1,
    projectMapping: {
      code: "0",
      source: "1",
      description: "2",
      unit: "3",
      quantity: "4",
      priceWithoutBdi: "5",
      bdi: "6",
      priceWithBdi: "7",
    },
    bases: [legacyBase()],
    tolerance: 0,
    codePolicy: {
      caseInsensitive: true,
      stripSeparators: true,
    },
    ...overrides,
  };
}

test("estado legado completo percorre os três seams e produz a visão da interface", () => {
  const execution = runComparisonFromLegacyState(input(), dependencies);

  assert.equal(execution.budget.stats.accepted, 1);
  assert.equal(execution.catalog.stats.accepted, 1);
  assert.equal(execution.comparison.results[0].statusKey, "acima");
  assert.equal(execution.view.results[0].projectRow, 2);
  assert.equal(execution.view.results[0].projectTotalWithBdi, 242);
  assert.equal(execution.view.results[0].baseRow, "sinapi.xlsx / PREÇOS, linha 2");
  assert.deepEqual(execution.view.defaultSort, {
    key: "projectTotalWithBdi",
    direction: "desc",
  });
});

test("cada aba configurada de uma base é convertida em uma entrada canônica", () => {
  const workbook = {
    fileName: "sinapi.xlsx",
    sheets: [
      {
        name: "SERVIÇOS",
        rows: [
          ["Código", "Descrição", "Unidade", "Preço"],
          ["001.001", "Tubo PVC", "m", "100,00"],
        ],
      },
      {
        name: "INSUMOS",
        rows: [
          ["Código", "Descrição", "Unidade", "Preço"],
          ["001.002", "Registro", "un", "50,00"],
        ],
      },
    ],
  };
  const project = projectWorkbook([
    ["Código", "Fonte", "Descrição", "Unidade", "Quantidade", "Sem BDI", "BDI", "Com BDI"],
    ["001.001", "SINAPI", "Tubo PVC", "m", "2", "110,00", "10%", "121,00"],
    ["001.002", "SINAPI", "Registro", "un", "1", "45,00", "10%", "49,50"],
  ]);
  const execution = runComparisonFromLegacyState(input({
    projectWorkbook: project,
    bases: [legacyBase({ workbook, sheetNames: ["SERVIÇOS", "INSUMOS"] })],
  }), dependencies);

  assert.equal(execution.catalog.items.length, 2);
  assert.deepEqual(
    execution.catalog.items.map((item) => item.origins[0].sheet),
    ["SERVIÇOS", "INSUMOS"],
  );
  assert.deepEqual(
    execution.view.results.map((result) => result.statusKey),
    ["acima", "abaixo"],
  );
});

test("política de normalização selecionada na interface é respeitada", () => {
  const project = projectWorkbook([
    ["Código", "Fonte", "Descrição", "Unidade", "Quantidade", "Sem BDI", "BDI", "Com BDI"],
    ["Ab-001", "SINAPI", "Tubo PVC", "m", "1", "100,00", "20%", "120,00"],
  ]);
  const workbook = referenceWorkbook({
    rows: [
      ["Código", "Descrição", "Unidade", "Preço"],
      ["ab001", "Tubo PVC", "m", "100,00"],
    ],
  });

  const normalized = runComparisonFromLegacyState(input({
    projectWorkbook: project,
    bases: [legacyBase({ workbook })],
  }), dependencies);
  const literal = runComparisonFromLegacyState(input({
    projectWorkbook: project,
    bases: [legacyBase({ workbook })],
    codePolicy: { caseInsensitive: false, stripSeparators: false },
  }), dependencies);

  assert.equal(normalized.view.results[0].statusKey, "igual");
  assert.equal(literal.view.results[0].statusKey, "nao-encontrado");
});

test("linhas de revisão do orçamento e das bases permanecem disponíveis", () => {
  const project = projectWorkbook([
    ["RELATÓRIO DO ORÇAMENTO", "", "", "", "", "", "", ""],
    ["Código", "Fonte", "Descrição", "Unidade", "Quantidade", "Sem BDI", "BDI", "Com BDI"],
    ["001.001", "SINAPI", "Tubo PVC", "m", "2", "110,00", "10%", "121,00"],
  ]);
  const workbook = referenceWorkbook({
    rows: [
      ["BASE SINAPI", "", "", ""],
      ["Código", "Descrição", "Unidade", "Preço"],
      ["001.001", "Tubo PVC", "m", "100,00"],
    ],
  });
  const base = legacyBase({ workbook });
  base.headerRow = 2;
  const execution = runComparisonFromLegacyState(input({
    projectWorkbook: project,
    projectHeaderRow: 2,
    bases: [base],
  }), dependencies);

  assert.equal(execution.budget.reviewRows[0].reason, "Antes do cabeçalho");
  assert.equal(execution.catalog.reviewRows[0].reason, "Antes do cabeçalho");
});

test("aba ausente no estado legado produz erro explícito", () => {
  assert.throws(
    () => runComparisonFromLegacyState(input({ projectSheetName: "INEXISTENTE" }), dependencies),
    /aba.*orçamento/i,
  );

  const base = legacyBase({ sheetNames: ["INEXISTENTE"] });
  assert.throws(
    () => runComparisonFromLegacyState(input({ bases: [base] }), dependencies),
    /aba da base/i,
  );
});

test("conflitos produzidos pelas bases continuam bloqueando a execução", () => {
  const first = legacyBase();
  const secondWorkbook = referenceWorkbook({
    rows: [
      ["Código", "Descrição", "Unidade", "Preço"],
      ["001.001", "Tubo PVC", "m", "105,00"],
    ],
  });
  secondWorkbook.fileName = "sinapi_divergente.xlsx";
  const second = legacyBase({
    workbook: secondWorkbook,
    name: "SINAPI divergente",
  });

  assert.throws(
    () => runComparisonFromLegacyState(input({ bases: [first, second] }), dependencies),
    /duplicidades bloqueantes/i,
  );
});
