// src/pages/Compras.jsx
import React, { useState, useEffect, useMemo } from 'react';
import Header from '../components/Header';
import { ArrowLeft, FolderOpen, TableProperties, Plus, Download, Filter, Trash2, PackageCheck, ReceiptText, Eye, Edit2, Calculator, X, CheckCircle2, AlertCircle, FileText, Upload } from 'lucide-react';
import { generateId, formatCurrency } from '../utils/helpers';
import { useModal } from '../contexts/ModalContext';
import * as xlsx from 'xlsx';

// --- CONFIGURAÇÕES E FUNÇÕES DE APOIO ---
const getCategoriaColor = (categoria) => {
  const cat = (categoria || '').toLowerCase();
  if (cat.includes('herbicida')) return 'bg-[#cbf4cc] text-[#1c6020]'; 
  if (cat.includes('fungicida')) return 'bg-[#ccebf4] text-[#1b5e75]'; 
  if (cat.includes('inseticida')) return 'bg-[#f4f4cc] text-[#70701c]'; 
  if (cat.includes('fertilizante')) return 'bg-[#f4cccc] text-[#701c1c]'; 
  if (cat.includes('biológico')) return 'bg-[#d8ccf4] text-[#421c70]'; 
  if (cat.includes('semente')) return 'bg-[#e0e7ff] text-[#4338ca]';
  return 'bg-white text-gray-800'; 
};

const formatQtd = (val) => {
  if (val === '' || val == null || isNaN(val)) return '0';
  return Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
};

const formatNumber = (val, isCurrency = false) => {
  if (val === '' || val == null || isNaN(val)) return '';
  if (isCurrency) return Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
};

const STATUS_COMPRA_OPCOES = ['Fechado', 'Em cotação'];
const CATEGORIAS_OPCOES = ['Herbicida', 'Fungicida', 'Inseticida', 'Fertilizante', 'Biológico', 'Sementes', 'Corretivo', 'Outros Insumos'];
const UNIDADES_OPCOES = ['Lt', 'Kg', 'Ton', 'Dose', 'Pct', 'Bag', 'Saca', 'UN', 'CX'];

// --- DADOS INICIAIS ---
const DADOS_PLANILHA_1 = [
  { id: generateId(), statusCompra: 'Fechado', dataCompra: '2026-03-01', categoria: 'Herbicida', produto: 'Paxeo', volume: 165.44, un: 'Kg', valorUnitario: 1835.00, empresa: 'Corteva', pgto: '30/60/90', entregaPrev: '15/04/2026', qtdRecebida: 0, recebimentos: [] },
  { id: generateId(), statusCompra: 'Fechado', dataCompra: '2026-03-05', categoria: 'Fungicida', produto: 'Viovan', volume: 8100, un: 'Lt', valorUnitario: 138.00, empresa: 'Corteva', pgto: 'À vista', entregaPrev: 'Imediato', qtdRecebida: 4000, recebimentos: [{ id: generateId(), nf: '1540', data: '2026-03-05', dataNf: '2026-03-03', qtd: 4000, valorNota: 138.00 }] },
  { id: generateId(), statusCompra: 'Em cotação', dataCompra: '', categoria: 'Herbicida', produto: 'Pacto', volume: 50.40, un: 'Kg', valorUnitario: 1890.00, empresa: 'Corteva', pgto: '', entregaPrev: '', qtdRecebida: 50.40, recebimentos: [{ id: generateId(), nf: '1588', data: '2026-03-10', dataNf: '2026-03-09', qtd: 50.40, valorNota: 1890.00 }] },
];

const DADOS_PLANILHA_2 = [
  { id: generateId(), statusCompra: 'Em cotação', dataCompra: '', categoria: 'Inseticida', produto: 'Bright', volume: 4060, un: 'Kg', valorUnitario: 95.00, empresa: 'Basf', pgto: 'Safra', entregaPrev: '', qtdRecebida: 0, recebimentos: [] },
  { id: generateId(), statusCompra: 'Fechado', dataCompra: '2026-02-28', categoria: 'Sementes', produto: 'Soja Monsoy', volume: 500, un: 'Saca', valorUnitario: 220.00, empresa: 'Bayer', pgto: '', entregaPrev: '', qtdRecebida: 0, recebimentos: [] },
  { id: generateId(), statusCompra: 'Em cotação', dataCompra: '', categoria: 'Inseticida', produto: 'Verdavis', volume: 1800, un: 'Lt', valorUnitario: 388.74, empresa: 'Syngenta', pgto: '', entregaPrev: '', qtdRecebida: 0, recebimentos: [] },
];

const MINHAS_PLANILHAS = [
  { id: 'planilha-soja', titulo: 'Soja 26/27 - Insumos', data: DADOS_PLANILHA_1 },
  { id: 'planilha-milho', titulo: 'Milho Safrinha - Insumos', data: DADOS_PLANILHA_2 },
];

// --- COLUNAS DA TABELA PRINCIPAL ---
const COLUNAS_DEF = [
  { key: 'statusCompra', label: 'Status Compra', width: 'w-40', type: 'select', options: STATUS_COMPRA_OPCOES },
  { key: 'dataCompra', label: 'Data da compra', width: 'w-36', type: 'date' },
  { key: 'categoria', label: 'Categoria', width: 'w-36', type: 'select', options: CATEGORIAS_OPCOES },
  { key: 'produto', label: 'Produto', width: 'w-48', type: 'text' },
  { key: 'volume', label: 'Volume', width: 'w-24', type: 'number', summeable: true },
  { key: 'un', label: 'Un', width: 'w-20', type: 'select', options: UNIDADES_OPCOES },
  { key: 'valorUnitario', label: 'R$ Unit.', width: 'w-32', type: 'currency', summeable: true },
  { key: 'empresa', label: 'Empresa', width: 'w-40', type: 'text', list: 'lista-empresa' },
  { key: 'pgto', label: 'Pgto', width: 'w-32', type: 'text' },
  { key: 'valorTotal', label: 'Total', width: 'w-36', type: 'currency', readOnly: true, summeable: true },
  { key: 'entregaPrev', label: 'Entrega Prev.', width: 'w-36', type: 'text' },
  { key: 'statusEntrega', label: 'Status Entrega', width: 'w-32', readOnly: true },
  { key: 'acoes', label: 'Ações', width: 'w-24', readOnly: true }
];

export default function Compras() {
  const { showConfirm, showAlert } = useModal();
  
  // --- ESTADOS ---
  const [planilhas, setPlanilhas] = useState(MINHAS_PLANILHAS);
  
  // null = Dashboard | 'NFS' = Tela de Notas Fiscais | string = ID da Planilha
  const [activePlanilhaId, setActivePlanilhaId] = useState(null);
  
  // Filtros (Tabela Principal)
  const [filtros, setFiltros] = useState({ statusCompra: '', statusEntrega: '', categoria: '', produto: '', empresa: '' });
  
  // Filtros (Tela de NF)
  const [nfFiltros, setNfFiltros] = useState({ nf: '', produto: '', empresa: '', dataNf: '' });

  // UI States
  const [history, setHistory] = useState([]);
  const [focusedCell, setFocusedCell] = useState(null); 
  const [columnSumKey, setColumnSumKey] = useState(null);
  const [statusViewMode, setStatusViewMode] = useState({});
  const [editingTitleId, setEditingTitleId] = useState(null);
  const [tempTitle, setTempTitle] = useState('');

  // Modais e Colunas
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('compras_colunas_v2');
    if (saved) return JSON.parse(saved);
    return COLUNAS_DEF.reduce((acc, col) => ({ ...acc, [col.key]: true }), {});
  });
  
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [receiveModal, setReceiveModal] = useState({ isOpen: false, rowId: null, produto: '', volumeTotal: 0, qtdRecebida: 0, un: '', empresa: '', nf: '', data: new Date().toISOString().split('T')[0], dataNf: new Date().toISOString().split('T')[0], qtd: '', valorNota: '' });

  useEffect(() => {
    localStorage.setItem('compras_colunas_v2', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const getRowStatus = (row) => {
    const vol = Number(row.volume) || 0;
    const rec = Number(row.qtdRecebida) || 0;
    if (vol > 0 && rec >= vol) return 'Entregue';
    if (rec > 0) return 'Parcial';
    return 'Não Iniciado';
  };

  // --- FUNÇÕES DE NAVEGAÇÃO E PLANILHA ---
  const abrirPlanilha = (id) => {
    setActivePlanilhaId(id);
    setFiltros({ statusCompra: '', statusEntrega: '', categoria: '', produto: '', empresa: '' }); 
    setColumnSumKey(null);
  };

  const adicionarPlanilha = () => {
    const novoId = generateId();
    setPlanilhas([...planilhas, { id: novoId, titulo: 'Nova Planilha de Insumos', data: [] }]);
  };

  const deletarPlanilha = (id, e) => {
    e.stopPropagation();
    showConfirm("Excluir Tabela", "Excluir esta tabela permanentemente?", () => {
      setPlanilhas(planilhas.filter(p => p.id !== id));
    });
  };

  const salvarTitulo = (id) => {
    if(tempTitle.trim() !== '') {
      setPlanilhas(planilhas.map(p => p.id === id ? { ...p, titulo: tempTitle } : p));
    }
    setEditingTitleId(null);
  };

  const atualizarCelula = (rowId, colKey, value) => {
    setHistory(prev => [...prev, planilhas].slice(-30));
    setPlanilhas(planilhas.map(p => {
      if (p.id !== activePlanilhaId) return p;
      return { ...p, data: p.data.map(row => row.id === rowId ? { ...row, [colKey]: value } : row) };
    }));
  };

  const adicionarLinha = () => {
    setHistory(prev => [...prev, planilhas].slice(-30));
    setPlanilhas(planilhas.map(p => {
      if (p.id !== activePlanilhaId) return p;
      return { ...p, data: [...p.data, { id: generateId(), statusCompra: 'Em cotação', dataCompra: '', categoria: '', produto: '', volume: '', un: 'Lt', valorUnitario: '', empresa: '', pgto: '', entregaPrev: '', qtdRecebida: 0, recebimentos: [] }] };
    }));
  };

  const deletarLinha = (rowId) => {
    showConfirm("Excluir", "Excluir esta linha?", () => {
      setHistory(prev => [...prev, planilhas].slice(-30));
      setPlanilhas(planilhas.map(p => {
        if (p.id !== activePlanilhaId) return p;
        return { ...p, data: p.data.filter(row => row.id !== rowId) };
      }));
    });
  };

  const handleUndo = () => {
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const newHistory = [...prev];
      const pastState = newHistory.pop();
      setPlanilhas(pastState);
      return newHistory;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); handleUndo(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [planilhas, history]);

  // --- IMPORTAÇÃO DE EXCEL ---
  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = xlsx.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

        const newRows = json.map(row => {
          // Procura chaves independente de maiúscula ou espaço
          const getVal = (keyPesquisa) => {
            const foundKey = Object.keys(row).find(k => k.toLowerCase().trim() === keyPesquisa.toLowerCase());
            return foundKey ? row[foundKey] : '';
          };
          
          return {
            id: generateId(),
            statusCompra: 'Em cotação',
            dataCompra: '',
            categoria: getVal('categoria') || getVal('grupo') || '',
            produto: getVal('produto') || getVal('nome') || getVal('descrição') || '',
            volume: Number(getVal('volume')) || Number(getVal('qtd')) || Number(getVal('quantidade')) || 0,
            un: getVal('un') || getVal('unidade') || 'Lt',
            valorUnitario: '',
            empresa: '',
            pgto: '',
            entregaPrev: '',
            qtdRecebida: 0,
            recebimentos: []
          };
        });

        const novoId = generateId();
        const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extensão do arquivo para virar o título
        setPlanilhas([...planilhas, { id: novoId, titulo: fileName, data: newRows }]);
        showAlert("Sucesso", `Planilha '${fileName}' importada com ${newRows.length} itens.`, "success");
      } catch (error) {
        console.error(error);
        showAlert("Erro", "Falha ao ler o arquivo Excel.", "danger");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; // Limpa o input
  };

  // --- RECEBIMENTOS ---
  const abrirModalRecebimento = (row) => {
    setReceiveModal({
      isOpen: true, rowId: row.id, produto: row.produto, volumeTotal: Number(row.volume) || 0,
      qtdRecebida: Number(row.qtdRecebida) || 0, un: row.un, empresa: row.empresa || '', 
      nf: '', data: new Date().toISOString().split('T')[0], dataNf: new Date().toISOString().split('T')[0], 
      qtd: '', valorNota: Number(row.valorUnitario) || ''
    });
  };

  const confirmarRecebimento = (e) => {
    e.preventDefault();
    if (!receiveModal.nf.trim()) return showAlert("Atenção", "Nota Fiscal é obrigatória.", "warning");
    if (!receiveModal.qtd || Number(receiveModal.qtd) <= 0) return showAlert("Atenção", "Quantidade inválida.", "warning");
    
    const novoRec = { 
      id: generateId(), 
      nf: receiveModal.nf, 
      data: receiveModal.data, // Data de Recebimento
      dataNf: receiveModal.dataNf, // Data da Emissão da NF
      qtd: Number(receiveModal.qtd), 
      valorNota: Number(receiveModal.valorNota) 
    };
    
    setHistory(prev => [...prev, planilhas].slice(-30));
    setPlanilhas(planilhas.map(p => {
      if (p.id !== activePlanilhaId) return p;
      return { ...p, data: p.data.map(row => {
        if (row.id === receiveModal.rowId) {
          return { ...row, qtdRecebida: (Number(row.qtdRecebida) || 0) + novoRec.qtd, recebimentos: [...(row.recebimentos || []), novoRec] };
        }
        return row;
      })};
    }));
    setReceiveModal({ ...receiveModal, isOpen: false });
    showAlert("Sucesso", "Recebimento lançado!", "success");
  };

  const cycleStatusView = (rowId) => {
    setStatusViewMode(prev => ({ ...prev, [rowId]: ((prev[rowId] || 0) + 1) % 3 }));
  };

  const exportarParaExcel = () => {
    if (!activePlanilhaId || activePlanilhaId === 'NFS') return;
    const planilhaAtual = planilhas.find(p => p.id === activePlanilhaId);
    
    const dataToExport = planilhaAtual.data.filter(item => {
      const matchSC = filtros.statusCompra === '' || item.statusCompra === filtros.statusCompra;
      const matchSE = filtros.statusEntrega === '' || getRowStatus(item) === filtros.statusEntrega;
      const matchCat = filtros.categoria === '' || item.categoria === filtros.categoria;
      const matchProd = filtros.produto === '' || (item.produto || '').toLowerCase().includes(filtros.produto.toLowerCase());
      const matchEmp = filtros.empresa === '' || (item.empresa || '').toLowerCase().includes(filtros.empresa.toLowerCase());
      return matchSC && matchSE && matchCat && matchProd && matchEmp;
    });

    const ws = xlsx.utils.json_to_sheet(dataToExport.map(d => ({
      'Status Compra': d.statusCompra,
      'Data da compra': d.dataCompra,
      'Categoria': d.categoria,
      'Produto': d.produto,
      'Volume Comprado': Number(d.volume) || 0,
      'Un': d.un,
      'Valor Unitário': Number(d.valorUnitario) || 0,
      'Empresa': d.empresa,
      'Pagamento': d.pgto,
      'Valor Total': (Number(d.volume) || 0) * (Number(d.valorUnitario) || 0),
      'Entrega Prev.': d.entregaPrev,
      'Qtd Recebida': Number(d.qtdRecebida) || 0,
      'Status Entrega': getRowStatus(d)
    })));

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Compras");
    xlsx.writeFile(wb, `Planilha_${planilhaAtual.titulo.replace(/\s+/g, '_')}.xlsx`);
  };

  // ==========================================
  // RENDERIZAÇÃO: DASHBOARD
  // ==========================================
  if (!activePlanilhaId) {
    return (
      <div className="bg-gray-50 min-h-screen pb-32">
        <Header title="Gestão de Compras" />
        <div className="p-4 lg:p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-black flex items-center gap-3 text-gray-800"><FolderOpen className="text-blue-600" /> Painel de Planilhas</h1>
            <div className="flex gap-3">
              <button onClick={() => setActivePlanilhaId('NFS')} className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold hover:bg-indigo-100 transition-colors shadow-sm">
                <ReceiptText size={18} /> Consultar NFs GERAIS
              </button>
              
              <label className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold hover:bg-gray-100 shadow-sm transition-colors">
                <Upload size={18} /> Importar Excel
                <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="hidden" />
              </label>

              <button onClick={adicionarPlanilha} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold hover:bg-blue-700 shadow-md">
                <Plus size={18} /> Criar Nova
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {planilhas.map(planilha => {
              const totalItems = planilha.data.length;
              const totalValue = planilha.data.reduce((acc, row) => acc + ((Number(row.volume) || 0) * (Number(row.valorUnitario) || 0)), 0);
              return (
                <div key={planilha.id} onClick={() => abrirPlanilha(planilha.id)} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-blue-400 cursor-pointer transition-all flex flex-col h-full group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-blue-50 p-3 rounded-xl text-blue-600"><TableProperties size={24}/></div>
                    <button onClick={(e) => deletarPlanilha(planilha.id, e)} className="text-gray-300 hover:text-red-500 p-2 rounded transition-colors"><Trash2 size={18}/></button>
                  </div>
                  <h3 className="text-lg font-black text-gray-800 mb-1 group-hover:text-blue-600 line-clamp-2">{planilha.titulo}</h3>
                  <div className="mt-auto pt-6 border-t border-gray-100 flex justify-between items-end">
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Valor Total Estimado</p>
                      <p className="text-lg font-black text-emerald-600">{formatCurrency(totalValue)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Itens</p>
                      <p className="text-sm font-bold text-gray-700">{totalItems}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDERIZAÇÃO: TELA GERAL DE NFs
  // ==========================================
  if (activePlanilhaId === 'NFS') {
    const todasNfs = planilhas.flatMap(plan => 
      plan.data.flatMap(row => (row.recebimentos || []).map(rec => ({ ...rec, produto: row.produto, empresa: row.empresa, un: row.un, categoria: row.categoria, tabela: plan.titulo })))
    );

    const nfsFiltradas = todasNfs.filter(nf => {
      const matchNf = nfFiltros.nf === '' || nf.nf.toLowerCase().includes(nfFiltros.nf.toLowerCase());
      const matchProd = nfFiltros.produto === '' || (nf.produto || '').toLowerCase().includes(nfFiltros.produto.toLowerCase());
      const matchEmp = nfFiltros.empresa === '' || (nf.empresa || '').toLowerCase().includes(nfFiltros.empresa.toLowerCase());
      const matchDataNf = nfFiltros.dataNf === '' || nf.dataNf === nfFiltros.dataNf;
      return matchNf && matchProd && matchEmp && matchDataNf;
    }).sort((a, b) => new Date(b.data) - new Date(a.data));

    return (
      <div className="bg-gray-50 min-h-screen text-gray-800 pb-40">
        {/* CABEÇALHO NFS */}
        <div className="bg-white px-4 lg:px-8 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 z-[50] shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setActivePlanilhaId(null)} className="p-2 border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors"><ArrowLeft size={20} /></button>
            <h1 className="text-2xl font-black flex items-center gap-3"><ReceiptText className="text-indigo-600"/> Consulta Global de NFs</h1>
          </div>
        </div>

        <div className="p-4 lg:p-8">
          {/* BARRA DE FILTROS NFs */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-wrap items-center gap-4">
            <span className="font-bold text-xs text-gray-400 uppercase tracking-widest flex items-center gap-1"><Filter size={14}/> Filtros:</span>
            <input type="text" placeholder="Nº da Nota..." className="border border-gray-300 p-2 rounded-lg text-sm font-semibold outline-none focus:border-indigo-500" value={nfFiltros.nf} onChange={e => setNfFiltros({...nfFiltros, nf: e.target.value})} />
            <input type="text" placeholder="Produto..." className="border border-gray-300 p-2 rounded-lg text-sm font-semibold outline-none focus:border-indigo-500" value={nfFiltros.produto} onChange={e => setNfFiltros({...nfFiltros, produto: e.target.value})} />
            <input type="text" placeholder="Empresa..." className="border border-gray-300 p-2 rounded-lg text-sm font-semibold outline-none focus:border-indigo-500" value={nfFiltros.empresa} onChange={e => setNfFiltros({...nfFiltros, empresa: e.target.value})} />
            <div className="flex items-center gap-2">
               <span className="text-xs font-bold text-gray-500">Data NF:</span>
               <input type="date" className="border border-gray-300 p-2 rounded-lg text-sm font-semibold outline-none focus:border-indigo-500" value={nfFiltros.dataNf} onChange={e => setNfFiltros({...nfFiltros, dataNf: e.target.value})} />
            </div>
          </div>

          {/* TABELA DE NFs */}
          <div className="bg-white border border-gray-300 rounded-xl shadow-lg overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm border-collapse text-left whitespace-nowrap">
              <thead className="bg-indigo-600 text-white">
                <tr>
                  <th className="p-3 font-semibold border-r border-indigo-500/50">Data NF</th>
                  <th className="p-3 font-semibold border-r border-indigo-500/50">Recebimento</th>
                  <th className="p-3 font-bold border-r border-indigo-500/50">Nº NF</th>
                  <th className="p-3 font-semibold border-r border-indigo-500/50">Produto</th>
                  <th className="p-3 font-semibold text-right border-r border-indigo-500/50">Qtd</th>
                  <th className="p-3 font-semibold text-center border-r border-indigo-500/50">Un</th>
                  <th className="p-3 font-semibold border-r border-indigo-500/50">Empresa</th>
                  <th className="p-3 font-semibold text-right border-r border-indigo-500/50">R$ Unit.</th>
                  <th className="p-3 font-semibold text-right border-r border-indigo-500/50">R$ Total</th>
                  <th className="p-3 font-semibold">Ref. Cotação</th>
                </tr>
              </thead>
              <tbody>
                {nfsFiltradas.length === 0 ? (
                  <tr><td colSpan="10" className="p-8 text-center text-gray-500 italic">Nenhuma nota fiscal encontrada no filtro.</td></tr>
                ) : (
                  nfsFiltradas.map((nf, idx) => {
                    const totalNf = (Number(nf.qtd) || 0) * (Number(nf.valorNota) || 0);
                    return (
                      <tr key={idx} className="border-b border-gray-200 hover:bg-indigo-50 transition-colors">
                        <td className="p-3 text-gray-600 font-medium">{nf.dataNf ? new Date(nf.dataNf).toLocaleDateString('pt-BR') : '-'}</td>
                        <td className="p-3 text-gray-500">{new Date(nf.data).toLocaleDateString('pt-BR')}</td>
                        <td className="p-3 font-black text-gray-800 text-base">{nf.nf}</td>
                        <td className="p-3">
                          <span className="font-bold text-gray-800 block truncate max-w-[200px]">{nf.produto}</span>
                          <span className="text-[10px] text-gray-400 uppercase font-bold">{nf.categoria}</span>
                        </td>
                        <td className="p-3 text-right font-black text-indigo-700 text-base">{formatQtd(nf.qtd)}</td>
                        <td className="p-3 text-center text-gray-500 font-semibold">{nf.un}</td>
                        <td className="p-3 text-gray-700 font-medium">{nf.empresa}</td>
                        <td className="p-3 text-right text-gray-600">{nf.valorNota ? formatCurrency(nf.valorNota) : '-'}</td>
                        <td className="p-3 text-right font-bold text-gray-800">{totalNf > 0 ? formatCurrency(totalNf) : '-'}</td>
                        <td className="p-3 text-xs font-bold text-indigo-400 uppercase tracking-wide">{nf.tabela}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDERIZAÇÃO: PLANILHA ESPECÍFICA
  // ==========================================
  const planilhaAtiva = planilhas.find(p => p.id === activePlanilhaId);
  const colunasAtivas = COLUNAS_DEF.filter(c => visibleColumns[c.key]);

  // Listas Dinâmicas para os Filtros e Datalist
  const empresasDestaPlanilha = [...new Set(planilhaAtiva.data.map(i => i.empresa).filter(Boolean))];
  const categoriasDestaPlanilha = [...new Set(planilhaAtiva.data.map(i => i.categoria).filter(Boolean))];

  // Filtro Cru, Nativo e Seguro
  const dadosFiltrados = planilhaAtiva.data.filter(item => {
    const matchSC = filtros.statusCompra === '' || item.statusCompra === filtros.statusCompra;
    const matchSE = filtros.statusEntrega === '' || getRowStatus(item) === filtros.statusEntrega;
    const matchCat = filtros.categoria === '' || item.categoria === filtros.categoria;
    const matchProd = filtros.produto === '' || (item.produto || '').toLowerCase().includes(filtros.produto.toLowerCase());
    const matchEmp = filtros.empresa === '' || (item.empresa || '').toLowerCase().includes(filtros.empresa.toLowerCase());
    return matchSC && matchSE && matchCat && matchProd && matchEmp;
  });

  // Cálculo de Soma na Coluna Ativa
  let statsSoma = null;
  if (columnSumKey) {
    const colObj = COLUNAS_DEF.find(c => c.key === columnSumKey);
    let total = 0; let count = 0;
    dadosFiltrados.forEach(row => {
      let val = row[colObj.key];
      if (colObj.key === 'valorTotal') val = (Number(row.volume) || 0) * (Number(row.valorUnitario) || 0);
      const num = Number(val);
      if (!isNaN(num) && val !== '') { total += num; count++; }
    });
    statsSoma = { total, count, isCurrency: colObj.type === 'currency', label: colObj.label };
  }

  return (
    <div className="bg-gray-50 min-h-screen text-gray-800 pb-40">
      <datalist id="lista-empresa">{empresasDestaPlanilha.map(e => <option key={e} value={e} />)}</datalist>

      {/* CABEÇALHO PLANILHA */}
      <div className="bg-white px-4 lg:px-8 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 z-[50] shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => setActivePlanilhaId(null)} className="p-2 border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors"><ArrowLeft size={20} /></button>
          {editingTitleId === planilhaAtiva.id ? (
            <input autoFocus className="text-xl font-black text-gray-800 border-b-2 border-blue-500 pb-0.5 outline-none w-64" value={tempTitle} onChange={e => setTempTitle(e.target.value)} onBlur={() => salvarTitulo(planilhaAtiva.id)} onKeyDown={e => e.key === 'Enter' && salvarTitulo(planilhaAtiva.id)} />
          ) : (
            <h1 className="text-xl font-black cursor-pointer hover:text-blue-600 flex items-center gap-2 group" onClick={() => { setEditingTitleId(planilhaAtiva.id); setTempTitle(planilhaAtiva.titulo); }}>
              {planilhaAtiva.titulo} <Edit2 size={14} className="text-gray-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100" />
            </h1>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsColumnModalOpen(true)} className="bg-gray-100 border border-gray-300 px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-gray-200"><Eye size={16} /> Colunas</button>
          <button onClick={exportarParaExcel} className="bg-white border border-gray-300 px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-gray-100"><Download size={16} /> Excel</button>
          <button onClick={adicionarLinha} className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-blue-700 shadow-md"><Plus size={16} /> Nova Linha</button>
        </div>
      </div>

      <div className="p-4 lg:p-8">
        
        {/* BARRA DE FILTROS NATIVOS */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-wrap items-center gap-4">
          <span className="font-bold text-xs text-gray-400 uppercase tracking-widest flex items-center gap-1"><Filter size={14}/> Filtros:</span>
          
          <select className="border border-gray-300 p-2 rounded-lg text-sm font-semibold bg-gray-50 outline-none focus:border-blue-500" value={filtros.statusCompra} onChange={e => setFiltros({...filtros, statusCompra: e.target.value})}>
            <option value="">Status Compra (Todos)</option>
            {STATUS_COMPRA_OPCOES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select className="border border-gray-300 p-2 rounded-lg text-sm font-semibold bg-gray-50 outline-none focus:border-blue-500" value={filtros.statusEntrega} onChange={e => setFiltros({...filtros, statusEntrega: e.target.value})}>
            <option value="">Status Entrega (Todos)</option>
            <option value="Não Iniciado">Não Iniciado</option>
            <option value="Parcial">Parcial</option>
            <option value="Entregue">Entregue</option>
          </select>

          <select className="border border-gray-300 p-2 rounded-lg text-sm font-semibold bg-gray-50 outline-none focus:border-blue-500" value={filtros.categoria} onChange={e => setFiltros({...filtros, categoria: e.target.value})}>
            <option value="">Categoria (Todas)</option>
            {categoriasDestaPlanilha.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <input type="text" placeholder="Buscar Produto..." className="border border-gray-300 p-2 rounded-lg text-sm font-semibold outline-none focus:border-blue-500 min-w-[160px]" value={filtros.produto} onChange={e => setFiltros({...filtros, produto: e.target.value})} />
          <input type="text" placeholder="Buscar Empresa..." list="lista-empresa" className="border border-gray-300 p-2 rounded-lg text-sm font-semibold outline-none focus:border-blue-500 min-w-[160px]" value={filtros.empresa} onChange={e => setFiltros({...filtros, empresa: e.target.value})} />
        </div>

        {/* TABELA PRINCIPAL */}
        <div className="bg-white border border-gray-300 rounded-xl shadow-lg overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm border-collapse text-left" style={{ tableLayout: 'fixed' }}>
            <thead className="bg-[#0e8eb8] text-white">
              <tr>
                {colunasAtivas.map(col => (
                  <th 
                    key={col.key} 
                    onClick={() => col.summeable && setColumnSumKey(columnSumKey === col.key ? null : col.key)}
                    className={`border border-white/20 p-2 font-normal truncate transition-colors ${col.width} ${col.summeable ? 'cursor-pointer hover:bg-sky-600' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      {col.label}
                      {col.summeable && <Calculator size={12} className={columnSumKey === col.key ? 'text-green-300' : 'opacity-40'} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dadosFiltrados.length === 0 ? (
                <tr><td colSpan={colunasAtivas.length} className="p-8 text-center text-gray-500 italic font-medium">Nenhum registro encontrado no filtro.</td></tr>
              ) : (
                dadosFiltrados.map((row, idx) => {
                  const isEven = idx % 2 === 0;
                  return (
                    <tr key={row.id} className="border-b border-gray-200 hover:bg-sky-50 group">
                      {colunasAtivas.map(col => {
                        let val = row[col.key];
                        if (col.key === 'valorTotal') val = (Number(row.volume) || 0) * (Number(row.valorUnitario) || 0);

                        let tdClass = `border border-gray-200 p-0 m-0 ${columnSumKey === col.key ? 'bg-sky-100/50' : (isEven ? 'bg-gray-50/50' : 'bg-white')}`;
                        let inputClass = "w-full h-full p-2 outline-none text-gray-800 bg-transparent focus:bg-white focus:ring-inset focus:ring-2 focus:ring-blue-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ";
                        
                        if (col.key === 'categoria') inputClass += getCategoriaColor(val) + " font-medium cursor-pointer";
                        if (col.type === 'number' || col.type === 'currency') inputClass += " text-right font-medium";

                        // COLUNA DE STATUS
                        if (col.key === 'statusEntrega') {
                          const vol = Number(row.volume) || 0;
                          const rec = Number(row.qtdRecebida) || 0;
                          const pendente = Math.max(vol - rec, 0);
                          const progress = vol > 0 ? Math.round((rec / vol) * 100) : 0;
                          const status = getRowStatus(row);
                          const viewMode = statusViewMode[row.id] || 0; 
                          
                          let text = viewMode === 0 ? `${formatQtd(rec)} / ${formatQtd(vol)}` : viewMode === 1 ? `${progress}%` : `- ${formatQtd(pendente)}`;

                          return (
                            <td key={col.key} className={`${tdClass} p-2 text-center cursor-pointer select-none`} onClick={() => cycleStatusView(row.id)}>
                              {status === 'Entregue' && viewMode === 0 ? (
                                <span className="bg-emerald-100 text-emerald-700 font-bold text-[10px] px-2 py-1 rounded uppercase tracking-widest shadow-sm">Entregue</span>
                              ) : (
                                <span className={`font-bold text-xs ${status === 'Entregue' ? 'text-emerald-600' : 'text-gray-600'}`}>{text}</span>
                              )}
                            </td>
                          );
                        }

                        // COLUNA DE AÇÕES
                        if (col.key === 'acoes') {
                          return (
                            <td key={col.key} className={`${tdClass} p-1 text-center`}>
                              <div className="flex justify-center gap-1">
                                <button onClick={() => abrirModalRecebimento(row)} className="text-blue-500 hover:bg-blue-100 p-1.5 rounded" title="Lançar NF"><PackageCheck size={16} /></button>
                                <button onClick={() => deletarLinha(row.id)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded" title="Excluir"><Trash2 size={16} /></button>
                              </div>
                            </td>
                          );
                        }

                        // DROPDOWNS DENTRO DA CÉLULA (Com ícones para Status Compra)
                        if (col.type === 'select') {
                          const isStatusCompra = col.key === 'statusCompra';
                          return (
                            <td key={col.key} className={tdClass}>
                              <div className="relative w-full h-full flex items-center">
                                {isStatusCompra && val === 'Fechado' && <CheckCircle2 size={16} className="absolute left-2 text-emerald-500 pointer-events-none z-10" />}
                                {isStatusCompra && val === 'Em cotação' && <AlertCircle size={16} className="absolute left-2 text-orange-500 pointer-events-none z-10" />}
                                <select 
                                  value={val || ''} 
                                  onChange={(e) => atualizarCelula(row.id, col.key, e.target.value)} 
                                  className={`${inputClass} cursor-pointer ${isStatusCompra ? 'pl-8 font-bold' : ''} ${isStatusCompra && val === 'Fechado' ? 'text-emerald-700' : ''} ${isStatusCompra && val === 'Em cotação' ? 'text-orange-600' : ''}`}
                                >
                                  <option value="" disabled>Selecione</option>
                                  {col.options.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                              </div>
                            </td>
                          );
                        }

                        // CÉLULAS DE TEXTO / NÚMERO / DATA
                        const isFocused = focusedCell?.rowId === row.id && focusedCell?.colKey === col.key;
                        let displayValue = val;
                        let inputType = 'text';

                        if (col.type === 'number' || col.type === 'currency') {
                          inputType = isFocused ? 'number' : 'text';
                          if (!isFocused) displayValue = formatNumber(val, col.type === 'currency');
                        } else if (col.type === 'date') {
                           inputType = 'date';
                        }

                        return (
                          <td key={col.key} className={tdClass}>
                            {col.readOnly ? (
                              <div className={`w-full h-full p-2 text-gray-600 ${col.type === 'currency' ? 'text-right font-bold' : ''}`}>
                                {col.type === 'currency' ? formatCurrency(val) : val}
                              </div>
                            ) : (
                              <div className="relative w-full h-full flex items-center">
                                {col.type === 'currency' && <span className="absolute left-2 text-xs font-bold text-gray-400 pointer-events-none z-20">R$</span>}
                                <input
                                  type={inputType}
                                  step="0.01"
                                  list={col.list}
                                  value={isFocused ? (val || '') : (displayValue || '')}
                                  onChange={(e) => atualizarCelula(row.id, col.key, e.target.value)}
                                  onFocus={() => setFocusedCell({ rowId: row.id, colKey: col.key })}
                                  onBlur={() => setFocusedCell(null)}
                                  className={`${inputClass} ${col.type === 'currency' ? 'pl-8' : ''}`}
                                />
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* BARRA DE SOMA INFERIOR */}
        {statsSoma && (
          <div className="mt-4 bg-slate-800 text-white p-3 rounded-xl flex justify-between items-center shadow-lg font-bold border-t-4 border-blue-500 animate-fade-in">
            <span className="text-gray-400 uppercase tracking-widest text-[10px] flex items-center gap-2">Coluna Analisada: <span className="bg-slate-700 px-2 py-1 rounded text-blue-300">{statsSoma.label}</span></span>
            <div className="flex items-center gap-6">
              <span>Linhas: <span className="text-blue-400 text-lg ml-1">{statsSoma.count}</span></span>
              <span>Soma: <span className="text-blue-400 text-lg ml-1">{statsSoma.isCurrency ? formatCurrency(statsSoma.total) : formatNumber(statsSoma.total)}</span></span>
              <button onClick={() => setColumnSumKey(null)} className="hover:text-red-400"><X size={16}/></button>
            </div>
          </div>
        )}
      </div>

      {/* MODAIS (Colunas e Recebimento) */}
      {isColumnModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Eye className="text-blue-600"/> Exibir Colunas</h3>
            <div className="space-y-2 mb-6">
              {COLUNAS_DEF.filter(c => c.key !== 'acoes').map(col => (
                <label key={col.key} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded">
                  <input type="checkbox" checked={visibleColumns[col.key] !== false} onChange={(e) => setVisibleColumns({...visibleColumns, [col.key]: e.target.checked})} className="w-4 h-4 cursor-pointer" />
                  <span>{col.label}</span>
                </label>
              ))}
            </div>
            <button onClick={() => setIsColumnModalOpen(false)} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold">Concluir</button>
          </div>
        </div>
      )}

      {receiveModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
               <h3 className="font-bold text-xl flex items-center gap-2"><PackageCheck className="text-blue-600"/> Lançar Recebimento</h3>
               <button onClick={() => setReceiveModal({ ...receiveModal, isOpen: false })} className="bg-gray-100 text-gray-500 p-2 rounded-full hover:bg-red-50 hover:text-red-500"><X size={20}/></button>
            </div>
            
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-6">
              <p className="text-sm font-bold text-blue-500 uppercase tracking-widest">{receiveModal.empresa}</p>
              <h4 className="text-xl font-black text-blue-900">{receiveModal.produto}</h4>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-blue-200">
                <p className="text-sm font-bold text-blue-700">Total: {formatQtd(receiveModal.volumeTotal)} {receiveModal.un}</p>
                <p className="text-sm font-black text-orange-600">Pendente: {formatQtd(receiveModal.volumeTotal - receiveModal.qtdRecebida)} {receiveModal.un}</p>
              </div>
            </div>

            <form onSubmit={confirmarRecebimento} className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nota Fiscal *</label>
                  <input type="text" value={receiveModal.nf} onChange={e => setReceiveModal({...receiveModal, nf: e.target.value})} className="w-full border border-gray-300 focus:border-blue-500 p-3 rounded-xl font-bold outline-none" placeholder="Ex: 001548" required />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Emissão NF</label>
                  <input type="date" value={receiveModal.dataNf} onChange={e => setReceiveModal({...receiveModal, dataNf: e.target.value})} className="w-full border border-gray-300 focus:border-blue-500 p-3 rounded-xl font-bold outline-none" required />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-[2]">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Recebimento</label>
                  <input type="date" value={receiveModal.data} onChange={e => setReceiveModal({...receiveModal, data: e.target.value})} className="w-full border border-gray-300 focus:border-blue-500 p-3 rounded-xl font-bold outline-none" required />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-[2]">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Qtd Entrando ({receiveModal.un}) *</label>
                  <input type="number" step="0.01" value={receiveModal.qtd} onChange={e => setReceiveModal({...receiveModal, qtd: e.target.value})} className="w-full border-2 border-gray-300 focus:border-blue-500 p-3 rounded-xl font-black text-right text-blue-600 outline-none text-lg" placeholder="0.00" required autoFocus/>
                </div>
                <div className="flex-[2]">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor Nota (R$)</label>
                  <input type="number" step="0.01" value={receiveModal.valorNota} onChange={e => setReceiveModal({...receiveModal, valorNota: e.target.value})} className="w-full border border-gray-300 focus:border-blue-500 p-3 rounded-xl font-bold text-right outline-none text-lg" placeholder="0.00" />
                </div>
              </div>
              <button type="submit" className="w-full mt-4 bg-blue-600 text-white font-black text-lg py-4 rounded-xl shadow-md hover:bg-blue-700 transition-all">Confirmar Entrada</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}