export default function ProjectionSummaryCard({
  title,
  value,
  subtitle,
  tone = 'violet',
}) {
  const tones = {
    violet: 'border-violet-200 bg-violet-50 text-violet-950',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    rose: 'border-rose-200 bg-rose-50 text-rose-950',
    blue: 'border-blue-200 bg-blue-50 text-blue-950',
  };

  return (
    <article
      className={`rounded-3xl border border-dashed p-5 shadow-sm ${
        tones[tone] || tones.violet
      }`}
    >
      <p className="text-sm font-semibold text-slate-600">{title}</p>

      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>

      <p className="mt-2 text-sm leading-5 text-slate-500">{subtitle}</p>
    </article>
  );
}