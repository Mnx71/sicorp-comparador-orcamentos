import test from "node:test";
import assert from "node:assert/strict";

import { prepareReferenceCatalog } from "../helpers/core.mjs";

function prepareSinapiCatalog(rows, headerRowNumber = 1) {
  return prepareReferenceCatalog({
    bases: [
      {
        name: "SINAPI sintética",
        source: "SINAPI",
        fileName: "sinapi_sintetica.xlsx",
        sheet: {
          name: "PREÇOS",
          rows,
        },
        headerRowNumber,
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
}

function referenceBase({
  name = "SINAPI sintética",
  source = "SINAPI",
  fileName = "sinapi_sintetica.xlsx",
  sheetName = "PREÇOS",
  rows,
}) {
  return {
    name,
    source,
    fileName,
    sheet: {
      name: sheetName,
      rows: [
        ["Código", "Descrição", "Unidade", "Preço"],
        ...rows,
      ],
    },
    headerRowNumber: 1,
    mapping: {
      code: 0,
      description: 1,
      unit: 2,
      price: 3,
    },
  };
}

function prepareCatalogFromBases(bases) {
  return prepareReferenceCatalog({
    bases,
    codePolicy: {
      caseInsensitive: true,
      stripSeparators: true,
    },
  });
}

test("uma linha válida de base produz um item canônico e rastreável", () => {
  const result = prepareReferenceCatalog({
    bases: [
      {
        name: "SINAPI sintética",
        source: "SINAPI",
        fileName: "sinapi_sintetica.xlsx",
        sheet: {
          name: "PREÇOS",
          rows: [
            ["Código", "Descrição", "Unidade", "Preço"],
            ["001.002", "Tubo PVC", "m", "123,45"],
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

  assert.deepEqual(result, {
    items: [
      {
        baseName: "SINAPI sintética",
        source: "SINAPI",
        sourceKey: "sinapi",
        codeRaw: "001.002",
        code: "1002",
        description: "Tubo PVC",
        unit: "m",
        price: {
          raw: "123,45",
          value: 123.45,
          issue: "",
        },
        origins: [
          {
            fileName: "sinapi_sintetica.xlsx",
            sheet: "PREÇOS",
            rowNumber: 2,
          },
        ],
      },
    ],
    reviewRows: [],
    conflicts: [],
    stats: {
      accepted: 1,
      reviewed: 0,

      conflicts: 0,
    },
  });
});

for (const [value, reason] of [["","Preço ausente"],["abc","Preço não numérico"],[0,"Preço zero"],[-1,"Preço negativo"]]) {
  test(`preço inválido é excluído: ${reason}`,()=>{
    const result=prepareSinapiCatalog([["Código","Descrição","Unidade","Preço"],["1","Tubo PVC","m",value]]);
    assert.equal(result.items.length,0);
    assert.deepEqual(result.reviewRows.map(r=>r.reason),[reason]);
    assert.deepEqual(result.stats,{accepted:0,reviewed:1,conflicts:0});
  });
}

test("uma linha de base sem código é removida como Linha estrutural", () => {
  const result = prepareSinapiCatalog([
    ["Código", "Descrição", "Unidade", "Preço"],
    ["", "Tubo PVC", "m", "10,00"],
  ]);

  assert.deepEqual(result, {
    items: [],
    reviewRows: [
      {
        treatment: "Removida",
        reason: "Linha estrutural",
        reasonDetails: ["Código ausente"],
        origin: {
          fileName: "sinapi_sintetica.xlsx",
          sheet: "PREÇOS",
          rowNumber: 2,
        },
        values: {
          code: "",
          source: "SINAPI",
          description: "Tubo PVC",
          unit: "m",
          price: "10,00",
        },
      },
    ],
    conflicts: [],
    stats: {
      accepted: 0,
      reviewed: 1,

      conflicts: 0,
    },
  });
});

test("uma linha de base sem descrição é removida como Linha estrutural", () => {
  const result = prepareSinapiCatalog([
    ["Código", "Descrição", "Unidade", "Preço"],
    ["001.010", "", "m", "10,00"],
  ]);

  assert.deepEqual(result.reviewRows, [
    {
      treatment: "Removida",
      reason: "Linha estrutural",
      reasonDetails: ["Descrição ausente"],
      origin: {
        fileName: "sinapi_sintetica.xlsx",
        sheet: "PREÇOS",
        rowNumber: 2,
      },
      values: {
        code: "001.010",
        source: "SINAPI",
        description: "",
        unit: "m",
        price: "10,00",
      },
    },
  ]);
  assert.equal(result.items.length, 0);
  assert.deepEqual(result.stats, {
    accepted: 0,
    reviewed: 1,

    conflicts: 0,
  });
});

test("uma linha de base sem unidade é removida como Linha estrutural", () => {
  const result = prepareSinapiCatalog([
    ["Código", "Descrição", "Unidade", "Preço"],
    ["001.011", "Tubo PVC", "", "10,00"],
  ]);

  assert.deepEqual(result.reviewRows[0], {
    treatment: "Removida",
    reason: "Linha estrutural",
    reasonDetails: ["Unidade ausente"],
    origin: {
      fileName: "sinapi_sintetica.xlsx",
      sheet: "PREÇOS",
      rowNumber: 2,
    },
    values: {
      code: "001.011",
      source: "SINAPI",
      description: "Tubo PVC",
      unit: "",
      price: "10,00",
    },
  });
  assert.equal(result.items.length, 0);
  assert.equal(result.stats.reviewed, 1);
});

test("uma linha de base informa todos os campos de identidade ausentes", () => {
  const result = prepareSinapiCatalog([
    ["Código", "Descrição", "Unidade", "Preço"],
    ["", "", "", "10,00"],
  ]);

  assert.deepEqual(result.reviewRows[0].reasonDetails, [
    "Código ausente",
    "Descrição ausente",
    "Unidade ausente",
  ]);
  assert.equal(result.reviewRows[0].reason, "Linha estrutural");
  assert.equal(result.reviewRows[0].treatment, "Removida");
  assert.equal(result.items.length, 0);
});

test("cabeçalhos exatos ou equivalentes dentro dos dados são removidos como Cabeçalho repetido", () => {
  const header = ["Código", "Descrição", "Unidade", "Preço"];
  const result = prepareSinapiCatalog([
    header,
    [...header],
    ["Item", "Serviços", "Und", "Custo unitário"],
  ]);

  assert.deepEqual(result.reviewRows, [
    {
      treatment: "Removida",
      reason: "Cabeçalho repetido",
      reasonDetails: [],
      origin: {
        fileName: "sinapi_sintetica.xlsx",
        sheet: "PREÇOS",
        rowNumber: 2,
      },
      values: {
        code: "Código",
        source: "SINAPI",
        description: "Descrição",
        unit: "Unidade",
        price: "Preço",
      },
    },
    {
      treatment: "Removida",
      reason: "Cabeçalho repetido",
      reasonDetails: [],
      origin: {
        fileName: "sinapi_sintetica.xlsx",
        sheet: "PREÇOS",
        rowNumber: 3,
      },
      values: {
        code: "Item",
        source: "SINAPI",
        description: "Serviços",
        unit: "Und",
        price: "Custo unitário",
      },
    },
  ]);
  assert.deepEqual(result.stats, {
    accepted: 0,
    reviewed: 2,

    conflicts: 0,
  });
});

test("linha não vazia anterior ao cabeçalho da base é enviada à revisão", () => {
  const result = prepareSinapiCatalog([
    ["BASE SINAPI — JULHO/2025", "", "", ""],
    ["", "", "", ""],
    ["Código", "Descrição", "Unidade", "Preço"],
  ], 3);

  assert.deepEqual(result.reviewRows, [
    {
      treatment: "Removida",
      reason: "Antes do cabeçalho",
      reasonDetails: [
        "Linha anterior ao cabeçalho selecionado; exibida apenas como contexto na pré-visualização.",
      ],
      origin: {
        fileName: "sinapi_sintetica.xlsx",
        sheet: "PREÇOS",
        rowNumber: 1,
      },
      values: {
        code: "BASE SINAPI — JULHO/2025",
        source: "SINAPI",
        description: "",
        unit: "",
        price: "",
      },
    },
  ]);
  assert.equal(result.stats.reviewed, 1);
});

test("contagens agregam revisão estrutural, cabeçalho repetido e preço indisponível", () => {
  const header = ["Código", "Descrição", "Unidade", "Preço"];
  const result = prepareSinapiCatalog([
    ["BASE SINAPI", "", "", ""],
    header,
    [...header],
    ["", "Linha estrutural", "m", "10,00"],
    ["001.012", "Item sem preço", "un", ""],
  ], 2);

  assert.equal(result.items.length, 0);
  assert.deepEqual(result.reviewRows.map(({ reason }) => reason), [
    "Antes do cabeçalho",
    "Cabeçalho repetido",
    "Linha estrutural",
    "Preço ausente",
  ]);
  assert.deepEqual(result.stats, {
    accepted: 0,
    reviewed: 4,

    conflicts: 0,
  });
});

test("duplicidades equivalentes são consolidadas com todas as origens", () => {
  const result = prepareCatalogFromBases([
    referenceBase({
      rows: [["001.020", "Conexão PVC", "m", "123,45"]],
    }),
    referenceBase({
      name: "SINAPI analítica",
      source: "sinapi",
      fileName: "sinapi_analitica.xlsx",
      sheetName: "ANALÍTICA",
      rows: [["00001020", "conexao   pvc", " M ", 123.45]],
    }),
  ]);

  assert.equal(result.items.length, 1);
  assert.deepEqual(result.items[0], {
    baseName: "SINAPI sintética; SINAPI analítica",
    source: "SINAPI",
    sourceKey: "sinapi",
    codeRaw: "001.020",
    code: "1020",
    description: "Conexão PVC",
    unit: "m",
    price: {
      raw: "123,45",
      value: 123.45,
      issue: "",
    },
    origins: [
      {
        fileName: "sinapi_sintetica.xlsx",
        sheet: "PREÇOS",
        rowNumber: 2,
      },
      {
        fileName: "sinapi_analitica.xlsx",
        sheet: "ANALÍTICA",
        rowNumber: 2,
      },
    ],
  });
  assert.deepEqual(result.conflicts, []);
  assert.equal(result.stats.accepted, 1);
});

test("o mesmo código com descrições diferentes permanece como itens distintos", () => {
  const result = prepareCatalogFromBases([
    referenceBase({
      rows: [
        ["001.021", "Tubo PVC", "m", "10,00"],
        ["001.021", "Joelho PVC", "un", "5,00"],
      ],
    }),
  ]);

  assert.equal(result.items.length, 2);
  assert.deepEqual(result.items.map(({ description }) => description), [
    "Tubo PVC",
    "Joelho PVC",
  ]);
  assert.deepEqual(result.conflicts, []);
  assert.deepEqual(result.stats, {
    accepted: 2,
    reviewed: 0,

    conflicts: 0,
  });
});

test("a mesma fonte, código e descrição com unidades diferentes gera conflito bloqueante", () => {
  const result = prepareCatalogFromBases([
    referenceBase({
      rows: [
        ["001.022", "Tubo PVC", "m", "10,00"],
        ["001.022", "tubo pvc", "un", "10,00"],
      ],
    }),
  ]);

  assert.equal(result.items.length, 2);
  assert.deepEqual(result.conflicts, [
    {
      source: "SINAPI",
      sourceKey: "sinapi",
      code: "1022",
      description: "Tubo PVC",
      reasons: ["unidade"],
      occurrences: [
        {
          baseName: "SINAPI sintética",
          description: "Tubo PVC",
          unit: "m",
          price: { raw: "10,00", value: 10, issue: "" },
          origins: [
            {
              fileName: "sinapi_sintetica.xlsx",
              sheet: "PREÇOS",
              rowNumber: 2,
            },
          ],
        },
        {
          baseName: "SINAPI sintética",
          description: "tubo pvc",
          unit: "un",
          price: { raw: "10,00", value: 10, issue: "" },
          origins: [
            {
              fileName: "sinapi_sintetica.xlsx",
              sheet: "PREÇOS",
              rowNumber: 3,
            },
          ],
        },
      ],
    },
  ]);
  assert.equal(result.stats.conflicts, 1);
});

test("a mesma fonte, código e descrição com preços diferentes gera conflito bloqueante", () => {
  const result = prepareCatalogFromBases([
    referenceBase({
      rows: [
        ["001.023", "Registro de gaveta", "un", "100,00"],
        ["001.023", "registro   de gaveta", "UN", "110,00"],
      ],
    }),
  ]);

  assert.equal(result.items.length, 2);
  assert.equal(result.conflicts.length, 1);
  assert.deepEqual(result.conflicts[0].reasons, ["valor referencial"]);
  assert.equal(result.conflicts[0].code, "1023");
  assert.equal(result.conflicts[0].occurrences.length, 2);
  assert.equal(result.stats.conflicts, 1);
});

test("códigos iguais de fontes diferentes não são duplicidades", () => {
  const result = prepareCatalogFromBases([
    referenceBase({
      rows: [["001.024", "Tubo PVC", "m", "10,00"]],
    }),
    referenceBase({
      name: "SICRO sintética",
      source: "SICRO",
      fileName: "sicro_sintetica.xlsx",
      rows: [["001.024", "Tubo PVC", "m", "10,00"]],
    }),
  ]);

  assert.equal(result.items.length, 2);
  assert.deepEqual(result.items.map(({ sourceKey }) => sourceKey), ["sinapi", "sicro"]);
  assert.deepEqual(result.conflicts, []);
});

test("duplicidades sem preço são excluídas individualmente",()=>{
  const result=prepareCatalogFromBases([referenceBase({rows:[["1","Tubo PVC","m",""],["1","Tubo PVC","m",""]]})]);
  assert.equal(result.items.length,0);
  assert.deepEqual(result.reviewRows.map(r=>r.reason),["Preço ausente","Preço ausente"]);
});
