import { nextTick } from 'vue'
import { vi } from 'vitest'

export function jsonResponse(data, ok = true, status = 200) {
  return {
    ok,
    status,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve(data),
    arrayBuffer: () => Promise.resolve(new TextEncoder().encode(JSON.stringify(data)).buffer),
  }
}

export function mockFetchRoutes(routes) {
  vi.stubGlobal('fetch', vi.fn((url, opts) => {
    const match = routes.find(r => (typeof r.match === 'string' ? url.startsWith(r.match) : r.match.test(url)))
    if (!match) return Promise.reject(new Error('Unhandled fetch: ' + url))
    return Promise.resolve(match.response(url, opts))
  }))
}

export function click(el) {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

export function dblclick(el) {
  el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
}

export function setInputValue(el, value) {
  el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

export async function settle(ms = 20) {
  await nextTick()
  await new Promise(r => setTimeout(r, ms))
  await nextTick()
}
