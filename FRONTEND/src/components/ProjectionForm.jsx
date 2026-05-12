import {
  formatNumberInput,
  parseMoneyInput,
} from '../utils/formatters';

export default function ProjectionForm({
  projection,
  cuentas,
  categorias,
  onChange,
  onSubmit,
  submitLabel = 'Guardar proyección',
  minDate,
  onOpenCategoryForm,
}) {
  const inputClass =
    'h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100';

  const labelClass =
    'text-xs font-semibold uppercase tracking-wide text-slate-500';

  return (
    <form
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5"
      onSubmit={onSubmit}
    >
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Cuenta</label>
        <select
          className={inputClass}
          value={projection.id_cuenta}
          onChange={(event) =>
            onChange({
              ...projection,
              id_cuenta: event.target.value,
            })
          }
        >
          <option value="">Selecciona una cuenta</option>

          {cuentas.map((cuenta) => (
            <option key={cuenta.id_cuenta} value={cuenta.id_cuenta}>
              {cuenta.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass}>Categoría</label>

        <select
            className={inputClass}
            value={projection.id_categoria}
            onChange={(event) =>
            onChange({
                ...projection,
                id_categoria: event.target.value,
            })
            }
        >
            <option value="">Selecciona una categoría</option>

            {categorias.map((categoria) => (
            <option
                key={categoria.id_categoria}
                value={categoria.id_categoria}
            >
                {categoria.nombre} · {categoria.tipo_movimiento}
            </option>
            ))}
        </select>

        <button
            type="button"
            onClick={onOpenCategoryForm}
            className="w-fit rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-sm ring-1 ring-violet-100 transition hover:bg-violet-50"
        >
            + Nueva categoría
        </button>
        </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass}>Monto proyectado</label>
        <input
          className={inputClass}
          type="text"
          inputMode="numeric"
          value={formatNumberInput(projection.monto)}
          onChange={(event) =>
            onChange({
              ...projection,
              monto: parseMoneyInput(event.target.value),
            })
          }
          placeholder="Ej: 50.000"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass}>Fecha programada</label>
        <input
          className={inputClass}
          type="date"
          min={minDate}
          value={projection.fecha_programada}
          onChange={(event) =>
            onChange({
              ...projection,
              fecha_programada: event.target.value,
            })
          }
        />
      </div>

      <div className="flex flex-col gap-2 md:col-span-2 xl:col-span-1">
        <label className={labelClass}>Descripción</label>
        <input
          className={inputClass}
          type="text"
          value={projection.descripcion}
          onChange={(event) =>
            onChange({
              ...projection,
              descripcion: event.target.value,
            })
          }
          placeholder="Ej: Pago futuro"
        />
      </div>

      <div className="md:col-span-2 xl:col-span-5">
        <button
          type="submit"
          className="rounded-2xl bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}