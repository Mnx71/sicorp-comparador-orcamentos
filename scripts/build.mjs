import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import {readCoreSource} from './source.mjs';

const manifest = JSON.parse(await readFile('src/manifest.json', 'utf8'));
let html = await readFile('src/shell.html', 'utf8');
const inputs = new Map();
for (const path of manifest.parts) {
  const token = '{{' + path + '}}';
  if (html.split(token).length !== 2) throw new Error(`Marcador único obrigatório: ${path}`);
  inputs.set(path, path==='CORE'?readCoreSource():await readFile(path, 'utf8'));
}
for (const path of manifest.parts) html = html.replace('{{' + path + '}}', () => inputs.get(path));

function hash(content) { return createHash('sha256').update(content).digest('hex'); }
const executable = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].filter(m => !m[1].includes('application/octet-stream'));
for (const [i, m] of executable.entries()) new vm.Script(m[2], { filename: `script-${i}.js` });
if (process.argv.includes('--check')) {
  if (await readFile(manifest.output, 'utf8') !== html) throw new Error('HTML distribuído diverge dos fontes. Execute npm run build.');
} else {
  await mkdir('dist', { recursive: true });
  await writeFile(manifest.output, html);
  await writeFile('dist/SHA256SUMS.txt', `${hash(html)}  ${manifest.output.split('/').at(-1)}\n`);
}
console.log(JSON.stringify({ version: manifest.version, path: manifest.output, sha256: hash(html), executableScripts: executable.length }));
