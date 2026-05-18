const CURRENCY_CACHE_KEY = 'finora_currency_rates_cache';
const CURRENCY_CACHE_DURATION_MS = 8 * 60 * 60 * 1000;

const FALLBACK_RATES = {
  source: 'fallback',
  fetchedAt: null,
  expiresAt: null,
  usdCop: 3800,
  usdEur: 0.92,
  rateFromCOP: {
    COP: 1,
    USD: 1 / 3800,
    EUR: 0.92 / 3800,
  },
};

const TRM_DATASET_URL =
  'https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1&$order=vigenciadesde DESC';

const USD_EUR_URL =
  'https://api.frankfurter.dev/v2/rate/USD/EUR';

function now() {
  return Date.now();
}

function isValidNumber(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

function readCurrencyCache() {
  try {
    const storedCache = localStorage.getItem(CURRENCY_CACHE_KEY);

    if (!storedCache) {
      return null;
    }

    const parsedCache = JSON.parse(storedCache);

    if (!parsedCache?.expiresAt || parsedCache.expiresAt < now()) {
      return null;
    }

    if (
      !isValidNumber(parsedCache.usdCop) ||
      !isValidNumber(parsedCache.usdEur)
    ) {
      return null;
    }

    return parsedCache;
  } catch {
    return null;
  }
}

function saveCurrencyCache(rates) {
  try {
    localStorage.setItem(CURRENCY_CACHE_KEY, JSON.stringify(rates));
  } catch {
    /*
      Si localStorage falla por modo privado, permisos o cuota,
      la app puede seguir funcionando con los valores en memoria/fallback.
    */
  }
}

function normalizeTRMValue(rawValue) {
  if (typeof rawValue === 'number') {
    return rawValue;
  }

  if (typeof rawValue !== 'string') {
    return NaN;
  }

  /*
    Datos abiertos puede entregar valores como:
    "3796.78", "3,796.78" o "3.796,78".
    Esta normalización intenta soportar ambos estilos.
  */
  const cleanedValue = rawValue.trim();

  if (cleanedValue.includes(',') && cleanedValue.includes('.')) {
    const lastComma = cleanedValue.lastIndexOf(',');
    const lastDot = cleanedValue.lastIndexOf('.');

    if (lastComma > lastDot) {
      return Number(cleanedValue.replace(/\./g, '').replace(',', '.'));
    }

    return Number(cleanedValue.replace(/,/g, ''));
  }

  if (cleanedValue.includes(',')) {
    return Number(cleanedValue.replace(',', '.'));
  }

  return Number(cleanedValue);
}

async function fetchOfficialTRM() {
  const response = await fetch(TRM_DATASET_URL);

  if (!response.ok) {
    throw new Error('No fue posible obtener la TRM oficial.');
  }

  const data = await response.json();
  const latestTRM = data?.[0];

  const trmValue = normalizeTRMValue(latestTRM?.valor);

  if (!isValidNumber(trmValue)) {
    throw new Error('La TRM recibida no tiene un valor válido.');
  }

  return {
    value: trmValue,
    validFrom: latestTRM?.vigenciadesde || null,
    validTo: latestTRM?.vigenciahasta || null,
  };
}

async function fetchUsdToEurRate() {
  const response = await fetch(USD_EUR_URL);

  if (!response.ok) {
    throw new Error('No fue posible obtener la tasa USD/EUR.');
  }

  const data = await response.json();
  const usdEur = Number(data?.rate);

  if (!isValidNumber(usdEur)) {
    throw new Error('La tasa USD/EUR recibida no es válida.');
  }

  return usdEur;
}

function buildRates({ usdCop, usdEur, source, trmValidFrom, trmValidTo }) {
  const fetchedAt = now();

  return {
    source,
    fetchedAt,
    expiresAt: fetchedAt + CURRENCY_CACHE_DURATION_MS,
    usdCop,
    usdEur,
    trmValidFrom,
    trmValidTo,
    rateFromCOP: {
      COP: 1,
      USD: 1 / usdCop,
      EUR: usdEur / usdCop,
    },
  };
}

export async function getCurrencyRates({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cachedRates = readCurrencyCache();

    if (cachedRates) {
      return cachedRates;
    }
  }

  try {
    const [trm, usdEur] = await Promise.all([
      fetchOfficialTRM(),
      fetchUsdToEurRate(),
    ]);

    const rates = buildRates({
      usdCop: trm.value,
      usdEur,
      source: 'api',
      trmValidFrom: trm.validFrom,
      trmValidTo: trm.validTo,
    });

    saveCurrencyCache(rates);

    return rates;
  } catch (error) {
    console.warn('Finora usará tasas fallback:', error);

    const fallbackRates = buildRates({
      usdCop: FALLBACK_RATES.usdCop,
      usdEur: FALLBACK_RATES.usdEur,
      source: 'fallback',
      trmValidFrom: null,
      trmValidTo: null,
    });

    return fallbackRates;
  }
}

export function getCachedCurrencyRates() {
  return readCurrencyCache() || FALLBACK_RATES;
}

export async function preloadCurrencyRates() {
  return getCurrencyRates();
}