import { getExpenseType } from '../utils/expenseTypes';

function MinimalAntIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="8" cy="8" r="2" />
      <circle cx="12" cy="12" r="2.4" />
      <circle cx="16" cy="17" r="3" />
      <path d="M6 6 4 4M10 6l1-3M6 10l-3 1M10 10l-2 2M14 10l2-2M14 14l3 1M10 14l-2 3M14 14l1 4M18 14l3-1M18 17l3 2" />
    </svg>
  );
}

function MinimalMouseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 9a4 4 0 1 1 8 0v6a4 4 0 0 1-8 0V9Z" />
      <path d="M12 5c0-1.2.8-2 2-2s2 .8 2 2" />
      <path d="M16 16c2 .5 3.5 2 4 4" />
    </svg>
  );
}

function MinimalCockroachIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <ellipse cx="12" cy="7" rx="2.5" ry="2.5" />
      <ellipse cx="12" cy="13" rx="3.2" ry="4.3" />
      <path d="M10 5 7 2M14 5l3-3M8.5 10 5 8M15.5 10 19 8M8.5 14 5 16M15.5 14 19 16M10.5 18 8 21M13.5 18 16 21" />
    </svg>
  );
}

function getIcon(key) {
  if (key === 'hormiga') return <MinimalAntIcon />;
  if (key === 'cucaracha') return <MinimalCockroachIcon />;
  if (key === 'raton') return <MinimalMouseIcon />;
  if (key === 'plaga') return <MinimalAntIcon />;
  return null;
}

export default function ExpenseBadge({
  amount,
  transactionType,
  categoryName,
}) {
  const expenseType = getExpenseType({
    amount,
    transactionType,
    categoryName,
  });

  if (!expenseType) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${expenseType.colorClass}`}
      title={expenseType.label}
    >
      {getIcon(expenseType.key)}
      <span>{expenseType.label}</span>
    </span>
  );
}