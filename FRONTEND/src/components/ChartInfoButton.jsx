export default function ChartInfoButton({ onClick, label = 'Ver cálculo' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-violet-700 text-sm font-bold text-white shadow-sm transition hover:bg-violet-800"
      title={label}
      aria-label={label}
    >
      ?
    </button>
  );
}