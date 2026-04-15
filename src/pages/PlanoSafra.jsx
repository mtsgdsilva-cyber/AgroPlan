// src/pages/PlanoSafra.jsx
import React, { useState } from 'react';
import { useAgro } from '../contexts/AgroContext';
import { generateId } from '../utils/helpers';
import { CalendarDays, Map, Plus, Leaf, ChevronRight, CheckSquare, Square, ArrowLeft, Save, Trash, Filter, ChevronDown, ChevronUp, X, Package, Sprout, Calculator, AlertCircle, CheckCircle } from 'lucide-react';
import Header from '../components/Header';
import Card from '../components/Card';
import { useModal } from '../contexts/ModalContext';

const PRESET_COLORS = ['#16a34a', '#22c55e', '#84cc16', '#4ade80', '#0891b2', '#06b6d4', '#3b82f6', '#6366f1', '#f59e0b', '#fbbf24', '#ea580c', '#f97316', '#71717a', '#4b5563', '#18181b', '#b91c1c'];

export default function PlanoSafra() {
  const { talhoes, culturas, variedades, taxasPlantio, embalagens, planosSafra, setPlanosSafra } = useAgro();
  const { showAlert, showConfirm } = useModal();

  // ==========================================
  // ESTADOS GLOBAIS DE NAVEGAÇÃO
  // ==========================================
  const [activeMainTab, setActiveMainTab] = useState('culturas'); // 'culturas' | 'variedades'
  
  // Fluxo de Culturas: 'list_safras' | 'create_safra' | 'view_safra' | 'distribute_cultura'
  const [viewCulturas, setViewCulturas] = useState('list_safras'); 
  
  // Fluxo de Variedades: 'select_safra' | 'select_cultura' | 'plan_variedades'
  const [viewVariedades, setViewVariedades] = useState('select_safra');

  const [selectedSafraId, setSelectedSafraId] = useState(null);
  const [selectedCulturaPlanId, setSelectedCulturaPlanId] = useState(null);

  // ==========================================
  // ESTADOS: CRIAÇÃO DE SAFRA
  // ==========================================
  const [novaSafra, setNovaSafra] = useState('');
  const [isTerceiraSafra, setIsTerceiraSafra] = useState(false);

  const handleSafraChange = (e) => {
    let value = e.target.value.replace(/\D/g, ''); 
    if (value.length > 4) value = value.slice(0, 4); 
    if (value.length > 2) value = `${value.slice(0, 2)}/${value.slice(2)}`;
    setNovaSafra(value);
  };

  const handleCriarSafra = (e) => {
    e.preventDefault();
    if (novaSafra.length !== 5) return showAlert("Atenção", "A Safra deve estar no formato correto. Ex: 25/26", "danger");
    
    const nomeSafraFinal = isTerceiraSafra ? `${novaSafra} - 3ª Safra` : novaSafra;
    
    const novaSafraObj = {
      id: generateId(),
      safra: nomeSafraFinal,
      dataCriacao: new Date().toISOString(),
      culturasPlanejadas: [] // Array que guardará as distribuições de culturas
    };

    setPlanosSafra([...(planosSafra || []), novaSafraObj]);
    setNovaSafra('');
    setIsTerceiraSafra(false);
    setViewCulturas('list_safras');
    showAlert("Sucesso", `Safra ${nomeSafraFinal} criada com sucesso!`, "success");
  };

  // ==========================================
  // ESTADOS: DISTRIBUIÇÃO DE CULTURAS
  // ==========================================
  const [distCulturaId, setDistCulturaId] = useState('');
  const [distTalhoes, setDistTalhoes] = useState({}); // Ex: { talhaoId: { selecionado: true, areaHa: 100 } }

  // ESTADOS: PLANEJAMENTO DE VARIEDADES E TAXAS
  const [editVarConfig, setEditVarConfig] = useState({}); 
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [loteSelecionados, setLoteSelecionados] = useState([]);
  const [expandedTalhoes, setExpandedTalhoes] = useState({});
  const [filtroVariedade, setFiltroVariedade] = useState(null);
  
  // Modais de Lote e Cores
  const [isModalVarOpen, setIsModalVarOpen] = useState(false);
  const [loteVarId, setLoteVarId] = useState('');
  const [isModalTaxaOpen, setIsModalTaxaOpen] = useState(false);
  const [loteTaxaId, setLoteTaxaId] = useState('');
  const [colorPickerTarget, setColorPickerTarget] = useState(null);
  // ==========================================
  // FUNÇÕES: CÁLCULO DE ÁREAS (A TRAVA DE SEGURANÇA)
  // ==========================================
  const getAreaDisponivelTalhao = (safraId, talhaoId) => {
    const safra = (planosSafra || []).find(s => s.id === safraId);
    if (!safra) return 0;
    
    const talhao = (talhoes || []).find(t => t.id === talhaoId);
    if (!talhao) return 0;

    // Soma a área já distribuída para outras culturas NESTA safra
    const areaJaUsada = (safra.culturasPlanejadas || []).reduce((accCultura, culturaPlan) => {
      const areaNoTalhao = (culturaPlan.distribuicao || []).find(d => d.talhaoId === talhaoId);
      return accCultura + (areaNoTalhao ? parseFloat(areaNoTalhao.areaHa) || 0 : 0);
    }, 0);

    const disponivel = (parseFloat(talhao.areaHa) || 0) - areaJaUsada;
    return Math.max(0, disponivel); // Nunca retorna negativo
  };

  // ==========================================
  // FUNÇÕES: DISTRIBUIR CULTURA NA SAFRA
  // ==========================================
  const iniciarDistribuicaoCultura = (safraId) => {
    setSelectedSafraId(safraId);
    setDistCulturaId('');
    
    // Prepara a lista de talhões com a área disponível correta para aquela safra
    const initialDist = {};
    (talhoes || []).forEach(t => {
      const disponivel = getAreaDisponivelTalhao(safraId, t.id);
      initialDist[t.id] = { selecionado: false, areaHa: disponivel, areaMaxima: disponivel };
    });
    setDistTalhoes(initialDist);
    setViewCulturas('distribute_cultura');
  };

  const handleToggleTalhaoDist = (talhaoId) => {
    setDistTalhoes(prev => ({
      ...prev,
      [talhaoId]: { ...prev[talhaoId], selecionado: !prev[talhaoId].selecionado }
    }));
  };

  const handleChangeAreaDist = (talhaoId, valor) => {
    const maximo = distTalhoes[talhaoId].areaMaxima;
    let novaArea = parseFloat(valor) || 0;
    
    // A TRAVA EM AÇÃO: Impede de digitar um valor maior que o disponível
    if (novaArea > maximo) novaArea = maximo;

    setDistTalhoes(prev => ({
      ...prev,
      [talhaoId]: { ...prev[talhaoId], areaHa: novaArea }
    }));
  };

  const salvarDistribuicaoCultura = () => {
    if (!distCulturaId) return showAlert("Atenção", "Selecione a cultura que deseja distribuir.", "danger");

    const distribuicaoFinal = Object.entries(distTalhoes)
      .filter(([_, config]) => config.selecionado && config.areaHa > 0)
      .map(([talhaoId, config]) => ({
        talhaoId,
        areaHa: config.areaHa,
        variedades: [], // Estrutura pronta para a aba de Planejar Variedades
        taxaId: ''
      }));

    if (distribuicaoFinal.length === 0) {
      return showAlert("Atenção", "Selecione pelo menos um talhão com área disponível.", "danger");
    }

    const novaCulturaPlan = {
      id: generateId(),
      culturaId: distCulturaId,
      status: 'Ativo', // Status inicial
      dataDistribuicao: new Date().toISOString(),
      distribuicao: distribuicaoFinal
    };

    setPlanosSafra(prev => prev.map(s => {
      if (s.id === selectedSafraId) {
        return { ...s, culturasPlanejadas: [...(s.culturasPlanejadas || []), novaCulturaPlan] };
      }
      return s;
    }));

    setViewCulturas('view_safra');
    showAlert("Sucesso", "Cultura distribuída com sucesso nos talhões!", "success");
  };

  const alterarStatusCultura = (safraId, culturaPlanId, novoStatus) => {
    setPlanosSafra(prev => prev.map(s => {
      if (s.id === safraId) {
        const culturasAtt = (s.culturasPlanejadas || []).map(cp => 
          cp.id === culturaPlanId ? { ...cp, status: novoStatus } : cp
        );
        return { ...s, culturasPlanejadas: culturasAtt };
      }
      return s;
    }));
  };

  const excluirCulturaPlanejada = (safraId, culturaPlanId) => {
    showConfirm(
      "Excluir Distribuição",
      "Tem certeza que deseja excluir esta cultura e todo o planejamento de variedades vinculado a ela?",
      () => {
        setPlanosSafra(prev => prev.map(s => {
          if (s.id === safraId) {
            return { ...s, culturasPlanejadas: (s.culturasPlanejadas || []).filter(cp => cp.id !== culturaPlanId) };
          }
          return s;
        }));
      },
      "danger"
    );
  };
  // ==========================================
  // FUNÇÕES: PLANEJAMENTO MICRO (VARIEDADES E TAXAS)
  // ==========================================
  const abrirPlanejamentoVariedades = (safraId, culturaPlanId) => {
    const safra = (planosSafra || []).find(s => s.id === safraId);
    const culturaPlan = (safra?.culturasPlanejadas || []).find(cp => cp.id === culturaPlanId);
    if (!culturaPlan) return;

    // Carrega a configuração existente de variedades
    const configInicial = {};
    (culturaPlan.distribuicao || []).forEach(d => {
      configInicial[d.talhaoId] = (d.variedades || []).map(v => ({ ...v, tempId: generateId() }));
    });

    setEditVarConfig(configInicial);
    setSelectedSafraId(safraId);
    setSelectedCulturaPlanId(culturaPlanId);
    setLoteSelecionados([]);
    setFiltroVariedade(null);
    setExpandedTalhoes({});
    setIsSelectionMode(false);
    setViewVariedades('plan_variedades');
  };

  // ==========================================
  // AUTO-SAVES (VARIEDADES E TAXAS)
  // ==========================================
  const autoSaveVariedades = (novoConfig) => {
    setPlanosSafra(prev => prev.map(safra => {
      if (safra.id === selectedSafraId) {
        const culturasAtt = (safra.culturasPlanejadas || []).map(cp => {
          if (cp.id === selectedCulturaPlanId) {
            const distAtualizada = (cp.distribuicao || []).map(dist => {
              const variedadesLimpas = (novoConfig[dist.talhaoId] || [])
                .filter(v => v.variedadeId && v.areaHa)
                .map(v => ({ variedadeId: v.variedadeId, areaHa: parseFloat(v.areaHa) || 0 }));
              return { ...dist, variedades: variedadesLimpas };
            });
            return { ...cp, distribuicao: distAtualizada };
          }
          return cp;
        });
        return { ...safra, culturasPlanejadas: culturasAtt };
      }
      return safra;
    }));
  };

  const autoSaveTaxas = (talhaoId, taxaId) => {
    setPlanosSafra(prev => prev.map(safra => {
      if (safra.id === selectedSafraId) {
        const culturasAtt = (safra.culturasPlanejadas || []).map(cp => {
          if (cp.id === selectedCulturaPlanId) {
            const distAtualizada = (cp.distribuicao || []).map(dist => 
              dist.talhaoId === talhaoId ? { ...dist, taxaId } : dist
            );
            return { ...cp, distribuicao: distAtualizada };
          }
          return cp;
        });
        return { ...safra, culturasPlanejadas: culturasAtt };
      }
      return safra;
    }));
  };

  // ==========================================
  // MANIPULAÇÃO DE LINHAS (DIVISÃO DE TALHÃO)
  // ==========================================
  const handleAddVariedadeRow = (talhaoId) => {
    setEditVarConfig(prev => {
      const newState = { ...prev, [talhaoId]: [...(prev[talhaoId] || []), { tempId: generateId(), variedadeId: '', areaHa: '' }] };
      autoSaveVariedades(newState); 
      return newState;
    });
  };

  const handleUpdateVariedadeRow = (talhaoId, tempId, field, value) => {
    setEditVarConfig(prev => {
      const newState = { ...prev, [talhaoId]: (prev[talhaoId] || []).map(v => v.tempId === tempId ? { ...v, [field]: value } : v) };
      autoSaveVariedades(newState); 
      return newState;
    });
  };

  const handleRemoveVariedadeRow = (talhaoId, tempId) => {
    setEditVarConfig(prev => {
      const newState = { ...prev, [talhaoId]: (prev[talhaoId] || []).filter(v => v.tempId !== tempId) };
      autoSaveVariedades(newState); 
      return newState;
    });
  };

  // ==========================================
  // AÇÕES EM LOTE E CORES
  // ==========================================
  const handleToggleLote = (talhaoId) => setLoteSelecionados(prev => prev.includes(talhaoId) ? prev.filter(id => id !== talhaoId) : [...prev, talhaoId]);
  const selecionarTodosLote = (listaIds) => setLoteSelecionados(loteSelecionados.length === listaIds.length ? [] : listaIds);
  const toggleExpandTalhao = (talhaoId) => setExpandedTalhoes(prev => ({ ...prev, [talhaoId]: !prev[talhaoId] }));

  const confirmarModalVariedades = () => {
    if (!loteVarId) return showAlert("Atenção", "Selecione uma variedade.", "danger");
    const safra = (planosSafra || []).find(s => s.id === selectedSafraId);
    const cp = (safra?.culturasPlanejadas || []).find(c => c.id === selectedCulturaPlanId);
    
    setEditVarConfig(prev => {
      const newState = { ...prev };
      loteSelecionados.forEach(talhaoId => {
        const dist = (cp?.distribuicao || []).find(d => d.talhaoId === talhaoId);
        if (dist) newState[talhaoId] = [{ tempId: generateId(), variedadeId: loteVarId, areaHa: dist.areaHa }];
      });
      autoSaveVariedades(newState);
      return newState;
    });
    setLoteSelecionados([]); setLoteVarId(''); setIsModalVarOpen(false);
  };

  const confirmarModalTaxas = () => {
    if (!loteTaxaId) return showAlert("Atenção", "Selecione um gabarito.", "danger");
    loteSelecionados.forEach(id => autoSaveTaxas(id, loteTaxaId));
    setLoteSelecionados([]); setLoteTaxaId(''); setIsModalTaxaOpen(false);
  };

  // Customização de Cores das Variedades
  const [customColors, setCustomColors] = useState({});
  const handleUpdateVarColor = (variedadeId, novaCor) => {
    setCustomColors(prev => ({ ...prev, [variedadeId]: novaCor }));
  };

  // ==========================================
  // FUNÇÕES AUXILIARES E DE CÁLCULO
  // ==========================================
  const getCulturaNome = (id) => (culturas || []).find(c => c.id === id)?.nome || 'Cultura Desconhecida';
  const getVariedadeNome = (id) => (variedades || []).find(v => v.id === id)?.nome || 'Semente Deletada';
  const getTaxaNome = (id) => (taxasPlantio || []).find(t => t.id === id)?.nome || 'Pendente...';

  const calcularAreaTotalCultura = (culturaPlan) => {
    return (culturaPlan?.distribuicao || []).reduce((acc, dist) => acc + (parseFloat(dist.areaHa) || 0), 0);
  };

  const calcularEmbalagens = (areaHa, taxaId, variedadeId) => {
    if (!areaHa || !taxaId || !variedadeId) return { total: 0, tipo: '' };
    const taxa = (taxasPlantio || []).find(t => t.id === taxaId);
    const varObj = (variedades || []).find(v => v.id === variedadeId);
    const emb = (embalagens || []).find(e => e.id === varObj?.embalagemId);
    
    if (!taxa || !emb) return { total: 0, tipo: '' };

    let totalNecessario = 0;
    if (taxa.tipo === 'kg' && emb.tipoUnidade === 'kg') {
      totalNecessario = taxa.kgPorHa * areaHa;
    } else if (taxa.tipo === 'sementes_ha' && emb.tipoUnidade === 'sementes') {
      totalNecessario = taxa.sementesPorHa * areaHa;
    } else if (taxa.tipo === 'sementes_metro' && emb.tipoUnidade === 'sementes') {
      const sementesPorHa = (10000 / taxa.espacamento) * taxa.sementesPorMetro;
      totalNecessario = sementesPorHa * areaHa;
    }
    
    const tipoEmbalagemFormatado = emb.tipoEmbalagem === 'bag' ? 'Bags' : 'Sacas';
    return { total: totalNecessario / emb.capacidade, tipo: tipoEmbalagemFormatado };
  };

  const getResumoVariedades = (culturaPlan) => {
    const resumo = {};
    (culturaPlan?.distribuicao || []).forEach(dist => {
      const rows = editVarConfig[dist.talhaoId] || [];
      rows.forEach(r => {
        if (r.variedadeId && r.areaHa) {
          if (!resumo[r.variedadeId]) resumo[r.variedadeId] = { ha: 0, embalagens: 0, tipoEmb: '' };
          resumo[r.variedadeId].ha += parseFloat(r.areaHa);
          
          const embCalc = calcularEmbalagens(parseFloat(r.areaHa), dist.taxaId, r.variedadeId);
          resumo[r.variedadeId].embalagens += embCalc.total;
          if (embCalc.tipo) resumo[r.variedadeId].tipoEmb = embCalc.tipo;
        }
      });
    });
    return Object.entries(resumo).sort((a, b) => b[1].ha - a[1].ha);
  };
  // ==========================================
  // RENDERIZAÇÃO PRINCIPAL E TELAS
  // ==========================================
  const safraAtiva = (planosSafra || []).find(s => s.id === selectedSafraId);

  return (
    <div className="flex flex-col h-full bg-gray-50 min-h-screen pt-12 lg:pt-0">
      <Header title="Gestão de Safra e Plantio" />
      
      <main className="px-4 lg:px-8 py-4 animate-fade-in pb-32">
        
        {/* TABS PRINCIPAIS */}
        <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-gray-200 mb-6">
          <button 
            onClick={() => { setActiveMainTab('culturas'); setViewCulturas('list_safras'); }}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeMainTab === 'culturas' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            1. Planejar Culturas
          </button>
          <button 
            onClick={() => { setActiveMainTab('variedades'); setViewVariedades('select_safra'); }}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeMainTab === 'variedades' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            2. Planejar Variedades e Taxas
          </button>
        </div>

        {/* ========================================== */}
        {/* ABA 1: PLANEJAR CULTURAS                     */}
        {/* ========================================== */}
        {activeMainTab === 'culturas' && (
          <div className="animate-fade-in">
            
            {/* VIEW 1.1: LISTA DE SAFRAS */}
            {viewCulturas === 'list_safras' && (
              <div>
                <button onClick={() => setViewCulturas('create_safra')} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-md mb-8 transition-all">
                  <Plus size={24} /> Nova Safra
                </button>
                
                <h2 className="text-lg font-bold text-gray-800 mb-4 px-2">Safras Cadastradas</h2>
                <div className="space-y-4">
                  {(!planosSafra || planosSafra.length === 0) ? (
                    <p className="text-center text-gray-500 text-sm mt-6">Nenhuma safra criada.</p>
                  ) : (
                    planosSafra.map(safra => (
                      <div key={safra.id} onClick={() => { setSelectedSafraId(safra.id); setViewCulturas('view_safra'); }} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-emerald-400 cursor-pointer transition-all flex justify-between items-center group">
                        <div className="flex items-center gap-4">
                          <div className="bg-emerald-100 p-3 rounded-xl text-emerald-700"><CalendarDays size={28} /></div>
                          <div>
                            <h3 className="font-black text-gray-800 text-xl">{safra.safra}</h3>
                            <p className="text-sm text-gray-500 mt-1 font-bold">{(safra.culturasPlanejadas || []).length} culturas planejadas</p>
                          </div>
                        </div>
                        <ChevronRight className="text-gray-300 group-hover:text-emerald-600" size={24} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* VIEW 1.2: CRIAR SAFRA */}
            {viewCulturas === 'create_safra' && (
              <div>
                <button onClick={() => setViewCulturas('list_safras')} className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 font-bold mb-6"><ArrowLeft size={20} /> Voltar</button>
                <Card className="mb-6 border-l-4 border-l-emerald-600">
                  <h2 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2"><CalendarDays size={20} className="text-emerald-600" /> Identificação da Safra</h2>
                  
                  <div className="flex flex-col gap-2 w-full max-w-md">
                    <label className="block text-xs font-bold text-gray-500 uppercase">Ano Agrícola</label>
                    <input 
                      type="text" 
                      value={novaSafra} 
                      onChange={handleSafraChange} 
                      placeholder="Ex: 25/26" 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none text-lg" 
                    />
                    <label className="flex items-center gap-2 cursor-pointer mt-2 ml-1">
                      <input 
                        type="checkbox" 
                        checked={isTerceiraSafra} 
                        onChange={(e) => setIsTerceiraSafra(e.target.checked)} 
                        className="w-5 h-5 text-emerald-600 rounded border-gray-300 cursor-pointer"
                      />
                      <span className="text-sm font-bold text-gray-600">Marcar como 3ª Safra (Inverno)</span>
                    </label>
                  </div>

                  <button onClick={handleCriarSafra} className="mt-8 w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 px-8 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md">
                    Criar Safra
                  </button>
                </Card>
              </div>
            )}
            {/* VIEW 1.3: DETALHES DA SAFRA E LISTA DE CULTURAS */}
            {viewCulturas === 'view_safra' && safraAtiva && (
              <div>
                <button onClick={() => setViewCulturas('list_safras')} className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 font-bold mb-6"><ArrowLeft size={20} /> Voltar</button>
                
                <Card className="mb-8 border-l-4 border-l-emerald-600 bg-emerald-50/20">
                  <h2 className="text-2xl font-black text-gray-800 mb-1">{safraAtiva.safra}</h2>
                  <p className="text-sm font-bold text-emerald-700">Planejamento Macro de Culturas</p>
                </Card>

                <button onClick={() => iniciarDistribuicaoCultura(safraAtiva.id)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 shadow-md mb-8 transition-all">
                  <Map size={24} /> Começar Distribuição de Cultura
                </button>

                <h3 className="text-lg font-bold text-gray-800 mb-4 px-2">Culturas na Safra</h3>
                <div className="space-y-4">
                  {(!safraAtiva.culturasPlanejadas || safraAtiva.culturasPlanejadas.length === 0) ? (
                    <p className="text-center text-gray-500 text-sm mt-6">Nenhuma cultura distribuída nesta safra ainda.</p>
                  ) : (
                    safraAtiva.culturasPlanejadas.map(cp => (
                      <div key={cp.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:border-emerald-300">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${cp.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                            <Leaf size={28} />
                          </div>
                          <div>
                            <h3 className="font-black text-gray-800 text-xl">{getCulturaNome(cp.culturaId)}</h3>
                            <p className="text-sm text-gray-500 font-bold mt-1">
                              {calcularAreaTotalCultura(cp).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ha Planejados
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
                          <select 
                            value={cp.status} 
                            onChange={(e) => alterarStatusCultura(safraAtiva.id, cp.id, e.target.value)}
                            className={`font-bold text-sm rounded-lg p-2 outline-none border-2 cursor-pointer ${cp.status === 'Ativo' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
                          >
                            <option value="Ativo">🟢 Ativo</option>
                            <option value="Finalizado">⚪ Finalizado</option>
                          </select>
                          <button 
                            onClick={() => excluirCulturaPlanejada(safraAtiva.id, cp.id)} 
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" 
                            title="Excluir Distribuição"
                          >
                            <Trash size={20} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* VIEW 1.4: DISTRIBUIR CULTURA NOS TALHÕES */}
            {viewCulturas === 'distribute_cultura' && safraAtiva && (
              <div>
                <button onClick={() => setViewCulturas('view_safra')} className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 font-bold mb-6"><ArrowLeft size={20} /> Voltar sem Salvar</button>
                
                <Card className="mb-6 border-t-4 border-t-emerald-600">
                  <h2 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2">1. Selecione a Cultura</h2>
                  <select 
                    value={distCulturaId} 
                    onChange={(e) => setDistCulturaId(e.target.value)} 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold text-gray-800 focus:border-emerald-500 outline-none"
                  >
                    <option value="" disabled>Qual cultura será plantada?</option>
                    {(culturas || []).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </Card>

                {distCulturaId && (
                  <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-4 px-2">
                      <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">2. Distribua nos Talhões</h2>
                    </div>
                    
                    <div className="space-y-3 mb-24">
                      {(talhoes || []).map(talhao => {
                        const config = distTalhoes[talhao.id];
                        if (!config) return null;
                        const isSelected = config.selecionado;
                        const maxArea = config.areaMaxima;
                        
                        // Trava visual: Se não tem área disponível, fica cinza e bloqueado
                        if (maxArea <= 0) {
                          return (
                            <div key={talhao.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 opacity-60">
                              <div className="flex items-center gap-3">
                                <Square className="text-gray-300" size={24} />
                                <div>
                                  <span className="font-bold text-gray-500 text-lg block">{talhao.nome}</span>
                                  <span className="text-xs text-red-500 font-bold">100% da área já ocupada nesta safra</span>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={talhao.id} className={`flex flex-col p-4 bg-white rounded-xl border transition-all ${isSelected ? 'border-emerald-500 shadow-md ring-1 ring-emerald-500' : 'border-gray-200 cursor-pointer hover:border-emerald-300'}`}>
                            <div className="flex items-center justify-between" onClick={() => handleToggleTalhaoDist(talhao.id)}>
                              <div className="flex items-center gap-3">
                                {isSelected ? <CheckSquare className="text-emerald-600 cursor-pointer" size={24} /> : <Square className="text-gray-300 cursor-pointer" size={24} />}
                                <div>
                                  <span className="font-bold text-gray-800 text-lg block">{talhao.nome}</span>
                                  <span className="text-xs text-gray-500 font-bold">{maxArea.toLocaleString('pt-BR')} ha disponíveis</span>
                                </div>
                              </div>
                            </div>
                            
                            {isSelected && (
                              <div className="mt-4 pt-4 border-t border-gray-100 animate-fade-in" onClick={e => e.stopPropagation()}>
                                <label className="block text-xs font-bold text-emerald-600 uppercase mb-2">Área a Plantar (ha)</label>
                                <input 
                                  type="number" 
                                  step="0.01" 
                                  min="0"
                                  max={maxArea}
                                  value={config.areaHa || ''} 
                                  onChange={(e) => handleChangeAreaDist(talhao.id, e.target.value)} 
                                  className="w-full md:w-1/2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-800 font-black focus:ring-2 focus:ring-emerald-500 outline-none" 
                                />
                                <p className="text-[10px] text-gray-400 mt-1 font-bold">*O sistema impede exceder os {maxArea}ha disponíveis.</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="fixed bottom-0 left-0 lg:left-64 right-0 p-4 bg-white border-t border-gray-200 flex justify-end z-40 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
                      <button onClick={salvarDistribuicaoCultura} className="w-full md:w-auto bg-emerald-600 text-white font-black py-4 px-8 rounded-xl flex items-center justify-center gap-2 shadow-md hover:bg-emerald-700 transition-all">
                        <Save size={20} /> Salvar Distribuição
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {/* ========================================== */}
        {/* ABA 2: PLANEJAR VARIEDADES E TAXAS         */}
        {/* ========================================== */}
        {activeMainTab === 'variedades' && (
          <div className="animate-fade-in">
            
            {/* VIEW 2.1: SELECIONAR SAFRA */}
            {viewVariedades === 'select_safra' && (
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-4 px-2">1. Selecione a Safra</h2>
                <div className="space-y-4">
                  {(!planosSafra || planosSafra.length === 0) ? (
                    <p className="text-center text-gray-500 text-sm mt-6">Nenhuma safra criada.</p>
                  ) : (
                    planosSafra.map(safra => (
                      <div key={safra.id} onClick={() => { setSelectedSafraId(safra.id); setViewVariedades('select_cultura'); }} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-400 cursor-pointer transition-all flex justify-between items-center group">
                        <div className="flex items-center gap-4">
                          <div className="bg-blue-100 p-3 rounded-xl text-blue-700"><CalendarDays size={28} /></div>
                          <div>
                            <h3 className="font-black text-gray-800 text-xl">{safra.safra}</h3>
                            <p className="text-sm text-gray-500 mt-1 font-bold">{(safra.culturasPlanejadas || []).filter(c => c.status === 'Ativo').length} culturas ativas</p>
                          </div>
                        </div>
                        <ChevronRight className="text-gray-300 group-hover:text-blue-600" size={24} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* VIEW 2.2: SELECIONAR CULTURA DA SAFRA */}
            {viewVariedades === 'select_cultura' && safraAtiva && (
              <div>
                <button onClick={() => setViewVariedades('select_safra')} className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-bold mb-6"><ArrowLeft size={20} /> Voltar</button>
                <Card className="mb-6 border-l-4 border-l-blue-600 bg-blue-50/20">
                  <h2 className="text-2xl font-black text-gray-800 mb-1">{safraAtiva.safra}</h2>
                  <p className="text-sm font-bold text-blue-700">Selecione a cultura que deseja planejar sementes/taxas</p>
                </Card>

                <div className="space-y-4">
                  {(!safraAtiva.culturasPlanejadas || safraAtiva.culturasPlanejadas.length === 0) ? (
                    <p className="text-center text-gray-500 text-sm mt-6">Nenhuma cultura foi distribuída nesta safra.</p>
                  ) : (
                    safraAtiva.culturasPlanejadas.filter(cp => cp.status === 'Ativo').map(cp => (
                      <div key={cp.id} onClick={() => abrirPlanejamentoVariedades(safraAtiva.id, cp.id)} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-400 cursor-pointer transition-all flex justify-between items-center group">
                        <div className="flex items-center gap-4">
                          <div className="bg-blue-100 p-3 rounded-xl text-blue-700"><Sprout size={28} /></div>
                          <div>
                            <h3 className="font-black text-gray-800 text-xl">{getCulturaNome(cp.culturaId)}</h3>
                            <p className="text-sm text-gray-500 font-bold mt-1">{calcularAreaTotalCultura(cp).toLocaleString('pt-BR')} ha a planejar</p>
                          </div>
                        </div>
                        <ChevronRight className="text-gray-300 group-hover:text-blue-600" size={24} />
                      </div>
                    ))
                  )}
                  {safraAtiva.culturasPlanejadas?.filter(cp => cp.status === 'Finalizado').length > 0 && (
                     <p className="text-center text-gray-400 text-xs mt-4 uppercase tracking-widest font-bold">Existem culturas marcadas como Finalizadas ocultas.</p>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 2.3: O PLANEJAMENTO MICRO (VARIEDADES + TAXAS) */}
            {viewVariedades === 'plan_variedades' && safraAtiva && selectedCulturaPlanId && (
              (() => {
                const culturaPlan = safraAtiva.culturasPlanejadas.find(cp => cp.id === selectedCulturaPlanId);
                const sementesDisponiveis = (variedades || []).filter(v => v.culturaId === culturaPlan.culturaId);
                const resumoVariedades = getResumoVariedades(culturaPlan);
                const todosIdsNoPlano = (culturaPlan.distribuicao || []).map(d => d.talhaoId);

                const defaultPalette = ['bg-blue-600', 'bg-cyan-500', 'bg-indigo-500', 'bg-sky-500', 'bg-blue-800', 'bg-teal-600'];
                const varColorsMap = {};
                sementesDisponiveis.forEach((v, idx) => { varColorsMap[v.id] = customColors[v.id] || defaultPalette[idx % defaultPalette.length]; });

                const groupedAreas = (culturaPlan.distribuicao || []).reduce((acc, dist) => {
                  const talhao = (talhoes || []).find(t => t.id === dist.talhaoId);
                  if (!talhao) return acc;
                  const retiro = talhao.retiro?.trim() || 'SEM RETIRO';
                  if (!acc[retiro]) acc[retiro] = { totalArea: 0, distribuicoes: [] };
                  acc[retiro].distribuicoes.push({ dist, talhao });
                  acc[retiro].totalArea += (parseFloat(dist.areaHa) || 0);
                  return acc;
                }, {});

                return (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <button onClick={() => setViewVariedades('select_cultura')} className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-bold transition-colors"><ArrowLeft size={20} /> Voltar</button>
                      
                      {!isSelectionMode ? (
                        <button onClick={() => setIsSelectionMode(true)} className="text-sm font-bold text-blue-700 bg-blue-50 px-4 py-2 rounded-xl border border-blue-200 shadow-sm hover:bg-blue-100 transition-colors">
                          Modo de Seleção (Lote)
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 animate-fade-in">
                          <button onClick={() => selecionarTodosLote(todosIdsNoPlano)} className="text-sm font-bold text-blue-700 bg-blue-100 px-4 py-2 rounded-xl border border-blue-300 shadow-sm hover:bg-blue-200 transition-colors">
                            {loteSelecionados.length === todosIdsNoPlano.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                          </button>
                          <button onClick={() => { setIsSelectionMode(false); setLoteSelecionados([]); }} className="text-gray-500 hover:text-red-500 bg-white border border-gray-200 p-2 rounded-xl shadow-sm" title="Sair">
                            <X size={20} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* FAIXA DE RESUMO */}
                    <div className="flex overflow-x-auto gap-3 pb-4 mb-2 hide-scrollbar">
                      <div onClick={() => setFiltroVariedade(null)} className={`flex-shrink-0 flex flex-col justify-center px-4 py-3 rounded-xl border cursor-pointer transition-all min-w-[120px] ${!filtroVariedade ? 'bg-gray-100 text-gray-800 border-gray-300 shadow-inner' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 flex items-center gap-1 mb-0.5"><Filter size={12}/> Mostrar Todos</span>
                        <span className="font-black text-lg leading-tight">{calcularAreaTotalCultura(culturaPlan).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ha</span>
                      </div>
                      
                      {resumoVariedades.map(([id, dados]) => (
                        <div key={id} onClick={() => setFiltroVariedade(filtroVariedade === id ? null : id)} className={`flex-shrink-0 flex flex-col justify-center px-4 py-3 rounded-xl border cursor-pointer transition-all min-w-[140px] relative ${filtroVariedade === id ? 'ring-2 ring-blue-500 shadow-md border-transparent' : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'}`}>
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-black uppercase tracking-tighter text-gray-400 truncate max-w-[80px]">
                              {getVariedadeNome(id)}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); setColorPickerTarget({ id, corAtual: customColors[id] || '#3b82f6' }); }}
                              className="w-4 h-4 rounded-full border-2 border-white shadow-sm hover:scale-125 transition-transform"
                              style={{ backgroundColor: customColors[id] || '#3b82f6' }}
                            />
                          </div>
                          <span className="font-black text-lg leading-none text-gray-800">{dados.ha.toLocaleString('pt-BR')} ha</span>
                          {dados.embalagens > 0 && (
                            <span className="text-[11px] font-bold text-blue-700 mt-1 leading-none">{dados.embalagens.toLocaleString('pt-BR')} {dados.tipoEmb}</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* LISTAGEM DE TALHÕES DA CULTURA */}
                    <div className="space-y-4">
                      {Object.entries(groupedAreas).map(([retiro, data]) => {
                        const distFiltradas = data.distribuicoes.filter(({ dist }) => !filtroVariedade || (editVarConfig[dist.talhaoId] || []).some(r => r.variedadeId === filtroVariedade));
                        if (distFiltradas.length === 0) return null;

                        return (
                          <div key={retiro} className="mb-4">
                            <div className="mb-2 px-2">
                              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{retiro} - {distFiltradas.length} áreas</span>
                            </div>

                            <div className="space-y-3">
                              {distFiltradas.map(({ dist, talhao }) => {
                                const rows = editVarConfig[dist.talhaoId] || [];
                                const isSelected = loteSelecionados.includes(dist.talhaoId);
                                const isExpanded = !!expandedTalhoes[dist.talhaoId];

                                return (
                                  <div key={dist.talhaoId} className={`bg-white rounded-2xl border ${isSelected ? 'border-blue-500 shadow-md ring-1 ring-blue-500' : 'border-gray-100 shadow-sm'} flex flex-col transition-all`}>
                                    <div className="flex flex-row items-center gap-4 p-4 cursor-pointer" onClick={() => isSelectionMode ? handleToggleLote(dist.talhaoId) : toggleExpandTalhao(dist.talhaoId)}>
                                      {isSelectionMode && (
                                        <div className="shrink-0 animate-fade-in">
                                          {isSelected ? <CheckSquare className="text-blue-600" size={24} /> : <Square className="text-gray-300" size={24} />}
                                        </div>
                                      )}
                                      
                                      <div className="flex flex-1 items-center justify-between gap-4">
                                        <div className="flex flex-row items-baseline gap-2 shrink-0">
                                          <span className="font-bold text-gray-800 text-lg uppercase">{talhao.nome}</span>
                                          <span className="text-gray-400 font-bold text-sm hidden md:block">- {dist.areaHa} ha</span>
                                        </div>
                                        
                                        {/* Status Rápido no Card Fechado */}
                                        <div className="flex-1 flex justify-end gap-3 text-xs font-bold items-center">
                                          {!dist.taxaId && <span className="text-orange-500 bg-orange-50 px-2 py-1 rounded hidden md:block">Sem Taxa</span>}
                                          {rows.length === 0 && <span className="text-blue-500 bg-blue-50 px-2 py-1 rounded hidden md:block">Sem Semente</span>}
                                          {(dist.taxaId && rows.length > 0) && <span className="text-emerald-500 bg-emerald-50 px-2 py-1 rounded hidden md:block"><CheckCircle size={14} className="inline mr-1"/>OK</span>}
                                        </div>
                                        
                                        <div className="shrink-0 text-gray-300 ml-2">{isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</div>
                                      </div>
                                    </div>

                                    {/* ÁREA EXPANDIDA UNIFICADA (TAXA + VARIEDADE) */}
                                    {isExpanded && (
                                      <div className="px-4 pb-4 pt-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl animate-fade-in">
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                          
                                          {/* BLOCO DA TAXA */}
                                          <div className="col-span-1 border-b lg:border-b-0 lg:border-r border-gray-200 pb-4 lg:pb-0 lg:pr-6">
                                            <label className="block text-[11px] font-black text-gray-500 mb-2 uppercase tracking-widest flex items-center gap-1"><Calculator size={14}/> Gabarito de Taxa</label>
                                            <select value={dist.taxaId || ''} onChange={(e) => autoSaveTaxas(dist.talhaoId, e.target.value)} className={`w-full border rounded-xl p-3 text-sm font-bold outline-none ${!dist.taxaId ? 'bg-red-50 border-red-200 text-red-800' : 'bg-white border-gray-200 text-gray-800 focus:border-blue-500 shadow-sm'}`}>
                                              <option value="" disabled>Escolha um Gabarito...</option>
                                              {(taxasPlantio || []).map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                                            </select>
                                          </div>

                                          {/* BLOCO DAS VARIEDADES */}
                                          <div className="col-span-1 lg:col-span-2">
                                            <div className="flex justify-between items-center mb-2">
                                              <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1"><Sprout size={14}/> Variedades e Hectares</label>
                                              <span className="text-[10px] font-bold text-gray-400 bg-gray-200 px-2 py-0.5 rounded-md">Total do Talhão: {dist.areaHa}ha</span>
                                            </div>
                                            
                                            <div className="flex flex-col gap-2">
                                              {rows.map((row) => (
                                                <div key={row.tempId} className="flex items-center gap-2 w-full">
                                                  <select value={row.variedadeId} onChange={(e) => handleUpdateVariedadeRow(dist.talhaoId, row.tempId, 'variedadeId', e.target.value)} className={`flex-[2] border rounded-xl p-3 text-sm font-bold outline-none shadow-sm ${!row.variedadeId ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200 focus:border-blue-500'}`}>
                                                    <option value="" disabled>Semente...</option>
                                                    {sementesDisponiveis.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
                                                  </select>
                                                  <input type="number" step="0.01" max={dist.areaHa} value={row.areaHa} onChange={(e) => handleUpdateVariedadeRow(dist.talhaoId, row.tempId, 'areaHa', e.target.value)} placeholder="Hectares" className="w-24 border border-gray-200 bg-white font-bold rounded-xl p-3 text-sm text-center outline-none focus:border-blue-500 shadow-sm" />
                                                  <button onClick={() => handleRemoveVariedadeRow(dist.talhaoId, row.tempId)} className="text-gray-400 hover:text-red-500 bg-white border border-gray-200 hover:bg-red-50 p-3 rounded-xl shadow-sm"><Trash size={18} /></button>
                                                </div>
                                              ))}
                                              <button onClick={() => handleAddVariedadeRow(dist.talhaoId)} className="self-start text-[11px] font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-xl flex items-center gap-1 mt-1 hover:bg-blue-100 transition-colors border border-blue-200 shadow-sm">
                                                <Plus size={14} /> Nova Divisão
                                              </button>
                                            </div>
                                          </div>
                                          
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* BOTÕES FLUTUANTES DE AÇÃO EM LOTE */}
                    {loteSelecionados.length > 0 && (
                      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40 animate-fade-in flex flex-col md:flex-row gap-3 w-[90%] md:w-auto">
                        <button onClick={() => setIsModalVarOpen(true)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm md:text-base py-4 px-8 rounded-full shadow-2xl flex items-center justify-center gap-2 border border-blue-400 transition-transform hover:scale-105 whitespace-nowrap">
                          <Sprout size={18} /> Aplicar Semente ( {loteSelecionados.length} )
                        </button>
                        <button onClick={() => setIsModalTaxaOpen(true)} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black text-sm md:text-base py-4 px-8 rounded-full shadow-2xl flex items-center justify-center gap-2 border border-orange-300 transition-transform hover:scale-105 whitespace-nowrap">
                          <Calculator size={18} /> Aplicar Gabarito ( {loteSelecionados.length} )
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* ========================================== */}
        {/* MODAIS GLOBAIS DA PÁGINA                   */}
        {/* ========================================== */}
        
        {/* MODAL: AÇÃO EM LOTE VARIEDADES */}
        {isModalVarOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-gray-800 text-xl">Aplicar Variedade</h3>
                <button onClick={() => setIsModalVarOpen(false)} className="bg-gray-100 text-gray-500 p-2 rounded-full hover:bg-red-50 hover:text-red-500"><X size={20}/></button>
              </div>
              <p className="text-sm text-gray-500 mb-6 font-medium">Irá aplicar esta semente a 100% da área dos <strong className="text-blue-600">{loteSelecionados.length} talhões</strong> selecionados.</p>
              <select value={loteVarId} onChange={(e) => setLoteVarId(e.target.value)} className="w-full border-2 border-gray-200 rounded-2xl p-4 bg-gray-50 text-gray-800 font-bold mb-8 outline-none focus:border-blue-500">
                <option value="" disabled>Escolha a variedade...</option>
                {variedades?.filter(v => v.culturaId === (planosSafra?.find(s => s.id === selectedSafraId)?.culturasPlanejadas?.find(c => c.id === selectedCulturaPlanId)?.culturaId)).map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
              </select>
              <button onClick={confirmarModalVariedades} className="w-full py-4 bg-blue-600 text-white font-black text-lg rounded-2xl hover:bg-blue-700 shadow-md">Salvar</button>
            </div>
          </div>
        )}

        {/* MODAL: AÇÃO EM LOTE TAXAS */}
        {isModalTaxaOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-gray-800 text-xl">Aplicar Gabarito</h3>
                <button onClick={() => setIsModalTaxaOpen(false)} className="bg-gray-100 text-gray-500 p-2 rounded-full hover:bg-red-50 hover:text-red-500"><X size={20}/></button>
              </div>
              <p className="text-sm text-gray-500 mb-6 font-medium">Aplicar o mesmo gabarito de taxa aos <strong className="text-orange-500">{loteSelecionados.length} talhões</strong> selecionados.</p>
              <select value={loteTaxaId} onChange={(e) => setLoteTaxaId(e.target.value)} className="w-full border-2 border-gray-200 rounded-2xl p-4 bg-gray-50 text-gray-800 font-bold mb-8 outline-none focus:border-orange-500">
                <option value="" disabled>Escolha o gabarito...</option>
                {(taxasPlantio || []).map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
              <button onClick={confirmarModalTaxas} className="w-full py-4 bg-orange-500 text-white font-black text-lg rounded-2xl hover:bg-orange-600 shadow-md">Salvar</button>
            </div>
          </div>
        )}

        {/* MODAL: COLOR PICKER */}
        {colorPickerTarget && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border-t-8 border-gray-800">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-black text-gray-800">Cor no Mapa</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Identificação Visual</p>
                </div>
                <button onClick={() => setColorPickerTarget(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} className="text-gray-400" /></button>
              </div>
              <div className="grid grid-cols-4 gap-3 mb-8">
                {PRESET_COLORS.map(cor => (
                  <button key={cor} onClick={() => { handleUpdateVarColor(colorPickerTarget.id, cor); setColorPickerTarget(null); }} className={`h-12 rounded-xl hover:scale-110 shadow-sm border-2 ${colorPickerTarget.corAtual === cor ? 'border-gray-800 ring-2 ring-gray-200' : 'border-transparent'}`} style={{ backgroundColor: cor }} />
                ))}
              </div>
              <div className="pt-6 border-t border-gray-100">
                <input type="color" value={colorPickerTarget.corAtual} onChange={(e) => handleUpdateVarColor(colorPickerTarget.id, e.target.value)} className="w-full h-12 rounded-xl cursor-pointer bg-white border border-gray-200" />
              </div>
              <button onClick={() => setColorPickerTarget(null)} className="w-full mt-6 bg-gray-900 text-white py-4 rounded-2xl font-black hover:bg-black transition-all shadow-lg">CONCLUÍDO</button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}