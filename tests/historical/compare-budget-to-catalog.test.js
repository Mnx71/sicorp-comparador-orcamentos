import test from "node:test";
import assert from "node:assert/strict";

import { analyzeBudget } from "../helpers/core.mjs";
import { compareBudgetToCatalog } from "../helpers/core.mjs";
import { prepareReferenceCatalog } from "../helpers/core.mjs";

function budgetItem({
  code = "1001",
  sourceKey = "sinapi",
  description = "Tubo PVC",
  value = 100,
  quantity = 1,
  withBdi = value,
} = {}) {
  return {
    code,
    sourceKey,
    description,
    quantity,
    price: {
      withoutBdi: value,
      withBdi,
    },
  };
}

function catalogItem({
  code = "1001",
  sourceKey = "sinapi",
  description = "Tubo PVC",
  value = 100,
  issue = "",
} = {}) {
  return {
    baseName: "SINAPI sintética",
    source: "SINAPI",
    sourceKey,
    code,
    description,
    unit: "m",
    price: {
      raw: Number.isFinite(value) ? String(value) : "",
      value,
      issue,
    },
    origins: [],
  };
}

function compare({ budgetItems, catalogItems, conflicts = [], tolerance = 0 }) {
  return compareBudgetToCatalog({
    budget: { items: budgetItems },
    catalog: { items: catalogItems, conflicts },
    tolerance,
  });
}

test("uma correspondência exata com preços iguais produz resultado canônico", () => {
  const project = budgetItem();
  const reference = catalogItem();
  const result = compare({ budgetItems: [project], catalogItems: [reference] });

  assert.deepEqual(result, {
    results: [
      {
        statusKey: "igual",
        status: "Igual",
        availabilityKey: "available",
        budgetItem: project,
        referenceItem: reference,
        match: {
          codeCandidateCount: 1,
          candidateCount: 1,
          resolvedByDescription: false,
        },
        comparison: {
          performed: true,
          budgetPrice: 100,
          referencePrice: 100,
          difference: 0,
          percentDifference: 0,
        },
        financial: {
          quantity: 1,
          unitPriceWithBdi: 100,
          totalWithBdi: 100,
          shareOfBudget: 1,
        },
      },
    ],
    stats: {
      total: 1,
      matched: 1,
      compared: 1,
      below: 0,
      equal: 1,
      above: 0,
      notFound: 0,
      budgetPriceUnavailable: 0,
      basePriceUnavailable: 0,
    },
    financial: {
      totalWithBdi: 100,
      knownItemCount: 1,
      unavailableItemCount: 0,
      partial: false,
      byStatus: {
        abaixo: {
          itemCount: 0,
          totalWithBdi: 0,
          knownItemCount: 0,
          unavailableItemCount: 0,
          shareOfBudget: 0,
          partial: false,
        },
        igual: {
          itemCount: 1,
          totalWithBdi: 100,
          knownItemCount: 1,
          unavailableItemCount: 0,
          shareOfBudget: 1,
          partial: false,
        },
        acima: {
          itemCount: 0,
          totalWithBdi: 0,
          knownItemCount: 0,
          unavailableItemCount: 0,
          shareOfBudget: 0,
          partial: false,
        },
        "nao-encontrado": {
          itemCount: 0,
          totalWithBdi: 0,
          knownItemCount: 0,
          unavailableItemCount: 0,
          shareOfBudget: 0,
          partial: false,
        },
      },
      byAvailability: {
        available: {
          itemCount: 1,
          totalWithBdi: 100,
          knownItemCount: 1,
          unavailableItemCount: 0,
          shareOfBudget: 1,
          partial: false,
        },
        "reference-not-found": {
          itemCount: 0,
          totalWithBdi: 0,
          knownItemCount: 0,
          unavailableItemCount: 0,
          shareOfBudget: 0,
          partial: false,
        },
        "budget-price-unavailable": {
          itemCount: 0,
          totalWithBdi: 0,
          knownItemCount: 0,
          unavailableItemCount: 0,
          shareOfBudget: 0,
          partial: false,
        },
        "base-price-unavailable": {
          itemCount: 0,
          totalWithBdi: 0,
          knownItemCount: 0,
          unavailableItemCount: 0,
          shareOfBudget: 0,
          partial: false,
        },
      },
    },
    curveAbc: [
      {
        resultIndex: 0,
        rank: 1,
        totalWithBdi: 100,
        shareOfBudget: 1,
        cumulativeShare: 1,
      },
    ],
  });
});

test("preço do orçamento abaixo da referência é classificado como Abaixo", () => {
  const result = compare({
    budgetItems: [budgetItem({ value: 90 })],
    catalogItems: [catalogItem({ value: 100 })],
  });

  assert.equal(result.results[0].statusKey, "abaixo");
  assert.equal(result.results[0].comparison.difference, -10);
  assert.equal(result.results[0].comparison.percentDifference, -0.1);
  assert.equal(result.stats.below, 1);
});

test("preço do orçamento acima da referência é classificado como Acima", () => {
  const result = compare({
    budgetItems: [budgetItem({ value: 110 })],
    catalogItems: [catalogItem({ value: 100 })],
  });

  assert.equal(result.results[0].statusKey, "acima");
  assert.equal(result.results[0].comparison.difference, 10);
  assert.equal(result.results[0].comparison.percentDifference, 0.1);
  assert.equal(result.stats.above, 1);
});

test("diferença dentro da tolerância absoluta é classificada como Igual", () => {
  const result = compare({
    budgetItems: [budgetItem({ value: 100.49 })],
    catalogItems: [catalogItem({ value: 100 })],
    tolerance: 0.5,
  });

  assert.equal(result.results[0].statusKey, "igual");
  assert.equal(result.stats.equal, 1);
});

test("código existente em outra fonte não corresponde ao item do orçamento", () => {
  const result = compare({
    budgetItems: [budgetItem({ sourceKey: "sinapi" })],
    catalogItems: [catalogItem({ sourceKey: "sicro" })],
  });

  assert.equal(result.results[0].referenceItem, null);
  assert.equal(result.results[0].statusKey, "nao-encontrado");
  assert.equal(result.results[0].availabilityKey, "reference-not-found");
  assert.equal(result.stats.notFound, 1);
});

test("código repetido é resolvido pela descrição normalizada", () => {
  const expected = catalogItem({ description: "Conexão PVC", value: 95 });
  const result = compare({
    budgetItems: [budgetItem({ description: "conexao   pvc" })],
    catalogItems: [
      catalogItem({ description: "Tubo PVC", value: 80 }),
      expected,
    ],
  });

  assert.equal(result.results[0].referenceItem, expected);
  assert.deepEqual(result.results[0].match, {
    codeCandidateCount: 2,
    candidateCount: 1,
    resolvedByDescription: true,
  });
});

test("código repetido sem descrição correspondente é tratado como não encontrado", () => {
  const result = compare({
    budgetItems: [budgetItem({ description: "Válvula PVC" })],
    catalogItems: [
      catalogItem({ description: "Tubo PVC" }),
      catalogItem({ description: "Joelho PVC" }),
    ],
  });

  assert.equal(result.results[0].referenceItem, null);
  assert.equal(result.results[0].match.codeCandidateCount, 2);
  assert.equal(result.results[0].match.candidateCount, 0);
  assert.equal(result.results[0].match.resolvedByDescription, true);
  assert.equal(result.stats.notFound, 1);
});

test("entre ocorrências selecionadas é priorizado o primeiro preço utilizável", () => {
  const unavailable = catalogItem({ value: Number.NaN, issue: "Preço ausente" });
  const available = catalogItem({ value: 95 });
  const result = compare({
    budgetItems: [budgetItem()],
    catalogItems: [unavailable, available],
  });

  assert.equal(result.results[0].referenceItem, available);
  assert.equal(result.results[0].match.candidateCount, 2);
  assert.equal(result.results[0].comparison.referencePrice, 95);
});

test("preço indisponível no orçamento é distinguido dentro de Não encontrado", () => {
  const result = compare({
    budgetItems: [budgetItem({ value: Number.NaN })],
    catalogItems: [catalogItem()],
  });

  assert.equal(result.results[0].statusKey, "nao-encontrado");
  assert.equal(result.results[0].availabilityKey, "budget-price-unavailable");
  assert.equal(result.results[0].comparison.performed, false);
  assert.equal(result.stats.budgetPriceUnavailable, 1);
});

test("preço indisponível na base é distinguido dentro de Não encontrado", () => {
  const result = compare({
    budgetItems: [budgetItem()],
    catalogItems: [catalogItem({ value: Number.NaN, issue: "Preço ausente" })],
  });

  assert.equal(result.results[0].statusKey, "nao-encontrado");
  assert.equal(result.results[0].availabilityKey, "base-price-unavailable");
  assert.equal(result.results[0].comparison.performed, false);
  assert.equal(result.stats.basePriceUnavailable, 1);
});

test("conflitos bloqueantes do catálogo impedem a comparação", () => {
  assert.throws(
    () => compare({
      budgetItems: [budgetItem()],
      catalogItems: [catalogItem()],
      conflicts: [{ code: "1001", reasons: ["unidade"] }],
    }),
    /duplicidades bloqueantes/i,
  );
});

test("os três seams compõem uma comparação completa usando matrizes sintéticas", () => {
  const budget = analyzeBudget({
    fileName: "orcamento_sintetico.xlsx",
    sheet: {
      name: "ORÇAMENTO",
      rows: [
        ["Código", "Fonte", "Descrição", "Unidade", "Quantidade", "Preço"],
        ["001.030", "SINAPI", "Tubo PVC", "m", "1", "100,00"],
      ],
    },
    headerRowNumber: 1,
    mapping: {
      code: 0,
      source: 1,
      description: 2,
      unit: 3,
      quantity: 4,
      priceWithoutBdi: 5,
      bdi: null,
      priceWithBdi: null,
    },
    codePolicy: {
      caseInsensitive: true,
      stripSeparators: true,
    },
  });
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
            ["001.030", "Tubo PVC", "m", "90,00"],
          ],
        },
        headerRowNumber: 1,
        mapping: {
          code: 0,
          description: 1,
          unit: 2,
          price: 3,
        },
      },
    ],
    codePolicy: {
      caseInsensitive: true,
      stripSeparators: true,
    },
  });

  const result = compareBudgetToCatalog({ budget, catalog, tolerance: 0 });

  assert.equal(result.results[0].statusKey, "acima");
  assert.equal(result.results[0].comparison.difference, 10);
  assert.equal(result.results[0].budgetItem.origin.rowNumber, 2);
  assert.equal(result.results[0].referenceItem.origins[0].rowNumber, 2);
  assert.deepEqual(result.stats, {
    total: 1,
    matched: 1,
    compared: 1,
    below: 0,
    equal: 0,
    above: 1,
    notFound: 0,
    budgetPriceUnavailable: 0,
    basePriceUnavailable: 0,
  });
});

test("quantidade e preço com BDI produzem o total financeiro arredondado do item", () => {
  const result = compare({
    budgetItems: [budgetItem({ quantity: 3, withBdi: 10.125 })],
    catalogItems: [catalogItem()],
  });

  assert.deepEqual(result.results[0].financial, {
    quantity: 3,
    unitPriceWithBdi: 10.125,
    totalWithBdi: 30.38,
    shareOfBudget: 1,
  });
});

test("total conhecido do orçamento e participação de cada item são calculados", () => {
  const result = compare({
    budgetItems: [
      budgetItem({ code: "1", quantity: 2, withBdi: 100 }),
      budgetItem({ code: "2", quantity: 1, withBdi: 50 }),
    ],
    catalogItems: [
      catalogItem({ code: "1" }),
      catalogItem({ code: "2" }),
    ],
  });

  assert.equal(result.financial.totalWithBdi, 250);
  assert.equal(result.results[0].financial.shareOfBudget, 0.8);
  assert.equal(result.results[1].financial.shareOfBudget, 0.2);
  assert.equal(result.financial.knownItemCount, 2);
  assert.equal(result.financial.unavailableItemCount, 0);
  assert.equal(result.financial.partial, false);
});

test("item sem total disponível torna o valor consolidado parcial", () => {
  const result = compare({
    budgetItems: [
      budgetItem({ code: "1", quantity: 2, withBdi: 100 }),
      budgetItem({ code: "2", quantity: 1, withBdi: Number.NaN }),
    ],
    catalogItems: [
      catalogItem({ code: "1" }),
      catalogItem({ code: "2" }),
    ],
  });

  assert.equal(result.financial.totalWithBdi, 200);
  assert.equal(result.financial.knownItemCount, 1);
  assert.equal(result.financial.unavailableItemCount, 1);
  assert.equal(result.financial.partial, true);
  assert.ok(Number.isNaN(result.results[1].financial.totalWithBdi));
  assert.ok(Number.isNaN(result.results[1].financial.shareOfBudget));
});

test("métricas financeiras são agregadas por status", () => {
  const result = compare({
    budgetItems: [
      budgetItem({ code: "1", value: 110, quantity: 2, withBdi: 120 }),
      budgetItem({ code: "2", value: 90, quantity: 1, withBdi: 100 }),
      budgetItem({ code: "3", value: 100, quantity: 1, withBdi: Number.NaN }),
    ],
    catalogItems: [
      catalogItem({ code: "1", value: 100 }),
      catalogItem({ code: "2", value: 100 }),
      catalogItem({ code: "3", value: 100 }),
    ],
  });

  assert.deepEqual(result.financial.byStatus.acima, {
    itemCount: 1,
    totalWithBdi: 240,
    knownItemCount: 1,
    unavailableItemCount: 0,
    shareOfBudget: 240 / 340,
    partial: false,
  });
  assert.deepEqual(result.financial.byStatus.abaixo, {
    itemCount: 1,
    totalWithBdi: 100,
    knownItemCount: 1,
    unavailableItemCount: 0,
    shareOfBudget: 100 / 340,
    partial: false,
  });
  assert.equal(result.financial.byStatus.igual.itemCount, 1);
  assert.equal(result.financial.byStatus.igual.knownItemCount, 0);
  assert.equal(result.financial.byStatus.igual.unavailableItemCount, 1);
  assert.equal(result.financial.byStatus.igual.partial, true);
  assert.ok(Number.isNaN(result.financial.byStatus.igual.shareOfBudget));
});

test("motivos de indisponibilidade também recebem métricas financeiras próprias", () => {
  const result = compare({
    budgetItems: [
      budgetItem({ code: "1", value: 100, quantity: 2, withBdi: 110 }),
      budgetItem({ code: "2", value: Number.NaN, quantity: 1, withBdi: 90 }),
      budgetItem({ code: "3", value: 100, quantity: 1, withBdi: 80 }),
    ],
    catalogItems: [
      catalogItem({ code: "2", value: 100 }),
      catalogItem({ code: "3", value: Number.NaN, issue: "Preço ausente" }),
    ],
  });

  assert.equal(result.financial.byAvailability["reference-not-found"].totalWithBdi, 220);
  assert.equal(result.financial.byAvailability["budget-price-unavailable"].totalWithBdi, 90);
  assert.equal(result.financial.byAvailability["base-price-unavailable"].totalWithBdi, 80);
  assert.equal(result.financial.byAvailability["reference-not-found"].shareOfBudget, 220 / 390);
});

test("Curva ABC ordena totais decrescentes, preserva empates e envia indisponíveis ao final", () => {
  const result = compare({
    budgetItems: [
      budgetItem({ code: "1", quantity: 1, withBdi: 100 }),
      budgetItem({ code: "2", quantity: 1, withBdi: 200 }),
      budgetItem({ code: "3", quantity: 2, withBdi: 100 }),
      budgetItem({ code: "4", quantity: 1, withBdi: Number.NaN }),
    ],
    catalogItems: [
      catalogItem({ code: "1" }),
      catalogItem({ code: "2" }),
      catalogItem({ code: "3" }),
      catalogItem({ code: "4" }),
    ],
  });

  assert.deepEqual(
    result.curveAbc.map(({ resultIndex, rank }) => ({ resultIndex, rank })),
    [
      { resultIndex: 1, rank: 1 },
      { resultIndex: 2, rank: 2 },
      { resultIndex: 0, rank: 3 },
      { resultIndex: 3, rank: null },
    ],
  );
  assert.equal(result.curveAbc[0].cumulativeShare, 0.4);
  assert.equal(result.curveAbc[1].cumulativeShare, 0.8);
  assert.equal(result.curveAbc[2].cumulativeShare, 1);
  assert.ok(Number.isNaN(result.curveAbc[3].cumulativeShare));
});

test("orçamento sem qualquer total conhecido mantém total zero e participações indisponíveis", () => {
  const result = compare({
    budgetItems: [budgetItem({ withBdi: Number.NaN })],
    catalogItems: [catalogItem()],
  });

  assert.equal(result.financial.totalWithBdi, 0);
  assert.equal(result.financial.knownItemCount, 0);
  assert.equal(result.financial.unavailableItemCount, 1);
  assert.equal(result.financial.partial, true);
  assert.ok(Number.isNaN(result.results[0].financial.shareOfBudget));
});
