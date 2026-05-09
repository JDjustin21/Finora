const moneyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export function formatMoney(value) {
  return moneyFormatter.format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) return 'Sin fecha';

  const date = new Date(`${value}T00:00:00`);

  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function getDayLabel(value) {
  if (!value) return 'Sin fecha';

  const today = new Date();
  const date = new Date(`${value}T00:00:00`);

  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const dateOnly = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const diffDays = Math.round(
    (todayOnly - dateOnly) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';

  return date.toLocaleDateString('es-CO', {
    weekday: 'long',
  });
}

export function normalizeText(value) {
  return String(value || '').toLowerCase().trim();
}

export function formatToday() {
  return new Date().toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function parseLocalDate(value) {
  if (!value) return null;

  return new Date(`${value}T00:00:00`);
}

export function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

export function formatNumberInput(value) {
  const digits = onlyDigits(value);

  if (!digits) return '';

  return Number(digits).toLocaleString('es-CO');
}

export function parseMoneyInput(value) {
  const digits = onlyDigits(value);

  return digits ? Number(digits) : 0;
}