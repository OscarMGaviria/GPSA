<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({ via: { type: Object, required: true } })
const emit  = defineEmits(['close'])

const visible = ref(true)
function requestClose() { visible.value = false }
function onAfterLeave() { emit('close') }

const desc = computed(() => props.via.description || {})
const name = computed(() => props.via.name || 'Detalles del Predio')

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
                  <td class="td-val">{{ v }}</td>
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
  background: rgba(11, 86, 64, 0.4); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.modal {
  background: #ffffff; border-radius: 12px; width: 100%; max-width: 420px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15); overflow: hidden;
  display: flex; flex-direction: column;
}
.mhead {
  background: #0b5640; padding: 16px 20px;
  display: flex; align-items: center; justify-content: space-between;
}
.mhead-name {
  margin: 0; font-family: 'Prompt', sans-serif; font-size: 16px;
  font-weight: 700; color: #ffffff;
}
.btn-x {
  background: transparent; border: none; color: #ffffff; font-size: 18px; cursor: pointer;
  padding: 0; opacity: 0.8; transition: opacity 0.2s;
}
.btn-x:hover {
  opacity: 1;
}
.mbody {
  padding: 0 20px; overflow-y: auto; max-height: 70vh;
}
.info-tbl {
  width: 100%; border-collapse: collapse; font-family: 'Prompt', sans-serif;
}
.info-tbl tr { border-bottom: 1px solid #f1f5f9; }
.info-tbl tr:last-child { border-bottom: none; }
.td-key {
  padding: 14px 14px 14px 0; font-size: 13px; color: #64748b;
  font-weight: 600; text-align: left; width: 45%; vertical-align: top;
}
.td-val {
  padding: 14px 0; font-size: 13px; color: #0f172a; font-weight: 500;
  vertical-align: top; word-break: break-word;
}
.modal-anim-enter-active, .modal-anim-leave-active { transition: opacity 0.2s; }
.modal-anim-enter-from, .modal-anim-leave-to { opacity: 0; }
</style>
