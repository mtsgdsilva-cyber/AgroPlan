// src/components/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import { Home, Database, CalendarDays, Calculator, FileText, PackageCheck, Leaf, Menu, X, LogOut, Map, Sprout, ChevronLeft, ChevronRight, FlaskConical, FileSpreadsheet } from 'lucide-react';

// Importações do Firebase para o Logout
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';

export default function Sidebar({ activeTab, setActiveTab }) {
  const [isOpen, setIsOpen] = useState(false); // Controle do Mobile
  const [isCollapsed, setIsCollapsed] = useState(false); // Controle do Desktop (Ocultar textos)
  // Escuta o clique do ícone da Folha no Header para abrir no Mobile
  useEffect(() => {
    const handleOpenSidebar = () => setIsOpen(true);
    window.addEventListener('open-sidebar', handleOpenSidebar);
    return () => window.removeEventListener('open-sidebar', handleOpenSidebar);
  }, []);

  // Aqui alteramos o menu para refletir a nova arquitetura
  const menuItems = [
    { id: 'home', label: 'Início', icon: Home },
    { id: 'cadastros', label: 'Cadastros', icon: Database },
    { id: 'planejar_culturas', label: 'Planejar Culturas', icon: Map },
    { id: 'planejar_variedades', label: 'Planejar Variedades', icon: Sprout },
    { id: 'planejar_insumos', label: 'Planejar Insumos', icon: FlaskConical }, 
    { id: 'compras', icon: FileSpreadsheet, label: 'Planilha de Compras' },
    { id: 'cotacoes', label: 'Cotações', icon: Calculator },
    { id: 'pedidos', label: 'Pedidos', icon: FileText },
    { id: 'recebimentos', label: 'Notas', icon: PackageCheck },
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    setIsOpen(false); // Fecha o menu no mobile após clicar
  };

  // Função para encerrar a sessão no Firebase
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // O useEffect no App.jsx vai detetar isto de forma automatica e redirecionar para o Login
    } catch (error) {
      console.error("Erro ao sair da conta:", error);
      alert("Houve um erro ao tentar sair. Tente novamente.");
    }
  };

  return (
    <>
      {/* Fundo Escurecido (Overlay) quando o menu está aberto no Mobile */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)} 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[65] lg:hidden animate-fade-in" 
        />
      )}

      {/* Menu Lateral (Escondido no mobile, Fixo/Retrátil no Desktop) */}
      <aside 
        className={`fixed lg:static top-0 left-0 h-full bg-white border-r border-gray-200 z-[70] transform transition-all duration-300 ease-in-out shrink-0 flex flex-col 
          ${isOpen ? 'translate-x-0 shadow-2xl w-72' : '-translate-x-full w-72'} 
          lg:translate-x-0 ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
        `}
      >
        
        {/* Logo da Aplicação e Botão de Recolher */}
        <div className={`h-20 flex items-center px-6 border-b border-gray-100 shrink-0 transition-all duration-300 ${isCollapsed ? 'justify-center lg:px-0' : 'justify-between lg:justify-start'}`}>
          
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Ícone da Folha (Agora é o botão de recolher/expandir no desktop) */}
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="bg-emerald-600 hover:bg-emerald-700 transition-colors p-2 rounded-xl text-white flex items-center justify-center shadow-sm shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              title={isCollapsed ? "Expandir Menu" : "Recolher Menu"}
            >
              <Leaf size={24} />
            </button>

            {/* O Texto do Logo some no desktop quando recolhido */}
            <h1 className={`text-xl font-black text-emerald-700 tracking-tight whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'lg:hidden' : 'block'}`}>
              AgroPlan
            </h1>
          </div>

          {/* Botão de Fechar apenas no Mobile */}
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-gray-400 hover:text-red-500 bg-gray-50 p-2 rounded-full transition-colors ml-auto">
            <X size={20} />
          </button>
        </div>

        {/* Navegação Principal */}
        <nav className="flex-1 py-6 flex flex-col gap-2 px-4 overflow-y-auto hide-scrollbar overflow-x-hidden">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                title={isCollapsed ? item.label : ""} 
                className={`w-full flex items-center p-3.5 rounded-xl transition-all relative group text-left ${
                  isCollapsed ? 'justify-center' : 'gap-3 justify-start'
                } ${
                  isActive 
                    ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800 border border-transparent'
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} className={`shrink-0 ${isActive ? 'text-emerald-600' : ''}`} />
                
                {/* O Label com alinhamento forçado à esquerda */}
                <span className={`font-medium flex-1 truncate transition-opacity duration-300 ${isActive ? 'font-bold' : ''} ${isCollapsed ? 'lg:hidden' : 'block'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Rodapé com Botão de Sair */}
        <div className="p-4 border-t border-gray-100 shrink-0">
          <button 
            onClick={handleLogout}
            title={isCollapsed ? "Sair do Sistema" : ""}
            className={`w-full flex items-center p-3.5 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-100 border border-transparent transition-all font-medium group ${isCollapsed ? 'justify-center' : 'gap-3 justify-start'}`}
          >
            <LogOut size={22} className="shrink-0 group-hover:text-red-500 transition-colors" />
            <span className={`whitespace-nowrap ${isCollapsed ? 'lg:hidden' : 'block'}`}>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}