import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const m = JSON.parse(fs.readFileSync(path.join(root, 'src/extracted/segments.json'), 'utf8'));
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const app = fs.readFileSync(path.resolve(root, '../../dist/sicorp_comparador_orcamento_v4.5.0.html'));
if(hash(app)!==m.sha256ApprovedHtml) throw Error('Aplicativo dist diverge do aprovado');
for (const { file, bytes, sha256 } of m.segments) {
 const data=fs.readFileSync(path.join(root,file));
 if(data.length!==bytes || hash(data)!==sha256) throw Error('Segmento alterado: '+file);
 if(file.endsWith('.js')) new vm.Script(data.toString('utf8'),{filename:file});
}
console.log('Validação OK: HTML original, segmentos e sintaxe JS');
