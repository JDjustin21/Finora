import { Link, NavLink } from 'react-router-dom';
import {
  ArrowLeftRight,
  Wallet,
  Target,
  BarChart3,
  Settings,
} from 'lucide-react';

import logo from '../assets/LOGO.png'; 
import logoCollapsed from '../assets/finora-f.png';

const menuItems = [
  {
    label: 'Transacciones',
    path: '/transacciones',
    icon: ArrowLeftRight,
  },
  {
    label: 'Cuentas',
    path: '/cuentas',
    icon: Wallet,
  },
  {
    label: 'Metas',
    path: '/metas',
    icon: Target,
  },
  {
    label: 'Estadísticas',
    path: '/estadisticas',
    icon: BarChart3,
  },
  {
    label: 'Configuración',
    path: '/configuracion',
    icon: Settings,
  },
];

export default function Sidebar({ collapsed }) {
  return (
    <aside
      className={`hidden border-r border-slate-200 bg-white transition-all duration-300 lg:flex lg:flex-col ${collapsed ? 'lg:w-[88px]' : 'lg:w-[280px]'
        }`}
    >
      <div className="flex h-full flex-col gap-8 px-4 py-6">

        {/* Logo principal */}
        <Link
          to="/"
          aria-label="Ir a la página principal de Finora"
          className={`flex items-center rounded-2xl transition hover:opacity-80 focus:outline-none focus:ring-4 focus:ring-violet-100 ${
            collapsed ? 'justify-center' : 'justify-start'
          }`}
        >
          <img
            src={collapsed ? logoCollapsed : logo}
            alt="Finora Finance"
            className={`object-contain transition-all duration-300 ${
              collapsed ? 'h-12 w-12' : 'h-16 w-auto'
            }`}
          />
        </Link>

        <nav className="flex flex-col gap-2">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
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
                <Icon size={20} />

                {!collapsed && (
                  <span className="ml-3 truncate">{item.label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}