import fs from 'node:fs';
export function readCoreSource() {
 const manifest=JSON.parse(fs.readFileSync('src/manifest.json','utf8'));
 return manifest.coreParts.map(part=>fs.readFileSync(part,'utf8')).join('');
}
