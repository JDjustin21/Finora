export default function ExportPanel({
  onExportPDF,
  onExportExcel,
  onExportCSV,
}) {
  const exportOptions = [
    {
      label: 'Exportar PDF',
      description: 'Reporte visual para compartir o guardar.',
      action: onExportPDF,
      className:
        'border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100',
    },
    {
      label: 'Exportar Excel',
      description: 'Archivo editable para análisis financiero.',
      action: onExportExcel,
      className:
        'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
    },
    {
      label: 'Exportar CSV',
      description: 'Movimientos en formato plano y liviano.',
      action: onExportCSV,
      className:
        'border-teal-200 bg-teal-50 text-teal-900 hover:bg-teal-100',
    },
  ];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-600">
          Exportación
        </p>

        <h2 className="text-lg font-semibold text-slate-950">
          Exportar información
        </h2>

        <p className="text-sm leading-6 text-slate-500">
          Descarga tus estadísticas filtradas según la vista actual.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        {exportOptions.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={option.action}
            className={`rounded-2xl border p-4 text-left shadow-sm transition ${option.className}`}
          >
            <p className="text-sm font-semibold">{option.label}</p>

            <p className="mt-1 text-xs leading-5 opacity-80">
              {option.description}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}