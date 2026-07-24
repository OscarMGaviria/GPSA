<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Eye } from '@lucide/vue'

const props = defineProps({ via: { type: Object, required: true } })
const emit  = defineEmits(['close'])

const visible = ref(true)
function requestClose() { visible.value = false }
function onAfterLeave() { emit('close') }

const desc = computed(() => props.via.description || {})
const name = computed(() => props.via.name || 'Detalles del Predio')

const base = import.meta.env.BASE_URL.replace(/\/$/, '')

function isLink(v) {
  return typeof v === 'string' && (v.startsWith('http') || v.toLowerCase().includes('.pdf'))
}

function getLinkHref(v) {
  if (v.startsWith('http')) return v
  if (v.startsWith('/')) return `${base}${v}`
  return `${base}/${v}`
}

const onKey = (e) => {
  if (e.key === 'Escape') requestClose()
}

onMounted(() => {
  document.addEventListener('keydown', onKey)
  document.body.style.overflow = 'hidden'
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-anim" @after-leave="onAfterLeave">
      <div v-if="visible" class="backdrop" @click.self="requestClose">
        <div class="modal" role="dialog" aria-modal="true">
          <header class="mhead">
            <h2 class="mhead-name">{{ name }}</h2>
            <button class="btn-x" @click="requestClose" aria-label="Cerrar">✕</button>
          </header>
          <div class="mbody">
            <table class="info-tbl">
              <tbody>
                <tr v-for="(v, k) in desc" :key="k">
                  <th scope="row" class="td-key">{{ k }}</th>
                  <td class="td-val">
                    <template v-if="isLink(v)">
                      <a :href="getLinkHref(v)" target="_blank" rel="noopener noreferrer" class="doc-link" title="Abrir Documento">
                        <Eye class="w-4 h-4" />
                        Abrir Documento
                      </a>
                    </template>
                    <template v-else>
                      {{ v }}
                    </template>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(11, 86, 64, 0.2); backdrop-filter: blur(2px);
  display: flex; justify-content: flex-end; /* Alineado a la derecha */
}
.modal {
  background: #ffffff; width: 100%; max-width: 400px;
  height: 100vh; /* Altura completa */
  box-shadow: -5px 0 30px rgba(0, 0, 0, 0.15); 
  display: flex; flex-direction: column;
  overflow: hidden;
}
.mhead {
  background: #0b5640; padding: 20px 24px;
  display: flex; align-items: center; justify-content: space-between;
}
.mhead-name {
  margin: 0; font-family: 'Prompt', sans-serif; font-size: 18px;
  font-weight: 700; color: #ffffff;
}
.btn-x {
  background: transparent; border: none; color: #ffffff; font-size: 20px; cursor: pointer;
  padding: 0; opacity: 0.8; transition: opacity 0.2s;
}
.btn-x:hover { opacity: 1; }
.mbody {
  padding: 24px; overflow-y: auto; flex: 1;
}
.info-tbl {
  width: 100%; border-collapse: collapse; font-family: 'Prompt', sans-serif;
}
.info-tbl tr { border-bottom: 1px solid #f1f5f9; }
.info-tbl tr:last-child { border-bottom: none; }
.td-key {
  padding: 16px 16px 16px 0; font-size: 14px; color: #64748b;
  font-weight: 600; text-align: left; width: 45%; vertical-align: top;
}
.td-val {
  padding: 16px 0; font-size: 14px; color: #0f172a; font-weight: 500;
  vertical-align: top; word-break: break-word;
}
.doc-link {
  display: inline-flex; align-items: center; gap: 6px;
  color: #2563eb; text-decoration: none; font-weight: 600;
}
.doc-link:hover {
  text-decoration: underline; color: #1d4ed8;
}
.w-4 { width: 16px; }
.h-4 { height: 16px; }

/* Animación de panel lateral (Slide In desde la derecha) */
.modal-anim-enter-active, .modal-anim-leave-active { transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
.modal-anim-enter-from, .modal-anim-leave-to { opacity: 0; transform: translateX(100%); }
.modal-anim-enter-from .backdrop, .modal-anim-leave-to .backdrop { opacity: 0; }
</style>
