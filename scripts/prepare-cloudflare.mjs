import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const configPath = join(root, 'deploy', 'cloudflare-release.json');
const release = JSON.parse(readFileSync(configPath, 'utf8'));

if (!release.application || !/^[a-f0-9]{64}$/i.test(release.sha256)) {
  throw new Error('Configuracao da versao publicada incompleta ou invalida.');
}
const source = resolve(root, release.application);
const relPath = relative(root, source);
if (relPath.startsWith(`..${sep}`) || relPath === '..' || isAbsolute(relPath) || extname(source).toLowerCase() !== '.html') {
  throw new Error('Arquivo de publicacao deve ser um HTML dentro do repositorio.');
}
if (!existsSync(source)) throw new Error(`Arquivo nao encontrado: ${release.application}`);
const original = readFileSync(source);
const actualSha = createHash('sha256').update(original).digest('hex');
if (actualSha.toLowerCase() !== release.sha256.toLowerCase()) {
  throw new Error(`Integridade incorreta para ${release.application}: ${actualSha}`);
}
const folder = join(root, 'public');
mkdirSync(folder, { recursive: true });
copyFileSync(source, join(folder, 'index.html'));
console.log(`Cloudflare: ${release.application} -> public/index.html (${original.length} bytes). SHA-256 OK.`);
