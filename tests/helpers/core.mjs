import fs from 'node:fs';
import vm from 'node:vm';
import { gunzipSync } from 'node:zlib';
import {readCoreSource} from '../../scripts/source.mjs';
vm.runInThisContext(readCoreSource(), {filename:'sicorp-core.js'});
export const core = globalThis.SicorpCore;
export const { analyzeBudget, auditBudgetCalculations, prepareReferenceCatalog, compareBudgetToCatalog,
  adaptComparisonToLegacyView, runComparisonFromLegacyState, runBudgetAuditFromLegacyState,
  prepareComparisonExport, createPriceSourceCentral, buildOrseDataset, prepareOrseWorkbooks,
  convertOrseFile, writeOrseWorkbookXlsx, readWorkbookFile } = core;
export function spreadsheetRuntime() {
  const legacy = { module: { exports: {} }, exports: {}, console, TextDecoder, TextEncoder,
    Uint8Array, ArrayBuffer, DataView, Buffer, setTimeout, clearTimeout };
  legacy.exports = legacy.module.exports;
  const b64 = fs.readFileSync('src/vendor/legacy-xls-runtime.b64', 'utf8').trim();
  vm.runInNewContext(gunzipSync(Buffer.from(b64, 'base64')).toString('utf8'), legacy);
  return legacy.module.exports;
}
