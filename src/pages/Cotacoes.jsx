// src/pages/Cotacoes.jsx
import React, { useState } from 'react';
import { useProcurement } from '../contexts/ProcurementContext';
import { generateId, formatCurrency } from '../utils/helpers';
import { Calculator, Plus, ArrowLeft, CheckCircle2, Circle, AlertCircle, Building2, Package, Tag, FileText, X, Pencil, Minimize2, Maximize2, ChevronDown, ChevronRight, Trash, Download } from 'lucide-react';
import Header from '../components/Header';
import { useModal } from '../contexts/ModalContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function Cotacoes() {
  const { cotacoes, setCotacoes, setPedidos, defaultCompany } = useProcurement();
  const { showAlert, showConfirm } = useModal();

  const [currentView, setCurrentView] = useState('list'); 
  const [selectedCotacaoId, setSelectedCotacaoId] = useState(null);
  const [viewMode, setViewMode] = useState('produto'); 

  const [expandedItems, setExpandedItems] = useState({}); 

  const [tituloCotacao, setTituloCotacao] = useState('');
  const [dataCotacao, setDataCotacao] = useState(new Date().toISOString().split('T')[0]);

  // ESTADOS DO MODAL DE ITEM
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [itemCategoria, setItemCategoria] = useState(''); // NOVO CAMPO DE CATEGORIA
  const [itemNome, setItemNome] = useState('');
  const [itemQtd, setItemQtd] = useState('');
  const [itemUnidade, setItemUnidade] = useState('UN');
  const [itemObs, setItemObs] = useState('');

  // ESTADOS DO MODAL DE OFERTA
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [selectedItemIdParaOferta, setSelectedItemIdParaOferta] = useState(null);
  const [editingOfferId, setEditingOfferId] = useState(null); 
  const [ofertaFornecedor, setOfertaFornecedor] = useState('');
  const [ofertaPreco, setOfertaPreco] = useState('');
  const [ofertaPagamento, setOfertaPagamento] = useState('');
  const [ofertaEntrega, setOfertaEntrega] = useState('');
  const [ofertaObs, setOfertaObs] = useState('');

  // ESTADOS DE GERAR PEDIDO
  const [isGerarModalOpen, setIsGerarModalOpen] = useState(false);
  const [tipoNumero, setTipoNumero] = useState('auto'); 
  const [agrupamentoNumero, setAgrupamentoNumero] = useState('unico'); 
  const [numeroManualBase, setNumeroManualBase] = useState('');

  const handleCriarCotacao = (e) => {
    e.preventDefault();
    if (!tituloCotacao.trim()) return showAlert("Atenção", "Informe um título para a cotação.", "warning");
    const novaCotacao = { id: generateId(), titulo: tituloCotacao, data: dataCotacao, status: 'Aberta', itens: [] };
    setCotacoes([...(cotacoes || []), novaCotacao]);
    setTituloCotacao(''); setSelectedCotacaoId(novaCotacao.id); setCurrentView('detail');
  };

  const handleDeleteCotacao = (id, titulo, e) => {
    if (e) e.stopPropagation();
    showConfirm("Excluir Cotação", `Tem certeza que deseja excluir a cotação "${titulo}" permanentemente?`, () => {
      setCotacoes(prev => prev.filter(c => c.id !== id));
      if (selectedCotacaoId === id) setCurrentView('list');
    }, "danger");
  };

  // ==========================================
  // FUNÇÕES DO NOVO MODAL DE ITENS (ADD / EDIT)
  // ==========================================
  const abrirModalNovoItem = () => {
    setEditingItemId(null);
    setItemCategoria(''); setItemNome(''); setItemQtd(''); setItemUnidade('UN'); setItemObs('');
    setIsItemModalOpen(true);
  };

  const abrirModalEdicaoItem = (item, e) => {
    if (e) e.stopPropagation();
    setEditingItemId(item.id);
    setItemCategoria(item.categoria || '');
    setItemNome(item.nome);
    setItemQtd(item.quantidade.toString());
    setItemUnidade(item.unidade);
    setItemObs(item.observacaoItem || '');
    setIsItemModalOpen(true);
  };

  const handleSalvarItem = (e) => {
    e.preventDefault();
    if (!itemCategoria || !itemNome.trim() || !itemQtd) return showAlert("Atenção", "Preencha a categoria, nome e quantidade.", "warning");
    
    setCotacoes(prev => prev.map(c => {
      if (c.id === selectedCotacaoId) {
        if (editingItemId) {
          return {
            ...c,
            itens: c.itens.map(i => i.id === editingItemId ? {
              ...i, categoria: itemCategoria, nome: itemNome, quantidade: parseFloat(itemQtd), unidade: itemUnidade, observacaoItem: itemObs
            } : i)
          };
        } else {
          const novoItem = { 
            id: generateId(), categoria: itemCategoria, nome: itemNome, quantidade: parseFloat(itemQtd), unidade: itemUnidade, observacaoItem: itemObs, 
            status: 'Em análise', ofertas: [], ofertaVencedoraId: null 
          };
          return { ...c, itens: [...c.itens, novoItem] };
        }
      }
      return c;
    }));
    
    setIsItemModalOpen(false);
  };

  // ==========================================
  // FUNÇÕES DE OFERTA
  // ==========================================
  const fecharModalOferta = () => {
    setOfertaFornecedor(''); setOfertaPreco(''); setOfertaPagamento(''); setOfertaEntrega(''); setOfertaObs('');
    setEditingOfferId(null); setIsOfferModalOpen(false);
  };

  const abrirModalNovaOferta = (itemId, e) => {
    e.stopPropagation(); setSelectedItemIdParaOferta(itemId); fecharModalOferta(); setIsOfferModalOpen(true);
  };

  const abrirModalEdicaoOferta = (itemId, oferta, e) => {
    e.stopPropagation(); setSelectedItemIdParaOferta(itemId); setEditingOfferId(oferta.id);
    setOfertaFornecedor(oferta.fornecedor); setOfertaPreco(oferta.precoUnitario.toString());
    setOfertaPagamento(oferta.condicaoPagamento || ''); setOfertaEntrega(oferta.previsaoEntrega || '');
    setOfertaObs(oferta.observacao || ''); setIsOfferModalOpen(true);
  };

  const handleSalvarOferta = (e) => {
    e.preventDefault();
    if (!ofertaFornecedor.trim() || !ofertaPreco) return;
    setCotacoes(prev => prev.map(c => {
      if (c.id === selectedCotacaoId) {
        return {
          ...c,
          itens: c.itens.map(item => {
            if (item.id === selectedItemIdParaOferta) {
              if (editingOfferId) {
                return { ...item, ofertas: item.ofertas.map(o => o.id === editingOfferId ? { ...o, fornecedor: ofertaFornecedor, precoUnitario: parseFloat(ofertaPreco), condicaoPagamento: ofertaPagamento, previsaoEntrega: ofertaEntrega, observacao: ofertaObs } : o) };
              } else {
                const novaOferta = { id: generateId(), fornecedor: ofertaFornecedor, precoUnitario: parseFloat(ofertaPreco), condicaoPagamento: ofertaPagamento, previsaoEntrega: ofertaEntrega, observacao: ofertaObs };
                return { ...item, ofertas: [...item.ofertas, novaOferta] };
              }
            }
            return item;
          })
        };
      }
      return c;
    }));
    fecharModalOferta();
  };

  const handleToggleVencedor = (itemId, ofertaId) => {
    setCotacoes(prev => prev.map(c => c.id === selectedCotacaoId ? { ...c, itens: c.itens.map(item => {
      if (item.id === itemId) {
        const isDesmarcando = item.ofertaVencedoraId === ofertaId;
        return { ...item, ofertaVencedoraId: isDesmarcando ? null : ofertaId, status: isDesmarcando ? 'Em análise' : 'Fechado' };
      }
      return item;
    })} : c));
  };

  // ==========================================
  // EXPORTAÇÃO DE COTAÇÃO EM PDF
  // ==========================================
  const handleExportarPDFLista = async (tituloCotacaoOriginal, e) => {
    if (e) e.preventDefault();
    const elemento = document.getElementById('relatorio-lista-cotacao');
    if (!elemento) return;

    elemento.style.display = 'flex';
    elemento.style.position = 'absolute';
    elemento.style.left = '-9999px';

    try {
      const canvas = await html2canvas(elemento, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4'); 
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      if (pdfHeight > 297) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      } else {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }
      
      pdf.save(`Lista_Cotacao_${tituloCotacaoOriginal.replace(/\s+/g, '_')}.pdf`);
      showAlert("Sucesso!", "Lista exportada com sucesso.", "success");
    } catch (error) {
      console.error(error);
      showAlert("Erro", "Houve um problema ao gerar o PDF.", "danger");
    } finally {
      elemento.style.display = 'none';
      elemento.style.position = 'static';
    }
  };

  // ==========================================
  // PEDIDOS E COMPRAS
  // ==========================================
  const confirmarGeracaoPedidos = () => {
    const cotacao = cotacoes.find(c => c.id === selectedCotacaoId);
    const itensFechados = cotacao.itens.filter(i => i.status === 'Fechado' && i.ofertaVencedoraId);
    if (itensFechados.length === 0) return;
    if (tipoNumero === 'manual' && !numeroManualBase.trim()) return showAlert("Atenção", "Digite o número base do pedido.", "warning");

    const fornecedoresSet = [...new Set(itensFechados.map(item => item.ofertas.find(o => o.id === item.ofertaVencedoraId).fornecedor))];
    const baseRandom = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const novosPedidosParaSalvar = [];
    const numerosGerados = [];

    fornecedoresSet.forEach((forn, index) => {
      let numAtribuido = '';
      if (tipoNumero === 'auto') {
        numAtribuido = agrupamentoNumero === 'unico' ? baseRandom : Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      } else {
        numAtribuido = agrupamentoNumero === 'unico' ? numeroManualBase : `${numeroManualBase}-${String.fromCharCode(65 + index)}`;
      }

      const itensDoFornecedor = itensFechados.filter(i => i.ofertas.find(of => of.id === i.ofertaVencedoraId).fornecedor === forn);
      const valorTotalFornecedor = itensDoFornecedor.reduce((acc, i) => acc + (i.quantidade * i.ofertas.find(of => of.id === i.ofertaVencedoraId).precoUnitario), 0);

      const detalhesItens = itensDoFornecedor.map(i => {
        const o = i.ofertas.find(of => of.id === i.ofertaVencedoraId);
        return { 
          nome: i.nome, quantidade: i.quantidade, unidade: i.unidade, 
          precoUnitario: o.precoUnitario, observacao: o.observacao, 
          condicaoPagamento: o.condicaoPagamento, previsaoEntrega: o.previsaoEntrega,
          total: i.quantidade * o.precoUnitario, qtdRecebida: 0 
        };
      });

      const condicaoUnica = itensDoFornecedor[0].ofertas.find(o => o.id === itensDoFornecedor[0].ofertaVencedoraId).condicaoPagamento;

      novosPedidosParaSalvar.push({
        id: generateId(), numero: numAtribuido, cotacaoOrigemId: cotacao.id, tituloCotacao: cotacao.titulo,
        fornecedor: forn, condicaoPagamento: condicaoUnica, dataCriacao: new Date().toISOString(),
        status: 'Pendente', itens: detalhesItens, valorTotal: valorTotalFornecedor
      });
      numerosGerados.push(numAtribuido);
    });

    setPedidos(prev => {
      const pedidosLimpados = (prev || []).filter(p => !numerosGerados.includes(p.numero));
      return [...pedidosLimpados, ...novosPedidosParaSalvar];
    });

    setCotacoes(prev => prev.map(c => c.id === selectedCotacaoId ? { ...c, status: 'Finalizada' } : c));
    setIsGerarModalOpen(false);
    showAlert("Sucesso!", `${novosPedidosParaSalvar.length} pedidos gerados com sucesso!`, "success");
    setCurrentView('list');
  };

  const cotacaoAtiva = cotacoes?.find(c => c.id === selectedCotacaoId);
  const hasItensFechados = cotacaoAtiva?.itens.some(i => i.status === 'Fechado');

  const handleToggleExpandAll = () => {
    if (!cotacaoAtiva) return;
    const isAllExpanded = cotacaoAtiva.itens.every(item => expandedItems[item.id] !== false);
    const newState = {};
    cotacaoAtiva.itens.forEach(item => newState[item.id] = !isAllExpanded);
    setExpandedItems(newState);
  };

  const getVisaoFornecedor = () => {
    if (!cotacaoAtiva) return [];
    const mapFornecedores = {};
    cotacaoAtiva.itens.forEach(item => {
      item.ofertas.forEach(oferta => {
        if (!mapFornecedores[oferta.fornecedor]) mapFornecedores[oferta.fornecedor] = { fornecedor: oferta.fornecedor, itens: [], totalPotencial: 0 };
        mapFornecedores[oferta.fornecedor].itens.push({ item, oferta });
        mapFornecedores[oferta.fornecedor].totalPotencial += (item.quantidade * oferta.precoUnitario);
      });
    });
    return Object.values(mapFornecedores).sort((a, b) => b.totalPotencial - a.totalPotencial);
  };

  const formatQtd = (val) => Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  // Agrupamento para o PDF e Listagem
  const itensAgrupadosPorCategoria = cotacaoAtiva ? cotacaoAtiva.itens.reduce((acc, item) => {
    const cat = item.categoria || 'Outros Insumos';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {}) : {};

  return (
    <div className="flex flex-col h-full bg-gray-50 min-h-screen pt-12 lg:pt-0 pb-32">
      <Header title="Cotações" />
      <main className="px-4 lg:px-8 py-4 animate-fade-in">
        
        {currentView === 'list' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-gray-800">Cotações em Andamento</h2>
              <button onClick={() => setCurrentView('create')} className="text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2"><Plus size={16} /> Nova Cotação</button>
            </div>
            <div className="space-y-4">
              {(!cotacoes || cotacoes.length === 0) ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-gray-200 shadow-sm">
                  <Calculator size={48} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Nenhuma cotação aberta.</h3>
                </div>
              ) : (
                cotacoes.map(cot => {
                  const itensFechados = cot.itens.filter(i => i.status === 'Fechado').length;
                  return (
                    <div key={cot.id} onClick={() => { setSelectedCotacaoId(cot.id); setCurrentView('detail'); }} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-md hover:border-emerald-200 cursor-pointer transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600 shrink-0"><FileText size={24} /></div>
                        <div>
                          <h3 className="font-bold text-gray-800 text-lg mb-1">{cot.titulo}</h3>
                          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-widest">
                            <span>{new Date(cot.data).toLocaleDateString('pt-BR')}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                            <span>{cot.itens.length} Itens Cotados</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 border-gray-100 pt-3 md:pt-0">
                        <div className="flex flex-col items-start md:items-end">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Status de Fechamento</span>
                          <span className={`text-sm font-black ${itensFechados === cot.itens.length && cot.itens.length > 0 ? 'text-emerald-600' : 'text-orange-500'}`}>{itensFechados} / {cot.itens.length} Aprovados</span>
                        </div>
                        <button onClick={(e) => handleDeleteCotacao(cot.id, cot.titulo, e)} className="p-2.5 ml-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100" title="Excluir Cotação">
                          <Trash size={20} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {currentView === 'create' && (
          <div className="max-w-xl mx-auto">
            <button onClick={() => setCurrentView('list')} className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 font-bold mb-6 transition-colors"><ArrowLeft size={20} /> Voltar</button>
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2"><Calculator className="text-emerald-600" /> Iniciar Nova Cotação</h2>
              <form onSubmit={handleCriarCotacao} className="space-y-4">
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Título / Identificação</label><input type="text" value={tituloCotacao} onChange={e => setTituloCotacao(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none" required /></div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Data da Cotação</label><input type="date" value={dataCotacao} onChange={e => setDataCotacao(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none" required /></div>
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl transition-all shadow-md mt-4">Salvar e Adicionar Itens</button>
              </form>
            </div>
          </div>
        )}

        {currentView === 'detail' && cotacaoAtiva && (
          <div className="animate-fade-in">
            <div className="sticky top-0 z-40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 bg-gray-50/80 backdrop-blur-md p-4 rounded-b-2xl shadow-sm border-b border-gray-200/50 -mx-4 px-4 lg:-mx-8 lg:px-8">
              <div className="flex items-center gap-3">
                <button onClick={() => setCurrentView('list')} className="text-gray-400 hover:text-emerald-600 transition-colors p-2 bg-white rounded-xl shadow-sm border border-gray-100 shrink-0"><ArrowLeft size={20} /></button>
                <div className="flex flex-col">
                  <h2 className="text-lg md:text-xl font-black text-gray-800">{cotacaoAtiva.titulo}</h2>
                  <p className="text-[10px] md:text-xs font-semibold text-gray-400 uppercase tracking-widest">{new Date(cotacaoAtiva.data).toLocaleDateString('pt-BR')} • {cotacaoAtiva.itens.length} itens</p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto hide-scrollbar">
                
                {cotacaoAtiva.itens.length > 0 && (
                  <button onClick={(e) => handleExportarPDFLista(cotacaoAtiva.titulo, e)} className="bg-white border border-blue-200 hover:bg-blue-50 text-blue-600 p-2 md:px-4 md:py-2 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5 shrink-0" title="Exportar para Compras">
                    <Download size={16} /> <span className="hidden md:block font-bold text-xs">PDF Cotação</span>
                  </button>
                )}

                <button onClick={(e) => handleDeleteCotacao(cotacaoAtiva.id, cotacaoAtiva.titulo, e)} className="bg-white border border-gray-200 hover:bg-red-50 text-red-500 p-2 md:px-3 md:py-2 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5 shrink-0" title="Excluir Cotação">
                  <Trash size={16} /> <span className="hidden md:block font-bold text-xs">Excluir</span>
                </button>
                
                <div className="flex bg-gray-200 p-1 rounded-xl shrink-0">
                  <button onClick={() => setViewMode('produto')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'produto' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Por Produto</button>
                  <button onClick={() => setViewMode('fornecedor')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'fornecedor' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Por Fornecedor</button>
                </div>

                {viewMode === 'produto' && (
                  <button onClick={handleToggleExpandAll} className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 p-2 md:px-4 md:py-2 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 shrink-0" title="Expandir/Recolher Todos">
                    {cotacaoAtiva.itens.every(i => expandedItems[i.id] !== false) ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    <span className="hidden md:block font-bold text-xs">{cotacaoAtiva.itens.every(i => expandedItems[i.id] !== false) ? 'Recolher' : 'Expandir'}</span>
                  </button>
                )}
                
                {hasItensFechados && (
                  <button onClick={() => setIsGerarModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 md:px-4 md:py-2 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 shrink-0">
                    <FileText size={16} /> <span className="hidden md:block font-bold text-xs">Gerar Pedidos</span>
                  </button>
                )}

                <button onClick={abrirModalNovoItem} className="bg-gray-800 hover:bg-gray-900 text-white p-2 md:px-4 md:py-2 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 shrink-0">
                  <Plus size={16} /> <span className="hidden md:block font-bold text-xs">Novo Item</span>
                </button>
              </div>
            </div>

            {viewMode === 'produto' && (
              <div className="space-y-4">
                {cotacaoAtiva.itens.map(item => {
                  const ofertasOrdenadas = [...item.ofertas].sort((a, b) => a.precoUnitario - b.precoUnitario);
                  const isExpanded = expandedItems[item.id] !== false; 
                  
                  return (
                    <div key={item.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-2">
                      <div onClick={() => setExpandedItems(prev => ({...prev, [item.id]: !isExpanded}))} className="bg-gray-50/80 p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="text-gray-400 shrink-0">{isExpanded ? <ChevronDown size={20}/> : <ChevronRight size={20}/>}</div>
                          <div>
                            <div className="flex items-center gap-2">
                              <Tag size={16} className="text-emerald-600" />
                              <h3 className="text-lg font-black text-gray-800">{item.nome}</h3>
                              {item.categoria && <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-[10px] uppercase tracking-widest font-bold">{item.categoria}</span>}
                              <button onClick={(e) => abrirModalEdicaoItem(item, e)} className="text-gray-300 hover:text-blue-500 hover:bg-blue-50 p-1 rounded-md transition-colors" title="Editar Produto">
                                <Pencil size={14} />
                              </button>
                            </div>
                            <p className="text-sm font-bold text-gray-500 mt-1">
                              Qtd: <span className="text-gray-800">{formatQtd(item.quantidade)} {item.unidade}</span>
                            </p>
                            {item.observacaoItem && (
                              <p className="text-[10px] text-orange-600 font-semibold mt-1 uppercase tracking-wider">Obs: {item.observacaoItem}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest ${item.status === 'Fechado' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{item.status}</span>
                          <button onClick={(e) => abrirModalNovaOferta(item.id, e)} className="text-emerald-600 hover:bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 bg-white"><Plus size={16}/> Oferta</button>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="p-2 md:p-4 bg-white animate-fade-in">
                          {ofertasOrdenadas.length === 0 ? <p className="text-xs font-semibold text-gray-400 text-center py-4 italic">Aguardando ofertas...</p> : (
                            <div className="space-y-2">
                              {ofertasOrdenadas.map((oferta, index) => {
                                const isVencedora = item.ofertaVencedoraId === oferta.id;
                                return (
                                  <div key={oferta.id} onClick={() => handleToggleVencedor(item.id, oferta.id)} className={`flex flex-col md:flex-row md:items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isVencedora ? 'border-emerald-500 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-500' : 'border-gray-100 hover:border-gray-300'}`}>
                                    <div className="shrink-0 hidden md:flex">{isVencedora ? <CheckCircle2 size={24} className="text-emerald-600" /> : <Circle size={24} className="text-gray-300" />}</div>
                                    <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                      <div className="flex items-center gap-3">
                                        <div className="shrink-0 md:hidden">{isVencedora ? <CheckCircle2 size={20} className="text-emerald-600" /> : <Circle size={20} className="text-gray-300" />}</div>
                                        <div>
                                          <h4 className={`font-bold text-base ${isVencedora ? 'text-emerald-900' : 'text-gray-800'}`}>{oferta.fornecedor}</h4>
                                          <div className="flex flex-wrap gap-2 mt-1 text-[10px] font-bold text-gray-500 uppercase">
                                            <span className="bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">{oferta.condicaoPagamento || 'À vista'}</span>
                                            {index === 0 && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-md border border-green-200">Menor Preço</span>}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex flex-row items-center justify-between md:justify-end gap-4 pt-2 md:pt-0 mt-2 md:mt-0 border-t md:border-none border-gray-100 w-full md:w-auto">
                                        <div className="flex flex-col md:items-end text-left md:text-right">
                                          <span className="text-xs font-semibold text-gray-500">{formatCurrency(oferta.precoUnitario)} / un</span>
                                          <span className={`text-lg font-black ${isVencedora ? 'text-emerald-700' : 'text-gray-800'}`}>{formatCurrency(item.quantidade * oferta.precoUnitario)}</span>
                                        </div>
                                        <button onClick={(e) => abrirModalEdicaoOferta(item.id, oferta, e)} className="p-2.5 bg-gray-50 hover:bg-blue-100 text-gray-400 hover:text-blue-600 rounded-xl border border-gray-200 transition-colors" title="Editar Oferta"><Pencil size={16} /></button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {viewMode === 'fornecedor' && (
              <div className="space-y-6">
                {getVisaoFornecedor().map(forn => (
                  <div key={forn.fornecedor} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-gray-800 p-4 flex justify-between items-center gap-2">
                      <h3 className="text-lg font-black text-white flex items-center gap-2"><Building2 size={20} className="text-gray-400"/> {forn.fornecedor}</h3>
                      <div className="flex flex-col text-right"><span className="text-[10px] font-bold text-gray-400 uppercase">Total Ofertado</span><span className="text-xl font-black text-emerald-400">{formatCurrency(forn.totalPotencial)}</span></div>
                    </div>
                    <div className="p-2 md:p-4 bg-gray-50 space-y-2">
                      {forn.itens.map(({ item, oferta }) => {
                        const isVencedora = item.ofertaVencedoraId === oferta.id;
                        return (
                          <div key={oferta.id} onClick={() => handleToggleVencedor(item.id, oferta.id)} className={`flex items-center justify-between gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isVencedora ? 'border-emerald-500 bg-white shadow-sm ring-1 ring-emerald-500' : 'border-gray-200 bg-white hover:border-emerald-300'}`}>
                            <div className="flex items-center gap-3">
                              {isVencedora ? <CheckCircle2 size={20} className="text-emerald-600" /> : <Circle size={20} className="text-gray-300" />}
                              <div><span className={`font-bold text-sm ${isVencedora ? 'text-emerald-900' : 'text-gray-800'}`}>{item.nome}</span><span className="block text-xs text-gray-500">{formatQtd(item.quantidade)} {item.unidade}</span></div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right hidden md:block"><span className="block text-xs text-gray-500">{formatCurrency(oferta.precoUnitario)} un</span><span className="font-black text-gray-800">{formatCurrency(item.quantidade * oferta.precoUnitario)}</span></div>
                              <button onClick={(e) => abrirModalEdicaoOferta(item.id, oferta, e)} className="p-2.5 bg-gray-50 hover:bg-blue-100 text-gray-400 hover:text-blue-600 rounded-xl border border-gray-200 transition-colors" title="Editar Oferta"><Pencil size={16} /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

         {/* ESPELHO OCULTO DO PDF (PARA EXPORTAÇÃO) - COM CATEGORIAS E ASSINATURAS NO RODAPÉ */}
            <div id="relatorio-lista-cotacao" style={{ 
              display: 'none', 
              backgroundColor: 'white', 
              padding: '40px', 
              width: '800px', 
              minHeight: '1120px', // Altura mínima de uma A4 proporcional
              color: 'black', 
              fontFamily: 'sans-serif',
              flexDirection: 'column' // Transforma a folha num layout Flex em Coluna
            }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #1f2937', paddingBottom: '16px', marginBottom: '24px' }}>
                 <div>
                   <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#065f46', margin: '0 0 4px 0', textTransform: 'uppercase' }}>{defaultCompany || 'Larangeira Mendes S/A'}</h1>
                   <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#4b5563', margin: 0 }}>Lista de Insumos para Cotação</p>
                 </div>
                 <div style={{ textAlign: 'right' }}>
                   <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 4px 0' }}>Ref: {cotacaoAtiva.titulo}</p>
                   <p style={{ fontSize: '14px', color: '#4b5563', margin: 0 }}>Emissão: {new Date().toLocaleDateString('pt-BR')}</p>
                 </div>
               </div>
               
               {/* Rendereiza uma tabela para cada Categoria */}
               <div style={{ flex: '1 0 auto' }}> {/* Esta div diz para o conteúdo crescer e ocupar o espaço se tiver muitos itens */}
                 {Object.entries(itensAgrupadosPorCategoria).map(([cat, itensDaCategoria]) => (
                   <div key={cat} style={{ marginBottom: '24px' }}>
                     <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#374151', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px', marginBottom: '12px', textTransform: 'uppercase' }}>
                       Lista de {cat}
                     </h3>
                     <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                       <thead>
                         <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #d1d5db', color: '#374151' }}>
                           <th style={{ padding: '10px 8px', textAlign: 'center', width: '12%' }}>QTD</th>
                           <th style={{ padding: '10px 8px', textAlign: 'center', width: '8%' }}>UN</th>
                           <th style={{ padding: '10px 8px', textAlign: 'left', width: '40%' }}>DESCRIÇÃO</th>
                           <th style={{ padding: '10px 8px', textAlign: 'left', width: '40%' }}>OBSERVAÇÃO</th>
                         </tr>
                       </thead>
                       <tbody>
                         {itensDaCategoria.map((i, idx) => (
                           <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6', color: '#1f2937' }}>
                             <td style={{ padding: '10px 8px', textAlign: 'center' }}>{formatQtd(i.quantidade)}</td>
                             <td style={{ padding: '10px 8px', textAlign: 'center' }}>{i.unidade}</td>
                             <td style={{ padding: '10px 8px', fontWeight: 'bold' }}>{i.nome}</td>
                             <td style={{ padding: '10px 8px', color: '#d97706' }}>{i.observacaoItem || '-'}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 ))}
               </div>

               {/* BLOCO DE ASSINATURAS COLADO NO RODAPÉ */}
               <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '40px', paddingLeft: '20px', paddingRight: '20px' }}>
                 <div style={{ width: '40%', textAlign: 'center' }}>
                   <div style={{ borderTop: '1px solid #374151', marginBottom: '8px' }}></div>
                   <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#374151' }}>Elaborado por</p>
                   <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>Setor ADM Agrícola</p>
                 </div>
                 <div style={{ width: '40%', textAlign: 'center' }}>
                   <div style={{ borderTop: '1px solid #374151', marginBottom: '8px' }}></div>
                   <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#374151' }}>Aprovado por</p>
                   <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>Diretoria / Gerência</p>
                 </div>
               </div>
            </div>

          </div>
        )}
      </main>

      {/* MODAL: GERAR PEDIDOS */}
      {isGerarModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-gray-800 text-xl flex items-center gap-2"><FileText className="text-emerald-600"/> Gerar Pedidos</h3>
              <button onClick={() => setIsGerarModalOpen(false)} className="bg-gray-100 text-gray-500 p-2 rounded-full hover:bg-red-50 hover:text-red-500"><X size={20}/></button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Definição do Número</label>
                <div className="flex gap-2">
                  <button onClick={() => setTipoNumero('auto')} className={`flex-1 py-3 rounded-xl font-bold border transition-all ${tipoNumero === 'auto' ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}>Automático</button>
                  <button onClick={() => setTipoNumero('manual')} className={`flex-1 py-3 rounded-xl font-bold border transition-all ${tipoNumero === 'manual' ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}>Manual</button>
                </div>
              </div>
              {tipoNumero === 'manual' && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Número Base</label>
                  <input type="text" value={numeroManualBase} onChange={e => setNumeroManualBase(e.target.value)} placeholder="Ex: 5040" className="w-full bg-white border border-gray-300 rounded-xl p-3.5 font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Agrupamento</label>
                <div className="space-y-2">
                  <div onClick={() => setAgrupamentoNumero('unico')} className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${agrupamentoNumero === 'unico' ? 'bg-emerald-50 border-emerald-400' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${agrupamentoNumero === 'unico' ? 'border-emerald-600' : 'border-gray-300'}`}>{agrupamentoNumero === 'unico' && <div className="w-2 h-2 rounded-full bg-emerald-600"></div>}</div>
                    <span className={`font-semibold text-sm ${agrupamentoNumero === 'unico' ? 'text-emerald-800' : 'text-gray-600'}`}>Mesmo número para todos</span>
                  </div>
                  <div onClick={() => setAgrupamentoNumero('por_fornecedor')} className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${agrupamentoNumero === 'por_fornecedor' ? 'bg-emerald-50 border-emerald-400' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${agrupamentoNumero === 'por_fornecedor' ? 'border-emerald-600' : 'border-gray-300'}`}>{agrupamentoNumero === 'por_fornecedor' && <div className="w-2 h-2 rounded-full bg-emerald-600"></div>}</div>
                    <span className={`font-semibold text-sm ${agrupamentoNumero === 'por_fornecedor' ? 'text-emerald-800' : 'text-gray-600'}`}>Um número para cada fornecedor</span>
                  </div>
                </div>
              </div>
              <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 flex items-start gap-2">
                <AlertCircle size={16} className="text-orange-500 shrink-0 mt-0.5" />
                <p className="text-xs text-orange-700 font-medium leading-tight">Se o número informado já existir no sistema, ele será <strong>substituído</strong> pelos itens desta geração.</p>
              </div>
              <button onClick={confirmarGeracaoPedidos} className="w-full mt-2 bg-emerald-600 text-white font-black py-4 rounded-xl hover:bg-emerald-700 shadow-md transition-all">Confirmar Emissão</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVO / EDITAR ITEM COM CATEGORIA */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-3">
              <h3 className="font-black text-gray-800 text-xl flex items-center gap-2">
                <Package className="text-emerald-600"/> {editingItemId ? 'Editar Produto' : 'Novo Produto'}
              </h3>
              <button onClick={() => setIsItemModalOpen(false)} className="bg-gray-100 text-gray-500 p-2 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"><X size={20}/></button>
            </div>
            <form onSubmit={handleSalvarItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Categoria *</label>
                <select value={itemCategoria} onChange={e => setItemCategoria(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer" required>
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
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Nome do Item *</label>
                <input type="text" value={itemNome} onChange={e => setItemNome(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none" required />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Quantidade *</label>
                  <input type="number" step="0.01" value={itemQtd} onChange={e => setItemQtd(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none text-center" required />
                </div>
                <div className="w-28 shrink-0">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Unidade</label>
                  <select value={itemUnidade} onChange={e => setItemUnidade(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer">
                    <option value="Lt">Lt</option><option value="Kg">Kg</option><option value="Ton">Ton</option><option value="Dose">Dose</option><option value="Pct">Pct</option><option value="Bag">Bag</option><option value="Saca">Saca</option><option value="UN">UN</option><option value="CX">CX</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Observação (Opcional)</label>
                <input type="text" value={itemObs} onChange={e => setItemObs(e.target.value)} placeholder="Ex: Marca específica, exigência técnica..." className="w-full bg-orange-50 border border-orange-200 rounded-xl p-3.5 font-semibold text-orange-800 focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <button type="submit" className="w-full mt-6 bg-emerald-600 text-white font-black py-4 rounded-xl hover:bg-emerald-700 shadow-md transition-all">
                {editingItemId ? 'Salvar Alterações' : 'Adicionar Item'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR / EDITAR OFERTA */}
      {isOfferModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-gray-800 text-xl flex items-center gap-2"><Tag className="text-blue-600"/> {editingOfferId ? 'Editar Oferta' : 'Registrar Oferta'}</h3>
              <button onClick={fecharModalOferta} className="bg-gray-100 text-gray-500 p-2 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"><X size={20}/></button>
            </div>
            <form onSubmit={handleSalvarOferta} className="space-y-4">
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Fornecedor</label><input type="text" value={ofertaFornecedor} onChange={e => setOfertaFornecedor(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" required /></div>
              <div className="flex gap-3">
                <div className="flex-1"><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Preço Unitário</label><input type="number" step="0.01" value={ofertaPreco} onChange={e => setOfertaPreco(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" required /></div>
                <div className="flex-1"><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Pagamento</label><input type="text" value={ofertaPagamento} onChange={e => setOfertaPagamento(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              </div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Entrega Prevista</label><input type="text" value={ofertaEntrega} onChange={e => setOfertaEntrega(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Observação</label><input type="text" value={ofertaObs} onChange={e => setOfertaObs(e.target.value)} className="w-full bg-orange-50 border border-orange-200 rounded-xl p-3.5 font-semibold text-orange-800 focus:ring-2 focus:ring-orange-500 outline-none" /></div>
              <button type="submit" className="w-full mt-6 bg-blue-600 text-white font-black py-4 rounded-xl hover:bg-blue-700 shadow-md transition-all">{editingOfferId ? 'Salvar Alterações' : 'Salvar Oferta'}</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}