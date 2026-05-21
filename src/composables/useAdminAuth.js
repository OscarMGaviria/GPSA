import { ref, computed } from 'vue'
import { PublicClientApplication, InteractionRequiredAuthError } from '@azure/msal-browser'

const CLIENT_ID  = import.meta.env.VITE_MSAL_CLIENT_ID  ?? ''
const TENANT_ID  = import.meta.env.VITE_MSAL_TENANT_ID  ?? ''
// Scope del API backend. Típicamente 'api://<client-id>/.default' o la URL del APIM.
const API_SCOPE  = import.meta.env.VITE_MSAL_API_SCOPE  ?? `api://${CLIENT_ID}/.default`

export const MSAL_ENABLED = !!(CLIENT_ID && TENANT_ID)

// Clave en sessionStorage para guardar la URL de retorno tras la redirección de login
const RETURN_URL_KEY = 'simeva-auth-return'

// ── Instancia singleton ───────────────────────────────────────────────────────
let _msal = null
let _redirectPromise = null

async function getMsal() {
  if (_msal) return _msal
  _msal = new PublicClientApplication({
    auth: {
      clientId:    CLIENT_ID,
      authority:   `https://login.microsoftonline.com/${TENANT_ID}`,
      redirectUri: window.location.origin,
    },
    cache: {
      cacheLocation:        'sessionStorage',
      storeAuthStateInCookie: false,
    },
  })
  await _msal.initialize()
  // Procesa la respuesta de redirección si existe (regreso de Microsoft)
  _redirectPromise = _msal.handleRedirectPromise().catch(() => null)
  return _msal
}

// ── Estado compartido ─────────────────────────────────────────────────────────
const _account = ref(null)
const _loading = ref(false)
const _authErr = ref('')

export function useAdminAuth() {
  const isAuthed  = computed(() => !!_account.value)
  const userName  = computed(() => _account.value?.name ?? '')
  const userEmail = computed(() => _account.value?.username ?? '')
  const authErr   = computed(() => _authErr.value)

  // Llamar en onMounted — recupera la sesión activa sin interacción.
  // También procesa la respuesta de redirección si venimos de Microsoft.
  async function initAuth() {
    if (!MSAL_ENABLED) return
    const msal = await getMsal()

    try {
      const result = await _redirectPromise
      if (result?.account) {
        _account.value = result.account
        return
      }
    } catch (e) {
      _authErr.value = `Error en redirect: ${e.message}`
      console.error("MSAL Redirect Error:", e)
    }

    // Si no hay respuesta de redirect, buscar sesión existente en caché
    const accounts = msal.getAllAccounts()
    if (accounts.length > 0) {
      _account.value = accounts[0]
    } else {
      if (window.location.hash.includes('code=')) {
         _authErr.value = 'URL tiene un token, pero no se pudo procesar.'
      }
    }
  }

  // Redirige a Microsoft para iniciar sesión.
  // Guarda la URL actual en sessionStorage para volver después.
  async function login() {
    if (!MSAL_ENABLED) throw new Error('MSAL no configurado — define VITE_MSAL_CLIENT_ID y VITE_MSAL_TENANT_ID')
    _loading.value = true
    const msal = await getMsal()
    // Guardar la página actual para redirigir al volver de Microsoft
    sessionStorage.setItem(RETURN_URL_KEY, window.location.pathname + window.location.search)
    await msal.loginRedirect({ scopes: ['openid', 'profile', 'email'] })
    // La página redirige — el código siguiente no se ejecuta
  }

  async function logout() {
    const acct = _account.value
    _account.value = null
    if (!MSAL_ENABLED || !acct) return
    const msal = await getMsal()
    await msal.logoutRedirect({
      account: acct,
      postLogoutRedirectUri: window.location.origin,
    }).catch(() => {})
  }

  // Obtiene el access token para el API backend (silent, con fallback a redirect)
  async function getToken() {
    if (!MSAL_ENABLED || !_account.value) throw new Error('No autenticado')
    const msal = await getMsal()
    try {
      const r = await msal.acquireTokenSilent({ scopes: [API_SCOPE], account: _account.value })
      return r.accessToken
    } catch (e) {
      if (e instanceof InteractionRequiredAuthError) {
        // Guardar URL de retorno y redirigir para obtener token interactivamente
        sessionStorage.setItem(RETURN_URL_KEY, window.location.pathname + window.location.search)
        await msal.acquireTokenRedirect({ scopes: [API_SCOPE], account: _account.value })
        // La página redirige — no retorna
      }
      throw e
    }
  }

  // Genera headers HTTP listos para usar en fetch()
  async function authHeaders(extra = {}) {
    const h = { 'Content-Type': 'application/json', ...extra }
    if (MSAL_ENABLED && _account.value) {
      h['Authorization'] = `Bearer ${await getToken()}`
    }
    return h
  }

  // Obtener la URL de retorno guardada antes del redirect (y limpiarla)
  function consumeReturnUrl() {
    const url = sessionStorage.getItem(RETURN_URL_KEY)
    sessionStorage.removeItem(RETURN_URL_KEY)
    return url || '/admin-geojson'
  }

  return {
    isAuthed, userName, userEmail, authErr,
    loading: _loading,
    initAuth, login, logout, authHeaders, getToken, consumeReturnUrl,
  }
}
