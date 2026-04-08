# SIMEVA — Contratos de API

**Sistema de Seguimiento y Monitoreo Vial de Antioquia**
Secretaría de Infraestructura Física · Gobernación de Antioquia

> Documento elaborado conforme a la *Guía de Arquitectura y Buenas Prácticas de Desarrollo* — Sección 10: Prácticas de Documentación (API), Sección 3.3: Integración (API First).
>
> Estándar de referencia: OpenAPI 3.0 (descripción textual).

---

## Tabla de contenido

1. [Descripción general](#1-descripción-general)
2. [Autenticación](#2-autenticación)
3. [Endpoints](#3-endpoints)
   - [GET /geojson/localizaciones](#get-geojsonlocalizaciones)
   - [GET /geojson/municipios](#get-geojsonmunicipios)
4. [Esquemas de datos](#4-esquemas-de-datos)
5. [Manejo de errores](#5-manejo-de-errores)
6. [Caché y disponibilidad](#6-caché-y-disponibilidad)
7. [Infraestructura del gateway](#7-infraestructura-del-gateway)

---

## 1. Descripción general

El frontend de SIMEVA consume dos endpoints GeoJSON servidos a través de **Azure API Management**. Ambos retornan colecciones de features en formato GeoJSON estándar (RFC 7946).

| Parámetro | Valor |
|-----------|-------|
| Base URL (producción) | `https://apim-simeva-prod.azure-api.net` |
| Base URL (mock desarrollo) | `https://{id}.mock.pstmn.io/maps/geojson/SIMEVA` |
| Protocolo | HTTPS — TLS 1.2+ obligatorio |
| Formato de respuesta | `application/json` (GeoJSON) |
| Autenticación | Clave de suscripción APIM (`Ocp-Apim-Subscription-Key`) |

---

## 2. Autenticación

Todos los endpoints requieren el encabezado de suscripción de Azure API Management:

```http
Ocp-Apim-Subscription-Key: {clave_de_suscripcion}
```

La clave se configura mediante la variable de entorno `VITE_API_KEY` (no versionada). El frontend la inyecta automáticamente en cada petición desde `api.js`.

> **Seguridad:** La clave de suscripción no debe incluirse en el repositorio. Se gestiona a través de variables de entorno de la Static Web App en Azure Portal.

---

## 3. Endpoints

---

### GET /geojson/localizaciones

Retorna la colección de tramos viales intervenidos con sus atributos descriptivos.

**URL completa:**
```
GET https://apim-simeva-prod.azure-api.net/maps/geojson/SIMEVA/localizaciones
```

**Encabezados requeridos:**

| Encabezado | Valor |
|------------|-------|
| `Ocp-Apim-Subscription-Key` | `{clave_apim}` |
| `Accept` | `application/json` |

**Respuesta exitosa — 200 OK:**

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [-76.2583, 6.1842],
          [-76.2591, 6.1851]
        ]
      },
      "properties": {
        "name": "San Pedro de Urabá - Arboletes",
        "description": "<html>...<table>...</table></html>"
      }
    }
  ]
}
```

**Estructura del campo `description`:**

El campo `description` contiene una tabla HTML con los metadatos del tramo, en el formato exportado por Google My Maps / KML. El frontend lo parsea con `parseDescription()`:

| Campo en HTML | Campo normalizado | Tipo | Ejemplo |
|--------------|------------------|------|---------|
| `Subregión` | `subregion` | String | `Urabá` |
| `Municipio` | `municipio` | String | `Arboletes` |
| `Circuito` | `circuito` | String | `San Pedro de Urabá - Arboletes` |
| `Nombre de la vía` | `nombre` | String | `San Pedro de Urabá - El Tambito` |
| `Código de la vía` | `codigo` | String | `62AN02-2` |
| `Longitud circuito` | `longitudCircuito` | String | `30.00 km` |
| `Longitud tramo` | `longitudTramo` | String | `30.00 km` |
| `Avance` | `avance` | String | `3.0%` |
| `Contratista` | `contratista` | String | `CONSORCIO URABÁ 25` |
| `Fecha de inicio` | `fechaInicio` | String | `04 de feb de 2026` |
| `Plazo` | `plazo` | String | `18 meses` |

> **Nota:** El campo `description` puede contener adicionalmente etiquetas `<img src="...">` con URLs de fotos del proyecto (antes, durante, después). Estas son extraídas por `extractPhotosByPhase()`.

---

### GET /geojson/municipios

Retorna los polígonos de los municipios de Antioquia con sus atributos de subregión.

**URL completa:**
```
GET https://apim-simeva-prod.azure-api.net/maps/geojson/SIMEVA/municipios
```

**Encabezados requeridos:**

| Encabezado | Valor |
|------------|-------|
| `Ocp-Apim-Subscription-Key` | `{clave_apim}` |
| `Accept` | `application/json` |

**Respuesta exitosa — 200 OK:**

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "MultiPolygon",
        "coordinates": [[[[...]]]]
      },
      "properties": {
        "mpio_nombr": "ARBOLETES",
        "subregion":  "URABA",
        "mpio_cdpmp": "05051"
      }
    }
  ]
}
```

**Propiedades del feature:**

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `mpio_nombr` | String | Nombre del municipio (mayúsculas) |
| `subregion` | String | Nombre de la subregión (mayúsculas) |
| `mpio_cdpmp` | String | Código DANE del municipio |

> **Normalización:** El frontend convierte `mpio_nombr` y `subregion` a formato Sentence Case usando `sentenceCase()` antes de almacenarlos o mostrarlos.

---

## 4. Esquemas de datos

### FeatureCollection (GeoJSON RFC 7946)

```
FeatureCollection
  type: "FeatureCollection"
  features: Feature[]

Feature
  type: "Feature"
  geometry: Geometry
  properties: Object

Geometry (vías)
  type: "LineString" | "MultiLineString"
  coordinates: [longitude, latitude][]

Geometry (municipios)
  type: "Polygon" | "MultiPolygon"
  coordinates: [longitude, latitude][][][]
```

### ViasDetalle (objeto interno normalizado)

Generado por `useMapLayers.js` al procesar el GeoJSON de localizaciones:

```
ViasDetalle {
  nombre:      String   // f.properties.name
  codigo:      String   // desc['Código de la vía']
  municipio:   String   // desc['Municipio'] (sentenceCase)
  subregion:   String   // resuelto por resolveSubregion()
  km:          Number   // calcGeomKm() || extractKm(desc) || 0
  avance:      Number   // parseFloat(desc['Avance'])
  contratista: String   // desc['Contratista']
  fechaInicio: String   // desc['Fecha de inicio']
  plazo:       String   // desc['Plazo']
  circuito:    String   // desc['Circuito']
}
```

### SubregionStats (objeto interno)

```
SubregionStats {
  name: String   // nombre de la subregión (SUBREGIONES_FIJAS)
  km:   Number   // km totales acumulados (redondeado 2 decimales)
  pct:  Number   // porcentaje del total departamental
}
```

---

## 5. Manejo de errores

### Códigos HTTP esperados

| Código | Causa | Comportamiento del frontend |
|--------|-------|----------------------------|
| `200 OK` | Éxito | Parsea y renderiza el GeoJSON |
| `401 Unauthorized` | Clave APIM inválida o ausente | `loadError = true` — muestra mensaje de error |
| `404 Not Found` | Endpoint inexistente | `loadError = true` — muestra mensaje de error |
| `429 Too Many Requests` | Throttling de APIM | `loadError = true` — intenta caché |
| `500 Internal Server Error` | Error en Function App | `loadError = true` — intenta caché |
| Sin respuesta (timeout/red) | Fallo de red | Intenta leer caché localStorage |

### Mensaje de error al usuario

Cuando `loadError = true` y no hay caché disponible:

```
"No se pudieron cargar los datos del mapa.
 Por favor intente nuevamente en unos minutos."
```

Cuando `fromCache = true`:

```
"Mostrando datos guardados localmente.
 La información puede no estar actualizada."
```

---

## 6. Caché y disponibilidad

El frontend implementa una estrategia **Cache-First con Stale-While-Revalidate** simplificada:

```
Solicitud de datos
  │
  ├── Fetch a APIM
  │     ├── 200 OK → Guardar en localStorage (clave: simeva_cache_{endpoint})
  │     │             TTL: 86.400.000 ms (24 horas)
  │     │             Retornar data + fromCache = false
  │     │
  │     └── Error → Leer localStorage
  │                   ├── Existe (< 24h) → Retornar data + fromCache = true
  │                   ├── Existe (> 24h) → Retornar data + fromCache = true (fallback)
  │                   └── No existe     → Retornar null + loadError = true
  │
  └── Aplicar datos al mapa
```

**Estructura del registro en localStorage:**

```json
{
  "ts": 1742000000000,
  "data": { "type": "FeatureCollection", "features": [...] }
}
```

---

## 7. Infraestructura del gateway

El gateway de API Management aplica las siguientes políticas:

| Política | Configuración |
|----------|--------------|
| CORS | Origen permitido: dominio de producción de la Static Web App |
| Throttling | Límite configurable (ej. 100 req/min por suscripción) |
| Autenticación | Clave de suscripción obligatoria |
| Backend | Azure Function App con Managed Identity → Blob Storage |
| TLS | Mínimo TLS 1.2 |

**Diagrama de llamada:**

```
Frontend (VITE_API_LOCALIZACIONES)
    │  GET /geojson/localizaciones
    │  Header: Ocp-Apim-Subscription-Key
    ▼
Azure API Management
    │  Valida clave, aplica CORS y throttling
    ▼
Azure Function App (GetGeoJSON)
    │  Managed Identity → lee Blob Storage
    ▼
Azure Blob Storage
    └── Contenedor: geojson/
        ├── localizaciones.geojson
        └── municipios.geojson
```

---

## Pendiente: definición formal OpenAPI 3.0

Una vez los endpoints de producción estén estabilizados, se debe generar el archivo `openapi.yaml` conforme al estándar OpenAPI 3.0 y publicarlo en el portal de desarrollo del API Management de Azure. Este archivo debe incluir:

- Definición completa de schemas con `$ref`
- Ejemplos de respuesta por endpoint
- Descripción de errores (4xx, 5xx)
- Información de contacto y licencia institucional

---

*Gobernación de Antioquia · Secretaría de Infraestructura Física*
*SIMEVA — Contratos de API v1.0 — Marzo 2026*
