import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
} from 'lucide-react';


export default function StatCard({
  title,
  value,
  subtitle,
  trend,
  tone = 'violet',
  icon = '•',
}) {
  const tones = {
    violet: {
      card: 'border-violet-100 bg-violet-50',
      icon: 'bg-violet-600 text-white',
      value: 'text-violet-950',
    },
    emerald: {
      card: 'border-emerald-100 bg-emerald-50',
      icon: 'bg-emerald-600 text-white',
      value: 'text-emerald-950',
    },
    rose: {
      card: 'border-rose-100 bg-rose-50',
      icon: 'bg-rose-600 text-white',
      value: 'text-rose-950',
    },
    blue: {
      card: 'border-blue-100 bg-blue-50',
      icon: 'bg-blue-600 text-white',
      value: 'text-blue-950',
    },
    amber: {
      card: 'border-amber-100 bg-amber-50',
      icon: 'bg-amber-500 text-white',
      value: 'text-amber-950',
    },
  };

  const selectedTone = tones[tone] || tones.violet;

  const icons = {
    '↑': TrendingUp,
    '↓': TrendingDown,
    '=': Wallet,
    '★': PiggyBank,
  };

  const IconComponent = icons[icon];

  return (
    <article
      className={`
        rounded-3xl
        border
        p-5
        shadow-sm
        transition-all
        duration-300
        hover:-translate-y-1
        hover:scale-[1.03]
        hover:shadow-xl
        ${selectedTone.card}
      `}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-600">{title}</p>

          <p className={`mt-3 text-2xl font-semibold tracking-tight ${selectedTone.value}`}>
            {value}
          </p>
        </div>

        <div className={`grid h-11 w-11 place-items-center rounded-2xl ${selectedTone.icon}`}>
          {IconComponent && <IconComponent size={22} />}
        </div>
      </div>

      <p className="mt-3 text-sm leading-5 text-slate-500">
        {subtitle}
      </p>

      {trend && (
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {trend}
        </p>
      )}
    </article>
  );
}