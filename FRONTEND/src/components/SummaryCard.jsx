import {
  Scale,
  TrendingUp,
  TrendingDown,
  PiggyBank,
} from 'lucide-react';

import { formatMoney } from '../utils/formatters';

const variants = {
  balance: {
    wrapper: 'border-blue-100 bg-blue-50',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-700',
    amount: 'text-blue-950',
    icon: Scale,
  },
  income: {
    wrapper: 'border-emerald-100 bg-emerald-50',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-700',
    amount: 'text-emerald-950',
    icon: TrendingUp,
  },
  expense: {
    wrapper: 'border-rose-100 bg-rose-50',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-700',
    amount: 'text-rose-950',
    icon: TrendingDown,
  },
  saving: {
    wrapper: 'border-violet-100 bg-violet-50',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-700',
    amount: 'text-violet-950',
    icon: PiggyBank,
  },
};

export default function SummaryCard({ title, amount, subtitle, variant }) {
  const styles = variants[variant] || variants.balance;
  const Icon = styles.icon;
  const formattedAmount =
  typeof amount === 'number'
    ? formatMoney(amount)
    : amount;

  return (
    <article
      className={`
        rounded-2xl
        border
        p-5
        shadow-sm
        transition-all
        duration-300
        ease-out
        hover:-translate-y-1
        hover:scale-[1.03]
        hover:shadow-xl
        ${styles.wrapper}
      `}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">
            {title}
          </h3>

          <p className={`mt-4 text-2xl font-semibold tracking-tight ${styles.amount}`}>
            {formattedAmount}
          </p>

          <p className="mt-1 text-sm leading-5 text-slate-500">
            {subtitle}
          </p>
        </div>

        <div className={`grid h-12 w-12 place-items-center rounded-2xl ${styles.iconBg}`}>
          <Icon className={`h-6 w-6 ${styles.iconColor}`} />
        </div>
      </div>
    </article>
  );
}