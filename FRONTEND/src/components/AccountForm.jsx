import { formatNumberInput, parseMoneyInput } from '../utils/formatters';
export default function AccountForm({
  account,
  accountTypes,
  onChange,
  onSubmit,
  submitLabel = 'Guardar cuenta',
}) {
  const inputClass =
    'h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100';

  const labelClass = 'text-xs font-semibold uppercase tracking-wide text-slate-500';

  return (
    <form
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5"
      onSubmit={onSubmit}
    >
      <div className="flex flex-col gap-2 xl:col-span-2">
        <label className={labelClass}>Nombre de la cuenta</label>
        <input
          className={inputClass}
          type="text"
          value={account.nombre}
          onChange={(e) =>
            onChange({
              ...account,
              nombre: e.target.value,
            })
          }
          placeholder="Ej: Nequi personal"
        />
      </div>

      <div className="flex flex-col gap-2 xl:col-span-2">
        <label className={labelClass}>Tipo de cuenta</label>
        <select
          className={inputClass}
          value={account.id_tipo_cuenta}
          onChange={(e) =>
            onChange({
              ...account,
              id_tipo_cuenta: e.target.value,
            })
          }
        >
          <option value="">Selecciona un tipo</option>

          {accountTypes.map((type) => (
            <option key={type.id_tipo_cuenta} value={type.id_tipo_cuenta}>
              {type.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass}>Saldo inicial</label>
        <input
            className={inputClass}
            type="text"
            inputMode="numeric"
            value={formatNumberInput(account.saldo_inicial)}
            onChange={(e) =>
                onChange({
                ...account,
                saldo_inicial: parseMoneyInput(e.target.value),
                })
            }
            placeholder="Ej: 150.000"
            />
      </div>

      <div className="flex items-end md:col-span-2 xl:col-span-5">
        <button
          type="submit"
          className="h-11 rounded-2xl bg-violet-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}