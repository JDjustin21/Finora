import { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import SummaryCard from '../components/SummaryCard';
import TransactionItem from '../components/TransactionItem';
import TransactionForm from '../components/TransactionForm';
import ConfirmModal from '../components/ConfirmModal';
import api from '../services/api';
import { formatMoney, normalizeText } from '../utils/formatters';
import {
  buildMap,
  buildSummaryData,
  calculateAccountBalance,
  calculateBalance,
  filterTransactionsByDate,
  filterTransactionsByPeriod,
  getInitialTransaction,
  getProjectedAccountBalance,
  getProjectedBalance,
  groupTransactionsByDay,
  normalizeUserTransactions,
} from '../utils/finance';
import { useNavigate } from 'react-router-dom';

const filters = ['Todos', 'Ingresos', 'Gastos'];
const periods = ['Todos', 'Diario', 'Semanal', 'Mensual'];


function getStoredUser() {
  const localUser = localStorage.getItem('finora_usuario');
  const sessionUser = sessionStorage.getItem('finora_usuario');
  const storedUser = localUser || sessionUser;

  return storedUser ? JSON.parse(storedUser) : null;
}

export default function Transacciones({ usuario, onLogout }) {
  const navigate = useNavigate();
  const currentUser = usuario || getStoredUser();

  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('Todos');
  const [selectedPeriod, setSelectedPeriod] = useState('Todos');
  const [selectedDate, setSelectedDate] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [cuentas, setCuentas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [transacciones, setTransacciones] = useState([]);
  const [metas, setMetas] = useState([]);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState(null);
  const [transactionToDelete, setTransactionToDelete] = useState(null);

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategory, setNewCategory] = useState({
    nombre: '',
    tipo_movimiento: 'GASTO',
    descripcion: '',
  });

  const [newTransaction, setNewTransaction] = useState(
    getInitialTransaction()
  );

  const userFullName = currentUser
    ? `${currentUser.nombres} ${currentUser.apellidos}`
    : 'Usuario';

  const todayISO = new Date().toISOString().slice(0, 10);

  const categoriasActivas = useMemo(() => {
    return categorias.filter((categoria) => categoria.activa);
  }, [categorias]);

  const categoriasMap = useMemo(() => {
    return buildMap(categorias, 'id_categoria');
  }, [categorias]);

  const cuentasMap = useMemo(() => {
    return buildMap(cuentas, 'id_cuenta');
  }, [cuentas]);

  const transaccionesUsuario = useMemo(() => {
    return normalizeUserTransactions({
      transacciones,
      cuentas,
      categoriasMap,
      cuentasMap,
    });
  }, [transacciones, cuentas, categoriasMap, cuentasMap]);

  const summaryData = useMemo(() => {
    return buildSummaryData({
      transaccionesUsuario,
      cuentas,
      metas,
    });
  }, [transaccionesUsuario, cuentas, metas]);

  const currentBalance = useMemo(() => {
    return calculateBalance({
      transaccionesUsuario,
      cuentas,
    });
  }, [transaccionesUsuario, cuentas]);

  const filteredTransactions = useMemo(() => {
    const searchValue = normalizeText(search);

    const transactionsByPeriod = filterTransactionsByPeriod(
      transaccionesUsuario,
      selectedPeriod
    );

    const transactionsByDate = filterTransactionsByDate(
      transactionsByPeriod,
      selectedDate
    );

    return transactionsByDate.filter((transaction) => {
      const matchesSearch =
        normalizeText(transaction.title).includes(searchValue) ||
        normalizeText(transaction.description).includes(searchValue) ||
        normalizeText(transaction.dayLabel).includes(searchValue) ||
        normalizeText(transaction.cuentaNombre).includes(searchValue) ||
        normalizeText(transaction.date).includes(searchValue);

      const matchesFilter =
        selectedFilter === 'Todos' ||
        (selectedFilter === 'Ingresos' && transaction.type === 'income') ||
        (selectedFilter === 'Gastos' && transaction.type === 'expense');

      return matchesSearch && matchesFilter;
    });
  }, [
    transaccionesUsuario,
    search,
    selectedFilter,
    selectedPeriod,
    selectedDate,
  ]);

  const groupedTransactions = useMemo(() => {
    return groupTransactionsByDay(filteredTransactions);
  }, [filteredTransactions]);

  async function loadFinancialData() {
    if (!currentUser?.id_usuario) return;

    setLoading(true);
    setErrorMessage('');

    try {
      const [
        cuentasResponse,
        categoriasResponse,
        transaccionesResponse,
        metasResponse,
      ] = await Promise.all([
        api.get('/finanzas/cuentas/'),
        api.get('/categorias/'),
        api.get('/transacciones/'),
        api.get('/finanzas/metas/'),
      ]);

      const cuentasUsuario = cuentasResponse.data;

      const categoriasUsuario = categoriasResponse.data.filter((categoria) => {
        return (
          categoria.id_usuario === currentUser.id_usuario ||
          categoria.id_usuario === null
        );
      });

      const metasUsuario = metasResponse.data;

      setCuentas(cuentasUsuario);
      setCategorias(categoriasUsuario);
      setTransacciones(transaccionesResponse.data);
      setMetas(metasUsuario);

      setNewTransaction(
        getInitialTransaction(cuentasUsuario, categoriasUsuario)
      );
    } catch (error) {
      console.error('Error cargando datos financieros:', error);
      setErrorMessage('No se pudieron cargar los datos financieros.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFinancialData();
  }, [currentUser?.id_usuario]);

  function resetTransactionForm() {
    setShowTransactionForm(false);
    setEditingTransactionId(null);
    setNewTransaction(getInitialTransaction(cuentas, categoriasActivas));
  }

  async function handleSubmitTransaction(event) {
    event.preventDefault();
    setErrorMessage('');

    if (
      !newTransaction.id_cuenta ||
      !newTransaction.id_categoria ||
      !newTransaction.monto ||
      !newTransaction.fecha_movimiento
    ) {
      setErrorMessage('Completa cuenta, categoría, monto y fecha.');
      return;
    }

    const monto = Number(newTransaction.monto);

    if (Number.isNaN(monto) || monto <= 0) {
      setErrorMessage('El monto debe ser un número mayor a cero.');
      return;
    }
    const selectedCategory = categoriasMap[Number(newTransaction.id_categoria)];

    const originalTransaction = editingTransactionId
      ? transaccionesUsuario.find((transaction) => {
          return transaction.id_transaccion === editingTransactionId;
        })
      : null;

    const projectedBalance = getProjectedBalance({
      currentBalance,
      originalTransaction,
      selectedCategory,
      newAmount: monto,
    });

    if (projectedBalance < 0) {
      setErrorMessage(
        `No puedes guardar esta transacción porque el balance quedaría negativo. Balance disponible: ${formatMoney(currentBalance)}.`
      );
      return;
    }

    const selectedAccount = cuentas.find((cuenta) => {
      return cuenta.id_cuenta === Number(newTransaction.id_cuenta);
    });

    if (!selectedAccount) {
      setErrorMessage('La cuenta seleccionada no existe o no está disponible.');
      return;
    }

    const projectedAccountBalance = getProjectedAccountBalance({
      account: selectedAccount,
      transactions: transaccionesUsuario,
      originalTransaction,
      selectedCategory,
      newAmount: monto,
    });

    if (projectedAccountBalance < 0) {
      setErrorMessage(
        `No puedes guardar esta transacción porque la cuenta "${selectedAccount.nombre}" no tiene saldo suficiente. Saldo disponible: ${formatMoney(
          calculateAccountBalance({
            account: selectedAccount,
            transactions: transaccionesUsuario,
          })
        )}.`
      );
      return;
    }

    if (newTransaction.fecha_movimiento > todayISO) {
      setErrorMessage('No puedes registrar una transacción con fecha futura.');
      return;
    }

    const payload = {
      id_cuenta: Number(newTransaction.id_cuenta),
      id_categoria: Number(newTransaction.id_categoria),
      monto,
      fecha_movimiento: newTransaction.fecha_movimiento,
      descripcion: newTransaction.descripcion,
    };

    try {
      if (editingTransactionId) {
        await api.put(`/transacciones/${editingTransactionId}`, payload);
      } else {
        await api.post('/transacciones/', payload);
      }

      resetTransactionForm();
      await loadFinancialData();
    } catch (error) {
      console.error(
        'Error guardando transacción:',
        error.response?.data || error
      );

      setErrorMessage(
        error.response?.data?.message || 'No se pudo guardar la transacción.'
      );
    }
  }

  function handleStartEditTransaction(transaction) {
    setErrorMessage('');
    setEditingTransactionId(transaction.id_transaccion);

    setNewTransaction({
      id_cuenta: transaction.id_cuenta,
      id_categoria: transaction.id_categoria,
      monto: Math.abs(Number(transaction.monto || transaction.amount || 0)),
      fecha_movimiento: transaction.fecha_movimiento,
      descripcion:
        transaction.descripcion && transaction.descripcion !== 'Sin descripción'
          ? transaction.descripcion
          : '',
    });

    setShowTransactionForm(true);
  }

  async function handleDeleteTransaction(transactionId) {
    setErrorMessage('');

    try {
      await api.delete(`/transacciones/${transactionId}`);

      if (editingTransactionId === transactionId) {
        resetTransactionForm();
      }

      setTransactionToDelete(null);
      await loadFinancialData();
    } catch (error) {
      console.error(
        'Error eliminando transacción:',
        error.response?.data || error
      );

      setErrorMessage(
        error.response?.data?.message || 'No se pudo eliminar la transacción.'
      );
    }
  }

  async function handleCreateCategory(event) {
    event.preventDefault();
    setErrorMessage('');

    const nombre = newCategory.nombre.trim();
    const descripcion = newCategory.descripcion.trim();

    if (!nombre) {
      setErrorMessage('El nombre de la categoría es obligatorio.');
      return;
    }

    try {
      const response = await api.post('/categorias/', {
        id_usuario: currentUser.id_usuario,
        nombre,
        tipo_movimiento: newCategory.tipo_movimiento,
        descripcion,
        activa: true,
      });

      setCategorias((prev) => [...prev, response.data]);

      setNewTransaction((prev) => ({
        ...prev,
        id_categoria: response.data.id_categoria,
      }));

      setNewCategory({
        nombre: '',
        tipo_movimiento: 'GASTO',
        descripcion: '',
      });

      setShowCategoryForm(false);
    } catch (error) {
      console.error('Error creando categoría:', error.response?.data || error);
      setErrorMessage(
        error.response?.data?.message || 'No se pudo crear la categoría.'
      );
    }
  }

  return (
      <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
        <Sidebar collapsed={sidebarCollapsed} />

        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            userName={userFullName}
            searchValue={search}
            onSearchChange={setSearch}
            placeholder="Buscar transacciones, metas o reportes..."
            onLogout={onLogout}
            onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
          />

          <main className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden px-4 py-5 lg:px-8">
            <section className="shrink-0">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-600">
                  Panel financiero
                </p>

                <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  Transacciones
                </h1>

                <p className="max-w-2xl text-sm leading-6 text-slate-500">
                  Consulta, filtra, registra, edita y elimina tus movimientos
                  financieros sin perder el control del historial.
                </p>
              </div>
            </section>

            {errorMessage && (
              <div className="shrink-0 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {errorMessage}
              </div>
            )}

            <section className="grid shrink-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {summaryData.map((card) => (
                <SummaryCard
                  key={card.id}
                  title={card.title}
                  amount={card.amount}
                  subtitle={card.subtitle}
                  variant={card.variant}
                />
              ))}
            </section>

            <section className="flex min-h-0 flex-1 flex-col rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="shrink-0 border-b border-slate-200 px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-2xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800"
                    onClick={() => {
                      if (cuentas.length === 0) {
                        const shouldGoToAccounts = window.confirm(
                          'Necesitas crear una cuenta antes de registrar transacciones. ¿Quieres ir al módulo de Cuentas?'
                        );

                        if (shouldGoToAccounts) {
                          navigate('/cuentas');
                        }

                        return;
                      }

                      if (showTransactionForm) {
                        resetTransactionForm();
                        return;
                      }

                      setEditingTransactionId(null);
                      setNewTransaction(getInitialTransaction(cuentas, categoriasActivas));
                      setShowTransactionForm(true);
                    }}
                  >
                    {showTransactionForm ? 'Cancelar' : '+ Nueva transacción'}
                  </button>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:w-auto">
                    <select
                      className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                      value={selectedFilter}
                      onChange={(e) => setSelectedFilter(e.target.value)}
                    >
                      {filters.map((filter) => (
                        <option key={filter} value={filter}>
                          {filter}
                        </option>
                      ))}
                    </select>

                    <select
                      className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(e.target.value)}
                    >
                      {periods.map((period) => (
                        <option key={period} value={period}>
                          {period}
                        </option>
                      ))}
                    </select>

                    <input
                      type="date"
                      max={todayISO}
                      className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      aria-label="Filtrar por fecha"
                    />
                  </div>
                </div>

                {showTransactionForm && (
                  <div className="mt-4 rounded-3xl border border-violet-100 bg-violet-50/60 p-4">
                    <TransactionForm
                      transaction={newTransaction}
                      cuentas={cuentas}
                      categorias={categoriasActivas}
                      onChange={setNewTransaction}
                      onSubmit={handleSubmitTransaction}
                      maxDate={todayISO}
                      onOpenCategoryForm={() => setShowCategoryForm((value) => !value)}
                      submitLabel={
                        editingTransactionId
                          ? 'Actualizar transacción'
                          : 'Guardar transacción'
                      }
                    />
                  </div>
                )}
                {showCategoryForm && (
                  <form
                    onSubmit={handleCreateCategory}
                    className="mt-4 grid grid-cols-1 gap-4 rounded-3xl border border-slate-200 bg-white p-4 md:grid-cols-3"
                  >
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Nombre
                      </label>
                      <input
                        type="text"
                        value={newCategory.nombre}
                        onChange={(e) =>
                          setNewCategory({
                            ...newCategory,
                            nombre: e.target.value,
                          })
                        }
                        placeholder="Ej: Transporte"
                        className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Tipo
                      </label>
                      <select
                        value={newCategory.tipo_movimiento}
                        onChange={(e) =>
                          setNewCategory({
                            ...newCategory,
                            tipo_movimiento: e.target.value,
                          })
                        }
                        className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                      >
                        <option value="GASTO">Gasto</option>
                        <option value="INGRESO">Ingreso</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Descripción
                      </label>
                      <input
                        type="text"
                        value={newCategory.descripcion}
                        onChange={(e) =>
                          setNewCategory({
                            ...newCategory,
                            descripcion: e.target.value,
                          })
                        }
                        placeholder="Descripción opcional"
                        className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <button
                        type="submit"
                        className="rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                      >
                        Guardar categoría
                      </button>
                    </div>
                  </form>
                )}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                {loading ? (
                  <div className="grid h-full min-h-[260px] place-items-center rounded-2xl border border-dashed border-slate-200 text-sm font-medium text-slate-400">
                    Cargando datos financieros...
                  </div>
                ) : filteredTransactions.length > 0 ? (
                  <div className="space-y-6">
                    {Object.entries(groupedTransactions).map(
                      ([dayLabel, transactions]) => (
                        <section key={dayLabel} className="space-y-3">
                          <div className="sticky top-0 z-10 -mx-1 bg-white/90 px-1 py-1 backdrop-blur">
                            <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-500">
                              {dayLabel}
                            </h2>
                          </div>

                          <div className="space-y-3">
                            {transactions.map((transaction) => (
                              <TransactionItem
                                key={transaction.id_transaccion}
                                title={transaction.title}
                                description={`${transaction.description} · ${transaction.cuentaNombre}`}
                                amount={transaction.amount}
                                date={transaction.date}
                                type={transaction.type}
                                onEdit={() => handleStartEditTransaction(transaction)}
                                onDelete={() => setTransactionToDelete(transaction)}
                              />
                            ))}
                          </div>
                        </section>
                      )
                    )}
                </div>
                ) : (
                  <div className="grid h-full min-h-[260px] place-items-center rounded-2xl border border-dashed border-slate-200 px-4 text-center">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        No se encontraron transacciones
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        Ajusta los filtros o registra una nueva transacción.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </main>
        </div>

        <ConfirmModal
          open={Boolean(transactionToDelete)}
          title="Eliminar transacción"
          message={`La transacción "${transactionToDelete?.title}" será eliminada y dejará de afectar tus saldos.`}
          confirmLabel="Eliminar"
          cancelLabel="Cancelar"
          variant="danger"
          onCancel={() => setTransactionToDelete(null)}
          onConfirm={() => {
            if (transactionToDelete) {
              handleDeleteTransaction(transactionToDelete.id_transaccion);
            }
          }}
        />
      </div>
    );
}