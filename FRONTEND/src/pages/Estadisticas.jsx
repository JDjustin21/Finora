import { useEffect, useMemo, useState } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import {
    buildAccountBalanceData,
    buildPeriodData,
    filterTransactionsForStatistics,
} from '../utils/statistics';

import {
    exportStatisticsToCSV,
    exportStatisticsToExcel,
    exportStatisticsToPDF,
} from '../utils/exporters';

import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import FinancialHealthCard from '../components/FinancialHealthCard';
import ExportPanel from '../components/ExportPanel';
import InfoModal from '../components/InfoModal';
import ChartInfoButton from '../components/ChartInfoButton';
import api from '../services/api';
import LoadingScreen from '../components/LoadingScreen';
import { formatMoney, normalizeText } from '../utils/formatters';
import {
    buildMap,
    normalizeUserTransactions,
} from '../utils/finance';
import { getStoredPreferences } from '../utils/preferences';

function getStoredUser() {
    const localUser = localStorage.getItem('finora_usuario');
    const sessionUser = sessionStorage.getItem('finora_usuario');
    const storedUser = localUser || sessionUser;

    return storedUser ? JSON.parse(storedUser) : null;
}

function getMonthKey(dateValue) {
    const date = new Date(`${dateValue}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return 'Sin fecha';
    }

    return date.toLocaleDateString('es-CO', {
        month: 'short',
        year: 'numeric',
    });
}

function getMonthIndex(dateValue) {
    const date = new Date(`${dateValue}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return 0;
    }

    return date.getFullYear() * 12 + date.getMonth();
}

function calculateVariation(currentValue, previousValue) {
    if (!previousValue) {
        return currentValue > 0 ? 100 : 0;
    }

    return ((currentValue - previousValue) / previousValue) * 100;
}

function formatPercent(value) {
    return `${Number(value || 0).toFixed(1)}%`;
}

function buildMonthlyData(transactions) {
    const grouped = transactions.reduce((acc, transaction) => {
        const monthKey = getMonthKey(transaction.fecha_movimiento);
        const monthIndex = getMonthIndex(transaction.fecha_movimiento);

        if (!acc[monthKey]) {
            acc[monthKey] = {
                mes: monthKey,
                monthIndex,
                ingresos: 0,
                gastos: 0,
                balance: 0,
            };
        }

        const amount = Math.abs(Number(transaction.amount || 0));

        if (transaction.tipoMovimiento === 'INGRESO') {
            acc[monthKey].ingresos += amount;
        }

        if (transaction.tipoMovimiento === 'GASTO') {
            acc[monthKey].gastos += amount;
        }

        acc[monthKey].balance = acc[monthKey].ingresos - acc[monthKey].gastos;

        return acc;
    }, {});

    return Object.values(grouped).sort((a, b) => a.monthIndex - b.monthIndex);
}

function buildExpenseDistribution(transactions) {
    const expenses = transactions.filter((transaction) => {
        return transaction.tipoMovimiento === 'GASTO';
    });

    const totalExpenses = expenses.reduce((total, transaction) => {
        return total + Math.abs(Number(transaction.amount || 0));
    }, 0);

    const grouped = expenses.reduce((acc, transaction) => {
        const categoryName = transaction.title || 'Sin categoría';

        if (!acc[categoryName]) {
            acc[categoryName] = {
                name: categoryName,
                value: 0,
                percent: 0,
            };
        }

        acc[categoryName].value += Math.abs(Number(transaction.amount || 0));

        return acc;
    }, {});

    return Object.values(grouped)
        .map((item) => ({
            ...item,
            percent: totalExpenses > 0 ? (item.value / totalExpenses) * 100 : 0,
        }))
        .sort((a, b) => b.value - a.value);
}

function calculateFinancialScore({
    totalIncome,
    totalExpenses,
    totalSavedGoals,
    totalGoalTarget,
    periodData,
}) {
    const savingRate = totalIncome > 0
        ? Math.max(0, ((totalIncome - totalExpenses) / totalIncome) * 100)
        : 0;

    const expenseControl = totalIncome > 0
        ? Math.max(0, 100 - (totalExpenses / totalIncome) * 100)
        : 0;

    const goalProgress = totalGoalTarget > 0
        ? Math.min((totalSavedGoals / totalGoalTarget) * 100, 100)
        : 0;

    const positiveMonths = periodData.filter((month) => month.balance >= 0).length;
    const stability = periodData.length > 0
        ? (positiveMonths / periodData.length) * 100
        : 0;

    const score =
        savingRate * 0.3 +
        expenseControl * 0.3 +
        goalProgress * 0.2 +
        stability * 0.2;

    return Math.round(Math.max(0, Math.min(score, 100)));
}

function buildProjection(periodData) {
    if (periodData.length === 0) {
        return [];
    }

    const recentMonths = periodData.slice(-3);
    const averageBalance =
        recentMonths.reduce((total, month) => total + Number(month.balance || 0), 0) /
        recentMonths.length;

    const lastMonth = periodData[periodData.length - 1];

    return [
        ...periodData,
        {
            periodo: 'Próx.',
            ingresos: lastMonth.ingresos,
            gastos: lastMonth.gastos,
            balance: lastMonth.balance,
            proyeccion: lastMonth.balance + averageBalance,
        },
    ];
}

function FormulaBox({ children }) {
    return (
        <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
                Fórmula utilizada
            </p>

            <div className="mt-2 rounded-xl bg-white px-4 py-3 font-mono text-sm font-semibold text-slate-800 shadow-sm">
                {children}
            </div>
        </div>
    );
}

function InfoStep({ number, title, description }) {
    return (
        <div className="flex gap-3 rounded-2xl bg-slate-50 p-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-violet-700 text-sm font-bold text-white">
                {number}
            </div>

            <div>
                <p className="text-sm font-semibold text-slate-900">{title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                    {description}
                </p>
            </div>
        </div>
    );
}

function ChartExplanation({ intro, formula, steps = [], note }) {
    return (
        <div className="space-y-5">
            <p className="text-sm leading-6 text-slate-500">{intro}</p>

            {formula && <FormulaBox>{formula}</FormulaBox>}

            {steps.length > 0 && (
                <div className="space-y-3">
                    {steps.map((step, index) => (
                        <InfoStep
                            key={step.title}
                            number={index + 1}
                            title={step.title}
                            description={step.description}
                        />
                    ))}
                </div>
            )}

            {note && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                        Nota de lectura
                    </p>

                    <p className="mt-1 text-sm leading-6 text-amber-800">
                        {note}
                    </p>
                </div>
            )}
        </div>
    );
}

export default function Estadisticas({ usuario, onLogout }) {
    const currentUser = usuario || getStoredUser();

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [search, setSearch] = useState('');
    const [range, setRange] = useState(() => {
        return getStoredPreferences().periodoInicio || 'Mensual';
    });
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedAccountId, setSelectedAccountId] = useState('');


    const [accounts, setAccounts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [goals, setGoals] = useState([]);
    const [goalContributions, setGoalContributions] = useState([]);

    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [statsInfo, setStatsInfo] = useState(null);

    const [preferences, setPreferences] = useState(getStoredPreferences);
    useEffect(() => {
        setPreferences(getStoredPreferences());
    }, []);

    const userFullName = currentUser
        ? `${currentUser.nombres} ${currentUser.apellidos}`
        : 'Usuario';

    const todayISO = new Date().toISOString().slice(0, 10);

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

    const transactionsMap = useMemo(() => {
        return buildMap(normalizedTransactions, 'id_transaccion');
    }, [normalizedTransactions]);

    const userGoalIds = useMemo(() => {
        return new Set(goals.map((goal) => goal.id_meta));
    }, [goals]);

    const goalsForCurrentView = useMemo(() => {
        if (!selectedAccountId) {
            return goals;
        }

        return goals.map((goal) => {
            const savedFromSelectedAccount = goalContributions
                .filter((contribution) => {
                    const transaction = transactionsMap[contribution.id_transaccion];

                    return (
                        contribution.id_meta === goal.id_meta &&
                        transaction &&
                        transaction.id_cuenta === Number(selectedAccountId)
                    );
                })
                .reduce((total, contribution) => {
                    return total + Number(contribution.monto || 0);
                }, 0);

            const targetAmount = Number(goal.monto_objetivo || 0);
            const progress =
                targetAmount > 0
                    ? Math.min((savedFromSelectedAccount / targetAmount) * 100, 100)
                    : 0;

            return {
                ...goal,
                monto_ahorrado: savedFromSelectedAccount,
                monto_restante: Math.max(targetAmount - savedFromSelectedAccount, 0),
                porcentaje_cumplimiento: progress,
            };
        });
    }, [goals, goalContributions, transactionsMap, selectedAccountId]);

    const accountBalanceData = useMemo(() => {
        return buildAccountBalanceData(accounts, normalizedTransactions);
    }, [accounts, normalizedTransactions]);

    const selectedAccount = useMemo(() => {
        if (!selectedAccountId) return null;

        return accounts.find((account) => {
            return account.id_cuenta === Number(selectedAccountId);
        });
    }, [accounts, selectedAccountId]);

    const filteredTransactions = useMemo(() => {
        return filterTransactionsForStatistics({
            transactions: normalizedTransactions,
            search,
            startDate,
            endDate,
            selectedAccountId,
            normalizeText,
        });
    }, [
        normalizedTransactions,
        search,
        startDate,
        endDate,
        selectedAccountId,
    ]);

    const totals = useMemo(() => {
        const totalIncome = filteredTransactions
            .filter((transaction) => transaction.tipoMovimiento === 'INGRESO')
            .reduce((total, transaction) => total + Math.abs(Number(transaction.amount || 0)), 0);

        const totalExpenses = filteredTransactions
            .filter((transaction) => transaction.tipoMovimiento === 'GASTO')
            .reduce((total, transaction) => total + Math.abs(Number(transaction.amount || 0)), 0);

        const netBalance = totalIncome - totalExpenses;

        const totalSavedGoals = goalsForCurrentView.reduce((total, goal) => {
            return total + Number(goal.monto_ahorrado || 0);
        }, 0);

        const totalGoalTarget = goalsForCurrentView.reduce((total, goal) => {
            return total + Number(goal.monto_objetivo || 0);
        }, 0);

        const savingPercent = totalIncome > 0
            ? ((totalIncome - totalExpenses) / totalIncome) * 100
            : 0;

        return {
            totalIncome,
            totalExpenses,
            netBalance,
            totalSavedGoals,
            totalGoalTarget,
            savingPercent,
        };
    }, [filteredTransactions, goalsForCurrentView]);

    const periodData = useMemo(() => {
        return buildPeriodData(filteredTransactions, range);
    }, [filteredTransactions, range]);

    const projectedData = useMemo(() => {
        return buildProjection(periodData);
    }, [periodData]);

    const expenseDistribution = useMemo(() => {
        return buildExpenseDistribution(filteredTransactions);
    }, [filteredTransactions]);

    const topExpenseCategory = expenseDistribution[0];

    const currentMonth = periodData[periodData.length - 1];
    const previousMonth = periodData[periodData.length - 2];

    const expenseVariation = calculateVariation(
        currentMonth?.gastos || 0,
        previousMonth?.gastos || 0
    );

    const incomeVariation = calculateVariation(
        currentMonth?.ingresos || 0,
        previousMonth?.ingresos || 0
    );

    const financialScore = calculateFinancialScore({
        totalIncome: totals.totalIncome,
        totalExpenses: totals.totalExpenses,
        totalSavedGoals: totals.totalSavedGoals,
        totalGoalTarget: totals.totalGoalTarget,
        periodData,
    });

    const healthInterpretation =
        financialScore >= 75
            ? 'Tu salud financiera es estable. Mantienes una buena relación entre ingresos, gastos y metas.'
            : financialScore >= 50
                ? 'Tu situación financiera es aceptable, pero hay oportunidades claras para mejorar el ahorro.'
                : 'Tu salud financiera necesita atención. Tus gastos están limitando tu capacidad de ahorro.';

    const healthRecommendation =
        financialScore >= 75
            ? 'Mantén la constancia y revisa tus metas para acelerar las más importantes.'
            : financialScore >= 50
                ? 'Reduce gastos variables y aumenta aportes pequeños pero frecuentes a tus metas.'
                : 'Prioriza gastos esenciales y evita nuevos gastos que superen el saldo disponible de tus cuentas.';


    function getExportSummary() {
        return {
            totalIncome: totals.totalIncome,
            totalExpenses: totals.totalExpenses,
            netBalance: totals.netBalance,
            totalSavedGoals: totals.totalSavedGoals,
            savingPercent: totals.savingPercent,
        };
    }

    function handleExportCSV() {
        exportStatisticsToCSV({
            transactions: filteredTransactions,
            filename: 'finora-estadisticas.csv',
        });
    }

    function handleExportExcel() {
        exportStatisticsToExcel({
            transactions: filteredTransactions,
            summary: getExportSummary(),
            filename: 'finora-estadisticas.xlsx',
        });
    }

    function handleExportPDF() {
        exportStatisticsToPDF({
            transactions: filteredTransactions,
            summary: getExportSummary(),
            accountName: selectedAccount?.nombre,
            filename: 'finora-estadisticas.pdf',
        });
    }
    const goalProgressData = useMemo(() => {
        return goalsForCurrentView.map((goal) => ({
            nombre: goal.nombre,
            porcentaje: Number(goal.porcentaje_cumplimiento || 0),
            ahorrado: Number(goal.monto_ahorrado || 0),
            restante: Number(goal.monto_restante || 0),
        }));
    }, [goalsForCurrentView]);

    async function loadStatisticsData() {
        if (!currentUser?.id_usuario) return;

        setLoading(true);
        setErrorMessage('');

        try {
            const [
                accountsResponse,
                categoriesResponse,
                transactionsResponse,
                goalsResponse,
                contributionsResponse,
            ] = await Promise.all([
                api.get('/finanzas/cuentas/'),
                api.get('/categorias/'),
                api.get('/transacciones/'),
                api.get('/finanzas/metas/'),
                api.get('/aportes_meta/'),
            ]);

            const userCategories = categoriesResponse.data.filter((category) => {
                return (
                    category.id_usuario === currentUser.id_usuario ||
                    category.id_usuario === null
                );
            });

            setAccounts(accountsResponse.data);
            setCategories(userCategories);
            setTransactions(transactionsResponse.data);
            setGoals(goalsResponse.data);
            setGoalContributions(contributionsResponse.data);
        } catch (error) {
            console.error('Error cargando estadísticas:', error.response?.data || error);
            setErrorMessage(
                error.response?.data?.message || 'No se pudieron cargar las estadísticas.'
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadStatisticsData();
    }, [currentUser?.id_usuario]);

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
            <Sidebar collapsed={sidebarCollapsed} />

            <div className="flex min-w-0 flex-1 flex-col">
                <Header
                    userName={userFullName}
                    searchValue={search}
                    onSearchChange={setSearch}
                    placeholder="Buscar categorías, cuentas o movimientos..."
                    onLogout={onLogout}
                    onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
                />

                <main className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-5 lg:px-8">
                    <section className="shrink-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-600">
                            Inteligencia financiera
                        </p>

                        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                                    Estadísticas
                                </h1>

                                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                                    Entiende tus ingresos, gastos, hábitos financieros, metas y
                                    proyecciones en una sola vista.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <select
                                    value={range}
                                    onChange={(event) => setRange(event.target.value)}
                                    className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                                >
                                    <option value="Semanal">Semanal</option>
                                    <option value="Mensual">Mensual</option>
                                    <option value="Trimestral">Trimestral</option>
                                    <option value="Anual">Anual</option>
                                </select>

                                <input
                                    type="date"
                                    max={todayISO}
                                    value={startDate}
                                    onChange={(event) => setStartDate(event.target.value)}
                                    className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                                    aria-label="Fecha inicial"
                                />

                                <input
                                    type="date"
                                    max={todayISO}
                                    value={endDate}
                                    onChange={(event) => setEndDate(event.target.value)}
                                    className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                                    aria-label="Fecha final"
                                />

                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedAccountId('');
                                        setStartDate('');
                                        setEndDate('');
                                        setSearch('');
                                    }}
                                    className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
                                >
                                    Limpiar vista
                                </button>
                            </div>
                        </div>
                    </section>

                    {errorMessage && (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                            {errorMessage}
                        </div>
                    )}

                    {loading ? (
                        <LoadingScreen message="Cargando estadísticas financieras..." />
                    ) : (
                        <>
                            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <StatCard
                                    title="Ingresos totales"
                                    value={formatMoney(totals.totalIncome)}
                                    subtitle="Dinero recibido en el período analizado."
                                    trend={`Variación: ${formatPercent(incomeVariation)}`}
                                    tone="emerald"
                                    icon="↑"
                                />

                                <StatCard
                                    title="Gastos totales"
                                    value={formatMoney(totals.totalExpenses)}
                                    subtitle={
                                        expenseVariation > 0
                                            ? `Tus gastos aumentaron ${formatPercent(expenseVariation)}.`
                                            : 'Tus gastos se mantienen controlados.'
                                    }
                                    trend={topExpenseCategory ? `Mayor gasto: ${topExpenseCategory.name}` : 'Sin gastos registrados'}
                                    tone="rose"
                                    icon="↓"
                                />

                                <StatCard
                                    title="Balance neto"
                                    value={formatMoney(totals.netBalance)}
                                    subtitle={
                                        totals.netBalance >= 0
                                            ? 'Tus ingresos cubren tus gastos.'
                                            : 'Tus gastos superan tus ingresos.'
                                    }
                                    trend={totals.netBalance >= 0 ? 'Balance positivo' : 'Revisar gastos'}
                                    tone={totals.netBalance >= 0 ? 'blue' : 'amber'}
                                    icon="="
                                />

                                <StatCard
                                    title="Ahorro acumulado"
                                    value={formatMoney(totals.totalSavedGoals)}
                                    subtitle={
                                        selectedAccount
                                            ? `Esta cuenta ha aportado ${formatPercent(
                                                totals.totalGoalTarget > 0
                                                    ? (totals.totalSavedGoals / totals.totalGoalTarget) * 100
                                                    : 0
                                            )} del objetivo total de tus metas.`
                                            : `Has completado ${formatPercent(
                                                totals.totalGoalTarget > 0
                                                    ? (totals.totalSavedGoals / totals.totalGoalTarget) * 100
                                                    : 0
                                            )} de tus metas.`
                                    }
                                    trend={`Tasa de ahorro: ${formatPercent(totals.savingPercent)}`}
                                    tone="violet"
                                    icon="★"
                                />
                            </section>

                            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="flex items-start gap-4">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-600">
                                                Vista por cuenta
                                            </p>

                                            <h2 className="mt-2 text-lg font-semibold text-slate-950">
                                                Saldo actual de cuentas
                                            </h2>

                                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                                Selecciona una cuenta para filtrar todo el dashboard únicamente con sus movimientos.
                                            </p>
                                        </div>

                                        <ChartInfoButton
                                            onClick={() =>
                                                setStatsInfo({
                                                    title: 'Saldo actual por cuenta',
                                                    content: (
                                                        <ChartExplanation
                                                            intro="Este gráfico muestra cuánto dinero tiene actualmente cada cuenta registrada en Finora. Sirve para comparar rápidamente qué cuenta concentra más saldo disponible."
                                                            formula={
                                                                <>
                                                                    Saldo actual = Saldo inicial + Ingresos - Gastos
                                                                </>
                                                            }
                                                            steps={[
                                                                {
                                                                    title: 'Parte del saldo inicial',
                                                                    description:
                                                                        'Finora toma el saldo que registraste al crear la cuenta.',
                                                                },
                                                                {
                                                                    title: 'Suma los ingresos reales',
                                                                    description:
                                                                        'Se agregan únicamente las transacciones de tipo ingreso asociadas a esa cuenta.',
                                                                },
                                                                {
                                                                    title: 'Resta los gastos reales',
                                                                    description:
                                                                        'Se descuentan las transacciones de tipo gasto asociadas a esa misma cuenta.',
                                                                },
                                                            ]}
                                                            note="Si haces clic en una cuenta, todo el módulo de estadísticas se recalcula usando solo los movimientos de esa cuenta."
                                                        />
                                                    ),
                                                })
                                            }
                                        />
                                    </div>

                                    {selectedAccount && (
                                        <button
                                            type="button"
                                            onClick={() => setSelectedAccountId('')}
                                            className="rounded-2xl bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
                                        >
                                            Volver a vista global
                                        </button>
                                    )}
                                </div>

                                <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
                                    <div className="h-[260px] xl:col-span-2">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={accountBalanceData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
                                                <YAxis tick={{ fontSize: 12 }} />
                                                <Tooltip formatter={(value) => formatMoney(value)} />
                                                <Bar dataKey="saldo_actual" radius={[12, 12, 0, 0]}>
                                                    {accountBalanceData.map((account) => (
                                                        <Cell
                                                            key={account.id_cuenta}
                                                            cursor="pointer"
                                                            fill={
                                                                Number(selectedAccountId) === account.id_cuenta
                                                                    ? '#7c3aed'
                                                                    : '#c4b5fd'
                                                            }
                                                            onClick={() => setSelectedAccountId(account.id_cuenta)}
                                                        />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className="rounded-3xl bg-slate-50 p-5">
                                        <p className="text-sm font-semibold text-slate-600">
                                            Vista actual
                                        </p>

                                        <p className="mt-3 text-2xl font-semibold text-slate-950">
                                            {selectedAccount ? selectedAccount.nombre : 'Todas las cuentas'}
                                        </p>

                                        <p className="mt-2 text-sm leading-6 text-slate-500">
                                            {selectedAccount
                                                ? 'Los indicadores y gráficos se están calculando solo con esta cuenta.'
                                                : 'Los indicadores y gráficos incluyen todas las cuentas activas.'}
                                        </p>
                                    </div>
                                </div>
                            </section>

                            <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                                <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-600">
                                            Evolución financiera
                                            </p>

                                            <h2 className="text-lg font-semibold text-slate-950">
                                            Ingresos, gastos y balance
                                            </h2>

                                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                            Muestra cómo cambian tus ingresos, gastos y balance según el período seleccionado.
                                            </p>
                                        </div>

                                        <ChartInfoButton
                                            onClick={() =>
                                                setStatsInfo({
                                                    title: 'Evolución financiera',
                                                    content: (
                                                        <ChartExplanation
                                                            intro="Este gráfico permite ver cómo se mueve tu dinero en el tiempo. No muestra una foto estática, sino la tendencia de tus ingresos, gastos y balance según el período seleccionado."
                                                            formula={
                                                                <>
                                                                    Balance del período = Ingresos del período - Gastos del período
                                                                </>
                                                            }
                                                            steps={[
                                                                {
                                                                    title: 'Agrupa por período',
                                                                    description:
                                                                        'Finora organiza tus movimientos por semana, mes, trimestre o año, según el filtro seleccionado.',
                                                                },
                                                                {
                                                                    title: 'Calcula ingresos y gastos',
                                                                    description:
                                                                        'Los ingresos suman categorías de tipo INGRESO. Los gastos suman categorías de tipo GASTO.',
                                                                },
                                                                {
                                                                    title: 'Dibuja la tendencia',
                                                                    description:
                                                                        'Cada línea muestra si tus ingresos, gastos o balance están subiendo, bajando o manteniéndose estables.',
                                                                },
                                                            ]}
                                                            note="Si el balance baja durante varios períodos, puede ser una señal de aumento de gastos o reducción de ingresos."
                                                        />
                                                    ),
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="mt-5 h-[320px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={periodData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
                                                <YAxis tick={{ fontSize: 12 }} />
                                                <Tooltip formatter={(value) => formatMoney(value)} />
                                                <Legend />
                                                <Line type="monotone" dataKey="ingresos" stroke="#10b981" strokeWidth={3} dot={false} />
                                                <Line type="monotone" dataKey="gastos" stroke="#f43f5e" strokeWidth={3} dot={false} />
                                                <Line type="monotone" dataKey="balance" stroke="#7c3aed" strokeWidth={3} dot={false} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </article>

                                <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-600">
                                            Distribución de gastos
                                            </p>

                                            <h2 className="mt-2 text-lg font-semibold text-slate-950">
                                            ¿En qué gastas más?
                                            </h2>
                                        </div>

                                        <ChartInfoButton
                                            onClick={() =>
                                                setStatsInfo({
                                                    title: 'Distribución de gastos',
                                                    content: (
                                                        <ChartExplanation
                                                            intro="Este gráfico responde una pregunta sencilla: ¿en qué se está yendo más tu dinero? Para eso, Finora reparte tus gastos por categoría."
                                                            formula={
                                                                <>
                                                                    Porcentaje de categoría = (Gasto de la categoría / Total de gastos) × 100
                                                                </>
                                                            }
                                                            steps={[
                                                                {
                                                                    title: 'Filtra solo gastos',
                                                                    description:
                                                                        'No se tienen en cuenta ingresos ni aportes que no correspondan a gastos reales de consumo.',
                                                                },
                                                                {
                                                                    title: 'Agrupa por categoría',
                                                                    description:
                                                                        'Cada gasto se suma dentro de su categoría, por ejemplo transporte, comida, entretenimiento o servicios.',
                                                                },
                                                                {
                                                                    title: 'Calcula participación',
                                                                    description:
                                                                        'Finora calcula qué porcentaje ocupa cada categoría dentro del total de gastos filtrados.',
                                                                },
                                                            ]}
                                                            note="Una categoría con porcentaje alto no siempre es mala; puede ser necesaria. Lo importante es detectar si está creciendo sin control."
                                                        />
                                                    ),
                                                })
                                            }
                                        />
                                        </div>

                                    <div className="mt-5 h-[240px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={expenseDistribution}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    innerRadius={55}
                                                    outerRadius={85}
                                                    paddingAngle={4}
                                                >
                                                    {expenseDistribution.map((entry, index) => (
                                                        <Cell
                                                            key={entry.name}
                                                            fill={[
                                                                '#7c3aed',
                                                                '#f43f5e',
                                                                '#10b981',
                                                                '#3b82f6',
                                                                '#f59e0b',
                                                                '#14b8a6',
                                                            ][index % 6]}
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value) => formatMoney(value)} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className="mt-4 space-y-2">
                                        {expenseDistribution.slice(0, 4).map((item) => (
                                            <div
                                                key={item.name}
                                                className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2"
                                            >
                                                <span className="text-sm font-medium text-slate-600">
                                                    {item.name}
                                                </span>
                                                <span className="text-sm font-semibold text-slate-950">
                                                    {formatPercent(item.percent)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </article>
                            </section>

                            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                                <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-600">
                                            Comparativo por período
                                            </p>

                                            <h2 className="mt-2 text-lg font-semibold text-slate-950">
                                            Ingresos vs gastos
                                            </h2>
                                        </div>

                                        <ChartInfoButton
                                            onClick={() =>
                                                setStatsInfo({
                                                    title: 'Ingresos vs gastos',
                                                    content: (
                                                        <ChartExplanation
                                                            intro="Este comparativo permite ver si en cada período entra más dinero del que sale. Es una lectura rápida para identificar meses o semanas financieramente pesadas."
                                                            formula={
                                                                <>
                                                                    Diferencia del período = Ingresos - Gastos
                                                                </>
                                                            }
                                                            steps={[
                                                                {
                                                                    title: 'Calcula ingresos',
                                                                    description:
                                                                        'Suma todas las transacciones reales clasificadas como ingreso en el período.',
                                                                },
                                                                {
                                                                    title: 'Calcula gastos',
                                                                    description:
                                                                        'Suma todas las transacciones reales clasificadas como gasto en el mismo período.',
                                                                },
                                                                {
                                                                    title: 'Compara ambos valores',
                                                                    description:
                                                                        'Si los gastos superan los ingresos, ese período tuvo presión financiera.',
                                                                },
                                                            ]}
                                                            note="Este gráfico es útil para detectar períodos donde conviene revisar hábitos, reducir gastos variables o ajustar metas."
                                                        />
                                                    ),
                                                })
                                            }
                                        />
                                        </div>

                                    <div className="mt-5 h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={periodData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
                                                <YAxis tick={{ fontSize: 12 }} />
                                                <Tooltip formatter={(value) => formatMoney(value)} />
                                                <Legend />
                                                <Bar dataKey="ingresos" fill="#10b981" radius={[10, 10, 0, 0]} />
                                                <Bar dataKey="gastos" fill="#f43f5e" radius={[10, 10, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </article>

                                <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-600">
                                            Progreso de metas
                                            </p>

                                            <h2 className="mt-2 text-lg font-semibold text-slate-950">
                                            {selectedAccount
                                                ? `Aportes desde ${selectedAccount.nombre}`
                                                : 'Avance consolidado'}
                                            </h2>
                                        </div>

                                        <ChartInfoButton
                                            onClick={() =>
                                                setStatsInfo({
                                                    title: 'Progreso de metas',
                                                    content: (
                                                        <ChartExplanation
                                                            intro="Esta sección muestra qué tan cerca estás de cumplir tus metas financieras. En vista global muestra el avance total; en vista por cuenta muestra cuánto ha aportado esa cuenta."
                                                            formula={
                                                                <>
                                                                    Progreso = (Monto ahorrado / Monto objetivo) × 100
                                                                </>
                                                            }
                                                            steps={[
                                                                {
                                                                    title: 'Toma el objetivo de la meta',
                                                                    description:
                                                                        'Cada meta tiene un monto objetivo definido por el usuario.',
                                                                },
                                                                {
                                                                    title: 'Suma los aportes realizados',
                                                                    description:
                                                                        'Finora suma los aportes registrados para saber cuánto dinero se ha acumulado.',
                                                                },
                                                                {
                                                                    title: 'Calcula el porcentaje',
                                                                    description:
                                                                        'El porcentaje indica qué parte del objetivo ya está cubierta.',
                                                                },
                                                            ]}
                                                            note={
                                                                selectedAccount
                                                                    ? 'Como hay una cuenta seleccionada, el cálculo muestra el aporte realizado desde esa cuenta específica, no necesariamente el avance global total.'
                                                                    : 'En vista global, el cálculo representa el avance consolidado de cada meta.'
                                                            }
                                                        />
                                                    ),
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="mt-5 space-y-4">
                                        {goalProgressData.length > 0 ? (
                                            goalProgressData.map((goal) => (
                                                <div key={goal.nombre}>
                                                    <div className="flex items-center justify-between gap-4">
                                                        <p className="text-sm font-semibold text-slate-700">
                                                            {goal.nombre}
                                                        </p>
                                                        <p className="text-sm font-semibold text-violet-700">
                                                            {formatPercent(goal.porcentaje)}
                                                        </p>
                                                    </div>

                                                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                                                        <div
                                                            className="h-full rounded-full bg-violet-600"
                                                            style={{ width: `${Math.min(goal.porcentaje, 100)}%` }}
                                                        />
                                                    </div>

                                                    <p className="mt-1 text-xs text-slate-400">
                                                        {selectedAccount
                                                            ? `Aportado desde esta cuenta: ${formatMoney(goal.ahorrado)}`
                                                            : `Ahorrado: ${formatMoney(goal.ahorrado)} · Falta: ${formatMoney(goal.restante)}`}
                                                    </p>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
                                                <p className="text-sm font-medium text-slate-400">
                                                    Aún no tienes metas financieras registradas.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </article>
                            </section>

                            <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                                <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-600">
                                            Proyección financiera
                                            </p>

                                            <h2 className="mt-2 text-lg font-semibold text-slate-950">
                                            Tendencia estimada
                                            </h2>

                                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                            Esta proyección usa un promedio móvil simple de los últimos períodos.
                                            </p>
                                        </div>

                                        <ChartInfoButton
                                            onClick={() =>
                                                setStatsInfo({
                                                    title: 'Proyección financiera',
                                                    content: (
                                                        <ChartExplanation
                                                            intro="Esta proyección no intenta adivinar el futuro. Toma tu comportamiento reciente y estima cómo podría verse el siguiente período si mantienes un patrón parecido."
                                                            formula={
                                                                <>
                                                                    Proyección = Último balance + Promedio de los últimos 3 balances
                                                                </>
                                                            }
                                                            steps={[
                                                                {
                                                                    title: 'Lee los últimos períodos',
                                                                    description:
                                                                        'Finora toma hasta los últimos tres períodos disponibles en la vista actual.',
                                                                },
                                                                {
                                                                    title: 'Calcula el promedio',
                                                                    description:
                                                                        'Se obtiene el promedio simple de esos balances recientes.',
                                                                },
                                                                {
                                                                    title: 'Estima el siguiente período',
                                                                    description:
                                                                        'Ese promedio se suma al último balance para crear una tendencia estimada.',
                                                                },
                                                            ]}
                                                            note="La proyección cambia si filtras por cuenta, rango de fechas o agrupación semanal, mensual, trimestral o anual."
                                                        />
                                                    ),
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="mt-5 h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={projectedData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
                                                <YAxis tick={{ fontSize: 12 }} />
                                                <Tooltip formatter={(value) => formatMoney(value)} />
                                                <Legend />
                                                <Area
                                                    type="monotone"
                                                    dataKey="balance"
                                                    stroke="#7c3aed"
                                                    fill="#ede9fe"
                                                    strokeWidth={3}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="proyeccion"
                                                    stroke="#0f172a"
                                                    fill="#f1f5f9"
                                                    strokeDasharray="6 6"
                                                    strokeWidth={3}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </article>

                                {preferences.mostrarInsights ? (
                                    <FinancialHealthCard
                                        score={financialScore}
                                        interpretation={healthInterpretation}
                                        recommendation={healthRecommendation}
                                    />
                                ) : (
                                    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-600">
                                            Índice Finora
                                        </p>

                                        <h2 className="mt-2 text-lg font-semibold text-slate-950">
                                            Insights desactivados
                                        </h2>

                                        <p className="mt-2 text-sm leading-6 text-slate-500">
                                            Los análisis automáticos están ocultos según tus preferencias.
                                            Puedes activarlos nuevamente desde Configuración.
                                        </p>
                                    </article>
                                )}
                            </section>

                            <ExportPanel
                                onExportPDF={handleExportPDF}
                                onExportExcel={handleExportExcel}
                                onExportCSV={handleExportCSV}
                            />
                        </>
                    )}
                </main>
            </div>

            <InfoModal
                open={Boolean(statsInfo)}
                title={statsInfo?.title}
                onClose={() => setStatsInfo(null)}
            >
                {statsInfo?.content}
            </InfoModal>
        </div>
    );
}