// src/pages/Pedidos.jsx
import React, { useState } from 'react';
import { useProcurement } from '../contexts/ProcurementContext';
import { generateId, formatDate, formatCurrency } from '../utils/helpers';
import { FileText, Download, Clock } from 'lucide-react';
import Header from '../components/Header';
import Card from '../components/Card';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function Pedidos() {
  const { pedidos, setPedidos, cotacoes, defaultCompany } = useProcurement();
  const [cotacaoSelecionada, setCotacaoSelecionada] = useState('');

  const handleCriarPedido = (e) => {
    e.preventDefault();
    if (!cotacaoSelecionada) return;

    const cotacao = cotacoes.find(c => c.id === cotacaoSelecionada);
    if (!cotacao) return;

    const novoPedido = {
      id: generateId(),
      numero: Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
      data: new Date().toISOString(),
      fornecedor: cotacao.fornecedor,
      itens: cotacao.itens,
      total: cotacao.total,
      statusPendente: true
    };

    setPedidos([...pedidos, novoPedido]);
    setCotacaoSelecionada('');
  };

  const gerarPDF = async (pedido) => {
    // Busca o template oculto do recibo
    const elemento = document.getElementById(`recibo-${pedido.id}`);
    if (!elemento) return;

    // Torna o elemento visível apenas durante a geração do PDF
    elemento.style.display = 'block';

    try {
      const canvas = await html2canvas(elemento, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Pedido_${pedido.numero}_Larangeira_Mendes.pdf`);
    } catch (error) {
      console.error("Erro ao gerar o PDF:", error);
      alert("Ocorreu um erro ao gerar o PDF.");
    } finally {
      // Oculta o template novamente
      elemento.style.display = 'none';
    }
  };

  return (
    <div className="pb-24 flex flex-col h-full bg-gray-50 min-h-screen">
      <Header title="Pedidos de Compra" />
      
      <main className="px-4">
        {/* Formulário para converter Cotação em Pedido */}
        <Card className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Gerar Pedido a partir de Cotação</h2>
          <form onSubmit={handleCriarPedido} className="space-y-3">
            <select
              value={cotacaoSelecionada}
              onChange={(e) => setCotacaoSelecionada(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-green-500 focus:outline-none focus:border-green-500 p-3 appearance-none"
            >
              <option value="" disabled>Selecione uma Cotação Salva...</option>
              {cotacoes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.fornecedor} - {formatCurrency(c.total)}
                </option>
              ))}
            </select>
            
            <button
              type="submit"
              disabled={!cotacaoSelecionada}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <FileText size={20} />
              Emitir Pedido Oficial
            </button>
          </form>
        </Card>

        {/* Histórico de Pedidos */}
        <h2 className="text-md font-semibold text-gray-700 mb-3 px-2">Histórico de Pedidos</h2>
        <div className="space-y-3">
          {pedidos.length === 0 ? (
            <p className="text-center text-gray-500 text-sm mt-6">Nenhum pedido emitido.</p>
          ) : (
            pedidos.map((pedido) => (
              <Card key={pedido.id} className="!mb-0">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs font-bold text-gray-400">PEDIDO #{pedido.numero}</span>
                    <h3 className="font-bold text-gray-800">{pedido.fornecedor}</h3>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md bg-yellow-100 text-yellow-700">
                    <Clock size={12} /> Pendente
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 mb-4">
                  <p>Data: {formatDate(pedido.data)}</p>
                  <p>Total: <span className="font-bold text-green-700">{formatCurrency(pedido.total)}</span></p>
                </div>

                <button
                  onClick={() => gerarPDF(pedido)}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 rounded-xl transition-colors flex items-center justify-center gap-2 border border-gray-200 text-sm"
                >
                  <Download size={16} />
                  Baixar PDF do Pedido
                </button>

                {/* --- TEMPLATE DO PDF (Fica oculto na tela do app) --- */}
                <div id={`recibo-${pedido.id}`} style={{ display: 'none' }} className="bg-white p-10 w-[800px] text-black">
                  <div className="border-b-2 border-gray-800 pb-4 mb-6 flex justify-between items-end">
                    <div>
                      <h1 className="text-3xl font-black uppercase text-green-800">{defaultCompany}</h1>
                      <p className="text-gray-500 mt-1 font-medium">Ordem de Compra Oficial</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-xl">PEDIDO Nº {pedido.numero}</p>
                      <p className="text-gray-600">Data de Emissão: {formatDate(pedido.data)}</p>
                    </div>
                  </div>
                  
                  <div className="mb-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h2 className="font-bold text-sm text-gray-500 uppercase tracking-wider mb-1">DADOS DO FORNECEDOR</h2>
                    <p className="text-xl font-bold text-gray-800">{pedido.fornecedor}</p>
                  </div>

                  <table className="w-full text-left border-collapse mb-8">
                    <thead>
                      <tr className="bg-gray-100 border-b-2 border-gray-300">
                        <th className="p-3 font-bold text-gray-700">Qtd</th>
                        <th className="p-3 font-bold text-gray-700">Descrição</th>
                        <th className="p-3 font-bold text-gray-700">Vl. Unitário</th>
                        <th className="p-3 font-bold text-gray-700 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pedido.itens.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-200">
                          <td className="p-3 text-gray-800">{item.quantidade}</td>
                          <td className="p-3 text-gray-800 font-medium">{item.descricao}</td>
                          <td className="p-3 text-gray-800">{formatCurrency(item.precoUnitario)}</td>
                          <td className="p-3 text-gray-800 font-bold text-right">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="flex justify-end mb-16">
                    <div className="bg-green-50 border border-green-200 p-4 rounded-xl min-w-[300px]">
                      <div className="flex justify-between items-center text-xl font-black text-green-800">
                        <span>TOTAL:</span>
                        <span>{formatCurrency(pedido.total)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-16 text-center text-sm text-gray-500 flex justify-center gap-16">
                    <div>
                      <div className="w-64 border-t border-gray-400 pt-2 mx-auto">
                        Assinatura do Comprador
                      </div>
                    </div>
                    <div>
                      <div className="w-64 border-t border-gray-400 pt-2 mx-auto">
                        Carimbo e Visto da Fazenda
                      </div>
                    </div>
                  </div>
                </div>
                {/* --- FIM DO TEMPLATE DO PDF --- */}

              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}