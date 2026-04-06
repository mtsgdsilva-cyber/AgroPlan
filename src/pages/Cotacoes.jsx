// src/pages/Cotacoes.jsx
import React, { useState } from 'react';
import { useProcurement } from '../contexts/ProcurementContext';
import { generateId, formatCurrency } from '../utils/helpers';
import { Calculator, Plus, ArrowLeft, CheckCircle2, Circle, AlertCircle, Building2, Package, Tag, FileText, X, Pencil, Minimize2, Maximize2, ChevronDown, ChevronRight, Trash, Download, CheckSquare, Square, Link, Clock, ListOrdered } from 'lucide-react';
import Header from '../components/Header';
import { useModal } from '../contexts/ModalContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { auth } from '../services/firebase';

export default function Cotacoes() {
  const { cotacoes, setCotacoes, setPedidos, defaultCompany } = useProcurement();
  const { showAlert, showConfirm } = useModal();

  const [currentView, setCurrentView] = useState('list'); 
  const [selectedCotacaoId, setSelectedCotacaoId] = useState(null);
  const [viewMode, setViewMode] = useState('produto'); 

  const [expandedItems, setExpandedItems] = useState({}); 
  const [sortByCategory, setSortByCategory] = useState(false); // NOVO ESTADO: ORDENAR POR CATEGORIA

  const [tituloCotacao, setTituloCotacao] = useState('');
  const [dataCotacao, setDataCotacao] = useState(new Date().toISOString().split('T')[0]);

  // ESTADOS DO MODAL DE ITEM
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [itemCategoria, setItemCategoria] = useState(''); 
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

  // ESTADOS DE EDIÇÃO DO TÍTULO DA COTAÇÃO
  const [editingCotacaoId, setEditingCotacaoId] = useState(null);
  const [editCotacaoTitulo, setEditCotacaoTitulo] = useState('');

  // ESTADOS DE GERAR PEDIDO
  const [isGerarModalOpen, setIsGerarModalOpen] = useState(false);
  const [tipoNumero, setTipoNumero] = useState('auto'); 
  const [agrupamentoNumero, setAgrupamentoNumero] = useState('unico'); 
  const [numeroManualBase, setNumeroManualBase] = useState('');

  // ESTADOS DO PDF UNIFICADO
  const [isGlobalPdfModalOpen, setIsGlobalPdfModalOpen] = useState(false);
  const [selectedCotacoesForPdf, setSelectedCotacoesForPdf] = useState([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleCriarCotacao = (e) => {
    e.preventDefault();
    if (!tituloCotacao.trim()) return showAlert("Atenção", "Informe um título para a cotação.", "warning");
    const novaCotacao = { id: generateId(), titulo: tituloCotacao, data: dataCotacao, status: 'Aberta', itens: [] };
    setCotacoes([...(cotacoes || []), novaCotacao]);
    setTituloCotacao(''); setSelectedCotacaoId(novaCotacao.id); setCurrentView('detail');
  };

  const startEditCotacao = (cotacao, e) => {
    e.stopPropagation(); 
    setEditingCotacaoId(cotacao.id);
    setEditCotacaoTitulo(cotacao.titulo);
  };

  const confirmEditCotacao = (id, e) => {
    e.stopPropagation();
    if (!editCotacaoTitulo.trim()) return showAlert("Atenção", "O título não pode ser vazio.", "warning");
    setCotacoes(prev => prev.map(c => c.id === id ? { ...c, titulo: editCotacaoTitulo } : c));
    setEditingCotacaoId(null);
    setEditCotacaoTitulo('');
  };

  const cancelEditCotacao = (e) => {
    e.stopPropagation();
    setEditingCotacaoId(null);
    setEditCotacaoTitulo('');
  };

  const handleDeleteCotacao = (id, titulo, e) => {
    if (e) e.stopPropagation();
    showConfirm("Excluir Cotação", `Tem certeza que deseja excluir a cotação "${titulo}" permanentemente?`, () => {
      setCotacoes(prev => prev.filter(c => c.id !== id));
      if (selectedCotacaoId === id) setCurrentView('list');
    }, "danger");
  };

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

  const handleToggleCotacaoForPdf = (id) => {
    setSelectedCotacoesForPdf(prev => prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]);
  };

  const handleExportarPDFGlobal = async () => {
    if (selectedCotacoesForPdf.length === 0) return showAlert("Atenção", "Selecione pelo menos uma cotação.", "warning");
    setIsGeneratingPdf(true); 
    setTimeout(async () => {
      const elemento = document.getElementById('relatorio-global-cotacao');
      if (!elemento) { setIsGeneratingPdf(false); return; }
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
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Cotacao_Compras_Unificada.pdf`);
        showAlert("Sucesso!", "Relatório unificado exportado com sucesso.", "success");
        setIsGlobalPdfModalOpen(false);
        setSelectedCotacoesForPdf([]);
      } catch (error) {
        console.error(error);
        showAlert("Erro", "Houve um problema ao gerar o PDF.", "danger");
      } finally {
        elemento.style.display = 'none';
        elemento.style.position = 'static';
        setIsGeneratingPdf(false);
      }
    }, 300);
  };

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
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
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

  const itensAgrupadosPorCategoria = cotacaoAtiva ? cotacaoAtiva.itens.reduce((acc, item) => {
    const cat = item.categoria || 'Outros Insumos';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {}) : {};

  const cotacoesSelecionadasObj = cotacoes?.filter(c => selectedCotacoesForPdf.includes(c.id)) || [];
  const titulosSelecionados = cotacoesSelecionadasObj.map(c => c.titulo).join(', ');

  const itensAgrupadosGlobal = {};
  cotacoesSelecionadasObj.forEach(cotacao => {
    cotacao.itens.forEach(item => {
      const cat = item.categoria || 'Outros Insumos';
      if (!itensAgrupadosGlobal[cat]) itensAgrupadosGlobal[cat] = {};
      const normName = item.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
      const key = `${normName}_${item.unidade.toLowerCase()}`;

      if (!itensAgrupadosGlobal[cat][key]) {
        itensAgrupadosGlobal[cat][key] = {
          nomeExibicao: item.nome, 
          unidade: item.unidade,
          quantidadeTotal: 0,
          observacoes: new Set()
        };
      }
      itensAgrupadosGlobal[cat][key].quantidadeTotal += Number(item.quantidade);
      if (item.observacaoItem) {
        itensAgrupadosGlobal[cat][key].observacoes.add(item.observacaoItem);
      }
    });
  });

  return (
    <div className="flex flex-col h-full bg-gray-50 min-h-screen pb-32">
      {currentView === 'list' && <Header title="Cotações" />}
      
      <main className="px-4 lg:px-8 py-4 animate-fade-in">
        
        {currentView === 'list' && (
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <h2 className="text-xl font-black text-gray-800">Cotações em Andamento</h2>
              <div className="flex gap-2 w-full md:w-auto">
                {cotacoes?.length > 0 && (
                  <button onClick={() => setIsGlobalPdfModalOpen(true)} className="flex-1 md:flex-none text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2">
                    <Download size={16} /> Unificar PDF
                  </button>
                )}
                <button onClick={() => setCurrentView('create')} className="flex-1 md:flex-none text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2">
                  <Plus size={16} /> Nova Cotação
                </button>
              </div>
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
                    <div key={cot.id} onClick={() => { setSelectedCotacaoId(cot.id); setCurrentView('detail'); }} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 md:p-5 hover:shadow-md hover:border-emerald-200 cursor-pointer transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600 shrink-0"><FileText size={24} /></div>
                        <div>
                          {editingCotacaoId === cot.id ? (
                            <div className="flex items-center gap-2 mb-1" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={editCotacaoTitulo}
                                onChange={(e) => setEditCotacaoTitulo(e.target.value)}
                                className="border-2 border-emerald-400 bg-emerald-50 rounded-lg px-2 py-1 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500"
                                autoFocus
                              />
                              <button onClick={(e) => confirmEditCotacao(cot.id, e)} className="text-emerald-600 hover:bg-emerald-200 p-1 rounded-md transition-colors"><CheckCircle2 size={18} /></button>
                              <button onClick={cancelEditCotacao} className="text-gray-400 hover:bg-red-100 hover:text-red-500 p-1 rounded-md transition-colors"><X size={18} /></button>
                            </div>
                          ) : (
                            <h3 className="font-bold text-gray-800 text-lg mb-1">{cot.titulo}</h3>
                          )}
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
                        <div className="flex items-center gap-1 ml-2">
                          {editingCotacaoId !== cot.id && (
                            <button onClick={(e) => startEditCotacao(cot, e)} className="p-2.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-colors border border-transparent hover:border-blue-100" title="Editar Nome da Cotação">
                              <Pencil size={20} />
                            </button>
                          )}
                          <button onClick={(e) => handleDeleteCotacao(cot.id, cot.titulo, e)} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100" title="Excluir Cotação">
                            <Trash size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {currentView === 'create' && (
          <div className="max-w-xl mx-auto animate-fade-in">
            <div className="sticky top-0 z-[60] bg-white/95 backdrop-blur-md -mt-4 -mx-4 pt-6 px-4 py-4 lg:-mx-8 lg:-mt-4 lg:px-8 lg:pt-6 mb-6 border-b border-gray-100 shadow-sm rounded-b-3xl flex items-center transition-all">
               <button onClick={() => setCurrentView('list')} className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 font-bold"><ArrowLeft size={20} /> Voltar para Cotações</button>
            </div>
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
            <div className="sticky top-0 z-[60] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 bg-white/95 backdrop-blur-md p-4 pt-6 lg:py-5 lg:pt-6 rounded-b-3xl shadow-sm border-b border-gray-100 -mx-4 -mt-4 px-4 lg:-mx-8 lg:-mt-4 lg:px-8 transition-all">
              <div className="flex items-center gap-3">
                <button onClick={() => setCurrentView('list')} className="text-gray-400 hover:text-emerald-600 transition-colors p-2 bg-gray-50 hover:bg-emerald-50 rounded-xl shadow-sm border border-gray-100 shrink-0"><ArrowLeft size={20} /></button>
                <div className="flex flex-col">
                  <h2 className="text-lg md:text-xl font-black text-gray-800">{cotacaoAtiva.titulo}</h2>
                  <p className="text-[10px] md:text-xs font-semibold text-emerald-600 uppercase tracking-widest">{new Date(cotacaoAtiva.data).toLocaleDateString('pt-BR')} • {cotacaoAtiva.itens.length} itens</p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto hide-scrollbar">
                
                <button 
                  onClick={() => {
                    const link = `${window.location.origin}/fornecedor/${auth.currentUser.uid}/${cotacaoAtiva.id}`;
                    navigator.clipboard.writeText(link);
                    showAlert("Link Copiado!", "O link da cotação foi copiado. Cole no WhatsApp do fornecedor.", "success");
                  }} 
                  className="bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 p-2 md:px-4 md:py-2 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5 shrink-0" 
                  title="Copiar Link para Fornecedor"
                >
                  <Link size={16} /> <span className="hidden md:block font-bold text-xs">Link WhatsApp</span>
                </button>

                {cotacaoAtiva.itens.length > 0 && (
                  <button onClick={(e) => handleExportarPDFLista(cotacaoAtiva.titulo, e)} className="bg-white border border-blue-200 hover:bg-blue-50 text-blue-600 p-2 md:px-4 md:py-2 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5 shrink-0" title="Exportar para Compras">
                    <Download size={16} /> <span className="hidden md:block font-bold text-xs">PDF Cotação</span>
                  </button>
                )}
                
                <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
                  <button onClick={() => setViewMode('produto')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'produto' ? 'bg-white text-gray-800 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>Por Produto</button>
                  <button onClick={() => setViewMode('fornecedor')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'fornecedor' ? 'bg-white text-gray-800 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>Por Fornecedor</button>
                </div>

                {viewMode === 'produto' && (
                  <>
                    <button onClick={() => setSortByCategory(!sortByCategory)} className={`bg-white border hover:bg-gray-50 p-2 md:px-4 md:py-2 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 shrink-0 ${sortByCategory ? 'border-blue-400 text-blue-600' : 'border-gray-200 text-gray-600'}`} title="Ordenar por Categoria">
                      <ListOrdered size={16} />
                      <span className="hidden md:block font-bold text-xs">Por Categoria</span>
                    </button>
                    <button onClick={handleToggleExpandAll} className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 p-2 md:px-4 md:py-2 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 shrink-0" title="Expandir/Recolher Todos">
                      {cotacaoAtiva.itens.every(i => expandedItems[i.id] !== false) ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                      <span className="hidden md:block font-bold text-xs">{cotacaoAtiva.itens.every(i => expandedItems[i.id] !== false) ? 'Recolher' : 'Expandir'}</span>
                    </button>
                  </>
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
              <div className="space-y-3">
                {(() => {
                  let itensParaExibir = [...cotacaoAtiva.itens];
                  if (sortByCategory) {
                    itensParaExibir.sort((a, b) => (a.categoria || 'ZZZ').localeCompare(b.categoria || 'ZZZ'));
                  }
                  
                  return itensParaExibir.map(item => {
                    const ofertasOrdenadas = [...item.ofertas].sort((a, b) => a.precoUnitario - b.precoUnitario);
                    const isExpanded = expandedItems[item.id] !== false; 
                    
                    return (
                      <div key={item.id} className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden">
                        
                        {/* CABEÇALHO DO PRODUTO (AZUL BEBÊ - SLIM) */}
                        <div onClick={() => setExpandedItems(prev => ({...prev, [item.id]: !isExpanded}))} className="bg-sky-50 text-slate-800 py-3 px-4 flex items-center justify-between cursor-pointer hover:bg-sky-100 transition-colors border-b border-blue-100">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="text-blue-400 shrink-0">{isExpanded ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}</div>
                            <Tag size={16} className="text-blue-500 shrink-0 hidden md:block" />
                            <h3 className="text-base font-bold truncate text-slate-800" title={item.nome}>{item.nome}</h3>
                            
                            {/* QUANTIDADE MOVIDA PARA A ESQUERDA */}
                            <span className="font-semibold text-sm bg-white text-blue-800 px-2 py-0.5 rounded border border-blue-200 shadow-sm whitespace-nowrap">{formatQtd(item.quantidade)} {item.unidade}</span>
                            
                            <button onClick={(e) => abrirModalEdicaoItem(item, e)} className="text-blue-300 hover:text-blue-600 p-1 rounded-md transition-colors shrink-0" title="Editar Produto"><Pencil size={14} /></button>
                          </div>
                          
                          <div className="flex items-center gap-3 shrink-0 text-sm">
                            {/* CATEGORIA MOVIDA PARA A DIREITA */}
                            {item.categoria && <span className="hidden md:inline-block px-2 py-0.5 bg-white text-slate-600 rounded text-[10px] uppercase tracking-widest font-bold border border-slate-200">{item.categoria}</span>}
                            
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest hidden md:inline-block border ${item.status === 'Fechado' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>{item.status}</span>
                            <button onClick={(e) => abrirModalNovaOferta(item.id, e)} className="text-blue-700 bg-white hover:bg-blue-50 px-2.5 py-1 rounded-lg text-xs font-bold border border-blue-200 shadow-sm flex items-center gap-1"><Plus size={14}/> Manual</button>
                          </div>
                        </div>
                        
                        {/* ÁREA DA TABELA (OFERTAS) */}
                        {isExpanded && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                              <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                                  <th className="py-2.5 px-4 w-12 text-center">Sel.</th>
                                  <th className="py-2.5 px-4 font-semibold">Fornecedor</th>
                                  <th className="py-2.5 px-4 font-semibold">Data Env.</th>
                                  <th className="py-2.5 px-4 font-semibold text-center">Cond. Pgto</th>
                                  <th className="py-2.5 px-4 font-semibold">Produto Ofertado / Subst.</th>
                                  <th className="py-2.5 px-4 font-semibold text-right">R$ Unit.</th>
                                  <th className="py-2.5 px-4 font-semibold text-right">R$ Total</th>
                                  <th className="py-2.5 px-4 font-semibold text-center w-16">Ações</th>
                                </tr>
                              </thead>
                              <tbody>
                                {ofertasOrdenadas.length === 0 ? (
                                  <tr>
                                    <td colSpan="8" className="p-4 text-center text-gray-500 italic text-sm">Aguardando ofertas...</td>
                                  </tr>
                                ) : (
                                  ofertasOrdenadas.map((oferta, index) => {
                                    const isVencedora = item.ofertaVencedoraId === oferta.id;
                                    return (
                                      <tr 
                                        key={oferta.id} 
                                        onClick={() => handleToggleVencedor(item.id, oferta.id)}
                                        className={`border-b border-gray-100 cursor-pointer transition-colors ${isVencedora ? 'bg-emerald-50/60' : 'hover:bg-gray-50 bg-white'}`}
                                      >
                                        <td className="py-3 px-4 text-center">
                                          {isVencedora ? <CheckCircle2 size={18} className="text-emerald-600 mx-auto" /> : <Circle size={18} className="text-gray-300 mx-auto" />}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-800">
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold">{oferta.fornecedor}</span>
                                            {oferta.vendedor && <span className="text-gray-500 text-xs">({oferta.vendedor})</span>}
                                            {index === 0 && <span className="inline-block bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded border border-green-300 font-bold uppercase">Menor Preço</span>}
                                          </div>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600">
                                          {oferta.dataResposta ? new Date(oferta.dataResposta).toLocaleDateString('pt-BR') : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600 text-center">
                                          <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200 text-xs font-semibold">{oferta.condicaoPagamento || 'À vista'}</span>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600">
                                          {oferta.produtoAlternativo ? <span className="text-orange-600 font-medium">{oferta.produtoAlternativo}</span> : <span className="text-gray-400 italic">Exato</span>}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-800 text-right">
                                          {formatCurrency(oferta.precoUnitario)}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-800 text-right font-medium">
                                          {formatCurrency(item.quantidade * oferta.precoUnitario)}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                          <button onClick={(e) => abrirModalEdicaoOferta(item.id, oferta, e)} className="text-gray-400 hover:text-blue-600 p-1 transition-colors"><Pencil size={16}/></button>
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {viewMode === 'fornecedor' && (
              <div className="space-y-6">
                {getVisaoFornecedor().map(forn => (
                  <div key={forn.fornecedor} className="bg-white rounded-xl border border-gray-300 shadow-sm overflow-hidden">
                    
                    {/* CABEÇALHO DO FORNECEDOR */}
                    <div className="bg-slate-800 py-3 px-4 flex justify-between items-center text-white">
                      <h3 className="text-base font-bold flex items-center gap-2"><Building2 size={18} className="text-gray-400"/> {forn.fornecedor}</h3>
                      <div className="flex items-center gap-2 text-right">
                        <span className="text-[10px] font-bold text-gray-400 uppercase hidden md:block">Total Ofertado:</span>
                        <span className="text-lg font-black text-emerald-400">{formatCurrency(forn.totalPotencial)}</span>
                      </div>
                    </div>
                    
                    {/* TABELA DE PRODUTOS DO FORNECEDOR */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                            <th className="py-2.5 px-4 w-12 text-center">Sel.</th>
                            <th className="py-2.5 px-4 font-semibold">Produto Solicitado</th>
                            <th className="py-2.5 px-4 font-semibold text-center">Qtd</th>
                            <th className="py-2.5 px-4 font-semibold">Data / Vendedor</th>
                            <th className="py-2.5 px-4 font-semibold">Produto Ofertado / Subst.</th>
                            <th className="py-2.5 px-4 font-semibold text-center">Cond. Pgto</th>
                            <th className="py-2.5 px-4 font-semibold text-right">R$ Unit.</th>
                            <th className="py-2.5 px-4 font-semibold text-right">R$ Total</th>
                            <th className="py-2.5 px-4 font-semibold text-center w-16">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {forn.itens.map(({ item, oferta }) => {
                            const isVencedora = item.ofertaVencedoraId === oferta.id;
                            return (
                              <tr 
                                key={oferta.id} 
                                onClick={() => handleToggleVencedor(item.id, oferta.id)} 
                                className={`border-b border-gray-100 cursor-pointer transition-colors ${isVencedora ? 'bg-emerald-50/60' : 'hover:bg-gray-50 bg-white'}`}
                              >
                                <td className="py-3 px-4 text-center">
                                  {isVencedora ? <CheckCircle2 size={18} className="text-emerald-600 mx-auto" /> : <Circle size={18} className="text-gray-300 mx-auto" />}
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-800 font-semibold">
                                  {item.nome}
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-600 text-center bg-gray-50/50 border-x border-gray-100">
                                  {formatQtd(item.quantidade)} {item.unidade}
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-500">
                                  {oferta.dataResposta && <span className="mr-2">{new Date(oferta.dataResposta).toLocaleDateString('pt-BR')}</span>}
                                  {oferta.vendedor && <span>({oferta.vendedor})</span>}
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-600">
                                  {oferta.produtoAlternativo ? <span className="text-orange-600 font-medium">{oferta.produtoAlternativo}</span> : <span className="text-gray-400 italic">Exato</span>}
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-600 text-center">
                                  <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200 text-xs font-semibold">{oferta.condicaoPagamento || 'À vista'}</span>
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-800 text-right">
                                  {formatCurrency(oferta.precoUnitario)}
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-800 text-right font-medium">
                                  {formatCurrency(item.quantidade * oferta.precoUnitario)}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <button onClick={(e) => abrirModalEdicaoOferta(item.id, oferta, e)} className="text-gray-400 hover:text-blue-600 p-1 transition-colors"><Pencil size={16} /></button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div id="relatorio-lista-cotacao" style={{ 
              display: 'none', 
              backgroundColor: 'white', 
              padding: '40px', 
              width: '800px', 
              minHeight: '1120px',
              color: 'black', 
              fontFamily: 'sans-serif',
              flexDirection: 'column'
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
               
               <div style={{ flex: '1 0 auto' }}>
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
                             <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 'bold' }}>{formatQtd(i.quantidade)}</td>
                             <td style={{ padding: '10px 8px', textAlign: 'center' }}>{i.unidade}</td>
                             <td style={{ padding: '10px 8px', fontWeight: 'bold' }}>{i.nome}</td>
                             <td style={{ padding: '10px 8px', color: 'black' }}>{i.observacaoItem || '-'}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 ))}
               </div>

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

      {isGlobalPdfModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-gray-800 text-xl flex items-center gap-2"><FileText className="text-blue-600"/> Unificar Cotações</h3>
              <button onClick={() => { setIsGlobalPdfModalOpen(false); setSelectedCotacoesForPdf([]); }} className="bg-gray-100 text-gray-500 p-2 rounded-full hover:bg-red-50 hover:text-red-500"><X size={20}/></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Selecione as cotações que deseja somar e agrupar no relatório de compras:</p>
            <div className="space-y-2 max-h-60 overflow-y-auto mb-6 pr-2">
              {cotacoes.map(cot => (
                <div key={cot.id} onClick={() => handleToggleCotacaoForPdf(cot.id)} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedCotacoesForPdf.includes(cot.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  {selectedCotacoesForPdf.includes(cot.id) ? <CheckSquare className="text-blue-600" size={20}/> : <Square className="text-gray-300" size={20}/>}
                  <span className="font-bold text-gray-800">{cot.titulo}</span>
                </div>
              ))}
            </div>
            <button 
              onClick={handleExportarPDFGlobal} 
              disabled={isGeneratingPdf || selectedCotacoesForPdf.length === 0} 
              className={`w-full py-4 rounded-xl font-black text-white shadow-md transition-all flex justify-center items-center gap-2 ${selectedCotacoesForPdf.length > 0 && !isGeneratingPdf ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'}`}
            >
              {isGeneratingPdf ? 'Processando Relatório...' : `Gerar PDF Unificado (${selectedCotacoesForPdf.length})`}
            </button>
          </div>
        </div>
      )}

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

      {isOfferModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-gray-800 text-xl flex items-center gap-2"><Tag className="text-blue-600"/> {editingOfferId ? 'Editar Oferta' : 'Registrar Oferta Manual'}</h3>
              <button onClick={fecharModalOferta} className="bg-gray-100 text-gray-500 p-2 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"><X size={20}/></button>
            </div>
            <form onSubmit={handleSalvarOferta} className="space-y-4">
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Fornecedor</label><input type="text" value={ofertaFornecedor} onChange={e => setOfertaFornecedor(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" required /></div>
              <div className="flex gap-3">
                <div className="flex-1"><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Preço Unitário</label><input type="number" step="0.01" value={ofertaPreco} onChange={e => setOfertaPreco(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" required /></div>
                <div className="flex-1"><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Pagamento</label><input type="text" value={ofertaPagamento} onChange={e => setOfertaPagamento(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              </div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Entrega Prevista</label><input type="text" value={ofertaEntrega} onChange={e => setOfertaEntrega(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Observação / Similar</label><input type="text" value={ofertaObs} onChange={e => setOfertaObs(e.target.value)} className="w-full bg-orange-50 border border-orange-200 rounded-xl p-3.5 font-semibold text-orange-800 focus:ring-2 focus:ring-orange-500 outline-none" /></div>
              <button type="submit" className="w-full mt-6 bg-blue-600 text-white font-black py-4 rounded-xl hover:bg-blue-700 shadow-md transition-all">{editingOfferId ? 'Salvar Alterações' : 'Salvar Oferta'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}