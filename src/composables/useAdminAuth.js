import { ref, computed } from 'vue'
import { PublicClientApplication, InteractionRequiredAuthError } from '@azure/msal-browser'

const CLIENT_ID  = import.meta.env.VITE_MSAL_CLIENT_ID  ?? ''
const TENANT_ID  = import.meta.env.VITE_MSAL_TENANT_ID  ?? ''
// Scope del API backend. Típicamente 'api://<client-id>/.default' o la URL del APIM.
const API_SCOPE  = import.meta.env.VITE_MSAL_API_SCOPE  ?? `api://${CLIENT_ID}/.default`

export const MSAL_ENABLED = !!(CLIENT_ID && TENANT_ID)

// ── Instancia singleton ───────────────────────────────────────────────────────
let _msal = null

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
  // Limpia estado de interacción pendiente (popup cerrado, página recargada mid-auth)
  await _msal.handleRedirectPromise().catch(() => {})
  return _msal
}

// ── Estado compartido ─────────────────────────────────────────────────────────
const _account = ref(null)
const _loading  = ref(false)

export function useAdminAuth() {
  const isAuthed  = computed(() => !!_account.value)
  const userName  = computed(() => _account.value?.name ?? '')
  const userEmail = computed(() => _account.value?.username ?? '')

  // Llamar en onMounted — recupera la sesión activa sin interacción
  async function initAuth() {
    if (!MSAL_ENABLED) return
    const msal     = await getMsal()
    const accounts = msal.getAllAccounts()
    if (accounts.length > 0) _account.value = accounts[0]
  }

  // Abre el popup de Microsoft. Lanza si el usuario cancela.
  async function login() {
    if (!MSAL_ENABLED) throw new Error('MSAL no configurado — define VITE_MSAL_CLIENT_ID y VITE_MSAL_TENANT_ID')
    _loading.value = true
    try {
      const msal   = await getMsal()
      const result = await msal.loginPopup({ scopes: ['openid', 'profile', 'email'] })
      _account.value = result.account
    } finally {
      _loading.value = false
    }
  }

  async function logout() {
    const acct = _account.value
    _account.value = null
    if (!MSAL_ENABLED || !acct) return
    const msal = await getMsal()
    await msal.logoutPopup({ account: acct }).catch(() => {})
  }

  // Obtiene el access token para el API backend (silent, con fallback a popup)
  async function getToken() {
    if (!MSAL_ENABLED || !_account.value) throw new Error('No autenticado')
    const msal = await getMsal()
    try {
      const r = await msal.acquireTokenSilent({ scopes: [API_SCOPE], account: _account.value })
      return r.accessToken
    } catch (e) {
      if (e instanceof InteractionRequiredAuthError) {
        const r = await msal.acquireTokenPopup({ scopes: [API_SCOPE], account: _account.value })
        return r.accessToken
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

  return {
    isAuthed, userName, userEmail,
    loading: _loading,
    initAuth, login, logout, authHeaders, getToken,
  }
}
