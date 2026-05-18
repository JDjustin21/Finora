import { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import AccountCard from '../components/AccountCard';
import AccountForm from '../components/AccountForm';
import ConfirmModal from '../components/ConfirmModal';
import api from '../services/api';
import LoadingScreen from '../components/LoadingScreen';
import { formatMoney, normalizeText } from '../utils/formatters';
import {
  buildAccountsWithCurrentBalance,
  buildMap,
  normalizeUserTransactions,
} from '../utils/finance';

import {
  CreditCard,
  Layers,
  Wallet,
} from 'lucide-react';

function getStoredUser() {
  const localUser = localStorage.getItem('finora_usuario');
  const sessionUser = sessionStorage.getItem('finora_usuario');
  const storedUser = localUser || sessionUser;

  return storedUser ? JSON.parse(storedUser) : null;
}

function getInitialAccount(accountTypes = []) {
  return {
    nombre: '',
    id_tipo_cuenta: accountTypes[0]?.id_tipo_cuenta || '',
    saldo_inicial: '',
  };
}

function KpiDot({ className }) {
  return <span className={`h-2 w-2 rounded-full ${className}`} />;
}

export default function Cuentas({ usuario, onLogout }) {
  const currentUser = usuario || getStoredUser();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [search, setSearch] = useState('');

  const [accounts, setAccounts] = useState([]);
  const [accountTypes, setAccountTypes] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [accountToDeactivate, setAccountToDeactivate] = useState(null);

  const [accountForm, setAccountForm] = useState(getInitialAccount());

  const [showTypeForm, setShowTypeForm] = useState(false);
  const [newType, setNewType] = useState({
    nombre: '',
    descripcion: '',
  });

  const userFullName = currentUser
    ? `${currentUser.nombres} ${currentUser.apellidos}`
    : 'Usuario';

  const accountTypesMap = useMemo(() => {
    return accountTypes.reduce((acc, type) => {
      acc[type.id_tipo_cuenta] = type;
      return acc;
    }, {});
  }, [accountTypes]);

  const categoriesMap = useMemo(() => {
    return buildMap(categories, 'id_categoria');
  }, [categories]);

  const accountsMap = useMemo(() => {
    return buildMap(accounts, 'id_cuenta');
  }, [accounts]);

  const normalizedTransactions = useMemo(() => {
    return normalizeUserTransactions({
      transacciones: transactions,
      cuentas: accounts,
      categoriasMap: categoriesMap,
      cuentasMap: accountsMap,
    });
  }, [transactions, accounts, categoriesMap, accountsMap]);

  const accountsWithBalance = useMemo(() => {
    return buildAccountsWithCurrentBalance({
      accounts,
      transactions: normalizedTransactions,
    });
  }, [accounts, normalizedTransactions]);

  const totalCurrentBalance = useMemo(() => {
    return accountsWithBalance.reduce((total, account) => {
      return total + Number(account.saldo_actual || 0);
    }, 0);
  }, [accountsWithBalance]);

  const filteredAccounts = useMemo(() => {
    const searchValue = normalizeText(search);

    return accountsWithBalance.filter((account) => {
      const typeName = accountTypesMap[account.id_tipo_cuenta]?.nombre || '';

      return (
        normalizeText(account.nombre).includes(searchValue) ||
        normalizeText(typeName).includes(searchValue) ||
        normalizeText(account.saldo_inicial).includes(searchValue) ||
        normalizeText(account.saldo_actual).includes(searchValue)
      );
    });
  }, [accountsWithBalance, accountTypesMap, search]);

  async function loadAccountsModule() {
    setLoading(true);
    setErrorMessage('');

    try {
      const [accountsResponse, typesResponse, transactionsResponse, categoriesResponse] =
        await Promise.all([
          api.get('/finanzas/cuentas/?include_inactive=true'),
          api.get('/finanzas/cuentas/tipos'),
          api.get('/transacciones/'),
          api.get('/categorias/'),
        ]);

      setAccounts(accountsResponse.data);
      setAccountTypes(typesResponse.data);
      setTransactions(transactionsResponse.data);
      setCategories(categoriesResponse.data);

      setAccountForm((prev) => ({
        ...prev,
        id_tipo_cuenta:
          prev.id_tipo_cuenta || typesResponse.data[0]?.id_tipo_cuenta || '',
      }));
    } catch (error) {
      console.error('Error cargando módulo de cuentas:', error.response?.data || error);
      setErrorMessage(
        error.response?.data?.message || 'No se pudo cargar el módulo de cuentas.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccountsModule();
  }, []);

  function resetAccountForm() {
    setShowAccountForm(false);
    setEditingAccountId(null);
    setAccountForm(getInitialAccount(accountTypes));
  }

  async function handleSubmitAccount(event) {
    event.preventDefault();
    setErrorMessage('');

    const nombre = accountForm.nombre.trim();
    const saldoInicial = Number(accountForm.saldo_inicial || 0);

    if (!nombre) {
      setErrorMessage('El nombre de la cuenta es obligatorio.');
      return;
    }

    if (!accountForm.id_tipo_cuenta) {
      setErrorMessage('Debes seleccionar un tipo de cuenta.');
      return;
    }

    if (Number.isNaN(saldoInicial) || saldoInicial < 0) {
      setErrorMessage('El saldo inicial debe ser un número mayor o igual a cero.');
      return;
    }

    const payload = {
      nombre,
      id_tipo_cuenta: Number(accountForm.id_tipo_cuenta),
      saldo_inicial: saldoInicial,
    };

    try {
      if (editingAccountId) {
        await api.put(`/finanzas/cuentas/${editingAccountId}`, payload);
      } else {
        await api.post('/finanzas/cuentas/', payload);
      }

      resetAccountForm();
      await loadAccountsModule();
    } catch (error) {
      console.error('Error guardando cuenta:', error.response?.data || error);
      setErrorMessage(
        error.response?.data?.message || 'No se pudo guardar la cuenta.'
      );
    }
  }

  function handleStartEditAccount(account) {
    setErrorMessage('');
    setEditingAccountId(account.id_cuenta);
    setAccountForm({
      nombre: account.nombre || '',
      id_tipo_cuenta: account.id_tipo_cuenta || '',
      saldo_inicial: account.saldo_inicial ?? '',
    });
    setShowAccountForm(true);
  }

  async function handleDeactivateAccount(accountId) {
    setErrorMessage('');

    try {
      await api.delete(`/finanzas/cuentas/${accountId}`);

      if (editingAccountId === accountId) {
        resetAccountForm();
      }

      setAccountToDeactivate(null);
      await loadAccountsModule();
    } catch (error) {
      console.error('Error desactivando cuenta:', error.response?.data || error);
      setErrorMessage(
        error.response?.data?.message || 'No se pudo desactivar la cuenta.'
      );
    }
  }

  async function handleCreateAccountType(event) {
    event.preventDefault();
    setErrorMessage('');

    const nombre = newType.nombre.trim();
    const descripcion = newType.descripcion.trim();

    if (!nombre) {
      setErrorMessage('El nombre del tipo de cuenta es obligatorio.');
      return;
    }

    try {
      const response = await api.post('/finanzas/cuentas/tipos', {
        nombre,
        descripcion,
      });

      setNewType({
        nombre: '',
        descripcion: '',
      });

      setShowTypeForm(false);
      await loadAccountsModule();

      setAccountForm((prev) => ({
        ...prev,
        id_tipo_cuenta: response.data.id_tipo_cuenta,
      }));
    } catch (error) {
      console.error('Error creando tipo de cuenta:', error.response?.data || error);
      setErrorMessage(
        error.response?.data?.message || 'No se pudo crear el tipo de cuenta.'
      );
    }
  }

  async function handleActivateAccount(accountId) {
    setErrorMessage('');

    try {
      await api.patch(`/finanzas/cuentas/${accountId}/activar`);
      await loadAccountsModule();
    } catch (error) {
      console.error('Error activando cuenta:', error.response?.data || error);
      setErrorMessage(
        error.response?.data?.message || 'No se pudo activar la cuenta.'
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
          placeholder="Buscar cuentas por nombre, tipo o saldo..."
          onLogout={onLogout}
          onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
        />

        <main className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden px-4 py-5 lg:px-8">
          <section className="shrink-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-600">
              Gestión financiera
            </p>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Cuentas
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Administra las cuentas desde donde registras ingresos, gastos y movimientos financieros.
            </p>
          </section>

          {errorMessage && (
            <div className="shrink-0 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {errorMessage}
            </div>
          )}

          <section className="grid shrink-0 grid-cols-1 gap-4 md:grid-cols-3">

            {/* Cuentas activas */}
            <article className="rounded-2xl border border-violet-100 bg-violet-50 p-5 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.03] hover:shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-600">
                    Cuentas activas
                  </p>

                  <p className="mt-3 text-3xl font-semibold text-violet-950">
                    {accounts.filter((account) => account.activa).length}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Productos financieros disponibles
                  </p>
                </div>

                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-100">
                  <CreditCard className="h-6 w-6 text-violet-700" />
                </div>
              </div>
            </article>


            {/* Tipos disponibles */}
            <article className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.03] hover:shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-600">
                    Tipos disponibles
                  </p>

                  <p className="mt-3 text-3xl font-semibold text-blue-950">
                    {accountTypes.length}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Categorías configuradas
                  </p>
                </div>

                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-100">
                  <Layers className="h-6 w-6 text-blue-700" />
                </div>
              </div>
            </article>


            {/* Saldo total */}
            <article className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.03] hover:shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-600">
                    Saldo total actual
                  </p>

                  <p className="mt-3 text-3xl font-semibold text-emerald-950">
                    {formatMoney(totalCurrentBalance)}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Liquidez consolidada
                  </p>
                </div>

                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100">
                  <Wallet className="h-6 w-6 text-emerald-700" />
                </div>
              </div>
            </article>

          </section>

          <section className="flex min-h-0 flex-1 flex-col rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="shrink-0 border-b border-slate-200 px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-2xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800"
                    onClick={() => {
                      if (showAccountForm) {
                        resetAccountForm();
                        return;
                      }

                      setEditingAccountId(null);
                      setAccountForm(getInitialAccount(accountTypes));
                      setShowAccountForm(true);
                    }}
                  >
                    {showAccountForm ? 'Cancelar' : '+ Nueva cuenta'}
                  </button>

                  <button
                    type="button"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
                    onClick={() => setShowTypeForm((value) => !value)}
                  >
                    {showTypeForm ? 'Cancelar tipo' : '+ Tipo de cuenta'}
                  </button>
                </div>
              </div>

              {showAccountForm && (
                <div className="mt-4 rounded-3xl border border-violet-100 bg-violet-50/60 p-4">
                  <AccountForm
                    account={accountForm}
                    accountTypes={accountTypes}
                    onChange={setAccountForm}
                    onSubmit={handleSubmitAccount}
                    submitLabel={
                      editingAccountId ? 'Actualizar cuenta' : 'Guardar cuenta'
                    }
                  />
                </div>
              )}

              {showTypeForm && (
                <form
                  className="mt-4 grid grid-cols-1 gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3"
                  onSubmit={handleCreateAccountType}
                >
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Nombre del tipo
                    </label>
                    <input
                      className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                      type="text"
                      value={newType.nombre}
                      onChange={(e) =>
                        setNewType({
                          ...newType,
                          nombre: e.target.value,
                        })
                      }
                      placeholder="Ej: Cuenta universitaria"
                    />
                  </div>

                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Descripción
                    </label>
                    <input
                      className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                      type="text"
                      value={newType.descripcion}
                      onChange={(e) =>
                        setNewType({
                          ...newType,
                          descripcion: e.target.value,
                        })
                      }
                      placeholder="Descripción opcional"
                    />
                  </div>

                  <div className="flex items-end md:col-span-3">
                    <button
                      type="submit"
                      className="h-11 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                    >
                      Guardar tipo
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              {loading ? (
                <LoadingScreen message="Cargando cuentas..." />
              ) : filteredAccounts.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {filteredAccounts.map((account) => (
                    <AccountCard
                      key={account.id_cuenta}
                      account={account}
                      accountTypeName={accountTypesMap[account.id_tipo_cuenta]?.nombre}
                      formatMoney={formatMoney}
                      onEdit={() => handleStartEditAccount(account)}
                      onDeactivate={() => setAccountToDeactivate(account)}
                      onActivate={() => handleActivateAccount(account.id_cuenta)}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid h-full min-h-[260px] place-items-center rounded-2xl border border-dashed border-slate-200 px-4 text-center">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      No se encontraron cuentas
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Crea tu primera cuenta para empezar a registrar transacciones.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <ConfirmModal
              open={Boolean(accountToDeactivate)}
              title="Desactivar cuenta"
              message={`La cuenta "${accountToDeactivate?.nombre}" se ocultará de transacciones y dejará de afectar los cálculos. Podrás activarla nuevamente cuando quieras.`}
              confirmLabel="Desactivar"
              cancelLabel="Cancelar"
              variant="danger"
              onCancel={() => setAccountToDeactivate(null)}
              onConfirm={() => handleDeactivateAccount(accountToDeactivate.id_cuenta)}
            />
          </section>
        </main>
      </div>
    </div>
  );
}