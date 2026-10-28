# Referência histórica

O arquivo `SICORP_v4.3.0_RELEASE_FONTE_E_TESTES.zip` foi preservado integralmente como referência para a consolidação da v4.4.

Contém `src/`, `tests/`, `scripts/`, `testkit/`, `docs/`, uma baseline antiga e o HTML distribuído na v4.3.

Extraia-o em uma pasta de trabalho separada. Revise os comandos e os resultados esperados antes de reaproveitar código e testes. O processo de geração antigo não produz o HTML da rc.16.

Exemplos de expectativas históricas que precisam de atualização:

- exportação com 18 colunas; a candidata tem 17 colunas selecionáveis e ordenáveis;
- preço indisponível mantido na base; a candidata desconsidera a linha com preço inválido;
- classificação anterior de linhas do orçamento;
- comportamento anterior a agrupamentos da revisão, novas verificações de BDI e exclusão de linhas/colunas ocultas.

As licenças e os avisos de componentes de terceiros devem ser preservados na consolidação. A presença deste material não define uma licença nova para o projeto.
