import test from "node:test";
import assert from "node:assert/strict";

import { analyzeBudget } from "../helpers/core.mjs";

test("orçamento com uma linha válida produz um item normalizado e rastreável", () => {
  const result = analyzeBudget({
    fileName: "orcamento_sintetico.xlsx",
    sheet: {
      name: "PLANILHA ORCAMENTARIA",
      rows: [
        ["Código", "Fonte", "Descrição", "Unidade", "Quantidade", "Preço sem BDI", "BDI", "Preço com BDI"],
        ["001.002", "SINAPI", "Tubo PVC", "m²", "2,5", "100,00", "20%", "120,00"],
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
      bdi: 6,
      priceWithBdi: 7,
    },
    codePolicy: {
      caseInsensitive: true,
      stripSeparators: true,
    },
  });

  assert.deepEqual(result, {
    items: [
      {
        origin: {
          fileName: "orcamento_sintetico.xlsx",
          sheet: "PLANILHA ORCAMENTARIA",
          rowNumber: 2,
        },
        codeRaw: "001.002",
        code: "1002",
        source: "SINAPI",
        sourceKey: "sinapi",
        description: "Tubo PVC",
        unit: "m²",
        quantityRaw: "2,5",
        quantity: 2.5,
        price: {
          withoutBdiRaw: "100,00",
          withoutBdi: 100,
          withoutBdiSource: "Informado",
          bdiRaw: "20%",
          bdiRate: 0.2,
          withBdiRaw: "120,00",
          withBdi: 120,
          withBdiSource: "Informado",
        },
      },
    ],
    reviewRows: [],
    stats: {
      accepted: 1,
      reviewed: 0,
    },
  });
});

test("linha estrutural é removida e quantidade negativa segue para auditoria", () => {
  const mapping = {code:0,source:1,description:2,unit:3,quantity:4,priceWithoutBdi:5,bdi:6,priceWithBdi:7};
  const result = analyzeBudget({fileName:"teste.csv",sheet:{name:"Dados",rows:[
    ["Código","Fonte","Descrição","Unidade","Quantidade","Sem BDI","BDI","Com BDI"],
    ["2","SINAPI","Título","","","","",""],
    ["A1","SINAPI","Tubo PVC","m",-1,100,0.2,120]
  ]},headerRowNumber:1,mapping,includeAuditData:true});
  assert.equal(result.reviewRows[0].reason,"Linha estrutural");
  assert.deepEqual(result.reviewRows[0].reasonDetails,["Unidade ausente"]);
  assert.equal(result.items[0].quantity,-1);
  assert.equal(result.audit.rows[1].kind,"item");
});

test("preço sem BDI é calculado pelo preço com BDI e arredondado para duas casas", () => {
  const result = analyzeBudget({
    fileName: "orcamento_sintetico.xlsx",
    sheet: {
      name: "PLANILHA ORCAMENTARIA",
      rows: [
        ["Código", "Fonte", "Descrição", "Unidade", "Quantidade", "Preço sem BDI", "BDI", "Preço com BDI"],
        ["A2", "SINAPI", "Conexão PVC", "un", "3", "", "20%", "100,00"],
      ],
    },
    headerRowNumber: 1,
    mapping: {
      code: 0,
      source: 1,
      description: 2,
      unit: 3,
      quantity: 4,
      priceWithoutBdi: null,
      bdi: 6,
      priceWithBdi: 7,
    },
    codePolicy: {
      caseInsensitive: true,
      stripSeparators: true,
    },
  });

  assert.deepEqual(result, {
    items: [
      {
        origin: {
          fileName: "orcamento_sintetico.xlsx",
          sheet: "PLANILHA ORCAMENTARIA",
          rowNumber: 2,
        },
        codeRaw: "A2",
        code: "A2",
        source: "SINAPI",
        sourceKey: "sinapi",
        description: "Conexão PVC",
        unit: "un",
        quantityRaw: "3",
        quantity: 3,
        price: {
          withoutBdiRaw: "",
          withoutBdi: 83.33,
          withoutBdiSource: "Calculado com BDI",
          bdiRaw: "20%",
          bdiRate: 0.2,
          withBdiRaw: "100,00",
          withBdi: 100,
          withBdiSource: "Informado",
        },
      },
    ],
    reviewRows: [],
    stats: {
      accepted: 1,
      reviewed: 0,
    },
  });
});

test("preço com BDI é calculado pelo preço sem BDI e arredondado para duas casas", () => {
  const result = analyzeBudget({
    fileName: "orcamento_sintetico.xlsx",
    sheet: {
      name: "PLANILHA ORCAMENTARIA",
      rows: [
        ["Código", "Fonte", "Descrição", "Unidade", "Quantidade", "Preço sem BDI", "BDI", "Preço com BDI"],
        ["A3", "SINAPI", "Válvula PVC", "un", "2", "83,33", "20%", ""],
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
      bdi: 6,
      priceWithBdi: null,
    },
    codePolicy: {
      caseInsensitive: true,
      stripSeparators: true,
    },
  });

  assert.deepEqual(result, {
    items: [
      {
        origin: {
          fileName: "orcamento_sintetico.xlsx",
          sheet: "PLANILHA ORCAMENTARIA",
          rowNumber: 2,
        },
        codeRaw: "A3",
        code: "A3",
        source: "SINAPI",
        sourceKey: "sinapi",
        description: "Válvula PVC",
        unit: "un",
        quantityRaw: "2",
        quantity: 2,
        price: {
          withoutBdiRaw: "83,33",
          withoutBdi: 83.33,
          withoutBdiSource: "Informado",
          bdiRaw: "20%",
          bdiRate: 0.2,
          withBdiRaw: "",
          withBdi: 100,
          withBdiSource: "Calculado sem BDI + BDI",
        },
      },
    ],
    reviewRows: [],
    stats: {
      accepted: 1,
      reviewed: 0,
    },
  });
});

test("repetição posterior do cabeçalho é removida como Cabeçalho repetido", () => {
  const header = ["Código", "Fonte", "Descrição", "Unidade", "Quantidade", "Preço sem BDI", "BDI", "Preço com BDI"];
  const result = analyzeBudget({
    fileName: "orcamento_sintetico.xlsx",
    sheet: {
      name: "PLANILHA ORCAMENTARIA",
      rows: [header, [...header]],
    },
    headerRowNumber: 1,
    mapping: {
      code: 0,
      source: 1,
      description: 2,
      unit: 3,
      quantity: 4,
      priceWithoutBdi: 5,
      bdi: 6,
      priceWithBdi: 7,
    },
    codePolicy: {
      caseInsensitive: true,
      stripSeparators: true,
    },
  });

  assert.deepEqual(result, {
    items: [],
    reviewRows: [
      {
        treatment: "Removida",
        reason: "Cabeçalho repetido",
        reasonDetails: [],
        origin: {
          fileName: "orcamento_sintetico.xlsx",
          sheet: "PLANILHA ORCAMENTARIA",
          rowNumber: 2,
        },
        values: {
          code: "Código",
          source: "Fonte",
          description: "Descrição",
          unit: "Unidade",
          quantity: "Quantidade",
          price: "Preço sem BDI / Preço com BDI",
        },
      },
    ],
    stats: {
      accepted: 0,
      reviewed: 1,
    },
  });
});

test("linha não vazia anterior ao cabeçalho é enviada à revisão como Antes do cabeçalho", () => {
  const result = analyzeBudget({
    fileName: "orcamento_sintetico.xlsx",
    sheet: {
      name: "PLANILHA ORCAMENTARIA",
      rows: [
        ["ORÇAMENTO SINTÉTICO", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", ""],
        ["Código", "Fonte", "Descrição", "Unidade", "Quantidade", "Preço sem BDI", "BDI", "Preço com BDI"],
      ],
    },
    headerRowNumber: 3,
    mapping: {
      code: 0,
      source: 1,
      description: 2,
      unit: 3,
      quantity: 4,
      priceWithoutBdi: 5,
      bdi: 6,
      priceWithBdi: 7,
    },
    codePolicy: {
      caseInsensitive: true,
      stripSeparators: true,
    },
  });

  assert.deepEqual(result, {
    items: [],
    reviewRows: [
      {
        treatment: "Removida",
        reason: "Antes do cabeçalho",
        reasonDetails: [
          "Linha anterior ao cabeçalho selecionado; exibida apenas como contexto na pré-visualização.",
        ],
        origin: {
          fileName: "orcamento_sintetico.xlsx",
          sheet: "PLANILHA ORCAMENTARIA",
          rowNumber: 1,
        },
        values: {
          code: "ORÇAMENTO SINTÉTICO",
          source: "",
          description: "",
          unit: "",
          quantity: "",
          price: "",
        },
      },
    ],
    stats: {
      accepted: 0,
      reviewed: 1,
    },
  });
});

test("rótulos equivalentes ao cabeçalho principal também são removidos como Cabeçalho repetido", () => {
  const result = analyzeBudget({
    fileName: "orcamento_sintetico.xlsx",
    sheet: {
      name: "PLANILHA ORCAMENTARIA",
      rows: [
        ["Código", "Fonte", "Descrição", "Unidade", "Quantidade", "Preço sem BDI", "BDI", "Preço com BDI"],
        ["Cód.", "Base", "Serviços", "Und", "Qtd", "Custo unitário", "", ""],
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
      bdi: 6,
      priceWithBdi: 7,
    },
    codePolicy: {
      caseInsensitive: true,
      stripSeparators: true,
    },
  });

  assert.deepEqual(result, {
    items: [],
    reviewRows: [
      {
        treatment: "Removida",
        reason: "Cabeçalho repetido",
        reasonDetails: [],
        origin: {
          fileName: "orcamento_sintetico.xlsx",
          sheet: "PLANILHA ORCAMENTARIA",
          rowNumber: 2,
        },
        values: {
          code: "Cód.",
          source: "Base",
          description: "Serviços",
          unit: "Und",
          quantity: "Qtd",
          price: "Custo unitário",
        },
      },
    ],
    stats: {
      accepted: 0,
      reviewed: 1,
    },
  });
});

test("preço com separador brasileiro de milhar e decimal é normalizado", () => {
  const result = analyzeBudget({
    fileName: "orcamento_sintetico.xlsx",
    sheet: {
      name: "PLANILHA ORCAMENTARIA",
      rows: [
        ["Código", "Fonte", "Descrição", "Unidade", "Quantidade", "Preço sem BDI", "BDI", "Preço com BDI"],
        ["A4", "SINAPI", "Registro de gaveta", "un", "1", "1.234,56", "", ""],
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

  assert.deepEqual(result, {
    items: [
      {
        origin: {
          fileName: "orcamento_sintetico.xlsx",
          sheet: "PLANILHA ORCAMENTARIA",
          rowNumber: 2,
        },
        codeRaw: "A4",
        code: "A4",
        source: "SINAPI",
        sourceKey: "sinapi",
        description: "Registro de gaveta",
        unit: "un",
        quantityRaw: "1",
        quantity: 1,
        price: {
          withoutBdiRaw: "1.234,56",
          withoutBdi: 1234.56,
          withoutBdiSource: "Informado",
          bdiRaw: "",
          bdiRate: Number.NaN,
          withBdiRaw: "",
          withBdi: Number.NaN,
          withBdiSource: "Indisponível",
        },
      },
    ],
    reviewRows: [],
    stats: {
      accepted: 1,
      reviewed: 0,
    },
  });
});

test("preço em notação científica textual é normalizado", () => {
  const result = analyzeBudget({
    fileName: "orcamento_sintetico.xlsx",
    sheet: {
      name: "PLANILHA ORCAMENTARIA",
      rows: [
        ["Código", "Fonte", "Descrição", "Unidade", "Quantidade", "Preço sem BDI", "BDI", "Preço com BDI"],
        ["A5", "SINAPI", "Hidrômetro", "un", "1", "1.23456e3", "", ""],
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

  assert.deepEqual(result, {
    items: [
      {
        origin: {
          fileName: "orcamento_sintetico.xlsx",
          sheet: "PLANILHA ORCAMENTARIA",
          rowNumber: 2,
        },
        codeRaw: "A5",
        code: "A5",
        source: "SINAPI",
        sourceKey: "sinapi",
        description: "Hidrômetro",
        unit: "un",
        quantityRaw: "1",
        quantity: 1,
        price: {
          withoutBdiRaw: "1.23456e3",
          withoutBdi: 1234.56,
          withoutBdiSource: "Informado",
          bdiRaw: "",
          bdiRate: Number.NaN,
          withBdiRaw: "",
          withBdi: Number.NaN,
          withBdiSource: "Indisponível",
        },
      },
    ],
    reviewRows: [],
    stats: {
      accepted: 1,
      reviewed: 0,
    },
  });
});
