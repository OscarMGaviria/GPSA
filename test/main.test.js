import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

function setLocation({ pathname = '/', hash = '' } = {}) {
  globalThis.history.replaceState(null, '', pathname + hash)
}

function mockAppShell() {
  vi.doMock('../src/AppShell.vue', () => ({ default: { template: '<div class="shell-stub">Shell</div>' } }))
}

function mockRouter({ install = vi.fn(), replace = vi.fn().mockResolvedValue(undefined) } = {}) {
  vi.doMock('../src/router/index.js', () => ({
    default: { install, isReady: vi.fn().mockResolvedValue(undefined), replace },
  }))
  return { install, replace }
}

function mockUseAdminAuth({ initAuth, consumeReturnUrl }) {
  vi.doMock('../src/composables/useAdminAuth.js', () => ({
    useAdminAuth: () => ({ initAuth, consumeReturnUrl }),
  }))
}

beforeEach(() => {
  vi.resetModules()
  document.body.innerHTML = '<div id="app"></div>'
  setLocation()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.doUnmock('../src/App.vue')
  vi.doUnmock('../src/AppShell.vue')
  vi.doUnmock('../src/router/index.js')
  vi.doUnmock('../src/composables/useAdminAuth.js')
  setLocation()
})

describe('main.js — bootstrap', () => {
  it('monta App.vue sin router en la ruta raíz', async () => {
    vi.doMock('../src/App.vue', () => ({ default: { template: '<div class="app-stub">App</div>' } }))
    await import('../src/main.js')
    await new Promise(r => setTimeout(r, 0))
    expect(document.querySelector('#app .app-stub')).not.toBeNull()
  })

  it('monta AppShell.vue con router en /admin-geojson', async () => {
    mockAppShell()
    const { install } = mockRouter()
    setLocation({ pathname: '/admin-geojson' })
    await import('../src/main.js')
    await new Promise(r => setTimeout(r, 0))
    expect(install).toHaveBeenCalled()
    expect(document.querySelector('#app .shell-stub')).not.toBeNull()
  })

  it('procesa el flujo de retorno de MSAL cuando el hash trae "code="', async () => {
    const initAuth = vi.fn().mockResolvedValue(undefined)
    const consumeReturnUrl = vi.fn(() => '/admin-geojson')
    mockUseAdminAuth({ initAuth, consumeReturnUrl })
    mockAppShell()
    const { replace } = mockRouter()
    setLocation({ pathname: '/', hash: '#code=abc123' })
    await import('../src/main.js')
    await new Promise(r => setTimeout(r, 0))
    expect(initAuth).toHaveBeenCalled()
    expect(replace).toHaveBeenCalledWith('/admin-geojson')
    expect(document.querySelector('#app .shell-stub')).not.toBeNull()
  })

  it('procesa el flujo de retorno de MSAL cuando el hash trae "error="', async () => {
    const initAuth = vi.fn().mockResolvedValue(undefined)
    mockUseAdminAuth({ initAuth, consumeReturnUrl: () => '/admin-geojson' })
    mockAppShell()
    mockRouter()
    setLocation({ pathname: '/', hash: '#error=access_denied' })
    await import('../src/main.js')
    await new Promise(r => setTimeout(r, 0))
    expect(initAuth).toHaveBeenCalled()
  })
})
