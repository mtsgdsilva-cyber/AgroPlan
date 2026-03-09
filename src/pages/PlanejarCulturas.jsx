// src/pages/PlanejarCulturas.jsx
import React, { useState } from 'react';
import { useAgro } from '../contexts/AgroContext';
import { generateId } from '../utils/helpers';
import { CalendarDays, Map, Plus, Leaf, ChevronRight, CheckSquare, Square, ArrowLeft, Trash, X, Filter } from 'lucide-react';
import Header from '../components/Header';
import Card from '../components/Card';
import { useModal } from '../contexts/ModalContext';

export default function PlanejarCulturas() {
  const { talhoes, culturas, planosSafra, setPlanosSafra } = useAgro();
  const { showAlert, showConfirm } = useModal();

  // ==========================================
  // ESTADOS GLOBAIS
  // ==========================================
  const [currentView, setCurrentView] = useState('list_safras');
  const [selectedSafraId, setSelectedSafraId] = useState(null);

  // Estados: Criação de Safra
  const [novaSafra, setNovaSafra] = useState('');
  const [isTerceiraSafra, setIsTerceiraSafra] = useState(false);

  // Estados: Distribuição Flat Modular
  const [editCulturasConfig, setEditCulturasConfig] = useState({});
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [loteSelecionados, setLoteSelecionados] = useState([]);
  const [isModalCulturaOpen, setIsModalCulturaOpen] = useState(false);
  const [loteCulturaId, setLoteCulturaId] = useState('');
  const [filtroCultura, setFiltroCultura] = useState(null);
  // Estado do Modal de Visualização Rápida de Talhões
  const [viewCulturaModal, setViewCulturaModal] = useState({ isOpen: false, safraId: null, culturaId: null, culturaNome: '', safraNome: '' });

  // ==========================================
  // FUNÇÕES DE SAFRA
  // ==========================================
  const handleSafraChange = (e) => {
    let value = e.target.value.replace(/\D/g, ''); 
    if (value.length > 4) value = value.slice(0, 4); 
    if (value.length > 2) value = `${value.slice(0, 2)}/${value.slice(2)}`;
    setNovaSafra(value);
  };

  const handleCriarSafra = (e) => {
    e.preventDefault();
    if (novaSafra.length !== 5) return showAlert("Atenção", "Formato inválido. Ex: 25/26", "danger");
    
    const nomeSafraFinal = isTerceiraSafra ? `${novaSafra} - 3ª Safra` : novaSafra;
    
    const novaSafraObj = {
      id: generateId(),
      safra: nomeSafraFinal,
      dataCriacao: new Date().toISOString(),
      statusCulturas: {},
      areas: [] 
    };

    setPlanosSafra([...(planosSafra || []), novaSafraObj]);
    setNovaSafra(''); setIsTerceiraSafra(false); setCurrentView('list_safras');
    showAlert("Sucesso", `Safra ${nomeSafraFinal} criada!`, "success");
  };

  const handleDeleteSafra = (e, id, nome) => {
    e.stopPropagation();
    showConfirm("Excluir Safra", `Tem certeza que deseja excluir a safra ${nome}? Todo o planejamento será perdido.`, () => {
      setPlanosSafra(prev => prev.filter(s => s.id !== id));
      if (selectedSafraId === id) setCurrentView('list_safras');
    }, "danger");
  };

  const handleMudarStatusCultura = (safraId, culturaId, novoStatus) => {
    setPlanosSafra(prev => prev.map(s => {
      if (s.id === safraId) return { ...s, statusCulturas: { ...(s.statusCulturas || {}), [culturaId]: novoStatus } };
      return s;
    }));
  };

  // ==========================================
  // LÓGICA DE DISTRIBUIÇÃO E AUTO-SPLIT (RAMIFICAÇÕES)
  // ==========================================
  const abrirDistribuicao = (safraId) => {
    const safra = (planosSafra || []).find(s => s.id === safraId);
    if (!safra) return;

    const configInicial = {};
    (talhoes || []).forEach(t => {
      const areasSalvas = (safra.areas || []).find(a => a.talhaoId === t.id)?.culturas || [];
      if (areasSalvas.length > 0) {
        configInicial[t.id] = areasSalvas.map(c => ({ ...c, tempId: generateId() }));
        
        // Se a soma salva não bater 100% da área, já cria a linha da sobra
        const currentSum = areasSalvas.reduce((sum, r) => sum + (parseFloat(r.areaHa) || 0), 0);
        if ((parseFloat(t.areaHa) || 0) - currentSum > 0.01) {
          configInicial[t.id].push({ tempId: generateId(), culturaId: '', areaHa: ((parseFloat(t.areaHa) || 0) - currentSum).toFixed(2) });
        }
      } else {
        // Talhão vazio: Inicia com a área total pronta pra receber cultura
        configInicial[t.id] = [{ tempId: generateId(), culturaId: '', areaHa: t.areaHa }];
      }
    });

    setEditCulturasConfig(configInicial);
    setSelectedSafraId(safraId);
    setLoteSelecionados([]); setIsSelectionMode(false); setFiltroCultura(null);
    setCurrentView('distribute');
  };

  const autoSaveCulturas = (novoConfig) => {
    setPlanosSafra(prev => prev.map(safra => {
      if (safra.id === selectedSafraId) {
        const areasAtualizadas = Object.entries(novoConfig).map(([talhaoId, rows]) => {
          const culturasLimpas = rows.filter(r => r.culturaId && r.areaHa && parseFloat(r.areaHa) > 0).map(r => ({
            uid: r.uid || generateId(),
            culturaId: r.culturaId,
            areaHa: parseFloat(r.areaHa) || 0,
            variedades: r.variedades || [], 
            taxaId: r.taxaId || ''
          }));
          return { talhaoId, culturas: culturasLimpas };
        }).filter(a => a.culturas.length > 0);

        const novosStatus = { ...(safra.statusCulturas || {}) };
        areasAtualizadas.forEach(a => { a.culturas.forEach(c => { if (!novosStatus[c.culturaId]) novosStatus[c.culturaId] = 'Ativo'; }); });

        return { ...safra, areas: areasAtualizadas, statusCulturas: novosStatus };
      }
      return safra;
    }));
  };

  // Função que lida com o texto sendo digitado na área
  const handleUpdateAreaRaw = (talhaoId, tempId, field, value) => {
    setEditCulturasConfig(prev => ({
      ...prev, [talhaoId]: prev[talhaoId].map(r => r.tempId === tempId ? { ...r, [field]: value } : r)
    }));
  };

  // A MÁGICA ACONTECE AQUI: Quando o usuário tira o foco (onBlur) do input de área
  const handleAreaBlur = (talhaoId, tempId, currentVal) => {
    setEditCulturasConfig(prev => {
      const rows = prev[talhaoId] || [];
      const talhao = talhoes.find(t => t.id === talhaoId);
      const maxArea = parseFloat(talhao?.areaHa) || 0;

      const somaOutros = rows.filter(r => r.tempId !== tempId).reduce((acc, r) => acc + (parseFloat(r.areaHa) || 0), 0);
      let val = parseFloat(currentVal) || 0;

      // Trava matemática se o usuário digitar mais do que cabe no talhão
      if (val + somaOutros > maxArea) {
        val = maxArea - somaOutros;
        showAlert("Atenção", "A área foi reajustada para não exceder o tamanho do talhão.", "warning");
      }

      let novasLinhas = rows.map(r => r.tempId === tempId ? { ...r, areaHa: val > 0 ? val.toFixed(2) : '' } : r);

      // Injeta a ramificação da sobra automaticamente
      const somaFinal = novasLinhas.reduce((acc, r) => acc + (parseFloat(r.areaHa) || 0), 0);
      const diff = maxArea - somaFinal;

      if (diff > 0.01) {
        novasLinhas.push({ tempId: generateId(), culturaId: '', areaHa: diff.toFixed(2) });
      }

      const newState = { ...prev, [talhaoId]: novasLinhas };
      autoSaveCulturas(newState);
      return newState;
    });
  };

  // Quando escolhe a cultura no Select
  const handleUpdateSelect = (talhaoId, tempId, field, value) => {
    setEditCulturasConfig(prev => {
      const newState = { ...prev, [talhaoId]: prev[talhaoId].map(r => r.tempId === tempId ? { ...r, [field]: value } : r) };
      autoSaveCulturas(newState); return newState;
    });
  };

  const handleRemoveCulturaRow = (talhaoId, tempId) => {
    setEditCulturasConfig(prev => {
      const rows = prev[talhaoId] || [];
      
      // Se for a única linha do talhão, apenas limpa a cultura e devolve a área total
      if (rows.length === 1) {
        const talhao = (talhoes || []).find(t => t.id === talhaoId);
        const newState = { ...prev, [talhaoId]: [{ ...rows[0], culturaId: '', areaHa: talhao?.areaHa || 0 }] };
        autoSaveCulturas(newState); 
        return newState;
      }

      // Encontra a posição exata da linha que o usuário clicou para excluir
      const indexToRemove = rows.findIndex(r => r.tempId === tempId);
      if (indexToRemove === -1) return prev;

      // Pega a quantidade de hectares da linha que vai sumir
      const areaDevolvida = parseFloat(rows[indexToRemove].areaHa) || 0;

      // Define quem vai "engolir" a área: a linha de CIMA. 
      // (Se ele excluir a primeira linha [0], a linha de baixo [1] engole a área).
      const indexRecebedor = indexToRemove > 0 ? indexToRemove - 1 : indexToRemove + 1;

      // Cria a nova lista somando a área e filtrando a excluída
      const novasLinhas = rows.map((r, i) => {
        if (i === indexRecebedor) {
          return { ...r, areaHa: ((parseFloat(r.areaHa) || 0) + areaDevolvida).toFixed(2) };
        }
        return r;
      }).filter(r => r.tempId !== tempId);

      const newState = { ...prev, [talhaoId]: novasLinhas };
      autoSaveCulturas(newState); 
      return newState;
    });
  };

const confirmarModalCultura = () => {
    if (!loteCulturaId) return;
    setEditCulturasConfig(prev => {
      const newState = { ...prev };
      loteSelecionados.forEach(talhaoId => {
        // O map já cria um novo array, garantindo a imutabilidade pro React atualizar a tela na hora
        newState[talhaoId] = (newState[talhaoId] || []).map(r => {
          
          // Se o usuário escolheu "Nenhuma" (Limpar)
          if (loteCulturaId === 'nenhuma') {
            if (filtroCultura && r.culturaId === filtroCultura) return { ...r, culturaId: '' };
            if (!filtroCultura) return { ...r, culturaId: '' }; // Limpa tudo
          } 
          // Se o usuário escolheu aplicar uma nova Cultura
          else {
            if (filtroCultura && r.culturaId === filtroCultura) return { ...r, culturaId: loteCulturaId };
            
            // AQUI ESTÁ A CORREÇÃO: 
            // Antes tinha um "&& !r.culturaId" que impedia de sobrescrever. 
            // Agora ele sobrescreve a cultura de todo o talhão selecionado, independente do que tinha antes!
            if (!filtroCultura) return { ...r, culturaId: loteCulturaId }; 
          }
          return r;
        });
      });
      autoSaveCulturas(newState); 
      return newState;
    });
    
    setLoteSelecionados([]); 
    setLoteCulturaId(''); 
    setIsModalCulturaOpen(false);
    
    // Limpa o filtro automaticamente
    if (filtroCultura) setFiltroCultura(null); 
  };

  const handleToggleLote = (talhaoId) => setLoteSelecionados(prev => prev.includes(talhaoId) ? prev.filter(id => id !== talhaoId) : [...prev, talhaoId]);
  const selecionarTodosLote = () => setLoteSelecionados(loteSelecionados.length === (talhoes || []).length ? [] : (talhoes || []).map(t => t.id));

  // ==========================================
  // RENDERIZAÇÃO E TELAS
  // ==========================================
  const safraAtiva = (planosSafra || []).find(s => s.id === selectedSafraId);
  const getCulturaNome = (id) => (culturas || []).find(c => c.id === id)?.nome || 'Desconhecida';
  const getCulturaCor = (id) => (culturas || []).find(c => c.id === id)?.cor || '#10b981'; // Padrão verde se não tiver cor

  // Cálculos Reativos da Tela de Distribuição (Aba 4)
  const getResumoEdicao = () => {
    const resumo = {};
    let areaTotalPlanejada = 0;
    let areaTotalLivre = 0;

    Object.values(editCulturasConfig).forEach((rows) => {
      rows.forEach(r => {
        const val = parseFloat(r.areaHa) || 0;
        if (r.culturaId) {
          if (!resumo[r.culturaId]) resumo[r.culturaId] = 0;
          resumo[r.culturaId] += val;
          areaTotalPlanejada += val;
        } else {
          areaTotalLivre += val;
        }
      });
    });
    const lista = Object.entries(resumo).map(([id, ha]) => ({ id, ha })).sort((a, b) => b.ha - a.ha);
    return { lista, areaTotalPlanejada, areaTotalLivre };
  };

  const resumoDinamico = currentView === 'distribute' ? getResumoEdicao() : { lista: [] };

  const groupedTalhoes = (talhoes || []).reduce((acc, talhao) => {
    const retiro = talhao.retiro?.trim() || 'SEM RETIRO';
    if (!acc[retiro]) acc[retiro] = { totalArea: 0, talhoes: [] };
    acc[retiro].talhoes.push(talhao);
    acc[retiro].totalArea += (parseFloat(talhao.areaHa) || 0);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full bg-gray-50 min-h-screen pt-12 lg:pt-0">
      <Header title="Planejar Culturas" />
      
      <main className="px-4 lg:px-8 py-4 animate-fade-in pb-32">
        
       {/* VIEW 1: DASHBOARD DE SAFRAS (MESCLADO) */}
        {currentView === 'list_safras' && (
          <div>
            {/* BOTÃO DISCRETO DE CRIAR SAFRA NO TOPO DIREITO */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-gray-800">Visão Geral das Safras</h2>
              <button 
                onClick={() => setCurrentView('create_safra')} 
                className="text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2"
              >
                <Plus size={16} /> Nova Safra
              </button>
            </div>
            
            <div className="space-y-8">
              {(!planosSafra || planosSafra.length === 0) ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-gray-200 shadow-sm">
                  <CalendarDays size={48} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Nenhuma safra planejada.</h3>
                  <p className="text-gray-500 text-sm">Clique em "Nova Safra" ali em cima para começar.</p>
                </div>
              ) : (
                planosSafra.map(safra => {
                  // Calcula o resumo de culturas desta safra específica
                  const r = {};
                  (safra?.areas || []).forEach(area => {
                    (area.culturas || []).forEach(c => {
                      if (c.culturaId && c.areaHa) {
                        if (!r[c.culturaId]) r[c.culturaId] = 0;
                        r[c.culturaId] += parseFloat(c.areaHa);
                      }
                    });
                  });
                  const resumo = Object.entries(r).map(([id, ha]) => ({ id, ha })).sort((a, b) => b.ha - a.ha);
                  const isStarted = resumo.length > 0;

                  return (
                    <div key={safra.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 animate-fade-in">
                      
                      {/* CABEÇALHO DA SAFRA E BOTÕES DE AÇÃO */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 border-b border-gray-100 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
                            <CalendarDays size={20} />
                          </div>
                          <h2 className="text-lg font-bold text-gray-800">
                            Culturas Planejadas <span className="text-gray-400 font-medium ml-1">Safra {safra.safra}</span>
                          </h2>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => abrirDistribuicao(safra.id)} 
                            className={`flex-1 md:flex-none text-sm font-semibold py-2 px-5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm border ${isStarted ? 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50' : 'bg-emerald-600 text-white border-transparent hover:bg-emerald-700'}`}
                          >
                            <Map size={16} /> {isStarted ? 'Editar Distribuição' : 'Distribuir Culturas'}
                          </button>
                          <button 
                            onClick={(e) => handleDeleteSafra(e, safra.id, safra.safra)} 
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-all" 
                            title="Excluir Safra"
                          >
                            <Trash size={18} />
                          </button>
                        </div>
                      </div>

                      {/* LISTA DE CULTURAS (SLIM DESIGN) */}
                      {resumo.length === 0 ? (
                        <p className="text-gray-400 text-sm font-medium italic px-2">Nenhuma cultura distribuída nesta safra ainda.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          {resumo.map(item => {
                            const status = (safra.statusCulturas || {})[item.id] || 'Ativo';
                            const corCultura = getCulturaCor(item.id);
                            return (
                             <div 
                                key={item.id} 
                                onClick={() => setViewCulturaModal({ isOpen: true, safraId: safra.id, culturaId: item.id, culturaNome: getCulturaNome(item.id), safraNome: safra.safra })}
                                className="flex flex-col p-3.5 rounded-xl border border-gray-100 bg-white hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
                              >
                                
                                <div className="flex items-start justify-between mb-3">
                                  {/* Ícone e Nome da Cultura */}
                                  <div className="flex items-center gap-2">
                                    <Leaf size={16} style={{ color: corCultura }} />
                                    <span className="font-semibold text-gray-700 text-sm truncate max-w-[100px]">
                                      {getCulturaNome(item.id)}
                                    </span>
                                  </div>
                                  
                                  {/* Seletor de Status (Impede que o clique abra o modal) */}
                                  <select 
                                    value={status} 
                                    onClick={(e) => e.stopPropagation()} 
                                    onChange={(e) => handleMudarStatusCultura(safra.id, item.id, e.target.value)}
                                    className={`text-[10px] font-bold uppercase tracking-wider rounded outline-none cursor-pointer text-right appearance-none bg-transparent transition-colors ${status === 'Ativo' ? 'text-emerald-500 hover:text-emerald-700' : 'text-gray-400 hover:text-gray-600'}`}
                                    title="Alterar Status"
                                  >
                                    <option value="Ativo">Ativa</option>
                                    <option value="Finalizado">Finalizada</option>
                                  </select>
                                </div>
                                
                                {/* Área em destaque na parte inferior */}
                                <div className="flex items-baseline gap-1 mt-auto">
                                  <span className="text-xl font-bold text-gray-700 leading-none">
                                    {item.ha.toLocaleString('pt-BR')}
                                  </span>
                                  <span className="text-xs font-semibold text-gray-400">
                                    ha
                                  </span>
                                </div>
                                
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: CRIAR SAFRA */}
        {currentView === 'create_safra' && (
          <div>
            <button onClick={() => setCurrentView('list_safras')} className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 font-bold mb-6"><ArrowLeft size={20} /> Voltar</button>
            <Card className="mb-6 border-l-4 border-l-emerald-600">
              <h2 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2"><CalendarDays size={20} className="text-emerald-600" /> Identificação da Safra</h2>
              <div className="flex flex-col gap-2 w-full max-w-md">
                <label className="block text-xs font-bold text-gray-500 uppercase">Ano Agrícola</label>
                <input type="text" value={novaSafra} onChange={handleSafraChange} placeholder="Ex: 25/26" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none text-lg" />
                <label className="flex items-center gap-2 cursor-pointer mt-2 ml-1">
                  <input type="checkbox" checked={isTerceiraSafra} onChange={(e) => setIsTerceiraSafra(e.target.checked)} className="w-5 h-5 text-emerald-600 rounded border-gray-300 cursor-pointer" />
                  <span className="text-sm font-bold text-gray-600">Marcar como 3ª Safra (Inverno)</span>
                </label>
              </div>
              <button onClick={handleCriarSafra} className="mt-8 w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 px-8 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md">Salvar Safra</button>
            </Card>
          </div>
        )}

        {/* VIEW 3 FOI MESCLADA COM A VIEW 1 */}

        {/* VIEW 4: DISTRIBUIR CULTURAS (MINI-CARDS FLAT) */}
        {currentView === 'distribute' && safraAtiva && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <button onClick={() => setCurrentView('list_safras')} className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 font-semibold transition-colors"><ArrowLeft size={20} /> Voltar</button>
              
              {!isSelectionMode ? (
                <button onClick={() => setIsSelectionMode(true)} className="text-sm font-bold text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200 shadow-sm hover:bg-emerald-100 transition-colors">
                  Modo de Seleção (Lote)
                </button>
              ) : (
                <div className="flex items-center gap-2 animate-fade-in">
                  <button onClick={() => selecionarTodosLote()} className="text-sm font-bold text-emerald-700 bg-emerald-100 px-4 py-2 rounded-xl border border-emerald-300 shadow-sm hover:bg-emerald-200 transition-colors">
                    {loteSelecionados.length === (talhoes || []).length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </button>
                  <button onClick={() => { setIsSelectionMode(false); setLoteSelecionados([]); }} className="text-gray-500 hover:text-red-500 bg-white border border-gray-200 p-2 rounded-xl shadow-sm" title="Sair"><X size={20} /></button>
                </div>
              )}
            </div>
{/* FAIXA DE RESUMO E FILTRO (DESIGN SLIM/LEVE) */}
            <div className="flex overflow-x-auto gap-3 pb-4 pt-1 px-1 mb-6 hide-scrollbar">
              <div onClick={() => setFiltroCultura(null)} className={`flex-shrink-0 flex flex-col justify-center px-4 py-3 rounded-xl border cursor-pointer transition-all min-w-[120px] ${!filtroCultura ? 'bg-gray-50 text-gray-800 border-gray-300 shadow-inner' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-1 mb-0.5"><Filter size={12}/> Mostrar Todos</span>
                <span className="font-semibold text-lg leading-tight">{resumoDinamico.areaTotalPlanejada.toLocaleString('pt-BR')} ha</span>
              </div>
              
              {resumoDinamico.lista.map((item) => {
                const corCultura = getCulturaCor(item.id);
                const isSelected = filtroCultura === item.id;
                
                return (
                  <div 
                    key={item.id} 
                    onClick={() => setFiltroCultura(isSelected ? null : item.id)} 
                    className="flex-shrink-0 flex flex-col justify-center px-4 py-3 rounded-xl cursor-pointer transition-all min-w-[140px] bg-white shadow-sm hover:shadow-md"
                    style={{ 
                      border: `1px solid ${isSelected ? corCultura : '#e5e7eb'}`,
                      boxShadow: isSelected ? `0 0 0 1px ${corCultura}` : 'none'
                    }}
                  >
                    <span className="text-[11px] font-semibold tracking-wide text-gray-500 truncate max-w-[110px] mb-1 flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: corCultura }}></div>
                      {getCulturaNome(item.id)}
                    </span>
                    {/* A fonte continua cinza sempre, apenas as bordas mudam de cor */}
                    <span className="font-semibold text-lg leading-none text-gray-700">
                      {item.ha.toLocaleString('pt-BR')} ha
                    </span>
                  </div>
                )
              })}

              {resumoDinamico.areaTotalLivre > 0 && (
                <div className="flex-shrink-0 flex flex-col justify-center px-4 py-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 transition-all min-w-[120px]">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-0.5">Ainda Livre</span>
                  <span className="font-semibold text-lg leading-tight text-gray-500">{resumoDinamico.areaTotalLivre.toLocaleString('pt-BR')} ha</span>
                </div>
              )}
            </div>

            {/* O NOVO DATA GRID DE MINI CARDS (DESIGN SLIM E SEM MAIÚSCULAS) */}
            <div className="space-y-6">
              {Object.entries(groupedTalhoes).map(([retiro, data]) => {
                const talhoesFiltrados = filtroCultura 
                  ? data.talhoes.filter(t => (editCulturasConfig[t.id] || []).some(r => r.culturaId === filtroCultura))
                  : data.talhoes;

                if (talhoesFiltrados.length === 0) return null;

                return (
                  <div key={retiro} className="mb-8">
                    <div className="mb-3 px-2 border-b border-gray-100 pb-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{retiro}</span>
                    </div>

                    <div className="space-y-2">
                      {talhoesFiltrados.map((talhao) => {
                        const rows = editCulturasConfig[talhao.id] || [];
                        const isSelected = loteSelecionados.includes(talhao.id);

                        return (
                          <div key={talhao.id} className="flex flex-col gap-2">
                            {rows.map((row, index) => {
                              if (filtroCultura && row.culturaId !== filtroCultura && row.culturaId !== '') return null;

                              return (
                                <div key={row.tempId} className="flex items-center gap-2 w-full overflow-x-auto pb-2 hide-scrollbar min-w-max animate-fade-in">
                                  
                                  {/* MINI-CARD: CHECKBOX */}
                                  {isSelectionMode && index === 0 && (
                                    <div className="shrink-0 mr-1 cursor-pointer" onClick={() => handleToggleLote(talhao.id)}>
                                      {isSelected ? <CheckSquare className="text-emerald-500" size={24}/> : <Square className="text-gray-300" size={24}/>}
                                    </div>
                                  )}
                                  {isSelectionMode && index !== 0 && <div className="w-[30px] shrink-0 mr-1"></div>}

                                 {/* MINI-CARD: NOME DO TALHÃO (AGORA CLICÁVEL NO MODO SELEÇÃO) */}
                                  <div 
                                    onClick={() => isSelectionMode && handleToggleLote(talhao.id)}
                                    className={`border rounded-xl px-4 py-2.5 w-40 shrink-0 flex items-center justify-between shadow-sm transition-all ${isSelectionMode ? 'cursor-pointer hover:border-emerald-400 hover:bg-emerald-50' : ''} ${index === 0 ? 'bg-white border-gray-200' : 'bg-gray-50/50 border-gray-100 opacity-80'}`}
                                  >
                                    <span className={`font-semibold truncate text-sm ${index === 0 ? 'text-gray-700' : 'text-gray-400 font-medium'}`}>
                                      {index === 0 ? talhao.nome : '↳ Divisão'}
                                    </span>
                                  </div>

                                  {/* MINI-CARD: ÁREA (LEVE) */}
                                  <div className={`bg-white border border-gray-200 shadow-sm rounded-xl flex items-center w-32 shrink-0 transition-all ${isSelectionMode ? 'opacity-60 bg-gray-50' : 'focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-100'}`}>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={row.areaHa}
                                      onChange={(e) => handleUpdateAreaRaw(talhao.id, row.tempId, 'areaHa', e.target.value)}
                                      onBlur={(e) => handleAreaBlur(talhao.id, row.tempId, e.target.value)}
                                      className={`w-full py-2.5 pl-3 text-center font-medium text-gray-700 bg-transparent outline-none ${isSelectionMode ? 'cursor-not-allowed' : ''}`}
                                      disabled={isSelectionMode}
                                    />
                                    <span className="text-[11px] font-medium text-gray-400 pr-3">ha</span>
                                  </div>

                                  {/* MINI-CARD: CULTURA (SELECT CLICÁVEL NO MODO SELEÇÃO) */}
                                  <div 
                                    onClick={() => isSelectionMode && handleToggleLote(talhao.id)}
                                    className={`border shadow-sm rounded-xl flex-1 min-w-[200px] transition-all overflow-hidden ${isSelectionMode ? 'cursor-pointer hover:border-emerald-400 hover:bg-emerald-50' : 'focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-100'} ${!row.culturaId ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'}`}
                                    style={{ borderLeft: row.culturaId ? `5px solid ${getCulturaCor(row.culturaId)}` : undefined }}
                                  >
                                    <select
                                      value={row.culturaId}
                                      onChange={(e) => handleUpdateSelect(talhao.id, row.tempId, 'culturaId', e.target.value)}
                                      className={`w-full h-full py-2.5 px-4 outline-none font-medium bg-transparent text-gray-700 text-sm ${isSelectionMode ? 'pointer-events-none' : 'cursor-pointer'}`}
                                      tabIndex={isSelectionMode ? -1 : 0}
                                    >
                                      <option value="" disabled>Selecione a Cultura...</option>
                                      {culturas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                    </select>
                                  </div>

                                  {/* MINI-CARD: EXCLUIR */}
                                  <button
                                    onClick={() => handleRemoveCulturaRow(talhao.id, row.tempId)}
                                    className="bg-white border border-gray-200 shadow-sm text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 p-2.5 rounded-xl transition-all shrink-0"
                                    title="Remover divisão"
                                  >
                                    <Trash size={18}/>
                                  </button>
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

            {/* BOTÃO FLUTUANTE DE AÇÃO EM LOTE */}
            {loteSelecionados.length > 0 && (
              <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40 animate-fade-in">
                <button onClick={() => setIsModalCulturaOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm md:text-base py-4 px-10 rounded-full shadow-[0_10px_25px_-5px_rgba(5,150,105,0.5)] flex items-center justify-center gap-2 border border-emerald-400 transition-transform hover:scale-105 whitespace-nowrap">
                  <Leaf size={18} /> Aplicar Cultura ( {loteSelecionados.length} )
                </button>
              </div>
            )}
          </div>
        )}

        {/* MODAL: AÇÃO EM LOTE CULTURAS (COM CARDS BONITOS) */}
        {isModalCulturaOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-gray-800 text-xl">Aplicar Cultura</h3>
                <button onClick={() => setIsModalCulturaOpen(false)} className="bg-gray-100 text-gray-500 p-2 rounded-full hover:bg-red-50 hover:text-red-500"><X size={20}/></button>
              </div>
              <p className="text-sm text-gray-500 mb-6 font-medium">A cultura ocupará automaticamente toda a área que estiver <strong className="text-emerald-600">livre</strong> nos <strong className="text-emerald-600">{loteSelecionados.length} talhões</strong> selecionados.</p>
              
             {/* LISTA ÚNICA DE CULTURAS (DESIGN SLIM) */}
              <div className="flex flex-col gap-2 mb-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                
                {/* Opção: Nenhuma Cultura (Limpar) */}
                <div 
                  onClick={() => setLoteCulturaId('nenhuma')}
                  className={`flex items-center gap-4 p-3.5 rounded-2xl border transition-all cursor-pointer ${loteCulturaId === 'nenhuma' ? 'border-gray-400 bg-gray-100 shadow-sm' : 'border-gray-100 bg-white hover:border-gray-300'}`}
                >
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <X size={18} className="text-gray-400" />
                  </div>
                  <span className={`font-semibold text-[15px] ${loteCulturaId === 'nenhuma' ? 'text-gray-800' : 'text-gray-500'}`}>
                    Nenhuma <span className="font-medium text-xs text-gray-400 ml-1">(Limpar seleção)</span>
                  </span>
                </div>

                {/* Lista das Culturas Cadastradas */}
                {(culturas || []).map(c => {
                  const corCultura = c.cor || '#10b981';
                  const isSelected = loteCulturaId === c.id;

                  return (
                    <div 
                      key={c.id} 
                      onClick={() => setLoteCulturaId(c.id)} 
                      className={`flex items-center gap-4 p-3.5 rounded-2xl border transition-all cursor-pointer ${isSelected ? 'border-emerald-400 bg-emerald-50 shadow-sm ring-1 ring-emerald-400' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${corCultura}15` }}>
                        <Leaf size={18} style={{ color: corCultura }} />
                      </div>
                      <span className={`font-semibold text-[15px] ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                        {c.nome}
                      </span>
                    </div>
                  );
                })}
              </div>

              <button onClick={confirmarModalCultura} className="w-full py-4 bg-emerald-600 text-white font-black text-lg rounded-2xl hover:bg-emerald-700 shadow-md">Salvar</button>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* MODAL: VISUALIZAÇÃO RÁPIDA DOS TALHÕES     */}
        {/* ========================================== */}
        {viewCulturaModal.isOpen && (
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[120] flex items-center justify-center p-4 animate-fade-in" 
            onClick={() => setViewCulturaModal({ isOpen: false })}
          >
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
              
              {/* CABEÇALHO DO MODAL */}
              <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                <div>
                  <h3 className="font-black text-gray-800 text-xl flex items-center gap-2">
                    {viewCulturaModal.culturaNome}
                  </h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    Safra {viewCulturaModal.safraNome}
                  </p>
                </div>
                <button onClick={() => setViewCulturaModal({ isOpen: false })} className="bg-white text-gray-400 hover:text-red-500 p-2 rounded-full shadow-sm border border-gray-100 transition-colors">
                  <X size={20}/>
                </button>
              </div>

              {/* CORPO DO MODAL (LISTA DE TALHÕES) */}
              <div className="p-6 overflow-y-auto custom-scrollbar">
                {(() => {
                  const safraModal = planosSafra.find(s => s.id === viewCulturaModal.safraId);
                  const groupedForModal = {};
                  let grandTotal = 0;

                  // Agrupa os talhões por retiro que contenham a cultura clicada
                  if (safraModal) {
                    (safraModal.areas || []).forEach(area => {
                      const talhao = talhoes.find(t => t.id === area.talhaoId);
                      if (!talhao) return;

                      const culturaInArea = (area.culturas || []).find(c => c.culturaId === viewCulturaModal.culturaId);
                      if (culturaInArea && parseFloat(culturaInArea.areaHa) > 0) {
                        const retiro = talhao.retiro?.trim() || 'Sem Retiro';
                        if (!groupedForModal[retiro]) groupedForModal[retiro] = { total: 0, items: [] };
                        
                        const ha = parseFloat(culturaInArea.areaHa);
                        groupedForModal[retiro].items.push({ nome: talhao.nome, ha });
                        groupedForModal[retiro].total += ha;
                        grandTotal += ha;
                      }
                    });
                  }

                  if (Object.keys(groupedForModal).length === 0) {
                    return <p className="text-center text-gray-500 text-sm">Nenhuma área alocada.</p>;
                  }

                  return (
                    <div className="space-y-6">
                      {Object.entries(groupedForModal).map(([retiro, data]) => (
                        <div key={retiro}>
                          {/* NOME DO RETIRO */}
                          <h4 className="text-[11px] font-bold uppercase text-emerald-600 tracking-widest mb-3 flex items-center gap-1.5">
                            <Map size={14} /> {retiro}
                          </h4>
                          
                          {/* LISTA DE TALHÕES */}
                          <div className="space-y-2 mb-3">
                            {data.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center px-2 py-1">
                                <span className="font-semibold text-gray-600 text-sm">{item.nome}</span>
                                <span className="font-medium text-gray-500 text-sm">{item.ha.toLocaleString('pt-BR')} ha</span>
                              </div>
                            ))}
                          </div>
                          
                          {/* TOTAL DO RETIRO */}
                          <div className="flex justify-between items-center border-t border-gray-100 pt-2 px-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total {retiro}</span>
                            <span className="font-bold text-emerald-700">{data.total.toLocaleString('pt-BR')} ha</span>
                          </div>
                        </div>
                      ))}
                      
                      {/* TOTAL GERAL DA CULTURA */}
                      <div className="mt-6 pt-4 border-t-2 border-gray-100 flex justify-between items-center px-2">
                         <span className="text-xs font-black text-gray-800 uppercase tracking-widest">Total Geral</span>
                         <span className="text-lg font-black text-emerald-600">{grandTotal.toLocaleString('pt-BR')} ha</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}