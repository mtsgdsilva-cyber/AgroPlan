// src/components/BottomNav.jsx
import React from 'react';
import { Map, Sprout, Calculator, FileText, PackageCheck } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'planejamento', label: 'Talhões', icon: Map },
    { id: 'variedades', label: 'Sementes', icon: Sprout },
    { id: 'cotacoes', label: 'Cotações', icon: Calculator },
    { id: 'pedidos', label: 'Pedidos', icon: FileText },
    { id: 'recebimentos', label: 'Notas', icon: PackageCheck },
  ];

  return (
    // Removi o max-w-md e alterei para justify-around
    <nav className="fixed bottom-0 w-full bg-white border-t border-gray-100 flex justify-around px-2 py-3 z-50 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center w-full max-w-[120px] space-y-1 transition-colors ${isActive ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-green-50' : 'bg-transparent'}`}>
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}