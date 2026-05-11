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
  const [errorMessage, setErrorMessage] = useState("")
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState(getStoredUser)

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return Boolean(localStorage.getItem("finora_token"))
  })

  const [preferencesVersion, setPreferencesVersion] = useState(0);

  useEffect(() => {
    applyAppearanceSettings(
      getStoredAppearance(),
      getStoredPreferences()
    );
  }, [preferencesVersion]);

  async function handleLogin(event) {
    event.preventDefault()
    setErrorMessage("")

    if (!email || !password) {
      setErrorMessage("Debes ingresar correo y contraseña.")
      return
    }

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
      navigate(getInitialRouteFromPreferences(), { replace: true });
    } catch (error) {
      console.error("Error login:", error.response?.data || error)

      setErrorMessage(
        error.response?.data?.message || "No fue posible iniciar sesión."
      )
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
    setErrorMessage("")
  }

  if (!isLoggedIn) {
    return (
      <div className="main">
        <div className="card">
          <div className="left">
            <div className="logo">F</div>

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
            <form className="login-form" onSubmit={handleLogin}>
              <h2>Iniciar sesión</h2>

              {errorMessage && (
                <div className="form-error">{errorMessage}</div>
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
              <p className="register">¿No tienes cuenta? Registrarse</p>
            </form>
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