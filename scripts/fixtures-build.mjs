import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
if(!process.env.CODEX_PRIMARY_RUNTIME_NODE||!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) throw new Error('A geração XLSX requer o runtime Artifact Tool. Os fixtures versionados podem ser usados sem regeneração.');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'sicorp-fixtures-'));
try {
 fs.symlinkSync(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,path.join(temp,'node_modules'),'dir');
 fs.copyFileSync('testkit/generate-workbooks.mjs',path.join(temp,'generate.mjs'));
 for(const [cmd,args] of [[process.env.CODEX_PRIMARY_RUNTIME_NODE,[path.join(temp,'generate.mjs'),process.cwd()]],['python',['testkit/patch-fixtures.py']],[process.execPath,['testkit/generate-extra.mjs']]]) {
  const result=spawnSync(cmd,args,{stdio:'inherit'});if(result.status!==0)process.exit(result.status??1);
 }
} finally {fs.rmSync(temp,{recursive:true,force:true});}
