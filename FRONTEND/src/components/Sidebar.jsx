import { NavLink } from 'react-router-dom';

const menuItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Transacciones', path: '/transacciones' },
  { label: 'Cuentas', path: '/cuentas' },
  { label: 'Metas', path: '/metas' },
  { label: 'Reportes', path: '/reportes' },
  { label: 'Configuración', path: '/configuracion' },
];

export default function Sidebar({ collapsed }) {
  return (
    <aside
      className={`hidden border-r border-slate-200 bg-white transition-all duration-300 lg:flex lg:flex-col ${
        collapsed ? 'lg:w-[88px]' : 'lg:w-[280px]'
      }`}
    >
      <div className="flex h-full flex-col gap-8 px-4 py-6">
        <div
          className={`flex items-center ${
            collapsed ? 'justify-center' : 'justify-start'
          }`}
        >
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-violet-700 text-3xl font-semibold text-white shadow-lg shadow-violet-200">
            F
          </div>
        </div>

        <nav className="flex flex-col gap-2">
          {menuItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                [
                  'flex h-11 items-center rounded-xl px-3 text-sm font-semibold transition',
                  collapsed ? 'justify-center' : 'justify-start',
                  isActive
                    ? 'bg-violet-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                ].join(' ')
              }
            >
              <span className="text-lg">
                {item.label.charAt(0)}
              </span>

              {!collapsed && (
                <span className="ml-3 truncate">{item.label}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}