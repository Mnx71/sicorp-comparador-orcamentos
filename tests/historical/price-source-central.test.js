import assert from "node:assert/strict";
import test from "node:test";

import { createPriceSourceCentral } from "../helpers/core.mjs";

test("catálogo inicial preserva as 20 bases federais e estaduais aprovadas", () => {
  const central = createPriceSourceCentral();
  const records = central.records();

  assert.equal(records.length, 20);
  assert.equal(new Set(records.map((record) => record.id)).size, 20);
  assert.equal(new Set(records.map((record) => record.acronym)).size, 20);
  assert.equal(records.some((record) => Object.hasOwn(record, "aliases")), false);
  assert.equal(records.some((record) => record.acronym === "CAEMA"), false);
  assert.equal(
    records.find((record) => record.acronym === "DER-PB")?.url,
    "https://www.der.pb.gov.br/informacoes/tabela-de-precos-der-pb",
  );
  assert.equal(
    records.find((record) => record.acronym === "SEOP-PA")?.agency,
    "Secretaria de Estado de Obras Públicas do Pará",
  );
  assert.equal(records.some((record) => ["SCO-RIO", "SIURB", "SUDECAP"].includes(record.acronym)), false);
  assert.equal(records.some((record) => record.acronym === "CASAN"), false);
  assert.equal(
    records.find((record) => record.id === "agesul")?.agency,
    "Agência Estadual de Gestão de Empreendimentos de MS",
  );
  assert.equal(
    records.find((record) => record.id === "sicor-mg")?.url,
    "https://www.der.mg.gov.br/536-obras/sistema-referencial-de-custos",
  );
  assert.equal(
    records.find((record) => record.acronym === "DER-ES_Edif")?.url,
    "https://der.es.gov.br/referencial-de-precos-edificacoes",
  );
  assert.equal(
    records.find((record) => record.acronym === "DER-ES_Rodo")?.url,
    "https://der.es.gov.br/referencial-de-precos-rodovias",
  );
  assert.deepEqual(
    records.map((record) => record.acronym),
    [...records].map((record) => record.acronym).sort((a, b) => a.localeCompare(b, "pt-BR", {
      sensitivity: "base",
      numeric: true,
    })),
  );
});

test("visão inicial mostra somente as bases identificadas no orçamento", () => {
  const central = createPriceSourceCentral();
  const result = central.query({
    budgetSources: ["SINAPI", "SEINFRA"],
    search: "",
    showAll: false,
  });

  assert.deepEqual(result.items.map((record) => record.id), ["seinfra-ce", "sinapi"]);
  assert.deepEqual(result.identifiedIds, ["seinfra-ce", "sinapi"]);
  assert.equal(result.hiddenCount, 18);
  assert.deepEqual(result.items.map((record) => record.suggestion.kind), ["family", "family"]);
});

test("fonte genérica DER sugere todos os DERs e fonte específica sugere somente um", () => {
  const central = createPriceSourceCentral();
  const generic = central.query({ budgetSources: ["DER"] });
  const specific = central.query({ budgetSources: ["der sp"] });

  assert.deepEqual(
    generic.items.map((record) => record.acronym),
    ["DER-ES_Edif", "DER-ES_Rodo", "DER-MG / SICOR", "DER-PB", "DER-PR", "DER-SP"],
  );
  assert.deepEqual(generic.items.map((record) => record.suggestion.kind), [
    "family", "family", "family", "family", "family", "family",
  ]);
  assert.deepEqual(generic.items.map((record) => record.suggestion.sources), [
    ["DER"], ["DER"], ["DER"], ["DER"], ["DER"], ["DER"],
  ]);
  assert.deepEqual(specific.items.map((record) => record.id), ["der-sp"]);
  assert.equal(specific.items[0].suggestion.kind, "exact");
});

test("sigla sem separadores é reconhecida apenas quando aponta para uma base", () => {
  const central = createPriceSourceCentral();

  const der = central.query({ budgetSources: ["DERSP"] });
  const seinfra = central.query({ budgetSources: ["SEINFRACE"] });

  assert.deepEqual(der.items.map((record) => record.id), ["der-sp"]);
  assert.equal(der.items[0].suggestion.kind, "compact");
  assert.deepEqual(seinfra.items.map((record) => record.id), ["seinfra-ce"]);
  assert.equal(seinfra.items[0].suggestion.kind, "compact");
});

test("complementos de estado e ano são reconhecidos sem aliases", () => {
  const central = createPriceSourceCentral();

  const caesb = central.query({ budgetSources: ["CAESB-DF", "CAESB-2026", "CAESBDF"] });
  const derEsGeneric = central.query({ budgetSources: ["DER-ES", "DERES"] });
  const derEs = central.query({ budgetSources: ["DER-ES-2026"] });
  const derEsSpecific = central.query({ budgetSources: ["DER-ES_Edif-2026"] });
  const derYear = central.query({ budgetSources: ["DER-2026"] });

  assert.deepEqual(caesb.items.map((record) => record.id), ["caesb"]);
  assert.deepEqual(derEsGeneric.items.map((record) => record.id), ["der-es", "der-es-rodo"]);
  assert.deepEqual(derEs.items.map((record) => record.id), ["der-es", "der-es-rodo"]);
  assert.deepEqual(derEsSpecific.items.map((record) => record.id), ["der-es"]);
  assert.deepEqual(
    derYear.items.map((record) => record.id),
    ["der-es", "der-es-rodo", "sicor-mg", "der-pb", "der-pr", "der-sp"],
  );
  assert.deepEqual(derYear.items.map((record) => record.suggestion.kind), [
    "family", "family", "family", "family", "family", "family",
  ]);
});

test("sigla composta expõe seus próprios identificadores sem consultar o órgão", () => {
  const central = createPriceSourceCentral();

  assert.deepEqual(central.query({ budgetSources: ["SICOR"] }).items.map((record) => record.id), ["sicor-mg"]);
  assert.deepEqual(central.query({ budgetSources: ["DNIT"] }).items, []);
  assert.deepEqual(central.query({ budgetSources: ["CEHOP"] }).items, []);
});

test("nova base com sigla estadual entra automaticamente na família correspondente", () => {
  const central = createPriceSourceCentral();
  const added = central.save({
    acronym: "SEINFRA-MA",
    agency: "Secretaria de Infraestrutura do Maranhão",
    url: "https://example.gov.br/seinfra-ma",
  });

  const result = central.query({ budgetSources: ["SEINFRA"] });
  assert.deepEqual(result.items.map((record) => record.id), ["seinfra-ce", added.id]);
  assert.deepEqual(result.items.map((record) => record.suggestion.kind), ["family", "family"]);
});

test("renomear uma base remove o identificador antigo e aplica a regra ao novo nome", () => {
  const central = createPriceSourceCentral();
  const original = central.records().find((record) => record.id === "der-es");
  central.save({ ...original, acronym: "teste" });

  assert.equal(central.query({ budgetSources: ["DER-ES"] }).identifiedIds.includes("der-es"), false);
  assert.equal(central.query({ budgetSources: ["DER"] }).identifiedIds.includes("der-es"), false);
  assert.deepEqual(central.query({ budgetSources: ["teste"] }).identifiedIds, ["der-es"]);
  assert.deepEqual(central.query({ budgetSources: ["teste-2026"] }).identifiedIds, ["der-es"]);
  assert.doesNotMatch(central.exportStorageJson(), /"aliases"\s*:/);
  assert.doesNotMatch(central.exportPortableJson(), /"aliases"\s*:/);
});

test("base criada pelo usuário recebe automaticamente a mesma pesquisa por sigla", () => {
  const central = createPriceSourceCentral();
  const added = central.save({
    acronym: "NOVA-BASE",
    agency: "Órgão novo",
    url: "https://example.gov.br/nova-base",
  });

  assert.deepEqual(central.query({ budgetSources: ["NOVA"] }).identifiedIds, [added.id]);
  assert.deepEqual(central.query({ budgetSources: ["NOVABASE"] }).identifiedIds, [added.id]);
  assert.deepEqual(central.query({ budgetSources: ["NOVA-BASE-2026"] }).identifiedIds, [added.id]);
});

test("fonte não cadastrada é ignorada e Ver outras libera o catálogo", () => {
  const central = createPriceSourceCentral();
  const identified = central.query({
    budgetSources: ["BASE DESCONHECIDA"],
    showAll: false,
  });
  const all = central.query({
    budgetSources: ["BASE DESCONHECIDA"],
    showAll: true,
  });

  assert.deepEqual(identified.items, []);
  assert.deepEqual(identified.unknownBudgetSources, ["BASE DESCONHECIDA"]);
  assert.equal(all.items.length, 20);
});

test("pesquisa consulta todo o catálogo ignorando acentos e caixa", () => {
  const central = createPriceSourceCentral();

  const result = central.query({
    budgetSources: ["SINAPI"],
    search: "saneamento parana",
    showAll: false,
  });

  assert.deepEqual(result.items.map((record) => record.id), ["sanepar"]);
});

test("edição aceita link em qualquer formato e o preserva no JSON completo", () => {
  const central = createPriceSourceCentral();
  const original = central.records().find((record) => record.id === "sinapi");

  central.save({ ...original, url: "caixa.gov.br/sinapi atualizada" });
  const portable = central.exportPortableJson();
  const restored = createPriceSourceCentral({ savedState: central.exportStorageJson() });
  const parsed = JSON.parse(portable);

  assert.equal(
    restored.records().find((record) => record.id === "sinapi")?.url,
    "caixa.gov.br/sinapi atualizada",
  );
  assert.equal(parsed.formato, "Catálogo de bases de preços do SICORP");
  assert.equal(Object.hasOwn(parsed, "versao"), false);
  assert.equal(parsed.bases.length, 20);
  assert.deepEqual(Object.keys(parsed.bases[0]), ["sigla", "orgao", "link"]);
  assert.equal(parsed.bases.find((record) => record.sigla === "SINAPI")?.link, "caixa.gov.br/sinapi atualizada");
  assert.doesNotMatch(portable, /"id"\s*:/);
});

test("uma nova base pode ser adicionada, pesquisada, exportada e removida", () => {
  const central = createPriceSourceCentral();
  const created = central.save({
    acronym: "NOVA-BASE",
    agency: "Órgão de Teste",
    url: "https://example.gov.br/base",
  });

  assert.match(created.id, /^custom-nova-base/);
  assert.equal(created.custom, true);
  assert.deepEqual(
    central.query({ search: "orgao de teste", showAll: false }).items.map((record) => record.id),
    [created.id],
  );

  const internalState = central.exportStorageJson();
  assert.match(internalState, new RegExp(`"id":"${created.id}"`));
  const restored = createPriceSourceCentral({ savedState: internalState });
  assert.equal(restored.records().some((record) => record.id === created.id), true);
  assert.deepEqual(
    restored.records().map((record) => record.acronym),
    [...restored.records()].map((record) => record.acronym).sort((a, b) => a.localeCompare(b, "pt-BR", {
      sensitivity: "base",
      numeric: true,
    })),
  );
  restored.remove(created.id);
  assert.equal(restored.records().some((record) => record.id === created.id), false);
});

test("validação exige link, não bloqueia seu formato e ainda rejeita sigla duplicada", () => {
  const central = createPriceSourceCentral();

  const saved = central.save({ acronym: "TESTE", agency: "Órgão", url: "intranet\\bases\\2026" });
  assert.equal(saved.url, "intranet\\bases\\2026");
  assert.throws(
    () => central.save({ acronym: "SEM-LINK", agency: "Órgão", url: "" }),
    /link oficial/i,
  );
  assert.throws(
    () => central.save({ acronym: "sinapi", agency: "Outro órgão", url: "https://example.gov.br" }),
    /sigla já cadastrada/i,
  );
  const portable = JSON.parse(central.exportPortableJson());
  portable.bases.push({ sigla: "SINAPI", orgao: "Duplicada", link: "duplicada" });
  assert.throws(
    () => central.importPortableJson(JSON.stringify(portable)),
    /sigla já cadastrada/i,
  );
});

test("importação incompatível ou incompleta não altera o catálogo atual", () => {
  const central = createPriceSourceCentral();
  const before = central.exportPortableJson();

  assert.throws(() => central.importPortableJson('{"bases":[]}'), /formato incompatível/i);
  assert.throws(
    () => central.importPortableJson(JSON.stringify({
      formato: "Catálogo de bases de preços do SICORP",
      bases: [{ sigla: "TESTE", orgao: "Órgão" }],
    })),
    /formato incompatível/i,
  );
  assert.equal(central.exportPortableJson(), before);
});

test("JSON legível sem versão pode ser editado diretamente e importado novamente", () => {
  const central = createPriceSourceCentral();
  const portable = JSON.parse(central.exportPortableJson());
  assert.equal(Object.hasOwn(portable, "versao"), false);
  const sinapi = portable.bases.find((record) => record.sigla === "SINAPI");
  sinapi.orgao = "CAIXA e IBGE — edição manual";
  sinapi.link = "www.caixa.gov.br/novo-sinapi";
  portable.bases.push({
    sigla: "ABC",
    orgao: "Órgão incluído pelo JSON",
    link: "rede-interna/bases/abc",
  });

  central.importPortableJson(JSON.stringify(portable));

  assert.equal(central.records()[0].acronym, "ABC");
  assert.equal(central.records().find((record) => record.id === "sinapi")?.agency, "CAIXA e IBGE — edição manual");
  assert.equal(central.records().find((record) => record.id === "sinapi")?.url, "www.caixa.gov.br/novo-sinapi");
});

test("estado local anterior e JSON sem o marcador do formato são rejeitados", () => {
  assert.throws(
    () => createPriceSourceCentral({ savedState: '{"schemaVersion":1,"overrides":[],"additions":[]}' }),
    /formato incompatível/i,
  );
  const central = createPriceSourceCentral();
  assert.throws(() => central.importPortableJson('{"bases":[]}'), /formato incompatível/i);
});

test("bases padrão podem ser excluídas e somente a restauração global as recupera", () => {
  const central = createPriceSourceCentral();
  assert.equal(central.remove("caesb"), true);
  assert.equal(central.records().some((record) => record.id === "caesb"), false);
  assert.equal(JSON.parse(central.exportPortableJson()).bases.some((record) => record.sigla === "CAESB"), false);

  const reloaded = createPriceSourceCentral({ savedState: central.exportStorageJson() });
  assert.equal(reloaded.records().some((record) => record.id === "caesb"), false);
  reloaded.reset();
  assert.equal(reloaded.records().some((record) => record.id === "caesb"), true);
});
