import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {groups,runs,books} from '../testkit/grouped-spec.mjs';
import {loadGrouped,executeGrouped,verifyGrouped} from '../tests/helpers/grouped.mjs';
const files=loadGrouped(),results=[];
for(const [g,run] of [...groups.filter(g=>g.kind!=='comparison-base').map(g=>[g,null]),...runs.map(r=>[groups.find(g=>g.name===r.sheet),r])]) {
 try {
  const a=executeGrouped(g,files,run);verifyGrouped(g,a,run);
  const observed=g.kind==='budget'?{summary:a.audit.summary,totals:a.audit.totals,canProceed:a.audit.canProceed,findings:a.audit.findings}:g.kind==='base'?{stats:a.stats,reviewRows:a.reviewRows,conflicts:a.conflicts}:{stats:a.stats,total:a.financial.totalWithBdi,statuses:a.results.map(r=>r.statusKey)};
  results.push({id:run?.id||`${g.kind}/${g.name}`,status:'passed',expected:run||g.expected,observed});
 }catch(e){results.push({id:run?.id||`${g.kind}/${g.name}`,status:'failed',error:e.message});}
}
const manifest=JSON.parse(fs.readFileSync('src/manifest.json'));
const report={date:new Date().toISOString(),version:manifest.version,applicationCommit:'90d447e32e000389ae2158c6b2260a31543b1b7b',node:process.version,htmlSha256:createHash('sha256').update(fs.readFileSync(manifest.output)).digest('hex'),inputs:Object.fromEntries(Object.values(books).map(f=>[f,createHash('sha256').update(fs.readFileSync('testkit/agrupados/'+f)).digest('hex')])),results};
fs.mkdirSync('qa/evidence/grouped',{recursive:true});fs.writeFileSync('qa/evidence/grouped/cases-report.json',JSON.stringify(report,null,2)+'\n');
console.log(`${results.length} execuções agrupadas, ${results.filter(r=>r.status==='failed').length} falhas.`);
if(results.some(r=>r.status==='failed'))process.exitCode=1;
