export default function FinancialHealthCard({ score, interpretation, recommendation }) {
  const normalizedScore = Math.max(0, Math.min(Number(score || 0), 100));

  const tone =
    normalizedScore >= 75
      ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
      : normalizedScore >= 50
        ? 'text-amber-700 bg-amber-50 border-amber-100'
        : 'text-rose-700 bg-rose-50 border-rose-100';

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-600">
            Índice Finora
          </p>

          <h2 className="mt-2 text-xl font-semibold text-slate-950">
            Salud financiera
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Este índice resume tu capacidad de ahorro, estabilidad mensual,
            relación ingresos/gastos y avance hacia tus metas.
          </p>
        </div>

        <div className={`rounded-3xl border px-6 py-5 text-center ${tone}`}>
          <p className="text-4xl font-semibold tracking-tight">
            {normalizedScore}
          </p>
          <p className="text-sm font-semibold">/ 100</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-700">Interpretación</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {interpretation}
          </p>
        </div>

        <div className="rounded-2xl bg-violet-50 p-4">
          <p className="text-sm font-semibold text-violet-900">Recomendación</p>
          <p className="mt-2 text-sm leading-6 text-violet-700">
            {recommendation}
          </p>
        </div>
      </div>
    </article>
  );
}