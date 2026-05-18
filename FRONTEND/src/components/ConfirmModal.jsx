export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  const confirmClass =
    variant === 'danger'
      ? 'bg-rose-600 hover:bg-rose-700'
      : 'bg-violet-700 hover:bg-violet-800';

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div
            className={
              variant === 'danger'
                ? 'grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-600'
                : 'grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-700'
            }
          >
            !
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              {title}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-2xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}