export default function Header({
  userName,
  searchValue,
  onSearchChange,
  placeholder,
  onLogout,
  onToggleSidebar,
}) {
  const safeUserName = userName || 'Usuario';

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-slate-50/80 px-4 py-4 backdrop-blur-xl lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100"
          aria-label="Mostrar u ocultar menú"
        >
          ☰
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
          <span className="text-slate-400">⌕</span>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
        </div>

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="hidden rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800 sm:inline-flex"
          >
            Salir
          </button>
        )}

        <button
          type="button"
          className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm transition hover:bg-slate-100 sm:inline-flex"
          aria-label="Notificaciones"
        >
          🔔
        </button>

        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-violet-700 text-sm font-semibold text-white shadow-sm">
            {safeUserName.charAt(0).toUpperCase()}
          </div>

          <span className="hidden max-w-[140px] truncate text-sm font-semibold text-slate-700 md:block">
            {safeUserName}
          </span>
        </div>
      </div>
    </header>
  );
}