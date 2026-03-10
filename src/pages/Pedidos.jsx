// src/pages/Pedidos.jsx
import React, { useState } from 'react';
import { useProcurement } from '../contexts/ProcurementContext';
import { formatDate, formatCurrency } from '../utils/helpers';
import { FileText, Download, Clock, CheckCircle2, ChevronDown, ChevronUp, Building2, Tag, CalendarDays, Wallet, Package, Pencil, Check, X, Trash } from 'lucide-react';
import Header from '../components/Header';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useModal } from '../contexts/ModalContext';

export default function Pedidos() {
  const { pedidos, setPedidos, defaultCompany } = useProcurement();
  const { showAlert, showConfirm } = useModal();
  
  const [viewMode, setViewMode] = useState('fornecedor'); 
  const [expandedPedidoId, setExpandedPedidoId] = useState(null);

  const [editingPedidoId, setEditingPedidoId] = useState(null);
  const [tempNumero, setTempNumero] = useState('');

  const salvarNovoNumero = (pedidoId) => {
    if (!tempNumero.trim()) { setEditingPedidoId(null); return; }
    setPedidos(prev => {
      const prevLimpado = (prev || []).filter(p => p.id === pedidoId || p.numero !== tempNumero);
      return prevLimpado.map(p => p.id === pedidoId ? { ...p, numero: tempNumero } : p);
    });
    setEditingPedidoId(null);
    showAlert("Salvo", "Número do pedido atualizado (sobreposto se já existia).", "success");
  };

  // NOVA FUNÇÃO: Excluir um único pedido
  const handleDeletePedido = (id, numero, e) => {
    if (e) e.stopPropagation();
    showConfirm("Excluir Pedido", `Deseja excluir permanentemente o pedido #${numero}?`, () => {
      setPedidos(prev => prev.filter(p => p.id !== id));
    }, "danger");
  };

  // NOVA FUNÇÃO: Excluir todos os pedidos de uma cotação
  const handleDeleteGrupoCotacao = (cotacaoId, titulo, e) => {
    if (e) e.stopPropagation();
    showConfirm("Excluir Grupo Inteiro", `Atenção: Deseja excluir TODOS os pedidos gerados pela cotação "${titulo}"?`, () => {
      setPedidos(prev => prev.filter(p => p.cotacaoOrigemId !== cotacaoId));
    }, "danger");
  };

  const gerarPDFUnico = async (pedido, e) => {
    if(e) e.stopPropagation();
    const elemento = document.getElementById(`recibo-${pedido.id}`);
    if (!elemento) return;
    
    elemento.style.display = 'block';
    elemento.style.position = 'absolute';
    elemento.style.left = '-9999px';

    try {
      const canvas = await html2canvas(elemento, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Pedido_${pedido.numero}_${defaultCompany.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error(error);
    } finally {
      elemento.style.display = 'none';
      elemento.style.position = 'static';
    }
  };

  const gerarPDFCotacao = async (cotacaoId, titulo) => {
    const elemento = document.getElementById(`recibo-cotacao-${cotacaoId}`);
    if (!elemento) return;
    
    elemento.style.display = 'block';
    elemento.style.position = 'absolute';
    elemento.style.left = '-9999px';

    try {
      const canvas = await html2canvas(elemento, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Relatorio_Cotacao_${titulo.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error(error);
    } finally {
      elemento.style.display = 'none';
      elemento.style.position = 'static';
    }
  };

  const pedidosAgrupadosCotacao = (pedidos || []).reduce((acc, p) => {
    if (!acc[p.cotacaoOrigemId]) acc[p.cotacaoOrigemId] = { titulo: p.tituloCotacao, pedidos: [], valorTotal: 0 };
    acc[p.cotacaoOrigemId].pedidos.push(p);
    acc[p.cotacaoOrigemId].valorTotal += p.valorTotal;
    return acc;
  }, {});

  const formatQtd = (val) => Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="flex flex-col h-full bg-gray-50 min-h-screen pt-12 lg:pt-0 pb-32">
      <Header title="Ordens de Compra" />
      
      <main className="px-4 lg:px-8 py-4 animate-fade-in">
        
        <div className="sticky top-0 z-40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 bg-gray-50/80 backdrop-blur-md p-4 rounded-b-2xl shadow-sm border-b border-gray-200/50 -mx-4 px-4 lg:-mx-8 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2.5 rounded-xl text-white shadow-sm"><FileText size={24} /></div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-gray-800">Ordens Geradas</h2>
              <p className="text-[10px] md:text-xs font-semibold text-gray-400 uppercase tracking-widest">Acompanhe e exporte</p>
            </div>
          </div>
          
          <div className="flex bg-gray-200 p-1 rounded-xl w-full md:w-auto shrink-0">
            <button onClick={() => setViewMode('fornecedor')} className={`flex-1 md:px-6 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${viewMode === 'fornecedor' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Visualizar por Fornecedor</button>
            <button onClick={() => setViewMode('cotacao')} className={`flex-1 md:px-6 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${viewMode === 'cotacao' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Visualizar por Cotação</button>
          </div>
        </div>

        {/* VISTA FORNECEDOR */}
        {viewMode === 'fornecedor' && (
          <div className="space-y-4">
            {(!pedidos || pedidos.length === 0) ? (
              <p className="text-center text-gray-500 py-10 font-bold">Nenhum pedido gerado.</p>
            ) : (
              pedidos.map((pedido) => {
                const isExpanded = expandedPedidoId === pedido.id;
                return (
                  <div key={pedido.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:border-emerald-200">
                    <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      
                      <div className="flex flex-col flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {editingPedidoId === pedido.id ? (
                            <div className="flex items-center gap-1">
                              <input autoFocus value={tempNumero} onChange={e => setTempNumero(e.target.value)} className="border-2 border-emerald-400 rounded p-1 w-24 text-xs font-bold text-center outline-none" />
                              <button onClick={() => salvarNovoNumero(pedido.id)} className="bg-emerald-100 text-emerald-700 p-1.5 rounded hover:bg-emerald-200"><Check size={14}/></button>
                              <button onClick={() => setEditingPedidoId(null)} className="bg-red-100 text-red-700 p-1.5 rounded hover:bg-red-200"><X size={14}/></button>
                            </div>
                          ) : (
                            <span className="text-[10px] md:text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded flex items-center gap-1 group cursor-pointer" onClick={() => { setTempNumero(pedido.numero); setEditingPedidoId(pedido.id); }}>
                              PEDIDO #{pedido.numero} <Pencil size={10} className="opacity-0 group-hover:opacity-100 text-emerald-600 transition-opacity" />
                            </span>
                          )}
                          <span className={`text-[10px] md:text-xs font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${pedido.status === 'Entregue' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}>
                            {pedido.status}
                          </span>
                        </div>
                        <h3 className="font-black text-gray-800 text-lg md:text-xl truncate">{pedido.fornecedor}</h3>
                        <span className="text-xs font-semibold text-gray-400 mt-1"><Tag size={12} className="inline mr-1"/> Ref: {pedido.tituloCotacao}</span>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto">
                        <div className="flex flex-col md:items-end">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Valor Total</span>
                          <span className="text-lg font-black text-emerald-700">{formatCurrency(pedido.valorTotal)}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={(e) => gerarPDFUnico(pedido, e)} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 p-2.5 rounded-xl border border-emerald-200" title="Baixar PDF"><Download size={18} /></button>
                          {/* Botão Lixeira Individual */}
                          <button onClick={(e) => handleDeletePedido(pedido.id, pedido.numero, e)} className="bg-red-50 hover:bg-red-100 text-red-600 p-2.5 rounded-xl border border-red-200" title="Excluir Pedido"><Trash size={18} /></button>
                          <button onClick={() => setExpandedPedidoId(isExpanded ? null : pedido.id)} className="bg-gray-50 hover:bg-gray-100 text-gray-500 p-2.5 rounded-xl border border-gray-200">{isExpanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</button>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50/50 p-4">
                        <div className="space-y-2 mb-4">
                          {pedido.itens.map((item, idx) => (
                            <div key={idx} className="bg-white p-3 rounded-xl border border-gray-200 flex justify-between gap-2 shadow-sm text-sm">
                              <div className="flex gap-3">
                                <span className="bg-gray-100 text-gray-600 font-black px-2 py-1 rounded">{formatQtd(item.quantidade)} {item.unidade}</span>
                                <span className="font-bold text-gray-800">{item.nome}</span>
                              </div>
                              <span className="font-black text-gray-700">{formatCurrency(item.total)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* PDF OCULTO INDIVIDUAL (Paisagem) */}
                    <div id={`recibo-${pedido.id}`} style={{ display: 'none', backgroundColor: 'white', padding: '40px', width: '1200px', color: 'black' }}>
                       <div style={{ borderBottom: '3px solid #1f2937', paddingBottom: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                         <div>
                           <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#065f46', margin: 0 }}>{defaultCompany}</h1>
                           <p style={{ color: '#4b5563', margin: '4px 0 0 0', fontWeight: 'bold', fontSize: '16px' }}>ORDEM DE COMPRA OFICIAL</p>
                         </div>
                         <div style={{ textAlign: 'right' }}>
                           <p style={{ fontWeight: 'bold', fontSize: '22px', margin: 0 }}>PEDIDO Nº {pedido.numero}</p>
                           <p style={{ color: '#4b5563', margin: '4px 0 0 0', fontSize: '14px' }}>Emissão: {formatDate(pedido.dataCriacao)}</p>
                         </div>
                       </div>
                       
                       <div style={{ marginBottom: '32px', backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                         <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', margin: '0 0 4px 0' }}>FORNECEDOR</p>
                         <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>{pedido.fornecedor}</p>
                         <p style={{ margin: '8px 0 0 0', color: '#374151' }}><strong>Ref. Cotação:</strong> {pedido.tituloCotacao}</p>
                       </div>

                       <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '32px' }}>
                         <thead>
                           <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #d1d5db', fontSize: '13px', color: '#374151' }}>
                             <th style={{ padding: '12px 8px', textAlign: 'center' }}>QTD</th>
                             <th style={{ padding: '12px 8px', textAlign: 'center' }}>UN</th>
                             <th style={{ padding: '12px 8px', textAlign: 'left' }}>DESCRIÇÃO</th>
                             <th style={{ padding: '12px 8px', textAlign: 'left' }}>CONDIÇÃO PAG.</th>
                             <th style={{ padding: '12px 8px', textAlign: 'left' }}>ENTREGA PREV.</th>
                             <th style={{ padding: '12px 8px', textAlign: 'left' }}>OBSERVAÇÕES</th>
                             <th style={{ padding: '12px 8px', textAlign: 'right' }}>VL. UNIT</th>
                             <th style={{ padding: '12px 8px', textAlign: 'right' }}>TOTAL</th>
                           </tr>
                         </thead>
                         <tbody>
                           {pedido.itens.map((item, idx) => (
                             <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', fontSize: '14px', color: '#1f2937' }}>
                               <td style={{ padding: '12px 8px', textAlign: 'center' }}>{formatQtd(item.quantidade)}</td>
                               <td style={{ padding: '12px 8px', textAlign: 'center' }}>{item.unidade}</td>
                               <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{item.nome}</td>
                               <td style={{ padding: '12px 8px' }}>{item.condicaoPagamento || pedido.condicaoPagamento || '-'}</td>
                               <td style={{ padding: '12px 8px' }}>{item.previsaoEntrega || '-'}</td>
                               <td style={{ padding: '12px 8px', color: '#d97706' }}>{item.observacao || '-'}</td>
                               <td style={{ padding: '12px 8px', textAlign: 'right' }}>{formatCurrency(item.precoUnitario)}</td>
                               <td style={{ padding: '12px 8px', fontWeight: 'bold', textAlign: 'right' }}>{formatCurrency(item.total)}</td>
                             </tr>
                           ))}
                         </tbody>
                       </table>

                       <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '64px' }}>
                         <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', padding: '16px', borderRadius: '8px', minWidth: '350px' }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '24px', fontWeight: '900', color: '#065f46' }}>
                             <span>TOTAL DO PEDIDO:</span>
                             <span>{formatCurrency(pedido.valorTotal)}</span>
                           </div>
                         </div>
                       </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        )}

        {/* VISTA COTAÇÃO */}
        {viewMode === 'cotacao' && (
          <div className="space-y-6">
            {Object.entries(pedidosAgrupadosCotacao).map(([cotacaoId, dados]) => (
              <div key={cotacaoId} className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">
                <div className="bg-gray-800 p-5 flex flex-col md:flex-row justify-between gap-4 md:items-center">
                  <div>
                    <h3 className="text-xl font-black text-white flex items-center gap-2"><Tag size={20} className="text-emerald-400"/> {dados.titulo}</h3>
                    <p className="text-gray-400 font-medium text-sm mt-1">{dados.pedidos.length} Pedidos Agrupados nesta Cotação</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase">Soma Total da Cotação</span>
                      <span className="text-xl font-black text-emerald-400">{formatCurrency(dados.valorTotal)}</span>
                    </div>
                    {/* Botão de excluir TUDO deste grupo */}
                    <button onClick={(e) => handleDeleteGrupoCotacao(cotacaoId, dados.titulo, e)} className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-xl shadow-lg transition-transform hover:scale-105" title="Excluir Cotação e seus Pedidos">
                      <Trash size={20} />
                    </button>
                    <button onClick={() => gerarPDFCotacao(cotacaoId, dados.titulo)} className="bg-emerald-500 hover:bg-emerald-600 text-white p-3 rounded-xl shadow-lg transition-transform hover:scale-105" title="Baixar PDF Único">
                      <Download size={20} />
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-3 bg-gray-50">
                  {dados.pedidos.map(p => (
                    <div key={p.id} className="bg-white p-3 rounded-xl border border-gray-200 flex justify-between items-center shadow-sm">
                      <div>
                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">#{p.numero}</span>
                        <h4 className="font-bold text-gray-800 ml-2 inline">{p.fornecedor}</h4>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-emerald-700">{formatCurrency(p.valorTotal)}</span>
                        {/* Lixeira Individual dentro do Grupo */}
                        <button onClick={(e) => handleDeletePedido(p.id, p.numero, e)} className="text-gray-300 hover:text-red-500 p-1 rounded-md transition-colors"><Trash size={16}/></button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* TEMPLATE MEGA PDF DA COTAÇÃO (Paisagem) */}
                <div id={`recibo-cotacao-${cotacaoId}`} style={{ display: 'none', backgroundColor: 'white', padding: '40px', width: '1200px', color: 'black', fontFamily: 'sans-serif' }}>
                   <div style={{ borderBottom: '3px solid #1f2937', paddingBottom: '10px', marginBottom: '20px' }}>
                     <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#065f46', margin: 0 }}>{defaultCompany}</h1>
                     <p style={{ fontSize: '20px', fontWeight: 'bold', margin: '5px 0' }}>RELATÓRIO CONSOLIDADO DE COMPRAS</p>
                     <p style={{ fontSize: '16px', color: '#4b5563' }}><strong>Cotação Origem:</strong> {dados.titulo}</p>
                   </div>
                   
                   {dados.pedidos.map(pedido => (
                     <div key={pedido.id} style={{ marginBottom: '30px', border: '1px solid #d1d5db', borderRadius: '8px', padding: '16px' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '10px' }}>
                         <h2 style={{ margin: 0, fontSize: '18px', color: '#1f2937' }}>Fornecedor: <strong>{pedido.fornecedor}</strong></h2>
                         <h2 style={{ margin: 0, fontSize: '18px', color: '#1f2937' }}>Pedido: <strong>#{pedido.numero}</strong></h2>
                       </div>
                       
                       <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                         <thead>
                           <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #d1d5db', color: '#374151' }}>
                             <th style={{ padding: '8px', textAlign: 'center' }}>QTD</th>
                             <th style={{ padding: '8px', textAlign: 'center' }}>UN</th>
                             <th style={{ padding: '8px', textAlign: 'left' }}>DESCRIÇÃO</th>
                             <th style={{ padding: '8px', textAlign: 'left' }}>PAGAMENTO</th>
                             <th style={{ padding: '8px', textAlign: 'left' }}>ENTREGA</th>
                             <th style={{ padding: '8px', textAlign: 'left' }}>OBSERVAÇÕES</th>
                             <th style={{ padding: '8px', textAlign: 'right' }}>VL. UNIT</th>
                             <th style={{ padding: '8px', textAlign: 'right' }}>TOTAL</th>
                           </tr>
                         </thead>
                         <tbody>
                           {pedido.itens.map((i, idx) => (
                             <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6', color: '#1f2937' }}>
                               <td style={{ padding: '8px', textAlign: 'center' }}>{formatQtd(i.quantidade)}</td>
                               <td style={{ padding: '8px', textAlign: 'center' }}>{i.unidade}</td>
                               <td style={{ padding: '8px', fontWeight: 'bold' }}>{i.nome}</td>
                               <td style={{ padding: '8px' }}>{i.condicaoPagamento || pedido.condicaoPagamento || '-'}</td>
                               <td style={{ padding: '8px' }}>{i.previsaoEntrega || '-'}</td>
                               <td style={{ padding: '8px', color: '#d97706' }}>{i.observacao || '-'}</td>
                               <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(i.precoUnitario)}</td>
                               <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(i.total)}</td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                       <div style={{ textAlign: 'right', marginTop: '10px', fontSize: '16px', color: '#065f46', fontWeight: 'bold' }}>
                         Total do Fornecedor: {formatCurrency(pedido.valorTotal)}
                       </div>
                     </div>
                   ))}

                   <div style={{ backgroundColor: '#ecfdf5', padding: '20px', borderRadius: '8px', textAlign: 'right', marginTop: '40px' }}>
                     <h2 style={{ margin: 0, color: '#065f46', fontSize: '28px' }}>CUSTO TOTAL APROVADO: {formatCurrency(dados.valorTotal)}</h2>
                   </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}