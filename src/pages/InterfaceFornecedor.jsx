// src/pages/InterfaceFornecedor.jsx
import React, { useState, useEffect } from 'react';
import { Send, Building2, Package, CheckCircle2, Loader2 } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase'; 
import { generateId } from '../utils/helpers';

export default function InterfaceFornecedor({ userId, cotacaoId }) {
  const [loading, setLoading] = useState(true);
  const [enviado, setEnviado] = useState(false);
  const [cotacao, setCotacao] = useState(null);
  
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [respostas, setRespostas] = useState({});

  // 1. Busca a cotação exata dentro da gaveta do usuário
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

  // 2. Injeta a oferta do fornecedor lá na nuvem
  const enviarCotacao = async () => {
    if (!nomeEmpresa.trim()) return alert("Por favor, digite o nome da sua empresa.");
    
    try {
      setLoading(true);
      const docRef = doc(db, 'usuarios', userId, 'modulos', 'compras');
      
      // Puxa os dados fresquinhos para não sobrescrever nada
      const docSnap = await getDoc(docRef);
      const data = docSnap.data();
      const cotacoesAtuais = data.cotacoes || [];

      // Mapeia e atualiza apenas a cotação e os itens que o fornecedor respondeu
      const cotacoesAtualizadas = cotacoesAtuais.map(c => {
        if (c.id !== cotacaoId) return c; // Ignora as outras cotações

        const itensAtualizados = c.itens.map(item => {
          const respostaFornecedor = respostas[item.id];
          if (!respostaFornecedor || !respostaFornecedor.preco) return item;

          const novaOferta = {
            id: generateId(),
            fornecedor: nomeEmpresa,
            precoUnitario: parseFloat(respostaFornecedor.preco),
            condicaoPagamento: respostaFornecedor.pagamento || 'À vista',
            previsaoEntrega: respostaFornecedor.entrega || '',
            observacao: respostaFornecedor.obs || ''
          };

          return { ...item, ofertas: [...(item.ofertas || []), novaOferta] };
        });

        return { ...c, itens: itensAtualizados };
      });

      // Salva no Firebase
      await updateDoc(docRef, { cotacoes: cotacoesAtualizadas });
      setEnviado(true);
      
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Houve um erro ao enviar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Telas de Carregamento e Sucesso...
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-emerald-600" size={48}/></div>;
  if (!cotacao) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><h1 className="text-2xl font-bold text-gray-400">Link Inválido ou Expirado</h1></div>;

  if (enviado) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-lg max-w-md text-center">
          <CheckCircle2 size={64} className="text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-gray-800 mb-2">Proposta Enviada!</h2>
          <p className="text-gray-500">Sua cotação foi enviada com sucesso para análise. Agradecemos a parceria!</p>
        </div>
      </div>
    );
  }

  // O Design que você criou
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-900">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
        <div className="bg-emerald-600 p-6 md:p-8 text-white">
          <h1 className="text-2xl md:text-3xl font-black mb-1">Solicitação de Cotação</h1>
          <p className="opacity-90 font-medium">Ref: {cotacao.titulo}</p>
        </div>

        <div className="p-6 md:p-8">
          <div className="mb-8 p-6 bg-gray-50 rounded-2xl border border-gray-200">
            <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Building2 size={18} className="text-emerald-600" />
              IDENTIFICAÇÃO DO FORNECEDOR *
            </label>
            <input
              type="text"
              placeholder="Digite o nome da sua empresa aqui..."
              value={nomeEmpresa}
              onChange={(e) => setNomeEmpresa(e.target.value)}
              className="w-full p-4 bg-white border-2 border-gray-200 rounded-xl focus:border-emerald-500 outline-none transition-all text-lg font-bold text-gray-800"
            />
          </div>

          <div className="overflow-x-auto mb-8">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b-2 border-gray-100 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="pb-3 font-bold px-2">Produto Solicitado</th>
                  <th className="pb-3 font-bold px-2 w-32">Preço Un. (R$)</th>
                  <th className="pb-3 font-bold px-2 w-40">Condição Pag.</th>
                  <th className="pb-3 font-bold px-2">Observações</th>
                </tr>
              </thead>
              <tbody>
                {cotacao.itens.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-2">
                      <div className="font-bold text-gray-800">{item.nome}</div>
                      <div className="text-sm font-semibold text-emerald-600 bg-emerald-50 inline-block px-2 py-0.5 rounded mt-1">Qtd: {item.quantidade} {item.unidade}</div>
                    </td>
                    <td className="py-4 px-2">
                      <input
                        type="number"
                        placeholder="0.00"
                        onChange={(e) => handleInputChange(item.id, 'preco', e.target.value)}
                        className="w-full p-3 bg-white border-2 border-gray-200 rounded-xl focus:border-emerald-500 outline-none font-black text-gray-800"
                      />
                    </td>
                    <td className="py-4 px-2">
                      <input
                        type="text"
                        placeholder="Ex: 30 dias"
                        onChange={(e) => handleInputChange(item.id, 'pagamento', e.target.value)}
                        className="w-full p-3 bg-white border-2 border-gray-200 rounded-xl focus:border-emerald-500 outline-none text-sm font-semibold"
                      />
                    </td>
                    <td className="py-4 px-2">
                      <input
                        type="text"
                        placeholder="Marca, prazo entrega..."
                        onChange={(e) => handleInputChange(item.id, 'obs', e.target.value)}
                        className="w-full p-3 bg-white border-2 border-gray-200 rounded-xl focus:border-emerald-500 outline-none text-sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-center pt-6 border-t border-gray-100">
            <button
              onClick={enviarCotacao}
              className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 px-12 rounded-2xl shadow-lg transition-transform hover:scale-105 flex items-center justify-center gap-3 text-lg"
            >
              <Send size={24} /> ENVIAR PROPOSTA
            </button>
          </div>
        </div>
      </div>
      
      <footer className="text-center mt-8 text-gray-400 text-sm font-medium">
        Ambiente Seguro de Cotação Externa
      </footer>
    </div>
  );
}