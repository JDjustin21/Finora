import { useState } from 'react';

export default function Header({
  userName,
  searchValue,
  onSearchChange,
  placeholder,
  onLogout,
  onToggleSidebar,
  notifications = [],
  onNotificationClick,
}) {
  const [showNotifications, setShowNotifications] = useState(false);

  const notificationCount = notifications.length;
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

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications((value) => !value)}
            className="relative grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-white text-sm shadow-sm transition hover:bg-slate-100"
            aria-label="Notificaciones"
          >
            🔔

            {notificationCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                {notificationCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-14 z-50 w-80 rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    Notificaciones
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Proyecciones pendientes por revisar.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowNotifications(false)}
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  Cerrar
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {notificationCount > 0 ? (
                  notifications.slice(0, 5).map((notification) => (
                    <button
                      key={notification.id_proyeccion}
                      type="button"
                      onClick={() => {
                        setShowNotifications(false);
                        onNotificationClick?.(notification);
                      }}
                      className="w-full rounded-2xl bg-slate-50 px-3 py-3 text-left transition hover:bg-violet-50"
                    >
                      <p className="text-sm font-semibold text-slate-800">
                        {notification.categoria_nombre}
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {notification.esta_vencida
                          ? 'Esta proyección está vencida.'
                          : 'Esta proyección está programada para hoy.'}
                      </p>

                      <p className="mt-1 text-xs font-semibold text-violet-700">
                        Revisar proyección
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl bg-slate-50 px-3 py-4 text-center">
                    <p className="text-sm font-medium text-slate-400">
                      No tienes notificaciones pendientes.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

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