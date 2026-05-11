import { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import api from '../services/api';
import {
    applyAppearanceSettings,
    getStoredAppearance,
    getStoredPreferences,
    saveAppearance,
    savePreferences,
} from '../utils/preferences';

function getStoredUser() {
    const localUser = localStorage.getItem('finora_usuario');
    const sessionUser = sessionStorage.getItem('finora_usuario');
    const storedUser = localUser || sessionUser;

    return storedUser ? JSON.parse(storedUser) : null;
}

export default function Configuracion({ usuario, onLogout, onSettingsChange }) {
    const currentUser = usuario || getStoredUser();

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [search, setSearch] = useState('');

    const [profileForm, setProfileForm] = useState({
        nombres: '',
        apellidos: '',
        correo: '',
    });

    const [preferences, setPreferences] = useState(getStoredPreferences);
    const [appearance, setAppearance] = useState(getStoredAppearance);

    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const userFullName = currentUser
        ? `${currentUser.nombres} ${currentUser.apellidos}`
        : 'Usuario';

    const initials = useMemo(() => {
        const nombres = profileForm.nombres || currentUser?.nombres || 'U';
        const apellidos = profileForm.apellidos || currentUser?.apellidos || '';

        return `${nombres.charAt(0)}${apellidos.charAt(0)}`.toUpperCase();
    }, [profileForm, currentUser]);

    useEffect(() => {
        if (!currentUser) return;

        setProfileForm({
            nombres: currentUser.nombres || '',
            apellidos: currentUser.apellidos || '',
            correo: currentUser.correo || '',
        });
    }, [currentUser]);

    function updateStoredUser(updatedUser) {
        const localUser = localStorage.getItem('finora_usuario');
        const storage = localUser ? localStorage : sessionStorage;

        storage.setItem('finora_usuario', JSON.stringify(updatedUser));
    }

    async function handleSubmitProfile(event) {
        event.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        const nombres = profileForm.nombres.trim();
        const apellidos = profileForm.apellidos.trim();
        const correo = profileForm.correo.trim();

        if (!nombres || !apellidos || !correo) {
            setErrorMessage('Completa nombres, apellidos y correo.');
            return;
        }

        if (!currentUser?.id_usuario) {
            setErrorMessage('No se pudo identificar el usuario actual.');
            return;
        }

        setLoading(true);

        try {
            const payload = {
                nombres,
                apellidos,
                correo,
            };

            const response = await api.put(
                `/usuarios/${currentUser.id_usuario}`,
                payload
            );

            const updatedUser = {
                ...currentUser,
                ...response.data,
                nombres,
                apellidos,
                correo,
            };

            updateStoredUser(updatedUser);

            setSuccessMessage('Perfil actualizado correctamente.');
        } catch (error) {
            console.error('Error actualizando perfil:', error.response?.data || error);
            setErrorMessage(
                error.response?.data?.message || 'No se pudo actualizar el perfil.'
            );
        } finally {
            setLoading(false);
        }
    }

    function handleSavePreferences(event) {
        event.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        savePreferences(preferences);

        applyAppearanceSettings(
            getStoredAppearance(),
            preferences
        );

        onSettingsChange?.();

        setSuccessMessage(
            'Preferencias guardadas correctamente. Se aplicarán en la navegación y experiencia del sistema.'
        );
    }

    function handleSaveAppearance(event) {
        event.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        saveAppearance(appearance);

        applyAppearanceSettings(
            appearance,
            getStoredPreferences()
        );

        onSettingsChange?.();

        setSuccessMessage(
            'Apariencia guardada correctamente. Los cambios visuales ya fueron aplicados.'
        );
    }

    const inputClass =
        'h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100';

    const labelClass =
        'text-xs font-semibold uppercase tracking-wide text-slate-500';

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
            <Sidebar collapsed={sidebarCollapsed} />

            <div className="flex min-w-0 flex-1 flex-col">
                <Header
                    userName={userFullName}
                    searchValue={search}
                    onSearchChange={setSearch}
                    placeholder="Buscar configuración, perfil o preferencias..."
                    onLogout={onLogout}
                    onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
                />

                <main
                    className={
                        preferences.modoCompacto || appearance.densidad === 'Compacta'
                            ? 'flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 lg:px-6'
                            : 'flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-5 lg:px-8'
                    }
                >
                    <section>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-600">
                            Ajustes de cuenta
                        </p>

                        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                            Configuración
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                            Administra tus datos personales, preferencias del sistema y la
                            experiencia visual dentro de Finora.
                        </p>
                    </section>

                    {successMessage && (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                            {successMessage}
                        </div>
                    )}

                    {errorMessage && (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                            {errorMessage}
                        </div>
                    )}

                    <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-1">
                            <div className="flex flex-col items-center text-center">
                                <div className="grid h-24 w-24 place-items-center rounded-3xl bg-violet-700 text-3xl font-semibold text-white shadow-lg shadow-violet-200">
                                    {initials}
                                </div>

                                <h2 className="mt-4 text-lg font-semibold text-slate-950">
                                    {profileForm.nombres || 'Usuario'} {profileForm.apellidos}
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    {profileForm.correo || 'Sin correo registrado'}
                                </p>

                                <div className="mt-5 w-full rounded-2xl bg-slate-50 p-4 text-left">
                                    <p className="text-sm font-semibold text-slate-700">
                                        Perfil de Finora
                                    </p>

                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                        Esta información se usa para identificar tu sesión y
                                        personalizar la experiencia dentro del aplicativo.
                                    </p>
                                </div>
                            </div>
                        </article>

                        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-600">
                                    Perfil
                                </p>

                                <h2 className="mt-2 text-lg font-semibold text-slate-950">
                                    Datos personales
                                </h2>

                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Actualiza la información básica asociada a tu cuenta.
                                </p>
                            </div>

                            <form
                                className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2"
                                onSubmit={handleSubmitProfile}
                            >
                                <div className="flex flex-col gap-2">
                                    <label className={labelClass}>Nombres</label>
                                    <input
                                        className={inputClass}
                                        type="text"
                                        value={profileForm.nombres}
                                        onChange={(event) =>
                                            setProfileForm({
                                                ...profileForm,
                                                nombres: event.target.value,
                                            })
                                        }
                                        placeholder="Ej: Juan"
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className={labelClass}>Apellidos</label>
                                    <input
                                        className={inputClass}
                                        type="text"
                                        value={profileForm.apellidos}
                                        onChange={(event) =>
                                            setProfileForm({
                                                ...profileForm,
                                                apellidos: event.target.value,
                                            })
                                        }
                                        placeholder="Ej: Pérez"
                                    />
                                </div>

                                <div className="flex flex-col gap-2 md:col-span-2">
                                    <label className={labelClass}>Correo electrónico</label>
                                    <input
                                        className={inputClass}
                                        type="email"
                                        value={profileForm.correo}
                                        onChange={(event) =>
                                            setProfileForm({
                                                ...profileForm,
                                                correo: event.target.value,
                                            })
                                        }
                                        placeholder="ejemplo@finora.com"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="rounded-2xl bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {loading ? 'Guardando...' : 'Guardar cambios'}
                                    </button>
                                </div>
                            </form>
                        </article>
                    </section>

                    <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-600">
                                    Preferencias
                                </p>

                                <h2 className="mt-2 text-lg font-semibold text-slate-950">
                                    Uso del sistema
                                </h2>

                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Define cómo quieres que Finora organice la información por
                                    defecto.
                                </p>
                            </div>

                            <form
                                className="mt-6 grid grid-cols-1 gap-4"
                                onSubmit={handleSavePreferences}
                            >
                                <div className="flex flex-col gap-2">
                                    <label className={labelClass}>Moneda principal</label>
                                    <select
                                        className={inputClass}
                                        value={preferences.moneda}
                                        onChange={(event) =>
                                            setPreferences({
                                                ...preferences,
                                                moneda: event.target.value,
                                            })
                                        }
                                    >
                                        <option value="COP">Peso colombiano COP</option>
                                        <option value="USD">Dólar estadounidense USD</option>
                                        <option value="EUR">Euro EUR</option>
                                    </select>
                                    <p className="text-xs leading-5 text-slate-400">
                                        Los valores base se guardan en COP y se muestran convertidos según la moneda seleccionada.
                                    </p>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className={labelClass}>Período inicial</label>
                                    <select
                                        className={inputClass}
                                        value={preferences.periodoInicio}
                                        onChange={(event) =>
                                            setPreferences({
                                                ...preferences,
                                                periodoInicio: event.target.value,
                                            })
                                        }
                                    >
                                        <option value="Semanal">Semanal</option>
                                        <option value="Mensual">Mensual</option>
                                        <option value="Trimestral">Trimestral</option>
                                        <option value="Anual">Anual</option>
                                    </select>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className={labelClass}>Vista inicial</label>
                                    <select
                                        className={inputClass}
                                        value={preferences.vistaInicial}
                                        onChange={(event) =>
                                            setPreferences({
                                                ...preferences,
                                                vistaInicial: event.target.value,
                                            })
                                        }
                                    >
                                        <option value="Transacciones">Transacciones</option>
                                        <option value="Cuentas">Cuentas</option>
                                        <option value="Metas">Metas</option>
                                        <option value="Estadísticas">Estadísticas</option>
                                    </select>
                                </div>

                                <label className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                                    <span>
                                        <span className="block text-sm font-semibold text-slate-700">
                                            Mostrar insights financieros
                                        </span>
                                        <span className="block text-xs leading-5 text-slate-500">
                                            Activa mensajes de análisis y recomendaciones.
                                        </span>
                                    </span>

                                    <input
                                        type="checkbox"
                                        checked={preferences.mostrarInsights}
                                        onChange={(event) =>
                                            setPreferences({
                                                ...preferences,
                                                mostrarInsights: event.target.checked,
                                            })
                                        }
                                        className="h-5 w-5 accent-violet-700"
                                    />
                                </label>

                                <label className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                                    <span>
                                        <span className="block text-sm font-semibold text-slate-700">
                                            Modo compacto
                                        </span>
                                        <span className="block text-xs leading-5 text-slate-500">
                                            Reduce espacios visuales para pantallas pequeñas.
                                        </span>
                                    </span>

                                    <input
                                        type="checkbox"
                                        checked={preferences.modoCompacto}
                                        onChange={(event) =>
                                            setPreferences({
                                                ...preferences,
                                                modoCompacto: event.target.checked,
                                            })
                                        }
                                        className="h-5 w-5 accent-violet-700"
                                    />
                                </label>

                                <div>
                                    <button
                                        type="submit"
                                        className="rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                                    >
                                        Guardar preferencias
                                    </button>
                                </div>
                            </form>
                        </article>

                        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-600">
                                    Personalización
                                </p>

                                <h2 className="mt-2 text-lg font-semibold text-slate-950">
                                    Apariencia y experiencia
                                </h2>

                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Configura aspectos visuales de la plataforma.
                                </p>
                            </div>

                            <form
                                className="mt-6 grid grid-cols-1 gap-4"
                                onSubmit={handleSaveAppearance}
                            >
                                <div className="flex flex-col gap-2">
                                    <label className={labelClass}>Tema</label>
                                    <select
                                        className={inputClass}
                                        value={appearance.tema}
                                        onChange={(event) =>
                                            setAppearance({
                                                ...appearance,
                                                tema: event.target.value,
                                            })
                                        }
                                    >
                                        <option value="Claro">Claro</option>
                                        <option value="Oscuro">Oscuro</option>
                                        <option value="Sistema">Según sistema</option>
                                    </select>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className={labelClass}>Color principal</label>
                                    <select
                                        className={inputClass}
                                        value={appearance.colorPrincipal}
                                        onChange={(event) =>
                                            setAppearance({
                                                ...appearance,
                                                colorPrincipal: event.target.value,
                                            })
                                        }
                                    >
                                        <option value="Violeta">Violeta Finora</option>
                                        <option value="Azul">Azul financiero</option>
                                        <option value="Verde">Verde ahorro</option>
                                        <option value="Rosa">Rosa moderno</option>
                                    </select>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className={labelClass}>Densidad visual</label>
                                    <select
                                        className={inputClass}
                                        value={appearance.densidad}
                                        onChange={(event) =>
                                            setAppearance({
                                                ...appearance,
                                                densidad: event.target.value,
                                            })
                                        }
                                    >
                                        <option value="Cómoda">Cómoda</option>
                                        <option value="Compacta">Compacta</option>
                                    </select>
                                </div>

                                <div
                                    className="rounded-3xl border p-5"
                                    style={{
                                        borderColor: 'var(--finora-accent-soft)',
                                        backgroundColor: 'var(--finora-accent-soft)',
                                    }}
                                >
                                    <p
                                        className="text-sm font-semibold"
                                        style={{ color: 'var(--finora-accent)' }}
                                    >
                                        Vista previa
                                    </p>

                                    <p
                                        className="mt-2 text-sm leading-6"
                                        style={{ color: 'var(--finora-accent)' }}
                                    >
                                        Tema {appearance.tema}, color {appearance.colorPrincipal} y
                                        densidad {appearance.densidad}.
                                    </p>

                                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
                                        <div
                                            className="h-full w-2/3 rounded-full"
                                            style={{ backgroundColor: 'var(--finora-accent)' }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <button
                                        type="submit"
                                        className="rounded-2xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                                        style={{ backgroundColor: 'var(--finora-accent)' }}
                                    >
                                        Guardar apariencia
                                    </button>
                                </div>
                            </form>
                        </article>
                    </section>
                </main>
            </div>
        </div>
    );
}