// src/pages/Home.jsx
import React from 'react';
import { useAgro } from '../contexts/AgroContext';
import { useProcurement } from '../contexts/ProcurementContext';
import { Tractor, FileText, AlertCircle } from 'lucide-react';
import Header from '../components/Header';
import Card from '../components/Card';

export default function Home() {
  const { talhoes } = useAgro();
  const { pedidos, defaultCompany } = useProcurement();

  // Cálculos rápidos para o Dashboard
  const areaTotal = talhoes.reduce((acc, talhao) => acc + talhao.areaHa, 0);
  const pedidosPendentes = pedidos.filter(p => p.statusPendente).length;

  return (
    <div className="flex flex-col h-full bg-gray-50 min-h-screen w-full">
      <Header title="Painel de Controle" />
      
      <main className="px-6 py-4">
        <div className="mb-8">
          <h2 className="text-3xl font-black text-gray-800">Visão Geral</h2>
          <p className="text-gray-500 font-medium mt-1">Resumo operacional da {defaultCompany}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card de Área Total */}
          <Card className="!mb-0 border-l-4 border-l-green-600">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-xl text-green-700">
                <Tractor size={28} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Área Plantada</p>
                <h3 className="text-2xl font-black text-gray-800">{areaTotal.toFixed(2)} ha</h3>
              </div>
            </div>
          </Card>

          {/* Card de Pedidos Pendentes */}
          <Card className="!mb-0 border-l-4 border-l-yellow-500">
            <div className="flex items-center gap-4">
              <div className="bg-yellow-100 p-3 rounded-xl text-yellow-700">
                <AlertCircle size={28} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Aguardando Entrega</p>
                <h3 className="text-2xl font-black text-gray-800">{pedidosPendentes} Pedido(s)</h3>
              </div>
            </div>
          </Card>

          {/* Card de Talhões Registrados */}
          <Card className="!mb-0 border-l-4 border-l-blue-500">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-xl text-blue-700">
                <FileText size={28} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Talhões Mapeados</p>
                <h3 className="text-2xl font-black text-gray-800">{talhoes.length} Áreas</h3>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}