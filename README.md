# SIMEVA — Frontend

**Sistema de Seguimiento y Monitoreo Vial de Antioquia**
Secretaría de Infraestructura Física · Gobernación de Antioquia

Aplicativo público de visualización geoespacial que muestra el estado de avance de la red vial departamental mediante un mapa interactivo, filtros por subregión/municipio/circuito y un panel de estadísticas en tiempo real.

---

## Prerrequisitos

| Herramienta | Versión mínima | Notas |
|-------------|---------------|-------|
| Node.js | 18.x o superior | Se recomienda la versión LTS activa |
| npm | 9.x o superior | Incluido con Node.js |
| Git | Cualquier versión reciente | Para clonar el repositorio |

> El proyecto usa módulos ES nativos (`"type": "module"`). No es compatible con CommonJS directo.

---

## Instalación y ejecución local

```bash
# 1. Clonar el repositorio
git clone https://GobernacionAntioquia@dev.azure.com/GobernacionAntioquia/SIMEVA/_git/SIMEVA-FRONTEND
cd SIMEVA-FRONTEND

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con las URLs reales del API Management

# 4. Iniciar servidor de desarrollo
npm run dev
```

El servidor queda disponible en `http://localhost:5173`.

---

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo con hot-reload |
| `npm run build` | Genera artefacto de producción en `/dist` |
| `npm run preview` | Sirve el build de producción localmente |

---

## Variables de entorno

El proyecto usa variables de entorno con el prefijo `VITE_` para que Vite las exponga en el cliente. Copiar `.env.example` como `.env` y completar los valores:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_API_LOCALIZACIONES` | Endpoint GeoJSON de vías y tramos | `https://apim-simeva-prod.azure-api.net/geojson/localizaciones` |
| `VITE_API_MUNICIPIOS` | Endpoint GeoJSON de municipios de Antioquia | `https://apim-simeva-prod.azure-api.net/geojson/municipios` |

> **Importante:** El archivo `.env` está excluido de Git (`.gitignore`). Nunca subir credenciales ni URLs internas al repositorio.

### Entornos configurados

| Archivo | Uso |
|---------|-----|
| `.env` | Desarrollo local (no versionado) |
| `.env.example` | Plantilla para nuevos desarrolladores (versionado) |
| `.env.production` | Sobreescribe variables en el build de producción |

---

## Arquitectura del proyecto

```
src/
├── main.js                          # Punto de entrada — monta App.vue en #app
├── App.vue                          # Raíz: layout, sincronización de URL
├── style.css                        # Estilos globales y reset
├── stores/
│   └── useMapStore.js               # Estado global con Pinia (filtros, stats)
├── services/
│   └── api.js                       # Fetch GeoJSON, caché localStorage, manejo de errores
├── composables/
│   ├── useMapOrchestrator.js        # Coordina todos los composables del mapa
│   ├── useMapInit.js                # Inicialización de MapLibre GL
│   ├── useMapLayers.js              # Capas GeoJSON, eventos de clic
│   ├── useMapFilters.js             # Aplicación de filtros sobre capas
│   └── useCallouts.js               # Etiquetas flotantes de tramos visibles
└── components/
    ├── atoms/                       # Componentes mínimos reutilizables
    │   ├── Selector.vue             # Dropdown con búsqueda
    │   ├── StatCard.vue             # Tarjeta de métrica
    │   ├── ProgressBar.vue          # Barra de progreso
    │   └── ProgressRing.vue         # Indicador circular de progreso
    ├── molecules/                   # Composiciones de átomos
    │   ├── FilterBar.vue            # Grupo de filtros (subregión, municipio, circuito)
    │   └── LabeledSelector.vue      # Selector con etiqueta descriptiva
    └── organisms/                   # Componentes complejos de página
        ├── AppHeader.vue            # Cabecera con logo y controles de filtro
        ├── MapView.vue              # Contenedor del mapa interactivo
        ├── StatsPanel.vue           # Panel lateral con KPIs y gráfico de barras
        └── ViaDetailModal.vue       # Modal de detalle de tramo al hacer clic
```

---

## Stack tecnológico

| Tecnología | Versión | Rol |
|------------|---------|-----|
| Vue 3 | ^3.5.x | Framework UI (Composition API + `<script setup>`) |
| Pinia | ^3.x | Gestión de estado global |
| MapLibre GL | ^5.x | Motor de mapas vectoriales/raster |
| Vite | ^7.x | Bundler y servidor de desarrollo |
| Lucide Vue Next | — | Iconografía SVG |

---

## Infraestructura Azure (producción)

```
Usuario (HTTPS)
    └─▶ Azure Front Door + CDN   (Standard)
           └─▶ Static Web App     (Vue.js — Free)
                  └─▶ API Management (Consumption — CORS habilitado)
                         └─▶ Function App (dotnet-isolated — GetGeoJSON)
                                └─▶ Blob Storage (contenedor: geojson/)
```

| Recurso Azure | Nombre | Tier |
|--------------|--------|------|
| Static Web App | `stapp-simeva-prod` | Free |
| API Management | `apim-simeva-prod` | Consumption |
| Function App | `func-simeva-prod-getgeojson` | Consumption |
| Storage Account | `stsimevaprod` | Standard LRS |
| Front Door | `afd-simeva-prod` | Standard |

La Function App usa **Managed Identity** con rol `Storage Blob Data Reader`. No hay connection strings en el código fuente.

---

## Estrategia de ramas (GitFlow)

| Rama | Propósito |
|------|-----------|
| `master` | Producción estable — solo recibe merges aprobados por QA |
| `develop` | Integración continua |
| `feature/*` | Desarrollo de funcionalidades (ej. `feature/12856`) |

---

## Licencias de dependencias

Todas las dependencias directas usan licencias permisivas compatibles con uso institucional:

| Dependencia | Licencia |
|-------------|----------|
| Vue 3, Pinia, Vite | MIT |
| MapLibre GL | BSD-3-Clause |
| Lucide Vue Next | ISC |

---

## Documentación técnica adicional

- [SIMEVA-DOCS.md](./SIMEVA-DOCS.md) — Documentación detallada de componentes, flujo de datos e infraestructura

---

*Gobernación de Antioquia · Secretaría de Infraestructura Física*
*Sistema de Seguimiento y Monitoreo Vial — SIMEVA*
