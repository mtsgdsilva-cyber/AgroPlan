// src/pages/Recebimentos.jsx
import React, { useState } from 'react';
import { useProcurement } from '../contexts/ProcurementContext';
import { generateId, formatDate, formatCurrency } from '../utils/helpers';
import { PackageCheck, FileText, CheckCircle2, ArrowLeft, Truck, Receipt, CalendarDays, Box, CheckSquare, Tag, Building2 } from 'lucide-react';
import Header from '../components/Header';
import { useModal } from '../contexts/ModalContext';

export default function Recebimentos() {
  const { pedidos, setPedidos, recebimentos, setRecebimentos } = useProcurement();
  const { showAlert } = useModal();

  // ==========================================
  // ESTADOS GLOBAIS
  // ==========================================
  const [currentView, setCurrentView] = useState('list'); // 'list' ou 'receive'
  const [activeTab, setActiveTab] = useState('pendentes'); // 'pendentes' ou 'historico'
  const [viewMode, setViewMode] = useState('pedido'); // 'pedido' ou 'produto' (Apenas para aba pendentes)
  const [selectedPedidoId, setSelectedPedidoId] = useState(null);

  // Estados do Formulário de Recebimento (NF)
  const [nfNumber, setNfNumber] = useState('');
  const [dataNF, setDataNF] = useState(new Date().toISOString().split('T')[0]);
  
  // Estado para controlar os inputs de cada item do pedido atual
  const [itensRecebendo, setItensRecebendo] = useState({});

  // ==========================================
  // LÓGICA DE DADOS
  // ==========================================
  const pedidosPendentes = (pedidos || []).filter(p => p.status !== 'Entregue');
  const pedidoAtivo = (pedidos || []).find(p => p.id === selectedPedidoId);

  // Agrupamento por PRODUTO (Para a nova visualização)
  const getProdutosPendentes = () => {
    const mapaProdutos = {};
    
    pedidosPendentes.forEach(pedido => {
      pedido.itens.forEach(item => {
        const recebido = item.qtdRecebida || 0;
        const falta = item.quantidade - recebido;
        
        if (falta > 0) {
          if (!mapaProdutos[item.nome]) {
            mapaProdutos[item.nome] = {
              nome: item.nome,
              unidade: item.unidade,
              totalComprado: 0,
              totalRecebido: 0,
              entregasAguardadas: []
            };
          }
          
          mapaProdutos[item.nome].totalComprado += item.quantidade;
          mapaProdutos[item.nome].totalRecebido += recebido;
          
          mapaProdutos[item.nome].entregasAguardadas.push({
            pedido: pedido,
            fornecedor: pedido.fornecedor,
            numeroPedido: pedido.numero || pedido.id.slice(0, 6).toUpperCase(),
            quantidadeComprada: item.quantidade,
            faltaReceber: falta
          });
        }
      });
    });

    return Object.values(mapaProdutos).sort((a, b) => a.nome.localeCompare(b.nome));
  };

  const produtosPendentes = getProdutosPendentes();

  // Inicia o processo de lançamento de NF
  const abrirRecebimento = (pedido) => {
    setSelectedPedidoId(pedido.id);
    
    const initConfig = {};
    pedido.itens.forEach((item, index) => {
      const faltaReceber = Math.max(0, item.quantidade - (item.qtdRecebida || 0));
      initConfig[index] = { 
        qtd: faltaReceber > 0 ? faltaReceber : '', 
        custoReal: item.precoUnitario 
      };
    });
    
    setItensRecebendo(initConfig);
    setNfNumber('');
    setDataNF(new Date().toISOString().split('T')[0]);
    setCurrentView('receive');
  };

  const handleUpdateItemRecebido = (index, field, value) => {
    setItensRecebendo(prev => ({
      ...prev,
      [index]: { ...prev[index], [field]: value }
    }));
  };

  const handleLancarNF = () => {
    if (!nfNumber.trim()) return showAlert("Atenção", "Informe o número da Nota Fiscal.", "warning");

    const itensSendoRecebidos = Object.entries(itensRecebendo)
      .filter(([_, data]) => parseFloat(data.qtd) > 0)
      .map(([index, data]) => ({
        indexItemOriginal: parseInt(index),
        nomeItem: pedidoAtivo.itens[parseInt(index)].nome,
        qtdRecebidaNestaNF: parseFloat(data.qtd),
        custoReal: parseFloat(data.custoReal) || 0,
        unidade: pedidoAtivo.itens[parseInt(index)].unidade
      }));

    if (itensSendoRecebidos.length === 0) {
      return showAlert("Atenção", "Informe a quantidade recebida de pelo menos um item para lançar a nota.", "warning");
    }

    const novoRecebimento = {
      id: generateId(),
      pedidoId: pedidoAtivo.id,
      pedidoNumero: pedidoAtivo.numero || pedidoAtivo.id.slice(0, 6).toUpperCase(),
      fornecedor: pedidoAtivo.fornecedor,
      notaFiscal: nfNumber,
      dataRecebimento: dataNF,
      itensRecebidos: itensSendoRecebidos
    };

    setRecebimentos([...(recebimentos || []), novoRecebimento]);

    const pedidosAtualizados = pedidos.map(p => {
      if (p.id !== pedidoAtivo.id) return p;

      const itensAtualizados = p.itens.map((item, idx) => {
        const recebimentoDoItem = itensSendoRecebidos.find(i => i.indexItemOriginal === idx);
        const qtdAdicional = recebimentoDoItem ? recebimentoDoItem.qtdRecebidaNestaNF : 0;
        return { ...item, qtdRecebida: (item.qtdRecebida || 0) + qtdAdicional };
      });

      const allDone = itensAtualizados.every(i => i.qtdRecebida >= i.quantidade);
      const anyDone = itensAtualizados.some(i => i.qtdRecebida > 0);
      const novoStatus = allDone ? 'Entregue' : (anyDone ? 'Parcial' : 'Pendente');

      return { ...p, itens: itensAtualizados, status: novoStatus };
    });

    setPedidos(pedidosAtualizados);
    showAlert("Sucesso!", `Nota Fiscal ${nfNumber} lançada e pedido atualizado!`, "success");
    setCurrentView('list');
  };

  const getProgressColor = (percentual) => {
    if (percentual >= 100) return 'bg-emerald-500';
    if (percentual > 0) return 'bg-blue-500';
    return 'bg-gray-200';
  };

  const formatQtd = (val) => Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  return (
    <div className="flex flex-col h-full bg-gray-50 min-h-screen pt-12 lg:pt-0 pb-32">
      <Header title="Recebimentos" />
      
      <main className="px-4 lg:px-8 py-4 animate-fade-in">
        
        {/* VIEW 1: PAINEL PRINCIPAL */}
        {currentView === 'list' && (
          <div>
            
            {/* CABEÇALHO FIXO */}
            <div className="sticky top-0 z-40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 bg-gray-50/80 backdrop-blur-md p-4 rounded-b-2xl shadow-sm border-b border-gray-200/50 -mx-4 px-4 lg:-mx-8 lg:px-8">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-600 p-2.5 rounded-xl text-white shadow-sm shrink-0">
                  <PackageCheck size={24} />
                </div>
                <div className="flex flex-col">
                  <h2 className="text-lg md:text-xl font-black text-gray-800">
                    Entrada de Mercadorias
                  </h2>
                  <p className="text-[10px] md:text-xs font-semibold text-gray-400 uppercase tracking-widest">Lance NFs e atualize o estoque</p>
                </div>
              </div>
              
              <div className="flex bg-gray-200 p-1 rounded-xl w-full md:w-auto shrink-0">
                <button onClick={() => setActiveTab('pendentes')} className={`flex-1 md:px-6 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${activeTab === 'pendentes' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  Aguardando Entrega
                </button>
                <button onClick={() => setActiveTab('historico')} className={`flex-1 md:px-6 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${activeTab === 'historico' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  Histórico de NFs
                </button>
              </div>
            </div>

            {/* ABA: AGUARDANDO ENTREGA */}
            {activeTab === 'pendentes' && (
              <div className="animate-fade-in">
                
                {/* TOGGLE: VISTA POR PEDIDO OU POR PRODUTO */}
                <div className="flex mb-4 gap-2 bg-gray-200 p-1 rounded-xl w-full md:w-max">
                  <button onClick={() => setViewMode('pedido')} className={`flex-1 md:px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'pedido' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Por Pedido/Cotação</button>
                  <button onClick={() => setViewMode('produto')} className={`flex-1 md:px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'produto' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Por Produto (Insumo)</button>
                </div>

                {/* VISTA: POR PEDIDO */}
                {viewMode === 'pedido' && (
                  <div className="space-y-4">
                    {pedidosPendentes.length === 0 ? (
                      <div className="bg-white rounded-2xl p-8 text-center border border-gray-200 shadow-sm">
                        <CheckCircle2 size={48} className="mx-auto text-emerald-400 mb-4" />
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Tudo em dia!</h3>
                        <p className="text-gray-500 text-sm">Não há pedidos pendentes de entrega no momento.</p>
                      </div>
                    ) : (
                      pedidosPendentes.map((pedido) => {
                        const numeroPedido = pedido.numero || pedido.id.slice(0, 6).toUpperCase();
                        const totalItens = pedido.itens.reduce((acc, i) => acc + i.quantidade, 0);
                        const recebidosItens = pedido.itens.reduce((acc, i) => acc + (i.qtdRecebida || 0), 0);
                        const progressoTotal = totalItens > 0 ? (recebidosItens / totalItens) * 100 : 0;

                        return (
                          <div key={pedido.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:border-emerald-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5">
                            <div className="flex flex-col flex-1">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest border border-gray-200 px-2 py-0.5 rounded-md">PEDIDO #{numeroPedido}</span>
                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${pedido.status === 'Parcial' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>{pedido.status || 'Pendente'}</span>
                              </div>
                              <h3 className="font-black text-gray-800 text-lg md:text-xl truncate mb-1">{pedido.fornecedor}</h3>
                              <p className="text-xs font-semibold text-gray-400 mb-3">Ref: {pedido.tituloCotacao}</p>
                              
                              <div className="w-full max-w-md">
                                <div className="flex justify-between text-xs font-bold text-gray-500 mb-1.5">
                                  <span>Progresso Físico</span>
                                  <span>{Math.round(progressoTotal)}% Recebido</span>
                                </div>
                                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className={`h-full transition-all duration-500 ${getProgressColor(progressoTotal)}`} style={{ width: `${Math.min(100, progressoTotal)}%` }}></div>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-end border-t md:border-none border-gray-100 pt-4 md:pt-0 shrink-0">
                              <button onClick={() => abrirRecebimento(pedido)} className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2">
                                <Receipt size={18} /> Lançar NF
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* VISTA: POR PRODUTO */}
                {viewMode === 'produto' && (
                  <div className="space-y-4">
                    {produtosPendentes.length === 0 ? (
                       <div className="bg-white rounded-2xl p-8 text-center border border-gray-200 shadow-sm">
                         <Box size={48} className="mx-auto text-emerald-400 mb-4" />
                         <h3 className="text-lg font-bold text-gray-800 mb-2">Estoque abastecido!</h3>
                         <p className="text-gray-500 text-sm">Não há pendência física de nenhum produto.</p>
                       </div>
                    ) : (
                      produtosPendentes.map((prod) => {
                        const progresso = (prod.totalRecebido / prod.totalComprado) * 100;

                        return (
                          <div key={prod.nome} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:border-emerald-300 transition-all">
                            
                            {/* Cabeçalho do Produto */}
                            <div className="bg-gray-50/80 p-5 border-b border-gray-200">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                  <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                                    <Tag size={18} className="text-emerald-600" /> {prod.nome}
                                  </h3>
                                  <p className="text-sm font-bold text-gray-500 mt-1">
                                    Total Comprado (Todas Cotações): <span className="text-gray-800">{formatQtd(prod.totalComprado)} {prod.unidade}</span>
                                  </p>
                                </div>
                                <div className="w-full md:w-48 shrink-0">
                                  <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                                    <span>Geral Recebido</span>
                                    <span>{formatQtd(prod.totalRecebido)} / {formatQtd(prod.totalComprado)}</span>
                                  </div>
                                  <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div className={`h-full transition-all duration-500 ${getProgressColor(progresso)}`} style={{ width: `${Math.min(100, progresso)}%` }}></div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Lista de Fornecedores/Pedidos Devendo este Produto */}
                            <div className="p-4">
                              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Entregas Pendentes deste Item:</h4>
                              <div className="space-y-2">
                                {prod.entregasAguardadas.map((entrega, idx) => (
                                  <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-gray-200 p-3 rounded-xl shadow-sm">
                                    <div className="flex items-center gap-3">
                                      <div className="bg-gray-100 p-2 rounded-lg text-gray-500 hidden md:block">
                                        <Building2 size={18} />
                                      </div>
                                      <div>
                                        <h4 className="font-bold text-gray-800 text-sm">{entrega.fornecedor}</h4>
                                        <p className="text-xs font-semibold text-gray-500 mt-0.5">Pedido #{entrega.numeroPedido}</p>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between md:justify-end gap-4 border-t border-gray-50 md:border-none pt-2 md:pt-0">
                                      <div className="flex flex-col md:items-end">
                                        <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Aguardando</span>
                                        <span className="font-black text-gray-800">{formatQtd(entrega.faltaReceber)} {prod.unidade}</span>
                                      </div>
                                      {/* Clicar aqui abre a tela de recebimento JÁ NO PEDIDO CORRETO */}
                                      <button 
                                        onClick={() => abrirRecebimento(entrega.pedido)}
                                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-2 rounded-lg text-xs font-bold border border-emerald-200 transition-colors flex items-center gap-1.5"
                                      >
                                        <Receipt size={14} /> Lançar NF
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ABA: HISTÓRICO DE NOTAS FISCAIS LANÇADAS */}
            {activeTab === 'historico' && (
              <div className="space-y-4 animate-fade-in">
                {(!recebimentos || recebimentos.length === 0) ? (
                  <div className="bg-white rounded-2xl p-8 text-center border border-gray-200 shadow-sm mt-6">
                    <Receipt size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Nenhuma NF registrada.</h3>
                    <p className="text-gray-500 text-sm">As notas lançadas aparecerão aqui no histórico.</p>
                  </div>
                ) : (
                  [...recebimentos].reverse().map((rec) => (
                    <div key={rec.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="bg-gray-50/80 p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-white p-2 border border-gray-200 rounded-lg text-emerald-600"><Receipt size={20} /></div>
                          <div>
                            <h3 className="font-bold text-gray-800 text-sm md:text-base">NF: {rec.notaFiscal}</h3>
                            <p className="text-xs font-semibold text-gray-500 mt-0.5">{rec.fornecedor} (Ref: Pedido #{rec.pedidoNumero})</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                          <CalendarDays size={14} /> {formatDate(rec.dataRecebimento)}
                        </div>
                      </div>
                      <div className="p-4 bg-white">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Itens desta Nota:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {rec.itensRecebidos.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm p-2 rounded-lg bg-gray-50 border border-gray-100">
                              <span className="font-semibold text-gray-700 truncate mr-2">{item.nomeItem}</span>
                              <span className="font-black text-emerald-600 whitespace-nowrap bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                + {formatQtd(item.qtdRecebidaNestaNF)} {item.unidade}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: FORMULÁRIO DE LANÇAMENTO DA NF (MANTIDO) */}
        {currentView === 'receive' && pedidoAtivo && (
          <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="sticky top-0 z-40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 bg-gray-50/80 backdrop-blur-md p-4 rounded-b-2xl shadow-sm border-b border-gray-200/50 -mx-4 px-4 lg:-mx-8 lg:px-8">
              <div className="flex items-center gap-3">
                <button onClick={() => setCurrentView('list')} className="text-gray-400 hover:text-emerald-600 transition-colors p-2 bg-white rounded-xl shadow-sm border border-gray-100 shrink-0"><ArrowLeft size={20} /></button>
                <div className="flex flex-col">
                  <h2 className="text-lg md:text-xl font-black text-gray-800 flex items-center gap-2">
                    Lançar NF - Pedido #{pedidoAtivo.numero || pedidoAtivo.id.slice(0, 6).toUpperCase()}
                  </h2>
                  <p className="text-[10px] md:text-xs font-semibold text-gray-400 uppercase tracking-widest">{pedidoAtivo.fornecedor}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:p-6 mb-6">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-4 flex items-center gap-2"><FileText size={16} className="text-emerald-600" /> 1. Dados da Nota Fiscal</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Número da NF-e</label><input type="text" value={nfNumber} onChange={(e) => setNfNumber(e.target.value)} placeholder="Ex: 0015849" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none" /></div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Data de Entrada</label><input type="date" value={dataNF} onChange={(e) => setDataNF(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none" /></div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:p-6 mb-8">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-4 flex items-center gap-2"><Box size={16} className="text-emerald-600" /> 2. Conferência de Itens</h3>
              <p className="text-xs text-gray-500 font-medium mb-6">Informe apenas a quantidade que está fisicamente escrita nesta Nota Fiscal.</p>
              
              <div className="space-y-4">
                {pedidoAtivo.itens.map((item, index) => {
                  const recebidoAntes = item.qtdRecebida || 0;
                  const percentualAntes = (recebidoAntes / item.quantidade) * 100;
                  const estadoAtual = itensRecebendo[index] || { qtd: '', custoReal: '' };
                  const inputVal = parseFloat(estadoAtual.qtd) || 0;
                  const isSobra = (recebidoAntes + inputVal) > item.quantidade;

                  return (
                    <div key={index} className={`p-4 rounded-xl border transition-all ${inputVal > 0 ? 'bg-emerald-50/30 border-emerald-200 shadow-sm' : 'bg-gray-50/50 border-gray-200'}`}>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-800 text-base">{item.nome}</h4>
                          <span className="text-xs font-semibold text-gray-500">Comprado: {formatQtd(item.quantidade)} {item.unidade}</span>
                        </div>
                        <div className="w-full md:w-48 shrink-0">
                          <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                            <span>Status</span><span>{formatQtd(recebidoAntes)} / {formatQtd(item.quantidade)}</span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden flex">
                            <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, percentualAntes)}%` }}></div>
                            {inputVal > 0 && <div className="h-full bg-emerald-300 animate-pulse" style={{ width: `${Math.min(100 - percentualAntes, (inputVal / item.quantidade) * 100)}%` }}></div>}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row gap-3 items-start md:items-end bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                        <div className="w-full md:w-1/3">
                          <label className="block text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1"><Truck size={12}/> Qtd Entrando</label>
                          <div className="flex items-center relative">
                            <input type="number" step="0.01" value={estadoAtual.qtd} onChange={(e) => handleUpdateItemRecebido(index, 'qtd', e.target.value)} placeholder="0" className={`w-full bg-gray-50 border rounded-xl p-2.5 font-black text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none text-right pr-12 transition-colors ${isSobra ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-200'}`} />
                            <span className="absolute right-4 text-xs font-bold text-gray-400">{item.unidade}</span>
                          </div>
                          {isSobra && <span className="text-[10px] font-bold text-red-500 mt-1 block px-1">Alerta: Excedendo o pedido.</span>}
                        </div>
                        <div className="w-full md:w-1/3">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Custo Real Un. (NFe)</label>
                          <div className="flex items-center relative">
                            <span className="absolute left-3 text-xs font-bold text-gray-400">R$</span>
                            <input type="number" step="0.01" value={estadoAtual.custoReal} onChange={(e) => handleUpdateItemRecebido(index, 'custoReal', e.target.value)} className="w-full pl-8 bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in w-11/12 md:w-auto">
              <button onClick={handleLancarNF} className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base py-4 px-10 rounded-full shadow-[0_10px_25px_-5px_rgba(5,150,105,0.5)] flex items-center justify-center gap-2 border border-emerald-400 transition-transform hover:scale-105">
                <CheckSquare size={20} /> Concluir e Gravar Nota Fiscal
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}