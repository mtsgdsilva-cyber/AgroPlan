// src/pages/Cotacoes.jsx
import React, { useState } from 'react';
import { useProcurement } from '../contexts/ProcurementContext';
import { generateId, formatCurrency } from '../utils/helpers';
import { Calculator, Plus, ShoppingCart, Save, Building2 } from 'lucide-react';
import Header from '../components/Header';
import Card from '../components/Card';

export default function Cotacoes() {
  const { cotacoes, setCotacoes } = useProcurement();
  
  // Estados do formulário da cotação
  const [fornecedor, setFornecedor] = useState('');
  
  // Estados do item atual sendo adicionado
  const [descricao, setDescricao] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [precoUnitario, setPrecoUnitario] = useState('');
  
  // Lista temporária de itens antes de salvar a cotação inteira
  const [itensRascunho, setItensRascunho] = useState([]);

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!descricao.trim() || !quantidade || !precoUnitario) return;

    const novoItem = {
      id: generateId(),
      descricao,
      quantidade: parseFloat(quantidade),
      precoUnitario: parseFloat(precoUnitario),
      total: parseFloat(quantidade) * parseFloat(precoUnitario)
    };

    setItensRascunho([...itensRascunho, novoItem]);
    
    // Limpa os campos do item
    setDescricao('');
    setQuantidade('');
    setPrecoUnitario('');
  };

  const handleSalvarCotacao = () => {
    if (!fornecedor.trim() || itensRascunho.length === 0) return;

    const totalCotacao = itensRascunho.reduce((acc, item) => acc + item.total, 0);

    const novaCotacao = {
      id: generateId(),
      data: new Date().toISOString(),
      fornecedor,
      itens: itensRascunho,
      total: totalCotacao
    };

    setCotacoes([...cotacoes, novaCotacao]);
    
    // Reseta o formulário
    setFornecedor('');
    setItensRascunho([]);
  };

  const totalRascunho = itensRascunho.reduce((acc, item) => acc + item.total, 0);

  return (
    <div className="pb-24 flex flex-col h-full bg-gray-50 min-h-screen">
      <Header title="Cotações de Insumos" />
      
      <main className="px-4">
        {/* Formulário de Nova Cotação */}
        <Card className="mb-6">
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
              <Building2 size={14} /> Fornecedor / Loja
            </label>
            <input
              type="text"
              value={fornecedor}
              onChange={(e) => setFornecedor(e.target.value)}
              placeholder="Ex: AgroShop, Cooperativa..."
              className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-green-500 focus:outline-none focus:border-green-500 p-3"
            />
          </div>

          <div className="border-t border-gray-100 pt-4 mb-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Adicionar Item</h3>
            <form onSubmit={handleAddItem} className="space-y-3">
              <div>
                <input
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descrição (Ex: Adubo MAP 20kg)"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-green-500 focus:outline-none focus:border-green-500 p-3"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="number"
                    step="0.01"
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                    placeholder="Qtd"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-green-500 focus:outline-none focus:border-green-500 p-3"
                  />
                </div>
                <div className="flex-[2]">
                  <input
                    type="number"
                    step="0.01"
                    value={precoUnitario}
                    onChange={(e) => setPrecoUnitario(e.target.value)}
                    placeholder="Preço Unit. (R$)"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-green-500 focus:outline-none focus:border-green-500 p-3"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-green-50 hover:bg-green-100 text-green-700 font-medium py-2 rounded-xl transition-colors flex items-center justify-center gap-2 border border-green-200"
              >
                <Plus size={18} />
                Incluir na Cotação
              </button>
            </form>
          </div>

          {/* Lista de Itens do Rascunho */}
          {itensRascunho.length > 0 && (
            <div className="mt-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
              <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Itens Incluídos:</h4>
              <ul className="space-y-2 mb-3">
                {itensRascunho.map(item => (
                  <li key={item.id} className="flex justify-between text-sm items-center border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                    <span className="text-gray-700 truncate max-w-[150px]">{item.quantidade}x {item.descricao}</span>
                    <span className="font-semibold text-gray-800">{formatCurrency(item.total)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between items-center pt-2 border-t border-gray-300 font-bold">
                <span className="text-gray-800">Total:</span>
                <span className="text-green-700 text-lg">{formatCurrency(totalRascunho)}</span>
              </div>
              
              <button
                onClick={handleSalvarCotacao}
                disabled={!fornecedor.trim()}
                className="w-full mt-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Save size={20} />
                Salvar Cotação Completa
              </button>
            </div>
          )}
        </Card>

        {/* Histórico de Cotações Salvas */}
        <h2 className="text-md font-semibold text-gray-700 mb-3 px-2 flex items-center gap-2">
          <Calculator size={18} className="text-green-600" />
          Cotações Registradas
        </h2>
        <div className="space-y-3">
          {cotacoes.length === 0 ? (
            <p className="text-center text-gray-500 text-sm mt-6">Nenhuma cotação salva.</p>
          ) : (
            cotacoes.map((cot) => (
              <Card key={cot.id} className="!mb-0 flex items-center justify-between py-4">
                <div className="flex items-center gap-4 w-full">
                  <div className="bg-green-100 p-3 rounded-xl text-green-700">
                    <ShoppingCart size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800">{cot.fornecedor}</h3>
                    <div className="flex flex-col text-xs text-gray-500 mt-1">
                      <span>{cot.itens.length} iten(s)</span>
                      <span className="font-bold text-green-700 text-sm mt-1">{formatCurrency(cot.total)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}