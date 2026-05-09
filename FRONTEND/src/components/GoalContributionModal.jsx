import { formatMoney, formatNumberInput, parseMoneyInput } from '../utils/formatters';

export default function GoalContributionModal({
  open,
  goal,
  accounts,
  contribution,
  onChange,
  onSubmit,
  onCancel,
}) {
  if (!open || !goal) return null;

  const inputClass =
    'h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100';

  const labelClass =
    'text-xs font-semibold uppercase tracking-wide text-slate-500';

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-600">
            Aportar a meta
          </p>

          <h2 className="mt-2 text-xl font-semibold text-slate-950">
            {goal.nombre}
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            El dinero se descontará de la cuenta seleccionada y quedará
            registrado como aporte a la meta.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Objetivo
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-950">
              {formatMoney(goal.monto_objetivo)}
            </p>
          </div>

          <div className="rounded-2xl bg-violet-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-400">
              Ahorrado
            </p>
            <p className="mt-1 text-sm font-semibold text-violet-950">
              {formatMoney(goal.monto_ahorrado)}
            </p>
          </div>

          <div className="rounded-2xl bg-emerald-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
              Restante
            </p>
            <p className="mt-1 text-sm font-semibold text-emerald-950">
              {formatMoney(goal.monto_restante)}
            </p>
          </div>
        </div>

        <form className="mt-6 grid grid-cols-1 gap-4" onSubmit={onSubmit}>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Cuenta origen</label>
            <select
              className={inputClass}
              value={contribution.id_cuenta}
              onChange={(e) =>
                onChange({
                  ...contribution,
                  id_cuenta: e.target.value,
                })
              }
            >
              <option value="">Selecciona una cuenta</option>

              {accounts.map((account) => (
                <option key={account.id_cuenta} value={account.id_cuenta}>
                  {account.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className={labelClass}>Monto a aportar</label>
            <input
              className={inputClass}
              type="text"
              inputMode="numeric"
              value={formatNumberInput(contribution.monto)}
              onChange={(e) =>
                onChange({
                  ...contribution,
                  monto: parseMoneyInput(e.target.value),
                })
              }
              placeholder="Ej: 50.000"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className={labelClass}>Descripción</label>
            <input
              className={inputClass}
              type="text"
              value={contribution.descripcion}
              onChange={(e) =>
                onChange({
                  ...contribution,
                  descripcion: e.target.value,
                })
              }
              placeholder="Ej: Aporte mensual"
            />
          </div>

          <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              Registrar aporte
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}