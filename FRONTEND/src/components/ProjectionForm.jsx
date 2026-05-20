import {
  formatNumberInput,
  parseMoneyInput,
} from '../utils/formatters';
import ScrollableSelect from './ScrollableSelect';

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
        <ScrollableSelect
          value={projection.id_cuenta}
          options={cuentas}
          placeholder="Selecciona una cuenta"
          emptyMessage="No hay cuentas disponibles"
          searchPlaceholder="Buscar cuenta..."
          getOptionValue={(cuenta) => cuenta.id_cuenta}
          getOptionLabel={(cuenta) => cuenta.nombre}
          onChange={(idCuenta) =>
            onChange({
              ...projection,
              id_cuenta: idCuenta,
            })
          }
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass}>Categoría</label>

        <ScrollableSelect
          value={projection.id_categoria}
          options={categorias}
          placeholder="Selecciona una categoría"
          emptyMessage="No hay categorías disponibles"
          searchPlaceholder="Buscar categoría..."
          getOptionValue={(categoria) => categoria.id_categoria}
          getOptionLabel={(categoria) =>
            `${categoria.nombre} · ${categoria.tipo_movimiento}`
          }
          onChange={(idCategoria) =>
            onChange({
              ...projection,
              id_categoria: idCategoria,
            })
          }
        />

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