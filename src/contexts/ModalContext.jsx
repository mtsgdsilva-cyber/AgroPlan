// src/contexts/ModalContext.jsx
import React, { createContext, useState, useContext } from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

const ModalContext = createContext();

export const ModalProvider = ({ children }) => {
  const [modalConfig, setModalConfig] = useState(null);

  // Função para Alertas (Avisos, Erros, Sucesso)
  const showAlert = (title, message, type = 'info') => {
    setModalConfig({ type: 'alert', title, message, alertType: type });
  };

  // Função para Confirmações (Excluir, Salvar)
  const showConfirm = (title, message, onConfirm, type = 'danger') => {
    setModalConfig({ type: 'confirm', title, message, onConfirm, confirmType: type });
  };

  const closeModal = () => setModalConfig(null);

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      
      {/* RENDERIZAÇÃO DO MODAL GLOBAL */}
      {modalConfig && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl flex flex-col transform transition-all scale-100">
            
            {/* Cabeçalho e Ícone */}
            <div className="flex items-center gap-4 mb-4">
              {modalConfig.type === 'confirm' || modalConfig.alertType === 'danger' ? (
                <div className="p-3 bg-red-100 text-red-600 rounded-full"><AlertTriangle size={28} /></div>
              ) : modalConfig.alertType === 'success' ? (
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full"><CheckCircle size={28} /></div>
              ) : (
                <div className="p-3 bg-blue-100 text-blue-600 rounded-full"><Info size={28} /></div>
              )}
              <h3 className="text-xl font-black text-gray-800">{modalConfig.title}</h3>
            </div>
            
            {/* Mensagem */}
            <p className="text-gray-600 font-medium mb-8 leading-relaxed">
              {modalConfig.message}
            </p>
            
            {/* Botões */}
            <div className="flex justify-end gap-3">
              {modalConfig.type === 'confirm' ? (
                <>
                  <button onClick={closeModal} className="px-5 py-3 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">Cancelar</button>
                  <button onClick={() => { modalConfig.onConfirm(); closeModal(); }} className={`px-5 py-3 rounded-xl font-bold text-white shadow-md transition-colors ${modalConfig.confirmType === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                    Confirmar
                  </button>
                </>
              ) : (
                <button onClick={closeModal} className="w-full px-5 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-colors">
                  Entendi
                </button>
              )}
            </div>
            
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};

export const useModal = () => useContext(ModalContext);