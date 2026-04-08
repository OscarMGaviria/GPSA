<script setup>
import { ref, computed } from 'vue'
import { Search, X } from 'lucide-vue-next'
import { useMapStore } from '../../stores/useMapStore.js'

const emit = defineEmits(['open-via'])

const store    = useMapStore()
const query    = ref('')
const focused  = ref(false)
const activeIdx = ref(-1)

const results = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (q.length < 2) return []
  return store.mapStats.viasDetalle
    .filter(v =>
      v.nombre?.toLowerCase().includes(q) ||
      v.municipio?.toLowerCase().includes(q) ||
      v.subregion?.toLowerCase().includes(q) ||
      v.contratista?.toLowerCase().includes(q)
    )
    .slice(0, 8)
})

const showDropdown = computed(() => focused.value && results.value.length > 0)

function onInput() { activeIdx.value = -1 }

function onKeydown(e) {
  if (!showDropdown.value) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIdx.value = Math.min(activeIdx.value + 1, results.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIdx.value = Math.max(activeIdx.value - 1, -1)
  } else if (e.key === 'Enter' && activeIdx.value >= 0) {
    select(results.value[activeIdx.value])
  } else if (e.key === 'Escape') {
    clear()
  }
}

function select(via) {
  query.value    = via.nombre
  focused.value  = false
  activeIdx.value = -1
  emit('open-via', via)
}

function clear() {
  query.value    = ''
  focused.value  = false
  activeIdx.value = -1
}

function highlight(text, q) {
  if (!text || !q) return text ?? ''
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(re, '<mark>$1</mark>')
}
</script>

<template>
  <div class="map-search" :class="{ 'is-focused': focused }">
    <div class="search-input-wrap">
      <Search class="search-icon" :size="15" />
      <input
        v-model="query"
        class="search-input"
        type="text"
        placeholder="Buscar vía, municipio o subregión…"
        autocomplete="off"
        @focus="focused = true"
        @blur="setTimeout(() => focused = false, 150)"
        @input="onInput"
        @keydown="onKeydown"
        aria-label="Buscar tramo vial"
        :aria-expanded="showDropdown"
        role="combobox"
      />
      <button v-if="query" class="search-clear" @click="clear" tabindex="-1" aria-label="Limpiar búsqueda">
        <X :size="13" />
      </button>
    </div>

    <Transition name="dropdown">
      <ul v-if="showDropdown" class="search-dropdown" role="listbox">
        <li
          v-for="(via, i) in results"
          :key="via.nombre + i"
          class="search-item"
          :class="{ 'is-active': activeIdx === i }"
          role="option"
          :aria-selected="activeIdx === i"
          @mousedown.prevent="select(via)"
        >
          <div class="si-nombre" v-html="highlight(via.nombre, query.trim())" />
          <div class="si-meta">
            <span class="si-tag">{{ via.municipio || '—' }}</span>
            <span class="si-sep">·</span>
            <span class="si-tag si-tag--sub">{{ via.subregion || '—' }}</span>
            <span v-if="via.km" class="si-sep">·</span>
            <span v-if="via.km" class="si-km">{{ via.km }} km</span>
          </div>
        </li>
      </ul>
    </Transition>
  </div>
</template>

<style scoped>
.map-search {
  position: absolute;
  top: 14px;
  right: 56px;
  z-index: 30;
  width: 280px;
  font-family: 'Prompt', sans-serif;
}

.search-input-wrap {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.95);
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  padding: 0 10px;
  gap: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transition: border-color .15s, box-shadow .15s;
  backdrop-filter: blur(8px);
}

.map-search.is-focused .search-input-wrap {
  border-color: #16a34a;
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12), 0 2px 12px rgba(0, 0, 0, 0.1);
}

.search-icon {
  flex-shrink: 0;
  color: #9ca3af;
}

.map-search.is-focused .search-icon {
  color: #16a34a;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-family: 'Prompt', sans-serif;
  font-size: 13px;
  color: #111827;
  padding: 9px 0;
  min-width: 0;
}

.search-input::placeholder {
  color: #b0b8c4;
}

.search-clear {
  flex-shrink: 0;
  border: none;
  background: none;
  padding: 2px;
  cursor: pointer;
  color: #9ca3af;
  border-radius: 4px;
  display: flex;
  align-items: center;
  transition: color .12s, background .12s;
}
.search-clear:hover { color: #374151; background: #f3f4f6; }

/* ── Dropdown ── */
.search-dropdown {
  list-style: none;
  margin: 4px 0 0;
  padding: 4px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06);
  max-height: 340px;
  overflow-y: auto;
}

.search-item {
  padding: 8px 10px;
  border-radius: 7px;
  cursor: pointer;
  transition: background .1s;
  outline: none;
}

.search-item:hover,
.search-item.is-active {
  background: #f0fdf4;
}

.si-nombre {
  font-size: 13px;
  font-weight: 600;
  color: #1a3c2d;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(mark) {
  background: #d1fae5;
  color: #065f46;
  border-radius: 2px;
  padding: 0 1px;
  font-weight: 700;
}

.si-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}

.si-tag {
  font-size: 11px;
  color: #6b7280;
  font-weight: 500;
}
.si-tag--sub {
  color: #2d8653;
  font-weight: 600;
}
.si-sep {
  font-size: 10px;
  color: #d1d5db;
}
.si-km {
  font-size: 11px;
  font-weight: 700;
  color: #0b5640;
}

/* ── Dropdown animation ── */
.dropdown-enter-active {
  transition: opacity .15s ease, transform .15s cubic-bezier(.34,1.56,.64,1);
}
.dropdown-leave-active {
  transition: opacity .1s ease, transform .1s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.97);
}
</style>
