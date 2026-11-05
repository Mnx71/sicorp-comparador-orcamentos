# SICORP — Sistema de Comparação de Referenciais de Preços

O **SICORP** é um programa que ajuda a **conferir planilhas de orçamento de obras e comparar os preços dos serviços e insumos com bases de referência**.

Seu objetivo é facilitar a identificação de erros, diferenças de preços e informações que merecem atenção durante a análise de um orçamento. Ele organiza os resultados para que a conferência seja mais rápida, clara e consistente.

O programa funciona diretamente no navegador, **sem instalação**. As planilhas são analisadas no próprio computador, sem envio dos arquivos a um servidor.

## O que o SICORP faz?

### 1. Confere os cálculos do orçamento

Ao importar uma planilha orçamentária, o SICORP verifica, entre outros pontos:

- A aplicação do **BDI** sobre os preços;
- O cálculo dos valores totais dos itens e do orçamento;
- Campos obrigatórios ausentes, vazios ou com valores inválidos;
- Possíveis itens duplicados ou com preços diferentes;
- Inconsistências em fórmulas e informações da planilha.

Os resultados são apresentados em uma **revisão organizada por tipo de ocorrência**, com explicações para facilitar a análise.

### 2. Revisa as bases de preços

Antes de utilizá-las na comparação, o programa verifica as bases importadas e aponta, por exemplo, **preços ausentes ou inválidos, informações incompletas e referências conflitantes**.

É possível consultar as ocorrências antes de incorporar cada base à análise.

### 3. Compara os preços com as referências

O SICORP relaciona os itens do orçamento às referências das bases selecionadas e apresenta quatro resultados:

- **Abaixo:** o preço do orçamento é menor que o de referência;
- **Igual:** o preço está dentro da tolerância definida;
- **Acima:** o preço do orçamento é maior que o de referência;
- **Não encontrado:** não foi localizada uma referência correspondente nas bases utilizadas.

A comparação considera os **preços sem BDI** e também destaca diferenças de descrição ou unidade entre orçamento e referência.

### 4. Facilita a consulta dos resultados

Depois da comparação, é possível:

- Filtrar os resultados por categoria e outros critérios;
- Consultar a **Curva ABC** para identificar os itens de maior participação no orçamento;
- Visualizar a distribuição dos resultados por fonte de preços;
- Organizar as colunas e **exportar os resultados para Excel ou CSV**.

### 5. Orienta durante o uso

O programa inclui um **tutorial interativo**, que acompanha as principais etapas de utilização e pode ser acessado novamente quando necessário.

## Como começar

1. **[Baixe o pacote do usuário — SICORP 4.5.0](https://github.com/Mnx71/sicorp-comparador-orcamentos/releases/download/v4.5.0/SICORP_v4.5.0_USUARIO.zip).**
2. Extraia o arquivo ZIP e abra o arquivo **SICORP_v4.5.0.html** no navegador.
3. Importe a planilha de orçamento, confira o mapeamento das colunas e consulte a revisão.
4. Adicione as bases de preços que deseja utilizar e faça a comparação.
5. Consulte, filtre ou exporte os resultados.

## Downloads e orientações

- **[Baixar o SICORP 4.5.0 — pacote do usuário](https://github.com/Mnx71/sicorp-comparador-orcamentos/releases/download/v4.5.0/SICORP_v4.5.0_USUARIO.zip)** — programa e manual em um único ZIP.
- **[Baixar apenas o programa](https://github.com/Mnx71/sicorp-comparador-orcamentos/releases/download/v4.5.0/sicorp_comparador_orcamento_v4.5.0.html)** — arquivo HTML para abrir no navegador.
- **[Manual do Usuário (PDF)](docs/manual/SICORP_Manual_Usuario_v4.5.0.pdf)** — orientações com imagens reais do programa.
- **[Página da versão 4.5.0](https://github.com/Mnx71/sicorp-comparador-orcamentos/releases/tag/v4.5.0)** — todos os arquivos disponíveis.

## Para conhecer os testes e as regras

O projeto também mantém [exemplos de planilhas e um roteiro para verificar o funcionamento do SICORP](testkit/agrupados/LEIA-ME.md), além da [documentação das regras utilizadas na conferência](docs/REGRAS_DE_REFERENCIA.md). Esses materiais registram o trabalho de auditoria das versões anteriores e servem de referência para avaliações complementares.

O SICORP é uma **ferramenta de apoio à análise**. Os resultados devem ser interpretados considerando as características do orçamento e das bases de preços utilizadas.

---

**Desenvolvido pela Coordenação-Geral de Supervisão de Obras (CGSOB), do Departamento de Obras Hídricas e Apoio a Estudos sobre Segurança Hídrica (DOH), da Secretaria Nacional de Segurança Hídrica (SNSH).**
