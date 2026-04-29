function formatAmount(amount) {
  const value = Math.abs(amount).toLocaleString('es-CO');
  const prefix = amount >= 0 ? '+ $' : '- $';
  return `${prefix} ${value}`;
}

export default function TransactionItem({
  title,
  description,
  amount,
  date,
  type,
  onEdit,
  onDelete,
}) {
  const isIncome = type === 'income';

  return (
    <article className="group rounded-2xl border border-slate-200/70 bg-white px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h4 className="truncate text-base font-semibold text-slate-900">
            {title}
          </h4>

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