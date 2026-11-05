// Pure instructions and gates. The controller only reads application snapshots.
(() => {
  const task = (id, target, title, text, ready = false, mode = 'confirm') => ({id, target, title, text, ready, mode, group: ['budget:categories','review:categories','project:preview','base:preview','base:obtain','project:hover','base:hover','budget:lines','review:lines'].includes(id)});
  const mapped = value => value !== '' && value != null;
  const mappingReady = (kind, mapping = {}) => (kind === 'project'
    ? ['code','source','description','unit','quantity','totalWithBdi'].every(f=>mapped(mapping[f])) && ['priceWithoutBdi','bdi','priceWithBdi'].filter(f=>mapped(mapping[f])).length>=2
    : ['code','description','unit','price'].every(f=>mapped(mapping[f])));
  function steps(s) {
    if (s.busy) return [task('wait', '#loadingTitle', 'Aguarde o processamento', 'A orientação continua quando a leitura, conversão ou análise terminar. Não é necessário clicar novamente.')];
    if (s.dialog === 'budgetAuditDialog') return [
      task('budget:categories', '#budgetAuditCards', 'Confira as categorias', 'Impedimentos exigem correção. Erros e avisos permitem continuar, mas precisam de análise. Consulte também as linhas desconsideradas.', true),
      task('budget:lines', '#budgetAuditGroups', 'Consulte uma ocorrência', s.findingCount ? 'Escolha uma categoria e uma linha. Leia a explicação abaixo; use as barras para consultar a tabela. Depois avance nesta orientação.' : 'As ocorrências são apresentadas nesta área. Este orçamento não tem ocorrências a consultar. Quando houver registros, escolha uma categoria e uma linha para ler a explicação abaixo.', true),
      task('budget:decision', s.auditCanProceed ? '#budgetAuditProceedBtn' : '#budgetAuditReturnBtn', s.auditCanProceed ? 'Decida após a revisão' : 'Corrija os impedimentos', s.auditCanProceed ? 'Se concluiu a revisão, use Continuar para as bases. Para ajustar o arquivo ou o mapeamento, use Retornar para corrigir.' : 'Use Retornar para corrigir. Ajuste o arquivo ou o mapeamento e refaça a conferência; o tutorial acompanhará a nova configuração.')
    ];
    if (s.dialog === 'reviewDialog') return [
      task('review:categories', '#reviewTreatmentCards', 'Revise esta base', 'Confira as categorias, as exclusões e os conflitos. Preços inválidos e identidades incompletas ficam fora da comparação.', true),
      task('review:lines', '#reviewGroups', 'Consulte uma ocorrência', s.reviewCount ? 'Escolha uma categoria, clique em uma linha e leia sua explicação abaixo. Referências da mesma fonte, código e descrição com unidade ou preço divergentes geram conflitos.' : 'As ocorrências da base são apresentadas nesta área. Esta configuração não tem ocorrências a consultar. Quando houver registros, selecione uma linha para ler a explicação abaixo.', true),
      task('review:decision', s.reviewConfirm ? '#reviewConfirmAddBtn' : '#reviewReturnBtn', s.reviewConfirm ? 'Confirme a inclusão se estiver de acordo' : 'Retorne à configuração', s.reviewConfirm ? 'Adicionar base incorpora esta configuração por sua decisão. Conflitos continuam bloqueando a comparação; Fechar permite voltar sem incluir.' : 'Feche a revisão para ajustar a configuração. Sem referências válidas, a base não pode ser adicionada.')
    ];
    if (s.dialog === 'resultColumnsDialog') return [task('columns', '#resultColumnsGrid [data-result-column-row]', 'Escolha e ordene as colunas', 'Mantenha pelo menos uma coluna. Use Aplicar para confirmar ou Cancelar para retornar. A seleção e a ordem valem para tela, cópia e exportações.')];
    if (s.dialog) return [task('dialog', `#${s.dialog}`, 'Resolva a mensagem do programa', 'Leia a mensagem e decida usando os botões desta janela. O tutorial continuará depois que ela for fechada.')];
    if (s.error) return [task('error', '#errorBox', 'Confira a falha informada', 'O processamento não foi concluído. Corrija ou selecione novamente o arquivo pelos controles do programa. Você pode pausar o tutorial para investigar.')];
    if (s.page === 1) {
      const upload={...task('project:upload', '#projectDropzone', 'Selecione seu orçamento', s.projectId ? 'Seu orçamento já está carregado. Você pode seguir com ele ou selecionar outro arquivo. Linhas e colunas ocultas são ignoradas; fórmulas usam o resultado salvo no arquivo.' : 'Clique aqui ou arraste um XLSX, XLS, CSV ou TXT. Linhas e colunas ocultas são ignoradas; fórmulas usam o resultado salvo no arquivo.', Boolean(s.projectId)),autoAdvance:true};
      if(!s.projectId)return [upload];
      return [upload,
        task('project:sheet', '#projectSheet', 'Confira a aba do orçamento', 'Escolha a aba com os itens detalhados. Confira a pré-visualização antes de prosseguir.', Boolean(s.projectSheet)),
        task('project:header', '#projectHeaderRow', 'Confira a linha do cabeçalho', 'Use a numeração física da planilha, incluindo linhas ocultas ou vazias anteriores.', s.projectHeaderValid),
        task('project:total', '#projectGeneralTotal', 'Informe o total geral', 'Digite o total informado no orçamento. Ele será confrontado com a soma dos itens considerados.', s.totalValid),
        task('project:preview', '#projectPreviewBlock', 'Conheça a pré-visualização', 'Confira os cabeçalhos e os itens da planilha. As letras identificam as colunas.', true),
        task('project:automap', '#projectAutoMapBtn', 'Mapeie as colunas automaticamente', 'Clique em Mapear automaticamente e confira os vínculos sugeridos. Ajuste os que faltarem ou estiverem incorretos pelos campos e pela pré-visualização. Vincule os campos obrigatórios e pelo menos dois componentes: Preço sem BDI, BDI e Preço com BDI.', mappingReady('project',s.projectMapping)),
        task('project:hover', '#projectMappingFieldPool', 'Confira as colunas selecionadas', 'Passe o mouse sobre os campos do mapeamento para ver as colunas selecionadas destacadas na pré-visualização. Confira se cada vínculo corresponde à informação esperada.', true),
        task('project:audit', '#projectNextBtn', 'Inicie a conferência', s.prerequisitesValid ? 'Use Conferir e continuar. Aguarde a revisão efetiva dos itens e dos cálculos.' : 'Revise os campos da configuração. A conferência só pode abrir após atender aos pré-requisitos.')
      ];
    }
    if (s.page === 2) {
      const obtain=task('base:obtain', '#priceSourceCentral', 'Obtenha bases de preços', 'Pesquise a fonte nesta central e abra seu link oficial. Baixe a referência adequada ao mês, à localidade e ao regime do orçamento e depois selecione o arquivo no SICORP. Se já tem as bases, siga para a importação.', true);
      const upload={...task('base:upload', '#baseDropzone', 'Selecione uma base referencial', s.baseId||s.baseCount ? 'Você já tem uma base carregada ou adicionada. Pode seguir com ela ou selecionar outro XLSX, XLS, CSV, TXT ou ORSE.' : 'Selecione ou arraste um XLSX, XLS, CSV, TXT ou ORSE. Aguarde a leitura ou conversão para conferir a configuração.', Boolean(s.baseId||s.baseCount)),autoAdvance:true};
      const added=[
        task('base:list', '#baseListPanel', 'Confira as bases adicionadas', 'Esta lista reúne as configurações incorporadas, com fonte, arquivo, aba e registros válidos. Use as ações da linha para consultar a revisão ou remover uma configuração. Você pode adicionar outras abas e arquivos antes de comparar.', true),
        task('base:audit', '#baseAuditPanel', 'Confira a auditoria de códigos entre bases', 'A auditoria verifica códigos repetidos na mesma fonte. Repetições compatíveis podem permanecer; duplicidades bloqueantes exigem correção antes de comparar. Use Ver detalhes das ocorrências quando disponível.', true)
      ];
      if (s.conflicts) return [obtain,upload,...added,task('base:conflicts', '#conflictMessage', 'Resolva os conflitos entre bases', 'Consulte os detalhes e as revisões na lista de bases. Corrija a origem ou remova a configuração conflitante. O tutorial não libera a comparação.')];
      if (s.baseCount && !s.configuringBase) return [obtain,upload,...added,task('base:continue', '#basesNextBtn', 'Complete as bases necessárias', 'Adicione outras fontes ou abas pelos controles acima. Quando terminar, use Continuar para comparação. Cada configuração corresponde a uma fonte.')];
      if (!s.baseId) return [obtain,upload];
      return [obtain,upload,
        task('base:sheet', '#baseSheet', 'Escolha a aba da base', 'Selecione a aba que contém os preços de referência desejados.', Boolean(s.baseSheet)),
        task('base:source', '#baseSourceIdentifier', 'Associe a fonte', 'Escolha o identificador usado no orçamento. A busca utiliza fonte e código; confira se a sugestão corresponde ao referencial.', Boolean(s.baseSource)),
        task('base:header', '#baseHeaderRow', 'Confira o cabeçalho da base', 'Informe a linha física e confira os títulos na pré-visualização.', s.baseHeaderValid),
        task('base:preview', '#basePreviewBlock', 'Conheça a pré-visualização da base', 'Confira os cabeçalhos e os registros de referência. As letras identificam as colunas.', true),
        task('base:automap', '#baseAutoMapBtn', 'Mapeie a base automaticamente', 'Clique em Mapear automaticamente. Confira os vínculos de Código, Descrição, Unidade e Preço e ajuste os que faltarem ou estiverem incorretos antes de adicionar a configuração.', mappingReady('base',s.baseMapping)),
        task('base:hover', '#baseMappingFieldPool', 'Confira as colunas da base', 'Passe o mouse sobre os campos do mapeamento para ver as colunas selecionadas destacadas na pré-visualização. Confira os vínculos de Código, Descrição, Unidade e Preço.', true),
        task('base:add', s.baseCanAdd ? '#addBaseBtn' : '#baseReviewBtn', s.baseCanAdd ? 'Abra a revisão da configuração' : 'Confira o que falta nesta base', s.baseCanAdd ? 'Use Adicionar configuração. A base só será incorporada depois da sua confirmação na revisão.' : 'Confira aba, fonte e quatro campos. Se não houver referência válida, use Revisar linhas para entender as exclusões; ajuste ou substitua a base.')
      ];
    }
    const comparison=[
      task('compare:tolerance', '#tolerance', 'Confira a tolerância', 'Esta tolerância classifica diferenças entre preços sem BDI. Ela é distinta da tolerância fixa da conferência do orçamento.', true),
      {...task('compare:run', '#compareBtn', 'Execute a comparação', s.resultCount ? 'Os resultados desta sessão já estão disponíveis. Siga para consultá-los ou use Comparar se desejar executar novamente.' : 'Use Comparar e aguarde os resultados. A presença de bases e a conferência válida são necessárias.', Boolean(s.resultCount)),autoAdvance:true}
    ];
    if(!s.resultCount)return comparison;
    return [...comparison,
      task('result:status', '#summary', 'Interprete os resultados', `${s.resultCount} item(ns) analisado(s). Abaixo, Igual e Acima comparam o preço sem BDI com a referência selecionada. Clique nos cartões para consultar cada categoria.`, true),
      task('result:filters', '#statusFilters', 'Experimente os filtros', 'Selecione categorias ou use a busca. A tela, a cópia e a exportação respeitam estes filtros.', true, 'optional'),
      task('result:columns', '#selectResultColumnsBtn', 'Organize as colunas', 'Abra Selecionar e ordenar colunas se desejar ajustar a tabela e as exportações. A configuração pode ficar salva neste navegador.', true, 'optional'),
      task('result:abc', '#sourceValueChartFilters', 'Consulte a curva ABC', 'A vai até 50% acumulados, B até 80% e C acima de 80%. O item que cruza o limite usa o acumulado após sua inclusão. Experimente os botões se desejar.', true, 'optional'),
      task('result:export', '#exportXlsxBtn', 'Exporte quando desejar', 'Escolha Excel, CSV ou Copiar seleção nos botões ao lado. Confira filtros e colunas. O Excel conserva os destaques; CSV e cópia não conservam estilos.', true, 'finish')
    ];
  }
  globalThis.SicorpTutorialFlow = Object.freeze({steps});
})();
