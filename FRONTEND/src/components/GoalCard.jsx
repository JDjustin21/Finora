import { formatMoney } from '../utils/formatters';

function getStatusStyles(status) {
  if (status === 'CUMPLIDA') {
    return 'bg-emerald-50 text-emerald-700';
  }

  if (status === 'CANCELADA') {
    return 'bg-slate-100 text-slate-500';
  }

  return 'bg-violet-50 text-violet-700';
}

function formatGoalDate(value) {
  if (!value) return 'Sin fecha';

  return new Date(`${value}T00:00:00`).toLocaleDateString('es-CO', {
    month: 'short',
    year: 'numeric',
  });
}

export default function GoalCard({
  goal,
  onContribute,
  onEdit,
  onDeactivate,
  onActivate,
}) {
  const progress = Number(goal.porcentaje_cumplimiento || 0);
  const safeProgress = Math.min(Math.max(progress, 0), 100);
  const isActive = goal.estado === 'ACTIVA';
  const isCancelled = goal.estado === 'CANCELADA';

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
            <h3 className="truncate text-base font-semibold text-slate-950">
              {goal.nombre}
            </h3>
          </div>

          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
            {goal.descripcion || 'Sin descripción'}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {formatGoalDate(goal.fecha_limite)}
          </span>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyles(
              goal.estado
            )}`}
          >
            {goal.estado}
          </span>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Progreso
          </span>

          <span className="text-sm font-semibold text-violet-700">
            {safeProgress.toFixed(0)}%
          </span>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-violet-600 transition-all"
            style={{ width: `${safeProgress}%` }}
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Objetivo
          </p>
          <p className="mt-1 text-base font-semibold text-slate-950">
            {formatMoney(goal.monto_objetivo)}
          </p>
        </div>

        <div className="rounded-2xl bg-violet-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-400">
            Ahorrado
          </p>
          <p className="mt-1 text-base font-semibold text-violet-950">
            {formatMoney(goal.monto_ahorrado)}
          </p>
        </div>

        <div className="rounded-2xl bg-emerald-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
            Restante
          </p>
          <p className="mt-1 text-base font-semibold text-emerald-950">
            {formatMoney(goal.monto_restante)}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {isActive && (
          <button
            type="button"
            onClick={onContribute}
            className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            + Aportar
          </button>
        )}

        {!isCancelled && (
          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
          >
            Editar
          </button>
        )}

        {isCancelled ? (
          <button
            type="button"
            onClick={onActivate}
            className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            Activar
          </button>
        ) : (
          <button
            type="button"
            onClick={onDeactivate}
            className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            Cancelar
          </button>
        )}
      </div>
    </article>
  );
}