# ImissNuke 🎬

> Extensión limpia, modular y 100% original que traslada la experiencia de navegación, atajos, tuberías ortogonales y flechas de dirección de flujo de **Foundry Nuke** a **ComfyUI**.

---

## 🚀 ¿Por qué ImissNuke?

`ImissNuke` nació para separar de forma definitiva los atajos y la experiencia de usuario de Foundry Nuke de librerías o scripts antiguos de terceros:
- **Cero código prestado**: Todo el código de atajos, matemáticas de empalme, trazado de pipes e interfaz está escrito 100% desde cero.
- **Rendimiento y Ligereza**: Sin dependencias externas pesadas ni algoritmos ajenos.
- **Renderizador Nuke Nativo**: Trazado ortogonal a 90° con carcasa de alto contraste y flechas de dirección de flujo (*flow chevrons*) idénticas a Nuke.

---

## 📐 Nuke Pipes & Flechas de Dirección de Flujo

El módulo `ImissNuke_Lines.js` sustituye el renderizado predeterminado de ComfyUI por pipes auténticos de Nuke:
- **Trazado Ortogonal 90°**: Líneas con ángulos rectos o biselados limpios que respetan el orden visual del node graph.
- **Borde de Alto Contraste (Dark Casing)**: Contorno oscuro nítido alrededor de cada cable que hace resaltar el color de los datos (MODEL, CLIP, VAE, IMAGE, etc.).
- **Flechitas Vectoriales de Flujo (Chevrons)**: Flechas nítidas integradas en el cable que apuntan exactamente en la dirección en la que viaja la información (de salida a entrada).
- **Cables en Arrastre Activo**: Al tirar de un puerto (Output o Input), el cable temporal se dibuja con estética Nuke y su flecha orientada hacia el destino.
- **Personalización en Panel**: Puedes activar/desactivar las líneas, las flechas, alternar entre estilo *90°*, *Recta* o *Bisel*, y cambiar el estilo (*Chevron* o *Triángulo*) y tamaño de las flechas (7px, 9px, 12px).

---

## ⌨️ Guía Completa de Atajos de Teclado (Nuke Style)

| Atajo | Acción en ComfyUI | Inspiración Nuke |
| :--- | :--- | :--- |
| **`Tab`** | Abre el buscador moderno de nodos en la posición del ratón. | Búsqueda por Tab en Node Graph |
| **`F`** | **Focus / Frame**: Encuadra la selección, el grupo o el grafo completo con zoom suave centrado. | Frame Selection (`F`) |
| **`D`** | **Disable / Bypass**: Alterna entre habilitado y Bypass (modo 4) o Mute (modo 2). | Disable Node (`D`) |
| **`Alt + H`** | **Hide Inputs**: Oculta/Muestra cables de entrada y conexiones virtuales (Set/Get, KJNodes, pythongosssss). | Hide Input (`Alt+H`) |
| **`Ctrl + D`** | Duplica el nodo seleccionado **sin conexiones**. | Duplicate limpio |
| **`Ctrl + E`** | Clona el nodo seleccionado **manteniendo las conexiones de entrada**. | Clone with inputs |
| **`Shift + Q`** | **Auto-Connect**: Conecta los nodos seleccionados al último nodo seleccionado o en cadena. | Conectar al último seleccionado |
| **`Ctrl + Shift + C`** | Abre la **Paleta de Color flotante** (12 presets de estudio + selector hex) para nodos y grupos. | Color Picker de Nodos |
| **`Ctrl + Shift + X`** | **Extract Node**: Extrae el nodo de la cadena y puentea automáticamente los nodos anteriores con los posteriores. | Extract Node (`Ctrl+Shift+X`) |
| **`Ctrl + Shift + S`** | **Swap Nodes**: Sustituye un nodo por otro pasando todas las conexiones compatibles. | Swap / Reemplazo rápido |
| **`Ctrl + Shift + I`** | **Insert in Wire**: Intercala un nodo entre dos nodos seleccionados o en el cable más cercano. | Splice in wire |
| **`Shift + Drop`** | Suelta un nodo sobre un cable para intercalarlo automáticamente (*Splice*). | Drop on pipe |
| **`Ctrl + Shift + Drop`** | Suelta un nodo sobre otro para sustituirlo (*Swap*). | Drop to replace |
| **`Shift + R`** | Encola/Renderiza únicamente los nodos de salida seleccionados (*Queue Selected*). | Render Selection |

---

## 🖱️ Navegación & Soporte de Tableta Wacom

- **`MMB + LMB Drag`** (o botón inferior de pluma Wacom + toque sobre tableta): **Zoom interactivo continuo y suave** hacia adelante y hacia atrás.
- **`LMB Drag en Canvas`**: Selección por recuadro (*Box Selection*) sincronizada con la configuración nativa de ComfyUI.
- **`MMB Drag`**: Paneo clásico de canvas.
- **Sin menús emergentes accidentales**: Se bloquea la apertura del menú al hacer doble clic en vacío o al soltar un cable al vacío.

---

## 🛠️ Estructura e Instalación

La extensión está instalada en tu carpeta de nodos personalizados:
```
C:/Users/Jorge/Documents/ComfyUI/custom_nodes/ImissNuke/
├── __init__.py
├── README.md
└── js/
    ├── ImissNuke_Hotkeys.js   # Atajos, navegación Wacom, UI panel
    └── ImissNuke_Lines.js     # Motor de tuberías y flechas Nuke
```
Solo necesitas refrescar tu navegador en ComfyUI (o reiniciar si es la primera vez que se añade la carpeta a `custom_nodes`) para probarla inmediatamente.
