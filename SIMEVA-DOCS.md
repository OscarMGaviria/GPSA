# SIMEVA — Documentación Técnica Detallada

**Sistema de Seguimiento y Monitoreo Vial de Antioquia**
Secretaría de Infraestructura Física · Gobernación de Antioquia
Frontend Vue.js — Rama activa: `feature/12856`

> Documento elaborado conforme a la *Guía de Arquitectura y Buenas Prácticas de Desarrollo* de la Gobernación de Antioquia (Sección 10 — Prácticas de Documentación).

---

## Tabla de contenido

1. [Descripción del sistema](#1-descripción-del-sistema)
2. [Arquitectura de referencia](#2-arquitectura-de-referencia)
3. [Estructura de directorios](#3-estructura-de-directorios)
4. [Componentes — Catálogo](#4-componentes--catálogo)
5. [Composables — Catálogo](#5-composables--catálogo)
6. [Flujo de datos](#6-flujo-de-datos)
7. [Gestión de estado (Pinia)](#7-gestión-de-estado-pinia)
8. [Capa de servicios](#8-capa-de-servicios)
9. [Infraestructura Azure](#9-infraestructura-azure)
10. [Estrategia de caché offline](#10-estrategia-de-caché-offline)
11. [Estrategia de ramas y commits](#11-estrategia-de-ramas-y-commits)
12. [Licencias de dependencias](#12-licencias-de-dependencias)
13. [Pendientes técnicos (deuda técnica)](#13-pendientes-técnicos-deuda-técnica)

---

## 1. Descripción del sistema

SIMEVA es un aplicativo público de consulta ciudadana que permite visualizar el estado de avance del programa de pavimentación y mejoramiento de la red vial departamental de Antioquia. No requiere autenticación.

**Funcionalidades principales:**

| Funcionalidad | Descripción |
|---|---|
| Mapa interactivo | Visualización geoespacial de tramos viales sobre fondo configurable |
| Filtros cruzados | Filtrar por subregión, municipio y circuito desde el encabezado o el gráfico |
| Panel de estadísticas | KPIs, avance físico, avance en km y distribución por subregión |
| Modal de detalle de vía | Información completa del tramo al hacer clic sobre él en el mapa |
| Modales de detalle por card | Tablas detalladas de vías, municipios, circuitos y longitud al hacer clic en cada KPI |
| Etiquetas flotantes (callouts) | Nombres y longitudes de vías visibles en el viewport al aplicar filtros |
| Relieve 3D opcional | Activación de terrain DEM con hillshade para visualización topográfica |
| Caché offline | Datos GeoJSON almacenados en localStorage (TTL 24 h) con indicador visual |

---

## 2. Arquitectura de referencia

El sistema sigue el estilo **Monolito Modular** recomendado por la guía institucional, con separación clara entre capas:

```
┌─────────────────────────────────────────────────┐
│                  PRESENTACIÓN                   │
│  App.vue → AppHeader / MapView / StatsPanel     │
│  (Organisms → Molecules → Atoms)                │
├─────────────────────────────────────────────────┤
│               LÓGICA DE APLICACIÓN              │
│  useMapOrchestrator → useMapInit                │
│                     → useMapLayers              │
│                     → useMapFilters             │
│                     → useCallouts               │
├─────────────────────────────────────────────────┤
│                ESTADO GLOBAL                    │
│  Pinia — useMapStore                            │
│  (activeFilters, filterOptions, mapStats)       │
├─────────────────────────────────────────────────┤
│                   SERVICIOS                     │
│  api.js — fetchGeoJSON + caché localStorage     │
├─────────────────────────────────────────────────┤
│              INFRAESTRUCTURA AZURE              │
│  Static Web App → API Management               │
│                 → Function App → Blob Storage  │
└─────────────────────────────────────────────────┘
```

**Patrón Atomic Design aplicado al frontend:**

- **Atoms**: Componentes sin dependencias (`StatCard`, `Selector`, `ProgressBar`, `ProgressRing`)
- **Molecules**: Composiciones de átomos (`FilterBar`, `LabeledSelector`)
- **Organisms**: Secciones completas de página (`AppHeader`, `MapView`, `StatsPanel`, `ViaDetailModal`, `StatsDetailModal`)

---

## 3. Estructura de directorios

```
SIMEVA-FRONTEND/
├── .env.example                     # Plantilla de variables de entorno (versionado)
├── .env                             # Variables locales (NO versionado)
├── .env.production                  # Variables de producción (versionado sin secretos)
├── .gitignore
├── index.html                       # Punto de entrada HTML — monta #app
├── package.json
├── vite.config.js
├── README.md                        # Guía de instalación y operación
├── SIMEVA-DOCS.md                   # Este documento
├── docs/
│   ├── historias-usuario.md         # Historias de usuario con criterios de aceptación
│   └── api-contratos.md             # Contratos de las APIs consumidas
└── src/
    ├── main.js                      # Bootstrap Vue + Pinia
    ├── App.vue                      # Raíz de la aplicación
    ├── style.css                    # Reset y estilos globales
    ├── stores/
    │   └── useMapStore.js           # Estado global Pinia
    ├── services/
    │   └── api.js                   # Cliente HTTP, parsers GeoJSON, caché
    ├── composables/
    │   ├── useMapOrchestrator.js    # Coordinador de composables del mapa
    │   ├── useMapInit.js            # Inicialización de MapLibre GL JS
    │   ├── useMapLayers.js          # Capas GeoJSON, stats, eventos
    │   ├── useMapFilters.js         # Filtros sobre capas del mapa
    │   └── useCallouts.js           # Etiquetas flotantes sobre tramos
    └── components/
        ├── atoms/
        │   ├── Selector.vue
        │   ├── StatCard.vue
        │   ├── ProgressBar.vue
        │   └── ProgressRing.vue
        ├── molecules/
        │   ├── FilterBar.vue
        │   └── LabeledSelector.vue
        └── organisms/
            ├── AppHeader.vue
            ├── MapView.vue
            ├── StatsPanel.vue
            ├── ViaDetailModal.vue
            └── StatsDetailModal.vue
```

---

## 4. Componentes — Catálogo

### Atoms

#### `StatCard.vue`
Tarjeta de métrica numérica con icono, valor animado y título.

| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| `title` | String | Sí | Etiqueta descriptiva de la métrica |
| `value` | String \| Number | Sí | Valor a mostrar |
| `unit` | String | No | Unidad (ej. `km`) |

Emite: `click` nativo (delegar al padre con `@click`).

---

#### `Selector.vue`
Dropdown accesible con búsqueda interna.

| Prop | Tipo | Descripción |
|------|------|-------------|
| `options` | Array | Lista de cadenas de texto |
| `modelValue` | String | Valor seleccionado (v-model) |
| `placeholder` | String | Texto cuando no hay selección |

---

#### `ProgressRing.vue`
Indicador circular de progreso SVG.

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `pct` | Number | 0 | Porcentaje 0–100 |
| `size` | Number | 110 | Diámetro en px |
| `stroke` | Number | 10 | Grosor del anillo |
| `sublabel` | String | — | Texto secundario bajo el porcentaje |

---

#### `ProgressBar.vue`
Barra de progreso horizontal.

| Prop | Tipo | Descripción |
|------|------|-------------|
| `pct` | Number | Porcentaje 0–100 |
| `color` | String | Color de relleno (hex) |
| `trackColor` | String | Color de fondo |
| `height` | Number | Altura en px |

---

### Molecules

#### `FilterBar.vue`
Grupo de tres selectores (subregión, municipio, circuito) y campo de búsqueda. Emite `filter-change` al cambiar cualquier valor.

#### `LabeledSelector.vue`
Selector con etiqueta descriptiva encima. Wraps `Selector.vue` con layout vertical.

---

### Organisms

#### `AppHeader.vue`
Encabezado institucional con logo de la Gobernación, título del sistema, `FilterBar` y botón de apertura/cierre del panel.

**Emits:**

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `filter-change` | `{ search, subregion, municipio, circuito }` | Se dispara en cada cambio de filtro |
| `toggle-panel` | — | Abre/cierra el panel lateral |

---

#### `MapView.vue`
Contenedor del mapa interactivo. Delega toda la lógica a `useMapOrchestrator`.

**Props:**

| Prop | Tipo | Descripción |
|------|------|-------------|
| `filters` | Object | Filtros activos desde el store |

---

#### `StatsPanel.vue`
Panel lateral derecho con:
- 4 tarjetas KPI (vías, longitud, municipios, circuitos) — cada una abre su modal de detalle
- Sección de avance físico (ProgressRing) y avance en km (ProgressBar)
- Gráfico de barras por subregión (interactivo — aplica filtro al hacer clic)

**Props principales:**

| Prop | Tipo | Descripción |
|------|------|-------------|
| `isOpen` | Boolean | Controla visibilidad del panel |
| `viasIntervenidas` | Number | Total de tramos |
| `longitudTotal` | Number | Km totales |
| `municipios` | Number | Municipios únicos |
| `circuitos` | Number | Circuitos totales |
| `avanceFisicoPct` | Number | % avance físico ponderado |
| `subregiones` | Array | `[{ name, km, pct }]` para el gráfico |
| `viasDetalle` | Array | Detalle por vía para los modales |

**Emits:** `filter-subregion(nombre)` al hacer clic en una barra del gráfico.

---

#### `ViaDetailModal.vue`
Modal de detalle de un tramo al hacer clic en el mapa.

**Props:**

| Prop | Tipo | Descripción |
|------|------|-------------|
| `via` | Object | `{ name, description, photos: { antes, durante, despues } }` |

**Emits:** `close`

---

#### `StatsDetailModal.vue`
Modal con 4 vistas de detalle para cada card KPI.

**Props:**

| Prop | Tipo | Descripción |
|------|------|-------------|
| `tipo` | String | `'vias'` \| `'longitud'` \| `'municipios'` \| `'circuitos'` |
| `viasDetalle` | Array | Array de objetos de vía con campos normalizados |
| `subregiones` | Array | Array `[{ name, km, pct }]` |

**Emits:** `close`

Características UX: búsqueda en tiempo real, ordenamiento por columna, cierre con `Esc`.

---

## 5. Composables — Catálogo

### `useMapOrchestrator(mapContainer, filtersGetter)`
Punto de entrada único para toda la lógica del mapa. Coordina los cuatro composables internos y expone las APIs necesarias para `MapView`.

**Retorna:**

| Ref / Función | Tipo | Descripción |
|---------------|------|-------------|
| `loading` | Ref\<Boolean\> | Datos en carga |
| `loadError` | Ref\<Boolean\> | Error al cargar |
| `fromCache` | Ref\<Boolean\> | Datos provenientes de caché |
| `hoverLabel` | Ref\<String\> | Nombre del tramo bajo el cursor |
| `selectedVia` | Ref\<Object\> | Tramo seleccionado (abre ViaDetailModal) |
| `selectedSubregion` | Ref\<String\> | Subregión activa en el mapa |
| `selectedMunicipio` | Ref\<String\> | Municipio activo en el mapa |
| `visibleCallouts` | Ref\<Array\> | Callouts activos en viewport |
| `activeBasemap` | Ref\<String\> | ID del basemap activo |
| `terrainActive` | Ref\<Boolean\> | Estado del relieve 3D |
| `switchBasemap(b)` | Función | Cambia el mapa base |
| `toggleTerrain()` | Función | Activa/desactiva relieve 3D |

---

### `useMapInit(mapContainer, callbacks)`
Inicializa la instancia de MapLibre GL. Gestiona basemaps, terrain DEM, hillshade, controles de navegación y resize observer.

**Callbacks:**

| Callback | Cuándo se invoca |
|----------|-----------------|
| `onMapCreated(map)` | Al construir el mapa |
| `onLoad()` | Al completar la carga inicial del estilo |

---

### `useMapLayers(getMap, callbacks, helpers)`
Carga los datos GeoJSON (vías y municipios), construye las capas del mapa y calcula estadísticas.

**Responsabilidades:**
- Fetch paralelo de vías y municipios (con caché offline)
- Construcción del objeto `viasDetalle` para los modales
- Cálculo de KPIs y distribución por subregión
- Manejo del hover y clic sobre tramos (`selectedVia`)
- Añadir capas: `municipios-fill`, `municipios-outline`, `municipios-labels`, `vias-line`, `car-route-line`, `paved-trail-line`

**Callbacks:**

| Callback | Payload |
|----------|---------|
| `onOptionsLoaded(opts)` | `{ subregiones, municipios, circuitos, municipiosPorSubregion }` |
| `onStatsLoaded(stats)` | `{ viasIntervenidas, longitudTotal, municipios, circuitos, subregiones, viasDetalle }` |

---

### `useMapFilters(getMap, filtersGetter, config)`
Aplica filtros de MapLibre sobre las capas `municipios-fill` y `vias-line` en respuesta a cambios en los filtros activos. Infiere subregión automáticamente cuando se selecciona un municipio.

---

### `useCallouts(getMap)`
Calcula y mantiene las etiquetas flotantes (callouts) de tramos visibles en el viewport.

**Comportamiento:**
- Al aplicar un filtro, determina qué tramos deben mostrar etiqueta (`filteredNames`)
- En cada evento `move`/`zoom`, re-evalúa qué etiquetas están dentro del canvas
- Los labels desaparecen al salir del viewport y reaparecen al volver

---

## 6. Flujo de datos

```
Usuario
  │
  ├── Selecciona filtro en AppHeader
  │       └── store.setFilter(filters)
  │               ├── MapView → useMapOrchestrator
  │               │     └── useMapFilters.applyFilters()
  │               │           ├── Actualiza capas MapLibre (expressions)
  │               │           └── useCallouts.refreshVisibleCallouts()
  │               └── StatsPanel recibe viasDetalle filtrado
  │
  ├── Hace clic en barra del gráfico de subregiones
  │       └── StatsPanel emite 'filter-subregion'
  │               └── App.vue → store.setFilter()  (misma cadena)
  │
  ├── Hace clic en tramo del mapa
  │       └── useMapLayers → selectedVia.value = { ... }
  │               └── MapView muestra ViaDetailModal
  │
  └── Hace clic en card KPI
          └── StatsPanel → modalTipo.value = tipo
                  └── StatsDetailModal con viasDetalle + subregiones
```

---

## 7. Gestión de estado (Pinia)

### `useMapStore` — Estado global

```js
// Estado reactivo
activeFilters: {
  search:    '',
  subregion: 'Todas las subregiones',
  municipio: 'Todos los municipios',
  circuito:  'Todos los circuitos',
}

filterOptions: {
  subregiones:            ['Todas las subregiones', ...],
  municipios:             ['Todos los municipios',  ...],
  circuitos:              ['Todos los circuitos',   ...],
  municipiosPorSubregion: { 'Urabá': ['Arboletes', ...], ... },
}

mapStats: {
  viasIntervenidas: Number,
  longitudTotal:    Number,
  municipios:       Number,
  circuitos:        Number,
  subregiones:      [{ name, km, pct }],
  viasDetalle:      [{ nombre, codigo, municipio, subregion, km, avance, contratista, fechaInicio, plazo, circuito }],
}

// Computed
filteredMunicipioOptions: // filtra municipios según subregión activa

// Acciones
setFilter(filters)        // actualiza activeFilters (resetea municipio si cambia subregión)
setFilterOptions(options) // poblado por useMapLayers al cargar datos
setMapStats(stats)        // poblado por useMapLayers al cargar datos
```

**Decisión de diseño:** Los filtros no se persisten en la URL ni en sessionStorage. Cada recarga inicia con el estado limpio por defecto, garantizando que el ciudadano siempre vea la vista completa al entrar.

---

## 8. Capa de servicios

### `api.js` — Funciones exportadas

| Función | Descripción |
|---------|-------------|
| `fetchGeoJSON(url, cacheKey)` | Fetch con caché localStorage TTL 24 h. Retorna GeoJSON o null |
| `parseDescription(html)` | Parsea tabla HTML de KML → objeto clave-valor |
| `extractKm(desc)` | Extrae longitud en km del objeto de descripción |
| `calcGeomKm(geometry)` | Calcula km geodésicos de una geometría LineString/MultiLineString |
| `extractPhotosByPhase(props, html)` | Extrae URLs de fotos clasificadas en `{ antes, durante, despues }` |

**Caché offline:**
- Clave: `simeva_cache_{cacheKey}`
- Valor: `{ ts: Date.now(), data: GeoJSON }`
- TTL: 86 400 000 ms (24 horas)
- Ante fallo de red, intenta leer del caché aunque haya expirado

---

## 9. Infraestructura Azure

```
Ciudadano (HTTPS/TLS 1.2+)
    └─▶ Azure Front Door Standard (CDN + WAF)
           └─▶ Azure Static Web App — Free
                  (Despliega /dist generado por Vite)
                  └─▶ Azure API Management — Consumption
                         (CORS, throttling, Ocp-Apim-Subscription-Key)
                         └─▶ Azure Function App — Consumption
                                (dotnet-isolated, GetGeoJSON trigger HTTP)
                                └─▶ Azure Blob Storage
                                       (contenedor: geojson/, acceso privado)
```

| Recurso | Nombre sugerido | Tier | Rol |
|---------|----------------|------|-----|
| Static Web App | `stapp-simeva-prod` | Free | Hosting SPA |
| API Management | `apim-simeva-prod` | Consumption | Gateway seguro |
| Function App | `func-simeva-prod` | Consumption | Proxy GeoJSON |
| Storage Account | `stsimevaprod` | Standard LRS | Archivos GeoJSON |
| Front Door | `afd-simeva-prod` | Standard | CDN + WAF |

**Seguridad aplicada:**
- La Function App usa **Managed Identity** con rol `Storage Blob Data Reader` — sin connection strings en código fuente
- TLS 1.2+ obligatorio en toda la cadena
- CORS configurado en APIM para permitir solo el dominio de producción
- No se almacenan datos personales de ciudadanos — cumple Ley 1581

---

## 10. Estrategia de caché offline

El frontend implementa una capa de caché en `localStorage` para garantizar disponibilidad ante fallos de red:

```
fetchGeoJSON(url, cacheKey)
  ├── Intenta fetch de la URL
  │     ├── Éxito → guarda en localStorage con timestamp → retorna data
  │     └── Error → busca en localStorage
  │               ├── Cacheado < 24h → retorna data + fromCache = true
  │               └── Cacheado > 24h → retorna data + fromCache = true (fallback)
  └── Sin caché y sin red → retorna null → loadError = true
```

Cuando `fromCache = true`, el mapa muestra un banner informativo al usuario.

---

## 11. Estrategia de ramas y commits

Conforme a la *Guía de Arquitectura* (Sección 5):

| Rama | Propósito |
|------|-----------|
| `master` | Producción estable — solo merges con aprobación de QA |
| `develop` | Integración continua — merges de features |
| `feature/*` | Desarrollo de funcionalidades (ej. `feature/12856`) |

**Convención de commits (Conventional Commits):**

```
feat:     Nueva funcionalidad
fix:      Corrección de bug
refactor: Reestructuración sin cambio de comportamiento
docs:     Cambios en documentación
chore:    Configuración, dependencias, tareas auxiliares
```

**Idioma:** Variables, comentarios y mensajes de commit en **español neutro**, conforme al estándar institucional.

---

## 12. Licencias de dependencias

Verificación de compatibilidad con uso institucional (Sección 9 — Licenciamiento):

| Dependencia | Versión | Licencia | Compatible |
|-------------|---------|----------|-----------|
| Vue 3 | ^3.5.x | MIT | Sí |
| Pinia | ^3.x | MIT | Sí |
| Vite | ^7.x | MIT | Sí |
| MapLibre GL JS | ^5.x | BSD-3-Clause | Sí |
| Lucide Vue Next | latest | ISC | Sí |
| Three.js | ^0.183 | MIT | Sí (dependencia residual — pendiente de eliminar) |

> Ninguna dependencia usa licencia GPL u otra licencia restrictiva que obligue a liberar el código propietario de la Gobernación.

---

## 13. Pendientes técnicos (deuda técnica)

| Ítem | Prioridad | Descripción |
|------|-----------|-------------|
| API de producción | Alta | Reemplazar endpoints mock de Postman (`mock.pstmn.io`) por API Management real |
| Three.js | Media | Paquete instalado pero sin uso activo — remover de `package.json` |
| Pruebas unitarias (Jest/Vitest) | Media | No existe suite de pruebas. Meta: >80% cobertura en `api.js` y composables |
| Pruebas de accesibilidad WCAG 2.1 AA | Media | Validar con WAVE — requerido por Res. 1519/2020 |
| TypeScript | Baja | Migración progresiva para tipado de contratos GeoJSON |
| Análisis estático (ESLint) | Baja | Configurar ESLint + reglas Vue 3 en el pipeline CI |
| Manual de despliegue | Media | Documentar proceso de CI/CD en Azure DevOps (pipelines YAML) |

---

*Gobernación de Antioquia · Secretaría de Infraestructura Física*
*Sistema de Seguimiento y Monitoreo Vial — SIMEVA*
*Versión del documento: 2.0 — Marzo 2026*
