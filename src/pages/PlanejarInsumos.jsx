// src/pages/PlanejarInsumos.jsx
import React, { useState, useEffect } from 'react';
import { useAgro } from '../contexts/AgroContext';
import { useProcurement } from '../contexts/ProcurementContext';
import { generateId } from '../utils/helpers';
import { Sprout, ArrowLeft, Plus, Trash, Pencil, ChevronDown, ChevronRight, Beaker, ShieldPlus, Bug, BugOff, Leaf, Target, FlaskConical, Calculator, ShoppingCart, Box, X, AlertTriangle, FileText, RefreshCw, UploadCloud, CheckSquare, Square, Copy } from 'lucide-react';
import Header from '../components/Header';
import { useModal } from '../contexts/ModalContext';

export default function PlanejarInsumos() {
  const { planosSafra, culturas, variedades, taxasPlantio, embalagens, insumosPlan, setInsumosPlan, lockedAreas, setLockedAreas, importedSeeds, setImportedSeeds } = useAgro();
  const { cotacoes, setCotacoes } = useProcurement(); 
  const { showAlert, showConfirm } = useModal();

  // ==========================================
  // ESTADOS GLOBAIS DA TELA
  // ==========================================
  const [currentView, setCurrentView] = useState('list_cards');
  const [selectedSafraId, setSelectedSafraId] = useState(null);
  const [selectedCulturaId, setSelectedCulturaId] = useState(null);
  const [totalAreaAtiva, setTotalAreaAtiva] = useState(0);

  const [expandedItems, setExpandedItems] = useState({});

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportTitulo, setExportTitulo] = useState('');

  // ==========================================
  // ESTADOS DO MODAL DE INSUMO NORMAL
  // ==========================================
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [categoria, setCategoria] = useState('');
  const [nomeProduto, setNomeProduto] = useState('');
  const [modoCalculo, setModoCalculo] = useState('calcular'); 
  const [areaAplicacao, setAreaAplicacao] = useState('');
  const [dose, setDose] = useState('');
  const [aplicacoes, setAplicacoes] = useState('1');
  const [qtdCalculada, setQtdCalculada] = useState(0);
  const [qtdFinal, setQtdFinal] = useState('');
  const [unidade, setUnidade] = useState('Lt');

  const chaveCulturaAtiva = `${selectedSafraId}_${selectedCulturaId}`;
  const insumosDaCulturaAtiva = (insumosPlan || []).filter(i => i.safraId === selectedSafraId && i.culturaId === selectedCulturaId);

  // ==========================================
  // ESTADOS DO ASSISTENTE DE CLONAGEM (WIZARD)
  // ==========================================
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1: Selecionar Cultura, 2: Escolher Itens, 3: Revisão individual
  const [wizardSourceCulturaId, setWizardSourceCulturaId] = useState('');
  const [wizardAvailableItems, setWizardAvailableItems] = useState([]);
  const [wizardSelectedItems, setWizardSelectedItems] = useState([]);
  const [wizardCurrentIndex, setWizardCurrentIndex] = useState(0);

  const culturasComInsumosNaSafra = [...new Set((insumosPlan || []).filter(i => i.safraId === selectedSafraId && i.culturaId !== selectedCulturaId).map(i => i.culturaId))];
  
  // Mapeia os IDs dos itens que a cultura atual já tem (Nome + Categoria iguais)
  const jaImportadosIds = wizardAvailableItems.filter(sourceItem => {
    return insumosDaCulturaAtiva.some(current => 
      current.categoria === sourceItem.categoria && 
      current.nomeProduto.toLowerCase() === sourceItem.nomeProduto.toLowerCase()
    );
  }).map(i => i.id);

  // ==========================================
  // PREPARAÇÃO DOS CARDS DE CULTURAS
  // ==========================================
  const activeCultureCards = [];
  (planosSafra || []).forEach(safra => {
    const culturasArea = {};
    (safra.areas || []).forEach(area => {
      (area.culturas || []).forEach(c => {
        if (c.culturaId && parseFloat(c.areaHa) > 0) {
          culturasArea[c.culturaId] = (culturasArea[c.culturaId] || 0) + parseFloat(c.areaHa);
        }
      });
    });

    Object.entries(culturasArea).forEach(([culturaId, totalArea]) => {
      const culturaInfo = (culturas || []).find(c => c.id === culturaId);
      activeCultureCards.push({
        safraId: safra.id, safraNome: safra.safra, culturaId, culturaNome: culturaInfo?.nome || 'Desconhecida', totalArea
      });
    });
  });

  const abrirPlanejamento = (safraId, culturaId, area) => {
    setSelectedSafraId(safraId); setSelectedCulturaId(culturaId); setTotalAreaAtiva(area);
    setIsSelectionMode(false); setSelectedItems([]); setCurrentView('detail');
  };

  // ==========================================
  // LÓGICA DE ÁREA E CÁLCULOS
  // ==========================================
  useEffect(() => {
    if (modoCalculo === 'calcular') {
      const calc = (parseFloat(areaAplicacao) || 0) * (parseFloat(dose) || 0) * (parseFloat(aplicacoes) || 0);
      setQtdCalculada(calc);
      if (calc > 0 && !editingId) setQtdFinal(calc.toFixed(2));
    }
  }, [areaAplicacao, dose, aplicacoes, modoCalculo, editingId]);

  const abrirModalNovo = () => {
    setEditingId(null); setCategoria(''); setNomeProduto(''); setModoCalculo('calcular');
    setAreaAplicacao((lockedAreas[chaveCulturaAtiva] || totalAreaAtiva).toString()); 
    setDose(''); setAplicacoes('1'); setQtdFinal(''); setUnidade('Lt');
    setIsModalOpen(true);
  };

  const abrirModalEdicao = (insumo, e) => {
    e.stopPropagation(); setEditingId(insumo.id); setCategoria(insumo.categoria);
    setNomeProduto(insumo.nomeProduto); setModoCalculo(insumo.modoCalculo);
    setAreaAplicacao(insumo.areaAplicacao?.toString() || ''); setDose(insumo.dose?.toString() || '');
    setAplicacoes(insumo.aplicacoes?.toString() || '1'); setQtdFinal(insumo.qtdFinal?.toString() || '');
    setUnidade(insumo.unidade); setIsModalOpen(true);
  };

  const handleSalvarInsumo = (e) => {
    e.preventDefault();
    if (!categoria || !nomeProduto.trim() || !qtdFinal) return showAlert("Atenção", "Preencha os campos obrigatórios.", "warning");

    const novoInsumo = {
      id: editingId || generateId(), safraId: selectedSafraId, culturaId: selectedCulturaId,
      categoria, nomeProduto, modoCalculo,
      areaAplicacao: modoCalculo === 'calcular' ? parseFloat(areaAplicacao) : null,
      dose: modoCalculo === 'calcular' ? parseFloat(dose) : null,
      aplicacoes: modoCalculo === 'calcular' ? parseFloat(aplicacoes) : null,
      qtdCalculada: modoCalculo === 'calcular' ? qtdCalculada : null,
      qtdFinal: parseFloat(qtdFinal), unidade
    };

    if (editingId) {
      setInsumosPlan(prev => prev.map(i => i.id === editingId ? novoInsumo : i));
    } else {
      setInsumosPlan(prev => [...prev, novoInsumo]);
      if (!lockedAreas[chaveCulturaAtiva]) setLockedAreas(prev => ({...prev, [chaveCulturaAtiva]: totalAreaAtiva}));
    }
    setIsModalOpen(false);
  };

  const excluirInsumo = (id, nome, e) => {
    e.stopPropagation();
    showConfirm("Excluir Insumo", `Deseja excluir o planejamento de ${nome}?`, () => {
      setInsumosPlan(prev => prev.filter(i => i.id !== id));
      setSelectedItems(prev => prev.filter(i => i !== id));
    }, "danger");
  };

  const handleAtualizarArea = () => {
    const areaAntiga = lockedAreas[chaveCulturaAtiva];
    const areaNova = totalAreaAtiva;
    const razao = areaNova / areaAntiga;

    setInsumosPlan(prev => prev.map(insumo => {
      if (insumo.safraId === selectedSafraId && insumo.culturaId === selectedCulturaId) {
        if (insumo.modoCalculo === 'calcular') {
          const novaAreaApp = (insumo.areaAplicacao / areaAntiga) * areaNova;
          const novaQtdCalc = novaAreaApp * insumo.dose * insumo.aplicacoes;
          const novaQtdFinal = (insumo.qtdFinal / insumo.qtdCalculada) * novaQtdCalc;
          return { ...insumo, areaAplicacao: novaAreaApp, qtdCalculada: novaQtdCalc, qtdFinal: isNaN(novaQtdFinal) ? novaQtdCalc : novaQtdFinal };
        } else {
          return { ...insumo, qtdFinal: insumo.qtdFinal * razao };
        }
      }
      return insumo;
    }));

    setLockedAreas(prev => ({...prev, [chaveCulturaAtiva]: areaNova}));
    showAlert("Sucesso", "Cálculos recalibrados para a nova área!", "success");
  };

  // ==========================================
  // FUNÇÕES DO ASSISTENTE DE IMPORTAÇÃO (WIZARD)
  // ==========================================
  const abrirAssistenteImportacao = () => {
    if (culturasComInsumosNaSafra.length === 0) return showAlert("Aviso", "Nenhuma outra cultura nesta safra possui insumos lançados para clonar.", "warning");
    setWizardStep(1); setWizardSourceCulturaId(''); setWizardAvailableItems([]); setWizardSelectedItems([]); setWizardCurrentIndex(0);
    setIsWizardOpen(true);
  };

  const handleWizardBuscaInsumos = (e) => {
    e.preventDefault();
    if (!wizardSourceCulturaId) return;
    const sourceItems = (insumosPlan || []).filter(i => i.safraId === selectedSafraId && i.culturaId === wizardSourceCulturaId);
    setWizardAvailableItems(sourceItems);
    setWizardStep(2);
  };

  const toggleWizardSelection = (item) => {
    setWizardSelectedItems(prev => prev.some(i => i.id === item.id) ? prev.filter(i => i.id !== item.id) : [...prev, item]);
  };

  const loadWizardItemIntoState = (index) => {
    const item = wizardSelectedItems[index];
    setEditingId(null); // Trata como um insumo NOVO
    setCategoria(item.categoria); setNomeProduto(item.nomeProduto); setModoCalculo(item.modoCalculo);
    // Área é forçada para a área da cultura atual!
    setAreaAplicacao((lockedAreas[chaveCulturaAtiva] || totalAreaAtiva).toString());
    setDose(item.dose?.toString() || ''); setAplicacoes(item.aplicacoes?.toString() || '1'); setUnidade(item.unidade);
    if (item.modoCalculo === 'direta') setQtdFinal(item.qtdFinal?.toString() || ''); else setQtdFinal('');
  };

  const handleWizardStartReview = () => {
    if (wizardSelectedItems.length === 0) return showAlert("Atenção", "Selecione pelo menos um produto para importar.", "warning");
    setWizardCurrentIndex(0);
    loadWizardItemIntoState(0);
    setWizardStep(3);
  };

  const handleWizardSubmitItemReview = (e) => {
    e.preventDefault();
    if (!categoria || !nomeProduto.trim() || !qtdFinal) return showAlert("Atenção", "Preencha os campos obrigatórios.", "warning");

    const novoInsumo = {
      id: generateId(), safraId: selectedSafraId, culturaId: selectedCulturaId,
      categoria, nomeProduto, modoCalculo,
      areaAplicacao: modoCalculo === 'calcular' ? parseFloat(areaAplicacao) : null,
      dose: modoCalculo === 'calcular' ? parseFloat(dose) : null,
      aplicacoes: modoCalculo === 'calcular' ? parseFloat(aplicacoes) : null,
      qtdCalculada: modoCalculo === 'calcular' ? qtdCalculada : null,
      qtdFinal: parseFloat(qtdFinal), unidade
    };

    // Salva o item
    setInsumosPlan(prev => [...prev, novoInsumo]);
    if (!lockedAreas[chaveCulturaAtiva]) setLockedAreas(prev => ({...prev, [chaveCulturaAtiva]: totalAreaAtiva}));

    // Verifica se tem próximo
    if (wizardCurrentIndex + 1 < wizardSelectedItems.length) {
      const nextIndex = wizardCurrentIndex + 1;
      setWizardCurrentIndex(nextIndex);
      loadWizardItemIntoState(nextIndex);
    } else {
      setIsWizardOpen(false);
      showAlert("Sucesso", "Importação do pacote concluída e revisada!", "success");
    }
  };


  // ==========================================
  // FUNÇÃO: IMPORTAR SEMENTES (COM CÁLCULO REAL)
  // ==========================================
  const executarImportacaoSementes = () => {
    const safra = planosSafra.find(s => String(s.id) === String(selectedSafraId));
    if (!safra) return;
    
    let sementesAgrupadas = {};
    let encontrouSementes = false;

    const calcularEmbalagens = (areaHa, taxaId, variedadeId) => {
      const area = parseFloat(areaHa) || 0;
      if (area <= 0 || !variedadeId || !taxaId) return { total: 0, tipo: 'Bag' };
      const taxa = (taxasPlantio || []).find(t => String(t.id) === String(taxaId));
      const varObj = (variedades || []).find(v => String(v.id) === String(variedadeId));
      if (!taxa || !varObj?.embalagemId) return { total: 0, tipo: 'Bag' }; 
      const emb = (embalagens || []).find(e => String(e.id) === String(varObj.embalagemId));
      if (!emb) return { total: 0, tipo: 'Bag' };

      let totalNecessario = 0;
      if (taxa.tipo === 'kg' && emb.tipoUnidade === 'kg') totalNecessario = taxa.kgPorHa * area;
      else if (taxa.tipo === 'sementes_ha' && emb.tipoUnidade === 'sementes') totalNecessario = taxa.sementesPorHa * area;
      else if (taxa.tipo === 'sementes_metro' && emb.tipoUnidade === 'sementes') totalNecessario = (10000 / taxa.espacamento) * taxa.sementesPorMetro * area;
      else return { total: 0, tipo: emb.tipoEmbalagem === 'bag' ? 'Bag' : 'Saca' }; 
      
      return { total: totalNecessario / emb.capacidade, tipo: emb.tipoEmbalagem === 'bag' ? 'Bag' : 'Saca' };
    };

    (safra.areas || []).forEach(area => {
      const cult = (area.culturas || []).find(c => String(c.culturaId) === String(selectedCulturaId));
      if (cult && cult.variedades) {
        cult.variedades.forEach(v => {
          if (v.variedadeId && v.taxaId && parseFloat(v.areaHa) > 0) {
            encontrouSementes = true;
            const calc = calcularEmbalagens(v.areaHa, v.taxaId, v.variedadeId);
            if (calc.total > 0) {
              const varInfo = (variedades || []).find(varCadastrada => String(varCadastrada.id) === String(v.variedadeId));
              const nomeSemente = varInfo ? varInfo.nome : 'Variedade Desconhecida';
              if (!sementesAgrupadas[nomeSemente]) sementesAgrupadas[nomeSemente] = { qtdTotal: 0, unidade: calc.tipo };
              sementesAgrupadas[nomeSemente].qtdTotal += calc.total;
            }
          }
        });
      }
    });

    if (!encontrouSementes || Object.keys(sementesAgrupadas).length === 0) {
      return showAlert("Aviso", "Nenhuma semente configurada (ou faltando taxa/embalagem) para esta cultura na aba Variedades.", "warning");
    }

    const sementesImportadas = Object.entries(sementesAgrupadas).map(([nome, dados]) => ({
      id: generateId(), safraId: selectedSafraId, culturaId: selectedCulturaId, categoria: 'Sementes',
      nomeProduto: nome, modoCalculo: 'direta', qtdFinal: dados.qtdTotal, unidade: dados.unidade,
    }));

    setInsumosPlan(prev => {
      const semSementesAntigas = (prev || []).filter(i => !(String(i.safraId) === String(selectedSafraId) && String(i.culturaId) === String(selectedCulturaId) && i.categoria === 'Sementes'));
      return [...semSementesAntigas, ...sementesImportadas];
    });

    setImportedSeeds(prev => ({...prev, [chaveCulturaAtiva]: true}));
    if (!lockedAreas[chaveCulturaAtiva]) setLockedAreas(prev => ({...prev, [chaveCulturaAtiva]: totalAreaAtiva}));
    showAlert("Sucesso", "Sementes calculadas e importadas com sucesso!", "success");
  };

  const handleClickSementes = () => {
    if (importedSeeds[chaveCulturaAtiva]) showConfirm("Atualizar Sementes", "Ao prosseguir, todas as sementes deste planejamento serão substituídas pelas informações da aba Variedades.", executarImportacaoSementes, "warning");
    else executarImportacaoSementes();
  };

  // ==========================================
  // FUNÇÕES DE SELEÇÃO E EXPORTAÇÃO
  // ==========================================
  const toggleSelectAll = () => {
    if (selectedItems.length === insumosDaCulturaAtiva.length) setSelectedItems([]);
    else setSelectedItems(insumosDaCulturaAtiva.map(i => i.id));
  };

  const toggleSelection = (id) => setSelectedItems(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);

  const handleExportarCotacao = (e) => {
    e.preventDefault();
    if (!exportTitulo.trim()) return showAlert("Atenção", "Dê um nome para a Cotação.", "warning");

    const itensParaExportar = insumosDaCulturaAtiva.filter(i => selectedItems.includes(i.id));
    const itensParaCotacao = itensParaExportar.map(i => ({
      id: generateId(), categoria: i.categoria, nome: i.nomeProduto, quantidade: parseFloat(i.qtdFinal),
      unidade: i.unidade, status: 'Em análise', ofertas: [], ofertaVencedoraId: null
    }));

    const novaCotacao = { id: generateId(), titulo: exportTitulo, data: new Date().toISOString().split('T')[0], status: 'Aberta', itens: itensParaCotacao };
    setCotacoes(prev => [...(prev || []), novaCotacao]);
    setIsExportModalOpen(false); setExportTitulo(''); setIsSelectionMode(false); setSelectedItems([]);
    showAlert("Sucesso", "Lista exportada! Acesse a aba de Cotações para lançar os preços.", "success");
  };

  const areaTravada = lockedAreas[chaveCulturaAtiva];
  const isAreaDivergente = areaTravada && areaTravada !== totalAreaAtiva && insumosDaCulturaAtiva.length > 0;

  const groupedInsumos = insumosDaCulturaAtiva.reduce((acc, insumo) => {
    if (!acc[insumo.categoria]) acc[insumo.categoria] = [];
    acc[insumo.categoria].push(insumo);
    return acc;
  }, {});

  const getCategoriaIcon = (cat) => {
    switch (cat) {
      case 'Herbicidas': return <ShieldPlus size={16} />;
      case 'Fungicidas': return <BugOff size={16} />;
      case 'Inseticidas': return <Bug size={16} />;
      case 'Fertilizantes': return <FlaskConical size={16} />;
      case 'Corretivos': return <Target size={16} />;
      case 'Biológicos': return <Leaf size={16} />;
      case 'Sementes': return <Sprout size={16} />;
      default: return <Box size={16} />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 min-h-screen pt-12 lg:pt-0 pb-32">
      <Header title="Planejar Insumos" />
      <main className="px-4 lg:px-8 py-4 animate-fade-in">
        
        {currentView === 'list_cards' && (
          <div>
            <h2 className="text-xl font-black text-gray-800 mb-6">Selecione a Cultura</h2>
            {activeCultureCards.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-gray-200 shadow-sm">
                <Sprout size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-bold text-gray-800 mb-2">Nenhuma cultura ativa.</h3>
                <p className="text-gray-500 text-sm">Distribua culturas na aba "Planejar Culturas" primeiro.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeCultureCards.map((card, index) => (
                  <div key={`${card.safraId}-${card.culturaId}-${index}`} onClick={() => abrirPlanejamento(card.safraId, card.culturaId, card.totalArea)} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-300 cursor-pointer transition-all flex flex-col group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600 border border-emerald-100"><Beaker size={20} /></div>
                      <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Safra {card.safraNome}</span>
                    </div>
                    <div>
                      <h3 className="font-black text-gray-800 text-xl mb-1">{card.culturaNome}</h3>
                      <p className="text-sm text-gray-500 font-medium mb-4">{card.totalArea.toLocaleString('pt-BR')} ha cultivados</p>
                    </div>
                    <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between text-emerald-600 font-bold text-sm">
                      <span className="flex items-center gap-1.5"><FlaskConical size={16} /> Pacote Tecnológico</span>
                      <ArrowLeft size={16} className="rotate-180 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentView === 'detail' && (
          <div className="animate-fade-in">
            
            <div className="sticky top-0 z-40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4 bg-gray-50/80 backdrop-blur-md p-4 rounded-b-2xl shadow-sm border-b border-gray-200/50 -mx-4 px-4 lg:-mx-8 lg:px-8">
              <div className="flex items-center gap-3">
                <button onClick={() => setCurrentView('list_cards')} className="text-gray-400 hover:text-emerald-600 transition-colors p-2 bg-white rounded-xl shadow-sm border border-gray-100 shrink-0"><ArrowLeft size={20} /></button>
                <div className="flex flex-col">
                  <h2 className="text-lg md:text-xl font-black text-gray-800 flex items-center gap-2">
                    Insumos: {(culturas || []).find(c => c.id === selectedCulturaId)?.nome}
                  </h2>
                  <p className="text-[10px] md:text-xs font-semibold text-gray-400 uppercase tracking-widest">Área Alvo: {totalAreaAtiva.toLocaleString('pt-BR')} ha</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto hide-scrollbar">
                
                {!isSelectionMode ? (
                  <>
                    {insumosDaCulturaAtiva.length > 0 && (
                      <button onClick={() => setIsSelectionMode(true)} className="bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50 p-2 md:px-4 md:py-2.5 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 shrink-0">
                        <FileText size={16} /> <span className="hidden md:block font-bold text-sm">Exportar p/ Cotação</span>
                      </button>
                    )}
                    <button onClick={abrirAssistenteImportacao} className="bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 p-2 md:px-4 md:py-2.5 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 shrink-0">
                      <Copy size={16} /> <span className="hidden md:block font-bold text-sm">Clonar Pacote</span>
                    </button>
                    <button onClick={handleClickSementes} className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 p-2 md:px-4 md:py-2.5 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 shrink-0">
                      <UploadCloud size={16} className={importedSeeds[chaveCulturaAtiva] ? 'text-blue-500' : 'text-gray-400'} /> 
                      <span className="hidden md:block font-bold text-sm">{importedSeeds[chaveCulturaAtiva] ? 'Atualizar Sementes' : 'Importar Sementes'}</span>
                    </button>
                    <button onClick={abrirModalNovo} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-2 md:px-5 md:py-2.5 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 shrink-0">
                      <Plus size={18} /> <span className="hidden md:block text-sm">Insumo</span>
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 animate-fade-in">
                    <button onClick={toggleSelectAll} className="bg-emerald-50 text-emerald-700 font-bold p-2 md:px-4 md:py-2.5 rounded-xl border border-emerald-200 shadow-sm hover:bg-emerald-100 transition-colors flex items-center gap-2 whitespace-nowrap">
                      <CheckSquare size={16} /> {selectedItems.length === insumosDaCulturaAtiva.length ? 'Desmarcar' : 'Selecionar Tudo'}
                    </button>
                    <button onClick={() => {setIsSelectionMode(false); setSelectedItems([]);}} className="bg-white text-gray-500 hover:text-red-500 border border-gray-200 p-2.5 rounded-xl shadow-sm transition-colors" title="Cancelar Seleção">
                      <X size={18} />
                    </button>
                  </div>
                )}

              </div>
            </div>

            {isAreaDivergente && (
              <div className="mb-6 bg-orange-50 border border-orange-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-fade-in">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={24} className="text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-orange-800">Área Divergente Detectada!</h4>
                    <p className="text-sm text-orange-700 mt-1">A área desta cultura foi alterada de <strong>{areaTravada}ha</strong> para <strong>{totalAreaAtiva}ha</strong>.</p>
                  </div>
                </div>
                <button onClick={handleAtualizarArea} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-5 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 shrink-0">
                  <RefreshCw size={18} /> Recalcular Insumos
                </button>
              </div>
            )}

            <div className="space-y-8">
              {Object.keys(groupedInsumos).length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                  <FlaskConical size={32} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">Nenhum insumo planejado para esta cultura.</p>
                </div>
              ) : (
                Object.entries(groupedInsumos).map(([categoriaName, insumosArray]) => (
                  <div key={categoriaName}>
                    <div className="mb-3 px-2 border-b border-gray-200 pb-2 flex items-center gap-2 text-gray-500">
                      {getCategoriaIcon(categoriaName)}
                      <span className="text-xs font-black uppercase tracking-widest">{categoriaName}</span>
                    </div>

                    <div className="space-y-2">
                      {insumosArray.map(insumo => {
                        const isExpanded = expandedItems[insumo.id];
                        const isSelected = selectedItems.includes(insumo.id);

                        return (
                          <div key={insumo.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${isSelected ? 'border-emerald-400 ring-1 ring-emerald-400' : 'border-gray-200 hover:border-emerald-300'}`}>
                            <div onClick={() => isSelectionMode ? toggleSelection(insumo.id) : setExpandedItems(prev => ({...prev, [insumo.id]: !isExpanded}))} className={`p-3 md:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer ${isSelectionMode ? 'hover:bg-emerald-50/50' : 'bg-gray-50/30 hover:bg-gray-50'}`}>
                              <div className="flex items-center gap-3">
                                {isSelectionMode && <div className="shrink-0">{isSelected ? <CheckSquare className="text-emerald-500" size={22}/> : <Square className="text-gray-300" size={22}/>}</div>}
                                {!isSelectionMode && <div className="text-gray-400 shrink-0 hidden md:block">{isExpanded ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}</div>}
                                <div>
                                  <h4 className="font-bold text-gray-800 text-sm md:text-base">{insumo.nomeProduto}</h4>
                                  {!isSelectionMode && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest md:hidden">Clique para detalhes</span>}
                                </div>
                              </div>
                              <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-4 pt-2 border-t border-gray-100 md:border-none md:pt-0">
                                <div className={`border px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${isSelected ? 'bg-emerald-100 border-emerald-200' : 'bg-emerald-50 border-emerald-100'}`}>
                                  <span className="text-sm font-black text-emerald-700">{insumo.qtdFinal.toLocaleString('pt-BR', {maximumFractionDigits: 2})}</span>
                                  <span className="text-xs font-bold text-emerald-600">{insumo.unidade}</span>
                                </div>
                                {!isSelectionMode && (
                                  <div className="flex gap-2">
                                    <button onClick={(e) => abrirModalEdicao(insumo, e)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil size={16}/></button>
                                    <button onClick={(e) => excluirInsumo(insumo.id, insumo.nomeProduto, e)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash size={16}/></button>
                                  </div>
                                )}
                              </div>
                            </div>
                            {isExpanded && !isSelectionMode && (
                              <div className="border-t border-gray-100 bg-white p-4 animate-fade-in flex flex-wrap gap-4 md:gap-8 text-sm">
                                {insumo.modoCalculo === 'direta' ? (
                                  <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-3 py-2 rounded-lg font-bold border border-orange-100"><ShoppingCart size={16} /> Lançamento Direto (Quantidade Manual / Importada)</div>
                                ) : (
                                  <>
                                    <div className="flex flex-col"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Dose / HA</span><span className="font-semibold text-gray-700">{insumo.dose} {insumo.unidade}</span></div>
                                    <div className="flex flex-col"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Aplicações</span><span className="font-semibold text-gray-700">{insumo.aplicacoes}x</span></div>
                                    <div className="flex flex-col"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Área Alvo</span><span className="font-semibold text-gray-700">{insumo.areaAplicacao?.toLocaleString('pt-BR')} ha</span></div>
                                    <div className="flex flex-col border-l border-gray-200 pl-4 md:pl-8"><span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5">Qtd Sistemática</span><span className="font-black text-gray-800">{insumo.qtdCalculada?.toLocaleString('pt-BR', {maximumFractionDigits: 2})} {insumo.unidade}</span></div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {isSelectionMode && selectedItems.length > 0 && (
              <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in w-11/12 md:w-auto">
                <button onClick={() => setIsExportModalOpen(true)} className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base py-4 px-10 rounded-full shadow-[0_10px_25px_-5px_rgba(5,150,105,0.5)] flex items-center justify-center gap-2 border border-emerald-400 transition-transform hover:scale-105">
                  <FileText size={20} /> Exportar {selectedItems.length} Itens para Cotação
                </button>
              </div>
            )}

          </div>
        )}
      </main>

      {/* ========================================== */}
      {/* MODAL NORMAL: ADICIONAR / EDITAR INSUMO  */}
      {/* ========================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <h3 className="font-black text-gray-800 text-xl flex items-center gap-2"><FlaskConical className="text-emerald-600"/> {editingId ? 'Editar Insumo' : 'Novo Insumo'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="bg-gray-100 text-gray-500 p-2 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"><X size={20}/></button>
            </div>
            <form onSubmit={handleSalvarInsumo} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Categoria *</label>
                  <select value={categoria} onChange={e => setCategoria(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none" required>
                    <option value="" disabled>Selecione...</option>
                    <option value="Sementes">Sementes</option>
                    <option value="Herbicidas">Herbicidas</option>
                    <option value="Fungicidas">Fungicidas</option>
                    <option value="Inseticidas">Inseticidas</option>
                    <option value="Fertilizantes">Fertilizantes</option>
                    <option value="Corretivos">Corretivos</option>
                    <option value="Biológicos">Biológicos</option>
                    <option value="Outros Insumos">Outros Insumos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Nome do Produto *</label>
                  <input type="text" value={nomeProduto} onChange={e => setNomeProduto(e.target.value)} placeholder="Ex: Roundup WG" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none" required />
                </div>
              </div>

              <div className="bg-gray-100 p-1 rounded-xl flex">
                <button type="button" onClick={() => setModoCalculo('calcular')} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${modoCalculo === 'calcular' ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100' : 'text-gray-500 hover:text-gray-700'}`}><Calculator size={14} /> Calcular Demanda</button>
                <button type="button" onClick={() => setModoCalculo('direta')} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${modoCalculo === 'direta' ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100' : 'text-gray-500 hover:text-gray-700'}`}><ShoppingCart size={14} /> Compra Direta</button>
              </div>

              {modoCalculo === 'calcular' && (
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 space-y-4 animate-fade-in">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Área (ha)</label>
                      <input type="number" step="0.01" value={areaAplicacao} onChange={e => setAreaAplicacao(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg p-2.5 font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none text-center" required />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Dose/ha</label>
                      <input type="number" step="0.001" value={dose} onChange={e => setDose(e.target.value)} placeholder="0.0" className="w-full bg-white border border-gray-200 rounded-lg p-2.5 font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none text-center" required />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Aplicações</label>
                      <input type="number" value={aplicacoes} onChange={e => setAplicacoes(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg p-2.5 font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none text-center" required />
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-emerald-200 pt-3">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest">Necessidade Calculada:</span>
                    <span className="text-lg font-black text-emerald-600 bg-white px-3 py-1 rounded-md shadow-sm border border-emerald-100">{qtdCalculada.toLocaleString('pt-BR', {maximumFractionDigits: 2})} <span className="text-xs font-bold text-emerald-500">{unidade}</span></span>
                  </div>
                </div>
              )}

              <div className="border-t border-gray-100 pt-4">
                <div className="flex gap-4">
                  <div className="flex-[2]">
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Qtd Final de Compra *</label>
                    <input type="number" step="0.01" value={qtdFinal} onChange={e => setQtdFinal(e.target.value)} placeholder="Ex: 200" className="w-full bg-white border-2 border-emerald-200 rounded-xl p-3 font-black text-gray-800 focus:border-emerald-500 outline-none text-lg" required />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Medida *</label>
                    <select value={unidade} onChange={e => setUnidade(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none h-[52px]">
                      <option value="Lt">Lt</option><option value="Kg">Kg</option><option value="Ton">Ton</option><option value="Dose">Dose</option><option value="Pct">Pct</option><option value="Bag">Bag</option><option value="Saca">Saca</option><option value="Un">Un</option>
                    </select>
                  </div>
                </div>
              </div>
              <button type="submit" className="w-full mt-4 bg-emerald-600 text-white font-black py-4 rounded-xl hover:bg-emerald-700 shadow-md transition-all">{editingId ? 'Salvar Alterações' : 'Gravar Insumo'}</button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: ASSISTENTE DE IMPORTAÇÃO (WIZARD) */}
      {/* ========================================== */}
      {isWizardOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <h3 className="font-black text-blue-800 text-xl flex items-center gap-2"><Copy className="text-blue-600"/> Clonar Pacote Tecnológico</h3>
              <button onClick={() => setIsWizardOpen(false)} className="bg-gray-100 text-gray-500 p-2 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"><X size={20}/></button>
            </div>

            {/* PASSO 1: Escolher Cultura de Origem */}
            {wizardStep === 1 && (
              <form onSubmit={handleWizardBuscaInsumos} className="space-y-6 animate-fade-in">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-sm text-blue-800 font-medium">Selecione uma cultura desta safra para importar o pacote de insumos (herbicidas, adubos, etc) para a área atual.</p>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Importar da Cultura:</label>
                  <select value={wizardSourceCulturaId} onChange={e => setWizardSourceCulturaId(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" required>
                    <option value="" disabled>Selecione a origem...</option>
                    {culturasComInsumosNaSafra.map(cId => {
                      const cName = (culturas || []).find(c => c.id === cId)?.nome || 'Desconhecida';
                      return <option key={cId} value={cId}>{cName}</option>;
                    })}
                  </select>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-xl hover:bg-blue-700 shadow-md transition-all">Buscar Insumos</button>
              </form>
            )}

            {/* PASSO 2: Selecionar os Insumos */}
            {wizardStep === 2 && (
              <div className="animate-fade-in">
                <div className="flex justify-between items-end mb-4">
                  <p className="text-sm font-bold text-gray-600">Selecione o que deseja importar:</p>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{wizardSelectedItems.length} selecionados</span>
                </div>
                
                <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-2 custom-scrollbar border border-gray-100 p-2 rounded-xl bg-gray-50">
                  {wizardAvailableItems.map(item => {
                    const isJaImportado = jaImportadosIds.includes(item.id);
                    const isSelected = wizardSelectedItems.some(i => i.id === item.id);
                    
                    return (
                      <div 
                        key={item.id} 
                        onClick={() => !isJaImportado && toggleWizardSelection(item)} 
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all ${isJaImportado ? 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed' : isSelected ? 'bg-blue-50 border-blue-300 shadow-sm cursor-pointer' : 'bg-white border-gray-200 cursor-pointer hover:border-blue-200'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="shrink-0">
                            {isJaImportado ? <div className="w-5 h-5 rounded flex items-center justify-center bg-gray-300 text-white"><CheckSquare size={14}/></div> 
                                           : isSelected ? <CheckSquare className="text-blue-500" size={20}/> : <Square className="text-gray-300" size={20}/>}
                          </div>
                          <div>
                            <p className={`font-bold text-sm ${isJaImportado ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{item.nomeProduto}</p>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{item.categoria}</p>
                          </div>
                        </div>
                        {isJaImportado && <span className="text-[10px] font-black text-gray-500 bg-gray-200 px-2 py-1 rounded-md uppercase tracking-widest">Já Importado</span>}
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2 mt-6">
                  <button onClick={() => setWizardStep(1)} className="p-4 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl font-bold transition-all">Voltar</button>
                  <button onClick={handleWizardStartReview} className="flex-1 bg-blue-600 text-white font-black py-4 rounded-xl hover:bg-blue-700 shadow-md transition-all">Avançar para Revisão</button>
                </div>
              </div>
            )}

            {/* PASSO 3: Revisão Individual */}
            {wizardStep === 3 && (
              <div className="animate-fade-in">
                <div className="bg-orange-50 border border-orange-200 p-3 rounded-xl mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-orange-700 font-bold text-sm">
                    <Target size={18} />
                    <span>Revisando:</span>
                  </div>
                  <span className="font-black text-orange-800 bg-white px-3 py-1 rounded-lg shadow-sm border border-orange-100">
                    {wizardCurrentIndex + 1} de {wizardSelectedItems.length}
                  </span>
                </div>

                <form onSubmit={handleWizardSubmitItemReview} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Categoria</label>
                      <input type="text" value={categoria} readOnly className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 font-bold text-gray-600 outline-none cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Nome do Produto</label>
                      <input type="text" value={nomeProduto} readOnly className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 font-bold text-gray-600 outline-none cursor-not-allowed" />
                    </div>
                  </div>

                  {modoCalculo === 'calcular' ? (
                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 text-blue-700">Área (ha) Atual</label>
                          <input type="number" value={areaAplicacao} readOnly className="w-full bg-blue-100/50 border border-blue-200 rounded-lg p-2.5 font-bold text-gray-800 outline-none text-center cursor-not-allowed" title="A área já foi ajustada para o talhão atual" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Dose/ha</label>
                          <input type="number" step="0.001" value={dose} onChange={e => setDose(e.target.value)} className="w-full bg-white border border-blue-200 rounded-lg p-2.5 font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none text-center shadow-sm" required />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Aplicações</label>
                          <input type="number" value={aplicacoes} onChange={e => setAplicacoes(e.target.value)} className="w-full bg-white border border-blue-200 rounded-lg p-2.5 font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none text-center shadow-sm" required />
                        </div>
                      </div>
                    </div>
                  ) : (
                     <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-center justify-center gap-2 text-sm font-bold text-orange-700">
                       <ShoppingCart size={16} /> Lançamento Direto (Confirme a quantidade abaixo)
                     </div>
                  )}

                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex gap-4">
                      <div className="flex-[2]">
                        <label className="block text-[11px] font-bold text-blue-600 uppercase tracking-widest mb-1.5">CONFIRME A QTD FINAL *</label>
                        <input type="number" step="0.01" value={qtdFinal} onChange={e => setQtdFinal(e.target.value)} className="w-full bg-white border-2 border-blue-300 rounded-xl p-3 font-black text-blue-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 outline-none text-lg shadow-inner" required />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Medida</label>
                        <input type="text" value={unidade} readOnly className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 font-bold text-gray-600 outline-none h-[52px] cursor-not-allowed" />
                      </div>
                    </div>
                  </div>
                  
                  <button type="submit" className="w-full mt-4 bg-blue-600 text-white font-black py-4 rounded-xl hover:bg-blue-700 shadow-[0_5px_15px_-3px_rgba(37,99,235,0.4)] transition-transform hover:-translate-y-1 flex items-center justify-center gap-2">
                    <CheckSquare size={20} /> 
                    {wizardCurrentIndex + 1 === wizardSelectedItems.length ? 'Finalizar Importação' : 'Confirmar e Ir para Próximo'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: EXPORTAR PARA COTAÇÃO */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-gray-800 text-xl flex items-center gap-2"><FileText className="text-emerald-600"/> Enviar para Compras</h3>
              <button onClick={() => setIsExportModalOpen(false)} className="bg-gray-100 text-gray-500 p-2 rounded-full hover:bg-red-50 hover:text-red-500"><X size={20}/></button>
            </div>
            <form onSubmit={handleExportarCotacao} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Título da Cotação *</label>
                <input type="text" value={exportTitulo} onChange={e => setExportTitulo(e.target.value)} placeholder="Ex: Insumos Soja 2026" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none" required />
              </div>
              <p className="text-sm text-gray-500 font-medium">Os <strong>{selectedItems.length} insumos selecionados</strong> serão enviados para a aba de Cotações.</p>
              <button type="submit" className="w-full mt-4 bg-emerald-600 text-white font-black py-4 rounded-xl hover:bg-emerald-700 shadow-md transition-all">Confirmar Exportação</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}