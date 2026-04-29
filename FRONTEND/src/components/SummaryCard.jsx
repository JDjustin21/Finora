const variants = {
  balance: {
    wrapper: 'border-blue-100 bg-blue-50',
    dot: 'bg-blue-500',
    amount: 'text-blue-950',
  },
  income: {
    wrapper: 'border-emerald-100 bg-emerald-50',
    dot: 'bg-emerald-500',
    amount: 'text-emerald-950',
  },
  expense: {
    wrapper: 'border-rose-100 bg-rose-50',
    dot: 'bg-rose-500',
    amount: 'text-rose-950',
  },
  saving: {
    wrapper: 'border-violet-100 bg-violet-50',
    dot: 'bg-violet-500',
    amount: 'text-violet-950',
  },
};

export default function SummaryCard({ title, amount, subtitle, variant }) {
  const styles = variants[variant] || variants.balance;

  return (
    <article
      className={`rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${styles.wrapper}`}
    >
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>

      <p className={`mt-4 text-2xl font-semibold tracking-tight ${styles.amount}`}>
        {amount}
      </p>

      <p className="mt-1 text-sm leading-5 text-slate-500">{subtitle}</p>
    </article>
  );
}