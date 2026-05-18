import { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import GoalCard from '../components/GoalCard';
import GoalForm from '../components/GoalForm';
import GoalContributionModal from '../components/GoalContributionModal';
import ConfirmModal from '../components/ConfirmModal';
import api from '../services/api';
import LoadingScreen from '../components/LoadingScreen';
import { formatMoney, normalizeText } from '../utils/formatters';

function getStoredUser() {
  const localUser = localStorage.getItem('finora_usuario');
  const sessionUser = sessionStorage.getItem('finora_usuario');
  const storedUser = localUser || sessionUser;

  return storedUser ? JSON.parse(storedUser) : null;
}

function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

function getInitialGoal() {
  return {
    nombre: '',
    descripcion: '',
    monto_objetivo: '',
    fecha_inicio: getTodayISO(),
    fecha_limite: '',
  };
}

function getInitialContribution(accounts = []) {
  return {
    id_cuenta: accounts[0]?.id_cuenta || '',
    monto: '',
    descripcion: '',
  };
}

function KpiDot({ className }) {
  return <span className={`h-2 w-2 rounded-full ${className}`} />;
}

function GoalProgressCircle({ value }) {
  const safeValue = Math.max(0, Math.min(Number(value || 0), 100));

  return (
    <div className="flex items-center gap-4">
      <div
        className="grid h-16 w-16 place-items-center rounded-full"
        style={{
          background: `conic-gradient(#f59e0b ${safeValue * 3.6}deg, #fef3c7 0deg)`,
        }}
      >
        <div className="grid h-11 w-11 place-items-center rounded-full bg-white">
          <span className="text-sm font-bold text-amber-950">
            {safeValue.toFixed(0)}%
          </span>
        </div>
      </div>

      <div>
        <p className="text-3xl font-semibold text-amber-950">
          {safeValue.toFixed(0)}%
        </p>
        <p className="mt-1 text-xs font-medium text-slate-500">
          promedio general
        </p>
      </div>
    </div>
  );
}

export default function Metas({ usuario, onLogout }) {
  const currentUser = usuario || getStoredUser();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [search, setSearch] = useState('');

  const [goals, setGoals] = useState([]);
  const [accounts, setAccounts] = useState([]);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [goalForm, setGoalForm] = useState(getInitialGoal());

  const [goalToCancel, setGoalToCancel] = useState(null);
  const [goalToContribute, setGoalToContribute] = useState(null);
  const [contributionForm, setContributionForm] = useState(
    getInitialContribution()
  );

  const userFullName = currentUser
    ? `${currentUser.nombres} ${currentUser.apellidos}`
    : 'Usuario';

  const activeGoals = useMemo(() => {
    return goals.filter((goal) => goal.estado === 'ACTIVA');
  }, [goals]);

  const totalSaved = useMemo(() => {
    return goals.reduce((total, goal) => {
      return total + Number(goal.monto_ahorrado || 0);
    }, 0);
  }, [goals]);

  const totalObjective = useMemo(() => {
    return goals
      .filter((goal) => goal.estado !== 'CANCELADA')
      .reduce((total, goal) => {
        return total + Number(goal.monto_objetivo || 0);
      }, 0);
  }, [goals]);

  const averageProgress = useMemo(() => {
    const validGoals = goals.filter((goal) => goal.estado !== 'CANCELADA');

    if (validGoals.length === 0) return 0;

    const totalProgress = validGoals.reduce((total, goal) => {
      return total + Number(goal.porcentaje_cumplimiento || 0);
    }, 0);

    return totalProgress / validGoals.length;
  }, [goals]);

  const filteredGoals = useMemo(() => {
    const searchValue = normalizeText(search);

    return goals.filter((goal) => {
      return (
        normalizeText(goal.nombre).includes(searchValue) ||
        normalizeText(goal.descripcion).includes(searchValue) ||
        normalizeText(goal.estado).includes(searchValue)
      );
    });
  }, [goals, search]);

  async function loadGoalsModule() {
    setLoading(true);
    setErrorMessage('');

    try {
      const [goalsResponse, accountsResponse] = await Promise.all([
        api.get('/finanzas/metas/?include_inactive=true'),
        api.get('/finanzas/cuentas/'),
      ]);

      setGoals(goalsResponse.data);
      setAccounts(accountsResponse.data);

      setContributionForm((prev) => ({
        ...prev,
        id_cuenta: prev.id_cuenta || accountsResponse.data[0]?.id_cuenta || '',
      }));
    } catch (error) {
      console.error('Error cargando módulo de metas:', error.response?.data || error);
      setErrorMessage(
        error.response?.data?.message || 'No se pudo cargar el módulo de metas.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGoalsModule();
  }, []);

  function resetGoalForm() {
    setShowGoalForm(false);
    setEditingGoalId(null);
    setGoalForm(getInitialGoal());
  }

  async function handleSubmitGoal(event) {
    event.preventDefault();
    setErrorMessage('');

    const nombre = goalForm.nombre.trim();
    const descripcion = goalForm.descripcion.trim();
    const montoObjetivo = Number(goalForm.monto_objetivo || 0);

    if (!nombre) {
      setErrorMessage('El nombre de la meta es obligatorio.');
      return;
    }

    if (Number.isNaN(montoObjetivo) || montoObjetivo <= 0) {
      setErrorMessage('El monto objetivo debe ser mayor a cero.');
      return;
    }

    if (goalForm.fecha_inicio && goalForm.fecha_limite) {
      if (goalForm.fecha_limite < goalForm.fecha_inicio) {
        setErrorMessage('La fecha límite no puede ser menor a la fecha de inicio.');
        return;
      }
    }

    const payload = {
      nombre,
      descripcion,
      monto_objetivo: montoObjetivo,
      fecha_inicio: goalForm.fecha_inicio || null,
      fecha_limite: goalForm.fecha_limite || null,
    };

    try {
      if (editingGoalId) {
        await api.put(`/finanzas/metas/${editingGoalId}`, payload);
      } else {
        await api.post('/finanzas/metas/', payload);
      }

      resetGoalForm();
      await loadGoalsModule();
    } catch (error) {
      console.error('Error guardando meta:', error.response?.data || error);
      setErrorMessage(
        error.response?.data?.message || 'No se pudo guardar la meta.'
      );
    }
  }

  function handleStartEditGoal(goal) {
    setErrorMessage('');
    setEditingGoalId(goal.id_meta);
    setGoalForm({
      nombre: goal.nombre || '',
      descripcion: goal.descripcion || '',
      monto_objetivo: goal.monto_objetivo || '',
      fecha_inicio: goal.fecha_inicio || getTodayISO(),
      fecha_limite: goal.fecha_limite || '',
    });
    setShowGoalForm(true);
  }

  async function handleCancelGoal(goalId) {
    setErrorMessage('');

    try {
      await api.delete(`/finanzas/metas/${goalId}`);
      setGoalToCancel(null);
      await loadGoalsModule();
    } catch (error) {
      console.error('Error cancelando meta:', error.response?.data || error);
      setErrorMessage(
        error.response?.data?.message || 'No se pudo cancelar la meta.'
      );
    }
  }

  async function handleActivateGoal(goalId) {
    setErrorMessage('');

    try {
      await api.patch(`/finanzas/metas/${goalId}/activar`);
      await loadGoalsModule();
    } catch (error) {
      console.error('Error activando meta:', error.response?.data || error);
      setErrorMessage(
        error.response?.data?.message || 'No se pudo activar la meta.'
      );
    }
  }

  function openContributionModal(goal) {
    if (accounts.length === 0) {
      setErrorMessage(
        'Debes crear una cuenta activa antes de aportar dinero a una meta.'
      );
      return;
    }

    setGoalToContribute(goal);
    setContributionForm(getInitialContribution(accounts));
  }

  async function handleSubmitContribution(event) {
    event.preventDefault();
    setErrorMessage('');

    if (!goalToContribute) return;

    const monto = Number(contributionForm.monto || 0);

    if (!contributionForm.id_cuenta) {
      setErrorMessage('Debes seleccionar la cuenta de origen.');
      return;
    }

    if (Number.isNaN(monto) || monto <= 0) {
      setErrorMessage('El aporte debe ser mayor a cero.');
      return;
    }

    try {
      await api.post(`/finanzas/metas/${goalToContribute.id_meta}/aportar`, {
        id_cuenta: Number(contributionForm.id_cuenta),
        monto,
        descripcion: contributionForm.descripcion,
      });

      setGoalToContribute(null);
      setContributionForm(getInitialContribution(accounts));
      await loadGoalsModule();
    } catch (error) {
      console.error('Error registrando aporte:', error.response?.data || error);
      setErrorMessage(
        error.response?.data?.message || 'No se pudo registrar el aporte.'
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
          placeholder="Buscar metas por nombre, estado o descripción..."
          onLogout={onLogout}
          onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
        />

        <main className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden px-4 py-5 lg:px-8">
          <section className="shrink-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-600">
              Planificación financiera
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Metas financieras
            </h1>

            <p className="mt-2 max-w-3xl text-base leading-7 text-slate-500">
              Define objetivos, aporta dinero desde tus cuentas y controla el
              porcentaje de cumplimiento de cada meta.
            </p>
          </section>

          {errorMessage && (
            <div className="shrink-0 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {errorMessage}
            </div>
          )}

          <section className="grid shrink-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-violet-100 bg-violet-50 p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <KpiDot className="bg-violet-600" />
                <p className="text-sm font-semibold text-slate-600">Metas activas</p>
              </div>

              <p className="mt-3 text-3xl font-semibold text-violet-950">
                {activeGoals.length}
              </p>
            </article>

            <article className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <KpiDot className="bg-emerald-600" />
                <p className="text-sm font-semibold text-slate-600">Total ahorrado</p>
              </div>

              <p className="mt-3 text-3xl font-semibold text-emerald-950">
                {formatMoney(totalSaved)}
              </p>
            </article>

            <article className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <KpiDot className="bg-blue-600" />
                <p className="text-sm font-semibold text-slate-600">Objetivo total</p>
              </div>

              <p className="mt-3 text-3xl font-semibold text-blue-950">
                {formatMoney(totalObjective)}
              </p>
            </article>

            <article className="rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <KpiDot className="bg-amber-500" />
                <p className="text-sm font-semibold text-slate-600">
                  Cumplimiento promedio
                </p>
              </div>

              <div className="mt-4">
                <GoalProgressCircle value={averageProgress} />
              </div>
            </article>
          </section>

          <section className="flex min-h-0 flex-1 flex-col rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="shrink-0 border-b border-slate-200 px-4 py-4 sm:px-5">
              <button
                type="button"
                className="rounded-2xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800"
                onClick={() => {
                  if (showGoalForm) {
                    resetGoalForm();
                    return;
                  }

                  setEditingGoalId(null);
                  setGoalForm(getInitialGoal());
                  setShowGoalForm(true);
                }}
              >
                {showGoalForm ? 'Cancelar' : '+ Nueva meta'}
              </button>

              {showGoalForm && (
                <div className="mt-4 rounded-3xl border border-violet-100 bg-violet-50/60 p-4">
                  <GoalForm
                    goal={goalForm}
                    onChange={setGoalForm}
                    onSubmit={handleSubmitGoal}
                    submitLabel={
                      editingGoalId ? 'Actualizar meta' : 'Guardar meta'
                    }
                  />
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              {loading ? (
                <LoadingScreen message="Cargando metas financieras..." />
              ) : filteredGoals.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {filteredGoals.map((goal) => (
                    <GoalCard
                      key={goal.id_meta}
                      goal={goal}
                      onContribute={() => openContributionModal(goal)}
                      onEdit={() => handleStartEditGoal(goal)}
                      onDeactivate={() => setGoalToCancel(goal)}
                      onActivate={() => handleActivateGoal(goal.id_meta)}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid h-full min-h-[260px] place-items-center rounded-2xl border border-dashed border-slate-200 px-4 text-center">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      No se encontraron metas
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Crea tu primera meta financiera para empezar a ahorrar.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>

      <GoalContributionModal
        open={Boolean(goalToContribute)}
        goal={goalToContribute}
        accounts={accounts}
        contribution={contributionForm}
        onChange={setContributionForm}
        onCancel={() => setGoalToContribute(null)}
        onSubmit={handleSubmitContribution}
      />

      <ConfirmModal
        open={Boolean(goalToCancel)}
        title="Cancelar meta"
        message={`La meta "${goalToCancel?.nombre}" quedará cancelada. Sus aportes y transacciones no se eliminarán.`}
        confirmLabel="Cancelar meta"
        cancelLabel="Volver"
        variant="danger"
        onCancel={() => setGoalToCancel(null)}
        onConfirm={() => {
          if (goalToCancel) {
            handleCancelGoal(goalToCancel.id_meta);
          }
        }}
      />
    </div>
  );
}