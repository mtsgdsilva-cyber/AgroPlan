// src/contexts/ProcurementContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

const ProcurementContext = createContext();

export const ProcurementProvider = ({ children }) => {
  const [cotacoes, setCotacoesState] = useState([]);
  const [pedidos, setPedidosState] = useState([]);
  const [recebimentos, setRecebimentosState] = useState([]);
  
  // Constante para o cabeçalho dos relatórios e PDFs de pedido
  const [defaultCompany] = useState("Larangeira Mendes S/A");
  
  const [loading, setLoading] = useState(true);

  // 1. CARREGAR DADOS DO FIREBASE (Sempre que abrir o App)
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        // Aponta para a "gaveta" de compras do usuário logado
        const docRef = doc(db, 'usuarios', user.uid, 'modulos', 'compras');
        
        // Fica "escutando" a nuvem para atualizar a tela na hora
        const unsubscribeSnapshot = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setCotacoesState(data.cotacoes || []);
            setPedidosState(data.pedidos || []);
            setRecebimentosState(data.recebimentos || []);
          }
          setLoading(false);
        });

        return () => unsubscribeSnapshot();
      } else {
        // Se deslogar, limpa os dados da tela
        setCotacoesState([]);
        setPedidosState([]);
        setRecebimentosState([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. FUNÇÃO QUE SALVA NA NUVEM DE FATO
  const saveToFirebase = async (field, data) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const docRef = doc(db, 'usuarios', user.uid, 'modulos', 'compras');
      // merge: true garante que salvar o pedido não vai apagar a cotação e vice-versa
      await setDoc(docRef, { [field]: data }, { merge: true });
    } catch (error) {
      console.error("Erro ao salvar no Firebase:", error);
    }
  };

  // 3. INTERCEPTADORES (Atualizam a tela e o Firebase ao mesmo tempo)
  const setCotacoes = (newData) => {
    const dataToSave = typeof newData === 'function' ? newData(cotacoes) : newData;
    setCotacoesState(dataToSave);
    saveToFirebase('cotacoes', dataToSave);
  };

  const setPedidos = (newData) => {
    const dataToSave = typeof newData === 'function' ? newData(pedidos) : newData;
    setPedidosState(dataToSave);
    saveToFirebase('pedidos', dataToSave);
  };

  const setRecebimentos = (newData) => {
    const dataToSave = typeof newData === 'function' ? newData(recebimentos) : newData;
    setRecebimentosState(dataToSave);
    saveToFirebase('recebimentos', dataToSave);
  };

  return (
    <ProcurementContext.Provider value={{
      cotacoes, setCotacoes,
      pedidos, setPedidos,
      recebimentos, setRecebimentos,
      defaultCompany
    }}>
      {!loading && children}
    </ProcurementContext.Provider>
  );
};

export const useProcurement = () => useContext(ProcurementContext);