import { useState } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format as formatDate } from 'date-fns';
import { useSupabaseData } from './useSupabaseData';

export function useReports() {
  const [isGenerating, setIsGenerating] = useState(false);
  const { receitas, despesas, calcularDadosFinanceiros } = useSupabaseData();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getCategoriaReceitaLabel = (categoria: string) => {
    const labels = {
      servico_prestado: 'Serviço Prestado',
      atendimento: 'Atendimento',
      consultoria: 'Consultoria',
      curso: 'Curso',
      produto: 'Produto',
      outros: 'Outros'
    };
    return labels[categoria as keyof typeof labels] || categoria;
  };

  const getCategoriaDespesaLabel = (categoria: string) => {
    const labels = {
      aluguel: 'Aluguel',
      internet: 'Internet',
      marketing: 'Marketing',
      equipamentos: 'Equipamentos',
      transporte: 'Transporte',
      alimentacao: 'Alimentação',
      sistema: 'Sistema',
      aplicativos: 'Aplicativos',
      servico_contratado: 'Serviço Contratado',
      outros: 'Outros'
    };
    return labels[categoria as keyof typeof labels] || categoria;
  };

  const filterDataByPeriod = (data: any[], startDate: Date, endDate: Date) => {
    return data.filter(item => {
      const itemDate = new Date(item.data);
      return itemDate >= startDate && itemDate <= endDate;
    });
  };

  // Relatório de Extrato Completo
  const generateExtratoCompleto = async (startDate: Date, endDate: Date, format: 'excel' | 'pdf') => {
    setIsGenerating(true);
    try {
      const receitasFiltradas = filterDataByPeriod(receitas, startDate, endDate);
      const despesasFiltradas = filterDataByPeriod(despesas, startDate, endDate);

      const dados = [
        ...receitasFiltradas.map(r => ({
          data: new Date(r.data).toLocaleDateString('pt-BR'),
          tipo: 'Receita',
          descricao: r.descricao,
          categoria: getCategoriaReceitaLabel(r.categoria),
          valor: Number(r.valor)
        })),
        ...despesasFiltradas.map(d => ({
          data: new Date(d.data).toLocaleDateString('pt-BR'),
          tipo: 'Despesa',
          descricao: d.descricao,
          categoria: getCategoriaDespesaLabel(d.categoria),
          valor: -Number(d.valor)
        }))
      ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

      if (format === 'excel') {
        const ws = XLSX.utils.json_to_sheet(dados.map(item => ({
          Data: item.data,
          Tipo: item.tipo,
          Descrição: item.descricao,
          Categoria: item.categoria,
          Valor: formatCurrency(item.valor)
        })));
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Extrato Completo');
        XLSX.writeFile(wb, `extrato-completo-${formatDate(startDate, 'yyyy-MM-dd')}-${formatDate(endDate, 'yyyy-MM-dd')}.xlsx`);
      } else {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text('Extrato Completo', 14, 22);
        doc.setFontSize(12);
        doc.text(`Período: ${formatDate(startDate, 'dd/MM/yyyy')} a ${formatDate(endDate, 'dd/MM/yyyy')}`, 14, 32);

        autoTable(doc, {
          startY: 40,
          head: [['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor']],
          body: dados.map(item => [
            item.data,
            item.tipo,
            item.descricao,
            item.categoria,
            formatCurrency(item.valor)
          ]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [66, 139, 202] }
        });

        doc.save(`extrato-completo-${formatDate(startDate, 'yyyy-MM-dd')}-${formatDate(endDate, 'yyyy-MM-dd')}.pdf`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Relatório de Lucro Líquido Mensal
  const generateLucroMensal = async (year: number, format: 'excel' | 'pdf') => {
    setIsGenerating(true);
    try {
      const dadosFinanceiros = calcularDadosFinanceiros();
      const mesesData = dadosFinanceiros.historicoMensal.map(item => ({
        mes: item.mes,
        receitas: item.realizado || item.faturamento || 0,
        despesas: item.despesas,
        lucro: (item.realizado || item.faturamento || 0) - item.despesas
      }));

      if (format === 'excel') {
        const ws = XLSX.utils.json_to_sheet(mesesData.map(item => ({
          Mês: item.mes,
          Receitas: formatCurrency(item.receitas),
          Despesas: formatCurrency(item.despesas),
          'Lucro Líquido': formatCurrency(item.lucro)
        })));
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Lucro Mensal');
        XLSX.writeFile(wb, `lucro-mensal-${year}.xlsx`);
      } else {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text('Relatório de Lucro Líquido Mensal', 14, 22);
        doc.setFontSize(12);
        doc.text(`Ano: ${year}`, 14, 32);

        autoTable(doc, {
          startY: 40,
          head: [['Mês', 'Receitas', 'Despesas', 'Lucro Líquido']],
          body: mesesData.map(item => [
            item.mes,
            formatCurrency(item.receitas),
            formatCurrency(item.despesas),
            formatCurrency(item.lucro)
          ]),
          styles: { fontSize: 10 },
          headStyles: { fillColor: [66, 139, 202] }
        });

        doc.save(`lucro-mensal-${year}.pdf`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Relatório Analítico de Categorias
  const generateAnaliticoCategorias = async (startDate: Date, endDate: Date, format: 'excel' | 'pdf') => {
    setIsGenerating(true);
    try {
      const receitasFiltradas = filterDataByPeriod(receitas, startDate, endDate);
      const despesasFiltradas = filterDataByPeriod(despesas, startDate, endDate);

      // Agrupar receitas por categoria
      const receitasPorCategoria = receitasFiltradas.reduce((acc, receita) => {
        const categoria = getCategoriaReceitaLabel(receita.categoria);
        acc[categoria] = (acc[categoria] || 0) + Number(receita.valor);
        return acc;
      }, {} as Record<string, number>);

      // Agrupar despesas por categoria
      const despesasPorCategoria = despesasFiltradas.reduce((acc, despesa) => {
        const categoria = getCategoriaDespesaLabel(despesa.categoria);
        acc[categoria] = (acc[categoria] || 0) + Number(despesa.valor);
        return acc;
      }, {} as Record<string, number>);

      const dadosReceitas: Array<{tipo: string, categoria: string, valor: number}> = Object.entries(receitasPorCategoria).map(([categoria, valor]) => ({
        tipo: 'Receita',
        categoria,
        valor: Number(valor)
      }));

      const dadosDespesas: Array<{tipo: string, categoria: string, valor: number}> = Object.entries(despesasPorCategoria).map(([categoria, valor]) => ({
        tipo: 'Despesa',
        categoria,
        valor: Number(valor)
      }));

      const dados = [...dadosReceitas, ...dadosDespesas];

      if (format === 'excel') {
        const ws = XLSX.utils.json_to_sheet(dados.map(item => ({
          Tipo: item.tipo,
          Categoria: item.categoria,
          Valor: formatCurrency(item.valor)
        })));
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Análise por Categorias');
        XLSX.writeFile(wb, `analise-categorias-${formatDate(startDate, 'yyyy-MM-dd')}-${formatDate(endDate, 'yyyy-MM-dd')}.xlsx`);
      } else {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text('Relatório Analítico de Categorias', 14, 22);
        doc.setFontSize(12);
        doc.text(`Período: ${formatDate(startDate, 'dd/MM/yyyy')} a ${formatDate(endDate, 'dd/MM/yyyy')}`, 14, 32);

        autoTable(doc, {
          startY: 40,
          head: [['Tipo', 'Categoria', 'Valor']],
          body: dados.map(item => [
            item.tipo,
            item.categoria,
            formatCurrency(item.valor)
          ]),
          styles: { fontSize: 10 },
          headStyles: { fillColor: [66, 139, 202] }
        });

        doc.save(`analise-categorias-${formatDate(startDate, 'yyyy-MM-dd')}-${formatDate(endDate, 'yyyy-MM-dd')}.pdf`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Relatório para Contadores
  const generateRelatorioContador = async (month: number, year: number, format: 'excel' | 'pdf') => {
    setIsGenerating(true);
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      
      const receitasFiltradas = filterDataByPeriod(receitas, startDate, endDate);
      const despesasFiltradas = filterDataByPeriod(despesas, startDate, endDate);

      const totalReceitas = receitasFiltradas.reduce((sum, r) => sum + Number(r.valor), 0);
      const totalDespesas = despesasFiltradas.reduce((sum, d) => sum + Number(d.valor), 0);
      const lucroLiquido = totalReceitas - totalDespesas;

      const dados = [
        { categoria: 'RECEITAS', valor: totalReceitas },
        ...Object.entries(receitasFiltradas.reduce((acc, r) => {
          const cat = getCategoriaReceitaLabel(r.categoria);
          acc[cat] = (acc[cat] || 0) + Number(r.valor);
          return acc;
        }, {} as Record<string, number>)).map(([cat, val]) => ({ categoria: `  ${cat}`, valor: val })),
        { categoria: '', valor: 0 }, // linha em branco
        { categoria: 'DESPESAS', valor: totalDespesas },
        ...Object.entries(despesasFiltradas.reduce((acc, d) => {
          const cat = getCategoriaDespesaLabel(d.categoria);
          acc[cat] = (acc[cat] || 0) + Number(d.valor);
          return acc;
        }, {} as Record<string, number>)).map(([cat, val]) => ({ categoria: `  ${cat}`, valor: val })),
        { categoria: '', valor: 0 }, // linha em branco
        { categoria: 'LUCRO LÍQUIDO', valor: lucroLiquido }
      ];

      if (format === 'excel') {
        const ws = XLSX.utils.json_to_sheet(dados.map(item => ({
          Categoria: item.categoria,
          Valor: item.categoria === '' ? '' : formatCurrency(item.valor)
        })));
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Relatório Contador');
        XLSX.writeFile(wb, `relatorio-contador-${month.toString().padStart(2, '0')}-${year}.xlsx`);
      } else {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text('Relatório para Contador', 14, 22);
        doc.setFontSize(12);
        doc.text(`Mês: ${month.toString().padStart(2, '0')}/${year}`, 14, 32);

        autoTable(doc, {
          startY: 40,
          head: [['Categoria', 'Valor']],
          body: dados.map(item => [
            item.categoria,
            item.categoria === '' ? '' : formatCurrency(item.valor)
          ]),
          styles: { fontSize: 10 },
          headStyles: { fillColor: [66, 139, 202] }
        });

        doc.save(`relatorio-contador-${month.toString().padStart(2, '0')}-${year}.pdf`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    isGenerating,
    generateExtratoCompleto,
    generateLucroMensal,
    generateAnaliticoCategorias,
    generateRelatorioContador
  };
}