// src/components/ModalExportPdfPlantio.jsx
import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { X, FileText, CheckSquare, Square, Download } from 'lucide-react';

export default function ModalExportPdfPlantio({ 
  isOpen, 
  onClose, 
  culturaNome, 
  safraNome, 
  editVarConfig, 
  talhoes, 
  variedades, 
  taxasPlantio, 
  embalagens 
}) {
  const [incluirTaxa, setIncluirTaxa] = useState(true);
  const [incluirSementes, setIncluirSementes] = useState(true);
  const [arredondarBags, setArredondarBags] = useState(false); // NOVO: Estado para arredondar

  if (!isOpen) return null;

  // Função auxiliar para calcular embalagens (mesma lógica do PlanejarVariedades)
  const calcularEmbalagens = (areaHa, taxaId, variedadeId) => {
    if (!areaHa || !variedadeId || !taxaId) return { total: 0, tipo: '' };
    
    const taxa = (taxasPlantio || []).find(t => t.id === taxaId);
    const varObj = (variedades || []).find(v => v.id === variedadeId);
    if (!taxa || !varObj?.embalagemId) return { total: 0, tipo: '' }; 
    
    const emb = (embalagens || []).find(e => e.id === varObj.embalagemId);
    if (!emb) return { total: 0, tipo: '' };

    let totalNecessario = 0;
    if (taxa.tipo === 'kg' && emb.tipoUnidade === 'kg') {
      totalNecessario = taxa.kgPorHa * areaHa;
    } else if (taxa.tipo === 'sementes_ha' && emb.tipoUnidade === 'sementes') {
      totalNecessario = taxa.sementesPorHa * areaHa;
    } else if (taxa.tipo === 'sementes_metro' && emb.tipoUnidade === 'sementes') {
      const sementesPorHa = (10000 / taxa.espacamento) * taxa.sementesPorMetro;
      totalNecessario = sementesPorHa * areaHa;
    } else {
      return { total: 0, tipo: '' }; 
    }
    
    return { 
      total: totalNecessario / emb.capacidade, 
      tipo: emb.tipoEmbalagem === 'bag' ? 'Bags' : 'Sacas' 
    };
  };

  const getVariedadeNome = (id) => (variedades || []).find(v => v.id === id)?.nome || 'Não definida';
  const getTaxaNome = (id) => (taxasPlantio || []).find(t => t.id === id)?.nome || '-';

  const gerarPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height; // NOVO: Pega a altura total da página A4

    // Helper para exibir número arredondado ou com 1 casa decimal
    const formatSementes = (val) => arredondarBags ? Math.round(val).toLocaleString('pt-BR') : val.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

    // --- CABEÇALHO ---
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Larangeira Mendes S/A', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Distribuição de Variedades - ${culturaNome}`, pageWidth / 2, 28, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Safra: ${safraNome}   |   Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 34, { align: 'center' });

    // --- DADOS DA TABELA PRINCIPAL ---
    const tableBody = [];
    const resumoVariedades = {};
    let areaTotalGeral = 0;

    // Agrupar e preparar dados
    Object.values(editVarConfig).forEach(config => {
      const talhao = (talhoes || []).find(t => t.id === config.talhaoId);
      const retiroNome = talhao?.retiro?.trim() || 'Sem Retiro';
      const talhaoNome = talhao?.nome || 'Desconhecido';

      config.variedades.forEach(row => {
        const area = parseFloat(row.areaHa) || 0;
        if (area <= 0) return;

        const varNome = getVariedadeNome(row.variedadeId);
        const calcEmb = calcularEmbalagens(area, row.taxaId, row.variedadeId);

        // Alimentar resumo
        if (row.variedadeId) {
          if (!resumoVariedades[varNome]) {
            resumoVariedades[varNome] = { area: 0, embalagens: 0, tipoEmb: calcEmb.tipo };
          }
          resumoVariedades[varNome].area += area;
          resumoVariedades[varNome].embalagens += calcEmb.total;
        }
        areaTotalGeral += area;

        // Montar linha da tabela
        const linha = [
          retiroNome,
          talhaoNome,
          varNome,
          `${area.toLocaleString('pt-BR')} ha`
        ];

        if (incluirTaxa) linha.push(getTaxaNome(row.taxaId));
        if (incluirSementes) {
          linha.push(calcEmb.total > 0 ? `${formatSementes(calcEmb.total)} ${calcEmb.tipo}` : '-');
        }

        tableBody.push(linha);
      });
    });

    // Ordenar por Retiro e depois por Talhão
    tableBody.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));

    const headCols = ['Retiro', 'Talhão', 'Variedade', 'Área'];
    if (incluirTaxa) headCols.push('Taxa de Plantio');
    if (incluirSementes) headCols.push('Sementes');

    // --- RENDERIZAR TABELA PRINCIPAL ---
    autoTable(doc, {
      startY: 42,
      margin: { bottom: 40 }, // NOVO: Protege o espaço do rodapé
      head: [headCols],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: { top: 1.5, bottom: 1.5, left: 3, right: 3 } },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    // --- TABELA DE RESUMO ---
    const finalY = doc.lastAutoTable.finalY + 15;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('Resumo por Variedade', 14, finalY);

    const resumoBody = Object.entries(resumoVariedades)
      .sort((a, b) => b[1].area - a[1].area)
      .map(([nome, dados]) => {
        const linha = [nome, `${dados.area.toLocaleString('pt-BR')} ha`];
        if (incluirSementes) {
          linha.push(dados.embalagens > 0 ? `${formatSementes(dados.embalagens)} ${dados.tipoEmb}` : '-');
        }
        return linha;
      });

    // Adicionar linha de total geral
    const linhaTotal = ['TOTAL GERAL', `${areaTotalGeral.toLocaleString('pt-BR')} ha`];
    if (incluirSementes) {
      const totalSementes = Object.values(resumoVariedades).reduce((acc, curr) => acc + curr.embalagens, 0);
      linhaTotal.push(totalSementes > 0 ? formatSementes(totalSementes) : '-');
    }
    resumoBody.push(linhaTotal);

    const resumoHead = ['Variedade', 'Área Total'];
    if (incluirSementes) resumoHead.push('Total de Sementes');

autoTable(doc, {
      startY: finalY + 5,
      margin: { bottom: 40 }, // NOVO: Protege o espaço do rodapé
      head: [resumoHead],
      body: resumoBody,
      theme: 'grid',
      headStyles: { fillColor: [52, 73, 94], textColor: 255 },
     styles: { fontSize: 9, cellPadding: { top: 1.5, bottom: 1.5, left: 3, right: 3 } },
      willDrawCell: function (data) {
        // Destacar a última linha (Total Geral)
        if (data.row.index === resumoBody.length - 1) {
          doc.setFillColor(230, 235, 240);
          doc.setFont('helvetica', 'bold');
        }
      },
    });

// --- ASSINATURAS (FIXAS NO RODAPÉ DA FOLHA) ---
    const signY = pageHeight - 25; // Exatamente a 25 milímetros do fim da página

    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    
    // Assinatura 1
    doc.line(30, signY, 90, signY);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Elaborado por', 60, signY + 6, { align: 'center' });

    // Assinatura 2
    doc.line(120, signY, 180, signY);
    doc.text('Aprovado por', 150, signY + 6, { align: 'center' });

    // Salvar PDF
    doc.save(`Variedades_${culturaNome.replace(/\s+/g, '_')}.pdf`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border-t-8 border-gray-800" onClick={e => e.stopPropagation()}>
        
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-gray-800 text-xl flex items-center gap-2">
            <FileText className="text-gray-600" size={24}/> Exportar Relatório
          </h3>
          <button onClick={onClose} className="bg-gray-100 text-gray-400 p-2 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors">
            <X size={20}/>
          </button>
        </div>

        <div className="mb-6 space-y-4 text-gray-600">
          <p className="text-sm">Personalize as informações que aparecerão no relatório final em PDF para a diretoria da <strong>Larangeira Mendes S/A</strong>.</p>
          
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Colunas Opcionais</h4>
            
            <div 
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => setIncluirTaxa(!incluirTaxa)}
            >
              <div className="transition-transform group-hover:scale-110">
                {incluirTaxa ? <CheckSquare className="text-blue-600" size={20} /> : <Square className="text-gray-400" size={20} />}
              </div>
              <span className={`font-semibold text-sm ${incluirTaxa ? 'text-gray-800' : 'text-gray-500'}`}>Incluir Taxa de Plantio</span>
            </div>

           <div 
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => setIncluirSementes(!incluirSementes)}
            >
              <div className="transition-transform group-hover:scale-110">
                {incluirSementes ? <CheckSquare className="text-blue-600" size={20} /> : <Square className="text-gray-400" size={20} />}
              </div>
              <span className={`font-semibold text-sm ${incluirSementes ? 'text-gray-800' : 'text-gray-500'}`}>Incluir Quantidade de Sementes (Bags/Sacas)</span>
            </div>

            {/* Checkbox embutido que só aparece se as sementes estiverem marcadas */}
            {incluirSementes && (
              <div 
                className="flex items-center gap-3 cursor-pointer group animate-fade-in pl-8"
                onClick={() => setArredondarBags(!arredondarBags)}
              >
                <div className="transition-transform group-hover:scale-110">
                  {arredondarBags ? <CheckSquare className="text-emerald-600" size={18} /> : <Square className="text-gray-300" size={18} />}
                </div>
                <span className={`font-medium text-sm ${arredondarBags ? 'text-gray-800' : 'text-gray-500'}`}>Arredondar valores (Ex: 27,5 para 28)</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-all">
            Cancelar
          </button>
          <button onClick={gerarPDF} className="flex-[2] py-3 bg-gray-800 text-white font-black rounded-xl hover:bg-gray-900 shadow-md transition-all flex items-center justify-center gap-2 active:scale-95">
            <Download size={18} /> Gerar PDF
          </button>
        </div>
      </div>
    </div>
  );
}