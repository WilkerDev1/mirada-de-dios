# 04 · Componentes UI y Flujos de Usuario

## 1. Catálogo de Componentes de Interfaz

La aplicación sigue una arquitectura de componentes modulares ubicados en `src/components/`, diseñados para proporcionar una experiencia de usuario fluida tanto en dispositivos móviles (pantallas táctiles con teclado virtual) como en equipos de escritorio:

```
src/components/
├── Navbar.tsx             # Barra superior de navegación, búsqueda y herramientas
├── MapView.tsx            # Visor cartográfico WebGL + Proyección SVG interactiva
├── TerritoryTree.tsx      # Explorador jerárquico en árbol (Territorio/Zona/Edificio)
├── DetailPanel.tsx        # Ficha técnica de edificio, grilla de apartamentos y visitas
├── ZoneSheet.tsx          # Ficha técnica y gestión de residenciales / zonas
├── TerritorySheet.tsx     # Ficha de territorio macro con métricas de cobertura
├── LayerControl.tsx       # Menú flotante de mapas base y capas temáticas
├── CoverageStatusBar.tsx  # Barra inferior fija de métricas en tiempo real
├── GodsEyeHUD.tsx         # HUD de telemetría táctica y retícula de apuntamiento
└── ColorPickerBar.tsx     # Selector de colores para personalización de entidades
```

---

## 2. Descripción de Componentes Principales

### 2.1 `Navbar.tsx` (Barra Superior Táctica)
- **Selector de Territorio:** Menú desplegable para alternar rápidamente entre los territorios de la congregación (ej. SD-01, SD-02, SD-03, SD-04).
- **Buscador Global Inteligente:** Campo de búsqueda en vivo que filtra instantáneamente por nombre de edificio, dirección o código de zona, con opción de teletransporte inmediato (`flyTo`) al resultado seleccionado.
- **Selector de Modo de Trabajo (`AppMode`):** Alterna entre los modos de visualización `BUILDINGS`, `ZONES` y `TERRITORIES`.
- **Herramientas de Digitalización:** Botones de dibujo rápido (Caja rectangular o Polígono multi-vértice).
- **Indicador de Sincronización:** Muestra el número de mutaciones locales pendientes (`pendingSyncCount`) y permite forzar la sincronización manual con animación de giro.
- **Botón God's Eye:** Conmutador del modo HUD táctico.

### 2.2 `TerritoryTree.tsx` (Árbol Jerárquico con Drag & Drop)
- Despliega la estructura `Territorio → Zonas → Edificios`.
- Muestra contadores dinámicos de apartamentos pendientes por edificio.
- **Reorganización Drag & Drop:** Permite arrastrar un edificio hacia otra zona, o una zona hacia otro territorio.
- **Modal Táctil "Mover a...":** En pantallas móviles donde el arrastre táctil es impreciso, ofrece un botón de reasignación asistida por menús.
- Botones de teletransporte suave (`flyTo`) con coordenadas y zoom preajustados.

### 2.3 `DetailPanel.tsx` (Ficha del Edificio y Gestión de Unidades)
Se presenta como un panel lateral en escritorio o una lámina deslizable inferior (*Bottom Sheet*) en móviles:
- **Pestaña UNIDADES:**
  - Grilla interactiva de apartamentos codificados por color según su estado:
    - 🟢 **Verde (`CONTACTED`):** Residente contactado con éxito.
    - 🟠 **Ámbar (`NO_ANSWER`):** No contestó / No en casa.
    - 🔵 **Azul (`PENDING` / `UNVISITED`):** Pendiente de visitar.
    - 🔴 **Rojo (`ACCESS_PROBLEM`):** Restricción o problema de acceso.
  - **Registro Rápido de Visita:** Al seleccionar un apartamento, se abre el formulario de registro con opciones de resultado inmediato y nota de campo.
  - **Generador por Lotes (Batch Generator):** Permite generar automáticamente decenas de unidades en un solo paso especificando número de pisos y apartamentos por piso (ej. 4 pisos × 2 unidades = 101, 102, 201, 202, etc.).
  - **Alta Individual:** Permite agregar apartamentos irregulares (ej. "Penthouse B", "Anexo 1").
- **Pestaña HISTORIAL:**
  - Cronología inmutable con fecha, hora, usuario, resultado y notas de todas las visitas anteriores realizadas en el edificio.
- **Pestaña INFORMACIÓN:**
  - Edición de metadatos: Nombre, dirección, número de plantas, tipo de acceso (Libre, Intercomunicador, Garita, Conserje, Con llave) y selector de color.

### 2.4 `ZoneSheet.tsx` y `TerritorySheet.tsx`
- **ZoneSheet:** Permite editar el nombre y color de un residencial o manzana, ver la lista de edificios contenidos y activar el modo de dibujo de nuevos edificios vinculados directamente a esa zona.
- **TerritorySheet:** Proporciona una vista ejecutiva del territorio con medidores de cobertura física y porcentaje de contacto, listando todas las zonas que lo componen.

### 2.5 `CoverageStatusBar.tsx` (Barra de Cobertura Inferior)
Ubicada en la base de la pantalla, siempre visible:
- **Código Territorial Activo** (ej. `SD-01`).
- **Cob (%):** Cobertura física de edificios visitados.
- **Int (%):** Porcentaje de apartamentos donde se ha intentado contactar.
- **Cont (%):** Porcentaje de apartamentos contactados eficazmente.
- **Pend:** Cantidad neta de apartamentos pendientes en el territorio.
- **Botón "+ Nuevo Edificio":** Dispara el asistente de alta de inmueble en la ubicación central del visor.

---

## 3. Flujos de Usuario Principales

### Flujo 1: Registro de una Visita en el Campo
```
1. El usuario navega visualmente en el mapa o busca la dirección en la Navbar.
2. Toca el polígono o el badge del edificio deseado.
3. Se abre el `DetailPanel` mostrando la grilla de apartamentos.
4. Toca el número de apartamento visitado (ej. "204").
5. Selecciona el resultado: [CONTACTADO] o [NO CONTESTÓ].
6. (Opcional) Escribe una nota breve en el campo de texto.
7. Presiona "REGISTRAR VISITA".
   └── Se ejecuta una transacción en Dexie.
   └── Se actualiza el color del apartamento en pantalla instantáneamente.
   └── Se añade la operación a `SyncQueue`.
   └── Las métricas de la barra inferior se recalculan en tiempo real.
```

### Flujo 2: Alta y Trazado de un Nuevo Inmueble
```
1. El usuario presiona el botón de trazado (polígono o caja) en la Navbar o en la barra inferior.
2. Modo Caja: Toca la esquina superior izquierda del edificio y luego la esquina opuesta.
   Modo Polígono: Toca cada una de las esquinas del edificio viendo las cotas en metros; 
                  al acercarse al punto inicial, el imán cierra el polígono.
3. Confirma el trazado en el botón flotante [✔].
4. En el diálogo emergente indica:
   - Nombre del edificio o residencial (ej. "Torre Altagracia")
   - Dirección
   - Número de pisos
   - Unidades por piso (autogenera la grilla de apartamentos)
   - Tipo de acceso (Intercomunicador, Garita, etc.)
5. Al guardar, el edificio se renderiza de inmediato en el mapa 2D y en la vista 3D.
```

### Flujo 3: Reorganización Territorial
```
1. El usuario abre el panel lateral `TerritoryTree`.
2. Identifica un edificio asignado incorrectamente a una zona o un territorio vecino.
3. Escritorio: Arrastra el elemento hacia la zona destino deseada.
   Móvil: Toca el icono de opciones y selecciona "Mover a...", eligiendo el nuevo destino.
4. La base de datos actualiza el `zoneId` y `territoryId` de la entidad y encola la mutación.
```
