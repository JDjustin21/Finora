export const EXPENSE_TYPE_CONFIG = {
  hormiga: {
    key: 'hormiga',
    label: 'Gasto hormiga',
    min: 0.01,
    max: 30000,
    colorClass: 'bg-rose-50 text-rose-700 ring-rose-200',
    description:
      'Gastos pequeños y frecuentes que parecen inofensivos, pero se acumulan con facilidad.',
  },
  cucaracha: {
    key: 'cucaracha',
    label: 'Gasto cucaracha',
    min: 30000.01,
    max: 100000,
    colorClass: 'bg-amber-50 text-amber-700 ring-amber-200',
    description:
      'Gastos medianos que suelen repetirse y pueden afectar tu presupuesto si no se controlan.',
  },
  raton: {
    key: 'raton',
    label: 'Gasto ratón',
    min: 100000.01,
    max: 200000,
    colorClass: 'bg-violet-50 text-violet-700 ring-violet-200',
    description:
      'Gastos grandes que no necesariamente son fijos, pero sí tienen un impacto visible en el dinero disponible.',
  },
  plaga: {
    key: 'plaga',
    label: 'Gasto plaga',
    min: 200000.01,
    max: Infinity,
    colorClass: 'bg-slate-100 text-slate-800 ring-slate-300',
    description:
      'Gastos de alto impacto que pueden comprometer el presupuesto si se repiten o no están planificados.',
  },
};

export function getExpenseType({
  amount,
  transactionType,
  categoryName,
}) {
  const numericAmount = Math.abs(Number(amount || 0));
  const normalizedCategory = String(categoryName || '').trim().toLowerCase();

  if (transactionType !== 'expense') return null;

  // En Finora, los aportes a metas no se clasifican como gasto de consumo.
  if (normalizedCategory.includes('aporte a meta')) return null;

  const values = Object.values(EXPENSE_TYPE_CONFIG);

  return (
    values.find(
      (item) => numericAmount >= item.min && numericAmount <= item.max
    ) || null
  );
}