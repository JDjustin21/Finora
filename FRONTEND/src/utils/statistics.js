export function parseLocalDate(value) {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function isDateInRange(dateValue, startDate, endDate) {
  const date = parseLocalDate(dateValue);

  if (!date) return false;

  const start = startDate ? parseLocalDate(startDate) : null;
  const end = endDate ? parseLocalDate(endDate) : null;

  if (start && date < start) return false;
  if (end && date > end) return false;

  return true;
}

export function getPeriodLabel(dateValue, range) {
  const date = parseLocalDate(dateValue);

  if (!date) return 'Sin fecha';

  if (range === 'Semanal') {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date - firstDayOfYear) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + firstDayOfYear.getDay() + 1) / 7);

    return `Semana ${weekNumber} · ${date.getFullYear()}`;
  }

  if (range === 'Trimestral') {
    const quarter = Math.floor(date.getMonth() / 3) + 1;

    return `T${quarter} · ${date.getFullYear()}`;
  }

  if (range === 'Anual') {
    return String(date.getFullYear());
  }

  return date.toLocaleDateString('es-CO', {
    month: 'short',
    year: 'numeric',
  });
}

export function getPeriodIndex(dateValue, range) {
  const date = parseLocalDate(dateValue);

  if (!date) return 0;

  if (range === 'Semanal') {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date - firstDayOfYear) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + firstDayOfYear.getDay() + 1) / 7);

    return date.getFullYear() * 100 + weekNumber;
  }

  if (range === 'Trimestral') {
    const quarter = Math.floor(date.getMonth() / 3) + 1;

    return date.getFullYear() * 10 + quarter;
  }

  if (range === 'Anual') {
    return date.getFullYear();
  }

  return date.getFullYear() * 12 + date.getMonth();
}

export function buildPeriodData(transactions, range) {
  const grouped = transactions.reduce((acc, transaction) => {
    const periodLabel = getPeriodLabel(transaction.fecha_movimiento, range);
    const periodIndex = getPeriodIndex(transaction.fecha_movimiento, range);

    if (!acc[periodLabel]) {
      acc[periodLabel] = {
        periodo: periodLabel,
        periodIndex,
        ingresos: 0,
        gastos: 0,
        balance: 0,
      };
    }

    const amount = Math.abs(Number(transaction.amount || 0));

    if (transaction.tipoMovimiento === 'INGRESO') {
      acc[periodLabel].ingresos += amount;
    }

    if (transaction.tipoMovimiento === 'GASTO') {
      acc[periodLabel].gastos += amount;
    }

    acc[periodLabel].balance = acc[periodLabel].ingresos - acc[periodLabel].gastos;

    return acc;
  }, {});

  return Object.values(grouped).sort((a, b) => a.periodIndex - b.periodIndex);
}

export function filterTransactionsForStatistics({
  transactions,
  search,
  startDate,
  endDate,
  selectedAccountId,
  normalizeText,
}) {
  const searchValue = normalizeText(search);

  return transactions.filter((transaction) => {
    const matchesSearch =
      !searchValue ||
      normalizeText(transaction.title).includes(searchValue) ||
      normalizeText(transaction.description).includes(searchValue) ||
      normalizeText(transaction.cuentaNombre).includes(searchValue);

    const matchesDate = isDateInRange(
      transaction.fecha_movimiento,
      startDate,
      endDate
    );

    const matchesAccount =
      !selectedAccountId ||
      transaction.id_cuenta === Number(selectedAccountId);

    return matchesSearch && matchesDate && matchesAccount;
  });
}

export function buildAccountBalanceData(accounts, transactions) {
  return accounts.map((account) => {
    const accountTransactions = transactions.filter((transaction) => {
      return transaction.id_cuenta === account.id_cuenta;
    });

    const ingresos = accountTransactions
      .filter((transaction) => transaction.tipoMovimiento === 'INGRESO')
      .reduce((total, transaction) => {
        return total + Math.abs(Number(transaction.amount || 0));
      }, 0);

    const gastos = accountTransactions
      .filter((transaction) => transaction.tipoMovimiento === 'GASTO')
      .reduce((total, transaction) => {
        return total + Math.abs(Number(transaction.amount || 0));
      }, 0);

    const saldoActual = Number(account.saldo_inicial || 0) + ingresos - gastos;

    return {
      id_cuenta: account.id_cuenta,
      nombre: account.nombre,
      saldo_actual: saldoActual,
    };
  });
}