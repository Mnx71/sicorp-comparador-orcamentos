import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=process.cwd();
const html=fs.readFileSync(path.resolve(root,'../../dist/sicorp_comparador_orcamento_v4.5.0.html'));
test('SHA-256 oficial do HTML',()=>assert.equal(crypto.createHash('sha256').update(html).digest('hex'),'33807e74bdb45c0bb081bb2001a40cb1c16394144dfad7c9930e2cde4aaa6905'));
test('Tutorial integrado presente',()=>{
 for (const id of ['tutorialCard','tutorialOpenBtn','tutorialResumeBtn','tutorialNextBtn','welcomeStartBtn']) assert.ok(html.includes('id="'+id+'"'),id);
});
test('Áreas de orçamento, bases e comparação presentes',()=>{
 for (const id of ['projectFile','projectAutoMapBtn','budgetAuditDialog','baseFile','baseReviewBtn','compareBtn','resultTable','exportXlsxBtn']) assert.ok(html.includes('id="'+id+'"'),id);
});
test('Planilhas agrupadas históricas preservadas',()=>{
 for (const f of ['orcamento-agrupado.xlsx','bases-agrupadas.xlsx','comparacao-agrupada.xlsx']) assert.ok(fs.statSync(path.resolve(root,'../../testkit/agrupados',f)).size>0,f);
});
