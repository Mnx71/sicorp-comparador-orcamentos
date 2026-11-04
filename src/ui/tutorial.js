(() => {
  const steps = [
    ['Preparar os arquivos',
      'Use arquivos XLSX, XLS, CSV ou TXT para o orçamento. As bases também aceitam ORSE, com conversão integrada. Confira a fonte e o período dos preços antes de comparar.',
      'Linhas e colunas ocultas são ignoradas. O SICORP usa os resultados salvos das fórmulas e não recalcula a planilha. Este tutorial apenas apresenta orientações: seus arquivos e resultados permanecem na sessão.'],
    ['Importar e mapear o orçamento',
      'Selecione o arquivo, a aba e o número físico da linha do cabeçalho. Associe Código, Fonte, Descrição, Unidade, Quantidade e Total do item às colunas da planilha.',
      'Mapeie pelo menos dois componentes entre Preço sem BDI, BDI e Preço com BDI; o componente não mapeado será derivado dos outros dois. Informe o total geral do orçamento e clique em Conferir e continuar.'],
    ['Conferir o orçamento',
      'Impedimentos bloqueiam o avanço. Erros de cálculo e avisos permitem prosseguir, mas exigem análise. Linhas desconsideradas não entram na comparação. Uma linha sem identidade completa é tratada como linha estrutural.',
      'Selecione uma categoria e uma linha para ler a explicação e a ação recomendada. Os motivos podem ser recolhidos. Role a tabela para consultar linhas e colunas e role o corpo da janela para alcançar o final. Use Retornar para corrigir quando necessário.',
      'A conferência admite R$ 0,01 por item; para o total geral, a tolerância é R$ 0,01 multiplicado pelo número de itens considerado. Essa tolerância é diferente da tolerância configurada na comparação.'],
    ['Adicionar e revisar as bases',
      'Selecione arquivo, aba, fonte associada ao orçamento e cabeçalho. Mapeie Código, Descrição, Unidade e Preço. Cada configuração de base tem uma fonte. No ORSE, confira as abas Insumos e Servicos oferecidas após a conversão.',
      'Revise as exclusões antes de confirmar Adicionar base. Preços vazios, zero, negativos ou inválidos são desconsiderados. Conflitos de unidade ou preço entre referências da mesma fonte, código e descrição bloqueiam a comparação, inclusive quando estão em bases diferentes.'],
    ['Comparar e interpretar',
      'Defina a tolerância da comparação e execute Comparar. Os resultados são Abaixo, Igual, Acima e Não encontrado. A busca começa por fonte e código; a descrição resolve múltiplos candidatos do mesmo código.',
      'Destaques amarelos indicam divergências de descrição ou unidade e não substituem a classificação de preço. Confira a adequação do serviço, da unidade, do período e do regime dos referenciais antes de concluir sua análise.',
      'Na curva ABC, A vai até 50% acumulados, B até 80% e C acima de 80%. O item que cruza o limite é classificado pelo acumulado após sua inclusão; por exemplo, um primeiro item com 60% pertence a B.'],
    ['Filtrar, organizar e exportar',
      'Use os filtros de resultado, busca e curva ABC. Em Selecionar e ordenar colunas, escolha e organize as 17 colunas disponíveis. Essa configuração é usada na tabela, na cópia e nas exportações e pode ficar salva neste navegador.',
      'Exportar seleção em Excel, CSV e Copiar seleção respeitam os filtros e a ordem de colunas. O Excel mantém status e destaques; CSV e cópia não conservam estilos. Confira o arquivo exportado antes de compartilhá-lo.'],
    ['Praticar com o kit agrupado',
      'Em uma nova aba do navegador, importe comparacao-agrupada.xlsx como orçamento: aba 01_Comparacao, cabeçalho 1 e total 3.337,67. Mapeie A:I como Código, Fonte, Descrição, Unidade, Quantidade, Preço sem BDI, BDI, Preço com BDI e Total do item.',
      'Na etapa Bases, importe esse mesmo arquivo e adicione as abas SINAPI e ORSE, cada uma associada à sua fonte. Use cabeçalho 1 e A:D como Código, Descrição, Unidade e Preço. Com tolerância 0,01, espere 19 resultados: 2 Abaixo, 9 Iguais, 2 Acima e 6 Não encontrados.',
      'O tutorial não carrega essa demonstração automaticamente. Feche-o para continuar de onde parou. O manual e o roteiro do kit detalham os demais testes.']
  ];
  const get = id => document.getElementById(id);
  const dialog = get('tutorialDialog');
  let index = 0;
  function render() {
    const [title, ...paragraphs] = steps[index];
    const heading = document.createElement('h3');
    heading.textContent = title; heading.tabIndex = -1;
    const content = get('tutorialContent'); content.replaceChildren(heading);
    for (const text of paragraphs) { const p = document.createElement('p'); p.textContent = text; content.append(p); }
    get('tutorialProgress').textContent = `Etapa ${index + 1} de ${steps.length}`;
    get('tutorialPreviousBtn').disabled = index === 0;
    get('tutorialNextBtn').textContent = index === steps.length - 1 ? 'Concluir' : 'Próximo';
    dialog.scrollTop = 0; heading.focus({preventScroll: true});
  }
  get('tutorialOpenBtn').addEventListener('click', () => { index = 0; dialog.showModal(); render(); });
  get('tutorialCloseBtn').addEventListener('click', () => dialog.close());
  get('tutorialPreviousBtn').addEventListener('click', () => { if (index > 0) { index--; render(); } });
  get('tutorialNextBtn').addEventListener('click', () => {
    if (index === steps.length - 1) dialog.close(); else { index++; render(); }
  });
})();
