# 🎬 GUÍA DE PROYECTO & CONTEXTO PARA NUEVO CHAT (ImissNuke)

Esta guía explica con exactitud **dónde se encuentran los archivos**, **dónde se ejecutan en ComfyUI**, **qué hace cada archivo**, y proporciona un **prompt listo para copiar y pegar en un nuevo chat** para continuar el desarrollo sin perder contexto.

---

## 📂 1. ¿Dónde se está ejecutando todo? (Ruta Activa de ComfyUI)

ComfyUI carga sus extensiones frontend y nodos desde su carpeta oficial de `custom_nodes`. **Este es el directorio vivo donde ComfyUI lee los cambios**:

```text
C:\Users\Jorge\Documents\ComfyUI\custom_nodes\ImissNuke\
├── __init__.py                     # Registrador de ComfyUI (apunta a ./js)
├── README.md                       # Documentación general
├── GUIA_PROYECTO_Y_NUEVO_CHAT.md   # Este documento de referencia
├── js/
│   ├── ImissNuke_Hotkeys.js        # Atajos, navegación Wacom, UI panel, menú N, fondo Nuke
│   └── ImissNuke_Lines.js          # Motor de renderizado de cables (pipes) y flechas de flujo
```

> **Regla de Oro**: Para que ComfyUI vea cualquier cambio en el navegador, los archivos en `C:\Users\Jorge\Documents\ComfyUI\custom_nodes\ImissNuke\js\` deben estar actualizados y basta con refrescar el navegador (`Ctrl + F5` o `F5`).

---

## 🗂️ 2. Workspaces y Copias de Respaldo

En tu carpeta de trabajo personal / Antigravity existen estos workspaces:

1. **Workspace de Antigravity (QuickConnections)**:
   `C:\Users\Jorge\Documents\Antigravity\ComfyUI\QuickConnections\`
   - Aquí residen los archivos históricos de versiones anteriores (`QuickConnections_v1.js` a `v29.js`).
   - También tiene la subcarpeta sincronizada:
     `C:\Users\Jorge\Documents\Antigravity\ComfyUI\QuickConnections\ImissNuke\js\`
2. **Workspace de Antigravity (ImissNuke)**:
   `C:\Users\Jorge\Documents\Antigravity\ComfyUI\ImissNuke\`
   - Espejo sincronizado del custom node.

### 🔄 Comando de Sincronización Automática (PowerShell)
Cada vez que se modifica un archivo en `custom_nodes`, se mantiene todo sincronizado con este comando:
```powershell
Copy-Item "C:\Users\Jorge\Documents\ComfyUI\custom_nodes\ImissNuke\js\ImissNuke_Hotkeys.js" "C:\Users\Jorge\Documents\Antigravity\ComfyUI\QuickConnections\ImissNuke\js\ImissNuke_Hotkeys.js" -Force;
Copy-Item "C:\Users\Jorge\Documents\ComfyUI\custom_nodes\ImissNuke\js\ImissNuke_Hotkeys.js" "C:\Users\Jorge\Documents\Antigravity\ComfyUI\QuickConnections\ImissNuke\ImissNuke_Hotkeys.js" -Force;
Copy-Item "C:\Users\Jorge\Documents\ComfyUI\custom_nodes\ImissNuke\js\ImissNuke_Lines.js" "C:\Users\Jorge\Documents\Antigravity\ComfyUI\QuickConnections\ImissNuke\js\ImissNuke_Lines.js" -Force;
Copy-Item "C:\Users\Jorge\Documents\ComfyUI\custom_nodes\ImissNuke\js\ImissNuke_Hotkeys.js" "C:\Users\Jorge\Documents\Antigravity\ComfyUI\ImissNuke\js\ImissNuke_Hotkeys.js" -Force;
Copy-Item "C:\Users\Jorge\Documents\ComfyUI\custom_nodes\ImissNuke\js\ImissNuke_Hotkeys.js" "C:\Users\Jorge\Documents\Antigravity\ComfyUI\ImissNuke\ImissNuke_Hotkeys.js" -Force;
Copy-Item "C:\Users\Jorge\Documents\ComfyUI\custom_nodes\ImissNuke\js\ImissNuke_Lines.js" "C:\Users\Jorge\Documents\Antigravity\ComfyUI\ImissNuke\js\ImissNuke_Lines.js" -Force;
```

---

## 🧩 3. ¿Qué hace cada archivo en el proyecto?

### A. `ImissNuke_Hotkeys.js`
Es el núcleo funcional de la extensión (UI, eventos del DOM y Canvas):
1. **Botón N y Menú Superior**:
   - Montado de forma persistente en la barra superior junto al botón nativo de `Extensions` (`isButtonProperlyMounted`).
   - Abre la ventana modal de configuración con control de escala (`panelScale`), interruptor general ON/OFF, switches de atajos, estilos de cables y backdrops.
2. **Atajos de Teclado Estilo Nuke**:
   - `Tab`: Abre el buscador moderno de nodos directamente bajo el cursor y autoconecta si se originó de un puerto.
   - `F`: Focus / Frame en nodos seleccionados, backdrop o grafo completo.
   - `D`: Toggle Bypass (modo 4) o Mute (modo 2).
   - `Alt + H`: Ocultar cables de entrada (Hide Inputs) / Enlaces virtuales Set & Get.
   - `Ctrl + D`: Duplicar sin conexiones.
   - `Ctrl + E`: Clona manteniendo conexiones de entrada.
   - `Shift + Q`: Auto-conectar fuentes al último nodo seleccionado o en cadena.
   - `Ctrl + Shift + C`: Paleta de colores flotante para nodos y grupos (compatible con Nodes 2.0 / Vue).
   - `Ctrl + Shift + X`: Extraer nodo y puentear cables adyacentes (*Extract*).
   - `Ctrl + Shift + S` / `Ctrl + Shift + Drag Drop`: Intercambio de posición y conexiones entre dos nodos sin eliminarlos (*Non-destructive Swap*).
   - `Shift + Drag Drop`: Intercalar nodo sobre cable al soltar (*Splice*).
   - `Shift + R`: Encolar / Renderizar solo los nodos de salida seleccionados.
3. **Navegación Wacom y Canvas**:
   - `MMB + LMB Drag` (o botón de pluma Wacom): Zoom interactivo suave y continuo.
   - `LMB Drag`: Box selection de nodos.
4. **Fondo de Canvas Nuke (`NukeCanvasBackground`)**:
   - **Tono Gris Nuke**: `#616161` (38% de brillo DAG neutro de Foundry Nuke).
   - **Slider de Tono de Gris**: Rango de 12% (carbón oscuro) a 85% (gris claro de estudio).
   - **Estilos**: *Flat Gray* (gris plano) o *Dotted Grid* (grilla con puntitos blancos tenues de opacidad graduable).
   - **Restauración ComfyUI**: Al apagar el fondo de Nuke, restaura de forma 100% no destructiva el fondo y la cuadrícula por defecto de ComfyUI (sin pantallas negras).
5. **Backdrops / Grupos Nuke (`NukeBackdropManager`)**:
   - Soporte para estilo *Fill* (relleno) o *Border* (solo contorno).
   - Tamaños de título seleccionables (18px Small, 28px Medium, 42px Large).

### B. `ImissNuke_Lines.js`
Controla el dibujo estético de los cables en el Canvas de ComfyUI:
- **Pipes Nuke**: Trazado ortogonal a 90° con esquinas biseladas (45°), curvas redondeadas, u ortogonales puras.
- **Dark Casing**: Borde negro de alto contraste alrededor de los cables.
- **Flechas de Flujo (Chevrons / Triangles)**: Indicadores de dirección de datos a lo largo de los cables.
- **Upstream Highlight**: Resaltado ámbar (`#e58c2c`) solo en las conexiones aguas arriba (*upstream*), tal como en Nuke.

### C. `__init__.py`
Indica a ComfyUI que cargue todos los scripts JavaScript de la subcarpeta `./js/`.

---

## 📋 4. PROMPT LISTO PARA COPIAR Y PEGAR EN UN NUEVO CHAT

```markdown
Hola. Estamos trabajando en el desarrollo de la extensión "ImissNuke" para ComfyUI, la cual recrea la experiencia, atajos, tuberías ortogonales y navegación de Foundry Nuke en ComfyUI.

### 📍 Ubicación de los archivos activos:
El código fuente en ejecución por ComfyUI reside en:
C:\Users\Jorge\Documents\ComfyUI\custom_nodes\ImissNuke\
├── __init__.py
├── js\
│   ├── ImissNuke_Hotkeys.js
│   └── ImissNuke_Lines.js

Y debe mantenerse sincronizado con los workspaces de Antigravity:
1. C:\Users\Jorge\Documents\Antigravity\ComfyUI\QuickConnections\ImissNuke\js\
2. C:\Users\Jorge\Documents\Antigravity\ComfyUI\ImissNuke\js\

### 🛠️ Estado actual del proyecto:
1. Menú superior 'N' persistente junto a Extensions (`isButtonProperlyMounted`).
2. Atajos funcionales: Tab (búsqueda en cursor), F (focus), D (bypass/mute), Alt+H (hide inputs), Ctrl+D, Ctrl+E, Shift+Q, Ctrl+Shift+C (paleta de color), Ctrl+Shift+X (extract), Ctrl+Shift+S / Ctrl+Shift+Drag (swap no destructivo de nodos), Shift+Drop (splice), Shift+R (queue selected).
3. Zoom continuo MMB+LMB para tableta Wacom y LMB box selection.
4. Nuke Canvas Background con gris neutro Nuke DAG (#616161, 38%), slider de tono (12%-85%), Flat Gray o Dotted Grid. Al apagar el fondo de Nuke se restaura limpiamente la cuadrícula y el tema nativo de ComfyUI (sin quedar en negro).
5. Pipes ortogonales / biselados con flechas de flujo y resaltado upstream en color ámbar Nuke (#e58c2c).

Por favor, confirma que comprendes la estructura de archivos y lee los archivos antes de realizar cualquier cambio, asegurándote de verificar la sintaxis con `node -c` y sincronizar siempre a los workspaces.
```
