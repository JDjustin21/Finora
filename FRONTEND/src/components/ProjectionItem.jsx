import { formatMoney } from '../utils/formatters';

function getStatusLabel(projection) {
  if (projection.es_para_hoy) return 'Para confirmar hoy';
  if (projection.esta_vencida) return 'Vencida';
  if (projection.estado === 'REPROGRAMADA') return 'Reprogramada';
  if (projection.estado === 'PENDIENTE') return 'Pendiente';
  if (projection.estado === 'CONFIRMADA') return 'Confirmada';
  if (projection.estado === 'RECHAZADA') return 'Rechazada';

  return projection.estado;
}

function getStatusClass(projection) {
  if (projection.es_para_hoy) {
    return 'bg-emerald-50 text-emerald-700';
  }

  if (projection.esta_vencida) {
    return 'bg-amber-50 text-amber-700';
  }

  if (projection.estado === 'CONFIRMADA') {
    return 'bg-blue-50 text-blue-700';
  }

  if (projection.estado === 'RECHAZADA') {
    return 'bg-rose-50 text-rose-700';
  }

  return 'bg-violet-50 text-violet-700';
}

export default function ProjectionItem({
  projection,
  onEdit,
  onConfirm,
  onReject,
}) {
  const isEditable =
    projection.estado === 'PENDIENTE' ||
    projection.estado === 'REPROGRAMADA';

  const isIncome = projection.tipo_movimiento === 'INGRESO';

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-950">
              {projection.categoria_nombre}
            </h3>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                projection
              )}`}
            >
              {getStatusLabel(projection)}
            </span>
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {projection.descripcion || 'Sin descripción'} ·{' '}
            {projection.cuenta_nombre}
          </p>

          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Programada para {projection.fecha_programada}
          </p>
        </div>

        <div className="text-left lg:text-right">
          <p
            className={
              isIncome
                ? 'text-xl font-semibold text-emerald-600'
                : 'text-xl font-semibold text-rose-600'
            }
          >
            {isIncome ? '+ ' : '- '}
            {formatMoney(projection.monto)}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            No afecta tu balance real hasta confirmarse.
          </p>
        </div>
      </div>

      {isEditable && (
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            Confirmar
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
          >
            Editar / cambiar fecha
          </button>

          <button
            type="button"
            onClick={onReject}
            className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            Rechazar
          </button>
        </div>
      )}
    </article>
  );
}