import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {core,spreadsheetRuntime} from '../tests/helpers/core.mjs';
import {execute,verify} from '../tests/helpers/scenarios.mjs';
import {cases} from '../testkit/spec.mjs';
const manifest=JSON.parse(fs.readFileSync('src/manifest.json'));
const rt=spreadsheetRuntime();
const files=Object.fromEntries(['budget','base','comparison'].map(kind=>[kind,core.readWorkbookFile({fileName:kind+'.xlsx',bytes:fs.readFileSync(`testkit/fixtures/${kind}.xlsx`)},{spreadsheetRuntime:rt})]));
const results=[];
for(const c of cases) {
 const sheet=files[c.kind].sheets.find(s=>s.name===c.id);
 const input=c.kind==='comparison'?{...c,baseRows:files.comparison.sheets.find(s=>s.name===c.id+'-BASE').rows}:c;
 try {
  const actual=execute(input,sheet);verify(c,actual);
  const observed=c.kind==='budget'?{accepted:actual.budget.items.length,findings:actual.audit.findings.map(f=>({code:f.code,severity:f.severity,row:f.rowNumber,expected:f.expected,informed:f.informed})),canProceed:actual.audit.canProceed,totals:actual.audit.totals}:c.kind==='base'?{stats:actual.stats,reasons:actual.reviewRows.map(r=>r.reason)}:{stats:actual.stats,total:actual.financial.totalWithBdi,statuses:actual.results.map(r=>r.statusKey)};
  results.push({id:c.id,status:'passed',expected:c.expected,observed});
 } catch(error) {results.push({id:c.id,status:'failed',expected:c.expected,error:error.message});}
}
const report={version:manifest.version,commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),codeDirty:Boolean(execFileSync('git',['status','--porcelain','--','src','dist','scripts','tests','testkit','package.json','package-lock.json','.github'],{encoding:'utf8'}).trim()),htmlSha256:createHash('sha256').update(fs.readFileSync(manifest.output)).digest('hex'),date:new Date().toISOString(),executor:'Node.js '+process.version,results};
fs.mkdirSync('qa/evidence',{recursive:true});fs.writeFileSync('qa/evidence/cases-report.json',JSON.stringify(report,null,2));
const failed=results.filter(r=>r.status==='failed');console.log(`${results.length} casos executados, ${failed.length} falhas.`);if(failed.length)process.exitCode=1;
