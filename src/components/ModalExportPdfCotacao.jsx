// src/components/ModalExportPdfCotacao.jsx
import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { X, FileSpreadsheet, Download, CheckSquare, Square } from 'lucide-react';

export default function ModalExportPdfCotacao({ 
  isOpen, 
  onClose, 
  culturaNome, 
  safraNome, 
  editVarConfig, 
  variedades, 
  taxasPlantio, 
  embalagens 
}) {
  const [incluirArea, setIncluirArea] = useState(true);
  const [observacao, setObservacao] = useState(''); // NOVO: Estado para a observação

  if (!isOpen) return null;

  const getVariedadeNome = (id) => (variedades || []).find(v => v.id === id)?.nome || '';

  const calcularEmbalagens = (areaHa, taxaId, variedadeId) => {
    if (!areaHa || !variedadeId || !taxaId) return { total: 0, tipo: '' };
    const taxa = (taxasPlantio || []).find(t => t.id === taxaId);
    const varObj = (variedades || []).find(v => v.id === variedadeId);
    if (!taxa || !varObj?.embalagemId) return { total: 0, tipo: '' };
    const emb = (embalagens || []).find(e => e.id === varObj.embalagemId);
    if (!emb) return { total: 0, tipo: '' };

    let totalSementes = 0;
    if (taxa.tipo === 'kg') totalSementes = taxa.kgPorHa * areaHa;
    else if (taxa.tipo === 'sementes_ha') totalSementes = taxa.sementesPorHa * areaHa;
    else if (taxa.tipo === 'sementes_metro') {
      totalSementes = ((10000 / taxa.espacamento) * taxa.sementesPorMetro) * areaHa;
    }
    return {
      total: totalSementes / emb.capacidade,
      tipo: emb.tipoEmbalagem === 'bag' ? 'Bags' : 'Sacas'
    };
  };

  const gerarPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // --- CABEÇALHO CORPORATIVO ---
    // Nome da Empresa (Top Esquerda)
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(44, 62, 80); // Tom grafite elegante
    doc.text('LARANGEIRA MENDES S/A', 14, 20);

    // Data de Emissão (Top Direita)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - 14, 20, { align: 'right' });

    // Linha divisória sutil
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(14, 24, pageWidth - 14, 24);

    // Título do Relatório
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(44, 62, 80);
    doc.text('RELAÇÃO DE SEMENTES PARA COTAÇÃO', 14, 33);

    // Subtítulo (Cultura e Safra)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Culturas planejadas: ${culturaNome}   |   Safra: ${safraNome}`, 14, 39);

    // --- PROCESSAMENTO DE DADOS E TOTAIS ---
    const resumo = {};
    let totalGeralArea = 0;
    let totalGeralBags = 0;
    let tipoEmbGlobal = '';

    Object.values(editVarConfig).forEach(config => {
      config.variedades.forEach(row => {
        const nome = getVariedadeNome(row.variedadeId);
        const areaVal = parseFloat(row.areaHa);
        
        if (!nome || isNaN(areaVal) || areaVal <= 0) return;

        const calcEmb = calcularEmbalagens(areaVal, row.taxaId, row.variedadeId);

        if (!resumo[nome]) resumo[nome] = { area: 0, bags: 0, tipoEmb: calcEmb.tipo };
        
        resumo[nome].area += areaVal;
        resumo[nome].bags += calcEmb.total;
        
        totalGeralArea += areaVal;
        totalGeralBags += calcEmb.total;
        
        if (calcEmb.tipo && !resumo[nome].tipoEmb) resumo[nome].tipoEmb = calcEmb.tipo;
        if (calcEmb.tipo) tipoEmbGlobal = calcEmb.tipo; // Salva para o total
      });
    });

    // --- MONTAGEM DINÂMICA DAS LINHAS ---
    const tableBody = Object.entries(resumo)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([nome, dados]) => {
        const linha = [nome];
        if (incluirArea) linha.push(`${dados.area.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ha`);
        linha.push(`${Math.round(dados.bags).toLocaleString('pt-BR')} ${dados.tipoEmb || 'Und'}`);
        return linha;
      });

    // ADICIONA A LINHA DE TOTAL GERAL NO FINAL
    if (tableBody.length > 0) {
      const linhaTotal = ['TOTAL GERAL'];
      if (incluirArea) linhaTotal.push(`${totalGeralArea.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ha`);
      linhaTotal.push(`${Math.round(totalGeralBags).toLocaleString('pt-BR')} ${tipoEmbGlobal || 'Und'}`);
      tableBody.push(linhaTotal);
    }

    // --- MONTAGEM DINÂMICA DO CABEÇALHO ---
    const headCols = ['Nome da variedade'];
    if (incluirArea) headCols.push('Área Planejada'); 
    headCols.push('Quantidade');

    const columnStylesDef = incluirArea 
      ? { 1: { halign: 'right' }, 2: { halign: 'right', fontStyle: 'bold' } }
      : { 1: { halign: 'right', fontStyle: 'bold' } };

    // --- TABELA ---
    autoTable(doc, {
      startY: 45, // Ajustado para dar espaço ao novo cabeçalho
      margin: { bottom: 45 }, 
      head: [headCols],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [44, 62, 80], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: { top: 1.5, bottom: 1.5, left: 4, right: 4 } },
      columnStyles: columnStylesDef,
      willDrawCell: function (data) {
        // Destaca a última linha (Total Geral)
        if (data.row.index === tableBody.length - 1) {
          doc.setFillColor(235, 240, 242); 
          doc.setFont('helvetica', 'bold');
        }
      },
      didDrawPage: function (data) {
        // Adiciona número da página no cantinho direito do rodapé
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150);
        doc.text(`Página ${doc.internal.getNumberOfPages()}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
      }
    });

    // --- OBSERVAÇÕES (OPCIONAL) ---
    let finalY = doc.lastAutoTable.finalY + 10;

    if (observacao.trim()) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60);
      doc.text('Observações:', 14, finalY);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80);
      
      // Quebra o texto automaticamente para não sair da folha
      const splitObs = doc.splitTextToSize(observacao, pageWidth - 28);
      doc.text(splitObs, 14, finalY + 5);
    }

    // --- ASSINATURAS (FIXAS NO RODAPÉ) ---
    const signY = pageHeight - 25;
    doc.setDrawColor(0);
    doc.setLineWidth(0.5); // Linha mais fina para assinatura
    doc.line(30, signY, 90, signY);
    doc.setTextColor(80);
    doc.text('Elaborado por', 60, signY + 5, { align: 'center' });
    
    doc.setDrawColor(0);
    doc.line(120, signY, 180, signY);
    doc.text('Aprovado por', 150, signY + 5, { align: 'center' });

    doc.save(`Cotacao_Sementes_${culturaNome.replace(/\s+/g, '_')}.pdf`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border-t-8 border-emerald-600" onClick={e => e.stopPropagation()}>
        
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-gray-800 text-xl flex items-center gap-2">
            <FileSpreadsheet className="text-emerald-600" size={24}/> Gerar Cotação
          </h3>
          <button onClick={onClose} className="bg-gray-100 text-gray-400 p-2 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"><X size={20}/></button>
        </div>
        
        <p className="text-gray-600 text-sm mb-6">
          Este relatório consolidará as variedades selecionadas, arredondando as quantidades para facilitar a negociação.
        </p>

        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 mb-6">
          <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Personalizar Relatório</h4>
          
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setIncluirArea(!incluirArea)}
          >
            <div className="transition-transform group-hover:scale-110">
              {incluirArea ? <CheckSquare className="text-emerald-600" size={20} /> : <Square className="text-gray-400" size={20} />}
            </div>
            <span className={`font-semibold text-sm ${incluirArea ? 'text-gray-800' : 'text-gray-500'}`}>
              Imprimir coluna de "Área Planejada"
            </span>
          </div>
        </div>

        {/* CAMPO DE OBSERVAÇÃO */}
        <div className="mb-6">
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">
            Observações (Opcional)
          </label>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Ex: Condições de pagamento, prazo de entrega, sementes tratadas..."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all resize-none h-24 custom-scrollbar"
          />
        </div>

        <button onClick={gerarPDF} className="w-full py-4 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 shadow-md transition-all flex items-center justify-center gap-2 active:scale-95">
          <Download size={20} /> Baixar PDF de Cotação
        </button>
      </div>
    </div>
  );
}