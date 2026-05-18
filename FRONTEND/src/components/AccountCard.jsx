import { formatMoney } from '../utils/formatters';

export default function AccountCard({
  account,
  accountTypeName,
  onEdit,
  onDeactivate,
  onActivate,
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
            <h3 className="truncate text-base font-semibold text-slate-950">
              {account.nombre}
            </h3>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            {accountTypeName || 'Sin tipo definido'}
          </p>
        </div>

        <span
          className={
            account.activa
              ? 'rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700'
              : 'rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500'
          }
        >
          {account.activa ? 'Activa' : 'Inactiva'}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Saldo inicial
          </p>

          <p className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
            {formatMoney(account.saldo_inicial)}
          </p>
        </div>

        <div className="rounded-2xl bg-violet-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-400">
            Saldo actual
          </p>

          <p className="mt-1 text-xl font-semibold tracking-tight text-violet-950">
            {formatMoney(account.saldo_actual)}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
        >
          Editar
        </button>

        {account.activa ? (
          <button
            type="button"
            onClick={onDeactivate}
            className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            Desactivar
          </button>
        ) : (
          <button
            type="button"
            onClick={onActivate}
            className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            Activar
          </button>
        )}
      </div>
    </article>
  );
}