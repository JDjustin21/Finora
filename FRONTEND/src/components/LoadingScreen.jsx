import logoCollapsed from '../assets/finora-f.png';

export default function LoadingScreen({
  message = 'Cargando información...',
  fullScreen = false,
  overlay = false,
  size = 'md',
}) {
  const sizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-16 w-16',
    lg: 'h-20 w-20',
  };

  const containerClass = fullScreen
    ? 'fixed inset-0 z-[9999] flex items-center justify-center bg-white/85 backdrop-blur-sm'
    : overlay
      ? 'absolute inset-0 z-50 flex items-center justify-center rounded-3xl bg-white/80 backdrop-blur-sm'
      : 'flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white';

  return (
    <div className={containerClass}>
      <div className="flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="finora-loader-glow flex h-24 w-24 items-center justify-center rounded-full bg-violet-50">
          <img
            src={logoCollapsed}
            alt="Cargando Finora"
            className={`${sizeClasses[size]} finora-loader-logo object-contain`}
          />
        </div>

        <div className="space-y-1">
          <p className="text-sm font-semibold tracking-wide text-slate-800">
            {message}
          </p>
          <p className="text-xs text-slate-500">
            Finora está preparando tu información.
          </p>
        </div>
      </div>
    </div>
  );
}