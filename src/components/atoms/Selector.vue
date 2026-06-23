<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { ChevronDown, Check, Search } from '@lucide/vue'

const props = defineProps({
  options: {
    type: Array,
    default: () => [
      'Todas las subregiones',
      'Urabá',
      'Norte',
      'Oriente',
      'Occidente',
      'Suroeste',
      'Magdalena Medio',
      'Nordeste',
      'Bajo Cauca'
    ]
  },
  modelValue: {
    type: String,
    default: ''
  },
  align: {
    type: String,
    default: 'left'  // 'left' | 'right'
  }
})

const emit = defineEmits(['update:modelValue'])

const isOpen    = ref(false)
const searchQ   = ref('')
const containerRef = ref(null)
const searchRef    = ref(null)

const filtered = computed(() => {
  const q = searchQ.value.trim().toLowerCase()
  return q ? props.options.filter(o => o.toLowerCase().includes(q)) : props.options
})

const toggle = async () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    searchQ.value = ''
    await nextTick()
    searchRef.value?.focus()
  }
}

const select = (option) => {
  emit('update:modelValue', option)
  isOpen.value = false
  searchQ.value = ''
}

const onClickOutside = (e) => {
  if (containerRef.value && !containerRef.value.contains(e.target)) {
    isOpen.value = false
    searchQ.value = ''
  }
}

onMounted(() => document.addEventListener('mousedown', onClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside))
</script>

<template>
  <div class="select-container" ref="containerRef">

    <!-- Trigger -->
    <button class="select-trigger" @click="toggle" :class="{ 'is-open': isOpen }">
      <span class="trigger-value">{{ modelValue || options[0] }}</span>
      <ChevronDown :size="14" class="trigger-arrow" :class="{ 'rotated': isOpen }" />
    </button>

    <!-- Dropdown -->
    <Transition name="dropdown">
      <div v-if="isOpen" class="dropdown-panel" :class="{ 'align-right': align === 'right' }">

        <!-- Search box -->
        <div class="dropdown-search">
          <Search :size="13" class="search-icon" />
          <input
            ref="searchRef"
            v-model="searchQ"
            type="text"
            placeholder="Buscar..."
            class="search-input"
            @click.stop
          />
        </div>

        <div class="dropdown-divider" />

        <!-- Options -->
        <ul class="dropdown-list">
          <li v-if="filtered.length === 0" class="dropdown-empty">
            Sin resultados
          </li>
          <li
            v-for="option in filtered"
            :key="option"
            class="dropdown-item"
            :class="{ 'is-selected': option === (modelValue || options[0]) }"
            @click="select(option)"
          >
            <span class="item-label">{{ option }}</span>
            <Check v-if="option === (modelValue || options[0])" :size="12" class="item-check" />
          </li>
        </ul>

      </div>
    </Transition>

  </div>
</template>

<style scoped>
.select-container {
  position: relative;
  display: inline-block;
}

/* ── Trigger ── */
.select-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 11px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-family: 'Prompt', sans-serif;
  font-weight: 400;
  color: #ffffff;
  min-width: 148px;
  justify-content: space-between;
  transition: background 0.15s, border-color 0.15s;
}

.select-trigger:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
}

.select-trigger.is-open {
  background: rgba(255, 255, 255, 0.22);
  border-color: rgba(255, 255, 255, 0.5);
}

.select-trigger:focus { outline: none; }

.trigger-value {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trigger-arrow {
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.7);
  transition: transform 0.2s ease;
}

.trigger-arrow.rotated { transform: rotate(180deg); }

/* ── Dropdown panel ── */
.dropdown-panel {
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
}

.dropdown-panel.align-right {
  left: auto;
  right: 0;
  min-width: 100%;
  z-index: 200;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12), 0 1px 4px rgba(0, 0, 0, 0.06);
  padding: 6px;
}

/* ── Search ── */
.dropdown-search {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 2px;
}

.search-icon {
  position: absolute;
  left: 8px;
  color: #9ca3af;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 6px 8px 6px 28px;
  border: 1px solid #e5e7eb;
  border-radius: 5px;
  font-size: 12.5px;
  font-family: 'Prompt', sans-serif;
  color: #111827;
  background: #f9fafb;
  box-sizing: border-box;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.search-input::placeholder { color: #9ca3af; }

.search-input:focus {
  outline: none;
  border-color: #16a34a;
  box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.12);
  background: #ffffff;
}

.dropdown-divider {
  height: 1px;
  background: #f3f4f6;
  margin: 4px 0;
}

/* ── List ── */
.dropdown-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 200px;
  overflow-y: auto;
}

.dropdown-list::-webkit-scrollbar { width: 4px; }
.dropdown-list::-webkit-scrollbar-track { background: transparent; }
.dropdown-list::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
}

.dropdown-empty {
  padding: 10px;
  font-size: 12.5px;
  color: #9ca3af;
  font-family: 'Prompt', sans-serif;
  text-align: center;
}

.dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 13px;
  font-family: 'Prompt', sans-serif;
  color: #374151;
  transition: background 0.1s;
  white-space: nowrap;
  user-select: none;
}

.dropdown-item:hover {
  background: #f3f4f6;
  color: #111827;
}

.dropdown-item.is-selected {
  background: #f0fdf4;
  color: #166534;
  font-weight: 500;
}

.dropdown-item.is-selected:hover { background: #dcfce7; }

.item-check {
  color: #16a34a;
  flex-shrink: 0;
}

/* ── Transition ── */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
