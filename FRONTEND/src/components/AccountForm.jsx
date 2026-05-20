import { formatNumberInput, parseMoneyInput } from '../utils/formatters';
import ScrollableSelect from './ScrollableSelect';

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

        <ScrollableSelect
          value={account.id_tipo_cuenta}
          options={accountTypes}
          placeholder="Selecciona un tipo"
          emptyMessage="No hay tipos de cuenta disponibles"
          searchPlaceholder="Buscar tipo de cuenta..."
          getOptionValue={(type) => type.id_tipo_cuenta}
          getOptionLabel={(type) => type.nombre}
          onChange={(idTipoCuenta) =>
            onChange({
              ...account,
              id_tipo_cuenta: idTipoCuenta,
            })
          }
        />
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