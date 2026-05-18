import "./App.css"
import { useEffect, useState } from "react"
import {
  applyAppearanceSettings,
  getInitialRouteFromPreferences,
  getStoredAppearance,
  getStoredPreferences,
} from "./utils/preferences"
import { Navigate, Route, Routes, useNavigate } from "react-router-dom"
import api from "./services/api"
import Transacciones from "./pages/Transacciones"
import Cuentas from "./pages/Cuentas"
import Metas from "./pages/Metas"
import Estadisticas from "./pages/Estadisticas"
import Configuracion from "./pages/Configuracion"
import LoadingScreen from "./components/LoadingScreen"
import logo from "./assets/logologin.png"
import { preloadCurrencyRates } from './services/currencyService';

function getStoredUser() {
  const localUser = localStorage.getItem("finora_usuario")
  const sessionUser = sessionStorage.getItem("finora_usuario")
  const storedUser = localUser || sessionUser

  return storedUser ? JSON.parse(storedUser) : null
}

function App() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [remember, setRemember] = useState(false)

  const [nombres, setNombres] = useState("")
  const [apellidos, setApellidos] = useState("")
  const [registerEmail, setRegisterEmail] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")

  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [authLoading, setAuthLoading] = useState(false)
  const [formTransitionLoading, setFormTransitionLoading] = useState(false)

  const navigate = useNavigate()

  const [usuario, setUsuario] = useState(getStoredUser)

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return Boolean(localStorage.getItem("finora_token"))
  })

  const [preferencesVersion, setPreferencesVersion] = useState(0)

  useEffect(() => {
    preloadCurrencyRates();
  }, []);

  useEffect(() => {
    applyAppearanceSettings(
      getStoredAppearance(),
      getStoredPreferences()
    )
  }, [preferencesVersion])

  function resetMessages() {
    setErrorMessage("")
    setSuccessMessage("")
  }

  function showLoginForm() {
    resetMessages()
    setFormTransitionLoading(true)

    setTimeout(() => {
      setIsRegisterMode(false)
      setFormTransitionLoading(false)
    }, 650)
  }

  function showRegisterForm() {
    resetMessages()
    setFormTransitionLoading(true)

    setTimeout(() => {
      setIsRegisterMode(true)
      setFormTransitionLoading(false)
    }, 650)
  }

  async function handleLogin(event) {
    event.preventDefault()
    resetMessages()

    if (!email || !password) {
      setErrorMessage("Debes ingresar correo y contraseña.")
      return
    }

    setAuthLoading(true)

    try {
      const response = await api.post("/auth/login", {
        correo: email,
        password,
      })

      localStorage.setItem("finora_token", response.data.token)

      if (response.data.usuario) {
        if (remember) {
          localStorage.setItem(
            "finora_usuario",
            JSON.stringify(response.data.usuario)
          )
        } else {
          sessionStorage.setItem(
            "finora_usuario",
            JSON.stringify(response.data.usuario)
          )
        }

        setUsuario(response.data.usuario)
      }

      setIsLoggedIn(true)
      navigate(getInitialRouteFromPreferences(), { replace: true })
    } catch (error) {
      console.error("Error login:", error.response?.data || error)

      setErrorMessage(
        error.response?.data?.message || "No fue posible iniciar sesión."
      )
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleRegister(event) {
    event.preventDefault()
    resetMessages()

    if (!nombres || !apellidos || !registerEmail || !registerPassword) {
      setErrorMessage("Debes completar todos los campos para registrarte.")
      return
    }

    setAuthLoading(true)

    try {
      await api.post("/auth/register", {
        nombres,
        apellidos,
        correo: registerEmail,
        password: registerPassword,
        id_rol: 2,
      })

      setNombres("")
      setApellidos("")
      setRegisterEmail("")
      setRegisterPassword("")

      setEmail(registerEmail)
      setPassword("")

      setIsRegisterMode(false)
      setSuccessMessage("Registro exitoso. Ahora puedes iniciar sesión.")
    } catch (error) {
      console.error("Error registro:", error.response?.data || error)

      setErrorMessage(
        error.response?.data?.message ||
        error.response?.data?.error ||
        "No fue posible registrar el usuario."
      )
    } finally {
      setAuthLoading(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem("finora_token")
    localStorage.removeItem("finora_usuario")
    sessionStorage.removeItem("finora_usuario")

    setUsuario(null)
    setIsLoggedIn(false)
    setEmail("")
    setPassword("")
    setRemember(false)
    resetMessages()
  }

  if (authLoading) {
    return (
      <LoadingScreen
        fullScreen
        size="lg"
        message={
          isRegisterMode
            ? "Creando tu cuenta en Finora..."
            : "Iniciando sesión en Finora..."
        }
      />
    )
  }

  if (!isLoggedIn) {
    return (
      <div className="main">
        <div className="card">
          <div className="left">
            <div className="logo">
              <img src={logo} alt="Finora Logo" />
            </div>

            <h1>
              Hola,
              <br />
              bienvenido
            </h1>

            <p>
              Finora te ayuda a registrar ingresos, gastos, cuentas y metas
              financieras desde una plataforma sencilla y centralizada.
            </p>

            <button type="button" className="info-btn">
              Leer más
            </button>
          </div>

          <div className="right">
            {formTransitionLoading ? (
              <LoadingScreen
                overlay
                size="md"
                message={
                  isRegisterMode
                    ? "Volviendo al inicio de sesión..."
                    : "Preparando el registro..."
                }
              />
            ) : !isRegisterMode ? (
              <form className="login-form" onSubmit={handleLogin}>
                <h2>Iniciar sesión</h2>

                {errorMessage && (
                  <div className="form-error">{errorMessage}</div>
                )}

                {successMessage && (
                  <div className="form-success">{successMessage}</div>
                )}

                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="ejemplo@finora.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <label htmlFor="password">Contraseña</label>
                <input
                  id="password"
                  type="password"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <div className="remember">
                  <input
                    id="remember"
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <label htmlFor="remember">Recordar sesión</label>
                </div>

                <button type="submit">Entrar</button>

                <p className="forgot">¿Olvidaste la contraseña?</p>

                <p className="register" onClick={showRegisterForm}>
                  ¿No tienes cuenta? Registrarse
                </p>
              </form>
            ) : (
              <form className="login-form" onSubmit={handleRegister}>
                <h2>Crear cuenta</h2>

                {errorMessage && (
                  <div className="form-error">{errorMessage}</div>
                )}

                <label htmlFor="nombres">Nombres</label>
                <input
                  id="nombres"
                  type="text"
                  placeholder="Tus nombres"
                  value={nombres}
                  onChange={(e) => setNombres(e.target.value)}
                />

                <label htmlFor="apellidos">Apellidos</label>
                <input
                  id="apellidos"
                  type="text"
                  placeholder="Tus apellidos"
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                />

                <label htmlFor="registerEmail">Email</label>
                <input
                  id="registerEmail"
                  type="email"
                  placeholder="ejemplo@finora.com"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                />

                <label htmlFor="registerPassword">Contraseña</label>
                <input
                  id="registerPassword"
                  type="password"
                  placeholder="********"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                />

                <button type="submit">Registrarse</button>

                <p className="register" onClick={showLoginForm}>
                  ¿Ya tienes cuenta? Iniciar sesión
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/transacciones"
        element={
          <Transacciones
            usuario={usuario}
            onLogout={handleLogout}
          />
        }
      />

      <Route
        path="/cuentas"
        element={
          <Cuentas
            usuario={usuario}
            onLogout={handleLogout}
          />
        }
      />

      <Route
        path="/metas"
        element={
          <Metas
            usuario={usuario}
            onLogout={handleLogout}
          />
        }
      />

      <Route
        path="/estadisticas"
        element={
          <Estadisticas
            usuario={usuario}
            onLogout={handleLogout}
          />
        }
      />

      <Route
        path="/configuracion"
        element={
          <Configuracion
            usuario={usuario}
            onLogout={handleLogout}
            onSettingsChange={() => setPreferencesVersion((value) => value + 1)}
          />
        }
      />

      <Route
        path="/"
        element={<Navigate to={getInitialRouteFromPreferences()} replace />}
      />

      <Route path="*" element={<Navigate to="/transacciones" replace />} />
    </Routes>
  )
}

export default App