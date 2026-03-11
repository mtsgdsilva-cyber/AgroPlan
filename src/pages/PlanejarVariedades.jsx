// src/pages/PlanejarVariedades.jsx
import React, { useState } from 'react';
import { useAgro } from '../contexts/AgroContext';
import { generateId } from '../utils/helpers';
import { Sprout, Calculator, ArrowLeft, Trash, Filter, CheckSquare, Square, X, Package, Map } from 'lucide-react';
import Header from '../components/Header';
import { useModal } from '../contexts/ModalContext';

export default function PlanejarVariedades() {
  const { talhoes, culturas, variedades, taxasPlantio, embalagens, planosSafra, setPlanosSafra } = useAgro();
  const { showAlert } = useModal();

  // ==========================================
  // ESTADOS GLOBAIS
  // ==========================================
  const [currentView, setCurrentView] = useState('list_cards');
  const [selectedSafraId, setSelectedSafraId] = useState(null);
  const [selectedCulturaId, setSelectedCulturaId] = useState(null);

  const [editVarConfig, setEditVarConfig] = useState({}); 
  const [selectionMode, setSelectionMode] = useState(null); 
  const [loteSelecionados, setLoteSelecionados] = useState([]); 
  const [filtroVariedade, setFiltroVariedade] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});

  const [isModalVarOpen, setIsModalVarOpen] = useState(false);
  const [loteVarId, setLoteVarId] = useState('');
  const [isModalTaxaOpen, setIsModalTaxaOpen] = useState(false);
  const [loteTaxaId, setLoteTaxaId] = useState('');

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
  const abrirPlanejamento = (safraId, culturaId) => {
    const safra = (planosSafra || []).find(s => s.id === safraId);
    if (!safra) return;

    const configInicial = {};
    (safra.areas || []).forEach(area => {
      (area.culturas || []).forEach(c => {
        if (c.culturaId === culturaId) {
          
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
            areaTotal: blockArea,
            variedades: varsIniciais
          };
        }
      });
    });

    setEditVarConfig(configInicial);
    setSelectedSafraId(safraId);
    setSelectedCulturaId(culturaId);
    setLoteSelecionados([]); setSelectionMode(null); setFiltroVariedade(null);
    setCurrentView('plan_variedades');
  };

  const autoSave = (novoConfig) => {
    setPlanosSafra(prev => prev.map(safra => {
      if (safra.id === selectedSafraId) {
        const novasAreas = (safra.areas || []).map(area => {
          const novasCulturas = (area.culturas || []).map(c => {
            if (c.culturaId === selectedCulturaId && novoConfig[c.uid]) {
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
  // AUTO-SPLIT MATEMÁTICO (RAMIFICAÇÕES)
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
        showAlert("Atenção", "A área foi reajustada para não exceder o tamanho alocado para esta cultura.", "warning");
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

  // ==========================================
  // AÇÕES EM LOTE E SELEÇÃO
  // ==========================================
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

  // ==========================================
  // CÁLCULOS
  // ==========================================
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
    
    const lista = Object.entries(resumo).map(([id, data]) => ({ id, ...data })).sort((a, b) => b.ha - a.ha);
    return { lista, areaTotalPlanejada, areaTotalLivre };
  };

  return (
<div className="flex flex-col h-full bg-gray-50 min-h-screen">
{currentView === 'list_cards' && <Header title="Planejar Variedades e Taxas" />}
      
      <main className="px-4 lg:px-8 py-4 animate-fade-in">
        
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
                {activeCultureCards.map((card, index) => (
                  <div 
                    key={`${card.safraId}-${card.culturaId}-${index}`} 
                    onClick={() => abrirPlanejamento(card.safraId, card.culturaId)} 
                    className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 cursor-pointer transition-all flex flex-col group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-blue-50/50 p-2.5 rounded-xl text-blue-500 border border-blue-100/50">
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

                    <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between text-blue-600 font-medium text-sm">
                      <span className="flex items-center gap-1.5"><Calculator size={14} /> Sementes e Taxas</span>
                      <ArrowLeft size={16} className="rotate-180 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: DISTRIBUIÇÃO FLAT (MINI-CARDS) */}
        {currentView === 'plan_variedades' && selectedSafraId && selectedCulturaId && (
          (() => {
            const safra = (planosSafra || []).find(s => s.id === selectedSafraId);
            const culturaNome = getCulturaNome(selectedCulturaId);
            const sementesDisponiveis = (variedades || []).filter(v => v.culturaId === selectedCulturaId);
            const resumoDinamico = getResumoEdicao();
            const todosUids = Object.keys(editVarConfig);

            // Calcula o total geral de embalagens (Bags/Sacas) apenas das variedades
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
              <div className="animate-fade-in pb-32 min-h-screen">
                
                {/* CABEÇALHO E BOTÕES DE AÇÃO */}
                <div className="sticky top-0 z-[60] flex flex-row items-center justify-between gap-4 mb-6 bg-white/95 backdrop-blur-md p-4 pt-6 lg:py-5 lg:pt-6 rounded-b-3xl shadow-sm border-b border-gray-100 -mx-4 -mt-4 px-4 lg:-mx-8 lg:-mt-4 lg:px-8 transition-all">
                  
                  <div className="flex items-center gap-3">
                    <button onClick={() => setCurrentView('list_cards')} className="text-gray-400 hover:text-blue-600 transition-colors p-2 bg-white rounded-xl shadow-sm border border-gray-100 shrink-0">
                      <ArrowLeft size={20} />
                    </button>
                    <div className="flex flex-col">
                      <h2 className="text-lg md:text-xl font-black text-gray-800 flex items-center gap-2">
                        {culturaNome}
                      </h2>
                      <p className="text-[10px] md:text-xs font-semibold text-gray-400 uppercase tracking-widest">Safra {safra?.safra}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!selectionMode ? (
                      <>
                        <button onClick={() => setSelectionMode('variedades')} className="text-blue-600 bg-white border border-blue-200 p-2.5 md:px-4 md:py-2.5 rounded-xl shadow-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-2" title="Alterar Sementes">
                          <Sprout size={18} /> <span className="hidden md:block font-semibold text-sm">Sementes</span>
                        </button>
                        <button onClick={() => setSelectionMode('taxas')} className="text-orange-600 bg-white border border-orange-200 p-2.5 md:px-4 md:py-2.5 rounded-xl shadow-sm hover:bg-orange-50 transition-colors flex items-center justify-center gap-2" title="Alterar Taxas">
                          <Calculator size={18} /> <span className="hidden md:block font-semibold text-sm">Taxas</span>
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 animate-fade-in">
                        <button onClick={() => setLoteSelecionados(loteSelecionados.length === todosUids.length ? [] : todosUids)} className={`text-xs md:text-sm font-semibold px-3 py-2.5 rounded-xl border shadow-sm transition-colors whitespace-nowrap ${selectionMode === 'variedades' ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-orange-700 bg-orange-50 border-orange-200'}`}>
                          {loteSelecionados.length === todosUids.length ? 'Desmarcar' : 'Tudo'}
                        </button>
                        <button onClick={() => { setSelectionMode(null); setLoteSelecionados([]); }} className="text-gray-500 hover:text-red-500 bg-white border border-gray-200 p-2.5 rounded-xl shadow-sm shrink-0 flex items-center justify-center" title="Sair do Modo Seleção">
                          <X size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* CARDS DE FILTRO E RESUMO (NOVA LÓGICA DE GRID PARA MOBILE) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pb-4 pt-1 px-1 mb-6">
                  
                  {/* CARD TOTALIZADOR */}
                  <div onClick={() => setFiltroVariedade(null)} className={`flex flex-col items-center justify-center px-2 py-4 rounded-xl cursor-pointer transition-all h-full ${!filtroVariedade ? 'bg-gray-50 text-gray-800 border border-gray-300 shadow-inner' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'}`}>
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-1 mb-1"><Filter size={12}/> Mostrar Todos</span>
                    <span className="font-semibold text-lg leading-tight text-center">{resumoDinamico.areaTotalPlanejada.toLocaleString('pt-BR')} ha</span>
                    {totalGeralEmbalagens > 0 && (
                      <span className="text-[10px] font-bold text-gray-500 mt-2 flex items-center justify-center gap-1 uppercase tracking-wider text-center">
                        <Package size={12} className="text-gray-400 shrink-0" />
                        {totalGeralEmbalagens.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} {tipoEmbGeral}
                      </span>
                    )}
                  </div>
                  
                  {/* CARDS DAS VARIEDADES */}
                  {resumoDinamico.lista.map((item) => {
                    const corVar = getVarColor(item.id);
                    const isSelected = filtroVariedade === item.id;
                    
                    return (
                      <div 
                        key={item.id} 
                        onClick={() => setFiltroVariedade(isSelected ? null : item.id)} 
                        className="flex flex-col items-center justify-center px-2 py-4 rounded-xl cursor-pointer transition-all bg-white shadow-sm hover:shadow-md overflow-hidden relative h-full text-center"
                        style={{ 
                          border: `1px solid ${isSelected ? corVar : '#e5e7eb'}`,
                          boxShadow: isSelected ? `0 0 0 1px ${corVar}` : 'none'
                        }}
                      >
                        {/* ICONE AGORA TEM shrink-0 E FICA FIXO */}
                        <span className="text-xs md:text-sm font-bold tracking-wide text-gray-600 truncate w-full mb-1.5 flex items-center justify-center gap-1.5">
                          <Sprout size={14} className="shrink-0" style={{ color: corVar }} />
                          <span className="truncate">{getVariedadeNome(item.id)}</span>
                        </span>
                        
                        <div className="flex flex-col items-center w-full">
                          <span className="font-semibold text-base md:text-lg leading-none text-gray-700">
                            {item.ha.toLocaleString('pt-BR')} ha
                          </span>
                          
                          {item.embalagens > 0 && (
                            <span className="text-[9px] md:text-[10px] font-bold text-gray-500 mt-2 flex items-center justify-center gap-1 uppercase tracking-wider truncate w-full">
                              <Package size={12} className="text-gray-400 shrink-0" />
                              <span className="truncate">{item.embalagens.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} {item.tipoEmb}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {/* CARD DE ÁREA LIVRE */}
                  {resumoDinamico.areaTotalLivre > 0 && (
                    <div className="flex flex-col items-center justify-center px-2 py-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 transition-all h-full text-center">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Ainda Livre</span>
                      <span className="font-semibold text-lg leading-tight text-gray-500">{resumoDinamico.areaTotalLivre.toLocaleString('pt-BR')} ha</span>
                    </div>
                  )}
                </div>

                {/* DATA GRID DE MINI CARDS FLAT */}
                <div className="space-y-6">
                  {Object.entries(groupedAreas).map(([retiro, data]) => {
                    const blocosFiltrados = filtroVariedade 
                      ? data.items.filter(({ config }) => config.variedades.some(r => r.variedadeId === filtroVariedade))
                      : data.items;

                    if (blocosFiltrados.length === 0) return null;

                    return (
                      <div key={retiro} className="mb-8">
                        <div className="mb-3 px-2 border-b border-gray-100 pb-2 flex items-center gap-2">
                          <Map size={14} className="text-gray-400" />
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{retiro}</span>
                        </div>

                        <div className="space-y-2">
                          {blocosFiltrados.map(({ uid, config, talhao }) => {
                            const rows = config.variedades || [];
                            const isSelected = loteSelecionados.includes(uid);
                            const modeColorText = selectionMode === 'variedades' ? 'text-blue-500' : 'text-orange-500';
                            const modeColorHover = selectionMode === 'variedades' ? 'hover:border-blue-300 hover:bg-blue-50/30' : 'hover:border-orange-300 hover:bg-orange-50/30';

                            return (
                              <div key={uid} className="flex flex-col gap-2">
                                {rows.map((row, index) => {
                                  if (filtroVariedade && row.variedadeId !== filtroVariedade && row.variedadeId !== '') return null;
                                  
                                  const calcEmb = calcularEmbalagens(parseFloat(row.areaHa), row.taxaId, row.variedadeId);

                                  return (
                                    <div key={row.tempId} className="mb-2 md:mb-1.5 animate-fade-in relative flex flex-col md:flex-row md:items-center gap-1.5 md:gap-2 w-full">
                                      
                                      <div 
                                        onClick={() => { if(window.innerWidth < 768) setExpandedRows(prev => ({...prev, [row.tempId]: !prev[row.tempId]})) }}
                                        className="flex flex-row items-center gap-1.5 md:gap-2 w-full md:w-auto md:cursor-default cursor-pointer"
                                      >
                                        
                                        {selectionMode && index === 0 && (
                                          <div className="shrink-0 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleToggleLote(uid); }}>
                                            {isSelected ? <CheckSquare className={modeColorText} size={20}/> : <Square className="text-gray-300" size={20}/>}
                                          </div>
                                        )}
                                        {selectionMode && index !== 0 && <div className="w-[20px] shrink-0 hidden md:block"></div>}

                                        <div className={`border rounded-xl px-2 py-2.5 w-16 md:w-32 shrink-0 flex items-center justify-center md:justify-start transition-all ${index === 0 ? 'bg-white border-gray-200 shadow-sm' : 'bg-transparent border-transparent md:border-gray-100 opacity-80'}`}>
                                          <span className={`font-semibold truncate text-[11px] md:text-sm ${index === 0 ? 'text-gray-700' : 'text-gray-400'}`}>
                                            {index === 0 ? talhao.nome : '↳ Divisão'}
                                          </span>
                                        </div>

                                        <div 
                                          onClick={(e) => e.stopPropagation()} 
                                          className={`bg-white border border-gray-200 shadow-sm rounded-xl flex items-center w-20 md:w-28 shrink-0 transition-all ${selectionMode ? 'opacity-60 bg-gray-50' : 'focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-100'}`}
                                        >
                                          <input
                                            type="number"
                                            step="0.01"
                                            value={row.areaHa}
                                            onChange={(e) => handleUpdateAreaRaw(uid, row.tempId, e.target.value)}
                                            onBlur={(e) => handleAreaBlur(uid, row.tempId, e.target.value)}
                                            className={`w-full py-2.5 pl-1.5 md:pl-3 text-center font-semibold text-gray-700 text-[11px] md:text-sm bg-transparent outline-none ${selectionMode ? 'cursor-not-allowed' : ''}`}
                                            disabled={!!selectionMode}
                                          />
                                          <span className="text-[10px] md:text-[11px] font-medium text-gray-400 pr-1.5 md:pr-3">ha</span>
                                        </div>

                                        <div 
                                          onClick={(e) => { e.stopPropagation(); if(selectionMode) handleToggleLote(uid); }}
                                          className={`bg-white border shadow-sm rounded-xl flex-1 md:w-48 shrink-0 transition-all overflow-hidden ${selectionMode === 'variedades' ? `cursor-pointer ${modeColorHover}` : 'focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-100'} ${!row.variedadeId ? 'bg-blue-50/30 border-blue-100' : 'border-gray-200'} ${selectionMode === 'taxas' ? 'opacity-60' : ''}`}
                                          style={{ borderLeft: row.variedadeId ? `4px solid ${getVarColor(row.variedadeId)}` : undefined }}
                                        >
                                          <select
                                            value={row.variedadeId}
                                            onChange={(e) => handleUpdateSelect(uid, row.tempId, 'variedadeId', e.target.value)}
                                            className={`w-full h-full py-2.5 px-2 outline-none font-semibold text-gray-700 text-[11px] md:text-sm bg-transparent ${selectionMode ? 'pointer-events-none' : 'cursor-pointer'}`}
                                            tabIndex={selectionMode ? -1 : 0}
                                          >
                                            <option value="" disabled>Semente...</option>
                                            {sementesDisponiveis.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
                                          </select>
                                        </div>

                                        {index !== 0 && (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleRemoveVarRow(uid, row.tempId); }}
                                            className={`bg-white border border-gray-200 shadow-sm text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 md:p-2.5 rounded-xl transition-all shrink-0 ${selectionMode ? 'opacity-0 pointer-events-none' : ''}`}
                                            title="Remover divisão"
                                          >
                                            <Trash size={14} className="md:w-[18px] md:h-[18px]" />
                                          </button>
                                        )}
                                      </div>

                                      <div className={`${expandedRows[row.tempId] ? 'flex' : 'hidden'} md:flex flex-row items-center gap-1.5 md:gap-2 w-full md:w-auto animate-fade-in mt-1 md:mt-0`}>
                                        
                                        <div className="w-5 shrink-0 flex justify-end md:hidden">
                                           <div className="w-3 h-4 border-b-2 border-l-2 border-gray-300 rounded-bl-xl"></div>
                                        </div>

                                        <div 
                                          onClick={(e) => { e.stopPropagation(); if(selectionMode) handleToggleLote(uid); }}
                                          className={`bg-white border shadow-sm rounded-xl flex-1 md:w-36 shrink-0 transition-all ${selectionMode === 'taxas' ? `cursor-pointer ${modeColorHover}` : 'focus-within:border-orange-400 focus-within:ring-1 focus-within:ring-orange-100'} ${!row.taxaId ? 'bg-orange-50/30 border-orange-100' : 'border-gray-200'} ${selectionMode === 'variedades' ? 'opacity-60' : ''}`}
                                        >
                                          <select
                                            value={row.taxaId}
                                            onChange={(e) => handleUpdateSelect(uid, row.tempId, 'taxaId', e.target.value)}
                                            className={`w-full h-full py-2.5 px-2 outline-none font-semibold text-gray-700 text-[11px] md:text-sm bg-transparent ${selectionMode ? 'pointer-events-none' : 'cursor-pointer'}`}
                                            tabIndex={selectionMode ? -1 : 0}
                                          >
                                            <option value="" disabled>Taxa...</option>
                                            {(taxasPlantio || []).map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                                          </select>
                                        </div>

                                        <div className={`bg-white border border-gray-200 shadow-sm rounded-xl px-2 py-2.5 w-auto md:w-32 shrink-0 flex items-center justify-center transition-all ${selectionMode ? 'opacity-60' : ''}`}>
                                          {calcEmb.total > 0 ? (
                                            <span className="text-[11px] md:text-xs font-bold text-gray-700 truncate flex items-center gap-1.5">
                                              <Package size={12} className="text-emerald-500 hidden md:block" />
                                              {calcEmb.total.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-[9px] md:text-[10px] text-gray-400 uppercase tracking-wider">{calcEmb.tipo}</span>
                                            </span>
                                          ) : (
                                            <span className="text-[9px] font-black text-red-400 uppercase tracking-widest text-center leading-tight">
                                              {calcEmb.erro || '-'}
                                            </span>
                                          )}
                                        </div>
                                      </div>

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

                {/* BOTÕES FLUTUANTES DE AÇÃO EM LOTE */}
                {loteSelecionados.length > 0 && selectionMode === 'variedades' && (
                  <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
                    <button onClick={() => setIsModalVarOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm md:text-base py-3 px-8 rounded-full shadow-lg flex items-center gap-2 border border-blue-400 transition-transform hover:scale-105 whitespace-nowrap">
                      <Sprout size={18} /> Aplicar Sementes ( {loteSelecionados.length} )
                    </button>
                  </div>
                )}
                {loteSelecionados.length > 0 && selectionMode === 'taxas' && (
                  <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
                    <button onClick={() => setIsModalTaxaOpen(true)} className="bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm md:text-base py-3 px-8 rounded-full shadow-lg flex items-center gap-2 border border-orange-400 transition-transform hover:scale-105 whitespace-nowrap">
                      <Calculator size={18} /> Aplicar Taxas ( {loteSelecionados.length} )
                    </button>
                  </div>
                )}
              </div>
            );
          })()
        )}

        {/* ========================================== */}
        {/* MODAL LOTE: TAXAS E VARIEDADES */}
        {/* ========================================== */}
        {isModalTaxaOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsModalTaxaOpen(false)}>
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2"><Calculator className="text-orange-500" size={20}/> Taxas (Gabaritos)</h3>
                <button onClick={() => setIsModalTaxaOpen(false)} className="bg-gray-50 text-gray-400 p-2 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"><X size={18}/></button>
              </div>
              
              <div className="flex flex-col gap-2 mb-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <div onClick={() => setLoteTaxaId('nenhuma')} className={`flex items-center gap-4 p-3.5 rounded-2xl border transition-all cursor-pointer ${loteTaxaId === 'nenhuma' ? 'border-gray-400 bg-gray-50 shadow-sm' : 'border-gray-100 bg-white hover:border-gray-300'}`}>
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0"><X size={16} className="text-gray-400" /></div>
                  <span className={`font-semibold text-[14px] ${loteTaxaId === 'nenhuma' ? 'text-gray-800' : 'text-gray-500'}`}>Nenhuma <span className="font-medium text-xs text-gray-400 ml-1">(Limpar)</span></span>
                </div>

                {(taxasPlantio || []).map(t => {
                  const isSelected = loteTaxaId === t.id;
                  return (
                    <div key={t.id} onClick={() => setLoteTaxaId(t.id)} className={`flex items-center gap-4 p-3.5 rounded-2xl border transition-all cursor-pointer ${isSelected ? 'border-orange-400 bg-orange-50 shadow-sm ring-1 ring-orange-400' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                      <div className="w-8 h-8 rounded-full bg-orange-100/50 flex items-center justify-center shrink-0">
                        <Calculator size={16} className="text-orange-500" />
                      </div>
                      <span className={`font-semibold text-[14px] ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>{t.nome}</span>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => confirmarModalLote('taxas')} className="w-full py-3.5 bg-orange-600 text-white font-semibold text-base rounded-2xl hover:bg-orange-700 shadow-sm transition-colors">Confirmar</button>
            </div>
          </div>
        )}

        {isModalVarOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsModalVarOpen(false)}>
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2"><Sprout className="text-blue-500" size={20}/> Sementes</h3>
                <button onClick={() => setIsModalVarOpen(false)} className="bg-gray-50 text-gray-400 p-2 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"><X size={18}/></button>
              </div>
              
              <div className="flex flex-col gap-2 mb-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <div onClick={() => setLoteVarId('nenhuma')} className={`flex items-center gap-4 p-3.5 rounded-2xl border transition-all cursor-pointer ${loteVarId === 'nenhuma' ? 'border-gray-400 bg-gray-50 shadow-sm' : 'border-gray-100 bg-white hover:border-gray-300'}`}>
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0"><X size={16} className="text-gray-400" /></div>
                  <span className={`font-semibold text-[14px] ${loteVarId === 'nenhuma' ? 'text-gray-800' : 'text-gray-500'}`}>Nenhuma <span className="font-medium text-xs text-gray-400 ml-1">(Limpar)</span></span>
                </div>

                {(variedades || []).filter(v => v.culturaId === selectedCulturaId).map(v => {
                  const isSelected = loteVarId === v.id;
                  return (
                    <div key={v.id} onClick={() => setLoteVarId(v.id)} className={`flex items-center gap-4 p-3.5 rounded-2xl border transition-all cursor-pointer ${isSelected ? 'border-blue-400 bg-blue-50 shadow-sm ring-1 ring-blue-400' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${v.cor}20` }}>
                        <Sprout size={16} style={{ color: v.cor }} />
                      </div>
                      <span className={`font-semibold text-[14px] ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>{v.nome}</span>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => confirmarModalLote('variedades')} className="w-full py-3.5 bg-blue-600 text-white font-semibold text-base rounded-2xl hover:bg-blue-700 shadow-sm transition-colors">Confirmar</button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}