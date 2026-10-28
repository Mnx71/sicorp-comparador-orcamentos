import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('baseline/manifest.json', root), 'utf8'));

for (const entry of manifest.files) {
  const bytes = await readFile(new URL(entry.path, root));
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (digest !== entry.sha256) throw new Error(`Integridade divergente: ${entry.path}`);
  if (bytes.length !== entry.sizeBytes) throw new Error(`Tamanho divergente: ${entry.path}`);
  console.log(`Integridade OK: ${entry.path}`);
}

const html = await readFile(new URL(manifest.candidatePath, root), 'utf8');
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter((match) => !/type=["']application\/octet-stream["']/i.test(match[1]));
if (scripts.length !== 3) throw new Error('Quantidade inesperada de scripts executáveis no HTML preservado.');
for (const [index, script] of scripts.entries()) new Script(script[2], { filename: `rc.16#${index + 1}` });
console.log(`Sintaxe OK: ${scripts.length} scripts executáveis.`);
console.log('Verificação inicial concluída. A auditoria funcional completa permanece pendente.');
