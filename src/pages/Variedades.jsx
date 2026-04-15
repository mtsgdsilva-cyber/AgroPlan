// src/pages/Variedades.jsx
import React, { useState } from 'react';
import { useAgro } from '../contexts/AgroContext';
import { generateId, calcSeedsPerHa } from '../utils/helpers';
import { Sprout, Plus, Calculator } from 'lucide-react';
import Header from '../components/Header';
import Card from '../components/Card';

export default function Variedades() {
  const { variedades, setVariedades, culturas } = useAgro();
  
  // Estados do formulário
  const [culturaId, setCulturaId] = useState('');
  const [nome, setNome] = useState('');
  const [pms, setPms] = useState('');
  const [sementesPorMetro, setSementesPorMetro] = useState('');
  const [espacamento, setEspacamento] = useState('');

  const handleAddVariedade = (e) => {
    e.preventDefault();
    if (!culturaId || !nome.trim() || !pms || !sementesPorMetro || !espacamento) return;

    const novaVariedade = {
      id: generateId(),
      culturaId,
      nome,
      pms: parseFloat(pms),
      sementesPorMetro: parseFloat(sementesPorMetro),
      espacamento: parseFloat(espacamento)
    };

    setVariedades([...variedades, novaVariedade]);
    
    // Limpa o formulário após salvar
    setCulturaId('');
    setNome('');
    setPms('');
    setSementesPorMetro('');
    setEspacamento('');
  };

  const getCulturaNome = (id) => {
    const cultura = culturas.find(c => c.id === id);
    return cultura ? cultura.nome : 'Desconhecida';
  };

  return (
    <div className="pb-24 flex flex-col h-full bg-gray-50 min-h-screen">
      <Header title="Variedades e Sementes" />
      
      <main className="px-4">
        {/* Formulário de Nova Variedade */}
        <Card className="mb-6">
          <h2 className="text-md font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Calculator size={18} className="text-green-600" />
            Calculadora de Plantio
          </h2>
          <form onSubmit={handleAddVariedade} className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Cultura</label>
                <select
                  value={culturaId}
                  onChange={(e) => setCulturaId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-green-500 focus:outline-none focus:border-green-500 p-3 appearance-none"
                >
                  <option value="" disabled>Selecione...</option>
                  {culturas.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
              <div className="flex-[2]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Nome da Variedade</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Brasmax Lança..."
                  className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-green-500 focus:outline-none focus:border-green-500 p-3"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1" title="Peso de Mil Sementes (gramas)">PMS (g)</label>
                <input
                  type="number"
                  step="0.01"
                  value={pms}
                  onChange={(e) => setPms(e.target.value)}
                  placeholder="Ex: 180"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-green-500 focus:outline-none focus:border-green-500 p-3"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Sem/Metro</label>
                <input
                  type="number"
                  step="0.01"
                  value={sementesPorMetro}
                  onChange={(e) => setSementesPorMetro(e.target.value)}
                  placeholder="Ex: 12"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-green-500 focus:outline-none focus:border-green-500 p-3"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Espaç. (m)</label>
                <input
                  type="number"
                  step="0.01"
                  value={espacamento}
                  onChange={(e) => setEspacamento(e.target.value)}
                  placeholder="Ex: 0.45"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-green-500 focus:outline-none focus:border-green-500 p-3"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Plus size={20} />
              Salvar Variedade
            </button>
          </form>
        </Card>

        {/* Lista de Variedades Cadastradas */}
        <h2 className="text-md font-semibold text-gray-700 mb-3 px-2">Suas Sementes</h2>
        <div className="space-y-3">
          {variedades.length === 0 ? (
            <p className="text-center text-gray-500 text-sm mt-6">Nenhuma variedade cadastrada.</p>
          ) : (
            variedades.map((variedade) => {
              const popHa = calcSeedsPerHa(variedade.sementesPorMetro, variedade.espacamento);
              
              return (
                <Card key={variedade.id} className="!mb-0 flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-green-100 p-3 rounded-xl text-green-700">
                      <Sprout size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{variedade.nome}</h3>
                      <div className="flex flex-col text-xs text-gray-500 mt-1 space-y-0.5">
                        <span className="font-medium text-green-700">{getCulturaNome(variedade.culturaId)}</span>
                        <span>{Math.round(popHa).toLocaleString('pt-BR')} plantas/ha</span>
                        <span>PMS: {variedade.pms}g | Espaçamento: {variedade.espacamento}m</span>
                      </div>
                    </div>
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