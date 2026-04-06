// src/pages/PlanejarVariedades.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useAgro } from '../contexts/AgroContext';
import { generateId } from '../utils/helpers';
import { Sprout, Calculator, ArrowLeft, Trash, Filter, CheckSquare, Square, X, Package, Map, FileText } from 'lucide-react';
import Header from '../components/Header';
import { useModal } from '../contexts/ModalContext';
import ModalExportPdfPlantio from '../components/ModalExportPdfPlantio';

export default function PlanejarVariedades() {
  const { talhoes, culturas, variedades, taxasPlantio, embalagens, planosSafra, setPlanosSafra } = useAgro();
  const { showAlert } = useModal();

  // ==========================================
  // ESTADOS GLOBAIS
  // ==========================================
  const [currentView, setCurrentView] = useState('list_cards');
  const [selectedSafraId, setSelectedSafraId] = useState(null);
  const [selectedCulturaIds, setSelectedCulturaIds] = useState([]); // ARRAY DE CULTURAS
  const [culturasSelecionadas, setCulturasSelecionadas] = useState([]); // Controle múltiplo nos cards

  const [editVarConfig, setEditVarConfig] = useState({}); 
  const [selectionMode, setSelectionMode] = useState(null); 
  const [loteSelecionados, setLoteSelecionados] = useState([]); 
  const [filtroVariedade, setFiltroVariedade] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});

  const [isModalVarOpen, setIsModalVarOpen] = useState(false);
  const [loteVarId, setLoteVarId] = useState('');
  const [isModalTaxaOpen, setIsModalTaxaOpen] = useState(false);
  const [loteTaxaId, setLoteTaxaId] = useState('');
  
  // Controles de Visualização e Exportação
  const [showTaxaBags, setShowTaxaBags] = useState(true);
  const [filterSortBy, setFilterSortBy] = useState('nome'); 
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  useEffect(() => {
    const handleSidebarToggle = (e) => {
      if(e.detail && e.detail.isOpen !== undefined){
        setIsSidebarOpen(e.detail.isOpen);
      }
    };
    window.addEventListener('sidebar-toggled', handleSidebarToggle);
    return () => window.removeEventListener('sidebar-toggled', handleSidebarToggle);
  }, []);

  // ==========================================
  // O MOTOR DE BUSCA (EXTRAI OS CARDS ATIVOS)
  // ==========================================
  const getCulturaNome = (id) => (culturas || []).find(c => c.id === id)?.nome || 'Desconhecida';
  const getVariedadeNome = (id) => (variedades || []).find(v => v.id === id)?.nome || 'Semente Deletada';
  const getTaxaNome = (id) => (taxasPlantio || []).find(t => t.id === id)?.nome || 'Sem Taxa';
  
  const getVarColor = (id) => {
    const v = (variedades || []).find(v => v.id === id);
    return v?.cor || '#3b82f6'; 
  };

  const activeCultureCards = [];
  (planosSafra || []).forEach(safra => {
    const culturasMap = {}; 
    (safra.areas || []).forEach(area => {
      (area.culturas || []).forEach(c => {
        if (!culturasMap[c.culturaId]) culturasMap[c.culturaId] = 0;
        culturasMap[c.culturaId] += (parseFloat(c.areaHa) || 0);
      });
    });

    Object.entries(culturasMap).forEach(([culturaId, totalArea]) => {
      const status = (safra.statusCulturas || {})[culturaId] || 'Ativo';
      if (status === 'Ativo') {
        activeCultureCards.push({
          safraId: safra.id,
          safraNome: safra.safra,
          culturaId: culturaId,
          culturaNome: getCulturaNome(culturaId),
          totalArea
        });
      }
    });
  });

  activeCultureCards.sort((a, b) => b.safraNome.localeCompare(a.safraNome) || b.totalArea - a.totalArea);

  // ==========================================
  // LÓGICA DE ABRIR E SALVAR O PLANEJAMENTO
  // ==========================================
  const toggleCardSelection = (safraId, culturaId) => {
    setCulturasSelecionadas(prev => {
      const isSelected = prev.some(p => p.safraId === safraId && p.culturaId === culturaId);
      if (isSelected) {
        return prev.filter(p => !(p.safraId === safraId && p.culturaId === culturaId));
      } else {
        if (prev.length > 0 && prev[0].safraId !== safraId) {
          showAlert("Atenção", "Selecione culturas da mesma Safra para planejar em conjunto.", "warning");
          return prev;
        }
        return [...prev, { safraId, culturaId }];
      }
    });
  };

  const abrirPlanejamento = (safraId, culturaIdsArray) => {
    const safra = (planosSafra || []).find(s => s.id === safraId);
    if (!safra) return;

    const configInicial = {};
    (safra.areas || []).forEach(area => {
      (area.culturas || []).forEach(c => {
        if (culturaIdsArray.includes(c.culturaId)) {
          
          let varsIniciais = (c.variedades || []).map(v => ({ 
            ...v, 
            tempId: generateId(),
            taxaId: v.taxaId || c.taxaId || '' 
          }));

          const currentSum = varsIniciais.reduce((sum, r) => sum + (parseFloat(r.areaHa) || 0), 0);
          const blockArea = parseFloat(c.areaHa) || 0;
          
          if (blockArea - currentSum > 0.01) {
            varsIniciais.push({ tempId: generateId(), variedadeId: '', taxaId: '', areaHa: (blockArea - currentSum).toFixed(2) });
          }

          configInicial[c.uid] = {
            talhaoId: area.talhaoId,
            culturaId: c.culturaId, // Garante o filtro correto de sementes por divisão
            areaTotal: blockArea,
            variedades: varsIniciais
          };
        }
      });
    });

    setEditVarConfig(configInicial);
    setSelectedSafraId(safraId);
    setSelectedCulturaIds(culturaIdsArray);
    setLoteSelecionados([]); setSelectionMode(null); setFiltroVariedade(null); setCulturasSelecionadas([]);
    setCurrentView('plan_variedades');
  };

  const autoSave = (novoConfig) => {
    setPlanosSafra(prev => prev.map(safra => {
      if (safra.id === selectedSafraId) {
        const novasAreas = (safra.areas || []).map(area => {
          const novasCulturas = (area.culturas || []).map(c => {
            if (selectedCulturaIds.includes(c.culturaId) && novoConfig[c.uid]) {
              const cfg = novoConfig[c.uid];
              const varsLimpas = cfg.variedades
                .filter(v => (v.variedadeId || v.taxaId) && v.areaHa && parseFloat(v.areaHa) > 0)
                .map(v => ({ variedadeId: v.variedadeId, taxaId: v.taxaId, areaHa: parseFloat(v.areaHa) || 0 }));
              return { ...c, variedades: varsLimpas };
            }
            return c;
          });
          return { ...area, culturas: novasCulturas };
        });
        return { ...safra, areas: novasAreas };
      }
      return safra;
    }));
  };

  // ==========================================
  // AUTO-SPLIT MATEMÁTICO E ACOES
  // ==========================================
  const handleUpdateAreaRaw = (uid, tempId, value) => {
    setEditVarConfig(prev => ({
      ...prev, [uid]: { ...prev[uid], variedades: prev[uid].variedades.map(r => r.tempId === tempId ? { ...r, areaHa: value } : r) }
    }));
  };

  const handleAreaBlur = (uid, tempId, currentVal) => {
    setEditVarConfig(prev => {
      const config = prev[uid];
      const maxArea = parseFloat(config.areaTotal) || 0;
      const rows = config.variedades;

      const somaOutros = rows.filter(r => r.tempId !== tempId).reduce((acc, r) => acc + (parseFloat(r.areaHa) || 0), 0);
      let val = parseFloat(currentVal) || 0;

      if (val + somaOutros > maxArea) {
        val = maxArea - somaOutros;
        showAlert("Atenção", "A área foi reajustada para não exceder o tamanho alocado.", "warning");
      }

      let novasLinhas = rows.map(r => r.tempId === tempId ? { ...r, areaHa: val > 0 ? val.toFixed(2) : '' } : r);
      const somaFinal = novasLinhas.reduce((acc, r) => acc + (parseFloat(r.areaHa) || 0), 0);
      const diff = maxArea - somaFinal;

      if (diff > 0.01) {
        novasLinhas.push({ tempId: generateId(), variedadeId: '', taxaId: '', areaHa: diff.toFixed(2) });
      }

      const newState = { ...prev, [uid]: { ...config, variedades: novasLinhas } };
      autoSave(newState);
      return newState;
    });
  };

  const handleUpdateSelect = (uid, tempId, field, value) => {
    setEditVarConfig(prev => {
      const config = prev[uid];
      const newState = { ...prev, [uid]: { ...config, variedades: config.variedades.map(r => r.tempId === tempId ? { ...r, [field]: value } : r) } };
      autoSave(newState); return newState;
    });
  };

  const handleRemoveVarRow = (uid, tempId) => {
    setEditVarConfig(prev => {
      const config = prev[uid];
      const rows = config.variedades;
      
      if (rows.length === 1) {
        const newState = { ...prev, [uid]: { ...config, variedades: [{ ...rows[0], variedadeId: '', taxaId: '', areaHa: config.areaTotal }] } };
        autoSave(newState); return newState;
      }

      const indexToRemove = rows.findIndex(r => r.tempId === tempId);
      if (indexToRemove === -1) return prev;

      const areaDevolvida = parseFloat(rows[indexToRemove].areaHa) || 0;
      const indexRecebedor = indexToRemove > 0 ? indexToRemove - 1 : indexToRemove + 1;

      const novasLinhas = rows.map((r, i) => {
        if (i === indexRecebedor) return { ...r, areaHa: ((parseFloat(r.areaHa) || 0) + areaDevolvida).toFixed(2) };
        return r;
      }).filter(r => r.tempId !== tempId);

      const newState = { ...prev, [uid]: { ...config, variedades: novasLinhas } };
      autoSave(newState); return newState;
    });
  };

  const handleToggleLote = (uid) => setLoteSelecionados(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);

  const confirmarModalLote = (tipo) => {
    const valueToApply = tipo === 'variedades' ? loteVarId : loteTaxaId;
    if (!valueToApply) return;

    setEditVarConfig(prev => {
      const newState = { ...prev };
      loteSelecionados.forEach(uid => {
        newState[uid] = {
          ...newState[uid],
          variedades: newState[uid].variedades.map(r => {
            const field = tipo === 'variedades' ? 'variedadeId' : 'taxaId';
            if (valueToApply === 'nenhuma') {
              if (filtroVariedade && r.variedadeId === filtroVariedade) return { ...r, [field]: '' };
              if (!filtroVariedade) return { ...r, [field]: '' };
            } else {
              if (filtroVariedade && r.variedadeId === filtroVariedade) return { ...r, [field]: valueToApply };
              if (!filtroVariedade) return { ...r, [field]: valueToApply };
            }
            return r;
          })
        };
      });
      autoSave(newState); 
      return newState;
    });
    
    setLoteSelecionados([]); 
    if (tipo === 'variedades') { setLoteVarId(''); setIsModalVarOpen(false); }
    else { setLoteTaxaId(''); setIsModalTaxaOpen(false); }
    
    if (filtroVariedade) setFiltroVariedade(null);
  };

  const calcularEmbalagens = (areaHa, taxaId, variedadeId) => {
    if (!areaHa) return { total: 0, tipo: '', erro: 'SEM ÁREA' };
    if (!variedadeId) return { total: 0, tipo: '', erro: 'FALTA SEMENTE' };
    if (!taxaId) return { total: 0, tipo: '', erro: 'FALTA TAXA' };
    
    const taxa = (taxasPlantio || []).find(t => t.id === taxaId);
    const varObj = (variedades || []).find(v => v.id === variedadeId);
    
    if (!taxa) return { total: 0, tipo: '', erro: 'TAXA EXCLUÍDA' };
    if (!varObj?.embalagemId) return { total: 0, tipo: '', erro: 'VINCULE EMBALAGEM' }; 
    
    const emb = (embalagens || []).find(e => e.id === varObj.embalagemId);
    if (!emb) return { total: 0, tipo: '', erro: 'EMB. EXCLUÍDA' };

    let totalNecessario = 0;
    
    if (taxa.tipo === 'kg' && emb.tipoUnidade === 'kg') {
      totalNecessario = taxa.kgPorHa * areaHa;
    } else if (taxa.tipo === 'sementes_ha' && emb.tipoUnidade === 'sementes') {
      totalNecessario = taxa.sementesPorHa * areaHa;
    } else if (taxa.tipo === 'sementes_metro' && emb.tipoUnidade === 'sementes') {
      const sementesPorHa = (10000 / taxa.espacamento) * taxa.sementesPorMetro;
      totalNecessario = sementesPorHa * areaHa;
    } else {
      return { total: 0, tipo: '', erro: 'UNIDADE INCOMPATÍVEL' }; 
    }
    
    return { total: totalNecessario / emb.capacidade, tipo: emb.tipoEmbalagem === 'bag' ? 'Bags' : 'Sacas', erro: null };
  };

  const getResumoEdicao = () => {
    const resumo = {};
    let areaTotalPlanejada = 0;
    let areaTotalLivre = 0;

    Object.values(editVarConfig).forEach((config) => {
      config.variedades.forEach(r => {
        const val = parseFloat(r.areaHa) || 0;
        if (r.variedadeId) {
          if (!resumo[r.variedadeId]) resumo[r.variedadeId] = { ha: 0, embalagens: 0, tipoEmb: '' };
          
          resumo[r.variedadeId].ha += val;
          areaTotalPlanejada += val;

          const calcEmb = calcularEmbalagens(val, r.taxaId, r.variedadeId);
          if (!calcEmb.erro && calcEmb.total > 0) {
            resumo[r.variedadeId].embalagens += calcEmb.total;
            resumo[r.variedadeId].tipoEmb = calcEmb.tipo; 
          }
        } else {
          areaTotalLivre += val;
        }
      });
    });
    
    const lista = Object.entries(resumo).map(([id, data]) => ({ id, ...data }));
    return { lista, areaTotalPlanejada, areaTotalLivre };
  };
  return (
    <div className={`flex flex-col bg-gray-50 font-sans text-gray-800 ${currentView === 'plan_variedades' ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      {currentView === 'list_cards' && <Header title="Planejar Variedades e Taxas" />}
      
      <main className={`animate-fade-in ${currentView === 'plan_variedades' ? 'h-full flex flex-col' : 'px-4 lg:px-8 py-4'}`}>
        
        {/* VIEW 1: CARDS SLIM DE CULTURAS ATIVAS */}
        {currentView === 'list_cards' && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-6 px-2">Painel de Culturas Ativas</h2>
            
            {activeCultureCards.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-gray-200 shadow-sm">
                <Sprout size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-bold text-gray-800 mb-2">Nenhuma cultura ativa no momento.</h3>
                <p className="text-gray-500 text-sm">Vá até o menu "Planejar Culturas", crie uma safra e distribua uma cultura para ela aparecer aqui.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeCultureCards.map((card, index) => {
                  const isSelected = culturasSelecionadas.some(c => c.safraId === card.safraId && c.culturaId === card.culturaId);
                  
                  return (
                    <div 
                      key={`${card.safraId}-${card.culturaId}-${index}`} 
                      onClick={() => toggleCardSelection(card.safraId, card.culturaId)} 
                      className={`bg-white p-5 rounded-2xl border shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col group ${isSelected ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50/20' : 'border-gray-100 hover:border-blue-200'}`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className={`p-2.5 rounded-xl border transition-all ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50/50 text-blue-500 border-blue-100/50'}`}>
                          <Sprout size={20} />
                        </div>
                        <span className="text-[10px] font-semibold text-gray-400 tracking-wider uppercase">
                          Safra {card.safraNome}
                        </span>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-gray-800 text-xl mb-1">{card.culturaNome}</h3>
                        <p className="text-sm text-gray-500 font-medium mb-4">{card.totalArea.toLocaleString('pt-BR')} ha liberados</p>
                      </div>

                      <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between font-medium text-sm">
                        <span className={`flex items-center gap-1.5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}>
                          {isSelected ? <CheckSquare size={16} /> : <Square size={16} />} 
                          Selecionar
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* BOTÃO FLUTUANTE DE CONFIRMAÇÃO DE MÚLTIPLAS CULTURAS */}
            {culturasSelecionadas.length > 0 && (
              <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[80] animate-fade-in">
                <button 
                  onClick={() => abrirPlanejamento(culturasSelecionadas[0].safraId, culturasSelecionadas.map(c => c.culturaId))} 
                  className="bg-gray-800 hover:bg-gray-900 text-white font-black text-sm py-4 px-8 rounded-full shadow-2xl flex items-center gap-2 border-2 border-gray-600 transition-transform active:scale-95 whitespace-nowrap"
                >
                  <Map size={20} /> Planejar {culturasSelecionadas.length} Cultura{culturasSelecionadas.length > 1 ? 's' : ''}
                </button>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: DISTRIBUIÇÃO FLAT E FILTROS */}
        {currentView === 'plan_variedades' && selectedSafraId && selectedCulturaIds.length > 0 && (
          (() => {
            const safra = (planosSafra || []).find(s => s.id === selectedSafraId);
            const culturaNome = selectedCulturaIds.map(getCulturaNome).join(' + ');
            const resumoDinamico = getResumoEdicao();
            const todosUids = Object.keys(editVarConfig);

            const totalGeralEmbalagens = resumoDinamico.lista.reduce((acc, item) => acc + (item.embalagens || 0), 0);
            const tipoEmbGeral = resumoDinamico.lista.find(i => i.embalagens > 0)?.tipoEmb || '';

            const groupedAreas = Object.entries(editVarConfig).reduce((acc, [uid, config]) => {
              const talhao = (talhoes || []).find(t => t.id === config.talhaoId);
              if (!talhao) return acc;
              const retiro = talhao.retiro?.trim() || 'SEM RETIRO';
              if (!acc[retiro]) acc[retiro] = { totalArea: 0, items: [] };
              acc[retiro].items.push({ uid, config, talhao });
              acc[retiro].totalArea += (parseFloat(config.areaTotal) || 0);
              return acc;
            }, {});

            return (
              <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
                
                {/* CABEÇALHO */}
                <div className="shrink-0 flex flex-row items-center justify-between gap-4 bg-white/95 backdrop-blur-md px-4 py-4 md:px-8 border-b border-gray-100 shadow-sm transition-all z-10">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setCurrentView('list_cards')} className="text-gray-400 hover:text-blue-600 transition-colors p-2 bg-gray-50 rounded-xl hover:bg-gray-100 border border-gray-200 shrink-0">
                      <ArrowLeft size={20} />
                    </button>
                    <div className="flex flex-col">
                      <h2 className="text-lg md:text-xl font-black text-gray-800 flex items-center gap-2 truncate max-w-[200px] md:max-w-none">
                        {culturaNome}
                      </h2>
                      <p className="text-[10px] md:text-xs font-semibold text-gray-400 uppercase tracking-widest">Safra {safra?.safra}</p>
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-2">
                    <button
                      onClick={() => setIsExportModalOpen(true)}
                      className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl border bg-gray-800 text-white hover:bg-gray-900 shadow-sm transition-all"
                      title="Exportar Relatório PDF"
                    >
                      <FileText size={14} /> Exportar
                    </button>
                    <button
                      onClick={() => setShowTaxaBags(prev => !prev)}
                      className="text-xs px-3 py-2 rounded-xl border bg-white hover:bg-gray-50"
                    >
                      {showTaxaBags ? 'Ocultar Taxa/Bags' : 'Mostrar Taxa/Bags'}
                    </button>
                    
                    {!selectionMode ? (
                      <>
                        <button onClick={() => setSelectionMode('variedades')} className="text-blue-600 bg-white border border-blue-200 px-4 py-2.5 rounded-xl shadow-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
                          <Sprout size={16} /> <span className="font-semibold text-sm">Sementes em Lote</span>
                        </button>
                        <button onClick={() => setSelectionMode('taxas')} className="text-orange-600 bg-white border border-orange-200 px-4 py-2.5 rounded-xl shadow-sm hover:bg-orange-50 transition-colors flex items-center justify-center gap-2">
                          <Calculator size={16} /> <span className="font-semibold text-sm">Taxas em Lote</span>
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 animate-fade-in">
                        <button
                          onClick={() => {
                            if (selectionMode === 'variedades') setIsModalVarOpen(true);
                            if (selectionMode === 'taxas') setIsModalTaxaOpen(true);
                          }}
                          disabled={loteSelecionados.length === 0}
                          className={`px-4 py-2.5 rounded-xl font-semibold shadow-sm border transition-all
                            ${selectionMode === 'variedades' ? 'bg-blue-600 text-white border-blue-500 hover:bg-blue-700' : 'bg-orange-600 text-white border-orange-500 hover:bg-orange-700'}
                            ${loteSelecionados.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}
                          `}
                        >
                          Aplicar ({loteSelecionados.length})
                        </button>
                        <button onClick={() => setLoteSelecionados(loteSelecionados.length === todosUids.length ? [] : todosUids)} className={`text-sm font-semibold px-4 py-2.5 rounded-xl border shadow-sm transition-colors whitespace-nowrap ${selectionMode === 'variedades' ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-orange-700 bg-orange-50 border-orange-200'}`}>
                          {loteSelecionados.length === todosUids.length ? 'Desmarcar Tudo' : 'Selecionar Todos'}
                        </button>
                        <button onClick={() => { setSelectionMode(null); setLoteSelecionados([]); }} className="text-gray-500 hover:text-red-500 bg-white border border-gray-200 p-2.5 rounded-xl shadow-sm shrink-0 flex items-center justify-center">
                          <X size={18} /> Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* AREA INFERIOR */}
                <div className="flex-1 overflow-hidden flex flex-col lg:flex-row w-full max-w-[1920px] mx-auto transition-all duration-300">
                  
                  {/* PAINEL LATERAL DE FILTROS E RESUMO */}
                  <div className={`shrink-0 w-full ${isSidebarOpen ? 'lg:w-80' : 'lg:w-[400px] xl:w-[480px]'} lg:h-full lg:overflow-y-auto bg-gray-50/50 lg:border-r border-gray-200 p-4 lg:p-6 transition-all duration-300 custom-scrollbar`}>
                    
                    <div className="sm:hidden mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Ações em Lote</h3>
                      <div className="flex items-center gap-2 w-full">
                        {!selectionMode ? (
                          <>
                            <button onClick={() => setSelectionMode('variedades')} className="flex-1 text-blue-600 bg-white border border-blue-200 py-3 rounded-xl shadow-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
                              <Sprout size={16} /> <span className="font-semibold text-sm">Sementes</span>
                            </button>
                            <button onClick={() => setSelectionMode('taxas')} className="flex-1 text-orange-600 bg-white border border-orange-200 py-3 rounded-xl shadow-sm hover:bg-orange-50 transition-colors flex items-center justify-center gap-2">
                              <Calculator size={16} /> <span className="font-semibold text-sm">Taxas</span>
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 animate-fade-in w-full">
                            <button onClick={() => setLoteSelecionados(loteSelecionados.length === todosUids.length ? [] : todosUids)} className={`flex-1 text-sm font-semibold py-3 rounded-xl border shadow-sm transition-colors whitespace-nowrap ${selectionMode === 'variedades' ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-orange-700 bg-orange-50 border-orange-200'}`}>
                              {loteSelecionados.length === todosUids.length ? 'Desmarcar' : 'Todos'}
                            </button>
                            <button onClick={() => { setSelectionMode(null); setLoteSelecionados([]); }} className="text-gray-500 hover:text-red-500 bg-white border border-gray-200 p-3 rounded-xl shadow-sm shrink-0 flex items-center justify-center">
                              <X size={18} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-3 px-1">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Resumo e Filtros</h3>
                      <button
                        onClick={() => setFiltroVariedade(null)}
                        className={`text-[10px] px-2 py-1 rounded-lg border transition-all flex items-center gap-1 whitespace-nowrap ${!filtroVariedade ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                      >
                        <Filter size={10} className="shrink-0" /> 
                        <span>Total {resumoDinamico.areaTotalPlanejada.toLocaleString('pt-BR')}ha {showTaxaBags && totalGeralEmbalagens > 0 && ` (${totalGeralEmbalagens.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${tipoEmbGeral})`}</span>
                      </button>
                    </div>
                    
                    <div className="flex flex-col gap-2 pb-8">
                      <div className="flex items-center gap-2 px-1 mb-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ordenar por:</span>
                        <button onClick={() => setFilterSortBy('nome')} className={`text-[11px] px-2.5 py-1 rounded-md transition-all font-semibold ${filterSortBy === 'nome' ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}>Nome</button>
                        <button onClick={() => setFilterSortBy('area')} className={`text-[11px] px-2.5 py-1 rounded-md transition-all font-semibold ${filterSortBy === 'area' ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}>Área</button>
                      </div>
                      
                      {resumoDinamico.areaTotalLivre > 0 && (
                        <div className="flex items-center justify-between p-3 rounded-xl border border-dashed border-gray-300 bg-gray-50/80 transition-all">
                          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Ainda Livre</span>
                          <span className="font-black text-sm text-gray-500">{resumoDinamico.areaTotalLivre.toLocaleString('pt-BR')} ha</span>
                        </div>
                      )}

                      {[...resumoDinamico.lista].sort((a, b) => filterSortBy === 'nome' ? getVariedadeNome(a.id).localeCompare(getVariedadeNome(b.id)) : b.ha - a.ha).map((item) => {
                        const corVar = getVarColor(item.id);
                        const isSelected = filtroVariedade === item.id;
                        const nomeVar = getVariedadeNome(item.id);
                        return (
                          <div 
                            key={item.id} 
                            onClick={() => setFiltroVariedade(isSelected ? null : item.id)} 
                            className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all hover:bg-gray-50 group"
                            style={{ border: `1px solid ${isSelected ? corVar : '#e5e7eb'}`, backgroundColor: isSelected ? `${corVar}05` : '#fff' }}
                          >
                            <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                              <Sprout size={16} className="shrink-0" style={{ color: corVar }} />
                              <span className={`text-sm font-semibold truncate ${isSelected ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-800'}`}>{nomeVar}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="font-bold text-sm text-gray-800">{item.ha.toLocaleString('pt-BR')} <span className="font-medium text-xs text-gray-400">ha</span></span>
                              {showTaxaBags && item.embalagens > 0 && (
                                <span className="text-xs font-semibold text-gray-500 flex items-center gap-1.5 bg-gray-50/80 px-2 py-1 rounded-md border border-gray-100 min-w-[70px] justify-center">
                                  <Package size={12} className="text-gray-400 shrink-0" />
                                  {item.embalagens.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} {item.tipoEmb}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  {/* === LISTA DE TALHÕES (SCROLL INDEPENDENTE) === */}
                  <div className="flex-1 lg:h-full lg:overflow-y-auto bg-gray-50 p-4 lg:p-8 custom-scrollbar">
                    <div className="max-w-4xl mx-auto space-y-6 pb-32 lg:pb-16">
                      {Object.entries(groupedAreas).map(([retiro, data]) => {
                        const blocosFiltrados = filtroVariedade 
                          ? data.items.filter(({ config }) => config.variedades.some(r => r.variedadeId === filtroVariedade))
                          : data.items;

                        if (blocosFiltrados.length === 0) return null;

                        return (
                          <div key={retiro} className="mb-6">
                            <div className="mb-4 border-b border-gray-100 pb-3 flex items-center gap-2">
                              <div className="bg-gray-100 p-2 rounded-lg">
                                <Map size={16} className="text-gray-500" />
                              </div>
                              <span className="text-sm font-bold text-gray-600 uppercase tracking-widest">{retiro}</span>
                            </div>

                            <div className="space-y-1.5">
                              {blocosFiltrados.map(({ uid, config, talhao }) => {
                                const rows = config.variedades || [];
                                const isSelected = loteSelecionados.includes(uid);
                                const modeColorText = selectionMode === 'variedades' ? 'text-blue-500' : 'text-orange-500';
                                const modeColorHover = selectionMode === 'variedades' ? 'hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-md' : 'hover:border-orange-400 hover:bg-orange-50/50 hover:shadow-md';

                                return (
                                  <div key={uid} className={`flex flex-col gap-1.5 transition-all ${selectionMode && !isSelected ? 'opacity-80' : ''} ${isSelected ? 'bg-black/5 ring-2 ring-gray-300 p-2 rounded-xl' : ''}`}>
                                    {rows.map((row, index) => {
                                      if (filtroVariedade && row.variedadeId !== filtroVariedade && row.variedadeId !== '') return null;
                                      
                                      const calcEmb = calcularEmbalagens(parseFloat(row.areaHa), row.taxaId, row.variedadeId);

                                      return (
                                        <div key={row.tempId} className="animate-fade-in relative flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-3 w-full">
                                          
                                          <div 
                                            onClick={() => { if(window.innerWidth < 1280) setExpandedRows(prev => ({...prev, [row.tempId]: !prev[row.tempId]})) }}
                                            className="flex flex-row items-center gap-2 w-full xl:w-auto xl:cursor-default cursor-pointer"
                                          >
                                            {/* CHECKBOX LOTE */}
                                            {selectionMode && index === 0 && (
                                              <div className="shrink-0 cursor-pointer hover:scale-110 transition-transform" onClick={(e) => { e.stopPropagation(); handleToggleLote(uid); }}>
                                                {isSelected ? <CheckSquare className={modeColorText} size={24}/> : <Square className="text-gray-300" size={24}/>}
                                              </div>
                                            )}
                                            {selectionMode && index !== 0 && <div className="w-[24px] shrink-0 hidden xl:block"></div>}

                                            {/* TALHÃO NOME */}
                                            <div className={`border rounded-xl px-3 py-3 w-20 xl:w-36 shrink-0 flex items-center justify-center xl:justify-start transition-all ${index === 0 ? 'bg-gray-50 border-gray-200 shadow-sm' : 'bg-transparent border-transparent xl:border-gray-100'}`}>
                                              <span className={`font-bold truncate text-[11px] xl:text-sm ${index === 0 ? 'text-gray-800' : 'text-gray-400'}`}>
                                                {index === 0 ? talhao.nome : '↳ Divisão'}
                                              </span>
                                            </div>

                                            {/* ÁREA */}
                                            <div onClick={(e) => e.stopPropagation()} className={`bg-white border border-gray-200 shadow-sm rounded-xl flex items-center w-24 xl:w-32 shrink-0 transition-all ${selectionMode ? 'opacity-60 bg-gray-50' : 'focus-within:border-gray-500 focus-within:ring-2 focus-within:ring-gray-200'}`}>
                                              <input
                                                type="number"
                                                step="0.01"
                                                value={row.areaHa}
                                                onChange={(e) => handleUpdateAreaRaw(uid, row.tempId, e.target.value)}
                                                onBlur={(e) => handleAreaBlur(uid, row.tempId, e.target.value)}
                                                className={`w-full py-3 pl-2 xl:pl-3 text-center font-bold text-gray-800 text-sm bg-transparent outline-none ${selectionMode ? 'cursor-not-allowed' : ''}`}
                                                disabled={!!selectionMode}
                                              />
                                              <span className="text-[10px] xl:text-[11px] font-semibold text-gray-400 pr-2 xl:pr-3">ha</span>
                                            </div>

                                            {/* SEMENTE */}
                                            <div 
                                              onClick={(e) => { e.stopPropagation(); if(selectionMode) handleToggleLote(uid); }}
                                              className={`bg-white border shadow-sm rounded-xl flex-1 xl:w-64 shrink-0 transition-all overflow-hidden ${selectionMode === 'variedades' ? `cursor-pointer border-gray-300 ${modeColorHover}` : 'border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100'} ${!row.variedadeId ? 'bg-blue-50/50' : ''} ${selectionMode === 'taxas' ? 'opacity-60' : ''}`}
                                              style={{ borderLeft: row.variedadeId ? `4px solid ${getVarColor(row.variedadeId)}` : undefined }}
                                            >
                                              <select
                                                value={row.variedadeId}
                                                onChange={(e) => handleUpdateSelect(uid, row.tempId, 'variedadeId', e.target.value)}
                                                className={`w-full h-full py-3 px-3 outline-none font-bold text-gray-800 text-xs xl:text-sm bg-transparent ${selectionMode ? 'pointer-events-none' : 'cursor-pointer'}`}
                                                tabIndex={selectionMode ? -1 : 0}
                                              >
                                                <option value="" disabled>Selecione a Semente...</option>
                                                {/* FILTRA APENAS VARIEDADES DAQUELA CULTURA ESPECÍFICA */}
                                                {(variedades || []).filter(v => v.culturaId === config.culturaId).map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
                                              </select>
                                            </div>

                                            {/* BOTÃO REMOVER DIVISÃO */}
                                            {index !== 0 && (
                                              <button onClick={(e) => { e.stopPropagation(); handleRemoveVarRow(uid, row.tempId); }} className={`bg-white border border-gray-200 shadow-sm text-gray-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 p-2.5 xl:p-3 rounded-xl transition-all shrink-0 ${selectionMode ? 'opacity-0 pointer-events-none' : ''}`} title="Remover divisão">
                                                <Trash size={18} />
                                              </button>
                                            )}
                                          </div>

                                          {/* SEGUNDA LINHA (TAXAS & EMBALAGENS) */}
                                          {showTaxaBags && (
                                            <div className={`${expandedRows[row.tempId] ? 'flex' : 'hidden'} xl:flex flex-row items-center gap-2 w-full xl:w-auto animate-fade-in ml-6 xl:ml-0`}>
                                              <div onClick={(e) => { e.stopPropagation(); if(selectionMode) handleToggleLote(uid); }} className={`bg-white border shadow-sm rounded-xl flex-1 xl:w-48 shrink-0 transition-all ${selectionMode === 'taxas' ? `cursor-pointer border-gray-300 ${modeColorHover}` : 'border-gray-200 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-100'} ${!row.taxaId ? 'bg-orange-50/50' : ''} ${selectionMode === 'variedades' ? 'opacity-60' : ''}`}>
                                                <select value={row.taxaId} onChange={(e) => handleUpdateSelect(uid, row.tempId, 'taxaId', e.target.value)} className={`w-full h-full py-3 px-3 outline-none font-bold text-gray-800 text-xs xl:text-sm bg-transparent ${selectionMode ? 'pointer-events-none' : 'cursor-pointer'}`} tabIndex={selectionMode ? -1 : 0}>
                                                  <option value="" disabled>Gabarito de Taxa...</option>
                                                  {(taxasPlantio || []).map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                                                </select>
                                              </div>
                                              <div className={`bg-gray-50 border border-gray-200 shadow-inner rounded-xl px-3 py-3 w-auto xl:w-40 shrink-0 flex items-center justify-center transition-all ${selectionMode ? 'opacity-60' : ''}`}>
                                                {calcEmb.total > 0 ? (
                                                  <span className="text-[11px] xl:text-xs font-bold text-gray-700 truncate flex items-center gap-1.5">
                                                    <Package size={16} className="text-emerald-500 hidden xl:block" />
                                                    {calcEmb.total.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-[9px] xl:text-[10px] text-gray-400 uppercase tracking-wider">{calcEmb.tipo}</span>
                                                  </span>
                                                ) : (
                                                  <span className="text-[9px] font-black text-red-500 uppercase tracking-widest text-center leading-tight bg-red-50 px-2 py-1 rounded-md border border-red-100">{calcEmb.erro || '-'}</span>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* BOTÕES FLUTUANTES MOBILE */}
                {loteSelecionados.length > 0 && selectionMode === 'variedades' && (
                  <div className="lg:hidden fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[80] animate-fade-in">
                    <button onClick={() => setIsModalVarOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-black text-sm py-4 px-8 rounded-full shadow-2xl flex items-center gap-2 border-2 border-blue-400 transition-transform active:scale-95 whitespace-nowrap">
                      <Sprout size={20} /> Aplicar Sementes ( {loteSelecionados.length} )
                    </button>
                  </div>
                )}
                {loteSelecionados.length > 0 && selectionMode === 'taxas' && (
                  <div className="lg:hidden fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[80] animate-fade-in">
                    <button onClick={() => setIsModalTaxaOpen(true)} className="bg-orange-600 hover:bg-orange-700 text-white font-black text-sm py-4 px-8 rounded-full shadow-2xl flex items-center gap-2 border-2 border-orange-400 transition-transform active:scale-95 whitespace-nowrap">
                      <Calculator size={20} /> Aplicar Taxas ( {loteSelecionados.length} )
                    </button>
                  </div>
                )}
              </div>
            );
          })()
        )}

        {/* MODAIS */}
        {isModalTaxaOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsModalTaxaOpen(false)}>
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border-t-8 border-orange-500" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-gray-800 text-xl flex items-center gap-2"><Calculator className="text-orange-500" size={24}/> Taxas</h3>
                <button onClick={() => setIsModalTaxaOpen(false)} className="bg-gray-100 text-gray-400 p-2 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"><X size={20}/></button>
              </div>
              <div className="flex flex-col gap-2 mb-8 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                <div onClick={() => setLoteTaxaId('nenhuma')} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${loteTaxaId === 'nenhuma' ? 'border-gray-400 bg-gray-50 shadow-sm' : 'border-gray-100 bg-white hover:border-gray-300'}`}>
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0"><X size={16} className="text-gray-500" /></div>
                  <span className={`font-bold text-sm ${loteTaxaId === 'nenhuma' ? 'text-gray-900' : 'text-gray-500'}`}>Limpar Gabarito</span>
                </div>
                {(taxasPlantio || []).map(t => {
                  const isSelected = loteTaxaId === t.id;
                  return (
                    <div key={t.id} onClick={() => setLoteTaxaId(t.id)} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${isSelected ? 'border-orange-500 bg-orange-50 shadow-md ring-1 ring-orange-500' : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'}`}>
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0"><Calculator size={16} className="text-orange-600" /></div>
                      <span className={`font-bold text-sm ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>{t.nome}</span>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => confirmarModalLote('taxas')} className="w-full py-4 bg-orange-600 text-white font-black text-lg rounded-2xl hover:bg-orange-700 shadow-md transition-all active:scale-95">Confirmar para {loteSelecionados.length} talhões</button>
            </div>
          </div>
        )}

        {isModalVarOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsModalVarOpen(false)}>
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border-t-8 border-blue-600" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-gray-800 text-xl flex items-center gap-2"><Sprout className="text-blue-500" size={24}/> Sementes</h3>
                <button onClick={() => setIsModalVarOpen(false)} className="bg-gray-100 text-gray-400 p-2 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"><X size={20}/></button>
              </div>
              <div className="flex flex-col gap-2 mb-8 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                <div onClick={() => setLoteVarId('nenhuma')} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${loteVarId === 'nenhuma' ? 'border-gray-400 bg-gray-50 shadow-sm' : 'border-gray-100 bg-white hover:border-gray-300'}`}>
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0"><X size={16} className="text-gray-500" /></div>
                  <span className={`font-bold text-sm ${loteVarId === 'nenhuma' ? 'text-gray-900' : 'text-gray-500'}`}>Limpar Semente</span>
                </div>
                {(variedades || []).filter(v => selectedCulturaIds.includes(v.culturaId)).map(v => {
                  const isSelected = loteVarId === v.id;
                  return (
                    <div key={v.id} onClick={() => setLoteVarId(v.id)} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${isSelected ? 'border-blue-500 bg-blue-50 shadow-md ring-1 ring-blue-500' : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'}`}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-gray-200" style={{ backgroundColor: `${v.cor}15` }}>
                        <Sprout size={16} style={{ color: v.cor }} />
                      </div>
                      <span className={`font-bold text-sm ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>{v.nome}</span>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => confirmarModalLote('variedades')} className="w-full py-4 bg-blue-600 text-white font-black text-lg rounded-2xl hover:bg-blue-700 shadow-md transition-all active:scale-95">Confirmar para {loteSelecionados.length} talhões</button>
            </div>
          </div>
        )}

        {/* MODAL DE EXPORTAÇÃO PDF */}
        <ModalExportPdfPlantio
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          culturaNome={selectedCulturaIds.map(getCulturaNome).join(' + ')}
          safraNome={(planosSafra || []).find(s => s.id === selectedSafraId)?.safra}
          editVarConfig={editVarConfig}
          talhoes={talhoes}
          variedades={variedades}
          taxasPlantio={taxasPlantio}
          embalagens={embalagens}
        />

      </main>
      <style dangerouslySetInnerHTML={{__html:`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: #94a3b8; }
      `}}/>
    </div>
  );
} 