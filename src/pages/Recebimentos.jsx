// src/pages/Recebimentos.jsx
import React, { useState } from 'react';
import { useProcurement } from '../contexts/ProcurementContext';
import { generateId, formatDate } from '../utils/helpers';
import { PackageCheck, FileText, CheckCircle } from 'lucide-react';
import Header from '../components/Header';
import Card from '../components/Card';

export default function Recebimentos() {
  const { pedidos, setPedidos, recebimentos, setRecebimentos } = useProcurement();
  
  const [pedidoSelecionadoId, setPedidoSelecionadoId] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');

  // Filtramos apenas os pedidos que ainda não foram recebidos
  const pedidosPendentes = pedidos.filter(p => p.statusPendente);

  const handleReceber = (e) => {
    e.preventDefault();
    if (!pedidoSelecionadoId || !notaFiscal.trim()) return;

    // 1. Cria o registro de recebimento (entrada física)
    const novoRecebimento = {
      id: generateId(),
      pedidoId: pedidoSelecionadoId,
      notaFiscal,
      dataRecebimento: new Date().toISOString(),
      statusFisico: 'Entregue'
    };

    setRecebimentos([...recebimentos, novoRecebimento]);

    // 2. Atualiza o status do pedido original para "Entregue" (statusPendente = false)
    const pedidosAtualizados = pedidos.map(p => 
      p.id === pedidoSelecionadoId ? { ...p, statusPendente: false } : p
    );
    setPedidos(pedidosAtualizados);

    // 3. Limpa o formulário
    setPedidoSelecionadoId('');
    setNotaFiscal('');
  };

  const getDetalhesPedido = (id) => {
    const pedido = pedidos.find(p => p.id === id);
    if (!pedido) return { fornecedor: 'Desconhecido', numero: '0000' };
    return { fornecedor: pedido.fornecedor, numero: pedido.numero };
  };

  return (
    <div className="pb-24 flex flex-col h-full bg-gray-50 min-h-screen">
      <Header title="Recebimento de Notas" />
      
      <main className="px-4">
        {/* Formulário de Recebimento de Mercadoria */}
        <Card className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <PackageCheck size={18} className="text-green-600" />
            Dar Entrada em Mercadoria
          </h2>
          <form onSubmit={handleReceber} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Selecione o Pedido Pendente</label>
              <select
                value={pedidoSelecionadoId}
                onChange={(e) => setPedidoSelecionadoId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-green-500 focus:outline-none focus:border-green-500 p-3 appearance-none"
              >
                <option value="" disabled>Pedidos aguardando entrega...</option>
                {pedidosPendentes.map(p => (
                  <option key={p.id} value={p.id}>
                    Pedido #{p.numero} - {p.fornecedor}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Número da Nota Fiscal (NF-e)</label>
              <div className="flex items-center relative">
                <FileText size={18} className="absolute left-3 text-gray-400" />
                <input
                  type="text"
                  value={notaFiscal}
                  onChange={(e) => setNotaFiscal(e.target.value)}
                  placeholder="Ex: 154889"
                  className="w-full pl-10 bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-green-500 focus:outline-none focus:border-green-500 p-3"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!pedidoSelecionadoId || !notaFiscal.trim()}
              className="w-full mt-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <CheckCircle size={20} />
              Confirmar Recebimento
            </button>
          </form>
        </Card>

        {/* Histórico de Recebimentos */}
        <h2 className="text-md font-semibold text-gray-700 mb-3 px-2">Histórico de Entregas</h2>
        <div className="space-y-3">
          {recebimentos.length === 0 ? (
            <p className="text-center text-gray-500 text-sm mt-6">Nenhuma mercadoria recebida ainda.</p>
          ) : (
            recebimentos.map((rec) => {
              const detalhes = getDetalhesPedido(rec.pedidoId);
              return (
                <Card key={rec.id} className="!mb-0 border-l-4 border-l-green-500">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-gray-800">{detalhes.fornecedor}</h3>
                      <p className="text-xs text-gray-500 mt-1">Ref: Pedido #{detalhes.numero}</p>
                    </div>
                    <div className="bg-green-50 text-green-700 text-xs font-bold px-2 py-1 rounded-lg border border-green-200">
                      NF: {rec.notaFiscal}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <CheckCircle size={14} className="text-green-500" />
                      {rec.statusFisico}
                    </span>
                    <span>{formatDate(rec.dataRecebimento)}</span>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}