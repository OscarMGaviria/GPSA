import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

function mockMsal(overrides = {}) {
  vi.doMock('@azure/msal-browser', () => {
    class InteractionRequiredAuthError extends Error {
      constructor(msg = 'interaction required') { super(msg) }
    }
    const instance = {
      initialize: vi.fn().mockResolvedValue(undefined),
      handleRedirectPromise: vi.fn().mockResolvedValue(null),
      getAllAccounts: vi.fn().mockReturnValue([]),
      loginRedirect: vi.fn().mockResolvedValue(undefined),
      logoutRedirect: vi.fn().mockResolvedValue(undefined),
      acquireTokenSilent: vi.fn().mockResolvedValue({ accessToken: 'fake-token' }),
      acquireTokenRedirect: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    }
    const PublicClientApplication = vi.fn().mockImplementation(function () { return instance })
    return { PublicClientApplication, InteractionRequiredAuthError, __instance: instance }
  })
}

beforeEach(() => {
  vi.resetModules()
  sessionStorage.clear()
  globalThis.location.hash = ''
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.doUnmock('@azure/msal-browser')
})

describe('useAdminAuth — MSAL_ENABLED', () => {
  it('es true cuando hay client id y tenant id configurados (.env.local)', async () => {
    mockMsal()
    const { MSAL_ENABLED } = await import('../../src/composables/useAdminAuth.js')
    expect(MSAL_ENABLED).toBe(true)
  })
})

describe('useAdminAuth — initAuth', () => {
  it('deja isAuthed en false si no hay cuentas en caché', async () => {
    mockMsal({ getAllAccounts: vi.fn().mockReturnValue([]) })
    const { useAdminAuth } = await import('../../src/composables/useAdminAuth.js')
    const { initAuth, isAuthed } = useAdminAuth()
    await initAuth()
    expect(isAuthed.value).toBe(false)
  })

  it('recupera la cuenta activa desde msal.getAllAccounts()', async () => {
    mockMsal({ getAllAccounts: vi.fn().mockReturnValue([{ name: 'Juan Pérez', username: 'juan@simeva.gov.co' }]) })
    const { useAdminAuth } = await import('../../src/composables/useAdminAuth.js')
    const { initAuth, isAuthed, userName, userEmail } = useAdminAuth()
    await initAuth()
    expect(isAuthed.value).toBe(true)
    expect(userName.value).toBe('Juan Pérez')
    expect(userEmail.value).toBe('juan@simeva.gov.co')
  })

  it('recupera la cuenta desde la respuesta de redirect si existe', async () => {
    mockMsal({ handleRedirectPromise: vi.fn().mockResolvedValue({ account: { name: 'Ana', username: 'ana@simeva.gov.co' } }) })
    const { useAdminAuth } = await import('../../src/composables/useAdminAuth.js')
    const { initAuth, isAuthed, userName } = useAdminAuth()
    await initAuth()
    expect(isAuthed.value).toBe(true)
    expect(userName.value).toBe('Ana')
  })

  it('marca authErr si el hash trae un código y no hay cuentas', async () => {
    globalThis.location.hash = '#code=abc123'
    mockMsal({ getAllAccounts: vi.fn().mockReturnValue([]) })
    const { useAdminAuth } = await import('../../src/composables/useAdminAuth.js')
    const { initAuth, authErr } = useAdminAuth()
    await initAuth()
    expect(authErr.value).toContain('token')
  })
})

describe('useAdminAuth — login', () => {
  it('guarda la URL de retorno y llama a loginRedirect', async () => {
    mockMsal()
    const { useAdminAuth } = await import('../../src/composables/useAdminAuth.js')
    const { login, loading } = useAdminAuth()
    await login()
    expect(loading.value).toBe(true)
    expect(sessionStorage.getItem('simeva-auth-return')).not.toBeNull()
  })
})

describe('useAdminAuth — logout', () => {
  it('no hace nada si no hay cuenta activa', async () => {
    mockMsal()
    const { useAdminAuth } = await import('../../src/composables/useAdminAuth.js')
    const { logout, isAuthed } = useAdminAuth()
    await logout()
    expect(isAuthed.value).toBe(false)
  })

  it('limpia la cuenta y llama a logoutRedirect cuando hay sesión activa', async () => {
    const logoutRedirect = vi.fn().mockResolvedValue(undefined)
    mockMsal({ getAllAccounts: vi.fn().mockReturnValue([{ name: 'Juan', username: 'juan@x.com' }]), logoutRedirect })
    const { useAdminAuth } = await import('../../src/composables/useAdminAuth.js')
    const { initAuth, logout, isAuthed } = useAdminAuth()
    await initAuth()
    expect(isAuthed.value).toBe(true)
    await logout()
    expect(isAuthed.value).toBe(false)
    expect(logoutRedirect).toHaveBeenCalled()
  })
})

describe('useAdminAuth — getToken / authHeaders', () => {
  it('getToken lanza error si no hay cuenta autenticada', async () => {
    mockMsal()
    const { useAdminAuth } = await import('../../src/composables/useAdminAuth.js')
    const { getToken } = useAdminAuth()
    await expect(getToken()).rejects.toThrow('No autenticado')
  })

  it('getToken retorna el accessToken cuando la adquisición silenciosa funciona', async () => {
    mockMsal({ getAllAccounts: vi.fn().mockReturnValue([{ name: 'Juan', username: 'juan@x.com' }]) })
    const { useAdminAuth } = await import('../../src/composables/useAdminAuth.js')
    const { initAuth, getToken } = useAdminAuth()
    await initAuth()
    await expect(getToken()).resolves.toBe('fake-token')
  })

  it('getToken redirige y relanza el error cuando se requiere interacción', async () => {
    let InteractionRequiredAuthError
    const acquireTokenRedirect = vi.fn().mockResolvedValue(undefined)
    vi.doMock('@azure/msal-browser', () => {
      class LocalInteractionRequiredAuthError extends Error {}
      InteractionRequiredAuthError = LocalInteractionRequiredAuthError
      const instance = {
        initialize: vi.fn().mockResolvedValue(undefined),
        handleRedirectPromise: vi.fn().mockResolvedValue(null),
        getAllAccounts: vi.fn().mockReturnValue([{ name: 'Juan', username: 'juan@x.com' }]),
        acquireTokenSilent: vi.fn().mockRejectedValue(new LocalInteractionRequiredAuthError('need interaction')),
        acquireTokenRedirect,
      }
      return {
        PublicClientApplication: vi.fn().mockImplementation(function () { return instance }),
        InteractionRequiredAuthError: LocalInteractionRequiredAuthError,
      }
    })
    const { useAdminAuth } = await import('../../src/composables/useAdminAuth.js')
    const { initAuth, getToken } = useAdminAuth()
    await initAuth()
    await expect(getToken()).rejects.toThrow('need interaction')
    expect(acquireTokenRedirect).toHaveBeenCalled()
  })

  it('authHeaders no incluye Authorization sin cuenta autenticada', async () => {
    mockMsal()
    const { useAdminAuth } = await import('../../src/composables/useAdminAuth.js')
    const { authHeaders } = useAdminAuth()
    const headers = await authHeaders()
    expect(headers['Content-Type']).toBe('application/json')
    expect(headers['Authorization']).toBeUndefined()
  })

  it('authHeaders incluye el Bearer token con cuenta autenticada', async () => {
    mockMsal({ getAllAccounts: vi.fn().mockReturnValue([{ name: 'Juan', username: 'juan@x.com' }]) })
    const { useAdminAuth } = await import('../../src/composables/useAdminAuth.js')
    const { initAuth, authHeaders } = useAdminAuth()
    await initAuth()
    const headers = await authHeaders()
    expect(headers['Authorization']).toBe('Bearer fake-token')
  })
})

describe('useAdminAuth — consumeReturnUrl', () => {
  it('retorna la ruta por defecto si no hay URL guardada', async () => {
    mockMsal()
    const { useAdminAuth } = await import('../../src/composables/useAdminAuth.js')
    const { consumeReturnUrl } = useAdminAuth()
    expect(consumeReturnUrl()).toBe('/admin-geojson')
  })

  it('retorna y limpia la URL guardada previamente', async () => {
    mockMsal()
    const { useAdminAuth } = await import('../../src/composables/useAdminAuth.js')
    const { login, consumeReturnUrl } = useAdminAuth()
    await login()
    const url = consumeReturnUrl()
    expect(url).not.toBe('/admin-geojson')
    expect(sessionStorage.getItem('simeva-auth-return')).toBeNull()
  })
})
