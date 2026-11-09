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
 *  - Shift + Q: Conectar la selección al nodo de la derecha (imagen o video primero, nunca a un widget; toma el socket si ya lo alimenta otro)
 *  - Ctrl + Shift + C: Paleta flotante de color para nodos y grupos
 *  - Ctrl + Shift + X: Extraer nodo y puentear cables
 *  - Ctrl + Shift + S: Sustituir / Reemplazar nodo (Swap)
 *  - Ctrl + Shift + I: Intercalar nodo en cable
 *  - Shift + Drag Drop: Intercalar nodo sobre cable al soltar
 *  - Ctrl + Shift + Drag Drop: Sustituir nodo al soltar sobre otro
 *  - Shift + R: Encolar / Renderizar nodos de salida seleccionados
 *  - MMB + LMB Drag (Wacom): Zoom interactivo suave continuo
 *  - LMB Canvas Drag: Selección por caja (Box select)
 *  - Shift + ↑: Seleccionar lo que alimenta a la selección
 *  - L: Acomodar la selección (Layout)
 *
 * Settings: el panel de la N (v2, 2026-11-08) — pocos, con su tip al pasar
 * el mouse; lo demás es fijo. Ver CONFIG abajo. v2.1 (2026-11-09): las
 * teclas de arriba se cambian en el panel (Shortcuts) y todo cabe en un
 * preset (Save / Download a Copy / Load from File…, como el Hotbox).
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

	/* ---- CONFIG ---------------------------------------------------------------
	 *
	 * ⚑⚑ v2 (2026-11-08) — POCOS SETTINGS. Jorge: "quitar tantos settings y
	 * dejar lo que tenemos por default… hay cosas que están outdated." Lo que un
	 * artista puede cambiar es la lista corta de USER_DEFAULTS, y es TODO lo que
	 * el panel enseña. Lo demás vive en FIXED con el valor con el que ya salía,
	 * y no se guarda: un valor que no se escribe no se puede quedar viejo.
	 *
	 * ⚑ Se fueron, con su código: Mod+MMB resize (parked desde v17.57, congelaba
	 * el canvas), el fondo de canvas (gate cerrado desde 2026-09-08), las flechas
	 * (apagadas desde el epoch 2), Block Double-Click (parche de litegraph 1.x
	 * que bajo Nodes 2.0 no bloqueaba nada), la fila de Nodes 2.0 (el Tab se
	 * arregló en v18.51), el tamaño del panel, tres switches de Performance y la
	 * tabla REDEFAULTED con sus 8 epochs. Todo está en el commit "Baseline" del
	 * repo de ImissNuke.
	 *
	 * ⚑ v2.2 (2026-11-09): se fue Square Corners (`LiteGraph.ROUND_RADIUS` a
	 * 0) con la clase que lo aplicaba. Jorge: "nunca lo uso". Un valor
	 * guardado de antes se ignora: loadConfig sólo lee USER_DEFAULTS.
	 *
	 * ⚑ LA ÚNICA DIFERENCIA DE SISTEMA QUE QUEDA: el auto-connect del Tab
	 * (encadenar el nodo nuevo al seleccionado) sale OFF en Linux y ON en
	 * Windows. Se partió en v17.57 para aislar "el nodo nace en otro lado"; las
	 * dos causas de ese bug salieron después (v17.58: el comando toggle del
	 * buscador; v18.51: `canvasX` en camelCase) y ninguna vivía en esta mitad,
	 * pero nunca se ha medido prendido en Linux. Para probarlo allá sin switch,
	 * en la consola (se lee en cada Tab, no hace falta recargar):
	 *     __imissNukeConfig.tabAutoConnect = true
	 * ------------------------------------------------------------------------- */
	const USER_DEFAULTS = {
		masterEnabled: true,
		dKeyMode: 'bypass',            // 'bypass' | 'mute'
		nukeLinesEnabled: true,
		lineColorMode: 'original',     // 'original' (slot type colors) | 'nukeDark'
		nukeGroupsEnabled: false,      // false = ComfyUI draws its own groups, untouched
		blockOutputDropSearch: false   // true = an output wire dropped on empty canvas opens nothing
	};

	const FIXED = {
		// Workflow
		tabForSearch: true,
		tabPlaceAtCursor: true,
		tabAutoConnect: !IS_LINUX,
		nukeInstantPlacement: true,
		blockInputDisconnectSearch: true,
		searchOnlyEmptyOutput: false,
		lmbBoxSelect: true,
		nukeWacomZoom: true,
		nukeSelectUpstream: true,
		multiAutoConnect: false,
		// Pipes
		nukeHighlightSelected: true,
		pipeStyle: 'beveled',
		selectionColorMode: 'amber',
		pipeCornerRadius: 7,
		pipeWidth: 2.5,
		avoidNodes: true,
		highlightUpstreamOnly: true,
		// Backdrops
		defaultBackdropStyle: 'normal',
		defaultBackdropFontSize: 24
	};

	// ⚑ Llave nueva: la v9 se queda intacta, así que volver al ImissNuke
	// anterior devuelve el config de antes tal cual.
	const STORE_KEY = 'imissnuke_settings_v10';

	function loadConfig() {
		let saved = null, migrated = false;
		try {
			let raw = localStorage.getItem(STORE_KEY);
			if (!raw) {
				// Una sola vez: del config viejo sólo pasan las llaves que
				// siguen siendo settings; todo lo demás ahora es FIXED.
				raw = localStorage.getItem('imissnuke_config_v9');
				migrated = !!raw;
			}
			if (raw) saved = JSON.parse(raw);
		} catch (e) { saved = null; }
		const user = { ...USER_DEFAULTS };
		if (saved && typeof saved === 'object') {
			for (const k of Object.keys(USER_DEFAULTS)) {
				if (typeof saved[k] === typeof USER_DEFAULTS[k]) user[k] = saved[k];
			}
		}
		const cfg = { ...user, ...FIXED };
		if (migrated) saveConfig(cfg);
		return cfg;
	}

	function saveConfig(cfg) {
		const out = {};
		for (const k of Object.keys(USER_DEFAULTS)) out[k] = cfg[k];
		try {
			localStorage.setItem(STORE_KEY, JSON.stringify(out));
		} catch (e) {}
	}

	const config = loadConfig();
	window.__imissNukeConfig = config;

	/* =====================================================================
	 * TECLAS QUE SE CAMBIAN (remap) — como la tecla del Hotbox
	 *
	 * Jorge: "quiero iconos ahí y opción de remap". Cada atajo de TECLADO es
	 * un binding { key, code, mods } y el handler pregunta `inKey(e, id)` en
	 * vez de traer la tecla escrita. Se guarda sólo lo que cambió respecto a
	 * fábrica (imissnuke_keymap_v1), así que una tecla nueva de fábrica le
	 * llega a todos. Los gestos de mouse y el Tab no se cambian.
	 *
	 *   mods:     'ctrl+' 'alt+' 'shift+', en ese orden; Cmd cuenta como Ctrl
	 *   anyShift: Shift no importa — la "/" en un teclado en español ES
	 *             Shift+7, y Ctrl+Shift+X hace lo mismo que Ctrl+X
	 * ===================================================================== */
	const IN_KEY_DEFAULTS = {
		find:      { key: '/', code: '', mods: '', anyShift: true },
		frame:     { key: 'f', code: 'KeyF', mods: '' },
		layout:    { key: 'l', code: 'KeyL', mods: '' },
		bypass:    { key: 'd', code: 'KeyD', mods: '' },
		upstream:  { key: 'arrowup', code: 'ArrowUp', mods: 'shift+' },
		hideLinks: { key: 'h', code: 'KeyH', mods: 'alt+' },
		duplicate: { key: 'd', code: 'KeyD', mods: 'ctrl+' },
		clone:     { key: 'e', code: 'KeyE', mods: 'ctrl+' },
		connect:   { key: 'q', code: 'KeyQ', mods: 'shift+' },
		color:     { key: 'c', code: 'KeyC', mods: 'ctrl+shift+' },
		extract:   { key: 'x', code: 'KeyX', mods: 'ctrl+shift+', anyShift: true },
		swap:      { key: 's', code: 'KeyS', mods: 'ctrl+shift+' },
		splice:    { key: 'i', code: 'KeyI', mods: 'ctrl+shift+' },
		queue:     { key: 'r', code: 'KeyR', mods: 'shift+' }
	};
	const KEY_STORE = 'imissnuke_keymap_v1';

	function inKeyNorm(b) {
		if (!b || typeof b !== 'object') return null;
		const key = String(b.key || '').toLowerCase(), code = String(b.code || '');
		if (!key && !code) return null;
		const out = { key, code, mods: String(b.mods || '') };
		if (b.anyShift) out.anyShift = true;   // only when it says something
		return out;
	}

	function inKeySame(a, b) {
		if (!a || !b) return !a && !b;
		return a.key === b.key && a.code === b.code && a.mods === b.mods && !!a.anyShift === !!b.anyShift;
	}

	// Two bindings that the same press would fire
	function inKeyClash(a, b) {
		if (!a || !b) return false;
		const shiftFree = a.anyShift || b.anyShift;
		const ma = shiftFree ? a.mods.replace('shift+', '') : a.mods;
		const mb = shiftFree ? b.mods.replace('shift+', '') : b.mods;
		return ma === mb && ((!!a.code && a.code === b.code) || (!!a.key && a.key === b.key));
	}

	// overrides { id: binding | null } -> the whole map
	function buildKeymap(over) {
		const km = {};
		for (const id of Object.keys(IN_KEY_DEFAULTS)) {
			const has = over && typeof over === 'object' && Object.prototype.hasOwnProperty.call(over, id);
			km[id] = has ? inKeyNorm(over[id]) : { ...IN_KEY_DEFAULTS[id] };
		}
		return km;
	}

	function keymapOverrides(km) {
		const out = {};
		for (const id of Object.keys(IN_KEY_DEFAULTS)) {
			const b = km && km[id] ? inKeyNorm(km[id]) : null;
			if (!inKeySame(b, inKeyNorm(IN_KEY_DEFAULTS[id]))) out[id] = b;
		}
		return out;
	}

	function loadKeymap() {
		let over = null;
		try { over = JSON.parse(localStorage.getItem(KEY_STORE) || 'null'); } catch (e) { over = null; }
		return buildKeymap(over);
	}

	function saveKeymap(km) {
		try { localStorage.setItem(KEY_STORE, JSON.stringify(keymapOverrides(km))); } catch (e) {}
	}

	const keymap = loadKeymap();
	window.__imissNukeKeys = keymap;

	function inKeyMods(e) {
		return (e.ctrlKey || e.metaKey ? 'ctrl+' : '') + (e.altKey ? 'alt+' : '') + (e.shiftKey ? 'shift+' : '');
	}

	// Does this press fire the action `id`?
	function inKey(e, id) {
		const b = (window.__imissNukeKeys || keymap)[id];
		if (!b || !e) return false;
		let m = inKeyMods(e), bm = b.mods || '';
		if (b.anyShift) { m = m.replace('shift+', ''); bm = bm.replace('shift+', ''); }
		if (m !== bm) return false;
		if (b.code && e.code === b.code) return true;
		return !!b.key && String(e.key || '').toLowerCase() === b.key;
	}

	function inKeyLabel(b) {
		if (!b) return '—';
		const c = String(b.code || ''), k = String(b.key || '');
		const names = { arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→', ' ': 'Space', escape: 'Esc', backquote: '`' };
		const base = /^Key[A-Z]$/.test(c) ? c.slice(3)
			: names[k] ? names[k]
			: k.length === 1 ? k.toUpperCase()
			: k ? k[0].toUpperCase() + k.slice(1)
			: c;
		const m = String(b.mods || '');
		return (m.includes('ctrl+') ? 'Ctrl+' : '') + (m.includes('alt+') ? 'Alt+' : '')
			+ (m.includes('shift+') ? 'Shift+' : '') + base;
	}

	// Keys a remap may not take: the Tab, and what ComfyUI and the browser
	// need (copy, paste, undo, save, run…). '' = free.
	function inKeyReserved(b) {
		const k = b.key, m = b.mods;
		const letter = /^Key[A-Z]$/.test(b.code) ? b.code.slice(3).toLowerCase() : k;
		if (k === 'tab') return 'Tab is the node search';
		if (k === 'enter' || k === ' ' || /^f(5|11|12)$/.test(k)
			|| (m === 'ctrl+' && 'cvzyaso'.includes(letter) && letter.length === 1)
			|| (m === 'ctrl+shift+' && (letter === 'z' || letter === 'v'))) {
			return `${inKeyLabel(b)} belongs to ComfyUI`;
		}
		return '';
	}

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
					ImissNukeManager.syncComfyNavigationMode(config.lmbBoxSelect);
					ImissNukeManager.syncInstantPlacement(config.nukeInstantPlacement);
					// ⚑ Un segundo init() es la única oportunidad que tiene el enganche
					// de Tab si en el primero todavía no existía `app.graph` — que es
					// justo lo que pasa cargando desde custom_nodes. Poner un parche
					// que ya está puesto no cuesta nada.
					ImissNukeManager.setupAutoConnectOnAdd();
					if (window.NukePipeRenderer) window.NukePipeRenderer.init(app.canvas);
					NukeBackdropManager.init();
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
						+ (vue ? ' — Nodes 2.0 draws nodes as DOM elements (the L '
							+ 'layout needs a frontend whose node.pos setter reaches '
							+ 'its layout store).' : ''));
				}
			} catch (e) {}

			ImissNukeUI.init();
			ImissNukeUI.updateTopBarState();
			if (window.NukePipeRenderer) window.NukePipeRenderer.init(typeof app !== 'undefined' ? app.canvas : null);
			NukeBackdropManager.init();
			ImissNukeManager.setupAutoConnectOnAdd();
			ImissNukeManager.syncComfyNavigationMode(config.lmbBoxSelect);
			ImissNukeManager.syncInstantPlacement(config.nukeInstantPlacement);
			ImissNukeManager.setupGhostPlacementBypass();
			ImissNukeManager.setupLimboSafetyListener();
			ImissNukeManager.setupPointerTracker();
			ImissNukeManager.setupWacomAndMouseZoom();
			ImissNukeManager.setupDropMenuBlock();
			// ⚡ v17.94 — el bloqueo que SÍ alcanza al frontend nuevo. Necesita
			// el `linkConnector` del canvas para llegar a su prototipo, así que
			// también se reintenta en los dos timeouts de abajo: es idempotente.
			ImissNukeManager.setupLinkReleaseBlock();
			ImissNukeManager.setupTabSearch(config.tabForSearch);
			ImissNukeManager.patchSelectionOrderTracker();
			ImissNukeManager.setupHotkeys();
			ImissNukeManager.setupDropSpliceAndSwap();

			setTimeout(() => {
				ImissNukeManager.syncComfyNavigationMode(config.lmbBoxSelect);
				ImissNukeManager.syncInstantPlacement(config.nukeInstantPlacement);
				ImissNukeManager.setupAutoConnectOnAdd();
				ImissNukeManager.setupLinkReleaseBlock();
			}, 500);
			setTimeout(() => {
				ImissNukeManager.syncComfyNavigationMode(config.lmbBoxSelect);
				ImissNukeManager.syncInstantPlacement(config.nukeInstantPlacement);
				ImissNukeManager.setupAutoConnectOnAdd();
				ImissNukeManager.setupLinkReleaseBlock();
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
				   `tabPlaceAtCursor` (FIXED: siempre ON). */
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

		/* ---- CONECTAR LO QUE SE TIENE QUE CONECTAR (Shift+Q y Tab) ----------
		 *
		 * Jorge: "que sí conecte lo que tiene que conectar, en especial con el
		 * OCIO Read… quiere conectar el alpha a una imagen, pero si es video no
		 * conecta la salida (ComfyUI Video)… o conecta por atrás al source,
		 * cuando realmente no uso esa parte. Lo que más uso es el de imagen o
		 * el de video."
		 *
		 * Lo que estaba mal, y lo que hace cada pieza de abajo:
		 *   1. GANABA EL PRIMER PAR QUE CUADRARA, en orden de slot. En el OCIO
		 *      Read `info` (STRING, slot 3) va antes que `ComfyUI Video`
		 *      (slot 4), así que un STRING le ganaba al VIDEO. Ahora cada par
		 *      (salida, entrada) se CALIFICA (`sqScore`) y gana el mejor.
		 *   2. CUALQUIER ENTRADA SERVÍA. Con Nodes 2.0 cada widget es un socket,
		 *      y `source` del Read es un STRING. Ahora un widget nunca recibe
		 *      por Shift+Q: sólo los sockets de verdad.
		 *   3. ALPHA, FPS, INFO Y METADATA SON SECUNDARIAS. Sólo se conectan
		 *      cuando ninguna salida principal (imagen, video, latent…) tiene a
		 *      dónde ir en ese nodo — un Invert Mask recibe el alpha; un nodo
		 *      que ya tiene su imagen de OTRO nodo no recibe el alpha en su
		 *      lugar. Y si su imagen viene de ESTE mismo nodo, un segundo
		 *      Shift+Q sí agrega el alpha: imagen primero, alpha después.
		 *   4. IMAGEN O VIDEO SEGÚN LA FUENTE. Si el nodo trae las dos salidas
		 *      y está leyendo un video (frame_mode 'video', o un .mov/.mp4… en
		 *      un widget), el VIDEO le gana a la IMAGE; si no, al revés. Un nodo
		 *      que sólo acepta una de las dos recibe esa, sea lo que sea.
		 *   5. EL DESTINO ERA EL ID MÁS ALTO, no "el último seleccionado": la
		 *      lista de selección sale ordenada por id. Ahora recibe el de la
		 *      DERECHA, y si su socket ya lo alimenta otro nodo, Shift+Q lo TOMA
		 *      (la captura de Jorge: el Read nuevo reemplaza al PNG viejo en el
		 *      reroute, como conectar encima en Nuke). Ctrl+Z lo regresa.
		 * =================================================================== */
		static sqType(t) {
			return String(Array.isArray(t) ? t.join(',') : (t == null ? '' : t)).toUpperCase().trim();
		}

		static sqIsScalar(t) {
			return ['INT', 'FLOAT', 'STRING', 'BOOLEAN', 'BOOL', 'NUMBER', 'COMBO'].includes(t);
		}

		// Lo que trae el nodo: un video, o una imagen / secuencia
		static sqIsVideoSource(node) {
			const ws = node && node.widgets;
			if (!Array.isArray(ws)) return false;
			const ext = /\.(mov|mp4|m4v|mkv|avi|webm|mxf|wmv|flv|mpe?g|m2ts|mts|gif)\s*$/i;
			for (const w of ws) {
				if (!w) continue;
				if (w.name === 'frame_mode' && w.value === 'video') return true;
				if (typeof w.value === 'string' && ext.test(w.value)) return true;
			}
			return false;
		}

		static sqContext(src) {
			const outs = (src && src.outputs) || [];
			const types = outs.map(o => ImissNukeManager.sqType(o && o.type));
			const hasImage = types.includes('IMAGE');
			return {
				hasImage,
				hasImageAndVideo: hasImage && types.includes('VIDEO'),
				video: ImissNukeManager.sqIsVideoSource(src)
			};
		}

		// alpha (MASK junto a una IMAGE), fps, info, metadata
		static sqIsSecondary(type, ctx) {
			return ImissNukeManager.sqIsScalar(type) || (type === 'MASK' && ctx.hasImage);
		}

		// Qué tan bien cuadra la salida `out` con la entrada `inp`; -1 = no cuadra.
		// No mira si la entrada está ocupada: eso lo decide quien la llama.
		//   explicit: el cable lo eligió el artista (lo soltó él) — entonces sí
		//   puede entrar a un widget, y lo secundario a un comodín
		static sqScore(out, oi, inp, ii, ctx, explicit) {
			if (!out || !inp) return -1;
			if (inp.widget && !explicit) return -1;        // ⚑ nunca a un widget (source, prompt…)
			const ot = ImissNukeManager.sqType(out.type);
			const it = ImissNukeManager.sqType(inp.type);
			if (!ot || !it) return -1;
			const secondary = ImissNukeManager.sqIsSecondary(ot, ctx);
			let s;
			if (ot === it && ot !== '*') s = 100;
			else if (it === '*') {
				if (secondary && !explicit) return -1;      // a un comodín sólo va lo principal
				s = 40;
			} else if (ot === '*') {
				if (ImissNukeManager.sqIsScalar(it)) return -1;
				s = 30;
			} else {
				const a = ot.split(',').map(x => x.trim());
				const b = it.split(',').map(x => x.trim());
				if (!a.some(x => b.includes(x))) return -1;
				s = 80;
			}
			if (ctx.hasImageAndVideo) {
				if (ot === 'VIDEO') s += ctx.video ? 30 : -5;
				if (ot === 'IMAGE') s += ctx.video ? -5 : 30;
			}
			// mismo nombre, mismo dato: metadata→metadata le gana a info→metadata
			// en el OCIO Write, alpha→alpha a cualquier otro MASK
			const nm = (x) => String((x && (x.name || x.label)) || '').toLowerCase().trim();
			if (nm(out) && nm(out) === nm(inp)) s += 15;
			return s - oi * 0.5 - ii * 0.1;
		}

		// { origin_id, origin_slot } de un link, venga el grafo con Map u objeto
		static sqLink(graph, linkId) {
			if (linkId == null || !graph) return null;
			const L = graph.links || graph._links;
			let l = null;
			try { l = (L && typeof L.get === 'function') ? L.get(linkId) : (L ? L[linkId] : null); } catch (e) {}
			if (!l) return null;
			return Array.isArray(l) ? { origin_id: l[1], origin_slot: l[2] }
				: { origin_id: l.origin_id, origin_slot: l.origin_slot };
		}

		static sqLinkOrigin(graph, linkId) {
			const l = ImissNukeManager.sqLink(graph, linkId);
			return l ? l.origin_id : null;
		}

		// El mejor par de `src` hacia `dst`, o null.
		//   onlyOutput: un slot de salida fijo (el cable que se soltó)
		//   replace:    Shift+Q — sin socket libre, la salida principal TOMA el
		//               socket que alimenta otro nodo (Nuke: conectar encima
		//               reemplaza). Devuelve { …, replace: true }.
		//   claimed:    sockets de `dst` que ya puso ESTE Shift+Q — no se pisan
		static sqBest(src, dst, onlyOutput = null, opts = {}) {
			if (!src || !dst || !src.outputs || !dst.inputs || src === dst) return null;
			const ctx = ImissNukeManager.sqContext(src);
			const graph = src.graph || dst.graph || (typeof app !== 'undefined' ? app.graph : null);
			const claimed = opts.claimed || null;
			const origin = (inp) => ImissNukeManager.sqLinkOrigin(graph, inp.link);
			// ⚑ IMAGE y VIDEO son la MISMA imagen en dos formas (el OCIO Write
			// las toma como excluyentes): si `src` ya alimenta a `dst` por una,
			// la otra no se ofrece — el segundo Shift+Q va al alpha, no al video
			const fed = new Set();
			for (const inp of dst.inputs) {
				if (!inp || inp.link == null) continue;
				const l = ImissNukeManager.sqLink(graph, inp.link);
				if (l && l.origin_id === src.id && src.outputs[l.origin_slot]) {
					fed.add(ImissNukeManager.sqType(src.outputs[l.origin_slot].type));
				}
			}
			const twin = { IMAGE: 'VIDEO', VIDEO: 'IMAGE' };
			// occupied: false = sólo libres; true = sólo los que alimenta OTRO nodo
			const pick = (wantSecondary, explicit, occupied) => {
				let best = null;
				for (let oi = 0; oi < src.outputs.length; oi++) {
					if (onlyOutput != null && oi !== onlyOutput) continue;
					const out = src.outputs[oi];
					if (!out) continue;
					const ot = ImissNukeManager.sqType(out.type);
					const sec = ImissNukeManager.sqIsSecondary(ot, ctx);
					if (onlyOutput == null && sec !== wantSecondary) continue;
					if (onlyOutput == null && ctx.hasImageAndVideo && twin[ot] && fed.has(twin[ot])) continue;
					for (let ii = 0; ii < dst.inputs.length; ii++) {
						const inp = dst.inputs[ii];
						if (!inp) continue;
						if (occupied) {
							if (inp.link == null || (claimed && claimed.has(ii))) continue;
							const o = origin(inp);
							if (o == null || o === src.id) continue;
						} else if (inp.link != null) continue;
						const s = ImissNukeManager.sqScore(out, oi, inp, ii, ctx, explicit);
						if (s >= 0 && (!best || s > best.score)) best = { oi, ii, score: s, replace: !!occupied };
					}
				}
				return best;
			};

			if (onlyOutput != null) return pick(false, false, false) || pick(false, true, false);

			// 1. lo principal a un socket libre
			const primary = pick(false, false, false);
			if (primary) return primary;
			// 2. Shift+Q: lo principal toma el socket que alimenta OTRO nodo —
			//    el Read nuevo reemplaza al viejo, y el alpha no se cuela en su lugar
			if (opts.replace) {
				const swap = pick(false, false, true);
				if (swap) return swap;
			}
			// 3. lo secundario (alpha, fps, info) a un socket libre, sólo si
			//    ninguna salida principal tiene a dónde ir aquí — un socket
			//    principal que alimenta OTRO nodo lo bloquea; uno que alimenta
			//    ESTE mismo nodo no (segundo Shift+Q = el alpha)
			for (let oi = 0; oi < src.outputs.length; oi++) {
				const out = src.outputs[oi];
				if (!out || ImissNukeManager.sqIsSecondary(ImissNukeManager.sqType(out.type), ctx)) continue;
				for (let ii = 0; ii < dst.inputs.length; ii++) {
					const inp = dst.inputs[ii];
					if (!inp || inp.link == null) continue;
					if (ImissNukeManager.sqScore(out, oi, inp, ii, ctx, false) < 0) continue;
					if (origin(inp) !== src.id) return null;
				}
			}
			return pick(true, false, false);
		}

		// Shift+Q. Dos nodos: la dirección la da el canvas (el de la DERECHA
		// recibe — el grafo corre de izquierda a derecha); si sólo una dirección
		// tiene algo que conectar, ésa, y un socket libre le gana a un
		// reemplazo. Más de dos: todos al de más a la derecha que pueda
		// recibir, de arriba a abajo; si eso no conecta nada, en cadena de
		// izquierda a derecha. Devuelve cuántos cables puso.
		static smartConnect(nodes, multi = false) {
			const list = (nodes || []).filter(n => n && n.pos);
			if (list.length < 2) return 0;
			const claimedBy = new Map();      // dst -> Set(input index) puestos aquí
			const best = (src, dst) => ImissNukeManager.sqBest(src, dst, null,
				{ replace: true, claimed: claimedBy.get(dst) });
			const link = (src, dst) => {
				let made = 0;
				for (;;) {
					const c = best(src, dst);
					if (!c) break;
					try { src.connect(c.oi, dst, c.ii); } catch (e) { break; }
					const inp = dst.inputs[c.ii];
					if (!inp || inp.link == null) break;
					if (!claimedBy.has(dst)) claimedBy.set(dst, new Set());
					claimedBy.get(dst).add(c.ii);
					made++;
					if (!multi) break;
				}
				return made;
			};

			if (list.length === 2) {
				const [a, b] = list;
				const ab = best(a, b);
				const ba = best(b, a);
				if (!ab && !ba) return 0;
				let fwd;
				if (ab && !ba) fwd = true;
				else if (ba && !ab) fwd = false;
				else if (ab.replace !== ba.replace) fwd = !ab.replace;
				else if (a.pos[0] !== b.pos[0]) fwd = b.pos[0] > a.pos[0];
				else fwd = ab.score >= ba.score;
				return fwd ? link(a, b) : link(b, a);
			}

			const byX = [...list].sort((p, q) => p.pos[0] - q.pos[0]);
			let count = 0;
			for (let t = byX.length - 1; t >= 0 && count === 0; t--) {
				const target = byX[t];
				const sources = list.filter(n => n !== target).sort((p, q) => p.pos[1] - q.pos[1]);
				if (!sources.some(s => best(s, target))) continue;
				for (const s of sources) count += link(s, target);
			}
			if (count === 0) {
				for (let n = 0; n < byX.length - 1; n++) count += link(byX[n], byX[n + 1]);
			}
			return count;
		}

		static connectSourceToNewNode(src, node, preferredOutputSlot = null) {
			if (!src || !node) return;
			if (!src.outputs || src.outputs.length === 0) return;
			if (!node.inputs || node.inputs.length === 0) return;

			// ⚑ el mismo criterio que Shift+Q (`sqBest`): el mejor par, nunca a un
			// widget, imagen o video según la fuente. Sin el viejo "salida 0 a
			// entrada 0 a ciegas", que podía meter una IMAGE en un widget.
			// Con un cable soltado (preferredOutputSlot) manda ESA salida, y ahí
			// sí puede entrar a un widget si no hay socket: el cable lo eligió él.
			let connected = false;
			const pref = (preferredOutputSlot != null && src.outputs[preferredOutputSlot]) ? preferredOutputSlot : null;
			const best = ImissNukeManager.sqBest(src, node, pref);
			if (best) {
				try {
					src.connect(best.oi, node, best.ii);
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
		     · apagar Nodes 2.0 (en los Settings de ComfyUI), o
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
				if (ImissNukeUI._binding) return;   // the panel is taking a new key
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
				if (inKey(e, 'find')) {
					e.preventDefault();
					e.stopPropagation();
					ImissNukeFind.open();
					return;
				}

				// ---- Shift+R: Renderizar / Encolar nodos de salida seleccionados ----
				if (inKey(e, 'queue')) {
					e.preventDefault();
					e.stopPropagation();
					ImissNukeManager.queueSelected();
					return;
				}

				// ---- Shift+↑: selecciona lo que ALIMENTA a lo seleccionado ----
				// ⚡ Se sale SIN consumir la tecla cuando no hay nada que
				// agregar — la misma salida que la L, y lo que deja a esta
				// flecha nacer prendida sin quitarle nada a ComfyUI.
				if (inKey(e, 'upstream')) {
					const cfgUp = window.__imissNukeConfig || loadConfig();
					if (cfgUp && cfgUp.nukeSelectUpstream === false) return;
					if (!ImissNukeManager.selectUpstream()) return;
					e.preventDefault();
					e.stopPropagation();
					return;
				}

				// ---- Key F: Focus / Frame selección o grafo completo ----
				if (inKey(e, 'frame')) {
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
				if (inKey(e, 'layout')) {
					const selL = app.canvas.selected_nodes;
					if (!selL || Object.keys(selL).length < 2) return;
					e.preventDefault();
					e.stopPropagation();
					ImissNukeManager.layoutSelected();
					return;
				}

				// ---- Key D: Bypass / Disable (o Mute) ----
				if (inKey(e, 'bypass')) {
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
				if (inKey(e, 'hideLinks')) {
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
				if (inKey(e, 'duplicate')) {
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
				if (inKey(e, 'clone')) {
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

				// ---- Shift+Q: conectar lo que se tiene que conectar ----
				// (las reglas viven en `smartConnect` / `sqBest`)
				if (inKey(e, 'connect')) {
					e.preventDefault();
					e.stopPropagation();

					const canvas = app.canvas;
					const graph = app.graph;
					const nodes = ImissNukeManager.getOrderedSelectedNodes(canvas);
					if (nodes.length < 2) return;
					const multi = !!(window.__imissNukeConfig && window.__imissNukeConfig.multiAutoConnect);
					if (ImissNukeManager.smartConnect(nodes, multi) > 0) {
						canvas.setDirty(true, true);
						if (graph && graph.change) graph.change();
					}
					return;
				}

				// ---- Ctrl+Shift+C: Paleta de color para nodos y grupos ----
				if (inKey(e, 'color')) {
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
				if (inKey(e, 'extract')) {
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
				if (inKey(e, 'swap')) {
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
				if (inKey(e, 'splice')) {
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
	/* =====================================================================
	 * THE N AND ITS PANEL — HOMOLOGADOS CON EL HOTBOX (v2, 2026-11-08)
	 *
	 * Jorge: "nos quedó tan bonito el hotbox que quiero darle una chaineada…
	 * homologar incluso el icono, la experiencia de los settings."
	 *
	 * El chip es el de la H: 32 px, radio 8, gris apagado; prendido, la marca
	 * en color sobre un fondo oscuro teñido: la N, como la H, amarilla sobre
	 * ciruela. La marca es la del kit de marca de Jorge
	 * (assets/brand, "Minilogo"): la N dentro de un pipe con el codo a 45° de
	 * Nuke, dos salidas a la izquierda y el slot a la derecha, en Comfy
	 * Yellow #F2FF59 sobre #211927. El panel es el de Hotbox Settings: grid
	 * con ícono por fila, botones ● / ○, botones que ciclan con puntitos, y
	 * Done abajo. Clic derecho en la N prende o apaga todo, como la H.
	 *
	 * v2.1 (2026-11-09) — Jorge: "no respetaste el amarillo que quedamos en
	 * el design. sigue siendo mucho texto… quiero íconos ahí y opción de
	 * remap y un save presets y export presets como hotbox". La N es
	 * amarilla sobre ciruela como la H (el naranja se queda en assets/brand
	 * como alterno); cada fila dice lo suyo en un tip al pasar el mouse; las
	 * teclas son filas con ícono y un chip que se cambia con un clic; y los
	 * presets son los del Hotbox.
	 * ===================================================================== */
	const IN_LOGO = { bg: '#211927', fg: '#F2FF59' };
	// assets/brand/svg/imissnuke-comfy-classic-mark-yellow.svg, in currentColor
	const IN_MARK =
		'<g fill="currentColor">' +
		'<rect x="11.5" y="10.5" width="3" height="11" rx="1"/><rect x="17.5" y="10.5" width="3" height="11" rx="1"/>' +
		'<path d="M11.5 11.6Q11.5 10.5 12.6 10.5L14.6 10.5L20.5 20.4Q20.5 21.5 19.4 21.5L17.4 21.5Z"/>' +
		'<rect x="3" y="3.5" width="7" height="3" rx="1.1"/><rect x="3" y="25.5" width="7" height="3" rx="1.1"/>' +
		'<circle cx="27.5" cy="16" r="1"/></g>' +
		'<path d="M10 5H24L27.5 8.5V23.5L24 27H10" fill="none" stroke="currentColor" stroke-width="0.9" stroke-linejoin="miter"/>';

	// The bare mark in currentColor (the top-bar button paints the chip around it)
	function inMarkSVG(size) {
		return `<svg viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true">${IN_MARK}</svg>`;
	}

	// The full chip, for the panel header
	function inLogoChip(size) {
		return `<svg viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true" style="display:block;flex:none">`
			+ `<rect x="1" y="1" width="30" height="30" rx="6" fill="${IN_LOGO.bg}"/>`
			+ `<g style="color:${IN_LOGO.fg}" transform="translate(3.52 3.52) scale(0.78)">${IN_MARK}</g></svg>`;
	}

	// Stroke icons, same set and drawing as the Hotbox's
	const IN_ICONS = {
		power: '<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/>',
		keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
		pipes: '<circle cx="5" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 6h4l2 2v8l2 2h2"/>',
		palette: '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.8 1.6-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1a1.6 1.6 0 0 1 1.6-1.7h2c3 0 5.6-2.5 5.6-5.6C22 6 17.5 2 12 2z"/>',
		group: '<rect x="3" y="4" width="18" height="16" rx="2" stroke-dasharray="3 2.6"/><path d="M3 9h18"/>',
		searchOff: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="7" y1="7" x2="15" y2="15"/>',
		sync: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
		chevDown: '<path d="M6 9l6 6 6-6"/>',
		chevRight: '<path d="M9 6l6 6-6 6"/>',
		// v2.1: the key list and the presets
		box: '<rect x="3" y="3" width="15" height="15" rx="1" stroke-dasharray="3 2.4"/><path d="M12 12l8.5 3.4-3.5 1.2-1.2 3.5z"/>',
		zoom: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>',
		search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
		hash: '<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>',
		frame: '<path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/>',
		layout: '<rect x="3" y="4" width="6" height="5" rx="1"/><rect x="15" y="4" width="6" height="5" rx="1"/><rect x="9" y="15" width="6" height="5" rx="1"/><path d="M6 9v2h12V9M12 11v4"/>',
		bypass: '<rect x="7" y="7" width="10" height="10" rx="2" stroke-dasharray="2.5 2"/><path d="M2 12h20"/>',
		arrowUp: '<path d="M12 19V5"/><path d="M5 12l7-7 7 7"/>',
		eyeOff: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
		copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
		clone: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M15 9V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M1 15h8"/>',
		plug: '<path d="M9 2v6M15 2v6"/><path d="M6 8h12v4a6 6 0 0 1-12 0z"/><path d="M12 18v4"/>',
		scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/>',
		swap: '<path d="M16 3l4 4-4 4"/><path d="M20 7H4"/><path d="M8 21l-4-4 4-4"/><path d="M4 17h16"/>',
		splice: '<path d="M2 12h5M17 12h5"/><rect x="7" y="8" width="10" height="8" rx="2"/><path d="M12 2v3"/>',
		play: '<polygon points="6 4 20 12 6 20 6 4"/>',
		dropWire: '<path d="M2 19h20"/><rect x="8" y="3" width="8" height="7" rx="1.5"/><path d="M12 10v5M9.5 12.5L12 15l2.5-2.5"/>',
		dropSwap: '<rect x="3" y="3" width="8" height="7" rx="1.5"/><rect x="13" y="14" width="8" height="7" rx="1.5"/><path d="M15 6.5h2.5a2 2 0 0 1 2 2V11M9 17.5H6.5a2 2 0 0 1-2-2V13"/>',
		bookmark: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
		floppy: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
		save: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
		upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
		trash: '<path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>',
		check: '<polyline points="20 6 9 17 4 12"/>',
		folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>'
	};

	function inIco(name, size) {
		const s = size || 15;
		return `<svg class="in-ico" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IN_ICONS[name] || ''}</svg>`;
	}

	/* =====================================================================
	 * PRESETS — los del Hotbox (Save / Download a Copy / Load from File…)
	 *
	 * Jorge: "un save presets y export presets como hotbox… esa sí róbala de
	 * ahí". Un preset es { name, settings, keys }: los settings del panel y
	 * las teclas que no son las de fábrica. La lista vive en el user folder de
	 * ComfyUI (imissnuke/presets.json, por /userdata, igual que el hotbox.json)
	 * para que siga a Jorge a cualquier navegador, con una copia en
	 * localStorage para arrancar sin esperar al servidor.
	 *
	 *   Save Preset…      guarda lo que está en uso con un nombre; el mismo
	 *                     nombre lo actualiza
	 *   el botón que cicla pasa al siguiente preset y lo aplica
	 *   Download a Copy   baja la lista (un respaldo, o para pasarla)
	 *   Load from File…   sus presets se suman a los tuyos; nada se pisa
	 *
	 * ⚑ v2.3 — LA CARPETA DE CADA QUIEN, COMO EL HOTBOX (Jorge: "que tenga lo
	 * del usuario igual que hotbox"). Un ComfyUI de estudio es uno para ~30
	 * artistas con UN usuario: /userdata es `user/default/imissnuke`, el mismo
	 * archivo para todos. Una página que trae ImissNuke ahí (el Scene Manager,
	 * por el Nuke de cada artista) guarda el archivo ella misma:
	 * window.__imissNukeFiles = { folder(), read(name), write(name, obj) },
	 * puesto antes de que ImissNuke cargue — la misma puerta que
	 * window.__hotboxFiles. Entonces el archivo es ~/comfyui/imissnuke/
	 * presets.json de quien corre ese Nuke y la carpeta compartida no se toca.
	 * Mientras la carpeta no se alcanza, los presets se quedan en este
	 * navegador y se escriben al volver. Sin esa página, /userdata como antes.
	 * ===================================================================== */
	const PRESET_LS = 'imissnuke_presets_v1';
	const PRESET_FILE = 'imissnuke/presets.json';
	const PRESET_NAME = 'presets.json';   // its name in the folder a page keeps
	const IN_PRESETS = { list: [], active: '', userDir: '', host: null, hostDir: '', hostWait: '', pending: false };
	window.__imissNukePresets = IN_PRESETS;   // para la consola, como __imissNukeConfig
	// the page that keeps the file says its folder can be reached now, or no
	// longer (the Scene Manager, when a Nuke comes or goes) — __hotbox.filesChanged
	IN_PRESETS.filesChanged = () => inPresetsLoad();

	function inApiObj() {
		return (typeof app !== 'undefined' && app && app.api)
			|| (window.comfyAPI && window.comfyAPI.api && window.comfyAPI.api.api) || null;
	}

	function inFetch(path, opts) {
		const a = inApiObj();
		if (a && typeof a.fetchApi === 'function') return a.fetchApi(path, opts);
		if (typeof fetch === 'function') return fetch(path, opts);
		return Promise.reject(new Error('no fetch'));
	}

	/* WHERE THE FILE IS, spelled out like the Hotbox's path box (Jorge: "pon
	   donde está la ruta de donde se guarda así como el hotbox"). /userdata
	   writes into ComfyUI's user folder: the --user-directory ComfyUI was
	   started with, else --base-directory + user, else the folder next to
	   custom_nodes — ComfyUI's own layout, which is what a plain
	   `python main.py` (the Linux workstation) has. No Python of ours is
	   needed, so the baked copy says the same. */
	function inPathJoin(base, ...parts) {
		const s = String(base).indexOf('\\') >= 0 ? '\\' : '/';
		return [String(base).replace(/[\\/]+$/, '')].concat(parts).join(s);
	}

	function inPresetsDir() {
		if (IN_PRESETS.host) return IN_PRESETS.hostDir || '~/comfyui/imissnuke';
		const a = inApiObj();
		return inPathJoin(IN_PRESETS.userDir || 'ComfyUI/user', (a && a.user) || 'default', 'imissnuke');
	}

	function inPresetsRedraw() {
		if (ImissNukeUI.isOpen() && typeof ImissNukeUI._naming !== 'string') ImissNukeUI.render();
	}

	/* Where the page that keeps the file says it is, and whether it can be
	   reached now (`ready`) or why not (`why`: "Waiting for Nuke") */
	function inPresetsHostInfo() {
		const h = IN_PRESETS.host = window.__imissNukeFiles;
		IN_PRESETS.hostWait = IN_PRESETS.hostWait || 'Looking for your folder';
		return Promise.resolve().then(() => h.folder())
			.catch(err => ({ why: String((err && err.message) || err) }))
			.then(j => {
				j = j || {};
				IN_PRESETS.hostDir = String(j.folder || IN_PRESETS.hostDir || '');
				IN_PRESETS.hostWait = j.ready ? '' : String(j.why || 'Waiting for your folder');
				inPresetsRedraw();
			});
	}

	/* The file, once the folder can be reached. Changed while it could not:
	   this browser has the newest list. Not there yet: what this browser had
	   starts it. */
	function inPresetsHostLoad() {
		if (IN_PRESETS.hostWait) return;
		if (IN_PRESETS.pending) {
			IN_PRESETS.pending = false;
			return inPresetsSave();
		}
		return Promise.resolve().then(() => IN_PRESETS.host.read(PRESET_NAME))
			.then(d => {
				if (d && inPresetsAdopt(d)) {
					try { localStorage.setItem(PRESET_LS, JSON.stringify(inPresetsPayload())); } catch (e) {}
					inPresetsRedraw();
				} else if (!d && IN_PRESETS.list.length) {
					return inPresetsSave();
				}
			})
			.catch(() => {
				ImissNukeUI._msg = { text: 'Could not read the presets file · kept in this browser', cls: 'err', at: 'presets' };
				inPresetsRedraw();
			});
	}

	function inPresetsPath() {
		return inPathJoin(inPresetsDir(), 'presets.json');
	}

	function inPresetsWhere() {
		if (window.__imissNukeFiles) return Promise.resolve();   // inPresetsLoad asks the page
		const a = inApiObj();
		let p;
		try { p = inFetch('/system_stats'); } catch (e) { return Promise.resolve(); }
		return Promise.resolve(p)
			.then(r => (r && r.ok ? r.json() : null))
			.then(st => {
				const v = (st && st.system && st.system.argv) || [];
				const ud = v.indexOf('--user-directory'), bd = v.indexOf('--base-directory');
				if (ud >= 0 && v[ud + 1]) return String(v[ud + 1]);
				if (bd >= 0 && v[bd + 1]) return inPathJoin(v[bd + 1], 'user');
				if (typeof fetch !== 'function') return '';
				return fetch(((a && a.api_base) || '') + '/internal/folder_paths')
					.then(r => (r && r.ok ? r.json() : null))
					.then(fp => {
						const cn = fp && fp.custom_nodes;
						const dir = Array.isArray(cn) ? (Array.isArray(cn[0]) ? cn[0][0] : cn[0]) : '';
						const m = String(dir || '').match(/^(.*?)[\\/]+custom_nodes[\\/]*$/i);
						return m ? inPathJoin(m[1], 'user') : '';
					});
			})
			.then(dir => {
				if (!dir) return;
				IN_PRESETS.userDir = dir;
				if (ImissNukeUI.isOpen() && typeof ImissNukeUI._naming !== 'string') ImissNukeUI.render();
			})
			.catch(() => {});
	}

	function inEsc(s) {
		return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
			({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
	}

	// What is in use right now, as a preset
	function inPresetNow(name) {
		const settings = {};
		for (const k of Object.keys(USER_DEFAULTS)) settings[k] = config[k];
		return { name: String(name || 'Preset'), settings, keys: keymapOverrides(keymap) };
	}

	// A preset from a file or the server, made safe: known settings only, of
	// the right type; keys through the same filter as the keymap
	function inPresetClean(p) {
		if (!p || typeof p !== 'object') return null;
		const name = String(p.name || '').trim().slice(0, 40);
		if (!name) return null;
		const s = p.settings && typeof p.settings === 'object' ? p.settings : {};
		const settings = {};
		for (const k of Object.keys(USER_DEFAULTS)) {
			settings[k] = typeof s[k] === typeof USER_DEFAULTS[k] ? s[k] : USER_DEFAULTS[k];
		}
		const keys = keymapOverrides(buildKeymap(p.keys && typeof p.keys === 'object' ? p.keys : {}));
		return { name, settings, keys };
	}

	function inPresetsPayload() {
		return { imissnuke_presets: 1, saved_at: new Date().toISOString(), active: IN_PRESETS.active, presets: IN_PRESETS.list };
	}

	function inPresetsAdopt(d) {
		if (!d || typeof d !== 'object' || !Array.isArray(d.presets)) return false;
		const seen = new Set(), list = [];
		for (const raw of d.presets) {
			const p = inPresetClean(raw);
			if (!p || seen.has(p.name.toLowerCase())) continue;
			seen.add(p.name.toLowerCase());
			list.push(p);
		}
		IN_PRESETS.list = list;
		IN_PRESETS.active = list.some(p => p.name === d.active) ? d.active : '';
		return true;
	}

	function inPresetsLoad() {
		try { inPresetsAdopt(JSON.parse(localStorage.getItem(PRESET_LS) || 'null')); } catch (e) {}
		if (window.__imissNukeFiles) return inPresetsHostInfo().then(inPresetsHostLoad);
		let p;
		try { p = inFetch('/userdata/' + encodeURIComponent(PRESET_FILE), { cache: 'no-store' }); } catch (e) { return Promise.resolve(); }
		return Promise.resolve(p)
			.then(r => (r && r.ok ? r.json() : null))
			.then(d => {
				if (!d || !inPresetsAdopt(d)) return;
				try { localStorage.setItem(PRESET_LS, JSON.stringify(inPresetsPayload())); } catch (e) {}
				if (ImissNukeUI.isOpen() && typeof ImissNukeUI._naming !== 'string') ImissNukeUI.render();
			})
			.catch(() => {});
	}

	function inPresetsSave() {
		const body = inPresetsPayload();
		try { localStorage.setItem(PRESET_LS, JSON.stringify(body)); } catch (e) {}
		if (IN_PRESETS.host) {
			// the folder cannot be reached yet: written when it can
			if (IN_PRESETS.hostWait) { IN_PRESETS.pending = true; return Promise.resolve(); }
			return Promise.resolve().then(() => IN_PRESETS.host.write(PRESET_NAME, body))
				.catch(() => {
					IN_PRESETS.pending = true;
					ImissNukeUI._msg = { text: 'Could not write the presets file · kept in this browser', cls: 'err', at: 'presets' };
					inPresetsRedraw();
				});
		}
		let p;
		try {
			p = inFetch('/userdata/' + encodeURIComponent(PRESET_FILE) + '?overwrite=true', {
				method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body, null, 2)
			});
		} catch (e) { p = Promise.reject(e); }
		return Promise.resolve(p)
			.then(r => { if (!r || !r.ok) throw new Error('HTTP ' + (r && r.status)); })
			.catch(() => {
				ImissNukeUI._msg = { text: 'Could not write the presets file · kept in this browser', cls: 'err', at: 'presets' };
				if (ImissNukeUI.isOpen() && typeof ImissNukeUI._naming !== 'string') ImissNukeUI.render();
			});
	}

	function inPresetFind(name) {
		const n = String(name || '').toLowerCase();
		return IN_PRESETS.list.find(p => p.name.toLowerCase() === n) || null;
	}

	// Changed since the preset in use was applied or saved?
	function inPresetDirty() {
		const p = inPresetFind(IN_PRESETS.active);
		if (!p) return false;
		const now = inPresetNow(p.name);
		return JSON.stringify(now.settings) !== JSON.stringify(p.settings)
			|| JSON.stringify(now.keys) !== JSON.stringify(p.keys);
	}

	// Keymap in place: every handler reads this same object
	function inKeymapSet(over) {
		const km = buildKeymap(over);
		for (const id of Object.keys(km)) keymap[id] = km[id];
		saveKeymap(keymap);
	}

	function inPresetApply(p) {
		for (const k of Object.keys(USER_DEFAULTS)) config[k] = p.settings[k];
		inKeymapSet(p.keys);
		IN_PRESETS.active = p.name;
	}

	function inStamp() {
		const d = new Date(), z = n => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}_${z(d.getHours())}${z(d.getMinutes())}`;
	}

	// The whole list as one .json. With none saved yet, what is in use goes as "My Setup"
	function inPresetsExport() {
		const list = IN_PRESETS.list.length ? IN_PRESETS.list : [inPresetNow('My Setup')];
		const data = { imissnuke_presets: 1, saved_at: new Date().toISOString(), active: IN_PRESETS.active || list[0].name, presets: list };
		const name = `imissnuke_presets_${inStamp()}.json`;
		const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
		const a = document.createElement('a');
		a.href = url;
		a.download = name;
		document.body.appendChild(a);
		a.click();
		a.remove();
		setTimeout(() => URL.revokeObjectURL(url), 2000);
		return name;
	}

	// A file never overwrites anything: its presets join the list (a name
	// already taken gets a number), and the one it had in use is applied
	function inPresetsImport(d) {
		const src = d && Array.isArray(d.presets) ? d.presets : (d && d.settings ? [d] : []);
		const added = [];
		let pick = null;
		for (const raw of src) {
			const p = inPresetClean(raw);
			if (!p) continue;
			let got = IN_PRESETS.list.find(x => JSON.stringify(x) === JSON.stringify(p));
			if (!got) {
				const base = p.name;
				for (let n = 2; inPresetFind(p.name); n++) p.name = `${base} ${n}`;
				IN_PRESETS.list.push(p);
				got = p;
			}
			added.push(got);
			if (!pick && d.active && raw && raw.name === d.active) pick = got;
		}
		return { added, pick: pick || added[0] || null };
	}

	class ImissNukeUI {
		static isOpen() {
			const m = document.getElementById('imissnuke-modal');
			return !!(m && m.classList.contains('open'));
		}

		static closeModal() {
			const modal = document.getElementById('imissnuke-modal');
			if (modal) modal.classList.remove('open');
			const btn = document.getElementById('imissnuke-topbar-btn');
			if (btn) btn.classList.remove('active', 'open');
			// a key half-taken, a name half-typed, a delete half-confirmed: dropped
			ImissNukeUI._binding = null;
			ImissNukeUI._naming = null;
			ImissNukeUI._delArm = false;
			ImissNukeUI._msg = null;
			ImissNukeUI._kmsg = null;
			if (ImissNukeUI._tip) ImissNukeUI._tip.classList.remove('on');
		}

		static toggleModal() {
			const modal = document.getElementById('imissnuke-modal');
			const btn = document.getElementById('imissnuke-topbar-btn');
			if (!modal) return;
			if (modal.classList.contains('open')) {
				ImissNukeUI.closeModal();
				return;
			}
			ImissNukeUI.render();
			// Under the button, the way Hotbox Settings opens under the H
			const mw = Math.min(440, window.innerWidth * 0.94);
			let top = 46;
			let left = Math.max(12, window.innerWidth - mw - 18);
			if (btn && ImissNukeUI.isVisible(btn)) {
				btn.classList.add('open');
				const rect = btn.getBoundingClientRect();
				top = Math.round(rect.bottom + 8);
				left = Math.round(rect.left - 16);
				if (left + mw > window.innerWidth - 12) left = window.innerWidth - mw - 12;
				if (left < 10) left = 10;
			}
			modal.style.top = `${top}px`;
			modal.style.left = `${Math.round(left)}px`;
			modal.classList.add('open');
		}

		static updateTopBarState() {
			const btn = ImissNukeUI._topBtn || document.getElementById('imissnuke-topbar-btn');
			if (!btn) return;
			const isEnabled = (config.masterEnabled !== false);
			btn.classList.toggle('tool-on', isEnabled);
			btn.title = isEnabled
				? 'ImissNuke (on) — click for settings, right-click to turn it off'
				: 'ImissNuke (off) — click for settings, right-click to turn it on';
		}

		static setMaster(on) {
			config.masterEnabled = !!on;
			window.__imissNukeConfig = config;
			saveConfig(config);
			ImissNukeUI.updateTopBarState();
			ImissNukeUI.refreshCanvas();
			if (ImissNukeUI.isOpen()) ImissNukeUI.render();
		}

		static refreshCanvas() {
			if (typeof app === 'undefined' || !app.canvas) return;
			try {
				app.canvas.dirty_bgcanvas = true;
				app.canvas.dirty_canvas = true;
				app.canvas.setDirty(true, true);
				if (app.graph) {
					if (app.graph.change) app.graph.change();
					if (app.graph.setDirtyCanvas) app.graph.setDirtyCanvas(true, true);
				}
				if (app.canvas.draw) app.canvas.draw(true, true);
			} catch (e) {}
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
				btn.addEventListener('click', (e) => {
					e.stopPropagation();
					ImissNukeUI.toggleModal();
				});
				// Right-click turns the whole tool on or off, like the Hotbox's H
				btn.addEventListener('contextmenu', (e) => {
					e.preventDefault();
					e.stopPropagation();
					ImissNukeUI.setMaster(config.masterEnabled === false);
				});
			}
			if (!btn.querySelector('svg')) btn.innerHTML = `<span class="imissnuke-n-icon">${inMarkSVG(24)}</span>`;
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

		/* The whole panel is this table: one row per setting, each with its
		   icon and a short tip on hover. v2.1 (2026-11-09) — Jorge: "sigue
		   siendo mucho texto", so the sentence under every row is gone and
		   lives in `tip`. A row that is not here is not a setting (see FIXED). */
		static get ROWS() {
			return [
				{ key: 'masterEnabled', icon: 'power', label: 'ImissNuke', kind: 'master',
					tip: 'Nuke hotkeys, pipes and backdrops. Right-click the N to flip it.' },
				{ key: 'dKeyMode', icon: 'keyboard', label: 'D Key', kind: 'cycle',
					opts: ['bypass', 'mute'], names: ['Bypass', 'Mute'],
					tip: 'Bypass passes the image through. Mute stops the branch.' },
				{ key: 'nukeLinesEnabled', icon: 'pipes', label: 'Nuke Pipes', kind: 'toggle',
					tip: 'Straight wires with 45° bends. Off: ComfyUI wires.' },
				{ key: 'lineColorMode', icon: 'palette', label: 'Wire Color', kind: 'cycle', needs: 'nukeLinesEnabled',
					opts: ['original', 'nukeDark'], names: ['Original Colors', 'Nuke Black'],
					tip: 'Type colors, or all black like Nuke.' },
				{ key: 'nukeGroupsEnabled', icon: 'group', label: 'Backdrops', kind: 'toggle',
					tip: 'Groups as Nuke backdrops, with run / bypass / mute buttons.' },
				{ key: 'blockOutputDropSearch', icon: 'searchOff', label: 'Output Drop', kind: 'toggle',
					onText: 'Search Blocked', offText: 'Search Opens',
					tip: 'A wire dropped on empty canvas opens the search, or nothing.' }
			];
		}

		/* The keys, as the Hotbox lists its power tools: icon, short name, key
		   chip. `id` = a keyboard key from IN_KEY_DEFAULTS, so its chip is a
		   button that remaps it. `fixed` = a mouse gesture or the Tab: shown,
		   not changed. What each one does is in `tip`, on hover. */
		static get KEYS() {
			return [
				{ fixed: 'LMB drag', icon: 'box', name: 'Box Select', tip: 'Drag on empty canvas to select.' },
				{ fixed: 'MMB+LMB', icon: 'zoom', name: 'Smooth Zoom', tip: 'Drag to zoom. Wacom: pen tip + side button.' },
				{ fixed: 'Tab', icon: 'search', name: 'Node Search', tip: 'Search at the cursor.' },
				{ id: 'find', icon: 'hash', name: 'Find Node', tip: 'Jump to a node by number or name.' },
				{ id: 'frame', icon: 'frame', name: 'Frame', tip: 'Fit the selection, or the whole graph.' },
				{ id: 'layout', icon: 'layout', name: 'Layout', tip: 'Line up the selection along its wires.' },
				{ id: 'bypass', icon: 'bypass', name: 'Bypass / Mute', tip: 'The D Key setting picks which one.' },
				{ id: 'upstream', icon: 'arrowUp', name: 'Select Upstream', tip: 'Add what feeds the selection. Again: one more level.' },
				{ id: 'hideLinks', icon: 'eyeOff', name: 'Hide Links', tip: 'Hide input wires, or Set & Get links.' },
				{ id: 'duplicate', icon: 'copy', name: 'Duplicate', tip: 'A copy without wires.' },
				{ id: 'clone', icon: 'clone', name: 'Clone + Inputs', tip: 'A copy that keeps its input wires.' },
				{ id: 'connect', icon: 'plug', name: 'Connect', tip: 'Wire the selection into the node on the right: image or video first, never a widget.' },
				{ id: 'color', icon: 'palette', name: 'Color', tip: 'Color palette for nodes and groups.' },
				{ id: 'extract', icon: 'scissors', name: 'Extract', tip: 'Pull a node out and bridge its wires. Two nodes: swap them.' },
				{ id: 'swap', icon: 'swap', name: 'Swap Nodes', tip: 'Two selected nodes trade places and wires.' },
				{ id: 'splice', icon: 'splice', name: 'Splice', tip: 'Put a node into a wire.' },
				{ id: 'queue', icon: 'play', name: 'Queue Outputs', tip: 'Run only the selected outputs.' },
				{ fixed: 'Shift+Drop', icon: 'dropWire', name: 'Drop on Wire', tip: 'Drop a dragged node on a wire to splice it in.' },
				{ fixed: 'Ctrl+Shift+Drop', icon: 'dropSwap', name: 'Drop to Swap', tip: 'Drop a dragged node on another to swap them.' }
			];
		}

		static get CSS() {
			return `
.imissnuke-topbar-btn{display:inline-flex !important;align-items:center !important;justify-content:center !important;min-width:32px !important;height:32px !important;padding:0 4px !important;margin:0 3px !important;background:#2b2b34 !important;border:1px solid #3c3c46 !important;border-radius:8px !important;cursor:pointer !important;transition:background-color .15s ease,border-color .15s ease,color .15s ease !important;user-select:none !important;vertical-align:middle !important;box-sizing:border-box !important;box-shadow:none !important}
.imissnuke-topbar-btn.in-grouped{margin:0 !important}
.imissnuke-topbar-btn:hover{background:#383844 !important;border-color:#4c4c58 !important}
.imissnuke-topbar-btn .imissnuke-n-icon{display:flex;align-items:center;justify-content:center;color:#71717a !important}
.imissnuke-topbar-btn .imissnuke-n-icon svg{display:block;width:24px;height:24px}
.imissnuke-topbar-btn:hover .imissnuke-n-icon{color:#e2e8f0 !important}
.imissnuke-topbar-btn.tool-on{background:${IN_LOGO.bg} !important;border-color:#3a2b45 !important}
.imissnuke-topbar-btn.tool-on .imissnuke-n-icon{color:${IN_LOGO.fg} !important}
.imissnuke-topbar-btn.tool-on:hover{background:#2d2236 !important;border-color:#5a4768 !important}
.imissnuke-topbar-btn.open{box-shadow:0 0 0 2px rgba(242,255,89,.4) !important}
#imissnuke-modal{position:fixed;top:46px;left:200px;z-index:2147483000;width:min(440px,94vw);max-height:calc(100vh - 60px);overflow-y:auto;background:var(--p-content-background,var(--comfy-menu-bg,#222222));border:1px solid #3c3c3c;border-radius:8px;padding:16px 18px;box-shadow:0 12px 36px rgba(0,0,0,.6);display:none;flex-direction:column;gap:12px;color:#e2e2e2;font:400 12.5px/1.4 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;box-sizing:border-box;text-align:left}
#imissnuke-modal.open{display:flex}
#imissnuke-modal *{box-sizing:border-box}
#imissnuke-modal .in-t{font:600 14px/1.2 Inter,system-ui,sans-serif;color:#e2e2e2;display:flex;align-items:center;justify-content:space-between;padding-bottom:8px;border-bottom:1px solid #333333}
#imissnuke-modal .in-grid{display:grid;grid-template-columns:128px minmax(0,1fr);align-items:start;gap:10px 12px}
#imissnuke-modal .in-l{display:inline-flex;align-items:center;gap:8px;min-height:30px;white-space:nowrap;color:#9a9a9a;font-weight:500;font-size:12px}
#imissnuke-modal .in-l .in-ico{color:#7aa7e0;flex:none}
#imissnuke-modal .in-c{display:flex;flex-direction:column;align-items:flex-start;gap:6px;min-width:0}
#imissnuke-modal .in-b{display:inline-flex;align-items:center;gap:7px;margin:0;padding:6px 10px;border-radius:6px;border:1px solid #3c3c3c;background:#2a2a2a;color:#f0f0f0;font:500 12.5px/1.2 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;cursor:pointer;white-space:nowrap;transition:background .12s,border-color .12s,color .12s}
#imissnuke-modal .in-b:hover{background:#333333;border-color:#525252;color:#ffffff}
#imissnuke-modal .in-b.on{background:#2d3542;border-color:#5c94f0;color:#ffffff}
#imissnuke-modal .in-b.ghost{background:transparent;border-color:transparent;color:#a8a8a8}
#imissnuke-modal .in-b.ghost:hover{background:#333333;color:#ffffff}
#imissnuke-modal .in-b.in-sq{padding:6px 8px}
#imissnuke-modal .in-b.danger{background:#3a1f1f;border-color:#8a3a3a;color:#ffb4a8}
#imissnuke-modal .in-b small{font-weight:400;opacity:.6}
#imissnuke-modal .in-b .in-ico{color:#8a8a8a}
#imissnuke-modal .in-cyc{gap:9px;min-width:168px;justify-content:space-between}
#imissnuke-modal .in-cyc-v{flex:1;text-align:left;font-weight:600}
#imissnuke-modal .in-dots{display:inline-flex;gap:3px}
#imissnuke-modal .in-dots i{width:5px;height:5px;border-radius:50%;background:#4a4a4a}
#imissnuke-modal .in-dots i.on{background:#64a8f0}
#imissnuke-modal .in-fold{min-width:168px;justify-content:space-between}
#imissnuke-modal .in-off{opacity:.38;pointer-events:none;filter:grayscale(.6)}
#imissnuke-modal .in-btns{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
#imissnuke-modal .in-in{width:168px;font:500 12.5px/1.2 Inter,system-ui,sans-serif;color:#e6e6e6;background:#111111;border:1px solid #3a3a3a;border-radius:6px;padding:6px 8px;outline:none}
#imissnuke-modal .in-in:focus{border-color:#64a8f0}
#imissnuke-modal .in-path{width:100%;font:500 11px/1.4 "JetBrains Mono",ui-monospace,Consolas,monospace;color:#cfd6e0;background:#161616;border:1px solid #333333;border-radius:6px;padding:6px 8px;word-break:break-all;user-select:text;cursor:text}
#imissnuke-modal .in-kl{grid-column:1/-1;display:flex;flex-direction:column;gap:1px;margin-top:-4px;padding:4px;background:rgba(0,0,0,.18);border:1px solid #303030;border-radius:6px}
#imissnuke-modal .in-kr{display:flex;align-items:center;gap:10px;padding:5px 8px;border-radius:6px;border:1px solid transparent}
#imissnuke-modal .in-kr:hover{background:#262626;border-color:#333333}
#imissnuke-modal .in-kr > .in-ico{color:#9aa4b2;flex:none}
#imissnuke-modal .in-kn{flex:1;min-width:0;font:500 12.5px/1.25 Inter,system-ui,sans-serif;color:#e6e6e6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#imissnuke-modal .in-kc{margin:0;flex:none;min-width:24px;text-align:center;font:500 10.5px/1 "JetBrains Mono",ui-monospace,Consolas,monospace;color:#9a9a9a;background:#262626;border:1px solid #3a3a3a;border-radius:4px;padding:3px 6px;cursor:pointer;transition:border-color .12s,color .12s}
#imissnuke-modal button.in-kc:hover{color:#ffffff;border-color:#5c94f0}
#imissnuke-modal .in-kc.mod{color:#cfe2ff;border-color:#3f6aa8}
#imissnuke-modal .in-kc.none{color:#5a5a5a;border-style:dashed}
#imissnuke-modal .in-kc.rec{color:#211927;background:#F2FF59;border-color:#F2FF59;animation:in-blink 1s ease-in-out infinite}
#imissnuke-modal .in-kc.fixed{background:transparent;border-color:#2e2e2e;color:#6e6e6e;cursor:default}
#imissnuke-modal .in-st{font-size:11px;line-height:1.35;color:#8a8a8a}
#imissnuke-modal .in-kl .in-st{padding:4px 8px 2px}
#imissnuke-modal .in-st.ok{color:#7fbf8f}
#imissnuke-modal .in-st.err{color:#e8735f}
#imissnuke-modal .in-foot{display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px solid #333333}
@keyframes in-blink{50%{opacity:.55}}
.in-tip{position:fixed;z-index:2147483640;max-width:280px;padding:8px 10px;border-radius:8px;background:#111113;border:1px solid #3a3a3e;color:#dcdcdc;font:400 11.5px/1.45 Inter,system-ui,sans-serif;box-shadow:0 10px 28px rgba(0,0,0,.5);pointer-events:none;opacity:0;transform:translateY(-2px);transition:opacity 90ms ease,transform 90ms ease}
.in-tip.on{opacity:1;transform:none}
`;
		}

		static control(r) {
			if (r.kind === 'cycle') {
				const i = Math.max(0, r.opts.indexOf(config[r.key]));
				return `<button type="button" class="in-b in-cyc" data-in-cycle="${r.key}">`
					+ `<span class="in-cyc-v">${r.names[i]}</span>`
					+ `<span class="in-dots">${r.opts.map((o, j) => `<i${j === i ? ' class="on"' : ''}></i>`).join('')}</span>`
					+ inIco('sync', 12) + '</button>';
			}
			const v = !!config[r.key];
			const txt = r.kind === 'master'
				? (v ? '● Enabled' : '○ Disabled')
				: (v ? '● ' + (r.onText || 'On') : '○ ' + (r.offText || 'Off'));
			return `<button type="button" class="in-b${v ? ' on' : ''}" data-in-toggle="${r.key}">${txt}</button>`;
		}

		// One key: icon, name, and its chip. A keyboard key's chip is the remap
		// button (click, then press); a fixed one is just a label.
		static keyRow(k) {
			let chip;
			if (!k.id) {
				chip = `<span class="in-kc fixed" data-in-tip="Fixed">${inEsc(k.fixed)}</span>`;
			} else {
				const b = keymap[k.id];
				const def = buildKeymap({})[k.id];
				const rec = ImissNukeUI._binding === k.id;
				const mod = !inKeySame(inKeyNorm(b), inKeyNorm(def));
				const cls = rec ? ' rec' : !b ? ' none' : mod ? ' mod' : '';
				const tip = rec ? 'Press the new key · Esc cancels · Backspace clears it'
					: 'Click to change' + (mod ? ' · right-click: back to ' + inKeyLabel(def) : '');
				chip = `<button type="button" class="in-kc${cls}" data-in-bind="${k.id}" data-in-tip="${inEsc(tip)}">`
					+ (rec ? 'Press a key…' : inEsc(inKeyLabel(b))) + '</button>';
			}
			return `<div class="in-kr" data-in-tip="${inEsc(k.tip)}">${inIco(k.icon, 15)}<span class="in-kn">${inEsc(k.name)}</span>${chip}</div>`;
		}

		static presetsHTML() {
			const L = IN_PRESETS.list;
			const i = L.findIndex(p => p.name === IN_PRESETS.active);
			const cur = i >= 0 ? L[i] : null;
			const arm = !!ImissNukeUI._delArm;
			let h = '';
			if (L.length) {
				h += `<div class="in-btns">`
					+ `<button type="button" class="in-b in-cyc" data-in-preset data-in-tip="Click for the next preset: its settings and keys come with it">`
						+ `<span class="in-cyc-v">${cur ? inEsc(cur.name) + (inPresetDirty() ? ' <small>· changed</small>' : '') : '<small>None in use</small>'}</span>`
						+ `<span class="in-dots">${L.map((p, j) => `<i${j === i ? ' class="on"' : ''}></i>`).join('')}</span>`
						+ inIco('sync', 12) + `</button>`
					+ (cur ? `<button type="button" class="in-b in-sq${arm ? ' danger' : ''}" data-in-pdel data-in-tip="${arm ? 'Click again to delete it' : 'Delete this preset'}">`
						+ inIco('trash', 13) + (arm ? '<span>Delete?</span>' : '') + `</button>` : '')
				+ `</div>`;
			}
			if (typeof ImissNukeUI._naming === 'string') {
				h += `<div class="in-btns">`
					+ `<input type="text" class="in-in" data-in-pname maxlength="40" spellcheck="false" placeholder="Preset name" value="${inEsc(ImissNukeUI._naming)}">`
					+ `<button type="button" class="in-b on" data-in-pok>${inIco('check', 13)}<span>Save</span></button>`
				+ `</div>`;
			} else {
				h += `<div class="in-btns"><button type="button" class="in-b" data-in-psave data-in-tip="Keep the settings and keys in use under a name. The same name updates it">`
					+ `${inIco('floppy', 13)}<span>Save Preset…</span></button></div>`;
			}
			return h;
		}

		static render() {
			const modal = document.getElementById('imissnuke-modal');
			if (!modal) return;
			if (ImissNukeUI._tip) ImissNukeUI._tip.classList.remove('on');
			const on = config.masterEnabled !== false;
			const keysOpen = !!ImissNukeUI._keysOpen;
			const rows = ImissNukeUI.ROWS.map(r => {
				const dim = (r.kind !== 'master' && !on) || (r.needs && !config[r.needs]);
				const cls = dim ? ' in-off' : '';
				const tip = ` data-in-tip="${inEsc(r.tip)}"`;
				return `<label class="in-l${cls}"${tip}>${inIco(r.icon, 14)}<span>${r.label}</span></label>`
					+ `<div class="in-c${cls}"${tip}>${ImissNukeUI.control(r)}</div>`;
			}).join('');
			const nMod = Object.keys(keymapOverrides(keymap)).length;
			const kmsg = ImissNukeUI._kmsg, msg = ImissNukeUI._msg;
			// a message shows under the row whose button made it
			const msgAt = (at) => (msg && (msg.at || 'backup') === at
				? `<div class="in-st ${msg.cls}">${inEsc(msg.text)}</div>` : '');
			const keyList = keysOpen
				? `<div class="in-kl">${ImissNukeUI.KEYS.map(ImissNukeUI.keyRow).join('')}`
					+ (kmsg ? `<div class="in-st ${kmsg.cls}">${inEsc(kmsg.text)}</div>` : '') + `</div>`
				: '';

			modal.innerHTML =
				`<div class="in-t">`
					+ `<span style="display:inline-flex;align-items:center;gap:8px">${inLogoChip(20)}<span>ImissNuke Settings</span></span>`
					+ `<button type="button" class="in-b ghost" data-in-close title="Close">✕</button>`
				+ `</div>`
				+ `<div class="in-grid">${rows}`
					+ `<label class="in-l">${inIco('keyboard', 14)}<span>Shortcuts</span></label>`
					+ `<div class="in-c">`
						+ `<button type="button" class="in-b in-fold" data-in-keys data-in-tip="Click a key to change it">`
							+ `<span>${ImissNukeUI.KEYS.length} keys${nMod ? ` <small>· ${nMod} changed</small>` : ''}</span>`
							+ inIco(keysOpen ? 'chevDown' : 'chevRight', 13) + `</button>`
					+ `</div>`
					+ keyList
					+ `<label class="in-l">${inIco('bookmark', 14)}<span>Presets</span></label>`
					+ `<div class="in-c">${ImissNukeUI.presetsHTML()}${msgAt('presets')}</div>`
					+ `<label class="in-l">${inIco('folder', 14)}<span>Saved In</span></label>`
					+ `<div class="in-c">`
						+ `<div class="in-path" data-in-tip="${IN_PRESETS.host ? 'Your presets are written to this file in your own home folder, so they are yours on any browser' : 'Your presets are written to this file, so they follow you to any browser on this ComfyUI'}">${inEsc(inPresetsPath())}</div>`
						// the folder cannot be reached yet (no Nuke): said in grey, not an error
						+ (IN_PRESETS.host && IN_PRESETS.hostWait ? `<div class="in-st">${inEsc(IN_PRESETS.hostWait)} · kept in this browser</div>` : '')
						+ `<div class="in-btns">`
							+ `<button type="button" class="in-b" data-in-copy="file" data-in-tip="Copy the full path of the file">${inIco('copy', 13)}<span>Copy Path</span></button>`
							+ `<button type="button" class="in-b" data-in-copy="dir" data-in-tip="Copy the path of the folder">${inIco('copy', 13)}<span>Copy Folder Path</span></button>`
						+ `</div>${msgAt('path')}`
					+ `</div>`
					+ `<label class="in-l">${inIco('save', 14)}<span>Backup &amp; Share</span></label>`
					+ `<div class="in-c"><div class="in-btns">`
						+ `<button type="button" class="in-b" data-in-export data-in-tip="Download your presets as a .json: a backup, or to give to someone">${inIco('save', 13)}<span>Download a Copy</span></button>`
						+ `<button type="button" class="in-b" data-in-import data-in-tip="Open an ImissNuke presets .json. Its presets join yours; nothing is overwritten">${inIco('upload', 13)}<span>Load from File…</span></button>`
					+ `</div>${msgAt('backup')}</div>`
				+ `</div>`
				+ `<div class="in-foot">`
					+ `<button type="button" class="in-b ghost" data-in-reset data-in-tip="Factory settings and keys. Saved presets stay">${inIco('sync', 12)}<span>Reset to Defaults</span></button>`
					+ `<button type="button" class="in-b" data-in-close>Done</button>`
				+ `</div>`;

			const $ = (s) => modal.querySelector(s);
			modal.querySelectorAll('[data-in-close]').forEach(b => { b.onclick = ImissNukeUI.closeModal; });
			modal.querySelectorAll('[data-in-toggle]').forEach(b => {
				b.onclick = () => {
					const k = b.getAttribute('data-in-toggle');
					config[k] = !config[k];
					ImissNukeUI.changed(k);
				};
			});
			modal.querySelectorAll('[data-in-cycle]').forEach(b => {
				b.onclick = () => {
					const k = b.getAttribute('data-in-cycle');
					const r = ImissNukeUI.ROWS.find(x => x.key === k);
					config[k] = r.opts[(Math.max(0, r.opts.indexOf(config[k])) + 1) % r.opts.length];
					ImissNukeUI.changed(k);
				};
			});
			const kb = $('[data-in-keys]');
			if (kb) {
				kb.onclick = () => {
					ImissNukeUI._keysOpen = !ImissNukeUI._keysOpen;
					ImissNukeUI._binding = null;
					ImissNukeUI._kmsg = null;
					ImissNukeUI.render();
				};
			}
			modal.querySelectorAll('[data-in-bind]').forEach(b => {
				const id = b.getAttribute('data-in-bind');
				b.onclick = () => {
					ImissNukeUI._binding = ImissNukeUI._binding === id ? null : id;
					ImissNukeUI._kmsg = null;
					ImissNukeUI.render();
				};
				b.oncontextmenu = (ev) => {
					ev.preventDefault();
					ImissNukeUI.rebind(id, buildKeymap({})[id]);
				};
			});

			// ---- Presets ----
			const pc = $('[data-in-preset]');
			if (pc) {
				pc.onclick = () => {
					const L = IN_PRESETS.list;
					if (!L.length) return;
					const i = L.findIndex(p => p.name === IN_PRESETS.active);
					inPresetApply(L[(i + 1) % L.length]);
					ImissNukeUI._delArm = false;
					ImissNukeUI._msg = null;
					inPresetsSave();
					ImissNukeUI.changed('*');
				};
			}
			const pd = $('[data-in-pdel]');
			if (pd) {
				pd.onclick = () => {
					if (!ImissNukeUI._delArm) {
						ImissNukeUI._delArm = true;
						clearTimeout(ImissNukeUI._delT);
						ImissNukeUI._delT = setTimeout(() => {
							if (!ImissNukeUI._delArm) return;
							ImissNukeUI._delArm = false;
							if (ImissNukeUI.isOpen() && typeof ImissNukeUI._naming !== 'string') ImissNukeUI.render();
						}, 3000);
						ImissNukeUI.render();
						return;
					}
					const name = IN_PRESETS.active;
					IN_PRESETS.list = IN_PRESETS.list.filter(p => p.name !== name);
					IN_PRESETS.active = '';
					ImissNukeUI._delArm = false;
					ImissNukeUI._msg = { text: `Deleted “${name}”`, cls: '', at: 'presets' };
					inPresetsSave();
					ImissNukeUI.render();
				};
			}
			const ps = $('[data-in-psave]');
			if (ps) {
				ps.onclick = () => {
					const cur = inPresetFind(IN_PRESETS.active);
					ImissNukeUI._naming = cur ? cur.name : `Preset ${IN_PRESETS.list.length + 1}`;
					ImissNukeUI._msg = null;
					ImissNukeUI.render();
					const inp = modal.querySelector('[data-in-pname]');
					if (inp) { try { inp.focus(); inp.select(); } catch (e) {} }
				};
			}
			const pn = $('[data-in-pname]');
			if (pn) {
				pn.oninput = () => { ImissNukeUI._naming = pn.value; };
				pn.onkeydown = (ev) => {
					if (ev.key === 'Enter') { ev.preventDefault(); ImissNukeUI.savePreset(pn.value); }
				};
			}
			const pok = $('[data-in-pok]');
			if (pok) pok.onclick = () => ImissNukeUI.savePreset(pn ? pn.value : '');

			// ---- Backup & Share ----
			const ex = $('[data-in-export]');
			if (ex) {
				ex.onclick = () => {
					const name = inPresetsExport();
					ImissNukeUI._msg = { text: `✓ ${name}`, cls: 'ok' };
					ImissNukeUI.render();
				};
			}
			const im = $('[data-in-import]');
			if (im) im.onclick = () => ImissNukeUI.importFile();
			modal.querySelectorAll('[data-in-copy]').forEach(b => {
				b.onclick = () => {
					const dir = b.getAttribute('data-in-copy') === 'dir';
					const text = dir ? inPresetsDir() : inPresetsPath();
					// no clipboard (http, an old browser): the path itself, to select
					const said = (ok) => {
						ImissNukeUI._msg = { text: ok ? `✓ ${dir ? 'Folder path' : 'Path'} copied` : text, cls: ok ? 'ok' : '', at: 'path' };
						if (ImissNukeUI.isOpen()) ImissNukeUI.render();
					};
					try { navigator.clipboard.writeText(text).then(() => said(true), () => said(false)); } catch (e) { said(false); }
				};
			});

			const rb = $('[data-in-reset]');
			if (rb) {
				rb.onclick = () => {
					Object.assign(config, USER_DEFAULTS);
					inKeymapSet({});
					ImissNukeUI._binding = null;
					ImissNukeUI._kmsg = null;
					ImissNukeUI._msg = null;
					if (IN_PRESETS.active) { IN_PRESETS.active = ''; inPresetsSave(); }
					ImissNukeUI.changed('*');
				};
			}
		}

		static changed(key) {
			window.__imissNukeConfig = config;
			saveConfig(config);
			ImissNukeUI.updateTopBarState();
			ImissNukeUI.refreshCanvas();
			ImissNukeUI.render();
		}

		// A key goes to `id`. If another action had it, the two trade keys,
		// so no press ever fires two things.
		static rebind(id, b) {
			const nb = inKeyNorm(b);
			const old = keymap[id] ? { ...keymap[id] } : null;
			let note = null;
			if (nb) {
				for (const other of Object.keys(keymap)) {
					if (other === id || !inKeyClash(keymap[other], nb)) continue;
					keymap[other] = old ? { ...old } : null;
					const nm = (ImissNukeUI.KEYS.find(k => k.id === other) || {}).name || other;
					note = { text: old ? `${nm} moved to ${inKeyLabel(old)}` : `${nm} has no key now`, cls: '' };
				}
			}
			keymap[id] = nb;
			saveKeymap(keymap);
			ImissNukeUI._binding = null;
			ImissNukeUI._kmsg = note;
			ImissNukeUI.render();
		}

		// While a chip waits for its key, the press is the new key and
		// nothing else gets it (window, capture: before the canvas and ComfyUI)
		static onBindKey(e) {
			const id = ImissNukeUI._binding;
			if (!id || !ImissNukeUI.isOpen()) return;
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
			const k = String(e.key || '');
			if (/^(Shift|Control|Alt|Meta|AltGraph|CapsLock|OS|Fn|Dead|Unidentified)$/.test(k)) return;
			if (k === 'Escape') { ImissNukeUI._binding = null; ImissNukeUI.render(); return; }
			const mods = inKeyMods(e);
			if (!mods && (k === 'Backspace' || k === 'Delete')) { ImissNukeUI.rebind(id, null); return; }
			const b = { key: k.toLowerCase(), code: String(e.code || ''), mods };
			const why = inKeyReserved(b);
			if (why) { ImissNukeUI._kmsg = { text: why, cls: 'err' }; ImissNukeUI.render(); return; }
			ImissNukeUI.rebind(id, b);
		}

		static savePreset(raw) {
			const name = String(raw || '').trim().slice(0, 40);
			ImissNukeUI._naming = null;
			if (!name) { ImissNukeUI.render(); return; }
			const p = inPresetNow(name);
			const old = inPresetFind(name);
			if (old) IN_PRESETS.list[IN_PRESETS.list.indexOf(old)] = p;
			else IN_PRESETS.list.push(p);
			IN_PRESETS.active = p.name;
			ImissNukeUI._delArm = false;
			ImissNukeUI._msg = { text: `✓ ${old ? 'Updated' : 'Saved'} “${p.name}”`, cls: 'ok', at: 'presets' };
			inPresetsSave();
			ImissNukeUI.render();
		}

		static importFile() {
			const inp = document.createElement('input');
			inp.type = 'file';
			inp.accept = '.json,application/json';
			inp.style.display = 'none';
			inp.onchange = () => {
				const f = inp.files && inp.files[0];
				inp.remove();
				if (!f) return;
				f.text().then(t => {
					let d = null;
					try { d = JSON.parse(t); } catch (e) { d = null; }
					const r = inPresetsImport(d);
					if (!r.pick) {
						ImissNukeUI._msg = { text: 'That file has no ImissNuke presets', cls: 'err' };
						ImissNukeUI.render();
						return;
					}
					inPresetApply(r.pick);
					ImissNukeUI._msg = {
						text: r.added.length > 1 ? `✓ Loaded ${r.added.length} presets · using “${r.pick.name}”` : `✓ Loaded “${r.pick.name}”`,
						cls: 'ok'
					};
					inPresetsSave();
					ImissNukeUI.changed('*');
				}).catch(() => {});
			};
			document.body.appendChild(inp);
			inp.click();
		}

		static init() {
			if (document.getElementById('imissnuke-ui-root')) return;

			const root = document.createElement('div');
			root.id = 'imissnuke-ui-root';
			root.innerHTML = `<style>${ImissNukeUI.CSS}</style>`
				+ `<div id="imissnuke-modal" role="dialog" aria-label="ImissNuke Settings"></div>`;
			document.body.appendChild(root);

			ImissNukeUI.setupTopBarMounting();
			ImissNukeUI.render();
			inPresetsLoad();
			inPresetsWhere();

			window.addEventListener('keydown', ImissNukeUI.onBindKey, true);

			// A click anywhere else closes it; so does Esc (Esc in the name box
			// only drops the name)
			document.addEventListener('pointerdown', (e) => {
				if (!ImissNukeUI.isOpen()) return;
				const m = document.getElementById('imissnuke-modal');
				const b = document.getElementById('imissnuke-topbar-btn');
				if ((m && m.contains(e.target)) || (b && b.contains(e.target))) return;
				ImissNukeUI.closeModal();
			});
			document.addEventListener('keydown', (e) => {
				if (e.key !== 'Escape' || !ImissNukeUI.isOpen()) return;
				e.stopPropagation();
				if (typeof ImissNukeUI._naming === 'string') { ImissNukeUI._naming = null; ImissNukeUI.render(); return; }
				ImissNukeUI.closeModal();
			}, true);

			// One floating tip for anything with data-in-tip, as the Hotbox
			// does it: on body, so the scrolling panel never clips it
			document.addEventListener('mouseover', (e) => {
				const t = e.target && e.target.closest ? e.target.closest('[data-in-tip]') : null;
				if (!t) return;
				let tip = ImissNukeUI._tip;
				if (!tip) {
					tip = ImissNukeUI._tip = document.createElement('div');
					tip.className = 'in-tip';
					document.body.appendChild(tip);
				}
				tip.textContent = t.getAttribute('data-in-tip') || '';
				tip.style.left = '0px';
				tip.style.top = '0px';
				const r = t.getBoundingClientRect(), tr = tip.getBoundingClientRect();
				let y = r.bottom + 6;
				if (y + tr.height > (window.innerHeight || 900) - 10) y = r.top - tr.height - 6;
				tip.style.left = Math.max(10, Math.min((window.innerWidth || 1600) - tr.width - 10, r.left)) + 'px';
				tip.style.top = Math.max(10, y) + 'px';
				tip.classList.add('on');
			}, true);
			document.addEventListener('mouseout', (e) => {
				const t = e.target && e.target.closest ? e.target.closest('[data-in-tip]') : null;
				if (t && !(e.relatedTarget && t.contains(e.relatedTarget)) && ImissNukeUI._tip) ImissNukeUI._tip.classList.remove('on');
			}, true);
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
