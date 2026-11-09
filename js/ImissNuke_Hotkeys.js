/**
 * ============================================================================
 * ImissNuke - Hotkeys, Navigation & Workflow Extension for ComfyUI
 * ============================================================================
 * Versión limpia y modular con todos los atajos de teclado y experiencia Nuke:
 *  - Tab: Buscador moderno de nodos en cursor
 *  - /: Buscar un nodo del grafo por número o nombre (el Search de Nuke)
 *  - F: Focus / Frame selección, grupo o grafo completo
 *  - D: Bypass (modo 4) o Mute (modo 2)
 *  - Alt + H: Ocultar cables de entrada (Hide Inputs) / Enlaces virtuales Set&Get
 *  - Ctrl + D: Duplicar sin conexiones
 *  - Ctrl + E: Clonar manteniendo conexiones de entrada
 *  - Shift + Q: Auto-conectar fuentes al último nodo seleccionado o en cadena
 *  - Ctrl + Shift + C: Paleta flotante de color para nodos y grupos
 *  - Ctrl + Shift + X: Extraer nodo y puentear cables
 *  - Ctrl + Shift + S: Sustituir / Reemplazar nodo (Swap)
 *  - Ctrl + Shift + I: Intercalar nodo en cable
 *  - Shift + Drag Drop: Intercalar nodo sobre cable al soltar
 *  - Ctrl + Shift + Drag Drop: Sustituir nodo al soltar sobre otro
 *  - Shift + R: Encolar / Renderizar nodos de salida seleccionados
 *  - MMB + LMB Drag (Wacom): Zoom interactivo suave continuo
 *  - Alt + MMB Drag sobre un nodo: Redimensionar (modificador elegible)
 *  - LMB Canvas Drag: Selección por caja (Box select)
 * ============================================================================
 */

(function () {
	'use strict';

	// ---- DEFAULT CONFIGURATION ----

	/* ⚑⚑ EL SISTEMA OPERATIVO DEL NAVEGADOR, NO EL DEL SERVIDOR.
	 *
	 * Un solo blob horneado corre en las dos máquinas de Jorge, así que la
	 * diferencia no puede vivir en el archivo: se decide en tiempo de arranque
	 * y la contesta el único que la sabe, el navegador donde la página está
	 * abierta. En el estudio esa página vive en la workstation de Linux; en
	 * casa, en la de Windows. Es el mismo hecho que ya usa la topología de
	 * deploy — la PC de Windows no es la Linux del trabajo.
	 *
	 * ⚑ Y NO ES EL SERVIDOR DE COMFYUI. Un ComfyUI de Linux mirado desde un
	 * Chrome de Windows contestaría "Windows" aquí, y estaría BIEN: lo que se
	 * está midiendo es dónde corren el teclado, el mouse y el frontend, que es
	 * de donde salen los dos síntomas que esto apaga.
	 *
	 * ⚑ Tres lecturas porque `navigator.platform` está deprecado y algunos
	 * navegadores ya lo congelaron; `userAgentData` es el reemplazo y el UA es
	 * el que nunca falta. La primera que conteste algo gana.
	 */
	const IS_LINUX = (function () {
		try {
			const uad = navigator.userAgentData;
			if (uad && uad.platform) return /linux/i.test(uad.platform);
			if (navigator.platform) return /linux/i.test(navigator.platform)
				&& !/android/i.test(navigator.userAgent || '');
			return /linux/i.test(navigator.userAgent || '')
				&& !/android/i.test(navigator.userAgent || '');
		} catch (e) { return false; }
	}());
	window.__imissNukeIsLinux = IS_LINUX;   // para el check y para la consola

	// Cómo se llama cada modificador del resize en el panel y en la guía de
	// atajos. Una sola tabla: el pulldown y la guía tienen que decir lo mismo.
	const MOD_LABELS = { alt: 'Alt', meta: 'Win', ctrl: 'Ctrl', shift: 'Shift' };

	// ⚑⚑ THE QUIET DEFAULTS. Jorge: "dejar por default el switch off de los
	// backdrops/groups… show arrows off, default wire color en original colors,
	// ya que no quiero que los artistas sientan un cambio fuerte."
	//
	// A default only ever reaches somebody who has NEVER saved a config, and by
	// the time this shipped the panel had already saved one for everyone who
	// opened it once. So the three keys below are also re-defaulted, ONCE, and
	// only where the stored value is still the one they used to ship with: a
	// person who chose something else keeps exactly what they chose, and a
	// person who later turns one back on keeps that too (the epoch is written
	// back the moment it is applied — an epoch that is not stored is an epoch
	// that runs again, and the second run would undo the artist).
	//
	// Bump DEFAULTS_EPOCH the next time a shipped default changes; the table is
	// the whole record of what changed and what it changed FROM.
	//
	// ⚑⚑ CADA FILA DICE DESDE QUÉ EPOCH ES SUYA, y sólo corre para quien
	// está por DEBAJO de ese número. Sin esa columna, subir el epoch por un
	// default nuevo vuelve a aplicar TODOS los viejos — y el artista de
	// Windows que había vuelto a prender los backdrops después del epoch 2 se
	// los encuentra apagados otra vez. Es exactamente el daño contra el que
	// avisa el párrafo de arriba, y hasta v17.56 la tabla no tenía con qué
	// evitarlo: una sola fila nueva lo habría disparado.
	//
	// ⚑⚑ NO HAY FILA 3 Y EL NÚMERO SE QUEMA A PROPÓSITO. v17.56 gastó el epoch
	// 3 apagando `tabForSearch` entero en Linux; v17.57 lo devolvió porque lo
	// que estorbaba no era el hotkey sino la mitad que coloca y conecta. Un
	// config que alcanzó a guardar el 3 tiene que seguir viendo la fila 4, así
	// que el número no se recicla: reusarlo lo dejaría con Tab apagado para
	// siempre. Una clave NUEVA (`tabAutoConnect`) no necesita fila ninguna —
	// el `{...DEFAULT_CONFIG, ...parsed}` ya le da el default a quien no la
	// tiene guardada; la tabla existe sólo para valores que YA están escritos.
	const DEFAULTS_EPOCH = 8;
	const REDEFAULTED = [
		// desde, key,           what it used to ship as,  what it ships as now
		[2, 'nukeGroupsEnabled', true,                     false],
		[2, 'nukeArrowsEnabled', true,                     false],
		[2, 'lineColorMode',     'nukeDark',               'original'],
		// v17.57 — el hotkey vuelve a las dos máquinas. Le llega a quien lo
		// tenga apagado, que hoy es exactamente quien lo apagó por este bug:
		// o se lo apagó v17.56 en Linux, o lo apagó a mano porque los nodos le
		// salían en otro lado. Las dos personas quieren el hotkey de vuelta
		// ahora que la mitad culpable tiene su propio switch.
		[4, 'tabForSearch',      false,                    true],
		// ⚡ v17.84 (Jorge, con la ventana de settings abierta): "tab node
		// search off por default por favor, al igual que los bloqueadores que
		// te sacan los search... creo que ni funcionan tampoco, pero si
		// quieres velos y déjamelos desactivados."
		//
		// ⚡⚡ Y LOS TRES CAEN BAJO LA REGLA QUE ESTE ARCHIVO YA TIENE ESCRITA,
		// treinta líneas más abajo, sobre Performance: *un switch que sale
		// PRENDIDO es esta herramienta decidiendo cómo se comporta el canvas de
		// otra persona*. Los tres eran la excepción a esa regla y ninguno se
		// había ganado el permiso: los dos bloqueadores parchan la superficie
		// de litegraph 1.x (`processMouseDblClick`, `showSearchBox`,
		// `showNodeSearchBox`, `release_link_on_empty_shows_menu`) y bajo Nodes
		// 2.0 el buscador que intentan tapar lo abre la capa de Vue, que no
		// pasa por ninguno de esos ganchos. O sea: prendidos de fábrica,
		// tragándose eventos, para no bloquear nada.
		//
		// ⚡ Se apagan, no se borran. Quien los quiera puede prenderlos, y el
		// día que alguien mida que sí funcionan en este frontend vuelven con
		// una razón en vez de con una suposición.
		[5, 'tabForSearch',              true,  false],
		[5, 'disableDblClick',           true,  false],
		[5, 'blockInputDisconnectSearch', true, false],
		// ⚡⚡ v17.94 — Y VUELVE A PRENDERSE, PORQUE AHORA SÍ TIENE DÓNDE
		// AGARRARSE. Jorge: "el block output search… eso es molesto, ¿hay
		// alguna forma de que sí funcione? ¿todavía funciona? Digamos que si
		// algo está conectado, quiero que si lo desconecta no se active el
		// search node, porque sí es realmente molesto."
		//
		// ⚡⚡ v17.84 lo apagó con toda la razón — parchaba `showSearchBox` y
		// compañía, que bajo Nodes 2.0 ya no son quienes abren el buscador — y
		// eso no cambió: ese parche sigue ahí y sigue sin servir para esto. Lo
		// que cambió es que ahora este switch maneja TAMBIÉN
		// `setupLinkReleaseBlock`, que se cuelga de `LinkConnector.dropOnNothing`
		// — el método por el que pasa el suelte de verdad. Medido en 1.52.7,
		// no supuesto: ver el bloque de esa función.
		//
		// ⚡ Y por eso sí se gana el ON de fábrica que la regla de arriba pide:
		// lo pidió el dueño del canvas, y ya hay una medición detrás.
		[6, 'blockInputDisconnectSearch', false, true],
		// ⚡⚡ Y SU PAREJA, por la misma razón y con la misma prueba.
		// Jorge: "lo quiero prendido por default, ese que desconectas algo
		// conectado y que no triggere el search."
		//
		// ⚡⚡ Y ÉSTE ES EL QUE HACE ESE TRABAJO, no el de arriba: medido en
		// 1.52.7, desenchufar un INPUT ya salía limpio (el link trae
		// `disconnectOnDrop`, se va de `renderLinks` y no queda qué
		// anunciar). El que SÍ abre el buscador es jalar uno nuevo desde un
		// output QUE YA TIENE cable — y eso es exactamente lo que este
		// switch gobierna.
		//
		// ⚡ Su default siempre fue `true`, así que esta fila no es para el
		// que nunca lo tocó: es para el que lo apagó ANTES de v17.94,
		// cuando apagarlo no apagaba nada (gateaba el parche de litegraph
		// 1.x, que bajo Nodes 2.0 no bloquea). Nadie puede haber elegido
		// en contra de un efecto que no existía.
		[6, 'searchOnlyEmptyOutput', false, true],
		// ⚡⚡ v17.99 — Y SE APAGA OTRA VEZ, A PETICIÓN DEL MISMO DUEÑO DEL
		// CANVAS. Jorge: "need the block search on connected slot off by
		// default".
		//
		// ⚡ Esto NO deshace la medición de v17.94 ni el switch: el gancho
		// sigue siendo `LinkConnector.dropOnNothing` y sigue funcionando. Lo
		// que cambia es quién lo pide — y la regla de esta casa es que un
		// switch sale APAGADO salvo que su dueño diga lo contrario. Lo dijo
		// dos veces, en los dos sentidos, y la segunda es la que vale.
		//
		// ⚡ Fila nueva en vez de editar la 6: una fila que este config YA
		// vivió no se vuelve a aplicar, así que borrar la 6 dejaría a quien ya
		// la recibió con el valor viejo y sin manera de recibir el nuevo.
		[7, 'searchOnlyEmptyOutput', true, false],
		// ⚡⚡ v18.51 — EL TAB VUELVE A SALIR PRENDIDO, Y AHORA CON LA CAUSA
		// ENCONTRADA. Jorge: "el tab del search sigue sin funcionar… ¿puedes
		// dar otra vuelta en eso?". v17.84 lo apagó porque "ni funcionan":
		// el nodo nacía lejos del cursor. Leído en el bundle del frontend
		// 1.52.7 (GraphView, `getNewNodeLocation`): el buscador coloca el
		// nodo en `[trigger.canvasX, trigger.canvasY]` — CAMELCASE — y el
		// evento que este archivo le pasaba traía `canvasx`/`canvasy`. El nodo
		// nacía en [undefined, undefined], o sea NaN, que es exactamente lo que
		// el rescate de v17.61 estaba tapando. Con las dos llaves bien
		// escritas (ver `fakeEvent` en setupTabSearch) el frontend lo pone en
		// el cursor él solo, y el hotkey ya se gana su ON de fábrica.
		[8, 'tabForSearch', false, true]
	];

	const DEFAULT_CONFIG = {
		masterEnabled: true,
		panelScale: 1.15,
		// ⚑⚑ EL TAB SON DOS COSAS Y SÓLO UNA ESTABA MAL. Jorge, corrigiendo el
		// primer intento: "para la Linux y Windows sí dejar el tab search como
		// hotkey para que salga el buscador. Ahora la parte que no funciona es
		// la parte del tab search que conecta, ¿por qué es la que hace que los
		// nodos aparezcan en otro lado? Entonces déjame un toggle nuevo que me
		// deje eso apagado en Linux y prendido en Windows, pero ambos con el
		// hotkey de Tab, y así ya tenemos segmentado el error."
		//
		//   tabForSearch  — la tecla abre el buscador donde está el cursor.
		//                   PRENDIDO en las dos. Es lo que nadie discutió.
		//   tabAutoConnect— lo que pasa DESPUÉS de que el nodo nace: moverlo a
		//                   donde apretaste y encadenarlo al seleccionado.
		//                   Esa es la mitad que en Linux lo pone en otro lado.
		//
		// ⚑ Separarlas no es cosmético: es lo que convierte "Tab está roto" en
		// una pregunta que se puede contestar. Con el hotkey prendido y la
		// cadena apagada, si el nodo SIGUE naciendo lejos del cursor entonces
		// el culpable nunca fue este archivo — es el frontend colocándolo —, y
		// si nace bien, el defecto está en la mitad de abajo y ya sabemos en
		// cuál. Un switch que parte el síntoma vale más que un arreglo a ciegas.
		// ⚡ v17.84 — APAGADO de fábrica (ver la fila 5 de REDEFAULTED). Lo
		//   de arriba sigue siendo cierto y por eso no se borró nada: el
		//   hotkey funciona y está partido en tres switches. Lo que cambió es
		//   quién decide, y de fábrica esta herramienta no le quita el Tab a
		//   ComfyUI.
		// ⚡⚡ v18.51 — PRENDIDO otra vez (fila 8): la causa de "no funciona"
		//   era el evento con `canvasx` en minúsculas, y ya está arreglada.
		tabForSearch: true,
		/* ⚑⚑ v17.60 — Y LA MITAD DE ABAJO ERAN DOS MITADES TAMBIÉN.
		 *
		 * Jorge pegó el stack trace de la advertencia, y **cambia el
		 * diagnóstico entero**:
		 *
		 *     The trigger event was undefined when addNode was called.
		 *       addNode  @ GraphView-….js
		 *       emit     @ vendor-vue-core-….js
		 *       onClick  @ GraphView-….js        <-- un click de VERDAD
		 *       invoker  @ vendor-vue-core-….js
		 *
		 * Ese `invoker → onClick` es Vue atendiendo un click real sobre un
		 * resultado del buscador. O sea **la advertencia la emite ComfyUI en su
		 * propio camino**, y Jorge la vio con el Tab APAGADO, usando el doble
		 * click de la casa. No la causamos nosotros y v17.58 se la atribuyó al
		 * camino del comando: eso estaba mal y aquí queda corregido.
		 *
		 * Lo que sí deja demostrado es lo que el experimento de v17.57 fue a
		 * buscar: **el frontend pone el nodo en el centro por su cuenta.** Y si
		 * el frontend es quien lo pone mal, entonces la mitad de ImissNuke que
		 * lo MUEVE al cursor no es el culpable — **es el arreglo**, y llevaba
		 * apagada en Linux desde v17.57 por ir en el mismo switch que la que sí
		 * estaba en duda.
		 *
		 * Así que se parten, por tercera vez en esta saga y por la misma razón:
		 *
		 *   tabPlaceAtCursor — mueve el nodo recién creado a donde apretaste
		 *                      Tab. **ON en las dos.** Compensa al frontend.
		 *   tabAutoConnect   — lo encadena al nodo seleccionado. Sigue OFF en
		 *                      Linux, tal como Jorge lo pidió, porque de ésa
		 *                      todavía no hay medición.
		 *
		 * ⚑ Un switch que apaga dos cosas no mide ninguna. Van tres. */
		tabPlaceAtCursor: true,
		tabAutoConnect: !IS_LINUX,
		nukeInstantPlacement: true,        // Place newly created nodes immediately adjacent without ghost/click confirmation
		// ⚡⚡ v17.84 — LOS DOS BLOQUEADORES, APAGADOS. Parchan litegraph 1.x
		//   (`processMouseDblClick` y los `showSearchBox` / `showNodeSearchBox`
		//   / `release_link_on_empty_shows_menu` alrededor de `processMouseUp`)
		//   y bajo Nodes 2.0 el buscador lo abre Vue, que no pasa por ahí. Así
		//   que de fábrica no se traga eventos para no bloquear nada.
		disableDblClick: false,
		// ⚡ v17.94 — este switch maneja DOS parches: el viejo de litegraph 1.x
		// (que bajo Nodes 2.0 no bloquea nada) y `setupLinkReleaseBlock`, que
		// sí. Prendido de fábrica desde la fila 6 de REDEFAULTED.
		blockInputDisconnectSearch: true,  // Block the search/context menu when you UNPLUG a wire and drop it on empty canvas
		blockOutputDropSearch: false,      // Block search when dragging an output wire into empty canvas (when false, opens modern search & auto-connects)
		searchOnlyEmptyOutput: false,      // ⚡ v17.99 — OFF de fábrica (fila 7). When dropping an output wire, only open search if the output slot currently has zero connections
		lmbBoxSelect: true,
		nukeWacomZoom: true,
		/* ⚡⚡ v17.86 — SHIFT + ↑ SELECCIONA LO QUE ALIMENTA A LO SELECCIONADO.
		 *
		 * Jorge pidió "un hotkey shift up arrow para seleccionar los nodos de
		 * arriba", y "arriba" tenía dos lecturas que dan teclas distintas: los
		 * que están físicamente encima en el canvas, o los que están RÍO ARRIBA
		 * en el flujo. Contestó él: **"es a lo que esté conectado"**. Así que
		 * es el DAG, no la geometría — que además es lo que "arriba" significa
		 * en Nuke, de lo que trata este archivo entero.
		 *
		 * ⚡ UN SALTO POR PRESIÓN, y esa es toda la forma del gesto: agrega los
		 * que entran DIRECTO a lo que ya tienes. Vuelve a apretarlo y sube otro
		 * nivel, y otro — así la misma tecla contesta "lo que me alimenta" y
		 * "toda la rama de arriba" sin tener que escoger una de las dos al
		 * escribirla. Un hotkey que se traga el árbol entero de un golpe no
		 * tiene cómo darte los dos primeros.
		 *
		 * ⚡⚡ Y NACE PRENDIDO PORQUE NO LE QUITA LA TECLA A NADIE. La regla de
		 * la casa es que un switch que sale prendido es esta herramienta
		 * decidiendo por el canvas de otro — por eso `tabForSearch` nació
		 * apagado: Tab YA hacía algo en ComfyUI. Éste no consume el evento
		 * cuando no tiene nada que agregar (ver `selectUpstream`), que es la
		 * misma salida que la L usa desde que existe: sin selección, o sin
		 * nada conectado arriba, la flecha sigue de largo entera. */
		nukeSelectUpstream: true,
		// ⚑⚑ APAGADO, y no borrado. Jorge lo probó en cuanto salió: "déjame el
		// resize mode apagado, no funciona, como que se queda todo loqueado, no
		// sé por qué el nodo y todo me aparece en el mismo lugar... mejor no le
		// movamos más y apaguemos eso también, luego lo vemos."
		//
		// Apagado quiere decir INERTE: el único listener que puede armar el
		// gesto pregunta por este switch antes de tocar nada (`armed()`), así
		// que con esto en false no se guarda estado, no se traga ningún evento
		// y el botón de en medio vuelve entero al zoom y al paneo. Se queda en
		// el panel porque el día que lo veamos, lo que hay que poder hacer es
		// prenderlo y reproducirlo — no volver a escribirlo.
		nukeModResize: false,         // modifier + MMB drag over a node = resize it
		nukeModResizeKey: 'alt',      // 'alt' | 'meta' (Windows key) | 'ctrl' | 'shift'
		dKeyMode: 'bypass', // 'bypass' or 'mute'
		multiAutoConnect: false,

		// Nuke Pipes & Flow Direction Arrows
		nukeLinesEnabled: true,
		nukeArrowsEnabled: false,    // ⚑ off out of the box — see REDEFAULTED
		nukeHighlightSelected: true,
		pipeStyle: 'beveled',        // 'beveled' (QuickConnections 45°), 'curved' (90° fillet), 'orthogonal', 'straight'
		lineColorMode: 'original',   // 'nukeDark' (Nuke Black #000000), 'original' (ComfyUI Slot Type Colors)
		selectionColorMode: 'amber', // 'amber' (Foundry Nuke #e58c2c), 'white' (#ffffff)
		pipeCornerRadius: 7,
		arrowStyle: 'triangle',      // 'triangle' (like Foundry Nuke), 'chevron'
		arrowSize: 12,
		pipeWidth: 2.5,
		avoidNodes: true,
		highlightUpstreamOnly: true,

		// Nuke Canvas Background Override
		nukeBgEnabled: false,
		nukeBgStyle: 'flat',         // 'flat' (Nuke DAG gray) or 'dots' (with faint white dots)
		nukeBgColor: '#616161',      // Flat gray computed from nukeBgGrayLevel
		nukeBgGrayLevel: 38,         // Gray tone slider 12% to 85% (default 38% = authentic Nuke DAG gray #616161)
		nukeBgDotOpacity: 0.22,      // Dot intensity / opacity
 
		// Nuke Backdrops / Groups
		nukeGroupsEnabled: false,         // false = ComfyUI draws its own groups, untouched
		defaultBackdropStyle: 'normal',   // 'normal' (Fill: v18.86 = the Pixaroma group — coloured header, dark body, round corners, yellow when selected) or 'border' (hollow outline with corner cutouts)
		defaultBackdropFontSize: 24,      // Small: 18, Medium: 28, Large: 42

		// Performance — every one of them OFF, which means "change nothing".
		// A switch that ships ON is this tool deciding how somebody else's
		// canvas looks, and the quiet-defaults rule above says it does not.
		perfNoShadows: false,        // canvas.render_shadows
		perfNoLinkBorders: false,    // canvas.render_connections_border
		perfSquareCorners: false,    // LiteGraph.ROUND_RADIUS -> 0
		perfNoInfo: false,           // canvas.render_info (the corner overlay)

		__defaultsEpoch: DEFAULTS_EPOCH   // never a setting, only a watermark
	};

	function loadConfig() {
		try {
			const saved = localStorage.getItem('imissnuke_config_v9') || localStorage.getItem('imissnuke_config_v8') || localStorage.getItem('imissnuke_config_v7') || localStorage.getItem('imissnuke_config_v6') || localStorage.getItem('imissnuke_config_v5') || localStorage.getItem('imissnuke_config_v4');
			if (saved) {
				const parsed = JSON.parse(saved);
				// Migration: if user had disableDropMenu, map it
				if (parsed.disableDropMenu !== undefined) {
					if (parsed.blockInputDisconnectSearch === undefined) {
						parsed.blockInputDisconnectSearch = parsed.disableDropMenu;
					}
					if (parsed.blockOutputDropSearch === undefined) {
						parsed.blockOutputDropSearch = false;
					}
				}
				if (parsed.nukeInstantPlacement === undefined) {
					parsed.nukeInstantPlacement = true;
				}
				if (parsed.searchOnlyEmptyOutput === undefined) {
					// ⚡ v17.99 — sigue al default de hoy, que es OFF. Un config
					// viejo sin la llave no puede recibir un valor que nadie eligió.
					parsed.searchOnlyEmptyOutput = false;
				}
				if (parsed.nukeBgGrayLevel === undefined || parsed.nukeBgGrayLevel === 20) {
					parsed.nukeBgGrayLevel = 38;
				}
				const merged = { ...DEFAULT_CONFIG, ...parsed };
				// ⚑ PARSED, not merged: the merge has already taken DEFAULT_CONFIG's
				// epoch, so asking the merged object is asking today what today is.
				const bornAt = parsed.__defaultsEpoch || 1;
				if (bornAt < DEFAULTS_EPOCH) {
					// ⚑ `since > bornAt`: una fila que este config YA vivió no se
					// vuelve a aplicar. Sin eso, el epoch nuevo desharía al artista
					// que cambió de opinión después del anterior.
					for (const [since, key, was, now] of REDEFAULTED) {
						if (since > bornAt && merged[key] === was) merged[key] = now;
					}
					merged.__defaultsEpoch = DEFAULTS_EPOCH;
					saveConfig(merged);
				}
				return merged;
			}
		} catch (e) {}
		return { ...DEFAULT_CONFIG };
	}

	function saveConfig(cfg) {
		try {
			localStorage.setItem('imissnuke_config_v9', JSON.stringify(cfg));
		} catch (e) {}
	}

	const config = loadConfig();
	window.__imissNukeConfig = config;

	// ---- UTILIDADES MATEMÁTICAS PURAS (100% ORIGINALES) ----
	class GeometryUtils {
		/** Distancia perpendicular de un punto P a un segmento de línea [V, W] */
		static distToSegment(p, v, w) {
			const l2 = (w[0] - v[0]) ** 2 + (w[1] - v[1]) ** 2;
			if (l2 === 0) return Math.hypot(p[0] - v[0], p[1] - v[1]);
			let t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
			t = Math.max(0, Math.min(1, t));
			const projX = v[0] + t * (w[0] - v[0]);
			const projY = v[1] + t * (w[1] - v[1]);
			return Math.hypot(p[0] - projX, p[1] - projY);
		}

		/** Comprueba si un segmento intersecta o atraviesa una caja AABB [xmin, ymin, xmax, ymax] */
		static segmentIntersectsBox(a, b, box) {
			// Intersección real segmento/AABB (Liang-Barsky). La versión anterior sólo
			// probaba los dos extremos y el punto medio, así que un cable que cruzaba
			// un nodo casi nunca daba positivo: el splice terminaba decidiéndose por el
			// fallback de proximidad, y por eso empalmaba en cables que ni tocabas.
			if (!a || !b || !box) return false;
			const [minX, minY, maxX, maxY] = box;
			const dx = b[0] - a[0];
			const dy = b[1] - a[1];
			let t0 = 0;
			let t1 = 1;

			const clip = (p, q) => {
				if (p === 0) return q >= 0;
				const r = q / p;
				if (p < 0) {
					if (r > t1) return false;
					if (r > t0) t0 = r;
				} else {
					if (r < t0) return false;
					if (r < t1) t1 = r;
				}
				return true;
			};

			if (!clip(-dx, a[0] - minX)) return false;
			if (!clip(dx, maxX - a[0])) return false;
			if (!clip(-dy, a[1] - minY)) return false;
			if (!clip(dy, maxY - a[1])) return false;
			return true;
		}

		/** Igual que segmentIntersectsBox, pero sobre la polilínea completa del pipe */
		static polylineIntersectsBox(points, box) {
			if (!points || points.length < 2) return false;
			for (let i = 0; i < points.length - 1; i++) {
				if (GeometryUtils.segmentIntersectsBox(points[i], points[i + 1], box)) return true;
			}
			return false;
		}

		/** Distancia mínima de un punto a la polilínea completa del pipe */
		static distToPolyline(p, points) {
			if (!points || points.length < 2) return Infinity;
			let best = Infinity;
			for (let i = 0; i < points.length - 1; i++) {
				const d = GeometryUtils.distToSegment(p, points[i], points[i + 1]);
				if (d < best) best = d;
			}
			return best;
		}

		/** Ajusta luminosidad de un color hex */
		static shadeColor(color, percent) {
			if (!color || typeof color !== 'string' || !color.startsWith('#')) return color;
			let hex = color.replace('#', '');
			if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
			const num = parseInt(hex, 16);
			if (isNaN(num)) return color;
			const amt = Math.round(2.55 * percent);
			const R = Math.min(255, Math.max(0, (num >> 16) + amt));
			const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
			const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
			return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
		}

		/** Comprueba compatibilidad entre tipos de slots */
		static areTypesCompatible(t1, t2) {
			// Nodes 2.0 metió TODOS los widgets dentro de `inputs[]`, y muchos de esos
			// sockets reportan type vacío o undefined. Con la regla vieja
			// ("desconocido = compatible") cualquier búsqueda de "primer slot libre
			// compatible" acababa aterrizando en un widget al azar. Ahora desconocido
			// es INCOMPATIBLE: sólo un '*' explícito sigue siendo comodín.
			const known = (t) => t !== undefined && t !== null && t !== '' &&
				!(Array.isArray(t) && t.length === 0);
			if (!known(t1) || !known(t2)) return false;
			if (t1 === '*' || t2 === '*' || t1 === t2) return true;

			const s1 = String(Array.isArray(t1) ? t1.join(',') : t1).toUpperCase().trim();
			const s2 = String(Array.isArray(t2) ? t2.join(',') : t2).toUpperCase().trim();
			if (!s1 || !s2) return false;
			if (s1 === s2 || s1 === '*' || s2 === '*') return true;

			const parts1 = s1.split(',').map(s => s.trim());
			const parts2 = s2.split(',').map(s => s.trim());
			for (const p1 of parts1) {
				if (p1 === '*' || parts2.includes(p1) || parts2.includes('*')) return true;
			}

			try {
				if (typeof app !== 'undefined' && app.canvas && typeof app.canvas.isValidConnection === 'function') {
					if (app.canvas.isValidConnection(t1, t2)) return true;
				}
				if (typeof LGraphCanvas !== 'undefined' && typeof LGraphCanvas.prototype.isValidConnection === 'function') {
					if (LGraphCanvas.prototype.isValidConnection(t1, t2)) return true;
				}
			} catch (e) {}

			return false;
		}
	}

	// ---- NUKE CANVAS BACKGROUND OVERRIDE ENGINE ----
	class NukeCanvasBackground {
		static get DEFAULT_GRID_IMAGE() {
			return (typeof LGraphCanvas !== 'undefined' && LGraphCanvas.DEFAULT_BACKGROUND_IMAGE) ?
				LGraphCanvas.DEFAULT_BACKGROUND_IMAGE :
				'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAIDAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAQBJREFUeNrs1rEKwjAUhlETUkj3vP9rdmr1Ysammk2w5wdxuLgcMHyptfawuZX4pJSWZTnfnu/lnIe/jNNxHHGNn//HNbbv+4dr6V+11uF527arU7+u63qfa/bnmh8sWLBgwYJlqRf8MEptXPBXJXa37BSl3ixYsGDBMliwFLyCV/DeLIMFCxYsWLBMwSt4Be/NggXLYMGCBUvBK3iNruC9WbBgwYJlsGApeAWv4L1ZBgsWLFiwYJmCV/AK3psFC5bBggULloJX8BpdwXuzYMGCBctgwVLwCl7Be7MMFixYsGDBsu8FH1FaSmExVfAxBa/gvVmwYMGCZbBg/W4vAQYA5tRF9QYlv/QAAAAASUVORK5CYII=';
		}

		static init(canvas) {
			// IMISSNUKE_BG_GATE: shut = the canvas is never touched at all.
			if (!bgAllowed()) return;
			const cfg = window.__imissNukeConfig;
			NukeCanvasBackground.patchCanvas();
			if (canvas) {
				NukeCanvasBackground.applyStyle(canvas, cfg);
			}
		}

		/**
		 * Undo EXACTLY what the ON path did, and nothing else.
		 *
		 * The ON path paints with `onRenderBackground` plus three inline
		 * styles. It never assigns `clear_background_color` or
		 * `background_image` — so OFF has nothing to put back there, and the
		 * old code that wrote a hardcoded '#202020' and LiteGraph's grid
		 * image was not restoring anything: it was overwriting whatever the
		 * frontend itself was using, which is why the canvas went black on a
		 * ComfyUI whose background does not come from those two properties.
		 * (On this Windows install it happens to be '#222222', a plain hex,
		 * which is why the same build looked right here and black there.)
		 */
		static restoreOriginal(canvas) {
			if (!canvas) return;
			if (canvas.onRenderBackground) {
				delete canvas.onRenderBackground;
			}
			canvas.__imissNukeBgSig = '';
			canvas.dirty_bgcanvas = true;
			canvas.dirty_canvas = true;
		}

		static getBgColor(cfg) {
			const level = (cfg && cfg.nukeBgGrayLevel !== undefined) ? cfg.nukeBgGrayLevel : 38;
			const v = Math.max(12, Math.min(235, Math.round(255 * (level / 100))));
			const hex = v.toString(16).padStart(2, '0');
			return `#${hex}${hex}${hex}`;
		}

		static applyStyle(canvas, cfg) {
			if (!bgAllowed()) return;                 // IMISSNUKE_BG_GATE
			const fgCanvas = canvas?.canvas || document.querySelector('canvas.graphcanvas') || document.querySelector('canvas');
			const bgCanvas = canvas?.bgcanvas;
			const parent = fgCanvas?.parentElement;

			if (cfg && cfg.masterEnabled !== false && cfg.nukeBgEnabled) {
				const bgColor = NukeCanvasBackground.getBgColor(cfg);
				if (fgCanvas) {
					fgCanvas.style.backgroundColor = 'transparent';
					fgCanvas.style.backgroundImage = 'none';
				}
				if (bgCanvas) {
					bgCanvas.style.backgroundColor = bgColor;
					bgCanvas.style.backgroundImage = 'none';
				}
				if (parent) {
					parent.style.backgroundColor = bgColor;
				}
				if (canvas) {
					canvas.dirty_bgcanvas = true;
					canvas.dirty_canvas = true;
				}
			} else {
				// Give the three inline styles back to the stylesheet, drop the
				// painter, and touch nothing else. See restoreOriginal.
				if (fgCanvas) {
					fgCanvas.style.backgroundColor = '';
					fgCanvas.style.backgroundImage = '';
				}
				if (bgCanvas) {
					bgCanvas.style.backgroundColor = '';
					bgCanvas.style.backgroundImage = '';
				}
				if (parent) {
					parent.style.backgroundColor = '';
				}
				NukeCanvasBackground.restoreOriginal(canvas);
			}
		}

		static patchCanvas() {
			if (!bgAllowed()) return;                 // IMISSNUKE_BG_GATE
			if (typeof LGraphCanvas === 'undefined' || !LGraphCanvas.prototype) return;

			const targets = [LGraphCanvas.prototype];
			if (typeof app !== 'undefined' && app.canvas) {
				targets.push(app.canvas);
				const p = Object.getPrototypeOf(app.canvas);
				if (p && !targets.includes(p)) targets.push(p);
			}

			for (const target of targets) {
				if (!target) continue;
				const origDrawBackCanvas = target.drawBackCanvas;
				if (typeof origDrawBackCanvas !== 'function' || origDrawBackCanvas.__imissNukeBgPatched) continue;

				const patched = function () {
					const cfg = window.__imissNukeConfig;
					const on = !!(cfg && cfg.masterEnabled !== false && cfg.nukeBgEnabled);

					// This runs on EVERY redraw, so it does the least it can:
					// a signature compare, and work only when the answer moved.
					// It used to re-read four strings and allocate a fresh
					// closure per frame, on the canvas's own paint path.
					const sig = on ? (NukeCanvasBackground.getBgColor(cfg) + '|' + (cfg.nukeBgStyle || 'flat')) : '';
					if (sig !== this.__imissNukeBgSig) {
						this.__imissNukeBgSig = sig;
						if (on) {
							const self = this;
							const bgColor = NukeCanvasBackground.getBgColor(cfg);
							// Assigned on the instance so LiteGraph's drawBackCanvas sees a painter
							this.onRenderBackground = function (canvas, ctx) {
								const targetCanvas = canvas || self.bgcanvas;
								const targetCtx = ctx || self.bgctx;
								if (targetCanvas && targetCtx) {
									targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
									targetCtx.fillStyle = bgColor;
									targetCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);

									const c = window.__imissNukeConfig;
									if (c && c.nukeBgStyle === 'dots') {
										NukeCanvasBackground.renderDots(self, targetCtx, targetCanvas.width, targetCanvas.height, c);
									}
									return true;
								}
								return false;
							};
						} else if (this.onRenderBackground) {
							delete this.onRenderBackground;
						}
					}
					return origDrawBackCanvas.apply(this, arguments);
				};

				patched.__imissNukeBgPatched = true;
				patched.__origDrawBackCanvas = origDrawBackCanvas;
				target.drawBackCanvas = patched;
			}
		}

		static renderDots(canvasInstance, ctx, width, height, cfg) {
			const ds = canvasInstance.ds;
			const scale = ds ? ds.scale : 1.0;
			const offsetX = ds ? ds.offset[0] * scale : 0;
			const offsetY = ds ? ds.offset[1] * scale : 0;

			let step = 30 * scale;
			if (step < 14) {
				step *= 2;
			}
			if (step < 14) return;

			const startX = ((offsetX % step) + step) % step;
			const startY = ((offsetY % step) + step) % step;
			const dotOpacity = (cfg.nukeBgDotOpacity !== undefined) ? cfg.nukeBgDotOpacity : 0.18;
			const dotR = Math.max(1, Math.min(2, 1.2 * Math.sqrt(scale)));

			ctx.save();
			ctx.fillStyle = `rgba(255, 255, 255, ${dotOpacity})`;
			ctx.beginPath();
			for (let x = startX; x < width; x += step) {
				const rx = Math.round(x);
				for (let y = startY; y < height; y += step) {
					ctx.rect(rx - dotR, Math.round(y) - dotR, dotR * 2, dotR * 2);
				}
			}
			ctx.fill();
			ctx.restore();
		}
	}

	/* =====================================================================
	 * IMISSNUKE_BG_GATE — the canvas background is OFF for this studio.
	 * 2026-09-08 · pitchblack prod · Jorge: "si siempre no funciona el BG,
	 * entonces pues sí déjalo desactivado."
	 *
	 * ⚑⚑ THIS IS A DECISION, AND IT IS NOT THE SAME AS "IT IS BROKEN". It was
	 * tried both ways on purpose. One real bug came out of it and is fixed and
	 * staying fixed: the OFF path used to write a hardcoded '#202020' and
	 * LiteGraph's grid over the frontend's own background, every frame, which
	 * is what turned a facility canvas black (`restoreOriginal` now undoes
	 * exactly what the ON path did, and nothing else). But with that repaired
	 * and the gate opened again, the background still did not come good on the
	 * facility's ComfyUI — and a canvas thirty artists have to read is not the
	 * place to keep testing a preference nobody asked for.
	 *
	 * ⚑⚑ SHUT MEANS THE PATCH IS NEVER INSTALLED — not a checkbox left off.
	 * `drawBackCanvas` is never wrapped, `applyStyle` never runs, the section
	 * is not drawn. So it is also the standing MEASUREMENT: a canvas that
	 * still misbehaves is provably not ImissNuke.
	 *
	 * ⚑ TO OPEN IT (for us, per browser, no code edit and no rebuild):
	 *     localStorage.setItem('imissnuke.bg', '1')   // then reload
	 * or `window.__imissNukeAllowBg = true` before the tool loads. Everything
	 * else in the tool — hotkeys, pipes, backdrops — is untouched by this.
	 *
	 * ⚑⚑ IF YOU ARE UPDATING ImissNuke: this block is not part of upstream.
	 * Carry it across, or `check_nodekit.js` in Nuke2Comfy_ExportModule goes
	 * red on the next bake and tells you so — that check exists exactly so
	 * this cannot be forgotten quietly.
	 * ===================================================================== */
	const IMISSNUKE_BG_GATE = '2026-09-08';

	function bgAllowed() {
		try {
			if (window.__imissNukeAllowBg === true) return true;
			return window.localStorage.getItem('imissnuke.bg') === '1';
		} catch (e) {
			return false;                     // no storage, no exception: shut
		}
	}

	/* =====================================================================
	 * NODES 2.0   —   LA CAUSA, Y LA ÚNICA PALANCA QUE HAY SOBRE ELLA
	 *
	 * Jorge, después de cinco versiones persiguiendo el NaN:
	 *
	 *     "AHHH ES EL NODE 2.0 DE COMFY, PORQUE YA NO TENGO PROBLEMA SI LO
	 *      QUITO... espero te dé una pista."
	 *
	 * Sí, y es la que faltaba. **Nodes 2.0 dibuja los nodos como componentes
	 * de Vue**, no como pintura sobre el canvas — el hecho que este proyecto ya
	 * tenía anotado desde v17.53 por otro motivo ("Nodes 2.0 dibuja los nodos
	 * por su cuenta"). Y eso cambia lo que `node.pos` ES:
	 *
	 *   · con el renderer clásico, `node.pos` es DONDE ESTÁ el nodo, y quien
	 *     recibe el click es el canvas, que hace su hit-test contra ese número
	 *     — por eso repararlo alcanzaba;
	 *   · con Nodes 2.0, el que recibe el click es un ELEMENTO DEL DOM cuya
	 *     posición vive en una capa reactiva. `node.pos` pasa a ser un espejo,
	 *     y escribirle no mueve al que en realidad está en pantalla.
	 *
	 * Eso explica lo último que quedaba sin explicar: por qué el nodo seguía
	 * intocable **después** de que lo reparamos y **después** de que `holdPos`
	 * le ganó al re-NaN. Reparábamos el modelo; el que estaba roto era el DOM.
	 *
	 * ⚑⚑ Y AQUÍ NO SE PUEDE ARREGLAR, SÓLO SE PUEDE DECIR Y OFRECER.
	 * El bug es de ComfyUI (una posición calculada de un evento `undefined`) y
	 * vive dentro de una capa que este archivo no controla. Lo que sí se puede
	 * hacer es lo que Jorge ya hizo a mano: **apagar Nodes 2.0** — y ponerlo a
	 * un click en vez de a una expedición por Settings.
	 *
	 * ⚑⚑ EL AJUSTE SE BUSCA, NO SE ADIVINA. Es la regla de ⚡ Performance,
	 * palabra por palabra: una fila cuyo destino no existe **no se ofrece**, y
	 * la sección **dice** qué encontró. Aquí el destino es un id de settings de
	 * ComfyUI que cambia de nombre entre versiones, así que se PRUEBAN los
	 * deletreos conocidos preguntándole al store, y el que conteste un booleano
	 * es el que existe. Escribir en un id inventado se ve exactamente igual que
	 * un switch que funciona, que es la falla que este proyecto ya tiene
	 * nombrada tres veces.
	 * ===================================================================== */
	class NukeVueNodes {
		/* Los deletreos que ha tenido este ajuste. El primero que conteste un
		   booleano es el de este frontend. */
		static get CANDIDATES() {
			return ['Comfy.VueNodes.Enabled', 'Comfy.EnableVueNodes',
				'Comfy.VueNodes', 'Comfy.Node.VueNodes', 'LiteGraph.Node.VueNodes',
				'Comfy.Graph.VueNodes'];
		}

		static get(id) {
			try {
				if (app?.extensionManager?.setting?.get) {
					return app.extensionManager.setting.get(id);
				}
			} catch (e) {}
			try {
				if (app?.ui?.settings?.getSettingValue) {
					return app.ui.settings.getSettingValue(id);
				}
			} catch (e) {}
			return undefined;
		}

		/* El id que este frontend realmente tiene, o ''. ⚑ Se cachea porque se
		   pregunta en cada repintado del panel, y no cambia en una sesión. */
		static id() {
			if (NukeVueNodes._id !== undefined) return NukeVueNodes._id;
			NukeVueNodes._id = '';
			/* Primero por el nombre, de la lista de arriba. */
			for (const c of NukeVueNodes.CANDIDATES) {
				if (typeof NukeVueNodes.get(c) === 'boolean') {
					NukeVueNodes._id = c;
					return NukeVueNodes._id;
				}
			}
			/* Y si ninguno pegó, POR FORMA: cualquier ajuste booleano cuyo id
			   hable de nodos de Vue. Un frontend puede renombrarlo otra vez, y
			   una lista de nombres es una apuesta que caduca. */
			try {
				const ids = Object.keys((app?.ui?.settings?.settings) || {})
					.concat(Object.keys(
						(app?.extensionManager?.setting?.settingStore?.settingsById) || {}));
				for (const k of ids) {
					if (!/vue/i.test(k) || !/node/i.test(k)) continue;
					if (typeof NukeVueNodes.get(k) === 'boolean') {
						NukeVueNodes._id = k;
						break;
					}
				}
			} catch (e) {}
			return NukeVueNodes._id;
		}

		/* true / false, o null cuando este frontend no tiene el ajuste. */
		static isOn() {
			const id = NukeVueNodes.id();
			if (!id) return null;
			const v = NukeVueNodes.get(id);
			return (typeof v === 'boolean') ? v : null;
		}

		static set(on) {
			const id = NukeVueNodes.id();
			if (!id) return false;
			let wrote = false;
			try {
				if (app?.extensionManager?.setting?.set) {
					app.extensionManager.setting.set(id, on);
					wrote = true;
				}
			} catch (e) {}
			try {
				if (app?.ui?.settings?.setSettingValue) {
					app.ui.settings.setSettingValue(id, on);
					wrote = true;
				}
			} catch (e) {}
			/* ⚑ Y SE LEE DE VUELTA, siempre. Escribir en un ajuste que este
			   frontend ignora se ve idéntico a escribir en uno que funciona. */
			const back = NukeVueNodes.get(id);
			return wrote && back === on;
		}

		/* Una frase para la consola y para el tooltip. */
		static say() {
			const id = NukeVueNodes.id();
			if (!id) return 'this frontend has no Vue-nodes setting';
			return id + ' is ' + NukeVueNodes.get(id);
		}
	}

	window.NukeVueNodes = NukeVueNodes;

	/* =====================================================================
	 * PERFORMANCE — LAS COSITAS QUE CUESTAN FRAMES
	 *
	 * Jorge: "dentro del ImissNuke, ¿puedes ayudarme a hacer un switch para
	 * que deshabilite los drop shadows y estas cositas? Al parecer en Linux
	 * este tool no está funcionando."
	 *
	 * ⚑⚑ CADA FILA ES UNA PROPIEDAD CON NOMBRE, Y SE PREGUNTA SI EXISTE.
	 * Estos switches no dibujan nada: escriben banderas del renderer de
	 * litegraph. Una bandera que este frontend no tiene es un switch que no
	 * puede hacer nada — y un switch que no hace nada es exactamente el
	 * síntoma que Jorge acaba de reportar del OTRO tool. Así que la sección
	 * **no ofrece una fila cuyo destino no encontró**, y dice cuáles encontró.
	 * Esa línea es la medición: si en la Linux del estudio salen todas y aun
	 * así no cambia nada, el que las ignora es el renderer (Nodes 2.0 dibuja
	 * los nodos por su cuenta) y no este switch.
	 *
	 * ⚑⚑ LO ORIGINAL SE GUARDA ANTES DE ESCRIBIR NADA, una sola vez. Apagar y
	 * volver a prender tiene que devolver el valor con el que el frontend
	 * nació, no un número que este archivo se inventó — es la misma regla que
	 * `restoreOriginal` del fondo de canvas aprendió a la mala.
	 * ===================================================================== */
	class NukePerformance {
		static canvas() {
			try {
				return (typeof app !== 'undefined' && app.canvas) ? app.canvas : null;
			} catch (e) { return null; }
		}

		static lg() {
			try { return (typeof LiteGraph !== 'undefined') ? LiteGraph : null; }
			catch (e) { return null; }
		}

		// ⚑ Una sola foto, y sólo cuando ya hay canvas: tomarla antes de que
		// exista guardaría `undefined` como "lo original".
		static snapshot() {
			if (NukePerformance._orig) return NukePerformance._orig;
			const c = NukePerformance.canvas();
			const LG = NukePerformance.lg();
			if (!c || !LG) return null;
			NukePerformance._orig = {
				render_shadows: c.render_shadows,
				render_connections_border: c.render_connections_border,
				render_info: c.render_info,
				show_info: c.show_info,
				ROUND_RADIUS: LG.ROUND_RADIUS,
				DEFAULT_SHADOW_COLOR: LG.DEFAULT_SHADOW_COLOR
			};
			return NukePerformance._orig;
		}

		static get ROWS() {
			return [
				{
					key: 'perfNoShadows',
					id: 'in-sw-perf-shadows',
					label: 'Disable node shadows',
					tip: 'The drop shadow under every node. On a graph with two hundred nodes it is the cheapest frame you can buy back.',
					has: () => {
						const c = NukePerformance.canvas();
						return !!c && ('render_shadows' in c);
					},
					names: ['canvas.render_shadows', 'LiteGraph.DEFAULT_SHADOW_COLOR'],
					set: (off, o) => {
						const c = NukePerformance.canvas(), LG = NukePerformance.lg();
						if (c) c.render_shadows = off ? false : o.render_shadows;
						// ⚑⚑ Y EL COLOR TAMBIÉN. Son dos mecanismos para una
						// sola cosa visible, y este switch existe justamente
						// porque en algún lado la bandera sola no alcanzó.
						if (LG && ('DEFAULT_SHADOW_COLOR' in LG)) {
							LG.DEFAULT_SHADOW_COLOR = off ? 'rgba(0,0,0,0)'
								: o.DEFAULT_SHADOW_COLOR;
						}
					}
				},
				{
					key: 'perfNoLinkBorders',
					id: 'in-sw-perf-borders',
					label: 'Disable connection borders',
					tip: 'The dark outline litegraph draws around every wire — a second stroke per link, on top of the one you see.',
					has: () => {
						const c = NukePerformance.canvas();
						return !!c && ('render_connections_border' in c);
					},
					names: ['canvas.render_connections_border'],
					set: (off, o) => {
						const c = NukePerformance.canvas();
						if (c) c.render_connections_border = off ? false : o.render_connections_border;
					}
				},
				{
					key: 'perfSquareCorners',
					id: 'in-sw-perf-corners',
					label: 'Disable rounded corners',
					tip: 'Square node corners. Rounded ones are an arc per corner, four per node, every frame.',
					has: () => {
						const LG = NukePerformance.lg();
						return !!LG && typeof LG.ROUND_RADIUS === 'number';
					},
					names: ['LiteGraph.ROUND_RADIUS'],
					set: (off, o) => {
						const LG = NukePerformance.lg();
						if (LG) LG.ROUND_RADIUS = off ? 0 : o.ROUND_RADIUS;
					}
				},
				{
					key: 'perfNoInfo',
					id: 'in-sw-perf-info',
					label: 'Hide the canvas info overlay',
					tip: 'The little counter litegraph paints in the corner (nodes, links, fps). It is redrawn on every frame.',
					/* ⚡ v18.51 — Y EN ESTE FRONTEND SE LLAMA `show_info`. Jorge vio la
					   fila caer a "not on this frontend: canvas.render_info": el
					   ComfyUI de hoy dibuja ese contador con `canvas.show_info` (lo
					   escribe su ajuste Comfy.Graph.CanvasInfo) y ya no publica
					   `render_info`. Se preguntan las DOS, y el switch escribe la que
					   exista — la regla de la sección: una fila por propiedad que SÍ
					   está. */
					has: () => {
						const c = NukePerformance.canvas();
						return !!c && (('render_info' in c) || ('show_info' in c));
					},
					names: ['canvas.render_info', 'canvas.show_info'],
					set: (off, o) => {
						const c = NukePerformance.canvas();
						if (!c) return;
						if ('render_info' in c) c.render_info = off ? false : o.render_info;
						if ('show_info' in c) c.show_info = off ? false : o.show_info;
					}
				}
			];
		}

		/* Which rows this ComfyUI can actually act on. ⚑ Asked of the live
		   canvas every time and never cached: `/object_info`'s lesson one repo
		   over — the canvas lands after this file does. */
		static found() {
			const out = { have: [], missing: [] };
			NukePerformance.ROWS.forEach(r => {
				let ok = false;
				try { ok = !!r.has(); } catch (e) { ok = false; }
				(ok ? out.have : out.missing).push(r);
			});
			return out;
		}

		static apply(cfg) {
			const o = NukePerformance.snapshot();
			if (!o) return false;
			NukePerformance.ROWS.forEach(r => {
				let ok = false;
				try { ok = !!r.has(); } catch (e) { ok = false; }
				if (!ok) return;
				try { r.set(!!(cfg && cfg[r.key]), o); } catch (e) {}
			});
			const c = NukePerformance.canvas();
			if (c) {
				c.dirty_canvas = true;
				c.dirty_bgcanvas = true;
				if (c.setDirty) c.setDirty(true, true);
			}
			return true;
		}
	}

	// ---- NUKE BACKDROPS / GROUPS ENHANCEMENT ENGINE ----
	class NukeBackdropManager {
		static init() {
			if (typeof LGraphGroup !== 'undefined') {
				NukeBackdropManager.patchGroupDraw();
				NukeBackdropManager.patchGroupMenu();
			}
			NukeBackdropManager.setupHeaderButtonListener();
		}

		// ⚑⚑ WHY THIS LISTENER EXISTS — the header buttons were dead on the
		// artists' Linux boxes and alive on the box this was written on, and the
		// difference is not the OS. It is WHEN ImissNuke gets loaded.
		//
		// litegraph binds its pointer handlers exactly once, in bindEvents():
		//
		//     this._mousedown_callback = this.processMouseDown.bind(this);
		//     canvas.addEventListener('pointerdown', this._mousedown_callback, true);
		//
		// bind() copies the function it finds AT THAT MOMENT. Loaded from
		// custom_nodes we patch LGraphCanvas.prototype.processMouseDown before the
		// canvas is ever built, so the copy litegraph keeps is the patched one and
		// the hit test runs. Run from the Scene Manager panel — which eval's this
		// file into a page whose canvas has existed for minutes — the copy is the
		// ORIGINAL, and every prototype patch made afterwards is invisible to the
		// mouse forever.
		//
		// Everything DRAWN kept working, because group.draw(...) is looked up on
		// the prototype on every frame. That is the whole shape of the bug: the
		// buttons were painted by the new code and clicked into the old one.
		//
		// So the hit test does not live on the prototype. It lives here, on
		// window, in the capture phase — the same shape the zoom and pan handlers
		// in this file already use, and for the same reason.
		static setupHeaderButtonListener() {
			if (NukeBackdropManager._headerListener) return;
			NukeBackdropManager._headerListener = true;

			const onDown = (e) => {
				if (!e || e.button !== 0 || e.__imissNukeGroupBtn) return;
				const cfg = window.__imissNukeConfig || {};
				if (cfg.masterEnabled === false || cfg.nukeGroupsEnabled === false) return;

				const canvas = (typeof app !== 'undefined' && app.canvas) ? app.canvas : null;
				const graph = canvas ? canvas.graph : null;
				if (!canvas || !graph || !graph._groups || !graph._groups.length) return;

				// ⚑ Only when the press landed on the graph canvas ITSELF. Anything
				// floating over it — a menu, a dialog, a DOM widget, the selection
				// toolbox — is a real click on a real element and none of our
				// business; this is the half of "se están tapando" we must not win.
				if (!canvas.canvas || e.target !== canvas.canvas) return;

				const p = NukeBackdropManager.pointerToGraph(canvas, e);
				if (!p) return;

				for (let i = graph._groups.length - 1; i >= 0; --i) {
					const group = graph._groups[i];
					const hit = NukeBackdropManager.checkButtonHit(group, p[0], p[1]);
					if (!hit) continue;
					e.__imissNukeGroupBtn = true;
					NukeBackdropManager._swallowPointerId = (e.pointerId === undefined) ? 0 : e.pointerId;
					NukeBackdropManager.handleButtonClick(group, hit, canvas);
					e.preventDefault();
					e.stopPropagation();
					if (e.stopImmediatePropagation) e.stopImmediatePropagation();
					return;
				}
			};

			// ⚑ The matching release goes with it. litegraph never saw the press,
			// so letting the release through would hand it half a gesture — which
			// is how a click on a button ends up dragging the backdrop.
			const onUp = (e) => {
				// ⚑ 0 is a real pointerId and `undefined` already means "nothing
				// pending", so the two never share a value: an event without a
				// pointerId at all (a synthetic MouseEvent) is stored as 0.
				const want = NukeBackdropManager._swallowPointerId;
				if (!e || want === undefined || want === null) return;
				if (((e.pointerId === undefined) ? 0 : e.pointerId) !== want) return;
				NukeBackdropManager._swallowPointerId = undefined;
				e.preventDefault();
				e.stopPropagation();
				if (e.stopImmediatePropagation) e.stopImmediatePropagation();
			};

			window.addEventListener('pointerdown', onDown, { capture: true });
			window.addEventListener('pointerup', onUp, { capture: true });
		}

		// ⚑⚑ graph_mouse IS NOT THE CURSOR AT PRESS TIME. litegraph writes it
		// inside processMouseMove, so at the moment of the press it still holds
		// where the pointer was on the last MOVE. A mouse always moves before it
		// clicks; a Wacom pen coming down out of hover does not, and neither does
		// a press that follows a zoom. The event knows where it happened — ask it,
		// and keep graph_mouse as the last resort rather than the first answer.
		static pointerToGraph(canvas, e) {
			if (!canvas || !e) return null;
			try {
				if (typeof canvas.convertEventToCanvasOffset === 'function') {
					const p = canvas.convertEventToCanvasOffset(e);
					if (p && isFinite(p[0]) && isFinite(p[1])) return [p[0], p[1]];
				}
			} catch (err) {}
			try {
				const el = canvas.canvas;
				const ds = canvas.ds;
				if (el && ds && ds.offset && ds.scale && typeof el.getBoundingClientRect === 'function') {
					const r = el.getBoundingClientRect();
					const x = (e.clientX - r.left) / ds.scale - ds.offset[0];
					const y = (e.clientY - r.top) / ds.scale - ds.offset[1];
					if (isFinite(x) && isFinite(y)) return [x, y];
				}
			} catch (err) {}
			if (canvas.graph_mouse) return [canvas.graph_mouse[0], canvas.graph_mouse[1]];
			return null;
		}

		// ⚑⚑ WHERE A BACKDROP'S TITLE SIZE ACTUALLY LIVES. LGraphGroup.serialize()
		// writes { id, title, bounding, color, flags } and NOTHING else, so
		// font_size is a runtime field that never reaches the .json: a size picked
		// with S/M/L was gone by the next reload. flags IS serialized (it is where
		// pinned lives, and where this file already keeps backdropStyle), so that
		// is where the size is written and where it is read from first.
		//
		// ⚑ And the panel's "Title Font Size" is for the groups NOBODY has sized.
		// litegraph hands every group its own GROUP_TEXT_SIZE, so font_size is
		// never falsy and the old `this.font_size || cfg.default…` could not fall
		// through to the default even once. A group still carrying litegraph's own
		// number is a group nobody has touched.
		static resolveFontSize(group, cfg) {
			const flagged = group && group.flags ? group.flags.imissNukeFontSize : 0;
			if (flagged > 0) return flagged;
			const liteDefault = (typeof LiteGraph !== 'undefined' && LiteGraph.GROUP_TEXT_SIZE) || 24;
			if (group && group.font_size > 0 && group.font_size !== liteDefault) return group.font_size;
			return (cfg && cfg.defaultBackdropFontSize) || liteDefault;
		}

		// ---- v18.86: lo que el Fill de Pixaroma necesita ----
		// el highlight de un backdrop seleccionado: el de Pixaroma es su naranja
		// (#f66744); Jorge lo pidió amarillo.
		static get HILITE() { return '#facc15'; }
		// un grupo sin color: el neutro con el que Pixaroma crea los suyos
		static get PIX_HEAD() { return '#4a4a4e'; }
		static get PIX_BODY() { return '#2a2a2a'; }

		static hex6(hex) {
			const s = String(hex || '').trim();
			let m = /^#?([0-9a-f]{6})$/i.exec(s);
			if (m) return m[1];
			m = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(s);
			return m ? (m[1] + m[1] + m[2] + m[2] + m[3] + m[3]) : '';
		}

		// Pixaroma's darkBodyFor: 15 % del color en el neutro #242424 — el
		// mismo cuerpo que los nodos header only (ImissNukeColorPicker).
		static darkBody(hex) {
			const h = NukeBackdropManager.hex6(hex);
			const c = h ? [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)) : [36, 36, 36];
			return '#' + c.map(ch => Math.round(0.85 * 0x24 + 0.15 * ch).toString(16).padStart(2, '0')).join('');
		}

		// Pixaroma's ink: blanco, salvo sobre un header claro
		static ink(hex) {
			const h = NukeBackdropManager.hex6(hex);
			if (!h) return '#ffffff';
			const n = parseInt(h, 16);
			const lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
			return lum > 0.62 ? '#1a1a1a' : '#ffffff';
		}

		static isSelected(group) {
			return !!(group && (group.selected || group.is_selected));
		}

		// las líneas se miden en pixeles de pantalla, como en Pixaroma
		static viewScale(canvas) {
			const s = canvas && canvas.ds && canvas.ds.scale;
			return (s > 0) ? s : 1;
		}

		static roundRect(ctx, x, y, w, h, r) {
			r = Math.max(0, Math.min(r, w / 2, h / 2));
			ctx.beginPath();
			ctx.moveTo(x + r, y);
			ctx.arcTo(x + w, y, x + w, y + h, r);
			ctx.arcTo(x + w, y + h, x, y + h, r);
			ctx.arcTo(x, y + h, x, y, r);
			ctx.arcTo(x, y, x + w, y, r);
			ctx.closePath();
		}

		// esquinas de arriba redondas y abajo rectas: la forma del header
		static roundRectTop(ctx, x, y, w, h, r) {
			r = Math.max(0, Math.min(r, w / 2, h));
			ctx.beginPath();
			ctx.moveTo(x, y + h);
			ctx.lineTo(x, y + r);
			ctx.arcTo(x, y, x + r, y, r);
			ctx.lineTo(x + w - r, y);
			ctx.arcTo(x + w, y, x + w, y + r, r);
			ctx.lineTo(x + w, y + h);
			ctx.closePath();
		}

		static patchGroupDraw() {
			if (typeof LGraphGroup === 'undefined' || !LGraphGroup.prototype || LGraphGroup.prototype.draw.__imissNukePatched) return;
			const origDraw = LGraphGroup.prototype.draw;

			LGraphGroup.prototype.draw = function (canvas, ctx) {
				const cfg = window.__imissNukeConfig || {};
				// Off = ComfyUI draws its own group, byte for byte. Same early
				// return the master switch uses, so there is one way out and
				// not two: nothing of ours runs, so there is nothing of ours
				// to undo afterwards.
				if (cfg.masterEnabled === false || cfg.nukeGroupsEnabled === false) {
					// ⚑ and the buttons go with it: a rect left over from the last
					// time we drew is a live click target for something that is no
					// longer on the screen.
					this._imissNukeButtons = null;
					return origDraw.apply(this, arguments);
				}

				const [x, y] = this._pos;
				const [w, h] = this._size;
				const color = this.color || LGraphGroup.defaultColour || '#335';
				// ⚑ v18.16 — los toggles de este header son nuestros: los de
				// rgthree no se dibujan encima en este cuadro.
				NukeBackdropManager.hushRgthreeOverlay();
				const isBorder = (this.flags?.backdropStyle === 'border') || (this.backdropStyle === 'border') || (this.flags?.backdropStyle === undefined && cfg.defaultBackdropStyle === 'border');
				const fontSize = NukeBackdropManager.resolveFontSize(this, cfg);
				const titleHeight = Math.max(30, Math.round(fontSize * 1.15) + 6);
				const cornerCut = 14;

				ctx.save();

				if (isBorder) {
					// ---- 1. BORDER MODE (NUKE HOLLOW OUTLINE) ----
					// Interior remains hollow/transparent (no body fill)
					ctx.lineWidth = 6;
					ctx.strokeStyle = color;
					ctx.lineJoin = 'miter';

					// Draw perimeter with 45° beveled corners
					ctx.beginPath();
					ctx.moveTo(x + cornerCut, y);
					ctx.lineTo(x + w - cornerCut, y);
					ctx.lineTo(x + w, y + cornerCut);
					ctx.lineTo(x + w, y + h - cornerCut);
					ctx.lineTo(x + w - cornerCut, y + h);
					ctx.lineTo(x + cornerCut, y + h);
					ctx.lineTo(x, y + h - cornerCut);
					ctx.lineTo(x, y + cornerCut);
					ctx.closePath();
					ctx.stroke();

					// Nuke corner fill tabs/miters (45° solid accents like Foundry Nuke)
					ctx.fillStyle = color;
					// Top-Left corner tab
					ctx.beginPath();
					ctx.moveTo(x, y + cornerCut);
					ctx.lineTo(x + cornerCut, y);
					ctx.lineTo(x + cornerCut, y + cornerCut);
					ctx.closePath();
					ctx.fill();
					// Top-Right corner tab
					ctx.beginPath();
					ctx.moveTo(x + w - cornerCut, y);
					ctx.lineTo(x + w, y + cornerCut);
					ctx.lineTo(x + w - cornerCut, y + cornerCut);
					ctx.closePath();
					ctx.fill();
					// Bottom-Left corner tab
					ctx.beginPath();
					ctx.moveTo(x, y + h - cornerCut);
					ctx.lineTo(x + cornerCut, y + h);
					ctx.lineTo(x + cornerCut, y + h - cornerCut);
					ctx.closePath();
					ctx.fill();
					// Bottom-Right corner tab
					ctx.beginPath();
					ctx.moveTo(x + w, y + h - cornerCut);
					ctx.lineTo(x + w - cornerCut, y + h);
					ctx.lineTo(x + w - cornerCut, y + h - cornerCut);
					ctx.closePath();
					ctx.fill();

					// Title Badge Box at top
					ctx.font = `bold ${fontSize}px sans-serif`;
					const titleText = (this.title || 'Group') + (this.pinned ? ' 📌' : '');
					const textMetrics = ctx.measureText(titleText);
					const maxBadgeW = Math.max(100, w - 190);
					const badgeWidth = Math.min(maxBadgeW, Math.max(110, textMetrics.width + 24));

					ctx.fillStyle = color;
					ctx.fillRect(x + cornerCut, y, badgeWidth, titleHeight);

					// Black title text inside badge (Foundry Nuke reference)
					ctx.fillStyle = '#000000';
					ctx.textAlign = 'left';
					ctx.textBaseline = 'middle';
					ctx.fillText(titleText, x + cornerCut + 10, y + titleHeight / 2 + 1);

					// ⚑ v18.86 — y seleccionado, el mismo amarillo que el Fill
					if (NukeBackdropManager.isSelected(this)) {
						ctx.globalAlpha = 1.0;
						ctx.lineWidth = 2.5 / NukeBackdropManager.viewScale(canvas);
						ctx.strokeStyle = NukeBackdropManager.HILITE;
						ctx.beginPath();
						ctx.moveTo(x + cornerCut, y);
						ctx.lineTo(x + w - cornerCut, y);
						ctx.lineTo(x + w, y + cornerCut);
						ctx.lineTo(x + w, y + h - cornerCut);
						ctx.lineTo(x + w - cornerCut, y + h);
						ctx.lineTo(x + cornerCut, y + h);
						ctx.lineTo(x, y + h - cornerCut);
						ctx.lineTo(x, y + cornerCut);
						ctx.closePath();
						ctx.stroke();
					}

				} else {
					// ---- 2. NORMAL MODE — v18.86: EL GRUPO DE PIXAROMA ----
					// Jorge, con un grupo de Pixaroma enfrente: "¿podemos copiar
					// los grupos de Pixaroma, el estilo, para nuestros backdrops?
					// Están padrísimos. Adaptemos el estilo y el highlight pero en
					// amarillo… y el header". Sus mismos números (`drawOne` en
					// js/pixgroup, MIT, © 2026 pixaroma): esquinas de 8, el HEADER
					// del color al 92 %, el cuerpo oscuro de su `darkBodyFor` al
					// 50 %, el borde fino del color, el título en 600 Segoe UI
					// blanco (oscuro sobre un header claro) y la esquina de resize
					// que sigue la curva. Su highlight es su naranja; el nuestro,
					// amarillo. Es el mismo look que los nodos header only (v18.83).
					// ⚑ Sigue siendo un LGraphGroup de ComfyUI: lo único que cambia
					// es cómo se dibuja. Sin color, el neutro de Pixaroma.
					const ea = (canvas.editor_alpha || 1.0);
					const scale = NukeBackdropManager.viewScale(canvas);
					const sel = NukeBackdropManager.isSelected(this);
					const head = this.color ? color : NukeBackdropManager.PIX_HEAD;
					const body = this.color ? NukeBackdropManager.darkBody(color) : NukeBackdropManager.PIX_BODY;
					const R = 8;
					const hH = Math.min(titleHeight, h);

					// el cuerpo
					ctx.globalAlpha = 0.5 * ea;
					ctx.fillStyle = body;
					NukeBackdropManager.roundRect(ctx, x, y, w, h, R);
					ctx.fill();

					// el header, con las esquinas de arriba redondas
					ctx.globalAlpha = 0.92 * ea;
					ctx.fillStyle = head;
					NukeBackdropManager.roundRectTop(ctx, x, y, w, hH, R);
					ctx.fill();

					// el borde: fino del color, o el amarillo si está seleccionado
					ctx.globalAlpha = (sel ? 1.0 : 0.92) * ea;
					ctx.strokeStyle = sel ? NukeBackdropManager.HILITE : head;
					ctx.lineWidth = (sel ? 2.5 : 1.5) / scale;
					NukeBackdropManager.roundRect(ctx, x, y, w, h, R);
					ctx.stroke();

					// el título
					ctx.globalAlpha = 1.0;
					ctx.font = `600 ${fontSize}px 'Segoe UI', system-ui, sans-serif`;
					const titleText = (this.title || 'Group') + (this.pinned ? ' 📌' : '');
					ctx.fillStyle = NukeBackdropManager.ink(head);
					ctx.textAlign = 'left';
					ctx.textBaseline = 'middle';
					ctx.fillText(titleText, x + 12, y + hH / 2 + 1);

					// la esquina de resize, dentro de la curva
					const L = Math.max(LGraphGroup.resizeLength || 10, R + 4);
					ctx.globalAlpha = (sel ? 1.0 : 0.85) * ea;
					ctx.fillStyle = head;
					ctx.beginPath();
					ctx.moveTo(x + w, y + h - L);
					ctx.lineTo(x + w, y + h - R);
					ctx.arcTo(x + w, y + h, x + w - R, y + h, R);
					ctx.lineTo(x + w - L, y + h);
					ctx.closePath();
					ctx.fill();
					ctx.globalAlpha = 1.0;
				}

				// Bottom-right resize handle triangle (el Fill ya trae la suya)
				if (isBorder) {
					const resizeLen = LGraphGroup.resizeLength || 10;
					ctx.fillStyle = color;
					ctx.globalAlpha = 1.0;
					ctx.beginPath();
					ctx.moveTo(x + w, y + h);
					ctx.lineTo(x + w - resizeLen, y + h);
					ctx.lineTo(x + w, y + h - resizeLen);
					ctx.closePath();
					ctx.fill();
				}

				// ---- 3. RENDER INTERACTIVE HEADER BUTTONS ----
				NukeBackdropManager.renderGroupHeaderButtons(this, ctx, x, y, w, titleHeight, isBorder, fontSize,
					(isBorder || this.color) ? color : NukeBackdropManager.PIX_HEAD);

				ctx.restore();
			};
			LGraphGroup.prototype.draw.__imissNukePatched = true;
		}

		static renderGroupHeaderButtons(group, ctx, x, y, w, titleHeight, isBorder, currentFontSize, color) {
			// ⚑⚑ THE ROW GROWS WITH THE TITLE. These were fixed at 20px tall with
			// a 10px label whatever the header did, so picking L gave a 55px bar
			// with the same four thumbnails in it and it read as broken rather
			// than as large. Everything below is measured off the title size, so
			// S / M / L moves the whole row and not just the words behind it.
			const uiScale = Math.max(0.75, Math.min(2.0, (currentFontSize || 24) / 24));
			const btnH = Math.max(14, Math.min(titleHeight - 6, Math.round(18 * uiScale)));
			const btnY = y + Math.round((titleHeight - btnH) / 2);
			const labelPx = Math.max(9, Math.round(10.5 * uiScale));

			const fBtnW = Math.round(22 * uiScale);
			const fBtnGap = Math.max(2, Math.round(3 * uiScale));
			// ⚑⚑ v18.16 — LOS TRES DE LA ORILLA DERECHA YA SON NUESTROS. Jorge:
			// "para el background de Nuke, cuando se prenda, ¿se pudiera prender
			// el tool que tenemos del rgthree de mandar por grupos? Y también
			// integrar esos botones con el estilo de nuestro grupo, para que
			// parezca unificado… asegúrate de que funcionen como cuando está el
			// grupo default."
			//
			// Esos ~105 px se guardaban para ▶ / bypass / mute de rgthree
			// ("Show fast toggles in Group Headers"), que dibuja ENCIMA de este
			// header con `group.color` — el mismo color que la barra: por eso en
			// la foto se ven como fantasmas. Ahora son tres pastillas como S/M/L,
			// siempre a la vista con los backdrops de Nuke prendidos (con o sin
			// el setting de rgthree), y hacen EXACTAMENTE lo que hace rgthree:
			// ▶ llama `rgthree.queueOutputNodes` con las salidas del grupo;
			// bypass y mute usan su misma regla de toggle. Ver `groupAction`. El
			// dibujo de rgthree se calla mientras dibujamos nosotros
			// (`hushRgthreeOverlay`), para que no salgan dos juegos.
			const trioW = fBtnW * 3 + fBtnGap * 2;
			const trioPad = Math.round(8 * uiScale);
			const rightMargin = trioW + trioPad + Math.round(12 * uiScale);
			const styleBtnW = Math.round(54 * uiScale);
			/* ⚑ v17.65 — y el de renombrar, del ancho de una S/M/L: es un icono,
			   no una palabra, y la fila ya está apretada contra los botones
			   nativos de ComfyUI. */
			const renW = fBtnW;
			const clusterW = renW + 6 + styleBtnW + 6 + (fBtnW * 3) + (fBtnGap * 2);

			let fontL_X, fontM_X, fontS_X, styleBtnX, renX;
			let queueX, bypassX, muteX;

			// ⚑ the threshold is the cluster's own width plus room for a title,
			// not the 340 that only ever described the row at one font size.
			if (w >= rightMargin + clusterW + 120) {
				// Position comfortably to the left of the ▶ / bypass / mute trio
				fontL_X = x + w - rightMargin - fBtnW;
				fontM_X = fontL_X - fBtnGap - fBtnW;
				fontS_X = fontM_X - fBtnGap - fBtnW;
				styleBtnX = fontS_X - 6 - styleBtnW;
				renX = styleBtnX - 6 - renW;
				muteX = x + w - trioPad - fBtnW;
				bypassX = muteX - fBtnGap - fBtnW;
				queueX = bypassX - fBtnGap - fBtnW;
			} else {
				// Narrow group: place directly after title badge
				renX = x + Math.round(115 * uiScale);
				styleBtnX = renX + renW + 6;
				fontS_X = styleBtnX + styleBtnW + 5;
				fontM_X = fontS_X + fBtnW + fBtnGap;
				fontL_X = fontM_X + fBtnW + fBtnGap;
				queueX = fontL_X + fBtnW + 6;
				bypassX = queueX + fBtnW + fBtnGap;
				muteX = bypassX + fBtnW + fBtnGap;
			}

			group._imissNukeButtons = {
				rename: [renX, btnY, renW, btnH],
				styleBtn: [styleBtnX, btnY, styleBtnW, btnH],
				fontS: [fontS_X, btnY, fBtnW, btnH],
				fontM: [fontM_X, btnY, fBtnW, btnH],
				fontL: [fontL_X, btnY, fBtnW, btnH],
				queue: [queueX, btnY, fBtnW, btnH],
				bypass: [bypassX, btnY, fBtnW, btnH],
				mute: [muteX, btnY, fBtnW, btnH],
				// ⚑ y el lugar donde rgthree cree que están los suyos (su hit test
				// es su propia cuenta: 20 px, a 6 del borde, cada 26). Un click ahí
				// se lo queda esta fila y no hace nada más: si llegara a rgthree,
				// su toggle correría ADEMÁS del nuestro — dos toggles son cero.
				rgZone: [x + w - 26 * 3, y + 6, 26 * 3, 20]
			};

			ctx.save();
			ctx.font = isBorder ? `bold ${labelPx}px sans-serif`
				: `600 ${labelPx}px 'Segoe UI', system-ui, sans-serif`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';

			// ⚑ v18.86 — en el Fill (el grupo de Pixaroma) las pastillas son las
			// suyas: un velo claro sobre el header, sin borde, la letra en su
			// tinta; encendida, el velo más fuerte (su "hot"). Border no cambia.
			const pix = !isBorder;
			const pInk = NukeBackdropManager.ink(color);
			const pLight = pInk === '#ffffff';

			// Helper to draw button matching the exact backdrop color
			const drawBtn = (rect, text, active) => {
				const [bx, by, bw, bh] = rect;
				ctx.beginPath();
				if (typeof ctx.roundRect === 'function') {
					// ⚑ the corner follows the size too, or a 32px pill keeps a
					// 3px corner and stops reading as the same control.
					ctx.roundRect(bx, by, bw, bh, Math.max(pix ? 4 : 3, Math.round((pix ? 4 : 3) * uiScale)));
				} else {
					ctx.rect(bx, by, bw, bh);
				}

				if (pix) {
					ctx.globalAlpha = 1.0;
					ctx.fillStyle = pLight
						? (active ? 'rgba(255,255,255,0.34)' : 'rgba(255,255,255,0.13)')
						: (active ? 'rgba(0,0,0,0.30)' : 'rgba(0,0,0,0.13)');
					ctx.fill();
					if (text) {
						ctx.fillStyle = pInk;
						ctx.globalAlpha = active ? 1.0 : 0.85;
						ctx.fillText(text, bx + bw / 2, by + bh / 2 + 0.5);
					}
					ctx.globalAlpha = 1.0;
					return;
				}

				if (active) {
					// Selected button: soft tenue tone matching backdrop color with clean white highlight
					ctx.fillStyle = color;
					ctx.globalAlpha = 0.75;
					ctx.fill();
					ctx.lineWidth = 1;
					ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
					ctx.globalAlpha = 0.90;
					ctx.stroke();

					ctx.fillStyle = '#ffffff';
					ctx.globalAlpha = 1.0;
					ctx.fillText(text, bx + bw / 2, by + bh / 2 + 0.5);
				} else {
					// Inactive button: subtle dark tint blending into backdrop
					ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
					ctx.globalAlpha = 0.50;
					ctx.fill();
					ctx.lineWidth = 1;
					ctx.strokeStyle = color;
					ctx.globalAlpha = 0.45;
					ctx.stroke();

					ctx.fillStyle = '#d4d4d8';
					ctx.globalAlpha = 0.85;
					ctx.fillText(text, bx + bw / 2, by + bh / 2 + 0.5);
				}
			};

			// Draw style toggle button
			/* ⚑ v17.65 — el lápiz primero, que es el orden en que se lee la fila:
			   cómo se LLAMA, luego cómo se VE. Nunca sale "activo": renombrar es un
			   acto, no un estado, y pintarlo encendido diría que algo está puesto. */
			drawBtn([renX, btnY, renW, btnH], '✎', false);
			drawBtn([styleBtnX, btnY, styleBtnW, btnH], isBorder ? 'Border' : 'Fill', isBorder);

			// Draw font size buttons
			drawBtn([fontS_X, btnY, fBtnW, btnH], 'S', currentFontSize === 18);
			drawBtn([fontM_X, btnY, fBtnW, btnH], 'M', currentFontSize === 28 || (currentFontSize !== 18 && currentFontSize !== 42));
			drawBtn([fontL_X, btnY, fBtnW, btnH], 'L', currentFontSize === 42);

			// ⚑ v18.16 — ▶ / bypass / mute: la MISMA pastilla que S/M/L, con el
			// icono dibujado (no un glifo: en las Linux del estudio `👁` sale en
			// la fuente que haya). Encendida = todo el grupo en ese modo, que es
			// lo mismo que el icono de rgthree dice con su forma.
			const st = NukeBackdropManager.groupModeState(group);
			const iconBtn = (rect, kind, on, dim) => {
				drawBtn(rect, '', on);
				const [bx, by, bw, bh] = rect;
				ctx.save();
				ctx.fillStyle = ctx.strokeStyle = pix ? pInk : (on ? '#ffffff' : '#d4d4d8');
				ctx.globalAlpha = (on ? 1.0 : 0.85) * (dim ? 0.4 : 1.0);
				// ⚑ un icono que no se pudo dibujar no se lleva el header entero
				try {
					NukeBackdropManager.paintGroupIcon(ctx, kind, bx + bw / 2, by + bh / 2,
						Math.max(8, Math.min(bw, bh) - Math.round(6 * uiScale)), on);
				} catch (e) {}
				ctx.restore();
			};
			iconBtn([queueX, btnY, fBtnW, btnH], 'queue', false, !st.outputs);
			iconBtn([bypassX, btnY, fBtnW, btnH], 'bypass', st.allBypassed, false);
			iconBtn([muteX, btnY, fBtnW, btnH], 'mute', st.allMuted, false);

			ctx.restore();
		}

		/* ⚑⚑ v18.16 — LOS ICONOS DE rgthree, CON NUESTRA TINTA. Son sus mismos
		 * trazos (`feature_group_fast_toggle.js`: la flecha, el cable con el
		 * puntito que se salta el nodo, el ojo) medidos desde el tamaño de la
		 * pastilla en vez de sus 20 px fijos, para que S/M/L los escale igual
		 * que al resto de la fila. */
		static paintGroupIcon(ctx, kind, cx, cy, s, on) {
			const g = s / 8;
			ctx.lineJoin = 'round';
			ctx.lineCap = 'round';
			ctx.lineWidth = Math.max(1.2, g * 0.75);
			if (kind === 'queue') {
				const ax = s * 0.6, ay = s * 0.7;
				ctx.beginPath();
				ctx.moveTo(cx - ax / 2, cy - ay / 2);
				ctx.lineTo(cx + ax / 2, cy);
				ctx.lineTo(cx - ax / 2, cy + ay / 2);
				ctx.closePath();
				ctx.fill();
				return;
			}
			if (kind === 'bypass') {
				const x0 = cx - s / 2;
				ctx.beginPath();
				ctx.moveTo(x0, cy);
				if (on) {
					// el cable se salta el nodo: un arco por encima del puntito
					ctx.arc(x0 + g * 3, cy, g * 3, Math.PI, 0, false);
					ctx.lineTo(x0 + s, cy);
				} else {
					ctx.lineTo(x0 + s, cy);
				}
				ctx.moveTo(x0 + s, cy); ctx.lineTo(x0 + s - g, cy + g);
				ctx.moveTo(x0 + s, cy); ctx.lineTo(x0 + s - g, cy - g);
				ctx.stroke();
				ctx.beginPath();
				ctx.arc(x0 + g * 3, cy, g * 1.6, 0, Math.PI * 2);
				ctx.fill();
				return;
			}
			if (kind === 'mute') {
				const x0 = cx - s / 2, x1 = cx + s / 2;
				ctx.beginPath();
				if (on) {
					// muteado: el ojo cerrado, con pestañas
					ctx.moveTo(x0, cy);
					ctx.bezierCurveTo(x0 + g * 1.5, cy + g * 2.5, x1 - g * 1.5, cy + g * 2.5, x1, cy);
					for (let i = -2; i <= 2; i++) {
						const px = cx + i * g * 1.6;
						const py = cy + g * 1.9 - Math.abs(i) * g * 0.35;
						ctx.moveTo(px, py);
						ctx.lineTo(px + i * g * 0.35, py + g * 1.3);
					}
					ctx.stroke();
				} else {
					// abierto
					ctx.moveTo(x0, cy);
					ctx.bezierCurveTo(x0 + g * 1.5, cy - g * 2.5, x1 - g * 1.5, cy - g * 2.5, x1, cy);
					ctx.bezierCurveTo(x1 - g * 1.5, cy + g * 2.5, x0 + g * 1.5, cy + g * 2.5, x0, cy);
					ctx.stroke();
					ctx.beginPath();
					ctx.arc(cx, cy, g * 1.5, 0, Math.PI * 2);
					ctx.fill();
				}
			}
		}

		/* ⚑⚑ LOS NODOS DE UN GRUPO, POR LA MISMA PUERTA QUE rgthree
		 * (`getGroupNodes`: `group._children` filtrado a nodos). `fresh`
		 * recalcula quién está adentro — rgthree lo hace antes de un toggle y
		 * NO al dibujar, y aquí igual: recalcular en cada cuadro por cada grupo
		 * es trabajo que el dibujo no necesita. */
		static groupNodes(group, fresh) {
			if (!group) return [];
			if (fresh) {
				try { if (group.recomputeInsideNodes) group.recomputeInsideNodes(); } catch (e) {}
			}
			let items = [];
			try {
				items = group._children ? Array.from(group._children)
					: (group._nodes || group.nodes || []);
			} catch (e) { items = []; }
			const LGN = (typeof LGraphNode !== 'undefined') ? LGraphNode
				: (window.LiteGraph && window.LiteGraph.LGraphNode) || null;
			return items.filter(n => n && (LGN ? n instanceof LGN
				: (n.type !== undefined && Array.isArray(n.inputs))));
		}

		// rgthree's `getOutputNodes`, word for word: not muted, and the server
		// says it is an output node.
		static groupOutputs(nodes) {
			const NEVER = (typeof LiteGraph !== 'undefined' && LiteGraph.NEVER != null) ? LiteGraph.NEVER : 2;
			return (nodes || []).filter(n => n.mode != NEVER
				&& n.constructor && n.constructor.nodeData && n.constructor.nodeData.output_node);
		}

		static groupModeState(group) {
			const L = (typeof LiteGraph !== 'undefined') ? LiteGraph : {};
			const ALWAYS = L.ALWAYS != null ? L.ALWAYS : 0;
			const NEVER = L.NEVER != null ? L.NEVER : 2;
			// ⚑ quién está adentro se recalcula, pero no en CADA cuadro: medido,
			// `_children` se queda vacío en un grupo recién hecho hasta que algo
			// lo recalcula (arrastrarlo), y entonces ▶ salía apagado sobre un
			// Preview. Una vez cada 3/4 de segundo por grupo es de sobra para
			// un icono y no le cuesta nada al dibujo.
			const now = Date.now();
			const due = !group._imissKidsAt || (now - group._imissKidsAt) > 750;
			if (due) group._imissKidsAt = now;
			const nodes = NukeBackdropManager.groupNodes(group, due);
			let anyActive = false;
			let allMuted = nodes.length > 0;
			let allBypassed = allMuted;
			for (const n of nodes) {
				anyActive = anyActive || n.mode === ALWAYS;
				allMuted = allMuted && n.mode === NEVER;
				allBypassed = allBypassed && n.mode === 4;
			}
			return {
				nodes: nodes.length,
				outputs: NukeBackdropManager.groupOutputs(nodes).length,
				allMuted: !anyActive && allMuted,
				allBypassed: !anyActive && !allMuted && allBypassed
			};
		}

		/* ⚑⚑ LO QUE HACE UN CLICK EN ▶ / bypass / mute — la regla de rgthree
		 * (`feature_group_fast_toggle.js`), no una parecida:
		 *   · ▶ encola SÓLO las salidas del grupo. Con rgthree cargado es su
		 *     propia `queueOutputNodes` (el mismo camino que su botón); sin él,
		 *     `app.queuePrompt(0, 1, ids)`, que es la ejecución parcial del
		 *     frontend (la de "Queue Selected Output Nodes").
		 *   · bypass / mute: si TODO el grupo ya está en ese modo, vuelve a
		 *     activo; si no, todo pasa a ese modo. Bajando a los subgrafos,
		 *     como `changeModeOfNodes`.
		 */
		static groupAction(group, kind, canvas) {
			const nodes = NukeBackdropManager.groupNodes(group, true);
			const say = (msg) => {
				try {
					if (window.rgthree && window.rgthree.showMessage) {
						window.rgthree.showMessage({ id: 'imiss-no-output', type: 'warn', timeout: 4000, message: msg });
						return;
					}
				} catch (e) {}
				try {
					const t = app && app.extensionManager && app.extensionManager.toast;
					if (t && t.add) { t.add({ severity: 'warn', summary: msg, life: 4000 }); return; }
				} catch (e) {}
				console.warn('[ImissNuke] ' + msg);
			};
			if (kind === 'queue') {
				const outs = NukeBackdropManager.groupOutputs(nodes);
				if (!outs.length) { say('No output nodes in this backdrop'); return 0; }
				try {
					if (window.rgthree && typeof window.rgthree.queueOutputNodes === 'function') {
						window.rgthree.queueOutputNodes(outs);
					} else if (typeof app !== 'undefined' && app.queuePrompt) {
						app.queuePrompt(0, 1, outs.map(n => n.id));
					}
				} catch (e) { console.warn('[ImissNuke] queue group failed', e); }
				return outs.length;
			}
			const L = (typeof LiteGraph !== 'undefined') ? LiteGraph : {};
			const ALWAYS = L.ALWAYS != null ? L.ALWAYS : 0;
			const NEVER = L.NEVER != null ? L.NEVER : 2;
			const anyActive = nodes.some(n => n.mode === ALWAYS);
			const allMuted = !anyActive && nodes.every(n => n.mode === NEVER);
			const allBypassed = !anyActive && !allMuted && nodes.every(n => n.mode === 4);
			const mode = (kind === 'mute')
				? (allMuted ? ALWAYS : NEVER)
				: (allBypassed ? ALWAYS : 4);
			const g = canvas && canvas.graph;
			try { if (g && g.beforeChange) g.beforeChange(); } catch (e) {}
			const stack = nodes.slice();
			let n = 0;
			while (stack.length) {
				const nd = stack.pop();
				nd.mode = mode;
				n++;
				try {
					if (nd.isSubgraphNode && nd.isSubgraphNode() && nd.subgraph) {
						const kids = nd.subgraph.nodes || [];
						for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i]);
					}
				} catch (e) {}
			}
			try { if (g && g.afterChange) g.afterChange(); } catch (e) {}
			try { if (g && g.change) g.change(); } catch (e) {}
			return n;
		}

		/* ⚑⚑ QUE NO SALGAN DOS JUEGOS. rgthree dibuja sus toggles DESPUÉS de los
		 * grupos, dentro del mismo `drawGroups`, y sólo si tiene un
		 * `lastCanvasMouseEvent` (es lo que usa para saber sobre qué grupo está
		 * el mouse). Mientras nosotros dibujamos un header se lo quitamos por
		 * ESE cuadro, y se lo devolvemos en cuanto el cuadro termina (una
		 * microtarea: corre en cuanto el dibujo suelta la pila, antes de que
		 * llegue el siguiente evento del mouse). No se toca su config ni se
		 * guarda nada: con los backdrops de Nuke apagados esto no corre y sus
		 * toggles salen como siempre. */
		static hushRgthreeOverlay() {
			const rg = window.rgthree;
			if (!rg || !rg.lastCanvasMouseEvent || NukeBackdropManager._rgHush) return;
			const ev = rg.lastCanvasMouseEvent;
			NukeBackdropManager._rgHush = true;
			rg.lastCanvasMouseEvent = null;
			Promise.resolve().then(() => {
				NukeBackdropManager._rgHush = false;
				if (rg.lastCanvasMouseEvent === null) rg.lastCanvasMouseEvent = ev;
			});
		}

		static checkButtonHit(group, mouseX, mouseY) {
			if (!group || !group._imissNukeButtons) return null;
			const btns = group._imissNukeButtons;
			// ⚑ two graph-units of slack all round. At the zoom people actually
			// work at, an 18px pill is a handful of screen pixels and the edge of
			// it is not a fair target.
			const pad = 2;
			for (const key of ['rename', 'styleBtn', 'fontS', 'fontM', 'fontL',
				'queue', 'bypass', 'mute', 'rgZone']) {
				const rect = btns[key];
				if (rect && mouseX >= rect[0] - pad && mouseX <= rect[0] + rect[2] + pad
					&& mouseY >= rect[1] - pad && mouseY <= rect[1] + rect[3] + pad) {
					return key;
				}
			}
			return null;
		}

		// ⚑ Both places, always: font_size is what litegraph draws with right
		// now, flags.imissNukeFontSize is the only one of the two that is still
		// there after a save. See resolveFontSize.
		static setFontSize(group, px) {
			if (!group) return;
			if (!group.flags) group.flags = {};
			group.flags.imissNukeFontSize = px;
			group.font_size = px;
		}

		/* ⚑⚑ EL RENAME, EN UN SOLO LUGAR. Jorge: "desactívame el cambio del
		 * botón del grupo porque sí es molesto y aparece mucho, quiero mejor un
		 * botón en el backdrop de rename."
		 *
		 * Tenía razón en las dos mitades. El campo en la tira del panel se
		 * plantaba encima de la barra cada vez que un backdrop quedaba
		 * seleccionado —y un backdrop queda seleccionado todo el tiempo, porque
		 * un paste de Nuke los selecciona junto con sus nodos—, así que estorbaba
		 * mucho más de lo que servía. Y el sitio correcto es **el backdrop**:
		 * ahí ya viven Fill/S/M/L, es donde se ve el nombre, y es donde la mano
		 * ya está.
		 *
		 * ⚑ La ACCIÓN ya existía en el menú contextual del grupo desde antes.
		 * Este botón no la reimplementa: la llama. Dos formas de renombrar que
		 * se escriben por separado son dos comportamientos que mantener en paso,
		 * y es la regla que el hotbox sigue desde v3.53 ("el anillo LLAMA las
		 * funciones de la tira, nunca las reimplementa").
		 */
		static renameGroup(group) {
			if (!group) return;
			const c = (typeof app !== 'undefined' ? app.canvas : null);
			const done = (v) => {
				if (v == null) return;
				group.title = String(v);
				try {
					if (c) c.setDirty(true, true);
					const g = c && c.graph;
					if (g && g.change) g.change();
				} catch (e) {}
			};
			/* ⚑ El diálogo del propio litegraph primero: es el que el artista ya
			   conoce, sale donde está el nodo y no bloquea la página. `prompt`
			   del navegador es el último recurso — congela la pestaña entera y
			   en algunos navegadores ni sale. */
			if (c && typeof c.prompt === 'function') {
				try { c.prompt('Title', group.title, done); return; } catch (e) {}
			}
			try { done(window.prompt('Backdrop name', group.title || '')); }
			catch (e) {}
		}

		static handleButtonClick(group, btnKey, canvas) {
			if (!group) return;
			if (!group.flags) group.flags = {};

			if (btnKey === 'rename') {
				NukeBackdropManager.renameGroup(group);
				return;                      /* el diálogo repinta cuando cierra */
			}
			/* ⚑ v18.16 — el hueco donde rgthree cree tener sus toggles: el click
			   se queda aquí y no hace nada (ver `rgZone`). */
			if (btnKey === 'rgZone') return;
			if (btnKey === 'queue' || btnKey === 'bypass' || btnKey === 'mute') {
				NukeBackdropManager.groupAction(group, btnKey, canvas);
				if (canvas) {
					canvas.setDirty(true, true);
					if (canvas.draw) canvas.draw(true, true);
				}
				return;
			}
			if (btnKey === 'styleBtn') {
				const current = (group.flags.backdropStyle === 'border') || (group.backdropStyle === 'border');
				const next = current ? 'normal' : 'border';
				group.flags.backdropStyle = next;
				group.backdropStyle = next;
			} else if (btnKey === 'fontS') {
				NukeBackdropManager.setFontSize(group, 18);
			} else if (btnKey === 'fontM') {
				NukeBackdropManager.setFontSize(group, 28);
			} else if (btnKey === 'fontL') {
				NukeBackdropManager.setFontSize(group, 42);
			}

			if (canvas) {
				canvas.setDirty(true, true);
				if (canvas.draw) canvas.draw(true, true);
			}
		}

		static patchGroupMenu() {
			if (typeof LGraphGroup === 'undefined' || !LGraphGroup.prototype || LGraphGroup.prototype.getMenuOptions.__imissNukePatched) return;
			const origGetMenu = LGraphGroup.prototype.getMenuOptions;

			LGraphGroup.prototype.getMenuOptions = function () {
				const opts = origGetMenu ? (origGetMenu.apply(this, arguments) || []) : [];
				const group = this;
				const isBorder = (group.flags?.backdropStyle === 'border') || (group.backdropStyle === 'border');
				const currentSize = NukeBackdropManager.resolveFontSize(group, window.__imissNukeConfig || {});

				opts.unshift({
					content: '✏ Rename Group / Backdrop',
					callback: () => { NukeBackdropManager.renameGroup(group); }
				});

				opts.push(null); // separator
				opts.push({
					content: isBorder ? '✔ Backdrop Style: Border (Outline)' : 'Backdrop Style: Border (Outline)',
					callback: () => {
						if (!group.flags) group.flags = {};
						group.flags.backdropStyle = 'border';
						group.backdropStyle = 'border';
						if (typeof app !== 'undefined' && app.canvas) app.canvas.setDirty(true, true);
					}
				});
				opts.push({
					content: !isBorder ? '✔ Backdrop Style: Fill (Normal)' : 'Backdrop Style: Fill (Normal)',
					callback: () => {
						if (!group.flags) group.flags = {};
						group.flags.backdropStyle = 'normal';
						group.backdropStyle = 'normal';
						if (typeof app !== 'undefined' && app.canvas) app.canvas.setDirty(true, true);
					}
				});

				opts.push(null); // separator
				opts.push({
					content: (currentSize === 18) ? '✔ Font Size: Small (18px)' : 'Font Size: Small (18px)',
					callback: () => {
						NukeBackdropManager.setFontSize(group, 18);
						if (typeof app !== 'undefined' && app.canvas) app.canvas.setDirty(true, true);
					}
				});
				opts.push({
					content: (currentSize === 28) ? '✔ Font Size: Medium (28px)' : 'Font Size: Medium (28px)',
					callback: () => {
						NukeBackdropManager.setFontSize(group, 28);
						if (typeof app !== 'undefined' && app.canvas) app.canvas.setDirty(true, true);
					}
				});
				opts.push({
					content: (currentSize === 42) ? '✔ Font Size: Large (42px)' : 'Font Size: Large (42px)',
					callback: () => {
						NukeBackdropManager.setFontSize(group, 42);
						if (typeof app !== 'undefined' && app.canvas) app.canvas.setDirty(true, true);
					}
				});

				return opts;
			};
			LGraphGroup.prototype.getMenuOptions.__imissNukePatched = true;
		}
	}

	// ---- CLASE PRINCIPAL: IMISSNUKE MANAGER ----
	class ImissNukeManager {
		static init() {
			if (ImissNukeManager._initialized) {
				if (typeof app !== 'undefined' && app.canvas) {
					ImissNukeManager.setupDblClickBlock(config.disableDblClick);
					ImissNukeManager.syncComfyNavigationMode(config.lmbBoxSelect);
					ImissNukeManager.syncInstantPlacement(config.nukeInstantPlacement);
					// ⚑ Un segundo init() es la única oportunidad que tiene el enganche
					// de Tab si en el primero todavía no existía `app.graph` — que es
					// justo lo que pasa cargando desde custom_nodes. Poner un parche
					// que ya está puesto no cuesta nada.
					ImissNukeManager.setupAutoConnectOnAdd();
					ImissNukeManager.setupModifierResize();
					if (window.NukePipeRenderer) window.NukePipeRenderer.init(app.canvas);
					NukeCanvasBackground.init(app.canvas);
					NukeBackdropManager.init();
					NukePerformance.apply(config);
					// ⚑ mount, not just repaint. A second init() is what the panel
					// toggle and ComfyUI's own setup() both call, and it is the only
					// chance the button gets to walk to the tip on a page that is
					// already up. It is a no-op once it is there.
					ImissNukeUI.mountTopBarButton();
				}
				return;
			}
			ImissNukeManager._initialized = true;

			console.log('%c[ImissNuke]%c Initializing Nuke Hotkeys & Workflow Extension...', 'color:#60a5fa;font-weight:bold;', 'color:auto;');
			/* ⚑ Y qué renderer hay, en la misma línea de arranque: es el hecho
			   que decide si el Tab puede funcionar, y hasta hoy había que
			   descubrirlo a mano. */
			try {
				const vue = NukeVueNodes.isOn();
				if (vue !== null) {
					console.log('[ImissNuke] ' + NukeVueNodes.say()
						+ (vue ? ' — Nodes 2.0 draws nodes as DOM elements, and it '
							+ 'is what makes a Tab-created node unclickable. There '
							+ 'is a switch for it in the ImissNuke panel.' : ''));
				}
			} catch (e) {}

			ImissNukeUI.init();
			ImissNukeUI.updateTopBarState();
			if (window.NukePipeRenderer) window.NukePipeRenderer.init(typeof app !== 'undefined' ? app.canvas : null);
			NukeCanvasBackground.init(typeof app !== 'undefined' ? app.canvas : null);
			NukeBackdropManager.init();
			NukePerformance.apply(config);
			ImissNukeManager.setupAutoConnectOnAdd();
			ImissNukeManager.syncComfyNavigationMode(config.lmbBoxSelect);
			ImissNukeManager.syncInstantPlacement(config.nukeInstantPlacement);
			ImissNukeManager.setupGhostPlacementBypass();
			ImissNukeManager.setupLimboSafetyListener();
			// ⚑ ANTES que el zoom: los dos escuchan window en captura y el primero
			// en registrarse es el primero en correr. El resize necesita poder
			// detener el evento antes de que el zoom lo tome.
			ImissNukeManager.setupPointerTracker();
			ImissNukeManager.setupModifierResize();
			ImissNukeManager.setupWacomAndMouseZoom();
			ImissNukeManager.setupDropMenuBlock();
			// ⚡ v17.94 — el bloqueo que SÍ alcanza al frontend nuevo. Necesita
			// el `linkConnector` del canvas para llegar a su prototipo, así que
			// también se reintenta en los dos timeouts de abajo: es idempotente.
			ImissNukeManager.setupLinkReleaseBlock();
			ImissNukeManager.setupDblClickBlock(config.disableDblClick);
			ImissNukeManager.setupTabSearch(config.tabForSearch);
			ImissNukeManager.patchSelectionOrderTracker();
			ImissNukeManager.setupHotkeys();
			ImissNukeManager.setupDropSpliceAndSwap();

			setTimeout(() => {
				ImissNukeManager.syncComfyNavigationMode(config.lmbBoxSelect);
				ImissNukeManager.syncInstantPlacement(config.nukeInstantPlacement);
				ImissNukeManager.setupAutoConnectOnAdd();
				ImissNukeManager.setupLinkReleaseBlock();
				if (typeof app !== 'undefined' && app.canvas) NukeCanvasBackground.applyStyle(app.canvas, config);
				NukePerformance.apply(config);
			}, 500);
			setTimeout(() => {
				ImissNukeManager.syncComfyNavigationMode(config.lmbBoxSelect);
				ImissNukeManager.syncInstantPlacement(config.nukeInstantPlacement);
				ImissNukeManager.setupAutoConnectOnAdd();
				ImissNukeManager.setupLinkReleaseBlock();
				if (typeof app !== 'undefined' && app.canvas) NukeCanvasBackground.applyStyle(app.canvas, config);
				NukePerformance.apply(config);
			}, 1500);
		}

		// ---- 1. SINCRONIZACIÓN DE NAVEGACIÓN COMFYUI (LMB = SELECT) ----
		static syncComfyNavigationMode(enabled) {
			try {
				if (typeof app === 'undefined') return;
				const targetBehavior = enabled ? 'select' : 'panning';
				const targetNavMode = enabled ? 'custom' : 'legacy';

				if (app.ui && app.ui.settings) {
					const settingsObj = app.ui.settings.settings || {};
					const list = Array.isArray(settingsObj) ? settingsObj : Object.values(settingsObj);
					for (const s of list) {
						if (!s || !s.id) continue;
						const id = s.id.toLowerCase();
						const name = (s.name || '').toLowerCase();

						if (id.includes('leftclick') || id.includes('left_click') || id.includes('leftmouse') || name.includes('left mouse click') || name.includes('left click')) {
							let valToSet = enabled ? 'Select' : 'Panning';
							if (s.options) {
								const matchedOpt = s.options.find(o => {
									const str = (typeof o === 'string' ? o : (o.text || o.value || o.id || '')).toLowerCase();
									return str.includes(targetBehavior);
								});
								if (matchedOpt) {
									valToSet = (typeof matchedOpt === 'object' && matchedOpt.value !== undefined) ? matchedOpt.value : matchedOpt;
								}
							}
							app.ui.settings.setSettingValue(s.id, valToSet);
						}

						if (id.includes('navigationmode') || id.includes('navigation_mode') || name.includes('navigation mode')) {
							let modeToSet = enabled ? 'Custom' : 'Legacy';
							if (s.options) {
								const matchedOpt = s.options.find(o => {
									const str = (typeof o === 'string' ? o : (o.text || o.value || o.id || '')).toLowerCase();
									return str.includes(targetNavMode);
								});
								if (matchedOpt) {
									modeToSet = (typeof matchedOpt === 'object' && matchedOpt.value !== undefined) ? matchedOpt.value : matchedOpt;
								}
							}
							app.ui.settings.setSettingValue(s.id, modeToSet);
						}
					}
				}

				if (app.extensionManager && app.extensionManager.setting) {
					const extSettings = app.extensionManager.setting.settings || {};
					const list = Array.isArray(extSettings) ? extSettings : Object.values(extSettings);
					for (const s of list) {
						if (!s || !s.id) continue;
						const id = s.id.toLowerCase();
						const name = (s.name || '').toLowerCase();
						if (id.includes('leftclick') || id.includes('leftmouse') || name.includes('left mouse click')) {
							app.extensionManager.setting.set(s.id, enabled ? 'Select' : 'Panning');
						}
					}
				}

				if (app.canvas) {
					if ('canvasNavigationMode' in app.canvas) app.canvas.canvasNavigationMode = enabled ? 'custom' : 'legacy';
					if ('leftClickBehavior' in app.canvas) app.canvas.leftClickBehavior = enabled ? 'select' : 'panning';
					if ('use_box_selection' in app.canvas) app.canvas.use_box_selection = enabled;
				}
			} catch (e) {
				console.warn('[ImissNuke] Error syncing ComfyUI navigation setting:', e);
			}
		}

		// ---- 2. WACOM & MOUSE SMOOTH ZOOM (MMB + LMB) ----
		// ---- 2. WACOM & MOUSE SMOOTH ZOOM & PANNING (MMB + LMB) ----
		static isZoomEvent(e) {
			if (!e) return false;
			const isDownOrUp = e.type ? (e.type.includes('down') || e.type.includes('up')) : false;

			// Middle mouse button held or pressed
			const hasMiddle = ((e.buttons & 4) !== 0) || (isDownOrUp && (e.button === 1 || e.which === 2));
			if (!hasMiddle) return false;

			// Alt + Middle is Nuke's classic keyboard+mouse zoom
			if (e.altKey) return true;

			// Check pen vs mouse:
			const isPen = e.pointerType === 'pen';

			// Wacom stylus:
			// While hovering in air: buttons & 1 is 0, pressure is 0.
			// When tip touches tablet surface: buttons has 1 (buttons === 5 with MMB), or pressure > 0.05.
			const hasPenTip = isPen && (((e.buttons & 1) !== 0) || (isDownOrUp && e.button === 0) || (e.pressure !== undefined && e.pressure > 0.05));

			// Standard mouse:
			// Normal MMB drag has buttons = 4.
			// Simultaneous MMB + LMB has buttons = 5 (1 + 4).
			// CRUCIAL: NEVER check e.pressure for mouse, because in W3C spec e.pressure is 0.5 whenever any mouse button is down!
			const hasMouseLeft = !isPen && (((e.buttons & 1) !== 0) || (isDownOrUp && (e.button === 0 || e.which === 1)) || (e.buttons === 5));

			return hasPenTip || hasMouseLeft;
		}

		static setupWacomAndMouseZoom() {
			if (typeof LGraphCanvas === 'undefined') return;

			if (LGraphCanvas.prototype.processMouseDown && !LGraphCanvas.prototype.processMouseDown.__imissNukePatched) {
				const origMouseDown = LGraphCanvas.prototype.processMouseDown;
				LGraphCanvas.prototype.processMouseDown = function (e) {
					const cfg = window.__imissNukeConfig;

					// Group/Backdrop header button. The window listener in
					// NukeBackdropManager normally reaches the press first and
					// stamps it; this stays for the callers that reach
					// processMouseDown directly (ComfyUI forwards middle-button
					// events that way) and for the load order where our patch is
					// the one litegraph actually bound.
					if (e && e.button === 0 && !e.__imissNukeGroupBtn && this.graph && this.graph._groups
						&& (cfg || {}).masterEnabled !== false && (cfg || {}).nukeGroupsEnabled !== false) {
						const p = NukeBackdropManager.pointerToGraph(this, e);
						for (let i = p ? this.graph._groups.length - 1 : -1; i >= 0; --i) {
							const group = this.graph._groups[i];
							const hit = NukeBackdropManager.checkButtonHit(group, p[0], p[1]);
							if (hit) {
								e.__imissNukeGroupBtn = true;
								NukeBackdropManager.handleButtonClick(group, hit, this);
								return false;
							}
						}
					}

					// Nuke Swap Drag: Ctrl + Shift + Click on a Node
					if (e && e.button === 0 && e.ctrlKey && e.shiftKey && this.graph && this.graph_mouse) {
						const node = this.graph.getNodeOnPos ? this.graph.getNodeOnPos(
							this.graph_mouse[0], this.graph_mouse[1], this.visible_nodes
						) : null;
						if (node) {
							window.__nukeSwapDraggedNode = node;
							window.__nukeSwapOriginalPos = [node.pos[0], node.pos[1]];
							node._nukeOriginalPos = [node.pos[0], node.pos[1]];

							if (typeof this.selectNode === 'function') {
								this.selectNode(node, false);
							}
							this.node_dragged = node;
							this.node_dragging = true;
							this.dragging_canvas = false;
							this.selected_nodes = {};
							this.selected_nodes[node.id] = node;
							this.current_node = node;
							this.last_mouse_position = [e.clientX, e.clientY];
							this.setDirty(true, true);
							return false;
						}
					}

					if (cfg && cfg.nukeWacomZoom && ImissNukeManager.isZoomEvent(e)) {
						window.__nukeZoomState = { startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY };
						window.__nukePanState = null;
						this.dragging_canvas = false;
						return false;
					}
					// Marcar el nodo que de verdad empieza a arrastrarse. Nodes 2.0 elimino
					// `canvas.node_dragged`, y sin esta marca el splice de Shift+drop no
					// tiene forma de distinguir un drag de NODO de un drag de CABLE (o de
					// un simple Shift+click), que es justo lo que lo hacia conectar cosas
					// al azar.
					if (e && e.button === 0 && !e.ctrlKey && this.graph) {
						let hit = null;
						try {
							// Derivar la coordenada del propio evento: `graph_mouse` sigue
							// siendo el ultimo pointermove, que con pluma Wacom o tactil
							// puede no existir todavia en el pointerdown.
							let gp = null;
							if (typeof this.convertEventToCanvasOffset === 'function') {
								gp = this.convertEventToCanvasOffset(e);
							}
							if (!gp && this.graph_mouse) gp = this.graph_mouse;
							hit = (gp && this.graph.getNodeOnPos)
								? this.graph.getNodeOnPos(gp[0], gp[1], this.visible_nodes)
								: null;
						} catch (err) {}
						if (hit && hit.pos) {
							window.__nukeSpliceDraggedNode = hit;
							window.__nukeSpliceStartPos = [hit.pos[0], hit.pos[1]];
						} else {
							window.__nukeSpliceDraggedNode = null;
							window.__nukeSpliceStartPos = null;
						}
					}
					return origMouseDown.call(this, e);
				};
				LGraphCanvas.prototype.processMouseDown.__imissNukePatched = true;
			}

			if (LGraphCanvas.prototype.processMouseMove && !LGraphCanvas.prototype.processMouseMove.__imissNukePatched) {
				const origMouseMove = LGraphCanvas.prototype.processMouseMove;
				LGraphCanvas.prototype.processMouseMove = function (e) {
					if (window.__nukeSwapDraggedNode && (e.buttons & 1) !== 0) {
						const node = window.__nukeSwapDraggedNode;
						if (this.last_mouse_position && this.ds) {
							const dx = (e.clientX - this.last_mouse_position[0]) / this.ds.scale;
							const dy = (e.clientY - this.last_mouse_position[1]) / this.ds.scale;
							node.pos[0] += dx;
							node.pos[1] += dy;
							this.last_mouse_position = [e.clientX, e.clientY];
							this.setDirty(true, true);
							return false;
						}
					}

					const cfg = window.__imissNukeConfig;
					if (cfg && cfg.nukeWacomZoom) {
						if (ImissNukeManager.isZoomEvent(e)) {
							this.dragging_canvas = false;
							return false;
						}
						if ((e.buttons & 4) !== 0) {
							// Handled directly by onDirectMove for 100% smooth mouse and Wacom hover panning
							return false;
						}
					}
					return origMouseMove.call(this, e);
				};
				LGraphCanvas.prototype.processMouseMove.__imissNukePatched = true;
			}

			if (LGraphCanvas.prototype.processMouseUp && !LGraphCanvas.prototype.processMouseUp.__imissNukePatched) {
				const origMouseUp = LGraphCanvas.prototype.processMouseUp;
				LGraphCanvas.prototype.processMouseUp = function (e) {
					window.__nukeZoomState = null;
					window.__nukePanState = null;

					if (window.__nukeSwapDraggedNode) {
						const draggedNode = window.__nukeSwapDraggedNode;
						const origPos = window.__nukeSwapOriginalPos || draggedNode._nukeOriginalPos;
						window.__nukeSwapDraggedNode = null;
						window.__nukeSwapOriginalPos = null;

						let targetNode = null;
						if (this.graph && this.graph._nodes) {
							const gx = this.graph_mouse ? this.graph_mouse[0] : draggedNode.pos[0];
							const gy = this.graph_mouse ? this.graph_mouse[1] : draggedNode.pos[1];
							for (let i = this.graph._nodes.length - 1; i >= 0; --i) {
								const n = this.graph._nodes[i];
								if (!n || n === draggedNode || !n.pos) continue;
								const nw = (n.size && n.size[0]) || 140;
								const nh = (n.size && n.size[1]) || 60;
								if (gx >= n.pos[0] && gx <= n.pos[0] + nw && gy >= n.pos[1] && gy <= n.pos[1] + nh) {
									targetNode = n;
									break;
								}
							}
						}

						if (targetNode) {
							ImissNukeManager.swapNodes(draggedNode, targetNode, origPos, this.graph, this);
						}
					}

					return origMouseUp.apply(this, arguments);
				};
				LGraphCanvas.prototype.processMouseUp.__imissNukePatched = true;
			}

			if (!window.__imissNukeDirectZoomListener) {
				const onDirectMove = (e) => {
					const cfg = window.__imissNukeConfig;
					if (!cfg || cfg.masterEnabled === false || !cfg.nukeWacomZoom) return;

					// 1. ZOOM: Middle + Left, or Middle + Pen Tip Touch, or Alt + Middle
					if (ImissNukeManager.isZoomEvent(e)) {
						window.__nukePanState = null;
						if (!window.__nukeZoomState) {
							window.__nukeZoomState = { startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY };
						}
						const zs = window.__nukeZoomState;
						const dy = zs.lastY - e.clientY;
						const dx = e.clientX - zs.lastX;
						zs.lastX = e.clientX;
						zs.lastY = e.clientY;

						const delta = (Math.abs(dy) >= Math.abs(dx)) ? dy : dx;
						if (Math.abs(delta) >= 0.1 && typeof app !== 'undefined' && app.canvas) {
							const canvas = app.canvas;
							const factor = Math.exp(delta * 0.007);
							const canvasEl = canvas.canvas || document.querySelector('canvas.graphcanvas') || document.querySelector('canvas');
							const rect = canvasEl ? canvasEl.getBoundingClientRect() : { left: 0, top: 0 };
							const canvasX = e.clientX - rect.left;
							const canvasY = e.clientY - rect.top;

							if (canvas.ds && typeof canvas.ds.changeDeltaScale === 'function') {
								canvas.ds.changeDeltaScale(factor, [canvasX, canvasY]);
							} else if (typeof canvas.setZoom === 'function' && canvas.ds) {
								const curScale = canvas.ds.scale || 1;
								canvas.setZoom(Math.max(0.08, Math.min(12, curScale * factor)), [canvasX, canvasY]);
							}
							canvas.setDirty(true, true);
							canvas.dragging_canvas = false;
							if (app.graph && app.graph.change) app.graph.change();
						}
						e.preventDefault();
						e.stopPropagation();
						return;
					}

					if (window.__nukeZoomState) {
						window.__nukeZoomState = null;
					}

					// 2. PANNING: Middle Button held alone (Mouse MMB or Wacom Stylus Hover in mid-air)
					const hasMiddleOnly = ((e.buttons & 4) !== 0) && !e.altKey;
					if (hasMiddleOnly && typeof app !== 'undefined' && app.canvas && app.canvas.ds) {
						if (!window.__nukePanState) {
							window.__nukePanState = { lastX: e.clientX, lastY: e.clientY };
						}
						const ps = window.__nukePanState;
						const dx = e.clientX - ps.lastX;
						const dy = e.clientY - ps.lastY;
						ps.lastX = e.clientX;
						ps.lastY = e.clientY;

						if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
							const canvas = app.canvas;
							canvas.ds.offset[0] += dx / canvas.ds.scale;
							canvas.ds.offset[1] += dy / canvas.ds.scale;
							canvas.setDirty(true, true);
							if (canvas.graph && canvas.graph.change) canvas.graph.change();
						}
						e.preventDefault();
						e.stopPropagation();
					} else {
						window.__nukePanState = null;
					}
				};

				const onDirectUp = (e) => {
					window.__nukeZoomState = null;
					window.__nukePanState = null;
				};

				window.addEventListener('pointermove', onDirectMove, { capture: true, passive: false });
				window.addEventListener('mousemove', onDirectMove, { capture: true, passive: false });
				window.addEventListener('pointerup', onDirectUp, { capture: true });
				window.addEventListener('mouseup', onDirectUp, { capture: true });
				window.__imissNukeDirectZoomListener = true;
			}
		}

		/* ---- 2B. MODIFICADOR + MMB ARRASTRANDO = REDIMENSIONAR NODO ----
		 *
		 * Jorge: "¿hay manera de agregar alt (o windows key, un toggle pues) +
		 * middle click (sin tocar la Wacom) para resize nodos? Quiero un toggle
		 * para eso y prendido por default para mi ComfyUI de Windows y la Linux."
		 *
		 * ⚑⚑ VIVE EN `window` Y EN CAPTURA, NO EN EL PROTOTIPO. Es la lección
		 * de v17.51, entera: litegraph amarra `processMouseDown.bind(this)` UNA
		 * vez al construir el canvas, así que un parche al prototipo hecho
		 * después — que es lo que pasa cuando el panel evalúa este archivo sobre
		 * una página que lleva minutos abierta — es invisible para el mouse para
		 * siempre. Ahí es donde el resize habría salido "sólo en Windows" igual
		 * que el Tab, y por la misma razón. Aquí no puede: window en captura
		 * corre antes que cualquier listener del canvas, lo hayan amarrado
		 * cuando lo hayan amarrado.
		 *
		 * ⚑⚑ Y POR ESO EMPIEZA SOBRE UN NODO. Alt+MMB ya era el zoom clásico de
		 * Nuke en este archivo (isZoomEvent), y dos gestos con el mismo atajo es
		 * un gesto que no se puede predecir. La reja no es el modificador, es
		 * DÓNDE cayó el press: sobre un nodo redimensiona, sobre lienzo vacío
		 * hace zoom como siempre. Nada de lo que ya funcionaba cambia.
		 *
		 * ⚑ El modificador se elige porque no todos llegan al navegador: en
		 * Linux el gestor de ventanas se queda con la combinación de mover y
		 * redimensionar ventanas (Super en GNOME/KDE modernos, Alt en los
		 * viejos) y la página nunca ve el evento. Si el default no responde, el
		 * pulldown del panel es la salida y no hay que tocar código.
		 */
		static modifierHeld(e, key) {
			if (!e) return false;
			switch (key) {
				case 'meta': return !!e.metaKey;
				case 'ctrl': return !!e.ctrlKey;
				case 'shift': return !!e.shiftKey;
				case 'alt':
				default: return !!e.altKey;
			}
		}

		// ⚑ pointerToGraph y NO `graph_mouse`, por lo mismo que dice el comentario
		// de NukeBackdropManager: graph_mouse guarda dónde estaba el cursor en el
		// último MOVE, y un press no siempre viene después de uno.
		static nodeUnderPointer(canvas, e) {
			const graph = canvas && canvas.graph;
			if (!graph) return null;
			const p = NukeBackdropManager.pointerToGraph(canvas, e);
			if (!p) return null;
			try {
				if (typeof graph.getNodeOnPos === 'function') {
					const n = graph.getNodeOnPos(p[0], p[1], canvas.visible_nodes);
					if (n) return n;
				}
			} catch (err) {}
			const list = graph._nodes || [];
			const th = (typeof LiteGraph !== 'undefined' && LiteGraph.NODE_TITLE_HEIGHT) || 30;
			for (let i = list.length - 1; i >= 0; --i) {
				const n = list[i];
				if (!n || !n.pos || !n.size) continue;
				if (p[0] >= n.pos[0] && p[0] <= n.pos[0] + n.size[0]
					&& p[1] >= n.pos[1] - th && p[1] <= n.pos[1] + n.size[1]) return n;
			}
			return null;
		}

		// ⚑ El mínimo lo dice el NODO, no este archivo. computeSize() es lo que
		// mide sus widgets; hacerlo más chico que eso es dibujar un nodo con los
		// controles encimados, que es peor que no dejar encogerlo.
		static minSizeOf(node) {
			let mw = 90, mh = 40;
			try {
				if (typeof node.computeSize === 'function') {
					const m = node.computeSize();
					if (m && isFinite(m[0]) && isFinite(m[1])) { mw = m[0]; mh = m[1]; }
				}
			} catch (e) {}
			return [mw, mh];
		}

		static setupModifierResize() {
			if (ImissNukeManager._modResizeListener) return;
			ImissNukeManager._modResizeListener = true;

			const armed = () => {
				const cfg = window.__imissNukeConfig || {};
				return cfg.masterEnabled !== false && cfg.nukeModResize !== false;
			};

			const finish = () => {
				const st = window.__nukeResizeState;
				window.__nukeResizeState = null;
				if (!st) return;
				try {
					// ⚑ change() y no sólo un repaint: un nodo de otro tamaño es un
					// workflow distinto, y ComfyUI tiene que saber que hay cambios sin
					// guardar igual que si lo hubieran movido.
					if (st.moved && st.canvas.graph && st.canvas.graph.change) {
						st.canvas.graph.change();
					}
					st.canvas.setDirty(true, true);
				} catch (e) {}
			};

			const swallow = (e) => {
				if (!e) return;
				e.preventDefault();
				e.stopPropagation();
				if (e.stopImmediatePropagation) e.stopImmediatePropagation();
			};

			const onDown = (e) => {
				if (!e || e.button !== 1 || !armed()) return;
				const cfg = window.__imissNukeConfig || {};
				if (!ImissNukeManager.modifierHeld(e, cfg.nukeModResizeKey || 'alt')) return;

				const canvas = (typeof app !== 'undefined' && app.canvas) ? app.canvas : null;
				// ⚑ Sólo cuando el press cayó en el canvas del grafo. Lo que flote
				// encima — un menú, un diálogo, un widget del DOM — es un click real
				// en un elemento real y no es asunto nuestro.
				if (!canvas || !canvas.canvas || e.target !== canvas.canvas) return;

				const node = ImissNukeManager.nodeUnderPointer(canvas, e);
				if (!node || !node.size) return;
				if (node.flags && node.flags.collapsed) return;   // no hay qué estirar

				window.__nukeResizeState = {
					node, canvas,
					scale: (canvas.ds && canvas.ds.scale) || 1,
					startX: e.clientX, startY: e.clientY,
					w0: node.size[0], h0: node.size[1],
					min: ImissNukeManager.minSizeOf(node),
					pointerId: (e.pointerId === undefined) ? 0 : e.pointerId,
					moved: false
				};

				// ⚑ Y APAGA LOS OTROS DOS GESTOS EN EL MISMO PRESS. El zoom y el paneo
				// se arman solos en el primer move con el botón de en medio abajo;
				// dejarlos armados sería redimensionar y hacer zoom a la vez.
				window.__nukeZoomState = null;
				window.__nukePanState = null;
				try {
					canvas.dragging_canvas = false;
					canvas.node_dragged = null;
				} catch (err) {}
				swallow(e);
			};

			const onMove = (e) => {
				const st = window.__nukeResizeState;
				if (!st) return;
				// El botón de en medio se soltó en algún lado que no vimos.
				if (e && e.buttons !== undefined && (e.buttons & 4) === 0) { finish(); return; }

				const node = st.node;
				const scale = (st.canvas.ds && st.canvas.ds.scale) || st.scale || 1;
				const w = Math.max(st.min[0], st.w0 + (e.clientX - st.startX) / scale);
				const h = Math.max(st.min[1], st.h0 + (e.clientY - st.startY) / scale);
				st.moved = true;
				try {
					if (typeof node.setSize === 'function') {
						node.setSize([w, h]);
					} else {
						node.size[0] = w;
						node.size[1] = h;
						if (typeof node.onResize === 'function') node.onResize(node.size);
					}
				} catch (err) {
					try { node.size[0] = w; node.size[1] = h; } catch (e2) {}
				}
				try { st.canvas.setDirty(true, true); } catch (err) {}
				swallow(e);
			};

			// ⚑ La soltada se traga también. litegraph nunca vio el press, así que
			// entregarle la mitad de un gesto es como termina un resize paneando el
			// lienzo — la misma regla que los botones del backdrop.
			const onUp = (e) => {
				if (!window.__nukeResizeState) return;
				finish();
				swallow(e);
			};

			// ⚑ mousedown/auxclick además de pointer*: el botón de en medio abre el
			// autoscroll de Windows y el pegado del portapapeles primario de X11, y
			// esos cuelgan del evento de mouse clásico, no del de pointer.
			const onLegacyDown = (e) => { if (window.__nukeResizeState) swallow(e); };

			window.addEventListener('pointerdown', onDown, { capture: true });
			window.addEventListener('pointermove', onMove, { capture: true, passive: false });
			window.addEventListener('mousemove', onMove, { capture: true, passive: false });
			window.addEventListener('pointerup', onUp, { capture: true });
			window.addEventListener('mouseup', onUp, { capture: true });
			window.addEventListener('mousedown', onLegacyDown, { capture: true });
			window.addEventListener('auxclick', onLegacyDown, { capture: true });
			// Soltar el botón fuera de la ventana deja el gesto pegado si nadie mira.
			window.addEventListener('blur', () => finish());
			window.addEventListener('pointercancel', () => finish(), { capture: true });
		}

		// ---- 3A. LIMPIEZA TOTAL DE CABLES HUÉRFANOS (LIMBO WIRES) ----
		static cleanupLimboLinks(canvas) {
			const c = canvas || (typeof app !== 'undefined' ? app.canvas : null);
			if (!c) return;

			// 1. LiteGraph standard canvas cleanup
			c.connecting_node = null;
			c.connecting_links = null;
			c.connecting_slot = -1;
			c.connecting_input = null;
			c.connecting_output = null;
			c.connecting_pos = null;
			c.connecting_link = null;

			// 2. ComfyUI modern linkConnector cleanup (Nodes 2.0 / Vue)
			const lc = c.linkConnector || (typeof app !== 'undefined' && app.canvas?.linkConnector);
			if (lc) {
				if (lc.state) {
					lc.state.snapLinksPos = null;
					lc.state.connectingTo = null;
				}
				if (typeof lc.disconnectLinks === 'function') {
					try { lc.disconnectLinks(); } catch (err) {}
				}
				if (lc.renderLinks && Array.isArray(lc.renderLinks)) {
					for (let l of lc.renderLinks) {
						try {
							if (typeof l.disconnect === 'function') l.disconnect();
						} catch (err) {}
					}
					lc.renderLinks.length = 0;
				}
				if (typeof lc.reset === 'function') {
					try { lc.reset(); } catch (err) {}
				}
			}

			// 3. Force canvas redraw
			if (typeof c.setDirty === 'function') c.setDirty(true, true);
			if (typeof c.draw === 'function') c.draw(true, true);
			if (typeof app !== 'undefined' && app.canvas && app.canvas !== c) {
				if (typeof app.canvas.setDirty === 'function') app.canvas.setDirty(true, true);
				if (typeof app.canvas.draw === 'function') app.canvas.draw(true, true);
			}
		}

		// ---- 3B. ELIMINACIÓN DEL MODO FANTASMA (INSTANT NODE PLACEMENT) ----
		static setupGhostPlacementBypass() {
			if (LGraphCanvas.prototype.startGhostPlacement && !LGraphCanvas.prototype.startGhostPlacement.__imissNukeGhostPatched) {
				const origStartGhost = LGraphCanvas.prototype.startGhostPlacement;
				LGraphCanvas.prototype.startGhostPlacement = function (node, dragEvent) {
					const cfg = window.__imissNukeConfig || {};
					if (cfg.masterEnabled !== false && cfg.nukeInstantPlacement !== false) {
						if (node) {
							if (node.flags) node.flags.ghost = false;
							this.state = this.state || {};
							this.state.ghostNodeId = null;
							this.isDragging = false;
							if (typeof this.select === 'function') this.select(node);
							if (typeof this.setDirty === 'function') this.setDirty(true, true);
						}
						return;
					}
					return origStartGhost.apply(this, arguments);
				};
				LGraphCanvas.prototype.startGhostPlacement.__imissNukeGhostPatched = true;
			}
		}

		static syncInstantPlacement(enabled) {
			try {
				if (typeof app !== 'undefined') {
					if (app.ui?.settings?.setSettingValue) {
						app.ui.settings.setSettingValue('Comfy.NodeSearchBoxImpl.FollowCursor', !enabled);
					}
					if (app.extensionManager?.setting?.set) {
						app.extensionManager.setting.set('Comfy.NodeSearchBoxImpl.FollowCursor', !enabled);
					}
				}
			} catch (e) {}
			/* ⚑⚑ Y SE LEE DE VUELTA, UNA VEZ. Este ajuste es el sospechoso del
			   OTRO síntoma —"lo deja lockeado"—: con FollowCursor prendido el
			   nodo se queda pegado al cursor esperando un click que lo suelte.
			   Escribirlo y no verificarlo es la falla que este proyecto ya tiene
			   nombrada dos veces (⚡ Performance, y el `200` que no prueba nada):
			   un ajuste que se escribió en una clave que este frontend renombró
			   se ve exactamente igual que uno que funcionó. */
			try {
				const g = app?.extensionManager?.setting?.get
					|| app?.ui?.settings?.getSettingValue;
				if (g && !ImissNukeManager._fcSaid) {
					ImissNukeManager._fcSaid = true;
					const cur = app.extensionManager?.setting?.get
						? app.extensionManager.setting.get('Comfy.NodeSearchBoxImpl.FollowCursor')
						: app.ui.settings.getSettingValue('Comfy.NodeSearchBoxImpl.FollowCursor');
					console.log('[ImissNuke] FollowCursor is', cur,
						'(wanted', !enabled + ')',
						cur === undefined
							? '\u2014 THIS FRONTEND HAS NO SUCH SETTING, so Instant '
							  + 'Node Placement cannot switch it off'
							: (cur === !enabled ? '\u2014 the write took'
								: '\u2014 THE WRITE DID NOT TAKE'));
				}
			} catch (e) {}
		}

		static setupLimboSafetyListener() {
			if (window.__imissNukeLimboSafety) return;
			window.__imissNukeLimboSafety = true;

			const checkAndClean = () => {
				const c = (typeof app !== 'undefined' ? app.canvas : null);
				if (!c) return;
				const searchOpen = ImissNukeManager.getOpenSearchBox();
				if (!searchOpen && !c.connecting_node && (!c.connecting_links || c.connecting_links.length === 0)) {
					const lc = c.linkConnector;
					if (lc && (lc.state?.snapLinksPos || (lc.renderLinks && lc.renderLinks.length > 0))) {
						ImissNukeManager.cleanupLimboLinks(c);
					}
				}
			};

			window.addEventListener('pointerup', () => setTimeout(checkAndClean, 40), { capture: true, passive: true });
			window.addEventListener('mouseup', () => setTimeout(checkAndClean, 40), { capture: true, passive: true });
			window.addEventListener('keyup', (e) => {
				if (e.key === 'Escape') setTimeout(checkAndClean, 20);
			}, { capture: true, passive: true });
		}

		// ---- 3C. BLOQUEO / MANEJO DE POPUP AL SOLTAR CABLE AL VACÍO ----
		static setupDropMenuBlock() {
			if (!LGraphCanvas.prototype.processMouseUp) return;
			if (LGraphCanvas.prototype.processMouseUp.__imissNukeDropPatched) return;

			const origProcessMouseUp = LGraphCanvas.prototype.processMouseUp;
			LGraphCanvas.prototype.processMouseUp = function (e) {
				const cfg = window.__imissNukeConfig || {};
				const connLink = (this.connecting_links && this.connecting_links.length > 0) ? this.connecting_links[0] : null;
				const isConnecting = (this.connecting_node != null) ||
					(this.connecting_links && this.connecting_links.length > 0) ||
					(this.connecting_slot != null && this.connecting_slot !== -1) ||
					(this.linkConnector && this.linkConnector.isConnecting);

				if (cfg.masterEnabled !== false && isConnecting) {
					// 1. Detect if UNPLUGGING / DISCONNECTING an existing link
					const isUnplugging = Boolean(
						connLink?.disconnectOnDrop ||
						connLink?.link != null ||
						this._is_unplugging ||
						this.connecting_link != null ||
						(this.linkConnector && (this.linkConnector.state?.isDisconnecting || this.linkConnector.renderLinks?.[0]?.isDisconnecting))
					);

					// 2. Differentiate: Disconnecting an INPUT vs Dragging an OUTPUT
					const isInput = Boolean(
						isUnplugging ||
						this.connecting_input ||
						connLink?.input ||
						(this.connecting_slot != null && this.connecting_node && this.connecting_node.inputs && this.connecting_node.inputs[this.connecting_slot] && !this.connecting_output)
					);

					const isOutput = !isInput && Boolean(
						this.connecting_output ||
						(connLink && !connLink.input) ||
						(this.connecting_node != null) ||
						(this.linkConnector && this.linkConnector.isConnecting)
					);

					// CASE 1: Disconnecting an INPUT into empty canvas (Unplug wire)
					if (isInput && cfg.blockInputDisconnectSearch !== false) {
						const origShowSearch = this.showSearchBox;
						const origOnSearch = this.onSearchBox;
						const origShowNodeSearch = this.showNodeSearchBox;
						const origShowConnMenu = this.showConnectionMenu;

						this.showSearchBox = function () { return null; };
						this.onSearchBox = function () { return null; };
						this.showNodeSearchBox = function () { return null; };
						this.showConnectionMenu = function () { return null; };
						if (typeof LiteGraph !== 'undefined') LiteGraph.release_link_on_empty_shows_menu = false;

						const result = origProcessMouseUp.call(this, e);

						this.showSearchBox = origShowSearch;
						this.onSearchBox = origOnSearch;
						this.showNodeSearchBox = origShowNodeSearch;
						this.showConnectionMenu = origShowConnMenu;

						ImissNukeManager.cleanupLimboLinks(this);
						setTimeout(() => ImissNukeManager.cleanupLimboLinks(this), 0);
						setTimeout(() => ImissNukeManager.cleanupLimboLinks(this), 40);

						if (typeof LiteGraph !== 'undefined' && LiteGraph.closeAllContextMenus) {
							LiteGraph.closeAllContextMenus();
						}
						try {
							document.querySelectorAll('.litegraph.litesearchbox, .litesearchbox, .litegraph.context-menu, .lgraphmenu').forEach(el => el.remove());
						} catch (err) {}

						return result;
					}

					// CASE 2: Dragging an OUTPUT wire
					if (isOutput) {
						const srcNode = this.connecting_node || connLink?.node || (this.linkConnector?.renderLinks?.[0]?.fromNode);
						let srcSlot = (this.connecting_slot !== undefined && this.connecting_slot !== -1) ? this.connecting_slot : (connLink?.slot ?? (this.linkConnector?.renderLinks?.[0]?.fromSlot?.index));
						if (srcSlot === undefined && srcNode && srcNode.outputs) srcSlot = 0;

						// Check if the source output already has connections
						const sourceOutput = (srcNode && srcNode.outputs && srcNode.outputs[srcSlot]) ? srcNode.outputs[srcSlot] : null;
						const outputHasConnections = Boolean(sourceOutput && sourceOutput.links && sourceOutput.links.length > 0);

						// Determine if search is blocked:
						// If searchOnlyEmptyOutput is enabled, search is ONLY blocked if output already has connections.
						// (Empty output drop opens modern search even if blockOutputDropSearch is active).
						let blockSearch = false;
						if (cfg.searchOnlyEmptyOutput !== false) {
							blockSearch = outputHasConnections;
						} else if (cfg.blockOutputDropSearch === true) {
							blockSearch = true;
						}

						// Hover node check (dropped over another node?)
						const hoverNode = this.node_over || (this.graph?.getNodeOnPos ? this.graph.getNodeOnPos(this.graph_mouse[0], this.graph_mouse[1]) : null);
						const isOverOtherNode = Boolean(hoverNode && hoverNode !== srcNode);

						// Record links count before drop
						const linksBefore = this.graph?.links ? Object.keys(this.graph.links).length : 0;

						// Suppress old classic LiteGraph search box and connection menu
						const origShowSearch = this.showSearchBox;
						const origOnSearch = this.onSearchBox;
						const origShowNodeSearch = this.showNodeSearchBox;
						const origShowConnMenu = this.showConnectionMenu;

						this.showSearchBox = function () { return null; };
						this.onSearchBox = function () { return null; };
						this.showNodeSearchBox = function () { return null; };
						this.showConnectionMenu = function () { return null; };
						if (typeof LiteGraph !== 'undefined') LiteGraph.release_link_on_empty_shows_menu = false;

						const result = origProcessMouseUp.call(this, e);

						this.showSearchBox = origShowSearch;
						this.onSearchBox = origOnSearch;
						this.showNodeSearchBox = origShowNodeSearch;
						this.showConnectionMenu = origShowConnMenu;

						ImissNukeManager.cleanupLimboLinks(this);
						setTimeout(() => ImissNukeManager.cleanupLimboLinks(this), 0);
						setTimeout(() => ImissNukeManager.cleanupLimboLinks(this), 40);

						if (typeof LiteGraph !== 'undefined' && LiteGraph.closeAllContextMenus) {
							LiteGraph.closeAllContextMenus();
						}
						try {
							document.querySelectorAll('.litegraph.litesearchbox, .litesearchbox, .litegraph.context-menu, .lgraphmenu').forEach(el => el.remove());
						} catch (err) {}

						// Record links count after drop
						const linksAfter = this.graph?.links ? Object.keys(this.graph.links).length : 0;
						const connectionFormed = linksAfter > linksBefore;

						// CRUCIAL: If dropped on another node, or a connection was formed, or search is blocked:
						// NEVER OPEN SEARCH!
						if (isOverOtherNode || connectionFormed || blockSearch) {
							return result;
						}

						// Wire was dropped into empty canvas from an eligible output with 0 connections:
						// Open MODERN search dialog & auto-connect!
						if (srcNode) {
							window.__nukeTabAutoConnectSource = srcNode;
							window.__nukeTabAutoConnectSlot = srcSlot;
							window.__nukeTabAutoConnectTime = Date.now();
						}

						// Calculate drop coordinates
						const canvasEl = this.canvas || document.querySelector('canvas.graphcanvas') || document.querySelector('canvas');
						const rect = canvasEl ? canvasEl.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
						const clientX = (e && e.clientX != null) ? e.clientX : (rect.left + rect.width / 2);
						const clientY = (e && e.clientY != null) ? e.clientY : (rect.top + rect.height / 2);
						const canvasX = this.graph_mouse ? this.graph_mouse[0] : ((e && e.canvasx != null) ? e.canvasx : 0);
						const canvasY = this.graph_mouse ? this.graph_mouse[1] : ((e && e.canvasy != null) ? e.canvasy : 0);

						const fakeEvent = {
							type: 'dblclick',
							clientX, clientY, pageX: clientX, pageY: clientY, screenX: clientX, screenY: clientY,
							x: clientX, y: clientY, canvasx: canvasX, canvasy: canvasY,
							target: canvasEl,
							__imissNukeTabTriggered: true,
							__nukeTabTriggered: true,
							preventDefault: () => {}, stopPropagation: () => {}, stopImmediatePropagation: () => {}
						};

						window.__imissNukeTabTriggered = true;
						window.__nukeTabTriggered = true;

						setTimeout(() => {
							ImissNukeManager.openModernSearch(this, fakeEvent, clientX, clientY);
							if (typeof LiteGraph !== 'undefined' && LiteGraph.closeAllContextMenus) {
								LiteGraph.closeAllContextMenus();
							}
							try {
								document.querySelectorAll('.litegraph.context-menu, .lgraphmenu').forEach(el => el.remove());
							} catch (err) {}
						}, 10);

						setTimeout(() => {
							window.__imissNukeTabTriggered = false;
							window.__nukeTabTriggered = false;
						}, 250);

						return result;
					}
				}
				return origProcessMouseUp.call(this, e);
			};
			LGraphCanvas.prototype.processMouseUp.__imissNukeDropPatched = true;

			if (LGraphCanvas.prototype.showConnectionMenu && !LGraphCanvas.prototype.showConnectionMenu.__imissNukeConnPatched) {
				const origShowConn = LGraphCanvas.prototype.showConnectionMenu;
				LGraphCanvas.prototype.showConnectionMenu = function () {
					const cfg = window.__imissNukeConfig || {};
					if (cfg.masterEnabled !== false) {
						return null; // Suppress classic connection menu entirely
					}
					return origShowConn.apply(this, arguments);
				};
				LGraphCanvas.prototype.showConnectionMenu.__imissNukeConnPatched = true;
			}
		}

		/* =================================================================
		 * ⚡⚡ v17.94 — EL BUSCADOR QUE SALE AL DESCONECTAR, BLOQUEADO DONDE SÍ
		 * PASA
		 *
		 * Jorge: "si algo está conectado, quiero que si lo desconecta no se
		 * active el search node, porque sí es realmente molesto."
		 *
		 * ⚡⚡ `setupDropMenuBlock` (arriba) NO PUEDE HACER ESTO y por eso v17.84
		 * lo apagó: parcha `showSearchBox` / `showNodeSearchBox` /
		 * `release_link_on_empty_shows_menu`, que son la superficie de litegraph
		 * 1.x. Bajo Nodes 2.0 el que abre el buscador es Vue, y no pasa por
		 * ninguno de esos ganchos.
		 *
		 * ⚡⚡ QUIÉN LO ABRE DE VERDAD, medido en el frontend 1.52.7 leyendo el
		 * método en vivo:
		 *
		 *     dropOnNothing(e) {
		 *       renderLinks.filter(l => l.disconnectOnDrop).forEach(l => l.disconnect());
		 *       if (renderLinks.length && events.dispatch('dropped-on-canvas', e) !== false)
		 *         this.disconnectLinks();
		 *     }
		 *
		 * O sea: el buscador (o el menú, según `Comfy.LinkRelease.Action`) lo
		 * abre un OYENTE de `dropped-on-canvas`. Así que lo que se bloquea es el
		 * dispatch — no el método, no el oyente, no la tecla.
		 *
		 * ⚡⚡ Y DEVUELVE `true`, NO `false`. `false` significa "alguien canceló"
		 * y entonces `disconnectLinks()` NO corre — el cable se quedaría colgando
		 * justo cuando el artista vino a quitarlo. `true` es "nadie canceló":
		 * desconecta igual que siempre, sin popup.
		 *
		 * ⚡⚡ Y NO SE TOCA `Comfy.LinkRelease.Action`, que era la otra puerta:
		 * esa setting se GUARDA en el server, así que prenderla y apagarla en
		 * cada arrastre sería escribirle la configuración al artista dos veces
		 * por cable — y un navegador cerrado a media operación se la dejaría
		 * apagada para siempre. Esto no guarda nada.
		 *
		 * ⚡ EL PARCHE ES AL PROTOTIPO, que es lo que lo hace sobrevivir a un
		 * canvas nuevo (abrir otro workflow, entrar a un subgrafo). Por eso
		 * también se puede llamar de más: es idempotente.
		 * ================================================================= */
		static setupLinkReleaseBlock() {
			/* ⚡⚡ EL CANVAS LLEGA TARDE, Y MEDIDO: al recargar la página, ni el
			   init ni los reintentos de 500 y 1500 ms encuentran
			   `app.canvas.linkConnector` — lo monta Vue después. Un cuarto
			   setTimeout sería adivinar otro número; el primer `pointerdown` NO es
			   una adivinanza: es el único momento que con seguridad ocurre antes de
			   que alguien pueda soltar un cable, y para entonces el canvas existe
			   porque el click fue sobre él. Se desengancha al primer éxito. */
			if (!ImissNukeManager.__linkReleaseArmed) {
				ImissNukeManager.__linkReleaseArmed = (e) => {
					if (ImissNukeManager.setupLinkReleaseBlock()) {
						window.removeEventListener('pointerdown',
							ImissNukeManager.__linkReleaseArmed, true);
					}
				};
				window.addEventListener('pointerdown',
					ImissNukeManager.__linkReleaseArmed,
					{ capture: true, passive: true });
			}
			let lc = null;
			try {
				lc = (typeof app !== 'undefined') && app.canvas
					&& app.canvas.linkConnector;
			} catch (e) { lc = null; }
			if (!lc) return false;
			const P = Object.getPrototypeOf(lc);
			if (!P || typeof P.dropOnNothing !== 'function') return false;
			if (P.dropOnNothing.__imissNukeReleasePatched) return true;

			const orig = P.dropOnNothing;
			P.dropOnNothing = function (e) {
				const cfg = window.__imissNukeConfig || {};
				const ev = this && this.events;
				if (cfg.masterEnabled === false || !ev
					|| typeof ev.dispatch !== 'function'
					|| !ImissNukeManager.linkReleaseBlocked(this, cfg)) {
					return orig.call(this, e);
				}
				const own = Object.prototype.hasOwnProperty.call(ev, 'dispatch');
				const prev = ev.dispatch;
				ev.dispatch = function (type, detail) {
					if (type === 'dropped-on-canvas') return true;
					return prev.call(this, type, detail);
				};
				try {
					return orig.call(this, e);
				} finally {
					if (own) ev.dispatch = prev;
					else delete ev.dispatch;
				}
			};
			P.dropOnNothing.__imissNukeReleasePatched = true;
			return true;
		}

		/* ⚡⚡ ¿ESTE SUELTE ES UN DESCONECTE? Las dos respuestas salen del propio
		 * LinkConnector, y las dos se midieron en vivo:
		 *
		 *   • desenchufar un input ya conectado → `state.draggingExistingLinks`
		 *     es `true` y el renderLink es un `MovingInputLink`
		 *     (`disconnectOnDrop: true`);
		 *   • arrastrar desde un output QUE YA TIENE CABLES → `false`, pero
		 *     `renderLinks[0].fromSlot.links.length` es 2.
		 *
		 * ⚡ Y por eso son los dos switches de siempre y no uno nuevo: el primer
		 * caso es "Block Input Disconnect Search" y el segundo es "Search Only
		 * Empty Output", que es justo lo que cada uno dice que hace. Un slot
		 * VACÍO sigue abriendo el buscador — arrastrar al vacío desde un output
		 * libre es cómo se agrega un nodo, y eso nadie lo pidió bloqueado. */
		static linkReleaseBlocked(lc, cfg) {
			try {
				const st = lc && lc.state;
				if (st && st.draggingExistingLinks) {
					return cfg.blockInputDisconnectSearch !== false;
				}
				if (cfg.searchOnlyEmptyOutput === false) return false;
				const rl = (lc && lc.renderLinks) || [];
				for (const l of rl) {
					const s = l && l.fromSlot;
					if (!s) continue;
					const n = (s.links && s.links.length)
						|| (s.link != null ? 1 : 0);
					if (n > 0) return true;
				}
			} catch (e) {}
			return false;
		}

		/* ⚡⚡ v17.94 — LO QUE MIDE UNA BARRA COLAPSADA. Ver el bloque de `W` en
		 * `layoutNodes`: `_collapsed_width` lo escribe el renderer, así que un
		 * nodo que aún no se dibuja no tiene ninguno y el acomodo lo trataba como
		 * de 120 px. La cuenta es la de litegraph, medida en 1.52.7. */
		static collapsedWidth(n) {
			let t = '';
			try {
				t = String((n && n.getTitle && n.getTitle())
					|| (n && n.title) || (n && n.type) || '');
			} catch (e) { t = ''; }
			let w = t.length * 7;
			try {
				if (!ImissNukeManager.__titleCtx) {
					ImissNukeManager.__titleCtx =
						document.createElement('canvas').getContext('2d');
				}
				const c = ImissNukeManager.__titleCtx;
				c.font = ((typeof LiteGraph !== 'undefined'
					&& LiteGraph.NODE_TEXT_SIZE) || 14) + 'px Arial';
				w = c.measureText(t).width;
			} catch (e) {}
			const open = (n && n.size && n.size[0]) || 200;
			const min = (typeof LiteGraph !== 'undefined'
				&& LiteGraph.NODE_COLLAPSED_WIDTH) || 80;
			return Math.min(open, Math.max(min, w + 24));
		}

		// ---- 4. BLOQUEO DE DOBLE CLIC EN CANVAS VACÍO ----
		static setupDblClickBlock(enabled) {
			if (LGraphCanvas.prototype.processMouseDblClick && !LGraphCanvas.prototype.processMouseDblClick.__imissNukeDblPatched) {
				const origDblClick = LGraphCanvas.prototype.processMouseDblClick;
				LGraphCanvas.prototype.processMouseDblClick = function (e) {
					if (window.__imissNukeTabTriggered || window.__nukeTabTriggered || (e && (e.__imissNukeTabTriggered || e.__nukeTabTriggered))) {
						return origDblClick.apply(this, arguments);
					}
					const cfg = window.__imissNukeConfig;
					if (cfg && cfg.masterEnabled !== false && cfg.disableDblClick) {
						const node = this.graph ? this.graph.getNodeOnPos(
							this.graph_mouse[0], this.graph_mouse[1],
							this.visible_nodes
						) : null;
						const group = this.graph ? (this.graph.getGroupOnPos ? this.graph.getGroupOnPos(
							this.graph_mouse[0], this.graph_mouse[1]
						) : null) : null;
						if (!node && !group) return;
					}
					return origDblClick.apply(this, arguments);
				};
				LGraphCanvas.prototype.processMouseDblClick.__imissNukeDblPatched = true;
			}

			if (typeof app !== 'undefined' && app.canvas && app.canvas.canvas) {
				const canvasEl = app.canvas.canvas;
				if (ImissNukeManager._dblClickBlocker) {
					canvasEl.removeEventListener('dblclick', ImissNukeManager._dblClickBlocker, true);
					ImissNukeManager._dblClickBlocker = null;
				}
				if (enabled) {
					ImissNukeManager._dblClickBlocker = (e) => {
						if (window.__imissNukeTabTriggered || window.__nukeTabTriggered || (e && (e.__imissNukeTabTriggered || e.__nukeTabTriggered))) return;
						const cfg = window.__imissNukeConfig;
						if (cfg && cfg.masterEnabled !== false && cfg.disableDblClick) {
							const c = (typeof app !== 'undefined' ? app.canvas : null);
							const node = c?.graph?.getNodeOnPos ? c.graph.getNodeOnPos(
								c.graph_mouse?.[0], c.graph_mouse?.[1], c.visible_nodes
							) : null;
							const group = c?.graph?.getGroupOnPos ? c.graph.getGroupOnPos(
								c.graph_mouse?.[0], c.graph_mouse?.[1]
							) : null;
							if (!node && !group) {
								e.stopPropagation();
								e.preventDefault();
							}
						}
					};
					canvasEl.addEventListener('dblclick', ImissNukeManager._dblClickBlocker, true);
				}
			}

			/* ⚡⚡ v17.99 — Y ÉSTE ES EL QUE DE VERDAD LO BLOQUEA. Jorge: "double
			 * click search is off but is on in reality when I try to double
			 * click — I want this to match the actual switch."
			 *
			 * ⚡⚡ TENÍA RAZÓN, Y LAS DOS MITADES DE ARRIBA SON LA PRUEBA: el
			 * parche a `processMouseDblClick` y el que se traga el `dblclick`
			 * del canvas son superficie de litegraph 1.x, y bajo Nodes 2.0 el
			 * buscador NO sale por ahí. Medido en el frontend 1.52.7, en su
			 * propio fuente:
			 *
			 *   LGraphCanvas.emitEvent({subType:'empty-double-click'})
			 *     -> this.canvas.dispatchEvent(new CustomEvent('litegraph:canvas',
			 *                                   {bubbles:true, detail}))
			 *   NodeSearchBoxPopover.vue: useEventListener(document,
			 *     'litegraph:canvas', e => ... showSearchBox(...))
			 *
			 * ⚡⚡ O SEA: SE DESPACHA EN EL CANVAS Y BURBUJEA HASTA `document`.
			 * Por eso este oyente va en `document` y en fase de CAPTURA: la
			 * captura baja de `document` al canvas, así que corre ANTES que el
			 * de Vue pase lo que pase — que es la única forma de que
			 * `stopImmediatePropagation` llegue a tiempo (en el propio blanco,
			 * captura y burbuja corren en ORDEN DE REGISTRO, y el de Vue se
			 * registró al arrancar la app, mucho antes que nosotros).
			 *
			 * ⚡⚡ Y EL DOBLE CLICK EN UN GRUPO SE BLOQUEA A MEDIAS, A
			 * PROPÓSITO: el MISMO evento lo escucha `TitleEditor.vue` para
			 * renombrar, y los dos se reparten el grupo por la altura de su
			 * barra de título (`relativeY <= titleHeight` renombra, por debajo
			 * abre el buscador). Tragarse el evento entero apagaría el rename,
			 * que nadie pidió apagar.
			 *
			 * ⚡ `node-double-click` ni se toca: ése es el rename del nodo.
			 */
			if (ImissNukeManager._dblCanvasEvBlocker) {
				document.removeEventListener('litegraph:canvas',
					ImissNukeManager._dblCanvasEvBlocker, true);
				ImissNukeManager._dblCanvasEvBlocker = null;
			}
			if (enabled) {
				ImissNukeManager._dblCanvasEvBlocker = (e) => {
					try {
						if (window.__imissNukeTabTriggered || window.__nukeTabTriggered) return;
						const cfg = window.__imissNukeConfig;
						if (!cfg || cfg.masterEnabled === false || !cfg.disableDblClick) return;
						const d = e && e.detail;
						if (!d) return;
						if (d.subType === 'empty-double-click') {
							e.stopImmediatePropagation();
							e.stopPropagation();
							return;
						}
						if (d.subType !== 'group-double-click') return;
						const g = d.group, oe = d.originalEvent;
						if (!g || !oe) return;
						const top = (g.pos && g.pos[1]) || 0;
						const th = (g.titleHeight != null) ? g.titleHeight : 24;
						// Debajo de la barra de título = buscador. Encima = rename.
						if ((oe.canvasY - top) > th) {
							e.stopImmediatePropagation();
							e.stopPropagation();
						}
					} catch (err) {}
				};
				document.addEventListener('litegraph:canvas',
					ImissNukeManager._dblCanvasEvBlocker, true);
			}
		}

		// ---- 5. BUSCADOR MODERNO CON TECLA TAB (ABRIR / CERRAR) ----
		static getOpenSearchBox() {
			// 1. Check if an actual input is focused inside search/dialog
			const active = document.activeElement;
			if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
				if (active.id?.includes('search') || active.className?.includes('search') ||
					active.closest('[role="dialog"], [role="search"], .p-dialog, .litesearchbox, .litegraph.litesearchbox, [class*="node-search"]')) {
					return active;
				}
			}

			// 2. Classic LiteGraph search box visible in DOM
			const classicBox = document.querySelector('.litegraph.litesearchbox, .litesearchbox');
			if (classicBox && classicBox.offsetParent !== null) {
				return classicBox;
			}

			// 3. Modern Vue / PrimeVue dialog that is TRULY open and visible
			const dialogs = document.querySelectorAll('[role="dialog"], .p-dialog, [class*="node-search-box-dialog"]');
			for (const dlg of dialogs) {
				if (dlg.offsetParent !== null) {
					try {
						const style = window.getComputedStyle(dlg);
						if (style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity || '1') > 0.1) {
							if (dlg.querySelector('input[type="search"], input[id*="search"], input[class*="search"], [role="search"]')) {
								return dlg;
							}
						}
					} catch (e) {}
				}
			}

			return null;
		}

		static closeSearchBox() {
			// 1. Classic LiteGraph search box
			try {
				if (typeof app !== 'undefined' && app.canvas && app.canvas.search_box) {
					app.canvas.search_box.close();
				}
			} catch (err) {}
			document.querySelectorAll('.litegraph.litesearchbox, .litesearchbox').forEach(el => el.remove());

			// 2. Clear inputs and dispatch Escape to close modern Vue/PrimeVue search box
			const active = document.activeElement;
			const searchInputs = document.querySelectorAll(
				'input[id*="node-search"], input[id*="comfy-vue"], [role="search"] input, [class*="NodeSearch"] input'
			);

			searchInputs.forEach(inp => {
				try {
					inp.value = '';
					inp.dispatchEvent(new Event('input', { bubbles: true }));
				} catch (e) {}
			});

			const targets = new Set([active, ...searchInputs, document.body, window]);
			for (const t of targets) {
				if (!t) continue;
				try {
					t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true }));
					t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true }));
				} catch (err) {}
			}

			// 3. Blur active input
			if (active && typeof active.blur === 'function') {
				active.blur();
			}

			// 4. Return focus to canvas
			const canvasEl = (typeof app !== 'undefined' && app.canvas && app.canvas.canvas) ||
				document.querySelector('canvas.graphcanvas') || document.querySelector('canvas');
			if (canvasEl && typeof canvasEl.focus === 'function') {
				canvasEl.focus();
			}

			// 5. Clean up any limbo/dangling preview links
			ImissNukeManager.cleanupLimboLinks(typeof app !== 'undefined' ? app.canvas : null);
			setTimeout(() => ImissNukeManager.cleanupLimboLinks(typeof app !== 'undefined' ? app.canvas : null), 40);

			window.__nukeTabAutoConnectSource = null;
			window.__nukeTabAutoConnectSlot = null;
			window.__nukeTabAutoConnectTime = null;
		}

		/* ⚑⚑ EL CURSOR SE RASTREA SIEMPRE, NO SÓLO CON EL TAB PRENDIDO.
		 *
		 * `canvas.graph_mouse` no se llena en todos los frontends, y cuando
		 * falta la única fuente honesta de "dónde estaba yo mirando" son estos
		 * dos números. Vivía DENTRO de `setupTabSearch`, o sea que con el Tab
		 * apagado no existía — y desde v17.61 el rescate de un nodo con
		 * posición NaN lo necesita, precisamente en el caso en que el Tab está
		 * apagado y el nodo lo creó el doble click de la casa. Un rescate que
		 * sólo funciona cuando la función que no estás usando está prendida no
		 * es un rescate.
		 *
		 * ⚑ Cuesta dos asignaciones en un listener pasivo, y lo cacha el check
		 * 26: con TODOS los switches del Tab apagados, un nodo NaN tiene que
		 * aterrizar en el cursor y no en el centro.
		 */
		static setupPointerTracker() {
			if (ImissNukeManager._nukePtrTracker) return;
			/* ⚑ UN objeto, reusado. Esto corre en CADA `pointermove` —a 1000 Hz
			   con un mouse gamer, y una Wacom manda todavía más—, así que un
			   objeto nuevo por evento es basura que el recolector tiene que
			   barrer mil veces por segundo para guardar dos números que se
			   sobreescriben enseguida. Nadie se queda con una referencia a esto:
			   los tres lectores le sacan `x`, `y` y `t` en el acto. */
			const seat = { x: 0, y: 0, t: 0 };
			window.__nukeLastPointer = seat;
			ImissNukeManager._nukePtrTracker = (ev) => {
				seat.x = ev.clientX;
				seat.y = ev.clientY;
				seat.t = Date.now();
			};
			window.addEventListener('pointermove',
				ImissNukeManager._nukePtrTracker, { passive: true, capture: true });
		}

		static setupTabSearch(enabled) {
			if (ImissNukeManager._tabHandler) {
				document.removeEventListener('keydown', ImissNukeManager._tabHandler, true);
				ImissNukeManager._tabHandler = null;
			}
			if (!enabled) return;

			ImissNukeManager.setupPointerTracker();

			ImissNukeManager._tabHandler = (e) => {
				if (e.key !== 'Tab') return;
				if (e.ctrlKey || e.altKey || e.metaKey) return;

				const openSearch = ImissNukeManager.getOpenSearchBox();

				// SI EL BUSCADOR YA ESTÁ ABIERTO:
				// Presionar Tab de nuevo lo CIERRA (toggle off)
				if (openSearch) {
					e.preventDefault();
					e.stopPropagation();
					e.stopImmediatePropagation();

					ImissNukeManager.closeSearchBox();
					return;
				}

				// Si no es el buscador y está escribiendo en otro widget (como prompt o seed), permitir Tab nativo
				// ⚡ v17.88 — por ROL también: bajo Nodes 2.0 el widget es DOM de
				// Vue y un combo de PrimeVue no es un <select>. Ver typingInWidget.
				if (ImissNukeManager.typingInWidget(e.target)) {
					return;
				}

				const cfg = window.__imissNukeConfig;
				if (cfg && (cfg.masterEnabled === false || cfg.tabForSearch === false)) return;

				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();

				if (typeof app === 'undefined' || !app.canvas) return;
				const canvas = app.canvas;
				const canvasEl = canvas.canvas || document.querySelector('canvas.graphcanvas') || document.querySelector('canvas');
				const rect = canvasEl ? canvasEl.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };

				/* ⚑⚑ ESTA ES LA COORDENADA CON LA QUE SE ABRE EL BUSCADOR, Y ERA
				 * EL CENTRO DE LA VISTA. Aquí estaba la otra mitad del bug del
				 * Tab, y llevaba escrita en este mismo archivo desde v17.51 la
				 * frase que la describe: **`graph_mouse` NO es el cursor**.
				 * litegraph lo escribe dentro de `processMouseMove`, así que en
				 * el momento del press guarda dónde estuvo el puntero en el
				 * último MOVE — y cuando el frontend ni siquiera lo publica,
				 * este bloque caía sin más al **centro del canvas**
				 * (`rect.width / 2`).
				 *
				 * De ahí salía todo lo que Jorge veía: v17.58 le devolvió el
				 * EVENTO al frontend (se fue el `trigger event was undefined`),
				 * pero ese evento seguía diciendo *el centro*. Un frontend que
				 * hace bien su trabajo pone el nodo exactamente donde el evento
				 * dice, y el evento decía el centro. **No era que ignorara la
				 * posición: era que le estábamos mandando la equivocada.**
				 *
				 * ⚑⚑ Y EL LECTOR CORRECTO YA EXISTÍA A VEINTE LÍNEAS DE AQUÍ.
				 * `__nukeLastPointer` —el rastreador de `pointermove` que
				 * instala `setupTabSearch`— se usaba **sólo** para calcular
				 * dónde SOLTAR el nodo (la mitad de `tabAutoConnect`), y nunca
				 * para la coordenada con la que se abre el diálogo. Una era el
				 * cursor de verdad y la otra el centro, en la misma función.
				 * Ahora las dos salen de la misma fuente y en el mismo orden:
				 * el cursor rastreado, luego `graph_mouse`, y el centro sólo
				 * como último recurso.
				 */
				let canvasX = 0, canvasY = 0;
				let clientX = rect.left + rect.width / 2;
				let clientY = rect.top + rect.height / 2;

				const ptr0 = window.__nukeLastPointer;
				const fresh = ptr0 && (Date.now() - ptr0.t) < 30000;
				if (fresh) {
					clientX = ptr0.x;
					clientY = ptr0.y;
					if (canvas.ds) {
						canvasX = ((clientX - rect.left) / canvas.ds.scale) - canvas.ds.offset[0];
						canvasY = ((clientY - rect.top) / canvas.ds.scale) - canvas.ds.offset[1];
					}
				} else if (canvas.graph_mouse && canvas.graph_mouse[0] !== undefined) {
					canvasX = canvas.graph_mouse[0];
					canvasY = canvas.graph_mouse[1];
					const ds = canvas.ds;
					if (ds) {
						clientX = rect.left + (canvasX + ds.offset[0]) * ds.scale;
						clientY = rect.top + (canvasY + ds.offset[1]) * ds.scale;
					}
				} else if (canvas.ds) {
					const ds = canvas.ds;
					canvasX = ((rect.width / 2) / ds.scale) - ds.offset[0];
					canvasY = ((rect.height / 2) / ds.scale) - ds.offset[1];
				}
				/* ⚑ Y LO DICE EN LA CONSOLA, una línea por press. La posición
				 * es lo único que no se puede ver desde aquí y es justo lo que
				 * ha estado fallando tres versiones seguidas: si el nodo vuelve
				 * a nacer en otro lado, esta línea separa "le mandamos la
				 * coordenada equivocada" de "se la mandamos bien y la ignoró".
				 */
				try {
					console.log('[ImissNuke] Tab at client', Math.round(clientX),
						Math.round(clientY), '· graph', Math.round(canvasX),
						Math.round(canvasY), '·',
						fresh ? 'from the tracked cursor'
							: (canvas.graph_mouse ? 'from graph_mouse (no recent pointer)'
								: 'FROM THE CENTRE — no cursor and no graph_mouse'));
				} catch (err) {}

				// ⚑⚑ AQUÍ SE PARTE EN DOS EL TAB. Todo lo de arriba —abrir el
				// buscador en el cursor— es el hotkey y ya corrió. Todo lo que
				// sigue es la otra mitad: recordar de qué nodo encadenar y a qué
				// punto del grafo mover el que venga.
				//
				// ⚑ Y LA REJA ESTÁ EN LO QUE SE ESCRIBE, no en lo que se busca.
				// Las cuatro variables de `window` de aquí abajo son TODO lo que
				// esta mitad deja atrás; el que las lee es
				// `handleNodeAddedForAutoConnect`, y sin ellas no hace nada. Que
				// la escalera de detección corra igual no cuesta nada y deja el
				// switch definido por una sola frase: con `tabAutoConnect` en
				// false, Tab no escribe nada y el nodo se queda donde el frontend
				// lo puso.
				//
				// ⚑ La escalera NO se toca por otra razón: `__nukeTabAutoConnectSource`
				// también lo escribe el camino de soltar un cable de salida al
				// vacío, que es otro gesto y tiene sus propios switches. Este
				// switch es del Tab, así que vive en el Tab.
				const chain = !cfg || cfg.tabAutoConnect !== false;
				/* ⚑ v17.60 — y la de COLOCAR, que es otra cosa. Ver el bloque de
				   `tabPlaceAtCursor` en DEFAULT_CONFIG. */
				const place = !cfg || cfg.tabPlaceAtCursor !== false;

				// Detect source node for Nuke-style auto-connect:
				let sourceNode = canvas.node_over || null;
				if (!sourceNode && canvas.graph && canvasX !== undefined && canvasY !== undefined) {
					sourceNode = canvas.graph.getNodeOnPos(canvasX, canvasY, canvas.visible_nodes);
				}
				if (!sourceNode && canvas.current_node) {
					sourceNode = canvas.current_node;
				}
				if (!sourceNode && canvas._nukeSelectionOrder && canvas._nukeSelectionOrder.length > 0) {
					sourceNode = canvas._nukeSelectionOrder[canvas._nukeSelectionOrder.length - 1];
				}
				if (!sourceNode && canvas.selected_nodes) {
					const selList = Object.values(canvas.selected_nodes);
					if (selList.length > 0) {
						sourceNode = selList[selList.length - 1];
					}
				}
				if (!sourceNode && canvas.selectedNodes) {
					const selList = Array.isArray(canvas.selectedNodes) ? canvas.selectedNodes : Object.values(canvas.selectedNodes);
					if (selList.length > 0) {
						sourceNode = selList[selList.length - 1];
					}
				}
				// ...and the reader that knows all four spellings, including
				// `selectedItems` - the Nodes 2.0 Set, which is where a newer
				// frontend keeps the selection and which none of the rungs above
				// look at. It is the last rung because the ones above answer "the
				// node you are POINTING at", which beats "the node you selected
				// three clicks ago"; this one is what makes Tab-with-a-selection
				// work at all on a frontend that moved the list.
				if (!sourceNode) {
					try {
						const sel = ImissNukeManager.getSelectedNodesList(canvas) || [];
						if (sel.length > 0) sourceNode = sel[sel.length - 1];
					} catch (err) {}
				}

				if (chain && sourceNode) {
					window.__nukeTabAutoConnectSource = sourceNode;
					window.__nukeTabAutoConnectSlot = null;
					window.__nukeTabAutoConnectTime = Date.now();
				} else {
					window.__nukeTabAutoConnectSource = null;
					window.__nukeTabAutoConnectSlot = null;
					window.__nukeTabAutoConnectTime = null;
				}

				// WHERE the Tab was pressed, remembered even when there is NO source
				// node: the downstream placement further down only runs on the
				// auto-connect path, so with nothing selected there was nothing
				// positioning the new node and nothing selecting it either. In Nuke a
				// new node lands where you were looking.
				//
				// IT IS THE POINTER, NOT `canvasX/canvasY`. Those two fall back to the
				// CENTRE of the view when `graph_mouse` is missing, which is right for
				// opening the dialog and wrong for dropping a node - it is what made
				// every node land in the middle. So the position is computed from the
				// tracked cursor, and when there is no recent one this stays NULL and
				// nothing gets moved: leaving the node where the frontend put it is a
				// worse outcome than the centre only if you can see the difference,
				// and guessing is how you get a node nobody asked to be moved.
				//
				// The node COUNT goes with it, so this can only ever move a node that
				// arrived on its own: a workflow being loaded adds many, and the first
				// of those does not land on count+1.
				let dropX = null, dropY = null;
				const ptr = window.__nukeLastPointer;
				if (place && ptr && canvas.ds && (Date.now() - ptr.t) < 30000) {
					const ds = canvas.ds;
					dropX = ((ptr.x - rect.left) / ds.scale) - ds.offset[0];
					dropY = ((ptr.y - rect.top) / ds.scale) - ds.offset[1];
				} else if (place && canvas.graph_mouse && canvas.graph_mouse[0] !== undefined) {
					dropX = canvas.graph_mouse[0];
					dropY = canvas.graph_mouse[1];
				}
				window.__nukeTabDropPos = (dropX === null) ? null : [dropX, dropY];
				window.__nukeTabDropTime = (dropX === null) ? null : Date.now();
				window.__nukeTabDropCount = (canvas.graph && canvas.graph._nodes)
					? canvas.graph._nodes.length : -1;
				// ⚑⚑ Y EL PRESS SE SELLA APARTE, PASE LO QUE PASE CON LA POSICIÓN.
				// Los tres de arriba dicen DÓNDE cae el nodo, y los tres se quedan
				// en null cuando no hubo cursor que leer. Éste dice otra cosa: que
				// hubo un Tab. Es la pregunta que le faltaba al diagnóstico de
				// `handleNodeAddedForAutoConnect` — que cuelga de `graph.add` y por
				// lo tanto corre en CADA alta, no en cada Tab. Sin este sello, una
				// carga de 96 nodos escribía 96 líneas diciendo la razón
				// equivocada, porque "no se registró posición" es indistinguible
				// de "esto nunca fue un Tab" si no se pregunta.
				window.__nukeTabPressAt = Date.now();

				/* ⚡⚡ v18.51 — `canvasX` / `canvasY`, CAMELCASE. Es lo que lee
				   el buscador del frontend para colocar el nodo
				   (`getNewNodeLocation` → [trigger.canvasX, trigger.canvasY],
				   leído en el bundle 1.52.7). Sólo con las minúsculas el nodo
				   nacía en NaN. Las minúsculas se quedan para litegraph viejo. */
				const fakeEvent = {
					type: 'dblclick',
					clientX, clientY, pageX: clientX, pageY: clientY, screenX: clientX, screenY: clientY,
					x: clientX, y: clientY, canvasx: canvasX, canvasy: canvasY,
					canvasX: canvasX, canvasY: canvasY,
					target: canvasEl,
					__imissNukeTabTriggered: true,
					__nukeTabTriggered: true,
					preventDefault: () => {}, stopPropagation: () => {}, stopImmediatePropagation: () => {}
				};

				window.__imissNukeTabTriggered = true;
				window.__nukeTabTriggered = true;

				try {
					ImissNukeManager.openModernSearch(canvas, fakeEvent, clientX, clientY);
				} catch (err) {
					console.warn('[ImissNuke] Error opening search:', err);
				}

				setTimeout(() => {
					window.__imissNukeTabTriggered = false;
					window.__nukeTabTriggered = false;
				}, 250);
			};
			document.addEventListener('keydown', ImissNukeManager._tabHandler, true);
		}

		/* ⚑⚑ EL LOG DEL FRONTEND DIJO CUÁL ERA EL DEFECTO, PALABRA POR PALABRA.
		 * Jorge pegó la consola de la Linux del estudio y en medio de todo estaba
		 * esta línea, que la escribe ComfyUI y no nosotros:
		 *
		 *     GraphView-....js  The trigger event was undefined when addNode was
		 *                       called.
		 *
		 * Eso NO es un error genérico: es el frontend diciendo que le pidieron
		 * crear un nodo **sin el evento que dice dónde**. Sin evento no hay
		 * coordenada, y sin coordenada cae al único lugar que siempre existe: el
		 * CENTRO de la vista. Que es exactamente lo que Jorge veía — "ya lo crea
		 * pero lo deja justo en el centro" — con el auto-connect YA APAGADO, o sea
		 * con este archivo sin escribir una sola coordenada. El experimento de
		 * v17.57 contestó: no era la mitad de abajo, era cómo se ABRE el buscador.
		 *
		 * ⚑⚑ Y LA CAUSA ES QUE SE PEDÍA POR SEIS CAMINOS A LA VEZ. Esta función
		 * tenía una variable `opened` que se ponía en true y **no la leía nadie**:
		 * los seis caminos corrían siempre, uno tras otro. Dos de ellos llevan la
		 * posición encima (el evento `litegraph:canvas` y el doble click sintético
		 * sobre el canvas, que es literalmente lo que hace un humano). Los otros
		 * son COMANDOS — `Workspace_SearchBox_Toggle` y compañía — y un comando
		 * no lleva evento ninguno.
		 *
		 * Peor: ese comando es un TOGGLE. En un frontend que lo tiene, el camino
		 * bueno abría el buscador con su posición y el comando lo volvía a abrir
		 * (o a cerrar) sin ella, dejando el evento en `undefined`. En un frontend
		 * que NO lo tiene — el de la Windows de Jorge — ese camino nunca hizo
		 * nada, y por eso ahí "funciona bien". Nunca fue el sistema operativo:
		 * fue la versión del frontend, otra vez.
		 *
		 * ⚑⚑ Así que los caminos con posición van primero y solos, y los que no
		 * la llevan quedan de ÚLTIMO RECURSO: sólo se prueban si un momento
		 * después no hay ningún buscador abierto. Eso no le quita nada a la
		 * Windows (ahí ese camino ya no hacía nada) y le devuelve la coordenada a
		 * la Linux.
		 *
		 * ⚑ Y LA DUDA SE RESUELVE A FAVOR DE NO DISPARAR. `searchLooksOpen` mira
		 * por dos vías distintas; si CUALQUIERA dice que hay algo abierto, el
		 * comando no corre. Equivocarse hacia "ya está abierto" deja el buscador
		 * como está; equivocarse al revés dispara un toggle que lo cierra en la
		 * cara del artista.
		 */
		static searchLooksOpen() {
			try {
				if (ImissNukeManager.getOpenSearchBox()) return true;
				return !!document.querySelector(
					'comfy-node-search, .comfy-node-search, .node-search-box, '
					+ '[class*="NodeSearch"], [class*="node-search"], .p-dialog');
			} catch (e) { return false; }
		}

		static openModernSearch(canvas, fakeEvent, clientX, clientY) {
			// ---- GRUPO A: LOS QUE LLEVAN LA POSICIÓN ENCIMA ----

			// A1. El evento propio del frontend Vue: 'litegraph:canvas' con
			// subType 'empty-double-click'. Lleva el evento original Y las
			// coordenadas de canvas, que es todo lo que addNode necesita.
			try {
				const eventDetail = {
					subType: 'empty-double-click',
					originalEvent: fakeEvent,
					clientX, clientY,
					canvasX: fakeEvent.canvasx,
					canvasY: fakeEvent.canvasy
				};
				document.dispatchEvent(new CustomEvent('litegraph:canvas', { detail: eventDetail }));
			} catch (e) {}

			// A2. Un doble click de verdad sobre el canvas, en el cursor. Es el
			// gesto que el frontend ya sabe atender y el único que le entrega un
			// MouseEvent auténtico. Va marcado para que el bloqueo de doble click
			// de este mismo archivo lo deje pasar.
			const canvasEl = (canvas && canvas.canvas) || document.querySelector('canvas.graphcanvas') || document.querySelector('canvas');
			if (canvasEl) {
				const commonEvt = {
					clientX, clientY,
					screenX: clientX, screenY: clientY,
					pageX: clientX, pageY: clientY,
					bubbles: true, cancelable: true, composed: true, view: window,
					button: 0, buttons: 0, detail: 2
				};
				try {
					const dbl = new MouseEvent('dblclick', commonEvt);
					dbl.__imissNukeTabTriggered = true;
					dbl.__nukeTabTriggered = true;
					canvasEl.dispatchEvent(dbl);
				} catch (e) {}
			}

			// ---- GRUPO B: LOS QUE NO. SÓLO SI A NO ABRIÓ NADA ----
			setTimeout(() => {
				if (ImissNukeManager.searchLooksOpen()) return;

				// B0. ⚡ v18.51 — el comando REAL del frontend, por su API
				// pública: `Workspace.SearchBox.Toggle` (con puntos) a través de
				// `extensionManager.command.execute`. Los de B1 son nombres que
				// este frontend no registra así. Sin evento, cae al centro —
				// por eso sigue siendo un respaldo.
				try {
					const cmdApi = (typeof app !== 'undefined' && app.extensionManager
						&& app.extensionManager.command) || null;
					if (cmdApi && typeof cmdApi.execute === 'function') {
						cmdApi.execute('Workspace.SearchBox.Toggle');
						return;
					}
				} catch (e) {}

				// B1. Comandos de la app. Un comando no lleva evento: si este
				// corre, el nodo va a nacer donde el frontend decida y no donde
				// está el cursor. Es un buscador abierto en el lugar equivocado
				// contra ningún buscador, y en ese orden sí vale la pena.
				if (typeof app !== 'undefined' && app.commands) {
					try {
						const cmdNames = [
							'Workspace_SearchBox_Toggle',
							'comfy.open-search',
							'graph:node-search',
							'node-search',
							'comfy.nodes.search',
							'comfy.search',
							'graph:search'
						];
						for (const cmd of cmdNames) {
							if ((app.commands.has && app.commands.has(cmd)) || (app.commands.get && app.commands.get(cmd))) {
								if (typeof app.commands.execute === 'function') {
									app.commands.execute(cmd, { event: fakeEvent, clientX, clientY });
									break;
								}
							}
						}
					} catch (e) {}
				}

				// B2. La paleta de comandos del extensionManager.
				if (!ImissNukeManager.searchLooksOpen()
						&& typeof app !== 'undefined' && app.extensionManager) {
					try {
						const extCmds = app.extensionManager.commands || (app.extensionManager.commandPalette && app.extensionManager.commandPalette.commands) || [];
						const list = Array.isArray(extCmds) ? extCmds : Object.values(extCmds);
						for (const cmd of list) {
							if (!cmd) continue;
							const id = (cmd.id || '').toLowerCase();
							const name = (cmd.name || '').toLowerCase();
							if (id.includes('search') || name.includes('search')) {
								if (typeof cmd.callback === 'function') { cmd.callback({ event: fakeEvent, clientX, clientY }); break; }
								if (typeof cmd.execute === 'function') { cmd.execute({ event: fakeEvent, clientX, clientY }); break; }
							}
						}
					} catch (e) {}
				}

				// B3. El componente de búsqueda de la UI vieja.
				if (!ImissNukeManager.searchLooksOpen()
						&& typeof app !== 'undefined' && app.ui && app.ui.nodeSearch
						&& typeof app.ui.nodeSearch.show === 'function') {
					try { app.ui.nodeSearch.show(fakeEvent); } catch (e) {}
				}

				// B4. Y el buscador clásico de litegraph, hasta el final.
				setTimeout(() => {
					if (!ImissNukeManager.searchLooksOpen() && canvas
							&& typeof canvas.showNodeSearchBox === 'function') {
						canvas.showNodeSearchBox(fakeEvent);
					}
				}, 80);
			}, 60);
		}

		// ---- TAB ON NODE AUTO-CONNECT (FOUNDRY NUKE BEHAVIOR) ----
		/* ⚑⚑ EL PROTOTIPO DEL GRAFO VIVO, NO EL GLOBAL `LGraph`.
		 *
		 * Este es el enganche del que cuelgan las DOS mitades de Tab: colocar
		 * el nodo donde se apretó y conectarlo al que estaba seleccionado. Si
		 * no corre, Tab abre el buscador, el nodo nace donde el frontend
		 * quiera y nada se conecta — que es, palabra por palabra, el síntoma
		 * que Jorge reportó de Linux y no de Windows.
		 *
		 * La versión anterior lo buscaba en dos lugares, y los dos se pueden
		 * caer sin avisar:
		 *
		 *   1. `LGraph` como GLOBAL suelto. Es de litegraph clásico; el
		 *      frontend nuevo de ComfyUI es un módulo y no está obligado a
		 *      colgarlo de window. Donde no está, `typeof LGraph` es
		 *      'undefined', el `if` no entra y el parche duradero nunca se
		 *      pone — en silencio, que es lo peor de todo.
		 *   2. `app.graph.add` como propiedad PROPIA del objeto grafo. Esa sí
		 *      se pone, y se muere en cuanto `app.graph` es OTRO objeto: abrir
		 *      un workflow, "new", cargar un .json. A partir de ahí Tab deja
		 *      de colocar y de conectar en la misma sesión que empezó bien.
		 *
		 * El único lugar que siempre existe y siempre sobrevive es el
		 * PROTOTIPO del grafo que ya está vivo — y no hay que saber cómo se
		 * llama la clase para pedirlo. Un grafo nuevo nace de la misma clase,
		 * así que el parche viaja con él.
		 *
		 * ⚑ Se parchan TODOS los destinos distintos que aparezcan, no el
		 * primero: cuestan una comparación cada uno y son la diferencia entre
		 * "debería estar cubierto" y estarlo. Que un nodo pase por dos de ellos
		 * lo resuelve el sello de handleNodeAddedForAutoConnect.
		 */
		static setupAutoConnectOnAdd() {
			const targets = [];
			const push = (obj) => {
				if (!obj || typeof obj.add !== 'function') return;
				if (targets.indexOf(obj) === -1) targets.push(obj);
			};

			try {
				const g = (typeof app !== 'undefined' && app.graph) ? app.graph : null;
				if (g) push(Object.getPrototypeOf(g));
				if (typeof LGraph !== 'undefined' && LGraph && LGraph.prototype) {
					push(LGraph.prototype);
				}
				// ⚑ El objeto grafo en persona queda de ÚLTIMO recurso, para un
				// frontend donde `add` sea una propiedad propia y no herencia.
				// Es el enganche que se muere al cambiar de workflow, así que
				// sólo se usa cuando no hay prototipo que lo tenga.
				if (g && Object.prototype.hasOwnProperty.call(g, 'add')) push(g);
			} catch (e) {}

			for (const target of targets) {
				try {
					if (target.add.__imissNukeAutoConnectPatched) continue;
					const origAdd = target.add;
					const wrapped = function (node, skip_compute_order) {
						const res = origAdd.apply(this, arguments);
						ImissNukeManager.handleNodeAddedForAutoConnect(node);
						return res;
					};
					wrapped.__imissNukeAutoConnectPatched = true;
					target.add = wrapped;
				} catch (e) {}
			}

			ImissNukeManager._autoConnectTargets = targets.length;
			if (!targets.length) {
				console.warn('[ImissNuke] no graph.add to patch yet — Tab will '
					+ 'open the search but cannot place or connect the new node');
			}
			return targets.length;
		}

		/* ⚑⚑ UN NODO CON POSICIÓN NaN NO SE PUEDE PICAR. ESE ERA EL "LOCKEADO".
		 *
		 * Jorge, con la línea de v17.60 en la mano:
		 *
		 *     [ImissNuke] Tab moved the new node from NaN NaN to -1023 2344
		 *
		 * `from NaN NaN` quiere decir que en el instante de `graph.add` el nodo
		 * YA venía con `pos = [NaN, NaN]`. Y eso explica el segundo síntoma
		 * entero, el que llevaba cinco versiones sin explicación: **toda
		 * comparación con NaN es false**, así que el hit-test de litegraph
		 * (`x >= pos[0] && x <= pos[0] + size[0]`) contesta que no en cada
		 * pixel de la pantalla. El nodo se dibuja pero **no existe para el
		 * mouse**: no se selecciona, no se arrastra, no se borra picándolo.
		 * "Lockeado", exactamente.
		 *
		 * ⚑⚑ Y DE DÓNDE SALE EL NaN: de la advertencia que ComfyUI ya venía
		 * gritando. `The trigger event was undefined when addNode was called`
		 * ⇒ el frontend calcula la posición a partir de un evento que no
		 * existe, `undefined - algo` es NaN, y el nodo nace con NaN. Los dos
		 * síntomas eran uno solo visto por dos lados, y la advertencia era la
		 * causa y no un efecto.
		 *
		 * ⚑⚑ POR ESO ESTO NO PREGUNTA POR NINGÚN SWITCH. Un nodo con NaN está
		 * ROTO — no es una preferencia, no es una opción de colocación, y no
		 * importa quién lo creó ni si el Tab tuvo algo que ver. Sanear eso es
		 * como cerrarle la llave a una fuga: se hace siempre. Los switches
		 * deciden DÓNDE va el nodo; esto decide que el nodo sea usable.
		 *
		 * ⚑ El tamaño se revisa igual y por la misma razón: un `size` con NaN
		 * hace la caja NaN, y una caja NaN es igual de inclicable que una
		 * posición NaN.
		 */
		static sanitizeNode(node, fallback) {
			if (!node) return false;
			const bad = (v) => typeof v !== 'number' || !isFinite(v);
			let fixed = '';

			try {
				if (node.size && (bad(node.size[0]) || bad(node.size[1]))) {
					let s = null;
					try {
						s = (typeof node.computeSize === 'function') ? node.computeSize() : null;
					} catch (e) { s = null; }
					node.size[0] = (s && !bad(s[0])) ? s[0] : 200;
					node.size[1] = (s && !bad(s[1])) ? s[1] : 80;
					fixed += ' size';
				}
			} catch (e) {}

			try {
				if (node.pos && (bad(node.pos[0]) || bad(node.pos[1]))) {
					/* ⚑ LA ESCALERA DEL RESCATE, y el centro es el ÚLTIMO peldaño.
					   Este saneo también alcanza a un nodo creado SIN Tab, con el
					   doble click de la casa — y quien dio ese doble click lo dio
					   en algún lado: el cursor es lo que quiso decir, el centro es
					   sólo lo que queda cuando no hay nada mejor. */
					let p = fallback;
					if (!p || bad(p[0]) || bad(p[1])) p = ImissNukeManager.pointerGraphPos();
					if (!p || bad(p[0]) || bad(p[1])) p = ImissNukeManager.viewCentre();
					node.pos[0] = p[0];
					node.pos[1] = p[1];
					fixed += ' pos';
				}
			} catch (e) {}

			if (fixed) {
				/* ⚑⚑ Y NOMBRA A NODES 2.0, porque es la mitad de la frase que
				   costó cinco versiones. Con el renderer clásico esta reparación
				   ALCANZA (el canvas hace su hit-test contra `node.pos`); con
				   Nodes 2.0 el que recibe el click es un elemento del DOM y
				   `node.pos` es sólo un espejo, así que repararlo deja el modelo
				   bien y el nodo igual de intocable. Decirlo aquí es la
				   diferencia entre "esto no sirve" y "esto no puede servir con
				   ese renderer prendido". */
				let vue = '';
				try {
					const on = NukeVueNodes.isOn();
					vue = (on === true)
						? ' ⚑ ComfyUI Nodes 2.0 (Vue nodes) is ON — with that '
							+ 'renderer the node you click is a DOM element and '
							+ 'node.pos is only a mirror, so this repair fixes the '
							+ 'model and NOT what is on screen. Switch it off in '
							+ 'the ImissNuke panel and Tab behaves.'
						: (on === false ? ' (Nodes 2.0 is off)' : '');
				} catch (e) {}
				try {
					console.warn('[ImissNuke] the frontend created "'
						+ (node.title || node.type || 'a node')
						+ '" with a NaN' + fixed + ' — a NaN box fails every hit '
						+ 'test, which is why it could not be clicked or dragged. '
						+ 'Repaired to ' + Math.round(node.pos[0]) + ' '
						+ Math.round(node.pos[1]) + '.' + vue);
				} catch (e) {}
			}
			return !!fixed;
		}

		/* Dónde está el cursor, en coordenadas de grafo, o null. Es el mismo
		   `__nukeLastPointer` que el Tab ya usa; aquí sirve para que un nodo
		   rescatado caiga donde la persona estaba mirando.
		   ⚑ Con caducidad, como en el Tab: un puntero de hace media hora no es
		   "donde estabas mirando", es un número viejo. */
		static pointerGraphPos() {
			try {
				const ptr = window.__nukeLastPointer;
				const canvas = (typeof app !== 'undefined') ? app.canvas : null;
				const el = canvas && canvas.canvas;
				const ds = canvas && canvas.ds;
				if (!ptr || !el || !ds) return null;
				if (Date.now() - ptr.t > 30000) return null;
				const r = el.getBoundingClientRect();
				return [((ptr.x - r.left) / ds.scale) - ds.offset[0],
					((ptr.y - r.top) / ds.scale) - ds.offset[1]];
			} catch (e) { return null; }
		}

		/* El centro de la vista EN COORDENADAS DE GRAFO — el último recurso
		   honesto cuando no hay ni cursor ni posición que valga. */
		static viewCentre() {
			try {
				const canvas = (typeof app !== 'undefined') ? app.canvas : null;
				const el = canvas && canvas.canvas;
				const ds = canvas && canvas.ds;
				if (el && ds) {
					const r = el.getBoundingClientRect();
					return [((r.width / 2) / ds.scale) - ds.offset[0],
						((r.height / 2) / ds.scale) - ds.offset[1]];
				}
			} catch (e) {}
			return [0, 0];
		}

		static handleNodeAddedForAutoConnect(node) {
			const cfg = window.__imissNukeConfig;
			if (cfg && cfg.masterEnabled === false) return;
			// ⚑ UN add, UNA vez. Ahora se parcha más de un destino a propósito,
			// y un grafo cuyo `add` propio llame al del prototipo pasaría por
			// los dos con el mismo nodo. Es por ALTA, no por nodo: deshacer y
			// rehacer vuelve a dar de alta el MISMO objeto y esa vez sí cuenta.
			try {
				const now = Date.now();
				if (node && node.__imissNukeAddedAt && (now - node.__imissNukeAddedAt) < 50) return;
				if (node) node.__imissNukeAddedAt = now;
			} catch (e) {}
			/* ⚑⚑ EL SANEO VA PRIMERO Y VA SIEMPRE. Antes de cualquier switch,
			   antes de colocar y antes de encadenar: lo que sigue lee
			   `node.pos`, y leer NaN es propagarlo. */
			try {
				ImissNukeManager.sanitizeNode(node, window.__nukeTabDropPos);
			} catch (e) {}
			try {
				const src = window.__nukeTabAutoConnectSource;
				const time = window.__nukeTabAutoConnectTime;
				const slot = window.__nukeTabAutoConnectSlot;

				if (cfg && cfg.nukeInstantPlacement !== false) {
					if (node && node.flags) node.flags.ghost = false;
					const canvas = typeof app !== 'undefined' ? app.canvas : null;
					if (canvas) {
						if (canvas.node_dragged === node) canvas.node_dragged = null;
						if (canvas.dragging_canvas) canvas.dragging_canvas = false;
						if (typeof canvas.finalizeGhostPlacement === 'function') {
							try { canvas.finalizeGhostPlacement(false); } catch (e) {}
						}
					}
				}

				// Nothing to chain from: put it where the Tab was pressed and SELECT
				// it, so it is never a node you have to go looking for. The
				// auto-connect branch below does its own placement, which is why this
				// is the ELSE of exactly that condition and not a second opinion.
				// Consumed on use, so at most one node can ever be moved by one Tab.
				if (!(src && node && src !== node && time && (Date.now() - time < 45000))) {
					const dp = window.__nukeTabDropPos;
					const dt = window.__nukeTabDropTime;
					const dc = window.__nukeTabDropCount;
					const gr = (typeof app !== 'undefined' && app.graph)
						|| (node && node.graph) || null;
					const grew = (dc === -1) || !gr || !gr._nodes
						|| gr._nodes.length === dc + 1;
					if (node && node.pos && dp && dt && grew
							&& (Date.now() - dt < 45000)) {
						window.__nukeTabDropPos = null;
						window.__nukeTabDropTime = null;
						// ⚑ El press se consume aquí TAMBIÉN, no sólo en el else.
						// Este camino ya escribió su línea ("Tab moved the new
						// node from…"), así que dejar el sello vivo dejaba que la
						// siguiente alta cualquiera — dentro de los 45s — gastara
						// el turno de la razón contraria sobre un nodo que nadie
						// pidió por Tab. Un press: una línea, la que toque.
						window.__nukeTabPressAt = null;
						const was = [node.pos[0], node.pos[1]];
						node.pos[0] = dp[0];
						node.pos[1] = dp[1];
						const cv = (typeof app !== 'undefined') ? app.canvas : null;
						if (cv) {
							try {
								if (typeof cv.selectNode === 'function') cv.selectNode(node);
							} catch (err) {}
							try { cv.setDirty(true, true); } catch (err) {}
						}
						/* ⚑⚑ Y LO DICE. Ésta es la línea que contesta la pregunta
						   que lleva cuatro versiones sin contestarse: si el nodo
						   sigue en el centro DESPUÉS de esto, entonces algo lo
						   está volviendo a mover después de nosotros — y eso ya
						   no es una teoría, es una resta que se lee. */
						try {
							const wasNaN = !isFinite(was[0]) || !isFinite(was[1]);
							console.log('[ImissNuke] Tab moved the new node from',
								wasNaN ? 'NaN' : Math.round(was[0]),
								wasNaN ? 'NaN' : Math.round(was[1]), 'to',
								Math.round(dp[0]), Math.round(dp[1]),
								wasNaN ? '· ⚑ it was born with a NaN position and has '
									+ 'been repaired — that is what made it '
									+ 'unclickable' : '');
						} catch (err) {}
						/* ⚑⚑ Y SE VUELVE A PONER, TRES VECES, POR SI ALGUIEN LO
						   PISA DESPUÉS. `graph.add` no es el final del trabajo
						   del frontend: lo que sigue corriendo después de que
						   volvemos puede escribir `pos` otra vez desde el mismo
						   evento inexistente, y nuestro arreglo síncrono se
						   perdería sin dejar rastro.
						   ⚑ SÓLO se corrige un NaN, nunca una posición finita:
						   una finita distinta puede ser el artista arrastrando
						   el nodo, y pelearle al artista es peor que el bug. */
						ImissNukeManager.holdPos(node, [dp[0], dp[1]]);
					} else if (node) {
						/* ⚑ Y CUANDO NO LO MUEVE, DICE POR QUÉ. Un silencio aquí
						   se ve idéntico a "el switch no sirve", y son cuatro
						   razones distintas con cuatro arreglos distintos.

						   ⚑⚑ PERO SÓLO SI HUBO UN TAB, y eso hay que PREGUNTARLO.
						   Esto vive en `graph.add`, así que corre en cada alta:
						   cada nodo de una carga de workflow, cada nodo de un
						   paste, cada nodo que pone el panel. Y como `dp` se
						   consume al usarse, a partir del primer Tab TODA alta
						   caía aquí con `dp` null y escribía la primera razón —
						   "is Place new node at cursor on?" — que era la
						   equivocada: el switch no tenía nada que ver, es que eso
						   no fue un Tab. En el log del estudio eso son 96 líneas
						   idénticas por workflow abierto, tapando justo la línea
						   que este diagnóstico existe para que se lea.

						   ⚑ La reja son las dos caras del press: `dp` prueba que
						   hubo uno (y entonces la razón es `grew` o el vencimiento),
						   y el sello lo prueba cuando el press NO pudo registrar
						   posición, que es exactamente el caso de la primera razón.
						   Mismo horizonte de 45s que usa el resto del bloque,
						   porque el nodo no llega en el press: llega cuando el
						   artista elige en el buscador.
						   ⚑ Y se consume: un press escribe a lo más una línea. */
						const pressAt = window.__nukeTabPressAt;
						const wasTab = !!dp
							|| !!(pressAt && (Date.now() - pressAt) < 45000);
						if (wasTab) {
							window.__nukeTabPressAt = null;
							try {
								console.log('[ImissNuke] Tab did NOT move the new node ·',
									!dp ? 'no drop position was recorded (is '
										+ '"Place new node at cursor" on?)'
										: !grew ? 'the graph grew by more than one node '
											+ '(a workflow load, not a Tab)'
											: 'the drop position was stale (>45s)');
							} catch (err) {}
						}
					}
				}

				if (src && node && src !== node && time && (Date.now() - time < 45000)) {
					window.__nukeTabAutoConnectSource = null;
					window.__nukeTabAutoConnectSlot = null;
					window.__nukeTabAutoConnectTime = null;

					const tryConnect = (attempt = 0) => {
						const graph = (typeof app !== 'undefined' && app.graph) || src.graph || node.graph;
						const realSrc = (typeof src === 'object' && src.outputs) ? src : (graph && graph.getNodeById(src?.id || src));
						const realNode = (typeof node === 'object' && node.inputs) ? node : (graph && graph.getNodeById(node?.id || node));

						if (!realSrc || !realNode) return;

						// If inputs are still being populated asynchronously, retry up to 6 times
						if ((!realNode.inputs || realNode.inputs.length === 0) && attempt < 6) {
							setTimeout(() => tryConnect(attempt + 1), 60 + attempt * 50);
							return;
						}

						ImissNukeManager.connectSourceToNewNode(realSrc, realNode, slot);
					};

					setTimeout(() => tryConnect(0), 40);
				}
			} catch (e) {
				console.warn('[ImissNuke] Tab auto-connect error:', e);
			}
		}

		/* Vuelve a poner la posición si algo la dejó en NaN otra vez. Tres
		   intentos cortos y se acaba: si a los 200ms sigue apareciendo NaN, el
		   problema no es una carrera y hay que verlo de otro modo — y la línea
		   lo dice para que se sepa cuál de los dos es. */
		static holdPos(node, want) {
			const step = (n) => {
				try {
					if (!node || !node.pos) return;
					if (!isFinite(node.pos[0]) || !isFinite(node.pos[1])) {
						node.pos[0] = want[0];
						node.pos[1] = want[1];
						console.warn('[ImissNuke] something set the node back to NaN '
							+ 'after we placed it (attempt ' + n + ') — put back at '
							+ Math.round(want[0]) + ' ' + Math.round(want[1]));
						const cv = (typeof app !== 'undefined') ? app.canvas : null;
						if (cv && cv.setDirty) cv.setDirty(true, true);
					}
				} catch (e) {}
				if (n < 3) setTimeout(() => step(n + 1), 60 * n);
			};
			setTimeout(() => step(1), 0);
		}

		static connectSourceToNewNode(src, node, preferredOutputSlot = null) {
			if (!src || !node) return;
			if (!src.outputs || src.outputs.length === 0) return;
			if (!node.inputs || node.inputs.length === 0) return;

			let connected = false;

			// 1. If preferredOutputSlot is provided (e.g. from output wire drop)
			if (preferredOutputSlot != null && src.outputs[preferredOutputSlot]) {
				const out = src.outputs[preferredOutputSlot];
				for (let ii = 0; ii < node.inputs.length; ii++) {
					const inp = node.inputs[ii];
					if (!inp || inp.link != null) continue;
					if (GeometryUtils.areTypesCompatible(out.type, inp.type)) {
						src.connect(preferredOutputSlot, node, ii);
						connected = true;
						break;
					}
				}
				if (!connected) {
					// Connect to first unlinked input
					for (let ii = 0; ii < node.inputs.length; ii++) {
						const inp = node.inputs[ii];
						if (!inp || inp.link != null) continue;
						src.connect(preferredOutputSlot, node, ii);
						connected = true;
						break;
					}
				}
			}

			// 2. Pass 1: exact slot type match (e.g. IMAGE->IMAGE, LATENT->LATENT, MODEL->MODEL)
			if (!connected) {
				for (let oi = 0; oi < src.outputs.length; oi++) {
					const out = src.outputs[oi];
					if (!out) continue;
					const outType = String(out.type || '').toUpperCase();
					if (!outType || outType === '*') continue;

					for (let ii = 0; ii < node.inputs.length; ii++) {
						const inp = node.inputs[ii];
						if (!inp || inp.link != null) continue;
						const inType = String(inp.type || '').toUpperCase();

						if (outType === inType) {
							src.connect(oi, node, ii);
							connected = true;
							break;
						}
					}
					if (connected) break;
				}
			}

			// 3. Pass 2: compatible slot types via GeometryUtils
			if (!connected) {
				for (let oi = 0; oi < src.outputs.length; oi++) {
					const out = src.outputs[oi];
					if (!out) continue;

					for (let ii = 0; ii < node.inputs.length; ii++) {
						const inp = node.inputs[ii];
						if (!inp || inp.link != null) continue;

						if (GeometryUtils.areTypesCompatible(out.type, inp.type)) {
							src.connect(oi, node, ii);
							connected = true;
							break;
						}
					}
					if (connected) break;
				}
			}

			// 4. Pass 3: Nuke default - chain primary output 0 to primary input 0 if free
			if (!connected && node.inputs[0] && node.inputs[0].link == null && src.outputs[0]) {
				try {
					src.connect(0, node, 0);
					connected = true;
				} catch (e) {}
			}

			// If node was placed directly on top of src or instant placement is enabled, position it cleanly downstream (to the right)
			const cfg = window.__imissNukeConfig || {};
			if (src && node && src.pos && node.pos) {
				const dist = Math.hypot(node.pos[0] - src.pos[0], node.pos[1] - src.pos[1]);
				if (dist < 45 || cfg.nukeInstantPlacement !== false) {
					const srcWidth = (src.size && src.size[0]) ? src.size[0] : 220;
					let targetX = src.pos[0] + srcWidth + 50;
					let targetY = src.pos[1];

					const graph = (typeof app !== 'undefined' && app.graph) || src.graph || node.graph;
					if (graph && graph._nodes) {
						for (let loop = 0; loop < 10; loop++) {
							let collides = false;
							for (const other of graph._nodes) {
								if (other && other !== node && other !== src && other.pos) {
									const ox = other.pos[0];
									const oy = other.pos[1];
									const oh = (other.size && other.size[1]) || 100;
									if (Math.abs(targetX - ox) < 80 && Math.abs(targetY - oy) < 60) {
										targetY = oy + oh + 30;
										collides = true;
										break;
									}
								}
							}
							if (!collides) break;
						}
					}
					node.pos[0] = targetX;
					node.pos[1] = targetY;
				}
			}

			const canvas = typeof app !== 'undefined' ? app.canvas : null;
			if (canvas) {
				if (typeof canvas.selectNode === 'function') {
					try { canvas.selectNode(node); } catch (e) {}
				}
				ImissNukeManager.cleanupLimboLinks(canvas);
			}

			if (connected && typeof app !== 'undefined' && app.canvas) {
				app.canvas.setDirty(true, true);
				if (app.graph && app.graph.change) app.graph.change();
			}
		}

		// ---- 6. RASTREADOR DEL ORDEN EXACTO DE SELECCIÓN ----
		static patchSelectionOrderTracker() {
			if (typeof LGraphCanvas === 'undefined') return;

			if (LGraphCanvas.prototype.selectNode && !LGraphCanvas.prototype.selectNode.__imissNukeTrackerPatched) {
				const origSelectNode = LGraphCanvas.prototype.selectNode;
				LGraphCanvas.prototype.selectNode = function (node, add_to_selection) {
					if (!this._nukeSelectionOrder) this._nukeSelectionOrder = [];
					if (!add_to_selection) {
						this._nukeSelectionOrder = node ? [node] : [];
					} else if (node) {
						this._nukeSelectionOrder = this._nukeSelectionOrder.filter(n => n && n.id !== node.id);
						this._nukeSelectionOrder.push(node);
					}
					return origSelectNode.apply(this, arguments);
				};
				LGraphCanvas.prototype.selectNode.__imissNukeTrackerPatched = true;
			}

			if (LGraphCanvas.prototype.selectNodes && !LGraphCanvas.prototype.selectNodes.__imissNukeTrackerPatched) {
				const origSelectNodes = LGraphCanvas.prototype.selectNodes;
				LGraphCanvas.prototype.selectNodes = function (nodes, add_to_selection) {
					if (!this._nukeSelectionOrder) this._nukeSelectionOrder = [];
					const arr = Array.isArray(nodes) ? nodes : Object.values(nodes || {});
					if (!add_to_selection) {
						this._nukeSelectionOrder = [...arr];
					} else {
						const newIds = new Set(arr.map(n => n.id));
						this._nukeSelectionOrder = this._nukeSelectionOrder.filter(n => n && !newIds.has(n.id));
						this._nukeSelectionOrder.push(...arr);
					}
					return origSelectNodes.apply(this, arguments);
				};
				LGraphCanvas.prototype.selectNodes.__imissNukeTrackerPatched = true;
			}

			if (LGraphCanvas.prototype.deselectNode && !LGraphCanvas.prototype.deselectNode.__imissNukeTrackerPatched) {
				const origDeselectNode = LGraphCanvas.prototype.deselectNode;
				LGraphCanvas.prototype.deselectNode = function (node) {
					if (this._nukeSelectionOrder && node) {
						this._nukeSelectionOrder = this._nukeSelectionOrder.filter(n => n && n.id !== node.id);
					}
					return origDeselectNode.apply(this, arguments);
				};
				LGraphCanvas.prototype.deselectNode.__imissNukeTrackerPatched = true;
			}

			if (LGraphCanvas.prototype.deselectAllNodes && !LGraphCanvas.prototype.deselectAllNodes.__imissNukeTrackerPatched) {
				const origDeselectAll = LGraphCanvas.prototype.deselectAllNodes;
				LGraphCanvas.prototype.deselectAllNodes = function () {
					this._nukeSelectionOrder = [];
					return origDeselectAll.apply(this, arguments);
				};
				LGraphCanvas.prototype.deselectAllNodes.__imissNukeTrackerPatched = true;
			}
		}

		static getSelectedNodesList(canvas) {
			const c = canvas || (typeof app !== 'undefined' ? app.canvas : null);
			if (!c) return [];

			const nodesMap = new Map();

			// 1. From selected_nodes object
			if (c.selected_nodes) {
				for (const id in c.selected_nodes) {
					const n = c.selected_nodes[id];
					if (n && n.id !== undefined) nodesMap.set(parseInt(n.id, 10), n);
				}
			}

			// 2. From selectedItems (ComfyUI Nodes 2.0 Set/Map)
			if (c.selectedItems) {
				const items = c.selectedItems.values ? Array.from(c.selectedItems.values()) : Array.from(c.selectedItems);
				for (const item of items) {
					if (item && item.id !== undefined && (item.type || item.inputs || item.outputs || item.pos)) {
						nodesMap.set(parseInt(item.id, 10), item);
					}
				}
			}

			// 3. From selectedNodes (Vue array)
			if (c.selectedNodes) {
				const list = Array.isArray(c.selectedNodes) ? c.selectedNodes : Object.values(c.selectedNodes);
				for (const n of list) {
					if (n && n.id !== undefined) nodesMap.set(parseInt(n.id, 10), n);
				}
			}

			// 4. From graph nodes marked with is_selected or selected
			const graph = c.graph || (typeof app !== 'undefined' ? app.graph : null);
			if (graph && graph._nodes) {
				for (const n of graph._nodes) {
					if (n && (n.is_selected || n.selected)) {
						nodesMap.set(parseInt(n.id, 10), n);
					}
				}
			}

			// 5. Fallback to current_node or node_over if only 1 active
			if (nodesMap.size === 0) {
				if (c.current_node) nodesMap.set(parseInt(c.current_node.id, 10), c.current_node);
				else if (c.node_over) nodesMap.set(parseInt(c.node_over.id, 10), c.node_over);
			}

			// Order them by selection order if available
			let ordered = [];
			if (c._nukeSelectionOrder && c._nukeSelectionOrder.length > 0) {
				for (const n of c._nukeSelectionOrder) {
					const id = parseInt(n?.id, 10);
					if (nodesMap.has(id)) {
						ordered.push(nodesMap.get(id));
						nodesMap.delete(id);
					}
				}
			}
			if (nodesMap.size > 0) {
				ordered.push(...Array.from(nodesMap.values()));
			}

			// Put current_node at the end if present
			if (c.current_node && nodesMap.has(parseInt(c.current_node.id, 10))) {
				const currId = parseInt(c.current_node.id, 10);
				if (ordered.length > 1 && ordered[ordered.length - 1].id !== currId) {
					ordered = ordered.filter(n => n.id !== currId);
					ordered.push(c.current_node);
				}
			}
			return ordered;
		}

		static getOrderedSelectedNodes(canvas) {
			return ImissNukeManager.getSelectedNodesList(canvas);
		}

		// ---- 7a. LAYOUT (tecla L) ----
		//
		// Jorge: "quiero un nuevo shortcut como en Nuke, que si le pico la tecla
		// L en los nodos seleccionados se me acomoden todos para que no salgan
		// amontonados... ya hay un tool de Comfy pero no los alinea con la
		// logica de Nuke."
		//
		// LA LOGICA DE NUKE, GIRADA 90 GRADOS. En Nuke el grafo baja; en
		// LiteGraph va de izquierda a derecha. Lo que se conserva es lo que
		// hace que un autoplace se vea "de Nuke" y no una rejilla:
		//   1. COLUMNA = camino mas largo desde una fuente. Un nodo nunca queda
		//      a la izquierda de algo que lo alimenta, aunque el artista lo haya
		//      arrastrado ahi. Ordenar por el camino MAS LARGO y no por el mas
		//      corto es lo que evita que una rama corta se encime con una larga.
		//   2. ORDEN DENTRO DE LA COLUMNA = baricentro de los vecinos, en
		//      barridas de ida y vuelta. Es lo que descruza los cables: dos
		//      ramas que se cruzaban acaban una arriba de la otra.
		//   3. Y = el centro de sus entradas. Un nodo con una sola entrada queda
		//      EN LINEA con ella, que es el gesto que uno reconoce de Nuke; con
		//      varias, a la mitad de todas.
		//
		// LOS SUELTOS NO SE MUEVEN. Un Note o un nodo sin cable hacia el resto
		// de la seleccion no tiene lugar en la cadena, y mandarlo a la columna 0
		// es moverlo a un lugar que nadie pidio. Se quedan donde estan.
		//
		// Y EL BLOQUE NO SE VA DE VIAJE: el resultado se ancla a la esquina
		// superior izquierda que la seleccion YA tenia. Un acomodo que ademas
		// teletransporta el grafo obliga a buscarlo.
		static layoutNodes(nodes, opts) {
			const o = opts || {};
			const GAP_X = o.gapX || 80;
			const GAP_Y = o.gapY || 40;
			if (typeof app === 'undefined' || !app.graph) return 0;
			const graph = app.graph;
			const list = (nodes || []).filter(n => n && n.pos);
			if (list.length < 2) return 0;

			// ⚡⚡ v17.94 — `_collapsed_width` LO ESCRIBE EL QUE DIBUJA. Un nodo
			// recién creado no se ha dibujado nunca, así que no tiene ninguno, y
			// `120` para una barra que dice
			// `ABC123_010_020A_ml_lookdev_artist_v001` se queda corto por 200 px:
			// por eso el bundle salía encimado aunque el acomodo hubiera corrido.
			// Medido en el frontend 1.52.7:
			//     _collapsed_width === min(size[0], max(80, measureText(title) + 24))
			// con `14px Arial`. Se copia la cuenta, incluido el clamp contra el
			// ancho abierto, porque medir distinto que el que dibuja es la forma
			// larga de no medir.
			const W = (n) => (n.flags && n.flags.collapsed)
				? (n._collapsed_width || ImissNukeManager.collapsedWidth(n))
				: ((n.size && n.size[0]) || 200);
			const H = (n) => (n.flags && n.flags.collapsed)
				? 30
				: ((n.size && n.size[1]) || 60);

			const byId = new Map();
			list.forEach(n => byId.set(String(n.id), n));
			const preds = new Map();
			const succs = new Map();
			list.forEach(n => { preds.set(String(n.id), []); succs.set(String(n.id), []); });

			// Aristas INTERNAS a la seleccion. Un cable que sale del grupo no
			// dice nada sobre como acomodar lo que si esta dentro.
			for (const n of list) {
				for (const inp of (n.inputs || [])) {
					if (inp == null || inp.link == null) continue;
					const link = graph.links && graph.links[inp.link];
					if (!link) continue;
					const oid = String(link.origin_id);
					if (!byId.has(oid) || oid === String(n.id)) continue;
					preds.get(String(n.id)).push(oid);
					succs.get(oid).push(String(n.id));
				}
			}

			const wired = list.filter(n => preds.get(String(n.id)).length
				|| succs.get(String(n.id)).length);
			if (wired.length < 2) return 0;

			// Columna = camino mas largo. `visiting` corta ciclos: un grafo con
			// un lazo es raro pero no es imposible, y sin la guarda esto se
			// cuelga en vez de acomodar.
			const layer = new Map();
			const visiting = new Set();
			const depth = (id) => {
				if (layer.has(id)) return layer.get(id);
				if (visiting.has(id)) return 0;
				visiting.add(id);
				let d = 0;
				for (const p of preds.get(id)) d = Math.max(d, depth(p) + 1);
				visiting.delete(id);
				layer.set(id, d);
				return d;
			};
			wired.forEach(n => depth(String(n.id)));

			const cols = new Map();
			wired.forEach(n => {
				const k = layer.get(String(n.id)) || 0;
				if (!cols.has(k)) cols.set(k, []);
				cols.get(k).push(n);
			});
			const keys = Array.from(cols.keys()).sort((a, b) => a - b);

			// Arranque: el orden vertical que el artista ya tenia. El baricentro
			// reordena a partir de ahi, asi que dos nodos sin relacion conservan
			// el orden que el escogio.
			keys.forEach(k => cols.get(k).sort((a, b) => a.pos[1] - b.pos[1]));

			// Barridas ida y vuelta. Cuatro: con menos quedan cruces en grafos
			// de tres o mas ramas, con mas no cambia nada medible.
			for (let s = 0; s < 4; s++) {
				const fwd = (s % 2) === 0;
				const order = fwd ? keys : keys.slice().reverse();
				for (const k of order) {
					const col = cols.get(k);
					const neigh = cols.get(fwd ? k - 1 : k + 1) || [];
					const rank = new Map();
					neigh.forEach((n, i) => rank.set(String(n.id), i));
					const was = new Map();
					col.forEach((n, i) => was.set(String(n.id), i));
					const bc = new Map();
					col.forEach((n) => {
						const rel = fwd ? preds.get(String(n.id)) : succs.get(String(n.id));
						const rs = rel.map(id => rank.get(id)).filter(v => v != null);
						// Sin vecinos de ese lado NO se manda al final: se queda donde
						// estaba. "No tengo opinion" no es "hasta abajo".
						bc.set(String(n.id), rs.length
							? rs.reduce((a, b) => a + b, 0) / rs.length
							: was.get(String(n.id)));
					});
					col.sort((a, b) => (bc.get(String(a.id)) - bc.get(String(b.id)))
						|| (was.get(String(a.id)) - was.get(String(b.id))));
				}
			}

			const minX = Math.min.apply(null, wired.map(n => n.pos[0]));
			const minY = Math.min.apply(null, wired.map(n => n.pos[1]));

			let x = minX;
			const colX = new Map();
			keys.forEach(k => {
				colX.set(k, x);
				x += Math.max.apply(null, cols.get(k).map(W)) + GAP_X;
			});

			// Y: el centro de las entradas, y si eso choca con el de arriba se
			// empuja hacia abajo. Empujar en vez de repartir es lo que deja al
			// nodo de una sola entrada EN LINEA con ella siempre que se pueda.
			const top = new Map();
			for (const k of keys) {
				const col = cols.get(k);
				let cursor = null;
				col.forEach((n) => {
					const cs = preds.get(String(n.id))
						.map(id => top.has(id) ? top.get(id) + H(byId.get(id)) / 2 : null)
						.filter(v => v != null);
					let y = cs.length
						? (cs.reduce((a, b) => a + b, 0) / cs.length) - H(n) / 2
						: (cursor != null ? cursor : minY);
					if (cursor != null && y < cursor) y = cursor;
					top.set(String(n.id), y);
					cursor = y + H(n) + GAP_Y;
				});
			}

			// EL ANCLA. Por defecto es la esquina de la seleccion: el bloque
			// queda donde estaba y no donde salio la cuenta.
			//
			// Con `opts.fixed` es OTRA COSA y vale la pena distinguirla: esos
			// nodos entran a la estructura —sus cables deciden columnas y orden—
			// pero NO se mueven, y el resto se traslada para caer alrededor de
			// ellos. Es lo que necesita el bundle: el nodo del artista tiene que
			// seguir donde lo dejo, y lo que se acomoda es lo recien creado.
			// Sin esto habria que elegir entre mover su nodo o dejar fuera del
			// grafo al unico que conecta a todo lo demas.
			const fixed = new Set((o.fixed || []).map(String));
			let dx = 0;
			let dy = minY - Math.min.apply(null,
				wired.map(n => top.get(String(n.id))));
			const anchor = wired.find(n => fixed.has(String(n.id)));
			if (anchor) {
				dx = anchor.pos[0] - colX.get(layer.get(String(anchor.id)) || 0);
				dy = anchor.pos[1] - top.get(String(anchor.id));
			}

			if (graph.beforeChange) { try { graph.beforeChange(); } catch (e) {} }
			wired.forEach(n => {
				if (fixed.has(String(n.id))) return;
				// ⚑⚑ v18.16 — EL ARREGLO ENTERO, NUNCA ELEMENTO POR ELEMENTO.
				// `n.pos = [x, y]` pasa por el setter de `pos`, que en Nodes 2.0
				// le avisa al layout store (`moveNode`) y el nodo SÍ se mueve;
				// `n.pos[0] = x` sólo mueve el espejo (los cables). Medido en el
				// frontend 1.52.7 con dos nodos, uno por cada camino. Ver
				// `posDoor`.
				n.pos = [Math.round(colX.get(layer.get(String(n.id)) || 0) + dx),
					Math.round(top.get(String(n.id)) + dy)];
			});
			if (graph.afterChange) { try { graph.afterChange(); } catch (e) {} }
			if (app.canvas && app.canvas.setDirty) app.canvas.setDirty(true, true);
			if (graph.change) { try { graph.change(); } catch (e) {} }
			return wired.length;
		}

		// ⚑⚑ ¿ESTÁ NODES 2.0? Se pregunta a `LiteGraph.vueNodesMode`, que es la
		// bandera que el propio frontend lee para decidirlo
		// (`syncLayoutStoreNodeBoundsFromGraph` arranca con `if
		// (!LiteGraph.vueNodesMode) return`). El ajuste de Settings es el
		// respaldo: cambia de nombre entre versiones, la bandera no.
		static vueNodesLive() {
			try {
				const LG = (typeof LiteGraph !== 'undefined' && LiteGraph)
					|| window.LiteGraph;
				if (LG && typeof LG.vueNodesMode === 'boolean') return LG.vueNodesMode;
			} catch (e) {}
			try { return NukeVueNodes.isOn(); } catch (e) {}
			return null;
		}

		/* ⚑⚑ LA L NO PUEDE MOVER NODOS CON NODES 2.0, Y ESO NO ES UN BUG DE AQUÍ.
		   Jorge: "cuando pico L sólo se reacomodan las líneas pero no los nodos,
		   pero sí funciona con el nodes 2.0 desactivado."

		   ⚑⚑ POR QUÉ, LEÍDO DEL FRONTEND QUE ESTÁ INSTALADO (1.51.10), no
		   adivinado: `useLayoutSync.ts` lo dice en su primera línea —
		   *"one-way sync from Layout Store to LiteGraph. The layout store is the
		   single source of truth."* El nodo que ves en pantalla es un elemento
		   del DOM colocado por ese store; `node.pos` es el ESPEJO, y la
		   sincronización corre en la dirección contraria a la que nos serviría.
		   Por eso se mueven las líneas (que sí leen el modelo) y no los nodos.

		   ⚑⚑ Y NO HAY PUERTA. El único escritor es `layoutMutations.moveNode` /
		   `batchMoveNodes`, que es un módulo interno: el propio arrange de
		   ComfyUI (`useArrangeNodes.ts`) lo usa porque vive DENTRO de la app y lo
		   importa. Desde un script externo no existe. `onNodeMoved` del canvas
		   tampoco sirve: es un hook de SALIDA, nadie lo escucha del lado del
		   store.

		   ⚑⚑ ASÍ QUE SE MIDE Y SE DICE, que es la regla que este archivo ya tiene
		   escrita tres veces: *escribir en un ajuste que este frontend ignora se
		   ve idéntico a escribir en uno que funciona*. Mover a medias sería peor
		   que no hacer nada — es exactamente el estado confuso que él vio.

		   ⚑ Las dos salidas REALES, dichas en el mismo aliento:
		     · apagar Nodes 2.0 (este tool ya tiene el switch, `NukeVueNodes`), o
		     · el arrange propio de ComfyUI, en la barrita de la selección — filas
		       / columnas / rejilla con su slider de separación. No es la lógica
		       de Nuke, pero es la que SÍ mueve nodos en 2.0. */
		/* ⚑⚑ v18.16 — SÍ HABÍA PUERTA, Y ERA LA MÁS SIMPLE. En el frontend
		   1.52.7 el SETTER de `LGraphNode.pos` hace `moveNode(this.id, …)` en el
		   layout store. Lo que nunca llegaba era `pos[0] = x`, que es lo que
		   `layoutNodes` escribía: muta el arreglo sin pasar por el setter.
		   Medido: con Nodes 2.0 prendido, `a.pos[0] = 700` dejó el nodo donde
		   estaba y `b.pos = [700, 500]` lo movió. Así que `layoutNodes` ahora
		   asigna el arreglo entero, y la reja de abajo sólo se queda cerrada en
		   un frontend cuyo setter NO lleva al store (`posDoor`) — ahí la nota de
		   arriba sigue siendo cierta palabra por palabra. */
		static posDoor() {
			try {
				const LGN = (typeof LGraphNode !== 'undefined') ? LGraphNode
					: (window.LiteGraph && window.LiteGraph.LGraphNode);
				const d = LGN && Object.getOwnPropertyDescriptor(LGN.prototype, 'pos');
				return !!(d && typeof d.set === 'function' && /moveNode/.test(String(d.set)));
			} catch (e) { return false; }
		}

		static layoutSelected() {
			if (typeof app === 'undefined' || !app.canvas) return 0;
			const sel = Object.values(app.canvas.selected_nodes || {});

			if (ImissNukeManager.vueNodesLive() === true && !ImissNukeManager.posDoor()) {
				console.warn(
					'[ImissNuke] layout: Nodes 2.0 esta prendido, asi que la L no puede '
					+ 'mover nodos.\n'
					+ '  El frontend coloca los nodos desde su layout store y sincroniza '
					+ 'en un solo sentido (store -> LiteGraph): escribir node.pos mueve '
					+ 'el modelo y las lineas, no el nodo.\n'
					+ '  Salidas: apagar Nodes 2.0 (' + NukeVueNodes.say() + '), o usar '
					+ 'el arrange de ComfyUI en la barrita de la seleccion.');
				return 0;
			}

			const n = ImissNukeManager.layoutNodes(sel);
			console.log(n
				? `[ImissNuke] layout: ${n} nodos acomodados`
				: '[ImissNuke] layout: nada que acomodar (menos de dos nodos conectados entre si)');
			return n;
		}

		/* ⚡⚡ v17.88 — ¿ESTÁ EL ARTISTA ESCRIBIENDO EN UN CONTROL?
		 *
		 * ⚡⚡ PREGUNTADO POR ROL, NO SÓLO POR ETIQUETA, y eso es todo el
		 * arreglo. Los dos guardias de este archivo se salían con
		 * `INPUT / TEXTAREA / SELECT` — los tags de un formulario de 2005 — y
		 * bajo **Nodes 2.0 los widgets son DOM de Vue**: el combo del
		 * `control_after_generate` que este panel escribe es un
		 * `<div role="combobox">` de PrimeVue, no un `<select>`. O sea que para
		 * estos guardias, un artista con el cursor dentro de ese combo estaba
		 * "en el canvas", y la tecla seguía de largo hacia los hotkeys.
		 *
		 * ⚡⚡ Y AHÍ LAS FLECHAS DUELEN. Un combobox enfocado se MUEVE con
		 * ↑/↓ — es comportamiento del navegador, no de nadie aquí —, así que
		 * la tecla hace dos cosas a la vez: cambia el valor del widget y
		 * dispara el hotkey. La sonda de esta ronda vio justo eso: el
		 * `control_after_generate` caminando `fixed → increment → decrement →
		 * randomize`, un paso por evento, escrito por el `onChange` de
		 * PrimeVue. Este guardia no prueba quién lo movió, pero quita a esta
		 * herramienta de la lista de sospechosos — que es lo que hay que hacer
		 * cuando el hotkey que agregaste hace dos versiones cae dentro del
		 * radio del defecto que estás midiendo.
		 *
		 * ⚡ La regla de la casa, otra vez: **ofrecer, nunca quitar.** Si el
		 * foco está en algo con lo que se escribe o se escoge, la tecla es de
		 * ese algo y esta herramienta no existe. */
		static typingInWidget(el) {
			if (!el) return false;
			try {
				const tag = String(el.tagName || '').toUpperCase();
				if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
					return true;
				}
				if (el.isContentEditable) return true;
				/* ⚡ `closest` y no sólo el propio target: el evento aterriza en
				   el span de adentro tan seguido como en el control. */
				if (el.closest && el.closest(
					'input,textarea,select,[contenteditable="true"],'
					+ '[role="combobox"],[role="listbox"],[role="spinbutton"],'
					+ '[role="textbox"],[role="slider"],[role="menu"],'
					+ '[role="dialog"],.p-select,.p-inputtext,.p-dropdown,'
					+ '.comfy-multiline-input,.litegraph .graphdialog')) {
					return true;
				}
			} catch (e) {}
			return false;
		}

		/* Un link por id, en las dos formas en que el frontend los guarda.
		 * ⚡ litegraph 1.5x los tiene en un Map y las versiones viejas en un
		 * objeto plano; preguntar por las dos cuesta dos líneas y suponer una
		 * cuesta un hotkey que no hace nada en la mitad de las máquinas. */
		static linkById(graph, id) {
			const L = graph && graph.links;
			if (!L || id == null) return null;
			if (typeof L.get === 'function') {
				return L.get(id) || L.get(String(id)) || null;
			}
			return L[id] || null;
		}

		/* ⚡⚡ LO QUE ALIMENTA A LO SELECCIONADO, UN NIVEL. Devuelve cuántos
		 * agregó, y ese número es lo que decide si la tecla se consume: cero
		 * quiere decir "aquí no había nada que hacer" y la flecha se va entera
		 * a quien siga. Ver la nota de `nukeSelectUpstream`.
		 *
		 * ⚡ EL ORIGEN SE PIDE POR EL LINK, nunca por un índice de slot. Bajo
		 * Nodes 2.0 `inputs[]` incluye los widget-inputs, así que contar slots
		 * barre decenas de entradas que no son cables — pero un widget-input
		 * CON link sí lo es (un Primitive colgado de un seed alimenta a este
		 * nodo tanto como cualquier imagen), y por eso el filtro es `link != null`
		 * y no una lista de qué slots cuentan.
		 *
		 * ⚡ La selección se AGREGA, no se reemplaza: el gesto es "y también
		 * los de arriba". Reemplazar convertiría cada press en una pérdida de
		 * lo que acabas de juntar. */
		static selectUpstream() {
			if (typeof app === 'undefined' || !app.canvas || !app.graph) return 0;
			const graph = app.graph;
			const sel = Object.values(app.canvas.selected_nodes || {});
			if (!sel.length) return 0;
			const have = new Set();
			for (const n of sel) if (n) have.add(n.id);
			const add = [];
			for (const node of sel) {
				if (!node || !node.inputs) continue;
				for (const input of node.inputs) {
					if (!input || input.link == null) continue;
					const link = ImissNukeManager.linkById(graph, input.link);
					if (!link) continue;
					const src = graph.getNodeById
						? graph.getNodeById(link.origin_id)
						: null;
					if (!src || have.has(src.id)) continue;
					have.add(src.id);
					add.push(src);
				}
			}
			if (!add.length) return 0;
			const all = sel.concat(add);
			try {
				if (app.canvas.selectNodes) app.canvas.selectNodes(all);
				else if (app.canvas.selectNode) {
					for (const n of all) app.canvas.selectNode(n, true);
				} else return 0;
			} catch (err) { return 0; }
			try { app.canvas.setDirty(true, true); } catch (err) {}
			return add.length;
		}

		// ---- 7. TODOS LOS HOTKEYS NUKE ----
		static setupHotkeys() {
			if (ImissNukeManager._hotkeysInstalled) return;
			ImissNukeManager._hotkeysInstalled = true;

			// El acomodo, expuesto. El Scene Manager lo usa para que el [bundle]
			// no deje los nodos encimados, y usar EL MISMO no es comodidad: dos
			// acomodos distintos en el mismo canvas son dos idiomas, y el artista
			// acabaria apretando L para deshacer lo que hizo el otro.
			// Si ImissNuke esta apagado la funcion no existe y quien llama se
			// arregla solo — por eso se pregunta por ella, no se asume.
			try {
				window.__imissNukeLayout = (nodes, opts) => ImissNukeManager.layoutNodes(nodes, opts);
			} catch (e) {}
			// Y el buscador, por la misma razón: la fila "Find a node" del [···]
			// del Scene Manager abre ESTA caja, no una suya.
			try {
				window.__imissNukeFind = (q) => ImissNukeFind.open(q);
				// ⚑ v19.12 — la paleta de color (Ctrl+Shift+C); el chip [node color]
				// del hotbox del Scene Manager abre ésta, no guarda copia.
				window.__imissNukeColors = (targets) => ImissNukeColorPicker.open(targets);
			} catch (e) {}

			window.addEventListener('keydown', (e) => {
				// ⚡ v17.88 — mismo guardia que el del Tab, por ROL y no sólo por
				// etiqueta: un `<div role="combobox">` de PrimeVue es donde vive
				// hoy el control del seed, y las flechas son suyas cuando tiene
				// el foco. Ver typingInWidget.
				if (ImissNukeManager.typingInWidget(e.target)) return;
				if (typeof app === 'undefined' || !app.canvas || !app.graph) return;
				if (window.__imissNukeConfig && window.__imissNukeConfig.masterEnabled === false) return;

				// ---- Con el Hotbox abierto, las letras sueltas son suyas ----
				// ⚑ Los dos escuchan en `window` en captura, así que `stopPropagation`
				// no separa a nadie y gana el orden de carga. Con el Hotbox abierto, la
				// F encuadraba Y abría su cajón de nodos; la L y la D, igual. Cerrado,
				// no pasa por aquí y la F sigue siendo el foco.
				if (window.__hotbox && window.__hotbox.isOpen && window.__hotbox.isOpen()
					&& !e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey
					&& (/^[a-z]$/i.test(e.key || '') || /^Key[A-Z]$/.test(e.code || ''))) return;

				// ---- /: Find Node — el Search de Nuke ----
				// ⚑ Por `e.key` y no por `code`, y sin mirar Shift: en un teclado
				// en español la barra ES Shift+7, y lo que importa es el carácter.
				if (e.key === '/' && !e.ctrlKey && !e.altKey && !e.metaKey) {
					e.preventDefault();
					e.stopPropagation();
					ImissNukeFind.open();
					return;
				}

				// ---- Shift+R: Renderizar / Encolar nodos de salida seleccionados ----
				if (e.shiftKey && !e.ctrlKey && (e.key === 'r' || e.key === 'R')) {
					e.preventDefault();
					e.stopPropagation();
					ImissNukeManager.queueSelected();
					return;
				}

				// ---- Shift+↑: selecciona lo que ALIMENTA a lo seleccionado ----
				// ⚡ Se sale SIN consumir la tecla cuando no hay nada que
				// agregar — la misma salida que la L, y lo que deja a esta
				// flecha nacer prendida sin quitarle nada a ComfyUI.
				if (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey
					&& (e.key === 'ArrowUp' || e.code === 'ArrowUp')) {
					const cfgUp = window.__imissNukeConfig || loadConfig();
					if (cfgUp && cfgUp.nukeSelectUpstream === false) return;
					if (!ImissNukeManager.selectUpstream()) return;
					e.preventDefault();
					e.stopPropagation();
					return;
				}

				// ---- Key F: Focus / Frame selección o grafo completo ----
				if (!e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey && (e.key === 'f' || e.key === 'F' || e.code === 'KeyF')) {
					e.preventDefault();
					e.stopPropagation();
					const selectedNodes = Object.values(app.canvas.selected_nodes || {});
					const selectedGroup = app.canvas.selected_group;
					ImissNukeManager.frameNodes(selectedNodes, selectedGroup);
					return;
				}

				// ---- Key L: Layout — acomoda la seleccion como Nuke ----
				// Sin modificadores, como la L de Nuke. Se sale sin consumir la
				// tecla cuando no hay seleccion, para no robarle la L a nada.
				if (!e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey && (e.key === 'l' || e.key === 'L' || e.code === 'KeyL')) {
					const selL = app.canvas.selected_nodes;
					if (!selL || Object.keys(selL).length < 2) return;
					e.preventDefault();
					e.stopPropagation();
					ImissNukeManager.layoutSelected();
					return;
				}

				// ---- Key D: Bypass / Disable (o Mute) ----
				if (!e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey && (e.key === 'd' || e.key === 'D' || e.code === 'KeyD')) {
					const selected = app.canvas.selected_nodes;
					if (!selected || Object.keys(selected).length === 0) return;

					e.preventDefault();
					e.stopPropagation();

					const cfg = window.__imissNukeConfig || loadConfig();
					const targetMode = (cfg && cfg.dKeyMode === 'mute') ? 2 : 4; // 4 = Bypass, 2 = Mute
					const nodes = Object.values(selected);
					const anyActive = nodes.some(n => (!n.mode || n.mode === 0));

					for (const node of nodes) {
						if (!node) continue;
						node.mode = anyActive ? targetMode : 0;
						if (typeof node.onModeChange === 'function') node.onModeChange(node.mode);
					}
					app.canvas.setDirty(true, true);
					if (app.graph && app.graph.change) app.graph.change();
					return;
				}

				// ---- Alt+H: Hide Inputs / Set&Get Links ----
				if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && (e.key === 'h' || e.key === 'H' || e.code === 'KeyH')) {
					const selected = app.canvas.selected_nodes;
					if (!selected || Object.keys(selected).length === 0) return;

					e.preventDefault();
					e.stopPropagation();

					const nodes = Object.values(selected);
					const anyVisible = nodes.some(n => {
						if (!n) return false;
						if (n._hide_inputs || (n.flags && n.flags.hide_inputs)) return false;
						if (n.properties && (n.properties.show_connections === false || n.properties.show_links === false)) return false;
						return true;
					});
					const targetHidden = anyVisible;

					for (const node of nodes) {
						if (!node) continue;

						if (typeof node.getExtraMenuOptions === 'function') {
							const menuOptions = [];
							try {
								node.getExtraMenuOptions(app.canvas, menuOptions);
								for (const opt of menuOptions) {
									if (opt && opt.content && typeof opt.callback === 'function') {
										const title = opt.content.toLowerCase();
										if (title.includes('connection') || title.includes('show links') || title.includes('hide links')) {
											opt.callback.call(node, app.canvas);
											break;
										}
									}
								}
							} catch (err) {}
						}

						if (node.properties) {
							if ('show_connections' in node.properties) node.properties.show_connections = !targetHidden;
							if ('show_links' in node.properties) node.properties.show_links = !targetHidden;
						}
						node.flags = node.flags || {};
						node.flags.hide_inputs = targetHidden;
						node._hide_inputs = targetHidden;

						if (node.inputs && app.graph && app.graph.links) {
							for (const input of node.inputs) {
								if (input && input.link != null) {
									const link = app.graph.links[input.link];
									if (link) link._hidden = targetHidden;
								}
							}
						}
					}

					app.canvas.setDirty(true, true);
					if (app.graph && app.graph.change) app.graph.change();
					return;
				}

				// ---- Ctrl+D: Duplicar SIN conexiones ----
				if (e.ctrlKey && !e.shiftKey && !e.altKey && (e.key === 'd' || e.key === 'D' || e.code === 'KeyD')) {
					e.preventDefault();
					e.stopPropagation();
					const selected = app.canvas.selected_nodes;
					if (!selected || Object.keys(selected).length === 0) return;

					const graph = app.graph;
					const newSelection = {};

					for (const id of Object.keys(selected)) {
						const origNode = graph.getNodeById(parseInt(id, 10));
						if (!origNode || !origNode.clone) continue;

						const clone = origNode.clone();
						if (!clone) continue;
						clone.pos = [origNode.pos[0] + 30, origNode.pos[1] + 30];

						if (clone.inputs) {
							for (let i = 0; i < clone.inputs.length; i++) {
								if (clone.inputs[i]) clone.inputs[i].link = null;
							}
						}
						if (clone.outputs) {
							for (let i = 0; i < clone.outputs.length; i++) {
								if (clone.outputs[i]) clone.outputs[i].links = null;
							}
						}

						graph.add(clone);
						newSelection[clone.id] = clone;
					}

					if (Object.keys(newSelection).length > 0) {
						app.canvas.selectNodes(Object.values(newSelection));
						app.canvas.setDirty(true, true);
						graph.change();
					}
					return;
				}

				// ---- Ctrl+E: Clonar CON conexiones de entrada ----
				if (e.ctrlKey && !e.shiftKey && !e.altKey && (e.key === 'e' || e.key === 'E' || e.code === 'KeyE')) {
					e.preventDefault();
					e.stopPropagation();
					const selected = app.canvas.selected_nodes;
					if (!selected || Object.keys(selected).length === 0) return;

					const graph = app.graph;
					const newSelection = {};

					for (const id of Object.keys(selected)) {
						const origNode = graph.getNodeById(parseInt(id, 10));
						if (!origNode || !origNode.clone) continue;

						const clone = origNode.clone();
						if (!clone) continue;
						clone.pos = [origNode.pos[0] + 30, origNode.pos[1] + 80];
						graph.add(clone);

						if (origNode.inputs) {
							for (let i = 0; i < origNode.inputs.length; i++) {
								const input = origNode.inputs[i];
								if (input && input.link != null) {
									const linkInfo = graph.links[input.link];
									if (linkInfo) {
										const srcNode = graph.getNodeById(linkInfo.origin_id);
										if (srcNode) {
											// Conectar por NOMBRE de slot, no por indice: en Nodes 2.0
											// el `inputs[]` del clon puede no alinearse con el del
											// original (los widgets tambien son sockets), y el indice
											// crudo metia el cable en otro slot.
											let targetSlot = i;
											if (input.name != null && typeof clone.findInputSlot === 'function' &&
												clone.findInputSlot(input.name) !== -1) {
												targetSlot = input.name;
											}
											srcNode.connect(linkInfo.origin_slot, clone, targetSlot);
										}
									}
								}
							}
						}
						newSelection[clone.id] = clone;
					}

					if (Object.keys(newSelection).length > 0) {
						app.canvas.selectNodes(Object.values(newSelection));
						app.canvas.setDirty(true, true);
						graph.change();
					}
					return;
				}

				// ---- Shift+Q: Auto-conectar fuentes al último nodo o en cadena ----
				if (e.shiftKey && (e.key === 'q' || e.key === 'Q')) {
					e.preventDefault();
					e.stopPropagation();

					const canvas = app.canvas;
					const graph = app.graph;
					const orderedNodes = ImissNukeManager.getOrderedSelectedNodes(canvas);
					if (orderedNodes.length < 2) return;

					const multiMode = window.__imissNukeConfig && window.__imissNukeConfig.multiAutoConnect;
					let connectionsCount = 0;
					const targetNode = orderedNodes[orderedNodes.length - 1];
					const sourceNodes = orderedNodes.slice(0, orderedNodes.length - 1);
					let connectedToTarget = false;

					if (targetNode && targetNode.inputs && targetNode.inputs.length > 0) {
						for (const src of sourceNodes) {
							if (!src || !src.outputs) continue;
							let srcConnected = false;

							for (let oi = 0; oi < src.outputs.length; oi++) {
								const output = src.outputs[oi];
								if (!output) continue;

								for (let ii = 0; ii < targetNode.inputs.length; ii++) {
									const input = targetNode.inputs[ii];
									if (!input || input.link != null) continue;

									if (GeometryUtils.areTypesCompatible(output.type, input.type)) {
										src.connect(oi, targetNode, ii);
										connectionsCount++;
										srcConnected = true;
										connectedToTarget = true;
										break;
									}
								}
								if (!multiMode && srcConnected) break;
							}
						}
					}

					if (!connectedToTarget && connectionsCount === 0) {
						const chainNodes = [...orderedNodes].sort((a, b) => a.pos[0] - b.pos[0]);
						for (let n = 0; n < chainNodes.length - 1; n++) {
							const src = chainNodes[n];
							const dst = chainNodes[n + 1];
							if (!src || !dst || !src.outputs || !dst.inputs) continue;
							let pairConnected = false;

							for (let oi = 0; oi < src.outputs.length; oi++) {
								const output = src.outputs[oi];
								if (!output) continue;

								for (let ii = 0; ii < dst.inputs.length; ii++) {
									const input = dst.inputs[ii];
									if (!input || input.link != null) continue;

									if (GeometryUtils.areTypesCompatible(output.type, input.type)) {
										src.connect(oi, dst, ii);
										connectionsCount++;
										pairConnected = true;
										break;
									}
								}
								if (!multiMode && pairConnected) break;
							}
						}
					}

					if (connectionsCount > 0) {
						canvas.setDirty(true, true);
						graph.change();
					}
					return;
				}

				// ---- Ctrl+Shift+C: Paleta de color para nodos y grupos ----
				if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && (e.key === 'c' || e.key === 'C' || e.code === 'KeyC')) {
					// ⚑ v19.12 — la misma tecla la cierra
					if (ImissNukeColorPicker.S.el) { e.preventDefault(); e.stopPropagation(); ImissNukeColorPicker.close(); return; }
					const canvas = app.canvas;
					const graph = app.graph;
					if (!canvas || !graph) return;

					const targets = [];
					const selNodes = ImissNukeManager.getSelectedNodesList(canvas);
					for (const n of selNodes) {
						if (n && !targets.includes(n)) targets.push(n);
					}
					if (canvas.selected_group && !targets.includes(canvas.selected_group)) {
						targets.push(canvas.selected_group);
					}
					if (canvas.selected_groups && Array.isArray(canvas.selected_groups)) {
						for (const g of canvas.selected_groups) {
							if (g && !targets.includes(g)) targets.push(g);
						}
					}
					if (canvas.selectedItems) {
						const items = canvas.selectedItems.values ? Array.from(canvas.selectedItems.values()) : Array.from(canvas.selectedItems);
						for (const it of items) {
							if (it && !targets.includes(it)) targets.push(it);
						}
					}

					// Fallback under cursor
					if (targets.length === 0) {
						if (canvas.current_node) targets.push(canvas.current_node);
						else if (canvas.node_over) targets.push(canvas.node_over);
						else if (canvas.group_over) targets.push(canvas.group_over);
						else if (canvas.graph_mouse) {
							const gx = canvas.graph_mouse[0], gy = canvas.graph_mouse[1];
							const n = graph.getNodeOnPos ? graph.getNodeOnPos(gx, gy, canvas.visible_nodes) : null;
							if (n) targets.push(n);
							else {
								const g = graph.getGroupOnPos ? graph.getGroupOnPos(gx, gy) : null;
								if (g) targets.push(g);
							}
						}
					}

					if (targets.length === 0) return;
					e.preventDefault();
					e.stopPropagation();

					let clientX = e.clientX, clientY = e.clientY;
					if (clientX === undefined || clientY === undefined || (clientX === 0 && clientY === 0)) {
						const first = targets[0];
						const pos = first.pos || (first._bounding ? [first._bounding[0], first._bounding[1]] : null);
						if (pos && canvas.ds) {
							const ds = canvas.ds;
							const canvasEl = canvas.canvas || document.querySelector('canvas.graphcanvas') || document.querySelector('canvas');
							const rect = canvasEl ? canvasEl.getBoundingClientRect() : { left: 0, top: 0 };
							clientX = rect.left + (pos[0] + ds.offset[0]) * ds.scale + 60;
							clientY = rect.top + (pos[1] + ds.offset[1]) * ds.scale + 20;
						} else {
							clientX = window.innerWidth / 2;
							clientY = window.innerHeight / 2;
						}
					}

					ImissNukeColorPicker.open(targets, clientX, clientY);
					return;
				}

				// ---- Ctrl+X / Ctrl+Shift+X: Extraer nodo (1 nodo) o Swap (2 nodos) ----
				if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.code === 'KeyX' || e.key === 'x' || e.key === 'X' || e.keyCode === 88)) {
					const canvas = app.canvas;
					const graph = app.graph;
					if (!canvas || !graph) return;

					const selArr = ImissNukeManager.getSelectedNodesList(canvas);
					if (selArr.length === 0) return;

					e.preventDefault();
					e.stopPropagation();
					e.stopImmediatePropagation();

					// If 2 nodes are selected: SWAP THEM!
					if (selArr.length === 2) {
						ImissNukeManager.swapNodes(selArr[0], selArr[1], selArr[0].pos, graph, canvas);
						return;
					}

					// If 1 node is selected: Extract and bridge
					for (const node of selArr) {
						ImissNukeManager.extractNodeAndBridge(node, graph, canvas);
					}
					return;
				}

				// ---- Ctrl+Shift+S: Sustituir / Intercambiar nodos (Swap sin borrar) ----
				if (e.ctrlKey && e.shiftKey && (e.key === 's' || e.key === 'S' || e.code === 'KeyS')) {
					const canvas = app.canvas;
					const graph = app.graph;
					const ordered = ImissNukeManager.getOrderedSelectedNodes(canvas);
					if (ordered.length !== 2) return;

					e.preventDefault();
					e.stopPropagation();
					ImissNukeManager.swapNodes(ordered[0], ordered[1], ordered[0].pos, graph, canvas);
					return;
				}

				// ---- Ctrl+Shift+I: Intercalar nodo en cable ----
				if (e.ctrlKey && e.shiftKey && (e.key === 'i' || e.key === 'I' || e.code === 'KeyI')) {
					const canvas = app.canvas;
					const graph = app.graph;
					const ordered = ImissNukeManager.getOrderedSelectedNodes(canvas);
					if (!graph.links || ordered.length === 0) return;

					e.preventDefault();
					e.stopPropagation();

					let nodeA = null, nodeC = null, nodeB = null;
					let targetLink = null, inSlotC = -1, outSlotC = -1;

					if (ordered.length === 3) {
						nodeA = ordered[0]; nodeC = ordered[1]; nodeB = ordered[2];
						for (const linkId in graph.links) {
							const link = graph.links[linkId];
							if (link && link.origin_id === nodeA.id && link.target_id === nodeB.id) {
								targetLink = link;
								break;
							}
						}
						if (nodeA.outputs && nodeC.inputs) {
							for (let oi = 0; oi < nodeA.outputs.length; oi++) {
								const outA = nodeA.outputs[oi];
								for (let ii = 0; ii < nodeC.inputs.length; ii++) {
									const inC = nodeC.inputs[ii];
									if (inC && inC.link == null && GeometryUtils.areTypesCompatible(outA?.type, inC.type)) {
										inSlotC = ii; break;
									}
								}
								if (inSlotC !== -1) break;
							}
						}
						if (nodeC.outputs && nodeB.inputs) {
							for (let oi = 0; oi < nodeC.outputs.length; oi++) {
								const outC = nodeC.outputs[oi];
								for (let ii = 0; ii < nodeB.inputs.length; ii++) {
									const inB = nodeB.inputs[ii];
									if (inB && GeometryUtils.areTypesCompatible(outC?.type, inB.type)) {
										outSlotC = ii; break;
									}
								}
								if (outSlotC !== -1) break;
							}
						}
					}

					if (ordered.length === 1) {
						nodeC = ordered[0];
						const cX = nodeC.pos[0], cY = nodeC.pos[1];
						const cW = nodeC.size ? nodeC.size[0] : 140;
						const cH = nodeC.size ? nodeC.size[1] : 60;
						const cBox = [cX - 30, cY - 30, cX + cW + 30, cY + cH + 30];
						const cCenter = [cX + cW / 2, cY + cH / 2];

						let minDistance = Infinity;
						for (const linkId in graph.links) {
							const link = graph.links[linkId];
							if (!link || link.origin_id === nodeC.id || link.target_id === nodeC.id) continue;
							const nA = graph.getNodeById(link.origin_id);
							const nB = graph.getNodeById(link.target_id);
							if (!nA || !nB) continue;

							const pA = nA.getOutputPos ? nA.getOutputPos(link.origin_slot) : null;
							const pB = nB.getInputPos ? nB.getInputPos(link.target_slot) : null;
							if (!pA || !pB) continue;

							const dist = GeometryUtils.distToSegment(cCenter, pA, pB);
							if (dist > Math.max(cW, cH) * 1.5 && !GeometryUtils.segmentIntersectsBox(pA, pB, cBox)) continue;

							const outTypeA = nA.outputs?.[link.origin_slot]?.type || '*';
							const inTypeB = nB.inputs?.[link.target_slot]?.type || '*';

							let curInC = -1;
							if (nodeC.inputs) {
								for (let i = 0; i < nodeC.inputs.length; i++) {
									if (nodeC.inputs[i] && nodeC.inputs[i].link == null && GeometryUtils.areTypesCompatible(outTypeA, nodeC.inputs[i].type)) {
										curInC = i; break;
									}
								}
							}

							let curOutC = -1;
							if (nodeC.outputs) {
								for (let oi = 0; oi < nodeC.outputs.length; oi++) {
									if (nodeC.outputs[oi] && GeometryUtils.areTypesCompatible(nodeC.outputs[oi].type, inTypeB)) {
										curOutC = oi; break;
									}
								}
							}

							if (curInC !== -1 && curOutC !== -1 && dist < minDistance) {
								minDistance = dist;
								nodeA = nA; nodeB = nB;
								targetLink = link;
								inSlotC = curInC; outSlotC = curOutC;
							}
						}
					}

					if (nodeA && nodeB && nodeC && inSlotC !== -1 && outSlotC !== -1) {
						if (targetLink) {
							nodeB.disconnectInput(targetLink.target_slot);
							nodeA.connect(targetLink.origin_slot, nodeC, inSlotC);
							nodeC.connect(outSlotC, nodeB, targetLink.target_slot);
						} else {
							nodeA.connect(0, nodeC, inSlotC);
							nodeC.connect(outSlotC, nodeB, 0);
						}
						canvas.setDirty(true, true);
						graph.change();
					}
					return;
				}
			}, true);
		}

		// ---- EXTRACT NODE & BRIDGE (FOUNDRY NUKE CTRL+SHIFT+X) ----
		static extractNodeAndBridge(node, graph, canvas) {
			if (!node || !graph) return;

			const incomingSources = [];
			if (node.inputs) {
				for (let i = 0; i < node.inputs.length; i++) {
					const inp = node.inputs[i];
					if (inp && inp.link != null) {
						const linkInfo = graph.links ? graph.links[inp.link] : null;
						if (linkInfo) {
							incomingSources.push({
								srcId: linkInfo.origin_id,
								srcSlot: linkInfo.origin_slot,
								type: inp.type || '*'
							});
						}
					}
				}
			}

			const outgoingTargets = [];
			if (node.outputs) {
				for (let oi = 0; oi < node.outputs.length; oi++) {
					const out = node.outputs[oi];
					if (out && out.links && out.links.length > 0) {
						for (const linkId of [...out.links]) {
							const linkInfo = graph.links ? graph.links[linkId] : null;
							if (linkInfo) {
								outgoingTargets.push({
									dstId: linkInfo.target_id,
									dstSlot: linkInfo.target_slot,
									type: out.type || '*'
								});
							}
						}
					}
				}
			}

			// Disconnect inputs
			if (node.inputs) {
				for (let i = node.inputs.length - 1; i >= 0; i--) {
					try { node.disconnectInput(i); } catch (e) {}
				}
			}
			// Disconnect outputs
			if (node.outputs) {
				for (let i = node.outputs.length - 1; i >= 0; i--) {
					try { node.disconnectOutput(i); } catch (e) {}
				}
			}

			// Bridge incoming sources directly to outgoing targets
			const connectedDsts = new Set();
			for (const src of incomingSources) {
				const srcNode = graph.getNodeById(src.srcId);
				if (!srcNode) continue;
				for (let di = 0; di < outgoingTargets.length; di++) {
					if (connectedDsts.has(di)) continue;
					const dst = outgoingTargets[di];
					const dstNode = graph.getNodeById(dst.dstId);
					if (!dstNode) continue;
					if (GeometryUtils.areTypesCompatible(src.type, dst.type)) {
						srcNode.connect(src.srcSlot, dstNode, dst.dstSlot);
						connectedDsts.add(di);
						break;
					}
				}
			}

			// Nuke default: offset node position downwards away from the pipe
			if (node.pos) {
				node.pos[1] += 120;
			}

			if (canvas) {
				canvas.setDirty(true, true);
			}
			if (graph.change) graph.change();
			if (graph.afterChange) graph.afterChange();
		}

		// ---- SWAP NODES (CTRL+SHIFT+DROP ON NODE O SHORTCUT) ----
		// Non-destructive: Node A and Node B swap positions and connections. Neither node is deleted!
		static swapNodes(nodeA, nodeB, origPosA, graph, canvas) {
			if (!nodeA || !nodeB || !graph || nodeA === nodeB) return;

			// 1. SWAP POSITIONS: Node A takes Node B's spot, Node B takes Node A's original spot
			const posB = [nodeB.pos[0], nodeB.pos[1]];
			const posA = origPosA ? [origPosA[0], origPosA[1]] : [nodeA.pos[0], nodeA.pos[1]];

			nodeA.pos[0] = posB[0];
			nodeA.pos[1] = posB[1];

			nodeB.pos[0] = posA[0];
			nodeB.pos[1] = posA[1];

			// 2. COLLECT CONNECTIONS OF BOTH NODES BEFORE DISCONNECTING
			const inA = [];
			if (nodeA.inputs && graph.links) {
				for (let i = 0; i < nodeA.inputs.length; i++) {
					const inp = nodeA.inputs[i];
					if (inp && inp.link != null) {
						const l = graph.links[inp.link];
						if (l) inA.push({ srcId: l.origin_id, srcSlot: l.origin_slot, inSlot: i, type: inp.type });
					}
				}
			}
			const outA = [];
			if (nodeA.outputs && graph.links) {
				for (let oi = 0; oi < nodeA.outputs.length; oi++) {
					const out = nodeA.outputs[oi];
					if (out && out.links && out.links.length > 0) {
						for (const lid of out.links) {
							const l = graph.links[lid];
							if (l) outA.push({ outSlot: oi, dstId: l.target_id, dstSlot: l.target_slot, type: out.type });
						}
					}
				}
			}

			const inB = [];
			if (nodeB.inputs && graph.links) {
				for (let i = 0; i < nodeB.inputs.length; i++) {
					const inp = nodeB.inputs[i];
					if (inp && inp.link != null) {
						const l = graph.links[inp.link];
						if (l) inB.push({ srcId: l.origin_id, srcSlot: l.origin_slot, inSlot: i, type: inp.type });
					}
				}
			}
			const outB = [];
			if (nodeB.outputs && graph.links) {
				for (let oi = 0; oi < nodeB.outputs.length; oi++) {
					const out = nodeB.outputs[oi];
					if (out && out.links && out.links.length > 0) {
						for (const lid of out.links) {
							const l = graph.links[lid];
							if (l) outB.push({ outSlot: oi, dstId: l.target_id, dstSlot: l.target_slot, type: out.type });
						}
					}
				}
			}

			// 3. CLEANLY DISCONNECT BOTH NODES
			if (nodeA.inputs) {
				for (let i = nodeA.inputs.length - 1; i >= 0; i--) {
					try { nodeA.disconnectInput(i); } catch (e) {}
				}
			}
			if (nodeA.outputs) {
				for (let oi = nodeA.outputs.length - 1; oi >= 0; oi--) {
					try { nodeA.disconnectOutput(oi); } catch (e) {}
				}
			}
			if (nodeB.inputs) {
				for (let i = nodeB.inputs.length - 1; i >= 0; i--) {
					try { nodeB.disconnectInput(i); } catch (e) {}
				}
			}
			if (nodeB.outputs) {
				for (let oi = nodeB.outputs.length - 1; oi >= 0; oi--) {
					try { nodeB.disconnectOutput(oi); } catch (e) {}
				}
			}

			// 4. RECONNECT: NODE A TAKES NODE B'S CONNECTIONS
			for (const conn of inB) {
				const src = graph.getNodeById(conn.srcId);
				if (!src) continue;
				let slot = -1;
				if (nodeA.inputs) {
					if (nodeA.inputs[conn.inSlot] && nodeA.inputs[conn.inSlot].link == null &&
						GeometryUtils.areTypesCompatible(conn.type, nodeA.inputs[conn.inSlot].type)) {
						slot = conn.inSlot;
					} else {
						for (let i = 0; i < nodeA.inputs.length; i++) {
							// El indice preferido (arriba) es una restauracion 1:1 deliberada;
							// este barrido es el que adivina, asi que no puede caer en widgets.
							if (nodeA.inputs[i] && nodeA.inputs[i].link == null &&
								ImissNukeManager.isAutoConnectable(nodeA, nodeA.inputs[i], conn.type)) {
								slot = i; break;
							}
						}
					}
				}
				if (slot !== -1) src.connect(conn.srcSlot, nodeA, slot);
			}

			for (const conn of outB) {
				const dst = graph.getNodeById(conn.dstId);
				if (!dst) continue;
				let slot = -1;
				if (nodeA.outputs) {
					if (nodeA.outputs[conn.outSlot] &&
						GeometryUtils.areTypesCompatible(nodeA.outputs[conn.outSlot].type, conn.type)) {
						slot = conn.outSlot;
					} else {
						for (let oi = 0; oi < nodeA.outputs.length; oi++) {
							if (nodeA.outputs[oi] &&
								GeometryUtils.areTypesCompatible(nodeA.outputs[oi].type, conn.type)) {
								slot = oi; break;
							}
						}
					}
				}
				if (slot !== -1) nodeA.connect(slot, dst, conn.dstSlot);
			}

			// 5. RECONNECT: NODE B TAKES NODE A'S CONNECTIONS
			for (const conn of inA) {
				const src = graph.getNodeById(conn.srcId);
				if (!src) continue;
				let slot = -1;
				if (nodeB.inputs) {
					if (nodeB.inputs[conn.inSlot] && nodeB.inputs[conn.inSlot].link == null &&
						GeometryUtils.areTypesCompatible(conn.type, nodeB.inputs[conn.inSlot].type)) {
						slot = conn.inSlot;
					} else {
						for (let i = 0; i < nodeB.inputs.length; i++) {
							if (nodeB.inputs[i] && nodeB.inputs[i].link == null &&
								ImissNukeManager.isAutoConnectable(nodeB, nodeB.inputs[i], conn.type)) {
								slot = i; break;
							}
						}
					}
				}
				if (slot !== -1) src.connect(conn.srcSlot, nodeB, slot);
			}

			for (const conn of outA) {
				const dst = graph.getNodeById(conn.dstId);
				if (!dst) continue;
				let slot = -1;
				if (nodeB.outputs) {
					if (nodeB.outputs[conn.outSlot] &&
						GeometryUtils.areTypesCompatible(nodeB.outputs[conn.outSlot].type, conn.type)) {
						slot = conn.outSlot;
					} else {
						for (let oi = 0; oi < nodeB.outputs.length; oi++) {
							if (nodeB.outputs[oi] &&
								GeometryUtils.areTypesCompatible(nodeB.outputs[oi].type, conn.type)) {
								slot = oi; break;
							}
						}
					}
				}
				if (slot !== -1) nodeB.connect(slot, dst, conn.dstSlot);
			}

			// 6. SELECT NODE A AND REFRESH GRAPH (NEVER DELETE EITHER NODE!)
			if (canvas) {
				if (typeof canvas.selectNode === 'function') canvas.selectNode(nodeA, false);
				canvas.setDirty(true, true);
				if (canvas.draw) canvas.draw(true, true);
			}
			if (graph.change) graph.change();
			if (graph.afterChange) graph.afterChange();
		}

		/**
		 * Polilinea REAL que ImissNuke dibuja para un link - la que cachea MapLinks
		 * en `canvas._nukeMapLinks`. Con pipes ortogonales la recta output->input
		 * pasa por sitios donde no hay cable dibujado, asi que el test de impacto
		 * tiene que correr contra el trazo de verdad. Sin cache (pipes nativos o
		 * primer frame) cae a la recta.
		 */
		static getLinkPathPoints(link, nodeA, nodeB, canvas) {
			try {
				const ml = canvas && canvas._nukeMapLinks;
				const item = (ml && ml.pathsByLinkId) ? ml.pathsByLinkId[link.id] : null;
				if (item && item.path && item.path.length >= 2) return item.path;
			} catch (e) {}
			const pA = nodeA.getOutputPos ? nodeA.getOutputPos(link.origin_slot) : null;
			const pB = nodeB.getInputPos ? nodeB.getInputPos(link.target_slot) : null;
			return (pA && pB) ? [pA, pB] : null;
		}

		/**
		 * Este input esta respaldado por un widget? En Nodes 2.0 TODOS los widgets
		 * son sockets, asi que las busquedas automaticas de "primer slot libre
		 * compatible" ahora los ven y se los comen.
		 */
		static isWidgetInput(node, input) {
			if (!node || !input) return false;
			if (input.widget) return true;
			try {
				if (typeof node.getWidgetFromSlot === 'function' && node.getWidgetFromSlot(input)) return true;
			} catch (e) {}
			if (Array.isArray(node.widgets) && input.name != null) {
				return node.widgets.some((w) => w && w.name === input.name);
			}
			return false;
		}

		/**
		 * Destino valido para una conexion AUTOMATICA. Un slot normal basta con que
		 * sea compatible; un slot de widget solo se acepta si el tipo calza EXACTO,
		 * nunca por comodin.
		 */
		static isAutoConnectable(node, input, srcType) {
			if (!input) return false;
			if (!GeometryUtils.areTypesCompatible(srcType, input.type)) return false;
			if (!ImissNukeManager.isWidgetInput(node, input)) return true;
			const a = String(Array.isArray(srcType) ? srcType.join(',') : (srcType || '')).toUpperCase().trim();
			const b = String(Array.isArray(input.type) ? input.type.join(',') : (input.type || '')).toUpperCase().trim();
			return a !== '' && a === b;
		}

		// ---- SPLICE NODE INTO WIRE (SHIFT+DROP OR CTRL+SHIFT+DROP ON WIRE) ----
		static spliceNodeIntoLink(draggedNode, candidate, graph, canvas) {
			if (!draggedNode || !candidate || !graph) return;
			const { link, nodeA, nodeB, inSlotC, outSlotC } = candidate;

			nodeB.disconnectInput(link.target_slot);
			nodeA.connect(link.origin_slot, draggedNode, inSlotC);
			draggedNode.connect(outSlotC, nodeB, link.target_slot);

			if (canvas) canvas.setDirty(true, true);
			if (graph.change) graph.change();
			if (graph.afterChange) graph.afterChange();
		}

		// ---- 8. EMPALME Y SWAP MEDIANTE DRAG & DROP ----
		static setupDropSpliceAndSwap() {
			if (ImissNukeManager._dropSpliceInstalled) return;
			ImissNukeManager._dropSpliceInstalled = true;

			const handleDropAction = (e) => {
				if (typeof app === 'undefined' || !app.canvas || !app.graph) return;
				const cfg = window.__imissNukeConfig || {};

				// La marca de drag se consume SIEMPRE, se acabe empalmando o no.
				const spliceNode = window.__nukeSpliceDraggedNode;
				const spliceStart = window.__nukeSpliceStartPos;
				window.__nukeSpliceDraggedNode = null;
				window.__nukeSpliceStartPos = null;

				if (cfg.masterEnabled === false) return;
				if (!e.shiftKey && !window.__nukeSwapDraggedNode) return;

				const canvas = app.canvas;
				const graph = app.graph;

				// GUARDA 1 - soltar un CABLE termina en el mismo pointerup que soltar un
				// NODO. Si veniamos arrastrando un link (Nodes 2.0 lo lleva en
				// `canvas.linkConnector`), esto no es un splice y no se toca nada.
				const lc = canvas.linkConnector;
				if (lc && (lc.isConnecting || (lc.renderLinks && lc.renderLinks.length > 0))) return;
				if (canvas.connecting_node) return;
				if (canvas.connecting_links && canvas.connecting_links.length > 0) return;

				// 1. Resolver el nodo arrastrado. El fallback viejo a `canvas.current_node`
				//    (y al "unico nodo seleccionado") convertia cualquier Shift+click en
				//    un splice, porque `current_node` es simplemente el ultimo nodo que
				//    toco el puntero. Ahora solo vale lo que marcamos en processMouseDown.
				const draggedNode = window.__nukeSwapDraggedNode || spliceNode || canvas.node_dragged || null;
				if (!draggedNode) return;

				// GUARDA 2 - solo empalma un nodo que de verdad se MOVIO. Un Shift+click
				// o un drag de cable dejan el nodo exactamente donde estaba.
				if (!window.__nukeSwapDraggedNode) {
					const start = (draggedNode === spliceNode) ? spliceStart : draggedNode._nukeOriginalPos;
					if (!start || !draggedNode.pos) return;
					const moved = Math.abs(draggedNode.pos[0] - start[0]) > 4 ||
						Math.abs(draggedNode.pos[1] - start[1]) > 4;
					if (!moved) return;
				}

				// 2. Compute canvas coordinate
				let gp = null;
				if (typeof canvas.convertEventToCanvasOffset === 'function') {
					try { gp = canvas.convertEventToCanvasOffset(e); } catch (err) {}
				}
				if (!gp && canvas.graph_mouse) {
					gp = [canvas.graph_mouse[0], canvas.graph_mouse[1]];
				}
				if (!gp && canvas.ds) {
					const canvasEl = canvas.canvas || document.querySelector('canvas.graphcanvas') || document.querySelector('canvas');
					const rect = canvasEl ? canvasEl.getBoundingClientRect() : { left: 0, top: 0 };
					const ds = canvas.ds;
					gp = [
						((e.clientX - rect.left) / ds.scale) - ds.offset[0],
						((e.clientY - rect.top) / ds.scale) - ds.offset[1]
					];
				}
				if (!gp) return;

				// 3. CASE A: If Ctrl is held or __nukeSwapDraggedNode was active, check for Drop-on-Node SWAP first
				if (e.ctrlKey || window.__nukeSwapDraggedNode) {
					const allNodes = graph._nodes || [];
					let targetNode = null;
					for (let i = allNodes.length - 1; i >= 0; i--) {
						const n = allNodes[i];
						if (!n || n === draggedNode || !n.pos) continue;
						const nw = (n.size && n.size[0]) || 140;
						const nh = (n.size && n.size[1]) || 60;
						if (gp[0] >= n.pos[0] && gp[0] <= n.pos[0] + nw &&
							gp[1] >= n.pos[1] && gp[1] <= n.pos[1] + nh) {
							targetNode = n;
							break;
						}
					}

					if (targetNode) {
						const origPos = draggedNode._nukeOriginalPos || window.__nukeSwapOriginalPos;
						window.__nukeSwapDraggedNode = null;
						window.__nukeSwapOriginalPos = null;
						ImissNukeManager.swapNodes(draggedNode, targetNode, origPos, graph, canvas);
						return;
					}
				}

				// 4. CASE B: Drop onto Wire SPLICE (triggered on Shift+Drop OR Ctrl+Shift+Drop onto wire)
				if (!graph.links) return;
				const cX = draggedNode.pos ? draggedNode.pos[0] : gp[0];
				const cY = draggedNode.pos ? draggedNode.pos[1] : gp[1];
				const cW = (draggedNode.size && draggedNode.size[0]) || 140;
				const cH = (draggedNode.size && draggedNode.size[1]) || 60;
				const cCenter = [cX + cW / 2, cY + cH / 2];
				const nodeBox = [cX, cY, cX + cW, cY + cH];

				let bestCandidate = null;
				let minDistance = Infinity;

				for (const linkId in graph.links) {
					const link = graph.links[linkId];
					if (!link || link.origin_id === draggedNode.id || link.target_id === draggedNode.id) continue;
					const nodeA = graph.getNodeById(link.origin_id);
					const nodeB = graph.getNodeById(link.target_id);
					if (!nodeA || !nodeB) continue;

					// Probar contra la polilinea REAL del pipe, no contra la recta A-B.
					const pts = ImissNukeManager.getLinkPathPoints(link, nodeA, nodeB, canvas);
					if (!pts) continue;

					const intersects = GeometryUtils.polylineIntersectsBox(pts, nodeBox);
					const dist = GeometryUtils.distToPolyline(cCenter, pts);
					// Margen estrecho: hay que soltar SOBRE el cable. El antiguo
					// `max(w, h) * 1.5` agarraba el cable mas cercano del vecindario.
					const threshold = Math.max(20, Math.min(cW, cH) * 0.25);

					if (!intersects && dist > threshold) continue;

					const outTypeA = nodeA.outputs?.[link.origin_slot]?.type || '*';
					const inTypeB = nodeB.inputs?.[link.target_slot]?.type || '*';

					let inSlotC = -1;
					if (draggedNode.inputs) {
						for (let i = 0; i < draggedNode.inputs.length; i++) {
							const inC = draggedNode.inputs[i];
							if (inC && ImissNukeManager.isAutoConnectable(draggedNode, inC, outTypeA)) {
								inSlotC = i;
								if (inC.link == null) break;
							}
						}
					}

					let outSlotC = -1;
					if (draggedNode.outputs) {
						for (let oi = 0; oi < draggedNode.outputs.length; oi++) {
							const outC = draggedNode.outputs[oi];
							if (outC && GeometryUtils.areTypesCompatible(outC.type, inTypeB)) {
								outSlotC = oi;
								break;
							}
						}
					}

					if (inSlotC !== -1 && outSlotC !== -1) {
						const effectiveDist = intersects ? 0 : dist;
						if (effectiveDist < minDistance) {
							minDistance = effectiveDist;
							bestCandidate = { link, nodeA, nodeB, inSlotC, outSlotC };
						}
					}
				}

				if (bestCandidate) {
					ImissNukeManager.spliceNodeIntoLink(draggedNode, bestCandidate, graph, canvas);
				}
			};

			// Solo pointerup. Litegraph escucha pointerup (nunca mouseup), y una sola
			// soltada de raton dispara AMBOS: el pase de mouseup corria contra estado
			// ya reseteado y podia empalmar una segunda vez. pointerup cubre raton,
			// pluma Wacom y tactil por igual, en Windows y en Linux.
			window.addEventListener('pointerup', handleDropAction, { capture: true });
		}

		// ---- 9. ENCOLAR NODOS SELECCIONADOS (SHIFT+R) ----
		static async queueSelected() {
			if (typeof app === 'undefined' || !app.canvas || !app.graph) return;
			const selNodes = Object.values(app.canvas.selected_nodes || {});
			if (!selNodes.length) {
				if (app.queuePrompt) await app.queuePrompt(0, 1);
				return;
			}

			const isOutput = (n) => {
				if (!n || n.mode === LiteGraph.NEVER) return false;
				if (n.constructor?.nodeData?.output_node || n.is_output_node) return true;
				const type = (n.type || '').toLowerCase();
				return type.includes('save') || type.includes('preview') || type.includes('output') || type.includes('display');
			};

			let targetOutputs = selNodes.filter(isOutput);
			if (!targetOutputs.length) {
				const graph = app.graph;
				const visited = new Set();
				const queue = [...selNodes];
				while (queue.length > 0) {
					const curr = queue.shift();
					if (!curr || visited.has(curr.id)) continue;
					visited.add(curr.id);

					if (isOutput(curr)) targetOutputs.push(curr);

					if (curr.outputs && graph?.links) {
						for (const out of curr.outputs) {
							if (out?.links) {
								for (const linkId of out.links) {
									const linkInfo = graph.links[linkId];
									if (linkInfo) {
										const dstNode = graph.getNodeById(linkInfo.target_id);
										if (dstNode && !visited.has(dstNode.id)) queue.push(dstNode);
									}
								}
							}
						}
					}
				}
			}

			if (!targetOutputs.length) targetOutputs = selNodes;

			if (window.rgthree && typeof window.rgthree.queueOutputNodes === 'function') {
				await window.rgthree.queueOutputNodes(targetOutputs);
				return;
			}

			try {
				const targetIds = new Set(targetOutputs.map(n => String(n.id)));
				const p = await app.graphToPrompt();
				if (p && p.output) {
					const oldOutput = p.output;
					const newOutput = {};

					const addDependencies = (nodeId) => {
						const idStr = String(nodeId);
						if (newOutput[idStr] != null || oldOutput[idStr] == null) return;
						newOutput[idStr] = oldOutput[idStr];
						const nodeData = oldOutput[idStr];
						if (nodeData?.inputs) {
							for (const val of Object.values(nodeData.inputs)) {
								if (Array.isArray(val)) addDependencies(val[0]);
							}
						}
					};

					for (const id of targetIds) addDependencies(id);

					if (Object.keys(newOutput).length > 0) {
						const promptData = { output: newOutput, workflow: p.workflow };
						if (typeof api !== 'undefined' && api.queuePrompt) {
							await api.queuePrompt(0, promptData);
							return;
						}
					}
				}
				await app.queuePrompt(0, 1);
			} catch (err) {
				if (app.queuePrompt) await app.queuePrompt(0, 1);
			}
		}

		// ---- 10. FOCUS / FRAME SELECCIÓN O GRAFO COMPLETO (F) ----
		static frameNodes(nodes, group) {
			if (typeof app === 'undefined' || !app.canvas || !app.graph) return;
			const canvas = app.canvas;
			const ds = canvas.ds;
			if (!ds) return;

			const canvasEl = canvas.canvas || document.querySelector('canvas');
			const viewWidth = canvasEl ? (canvasEl.clientWidth || canvasEl.width || window.innerWidth) : window.innerWidth;
			const viewHeight = canvasEl ? (canvasEl.clientHeight || canvasEl.height || window.innerHeight) : window.innerHeight;

			let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

			if (group && (group.bounding || group._bounding)) {
				const b = group.bounding || group._bounding;
				minX = b[0]; minY = b[1]; maxX = b[0] + b[2]; maxY = b[1] + b[3];
			}

			if (nodes && nodes.length > 0) {
				for (const node of nodes) {
					if (!node || !node.pos) continue;
					const x = node.pos[0], y = node.pos[1];
					const w = node.size ? node.size[0] : 160;
					const h = node.size ? node.size[1] : 90;
					minX = Math.min(minX, x); minY = Math.min(minY, y);
					maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h);
				}
			}

			if (minX === Infinity) {
				const allNodes = app.graph._nodes || app.graph.nodes || [];
				if (!allNodes.length) return;
				for (const node of allNodes) {
					if (!node || !node.pos) continue;
					const x = node.pos[0], y = node.pos[1];
					const w = node.size ? node.size[0] : 160;
					const h = node.size ? node.size[1] : 90;
					minX = Math.min(minX, x); minY = Math.min(minY, y);
					maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h);
				}
			}

			if (minX === Infinity) return;

			const centerX = (minX + maxX) / 2;
			const centerY = (minY + maxY) / 2;
			const bboxWidth = Math.max(maxX - minX, 120);
			const bboxHeight = Math.max(maxY - minY, 120);

			const padX = 140, padY = 140;
			const scaleX = viewWidth / (bboxWidth + padX);
			const scaleY = viewHeight / (bboxHeight + padY);
			let targetScale = Math.max(0.1, Math.min(1.15, Math.min(scaleX, scaleY)));

			ds.scale = targetScale;
			ds.offset[0] = (viewWidth / (2 * targetScale)) - centerX;
			ds.offset[1] = (viewHeight / (2 * targetScale)) - centerY;

			canvas.setDirty(true, true);
			if (app.graph?.change) app.graph.change();
		}
	}

	// ---- PALETA DE COLOR (CTRL+SHIFT+C) — LA DE PIXAROMA ----
	/* ⚑⚑ v19.12 — Jorge: "puedes sustituir el tool de I miss nuke
	 * por lo que hiciste de pixorama… quiero que tengamos el i missnuke de
	 * linux igualito… ahí sí me gusta más control shift C". La paleta chica
	 * (11 colores + Full/Header + input de color) se va; ésta es la de
	 * ComfyUI-Pixaroma (js/node_colors/index.js, MIT, © 2026 pixaroma),
	 * rehecha aquí — en la Linux del estudio Pixaroma no existe. Nació en el
	 * Scene Manager (panel 9.81) y se mudó aquí, la regla de siempre: lo de
	 * Ctrl+Shift+C es de ImissNuke y el panel sólo abre esta caja
	 * (`window.__imissNukeColors`, su chip [node color] del hotbox).
	 *   · Title / Body: un picker (SV + hue) edita el que está prendido.
	 *   · el candado: Body sigue a Title con el cuerpo oscuro de Pixaroma
	 *     (darkBodyFor) — ES el header only. Nace cerrado si el nodo ya lo
	 *     trae (marca o par de darkBody), o si no trae color y el estilo
	 *     guardado (`imissnuke-color-style`) no es `full`.
	 *   · FAVS: 15; + guarda el par, click aplica, click derecho borra
	 *     (localStorage `imissnuke-color-favs`).
	 *   · los 45 colores de Pixaroma (GROUP_COLORS), con su cuerpo.
	 *   · en vivo sobre todo lo seleccionado; un grupo lleva el color del
	 *     header (como lo dibuja patchGroupDraw, v18.86).
	 * ⚑⚑ La marca `_n2c_hdr` sigue siendo la ley (el switch [Node colours]
	 * del Scene Manager la lee): candado cerrado = marca { c: título,
	 * bg: título al 45 % }; candado abierto = sin marca.
	 * ⚑⚑ Reset por el SETTER (= undefined), nunca `delete`: Nodes 2.0 pierde
	 * el accessor reactivo (la lección de Pixaroma).
	 * ⚑ Un paso de undo por GESTO terminado (changeTracker.checkState). */
	class ImissNukeColorPicker {
		static PRESETS = [
			['Pixaroma Orange', 'f66744'], ['Dark Gray', '4a4a4e'],
			['Light Red', 'd57b7b'], ['Soft Red', 'd35050'], ['Mid Red', 'cf2a2a'],
			['Light Orange', 'd5a57b'], ['Soft Orange', 'd38d50'], ['Mid Orange', 'cf772a'],
			['Mid Gold', 'cfa62a'], ['Light Lime', 'c3d57b'], ['Soft Lime', 'b9d350'],
			['Mid Lime', 'aecf2a'], ['Light Green', '8ad57b'], ['Soft Green', '65d350'],
			['Rich Green', '38b21f'], ['Soft Teal', '50d3a3'], ['Mid Teal', '2acf93'],
			['Deep Teal', '189164'], ['Soft Cyan', '50c2d3'], ['Rich Cyan', '1f9eb2'],
			['Light Blue', '7ba1d5'], ['Soft Blue', '5086d3'], ['Mid Blue', '2a6fcf'],
			['Light Violet', '9c7bd5'], ['Soft Violet', '8050d3'], ['Light Pink', 'd57bba'],
			['Soft Pink', 'd350ac'], ['Mid Pink', 'cf2a9e'], ['Light Indigo', '9b8ad5'],
			['Soft Indigo', '6a5fd3'], ['Mid Indigo', '4a3fcf'], ['Light Aqua', '8ad5cf'],
			['Rich Red', 'b52833'], ['Rich Orange', 'b5602a'], ['Rich Amber', 'b5862a'],
			['Rich Gold', '9e8a2a'], ['Rich Lime', '7a9e2a'], ['Rich Green', '2f9e3f'],
			['Rich Emerald', '1f9e6a'], ['Rich Teal', '1f9285'], ['Rich Cyan', '1f85a8'],
			['Rich Sky', '2f7fc0'], ['Rich Blue', '2a55cf'], ['Rich Violet', '6a3fcf'],
			['Rich Purple', '9e3fc0'],
		];
		static FAVS = 15;
		static FAV_KEY = 'imissnuke-color-favs';
		static STYLE_KEY = 'imissnuke-color-style';
		static GROUP = '3f789e';   // el azul de un grupo nuevo (pale_blue)
		static S = { el: null, nodes: [], groups: [], t: '', b: '', tgt: 'title', link: true, h: 0, s: 0, v: 0 };

		static rgb(hex) {
			const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
			if (m) return [0, 2, 4].map(i => parseInt(m[1].substr(i, 2), 16));
			const s = /^#?([0-9a-f]{3})$/i.exec(String(hex || '').trim());
			if (s) return [0, 1, 2].map(i => parseInt(s[1][i] + s[1][i], 16));
			const r = /^rgba?\D*([\d.]+)\D+([\d.]+)\D+([\d.]+)/i.exec(String(hex || '').trim());
			return r ? [1, 2, 3].map(i => Math.max(0, Math.min(255, Math.round(+r[i])))) : null;
		}
		static hex6(v) { const c = this.rgb(v); return c ? this.hexOf(c) : ''; }
		static hexOf(c) { return c.map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join(''); }
		// Pixaroma's darkBodyFor: 15 % del color en el neutro #242424
		static body(t) { const c = this.rgb(t) || [36, 36, 36]; return this.hexOf(c.map(ch => 0.85 * 0x24 + 0.15 * ch)); }
		static darken(t, f) { return this.hexOf((this.rgb(t) || [0, 0, 0]).map(ch => ch * f)); }
		static lum(t) { const c = this.rgb(t) || [0, 0, 0]; return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255; }
		static ink(t) { return this.lum(t) > 0.6 ? '#141414' : '#ffffff'; }
		static isGroup(x) {
			if (!x) return false;
			if (typeof LGraphGroup !== 'undefined' && x instanceof LGraphGroup) return true;
			if (typeof x.recomputeInsideNodes === 'function') return true;
			return x._bounding !== undefined && x.type === undefined && !Array.isArray(x.inputs);
		}
		static headerOnly() {
			try { return localStorage.getItem(this.STYLE_KEY) !== 'full'; } catch (e) { return true; }
		}
		static cur() { const S = this.S; return S.tgt === 'body' ? S.b : S.t; }

		static hsvOf(hex) {
			const S = this.S, c = this.rgb(hex) || [0, 0, 0];
			const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
			const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
			let h = S.h;   // un gris no tiene hue: se queda el de la tira
			if (d) h = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) / 6;
			S.h = h; S.s = mx ? d / mx : 0; S.v = mx;
		}
		static hexHsv(h, s, v) {
			const f = (n) => { const k = (n + h * 6) % 6; return 255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))); };
			return this.hexOf([f(5), f(3), f(1)]);
		}

		static pair(n) {
			const LG = (typeof LiteGraph !== 'undefined') ? LiteGraph : null, k = n && n.constructor;
			const t = this.hex6(n && n.color) || this.hex6(k && k.color) || this.hex6(LG && LG.NODE_DEFAULT_COLOR) || '353535';
			const b = this.hex6(n && n.bgcolor) || this.hex6(k && k.bgcolor) || this.hex6(LG && LG.NODE_DEFAULT_BGCOLOR) || '353535';
			return [t, b];
		}
		static paint(n) {
			const S = this.S;
			n.color = '#' + S.t;
			n.bgcolor = '#' + S.b;
			n.properties = n.properties || {};
			if (S.b === this.body(S.t)) n.properties._n2c_hdr = { c: '#' + S.t, bg: '#' + this.darken(S.t, 0.45) };
			else delete n.properties._n2c_hdr;
		}
		static dirty() {
			try { app.canvas.setDirty(true, true); } catch (e) {}
			try { (app.canvas.graph || app.graph).setDirtyCanvas(true, true); } catch (e) {}
		}
		static apply() {
			const S = this.S;
			S.nodes.forEach(n => { try { this.paint(n); } catch (e) {} });
			S.groups.forEach(g => { try { g.color = '#' + S.t; } catch (e) {} });
			this.dirty();
		}
		static undoMark() {
			try {
				const wm = app.extensionManager && app.extensionManager.workflow;
				const ct = wm && wm.activeWorkflow && wm.activeWorkflow.changeTracker;
				if (ct && typeof ct.checkState === 'function') ct.checkState();
			} catch (e) {}
		}
		static set(hex) {
			const S = this.S;
			if (S.tgt === 'body') { S.b = hex; S.link = false; }
			else { S.t = hex; if (S.link) S.b = this.body(hex); }
			this.apply();
		}
		static pairSet(t, b) {
			const S = this.S;
			S.t = t; S.b = b; S.link = (b === this.body(t));
			this.hsvOf(this.cur());
			this.apply(); this.undoMark(); this.sync(true);
		}
		static load() {
			const S = this.S, n = S.nodes[0], g = S.groups[0];
			if (n) {
				const p = this.pair(n);
				S.t = p[0]; S.b = p[1];
				S.link = !!(n.properties && n.properties._n2c_hdr) || S.b === this.body(S.t)
					|| (!this.hex6(n.color) && this.headerOnly());
			} else {
				S.t = this.hex6(g && g.color) || this.GROUP;
				S.b = this.body(S.t); S.link = true; S.tgt = 'title';
			}
			this.hsvOf(this.cur());
		}
		static reset() {
			const S = this.S;
			S.nodes.forEach(n => {
				try { n.color = undefined; n.bgcolor = undefined; if (n.properties) delete n.properties._n2c_hdr; } catch (e) {}
			});
			S.groups.forEach(g => { try { g.color = '#' + this.GROUP; } catch (e) {} });
			this.dirty(); this.undoMark(); this.load(); this.sync(true);
		}

		static favs() {
			let a = [];
			try { a = JSON.parse(localStorage.getItem(this.FAV_KEY) || '[]'); } catch (e) { a = []; }
			a = Array.isArray(a) ? a.slice(0, this.FAVS) : [];
			while (a.length < this.FAVS) a.push(null);
			return a.map(f => (f && /^[0-9a-f]{6}$/.test(f[0]) && /^[0-9a-f]{6}$/.test(f[1])) ? [f[0], f[1]] : null);
		}
		static favsSave(a) { try { localStorage.setItem(this.FAV_KEY, JSON.stringify(a)); } catch (e) {} }
		static favAdd() {
			const S = this.S, a = this.favs();
			if (a.some(f => f && f[0] === S.t && f[1] === S.b)) return;
			let i = a.findIndex(f => !f);
			if (i < 0) i = this.FAVS - 1;
			a[i] = [S.t, S.b];
			this.favsSave(a); this.favPaint(); this.sync();
		}
		static swatch(t, b, attr, tip) {
			const bg = b ? `linear-gradient(to bottom,#${t} 0,#${t} 40%,#${b} 40%,#${b} 100%)` : '#' + t;
			const div = document.createElement('div');
			div.className = 'in-nc-sw';
			div.setAttribute(attr[0], attr[1]);
			div.title = tip;
			div.style.background = bg;
			return div;
		}
		static favPaint() {
			const S = this.S, g = S.el && S.el.querySelector('[data-ncfg]');
			if (!g) return;
			const solo = !S.nodes.length;
			g.innerHTML = '<div class="in-nc-add" data-ncadd title="Save the current colours to the first free favourite">+</div>';
			this.favs().forEach((f, i) => {
				if (f) g.appendChild(this.swatch(f[0], solo ? '' : f[1], ['data-ncf', String(i)], `Favourite ${i + 1}: click to apply, right-click to remove`));
				else { const e = document.createElement('div'); e.className = 'in-nc-e'; e.title = `Favourite ${i + 1} (empty)`; g.appendChild(e); }
			});
		}

		static sync(force) {
			const S = this.S, el = S.el;
			if (!el) return;
			const cur = this.cur();
			const sv = el.querySelector('[data-ncsv]');
			sv.style.background = 'linear-gradient(to top,#000,rgba(0,0,0,0)),linear-gradient(to right,#fff,rgba(255,255,255,0)),#' + this.hexHsv(S.h, 1, 1);
			const dot = sv.firstChild;
			dot.style.left = (S.s * 100) + '%';
			dot.style.top = ((1 - S.v) * 100) + '%';
			dot.style.background = '#' + cur;
			el.querySelector('[data-nchue]').firstChild.style.top = (S.h * 100) + '%';
			el.querySelectorAll('[data-nctg]').forEach(b => {
				const on = b.getAttribute('data-nctg') === S.tgt;
				b.className = on ? 'in-on' : '';
				b.style.background = on ? '#' + cur : '';
				b.style.color = on ? this.ink(cur) : '';
			});
			const ln = el.querySelector('[data-ncln]');
			if (ln) {
				ln.style.background = S.link ? '#' + S.t : '';
				ln.style.borderColor = S.link ? '#' + S.t : '';
				ln.style.color = S.link ? this.ink(S.t) : '';
				ln.title = S.link
					? 'Linked: Body follows Title, as a dark tint of it (the header-only look). Picking a Body unlinks them; click to unlink.'
					: 'Link Title and Body: Body becomes a dark tint of Title (the header-only look).';
			}
			el.querySelectorAll('[data-nchex]').forEach(inp => {
				if (!force && document.activeElement === inp) return;
				inp.value = '#' + (inp.getAttribute('data-nchex') === 'body' ? S.b : S.t);
			});
			el.querySelectorAll('[data-ncchip]').forEach(c => {
				c.style.background = '#' + (c.getAttribute('data-ncchip') === 'body' ? S.b : S.t);
			});
			const solo = !S.nodes.length, fv = this.favs();
			el.querySelectorAll('[data-ncp]').forEach(s => {
				const c = this.PRESETS[+s.getAttribute('data-ncp')][1];
				s.classList.toggle('in-on', c === S.t && (solo || S.b === this.body(c)));
			});
			el.querySelectorAll('[data-ncf]').forEach(s => {
				const f = fv[+s.getAttribute('data-ncf')];
				s.classList.toggle('in-on', !!f && f[0] === S.t && (solo || f[1] === S.b));
			});
		}

		static drag(z, fn) {
			let on = false;
			const at = (e) => {
				const r = z.getBoundingClientRect();
				fn(Math.max(0, Math.min(1, (e.clientX - r.left) / (r.width || 1))),
				   Math.max(0, Math.min(1, (e.clientY - r.top) / (r.height || 1))));
			};
			z.addEventListener('pointerdown', (e) => { on = true; try { z.setPointerCapture(e.pointerId); } catch (er) {} at(e); e.preventDefault(); });
			z.addEventListener('pointermove', (e) => { if (on) at(e); });
			const end = () => { if (!on) return; on = false; this.undoMark(); };
			z.addEventListener('pointerup', end);
			z.addEventListener('pointercancel', end);
		}

		static copy(ch) {
			const S = this.S, hx = '#' + (ch.getAttribute('data-ncchip') === 'body' ? S.b : S.t);
			const flash = () => { ch.style.boxShadow = '0 0 0 2px #7fc24a'; setTimeout(() => { ch.style.boxShadow = ''; }, 600); };
			try {
				if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(hx).then(flash, () => {}); return; }
			} catch (e) {}
			try {
				const ta = document.createElement('textarea');
				ta.value = hx; document.body.appendChild(ta); ta.select();
				if (document.execCommand('copy')) flash();
				ta.remove();
			} catch (e) {}
		}

		static css() {
			if (document.getElementById('imissnuke-nc-css')) return;
			const st = document.createElement('style');
			st.id = 'imissnuke-nc-css';
			/* ⚑ z 2147483550: encima de la barra del Scene Manager (2147483000) y
			 * debajo de la caja de Find (2147483600). Fondo SÓLIDO y grises de
			 * verdad (la regla del panel, v3.93). */
			st.textContent = `
#imissnuke-color-popup{position:fixed;z-index:2147483550;width:470px;max-width:96vw;max-height:94vh;overflow-y:auto;display:flex;flex-direction:column;box-sizing:border-box;padding:14px 16px 16px;background:#1c1c1c;color:#f0f0f0;border:1px solid #2c2c2c;border-radius:10px;box-shadow:0 16px 40px rgba(0,0,0,.6);font:13px/1.3 'IBM Plex Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;user-select:none}
#imissnuke-color-popup *{box-sizing:border-box}
.in-nc-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;cursor:move}
.in-nc-t{font-size:15px;font-weight:600}
.in-nc-x{background:none;border:0;color:#8a8a8a;font-size:15px;line-height:1;padding:3px 7px;border-radius:4px;cursor:pointer}
.in-nc-x:hover{color:#f0f0f0;background:rgba(127,127,127,.14)}
.in-nc-seg{display:flex;gap:3px;padding:3px;margin-bottom:11px;background:#141414;border:1px solid #303030;border-radius:7px}
.in-nc-seg button{flex:1;padding:5px 0;border:0;border-radius:5px;background:none;color:#c4c4c4;font:inherit;font-size:12px;cursor:pointer}
.in-nc-seg button:hover{background:rgba(127,127,127,.14)}
.in-nc-seg button.in-on{box-shadow:inset 0 0 0 1px rgba(255,255,255,.28)}
.in-nc-row{display:flex;gap:12px;align-items:flex-start}
.in-nc-sv{position:relative;flex:1 1 auto;min-width:0;height:300px;border-radius:6px;border:1px solid #464646;cursor:crosshair;touch-action:none}
.in-nc-sv i{position:absolute;width:12px;height:12px;margin:-8px 0 0 -8px;border:2px solid #fff;border-radius:50%;box-shadow:0 0 0 1px rgba(0,0,0,.5),0 0 3px rgba(0,0,0,.6);pointer-events:none}
.in-nc-hue{position:relative;flex:0 0 16px;height:300px;border-radius:6px;border:1px solid #464646;cursor:ns-resize;touch-action:none;background:linear-gradient(to bottom,#f00,#ff0 17%,#0f0 33%,#0ff 50%,#00f 67%,#f0f 83%,#f00)}
.in-nc-hue i{position:absolute;left:-3px;right:-3px;height:4px;margin-top:-3px;border:1px solid #fff;border-radius:2px;box-shadow:0 0 2px rgba(0,0,0,.8);pointer-events:none}
.in-nc-fav{flex:0 0 66px}
.in-nc-cap{font-size:11px;letter-spacing:.06em;color:#8a8a8a;margin:0 0 6px}
.in-nc-pc{margin-top:13px}
.in-nc-fg{display:grid;grid-template-columns:repeat(2,1fr);gap:4px}
.in-nc-sw,.in-nc-e,.in-nc-add{aspect-ratio:1;border-radius:5px}
.in-nc-sw{cursor:pointer;border:1px solid rgba(255,255,255,.14);box-shadow:inset 0 0 0 1px rgba(0,0,0,.25)}
.in-nc-sw:hover{border-color:#e8e8e8}
.in-nc-sw.in-on{border:2px solid #f2f2f2}
.in-nc-e{border:1px dashed rgba(255,255,255,.2)}
.in-nc-add{border:1px dashed #c4c4c4;color:#c4c4c4;display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1;cursor:pointer}
.in-nc-add:hover{background:rgba(127,127,127,.14)}
.in-nc-hx{display:flex;gap:8px;margin-top:10px}
.in-nc-bar{flex:1 1 0;min-width:0;display:flex;align-items:center;gap:8px;background:#141414;border:1px solid #303030;border-radius:6px;padding:6px 9px}
.in-nc-chip{flex:none;width:18px;height:18px;border-radius:4px;border:1px solid rgba(255,255,255,.2);cursor:pointer}
.in-nc-k{flex:none;font-size:11px;color:#8a8a8a}
.in-nc-bar input{flex:1 1 auto;min-width:0;width:0;padding:0;border:0;outline:0;background:none;color:#f0f0f0;font:12.5px Consolas,Menlo,monospace;letter-spacing:.03em;user-select:text}
.in-nc-ln{flex:none;width:30px;display:flex;align-items:center;justify-content:center;padding:0;border-radius:6px;cursor:pointer;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#bbb}
.in-nc-pg{display:grid;grid-template-columns:repeat(15,1fr);gap:4px}
.in-nc-ft{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px}
.in-nc-hint{flex:1;font-size:11px;color:#8a8a8a}
.in-nc-b{flex:none;padding:7px 18px;min-width:84px;border-radius:4px;cursor:pointer;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.18);color:rgba(255,255,255,.88);font:inherit;font-size:12px}
.in-nc-b:hover{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.3)}`;
			document.head.appendChild(st);
		}

		static close() {
			const S = this.S, el = S.el;
			S.el = null; S.nodes = []; S.groups = [];
			if (el && el.parentNode) el.parentNode.removeChild(el);
			if (this._off) { this._off(); this._off = null; }
		}

		// `targets`: nodos y grupos mezclados (el handler de Ctrl+Shift+C).
		// `clientX/Y`: dónde se apretó; la caja se pone junto a lo que pinta.
		static open(targets, clientX, clientY) {
			this.close();
			if (!targets || !targets.length) return;
			const S = this.S;
			S.nodes = targets.filter(x => x && !this.isGroup(x));
			S.groups = targets.filter(x => this.isGroup(x));
			S.tgt = 'title';
			this.load();
			this.css();
			const solo = !S.nodes.length, nn = S.nodes.length, ng = S.groups.length;
			const head = solo ? 'Group Color' + (ng > 1 ? ` (${ng} groups)` : '')
				: 'Node Colors' + (nn > 1 ? ` (${nn} nodes)` : '') + (ng ? ` + ${ng} group${ng > 1 ? 's' : ''}` : '');
			const bar = (k, label) => `<span class="in-nc-bar"><i class="in-nc-chip" data-ncchip="${k}" title="Copy this colour code"></i><span class="in-nc-k">${label}</span><input data-nchex="${k}" spellcheck="false" maxlength="7"></span>`;
			const LINK = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
			const el = document.createElement('div');
			el.id = 'imissnuke-color-popup';
			el.style.left = '-9999px';
			el.style.top = '0px';
			el.innerHTML =
				`<div class="in-nc-h" data-nch><span class="in-nc-t"></span><button class="in-nc-x" data-ncx title="Close (Esc, or Ctrl+Shift+C again)">✕</button></div>`
				+ (solo ? '' : '<div class="in-nc-seg" title="Which of the two the picker edits"><button data-nctg="title">Title</button><button data-nctg="body">Body</button></div>')
				+ '<div class="in-nc-row"><div class="in-nc-sv" data-ncsv><i></i></div><div class="in-nc-hue" data-nchue><i></i></div>'
				+ '<div class="in-nc-fav"><div class="in-nc-cap">FAVS</div><div class="in-nc-fg" data-ncfg></div></div></div>'
				+ '<div class="in-nc-hx">' + bar('title', solo ? 'Color' : 'Title')
				+ (solo ? '' : `<button class="in-nc-ln" data-ncln>${LINK}</button>` + bar('body', 'Body')) + '</div>'
				+ `<div class="in-nc-cap in-nc-pc">${solo ? 'GROUP COLORS' : 'NODE COLORS'}</div><div class="in-nc-pg" data-ncpg></div>`
				+ `<div class="in-nc-ft"><span class="in-nc-hint">+ save current · click = apply · right-click = remove</span><button class="in-nc-b" data-ncrs title="Back to the colours ${solo ? 'a new group has' : 'the theme gives a node'}">Reset colors</button></div>`;
			el.querySelector('.in-nc-t').textContent = head;
			const pg = el.querySelector('[data-ncpg]');
			this.PRESETS.forEach((p, i) => pg.appendChild(this.swatch(p[1], solo ? '' : this.body(p[1]), ['data-ncp', String(i)], p[0])));
			document.body.appendChild(el);
			S.el = el;
			this.wire(el);
			this.favPaint();
			this.sync(true);
			this.place(clientX, clientY);
		}

		static wire(el) {
			const S = this.S;
			el.querySelector('[data-ncx]').onclick = () => this.close();
			const hd = el.querySelector('[data-nch]');
			hd.addEventListener('pointerdown', (e) => {
				if (e.target.closest('[data-ncx]')) return;
				const r = el.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
				try { hd.setPointerCapture(e.pointerId); } catch (er) {}
				const mv = (ev) => { el.style.left = Math.round(ev.clientX - dx) + 'px'; el.style.top = Math.round(ev.clientY - dy) + 'px'; };
				const up = () => { hd.removeEventListener('pointermove', mv); hd.removeEventListener('pointerup', up); hd.removeEventListener('pointercancel', up); };
				hd.addEventListener('pointermove', mv);
				hd.addEventListener('pointerup', up);
				hd.addEventListener('pointercancel', up);
				e.preventDefault();
			});
			this.drag(el.querySelector('[data-ncsv]'), (x, y) => { S.s = x; S.v = 1 - y; this.set(this.hexHsv(S.h, S.s, S.v)); this.sync(); });
			this.drag(el.querySelector('[data-nchue]'), (x, y) => { S.h = Math.min(y, 0.9999); this.set(this.hexHsv(S.h, S.s, S.v)); this.sync(); });
			el.addEventListener('click', (e) => {
				const t = e.target;
				if (!t || !t.closest) return;
				const b = t.closest('[data-nctg]');
				if (b) { S.tgt = b.getAttribute('data-nctg'); this.hsvOf(this.cur()); this.sync(); return; }
				if (t.closest('[data-ncln]')) {
					S.link = !S.link;
					if (S.link) { S.b = this.body(S.t); this.hsvOf(this.cur()); this.apply(); this.undoMark(); }
					this.sync(true);
					return;
				}
				const p = t.closest('[data-ncp]');
				if (p) { const c = this.PRESETS[+p.getAttribute('data-ncp')][1]; this.pairSet(c, this.body(c)); return; }
				const f = t.closest('[data-ncf]');
				if (f) { const fv = this.favs()[+f.getAttribute('data-ncf')]; if (fv) this.pairSet(fv[0], fv[1]); return; }
				if (t.closest('[data-ncadd]')) { this.favAdd(); return; }
				const ch = t.closest('[data-ncchip]');
				if (ch) { this.copy(ch); return; }
				if (t.closest('[data-ncrs]')) this.reset();
			});
			el.addEventListener('contextmenu', (e) => {
				const f = e.target && e.target.closest && e.target.closest('[data-ncf]');
				if (!f) return;
				e.preventDefault();
				const a = this.favs();
				a[+f.getAttribute('data-ncf')] = null;
				this.favsSave(a); this.favPaint(); this.sync();
			});
			el.querySelectorAll('[data-nchex]').forEach(inp => {
				const k = inp.getAttribute('data-nchex');
				inp.addEventListener('input', () => {
					const m = /^#?([0-9a-f]{6})$/i.exec(String(inp.value || '').trim());
					if (!m) return;
					const hx = m[1].toLowerCase();
					if (k === 'body') { S.b = hx; S.link = false; }
					else { S.t = hx; if (S.link) S.b = this.body(hx); }
					if (k === S.tgt) this.hsvOf(hx);
					this.apply(); this.sync();
				});
				inp.addEventListener('change', () => { this.undoMark(); this.sync(true); });
				inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') inp.blur(); });
			});
			// fuera: un click en otro lado, Esc; y la ventana que se achica la mantiene adentro
			const onDown = (e) => { if (S.el && !S.el.contains(e.target)) this.close(); };
			const onKey = (e) => {
				if (e.key !== 'Escape' || !S.el) return;
				e.preventDefault(); e.stopPropagation();
				try { e.stopImmediatePropagation(); } catch (er) {}
				this.close();
			};
			const onResize = () => {
				if (!S.el) return;
				const r = S.el.getBoundingClientRect();
				S.el.style.left = Math.round(Math.max(8, Math.min(r.left, window.innerWidth - S.el.offsetWidth - 8))) + 'px';
				S.el.style.top = Math.round(Math.max(8, Math.min(r.top, window.innerHeight - S.el.offsetHeight - 8))) + 'px';
			};
			const t0 = setTimeout(() => document.addEventListener('pointerdown', onDown, true), 0);
			document.addEventListener('keydown', onKey, true);
			window.addEventListener('resize', onResize);
			this._off = () => {
				clearTimeout(t0);
				document.removeEventListener('pointerdown', onDown, true);
				document.removeEventListener('keydown', onKey, true);
				window.removeEventListener('resize', onResize);
			};
		}

		// Junto a lo que pinta (a su derecha, si no a su izquierda), adentro
		// de la ventana; sin rect, donde se apretó.
		static place(clientX, clientY) {
			const S = this.S, el = S.el;
			if (!el) return;
			let r = null;
			try {
				const c = app.canvas, cv = c && c.canvas, ds = c && c.ds, x = S.nodes[0] || S.groups[0];
				if (x && cv && ds && ds.offset) {
					const cr = cv.getBoundingClientRect(), s = ds.scale || 1;
					const th = ((typeof LiteGraph !== 'undefined' && LiteGraph.NODE_TITLE_HEIGHT) || 30);
					const b = S.nodes[0] ? [x.pos[0], x.pos[1] - th, x.size[0], x.size[1] + th]
						: (x._bounding || [x.pos[0], x.pos[1], x.size[0], x.size[1]]);
					r = { x: cr.left + (b[0] + ds.offset[0]) * s, y: cr.top + (b[1] + ds.offset[1]) * s, w: b[2] * s, h: b[3] * s };
				}
			} catch (e) { r = null; }
			const vw = window.innerWidth, vh = window.innerHeight, mw = el.offsetWidth, mh = el.offsetHeight, gap = 12, pad = 8;
			let x, y;
			if (r) {
				x = r.x + r.w + gap;
				if (x + mw > vw - pad) x = r.x - gap - mw;
				if (x < pad) x = vw - mw - pad;
				y = r.y;
			} else {
				x = (clientX !== undefined ? clientX : vw / 2) + 15;
				y = (clientY !== undefined ? clientY : vh / 2) - 30;
			}
			el.style.left = Math.round(Math.max(pad, Math.min(x, vw - mw - pad))) + 'px';
			el.style.top = Math.round(Math.max(pad, Math.min(y, vh - mh - pad))) + 'px';
		}
	}

	// ---- BUSCAR UN NODO (/) — EL SEARCH DE NUKE ----
	/* ⚑⚑ v18.21 — nació en el Scene Manager (panel 9.18) y se mudó aquí. Jorge:
	 * "eso que agregaste lo quiero dentro de ImissNuke, ya que eso es justo lo
	 * que Nuke tiene." En Nuke, `/` en el Node Graph es Edit ▸ Search: escribes
	 * y te selecciona los nodos que coinciden.
	 *
	 * ⚑ Un número va primero al nodo CON ESE id (el "Node ID: 113" de un
	 * Execution failed, el badge, lo que te dice otro artista); un texto busca
	 * en el título, el tipo y la clase. `12:5` — como el log nombra un nodo
	 * DENTRO de un subgrafo — lleva al subgrafo #12 y lo dice: entrar es del
	 * frontend.
	 * ⚑ Enter va a UNO: lo selecciona y lo encuadra con la cámara del propio
	 * frontend (`animateToBounds`, la animación de su ⌖), con la F de aquí
	 * detrás. Shift+Enter selecciona TODOS los que coinciden y los encuadra con
	 * la F — que es lo que hace el `/` de Nuke.
	 * ⚑ Sin switch, como F, D y L: ComfyUI no tiene nada amarrado a `/` (su
	 * tabla de atajos, medida en 1.52.7), así que no se le quita nada.
	 */
	class ImissNukeFind {
		static graph() {
			if (typeof app === 'undefined' || !app) return null;
			return (app.canvas && app.canvas.graph) || app.graph || null;
		}

		// Todos los nodos de lo que estás viendo, con el subgrafo que los
		// contiene cuando viven adentro de uno.
		static all() {
			const out = [];
			const walk = (g, via, depth) => {
				const list = (g && (g._nodes || g.nodes)) || [];
				for (const n of list) {
					if (!n) continue;
					out.push({ n, via });
					if (n.subgraph && depth < 4) walk(n.subgraph, via || n, depth + 1);
				}
			};
			walk(ImissNukeFind.graph(), null, 0);
			return out;
		}

		static label(n) {
			let t = '';
			try { t = String((n.getTitle && n.getTitle()) || n.title || ''); } catch (e) {}
			return t || String(n.type || n.comfyClass || 'node');
		}

		static match(q, cap = 40) {
			q = String(q || '').trim();
			if (!q) return [];
			const all = ImissNukeFind.all();
			const hits = [], seen = new Set();
			const add = (h, why) => {
				if (seen.has(h.n)) return;
				seen.add(h.n);
				hits.push({ n: h.n, via: h.via, why: why || '' });
			};
			if (/^#?\d+(?::\d+)*$/.test(q)) {
				const chain = q.replace(/^#/, '').split(':');
				// ⚑ `12:5` — el 5 que vive dentro del subgrafo 12
				if (chain.length > 1) {
					for (const h of all) {
						if (!h.via && String(h.n.id) === chain[0]) {
							add(h, `node ${chain.slice(1).join(':')} is inside this subgraph — open it to reach it`);
						}
					}
				}
				for (const h of all) if (!h.via && chain.length === 1 && String(h.n.id) === chain[0]) add(h);
				for (const h of all) if (h.via && String(h.n.id) === chain[chain.length - 1]) add(h);
				for (const h of all) if (String(h.n.id).indexOf(chain[0]) === 0) add(h);
			}
			const lq = q.toLowerCase();
			for (const h of all) {
				const hay = (ImissNukeFind.label(h.n) + ' ' + String(h.n.type || '') + ' '
					+ String(h.n.comfyClass || '')).toLowerCase();
				if (hay.indexOf(lq) >= 0) add(h);
			}
			return hits.slice(0, cap);
		}

		static say(msg) {
			try {
				if (window.rgthree && window.rgthree.showMessage) {
					window.rgthree.showMessage({ id: 'imiss-find', type: 'info', timeout: 6000, message: msg });
					return;
				}
			} catch (e) {}
			try {
				const t = app && app.extensionManager && app.extensionManager.toast;
				if (t && t.add) { t.add({ severity: 'info', summary: msg, life: 6000 }); return; }
			} catch (e) {}
			console.info('[ImissNuke] ' + msg);
		}

		static go(hit) {
			if (!hit || !hit.n || typeof app === 'undefined' || !app.canvas) return false;
			const canvas = app.canvas;
			const n = hit.via || hit.n;          // adentro de un subgrafo: su subgrafo
			try {
				if (canvas.selectNodes) canvas.selectNodes([n]);
				else if (canvas.selectNode) canvas.selectNode(n);
			} catch (e) {}
			let done = false;
			try {
				const b = n.boundingRect || (n.getBounding && n.getBounding());
				if (canvas.animateToBounds && b) {
					// ⚑ Con aire: una barrita colapsada (200 × 30) sin mínimo sería
					// un zoom de 3.5x; y un poco más ARRIBA, porque ahí va la barra
					// del Scene Manager cuando está, y un nodo centrado a secas
					// quedaba con el título debajo de ella (medido en vivo).
					const w = Math.max(+b[2] || 0, 600), h = Math.max(+b[3] || 0, 400);
					const cx = (+b[0] || 0) + (+b[2] || 0) / 2;
					const cy = (+b[1] || 0) + (+b[3] || 0) / 2;
					canvas.animateToBounds([cx - w / 2, cy - h / 2 - h * 0.2, w, h * 1.2], { zoom: 0.6 });
					done = true;
				}
			} catch (e) { done = false; }
			if (!done) {
				try { ImissNukeManager.frameNodes([n], null); done = true; } catch (e) {}
			}
			try { canvas.setDirty(true, true); } catch (e) {}
			const name = `#${hit.n.id} · ${ImissNukeFind.label(hit.n)}`;
			if (hit.via) {
				ImissNukeFind.say(`${name} lives inside subgraph #${hit.via.id} (${ImissNukeFind.label(hit.via)}) — open it to reach it`);
			} else if (hit.why) {
				ImissNukeFind.say(`${name} — ${hit.why}`);
			}
			return done;
		}

		// Shift+Enter: el `/` de Nuke — todos los que coinciden, seleccionados
		// y encuadrados con la F. Uno que vive en un subgrafo cuenta como su
		// subgrafo, una vez.
		static goAll(q) {
			if (typeof app === 'undefined' || !app.canvas) return 0;
			const canvas = app.canvas;
			const nodes = [];
			for (const h of ImissNukeFind.match(q, Infinity)) {
				const n = h.via || h.n;
				if (n && !nodes.includes(n)) nodes.push(n);
			}
			if (!nodes.length) return 0;
			try {
				if (canvas.selectNodes) canvas.selectNodes(nodes);
				else if (canvas.selectNode) nodes.forEach((n, i) => canvas.selectNode(n, i > 0));
			} catch (e) {}
			try { ImissNukeManager.frameNodes(nodes, null); } catch (e) {}
			try { canvas.setDirty(true, true); } catch (e) {}
			return nodes.length;
		}

		static close() {
			const pop = document.getElementById('imissnuke-find-popup');
			if (pop) pop.remove();
			if (ImissNukeFind._outside) {
				document.removeEventListener('mousedown', ImissNukeFind._outside, true);
				ImissNukeFind._outside = null;
			}
		}

		static open(q) {
			ImissNukeFind.close();
			if (!document.getElementById('imissnuke-find-style')) {
				const st = document.createElement('style');
				st.id = 'imissnuke-find-style';
				st.textContent = `
					#imissnuke-find-popup .in-find-r { display:flex; gap:10px; align-items:baseline; width:100%;
						padding:5px 8px; border:0; border-radius:5px; background:transparent; color:#e4e4e7;
						text-align:left; font-family:inherit; font-size:12px; line-height:1.35; cursor:pointer; }
					#imissnuke-find-popup .in-find-r:hover, #imissnuke-find-popup .in-find-r.on { background:rgba(59,130,246,0.18); }
					#imissnuke-find-popup .in-find-id { flex:none; min-width:52px; color:#e58c2c; font-weight:600;
						font-family:ui-monospace,Consolas,'DejaVu Sans Mono',monospace; }
					#imissnuke-find-popup .in-find-t { flex:1; min-width:0; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
					#imissnuke-find-popup .in-find-c { flex:none; max-width:45%; overflow:hidden; white-space:nowrap;
						text-overflow:ellipsis; color:#71717a; font-size:11px; }
					#imissnuke-find-popup .in-find-n { padding:6px 8px; color:#a1a1aa; font-size:11.5px; line-height:1.4; }
				`;
				document.head.appendChild(st);
			}

			const pop = document.createElement('div');
			pop.id = 'imissnuke-find-popup';
			pop.style.cssText = `
				position: fixed;
				left: 50%;
				top: 16vh;
				transform: translateX(-50%);
				width: 440px;
				max-width: calc(100vw - 32px);
				box-sizing: border-box;
				background: rgba(18, 18, 22, 0.96);
				backdrop-filter: blur(14px);
				border: 1px solid rgba(255, 255, 255, 0.12);
				border-radius: 10px;
				box-shadow: 0 16px 36px rgba(0, 0, 0, 0.65);
				/* ⚑ Encima de TODO, no en el 100000 de la paleta: la barra del
				   Scene Manager vive en 2147483000 y le tapaba el título y el
				   campo a esta caja (medido en vivo). Una caja que acabas de
				   pedir con una tecla va arriba. */
				z-index: 2147483600;
				padding: 12px;
				font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
				color: #e4e4e7;
			`;
			pop.innerHTML = `
				<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
					<div style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:#60a5fa;">
						<span>⌕</span> Find Node
					</div>
					<button data-find-x style="background:transparent;border:none;color:#71717a;font-size:14px;cursor:pointer;">✕</button>
				</div>
				<input data-find-q spellcheck="false" autocomplete="off" placeholder="113, or part of a name"
					style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:6px;color:#e4e4e7;font-size:13px;padding:7px 9px;outline:none;">
				<div data-find-list style="max-height:280px;overflow-y:auto;margin-top:8px;display:flex;flex-direction:column;gap:2px;"></div>
				<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08);font-size:10.5px;color:#71717a;">
					Enter go · Shift+Enter select all · ↑ ↓ move · Esc close
				</div>
			`;
			document.body.appendChild(pop);

			const input = pop.querySelector('[data-find-q]');
			const box = pop.querySelector('[data-find-list]');
			const st = { q: String(q || ''), sel: 0, hits: [] };

			const note = (text) => {
				const d = document.createElement('div');
				d.className = 'in-find-n';
				d.textContent = text;
				box.appendChild(d);
			};
			const paint = () => {
				st.hits = ImissNukeFind.match(st.q);
				if (st.sel >= st.hits.length) st.sel = 0;
				box.textContent = '';
				if (!st.q.trim()) {
					note('Type a node number (the Node ID an error names, like 113) or part of its name.');
					return;
				}
				if (!st.hits.length) {
					note(`No node in this graph is #${st.q.trim().replace(/^#/, '')} or has “${st.q.trim()}” in its name.`);
					return;
				}
				st.hits.forEach((h, i) => {
					const r = document.createElement('button');
					r.className = 'in-find-r' + (i === st.sel ? ' on' : '');
					r.setAttribute('data-find-i', String(i));
					const id = document.createElement('span');
					id.className = 'in-find-id';
					id.textContent = '#' + h.n.id;
					const t = document.createElement('span');
					t.className = 'in-find-t';
					t.textContent = ImissNukeFind.label(h.n);
					const c = document.createElement('span');
					c.className = 'in-find-c';
					c.textContent = h.via ? `in subgraph #${h.via.id}` : String(h.n.type || h.n.comfyClass || '');
					r.append(id, t, c);
					box.appendChild(r);
				});
				const on = box.querySelector('.in-find-r.on');
				if (on && on.scrollIntoView) { try { on.scrollIntoView({ block: 'nearest' }); } catch (e) {} }
			};

			input.value = st.q;
			input.addEventListener('input', () => { st.q = input.value; st.sel = 0; paint(); });
			input.addEventListener('keydown', (ev) => {
				if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); ImissNukeFind.close(); return; }
				if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
					ev.preventDefault();
					ev.stopPropagation();
					const k = st.hits.length;
					if (!k) return;
					st.sel = (st.sel + (ev.key === 'ArrowDown' ? 1 : k - 1)) % k;
					paint();
					return;
				}
				if (ev.key === 'Enter') {
					ev.preventDefault();
					ev.stopPropagation();
					if (ev.shiftKey) {
						if (ImissNukeFind.goAll(st.q)) ImissNukeFind.close();
						return;
					}
					const h = st.hits[st.sel];
					if (h) { ImissNukeFind.close(); ImissNukeFind.go(h); }
				}
			});
			box.addEventListener('click', (ev) => {
				const b = ev.target && ev.target.closest && ev.target.closest('[data-find-i]');
				if (!b) return;
				const h = st.hits[+b.getAttribute('data-find-i')];
				if (h) { ImissNukeFind.close(); ImissNukeFind.go(h); }
			});
			pop.querySelector('[data-find-x]').addEventListener('click', () => ImissNukeFind.close());

			ImissNukeFind._outside = (e) => { if (!pop.contains(e.target)) ImissNukeFind.close(); };
			setTimeout(() => {
				if (document.getElementById('imissnuke-find-popup') === pop && ImissNukeFind._outside) {
					document.addEventListener('mousedown', ImissNukeFind._outside, true);
				}
			}, 50);

			paint();
			try { input.focus(); input.select(); } catch (e) {}
			return pop;
		}
	}

	// (Nota: NukePipeRenderer se gestiona exclusivamente en ImissNuke_Lines.js)

	// ---- PANEL DE CONFIGURACIÓN TOPBAR & TARJETA DE SHORTCUTS ----
	class ImissNukeUI {
		static toggleModal() {
			const modal = document.getElementById('imissnuke-modal');
			const btn = document.getElementById('imissnuke-topbar-btn');
			if (!modal) return;
			if (modal.classList.contains('open')) {
				modal.classList.remove('open');
				if (btn) btn.classList.remove('open');
			} else {
				if (btn) {
					btn.classList.add('open');
					const rect = btn.getBoundingClientRect();
					const modalWidth = 330;
					let left = rect.left - 20;
					if (left + modalWidth > window.innerWidth - 12) {
						left = window.innerWidth - modalWidth - 12;
					}
					if (left < 10) left = 10;
					modal.style.top = `${Math.round(rect.bottom + 6)}px`;
					modal.style.left = `${Math.round(left)}px`;
					modal.style.bottom = 'auto';
					modal.style.right = 'auto';
					modal.style.transformOrigin = 'top left';
				}
				modal.classList.add('open');
			}
		}

		static updateTopBarState() {
			const btn = ImissNukeUI._topBtn || document.getElementById('imissnuke-topbar-btn');
			if (!btn) return;
			const isEnabled = (config.masterEnabled !== false);
			btn.classList.toggle('tool-on', isEnabled);
			btn.title = isEnabled ? 'ImissNuke (Enabled) - Settings' : 'ImissNuke (Disabled) - Settings';
		}

		static isVisible(el) {
			return !!(el && el.getClientRects && el.getClientRects().length > 0);
		}

		// ⚑⚑ THE LEFT TIP OF THE BAR. Jorge: "si lo puedes mover todo hasta la
		// punta, me encantaría que sí se notara como si el botón fuera de ahí."
		//
		// The old anchor was "right after Extensions", which is wherever a given
		// build happens to put Extensions — on the studio's it lands in the
		// middle of the row, orphaned between the resource monitor and the image
		// feed. The new anchor is the FIRST button pill in the top bar: the one
		// the logo and the bookmark already sit in, so [N] arrives as one more of
		// that pill's buttons rather than as a loose one parked nearby.
		//
		// ⚑ null when there is no pill to join — the old chain below still runs,
		// so a build we have never seen keeps a button somewhere rather than
		// losing it. The settings panel is the only way back to the master
		// switch; a button that fails to mount is a tool nobody can turn off.
		static BAR_SELECTORS = '.comfyui-menu, .comfyui-body-top, .comfyui-top-menu, .comfy-menu, .comfyui-body-bottom';

		static firstPillIn(bar) {
			if (!bar || !ImissNukeUI.isVisible(bar)) return null;
			for (const g of bar.querySelectorAll('.comfyui-button-group')) {
				if (ImissNukeUI.isVisible(g)) return g;
			}
			return null;
		}

		static topBarHome() {
			// ⚑⚑ THE PUNTA OF THE ROW IT IS ALREADY IN, first. Which row a build
			// puts these buttons in is not something to guess from here — the
			// only row we can be sure the artist means is the one they are
			// looking at the button in. Sliding it left inside that row is the
			// whole ask; hoisting it into some other bar would be a different
			// change wearing the same words.
			const btn = document.getElementById('imissnuke-topbar-btn');
			if (btn && document.body.contains(btn)) {
				const own = ImissNukeUI.firstPillIn(btn.closest(ImissNukeUI.BAR_SELECTORS));
				if (own) return own;
			}
			// First run, or a row with no pill in it: take the first bar that
			// has one, top rows before the bottom one.
			for (const bar of document.querySelectorAll(ImissNukeUI.BAR_SELECTORS)) {
				const g = ImissNukeUI.firstPillIn(bar);
				if (g) return g;
			}
			return null;
		}

		// ⚑ "Mounted" now includes WHERE. The old test said yes to any container
		// anywhere in the chrome, which is exactly why the button stayed at
		// whatever spot it first landed on and never walked to the tip.
		static isButtonProperlyMounted(btn) {
			if (!btn || !btn.parentNode || !document.body.contains(btn)) return false;
			const home = ImissNukeUI.topBarHome();
			if (home) return btn.parentNode === home && home.firstElementChild === btn;
			const p = btn.closest('.comfyui-menu, .comfyui-menu-actions, .comfyui-top-menu, .comfy-menu');
			if (p && p.offsetParent !== null) return true;
			if (btn.previousElementSibling && (btn.previousElementSibling.textContent || '').includes('Extensions')) return true;
			if (typeof app !== 'undefined' && app.menu?.settingsGroup?.element && btn.parentNode.contains(app.menu.settingsGroup.element)) return true;
			return false;
		}

		static mountTopBarButton() {
			// ⚑⚑ ONE [N], kept by reference. ComfyUI's top bar takes the legacy
			// menu (app.menu.element) out of the page and puts it back whenever it
			// re-renders — focus mode does it on every toggle. While it is out,
			// getElementById finds nothing, so the old code minted a fresh [N] and
			// parked it in the detached menu; the menu came back carrying both.
			// Ten toggles, ten Ns.
			let btn = ImissNukeUI._topBtn || document.getElementById('imissnuke-topbar-btn');
			const menuEl = (typeof app !== 'undefined' && app.menu?.element) || null;
			const strays = [...document.querySelectorAll('.imissnuke-topbar-btn')];
			if (menuEl && !document.body.contains(menuEl)) strays.push(...menuEl.querySelectorAll('.imissnuke-topbar-btn'));
			strays.forEach(b => { if (!btn) btn = b; else if (b !== btn) b.remove(); });
			if (!btn) {
				btn = document.createElement('button');
				btn.id = 'imissnuke-topbar-btn';
				btn.className = 'comfyui-button comfyui-menu-mobile-collapse imissnuke-topbar-btn';
				btn.title = 'ImissNuke - Settings & Foundry Nuke Graph Workflow';
				btn.setAttribute('aria-label', 'ImissNuke Settings');
				btn.innerHTML = `<span class="imissnuke-n-icon">N</span>`;
				btn.addEventListener('click', (e) => {
					e.stopPropagation();
					ImissNukeUI.toggleModal();
				});
			}
			ImissNukeUI._topBtn = btn;
			ImissNukeUI.updateTopBarState();

			// ⚑ The bar is away and the button went with it: it comes back with the
			// bar. Moving it now would strand it wherever the chain below finds a
			// spot. Only a menu that stays gone (not focus mode) gets the chain.
			if (menuEl && menuEl.contains(btn) && !document.body.contains(menuEl)) {
				const since = ImissNukeUI._menuAwaySince || (ImissNukeUI._menuAwaySince = Date.now());
				if (app.extensionManager?.focusMode || Date.now() - since < 3000) return false;
			} else {
				ImissNukeUI._menuAwaySince = 0;
			}

			// If already in a valid topbar container, keep it
			if (ImissNukeUI.isButtonProperlyMounted(btn)) {
				return true;
			}

			// 0. Prioridad: la primera pastilla de botones de la barra — la punta.
			const home = ImissNukeUI.topBarHome();
			if (home) {
				if (home.firstElementChild !== btn) home.insertBefore(btn, home.firstElementChild);
				btn.classList.add('in-grouped');
				return true;
			}
			btn.classList.remove('in-grouped');

			// 1. Prioridad: Buscar el botón de "Extensions" en la barra superior (ComfyUI estándar)
			const candidates = Array.from(document.querySelectorAll('button, .comfyui-button, [role="button"], .comfyui-menu-item, span'));
			let extBtn = null;
			for (const el of candidates) {
				const txt = (el.textContent || '').trim();
				if (txt === 'Extensions' || txt.startsWith('Extensions')) {
					extBtn = el.closest('button, .comfyui-button, [role="button"]') || el;
					break;
				}
			}

			if (extBtn && extBtn.parentNode) {
				if (extBtn.nextSibling !== btn) {
					extBtn.insertAdjacentElement('afterend', btn);
				}
				return true;
			}

			// 2. Fallback: app.menu.settingsGroup (ComfyUI nuevo)
			if (typeof app !== 'undefined' && app.menu?.settingsGroup?.element) {
				const el = app.menu.settingsGroup.element;
				if (el.parentNode && !el.parentNode.contains(btn)) {
					el.before(btn);
					return true;
				}
			}

			// 3. Fallback: .comfyui-menu-actions, .comfyui-menu, .comfyui-top-menu, .comfy-menu
			const topMenu = document.querySelector('.comfyui-menu-actions, .comfyui-menu, .comfyui-top-menu, .comfy-menu');
			if (topMenu && !topMenu.contains(btn)) {
				topMenu.appendChild(btn);
				return true;
			}

			return false;
		}

		static setupTopBarMounting() {
			ImissNukeUI.mountTopBarButton();
			const delays = [50, 150, 300, 600, 1200, 2500, 5000];
			delays.forEach(d => setTimeout(() => ImissNukeUI.mountTopBarButton(), d));

			if (window.MutationObserver && !ImissNukeUI._observerMounted) {
				ImissNukeUI._observerMounted = true;
				let throttleTimer = null;
				const observer = new MutationObserver(() => {
					const curBtn = ImissNukeUI._topBtn;
					if (ImissNukeUI.isButtonProperlyMounted(curBtn)
						&& document.getElementsByClassName('imissnuke-topbar-btn').length === 1) {
						return;
					}
					if (!throttleTimer) {
						throttleTimer = setTimeout(() => {
							throttleTimer = null;
							ImissNukeUI.mountTopBarButton();
						}, 200);
					}
				});
				observer.observe(document.body, { childList: true, subtree: true });
			}
		}

		static init() {
			if (document.getElementById('imissnuke-ui-root')) return;

			const root = document.createElement('div');
			root.id = 'imissnuke-ui-root';
			root.innerHTML = `
				<style>
					:root {
						--imissnuke-scale: ${config.panelScale || 1.15};
					}
					.imissnuke-topbar-btn {
						display: inline-flex !important;
						align-items: center !important;
						justify-content: center !important;
						min-width: 32px !important;
						height: 28px !important;
						padding: 0 8px !important;
						margin: 0 3px !important;
						background: #2b2b34 !important;
						border: 1px solid #3c3c46 !important;
						border-radius: 6px !important;
						cursor: pointer !important;
						transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease !important;
						user-select: none !important;
						vertical-align: middle !important;
						box-sizing: border-box !important;
						box-shadow: none !important;
					}
					/* inside ComfyUI's own button pill it has to read as one of
					   that pill's buttons, not as a button pushed up against it:
					   the outer margin is what gives away a guest. */
					.imissnuke-topbar-btn.in-grouped {
						margin: 0 !important;
					}
					.imissnuke-topbar-btn:hover {
						background: #383844 !important;
						border-color: #4c4c58 !important;
					}
					.imissnuke-topbar-btn .imissnuke-n-icon {
						display: flex;
						align-items: center;
						justify-content: center;
						font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
						font-weight: 800 !important;
						/* ⚑ a couple of pixels taller, and half a pixel down. The
						   flex box centres the LINE, and a line carries descender
						   room the N never uses, so a glyph centred by the box
						   always sits a touch high next to its neighbours. */
						font-size: 17.5px !important;
						line-height: 1 !important;
						transform: translateY(0.5px) scale(0.90, 1.22) !important;
						transform-origin: center center !important;
						color: #71717a !important;
						text-shadow: none !important;
					}
					.imissnuke-topbar-btn:hover .imissnuke-n-icon {
						color: #e2e8f0 !important;
					}
					/* When tool is ON: vibrant Foundry Nuke amber */
					.imissnuke-topbar-btn.tool-on {
						background: #e58c2c !important;
						border-color: #d97706 !important;
					}
					.imissnuke-topbar-btn.tool-on .imissnuke-n-icon {
						color: #ffffff !important;
					}
					.imissnuke-topbar-btn.tool-on:hover {
						background: #f59e0b !important;
						border-color: #e58c2c !important;
					}
					.imissnuke-topbar-btn.open {
						box-shadow: 0 0 0 2px rgba(229, 140, 44, 0.45) !important;
					}
					#imissnuke-modal {
						position: fixed;
						top: 52px;
						left: 200px;
						z-index: 99999;
						width: 335px;
						max-height: calc((100vh - 80px) / var(--imissnuke-scale, 1.15));
						overflow-y: auto;
						background: #18191c;
						border: 1px solid #34343a;
						border-radius: 10px;
						padding: 14px;
						color: #e4e4e7;
						font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
						box-shadow: 0 12px 38px rgba(0,0,0,0.8);
						display: none;
						flex-direction: column;
						gap: 0;
						transform: scale(var(--imissnuke-scale, 1.15));
						transform-origin: top left;
					}
					#imissnuke-modal::-webkit-scrollbar { width: 5px; }
					#imissnuke-modal::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; }
					#imissnuke-modal.open { display: flex; }
					.in-hdr {
						display: flex; justify-content: space-between; align-items: center;
						font-size: 13.5px; font-weight: 700; color: #ffffff;
						padding-bottom: 10px; border-bottom: 1px solid #2d2d33;
					}
					.in-hdr-right { display: flex; align-items: center; gap: 6px; }
					.in-scale-btns {
						display: flex; align-items: center; background: #121214;
						border: 1px solid #2b2b30; border-radius: 5px; padding: 2px;
					}
					.in-scale-btn {
						background: transparent; border: none; color: #888;
						padding: 2px 5px; font-size: 10px; font-weight: 600;
						border-radius: 3px; cursor: pointer;
					}
					.in-scale-btn.active { background: #3b82f6; color: #fff; }
					#imissnuke-close { cursor: pointer; color: #71717a; font-size: 16px; padding: 0 2px; }
					#imissnuke-close:hover { color: #f43f5e; }
					.in-sec {
						display: flex; flex-direction: column; gap: 8px;
						padding: 10px 0; border-bottom: 1px solid #25252a;
					}
					.in-sec:last-of-type { border-bottom: none; }
					.in-lbl {
						font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.8px;
						color: #93c5fd; font-weight: 700;
					}
					.in-row {
						display: flex; align-items: center; justify-content: space-between;
						gap: 10px; min-height: 26px;
						font-size: 12px; color: #d4d4d8; font-weight: 500;
					}
					/* the label never becomes a second line: the rows keep one
					   rhythm, and an over-long one ellipsises instead */
					.in-row > span:first-child {
						min-width: 0; white-space: nowrap;
						overflow: hidden; text-overflow: ellipsis;
					}
					.in-sw {
						position: relative; width: 36px; height: 19px;
						background: #2e2e34; border-radius: 10px;
						cursor: pointer; transition: background 0.2s; flex-shrink: 0;
						border: 1px solid #3f3f46;
					}
					.in-sw.on { background: #3b82f6; border-color: #60a5fa; }
					.in-sw-dot {
						position: absolute; top: 1.5px; left: 2px;
						width: 14px; height: 14px; background: #888892;
						border-radius: 50%; transition: all 0.2s;
					}
					.in-sw.on .in-sw-dot { transform: translateX(17px); background: #ffffff; }
					/* One control column, one width: every group is 192px and every
					   label stays on one line, so the rows line up on both edges
					   instead of on the right only. 192 = the widest label
					   ("Border (Outline)", 77px at 10px) plus padding, in two
					   columns; the three-column groups fit inside it. Measured
					   against the longest LABEL too ("Default Wire Color",
					   112px): 112 + 10 gap + 176 = 298 in a 300px row. */
					.in-btns {
						display: grid; grid-template-columns: 1fr 1fr;
						width: 176px !important; flex: 0 0 176px; box-sizing: border-box;
						background: #121214; padding: 2px; border-radius: 6px; border: 1px solid #28282d;
					}
					.in-btn {
						background: transparent; border: none; color: #a1a1aa;
						padding: 4px 3px; font-size: 10px; border-radius: 4px; cursor: pointer; font-weight: 600;
						white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
					}
					.in-btn.active { background: #3b82f6; color: #fff; }
					.in-hk-card {
						background: #121214; border: 1px solid #28282e; border-radius: 8px;
						padding: 10px 12px; margin-top: 4px;
					}
					.in-hk-list { display: flex; flex-direction: column; gap: 5.5px; margin-top: 6px; }
					.in-hk-row { display: flex; align-items: center; justify-content: space-between; font-size: 11px; }
					.in-keys { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
					.in-k {
						background: #242428; border: 1px solid #3a3a42; border-bottom: 2px solid #4a4a52;
						color: #e4e4e7; padding: 2px 5px; border-radius: 4px; font-family: monospace; font-size: 10px; font-weight: 600;
					}
					.in-desc { color: #a1a1aa; font-size: 11px; text-align: right; }
					.in-reset {
						width: 100%; margin-top: 8px; padding: 7px; background: #222226;
						border: 1px solid #34343a; color: #a1a1aa; border-radius: 6px;
						font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.15s;
					}
					.in-reset:hover { background: #3b1820; color: #fda4af; border-color: #be123c; }
					.in-slider-row {
						display: flex; align-items: center; justify-content: space-between;
						gap: 10px; min-height: 26px;
						font-size: 12px; color: #d4d4d8; font-weight: 500;
					}
					/* same 192px column as the button groups, so a slider and a
					   segmented control start at the same x */
					.in-slider-container {
						display: flex; align-items: center; gap: 8px;
						width: 176px; flex: 0 0 176px; box-sizing: border-box;
					}
					.in-slider {
						flex: 1; -webkit-appearance: none; height: 4px; border-radius: 2px;
						background: #3f3f46; outline: none; cursor: pointer;
					}
					.in-slider::-webkit-slider-thumb {
						-webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%;
						background: #3b82f6; cursor: pointer; border: 2px solid #ffffff;
					}
					.in-slider-val {
						font-family: monospace; font-size: 11px; color: #a1a1aa; min-width: 32px; text-align: right;
					}
				</style>

				<div id="imissnuke-modal">
					<div class="in-hdr">
						<span style="display:flex;align-items:center;gap:6px;">
							<span style="color:#ffffff;font-weight:900;">N</span> ImissNuke Settings
						</span>
						<div class="in-hdr-right">
							<div class="in-scale-btns">
								<button class="in-scale-btn ${config.panelScale === 1.0 ? 'active' : ''}" data-scale="1.0">100%</button>
								<button class="in-scale-btn ${(!config.panelScale || config.panelScale === 1.15) ? 'active' : ''}" data-scale="1.15">120%</button>
								<button class="in-scale-btn ${config.panelScale === 1.4 ? 'active' : ''}" data-scale="1.4">140%</button>
							</div>
							<span id="imissnuke-close">✕</span>
						</div>
					</div>

					<!-- Master Power Switch (Enable / Disable All) -->
					<div class="in-sec in-master-sec" style="background: #141418; margin: 4px 0 8px 0; padding: 10px 12px; border-radius: 8px; border: 1px solid #2e2e36;">
						<div class="in-row" style="font-size: 12.5px; font-weight: 700; color: #ffffff;">
							<span style="display:flex;align-items:center;gap:7px;">
								<span id="in-master-icon" style="color: ${config.masterEnabled !== false ? '#e58c2c' : '#71717a'}; font-size: 14px;">⚡</span>
								<span>Master Switch</span>
							</span>
							<div class="in-sw ${config.masterEnabled !== false ? 'on' : ''}" id="in-sw-master" title="Master toggle to enable or completely disable all ImissNuke features">
								<div class="in-sw-dot"></div>
							</div>
						</div>
						<div id="in-master-sub" style="font-size: 10.5px; color: ${config.masterEnabled !== false ? '#9ca3af' : '#ef4444'}; margin-top: 3px; font-weight: 500;">
							${config.masterEnabled !== false ? 'All Nuke pipes, hotkeys, and canvas features active' : 'Disabled — Native ComfyUI restored'}
						</div>
					</div>

					<div id="imissnuke-sub-panel" style="${config.masterEnabled === false ? 'opacity: 0.35; pointer-events: none; filter: grayscale(0.6); transition: all 0.2s ease;' : 'transition: all 0.2s ease;'}">

					<!-- Workflow & Controls -->
					<div class="in-sec">
						<div class="in-lbl">⚡ Workflow & Tablet</div>
						<div class="in-row" title="Action for D key on selected nodes">
							<span>D Key Action</span>
							<div class="in-btns" style="width: 130px;">
								<button class="in-btn ${config.dKeyMode === 'bypass' ? 'active' : ''}" data-dmode="bypass">Bypass</button>
								<button class="in-btn ${config.dKeyMode === 'mute' ? 'active' : ''}" data-dmode="mute">Mute</button>
							</div>
						</div>
						<div class="in-row" title="LMB drag on canvas makes box selection">
							<span>LMB Drag = Select</span>
							<div class="in-sw ${config.lmbBoxSelect ? 'on' : ''}" id="in-sw-lmb">
								<div class="in-sw-dot"></div>
							</div>
						</div>
						<div class="in-row" title="Middle click + Left click for smooth continuous zoom (or Wacom pen tip)">
							<span>MMB + LMB Smooth Zoom</span>
							<div class="in-sw ${config.nukeWacomZoom ? 'on' : ''}" id="in-sw-zoom">
								<div class="in-sw-dot"></div>
							</div>
						</div>
						<div class="in-row" title="Hold the modifier and drag with the middle mouse button over a node to resize it. No Wacom needed. On empty canvas the same combo still zooms. OFF by default: it locked up the canvas on the first try and is parked until that is understood.">
							<span>Mod + MMB Drag = Resize Node <span style="opacity:.55;font-size:10px;">(parked)</span></span>
							<div class="in-sw ${config.nukeModResize !== false ? 'on' : ''}" id="in-sw-modresize">
								<div class="in-sw-dot"></div>
							</div>
						</div>
						<div class="in-row" id="in-modresize-key-row" title="Which modifier. A window manager can keep a combo for itself before the page ever sees it — on Linux that is usually Super/Win — so if one does nothing, pick another.">
							<span style="padding-left:12px;opacity:.8;">↳ Modifier key</span>
							<div class="in-btns" style="width: 190px;">
								<button class="in-btn ${(config.nukeModResizeKey || 'alt') === 'alt' ? 'active' : ''}" data-modresizekey="alt">Alt</button>
								<button class="in-btn ${config.nukeModResizeKey === 'meta' ? 'active' : ''}" data-modresizekey="meta">Win</button>
								<button class="in-btn ${config.nukeModResizeKey === 'ctrl' ? 'active' : ''}" data-modresizekey="ctrl">Ctrl</button>
								<button class="in-btn ${config.nukeModResizeKey === 'shift' ? 'active' : ''}" data-modresizekey="shift">Shift</button>
							</div>
						</div>
						<div class="in-row" title="Shift + Up arrow adds the nodes that FEED whatever you have selected — one hop per press, so pressing it again climbs another level up the tree. Up here means upstream in the flow, the way it does in Nuke, not whatever happens to sit higher on the canvas.

It does not take the key: with nothing selected, or nothing wired into it, the arrow passes straight through.">
							<span>Shift + ↑ = Select Upstream</span>
							<div class="in-sw ${config.nukeSelectUpstream !== false ? 'on' : ''}" id="in-sw-upnodes">
								<div class="in-sw-dot"></div>
							</div>
						</div>
						<div class="in-row" title="The Tab key opens the node search at the cursor. Just the hotkey — what happens to the node afterwards is the switch below.">
							<span>Tab = Node Search</span>
							<div class="in-sw ${config.tabForSearch ? 'on' : ''}" id="in-sw-tab">
								<div class="in-sw-dot"></div>
							</div>
						</div>
						<div class="in-row" id="in-tab-place-row" title="After Tab creates a node, move it to where you pressed Tab. ComfyUI's own search drops it in the middle of the view — this is what puts it back under your cursor. ON everywhere.">
							<span style="padding-left:12px;opacity:.8;">↳ Place new node at cursor</span>
							<div class="in-sw ${config.tabPlaceAtCursor !== false ? 'on' : ''}" id="in-sw-tab-place">
								<div class="in-sw-dot"></div>
							</div>
						</div>
						<div class="in-row" id="in-tab-chain-row" title="After Tab creates a node, chain it to the node that was selected, the way Foundry Nuke does.${IS_LINUX ? ' Ships OFF on Linux — that half has never been measured there. The hotkey and the placement above stay on. Turn this on to test it; remembered per machine.' : ''}">
							<span style="padding-left:12px;opacity:.8;">↳ Auto-connect to selected node${IS_LINUX ? ' <span style="opacity:.6;font-size:10px;">(off on Linux)</span>' : ''}</span>
							<div class="in-sw ${config.tabAutoConnect !== false ? 'on' : ''}" id="in-sw-tab-chain">
								<div class="in-sw-dot"></div>
							</div>
						</div>
						${(function () {
							/* ⚑⚑ SÓLO SI ESTE FRONTEND LO TIENE. Regla de ⚡ Performance,
							   sin cambiarle una coma: una fila cuyo destino no existe no
							   se ofrece, y la sección dice qué encontró. Aquí el destino
							   es un ajuste de ComfyUI que ha cambiado de nombre entre
							   versiones — `NukeVueNodes.id()` lo BUSCA, primero por sus
							   deletreos conocidos y luego por forma, y si nada contesta
							   un booleano esta fila no existe. */
							const vueOn = NukeVueNodes.isOn();
							if (vueOn === null) return '';
							return `
						<div class="in-row" id="in-vuenodes-row" title="ComfyUI's own setting (${NukeVueNodes.id()}), offered here because it is the one that decides whether Tab works.

Nodes 2.0 draws every node as a Vue DOM element instead of painting it on the canvas. When ComfyUI opens its node search without the event that triggered it, the new node is born at a NaN position — and under this renderer the thing you click is the DOM element, so nothing this panel writes to node.pos can put it back. Switching this OFF is what Jorge measured as the fix.

Changing it here changes ComfyUI's setting. Reload the page for it to take hold.">
							<span>ComfyUI Nodes 2.0 <span style="opacity:.55;font-size:10px;">(Vue nodes — off = Tab works)</span></span>
							<div class="in-sw ${vueOn ? 'on' : ''}" id="in-sw-vuenodes">
								<div class="in-sw-dot"></div>
							</div>
						</div>`;
						}())}
						<div class="in-row" title="Block the node search when you double-click empty canvas (or the body of a group).

v17.99: measured on frontend 1.52.7 — under Nodes 2.0 that search is opened from a 'litegraph:canvas' event, so this switch now blocks THAT, not only the old litegraph path. Double-clicking a group's TITLE still renames it.">
							<span>Block Double-Click Search</span>
							<div class="in-sw ${config.disableDblClick ? 'on' : ''}" id="in-sw-dbl">
								<div class="in-sw-dot"></div>
							</div>
						</div>
						<div class="in-row" title="Block the node search (and the context menu) when you UNPLUG a wire and drop it on empty canvas. The wire still disconnects — only the popup is skipped.

v17.94: this hooks LinkConnector.dropOnNothing, which is the method the modern frontend really goes through. Dragging from an EMPTY slot still opens the search.">
							<span>Block Search on Unplug</span>
							<div class="in-sw ${config.blockInputDisconnectSearch !== false ? 'on' : ''}" id="in-sw-block-input-drop">
								<div class="in-sw-dot"></div>
							</div>
						</div>
						<div class="in-row" title="Block search popup when dropping an output wire into empty canvas (when OFF, drops open modern search & auto-connects)">
							<span>Block Output Drop Search</span>
							<div class="in-sw ${config.blockOutputDropSearch ? 'on' : ''}" id="in-sw-block-output-drop">
								<div class="in-sw-dot"></div>
							</div>
						</div>
						<div class="in-row" title="Block the node search (and the context menu) when you drag a wire off a slot that ALREADY has one and drop it on empty canvas. Dragging from an EMPTY slot still opens the search — that is how you add a node.

v17.94: measured on frontend 1.52.7, THIS is the switch for “I pulled a wire off something connected and the search jumped at me”.">
							<span>Block Search on Connected Slot</span>
							<div class="in-sw ${config.searchOnlyEmptyOutput !== false ? 'on' : ''}" id="in-sw-empty-output-search">
								<div class="in-sw-dot"></div>
							</div>
						</div>
						<div class="in-row" title="Connect multiple compatible slots on Shift+Q">
							<span>Multi Auto-Connect</span>
							<div class="in-sw ${config.multiAutoConnect ? 'on' : ''}" id="in-sw-multiac">
								<div class="in-sw-dot"></div>
							</div>
						</div>
						<div class="in-row" title="Place newly created nodes immediately adjacent without ghost/click confirmation (Foundry Nuke behavior)">
							<span>Instant Node Placement</span>
							<div class="in-sw ${config.nukeInstantPlacement !== false ? 'on' : ''}" id="in-sw-instant-place">
								<div class="in-sw-dot"></div>
							</div>
						</div>
					</div>

					<!-- Nuke Pipes & Arrows -->
					<div class="in-sec">
						<div class="in-lbl">📐 Nuke Pipes & Arrows</div>
						<div class="in-row" title="Enable Foundry Nuke style pipes">
							<span>Nuke Lines</span>
							<div class="in-sw ${config.nukeLinesEnabled ? 'on' : ''}" id="in-sw-lines">
								<div class="in-sw-dot"></div>
							</div>
						</div>
						<div class="in-row" title="Show or hide flow direction arrows on wires">
							<span>Show Arrows</span>
							<div class="in-sw ${config.nukeArrowsEnabled ? 'on' : ''}" id="in-sw-arrows">
								<div class="in-sw-dot"></div>
							</div>
						</div>
						<div class="in-row" title="Deform and bend wires around nodes">
							<span>Avoid Nodes</span>
							<div class="in-sw ${config.avoidNodes !== false ? 'on' : ''}" id="in-sw-avoid">
								<div class="in-sw-dot"></div>
							</div>
						</div>
						<div class="in-row" title="Only highlight incoming (upstream) wires feeding into selected nodes like Foundry Nuke">
							<span>Highlight Upstream Only</span>
							<div class="in-sw ${config.highlightUpstreamOnly !== false ? 'on' : ''}" id="in-sw-upstream">
								<div class="in-sw-dot"></div>
							</div>
						</div>
						<div class="in-row" title="Wire color when unselected">
							<span>Default Wire Color</span>
							<div class="in-btns" style="width: 170px; grid-template-columns: 1fr 1fr;">
								<button class="in-btn ${(!config.lineColorMode || config.lineColorMode === 'nukeDark') ? 'active' : ''}" data-linecolormode="nukeDark">Nuke Black</button>
								<button class="in-btn ${config.lineColorMode === 'original' ? 'active' : ''}" data-linecolormode="original">Original Colors</button>
							</div>
						</div>
						<div class="in-row" title="Wire color when connected node is selected">
							<span>When Selected</span>
							<div class="in-btns" style="width: 160px; grid-template-columns: 1fr 1fr;">
								<button class="in-btn ${(!config.selectionColorMode || config.selectionColorMode === 'amber') ? 'active' : ''}" data-selcolormode="amber">Nuke Amber</button>
								<button class="in-btn ${config.selectionColorMode === 'white' ? 'active' : ''}" data-selcolormode="white">White</button>
							</div>
						</div>
						<div class="in-row" title="Pipe line thickness">
							<span>Pipe Thickness</span>
							<div class="in-btns" style="width: 170px; grid-template-columns: repeat(3, 1fr);">
								<button class="in-btn ${(config.pipeWidth === 1.5) ? 'active' : ''}" data-pipewidth="1.5">Thin</button>
								<button class="in-btn ${(!config.pipeWidth || config.pipeWidth === 2.5) ? 'active' : ''}" data-pipewidth="2.5">Medium</button>
								<button class="in-btn ${(config.pipeWidth === 4.0) ? 'active' : ''}" data-pipewidth="4.0">Thick</button>
							</div>
						</div>
						<div class="in-row" title="Arrow shape">
							<span>Arrow Style</span>
							<div class="in-btns" style="width: 140px; grid-template-columns: 1fr 1fr;">
								<button class="in-btn ${(!config.arrowStyle || config.arrowStyle === 'triangle') ? 'active' : ''}" data-arrowstyle="triangle">Triangle</button>
								<button class="in-btn ${config.arrowStyle === 'chevron' ? 'active' : ''}" data-arrowstyle="chevron">Chevron</button>
							</div>
						</div>
						<div class="in-row" title="Arrow size in pixels">
							<span>Arrow Size</span>
							<div class="in-btns" style="width: 140px; grid-template-columns: repeat(3, 1fr);">
								<button class="in-btn ${config.arrowSize === 9 ? 'active' : ''}" data-arrowsize="9">9px</button>
								<button class="in-btn ${(!config.arrowSize || config.arrowSize === 12) ? 'active' : ''}" data-arrowsize="12">12px</button>
								<button class="in-btn ${config.arrowSize === 16 ? 'active' : ''}" data-arrowsize="16">16px</button>
							</div>
						</div>
					</div>

					<!-- Nuke Canvas Background — behind IMISSNUKE_BG_GATE, which is
					     SHUT for this studio. Hidden and not deleted: with the
					     gate open it is the same section it always was, so
					     there is one implementation and not a second one kept
					     in a drawer. Shut, none of it is installed, and
					     controls for a patch that is not there would be
					     lying. -->
					<div class="in-sec" style="${bgAllowed() ? '' : 'display:none;'}">
						<div class="in-lbl">🎨 Nuke Canvas Background${bgAllowed() ? ' <span style="color:#f59e0b;font-weight:700;">· dev</span>' : ''}</div>
						<div class="in-row" title="Override canvas background with Foundry Nuke gray or faint dots">
							<span>Enable Nuke Background</span>
							<div class="in-sw ${config.nukeBgEnabled ? 'on' : ''}" id="in-sw-nukebg">
								<div class="in-sw-dot"></div>
							</div>
						</div>
						<div class="in-row" title="Choose flat solid gray or faint dotted grid">
							<span>Background Style</span>
							<div class="in-btns" style="width: 170px; grid-template-columns: 1fr 1fr;">
								<button class="in-btn ${(config.nukeBgStyle === 'flat' || !config.nukeBgStyle) ? 'active' : ''}" data-nukebgstyle="flat">Flat Gray</button>
								<button class="in-btn ${config.nukeBgStyle === 'dots' ? 'active' : ''}" data-nukebgstyle="dots">Dotted Grid</button>
							</div>
						</div>
						<div class="in-slider-row" id="in-bg-gray-row">
							<span title="Adjust canvas gray tone from dark to light gray">Gray Tone</span>
							<div class="in-slider-container">
								<input type="range" class="in-slider" id="in-slider-gray-level" min="12" max="85" step="1" value="${config.nukeBgGrayLevel || 38}">
								<span class="in-slider-val" id="in-val-gray-level">${config.nukeBgGrayLevel || 38}%</span>
							</div>
						</div>
						<div class="in-slider-row" id="in-bg-dot-row" style="display: ${config.nukeBgStyle === 'dots' ? 'flex' : 'none'};">
							<span title="Dot intensity / opacity">Dot Intensity</span>
							<div class="in-slider-container">
								<input type="range" class="in-slider" id="in-slider-dot-opacity" min="0.05" max="0.50" step="0.01" value="${config.nukeBgDotOpacity || 0.22}">
								<span class="in-slider-val" id="in-val-dot-opacity">${Math.round((config.nukeBgDotOpacity || 0.22) * 100)}%</span>
							</div>
						</div>
					</div>

					<!-- Nuke Backdrops (Groups) -->
					<div class="in-sec">
						<div class="in-lbl">📦 Nuke Backdrops (Groups)</div>
						<div class="in-row" title="Off: groups are drawn by ComfyUI exactly as it does without this extension">
							<span>Nuke Backdrops</span>
							<div class="in-sw ${config.nukeGroupsEnabled !== false ? 'on' : ''}" id="in-sw-groups">
								<div class="in-sw-dot"></div>
							</div>
						</div>
						<div class="in-row" id="in-group-style-row" title="Default backdrop rendering style for groups">
							<span>Default Style</span>
							<div class="in-btns" style="width: 170px; grid-template-columns: 1fr 1fr;">
								<button class="in-btn ${(config.defaultBackdropStyle === 'normal' || !config.defaultBackdropStyle) ? 'active' : ''}" data-groupstyle="normal">Fill (Normal)</button>
								<button class="in-btn ${config.defaultBackdropStyle === 'border' ? 'active' : ''}" data-groupstyle="border">Border (Outline)</button>
							</div>
						</div>
						<div class="in-row" id="in-group-size-row" title="Default title font size for groups/backdrops">
							<span>Title Font Size</span>
							<div class="in-btns" style="width: 170px; grid-template-columns: repeat(3, 1fr);">
								<button class="in-btn ${(config.defaultBackdropFontSize === 18) ? 'active' : ''}" data-groupfontsize="18">18px (S)</button>
								<button class="in-btn ${(!config.defaultBackdropFontSize || config.defaultBackdropFontSize === 24 || config.defaultBackdropFontSize === 28) ? 'active' : ''}" data-groupfontsize="28">28px (M)</button>
								<button class="in-btn ${(config.defaultBackdropFontSize === 42) ? 'active' : ''}" data-groupfontsize="42">42px (L)</button>
							</div>
						</div>
					</div>

					<!-- Performance -->
					<div class="in-sec">
						<div class="in-lbl">⚡ Performance</div>
						${(function () {
							const f = NukePerformance.found();
							const rows = f.have.map(r => `
						<div class="in-row" title="${r.tip}">
							<span>${r.label}</span>
							<div class="in-sw ${config[r.key] ? 'on' : ''}" id="${r.id}">
								<div class="in-sw-dot"></div>
							</div>
						</div>`).join('');
							/* ⚑⚑ LA LÍNEA ES LA MEDICIÓN, no decoración. Cada
							   switch de aquí escribe UNA propiedad con nombre;
							   si este frontend no la tiene, la fila no se
							   ofrece y esta línea dice cuál faltó. Y si salen
							   las cuatro y aun así no cambia nada, el que las
							   ignora es el renderer — que es exactamente lo que
							   no se podía saber del otro tool. */
							const miss = f.missing.length
								? ` · <span style="color:#f59e0b;">not on this frontend: ${f.missing.map(r => r.names[0]).join(', ')}</span>`
								: '';
							/* ⚑⚑ v17.64 — Y EL NÚMERO DEL RUTEO DE LOS CABLES, que es
							   donde de verdad se iba el tiempo. Jorge: "luego se
							   vuelve lento todo." Era `ensureMapLinks`
							   recalculando cada 30 ms hubiera cambiado algo o no.
							   Esta línea es la que convierte "está lento" en una
							   cifra: cuántas veces recalculó, cuánto tardó cada
							   una, y de qué tamaño es el grafo. Un caché del que
							   nadie mira la tasa de acierto es una creencia. */
							let pipe = '';
							try {
								const R = window.NukePipeRenderer;
								const s = R && R.stats;
								if (s && (s.calcs || s.hits)) {
									const secs = Math.max(1, (Date.now() - s.since) / 1000);
									const per = s.calcs ? (s.ms / s.calcs) : 0;
									pipe = `
						<div style="opacity:.55;font-size:11px;padding:4px 2px 0;line-height:1.45;">
							Pipe routing: <b>${s.calcs}</b> recomputes in ${secs.toFixed(0)}s
							(${(s.calcs / secs).toFixed(1)}/s, ${per.toFixed(1)}ms each)
							over ${s.nodes} nodes / ${s.links} links — ${s.hits} cache hits.
							It recomputes when a node moves, arrives or resizes, and not on a clock.
							${s.calcs / secs > 12 ? '<span style="color:#f59e0b;">That rate means something is moving constantly — a node being dragged, or an extension writing positions every frame.</span>' : ''}
						</div>`;
								}
							} catch (e) {}
							return rows + `
						<div style="opacity:.55;font-size:11px;padding:4px 2px 0;line-height:1.45;">
							These write litegraph’s own render flags (${f.have.map(r => r.names[0]).join(', ') || '—'})${miss}.
							If a switch is here and pressing it changes nothing, the renderer is ignoring the flag — not this switch.
						</div>` + pipe;
						}())}
					</div>

					<!-- Shortcuts Reference Card -->
					<div class="in-sec in-hk-card">
						<div class="in-lbl" style="color:#60a5fa;display:flex;align-items:center;gap:6px;">
							<span>⌨</span> NUKE SHORTCUTS GUIDE
						</div>
						<div class="in-hk-list">
							<div class="in-hk-row"><div class="in-keys"><kbd class="in-k">LMB</kbd></div><div class="in-desc">Box Select Nodes</div></div>
							<div class="in-hk-row"><div class="in-keys"><kbd class="in-k">MMB</kbd>+<kbd class="in-k">LMB</kbd></div><div class="in-desc">Smooth Continuous Zoom</div></div>
							${config.nukeModResize === false ? '' : `<div class="in-hk-row"><div class="in-keys"><kbd class="in-k" id="in-hk-modresize">${MOD_LABELS[config.nukeModResizeKey || 'alt'] || 'Alt'}</kbd>+<kbd class="in-k">MMB</kbd></div><div class="in-desc">Drag on a Node to Resize it</div></div>`}
							<div class="in-hk-row"><div class="in-keys"><kbd class="in-k">Tab</kbd></div><div class="in-desc">Node Search at Cursor</div></div>
							<div class="in-hk-row"><div class="in-keys"><kbd class="in-k">/</kbd></div><div class="in-desc">Find Node by Number or Name</div></div>
							<div class="in-hk-row"><div class="in-keys"><kbd class="in-k">F</kbd></div><div class="in-desc">Focus / Frame Selection</div></div>
							<div class="in-hk-row"><div class="in-keys"><kbd class="in-k">D</kbd></div><div class="in-desc">Bypass / Mute Node</div></div>
							<div class="in-hk-row"><div class="in-keys"><kbd class="in-k">Alt</kbd>+<kbd class="in-k">H</kbd></div><div class="in-desc">Hide Inputs / Virtual Links</div></div>
							<div class="in-hk-row"><div class="in-keys"><kbd class="in-k">Ctrl</kbd>+<kbd class="in-k">D</kbd></div><div class="in-desc">Duplicate without Links</div></div>
							<div class="in-hk-row"><div class="in-keys"><kbd class="in-k">Ctrl</kbd>+<kbd class="in-k">E</kbd></div><div class="in-desc">Clone with Input Links</div></div>
							<div class="in-hk-row"><div class="in-keys"><kbd class="in-k">Shift</kbd>+<kbd class="in-k">Q</kbd></div><div class="in-desc">Auto-Connect to Target</div></div>
							<div class="in-hk-row"><div class="in-keys"><kbd class="in-k">Ctrl</kbd>+<kbd class="in-k">Shift</kbd>+<kbd class="in-k">C</kbd></div><div class="in-desc">Color Palette</div></div>
							<div class="in-hk-row"><div class="in-keys"><kbd class="in-k">Ctrl</kbd>+<kbd class="in-k">Shift</kbd>+<kbd class="in-k">X</kbd></div><div class="in-desc">Extract Node & Bridge</div></div>
							<div class="in-hk-row"><div class="in-keys"><kbd class="in-k">Ctrl</kbd>+<kbd class="in-k">Shift</kbd>+<kbd class="in-k">S</kbd></div><div class="in-desc">Swap / Replace Node</div></div>
							<div class="in-hk-row"><div class="in-keys"><kbd class="in-k">Ctrl</kbd>+<kbd class="in-k">Shift</kbd>+<kbd class="in-k">I</kbd></div><div class="in-desc">Splice Node into Wire</div></div>
							<div class="in-hk-row"><div class="in-keys"><kbd class="in-k">Shift</kbd>+<kbd class="in-k">Drop</kbd></div><div class="in-desc">Splice Node on Drop</div></div>
							<div class="in-hk-row"><div class="in-keys"><kbd class="in-k">Ctrl</kbd>+<kbd class="in-k">Shift</kbd>+<kbd class="in-k">Drop</kbd></div><div class="in-desc">Swap Node on Drop</div></div>
							<div class="in-hk-row"><div class="in-keys"><kbd class="in-k">Shift</kbd>+<kbd class="in-k">R</kbd></div><div class="in-desc">Queue Selected Outputs</div></div>
						</div>
					</div>
					</div><!-- /#imissnuke-sub-panel -->

					<button class="in-reset" id="imissnuke-reset">Reset to Defaults</button>
				</div>
			`;

			document.body.appendChild(root);

			ImissNukeUI.setupTopBarMounting();

			const modal = document.getElementById('imissnuke-modal');
			const closeBtn = document.getElementById('imissnuke-close');

			closeBtn.addEventListener('click', () => {
				modal.classList.remove('open');
				const btn = document.getElementById('imissnuke-topbar-btn');
				if (btn) btn.classList.remove('active', 'open');
			});

			document.addEventListener('pointerdown', (e) => {
				const m = document.getElementById('imissnuke-modal');
				const b = document.getElementById('imissnuke-topbar-btn');
				if (!m || !m.classList.contains('open')) return;
				if (m.contains(e.target) || (b && b.contains(e.target))) return;
				m.classList.remove('open');
				if (b) b.classList.remove('active', 'open');
			});

			const refreshCanvas = () => {
				if (typeof app !== 'undefined' && app.canvas) {
					NukeCanvasBackground.applyStyle(app.canvas, config);
					app.canvas.dirty_bgcanvas = true;
					app.canvas.dirty_canvas = true;
					app.canvas.setDirty(true, true);
					if (app.graph) {
						if (app.graph.change) app.graph.change();
						if (app.graph.setDirtyCanvas) app.graph.setDirtyCanvas(true, true);
					}
					if (app.canvas.draw) app.canvas.draw(true, true);
				}
			};

			modal.querySelectorAll('.in-scale-btn').forEach(btn => {
				btn.addEventListener('click', () => {
					modal.querySelectorAll('.in-scale-btn').forEach(b => b.classList.remove('active'));
					btn.classList.add('active');
					config.panelScale = parseFloat(btn.dataset.scale);
					window.__imissNukeConfig = config;
					document.documentElement.style.setProperty('--imissnuke-scale', config.panelScale);
					saveConfig(config);
				});
			});

			modal.querySelectorAll('[data-dmode]').forEach(btn => {
				btn.addEventListener('click', () => {
					const mode = btn.getAttribute('data-dmode');
					config.dKeyMode = mode;
					window.__imissNukeConfig = config;
					modal.querySelectorAll('[data-dmode]').forEach(b => b.classList.toggle('active', b.getAttribute('data-dmode') === mode));
					saveConfig(config);
				});
			});

			// Background Style (flat vs dots)
			modal.querySelectorAll('[data-nukebgstyle]').forEach(btn => {
				btn.addEventListener('click', () => {
					const st = btn.getAttribute('data-nukebgstyle');
					config.nukeBgStyle = st;
					window.__imissNukeConfig = config;
					modal.querySelectorAll('[data-nukebgstyle]').forEach(b => b.classList.toggle('active', b.getAttribute('data-nukebgstyle') === st));
					const dotRow = document.getElementById('in-bg-dot-row');
					if (dotRow) dotRow.style.display = (st === 'dots') ? 'flex' : 'none';
					saveConfig(config);
					refreshCanvas();
				});
			});

			// Gray Darkness slider
			const graySlider = document.getElementById('in-slider-gray-level');
			const grayVal = document.getElementById('in-val-gray-level');
			if (graySlider) {
				graySlider.addEventListener('input', (e) => {
					const val = parseInt(e.target.value, 10);
					config.nukeBgGrayLevel = val;
					window.__imissNukeConfig = config;
					if (grayVal) grayVal.textContent = `${val}%`;
					saveConfig(config);
					refreshCanvas();
				});
			}

			// Dot Intensity slider
			const dotSlider = document.getElementById('in-slider-dot-opacity');
			const dotVal = document.getElementById('in-val-dot-opacity');
			if (dotSlider) {
				dotSlider.addEventListener('input', (e) => {
					const val = parseFloat(e.target.value);
					config.nukeBgDotOpacity = val;
					window.__imissNukeConfig = config;
					if (dotVal) dotVal.textContent = `${Math.round(val * 100)}%`;
					saveConfig(config);
					refreshCanvas();
				});
			}

			// Line Color Mode (Unselected: nukeDark vs original)
			modal.querySelectorAll('[data-linecolormode]').forEach(btn => {
				btn.addEventListener('click', () => {
					const mode = btn.getAttribute('data-linecolormode');
					config.lineColorMode = mode;
					window.__imissNukeConfig = config;
					modal.querySelectorAll('[data-linecolormode]').forEach(b => b.classList.toggle('active', b.getAttribute('data-linecolormode') === mode));
					saveConfig(config);
					refreshCanvas();
				});
			});

			// Selection Color Mode (Selected: amber vs white)
			modal.querySelectorAll('[data-selcolormode]').forEach(btn => {
				btn.addEventListener('click', () => {
					const mode = btn.getAttribute('data-selcolormode');
					config.selectionColorMode = mode;
					window.__imissNukeConfig = config;
					modal.querySelectorAll('[data-selcolormode]').forEach(b => b.classList.toggle('active', b.getAttribute('data-selcolormode') === mode));
					saveConfig(config);
					refreshCanvas();
				});
			});

			// Pipe Thickness (Thin 1.5, Medium 2.5, Thick 4.0)
			modal.querySelectorAll('[data-pipewidth]').forEach(btn => {
				btn.addEventListener('click', () => {
					const w = parseFloat(btn.getAttribute('data-pipewidth'));
					config.pipeWidth = w;
					window.__imissNukeConfig = config;
					modal.querySelectorAll('[data-pipewidth]').forEach(b => b.classList.toggle('active', parseFloat(b.getAttribute('data-pipewidth')) === w));
					saveConfig(config);
					refreshCanvas();
				});
			});

			// Arrow Style
			modal.querySelectorAll('[data-arrowstyle]').forEach(btn => {
				btn.addEventListener('click', () => {
					const st = btn.getAttribute('data-arrowstyle');
					config.arrowStyle = st;
					window.__imissNukeConfig = config;
					modal.querySelectorAll('[data-arrowstyle]').forEach(b => b.classList.toggle('active', b.getAttribute('data-arrowstyle') === st));
					saveConfig(config);
					refreshCanvas();
				});
			});

			// Arrow Size
			modal.querySelectorAll('[data-arrowsize]').forEach(btn => {
				btn.addEventListener('click', () => {
					const sz = parseInt(btn.getAttribute('data-arrowsize'), 10);
					config.arrowSize = sz;
					window.__imissNukeConfig = config;
					modal.querySelectorAll('[data-arrowsize]').forEach(b => b.classList.toggle('active', parseInt(b.getAttribute('data-arrowsize'), 10) === sz));
					saveConfig(config);
					refreshCanvas();
				});
			});

			const bindToggle = (id, key, onToggle) => {
				const el = document.getElementById(id);
				if (!el) return;
				el.addEventListener('click', () => {
					config[key] = !config[key];
					window.__imissNukeConfig = config;
					el.classList.toggle('on', config[key]);
					saveConfig(config);
					if (onToggle) onToggle(config[key]);
					refreshCanvas();
				});
			};

			const swMaster = document.getElementById('in-sw-master');
			if (swMaster) {
				swMaster.addEventListener('click', () => {
					config.masterEnabled = (config.masterEnabled === false) ? true : false;
					window.__imissNukeConfig = config;
					swMaster.classList.toggle('on', config.masterEnabled);
					saveConfig(config);

					const icon = document.getElementById('in-master-icon');
					const sub = document.getElementById('in-master-sub');
					const subPanel = document.getElementById('imissnuke-sub-panel');

					if (icon) icon.style.color = config.masterEnabled ? '#e58c2c' : '#71717a';
					if (sub) {
						sub.textContent = config.masterEnabled ? 'All Nuke pipes, hotkeys, and canvas features active' : 'Disabled — Native ComfyUI restored';
						sub.style.color = config.masterEnabled ? '#9ca3af' : '#ef4444';
					}
					if (subPanel) {
						if (config.masterEnabled) {
							subPanel.style.opacity = '1';
							subPanel.style.pointerEvents = 'auto';
							subPanel.style.filter = 'none';
						} else {
							subPanel.style.opacity = '0.35';
							subPanel.style.pointerEvents = 'none';
							subPanel.style.filter = 'grayscale(0.6)';
						}
					}

					ImissNukeUI.updateTopBarState();
					refreshCanvas();
				});
			}

			bindToggle('in-sw-lmb', 'lmbBoxSelect', (v) => ImissNukeManager.syncComfyNavigationMode(v));
			bindToggle('in-sw-zoom', 'nukeWacomZoom');
			bindToggle('in-sw-upnodes', 'nukeSelectUpstream');
			// ⚑ La fila de abajo se atenúa con el hotkey apagado: sin Tab no hay
			// nada que colocar ni encadenar, pero el switch sigue diciendo en qué
			// quedó — un control que se esfuma es una función que la gente cree
			// que rompió.
			const dimTabChainRow = () => {
				const on = config.tabForSearch !== false;
				['#in-tab-place-row', '#in-tab-chain-row'].forEach((sel) => {
					const row = modal.querySelector(sel);
					if (!row) return;
					row.style.opacity = on ? '' : '0.35';
					row.style.pointerEvents = on ? '' : 'none';
				});
			};
			bindToggle('in-sw-tab', 'tabForSearch', (v) => {
				ImissNukeManager.setupTabSearch(v);
				dimTabChainRow();
			});
			dimTabChainRow();
			// ⚑ Sin callback a propósito: el manejador de Tab lee `tabAutoConnect`
			// en cada press, así que no hay nada que re-instalar.
			bindToggle('in-sw-tab-place', 'tabPlaceAtCursor');
			bindToggle('in-sw-tab-chain', 'tabAutoConnect');

			/* ⚑⚑ ESTE NO ES UN AJUSTE NUESTRO, así que NO pasa por `bindToggle`:
			   no vive en nuestro config, no se guarda en nuestro localStorage y
			   no tiene un default que podamos prometer. Se escribe en ComfyUI y
			   **se lee de vuelta**; si la lectura no coincide, el switch se
			   queda como estaba y lo dice, en vez de pintarse prendido sobre un
			   ajuste que nunca cambió. */
			(function () {
				const el = document.getElementById('in-sw-vuenodes');
				if (!el) return;
				el.addEventListener('click', () => {
					const now = NukeVueNodes.isOn();
					if (now === null) return;
					const ok = NukeVueNodes.set(!now);
					const back = NukeVueNodes.isOn();
					el.classList.toggle('on', back === true);
					const sub = document.getElementById('in-master-sub');
					if (sub) {
						sub.textContent = ok
							? ('ComfyUI Nodes 2.0 is now ' + (back ? 'ON' : 'OFF')
								+ ' — reload the page for it to take hold')
							: ('ComfyUI refused that write — ' + NukeVueNodes.say());
						sub.style.color = ok ? '#9ca3af' : '#ef4444';
					}
					console.log('[ImissNuke] ' + NukeVueNodes.say()
						+ (ok ? ' — reload the page for it to take hold'
							: ' — THE WRITE DID NOT TAKE'));
				});
			})();

			// Mod + MMB resize. La fila del modificador se atenúa con el switch
			// apagado en vez de desaparecer — misma regla que las dos filas de los
			// backdrops: un control que se esfuma es una función que la gente cree
			// que rompió.
			const dimResizeKeyRow = () => {
				const row = modal.querySelector('#in-modresize-key-row');
				if (!row) return;
				const on = config.nukeModResize !== false;
				row.style.opacity = on ? '' : '0.35';
				row.style.pointerEvents = on ? '' : 'none';
			};
			bindToggle('in-sw-modresize', 'nukeModResize', () => dimResizeKeyRow());
			dimResizeKeyRow();
			modal.querySelectorAll('[data-modresizekey]').forEach(btn => {
				btn.addEventListener('click', () => {
					const k = btn.getAttribute('data-modresizekey');
					config.nukeModResizeKey = k;
					window.__imissNukeConfig = config;
					modal.querySelectorAll('[data-modresizekey]').forEach(b =>
						b.classList.toggle('active', b.getAttribute('data-modresizekey') === k));
					// La guía de atajos muestra la tecla elegida, así que se repinta a
					// mano: nada la vuelve a dibujar sola.
					const kbd = modal.querySelector('#in-hk-modresize');
					if (kbd) kbd.textContent = MOD_LABELS[k] || 'Alt';
					saveConfig(config);
				});
			});
			bindToggle('in-sw-dbl', 'disableDblClick', (v) => ImissNukeManager.setupDblClickBlock(v));
			bindToggle('in-sw-block-input-drop', 'blockInputDisconnectSearch');
			bindToggle('in-sw-block-output-drop', 'blockOutputDropSearch');
			bindToggle('in-sw-empty-output-search', 'searchOnlyEmptyOutput');
			bindToggle('in-sw-multiac', 'multiAutoConnect');
			bindToggle('in-sw-instant-place', 'nukeInstantPlacement', (v) => ImissNukeManager.syncInstantPlacement(v));
			bindToggle('in-sw-lines', 'nukeLinesEnabled', () => refreshCanvas());
			bindToggle('in-sw-arrows', 'nukeArrowsEnabled', () => refreshCanvas());
			bindToggle('in-sw-avoid', 'avoidNodes', () => refreshCanvas());
			bindToggle('in-sw-upstream', 'highlightUpstreamOnly', () => refreshCanvas());
			bindToggle('in-sw-nukebg', 'nukeBgEnabled', (v) => {
				if (typeof app !== 'undefined' && app.canvas) {
					NukeCanvasBackground.applyStyle(app.canvas, config);
					app.canvas.dirty_bgcanvas = true;
					app.canvas.dirty_canvas = true;
					app.canvas.setDirty(true, true);
					if (app.canvas.draw) app.canvas.draw(true, true);
				}
				refreshCanvas();
			});

			// Nuke Backdrops on/off. The two rows under it are dimmed rather
			// than hidden: a control that vanishes is a feature people think
			// they broke.
			bindToggle('in-sw-groups', 'nukeGroupsEnabled', () => {
				const on = config.nukeGroupsEnabled !== false;
				['in-group-style-row', 'in-group-size-row'].forEach(id => {
					const el = modal.querySelector('#' + id);
					if (el) {
						el.style.opacity = on ? '' : '0.35';
						el.style.pointerEvents = on ? '' : 'none';
					}
				});
				refreshCanvas();
			});
			(function () {
				const on = config.nukeGroupsEnabled !== false;
				['in-group-style-row', 'in-group-size-row'].forEach(id => {
					const el = modal.querySelector('#' + id);
					if (el && !on) { el.style.opacity = '0.35'; el.style.pointerEvents = 'none'; }
				});
			}());

			// Group/Backdrop Default Style (normal vs border)
			modal.querySelectorAll('[data-groupstyle]').forEach(btn => {
				btn.addEventListener('click', () => {
					const st = btn.getAttribute('data-groupstyle');
					config.defaultBackdropStyle = st;
					window.__imissNukeConfig = config;
					modal.querySelectorAll('[data-groupstyle]').forEach(b => b.classList.toggle('active', b.getAttribute('data-groupstyle') === st));
					saveConfig(config);
					refreshCanvas();
				});
			});

			// Group/Backdrop Default Font Size (18, 28, 42)
			modal.querySelectorAll('[data-groupfontsize]').forEach(btn => {
				btn.addEventListener('click', () => {
					const sz = parseInt(btn.getAttribute('data-groupfontsize'), 10);
					config.defaultBackdropFontSize = sz;
					window.__imissNukeConfig = config;
					modal.querySelectorAll('[data-groupfontsize]').forEach(b => b.classList.toggle('active', parseInt(b.getAttribute('data-groupfontsize'), 10) === sz));
					saveConfig(config);
					refreshCanvas();
				});
			});

			// Performance — one binding per row that was actually drawn, from
			// the same table that drew it. A second list of ids here is a
			// second place for a row to be forgotten.
			NukePerformance.ROWS.forEach(r => {
				bindToggle(r.id, r.key, () => { NukePerformance.apply(config); });
			});

			document.getElementById('imissnuke-reset').addEventListener('click', () => {
				Object.assign(config, DEFAULT_CONFIG);
				window.__imissNukeConfig = config;
				saveConfig(config);
				location.reload();
			});
		}
	}

	// ---- REGISTRO EN COMFYUI ----
	const extDefinition = {
		name: "ImissNuke.Hotkeys",
		init() {
			ImissNukeManager.init();
		},
		setup() {
			ImissNukeManager.init();
			if (typeof app !== 'undefined' && app.canvas) {
				ImissNukeManager.setupDblClickBlock(config.disableDblClick);
				ImissNukeManager.syncComfyNavigationMode(config.lmbBoxSelect);
			}
		}
	};

	if (typeof app !== 'undefined' && app.registerExtension) {
		try {
			if (!app.extensions || !app.extensions.some(e => e.name === extDefinition.name)) {
				app.registerExtension(extDefinition);
			}
			if (app.canvas) {
				ImissNukeManager.init();
			}
		} catch (e) {
			console.warn('[ImissNuke] Error registering extension:', e);
		}
	} else {
		if (document.readyState === 'complete' || document.readyState === 'interactive') {
			setTimeout(ImissNukeManager.init, 300);
		} else {
			window.addEventListener('DOMContentLoaded', () => setTimeout(ImissNukeManager.init, 300));
		}
	}

	window.ImissNukeManager = ImissNukeManager;
})();
