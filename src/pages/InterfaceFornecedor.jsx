// src/pages/InterfaceFornecedor.jsx
import React, { useState, useEffect } from 'react';
import { Send, Building2, CheckCircle2, Loader2, Info, User } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase'; 
import { generateId, formatCurrency } from '../utils/helpers';

export default function InterfaceFornecedor({ userId, cotacaoId }) {
  const [loading, setLoading] = useState(true);
  const [enviado, setEnviado] = useState(false);
  const [cotacao, setCotacao] = useState(null);
  
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [nomeVendedor, setNomeVendedor] = useState('');
  const [respostas, setRespostas] = useState({});

  useEffect(() => {
    const buscarCotacao = async () => {
      try {
        const docRef = doc(db, 'usuarios', userId, 'modulos', 'compras');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          const cotacaoEncontrada = (data.cotacoes || []).find(c => c.id === cotacaoId);
          
          if (cotacaoEncontrada) {
            setCotacao(cotacaoEncontrada);
          } else {
            alert("Cotação não encontrada ou já encerrada.");
          }
        }
      } catch (error) {
        console.error("Erro ao buscar cotação:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (userId && cotacaoId) buscarCotacao();
  }, [userId, cotacaoId]);

  const handleInputChange = (itemId, campo, valor) => {
    setRespostas(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [campo]: valor }
    }));
  };

  // Função que limpa a string para evitar duplicatas (tira acento, espaço extra e maiúsculas)
  const normalizarNome = (str) => {
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ');
  };

  const enviarCotacao = async () => {
    if (!nomeEmpresa.trim()) return alert("Por favor, informe o nome da sua empresa.");
    if (!nomeVendedor.trim()) return alert("Por favor, informe o seu nome (vendedor).");
    
    try {
      setLoading(true);
      const docRef = doc(db, 'usuarios', userId, 'modulos', 'compras');
      
      const docSnap = await getDoc(docRef);
      const data = docSnap.data();
      const cotacoesAtuais = data.cotacoes || [];

      const cotacoesAtualizadas = cotacoesAtuais.map(c => {
        if (c.id !== cotacaoId) return c; 

        const itensAtualizados = c.itens.map(item => {
          const resp = respostas[item.id];
          if (!resp || !resp.preco) return item;

          const ofertasAtuais = item.ofertas || [];
          
          // Busca inteligente: ignora erros de digitação leves
          const indexOfertaExistente = ofertasAtuais.findIndex(
            o => normalizarNome(o.fornecedor) === normalizarNome(nomeEmpresa)
          );

          const novaOferta = {
            id: indexOfertaExistente >= 0 ? ofertasAtuais[indexOfertaExistente].id : generateId(),
            fornecedor: nomeEmpresa.trim(),
            vendedor: nomeVendedor.trim(),
            dataResposta: new Date().toISOString(),
            precoUnitario: parseFloat(resp.preco),
            produtoAlternativo: resp.semelhante || '',
            observacao: resp.obs || '',
            condicaoPagamento: 'À combinar' // Removido da tabela, mantido um padrão base
          };

          if (indexOfertaExistente >= 0) {
            const ofertasAtualizadas = [...ofertasAtuais];
            ofertasAtualizadas[indexOfertaExistente] = novaOferta;
            return { ...item, ofertas: ofertasAtualizadas };
          } else {
            return { ...item, ofertas: [...ofertasAtuais, novaOferta] };
          }
        });

        return { ...c, itens: itensAtualizados };
      });

      await updateDoc(docRef, { cotacoes: cotacoesAtualizadas });
      setEnviado(true);
      
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Houve um erro ao enviar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-emerald-600" size={48}/></div>;
  if (!cotacao) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><h1 className="text-2xl font-bold text-gray-400">Link Inválido ou Expirado</h1></div>;

  if (enviado) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-lg max-w-md text-center">
          <CheckCircle2 size={64} className="text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-gray-800 mb-2">Proposta Enviada!</h2>
          <p className="text-gray-500">Sua cotação foi atualizada com sucesso para a nossa equipe. Agradecemos a parceria!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-900">
      <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
        
        {/* CABEÇALHO */}
        <div className="bg-emerald-600 p-6 md:p-8 text-white">
          <h1 className="text-2xl md:text-3xl font-black mb-1">Solicitação de Cotação</h1>
          <p className="opacity-90 font-medium">Ref: {cotacao.titulo}</p>
        </div>

        <div className="p-4 md:p-8">
          
          {/* IDENTIFICAÇÃO DO FORNECEDOR */}
          <div className="mb-8 p-5 md:p-6 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 mb-2 flex items-center gap-1.5 uppercase tracking-widest">
                <Building2 size={16} className="text-emerald-600" /> Nome da Empresa *
              </label>
              <input
                type="text"
                placeholder="Ex: AgroPecuária Silva"
                value={nomeEmpresa}
                onChange={(e) => setNomeEmpresa(e.target.value)}
                className="w-full p-3.5 bg-white border-2 border-gray-200 rounded-xl focus:border-emerald-500 outline-none transition-all font-bold text-gray-800"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 mb-2 flex items-center gap-1.5 uppercase tracking-widest">
                <User size={16} className="text-emerald-600" /> Seu Nome (Vendedor) *
              </label>
              <input
                type="text"
                placeholder="Ex: João Souza"
                value={nomeVendedor}
                onChange={(e) => setNomeVendedor(e.target.value)}
                className="w-full p-3.5 bg-white border-2 border-gray-200 rounded-xl focus:border-emerald-500 outline-none transition-all font-bold text-gray-800"
              />
            </div>
          </div>

          {/* TABELA DE PRODUTOS */}
          <div className="overflow-x-auto mb-8 border border-gray-200 rounded-2xl">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="p-4 font-bold">Qtd / Produto Solicitado</th>
                  <th className="p-4 font-bold w-32">Valor Unit.</th>
                  <th className="p-4 font-bold w-36">Valor Total</th>
                  <th className="p-4 font-bold w-48">
                    <div className="flex items-center gap-1.5">
                      Semelhante
                      <div title="Se você não tiver o produto exato solicitado, digite aqui o nome do produto ou marca similar que você tem disponível." onClick={() => alert("Se você não tiver o produto exato, digite aqui o nome do produto/marca similar que você tem disponível.")} className="cursor-help text-emerald-600 bg-emerald-100 rounded-full p-0.5"><Info size={14} /></div>
                    </div>
                  </th>
                  <th className="p-4 font-bold w-48">Observações</th>
                </tr>
              </thead>
              <tbody>
                {cotacao.itens.map((item) => {
                  const precoDigitado = parseFloat(respostas[item.id]?.preco) || 0;
                  const valorTotal = precoDigitado * item.quantidade;

                  return (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-gray-800 text-sm">{item.nome}</div>
                        <div className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-100 inline-block px-2 py-0.5 rounded mt-1">
                          {item.quantidade} {item.unidade}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-xs font-bold text-gray-400">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            onChange={(e) => handleInputChange(item.id, 'preco', e.target.value)}
                            className="w-full pl-8 pr-2 py-2.5 bg-white border-2 border-gray-200 rounded-lg focus:border-emerald-500 outline-none font-black text-gray-800 text-sm"
                          />
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-black text-gray-800 bg-gray-100 py-2.5 px-3 rounded-lg border border-gray-200">
                          {formatCurrency(valorTotal)}
                        </div>
                      </td>
                      <td className="p-4">
                        <input
                          type="text"
                          placeholder="Produto similar..."
                          onChange={(e) => handleInputChange(item.id, 'semelhante', e.target.value)}
                          className="w-full p-2.5 bg-white border-2 border-gray-200 rounded-lg focus:border-emerald-500 outline-none text-sm font-semibold text-gray-700"
                        />
                      </td>
                      <td className="p-4">
                        <input
                          type="text"
                          placeholder="Falta de estoque..."
                          onChange={(e) => handleInputChange(item.id, 'obs', e.target.value)}
                          className="w-full p-2.5 bg-white border-2 border-gray-200 rounded-lg focus:border-emerald-500 outline-none text-sm text-gray-600"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 font-semibold text-center md:text-left">
              Confira os valores antes de enviar.<br/>O cálculo do total é feito automaticamente.
            </p>
            <button
              onClick={enviarCotacao}
              className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 px-10 rounded-2xl shadow-lg transition-transform hover:scale-105 flex items-center justify-center gap-3 text-base md:text-lg uppercase tracking-widest"
            >
              <Send size={20} /> ENVIAR PROPOSTA
            </button>
          </div>
        </div>
      </div>
      
      <footer className="text-center mt-8 text-gray-400 text-xs font-semibold">
        Ambiente Seguro de Cotação Externa • Gestão Agrícola
      </footer>
    </div>
  );
}