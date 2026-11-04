import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOrseDataset,
  convertOrseFile,
  prepareOrseWorkbooks,
  writeOrseWorkbookXlsx,
} from "../helpers/core.mjs";

function parsedFixture() {
  return {
    periodo: { rows: [{ peri_nr_ano: 2026, peri_nr_mes: 6, peri_nr_ordem: 0 }] },
    grupo_insumo: { rows: [
      { gpin_nr_codigo: 1, gpin_in_tipo: "M" },
      { gpin_nr_codigo: 2, gpin_in_tipo: "E" },
    ] },
    insumo: { rows: [
      { font_sg_fonte: "ORSE", insu_nr_codigo: 1, insu_tx_descricao: "Material ativo", insu_sg_unidade: "kg", gpin_nr_codigo: 1, insu_in_desativado: "N" },
      { font_sg_fonte: "ORSE", insu_nr_codigo: 2, insu_tx_descricao: "Material ativo sem preço", insu_sg_unidade: "m", gpin_nr_codigo: 1, insu_in_desativado: "N" },
      { font_sg_fonte: "ORSE", insu_nr_codigo: 3, insu_tx_descricao: "Material inativo", insu_sg_unidade: "un", gpin_nr_codigo: 1, insu_in_desativado: "S" },
      { font_sg_fonte: "ORSE", insu_nr_codigo: 4, insu_tx_descricao: "Equipamento", insu_sg_unidade: "h", gpin_nr_codigo: 2, insu_in_desativado: "N" },
      { font_sg_fonte: "SINAPI", insu_nr_codigo: 5, insu_tx_descricao: "Material SINAPI", insu_sg_unidade: "kg", gpin_nr_codigo: 1, insu_in_desativado: "N" },
    ] },
    insumo_preco: { rows: [
      { font_sg_fonte: "ORSE", insu_nr_codigo: 1, inpr_vl_adotado: 12.34 },
      { font_sg_fonte: "ORSE", insu_nr_codigo: 2, inpr_vl_adotado: null },
      { font_sg_fonte: "SINAPI", insu_nr_codigo: 5, inpr_vl_adotado: 99 },
    ] },
    servico: { rows: [
      { font_sg_fonte: "ORSE", serv_nr_codigo: 10, serv_tx_descricao: "Serviço ativo", serv_sg_unidade: "m²", serv_in_desativado: "N" },
      { font_sg_fonte: "ORSE", serv_nr_codigo: 11, serv_tx_descricao: "Serviço sem preço", serv_sg_unidade: "un", serv_in_desativado: "N" },
      { font_sg_fonte: "ORSE", serv_nr_codigo: 12, serv_tx_descricao: "Serviço inativo", serv_sg_unidade: "m", serv_in_desativado: "S" },
      { font_sg_fonte: "SINAPI", serv_nr_codigo: 13, serv_tx_descricao: "Serviço SINAPI", serv_sg_unidade: "m", serv_in_desativado: "N" },
    ] },
    servico_preco: { rows: [
      { font_sg_fonte: "ORSE", serv_nr_codigo: 10, svpr_vl_unitario: 45.67 },
      { font_sg_fonte: "ORSE", serv_nr_codigo: 11, svpr_vl_unitario: null },
      { font_sg_fonte: "SINAPI", serv_nr_codigo: 13, svpr_vl_unitario: 88 },
    ] },
  };
}

test("regras v1.3.0 mantêm somente materiais e serviços ORSE ativos", () => {
  const data = buildOrseDataset(parsedFixture());

  assert.deepEqual(data.period, { year: 2026, month: 6, order: 0 });
  assert.deepEqual(data.inputs, [
    { codigo: "00001/ORSE", descricao: "Material ativo", unidade: "kg", custoUnitario: 12.34 },
    { codigo: "00002/ORSE", descricao: "Material ativo sem preço", unidade: "m", custoUnitario: null },
  ]);
  assert.deepEqual(data.services, [
    { codigo: "00010/ORSE", descricao: "Serviço ativo", unidade: "m²", custoUnitario: 45.67 },
    { codigo: "00011/ORSE", descricao: "Serviço sem preço", unidade: "un", custoUnitario: null },
  ]);
  assert.deepEqual(data.stats, {
    inputs: { total: 2, withPrice: 1, withoutPrice: 1 },
    services: { total: 2, withPrice: 1, withoutPrice: 1 },
  });
});

test("workbook de download possui Resumo, Insumos e Servicos; visão interna omite Resumo", () => {
  const prepared = prepareOrseWorkbooks(buildOrseDataset(parsedFixture()), "20260601-00.ORSE");

  assert.equal(prepared.outputFileName, "20260601-00_ORSE.xlsx");
  assert.equal(prepared.workbook.fileName, "20260601-00_ORSE.xlsx");
  assert.equal(prepared.workbook.format, "orse");
  assert.deepEqual(prepared.workbook.sheets.map((sheet) => sheet.name), ["Insumos", "Servicos"]);
  assert.deepEqual(prepared.exportWorkbook.sheets.map((sheet) => sheet.name), ["Resumo", "Insumos", "Servicos"]);
  assert.deepEqual(prepared.workbook.sheets[0].rows[0], ["Código", "Descrição", "Unidade", "Custo Unitário"]);
  assert.equal(prepared.exportWorkbook.sheets[0].rows[2][1], "20260601-00.ORSE");
});

test("nome de saída preserva o nome original e acrescenta somente o sufixo ORSE", () => {
  const prepared = prepareOrseWorkbooks(buildOrseDataset(parsedFixture()), "Base mensal 06.2026.orse");
  assert.equal(prepared.outputFileName, "Base mensal 06.2026_ORSE.xlsx");
});

test("arquivo inválido ou com extensão incorreta é rejeitado antes da conversão", async () => {
  await assert.rejects(
    convertOrseFile({ fileName: "base.xlsx", bytes: new Uint8Array([1]) }),
    /extensão \.ORSE/i,
  );
  await assert.rejects(
    convertOrseFile({ fileName: "base.ORSE", bytes: new Uint8Array([1, 2, 3, 4]) }),
    /assinatura interna esperada/i,
  );
});

test("XLSX ORSE reproduz cores, fontes, dimensões e congelamento do conversor v1.3.0", () => {
  const prepared = prepareOrseWorkbooks(buildOrseDataset(parsedFixture()), "base.ORSE");
  const bytes = writeOrseWorkbookXlsx(prepared.exportWorkbook, null, {
    generatedAt: new Date("2026-06-01T00:00:00.000Z"),
  });
  const xml = new TextDecoder().decode(bytes);

  assert.deepEqual([...bytes.subarray(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
  assert.match(xml, /Aptos Display/);
  assert.match(xml, /FF17365D/);
  assert.match(xml, /FFD9EAF7/);
  assert.match(xml, /FF1F4E78/);
  assert.match(xml, /FFFFF2CC/);
  assert.match(xml, /<mergeCell ref="A1:D1"\/>/);
  assert.match(xml, /<mergeCell ref="A13:D14"\/>/);
  assert.match(xml, /<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"\/>/);
  assert.match(xml, /width="78" customWidth="1"/);
  assert.match(xml, /<autoFilter ref="A1:D1"\/>/);
});

test("serialização rejeita workbook que não possui as três abas ORSE esperadas", () => {
  assert.throws(
    () => writeOrseWorkbookXlsx({ sheets: [] }),
    /abas Resumo, Insumos e Servicos/i,
  );
});
