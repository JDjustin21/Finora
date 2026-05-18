import ExpenseBadge from './ExpenseBadge';
import { formatMoney } from '../utils/formatters';

function formatAmount(amount) {
  const numericAmount = Number(amount || 0);
  const prefix = numericAmount >= 0 ? '+' : '-';

  return `${prefix} ${formatMoney(Math.abs(numericAmount))}`;
}

export default function TransactionItem({
  title,
  description,
  amount,
  date,
  type,
  categoryName,
  onEdit,
  onDelete,
}) {

  const isIncome = type === 'income';

  return (
    <article className="group rounded-2xl border border-slate-200/70 bg-white px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-950">
              {title}
            </h3>

            <ExpenseBadge
              amount={amount}
              transactionType={type}
              categoryName={categoryName || title}
            />
          </div>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            {description}
          </p>

          <span className="mt-2 block text-xs font-medium text-slate-400">
            {date}
          </span>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
          <span
            className={
              isIncome
                ? 'text-base font-semibold text-emerald-600'
                : 'text-base font-semibold text-rose-700'
            }
          >
            {formatAmount(amount)}
          </span>

          <div className="flex items-center gap-2 opacity-100 sm:opacity-80 sm:transition group-hover:opacity-100">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
            >
              Editar
            </button>

            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}