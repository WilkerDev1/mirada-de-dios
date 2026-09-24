# Sistema de Gestión Territorial

## Documento de Arquitectura de Software

**Versión:** 2.0
**Estado:** Arquitectura revisada — incorpora correcciones de v1.0
**Tipo:** Sistema web/PWA geoespacial offline-first
**Objetivo:** Gestión digital de territorios, edificios, apartamentos, asignaciones y actividad de predicación.

> **Nota de esta revisión:** la v1.0 tenía principios sólidos (territory-first, historial inmutable, offline-first, privacidad por diseño). Esta versión los conserva intactos y corrige seis vacíos que habrían bloqueado el desarrollo real: (1) estrategia concreta de mapas offline, (2) alcance multi-congregación, (3) resolución de conflictos por entidad, (4) mecanismo de seguridad concreto, (5) requisitos no funcionales, (6) borrado/archivado sin romper el historial. Los cambios nuevos están marcados con **[NUEVO]** o **[REVISADO]**.

---

# 0. Alcance del sistema **[NUEVO]**

Antes de cualquier decisión técnica, el documento original asumía implícitamente una instancia por congregación, pero el diagrama de dominio (§20) coloca `Congregación` como raíz. Esto debe decidirse explícitamente porque cambia el modelo de datos, la autorización y la base de datos.

**Decisión:** el sistema es **multi-congregación desde el inicio** (una sola instalación/API/base de datos puede servir a varias congregaciones), por dos razones prácticas:

1. Los territorios en la práctica **se transfieren entre congregaciones** (superposición de zonas, reorganizaciones circuitales). Un modelo mono-congregación obligaría a exportar/reimportar historial, lo cual viola el principio de historial inmutable.
2. Es más barato operar una instalación compartida (un servidor Proxmox) que N instalaciones aisladas para congregaciones pequeñas.

Consecuencias concretas:

* Toda entidad territorial (`Territory`, y por herencia `Zone`, `Building`, `Apartment`) lleva `congregation_id`.
* Un territorio puede tener un **historial de propiedad** (`congregation_id` con vigencia temporal), no un campo fijo — así una transferencia no borra ni reescribe visitas anteriores; simplemente cierra el período de la congregación anterior y abre uno nuevo.
* La autorización se evalúa siempre en el contexto de `congregation_id`: un usuario de la Congregación A nunca ve datos de la Congregación B, salvo el caso explícito de transferencia (ver §25-bis).

---

# 1. Propósito del sistema

(sin cambios respecto a v1.0 — ver lista original de objetivos)

El sistema tiene como objetivo digitalizar la gestión de territorios residenciales y permitir conocer con precisión qué zonas existen, qué edificios/viviendas pertenecen a cada territorio, qué apartamentos existen, cuándo y con qué resultado fue visitado cada uno, qué queda pendiente, qué zonas están cubiertas físicamente, qué edificios tienen restricciones, y qué información es congregacional vs. privada.

> **El mapa representa el territorio físico. Los objetos geográficos representan lugares reales. Los eventos representan lo que ha ocurrido en esos lugares.**

---

# 2. Principios arquitectónicos

## 2.1 Territory-first

```text
Congregación → Territorio → Zona → Edificio/Propiedad → Apartamento/Unidad → Visitas/Eventos
```

Los usuarios interactúan con estos objetos, pero los objetos territoriales son el núcleo del sistema, no las personas.

---

# 3. Principios fundamentales

## P1 — Offline-first

(igual que v1.0: la app debe funcionar sin conexión — abrir territorios descargados, usar GPS, registrar visitas y asignaciones, encolar cambios, sincronizar al volver la conexión). Ver §11-bis para cómo esto se cumple específicamente para el mapa, que es el punto que v1.0 dejaba sin resolver.

## P2 — El historial es inmutable

Una visita nunca se sobrescribe; se almacena como evento con `timestamp, user, result, location, metadata` y el estado actual se calcula a partir del historial. **[REVISADO]** Esto se extiende ahora a la relación territorio↔congregación (§0) y a la propiedad de edificios: cualquier cambio de "dueño" o de estado estructural se modela como evento con vigencia, no como sobrescritura de campo.

## P3 — Separar cobertura de contacto

Cobertura física ≠ intento de contacto ≠ contacto realizado. Estas tres métricas se calculan independientemente (ver §27).

## P4 — UX extremadamente sencilla

Minimizar decisiones: llegar al edificio → detectar ubicación → seleccionar edificio → seleccionar apartamento → registrar resultado → siguiente.

## P5 — Datos estructurados antes que texto libre

Propiedades estructuradas (acceso, problemas, horario recomendado) en vez de notas libres como fuente primaria; las notas libres son complemento, no sustituto.

## P6 — Privacidad por diseño

Solo se almacena la información operativa mínima (ej. "no contestó", "restricción de acceso"), nunca datos personales innecesarios de los residentes. **[REVISADO — ver §36-bis]** esto ahora incluye una política explícita de retención y purga, y cifrado de notas.

---

# 4. Requisitos no funcionales **[NUEVO]**

El documento original no fijaba ningún número, lo cual hace imposible validar decisiones técnicas después. Valores iniciales (ajustables tras el MVP, pero deben existir desde el día uno):

| Requisito | Objetivo inicial |
|---|---|
| Tamaño de descarga offline por territorio (tiles + datos) | < 15 MB por territorio típico (≈ 1 km²) |
| Tiempo de apertura de un territorio ya descargado | < 2 s en un teléfono gama media |
| Latencia de sincronización de una visita (con buena señal) | < 1 s |
| Operaciones pendientes que un dispositivo puede acumular offline | ≥ 500 sin degradar el rendimiento |
| Usuarios concurrentes por congregación (pico, ej. campaña) | 30–50 |
| Retención de notas privadas tras cerrar una asignación | configurable, purga automática por defecto a 12 meses |
| Disponibilidad de la API (una vez en producción) | 99% mensual (no crítico tipo salud/finanzas) |

Estos números alimentan directamente decisiones de §11-bis (tiles), §16 (IndexedDB) y §55 (observabilidad).

---

# 5. Sistema cartográfico

## MapLibre GL JS como motor principal

Razones (sin cambios): WebGL, buena integración GeoJSON, capas vectoriales, no obliga a un globo 3D. Se descarta Cesium/God's Eye View como base porque ese proyecto está orientado a terreno/satélites/aeronaves y no a calles/edificios/apartamentos (razonamiento igual a v1.0 §12).

## 5-bis. Estrategia de mapas offline **[NUEVO — corrige el vacío más grave de v1.0]**

Esto es lo que v1.0 dejaba sin resolver y es indispensable para que "offline-first" sea real:

**Fuente de datos base:** OpenStreetMap (licencia ODbL — atribución obligatoria, documentada en `docs/licenses/`). No usar Google Maps como base para uso offline: sus términos de servicio prohíben el cacheo/almacenamiento de tiles fuera de sus propios SDKs.

**Formato de empaquetado offline:** **PMTiles** (formato de un solo archivo, servible por HTTP range-requests, sin necesidad de un tile server dedicado en el cliente). Ventaja sobre MBTiles clásico: se puede servir estáticamente desde el mismo bucket/CDN que sirve la PWA, y el cliente descarga solo los bytes de los tiles que necesita.

**Recorte por territorio, no por país:** el backend genera (o mantiene pre-generado) un extracto de tiles acotado al bounding box de cada `Territory` + margen de contexto (~200 m). El endpoint `GET /territories/:id/tiles` entrega ese extracto. Esto respeta el objetivo de §4 (< 15 MB por territorio).

**Pipeline de generación:**

```text
Extracto OSM (región DR)
        ↓
   tippecanoe / planetiler (genera vector tiles)
        ↓
   Recorte por bounding box de cada Territory
        ↓
   PMTiles por territorio, cacheados en el servidor
        ↓
   Cliente descarga bajo demanda al "descargar territorio para offline"
```

**Actualización:** los tiles base no cambian con la frecuencia de los datos operativos (edificios/visitas); se regeneran en un job periódico (ej. mensual) o manualmente, no en cada sync.

**Estilo del mapa:** un estilo MapLibre propio y minimalista (calles + nombres), no un estilo de terceros que dependa de una API key online — así el estilo también funciona offline una vez cacheado.

---

# 6. Backend

## Node.js + TypeScript + Fastify

(sin cambios respecto a v1.0: API REST, autenticación, autorización, sincronización, validación, consultas geoespaciales — ver contratos de API en §41-bis).

---

# 7. Base de datos

## PostgreSQL + PostGIS

Sin cambios: territorio, geometría, historial de visitas, asignaciones. Consultas típicas (edificios dentro de un territorio, apartamentos de un edificio, edificios cercanos a una posición, cobertura territorial) igual que v1.0 §14.

## ORM

Drizzle ORM, sin depender excesivamente de él — capas separadas `Domain → Repository → Database` para poder bajar a SQL/PostGIS crudo en consultas espaciales complejas.

---

# 8. Persistencia offline

IndexedDB vía Dexie. Almacena localmente: territorios descargados (datos + referencia a su PMTiles cacheado por el Service Worker), edificios, apartamentos, asignaciones, visitas, configuración, cola de cambios pendientes.

**[NUEVO]** Los tiles PMTiles se cachean vía Service Worker (Cache API), *no* dentro de IndexedDB — son blobs binarios grandes y IndexedDB no es el medio adecuado para ellos. IndexedDB guarda solo la referencia/versión del tileset descargado.

---

# 9. PWA

Progressive Web App: instalación en Android/escritorio, funcionamiento offline, caché, actualización controlada. **[NUEVO]** Se usa **Workbox** para el Service Worker en vez de escribirlo a mano, con dos estrategias de caché distintas: `CacheFirst` para tiles/assets estáticos, `NetworkFirst` con fallback a IndexedDB para datos operativos.

---

# 10. GPS

Geolocation API. Usos: localizar al usuario, detectar edificio cercano, registrar posición aproximada de una visita, asistir en creación de edificios y trazado de geometría. La posición GPS no se persiste automáticamente si no es necesaria (coherente con P6).

---

# 11. Modelo geográfico

GeoJSON como formato de intercambio: `Territorio/Zona/Edificio` → Polygon/MultiPolygon, `Apartamento` → Polygon/Point/referencia interna, `Ruta` → LineString, `Punto de interés` → Point. Un apartamento puede existir inicialmente solo como `building_id + unit_number` y adquirir coordenadas después.

---

# 12. Jerarquía del dominio **[REVISADO]**

```text
Congregación
│
├── Territorio (con historial de propiedad, ver §0)
│   ├── Zona
│   │   ├── Edificio
│   │   │   ├── Apartamento
│   │   │   │   └── Visitas
│   │   │   └── Restricciones
│   │   └── ...
│   └── ...
└── Usuarios
```

---

# 13. Entidades principales **[REVISADO — se agrega Congregation y ownership de Territory]**

## Congregation **[NUEVO]**

```text
id
name
region
created_at
```

## Territory

```text
id
congregation_id        -- congregación propietaria ACTUAL (derivable, ver ownership_period)
name
code
geometry
status
created_at
updated_at
```

## TerritoryOwnershipPeriod **[NUEVO — soporta transferencias sin romper historial]**

```text
id
territory_id
congregation_id
valid_from
valid_to        -- NULL = vigente
```

## Zone / Building / Apartment

Sin cambios estructurales respecto a v1.0 (`Zone`: id, territory_id, name, code, geometry, status; `Building`: id, zone_id, name, address, geometry, building_type, floors, access_type; `Apartment`: id, building_id, unit_number, floor, status).

**[NUEVO]** Se agrega a `Building` y `Apartment` un campo `archived_at` (nullable) — ver §14-bis sobre borrado.

---

# 14. Visit

```text
id
apartment_id
user_id
visited_at
result
note
latitude
longitude
device_id
operation_id      -- [NUEVO] UUID generado por el dispositivo, para idempotencia (ver §31)
created_at
```

Resultados como enum controlado: `CONTACTED, NO_ANSWER, ACCESS_PROBLEM, REFUSED, NOT_HOME, OTHER`.

## 14-bis. Borrado y archivado **[NUEVO — v1.0 no lo contemplaba]**

El historial es inmutable, pero los edificios y apartamentos sí cambian en el mundo real (se demuelen, se dividen, un territorio se reorganiza). Regla: **nunca se hace `DELETE` de una entidad territorial que tiene visitas asociadas.** En su lugar:

* `archived_at` se marca cuando un edificio/apartamento deja de existir o de pertenecer al territorio activo.
* Las consultas de "pendientes" y de cobertura excluyen automáticamente lo archivado.
* El historial de visitas permanece consultable (útil para auditoría y para congregaciones que retoman un territorio transferido).
* Solo un `ADMIN` puede archivar/desarchivar, y la acción queda registrada como evento (mismo patrón que las visitas).

---

# 15. Restricciones

Entidades estructuradas: `NO_VISITS, ACCESS_RESTRICTED, INTERCOM_REQUIRED, INTERCOM_BROKEN, SPECIFIC_HOURS, SPECIAL_INSTRUCTIONS`, aplicables a Territorio/Zona/Edificio/Apartamento. Sin cambios respecto a v1.0.

---

# 16. Notas

Nota compartida (visible para usuarios autorizados de la congregación) vs. nota privada (visible solo para el usuario). **[NUEVO — ver §36-bis]** las notas privadas se cifran en reposo con una clave derivada del usuario; el servidor no puede leerlas en texto plano.

---

# 17. Asignaciones

Usuario + Territorio/Zona/Edificio + Periodo. Sin cambios.

## 17-bis. Transferencia de territorio entre congregaciones **[NUEVO]**

Flujo cuando un territorio pasa de la Congregación A a la Congregación B:

```text
ADMIN de A o de circuito inicia transferencia
        ↓
Se cierra el TerritoryOwnershipPeriod de A (valid_to = hoy)
        ↓
Se abre uno nuevo para B (valid_from = hoy)
        ↓
El historial completo de visitas permanece intacto
        ↓
B ve el territorio desde hoy; puede opcionalmente consultar
el historial previo si tiene el permiso VIEW_PRIOR_HISTORY
```

Esto evita el escenario que rompía P2 en v1.0: sin este mecanismo, una transferencia habría forzado a exportar/borrar/reimportar, perdiendo el historial o filtrando datos de una congregación a otra sin control.

---

# 18. Estado calculado

`last_visit, last_result, pending, contacted_recently, requires_attention` se derivan del historial, nunca se almacenan como fuente de verdad (evita inconsistencias).

---

# 19. Cobertura

Igual que v1.0: área total, área recorrida, edificios/apartamentos registrados, intentados, contactados, sin respuesta, problemas de acceso, pendientes — calculado sobre entidades **no archivadas** (§14-bis).

---

# 20. Capas del mapa

Territorial, edificios, predicación (visitado/pendiente/sin respuesta/contactado), problemas (acceso/intercomunicador/no visitas), infraestructura (futura). Sin cambios.

---

# 21. Modo "Predicación"

Igual que v1.0: iniciar sesión → prioriza pendientes → tocar apartamento → seleccionar resultado con el mínimo de pasos.

---

# 22. Detección geográfica

GPS → buscar objetos cercanos → mostrar información, con selección manual siempre disponible como respaldo (GPS impreciso, edificios próximos, mala señal).

---

# 23. Arquitectura Offline / Sync

```text
Usuario → IndexedDB → Change Queue → ¿Internet?
                                        /      \
                                      NO        SÍ → API → PostgreSQL
                                       │
                                       └──→ sincronizar cuando vuelva
```

## 23-bis. Cola de sincronización

```text
sync_operation
  id, device_id, operation_type, entity_type, entity_id,
  payload, created_at, status, retry_count
```

## 23-ter. Idempotencia

Cada operación lleva `operation_id` (UUID generado por el dispositivo). El servidor la reconoce si ya fue procesada y evita duplicarla — esto es lo que hace posible que una `Visit` tenga `operation_id` (§14).

## 23-quater. Conflictos — política explícita por entidad **[REVISADO — v1.0 solo mencionaba el concepto sin resolverlo]**

| Entidad / campo | Naturaleza | Política |
|---|---|---|
| `Visit` (cualquier campo) | Append-only, nunca hay dos visitas "en conflicto" entre sí | No aplica — cada visita es un evento nuevo e independiente |
| `Building.access_type`, `Building.address` | Configuración mutable, editable por varios usuarios | Last-write-wins por `updated_at`, pero se **conserva la versión anterior** en `building_history` para poder revertir |
| `Restriction` (crear/desactivar) | Configuración con impacto operativo | Manual resolution: si dos dispositivos crean restricciones contradictorias offline, ambas llegan al servidor y un `TERRITORY_MANAGER` resuelve cuál queda vigente vía una bandeja de "conflictos pendientes" en la UI |
| `Apartment.status` | Derivado del historial (§18) | No se sincroniza como campo mutable independiente — nunca hay conflicto porque no es fuente de verdad |
| `Note` compartida | Texto libre editable | Last-write-wins simple (bajo riesgo, bajo impacto operativo) |

La "bandeja de conflictos" es una vista simple en la UI (no un flujo nuevo complejo): lista de conflictos con dos opciones lado a lado y un botón "usar esta versión".

---

# 24. Identidad de dispositivo

Cada dispositivo tiene un identificador local, útil para saber qué dispositivo originó una operación y para debugging de sincronización — sin depender solo del `user_id`.

---

# 25. Seguridad **[REVISADO — v1.0 solo nombraba los conceptos sin mecanismo]**

## Autenticación

* **JWT de acceso** de corta duración (15 min) + **refresh token** de larga duración almacenado de forma segura en el dispositivo, rotado en cada uso.
* Contraseñas con **Argon2id** (no bcrypt/MD5).
* Todas las comunicaciones sobre **TLS 1.2+** obligatorio (reverse proxy termina TLS, ver §46).

## Autorización

Roles iniciales: `MEMBER, TERRITORY_MANAGER, ADMIN`, evaluados **siempre en el contexto de `congregation_id`** (§0). Basada en capacidades, nunca solo en la interfaz — la API valida en cada endpoint, nunca confía en que un botón esté oculto en el frontend.

Capacidades ejemplo: `visit:create`, `building:edit`, `territory:create`, `restriction:resolve_conflict`, `territory:transfer`, `user:manage`.

## 25-bis. Protección de datos

Validar payloads, limitar tamaño de solicitudes, validar geometrías/IDs, aplicar autorización, registrar errores sin exponer datos innecesarios. Rate limiting por IP y por usuario en endpoints de autenticación y de sync (evita abuso del endpoint `/sync` con reintentos agresivos).

## 25-ter. Privacidad y retención de datos **[NUEVO — cumple P6 con mecanismo concreto]**

* Notas privadas cifradas en reposo (clave derivada del usuario, el servidor no las lee en claro).
* Purga automática configurable de notas privadas y ubicaciones GPS de visitas tras N meses (default 12, configurable por congregación) — job periódico, no manual.
* Ningún dato personal de residentes (nombres, edades, religión) se modela como campo de primera clase; solo texto libre opcional en notas, que el equipo debe evitar llenar de esa información (política, no solo técnica).
* Exportación de datos de un usuario a su solicitud (derecho de acceso) como capacidad `ADMIN`.

---

# 26. Arquitectura del frontend

```text
apps/web/src/
├── app/
├── features/ (territories, zones, buildings, apartments, visits, assignments, restrictions, notes)
├── map/ (MapView, layers, drawing, selection, geolocation, tiles [NUEVO])
├── offline/ (database, queue, sync)
├── auth/
├── components/
└── shared/
```

---

# 27. Arquitectura backend

```text
apps/api/
├── modules/ (territories, zones, buildings, apartments, visits, assignments, restrictions, notes, sync, congregations [NUEVO])
├── auth/
├── database/
├── geo/
├── tiles/          -- [NUEVO] generación/servicio de PMTiles por territorio
├── middleware/
└── shared/
```

Cada módulo con `controller/route, service, repository, schema, types` cuando corresponda.

---

# 28. Contratos de API **[REVISADO — versionado explícito]**

Todos los endpoints bajo `/v1/` para permitir romper compatibilidad en el futuro sin afectar clientes viejos que aún no actualizaron (relevante porque un cliente offline puede tardar semanas en volver a conectarse y actualizar).

```http
GET  /v1/congregations/:id/territories
GET  /v1/territories/:id
GET  /v1/territories/:id/buildings
GET  /v1/territories/:id/tiles          -- [NUEVO] PMTiles del territorio
POST /v1/territories/:id/transfer       -- [NUEVO] transferencia entre congregaciones

GET  /v1/buildings/:id
GET  /v1/buildings/:id/apartments

GET  /v1/apartments/:id/visits
POST /v1/visits

GET  /v1/assignments
POST /v1/assignments

GET  /v1/sync/conflicts                 -- [NUEVO] bandeja de conflictos pendientes
POST /v1/sync
```

El frontend nunca consulta PostgreSQL directamente.

---

# 29. Validación

UUID, coordenadas, GeoJSON, enums, fechas, IDs, permisos, tamaños de payload — validados en la API, nunca solo en el cliente.

---

# 30. Creación de edificios

Herramienta de dibujo: activar GPS → caminar/seleccionar puntos → crear polígono → confirmar → nombre/dirección → guardar. También editable manualmente desde el mapa.

---

# 31. God's Eye View como referencia

Se estudia como fuente de patrones reutilizables (GeoJSON, capas, renderizado, LOD), **no como base directa**: extraer conceptos/código puntual, no hacer fork y recortar. Revisar licencia del repositorio antes de reutilizar código; cada fuente de datos geográficos conserva su propia licencia/atribución, documentado en `docs/licenses/`.

---

# 32. Monorepo

```text
territory-system/
├── apps/ (web, api)
├── packages/ (domain, shared, geo, sync)
├── docs/
├── infrastructure/
└── package.json
```

---

# 33. Documentación de decisiones (ADR)

```text
docs/ADR/
001-react-typescript.md
002-maplibre.md
003-postgresql-postgis.md
004-offline-first.md
005-event-history.md
006-monorepo.md
007-api-rest.md
008-godseye-reuse-strategy.md
009-multi-congregation-scope.md       -- [NUEVO]
010-offline-tiles-pmtiles.md          -- [NUEVO]
011-sync-conflict-policy.md           -- [NUEVO]
```

Formato: Contexto / Problema / Opciones consideradas / Decisión / Consecuencias.

---

# 34. Infraestructura

```text
Proxmox
   ├── VM/Container API
   ├── PostgreSQL
   └── Reverse Proxy (termina TLS)
```

**[NUEVO]** Backup automatizado diario de PostgreSQL (pg_dump o WAL archiving) con retención mínima de 30 días, verificado con una restauración de prueba trimestral — sin esto, el "historial inmutable" (P2) no vale nada si un fallo de disco lo borra sin posibilidad de recuperación.

---

# 35. Entornos

`development / staging / production`. Nunca usar producción como entorno de experimentación.

---

# 36. Git y CI **[REVISADO]**

`main / develop / feature/* / fix/*`, commits descriptivos (`feat:`, `fix:`, `refactor:`).

**[NUEVO]** Pipeline de CI en cada PR: lint, type-check (frontend + backend comparten tipos vía `packages/shared`, así que un cambio incompatible falla en CI antes de llegar a producción), tests unitarios, y un smoke test de sincronización (caso 4 de §38).

---

# 37. Testing

Unit tests (reglas de negocio, cálculo de cobertura, estados, sincronización, validaciones), integration tests (API, PostgreSQL/PostGIS, sync), E2E con Playwright (login → territorio → edificio → apartamento → visita → cerrar/reabrir app → comprobar persistencia).

---

# 38. Testing Offline

Casos igual que v1.0: (1) visita sin Internet queda `pending`; (2) vuelve Internet → `synced`; (3) falla durante sync → `retry`; (4) misma operación llega dos veces → una sola visita (gracias a `operation_id`, §23-ter).

**[NUEVO]** Caso 5: dos dispositivos editan `Building.access_type` offline con valores distintos → al sincronizar ambos, se resuelve por la política de §23-quater y se verifica que la versión anterior queda en `building_history`.

---

# 39. Observabilidad **[REVISADO — herramientas concretas]**

* Errores frontend y API: **Sentry** (o equivalente self-hosted si la privacidad de la congregación lo requiere).
* Métricas de sincronización (duración, tasa de fallos, reintentos): **Prometheus + Grafana**.
* Logs estructurados (JSON) por servicio, sin datos privados de residentes.
* Health checks (`/health`) para el reverse proxy y monitoreo básico de uptime.

---

# 40. Versionado de datos

`schema_version` en almacenamiento local; si una versión futura cambia `visit.result`, el cliente ejecuta una migración local. La actualización de la PWA espera a que el usuario termine su sesión antes de forzar una migración (igual que v1.0 §57).

---

# 41. MVP **[REVISADO — se ajusta para incluir lo mínimo de las correcciones]**

El MVP demuestra el ciclo fundamental, ahora incluyendo desde el inicio los dos elementos que v1.0 dejaba para "después" pero que son estructurales:

```text
Mapa (con tiles offline reales, no solo "el mapa se ve" con conexión)
 ↓
GPS
 ↓
Crear/seleccionar edificio (dentro de una congregación específica)
 ↓
Crear apartamentos
 ↓
Registrar visita (con operation_id para idempotencia)
 ↓
Guardar offline / sincronizar
 ↓
Consultar historial
```

## Incluido en MVP

Territorios (crear/ver/seleccionar, con `congregation_id`), edificios (crear/dibujar/editar/ver), apartamentos (crear/listar), visitas (registrar/consultar historial con enums), GPS (posición + detección de cercanía), offline (almacenamiento local + cola + sync automático **con tiles offline reales**), usuarios (autenticación básica con JWT).

## Deliberadamente excluido del MVP

IA, analítica avanzada, dashboards complejos, mapas 3D, sistema completo de permisos granular, integraciones externas, notificaciones complejas, transferencias de territorio entre congregaciones (se diseña el modelo de datos desde el MVP, pero el flujo de UI puede esperar a la fase 2), bandeja de resolución de conflictos con UI rica (fase 2 — en el MVP, last-write-wins simple es aceptable si el volumen de usuarios es bajo).

---

# 42. Primera prueba vertical

Igual que v1.0: abrir app → ver mapa (con tiles offline del territorio ya descargados) → ver ubicación → crear edificio → crear 4 apartamentos → registrar visita en modo avión → cerrar/reabrir app → comprobar persistencia → activar Internet → sincronizar → servidor recibe ambas visitas con `operation_id` únicos.

---

# 43. Fases siguientes

**Fase 2:** Asignaciones, restricciones, notas, capas, cobertura, búsqueda, modo predicación, bandeja de conflictos con UI.
**Fase 3:** Dashboards, estadísticas, historial avanzado, rutas, transferencias de territorio entre congregaciones (flujo completo de UI), detección geográfica avanzada, mejoras offline, administración.
**Futuro:** mapas más avanzados, análisis de cobertura, rutas optimizadas, importación de territorios existentes, detección automática de edificios, capacidades de IA (explícitamente fuera del núcleo, igual que v1.0 §64).

---

# 44. Criterio para saber si una funcionalidad pertenece al núcleo

Sin cambios respecto a v1.0: ¿representa algo del territorio? ¿ayuda a registrar lo que ocurre? ¿ayuda a ver lo pendiente? ¿preserva historial? ¿funciona offline? ¿es simple para un usuario no técnico? Si mayoritariamente no, no pertenece al MVP.

---

# 45. Estado de este documento

Arquitectura base v2.0. Las decisiones futuras que contradigan estos principios deben justificar explícitamente el problema que resuelven, la alternativa descartada, y el impacto sobre offline/UX/base de datos/mantenibilidad, registrado como ADR.

**Principio rector final (sin cambios):**

> **Simple para el usuario. Estructurado para el sistema. Geográfico en su representación. Histórico en sus datos. Offline por diseño.**

**Adición a este principio en v2.0:**

> **Multi-congregación sin fugas de datos. Con conflictos resueltos por política, no por accidente.**



# Interfaz de la Aplicación — Vista de Mapa (Escritorio, v1)

**Alcance:** primera versión, solo escritorio. Sin diseño móvil todavía (queda para una fase posterior, probablemente como app complementaria de campo).

---

## 1. Principio de diseño

El mapa **es** la interfaz, no un widget dentro de ella. Todo lo demás (paneles, controles, listas) es superficie flotante o adosada a los bordes que puede colapsarse, y el mapa ocupa el 100% del espacio disponible por defecto — igual que Google Maps: nunca hay un layout de "dashboard con el mapa metido en una tarjeta".

Tres reglas guían cada decisión de esta interfaz:

1. **El mapa nunca se tapa por completo.** Paneles flotantes semi-transparentes al fondo, nunca modales opacos de pantalla completa para tareas de consulta.
2. **Una acción, un lugar.** Ver capas se hace en el control de capas; ver detalle de un edificio se hace en el panel derecho; nunca se duplica la misma función en dos sitios.
3. **Las capas cuentan la historia operativa, no solo la geográfica.** A diferencia de Google Maps (tránsito, negocios, satélite), aquí las capas temáticas responden a la pregunta "¿qué falta por hacer aquí?" — eso es lo que hace que este mapa sea una herramienta de trabajo y no un visor.

---

## 2. Layout general

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ≡  Territorio A1 · Zona 3 ▾            🔍 Buscar dirección o edificio    │
│                                                          ⟳ Sync   👤 W.   │
├───────────────┬────────────────────────────────────────────┬─────────────┤
│               │                                            │             │
│  ÁRBOL        │                                            │   PANEL     │
│  TERRITORIAL  │                                            │   DE        │
│  (colapsable) │                                            │   DETALLE   │
│               │                                            │   (aparece  │
│  ▸ Territorio │                                            │   solo al   │
│    A1         │                  MAPA                      │   seleccio- │
│    ▾ Zona 1   │                                            │   nar algo) │
│      • A1-01  │                                            │             │
│      • A1-02  │                                            │             │
│    ▸ Zona 2   │                                            │             │
│    ▸ Zona 3   │        ┌─────────────┐                     │             │
│               │        │  Capas  ▾   │ ← control flotante  │             │
│               │        └─────────────┘   (esquina inf. izq)│             │
├───────────────┴────────────────────────────────────────────┴─────────────┤
│  Edificio A1 · Cobertura física 100% · Intentados 72% · Contactos 41%     │
│  ● Sincronizado hace 2 min                                    [+ Nuevo]  │
└──────────────────────────────────────────────────────────────────────────┘
```

Cuatro zonas fijas:

| Zona | Comportamiento |
|---|---|
| Barra superior | Fija. Selector de territorio/zona activo, buscador, estado de sincronización, usuario. |
| Panel izquierdo — árbol territorial | Colapsable a un icono (como el panel de capas de Google Maps en modo "Tu actividad"). Árbol Territorio → Zona → Edificio, con indicador de pendientes por nodo. |
| Mapa | Ocupa el resto del espacio siempre. Nunca se redimensiona por contenido de otros paneles — los paneles flotan *sobre* él. |
| Panel derecho — detalle | Oculto por defecto. Aparece como panel deslizante al seleccionar un edificio/apartamento/restricción. Se cierra con `Esc` o clic en el mapa vacío. |
| Barra inferior — estado | Métricas de cobertura del elemento activo + estado de sincronización. Siempre visible, una sola línea, sin scroll. |

---

## 3. Sistema de capas (el núcleo de esta interfaz)

Inspirado en el selector de capas de Google Maps (el panel que se despliega desde la esquina inferior izquierda con miniaturas), pero con dos grupos en vez de una lista plana, porque aquí las capas no son alternativas visuales sino **preguntas operativas distintas**.

### Control de capas — estructura

```
┌───────────────────────────────┐
│  CAPAS                    ✕   │
├───────────────────────────────┤
│  Mapa base                    │
│  ○ Normal   ● Satelital  ○ Híbrido │
├───────────────────────────────┤
│  Capas temáticas               │
│  ☑ Territorial                │
│     Territorios y zonas       │
│  ☑ Edificios                  │
│     Polígonos y accesos       │
│  ☑ Predicación                │
│     ● Contactado ● Sin resp.  │
│     ● Pendiente ○ No visitado │
│  ☐ Problemas                  │
│     Acceso restringido, etc.  │
│  ☐ Infraestructura            │
│     (futuro — escuelas, etc.) │
└───────────────────────────────┘
```

### 3.1 Grupo "Mapa base" — selección única (radio)

Igual que Google Maps: son mutuamente excluyentes, son el fondo, no aportan datos propios.

* **Normal** — el estilo MapLibre propio (calles, nombres, edificios genéricos) generado a partir de los tiles offline (ver documento de arquitectura, §5-bis). Es el modo por defecto, porque es el más legible para trabajo de campo y el más liviano para offline.
* **Satelital** — imagen satelital como fondo. Útil para verificar la forma real de un edificio recién dibujado. *Nota: requiere conexión (las imágenes satelitales no forman parte del paquete offline por su peso); se deshabilita visualmente con un badge "requiere conexión" cuando el dispositivo está offline.*
* **Híbrido** — satelital + nombres de calles superpuestos. Mismo requisito de conexión que satelital.

### 3.2 Grupo "Capas temáticas" — selección múltiple (checkboxes)

Se pueden combinar libremente. Por defecto, al abrir la app: **Territorial + Edificios + Predicación** activas, **Problemas** e **Infraestructura** apagadas (evita saturar el mapa la primera vez que alguien lo abre).

* **Territorial** — dibuja los límites de territorios y zonas como polígonos con relleno muy sutil y borde marcado; muestra el código de cada zona como etiqueta al hacer zoom suficiente.
* **Edificios** — dibuja cada edificio como polígono (o pin si aún no tiene geometría propia, ver arquitectura §11). Sin esta capa activa, el mapa muestra solo el contorno territorial, útil para tener una vista "limpia" de planificación.
* **Predicación** — la capa más usada en el día a día. Colorea cada edificio/apartamento según su estado calculado (ver leyenda abajo). Esta es la respuesta visual directa a la pregunta "¿qué queda pendiente?": es lo que en Google Maps sería la capa de tránsito, pero aquí el "tráfico" es el trabajo pendiente.
* **Problemas** — resalta con un icono de advertencia los edificios/apartamentos con restricciones activas (acceso restringido, intercomunicador roto, horario específico). Apagada por defecto porque es una capa de excepción, no de uso constante.
* **Infraestructura** — reservada para fase futura (escuelas, comercios, puntos de interés). Se muestra en el control ya desde v1, pero deshabilitada con un rótulo "próximamente", para que el usuario entienda que el sistema de capas está pensado para crecer sin rediseñarse.

### 3.3 Leyenda de la capa "Predicación"

Siempre visible como una fila pequeña dentro del control de capas cuando esa capa está activa (no como panel aparte — evita otro elemento flotante más):

| Color | Estado |
|---|---|
| 🟢 Verde `#3A7D44` | Contactado |
| 🟠 Ámbar `#D98E04` | Sin respuesta |
| 🔵 Azul `#2D6CA6` | Pendiente (nunca intentado) |
| ⚪ Gris `#B8BEC7` | No aplica / archivado |
| 🔴 Rojo-teja `#C1440E` | Problema de acceso |

---

## 4. Interacciones principales

### Seleccionar un edificio

Clic en el polígono → el edificio se resalta con un contorno de 2px en el color de acento (`#1B4B43`) → se abre el panel derecho con: nombre/dirección, tipo de acceso, lista de apartamentos con su estado, botón "Iniciar predicación aquí". El mapa **no** hace zoom automático ni recentra — respeta lo que el usuario estaba mirando.

### Modo dibujo (crear edificio)

Al activarlo desde la barra superior (`+ Nuevo` → "Edificio"), el resto de la interfaz se atenúa ligeramente (opacidad 60% en los paneles, no en el mapa) y aparece una barra de instrucciones flotante arriba del mapa: "Haz clic para marcar cada esquina · Doble clic para cerrar el polígono · Esc para cancelar". Es el único momento en que la interfaz "interrumpe" — el resto del tiempo es una herramienta de consulta silenciosa.

### Árbol territorial

Al hacer clic en un nodo (zona o edificio), el mapa hace `flyTo` suave hacia su geometría — este es el único caso donde sí se permite recentrar automáticamente, porque el usuario lo pidió explícitamente al navegar por el árbol, a diferencia de seleccionar directamente sobre el mapa.

### Búsqueda

El buscador de la barra superior busca por dirección, código de zona o número de edificio — no es un geocoder genérico de calles del mundo, está acotado a los datos ya cargados de la congregación activa.

### Estado offline

El indicador de sincronización en la barra superior tiene tres estados visuales simples, sin texto largo: `⟳ Sincronizando…`, `✓ Sincronizado`, `● Sin conexión — N cambios pendientes`. Nunca es un modal ni una notificación intrusiva; es información ambiental, coherente con que offline es el estado normal de esta app, no una excepción.

---

## 5. Sistema visual (tokens)

**Color**

| Token | Hex | Uso |
|---|---|---|
| `--bg-panel` | `#FAFAF8` | Fondo de paneles laterales (casi blanco, cálido, no clínico) |
| `--ink` | `#20241F` | Texto principal |
| `--ink-muted` | `#6B7268` | Texto secundario, metadatos |
| `--accent` | `#1B4B43` | Verde-teal profundo — acento primario, selección, botones principales |
| `--accent-soft` | `#DCE8E4` | Fondos de estado activo/hover, muy sutil |
| `--border` | `#E2E1DA` | Bordes y divisores |
| más los 5 colores de estado de predicación (§3.3) | | Exclusivos de la capa de predicación, no se reutilizan en otros componentes de UI para no diluir su significado |

Se elige un verde-teal profundo como acento (en vez de azules genéricos de "app de mapas" o el terracota/negro típico de interfaces generadas) porque evoca terreno/vegetación/geografía sin copiar el azul de Google Maps ni el naranja de Waze — la app necesita su propia identidad visual aunque el patrón de interacción esté inspirado en ambas.

**Tipografía**

Una sola familia sans-serif (Inter o similar), dos pesos: regular para texto de cuerpo y listas, medium/600 para encabezados de panel y nombres de edificio seleccionado. Números (coordenadas, porcentajes de cobertura, códigos de zona) con figuras tabulares para que se alineen limpiamente en listas.

**Layout**

Paneles con esquinas redondeadas suaves (6px, no el 16px+ típico de "tarjeta SaaS"), sombra mínima solo en elementos flotantes sobre el mapa (control de capas, panel de detalle), nunca en elementos adosados a un borde de la ventana (barra superior, árbol lateral) — la sombra se reserva para lo que "flota", reforzando la jerarquía espacial real de la interfaz.

---

## 6. Fuera de alcance en v1

* Vista móvil / responsive — se documentará por separado cuando exista la necesidad real de una app de campo.
* Modo oscuro.
* Personalización del layout por usuario (mover/redimensionar paneles).
* Capa "Infraestructura" funcional (solo placeholder visual, ver §3.2).

