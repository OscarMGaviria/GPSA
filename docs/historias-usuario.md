# SIMEVA — Historias de Usuario

**Sistema de Seguimiento y Monitoreo Vial de Antioquia**
Secretaría de Infraestructura Física · Gobernación de Antioquia

> Documento elaborado conforme a la *Guía de Arquitectura y Buenas Prácticas de Desarrollo* — Sección 10: Prácticas de Documentación (Funcional).

---

## Convención

Cada historia sigue el formato:
> **Como** [rol], **quiero** [acción], **para** [beneficio].

Los **criterios de aceptación** usan el estándar **Given / When / Then**.

---

## Épica 1 — Consulta del mapa vial

### HU-01 — Visualizar tramos viales en el mapa

**Como** ciudadano,
**quiero** ver los tramos de vía del programa de pavimentación sobre un mapa interactivo,
**para** conocer qué vías están siendo intervenidas en Antioquia.

**Criterios de aceptación:**

| # | Given | When | Then |
|---|-------|------|------|
| 1 | El usuario abre el aplicativo | El sistema carga exitosamente | Los tramos viales se muestran sobre el mapa con una línea verde |
| 2 | El usuario abre el aplicativo | La carga del GeoJSON falla | Se muestra un mensaje de error claro indicando que los datos no están disponibles |
| 3 | El usuario abre el aplicativo | Los datos se leen del caché (sin conexión) | Se muestra un banner indicando que se visualizan datos guardados localmente |
| 4 | El tramo existe en la capa | El usuario pasa el cursor por encima | El nombre del tramo aparece en un tooltip en el encabezado |

---

### HU-02 — Cambiar el mapa base

**Como** ciudadano,
**quiero** elegir entre diferentes mapas base (estándar, satélite, sin fondo),
**para** ver los tramos con el contexto visual que mejor se adapte a mi necesidad.

**Criterios de aceptación:**

| # | Given | When | Then |
|---|-------|------|------|
| 1 | El mapa está cargado | El usuario abre el selector de basemap | Se muestran las opciones disponibles (Estándar, Satélite, Ninguno) |
| 2 | Se muestra el selector | El usuario selecciona "Satélite" | El mapa base cambia a imágenes satelitales sin recargar la página |
| 3 | Se muestra el selector | El usuario selecciona "Ninguno" | El mapa se muestra sobre fondo verde menta sin tiles externos |

---

### HU-03 — Activar relieve topográfico 3D

**Como** ciudadano,
**quiero** activar una vista en 3D que muestre el relieve de las montañas,
**para** entender mejor el contexto geográfico de las vías intervenidas en la cordillera andina.

**Criterios de aceptación:**

| # | Given | When | Then |
|---|-------|------|------|
| 1 | El mapa está en vista plana | El usuario pulsa el botón de relieve | El mapa cambia a perspectiva inclinada con terreno 3D y sombras (hillshade) |
| 2 | El relieve está activo | El usuario vuelve a pulsar el botón | El mapa regresa a vista plana y se desactiva el terrain |
| 3 | El mapa inicia | Sin acción del usuario | El mapa inicia en vista plana (pitch 0°) sin relieve activo |

---

### HU-04 — Ver detalle de un tramo al hacer clic

**Como** ciudadano,
**quiero** hacer clic sobre un tramo vial en el mapa para ver su información detallada,
**para** conocer el contratista, avance de obra, longitud, fechas y demás datos del tramo.

**Criterios de aceptación:**

| # | Given | When | Then |
|---|-------|------|------|
| 1 | Los tramos están visibles en el mapa | El usuario hace clic sobre un tramo | Se abre un modal con el nombre del tramo, código, municipio, subregión y avance |
| 2 | El modal está abierto | El usuario presiona la tecla `Esc` | El modal se cierra |
| 3 | El modal está abierto | El usuario hace clic fuera del modal | El modal se cierra |
| 4 | El modal está abierto | El tramo tiene fotos del proyecto | Se muestra una galería organizada en pestañas Antes / Durante / Después |
| 5 | El modal está abierto | El tramo no tiene fotos | La sección fotográfica no se muestra |

---

## Épica 2 — Filtros y búsqueda

### HU-05 — Filtrar tramos por subregión

**Como** ciudadano,
**quiero** seleccionar una subregión de Antioquia en el filtro,
**para** ver únicamente los tramos viales que pertenecen a esa subregión.

**Criterios de aceptación:**

| # | Given | When | Then |
|---|-------|------|------|
| 1 | El mapa muestra todos los tramos | El usuario selecciona "Urabá" en el filtro de subregión | El mapa aplica zoom a Urabá y resalta solo sus tramos |
| 2 | El filtro de subregión está activo | El usuario selecciona "Todas las subregiones" | Todos los tramos vuelven a ser visibles |
| 3 | El filtro de subregión está activo | Los tramos de la subregión están en el viewport | Las etiquetas con nombre y longitud de cada tramo son visibles |
| 4 | El filtro de subregión está activo | El usuario desplaza el mapa fuera de la zona | Las etiquetas de tramos fuera del viewport desaparecen |
| 5 | El filtro de subregión está activo | El usuario regresa al área de los tramos | Las etiquetas reaparecen automáticamente |

---

### HU-06 — Filtrar tramos por municipio

**Como** ciudadano,
**quiero** seleccionar un municipio específico en el filtro,
**para** ver solo los tramos de ese municipio y conocer a qué subregión pertenece.

**Criterios de aceptación:**

| # | Given | When | Then |
|---|-------|------|------|
| 1 | El mapa está sin filtros | El usuario selecciona un municipio | El mapa aplica zoom al municipio y muestra solo sus tramos |
| 2 | El usuario selecciona un municipio | Sin haber seleccionado subregión antes | El sistema infiere y muestra automáticamente la subregión correspondiente en la etiqueta vertical |
| 3 | Se elige una subregión | El usuario abre el selector de municipios | Solo se muestran los municipios pertenecientes a esa subregión |

---

### HU-07 — Filtrar por circuito vial

**Como** funcionario de la Secretaría,
**quiero** buscar un circuito vial específico por nombre,
**para** ver en el mapa únicamente ese tramo y sus datos de avance.

**Criterios de aceptación:**

| # | Given | When | Then |
|---|-------|------|------|
| 1 | El listado de circuitos está disponible | El usuario selecciona un circuito | El mapa hace zoom al tramo y lo resalta |
| 2 | El circuito está seleccionado | El tramo está en el viewport | La etiqueta con nombre y km del tramo es visible |

---

### HU-08 — Limpiar todos los filtros

**Como** ciudadano,
**quiero** limpiar todos los filtros aplicados con un solo clic,
**para** regresar rápidamente a la vista completa del departamento.

**Criterios de aceptación:**

| # | Given | When | Then |
|---|-------|------|------|
| 1 | Hay filtros activos (subregión, municipio o circuito) | El usuario hace clic en "Borrar filtros" | Todos los selectores vuelven a su valor por defecto |
| 2 | Se limpian los filtros | — | El mapa regresa a la vista completa de Antioquia |
| 3 | Se limpian los filtros | — | Las etiquetas flotantes de tramos desaparecen |

---

### HU-09 — Filtrar desde el gráfico de barras

**Como** ciudadano,
**quiero** hacer clic en una barra del gráfico de longitud por subregión,
**para** aplicar el filtro de esa subregión directamente desde el panel de estadísticas.

**Criterios de aceptación:**

| # | Given | When | Then |
|---|-------|------|------|
| 1 | El panel de estadísticas está abierto | El usuario hace clic en una barra | La barra se resalta y el mapa filtra por esa subregión |
| 2 | La barra de una subregión está activa | El usuario vuelve a hacer clic en ella | El filtro se quita y el mapa regresa a la vista completa |
| 3 | Hay una subregión activa | El usuario hace clic en otra barra | El filtro cambia a la nueva subregión |

---

## Épica 3 — Panel de estadísticas

### HU-10 — Ver indicadores generales del programa

**Como** ciudadano,
**quiero** ver los indicadores principales del programa de pavimentación,
**para** conocer cuántos tramos, kilómetros, municipios y circuitos están siendo intervenidos.

**Criterios de aceptación:**

| # | Given | When | Then |
|---|-------|------|------|
| 1 | El panel está abierto | Los datos se han cargado | Se muestran 4 tarjetas: Vías intervenidas, Longitud total, Municipios y Circuitos |
| 2 | Los datos se cargan | — | Los valores se animan con un conteo progresivo (count-up) |
| 3 | El panel está abierto | El usuario aplica un filtro | Los indicadores se actualizan para reflejar el subconjunto filtrado |

---

### HU-11 — Ver detalle de vías al hacer clic en la card

**Como** ciudadano,
**quiero** hacer clic en la tarjeta "Vías intervenidas",
**para** ver la tabla completa de todas las vías con su municipio, subregión, km y estado de avance.

**Criterios de aceptación:**

| # | Given | When | Then |
|---|-------|------|------|
| 1 | El panel está abierto | El usuario hace clic en "Vías intervenidas" | Se abre un modal con tabla de todas las vías |
| 2 | El modal de vías está abierto | El usuario escribe en el campo de búsqueda | La tabla filtra en tiempo real |
| 3 | El modal de vías está abierto | El usuario hace clic en el encabezado de una columna | La tabla se ordena por esa columna (asc/desc) |

---

### HU-12 — Ver distribución de kilómetros por subregión

**Como** funcionario,
**quiero** hacer clic en la tarjeta "Longitud total",
**para** ver la distribución de kilómetros entre las nueve subregiones de Antioquia.

**Criterios de aceptación:**

| # | Given | When | Then |
|---|-------|------|------|
| 1 | El panel está abierto | El usuario hace clic en "Longitud total" | Se abre un modal con barras horizontales por subregión |
| 2 | El modal está abierto | — | Cada subregión muestra km absolutos y % del total |
| 3 | El modal está abierto | Solo algunas subregiones tienen km > 0 | Solo se muestran las subregiones con datos |

---

### HU-13 — Ver detalle por municipio

**Como** ciudadano,
**quiero** hacer clic en la tarjeta "Municipios",
**para** ver cuántas vías y kilómetros tiene cada municipio intervenido, junto con su avance promedio.

---

### HU-14 — Ver detalle de circuitos

**Como** ciudadano,
**quiero** hacer clic en la tarjeta "Circuitos",
**para** ver la lista de circuitos viales con sus tramos, longitud, avance y contratista asignado.

---

## Épica 4 — Accesibilidad y disponibilidad

### HU-15 — Acceso sin autenticación

**Como** ciudadano del departamento de Antioquia,
**quiero** acceder al sistema sin necesidad de crear una cuenta o iniciar sesión,
**para** consultar libremente la información pública de la red vial departamental.

**Criterios de aceptación:**

| # | Given | When | Then |
|---|-------|------|------|
| 1 | El usuario navega a la URL del aplicativo | Sin credenciales | El mapa y el panel cargan completamente |
| 2 | — | En cualquier navegador moderno (Chrome, Firefox, Edge, Safari) | El aplicativo funciona correctamente |

---

### HU-16 — Disponibilidad ante fallo de API

**Como** ciudadano,
**quiero** que el aplicativo muestre datos aunque la API no esté disponible,
**para** no perder acceso a la información si hay un fallo temporal en los servidores.

**Criterios de aceptación:**

| # | Given | When | Then |
|---|-------|------|------|
| 1 | El usuario ya visitó el aplicativo anteriormente | La API no responde al recargar | El mapa carga con los datos del caché y muestra un banner informativo |
| 2 | No hay datos en caché y la API falla | El usuario abre el aplicativo | Se muestra un mensaje de error claro con instrucciones de reintento |

---

*Gobernación de Antioquia · Secretaría de Infraestructura Física*
*SIMEVA — Historias de Usuario v1.0 — Marzo 2026*
