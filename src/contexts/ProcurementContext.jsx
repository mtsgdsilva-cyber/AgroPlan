// src/contexts/ProcurementContext.jsx
import React, { createContext, useState, useContext } from 'react';

const ProcurementContext = createContext();

export const ProcurementProvider = ({ children }) => {
  // Schema: { id, data, fornecedor, itens: [{ descricao, quantidade, precoUnitario }], total }
  const [cotacoes, setCotacoes] = useState([]);

  // Schema: { id, numero, data, fornecedor, itens, statusPendente }
  const [pedidos, setPedidos] = useState([]);
  
  // Constante para o cabeçalho dos relatórios e PDFs de pedido
  const defaultCompany = "Larangeira Mendes S/A";

  // Schema: { id, pedidoId, notaFiscal, dataRecebimento, statusFisico }
  const [recebimentos, setRecebimentos] = useState([]);

  return (
    <ProcurementContext.Provider value={{
      cotacoes, setCotacoes,
      pedidos, setPedidos,
      recebimentos, setRecebimentos,
      defaultCompany
    }}>
      {children}
    </ProcurementContext.Provider>
  );
};

export const useProcurement = () => useContext(ProcurementContext);