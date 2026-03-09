// src/contexts/AgroContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

const AgroContext = createContext();

export const AgroProvider = ({ children }) => {
  // 1. Nossos estados locais (agora com "State" no nome para diferenciar)
  const [talhoes, setTalhoesState] = useState([]);
  const [culturas, setCulturasState] = useState([{ id: '1', nome: 'Soja' }, { id: '2', nome: 'Milho' }]);
  const [variedades, setVariedadesState] = useState([]);
  const [taxasPlantio, setTaxasPlantioState] = useState([]);
  const [embalagens, setEmbalagensState] = useState([]);
  const [planosSafra, setPlanosSafraState] = useState([]);

  // Estado para travar a tela até o Firebase terminar de baixar os dados
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // A "Pasta" da nossa empresa lá no banco de dados do Firebase
  const docRef = doc(db, "farm_data", "larangeira_mendes");

  // ==========================================
  // SINCRONIZAÇÃO DE DESCIDA (Firebase -> App)
  // ==========================================
  useEffect(() => {
    // onSnapshot fica "ouvindo" o banco. Se alguém mudar no celular, atualiza no PC na hora!
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.talhoes) setTalhoesState(data.talhoes);
        if (data.culturas) setCulturasState(data.culturas);
        if (data.variedades) setVariedadesState(data.variedades);
        if (data.taxasPlantio) setTaxasPlantioState(data.taxasPlantio);
        if (data.embalagens) setEmbalagensState(data.embalagens);
        if (data.planosSafra) setPlanosSafraState(data.planosSafra);
      }
      // Libera o aplicativo para renderizar
      setIsDataLoaded(true);
    }, (error) => {
      console.error("Erro ao sincronizar com o Firebase:", error);
      setIsDataLoaded(true); // Libera mesmo com erro para funcionar offline
    });

    return () => unsub();
  }, []);

  // ==========================================
  // SINCRONIZAÇÃO DE SUBIDA (App -> Firebase)
  // ==========================================
  // Substituímos os "setters" originais por funções que também salvam na nuvem.

  const setTalhoes = (newVal) => {
    setTalhoesState(prev => {
      const val = typeof newVal === 'function' ? newVal(prev) : newVal;
      setDoc(docRef, { talhoes: val }, { merge: true });
      return val;
    });
  };

  const setCulturas = (newVal) => {
    setCulturasState(prev => {
      const val = typeof newVal === 'function' ? newVal(prev) : newVal;
      setDoc(docRef, { culturas: val }, { merge: true });
      return val;
    });
  };

  const setVariedades = (newVal) => {
    setVariedadesState(prev => {
      const val = typeof newVal === 'function' ? newVal(prev) : newVal;
      setDoc(docRef, { variedades: val }, { merge: true });
      return val;
    });
  };

  const setTaxasPlantio = (newVal) => {
    setTaxasPlantioState(prev => {
      const val = typeof newVal === 'function' ? newVal(prev) : newVal;
      setDoc(docRef, { taxasPlantio: val }, { merge: true });
      return val;
    });
  };

  const setEmbalagens = (newVal) => {
    setEmbalagensState(prev => {
      const val = typeof newVal === 'function' ? newVal(prev) : newVal;
      setDoc(docRef, { embalagens: val }, { merge: true });
      return val;
    });
  };

  const setPlanosSafra = (newVal) => {
    setPlanosSafraState(prev => {
      const val = typeof newVal === 'function' ? newVal(prev) : newVal;
      setDoc(docRef, { planosSafra: val }, { merge: true });
      return val;
    });
  };

  return (
    <AgroContext.Provider value={{
      talhoes, setTalhoes,
      culturas, setCulturas,
      variedades, setVariedades,
      taxasPlantio, setTaxasPlantio,
      embalagens, setEmbalagens,
      planosSafra, setPlanosSafra
    }}>
      {/* Só exibe o sistema quando os dados chegarem da nuvem */}
      {isDataLoaded ? children : (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 text-emerald-600 font-bold animate-pulse">
          A sincronizar dados da fazenda...
        </div>
      )}
    </AgroContext.Provider>
  );
};

export const useAgro = () => useContext(AgroContext);