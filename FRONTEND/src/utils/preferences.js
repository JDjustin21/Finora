import {
  getCachedCurrencyRates,
  getCurrencyRates,
} from '../services/currencyService';

export const DEFAULT_PREFERENCES = {
  moneda: 'COP',
  periodoInicio: 'Mensual',
  vistaInicial: 'Transacciones',
  modoCompacto: false,
  mostrarInsights: true,
};

export const DEFAULT_APPEARANCE = {
  tema: 'Claro',
  colorPrincipal: 'Violeta',
  densidad: 'Cómoda',
};

export const ROUTE_BY_INITIAL_VIEW = {
  Transacciones: '/transacciones',
  Cuentas: '/cuentas',
  Metas: '/metas',
  Estadísticas: '/estadisticas',
  Configuración: '/configuracion',
};

export function getStoredPreferences() {
  try {
    const storedPreferences = localStorage.getItem('finora_preferencias');

    if (!storedPreferences) {
      return DEFAULT_PREFERENCES;
    }

    return {
      ...DEFAULT_PREFERENCES,
      ...JSON.parse(storedPreferences),
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function getStoredAppearance() {
  try {
    const storedAppearance = localStorage.getItem('finora_apariencia');

    if (!storedAppearance) {
      return DEFAULT_APPEARANCE;
    }

    return {
      ...DEFAULT_APPEARANCE,
      ...JSON.parse(storedAppearance),
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function savePreferences(preferences) {
  localStorage.setItem(
    'finora_preferencias',
    JSON.stringify({
      ...DEFAULT_PREFERENCES,
      ...preferences,
    })
  );
}

export function saveAppearance(appearance) {
  localStorage.setItem(
    'finora_apariencia',
    JSON.stringify({
      ...DEFAULT_APPEARANCE,
      ...appearance,
    })
  );
}

export function getInitialRouteFromPreferences() {
  const preferences = getStoredPreferences();

  return ROUTE_BY_INITIAL_VIEW[preferences.vistaInicial] || '/transacciones';
}

export function applyAppearanceSettings(appearance, preferences) {
  const safeAppearance = {
    ...DEFAULT_APPEARANCE,
    ...appearance,
  };

  const safePreferences = {
    ...DEFAULT_PREFERENCES,
    ...preferences,
  };

  const root = document.documentElement;

  root.dataset.theme = safeAppearance.tema;
  root.dataset.accent = safeAppearance.colorPrincipal;
  root.dataset.density = safeAppearance.densidad;
  root.dataset.compact = safePreferences.modoCompacto ? 'true' : 'false';
}

export const CURRENCY_CONFIG = {
  COP: {
    label: 'Peso colombiano',
    locale: 'es-CO',
    currency: 'COP',
  },
  USD: {
    label: 'Dólar estadounidense',
    locale: 'en-US',
    currency: 'USD',
  },
  EUR: {
    label: 'Euro',
    locale: 'de-DE',
    currency: 'EUR',
  },
};

export function getSelectedCurrencyConfig() {
  const preferences = getStoredPreferences();
  return CURRENCY_CONFIG[preferences.moneda] || CURRENCY_CONFIG.COP;
}

export function convertFromCOP(value, currencyCode) {
  const safeCurrencyCode = CURRENCY_CONFIG[currencyCode]
    ? currencyCode
    : 'COP';

  const rates = getCachedCurrencyRates();
  const rateFromCOP = rates.rateFromCOP?.[safeCurrencyCode] ?? 1;

  return Number(value || 0) * rateFromCOP;
}