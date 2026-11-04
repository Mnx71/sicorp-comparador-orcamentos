import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

test('versão final admite reprodução idêntica e rejeita sobrescrita com outro conteúdo',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sicorp-release-'));
 const build=path.resolve('scripts/build.mjs');
 const run=()=>spawnSync(process.execPath,[build],{cwd:root,encoding:'utf8'});
 try {
  fs.mkdirSync(path.join(root,'src'));
  fs.writeFileSync(path.join(root,'src/manifest.json'),JSON.stringify({version:'4.4.0',parts:['CORE'],coreParts:['src/core.js'],output:'dist/sicorp_v4.4.0.html'}));
  fs.writeFileSync(path.join(root,'src/shell.html'),'<!doctype html><script>{{CORE}}</script>');
  fs.writeFileSync(path.join(root,'src/core.js'),'globalThis.example = 42;');
  const first=run();assert.equal(first.status,0,first.stderr);
  const artifact=fs.readFileSync(path.join(root,'dist/sicorp_v4.4.0.html'));
  const checksum=fs.readFileSync(path.join(root,'dist/SHA256SUMS.txt'));
  const repeated=run();assert.equal(repeated.status,0,repeated.stderr);
  assert.deepEqual(fs.readFileSync(path.join(root,'dist/sicorp_v4.4.0.html')),artifact);
  fs.writeFileSync(path.join(root,'src/core.js'),'globalThis.example = 43;');
  const changed=run();assert.notEqual(changed.status,0);
  assert.match(changed.stderr,/Defina uma nova versão e outro arquivo de saída/);
  assert.deepEqual(fs.readFileSync(path.join(root,'dist/sicorp_v4.4.0.html')),artifact);
  assert.deepEqual(fs.readFileSync(path.join(root,'dist/SHA256SUMS.txt')),checksum);
 } finally {fs.rmSync(root,{recursive:true,force:true});}
});
