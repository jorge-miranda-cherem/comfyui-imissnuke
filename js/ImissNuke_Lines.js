/**
 * ============================================================================
 * ImissNuke - Nuke Pipe Lines Engine
 * ============================================================================
 * Clean, high-performance rendering engine integrating QuickConnections MapLinks:
 *  - Faithful QuickConnections MapLinks obstacle avoidance and output bundling
 *  - Intercepts renderLink, drawLink, and drawConnections across all LiteGraph targets
 *  - 45° and 90° beveled bends with quadratic fillet corners
 *  - Wire color (the panel's one setting here): Original Colors (ComfyUI slot
 *    type colors, the default) or Nuke Black (#000000)
 *  - Wires into the selection: Foundry Nuke Amber (#e58c2c)
 *  - Fixed since v2 (2026-11-08): medium pipe (2.5px), no flow arrows
 *  - Zero glow / zero shadowBlur at all times
 * ============================================================================
 */

(function () {
	'use strict';

	// ---- FAST LIANG-BARSKY LINE CLIPPING (FROM QUICKCONNECTIONS) ----
	const EPSILON = 1e-6;
	const INSIDE = 1;
	const OUTSIDE = 0;

	function clipT(num, denom, c) {
		const tE = c[0], tL = c[1];
		if (Math.abs(denom) < EPSILON) return num < 0;
		const t = num / denom;
		if (denom > 0) {
			if (t > tL) return 0;
			if (t > tE) c[0] = t;
		} else {
			if (t < tE) return 0;
			if (t < tL) c[1] = t;
		}
		return 1;
	}

	function liangBarsky(a, b, box, da, db) {
		const x1 = a[0], y1 = a[1];
		const x2 = b[0], y2 = b[1];
		const dx = x2 - x1;
		const dy = y2 - y1;
		if (da === undefined || db === undefined) {
			da = a;
			db = b;
		} else {
			da[0] = a[0];
			da[1] = a[1];
			db[0] = b[0];
			db[1] = b[1];
		}
		if (Math.abs(dx) < EPSILON &&
			Math.abs(dy) < EPSILON &&
			x1 >= box[0] &&
			x1 <= box[2] &&
			y1 >= box[1] &&
			y1 <= box[3]) {
			return INSIDE;
		}
		const c = [0, 1];
		if (clipT(box[0] - x1, dx, c) &&
			clipT(x1 - box[2], -dx, c) &&
			clipT(box[1] - y1, dy, c) &&
			clipT(y1 - box[3], -dy, c)) {
			const tE = c[0], tL = c[1];
			if (tL < 1) {
				db[0] = x1 + tL * dx;
				db[1] = y1 + tL * dy;
			}
			if (tE > 0) {
				da[0] += tE * dx;
				da[1] += tE * dy;
			}
			return INSIDE;
		}
		return OUTSIDE;
	}

	// ComfyUI standard slot type colors
	const COMFY_TYPE_COLORS = {
		"MODEL": "#b582d9",
		"CLIP": "#ffd54f",
		"VAE": "#ff6e6e",
		"IMAGE": "#64b5f6",
		"MASK": "#81c784",
		"LATENT": "#ff9800",
		"CONDITIONING": "#ff9cf9",
		"CONTROL_NET": "#00e5ff",
		"STYLE_MODEL": "#26a69a",
		"CLIP_VISION": "#ab47bc",
		"CLIP_VISION_OUTPUT": "#ab47bc",
		"NOISE": "#78909c",
		"GUIDER": "#80cbc4",
		"SAMPLER": "#ffb74d",
		"SIGMAS": "#aed581",
		"STRING": "#a5d6a7",
		"INT": "#29b6f6",
		"FLOAT": "#4dd0e1",
		"BOOLEAN": "#ba68c8",
		"COMBO": "#ff8a65",
		"CUSTOM": "#90caf9",
		"*": "#e0e0e0"
	};

	function getConfig() {
		return window.__imissNukeConfig || {
			masterEnabled: true,
			nukeLinesEnabled: true,
			nukeHighlightSelected: true,
			pipeStyle: 'beveled',
			lineColorMode: 'original',
			selectionColorMode: 'amber',
			pipeCornerRadius: 7,
			pipeWidth: 2.5,
			avoidNodes: true,
			highlightUpstreamOnly: true
		};
	}

	function resolveLinkColor(link, color, cfg, isSelected, graph, canvas) {
		if (isSelected) {
			return (cfg.selectionColorMode === 'white') ? '#ffffff' : '#e58c2c'; // Amber (Foundry Nuke) or White
		}

		if (cfg.lineColorMode === 'original') {
			let linkObj = link;
			if (typeof link === 'number' && graph && graph.links) {
				linkObj = graph.links[link];
			}

			if (linkObj && typeof linkObj === 'object' && linkObj.color) {
				return linkObj.color;
			}

			let type = linkObj?.type || null;
			if (!type && linkObj && graph && linkObj.origin_id !== undefined) {
				const src = graph.getNodeById(linkObj.origin_id);
				if (src && src.outputs && src.outputs[linkObj.origin_slot]) {
					type = src.outputs[linkObj.origin_slot].type;
				}
			}

			if (type) {
				const typeStr = String(type).toUpperCase();
				if (canvas?.default_connection_color_byType) {
					if (canvas.default_connection_color_byType[type]) return canvas.default_connection_color_byType[type];
					if (canvas.default_connection_color_byType[typeStr]) return canvas.default_connection_color_byType[typeStr];
				}
				if (typeof LGraphCanvas !== 'undefined' && LGraphCanvas.link_type_colors) {
					if (LGraphCanvas.link_type_colors[type]) return LGraphCanvas.link_type_colors[type];
					if (LGraphCanvas.link_type_colors[typeStr]) return LGraphCanvas.link_type_colors[typeStr];
				}
				if (COMFY_TYPE_COLORS[typeStr]) return COMFY_TYPE_COLORS[typeStr];
				if (COMFY_TYPE_COLORS[type]) return COMFY_TYPE_COLORS[type];
			}

			if (color && typeof color === 'string' && color !== '#94a3b8' && color !== '#000000' && color !== '#101014') {
				return color;
			}

			if (canvas?.default_connection_color?.input_on) {
				return canvas.default_connection_color.input_on;
			}

			return '#64b5f6';
		}

		// Nuke Default: Solid pure black line
		return '#000000';
	}

	// Subgraph proxies for subgraph nodes support
	class SubgraphSlotProxy {
		constructor(slot) {
			this.slot = slot;
		}
		get links() {
			return this.slot.linkIds;
		}
	}

	class SubgraphInOutNodeProxy {
		constructor(subgraphNode, isInput) {
			this.subgraphNode = subgraphNode;
			this.isInput = isInput;
			this.slots = [];
			for (const slot of this.subgraphNode.slots) {
				this.slots.push(new SubgraphSlotProxy(slot));
			}
		}
		get id() {
			return this.subgraphNode.id;
		}
		get outputs() {
			if (!this.isInput) return [];
			return this.slots;
		}
		getSlotPosition(slot) {
			return this.subgraphNode.slots[slot].pos;
		}
		getInputPos(slot) {
			return this.getSlotPosition(slot);
		}
		getOutputPos(slot) {
			return this.getSlotPosition(slot);
		}
		getBounding(area) {
			area[0] = this.subgraphNode.boundingRect[0];
			area[1] = this.subgraphNode.boundingRect[1];
			area[2] = this.subgraphNode.boundingRect[2];
			area[3] = this.subgraphNode.boundingRect[3];
			return area;
		}
	}

	// ---- MAPLINKS ENGINE (DIRECTLY FROM QUICKCONNECTIONS) ----
	class MapLinks {
		constructor(canvas, config) {
			this.canvas = canvas;
			this.nodesByRight = [];
			this.nodesById = {};
			this.paths = [];
			this.pathsByLinkId = {};
			this.config = {
				lineSpace: (typeof LiteGraph !== 'undefined' && LiteGraph.NODE_SLOT_HEIGHT)
					? Math.floor(LiteGraph.NODE_SLOT_HEIGHT / 2)
					: 10,
				nodeSpace: [-10, -6, 14, 8],
				...config
			};
			this.maxDirectLineDistance = 20; // Prefer 90° or 45° bends (QuickConnections default)
			this.debug = false;
		}

		isInsideNode(xy) {
			for (let i = 0; i < this.nodesByRight.length; ++i) {
				const nodeI = this.nodesByRight[i];
				if (nodeI.node.isPointInside && nodeI.node.isPointInside(xy[0], xy[1])) {
					return nodeI.node;
				}
			}
			return null;
		}

		findClippedNode(outputXY, inputXY) {
			let closestDistance = Number.MAX_SAFE_INTEGER;
			let closest = null;

			for (let i = 0; i < this.nodesByRight.length; ++i) {
				const node = this.nodesByRight[i];
				const clipA = [-1, -1];
				const clipB = [-1, -1];
				const clipped = liangBarsky(
					outputXY,
					inputXY,
					node.area,
					clipA,
					clipB
				);

				if (clipped === INSIDE) {
					const centerX = (node.area[0] + ((node.area[2] - node.area[0]) / 2));
					const centerY = (node.area[1] + ((node.area[3] - node.area[1]) / 2));
					const dist = Math.hypot(centerX - outputXY[0], centerY - outputXY[1]);
					if (dist < closestDistance) {
						closest = {
							start: clipA,
							end: clipB,
							node,
						};
						closestDistance = dist;
					}
				}
			}
			return { clipped: closest, closestDistance };
		}

		testPath(path) {
			const len1 = (path.length - 1);
			for (let p = 0; p < len1; ++p) {
				const { clipped } = this.findClippedNode(path[p], path[p + 1]);
				if (clipped) return clipped;
			}
			return null;
		}

		mapFinalLink(outputXY, inputXY) {
			const { clipped } = this.findClippedNode(outputXY, inputXY);
			if (!clipped) {
				const dist = Math.hypot(outputXY[0] - inputXY[0], outputXY[1] - inputXY[1]);
				if (dist < this.maxDirectLineDistance) {
					return { path: [outputXY, inputXY] };
				}
			}

			const horzDistance = inputXY[0] - outputXY[0];
			const vertDistance = inputXY[1] - outputXY[1];
			const horzDistanceAbs = Math.abs(horzDistance);
			const vertDistanceAbs = Math.abs(vertDistance);

			if (horzDistanceAbs > vertDistanceAbs) {
				const goingLeft = inputXY[0] < outputXY[0];
				const pathStraight45 = [
					[outputXY[0], outputXY[1]],
					[inputXY[0] - (goingLeft ? -vertDistanceAbs : vertDistanceAbs), outputXY[1]],
					[inputXY[0], inputXY[1]],
				];
				if (!this.testPath(pathStraight45)) {
					return { path: pathStraight45 };
				}

				const path45Straight = [
					[outputXY[0], outputXY[1]],
					[outputXY[0] + (goingLeft ? -vertDistanceAbs : vertDistanceAbs), inputXY[1]],
					[inputXY[0], inputXY[1]],
				];
				if (!this.testPath(path45Straight)) {
					return { path: path45Straight };
				}
			} else {
				const goingUp = inputXY[1] < outputXY[1];
				const pathStraight45 = [
					[outputXY[0], outputXY[1]],
					[outputXY[0], inputXY[1] + (goingUp ? horzDistanceAbs : -horzDistanceAbs)],
					[inputXY[0], inputXY[1]],
				];
				if (!this.testPath(pathStraight45)) {
					return { path: pathStraight45 };
				}

				const path45Straight = [
					[outputXY[0], outputXY[1]],
					[inputXY[0], outputXY[1] - (goingUp ? horzDistanceAbs : -horzDistanceAbs)],
					[inputXY[0], inputXY[1]],
				];
				if (!this.testPath(path45Straight)) {
					return { path: path45Straight };
				}
			}

			const path90Straight = [
				[outputXY[0], outputXY[1]],
				[outputXY[0], inputXY[1]],
				[inputXY[0], inputXY[1]],
			];
			const clippedVert = this.testPath(path90Straight);
			if (!clippedVert) {
				return { path: path90Straight };
			}

			const pathStraight90 = [
				[outputXY[0], outputXY[1]],
				[inputXY[0], outputXY[1]],
				[inputXY[0], inputXY[1]],
			];
			const clippedHorz = this.testPath(pathStraight90);
			if (!clippedHorz) {
				return { path: pathStraight90 };
			}

			return { clippedHorz, clippedVert };
		}

		mapLink(outputXY, inputXY, targetNodeInfo, isBlocked, lastDirection) {
			const { clippedHorz, clippedVert, path } = this.mapFinalLink(outputXY, inputXY);
			if (path) return path;

			const horzDistance = inputXY[0] - outputXY[0];
			const vertDistance = inputXY[1] - outputXY[1];
			const horzDistanceAbs = Math.abs(horzDistance);
			const vertDistanceAbs = Math.abs(vertDistance);

			let blockedNodeId;
			let pathAvoidNode;
			let lastPathLocation;
			let linesArea;
			let thisDirection = null;

			if (horzDistanceAbs > vertDistanceAbs) {
				const activeClip = (clippedHorz && clippedHorz.node) ? clippedHorz : clippedVert;
				if (!activeClip || !activeClip.node) return [outputXY, inputXY];

				blockedNodeId = activeClip.node.node.id;
				linesArea = activeClip.node.linesArea;
				const horzEdge = horzDistance <= 0 ? linesArea[2] : (linesArea[0] - 1);
				pathAvoidNode = [
					[outputXY[0], outputXY[1]],
					[horzEdge, outputXY[1]],
				];

				if (horzDistance <= 0) {
					linesArea[2] += this.config.lineSpace;
				} else {
					linesArea[0] -= this.config.lineSpace;
				}

				const vertDistanceViaBlockTop =
					Math.abs(inputXY[1] - linesArea[1]) +
					Math.abs(linesArea[1] - outputXY[1]);
				const vertDistanceViaBlockBottom =
					Math.abs(inputXY[1] - linesArea[3]) +
					Math.abs(linesArea[3] - outputXY[1]);

				lastPathLocation = [
					horzEdge,
					vertDistanceViaBlockTop <= vertDistanceViaBlockBottom ? linesArea[1] : linesArea[3],
				];
				const unblockNotPossible1 = this.testPath([...pathAvoidNode, lastPathLocation]);
				if (unblockNotPossible1) {
					lastPathLocation = [
						horzEdge,
						vertDistanceViaBlockTop > vertDistanceViaBlockBottom ? linesArea[1] : linesArea[3],
					];
				}
				if (lastPathLocation[1] < outputXY[1]) {
					linesArea[1] -= this.config.lineSpace;
					lastPathLocation[1] -= 1;
				} else {
					linesArea[3] += this.config.lineSpace;
					lastPathLocation[1] += 1;
				}
				thisDirection = 'vert';
			} else {
				const activeClip = (clippedVert && clippedVert.node) ? clippedVert : clippedHorz;
				if (!activeClip || !activeClip.node) return [outputXY, inputXY];

				blockedNodeId = activeClip.node.node.id;
				linesArea = activeClip.node.linesArea;
				const vertEdge = vertDistance <= 0 ? (linesArea[3] + 1) : (linesArea[1] - 1);
				pathAvoidNode = [
					[outputXY[0], outputXY[1]],
					[outputXY[0], vertEdge],
				];
				if (vertDistance <= 0) {
					linesArea[3] += this.config.lineSpace;
				} else {
					linesArea[1] -= this.config.lineSpace;
				}

				const horzDistanceViaBlockLeft =
					Math.abs(inputXY[0] - linesArea[0]) +
					Math.abs(linesArea[0] - outputXY[0]);
				const horzDistanceViaBlockRight =
					Math.abs(inputXY[0] - linesArea[2]) +
					Math.abs(linesArea[2] - outputXY[0]);

				lastPathLocation = [
					horzDistanceViaBlockLeft <= horzDistanceViaBlockRight ? (linesArea[0] - 1) : linesArea[2],
					vertEdge,
				];
				const unblockNotPossible1 = this.testPath([...pathAvoidNode, lastPathLocation]);
				if (unblockNotPossible1) {
					lastPathLocation = [
						horzDistanceViaBlockLeft > horzDistanceViaBlockRight ? linesArea[0] : linesArea[2],
						vertEdge,
					];
				}
				if (lastPathLocation[0] < outputXY[0]) {
					linesArea[0] -= this.config.lineSpace;
				} else {
					linesArea[2] += this.config.lineSpace;
				}
				thisDirection = 'horz';
			}

			if (isBlocked[blockedNodeId] > 3) {
				isBlocked.blocked = true;
				return [outputXY, inputXY];
			}
			isBlocked[blockedNodeId] = (isBlocked[blockedNodeId] || 0) + 1;

			const nextPath = this.mapLink(lastPathLocation, inputXY, targetNodeInfo, isBlocked, thisDirection);
			return [...pathAvoidNode, lastPathLocation, ...nextPath.slice(1)];
		}

		expandSourceNodeLinesArea(sourceNodeInfo, path) {
			if (path.length < 3) return false;
			const linesArea = sourceNodeInfo.linesArea;
			if (path[1][0] === path[2][0]) {
				linesArea[2] += this.config.lineSpace;
			}
			return true;
		}

		expandTargetNodeLinesArea(targetNodeInfo, path) {
			if (path.length < 2) return false;
			const linesArea = targetNodeInfo.linesArea;
			const path2Len = path.length - 2;
			if (path[path2Len - 1][0] === path[path2Len][0]) {
				linesArea[0] -= this.config.lineSpace;
			}
			return true;
		}

		getNodeOnPos(xy) {
			for (let i = 0; i < this.nodesByRight.length; ++i) {
				const nodeI = this.nodesByRight[i];
				const { linesArea } = nodeI;
				if (xy[0] >= linesArea[0] &&
					xy[1] >= linesArea[1] &&
					xy[0] < linesArea[2] &&
					xy[1] < linesArea[3]) {
					return nodeI;
				}
			}
			return null;
		}

		mapLinks(nodesByExecution) {
			const graph = this.canvas?.graph;
			if (!graph || !graph.links) return;

			this.paths = [];
			this.pathsByLinkId = {};
			this.nodesByRight = [];
			this.nodesById = {};

			const rawNodes = (nodesByExecution && nodesByExecution.length)
				? nodesByExecution
				: (graph.computeExecutionOrder ? graph.computeExecutionOrder() : (graph._nodes || []));

			this.nodesByRight = rawNodes.map((node) => {
				const barea = new Float32Array(4);
				if (node.getBounding) {
					node.getBounding(barea);
				} else {
					barea[0] = node.pos[0];
					barea[1] = node.pos[1];
					barea[2] = node.size[0];
					barea[3] = node.size[1];
				}
				const area = [
					barea[0],
					barea[1],
					barea[0] + barea[2],
					barea[1] + barea[3],
				];
				const linesArea = Array.from(area);
				linesArea[0] += this.config.nodeSpace[0];
				linesArea[1] += this.config.nodeSpace[1];
				linesArea[2] += this.config.nodeSpace[2];
				linesArea[3] += this.config.nodeSpace[3];
				const obj = { node, area, linesArea };
				this.nodesById[node.id] = obj;
				return obj;
			});

			const nodesByRightId = this.nodesByRight.reduce((acc, x) => {
				acc[x.node.id] = x.node;
				return acc;
			}, {});

			const cfg = getConfig();

			this.nodesByRight.forEach((nodeI) => {
				const { node } = nodeI;
				const outputs = node.outputs;
				if (!outputs) return;

				outputs.forEach((output, slot) => {
					const links = output.links;
					if (!links || !links.length) return;

					const outputXYConnection =
						(typeof LiteGraph !== 'undefined' && LiteGraph.vueNodesMode && node.getSlotPosition)
							? node.getSlotPosition(slot, false)
							: node.getOutputPos(slot);
					const outputNodeInfo = this.nodesById[node.id];
					let outputXY = Array.from(outputXYConnection);

					links.forEach((linkId) => {
						outputXY[0] = outputNodeInfo.linesArea[2];
						const link = graph.links[linkId];
						if (!link) return;

						let targetNode = (graph.getNodeById ? graph.getNodeById(link.target_id) : null) || nodesByRightId[link.target_id];
						if (!targetNode) return;

						// Hide Inputs support (Alt + H)
						if (targetNode._hide_inputs || (targetNode.flags && targetNode.flags.hide_inputs) || link._hidden) {
							return;
						}

						const inputXYConnection =
							(typeof LiteGraph !== 'undefined' && LiteGraph.vueNodesMode && targetNode.getSlotPosition)
								? targetNode.getSlotPosition(link.target_slot, true)
								: targetNode.getInputPos(link.target_slot);
						const inputXY = Array.from(inputXYConnection);
						const targetNodeInfo = this.nodesById[targetNode.id];
						if (!targetNodeInfo) return;

						inputXY[0] = targetNodeInfo.linesArea[0] - 1;

						const inputBlockedByNode = this.getNodeOnPos(inputXY);
						const outputBlockedByNode = this.getNodeOnPos(outputXY);

						let path = null;
						if (cfg.avoidNodes !== false && !inputBlockedByNode && !outputBlockedByNode) {
							const isBlocked = {};
							const pathFound = this.mapLink(outputXY, inputXY, targetNodeInfo, isBlocked, null);

							if (pathFound) {
								while (pathFound.length >= 2) {
									const p1 = pathFound[pathFound.length - 1];
									const p2 = pathFound[pathFound.length - 2];
									if (p1[0] === p2[0] && p1[1] === p2[1]) {
										pathFound.pop();
									} else {
										break;
									}
								}
							}
							if (!isBlocked.blocked && pathFound && pathFound.length > 2) {
								path = [outputXYConnection, ...pathFound, inputXYConnection];
								this.expandTargetNodeLinesArea(targetNodeInfo, path);
							}
						} else if (cfg.avoidNodes === false) {
							const res = this.mapFinalLink(outputXY, inputXY);
							if (res && res.path) {
								path = [outputXYConnection, ...res.path, inputXYConnection];
							}
						}

						if (!path) {
							path = [outputXYConnection, outputXY, inputXY, inputXYConnection];
						}
						this.expandSourceNodeLinesArea(nodeI, path);

						const item = {
							path,
							node,
							targetNode,
							slot,
							link,
							linkId,
							outputPos: outputXYConnection,
							inputPos: inputXYConnection
						};

						this.paths.push(item);
						this.pathsByLinkId[linkId] = item;

						// Bundling multiple outputs with clean spacing
						outputXY = [
							outputXY[0] + this.config.lineSpace,
							outputXY[1],
						];
					});
				});
			});
		}
	}

	// ---- SINGLETON ENGINE & CACHE MANAGER ----
	class NukePipeRenderer {
		/* ⚑⚑ QUÉ CAMBIA EL RUTEO, EN UN SOLO NÚMERO.
		 *
		 * Jorge: "quiero que el Nodes 2.0 se quede prendido y mi ImissNuke esté
		 * súper rápido… luego se vuelve lento todo."
		 *
		 * Y lo era, por una línea: `ensureMapLinks` recalculaba **cada 30 ms**,
		 * hubiera cambiado algo o no. Treinta y tres veces por segundo,
		 * mirando un canvas que nadie está tocando, esto hacía:
		 *   · `computeExecutionOrder()` — un orden topológico del grafo entero;
		 *   · un `MapLinks` nuevo, con un Float32Array y tres arreglos por nodo;
		 *   · y **una búsqueda de camino por CADA cable**, contra todos los
		 *     nodos (`getNodeOnPos` es un barrido completo).
		 * En un grafo de 150 nodos y 200 cables eso es O(cables × nodos) treinta
		 * y tres veces por segundo **para volver a dibujar exactamente lo
		 * mismo**. Ahí estaba el "se vuelve lento todo", y crecía con el grafo,
		 * que es justo por qué aparecía "luego" y no de entrada.
		 *
		 * ⚑⚑ EL RELOJ NO ERA LA PREGUNTA. La pregunta es *¿cambió algo de lo que
		 * el ruteo depende?* — y eso es un número que se calcula en UNA pasada
		 * sobre los nodos, sin asignar nada: cuántos nodos, cuántos cables, la
		 * versión del grafo, y la posición/tamaño/colapso de cada nodo. Si el
		 * número es el mismo, el ruteo es el mismo, y no hay nada que hacer.
		 *
		 * ⚑ Con el canvas quieto esto ya no recalcula NUNCA. Arrastrando un
		 * nodo recalcula una vez por cuadro, que es lo correcto: el nodo se
		 * movió.
		 *
		 * ⚑ Y LA CLAVE MISMA SE CACHEA POR MILISEGUNDO, porque `ensureMapLinks`
		 * se llama una vez POR CABLE dentro de un cuadro. Sin eso, la pasada
		 * barata × 200 cables saldría más cara que lo que vino a arreglar — el
		 * error clásico de poner un caché con una llave que cuesta más que el
		 * valor.
		 */
		static routingKey(canvas) {
			const graph = canvas && canvas.graph;
			if (!graph) return 0;
			const nodes = graph._nodes || [];
			let h = nodes.length | 0;
			try {
				h = (h * 31 + (graph._version | 0)) | 0;
				const links = graph.links;
				h = (h * 31 + (links
					? (Array.isArray(links) ? links.length
						: Object.keys(links).length) : 0)) | 0;
			} catch (e) {}
			for (let i = 0; i < nodes.length; i++) {
				const n = nodes[i];
				if (!n) continue;
				const p = n.pos, s = n.size;
				if (p) {
					h = (h * 31 + (p[0] | 0)) | 0;
					h = (h * 31 + (p[1] | 0)) | 0;
				}
				if (s) {
					h = (h * 31 + (s[0] | 0)) | 0;
					h = (h * 31 + (s[1] | 0)) | 0;
				}
				if (n.flags && n.flags.collapsed) h = (h * 31 + 7) | 0;
			}
			/* ⚑ Y el único ajuste que cambia el RUTEO y no el dibujo. El estilo
			   de la pipa, el radio y el color se aplican al pintar, así que no
			   tienen por qué tirar el caché. */
			const cfg = window.__imissNukeConfig;
			if (cfg && cfg.avoidNodes === false) h = (h * 31 + 3) | 0;
			return h;
		}

		/* La medición, para que "está lento" pueda dejar de ser una opinión.
		   La lee la sección ⚡ Performance del panel. */
		static get stats() {
			if (!NukePipeRenderer._stats) {
				NukePipeRenderer._stats = { calcs: 0, ms: 0, hits: 0,
					since: Date.now(), nodes: 0, links: 0 };
			}
			return NukePipeRenderer._stats;
		}

		static ensureMapLinks(canvas) {
			if (!canvas || !canvas.graph) return null;
			const now = Date.now();
			const st = NukePipeRenderer.stats;

			/* la llave, como mucho una vez por milisegundo */
			if (canvas._nukeKeyAt !== now) {
				canvas._nukeKeyAt = now;
				canvas._nukeKeyVal = NukePipeRenderer.routingKey(canvas);
			}
			const key = canvas._nukeKeyVal;

			/* ⚑ Y una red de seguridad de 2 segundos, no de 30 ms: si algo que
			   el ruteo mira no entra en la llave, se corrige solo — 66 veces
			   menos seguido, y sin apostar a que la llave es perfecta. */
			const stale = !canvas._nukeLastCalc || (now - canvas._nukeLastCalc > 2000);

			if (!canvas._nukeMapLinks || canvas._nukeDirty
					|| key !== canvas._nukeKeyLast || stale) {
				canvas._nukeKeyLast = key;
				const t0 = (typeof performance !== 'undefined' && performance.now)
					? performance.now() : now;
				const lineSpace = (typeof LiteGraph !== 'undefined' && LiteGraph.NODE_SLOT_HEIGHT)
					? Math.floor(LiteGraph.NODE_SLOT_HEIGHT / 2)
					: 10;
				const ml = new MapLinks(canvas, { lineSpace, nodeSpace: [-10, -6, 14, 8] });
				const graph = canvas.graph;
				const nodesByExecution = (graph.computeExecutionOrder ? graph.computeExecutionOrder() : (graph._nodes || [])) || [];
				if (canvas.subgraph) {
					const proxyInputNode = new SubgraphInOutNodeProxy(canvas.subgraph.inputNode, true);
					const proxyOutputNode = new SubgraphInOutNodeProxy(canvas.subgraph.outputNode, false);
					nodesByExecution.push(proxyInputNode);
					nodesByExecution.push(proxyOutputNode);
				}
				try {
					ml.mapLinks(nodesByExecution);
					canvas._nukeMapLinks = ml;
					canvas._nukeLastCalc = now;
					canvas._nukeDirty = false;
					const t1 = (typeof performance !== 'undefined' && performance.now)
						? performance.now() : now;
					st.calcs++;
					st.ms += (t1 - t0);
					st.nodes = (canvas.graph._nodes || []).length;
					try {
						const lk = canvas.graph.links;
						st.links = lk ? (Array.isArray(lk) ? lk.length
							: Object.keys(lk).length) : 0;
					} catch (e2) {}
				} catch (e) {
					console.error('[ImissNuke] MapLinks computation error:', e);
				}
			} else {
				st.hits++;
			}
			return canvas._nukeMapLinks;
		}

		/* ⚑⚑ Y LOS AVISOS QUE EL PROPIO LITEGRAPH YA DA, encima de la llave.
		 *
		 * La llave se toma como mucho una vez por milisegundo, así que un nodo
		 * que se mueve puede tardar hasta 1 ms en verse — invisible a 60 fps,
		 * pero es una holgura y no hace falta tenerla: litegraph avisa cuando
		 * un nodo termina de moverse, cuando llega uno y cuando cambia un
		 * cable. Enganchar esos tres cuesta nada y vuelve la llave lo que debe
		 * ser: **la red de seguridad, no el mecanismo**.
		 *
		 * ⚑ Se ENCADENAN, nunca se reemplazan: `onNodeMoved` es de quien lo
		 * puso, y quedarnos con él sería quitarle un aviso a otra extensión.
		 */
		static invalidate(canvas) {
			const c = canvas
				|| ((typeof app !== 'undefined' && app.canvas) ? app.canvas : null);
			if (c) c._nukeDirty = true;
		}

		static watchChanges(canvas) {
			if (!canvas || canvas.__nukeWatched) return;
			canvas.__nukeWatched = true;
			const chain = (obj, name) => {
				if (!obj) return;
				const prev = obj[name];
				obj[name] = function () {
					NukePipeRenderer.invalidate(canvas);
					if (typeof prev === 'function') return prev.apply(this, arguments);
				};
			};
			chain(canvas, 'onNodeMoved');
			const graph = canvas.graph;
			chain(graph, 'onNodeAdded');
			chain(graph, 'onNodeRemoved');
			chain(graph, 'onConnectionChange');
		}

		static init(canvas) {
			/* ⚑ Esto sí corre en cada init, aunque el resto no: el canvas puede
			   ser OTRO objeto (abrir un workflow lo cambia), y un enganche al
			   canvas anterior no avisa de nada. Es idempotente por su sello. */
			NukePipeRenderer.watchChanges(canvas
				|| ((typeof app !== 'undefined' && app.canvas) ? app.canvas : null));
			if (NukePipeRenderer._initialized) return;
			NukePipeRenderer._initialized = true;

			NukePipeRenderer.patchRenderLink();
			NukePipeRenderer.patchDrawConnections();
			NukePipeRenderer.patchRenderDraggingLink();

			if (canvas && canvas.setDirty) {
				canvas.setDirty(true, true);
			}
		}

		// ---- PATCH RENDERLINK & DRAWLINK (PRIMARY ENGINE INTERCEPTION) ----
		static patchRenderLink() {
			const tryPatch = () => {
				const targets = [];
				if (typeof LGraphCanvas !== 'undefined' && LGraphCanvas.prototype) {
					targets.push(LGraphCanvas.prototype);
				}
				if (typeof app !== 'undefined' && app.canvas) {
					targets.push(app.canvas);
					const p = Object.getPrototypeOf(app.canvas);
					if (p && !targets.includes(p)) targets.push(p);
				}

				for (const target of targets) {
					if (!target) continue;
					for (const fnName of ['renderLink', 'drawLink']) {
						const orig = target[fnName];
						if (typeof orig !== 'function' || orig.__imissNukePatched) continue;

						const patched = function (ctx, a, b, link, skip_border, flow, color, start_dir, end_dir) {
							const cfg = getConfig();
							if (cfg.masterEnabled === false || cfg.nukeLinesEnabled === false) {
								return orig.apply(this, arguments);
							}

							// Hide Inputs support (Nuke Alt + H)
							if (link) {
								if (link._hidden) return;
								if (this.graph) {
									const targetNode = this.graph.getNodeById(link.target_id);
									if (targetNode && (targetNode._hide_inputs || targetNode.flags?.hide_inputs)) {
										return;
									}
								}
							}

							if (a && b) {
								NukePipeRenderer.drawNukePipe(ctx, a, b, color, skip_border, !link, cfg, link, this.graph, this);
								return;
							}

							return orig.apply(this, arguments);
						};

						patched.__imissNukePatched = true;
						patched.__origRenderLink = orig;
						target[fnName] = patched;
					}
				}
			};

			tryPatch();
			[100, 300, 600, 1500].forEach(d => setTimeout(tryPatch, d));
		}

		// ---- PATCH RENDERDRAGGINGLINK (SUPPRESS GREEN CURVED BEZIER & DRAW 45° BEVELED DRAGGING PIPE) ----
		static patchRenderDraggingLink() {
			const tryPatch = () => {
				const targets = [];
				if (typeof app !== 'undefined' && app.canvas) {
					if (app.canvas.linkRenderer) {
						targets.push(app.canvas.linkRenderer);
						const proto = Object.getPrototypeOf(app.canvas.linkRenderer);
						if (proto && !targets.includes(proto)) targets.push(proto);
					}
				}
				if (typeof LGraphCanvas !== 'undefined' && LGraphCanvas.prototype) {
					targets.push(LGraphCanvas.prototype);
				}

				for (const target of targets) {
					if (!target) continue;
					if (typeof target.renderDraggingLink === 'function' && !target.renderDraggingLink.__imissNukePatched) {
						const origRenderDragging = target.renderDraggingLink;
						const patched = function (ctx, fromPos, toPos, color, fromDir, dragDir, renderContext, opts) {
							const cfg = getConfig();
							if (cfg.masterEnabled !== false && cfg.nukeLinesEnabled !== false) {
								NukePipeRenderer.drawDraggingPipe(ctx, fromPos, toPos, color || '#38bdf8', cfg);
								return;
							}
							return origRenderDragging.apply(this, arguments);
						};
						patched.__imissNukePatched = true;
						patched.__origRenderDragging = origRenderDragging;
						target.renderDraggingLink = patched;
					}
				}
			};

			tryPatch();
			[100, 300, 600, 1500].forEach(d => setTimeout(tryPatch, d));
		}

		// ---- PATCH DRAWCONNECTIONS (FOR ACTIVE DRAGGING LINKS) ----
		static patchDrawConnections() {
			const tryPatch = () => {
				const targets = [];
				if (typeof LGraphCanvas !== 'undefined' && LGraphCanvas.prototype) {
					targets.push(LGraphCanvas.prototype);
				}
				if (typeof app !== 'undefined' && app.canvas) {
					targets.push(app.canvas);
				}

				for (const target of targets) {
					if (!target) continue;
					const orig = target.drawConnections;
					if (typeof orig !== 'function' || orig.__imissNukeDrawPatched) continue;

					const patched = function (ctx) {
						// Let normal renderLink handle individual static links
						const ret = orig.apply(this, arguments);

						const cfg = getConfig();
						if (cfg.masterEnabled === false || cfg.nukeLinesEnabled === false) return ret;

						// If modern linkConnector is active, it calls renderDraggingLink,
						// which our patch handles cleanly. Skip drawing a duplicate line!
						const isModernConnecting = this.linkConnector && this.linkConnector.isConnecting;
						if (isModernConnecting) return ret;

						// Handle legacy connecting_links fallback
						if (this.connecting_links && this.connecting_links.length) {
							for (let i = 0; i < this.connecting_links.length; ++i) {
								const conn = this.connecting_links[i];
								if (conn && conn.pos && this.graph_mouse) {
									const isInput = !!conn.input;
									const start = isInput ? this.graph_mouse : conn.pos;
									const end = isInput ? conn.pos : this.graph_mouse;
									NukePipeRenderer.drawDraggingPipe(ctx, start, end, '#38bdf8', cfg);
								}
							}
						}
						return ret;
					};

					patched.__imissNukeDrawPatched = true;
					patched.__origDrawConnections = orig;
					target.drawConnections = patched;
				}
			};

			tryPatch();
			[100, 300, 600, 1500].forEach(d => setTimeout(tryPatch, d));
		}

		// ---- DRAW INDIVIDUAL NUKE PIPE USING MAPLINKS PATH ----
		static drawNukePipe(ctx, a, b, color, skipBorder, isDragging, cfg, link, graph, canvas) {
			if (!a || !b) return;

			// If active dragging wire (no link object yet)
			if (isDragging || !link) {
				NukePipeRenderer.drawDraggingPipe(ctx, a, b, color || '#38bdf8', cfg);
				return;
			}

			const linkId = (typeof link === 'object') ? link.id : link;
			let pathItem = null;

			// Retrieve cached path from MapLinks engine
			if (canvas) {
				const ml = NukePipeRenderer.ensureMapLinks(canvas);
				if (ml && ml.pathsByLinkId) {
					pathItem = ml.pathsByLinkId[linkId];
				}
			}

			let path = pathItem ? pathItem.path : null;
			let inputPos = pathItem ? pathItem.inputPos : b;

			// Fallback if link wasn't in cache (compute clean 45° path)
			if (!path || path.length < 2) {
				const x1 = a[0] !== undefined ? a[0] : a.x;
				const y1 = a[1] !== undefined ? a[1] : a.y;
				const x2 = b[0] !== undefined ? b[0] : b.x;
				const y2 = b[1] !== undefined ? b[1] : b.y;
				const dx = x2 - x1;
				const dy = y2 - y1;
				const dyAbs = Math.abs(dy);

				if (dx >= dyAbs && dx > 0) {
					path = [[x1, y1], [x2 - dyAbs, y1], [x2, y2]];
				} else if (dx > 0) {
					path = [[x1, y1], [x1, y2 - Math.sign(dy) * dx], [x2, y2]];
				} else {
					const midY = (y1 + y2) / 2;
					path = [[x1, y1], [x1 + 16, y1], [x1 + 16, midY], [x2 - 16, midY], [x2 - 16, y2], [x2, y2]];
				}
				inputPos = [x2, y2];
			}

			// Check selection status
			let isSelected = false;
			if (cfg.nukeHighlightSelected !== false && graph) {
				const linkObj = (typeof link === 'object') ? link : (graph.links ? graph.links[linkId] : null);
				if (linkObj) {
					const selectedNodes = canvas?.selected_nodes || {};
					const src = graph.getNodeById ? graph.getNodeById(linkObj.origin_id) : null;
					const tgt = graph.getNodeById ? graph.getNodeById(linkObj.target_id) : null;

					const isTargetSelected = Boolean(selectedNodes[linkObj.target_id] || tgt?.is_selected);
					const isOriginSelected = Boolean(selectedNodes[linkObj.origin_id] || src?.is_selected);
					const isLinkSelfSelected = Boolean(linkObj._selected);

					if (cfg.highlightUpstreamOnly !== false) {
						// Nuke default: only upstream incoming links feeding into selected node highlight
						isSelected = isTargetSelected || isLinkSelfSelected;
					} else {
						// ComfyUI default: both upstream and downstream links highlight
						isSelected = isTargetSelected || isOriginSelected || isLinkSelfSelected;
					}
				}
			}

			const pipeColor = resolveLinkColor(link, color, cfg, isSelected, graph, canvas);
			const baseWidth = cfg.pipeWidth || 2.5;
			const pipeWidth = isSelected ? (baseWidth + 0.6) : baseWidth;
			const cornerRadius = (typeof LiteGraph !== 'undefined' && LiteGraph.NODE_SLOT_HEIGHT)
				? Math.floor(LiteGraph.NODE_SLOT_HEIGHT / 2)
				: 10;

			ctx.save();
			ctx.shadowBlur = 0;
			ctx.shadowColor = 'transparent';

			ctx.beginPath();
			ctx.strokeStyle = pipeColor;
			ctx.lineWidth = pipeWidth;
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';

			// Smooth fillet corners using QuickConnections quadraticCurveTo
			let isPrevDotRound = false;
			for (let p = 0; p < path.length; ++p) {
				const pos = path[p];
				if (p === 0) {
					ctx.moveTo(pos[0], pos[1]);
				}
				const prevPos = pos;
				const cornerPos = path[p + 1];
				const nextPos = path[p + 2];

				let drawn = false;
				if (nextPos) {
					const xDiffBefore = cornerPos[0] - prevPos[0];
					const yDiffBefore = cornerPos[1] - prevPos[1];
					const xDiffAfter = nextPos[0] - cornerPos[0];
					const yDiffAfter = nextPos[1] - cornerPos[1];
					const isBeforeStraight = xDiffBefore === 0 || yDiffBefore === 0;
					const isAfterStraight = xDiffAfter === 0 || yDiffAfter === 0;

					if (isBeforeStraight || isAfterStraight) {
						const beforePos = [cornerPos[0], cornerPos[1]];
						const afterPos = [cornerPos[0], cornerPos[1]];

						if (isBeforeStraight) {
							const xSignBefore = Math.sign(xDiffBefore);
							const ySignBefore = Math.sign(yDiffBefore);
							beforePos[0] = cornerPos[0] - cornerRadius * xSignBefore;
							beforePos[1] = cornerPos[1] - cornerRadius * ySignBefore;
						}
						if (isAfterStraight) {
							const xSignAfter = Math.sign(xDiffAfter);
							const ySignAfter = Math.sign(yDiffAfter);
							afterPos[0] = cornerPos[0] + cornerRadius * xSignAfter;
							afterPos[1] = cornerPos[1] + cornerRadius * ySignAfter;
						}

						if (isPrevDotRound &&
							Math.abs(isPrevDotRound[0] - beforePos[0]) <= cornerRadius &&
							Math.abs(isPrevDotRound[1] - beforePos[1]) <= cornerRadius) {
							// skip double-rounding very close dots
						} else {
							ctx.lineTo(beforePos[0], beforePos[1]);
							ctx.quadraticCurveTo(cornerPos[0], cornerPos[1], afterPos[0], afterPos[1]);
						}
						isPrevDotRound = beforePos;
						drawn = true;
					}
				}
				if (p > 0 && !drawn) {
					if (!isPrevDotRound) {
						ctx.lineTo(pos[0], pos[1]);
					}
					isPrevDotRound = false;
				}
			}
			ctx.stroke();
			ctx.closePath();

			ctx.restore();
		}

		// ---- DRAW DRAGGING PIPE (ACTIVE WIRE CONNECTION) ----
		static drawDraggingPipe(ctx, a, b, color, cfg) {
			if (!a || !b) return;
			const x1 = a[0] !== undefined ? a[0] : a.x;
			const y1 = a[1] !== undefined ? a[1] : a.y;
			const x2 = b[0] !== undefined ? b[0] : b.x;
			const y2 = b[1] !== undefined ? b[1] : b.y;

			ctx.save();
			ctx.shadowBlur = 0;
			ctx.shadowColor = 'transparent';
			ctx.beginPath();
			ctx.strokeStyle = color || '#38bdf8';
			ctx.lineWidth = cfg.pipeWidth || 2.5;
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';
			ctx.setLineDash([6, 4]);

			const dx = x2 - x1;
			const dy = y2 - y1;
			const dyAbs = Math.abs(dy);

			ctx.moveTo(x1, y1);
			if (dx >= dyAbs && dx > 0) {
				// Pure 45° beveled diagonal into target
				ctx.lineTo(x2 - dyAbs, y1);
				ctx.lineTo(x2, y2);
			} else if (dx > 0) {
				// Intermediate horizontal step with 45° diagonal
				const midX = Math.round(x1 + dx * 0.4);
				ctx.lineTo(midX, y1);
				ctx.lineTo(midX, y2 - Math.sign(dy) * Math.min(Math.abs(dy) * 0.5, 20));
				ctx.lineTo(x2, y2);
			} else {
				// Dragging backwards/upstream (step around cleanly)
				const midY = Math.round((y1 + y2) / 2);
				ctx.lineTo(x1 + 16, y1);
				ctx.lineTo(x1 + 16, midY);
				ctx.lineTo(x2 - 16, midY);
				ctx.lineTo(x2 - 16, y2);
				ctx.lineTo(x2, y2);
			}
			ctx.stroke();
			ctx.restore();
		}
	}

	// ---- EXTENSION REGISTRATION & IMMEDIATE INIT ----
	try {
		NukePipeRenderer.init(typeof app !== 'undefined' ? app?.canvas : null);
	} catch (e) {
		console.warn('[ImissNuke] Immediate init warning:', e);
	}

	const extDefinition = {
		name: "ImissNuke.Lines",
		init() {
			NukePipeRenderer.init(typeof app !== 'undefined' ? app?.canvas : null);
		},
		setup() {
			NukePipeRenderer.init(typeof app !== 'undefined' ? app?.canvas : null);
		}
	};

	if (typeof app !== 'undefined' && app.registerExtension) {
		try {
			app.registerExtension(extDefinition);
		} catch (e) {
			console.warn('[ImissNuke] registerExtension warning:', e);
		}
	}

	[100, 300, 600, 1200].forEach(d => {
		setTimeout(() => {
			NukePipeRenderer.init(typeof app !== 'undefined' ? app?.canvas : null);
		}, d);
	});

	/* ⚑ v17.64 — publicado para que se pueda MEDIR. `check_imissnuke.js` corre
	   el ruteo sobre un grafo de tamaño realista y cuenta recomputos: sin esto,
	   "ahora es más rápido" sería una creencia. También lo lee la sección
	   ⚡ Performance del panel para decir el número en vivo. */
	window.NukePipeRenderer = NukePipeRenderer;

})();
