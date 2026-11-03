import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
if(!process.env.CODEX_PRIMARY_RUNTIME_NODE||!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES)throw new Error('A autoria XLSX requer o runtime Artifact Tool.');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'sicorp-grouped-'));
try {
 fs.symlinkSync(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,path.join(temp,'node_modules'),'dir');
 fs.copyFileSync('testkit/generate-grouped.mjs',path.join(temp,'generate.mjs'));
 for(const [cmd,args] of [[process.env.CODEX_PRIMARY_RUNTIME_NODE,[path.join(temp,'generate.mjs'),process.cwd()]],[process.env.CODEX_PRIMARY_RUNTIME_PYTHON||'python',['testkit/patch-grouped.py']]]) {
  const r=spawnSync(cmd,args,{stdio:'inherit'});if(r.status!==0)process.exit(r.status??1);
 }
}finally{fs.rmSync(temp,{recursive:true,force:true});}
