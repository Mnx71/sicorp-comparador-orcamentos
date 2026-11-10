# Publicacao do SICORP na Cloudflare Workers

A integracao **Cloudflare Workers Builds + GitHub** publica o HTML final aprovado, sem reconstruir a versao anterior da aplicacao.

## Configuracao no painel Cloudflare

- Repositorio: `Mnx71/sicorp-comparador-orcamentos` (pode continuar privado).
- Branch de producao: `main`.
- Nome do Worker: `sicorp` (deve coincidir com `wrangler.jsonc`).
- Subdominio da conta: `doh-snsh`, para obter `https://sicorp.doh-snsh.workers.dev`.
- Root directory: raiz do repositorio (padrão).
- Build command: `node scripts/prepare-cloudflare.mjs`.
- Deploy command: `npx wrangler deploy`.
- Preview command: `npx wrangler preview` (opcional, quando apresentado).

**Nao usar `npm run build` neste fluxo:** ele ainda gera a versao 4.4.0. O script especifico copia o HTML aprovado da versao indicada em `deploy/cloudflare-release.json` para `public/index.html` e confere SHA-256 antes do deploy. Em caso de arquivo incorreto, a publicacao falha sem substituir a versao atual.

O subdominio `doh-snsh` pertence a conta Cloudflare, nao ao Worker; alterar o subdominio da conta afeta as URLs `workers.dev` de outros Workers existentes nessa conta.

## Novas versoes

1. Concluir testes e adicionar o HTML final da nova versao em `dist/`, com nome unico.
2. Atualizar `deploy/cloudflare-release.json` com o caminho do novo HTML e seu SHA-256.
3. Integrar as mudancas na branch `main`. A integracao do GitHub inicia o build e o deploy automaticamente.
4. Conferir o resultado no painel da Cloudflare e no endereco publicado.

O `wrangler.jsonc` utiliza Static Assets e publica apenas `public/index.html` como pagina inicial. Nao inclui planilhas reais ou arquivos de testes no site. O site e publico por padrao; usar Cloudflare Access se for necessario restringir quem pode acessa-lo.
