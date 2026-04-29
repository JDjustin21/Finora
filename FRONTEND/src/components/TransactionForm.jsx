export default function TransactionForm({
  transaction,
  cuentas,
  categorias,
  onChange,
  onSubmit,
  submitLabel = 'Guardar transacción',
  maxDate,
}) {
  const inputClass =
    'h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100';

  const labelClass = 'text-xs font-semibold uppercase tracking-wide text-slate-500';

  return (
    <form
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6"
      onSubmit={onSubmit}
    >
      <div className="flex flex-col gap-2 xl:col-span-2">
        <label className={labelClass}>Cuenta</label>
        <select
          className={inputClass}
          value={transaction.id_cuenta}
          onChange={(e) =>
            onChange({
              ...transaction,
              id_cuenta: e.target.value,
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

      <div className="flex flex-col gap-2 xl:col-span-2">
        <label className={labelClass}>Categoría</label>
        <select
          className={inputClass}
          value={transaction.id_categoria}
          onChange={(e) =>
            onChange({
              ...transaction,
              id_categoria: e.target.value,
            })
          }
        >
          <option value="">Selecciona una categoría</option>

          {categorias.map((categoria) => (
            <option key={categoria.id_categoria} value={categoria.id_categoria}>
              {categoria.nombre} - {categoria.tipo_movimiento}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass}>Monto</label>
        <input
          className={inputClass}
          type="number"
          min="1"
          step="0.01"
          value={transaction.monto}
          onChange={(e) =>
            onChange({
              ...transaction,
              monto: e.target.value,
            })
          }
          placeholder="Ej: 50000"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass}>Fecha</label>
        <input
          className={inputClass}
          type="date"
          max={maxDate}
          value={transaction.fecha_movimiento}
          onChange={(e) =>
            onChange({
              ...transaction,
              fecha_movimiento: e.target.value,
            })
          }
        />
      </div>

      <div className="flex flex-col gap-2 md:col-span-2 xl:col-span-5">
        <label className={labelClass}>Descripción</label>
        <input
          className={inputClass}
          type="text"
          value={transaction.descripcion}
          onChange={(e) =>
            onChange({
              ...transaction,
              descripcion: e.target.value,
            })
          }
          placeholder="Ej: Pago de transporte"
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