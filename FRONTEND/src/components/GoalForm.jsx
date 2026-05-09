import { formatNumberInput, parseMoneyInput } from '../utils/formatters';

export default function GoalForm({
  goal,
  onChange,
  onSubmit,
  submitLabel = 'Guardar meta',
}) {
  const inputClass =
    'h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100';

  const labelClass =
    'text-xs font-semibold uppercase tracking-wide text-slate-500';

  return (
    <form
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6"
      onSubmit={onSubmit}
    >
      <div className="flex flex-col gap-2 xl:col-span-2">
        <label className={labelClass}>Nombre de la meta</label>
        <input
          className={inputClass}
          type="text"
          value={goal.nombre}
          onChange={(e) =>
            onChange({
              ...goal,
              nombre: e.target.value,
            })
          }
          placeholder="Ej: Viaje a Japón"
        />
      </div>

      <div className="flex flex-col gap-2 xl:col-span-2">
        <label className={labelClass}>Monto objetivo</label>
        <input
          className={inputClass}
          type="text"
          inputMode="numeric"
          value={formatNumberInput(goal.monto_objetivo)}
          onChange={(e) =>
            onChange({
              ...goal,
              monto_objetivo: parseMoneyInput(e.target.value),
            })
          }
          placeholder="Ej: 5.000.000"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass}>Fecha inicio</label>
        <input
          className={inputClass}
          type="date"
          value={goal.fecha_inicio}
          onChange={(e) =>
            onChange({
              ...goal,
              fecha_inicio: e.target.value,
            })
          }
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass}>Fecha límite</label>
        <input
          className={inputClass}
          type="date"
          min={goal.fecha_inicio || undefined}
          value={goal.fecha_limite}
          onChange={(e) =>
            onChange({
              ...goal,
              fecha_limite: e.target.value,
            })
          }
        />
      </div>

      <div className="flex flex-col gap-2 md:col-span-2 xl:col-span-5">
        <label className={labelClass}>Descripción</label>
        <input
          className={inputClass}
          type="text"
          value={goal.descripcion}
          onChange={(e) =>
            onChange({
              ...goal,
              descripcion: e.target.value,
            })
          }
          placeholder="Ej: Ahorro para vacaciones"
        />
      </div>

      <div className="flex items-end">
        <button
          className="h-11 w-full rounded-2xl bg-violet-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800"
          type="submit"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}