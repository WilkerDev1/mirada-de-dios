# 03 · Motor Cartográfico y HUD Táctico

## 1. Visión General del Motor de Mapas

El núcleo visual de **Mirada de Dios** está implementado en `src/components/MapView.tsx` y utiliza **MapLibre GL JS** como motor de renderizado vectorial acelerado por hardware mediante WebGL.

La interfaz está diseñada para que el mapa ocupe el **100% del viewport**, mientras que los paneles de datos y controles flotan sobre él usando técnicas de *glassmorphism* (fondos translúcidos con `backdrop-blur` y bordes sutiles).

---

## 2. Estilos de Mapa Base Disponibles

El usuario puede alternar instantáneamente entre 6 estilos cartográficos desde el control de capas (`LayerControl.tsx`):

| Identificador | Nombre Visible | Tipo de Tesela | Caso de Uso |
|---|---|---|---|
| `GOOGLE_STREETS` | Google Streets | Raster / Calles | Modo por defecto. Óptimo contraste y legibilidad para trabajo diurno en campo. |
| `GOOGLE_HYBRID` | Google Híbrido | Raster Satélite + Nomenclatura | Identificación precisa de inmuebles físicos y patios con nombres de calles legibles. |
| `GOOGLE_SATELLITE`| Google Satélite | Raster Satélite puro | Inspección visual de techos, patios y accesos sin interferencia de etiquetas. |
| `GOOGLE_TERRAIN`  | Google Relieve | Raster Topográfico | Análisis de elevaciones, lomas y desniveles del terreno. |
| `OSM_STREETS`     | OSM Carto | Vectorial / OSM | Cartografía abierta estándar con bajo consumo de datos móviles. |
| `GODS_EYE_DARK`   | God's Eye Dark (Carto Dark) | Vectorial Oscuro | Modo táctico de alto contraste y mínimo deslumbramiento para operativos nocturnos. |

---

## 3. Arquitectura de Proyección Híbrida: WebGL + SVG Overlay

Para combinar la fluidez de un mapa WebGL con la reactividad interactiva de React y una experiencia táctil impecable en dispositivos móviles, se implementó una **capa de proyección híbrida**:

1. **Capa WebGL (Base):** MapLibre gestiona la carga de teselas, la rotación de cámara, el cabeceo 3D (*pitch*) y la aceleración gráfica por GPU.
2. **Capa SVG Dinámica (Interacción y Polígonos):**
   - Los polígonos de territorios, zonas y edificios se proyectan en un lienzo SVG reactivo que cubre la pantalla.
   - En cada evento `render`, `move`, `zoom` o `rotate` del mapa, se actualiza una secuencia de transformación (`mapTransformSeq`) que re-proyecta los puntos geográficos `[lng, lat]` a coordenadas de pantalla `[pixelX, pixelY]` usando `map.project()`.
   - **Algoritmo de Intersección Ray-Casting:** La función `isPointInScreenPolygon` evalúa si un toque en pantalla cae dentro del polígono del edificio en el espacio de pantalla, garantizando una detección táctil instantánea y sin desfases.
   - **Tolerancia Táctil (Finger-friendly Hitbox):** Para seleccionar un edificio o zona tocando su badge central o icono, la función `isNearCenter` provee un radio de tolerancia amplio (26–36 px), permitiendo a usuarios con pantallas pequeñas seleccionar inmuebles cómodamente sin fallar el toque.

---

## 4. Herramientas de Dibujo y Trazado Tipo AutoCAD

`MapView.tsx` incorpora un motor interactivo de dibujo asistido para digitalizar inmuebles, zonas y límites territoriales directamente desde el teléfono o la PC:

```
[Modo de Dibujo Activado]
           │
           ├──► Dibujo por Caja (Bounding Box / 2 toques: Esquina A y Esquina B)
           │
           └──► Dibujo por Polígono Libre (Multi-vértice tipo AutoCAD)
                      │
                      ├── Rubber-banding (Línea elástica hacia el cursor/dedo)
                      ├── Medición en tiempo real (Distancia en metros entre vértices)
                      ├── Snapping magnético al punto inicial para cerrar figura
                      ├── Feedback háptico (Vibración suave en cada vértice)
                      └── Controles flotantes: Deshacer (Undo), Confirmar, Cancelar
```

### Modos de Dibujo Disponibles (`DrawMode`)
- `DRAW_BUILDING_BOX`: Genera un polígono rectangular para un edificio marcando dos esquinas opuestas.
- `DRAW_BUILDING_POLYGON`: Digitalización punto a punto de la huella exacta de un edificio con esquinas irregulares.
- `DRAW_ZONE_BOX` / `DRAW_ZONE_POLYGON`: Delimitación de un residencial, complejo habitacional o manzana completa.
- `DRAW_TERRITORY_POLYGON`: Trazado macro de los límites de un territorio congregacional.

### Características del Motor de Dibujo:
- **Medición geodésica en tiempo real:** Utiliza la fórmula del semiverseno (*Haversine*) en `getDistanceMeters()` para mostrar sobre la línea elástica la distancia exacta en metros entre el último vértice fijado y la posición actual del cursor.
- **Snapping Magnético:** Cuando el usuario acerca el puntero a menos de 28 píxeles del primer vértice, se activa un halo visual esmeralda y el cursor se imanta al origen para cerrar el polígono con un solo toque.
- **Deshacer Vértices (`Undo`):** Permite retroceder el último vértice agregado sin reiniciar el trabajo.

---

## 5. Extrusión Volumétrica 3D

El mapa soporta vista tridimensional de edificios:
- Al activar el modo 3D (desde `LayerControl` o con el botón táctico 2D/3D), la cámara se inclina automáticamente a un *pitch* de 45°–60°.
- Los edificios se extruyen volumétricamente usando la altura calculada a partir de su número de pisos:
  $$\text{Altura (metros)} = \text{pisos} \times 3.5\text{ m}$$
- Cada edificio conserva su color distintivo de status o personalizado (`building.color`), permitiendo identificar torres altas, condominios medianos y casas bajas de un solo vistazo.

---

## 6. Telemetría Táctica ("God's Eye HUD")

El componente `src/components/GodsEyeHUD.tsx` proyecta una capa de instrumentación táctica sobre el mapa:

1. **Retícula Central de Reconocimiento:** Mira telescópica con retícula de colimación y pulsos de escaneo activo.
2. **Soportes Angulares en Esquinas:** Gráficos tácticos de fijación de pantalla en las cuatro esquinas del visor.
3. **Banner Superior:** Código de territorio activo (ej. `DOM-SDQ-01`), reloj UTC en tiempo real y estado de enlace satelital.
4. **Caja de Datos Geoespaciales (Inferior Derecha):**
   - **Latitud y Longitud** con 5 decimales de precisión.
   - **Factor de Zoom** actual (ej. `17.2x`).
   - **Inclinación (Pitch)** en grados.
   - **Rumbo (Bearing)** con indicador de orientación respecto al Norte magnético.
