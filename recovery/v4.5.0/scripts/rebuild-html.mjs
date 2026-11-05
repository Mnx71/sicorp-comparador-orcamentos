import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/extracted/segments.json'), 'utf8'));
let html = fs.readFileSync(path.join(root, 'src/shell.html'), 'utf8');
for (const { marker, file } of manifest.segments) {
  if (html.split(marker).length !== 2) throw new Error('Marcador ausente/duplicado: ' + marker);
  html = html.replace(marker, () => fs.readFileSync(path.join(root, file), 'utf8'));
}
const bytes = Buffer.from(html, 'utf8');
const digest = crypto.createHash('sha256').update(bytes).digest('hex');
if (digest !== manifest.sha256ApprovedHtml) throw new Error('HTML gerado diferente da versão aprovada: ' + digest);
const dest = path.resolve(root, '../../dist/sicorp_comparador_orcamento_v4.5.0.html');
if (!fs.existsSync(dest) || !fs.readFileSync(dest).equals(bytes)) throw new Error('HTML publicado difere da reconstrução');
console.log('Reconstrução idêntica: ' + bytes.length + ' bytes e SHA-256 ' + digest);
