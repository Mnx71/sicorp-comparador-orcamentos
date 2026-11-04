# Revisões ampliadas e abertura direta — v4.4.0-rc.20

Data: 04/11/2026. Partida: `ec26ca2628b1e9b21fb1a11ffb6db90579f103bd`, branch `audit/consolidacao-rc17`.

As revisões do orçamento e das bases compartilham o mesmo tamanho, ocupando quase toda a tela e preservando uma margem de 8 a 16 px em cada lado. O fundo, a sombra e os cantos arredondados mantêm a aparência de janela sobre a página. A tabela aproveita mais altura em telas altas. O corpo das duas revisões permite alcançar a tabela, a explicação e os botões por rolagem, sem comprimir seus blocos.

O diálogo de introdução foi removido, junto com seus estilos e eventos. O SICORP abre diretamente na importação do orçamento. A versão e a autoria permanecem no rodapé.

HTML: `dist/sicorp_comparador_orcamento_v4.4.0-rc.20.html`. SHA-256: `fe75bc7f44acb2c441d0a5d065a3bc6789270284966578797f7cb279611a094c`.

Validação local no HTML final, pelo comando `npm run check`:

| Verificação | Resultado |
| --- | --- |
| Integridade da baseline e paridade/sintaxe do HTML | Aprovadas |
| Testes de domínio, leitores, integração e exportação | 363 aprovados |
| Fluxos originais no navegador, incluindo persistência e reinício | 103 aprovados |
| Casos agrupados de arquivo | 27 aprovados |
| Fluxos agrupados no navegador | 27 aprovados |
| Layout das revisões, orçamento e bases | 84 combinações aprovadas |

As combinações de layout incluem duas abas de orçamento, duas abas de bases (incluindo conflitos), sete tamanhos de tela e suas respectivas categorias. Verificam margens visíveis e simétricas, aproveitamento superior a 85% da área, alcance das últimas linhas e das barras nos dois eixos, explicação sem compressão e fechamento das janelas. O ensaio também verifica a abertura sem nenhum diálogo e a disponibilidade imediata da tela inicial. Capturas da abertura e das duas revisões estão em `qa/evidence/rc20/`. A execução utilizou Linux, Node.js 24.22.1, Playwright 1.62.1 e Chromium 141.0.7390.0, sem rede no navegador.

Os fontes de cálculo, as regras e as planilhas não foram alterados. A baseline e os HTML e evidências anteriores foram preservados. Homologação por pessoa e execução no Windows permanecem pendentes. O workflow registra separadamente o resultado de CI do commit publicado. A versão permanece candidata, embora o diálogo inicial tenha sido removido.
