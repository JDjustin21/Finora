import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function buildTransactionRows(transactions) {
  return transactions.map((transaction) => ({
    Fecha: transaction.fecha_movimiento,
    Cuenta: transaction.cuentaNombre,
    Categoria: transaction.title,
    Tipo: transaction.tipoMovimiento,
    Descripcion: transaction.description,
    Monto: Math.abs(Number(transaction.amount || 0)),
  }));
}

export function exportStatisticsToCSV({ transactions, filename = 'finora-estadisticas.csv' }) {
  const rows = buildTransactionRows(transactions);

  const headers = Object.keys(rows[0] || {
    Fecha: '',
    Cuenta: '',
    Categoria: '',
    Tipo: '',
    Descripcion: '',
    Monto: '',
  });

  const csvRows = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = String(row[header] ?? '').replace(/"/g, '""');
          return `"${value}"`;
        })
        .join(',')
    ),
  ];

  downloadBlob(csvRows.join('\n'), filename, 'text/csv;charset=utf-8;');
}

export function exportStatisticsToExcel({
  transactions,
  summary,
  filename = 'finora-estadisticas.xlsx',
}) {
  const workbook = XLSX.utils.book_new();

  const summaryRows = [
    { Indicador: 'Ingresos totales', Valor: summary.totalIncome },
    { Indicador: 'Gastos totales', Valor: summary.totalExpenses },
    { Indicador: 'Balance neto', Valor: summary.netBalance },
    { Indicador: 'Ahorro acumulado', Valor: summary.totalSavedGoals },
    { Indicador: 'Porcentaje de ahorro', Valor: summary.savingPercent },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  const transactionsSheet = XLSX.utils.json_to_sheet(
    buildTransactionRows(transactions)
  );

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');
  XLSX.utils.book_append_sheet(workbook, transactionsSheet, 'Movimientos');

  XLSX.writeFile(workbook, filename);
}

export function exportStatisticsToPDF({
  transactions,
  summary,
  accountName,
  filename = 'finora-estadisticas.pdf',
}) {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('Finora - Reporte de estadísticas', 14, 18);

  doc.setFontSize(10);
  doc.text(`Vista: ${accountName || 'Todas las cuentas'}`, 14, 27);

  autoTable(doc, {
    startY: 35,
    head: [['Indicador', 'Valor']],
    body: [
      ['Ingresos totales', summary.totalIncome],
      ['Gastos totales', summary.totalExpenses],
      ['Balance neto', summary.netBalance],
      ['Ahorro acumulado', summary.totalSavedGoals],
      ['Porcentaje de ahorro', `${Number(summary.savingPercent || 0).toFixed(1)}%`],
    ],
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    head: [['Fecha', 'Cuenta', 'Categoría', 'Tipo', 'Monto']],
    body: buildTransactionRows(transactions).map((row) => [
      row.Fecha,
      row.Cuenta,
      row.Categoria,
      row.Tipo,
      row.Monto,
    ]),
  });

  doc.save(filename);
}