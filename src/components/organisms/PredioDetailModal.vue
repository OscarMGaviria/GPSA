<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Eye } from '@lucide/vue'

const props = defineProps({ via: { type: Object, required: true } })
const emit  = defineEmits(['close'])

const visible = ref(true)
function requestClose() { visible.value = false }
function onAfterLeave() { emit('close') }

const pdfUrl = ref(null)
function openPdf(url) { pdfUrl.value = url }
function closePdf() { pdfUrl.value = null }

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
  if (e.key === 'Escape') {
    if (pdfUrl.value) {
      closePdf()
    } else {
      requestClose()
    }
  }
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
                      <a href="#" @click.prevent="openPdf(getLinkHref(v))" class="doc-link" title="Abrir Documento">
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

    <!-- Visor de PDF interno -->
    <Transition name="fade">
      <div v-if="pdfUrl" class="pdf-backdrop" @click.self="closePdf">
        <div class="pdf-modal">
          <header class="pdf-head">
            <h3 class="pdf-title">Visor de Documento</h3>
            <button class="btn-x" @click="closePdf" aria-label="Cerrar Documento">✕</button>
          </header>
          <iframe :src="pdfUrl" class="pdf-iframe" title="Visor de PDF" frameborder="0"></iframe>
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
  padding: 4px; opacity: 0.8; transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%;
}
.btn-x:hover { opacity: 1; transform: rotate(90deg) scale(1.1); background: rgba(255,255,255,0.15); }
.mbody {
  padding: 24px; overflow-y: auto; flex: 1;
}
.info-tbl {
  width: 100%; border-collapse: separate; border-spacing: 0; font-family: 'Prompt', sans-serif;
}
.info-tbl tr { 
  border-bottom: 1px solid #f1f5f9; 
  opacity: 0;
  transform: translateY(10px);
  animation: fade-up 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}
.info-tbl tr:nth-child(1) { animation-delay: 0.05s; }
.info-tbl tr:nth-child(2) { animation-delay: 0.1s; }
.info-tbl tr:nth-child(3) { animation-delay: 0.15s; }
.info-tbl tr:nth-child(4) { animation-delay: 0.2s; }
.info-tbl tr:nth-child(5) { animation-delay: 0.25s; }
.info-tbl tr:nth-child(6) { animation-delay: 0.3s; }

@keyframes fade-up {
  to { opacity: 1; transform: translateY(0); }
}

.info-tbl tr:last-child td, .info-tbl tr:last-child th { border-bottom: none; }
.info-tbl th, .info-tbl td { border-bottom: 1px solid #f1f5f9; }
.td-key {
  padding: 16px 16px 16px 0; font-size: 14px; color: #64748b;
  font-weight: 600; text-align: left; width: 45%; vertical-align: top;
}
.td-val {
  padding: 16px 0; font-size: 14px; color: #0f172a; font-weight: 500;
  vertical-align: top; word-break: break-word;
}
.doc-link {
  display: inline-flex; align-items: center; gap: 8px;
  color: #0b5640; text-decoration: none; font-weight: 600; font-size: 13px;
  background: rgba(11, 86, 64, 0.05); padding: 8px 16px; border-radius: 20px;
  border: 1px solid rgba(11, 86, 64, 0.15);
  transition: all 0.2s;
}
.doc-link:hover {
  background: rgba(11, 86, 64, 0.1); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(11, 86, 64, 0.1);
}
.doc-link:active {
  transform: translateY(0);
}
.w-4 { width: 16px; }
.h-4 { height: 16px; }

/* Animación de panel lateral (Slide In desde la derecha) */
.modal-anim-enter-active, .modal-anim-leave-active { transition: all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1); }
.modal-anim-enter-from, .modal-anim-leave-to { transform: translateX(100%); }
.modal-anim-enter-from .backdrop, .modal-anim-leave-to .backdrop { opacity: 0; backdrop-filter: blur(0px); }
.modal-anim-enter-active .backdrop, .modal-anim-leave-active .backdrop { transition: all 0.5s ease; }

/* Modal de PDF */
.pdf-backdrop {
  position: fixed; inset: 0; z-index: 1100;
  background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
}
.pdf-modal {
  background: #ffffff; width: 100%; max-width: 1000px; height: 90vh;
  border-radius: 12px; overflow: hidden; display: flex; flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
}
.pdf-head {
  background: #0f172a; padding: 12px 20px;
  display: flex; align-items: center; justify-content: space-between;
}
.pdf-title {
  margin: 0; font-family: 'Prompt', sans-serif; font-size: 16px; font-weight: 600; color: #ffffff;
}
.pdf-iframe {
  flex: 1; width: 100%; height: 100%; background: #e2e8f0;
}

/* Animación simple fade y scale para PDF */
.fade-enter-active, .fade-leave-active { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.fade-enter-from .pdf-modal, .fade-leave-to .pdf-modal { transform: scale(0.95); }
.fade-enter-active .pdf-backdrop, .fade-leave-active .pdf-backdrop { transition: opacity 0.3s ease; }
</style>
