// src/pages/Planejamento.jsx
import React, { useState, useRef } from 'react';
import { useAgro } from '../contexts/AgroContext';
import { generateId } from '../utils/helpers';
import { Map, Plus, Sprout, UploadCloud } from 'lucide-react';
import Header from '../components/Header';
import Card from '../components/Card';
import * as xlsx from 'xlsx';

export default function Planejamento() {
  const { talhoes, setTalhoes, culturas } = useAgro();
  
  // Estados do formulário manual
  const [nome, setNome] = useState('');
  const [areaHa, setAreaHa] = useState('');
  const [culturaId, setCulturaId] = useState('');
  
  // Referência para o input de arquivo oculto
  const fileInputRef = useRef(null);

  // --------------------------------------------------------
  // LÓGICA DE IMPORTAÇÃO DO EXCEL
  // --------------------------------------------------------
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const workbook = xlsx.read(bstr, { type: 'binary' });
        
        // Pega a primeira aba da planilha
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Converte a aba em um array de objetos JSON
        const data = xlsx.utils.sheet_to_json(worksheet);

        // Mapeia os dados da planilha para o formato do nosso sistema
        const novosTalhoes = data.map(row => ({
          id: generateId(),
          nome: row['TALHÃO'] ? String(row['TALHÃO']) : 'Sem Nome',
          areaHa: parseFloat(row['ÁREA']) || 0,
          retiro: row['RETIRO'] ? String(row['RETIRO']) : '',
          culturaId: '' // Fica vazio para você definir a cultura depois
        }));

        // Adiciona os novos talhões aos que já existem no contexto
        setTalhoes(prev => [...prev, ...novosTalhoes]);
        
        alert(`${novosTalhoes.length} talhões importados com sucesso!`);
      } catch (error) {
        console.error("Erro ao ler o arquivo Excel:", error);
        alert("Ocorreu um erro ao importar a planilha. Verifique o formato.");
      }
      
      // Reseta o input para permitir enviar o mesmo arquivo novamente se precisar
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    
    reader.readAsBinaryString(file);
  };

  // --------------------------------------------------------
  // LÓGICA DE ADIÇÃO MANUAL
  // --------------------------------------------------------
  const handleAddTalhao = (e) => {
    e.preventDefault();
    if (!nome.trim() || !areaHa || !culturaId) return;

    const novoTalhao = {
      id: generateId(),
      nome,
      areaHa: parseFloat(areaHa),
      culturaId,
      retiro: '' // Inserção manual não tem retiro por padrão neste formulário
    };

    setTalhoes([...talhoes, novoTalhao]);
    setNome('');
    setAreaHa('');
    setCulturaId('');
  };

  const getCulturaNome = (id) => {
    if (!id) return 'Não definida';
    const cultura = culturas.find(c => c.id === id);
    return cultura ? cultura.nome : 'Desconhecida';
  };

  return (
    <div className="pb-8 flex flex-col h-full bg-gray-50 min-h-screen">
      <Header title="Planejamento de Talhões" />
      
      <main className="px-6 py-4">
        {/* Input de arquivo invisível */}
        <input 
          type="file" 
          accept=".xlsx, .xls" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
        />

        {/* Botão de Importação do Excel */}
        <div className="mb-6">
          <button
            onClick={() => fileInputRef.current.click()}
            className="w-full bg-white border-2 border-dashed border-green-300 hover:border-green-500 hover:bg-green-50 text-green-700 font-medium py-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <UploadCloud size={24} />
            Importar Planilha do Excel (.xlsx)
          </button>
          <p className="text-center text-xs text-gray-400 mt-2">
            A planilha deve conter as colunas: RETIRO, TALHÃO e ÁREA
          </p>
        </div>

        {/* Formulário de Novo Talhão (Manual) */}
        <Card className="mb-8">
          <h2 className="text-md font-semibold text-gray-700 mb-4">Adicionar Manualmente</h2>
          <form onSubmit={handleAddTalhao} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Nome / Número do Talhão</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Talhão 01, Gleba A..."
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-green-500 focus:outline-none focus:border-green-500 p-3"
              />
            </div>
            
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Área (ha)</label>
                <input
                  type="number"
                  step="0.01"
                  value={areaHa}
                  onChange={(e) => setAreaHa(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-green-500 focus:outline-none focus:border-green-500 p-3"
                />
              </div>
              
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Cultura Inicial</label>
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
            </div>

            <button
              type="submit"
              className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Plus size={20} />
              Adicionar Talhão
            </button>
          </form>
        </Card>

        {/* Lista de Talhões */}
        <div className="flex justify-between items-end mb-4 px-2">
          <h2 className="text-lg font-bold text-gray-800">Suas Áreas</h2>
          <span className="text-sm font-bold text-green-600 bg-green-100 px-3 py-1 rounded-full">
            Total: {talhoes.reduce((acc, t) => acc + t.areaHa, 0).toFixed(2)} ha
          </span>
        </div>
        
        <div className="space-y-3">
          {talhoes.length === 0 ? (
            <p className="text-center text-gray-500 text-sm mt-6 bg-white p-6 rounded-2xl border border-gray-100">
              Nenhum talhão planejado ainda. Adicione manualmente ou importe sua planilha.
            </p>
          ) : (
            talhoes.map((talhao) => (
              <Card key={talhao.id} className="!mb-0 flex items-center justify-between py-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 p-3 rounded-xl text-green-700">
                    <Map size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">{talhao.nome}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      {talhao.retiro && (
                        <>
                          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold">
                            {talhao.retiro}
                          </span>
                          <span>•</span>
                        </>
                      )}
                      <Sprout size={14} className={talhao.culturaId ? "text-green-600" : "text-gray-400"} />
                      <span className={!talhao.culturaId ? "italic text-gray-400" : ""}>
                        {getCulturaNome(talhao.culturaId)}
                      </span>
                      <span>•</span>
                      <span className="font-bold text-gray-700">{talhao.areaHa} ha</span>
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