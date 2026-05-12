import { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import SummaryCard from '../components/SummaryCard';
import TransactionItem from '../components/TransactionItem';
import TransactionForm from '../components/TransactionForm';
import ConfirmModal from '../components/ConfirmModal';
import api from '../services/api';
import { formatMoney, normalizeText } from '../utils/formatters';
import ProjectionForm from '../components/ProjectionForm';
import ProjectionItem from '../components/ProjectionItem';
import ProjectionSummaryCard from '../components/ProjectionSummaryCard';
import {
  confirmProjection,
  createProjection,
  getProjections,
  rejectProjection,
  updateProjection,
} from '../services/projectionsService';
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

function getInitialProjection(cuentas = [], categorias = []) {
  return {
    id_cuenta: cuentas[0]?.id_cuenta || '',
    id_categoria: categorias[0]?.id_categoria || '',
    monto: '',
    fecha_programada: new Date().toISOString().slice(0, 10),
    descripcion: '',
  };
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

  const [activeTab, setActiveTab] = useState('historial');
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState(null);
  const [transactionToDelete, setTransactionToDelete] = useState(null);

  const [projections, setProjections] = useState([]);
  const [showProjectionForm, setShowProjectionForm] = useState(false);
  const [editingProjectionId, setEditingProjectionId] = useState(null);
  const [projectionToConfirm, setProjectionToConfirm] = useState(null);
  const [projectionToReject, setProjectionToReject] = useState(null);

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategory, setNewCategory] = useState({
    nombre: '',
    tipo_movimiento: 'GASTO',
    descripcion: '',
  });

  const [newTransaction, setNewTransaction] = useState(
    getInitialTransaction()
  );

  const [newProjection, setNewProjection] = useState({
    id_cuenta: '',
    id_categoria: '',
    monto: '',
    fecha_programada: '',
    descripcion: '',
  });

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

  const projectionSummary = useMemo(() => {
    const pendingProjections = projections.filter((projection) => {
      return (
        projection.estado === 'PENDIENTE' ||
        projection.estado === 'REPROGRAMADA'
      );
    });

    const projectedIncome = pendingProjections
      .filter((projection) => projection.tipo_movimiento === 'INGRESO')
      .reduce((total, projection) => total + Number(projection.monto || 0), 0);

    const projectedExpenses = pendingProjections
      .filter((projection) => projection.tipo_movimiento === 'GASTO')
      .reduce((total, projection) => total + Number(projection.monto || 0), 0);

    return {
      pendingCount: pendingProjections.length,
      projectedIncome,
      projectedExpenses,
      projectedBalance: projectedIncome - projectedExpenses,
    };
  }, [projections]);

  const pendingProjectionsToday = useMemo(() => {
    return projections.filter((projection) => {
      return projection.es_para_hoy || projection.esta_vencida;
    });
  }, [projections]);

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
        projectionsResponse,
      ] = await Promise.all([
        api.get('/finanzas/cuentas/'),
        api.get('/categorias/'),
        api.get('/transacciones/'),
        api.get('/finanzas/metas/'),
        getProjections(),
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
      setProjections(projectionsResponse.data);

      setNewTransaction(
        getInitialTransaction(cuentasUsuario, categoriasUsuario)
      );

      setNewProjection(
        getInitialProjection(cuentasUsuario, categoriasUsuario)
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
    setShowCategoryForm(false);
    setEditingTransactionId(null);

    setNewTransaction(getInitialTransaction(cuentas, categoriasActivas));

    setNewCategory({
      nombre: '',
      tipo_movimiento: 'GASTO',
      descripcion: '',
    });
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

  function resetProjectionForm() {
    setShowProjectionForm(false);
    setShowCategoryForm(false);
    setEditingProjectionId(null);

    setNewProjection(getInitialProjection(cuentas, categoriasActivas));

    setNewCategory({
      nombre: '',
      tipo_movimiento: 'GASTO',
      descripcion: '',
    });
  }

  async function handleSubmitProjection(event) {
    event.preventDefault();
    setErrorMessage('');

    if (
      !newProjection.id_cuenta ||
      !newProjection.id_categoria ||
      !newProjection.monto ||
      !newProjection.fecha_programada
    ) {
      setErrorMessage('Completa cuenta, categoría, monto y fecha programada.');
      return;
    }

    const monto = Number(newProjection.monto);

    if (Number.isNaN(monto) || monto <= 0) {
      setErrorMessage('El monto proyectado debe ser mayor a cero.');
      return;
    }

    if (newProjection.fecha_programada < todayISO) {
      setErrorMessage('La fecha programada no puede ser anterior a hoy.');
      return;
    }

    const payload = {
      id_cuenta: Number(newProjection.id_cuenta),
      id_categoria: Number(newProjection.id_categoria),
      monto,
      fecha_programada: newProjection.fecha_programada,
      descripcion: newProjection.descripcion,
    };

    try {
      if (editingProjectionId) {
        await updateProjection(editingProjectionId, payload);
      } else {
        await createProjection(payload);
      }

      resetProjectionForm();
      setActiveTab('proyecciones');
      await loadFinancialData();
    } catch (error) {
      console.error('Error guardando proyección:', error.response?.data || error);

      setErrorMessage(
        error.response?.data?.message || 'No se pudo guardar la proyección.'
      );
    }
  }

  function handleStartEditProjection(projection) {
    setErrorMessage('');
    setEditingProjectionId(projection.id_proyeccion);

    setNewProjection({
      id_cuenta: projection.id_cuenta,
      id_categoria: projection.id_categoria,
      monto: Math.abs(Number(projection.monto || 0)),
      fecha_programada: projection.fecha_programada,
      descripcion: projection.descripcion || '',
    });

    setShowTransactionForm(false);
    setShowProjectionForm(true);
    setActiveTab('proyecciones');
  }

  async function handleConfirmProjection(idProjection) {
    setErrorMessage('');

    try {
      await confirmProjection(idProjection);

      setProjectionToConfirm(null);
      await loadFinancialData();
      setActiveTab('historial');
    } catch (error) {
      console.error('Error confirmando proyección:', error.response?.data || error);

      setErrorMessage(
        error.response?.data?.message || 'No se pudo confirmar la proyección.'
      );
    }
  }

  async function handleRejectProjection(idProjection) {
    setErrorMessage('');

    try {
      await rejectProjection(idProjection);

      setProjectionToReject(null);
      await loadFinancialData();
      setActiveTab('proyecciones');
    } catch (error) {
      console.error('Error rechazando proyección:', error.response?.data || error);

      setErrorMessage(
        error.response?.data?.message || 'No se pudo rechazar la proyección.'
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

      setNewProjection((prev) => ({
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
            notifications={pendingProjectionsToday}
            onNotificationClick={(projection) => {
              setActiveTab('proyecciones');
              setProjectionToConfirm(projection);
            }}
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
                  {activeTab === 'historial'
                    ? 'Consulta, filtra, registra, edita y elimina tus movimientos financieros reales.'
                    : 'Planifica ingresos y gastos futuros sin afectar todavía tus saldos reales.'}
                </p>
              </div>
            </section>

            {errorMessage && (
              <div className="shrink-0 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {errorMessage}
              </div>
            )}

            <section className="grid shrink-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {activeTab === 'historial' ? (
                summaryData.map((card) => (
                  <SummaryCard
                    key={card.id}
                    title={card.title}
                    amount={card.amount}
                    subtitle={card.subtitle}
                    variant={card.variant}
                  />
                ))
              ) : (
                <>
                  <ProjectionSummaryCard
                    title="Proyecciones pendientes"
                    value={projectionSummary.pendingCount}
                    subtitle={`${pendingProjectionsToday.length} requieren revisión hoy o están vencidas.`}
                    tone="violet"
                  />

                  <ProjectionSummaryCard
                    title="Ingresos proyectados"
                    value={formatMoney(projectionSummary.projectedIncome)}
                    subtitle="Ingresos futuros que aún no afectan tu balance."
                    tone="emerald"
                  />

                  <ProjectionSummaryCard
                    title="Gastos proyectados"
                    value={formatMoney(projectionSummary.projectedExpenses)}
                    subtitle="Gastos futuros pendientes de confirmación."
                    tone="rose"
                  />

                  <ProjectionSummaryCard
                    title="Balance proyectado"
                    value={formatMoney(projectionSummary.projectedBalance)}
                    subtitle="Diferencia estimada entre ingresos y gastos proyectados."
                    tone="blue"
                  />
                </>
              )}
            </section>

            <section className="flex min-h-0 flex-1 flex-col rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="shrink-0 border-b border-slate-200 px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-wrap gap-2">
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

                        setShowProjectionForm(false);
                        setEditingProjectionId(null);
                        setEditingTransactionId(null);
                        setNewTransaction(getInitialTransaction(cuentas, categoriasActivas));
                        setShowTransactionForm(true);
                        setActiveTab('historial');
                      }}
                    >
                      {showTransactionForm ? 'Cancelar' : '+ Nueva transacción'}
                    </button>

                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-100"
                      onClick={() => {
                        if (cuentas.length === 0) {
                          const shouldGoToAccounts = window.confirm(
                            'Necesitas crear una cuenta antes de crear proyecciones. ¿Quieres ir al módulo de Cuentas?'
                          );

                          if (shouldGoToAccounts) {
                            navigate('/cuentas');
                          }

                          return;
                        }

                        if (showProjectionForm) {
                          resetProjectionForm();
                          return;
                        }

                        setShowTransactionForm(false);
                        setEditingTransactionId(null);
                        setEditingProjectionId(null);
                        setNewProjection(getInitialProjection(cuentas, categoriasActivas));
                        setShowProjectionForm(true);
                        setActiveTab('proyecciones');
                      }}
                    >
                      {showProjectionForm ? 'Cancelar proyección' : '+ Nueva proyección'}
                    </button>
                  </div>

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

                {(showTransactionForm || showProjectionForm || showCategoryForm) && (
                  <div className="mt-4 max-h-[42vh] space-y-4 overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                    {showTransactionForm && (
                      <div className="rounded-3xl border border-violet-100 bg-violet-50/60 p-4">
                        <TransactionForm
                          transaction={newTransaction}
                          cuentas={cuentas}
                          categorias={categoriasActivas}
                          onChange={setNewTransaction}
                          onSubmit={handleSubmitTransaction}
                          maxDate={todayISO}
                          onOpenCategoryForm={() =>
                            setShowCategoryForm((value) => !value)
                          }
                          submitLabel={
                            editingTransactionId
                              ? 'Actualizar transacción'
                              : 'Guardar transacción'
                          }
                        />
                      </div>
                    )}

                    {showProjectionForm && (
                      <div className="rounded-3xl border border-blue-100 bg-blue-50/60 p-4">
                        <ProjectionForm
                          projection={newProjection}
                          cuentas={cuentas}
                          categorias={categoriasActivas}
                          onChange={setNewProjection}
                          onSubmit={handleSubmitProjection}
                          minDate={todayISO}
                          onOpenCategoryForm={() => setShowCategoryForm((value) => !value)}
                          submitLabel={
                            editingProjectionId
                              ? 'Actualizar proyección'
                              : 'Guardar proyección'
                          }
                        />
                      </div>
                    )}

                    {showCategoryForm && (
                      <form
                        onSubmit={handleCreateCategory}
                        className="grid grid-cols-1 gap-4 rounded-3xl border border-slate-200 bg-white p-4 md:grid-cols-3"
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
                )}
              </div>

              <div className="shrink-0 border-b border-slate-200 px-4 py-3 sm:px-5">
                <div className="inline-flex rounded-2xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('historial')}
                    className={
                      activeTab === 'historial'
                        ? 'rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm'
                        : 'rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900'
                    }
                  >
                    Historial
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('proyecciones')}
                    className={
                      activeTab === 'proyecciones'
                        ? 'rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm'
                        : 'rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900'
                    }
                  >
                    Proyecciones
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                {loading ? (
                  <div className="grid h-full min-h-[260px] place-items-center rounded-2xl border border-dashed border-slate-200 text-sm font-medium text-slate-400">
                    Cargando datos financieros...
                  </div>
                ) : activeTab === 'historial' ? (
                  filteredTransactions.length > 0 ? (
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
                  )
                ) : projections.length > 0 ? (
                  <div className="space-y-3">
                    {projections.map((projection) => (
                      <ProjectionItem
                        key={projection.id_proyeccion}
                        projection={projection}
                        onEdit={() => handleStartEditProjection(projection)}
                        onConfirm={() => setProjectionToConfirm(projection)}
                        onReject={() => setProjectionToReject(projection)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid h-full min-h-[260px] place-items-center rounded-2xl border border-dashed border-slate-200 px-4 text-center">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        No tienes proyecciones registradas
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        Crea una proyección para planear ingresos o gastos futuros.
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
        <ConfirmModal
          open={Boolean(projectionToConfirm)}
          title="Confirmar proyección"
          message={`La proyección "${projectionToConfirm?.categoria_nombre}" se convertirá en una transacción real y empezará a afectar tus saldos.`}
          confirmLabel="Confirmar"
          cancelLabel="Cancelar"
          variant="default"
          onCancel={() => setProjectionToConfirm(null)}
          onConfirm={() => {
            if (projectionToConfirm) {
              handleConfirmProjection(projectionToConfirm.id_proyeccion);
            }
          }}
        />

        <ConfirmModal
          open={Boolean(projectionToReject)}
          title="Rechazar proyección"
          message={`La proyección "${projectionToReject?.categoria_nombre}" será marcada como rechazada y no afectará tus saldos.`}
          confirmLabel="Rechazar"
          cancelLabel="Cancelar"
          variant="danger"
          onCancel={() => setProjectionToReject(null)}
          onConfirm={() => {
            if (projectionToReject) {
              handleRejectProjection(projectionToReject.id_proyeccion);
            }
          }}
        />
      </div>
    );
  }