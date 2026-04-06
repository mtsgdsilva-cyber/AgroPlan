// src/pages/Cadastros.jsx
import React, { useState, useRef } from 'react';
import { useAgro } from '../contexts/AgroContext';
import { useModal } from '../contexts/ModalContext';
import { generateId, calcSeedsPerHa } from '../utils/helpers';
import { Map, Leaf, Sprout, Calculator, UploadCloud, Plus, Database, Trash, Package, Square, CheckSquare, Edit2, Save, X, Copy } from 'lucide-react';
import Card from '../components/Card';
import * as xlsx from 'xlsx';

const PRESET_COLORS = [
  '#16a34a', '#22c55e', '#84cc16', '#4ade80', // Verdes (Plantação)
  '#0891b2', '#06b6d4', '#3b82f6', '#6366f1', // Azuis (Água/Céu)
  '#f59e0b', '#fbbf24', '#ea580c', '#f97316', // Laranjas (Colheita)
  '#71717a', '#4b5563', '#18181b', '#b91c1c'  // Neutros/Alerta
];

export default function Cadastros() {
  const { 
    talhoes, setTalhoes, 
    culturas, setCulturas, 
    variedades, setVariedades, 
    taxasPlantio, setTaxasPlantio,
    embalagens, setEmbalagens
  } = useAgro();
  const { showAlert, showConfirm } = useModal(); 

  const [activeSubTab, setActiveSubTab] = useState('talhoes');

  // ==========================================
  // ESTADOS E LÓGICAS: TALHÕES
  // ==========================================
  const fileInputRef = useRef(null); 
  
  const [talhaoNome, setTalhaoNome] = useState('');
  const [talhaoArea, setTalhaoArea] = useState('');
  const [talhaoRetiro, setTalhaoRetiro] = useState('');

  const [editingTalhaoId, setEditingTalhaoId] = useState(null);
  const [editTalhaoAreaVal, setEditTalhaoAreaVal] = useState('');

  // Estados de seleção em massa de talhões
  const [isTalhaoSelectionMode, setIsTalhaoSelectionMode] = useState(false);
  const [talhoesSelecionados, setTalhoesSelecionados] = useState([]);

  const handleDeleteTalhao = (id) => {
    showConfirm("Excluir Talhão", "Atenção: Excluir este talhão pode afetar os Planos de Safra que já o utilizam. Tem certeza que deseja excluir?", () => {
      setTalhoes(talhoes.filter(t => t.id !== id));
    });
  };

  // Lógica de seleção em massa
  const handleToggleTalhao = (id) => {
    setTalhoesSelecionados(prev => 
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  const handleSelectAllTalhoes = () => {
    if (talhoesSelecionados.length === talhoes.length && talhoes.length > 0) {
      setTalhoesSelecionados([]);
    } else {
      setTalhoesSelecionados(talhoes.map(t => t.id));
    }
  };

  const handleDeleteSelectedTalhoes = () => {
    showConfirm(
      "Excluir Selecionados", 
      `Tem certeza que deseja excluir ${talhoesSelecionados.length} talhões de uma vez?`, 
      () => {
        setTalhoes(talhoes.filter(t => !talhoesSelecionados.includes(t.id)));
        setTalhoesSelecionados([]);
        setIsTalhaoSelectionMode(false);
      }, 
      "danger"
    );
  };

  const startEditTalhao = (talhao) => {
    setEditingTalhaoId(talhao.id);
    setEditTalhaoAreaVal(talhao.areaHa);
  };

  const confirmEditTalhao = (id) => {
    if (!editTalhaoAreaVal || isNaN(editTalhaoAreaVal)) {
      return showAlert("Área Inválida", "Por favor, insira uma área válida.", "danger");
    }
    setTalhoes(talhoes.map(t => t.id === id ? { ...t, areaHa: parseFloat(editTalhaoAreaVal) } : t));
    setEditingTalhaoId(null);
    setEditTalhaoAreaVal('');
  };

  const cancelEditTalhao = () => {
    setEditingTalhaoId(null);
    setEditTalhaoAreaVal('');
  };
  
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const workbook = xlsx.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);

        const novosTalhoes = data.map(row => ({
          id: generateId(),
          retiro: row['RETIRO'] ? String(row['RETIRO']) : '',
          nome: row['TALHÃO'] ? String(row['TALHÃO']) : 'Sem Nome',
          areaHa: parseFloat(row['ÁREA']) || 0
        }));

        setTalhoes(prev => [...prev, ...novosTalhoes]);
        showAlert("Importação Concluída", `${novosTalhoes.length} talhões importados com sucesso!`, "success");
      } catch (error) {
        showAlert("Erro na Importação", "Erro ao importar a planilha. Verifique se as colunas estão exatas: RETIRO, TALHÃO e ÁREA.", "danger");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleAddTalhao = (e) => {
    e.preventDefault();
    if (!talhaoNome.trim() || !talhaoArea) return;
    setTalhoes([...talhoes, { id: generateId(), retiro: talhaoRetiro, nome: talhaoNome, areaHa: parseFloat(talhaoArea) }]);
    setTalhaoRetiro(''); setTalhaoNome(''); setTalhaoArea('');
  };

  // ==========================================
  // ESTADOS E LÓGICAS: CULTURAS
  // ==========================================
  const [culturaNome, setCulturaNome] = useState('');
  const [culturaCor, setCulturaCor] = useState('#10b981'); 
  const [colorPickerCulturaId, setColorPickerCulturaId] = useState(null); 
  
  const [editingCulturaId, setEditingCulturaId] = useState(null);
  const [editCulturaNomeVal, setEditCulturaNomeVal] = useState('');

  const handleAddCultura = (e) => {
    e.preventDefault();
    if (!culturaNome.trim()) return;
    setCulturas([...culturas, { id: generateId(), nome: culturaNome, cor: culturaCor }]);
    setCulturaNome('');
    setCulturaCor('#10b981'); 
  };

  const handleChangeCorCultura = (id, novaCor) => {
    setCulturas(culturas.map(c => c.id === id ? { ...c, cor: novaCor } : c));
  };

  const handleDeleteCultura = (id) => {
    showConfirm("Excluir Cultura", "Tem certeza que deseja excluir esta cultura? As variedades amarradas a ela podem ficar órfãs.", () => {
      setCulturas(culturas.filter(c => c.id !== id));
    }, "danger");
  };

  const startEditCultura = (cultura) => {
    setEditingCulturaId(cultura.id);
    setEditCulturaNomeVal(cultura.nome);
  };

  const confirmEditCultura = (id) => {
    if (!editCulturaNomeVal.trim()) return showAlert("Atenção", "O nome não pode ser vazio.", "warning");
    setCulturas(culturas.map(c => c.id === id ? { ...c, nome: editCulturaNomeVal } : c));
    setEditingCulturaId(null);
    setEditCulturaNomeVal('');
  };

  const cancelEditCultura = () => {
    setEditingCulturaId(null);
    setEditCulturaNomeVal('');
  };

  // ==========================================
  // ESTADOS E LÓGICAS: VARIEDADES
  // ==========================================
  const [varCulturaId, setVarCulturaId] = useState('');
  const [varNome, setVarNome] = useState('');
  const [varCor, setVarCor] = useState('#3b82f6'); 
  const [colorPickerVarId, setColorPickerVarId] = useState(null);
  
  const [isVarSelectionMode, setIsVarSelectionMode] = useState(false);
  const [varsSelecionadas, setVarsSelecionadas] = useState([]);
  const [isModalEmbVarOpen, setIsModalEmbVarOpen] = useState(false);
  const [embSelecionadaId, setEmbSelecionadaId] = useState('');

  // Estados para Cópia em Lote de Variedades
  const [isCopyVarModalOpen, setIsCopyVarModalOpen] = useState(false);
  const [copySourceCulturaId, setCopySourceCulturaId] = useState('');
  const [copyTargetCulturaId, setCopyTargetCulturaId] = useState('');
  const [varsToCopy, setVarsToCopy] = useState([]);

  const handleToggleVar = (id) => setVarsSelecionadas(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  
  const handleSelectAllVars = () => {
    if (varsSelecionadas.length === variedades.length && variedades.length > 0) {
      setVarsSelecionadas([]); 
    } else {
      setVarsSelecionadas(variedades.map(v => v.id)); 
    }
  };

  const confirmarEmbalagemVar = () => {
    if (!embSelecionadaId) return showAlert("Atenção", "Selecione uma embalagem ou escolha 'Não definida'.", "danger");
    setVariedades(variedades.map(v => varsSelecionadas.includes(v.id) ? { ...v, embalagemId: embSelecionadaId === 'nenhuma' ? '' : embSelecionadaId } : v));
    setVarsSelecionadas([]); setEmbSelecionadaId(''); setIsModalEmbVarOpen(false); setIsVarSelectionMode(false);
  };

  // Lógica de Cópia
  const handleConfirmCopyVars = () => {
    if (!copyTargetCulturaId) return showAlert("Atenção", "Selecione a cultura de destino.", "danger");
    if (varsToCopy.length === 0) return showAlert("Atenção", "Selecione pelo menos uma variedade para copiar.", "danger");
    if (copySourceCulturaId === copyTargetCulturaId) return showAlert("Atenção", "A cultura de origem e destino não podem ser as mesmas.", "danger");

    const varsToDuplicate = variedades.filter(v => varsToCopy.includes(v.id));
    const duplicatedVars = varsToDuplicate.map(v => ({
      ...v,
      id: generateId(),
      culturaId: copyTargetCulturaId
    }));

    setVariedades(prev => [...prev, ...duplicatedVars]);
    showAlert("Sucesso", `${duplicatedVars.length} variedades copiadas com sucesso!`, "success");
    
    setIsCopyVarModalOpen(false);
    setCopySourceCulturaId('');
    setCopyTargetCulturaId('');
    setVarsToCopy([]);
  };

  const [showEmbForm, setShowEmbForm] = useState(false);
  const [showTaxaForm, setShowTaxaForm] = useState(false);

  const handleAddVariedade = (e) => {
    e.preventDefault();
    if (!varCulturaId || !varNome.trim()) return;
    setVariedades([...variedades, { id: generateId(), culturaId: varCulturaId, nome: varNome, cor: varCor }]);
    setVarCulturaId(''); setVarNome(''); setVarCor('#3b82f6');
  };

  const handleChangeCorVariedade = (id, novaCor) => {
    setVariedades(variedades.map(v => v.id === id ? { ...v, cor: novaCor } : v));
  };

  const handleDeleteVariedade = (id) => {
    showConfirm(
      "Excluir Variedade",
      "Tem certeza que deseja excluir esta semente? Ao confirmar, ela perderá o vínculo com qualquer embalagem e plano de safra atual.",
      () => setVariedades(variedades.filter(v => v.id !== id)),
      "danger"
    );
  };

  const [editingVarId, setEditingVarId] = useState(null);
  const [editVarNomeVal, setEditVarNomeVal] = useState('');

  const startEditVariedade = (variedade) => {
    setEditingVarId(variedade.id);
    setEditVarNomeVal(variedade.nome);
  };

  const confirmEditVariedade = (id) => {
    if (!editVarNomeVal.trim()) {
      return showAlert("Atenção", "O nome da semente não pode ficar vazio.", "danger");
    }
    setVariedades(variedades.map(v => v.id === id ? { ...v, nome: editVarNomeVal } : v));
    setEditingVarId(null);
    setEditVarNomeVal('');
  };

  const cancelEditVariedade = () => {
    setEditingVarId(null);
    setEditVarNomeVal('');
  };

  // ==========================================
  // ESTADOS E LÓGICAS: EMBALAGENS
  // ==========================================
  const [embNome, setEmbNome] = useState('');
  const [embTipo, setEmbTipo] = useState('saca');
  const [embUnidade, setEmbUnidade] = useState('kg');
  const [embCapacidade, setEmbCapacidade] = useState('');

  const handleAddEmbalagem = (e) => {
    e.preventDefault();
    if (!embNome.trim() || !embCapacidade) return;
    setEmbalagens([...embalagens, {
      id: generateId(),
      nome: embNome,
      tipoEmbalagem: embTipo,
      tipoUnidade: embUnidade,
      capacidade: parseFloat(embCapacidade)
    }]);
    setEmbNome(''); setEmbCapacidade('');
  };

  const handleDeleteEmbalagem = (id) => {
    showConfirm("Excluir Embalagem", "Tem certeza que deseja excluir esta embalagem?", () => {
      setEmbalagens(embalagens.filter(e => e.id !== id));
    });
  };

  // ==========================================
  // ESTADOS E LÓGICAS: GABARITOS DE TAXAS
  // ==========================================
  const [taxaNome, setTaxaNome] = useState('');
  const [taxaTipo, setTaxaTipo] = useState('kg');
  const [taxaKgPorHa, setTaxaKgPorHa] = useState('');
  const [taxaSementesPorHa, setTaxaSementesPorHa] = useState('');
  const [taxaEspacamento, setTaxaEspacamento] = useState('');
  const [taxaSementesPorMetro, setTaxaSementesPorMetro] = useState('');

  const handleAddTaxa = (e) => {
    e.preventDefault();
    if (!taxaNome.trim()) return;

    setTaxasPlantio([...taxasPlantio, {
      id: generateId(),
      nome: taxaNome,
      tipo: taxaTipo,
      kgPorHa: taxaTipo === 'kg' ? parseFloat(taxaKgPorHa) : null,
      sementesPorHa: taxaTipo === 'sementes_ha' ? parseFloat(taxaSementesPorHa) : null,
      espacamento: taxaTipo === 'sementes_metro' ? parseFloat(taxaEspacamento) : null,
      sementesPorMetro: taxaTipo === 'sementes_metro' ? parseFloat(taxaSementesPorMetro) : null
    }]);

    setTaxaNome(''); setTaxaKgPorHa(''); setTaxaSementesPorHa(''); setTaxaEspacamento(''); setTaxaSementesPorMetro('');
    setShowTaxaForm(false); 
  };

  const handleDeleteTaxa = (id) => {
    showConfirm("Excluir Gabarito", "Tem certeza que deseja excluir este gabarito de taxa?", () => {
      setTaxasPlantio(taxasPlantio.filter(t => t.id !== id));
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 min-h-screen">
      
      {/* CABEÇALHO CUSTOMIZADO COM AS ABAS EMBUTIDAS */}
      <header className="bg-white/95 backdrop-blur-md px-4 py-3 md:px-6 md:py-4 sticky top-0 z-[60] shadow-sm rounded-b-3xl mb-6 flex items-center gap-3 border-b border-gray-100 transition-all">
        
        {/* Botão de abrir o menu lateral */}
        <div 
          className="bg-green-100 p-2.5 rounded-xl cursor-pointer hover:bg-green-200 transition-colors shrink-0 flex items-center justify-center"
          onClick={() => window.dispatchEvent(new CustomEvent('open-sidebar'))}
          title="Abrir Menu Lateral"
        >
          <Sprout className="text-green-600" size={24} />
        </div>

        {/* Divisória sutil */}
        <div className="w-px h-8 bg-gray-200 shrink-0 hidden md:block mx-1"></div>

        {/* Grupo de Abas */}
        <nav className="flex items-center gap-1.5 md:gap-3 overflow-x-auto hide-scrollbar flex-1 pb-1 md:pb-0">
          {[
            { id: 'talhoes', label: 'Talhões', icon: Map },
            { id: 'culturas', label: 'Culturas', icon: Leaf },
            { id: 'variedades', label: 'Variedades', icon: Sprout },
            { id: 'taxas', label: 'Taxas', icon: Calculator } 
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                title={tab.label}
                className={`flex items-center justify-center gap-2 p-2.5 md:px-5 md:py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap shrink-0 ${
                  isActive 
                    ? 'bg-green-600 text-white shadow-md' 
                    : 'bg-transparent text-gray-500 hover:bg-gray-100'
                }`}
              >
                <Icon size={20} className={isActive ? "text-white" : "text-gray-400"} /> 
                <span className="hidden md:block">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </header>
      
      <main className="px-4 lg:px-8 py-4 animate-fade-in pb-32">

        {/* --- ABA: TALHÕES --- */}
        {activeSubTab === 'talhoes' && (
          <div className="animate-fade-in">
            <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            
            {/* BOTOES DE IMPORTAÇÃO E CABEÇALHO DE SELEÇÃO */}
            <div className="flex flex-col md:flex-row gap-3 mb-6">
              <button onClick={() => fileInputRef.current.click()} className="flex-1 bg-white border-2 border-dashed border-green-300 hover:border-green-500 hover:bg-green-50 text-green-700 font-medium py-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm">
                <UploadCloud size={24} /> Importar Planilha (RETIRO, TALHÃO, ÁREA)
              </button>

              {/* BOTÃO PARA ATIVAR SELEÇÃO EM MASSA */}
              {!isTalhaoSelectionMode ? (
                <button 
                  onClick={() => setIsTalhaoSelectionMode(true)} 
                  className="bg-white border border-gray-200 text-gray-600 font-bold px-6 py-4 rounded-xl hover:bg-gray-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  <CheckSquare size={20} /> Selecionar
                </button>
              ) : (
                <div className="flex gap-2 animate-fade-in w-full md:w-auto">
                  <button onClick={handleSelectAllTalhoes} className="bg-blue-50 text-blue-700 border border-blue-200 font-bold px-4 py-4 rounded-xl text-sm flex-1 md:flex-none whitespace-nowrap">
                    {talhoesSelecionados.length === talhoes.length && talhoes.length > 0 ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </button>
                  <button 
                    onClick={handleDeleteSelectedTalhoes} 
                    disabled={talhoesSelecionados.length === 0}
                    className={`px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all flex-1 md:flex-none whitespace-nowrap ${
                      talhoesSelecionados.length > 0 ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Trash size={18} /> Excluir ({talhoesSelecionados.length})
                  </button>
                  <button onClick={() => { setIsTalhaoSelectionMode(false); setTalhoesSelecionados([]); }} className="bg-white border border-gray-200 px-4 py-4 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-500 shadow-sm transition-colors">
                    <X size={20} />
                  </button>
                </div>
              )}
            </div>

            <Card className="mb-6">
              <h2 className="text-md font-semibold text-gray-700 mb-4">Adicionar Manualmente</h2>
              <form onSubmit={handleAddTalhao} className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <input type="text" value={talhaoRetiro} onChange={(e) => setTalhaoRetiro(e.target.value)} placeholder="Retiro (Ex: Sede)" className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:ring-green-500 focus:outline-none" />
                  <input type="text" value={talhaoNome} onChange={(e) => setTalhaoNome(e.target.value)} placeholder="Nome/Talhão *" className="flex-[2] bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:ring-green-500 focus:outline-none" />
                  <input type="number" step="0.01" value={talhaoArea} onChange={(e) => setTalhaoArea(e.target.value)} placeholder="Área (ha) *" className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:ring-green-500 focus:outline-none" />
                </div>
                <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"><Plus size={18} /> Salvar Talhão</button>
              </form>
            </Card>

            <div className="space-y-3">
              {talhoes.map(talhao => {
                const isSelected = talhoesSelecionados.includes(talhao.id);
                return (
                  <div 
                    key={talhao.id} 
                    onClick={() => isTalhaoSelectionMode && handleToggleTalhao(talhao.id)}
                    className={`flex justify-between items-center p-4 rounded-xl border transition-all mb-3 group ${
                      isTalhaoSelectionMode ? 'cursor-pointer' : ''
                    } ${
                      isSelected ? 'bg-blue-50 border-blue-300 shadow-md' : 'bg-white border-gray-100 shadow-sm hover:border-emerald-200'
                    }`}
                  >
                    
                    {/* INFORMAÇÕES DO TALHÃO OU MODO DE EDIÇÃO */}
                    <div className="flex items-center gap-4">
                      {/* CHECKBOX VISÍVEL APENAS NO MODO SELEÇÃO */}
                      {isTalhaoSelectionMode ? (
                        <div className="shrink-0">
                          {isSelected ? <CheckSquare className="text-blue-600" size={24}/> : <Square className="text-gray-300" size={24}/>}
                        </div>
                      ) : (
                        <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
                          <Map size={20} />
                        </div>
                      )}
                      
                      <div>
                        <span className="font-bold text-gray-800 text-lg block leading-none mb-1">{talhao.nome}</span>
                        
                        {editingTalhaoId === talhao.id ? (
                          <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="number"
                              step="0.01"
                              value={editTalhaoAreaVal}
                              onChange={(e) => setEditTalhaoAreaVal(e.target.value)}
                              className="w-24 p-1.5 border-2 border-emerald-400 bg-emerald-50 rounded-lg text-sm font-black text-emerald-800 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                              autoFocus
                            />
                            <span className="text-xs text-gray-500 font-bold uppercase">Hectares (ha)</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500 font-bold tracking-wide">
                            {talhao.areaHa.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ha 
                            <span className="mx-2 text-gray-300">•</span> 
                            {talhao.retiro || 'Sem Retiro'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* BOTÕES DE AÇÃO - ESCONDIDOS NO MODO DE SELEÇÃO */}
                    {!isTalhaoSelectionMode && (
                      <div className="flex items-center gap-2">
                        {editingTalhaoId === talhao.id ? (
                          <>
                            <button onClick={() => confirmEditTalhao(talhao.id)} className="p-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-1 font-bold text-xs" title="Salvar"><Save size={16} /> Salvar</button>
                            <button onClick={cancelEditTalhao} className="p-2 text-gray-500 bg-gray-100 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors" title="Cancelar"><X size={16} /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEditTalhao(talhao)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100" title="Editar Área"><Edit2 size={18} /></button>
                            <button onClick={() => handleDeleteTalhao(talhao.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100" title="Excluir Talhão"><Trash size={18} /></button>
                          </>
                        )}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- ABA: CULTURAS --- */}
        {activeSubTab === 'culturas' && (
          <div className="animate-fade-in">
            <Card className="mb-6">
              <h2 className="text-sm font-bold text-gray-600 mb-3 uppercase tracking-widest">Nova Cultura</h2>
              <form onSubmit={handleAddCultura} className="flex flex-col md:flex-row gap-3">
                <div className="flex flex-1 gap-2 items-center bg-gray-50 border border-gray-200 rounded-xl p-2">
                  <input 
                    type="color" 
                    value={culturaCor} 
                    onChange={(e) => setCulturaCor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent shrink-0"
                    title="Escolha a cor da cultura"
                  />
                  <input 
                    type="text" 
                    value={culturaNome} 
                    onChange={(e) => setCulturaNome(e.target.value)} 
                    placeholder="Nome da Cultura (Ex: Soja)" 
                    className="flex-1 bg-transparent text-sm font-bold focus:outline-none text-gray-800 h-full w-full" 
                  />
                </div>
                <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 md:w-auto w-full">
                  <Plus size={20} /> Cadastrar
                </button>
              </form>
            </Card>

           <div className="space-y-3 mb-16">
              {culturas.map(c => (
                <div key={c.id} className="relative">
                  <Card className="!mb-0 flex items-center justify-between py-3 px-4 group hover:border-gray-200 transition-colors shadow-sm">
                    
                    <div className="flex items-center gap-3">
                      <Leaf size={20} style={{ color: c.cor || '#10b981' }} />
                      
                      {/* MODO EDIÇÃO CULTURA */}
                      {editingCulturaId === c.id ? (
                        <div className="flex items-center gap-2 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editCulturaNomeVal}
                            onChange={(e) => setEditCulturaNomeVal(e.target.value)}
                            className="w-48 p-1 border-2 border-green-400 bg-green-50 rounded-lg text-sm font-bold text-gray-800 outline-none"
                            autoFocus
                          />
                          <button onClick={() => confirmEditCultura(c.id)} className="text-green-600 hover:bg-green-50 p-1 rounded transition-all"><Save size={16} /></button>
                          <button onClick={cancelEditCultura} className="text-gray-400 hover:bg-red-50 p-1 rounded transition-all"><X size={16} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800">{c.nome}</span>
                          {/* BOTÕES DE EDIÇÃO/EXCLUSÃO (Aparecem no Hover) */}
                          <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEditCultura(c)} className="text-gray-300 hover:text-blue-600 p-1 rounded transition-all" title="Editar Cultura"><Edit2 size={14} /></button>
                            <button onClick={() => handleDeleteCultura(c.id)} className="text-gray-300 hover:text-red-500 p-1 rounded transition-all" title="Excluir Cultura"><Trash size={14} /></button>
                          </div>
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => setColorPickerCulturaId(colorPickerCulturaId === c.id ? null : c.id)}
                      className="w-6 h-6 rounded-full border border-gray-200 shadow-sm transition-transform hover:scale-110 shrink-0"
                      style={{ backgroundColor: c.cor || '#10b981' }}
                      title="Mudar cor"
                    />
                  </Card>

                  {/* MINI COLOR PICKER FLUTUANTE */}
                  {colorPickerCulturaId === c.id && (
                    <div className="absolute right-0 top-14 bg-white border border-gray-200 shadow-xl rounded-2xl p-4 z-50 flex flex-col gap-3 animate-fade-in w-64">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Selecione uma cor</span>
                        <X size={16} className="text-gray-400 cursor-pointer hover:text-red-500" onClick={() => setColorPickerCulturaId(null)} />
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {PRESET_COLORS.map(cor => (
                          <div 
                            key={cor} 
                            onClick={() => { handleChangeCorCultura(c.id, cor); setColorPickerCulturaId(null); }}
                            className={`w-10 h-10 rounded-xl cursor-pointer hover:scale-110 transition-transform ${c.cor === cor ? 'ring-2 ring-gray-400 ring-offset-1' : ''}`}
                            style={{ backgroundColor: cor }}
                          />
                        ))}
                      </div>
                      <div className="pt-3 border-t border-gray-100 flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500">Personalizada:</span>
                        <input type="color" value={c.cor || '#10b981'} onChange={(e) => handleChangeCorCultura(c.id, e.target.value)} className="w-full h-8 cursor-pointer rounded bg-transparent border-0" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

       {/* --- ABA: VARIEDADES (COM EMBALAGENS) --- */}
        {activeSubTab === 'variedades' && (
          <div className="animate-fade-in">
            
            {/* MODAL DE CÓPIA EM LOTE */}
            {isCopyVarModalOpen && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border-t-8 border-green-600 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-gray-800 text-xl flex items-center gap-2"><Copy size={24} className="text-green-600"/> Copiar Variedades</h3>
                    <button onClick={() => {setIsCopyVarModalOpen(false); setVarsToCopy([]); setCopySourceCulturaId(''); setCopyTargetCulturaId('');}} className="bg-gray-100 text-gray-500 p-2 rounded-full hover:bg-red-50 hover:text-red-500"><X size={20}/></button>
                  </div>
                  
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 block">1. Cultura de Origem</label>
                      <select value={copySourceCulturaId} onChange={(e) => {setCopySourceCulturaId(e.target.value); setVarsToCopy([]);}} className="w-full border-2 border-gray-200 rounded-xl p-3 bg-gray-50 text-gray-800 font-bold outline-none focus:border-green-500">
                        <option value="" disabled>Selecione a origem...</option>
                        {culturas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                    </div>

                    {copySourceCulturaId && (
                      <div className="animate-fade-in">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 block">2. Selecionar Variedades</label>
                        <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-3 max-h-40 overflow-y-auto space-y-2">
                          {variedades.filter(v => v.culturaId === copySourceCulturaId).length === 0 && <p className="text-xs text-gray-400 italic">Nenhuma variedade nesta cultura.</p>}
                          {variedades.filter(v => v.culturaId === copySourceCulturaId).map(v => (
                            <label key={v.id} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-100 rounded-lg transition-colors">
                              <input 
                                type="checkbox" 
                                checked={varsToCopy.includes(v.id)}
                                onChange={() => setVarsToCopy(prev => prev.includes(v.id) ? prev.filter(id => id !== v.id) : [...prev, v.id])}
                                className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                              />
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{backgroundColor: v.cor}}></div>
                                <span className="text-sm font-bold text-gray-700 uppercase">{v.nome}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 block">3. Cultura de Destino</label>
                      <select value={copyTargetCulturaId} onChange={(e) => setCopyTargetCulturaId(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-3 bg-gray-50 text-gray-800 font-bold outline-none focus:border-green-500">
                        <option value="" disabled>Selecione o destino...</option>
                        {culturas.filter(c => c.id !== copySourceCulturaId).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                    </div>
                  </div>

                  <button onClick={handleConfirmCopyVars} disabled={varsToCopy.length === 0 || !copyTargetCulturaId} className="w-full py-4 bg-green-600 text-white font-black text-lg rounded-2xl hover:bg-green-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                    Copiar ({varsToCopy.length})
                  </button>
                </div>
              </div>
            )}

           {/* MODAL DE EMBALAGENS */}
            {isModalEmbVarOpen && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border-t-8 border-blue-600">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-gray-800 text-xl">Definir Embalagem</h3>
                    <button onClick={() => setIsModalEmbVarOpen(false)} className="bg-gray-100 text-gray-500 p-2 rounded-full hover:bg-red-50 hover:text-red-500"><X size={20}/></button>
                  </div>
                  <p className="text-sm text-gray-500 mb-6 font-medium">Aplicar embalagem para <strong className="text-blue-600">{varsSelecionadas.length} variedades</strong>.</p>
                  <select value={embSelecionadaId} onChange={(e) => setEmbSelecionadaId(e.target.value)} className="w-full border-2 border-gray-200 rounded-2xl p-4 bg-gray-50 text-gray-800 font-bold mb-8 outline-none focus:border-blue-500 focus:bg-white">
                    <option value="" disabled>Escolha a embalagem...</option>
                    <option value="nenhuma" className="text-red-500 font-bold">🚫 Não definida (Remover Embalagem)</option>
                    {embalagens.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                  <button onClick={confirmarEmbalagemVar} className="w-full py-4 bg-blue-600 text-white font-black text-lg rounded-2xl hover:bg-blue-700 shadow-md">Salvar Vínculo</button>
                </div>
              </div>
            )}

            {/* CABEÇALHO COM MODO DE SELEÇÃO */}
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <h2 className="text-lg font-black text-gray-800 flex items-center gap-2"><Sprout className="text-green-600"/> Sementes</h2>
              {!isVarSelectionMode ? (
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsCopyVarModalOpen(true)} className="text-sm font-bold text-green-700 bg-green-50 px-4 py-2 rounded-xl border border-green-200 shadow-sm hover:bg-green-100 transition-colors flex items-center gap-2">
                    <Copy size={16} /> Copiar
                  </button>
                  <button onClick={() => setIsVarSelectionMode(true)} className="text-sm font-bold text-blue-700 bg-blue-50 px-4 py-2 rounded-xl border border-blue-200 shadow-sm hover:bg-blue-100 transition-colors flex items-center gap-2">
                    <Package size={16} /> Embalagens
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 animate-fade-in">
                  <button onClick={handleSelectAllVars} className="text-sm font-bold text-blue-700 bg-blue-50 px-4 py-2 rounded-xl border border-blue-200 shadow-sm hover:bg-blue-100 transition-colors hidden md:block">
                    {varsSelecionadas.length === variedades.length && variedades.length > 0 ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </button>
                  <button onClick={() => setIsModalEmbVarOpen(true)} className="text-sm font-bold text-blue-700 bg-blue-100 px-4 py-2 rounded-xl border border-blue-300 shadow-sm hover:bg-blue-200 transition-colors flex items-center gap-2">
                    <Package size={16} /> Definir ({varsSelecionadas.length})
                  </button>
                  <button onClick={() => { setIsVarSelectionMode(false); setVarsSelecionadas([]); }} className="text-gray-500 hover:text-red-500 bg-white border border-gray-200 p-2 rounded-xl shadow-sm transition-colors" title="Cancelar"><X size={16} /></button>
                </div>
              )}
            </div>

            <Card className="mb-6">
              <form onSubmit={handleAddVariedade} className="flex flex-col md:flex-row gap-3">
                 <div className="flex flex-1 gap-2 items-center bg-gray-50 border border-gray-200 rounded-xl p-2">
                   <input 
                     type="color" 
                     value={varCor} 
                     onChange={(e) => setVarCor(e.target.value)}
                     className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent shrink-0"
                     title="Escolha a cor da semente"
                   />
                   <select value={varCulturaId} onChange={(e) => setVarCulturaId(e.target.value)} className="flex-1 bg-transparent text-sm font-bold focus:outline-none text-gray-800 h-full w-full">
                     <option value="" disabled>Cultura...</option>
                     {culturas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                   </select>
                 </div>
                 <input type="text" value={varNome} onChange={(e) => setVarNome(e.target.value)} placeholder="Variedade (Ex: M8210 IPRO)" className="flex-[2] bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:ring-green-500 focus:outline-none" />
                 <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 md:w-auto w-full"><Plus size={20} /> Cadastrar</button>
               </form>
            </Card>

            {/* LISTA DE VARIEDADES */}
            <div className="space-y-6">
              {culturas.map(cultura => {
                const variedadesDaCultura = variedades.filter(v => v.culturaId === cultura.id);
                if (variedadesDaCultura.length === 0) return null;
                return (
                  <div key={cultura.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 border-b border-gray-100 pb-2">
                      <Leaf size={18} className="text-green-600" /> {cultura.nome}
                    </h3>
                    <div className="space-y-2 pl-2 border-l-2 border-green-100 ml-2">
                      {variedadesDaCultura.map(v => {
                        const isSelected = varsSelecionadas.includes(v.id);
                        const embalagemDaVar = embalagens.find(e => e.id === v.embalagemId);
                        
                        return (
                          <div key={v.id} onClick={() => isVarSelectionMode && handleToggleVar(v.id)} className={`relative flex items-center justify-between py-2 px-3 rounded-lg transition-colors group border ${isVarSelectionMode ? 'cursor-pointer hover:bg-gray-50' : ''} ${isSelected ? 'bg-blue-50/50 border-blue-200' : 'border-transparent hover:border-gray-100'}`}>
                            
                            {/* LADO ESQUERDO: Ícone da Plantinha e Nome da Variedade com Lápis/Lixeira */}
                            <div className="flex items-center gap-3">
                              {/* CHECKBOX QUANDO MODO SELEÇÃO ESTÁ ATIVO */}
                              {isVarSelectionMode && (
                                <div className="shrink-0 mr-1">
                                  {isSelected ? <CheckSquare className="text-blue-500" size={18}/> : <Square className="text-gray-300" size={18}/>}
                                </div>
                              )}
                              
                              <Sprout className="text-green-500 shrink-0" size={16} />

                              {editingVarId === v.id ? (
                                <div className="flex items-center gap-2 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="text"
                                    value={editVarNomeVal}
                                    onChange={(e) => setEditVarNomeVal(e.target.value)}
                                    className="w-48 p-1 border-2 border-green-400 bg-green-50 rounded-lg text-sm font-bold text-green-900 outline-none"
                                    autoFocus
                                  />
                                  <button onClick={() => confirmEditVariedade(v.id)} className="text-green-600 hover:bg-green-50 p-1 rounded transition-all"><Save size={16} /></button>
                                  <button onClick={cancelEditVariedade} className="text-gray-400 hover:bg-red-50 p-1 rounded transition-all"><X size={16} /></button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-700">{v.nome}</span>
                                  
                                  {/* BOTÕES DE EDIÇÃO/EXCLUSÃO (Aparecem no Hover) */}
                                  {!isVarSelectionMode && (
                                    <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                      <button onClick={(e) => { e.stopPropagation(); startEditVariedade(v); }} className="text-gray-300 hover:text-blue-600 p-1 rounded transition-all" title="Editar Nome"><Edit2 size={14} /></button>
                                      <button onClick={(e) => { e.stopPropagation(); handleDeleteVariedade(v.id); }} className="text-gray-300 hover:text-red-500 p-1 rounded transition-all" title="Excluir Semente"><Trash size={14} /></button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* LADO DIREITO: Bolinha de Cor e Embalagem */}
                            <div className="flex items-center gap-4">
                              
                              <button 
                                onClick={(e) => { e.stopPropagation(); setColorPickerVarId(colorPickerVarId === v.id ? null : v.id); }}
                                className="w-5 h-5 rounded-full border border-gray-200 shadow-sm transition-transform hover:scale-110 shrink-0"
                                style={{ backgroundColor: v.cor || '#3b82f6' }}
                                title="Mudar cor da semente"
                              />

                              {/* EMBALAGEM E BOTÃO DE TROCAR EMBALAGEM (PACOTE) */}
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                {embalagemDaVar ? (
                                  <div className="hidden md:flex items-center gap-2">
                                    <span className="font-medium text-gray-700 text-sm">{embalagemDaVar.nome}</span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] italic text-gray-400 hidden md:block">Sem embalagem</span>
                                )}
                                
                                {!isVarSelectionMode && (
                                  <button onClick={() => { setVarsSelecionadas([v.id]); setEmbSelecionadaId(v.embalagemId || ''); setIsModalEmbVarOpen(true); }} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded transition-all" title="Trocar Embalagem">
                                    <Package size={16} />
                                  </button>
                                )}
                              </div>

                            </div>

                            {/* MINI COLOR PICKER FLUTUANTE (Ajustado para abrir à direita) */}
                            {colorPickerVarId === v.id && (
                              <div className="absolute right-20 top-10 bg-white border border-gray-200 shadow-xl rounded-2xl p-4 z-50 flex flex-col gap-3 animate-fade-in w-64" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cor da Semente</span>
                                  <X size={16} className="text-gray-400 cursor-pointer hover:text-red-500" onClick={() => setColorPickerVarId(null)} />
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                  {PRESET_COLORS.map(cor => (
                                    <div key={cor} onClick={() => { handleChangeCorVariedade(v.id, cor); setColorPickerVarId(null); }} className={`w-10 h-10 rounded-xl cursor-pointer hover:scale-110 transition-transform ${v.cor === cor ? 'ring-2 ring-gray-400 ring-offset-1' : ''}`} style={{ backgroundColor: cor }} />
                                  ))}
                                </div>
                                <div className="pt-3 border-t border-gray-100 flex items-center gap-2">
                                  <span className="text-xs font-semibold text-gray-500">Personalizada:</span>
                                  <input type="color" value={v.cor || '#3b82f6'} onChange={(e) => handleChangeCorVariedade(v.id, e.target.value)} className="w-full h-8 cursor-pointer rounded bg-transparent border-0" />
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
          </div>
        )}

       {/* --- ABA: TAXAS DE PLANTIO E EMBALAGENS --- */}
        {activeSubTab === 'taxas' && (
          <div className="animate-fade-in">
            
            {/* SESSÃO DE EMBALAGENS */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                <Package size={20} className="text-blue-600" /> Presets de Embalagens
              </h2>
              <button onClick={() => setShowEmbForm(!showEmbForm)} className="text-sm font-bold text-blue-700 bg-blue-50 px-4 py-2 rounded-xl border border-blue-200 shadow-sm hover:bg-blue-100 transition-colors flex items-center gap-2">
                {showEmbForm ? <X size={16} /> : <Plus size={16} />} <span className="hidden md:block">{showEmbForm ? 'Cancelar' : 'Cadastrar Embalagem'}</span>
              </button>
            </div>

            {/* FORMULÁRIO DE EMBALAGEM */}
            {showEmbForm && (
              <Card className="mb-6 border-l-4 border-l-blue-500 animate-fade-in">
                <form onSubmit={(e) => { handleAddEmbalagem(e); setShowEmbForm(false); }} className="space-y-4">
                  <div className="flex gap-3">
                    <input type="text" value={embNome} onChange={(e) => setEmbNome(e.target.value)} placeholder="Nome (Ex: Saca de Soja 40kg)" className="flex-[2] bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold text-gray-800" />
                    <select value={embTipo} onChange={(e) => setEmbTipo(e.target.value)} className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold text-blue-700">
                      <option value="saca">Saca</option>
                      <option value="bag">Bag</option>
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <select value={embUnidade} onChange={(e) => setEmbUnidade(e.target.value)} className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold text-gray-700">
                      <option value="kg">Peso (Kg)</option>
                      <option value="sementes">Quantidade (Sementes)</option>
                    </select>
                    <input type="number" step="0.01" value={embCapacidade} onChange={(e) => setEmbCapacidade(e.target.value)} placeholder="Capacidade" className="flex-[2] bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm" />
                  </div>
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"><Plus size={18} /> Salvar Embalagem</button>
                </form>
              </Card>
            )}

            {/* LISTA DE EMBALAGENS */}
            <div className="mb-8 space-y-2">
              {embalagens.map(emb => (
                <div key={emb.id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div>
                    <span className="font-bold text-gray-800 block">{emb.nome}</span>
                    <span className="text-xs text-gray-500 uppercase font-bold">{emb.tipoEmbalagem} • {emb.capacidade} {emb.tipoUnidade}</span>
                  </div>
                  <button onClick={() => handleDeleteEmbalagem(emb.id)} className="text-gray-400 hover:text-red-500"><Trash size={16} /></button>
                </div>
              ))}
            </div>

          {/* SESSÃO DE TAXAS */}
            <div className="flex justify-between items-center mb-4 border-t border-gray-200 pt-8">
              <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                <Calculator size={20} className="text-orange-500" /> Presets de Taxas
              </h2>
              <button onClick={() => setShowTaxaForm(!showTaxaForm)} className="text-sm font-bold text-orange-700 bg-orange-50 px-4 py-2 rounded-xl border border-orange-200 shadow-sm hover:bg-orange-100 transition-colors flex items-center gap-2">
                {showTaxaForm ? <X size={16} /> : <Plus size={16} />} <span className="hidden md:block">{showTaxaForm ? 'Cancelar' : 'Cadastrar Taxa'}</span>
              </button>
            </div>

            {/* FORMULÁRIO DE TAXAS COM OS CAMPOS DINÂMICOS */}
            {showTaxaForm && (
              <Card className="mb-6 border-l-4 border-l-orange-500 animate-fade-in">
                <form onSubmit={(e) => { handleAddTaxa(e); setShowTaxaForm(false); }} className="space-y-4">
                  <div className="flex gap-3">
                    <input type="text" value={taxaNome} onChange={(e) => setTaxaNome(e.target.value)} placeholder="Nome do Preset (Ex: Milho Verão Densidade Alta)" className="flex-[2] bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold text-gray-800" />
                    <select value={taxaTipo} onChange={(e) => setTaxaTipo(e.target.value)} className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold text-gray-700">
                      <option value="kg">Kg/ha</option>
                      <option value="sementes_ha">Sementes/ha</option>
                      <option value="sementes_metro">Sementes/m linear</option>
                    </select>
                  </div>
                  
                  {/* CAMPOS CONDICIONAIS QUE FALTAVAM */}
                  <div className="flex gap-3 animate-fade-in">
                    {taxaTipo === 'kg' && (
                      <input type="number" step="0.01" value={taxaKgPorHa} onChange={(e) => setTaxaKgPorHa(e.target.value)} placeholder="Quantidade de Kg por Hectare" className="w-full bg-white border border-orange-200 rounded-xl p-3 text-sm focus:ring-1 focus:ring-orange-400 outline-none" required />
                    )}
                    
                    {taxaTipo === 'sementes_ha' && (
                      <input type="number" step="0.01" value={taxaSementesPorHa} onChange={(e) => setTaxaSementesPorHa(e.target.value)} placeholder="Quantidade de Sementes por Hectare (Ex: 60000)" className="w-full bg-white border border-orange-200 rounded-xl p-3 text-sm focus:ring-1 focus:ring-orange-400 outline-none" required />
                    )}
                    
                    {taxaTipo === 'sementes_metro' && (
                      <>
                        <input type="number" step="0.01" value={taxaEspacamento} onChange={(e) => setTaxaEspacamento(e.target.value)} placeholder="Espaçamento entre linhas em metros (Ex: 0.45)" className="flex-1 bg-white border border-orange-200 rounded-xl p-3 text-sm focus:ring-1 focus:ring-orange-400 outline-none" required />
                        <input type="number" step="0.01" value={taxaSementesPorMetro} onChange={(e) => setTaxaSementesPorMetro(e.target.value)} placeholder="Qtd. Sementes por metro linear (Ex: 12)" className="flex-1 bg-white border border-orange-200 rounded-xl p-3 text-sm focus:ring-1 focus:ring-orange-400 outline-none" required />
                      </>
                    )}
                  </div>

                  <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors">
                    Salvar Gabarito de Taxa
                  </button>
                </form>
              </Card>
            )}

            {/* LISTA DE TAXAS (MOSTRANDO OS DETALHES) */}
            <div className="space-y-3 mb-16">
              {taxasPlantio.map(taxa => {
                let detalhe = '';
                if (taxa.tipo === 'kg') detalhe = `${taxa.kgPorHa} Kg/ha`;
                if (taxa.tipo === 'sementes_ha') detalhe = `${taxa.sementesPorHa?.toLocaleString('pt-BR')} sementes/ha`;
                if (taxa.tipo === 'sementes_metro') detalhe = `${taxa.sementesPorMetro} sementes/m (Espaç. ${taxa.espacamento}m)`;

                return (
                  <div key={taxa.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center group hover:border-orange-200 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="bg-orange-50 p-2 rounded-lg"><Calculator size={18} className="text-orange-500" /></div>
                      <div>
                        <h4 className="font-bold text-gray-800 text-[15px]">{taxa.nome}</h4>
                        <p className="text-xs text-orange-600 font-semibold mt-0.5 bg-orange-50 inline-block px-2 py-0.5 rounded uppercase tracking-wider">{detalhe}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteTaxa(taxa.id)} className="text-gray-300 hover:text-red-500 p-2 bg-gray-50 hover:bg-red-50 rounded-lg transition-colors"><Trash size={18} /></button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}