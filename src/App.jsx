// src/App.jsx
import React, { useState, useEffect } from 'react';
import { ModalProvider } from './contexts/ModalContext';

// Importações do Firebase e Autenticação
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebase';
import Login from './pages/Login';

// Importação dos Provedores de Estado (Contextos)
import { AgroProvider } from './contexts/AgroContext';
import { ProcurementProvider } from './contexts/ProcurementContext';

// Importação do Menu Lateral (Sidebar)
import Sidebar from './components/Sidebar';

// Importação das Telas
import Home from './pages/Home';
import Cadastros from './pages/Cadastros';
import PlanejarCulturas from './pages/PlanejarCulturas';
import PlanejarVariedades from './pages/PlanejarVariedades';
import PlanejarInsumos from './pages/PlanejarInsumos'; // AQUI ESTÁ A IMPORTAÇÃO
import Cotacoes from './pages/Cotacoes';
import Pedidos from './pages/Pedidos';
import Recebimentos from './pages/Recebimentos';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');

  // Estados de controle de Autenticação
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Monitora em tempo real se o utilizador está logado no Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });
    
    // Limpa o observador quando o componente é desmontado
    return () => unsubscribe();
  }, []);

  // Função Switch com as rotas
  const renderPage = () => {
    switch (activeTab) {
      case 'home': return <Home />;
      case 'cadastros': return <Cadastros />;
      case 'planejar_culturas': return <PlanejarCulturas />;
      case 'planejar_variedades': return <PlanejarVariedades />;
      case 'planejar_insumos': return <PlanejarInsumos />; // AQUI ESTÁ A ROTA FUNCIONANDO!
      case 'cotacoes': return <Cotacoes />;
      case 'pedidos': return <Pedidos />;
      case 'recebimentos': return <Recebimentos />;
      default: return <Home />;
    }
  };

  // 1. TELA DE CARREGAMENTO
  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-emerald-600 font-bold text-lg animate-pulse">
        A carregar o sistema Larangeira Mendes S/A...
      </div>
    );
  }

  // 2. TELA DE LOGIN
  if (!user) {
    return <Login />;
  }

  // 3. APLICAÇÃO PRINCIPAL
  return (
    <ModalProvider>
      <AgroProvider>
        <ProcurementProvider>
          <div className="flex w-full min-h-screen bg-gray-50 font-sans overflow-hidden">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            <main className="flex-1 h-screen overflow-y-auto">
              {renderPage()}
            </main>
          </div>
        </ProcurementProvider>
      </AgroProvider>
    </ModalProvider>
  );
}