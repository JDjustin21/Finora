import { formatDate, formatMoney, getDayLabel, parseLocalDate } from './formatters';

export function getInitialTransaction(cuentas = [], categorias = []) {
  return {
    id_cuenta: cuentas[0]?.id_cuenta || '',
    id_categoria: categorias[0]?.id_categoria || '',
    monto: '',
    fecha_movimiento: new Date().toISOString().slice(0, 10),
    descripcion: '',
  };
}

export function buildMap(rows, keyName) {
  return rows.reduce((acc, row) => {
    acc[row[keyName]] = row;
    return acc;
  }, {});
}

export function normalizeUserTransactions({
  transacciones,
  cuentas,
  categoriasMap,
  cuentasMap,
}) {
  const cuentasIds = new Set(cuentas.map((cuenta) => cuenta.id_cuenta));

  return transacciones
    .filter((transaccion) => cuentasIds.has(transaccion.id_cuenta))
    .map((transaccion) => {
      const categoria = categoriasMap[transaccion.id_categoria];
      const cuenta = cuentasMap[transaccion.id_cuenta];

      const tipoMovimiento = categoria?.tipo_movimiento || 'GASTO';
      const monto = Number(transaccion.monto || 0);

      return {
        ...transaccion,
        title: categoria?.nombre || 'Sin categoría',
        description: transaccion.descripcion || 'Sin descripción',
        date: formatDate(transaccion.fecha_movimiento),
        dayLabel: getDayLabel(transaccion.fecha_movimiento),
        amount: tipoMovimiento === 'INGRESO' ? monto : -monto,
        type: tipoMovimiento === 'INGRESO' ? 'income' : 'expense',
        cuentaNombre: cuenta?.nombre || 'Sin cuenta',
        tipoMovimiento,
      };
    })
    .sort((a, b) => {
      return new Date(b.fecha_movimiento) - new Date(a.fecha_movimiento);
    });
}

export function buildSummaryData({ transaccionesUsuario, cuentas, metas }) {
  const ingresos = transaccionesUsuario
    .filter((item) => item.tipoMovimiento === 'INGRESO')
    .reduce((total, item) => total + Math.abs(Number(item.amount || 0)), 0);

  const gastos = transaccionesUsuario
    .filter((item) => item.tipoMovimiento === 'GASTO')
    .reduce((total, item) => total + Math.abs(Number(item.amount || 0)), 0);

  const saldoInicial = cuentas.reduce((total, cuenta) => {
    return total + Number(cuenta.saldo_inicial || 0);
  }, 0);

  const balance = saldoInicial + ingresos - gastos;

  const totalMetas = metas.reduce((total, meta) => {
    return total + Number(meta.monto_objetivo || 0);
  }, 0);

  return [
    {
      id: 'balance',
      title: 'Balance total',
      amount: formatMoney(balance),
      subtitle: 'Saldo inicial + ingresos - gastos',
      variant: 'balance',
    },
    {
      id: 'income',
      title: 'Ingresos',
      amount: formatMoney(ingresos),
      subtitle: 'Total registrado',
      variant: 'income',
    },
    {
      id: 'expense',
      title: 'Gastos',
      amount: formatMoney(gastos),
      subtitle: 'Total registrado',
      variant: 'expense',
    },
    {
      id: 'saving',
      title: 'Metas',
      amount: formatMoney(totalMetas),
      subtitle: `${metas.length} meta(s) financiera(s)`,
      variant: 'saving',
    },
  ];
}

function isSameDay(date, today) {
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function isSameWeek(date, today) {
  const firstDayOfWeek = new Date(today);
  const day = today.getDay();

  const diffToMonday = day === 0 ? -6 : 1 - day;

  firstDayOfWeek.setDate(today.getDate() + diffToMonday);
  firstDayOfWeek.setHours(0, 0, 0, 0);

  const lastDayOfWeek = new Date(firstDayOfWeek);
  lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
  lastDayOfWeek.setHours(23, 59, 59, 999);

  return date >= firstDayOfWeek && date <= lastDayOfWeek;
}

function isSameMonth(date, today) {
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth()
  );
}

export function filterTransactionsByPeriod(transactions, selectedPeriod) {
  if (selectedPeriod === 'Todos') {
    return transactions;
  }

  const today = new Date();

  return transactions.filter((transaction) => {
    const transactionDate = parseLocalDate(transaction.fecha_movimiento);

    if (!transactionDate) return false;

    if (selectedPeriod === 'Diario') {
      return isSameDay(transactionDate, today);
    }

    if (selectedPeriod === 'Semanal') {
      return isSameWeek(transactionDate, today);
    }

    if (selectedPeriod === 'Mensual') {
      return isSameMonth(transactionDate, today);
    }

    return true;
  });
}

export function filterTransactionsByDate(transactions, selectedDate) {
  if (!selectedDate) {
    return transactions;
  }

  const targetDate = parseLocalDate(selectedDate);

  if (!targetDate) {
    return transactions;
  }

  return transactions.filter((transaction) => {
    const transactionDate = parseLocalDate(transaction.fecha_movimiento);

    if (!transactionDate) return false;

    return isSameDay(transactionDate, targetDate);
  });
}

export function groupTransactionsByDay(transactions) {
  return transactions.reduce((groups, transaction) => {
    const groupKey = transaction.dayLabel || 'Sin fecha';

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }

    groups[groupKey].push(transaction);

    return groups;
  }, {});
}

export function calculateBalance({ transaccionesUsuario, cuentas }) {
  const ingresos = transaccionesUsuario
    .filter((item) => item.tipoMovimiento === 'INGRESO')
    .reduce((total, item) => total + Math.abs(Number(item.amount || 0)), 0);

  const gastos = transaccionesUsuario
    .filter((item) => item.tipoMovimiento === 'GASTO')
    .reduce((total, item) => total + Math.abs(Number(item.amount || 0)), 0);

  const saldoInicial = cuentas.reduce((total, cuenta) => {
    return total + Number(cuenta.saldo_inicial || 0);
  }, 0);

  return saldoInicial + ingresos - gastos;
}

export function getTransactionEffect(transaction) {
  if (!transaction) return 0;

  const amount = Math.abs(Number(transaction.amount || transaction.monto || 0));

  return transaction.tipoMovimiento === 'INGRESO' ? amount : -amount;
}

export function getProjectedBalance({
  currentBalance,
  originalTransaction,
  selectedCategory,
  newAmount,
}) {
  const originalEffect = getTransactionEffect(originalTransaction);

  const balanceWithoutOriginal = currentBalance - originalEffect;

  const newEffect =
    selectedCategory?.tipo_movimiento === 'INGRESO'
      ? Math.abs(Number(newAmount || 0))
      : -Math.abs(Number(newAmount || 0));

  return balanceWithoutOriginal + newEffect;
}