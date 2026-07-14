import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

function mockMsal(overrides = {}) {
  vi.doMock('@azure/msal-browser', () => {
    class InteractionRequiredAuthError extends Error {}
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
    return { PublicClientApplication, InteractionRequiredAuthError }
  })
}

const FEATURES = [
  {
    type: 'Feature',
    properties: {
      id: 1, name: 'Frontino - Nutibara', NOMBRE_VIA: 'El Botón - Frontino', CIRCUITO: 'Frontino - Nutibara',
      'id-circuito': 'C-001', MPIO_NOMBR: 'FRONTINO', SUBREGION: 'OCCIDENTE',
      Long_km: 10, AV_FISICO: 0.5, AV_FINAN: 0.4, ESTABILIZADO: 5,
    },
    geometry: { type: 'LineString', coordinates: [[-76, 6], [-76.1, 6.1]] },
  },
  {
    type: 'Feature',
    properties: {
      id: 2, name: 'Guarne - Yolombal', NOMBRE_VIA: 'Guarne - Yolombal', CIRCUITO: 'Guarne - Yolombal',
      'id-circuito': 'C-002', MPIO_NOMBR: 'GUARNE', SUBREGION: 'ORIENTE',
      Long_km: 12, AV_FISICO: 0.8, AV_FINAN: 0.6, ESTABILIZADO: 8,
    },
    geometry: { type: 'LineString', coordinates: [[-75, 6], [-75.1, 6.1]] },
  },
]

const ADMIN_API = 'https://apim-simeva-qa.azure-api.net/administracion'

function jsonResponse(data, ok = true, status = 200) {
  return {
    ok, status,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve(data),
    arrayBuffer: () => Promise.resolve(new TextEncoder().encode(JSON.stringify(data)).buffer),
  }
}

function mockFetchRoutes(routes) {
  vi.stubGlobal('fetch', vi.fn((url, opts) => {
    const match = routes.find(r => (typeof r.match === 'string' ? url.startsWith(r.match) : r.match.test(url)))
    if (!match) return Promise.reject(new Error('Unhandled fetch: ' + url))
    return Promise.resolve(match.response(url, opts))
  }))
}

function click(el) {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}
function dblclick(el) {
  el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
}
function setInputValue(el, value) {
  el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

let wrapper
beforeEach(() => {
  vi.resetModules()
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.doUnmock('@azure/msal-browser')
})

async function settle() {
  await nextTick()
  await new Promise(r => setTimeout(r, 20))
  await nextTick()
}

describe('AdminGeoJsonView — pantalla de login', () => {
  it('muestra el overlay de login cuando no hay sesión autenticada', async () => {
    mockMsal({ getAllAccounts: vi.fn().mockReturnValue([]) })
    const { default: AdminGeoJsonView } = await import('../../src/views/AdminGeoJsonView.vue')
    wrapper = mount(AdminGeoJsonView, { attachTo: document.body })
    await settle()
    expect(document.querySelector('.login-overlay')).not.toBeNull()
    expect(document.querySelector('.hdr')).toBeNull()
  })
})

describe('AdminGeoJsonView — con sesión autenticada', () => {
  beforeEach(() => {
    mockMsal({ getAllAccounts: vi.fn().mockReturnValue([{ name: 'Juan Pérez', username: 'juan@simeva.gov.co' }]) })
    mockFetchRoutes([
      { match: `${ADMIN_API}/circuits`, response: () => jsonResponse({ circuits: [] }) },
      { match: /localizacion/, response: () => jsonResponse({ type: 'FeatureCollection', features: FEATURES }) },
    ])
  })

  it('carga los datos y muestra las tarjetas de subregión', async () => {
    const { default: AdminGeoJsonView } = await import('../../src/views/AdminGeoJsonView.vue')
    wrapper = mount(AdminGeoJsonView, { attachTo: document.body })
    await settle()
    expect(document.querySelector('.login-overlay')).toBeNull()
    const cards = document.querySelectorAll('.subcard')
    expect(cards.length).toBe(2)
  })

  it('muestra el nombre del usuario autenticado en el header', async () => {
    const { default: AdminGeoJsonView } = await import('../../src/views/AdminGeoJsonView.vue')
    wrapper = mount(AdminGeoJsonView, { attachTo: document.body })
    await settle()
    expect(document.querySelector('.hdr-user-name').textContent).toBe('Juan Pérez')
  })

  it('navega a la tabla de un circuito al hacer clic en la subregión', async () => {
    const { default: AdminGeoJsonView } = await import('../../src/views/AdminGeoJsonView.vue')
    wrapper = mount(AdminGeoJsonView, { attachTo: document.body })
    await settle()
    click(document.querySelectorAll('.subcard')[0])
    await nextTick()
    expect(document.querySelector('.view-table')).not.toBeNull()
    expect(document.querySelectorAll('.tbl-row').length).toBe(1)
  })

  it('filtra la tabla con el buscador', async () => {
    const { default: AdminGeoJsonView } = await import('../../src/views/AdminGeoJsonView.vue')
    wrapper = mount(AdminGeoJsonView, { attachTo: document.body })
    await settle()
    click(document.querySelector('.bc-btn')) // asegurar estado subregiones
    click(document.querySelectorAll('.subcard')[0])
    await nextTick()
    setInputValue(document.querySelector('.inp'), 'zzz-no-match')
    await nextTick()
    expect(document.querySelectorAll('.tbl-row').length).toBe(0)
  })

  it('vuelve a la vista de subregiones desde la tabla', async () => {
    const { default: AdminGeoJsonView } = await import('../../src/views/AdminGeoJsonView.vue')
    wrapper = mount(AdminGeoJsonView, { attachTo: document.body })
    await settle()
    click(document.querySelectorAll('.subcard')[0])
    await nextTick()
    click(document.querySelector('.btn-back'))
    await nextTick()
    expect(document.querySelector('.view-subregions')).not.toBeNull()
  })

  it('abre el modal de edición con doble clic y aplica un cambio', async () => {
    const { default: AdminGeoJsonView } = await import('../../src/views/AdminGeoJsonView.vue')
    wrapper = mount(AdminGeoJsonView, { attachTo: document.body })
    await settle()
    click(document.querySelectorAll('.subcard')[0])
    await nextTick()
    dblclick(document.querySelector('.tbl-row'))
    await nextTick()
    expect(document.querySelector('.edit-modal')).not.toBeNull()

    const fisInput = document.querySelector('.num-field--fis')
    setInputValue(fisInput, '75')
    await nextTick()
    click(document.querySelector('.btn-drawer-apply'))
    await nextTick()

    expect(document.querySelector('.edit-modal')).toBeNull()
    expect(document.querySelector('.badge--warn').textContent).toContain('1 cambio')
  })

  it('guarda los cambios vía PUT y muestra un toast de éxito', async () => {
    const putSpy = vi.fn(() => jsonResponse({ ok: true }))
    mockFetchRoutes([
      { match: `${ADMIN_API}/circuits`, response: (url, opts) => (opts?.method === 'PUT' ? putSpy(url, opts) : jsonResponse({ circuits: [] })) },
      { match: /localizacion/, response: () => jsonResponse({ type: 'FeatureCollection', features: FEATURES }) },
    ])
    const { default: AdminGeoJsonView } = await import('../../src/views/AdminGeoJsonView.vue')
    wrapper = mount(AdminGeoJsonView, { attachTo: document.body })
    await settle()
    click(document.querySelectorAll('.subcard')[0])
    await nextTick()
    dblclick(document.querySelector('.tbl-row'))
    await nextTick()
    setInputValue(document.querySelector('.num-field--fis'), '90')
    await nextTick()
    click(document.querySelector('.btn-drawer-apply'))
    await nextTick()

    click(document.querySelector('.btn-save'))
    await nextTick()
    expect(document.querySelector('.confirm-circuit')).not.toBeNull()

    click(document.querySelector('.btn-confirm-save'))
    await settle()
    expect(putSpy).toHaveBeenCalled()
    expect(document.querySelector('.toast--ok')).not.toBeNull()
  })

  it('cierra sesión al hacer clic en el botón de logout', async () => {
    const logoutRedirect = vi.fn().mockResolvedValue(undefined)
    vi.doMock('@azure/msal-browser', () => {
      const instance = {
        initialize: vi.fn().mockResolvedValue(undefined),
        handleRedirectPromise: vi.fn().mockResolvedValue(null),
        getAllAccounts: vi.fn().mockReturnValue([{ name: 'Juan', username: 'juan@x.com' }]),
        logoutRedirect,
      }
      return {
        PublicClientApplication: vi.fn().mockImplementation(function () { return instance }),
        InteractionRequiredAuthError: class extends Error {},
      }
    })
    const { default: AdminGeoJsonView } = await import('../../src/views/AdminGeoJsonView.vue')
    wrapper = mount(AdminGeoJsonView, { attachTo: document.body })
    await settle()
    click(document.querySelector('.btn-logout'))
    await settle()
    expect(logoutRedirect).toHaveBeenCalled()
    expect(document.querySelector('.login-overlay')).not.toBeNull()
  })

  it('abre el modal de imágenes y rechaza archivos que no son PNG/JPG', async () => {
    const { default: AdminGeoJsonView } = await import('../../src/views/AdminGeoJsonView.vue')
    wrapper = mount(AdminGeoJsonView, { attachTo: document.body })
    await settle()
    click(document.querySelectorAll('.subcard')[0])
    await nextTick()
    click(document.querySelector('.btn-cam'))
    await nextTick()
    expect(document.querySelector('.img-modal')).not.toBeNull()

    const fileInput = document.querySelector('.file-input')
    const badFile = new File(['x'], 'a.txt', { type: 'text/plain' })
    Object.defineProperty(fileInput, 'files', { value: [badFile], configurable: true })
    fileInput.dispatchEvent(new Event('change', { bubbles: true }))
    await nextTick()
    expect(document.querySelector('.toast--err').textContent).toContain('PNG o JPG')
  })
})
