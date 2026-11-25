// 霍格華茲 2.5D 引擎：3D 場景 + 2D 紙片角色。
// 鏡頭方位角固定（yaw），俯角約 45°；家具以真實深度緩衝互相遮擋；陽光以陰影貼圖穿過窗格。
import * as THREE from "three";
import { PaperCharacter, portraitDataURL } from "./sprites.js";
import * as T from "./textures.js";

const $ = s => document.querySelector(s);
const SAVE_KEY = "hogwarts-save-v2";
const YAW = 0.62, PITCH = 0.7;
const SCREEN_RIGHT = new THREE.Vector3(Math.cos(YAW), 0, -Math.sin(YAW));
const SCREEN_UP = new THREE.Vector3(-Math.sin(YAW), 0, -Math.cos(YAW));
const PLAYER_R = 0.28, SPEED = 3.3;

export const PLACES = [
  { id: "library", name: "圖書館", floor: "三樓", icon: "▤" },
  { id: "hall", name: "大廳", floor: "一樓", icon: "♜" },
  { id: "courtyard", name: "庭院", floor: "室外", icon: "❧" },
  { id: "corridor", name: "移動樓梯廊", floor: "二至四樓", icon: "⌁" },
  { id: "classroom", name: "魔咒學教室", floor: "三樓", icon: "✧" },
  { id: "greenhouse", name: "溫室", floor: "校園庭園", icon: "♧" },
  { id: "grounds", name: "黑湖湖畔", floor: "校園外圍", icon: "≈" },
];

// ───────────────────────── 狀態 ─────────────────────────
const state = {
  version: 2, day: 1, minutes: 16 * 60 + 30, scene: "library",
  player: { x: 10.5, z: 13.2 },
  inventory: ["學生用品", "空白羊皮紙", "羽毛筆"],
  quest: { id: "library-note", step: 0 },
  flags: {}, npc: null, visited: {},
};
const QUEST = {
  title: "圖書館裡的異樣",
  steps: ["在圖書館找到夾在古書裡的紙條", "查看星圖黑板上新畫的連線", "與圖書館裡的人打聽這件事", "已完成：紙條上的警告指向東側樓梯"],
};

// ───────────────────────── 渲染器 ─────────────────────────
const host = $("#view");
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.outputColorSpace = THREE.SRGBColorSpace;
host.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a1d14);
scene.fog = new THREE.Fog(0x2a1d14, 34, 60);
const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 200);
let camDist = 17;
const camTarget = new THREE.Vector3();

const hemi = new THREE.HemisphereLight(0xffd9a8, 0x3a2618, 0.9);
const ambient = new THREE.AmbientLight(0x8a6448, 0.35);
const sun = new THREE.DirectionalLight(0xffc58a, 3);
sun.castShadow = true;
const mobile = matchMedia("(max-width: 720px)").matches;
sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.035; sun.shadow.radius = 3;
scene.add(hemi, ambient, sun, sun.target);

function resize() {
  const w = host.clientWidth, h = host.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w / h < 0.8 ? 40 : 30;
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);

// ───────────────────────── 場景載入 ─────────────────────────
let world = null;          // 目前場景模組回傳的資料
let grid = null;           // 尋路格
const sceneCache = new Map();
const available = new Set();

async function loadSceneModule(id) {
  if (sceneCache.has(id)) return sceneCache.get(id);
  const mod = await import(`./scenes/${id}.js`);
  const data = mod.build({ THREE, tex: T, kit: await import("./kit.js") });
  sceneCache.set(id, data);
  return data;
}

async function probeScenes() {
  await Promise.all(PLACES.map(async p => {
    try { const r = await fetch(`./js/scenes/${p.id}.js`, { method: "HEAD" }); if (r.ok) available.add(p.id); } catch { /* 離線時略過 */ }
  }));
  available.add("library");
}

function applyLighting(L) {
  const center = new THREE.Vector3(world.size.w / 2, 0, world.size.d / 2);
  const dir = new THREE.Vector3(...(L.sunDir || [1, -1, 0.3])).normalize();
  sun.target.position.copy(center);
  sun.position.copy(center).addScaledVector(dir, -35);
  const ext = Math.max(world.size.w, world.size.d) * 0.85;
  Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: 90 });
  sun.shadow.camera.updateProjectionMatrix();
  world._light = L;
}

async function enterScene(id, from) {
  let data;
  try { data = await loadSceneModule(id); }
  catch (e) { console.warn("scene load failed", id, e); toast(`「${placeName(id)}」場景還在建置中，暫時無法前往。`); return false; }
  if (world) scene.remove(world.group);
  world = data;
  scene.add(world.group);
  grid = buildGrid(world);
  applyLighting(world.lighting || {});
  state.scene = id;
  state.visited[id] = true;
  const entry = (from && world.entries && world.entries[from]) || world.spawn;
  player.group.position.set(entry.x, 0, entry.z);
  scene.add(player.group);
  camTarget.set(entry.x, 0, entry.z);
  path = null;
  if (director) director.enterScene(id, clockObj());
  buildMarkers();
  updateLocationHud();
  return true;
}

function placeName(id) { return (PLACES.find(p => p.id === id) || { name: id }).name; }

// ───────────────────────── 碰撞與尋路 ─────────────────────────
function blockedAt(x, z, r = PLAYER_R, ignore) {
  if (!world) return true;
  if (x < r + 0.05 || z < r + 0.05 || x > world.size.w - r - 0.05 || z > world.size.d - r - 0.05) return true;
  for (const c of world.colliders) {
    if (c === ignore) continue;
    if (Math.abs(x - c.x) < c.w / 2 + r && Math.abs(z - c.z) < c.d / 2 + r) return true;
  }
  return false;
}
const CELL = 0.4;
function buildGrid(w) {
  const cols = Math.ceil(w.size.w / CELL), rows = Math.ceil(w.size.d / CELL);
  const block = new Uint8Array(cols * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) block[j * cols + i] = blockedAt((i + 0.5) * CELL, (j + 0.5) * CELL, PLAYER_R + 0.04) ? 1 : 0;
  return { cols, rows, block };
}
function cellOf(x, z) { return [Math.min(grid.cols - 1, Math.max(0, Math.floor(x / CELL))), Math.min(grid.rows - 1, Math.max(0, Math.floor(z / CELL)))]; }
function nearestFree(i, j) {
  if (!grid.block[j * grid.cols + i]) return [i, j];
  for (let r = 1; r < 30; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
    if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
    const a = i + di, b2 = j + dj;
    if (a >= 0 && b2 >= 0 && a < grid.cols && b2 < grid.rows && !grid.block[b2 * grid.cols + a]) return [a, b2];
  }
  return null;
}
function lineFree(a, b2, r = PLAYER_R) {
  const d = Math.hypot(b2.x - a.x, b2.z - a.z), n = Math.ceil(d / 0.12);
  for (let k = 1; k <= n; k++) { const t = k / n; if (blockedAt(a.x + (b2.x - a.x) * t, a.z + (b2.z - a.z) * t, r)) return false; }
  return true;
}
export function findPath(from, to) {
  if (!grid) return null;
  const s = nearestFree(...cellOf(from.x, from.z)), g = nearestFree(...cellOf(to.x, to.z));
  if (!s || !g) return null;
  const { cols, rows, block } = grid, N = cols * rows;
  const gs = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const si = s[1] * cols + s[0], gi = g[1] * cols + g[0];
  const open = [si]; gs[si] = 0;
  const h = k => { const dx = Math.abs((k % cols) - g[0]), dz = Math.abs(((k / cols) | 0) - g[1]); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
  const f = new Float32Array(N).fill(Infinity); f[si] = h(si);
  let guard = 0;
  while (open.length && guard++ < 20000) {
    let bi = 0; for (let k = 1; k < open.length; k++) if (f[open[k]] < f[open[bi]]) bi = k;
    const cur = open.splice(bi, 1)[0];
    if (cur === gi) break;
    closed[cur] = 1;
    const ci = cur % cols, cj = (cur / cols) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = ci + di, nj = cj + dj;
      if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue;
      const nk = nj * cols + ni;
      if (block[nk] || closed[nk]) continue;
      if (di && dj && (block[cj * cols + ni] || block[nj * cols + ci])) continue;
      const ng = gs[cur] + (di && dj ? 1.414 : 1);
      if (ng < gs[nk]) { gs[nk] = ng; came[nk] = cur; f[nk] = ng + h(nk); if (!open.includes(nk)) open.push(nk); }
    }
  }
  if (came[gi] === -1 && si !== gi) return null;
  const pts = []; for (let k = gi; k !== -1; k = came[k]) { pts.push({ x: ((k % cols) + 0.5) * CELL, z: (((k / cols) | 0) + 0.5) * CELL }); if (k === si) break; }
  pts.reverse();
  const end = blockedAt(to.x, to.z) ? pts[pts.length - 1] : { x: to.x, z: to.z };
  pts[pts.length - 1] = end;
  // 拉直路徑
  const out = [from]; let anchor = from, idx = 0;
  while (idx < pts.length - 1) {
    let far = idx + 1;
    for (let k = pts.length - 1; k > idx; k--) if (lineFree(anchor, pts[k])) { far = k; break; }
    out.push(pts[far]); anchor = pts[far]; idx = far;
  }
  if (out.length === 1) out.push(end);
  return out.slice(1);
}

// ───────────────────────── 玩家 ─────────────────────────
const player = new PaperCharacter("player");
player.addXray();
const blobMat = new THREE.MeshBasicMaterial({ map: T.blob(), transparent: true, depthWrite: false });
function addBlob(c) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55), blobMat); m.rotation.x = -Math.PI / 2; m.position.y = 0.015; m.renderOrder = 1; c.group.add(m); }
addBlob(player);
let path = null, pendingInteract = null;

function stepMove(c, vx, vz, dt, r = PLAYER_R) {
  const p = c.group.position;
  const nx = p.x + vx * dt, nz = p.z + vz * dt;
  if (!blockedAt(nx, nz, r)) { p.x = nx; p.z = nz; return true; }
  if (!blockedAt(nx, p.z, r)) { p.x = nx; return true; }
  if (!blockedAt(p.x, nz, r)) { p.z = nz; return true; }
  return false;
}
function faceFromWorld(c, vx, vz) {
  const v = new THREE.Vector3(vx, 0, vz);
  c.face(v.dot(SCREEN_RIGHT), v.dot(SCREEN_UP));
}

// ───────────────────────── 輸入 ─────────────────────────
const keys = new Set();
const uiBlocking = () => !$("#intro").hidden || [...document.querySelectorAll(".panel")].some(p => !p.hidden) || !$("#dialog").hidden;
addEventListener("keydown", e => {
  if (e.target.matches("input,textarea,select")) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(k)) { e.preventDefault(); keys.add(k); }
  if ((k === "e" || k === "Enter" || k === " ") && !uiBlocking()) { e.preventDefault(); if (nearHot) openActionMenu(nearHot); }
  if (k === "Escape") closeAll();
});
addEventListener("keyup", e => { keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key); });
addEventListener("blur", () => keys.clear());

// 虛擬搖桿
const joy = { active: false, x: 0, y: 0, id: null };
const joyEl = $("#joystick"), knob = $("#joy-knob");
function joyMove(e) {
  const r = joyEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let dx = e.clientX - cx, dy = e.clientY - cy; const m = r.width * 0.36, d = Math.hypot(dx, dy);
  if (d > m) { dx = (dx / d) * m; dy = (dy / d) * m; }
  joy.x = dx / m; joy.y = -dy / m;
  knob.style.transform = `translate(${dx}px,${dy}px)`;
}
joyEl.addEventListener("pointerdown", e => { joy.active = true; joy.id = e.pointerId; joyEl.setPointerCapture(e.pointerId); joyMove(e); path = null; });
joyEl.addEventListener("pointermove", e => { if (joy.active && e.pointerId === joy.id) joyMove(e); });
const joyEnd = () => { joy.active = false; joy.x = joy.y = 0; knob.style.transform = ""; };
joyEl.addEventListener("pointerup", joyEnd); joyEl.addEventListener("pointercancel", joyEnd);

// 點擊地面移動
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
renderer.domElement.addEventListener("pointerdown", e => {
  if (uiBlocking()) return;
  closeActionMenu();
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = new THREE.Vector3();
  if (!ray.ray.intersectPlane(floorPlane, hit)) return;
  walkTo({ x: hit.x, z: hit.z }, null);
  showClickRing(hit);
});
renderer.domElement.addEventListener("wheel", e => { e.preventDefault(); camDist = Math.min(28, Math.max(10, camDist + Math.sign(e.deltaY) * 1.5)); }, { passive: false });

function walkTo(to, onArrive) {
  const p = player.group.position;
  path = findPath({ x: p.x, z: p.z }, to);
  pendingInteract = onArrive;
  if (!path) { pendingInteract = null; toast("那裡走不過去。"); }
}

let ring = null;
function showClickRing(p) {
  if (!ring) {
    ring = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.3, 32), new THREE.MeshBasicMaterial({ color: 0xffe3a0, transparent: true, opacity: 0.9, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; scene.add(ring);
  }
  ring.position.set(p.x, 0.03, p.z); ring.userData.t = 0; ring.visible = true;
}

// ───────────────────────── 互動點與 NPC ─────────────────────────
let director = null;
let nearHot = null;
const markerEls = new Map();

function allHotspots() {
  const list = world ? world.hotspots.map(h => ({ ...h, y: h.y ?? 1.3 })) : [];
  if (director) for (const n of director.present()) {
    const p = n.character.group.position;
    list.push({ id: "npc:" + n.id, npc: n.id, name: n.name, kind: "人物", x: p.x, z: p.z, y: 2.05, actions: ["交談", "觀察"], desc: n.role, hasNews: n.hasNews });
  }
  return list;
}

function buildMarkers() {
  const box = $("#markers"); box.replaceChildren(); markerEls.clear();
}
function syncMarkers() {
  const box = $("#markers"), seen = new Set();
  const w = host.clientWidth, h = host.clientHeight;
  for (const hs of allHotspots()) {
    seen.add(hs.id);
    let el = markerEls.get(hs.id);
    if (!el) {
      el = document.createElement("button");
      el.className = "marker " + (hs.kind === "人物" ? "npc" : "obj");
      el.innerHTML = hs.kind === "人物" ? '<span class="bubble">•••</span>' : '<span class="spark"></span>';
      el.title = hs.name;
      el.addEventListener("pointerdown", ev => ev.stopPropagation());
      el.addEventListener("click", ev => { ev.stopPropagation(); approach(hs.id); });
      box.append(el); markerEls.set(hs.id, el);
    }
    const v = new THREE.Vector3(hs.x, hs.y, hs.z).project(camera);
    const visible = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
    el.style.display = visible ? "" : "none";
    el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px,${(-v.y * 0.5 + 0.5) * h}px)`;
    el.classList.toggle("near", nearHot && nearHot.id === hs.id);
    el.classList.toggle("news", !!hs.hasNews);
  }
  for (const [id, el] of markerEls) if (!seen.has(id)) { el.remove(); markerEls.delete(id); }
}
function hotById(id) { return allHotspots().find(h => h.id === id); }

function approach(id) {
  const hs = hotById(id); if (!hs) return;
  const p = player.group.position;
  if (Math.hypot(hs.x - p.x, hs.z - p.z) < 1.9) { openActionMenu(hs); return; }
  // 走到目標附近最近的可站位置
  let best = null, bd = Infinity;
  for (let a = 0; a < 16; a++) for (const rr of [0.9, 1.3, 1.7]) {
    const x = hs.x + Math.cos((a / 16) * Math.PI * 2) * rr, z = hs.z + Math.sin((a / 16) * Math.PI * 2) * rr;
    if (blockedAt(x, z)) continue;
    const d = Math.hypot(x - p.x, z - p.z); if (d < bd) { bd = d; best = { x, z }; }
  }
  if (!best) { toast("找不到可以靠近的位置。"); return; }
  walkTo(best, () => { const now = hotById(id); if (now) openActionMenu(now); });
}

function updateNear() {
  const p = player.group.position;
  let best = null, bd = 1.9;
  for (const hs of allHotspots()) { const d = Math.hypot(hs.x - p.x, hs.z - p.z); if (d < bd) { bd = d; best = hs; } }
  nearHot = best;
  const pr = $("#prompt");
  if (best && $("#action-menu").hidden && $("#dialog").hidden) {
    pr.hidden = false;
    $("#prompt-icon").innerHTML = icon(best.actions[0]);
    $("#prompt-label").textContent = best.kind === "人物" ? "交談" : best.actions[0];
    $("#prompt-name").textContent = best.name;
    const v = new THREE.Vector3(best.x, (best.y ?? 1.3) * 0.75, best.z).project(camera);
    pr.style.left = ((v.x * 0.5 + 0.5) * host.clientWidth + 34) + "px";
    pr.style.top = ((-v.y * 0.5 + 0.5) * host.clientHeight) + "px";
  } else pr.hidden = true;
}

const ICONS = {
  read: '<svg viewBox="0 0 24 24"><path d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1z" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 6v14" stroke="currentColor" stroke-width="1.5"/></svg>',
  look: '<svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15 15l6 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  talk: '<svg viewBox="0 0 24 24"><path d="M4 5h16v10H10l-5 4v-4H4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="9" cy="10" r="1.2" fill="currentColor"/><circle cx="12.5" cy="10" r="1.2" fill="currentColor"/><circle cx="16" cy="10" r="1.2" fill="currentColor"/></svg>',
  cancel: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  hand: '<svg viewBox="0 0 24 24"><path d="M12 3l2.2 6.3L21 12l-6.8 2.7L12 21l-2.2-6.3L3 12l6.8-2.7z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
};
function icon(a) {
  if (/閱讀|查閱|抄寫|尋找/.test(a)) return ICONS.read;
  if (/調查|觀察|眺望/.test(a)) return ICONS.look;
  if (/交談|詢問/.test(a)) return ICONS.talk;
  if (/取消/.test(a)) return ICONS.cancel;
  return ICONS.hand;
}

function openActionMenu(hs) {
  path = null; pendingInteract = null;
  const m = $("#action-menu"), list = $("#action-list");
  list.replaceChildren();
  const p = player.group.position;
  faceFromWorld(player, hs.x - p.x, hs.z - p.z);
  if (hs.npc && director) director.faceTowards(hs.npc, p);
  const acts = [...hs.actions, "取消"];
  acts.forEach((a, i) => {
    const b = document.createElement("button");
    b.innerHTML = `<i>${icon(a)}</i><span>${a}</span>`;
    b.style.animationDelay = i * 40 + "ms";
    b.addEventListener("click", () => { closeActionMenu(); if (a !== "取消") act(hs, a); });
    list.append(b);
  });
  $("#action-title").textContent = hs.name;
  const v = new THREE.Vector3(hs.x, (hs.y ?? 1.3) * 0.8, hs.z).project(camera);
  const sx = (v.x * 0.5 + 0.5) * host.clientWidth, sy = (-v.y * 0.5 + 0.5) * host.clientHeight;
  m.hidden = false;
  const mw = m.offsetWidth, mh = m.offsetHeight;
  m.style.left = Math.min(host.clientWidth - mw - 10, Math.max(10, sx + 40)) + "px";
  m.style.top = Math.min(host.clientHeight - mh - 90, Math.max(70, sy - mh / 2)) + "px";
  m.querySelector("button").focus({ preventScroll: true });
}
function closeActionMenu() { $("#action-menu").hidden = true; }

function act(hs, a) {
  if (hs.npc && director) {
    if (a === "交談") { const r = director.talk(hs.npc, gameApi()); if (r) showDialog(r); return; }
    toast(director.observe ? director.observe(hs.npc, gameApi()) : `${hs.name}${hs.desc ? "：" + hs.desc : ""}`); return;
  }
  const q = state.quest;
  let text = hs.desc || "";
  if (hs.id === "book" && a === "閱讀") {
    if (!state.inventory.includes("折起來的羊皮紙")) state.inventory.push("折起來的羊皮紙");
    if (q.step === 0) q.step = 1;
    text = "你翻開古書，泛黃的書頁間夾著一張折起來的羊皮紙，上面的字跡細而急：「鐘聲響起後，別走東側樓梯。星圖上多了一顆不該存在的星。」";
  } else if (hs.id === "chart" && q.step >= 1) {
    if (q.step === 1) q.step = 2;
    text = "粉筆畫出的新連線把三顆星串成箭頭，箭頭指向東側。旁邊有一行很小的字：「第七聲鐘響。」";
  } else if (hs.id === "armillary" && a === "轉動圓環") {
    text = "你輕推最外層的圓環。它轉了半圈後停住，指針恰好對準東方，彷彿有人事先設定好。";
  } else if (hs.id === "window" && a === "休息") {
    advance(15); text = "你在窗邊坐了一會兒，夕陽把石地板染成金色。精神好了一些。";
  } else if (a === "調查" || a === "觀察" || a === "眺望") {
    text = text + (hs.id === "crystal" ? " 你靠近時，霧氣短暫聚成一個鐘的形狀。" : "");
  } else {
    text = `${hs.name}：${text}`;
  }
  advance(5);
  toast(text, 7000);
  updateQuestHud();
}

// ───────────────────────── 對話框 ─────────────────────────
function showDialog(r) {
  const d = $("#dialog");
  $("#dialog-name").textContent = r.speaker;
  $("#dialog-text").textContent = r.text;
  const pic = $("#dialog-portrait");
  if (r.look) { pic.style.backgroundImage = `url(${portraitDataURL(r.look)})`; pic.hidden = false; } else pic.hidden = true;
  const opts = $("#dialog-options"); opts.replaceChildren();
  (r.options && r.options.length ? r.options : [{ label: "結束對話" }]).forEach(o => {
    const b = document.createElement("button"); b.textContent = o.label;
    b.addEventListener("click", () => { const next = o.next ? o.next() : null; if (next) showDialog(next); else d.hidden = true; updateQuestHud(); });
    opts.append(b);
  });
  d.hidden = false; advance(3);
}

// ───────────────────────── 時間與光線 ─────────────────────────
function clockObj() { return { day: state.day, minutes: state.minutes }; }
function advance(min) { state.minutes += min; while (state.minutes >= 1440) { state.minutes -= 1440; state.day++; } }
function fmtClock() { const h = Math.floor(state.minutes / 60), m = Math.floor(state.minutes % 60); return `第 ${state.day} 天　${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`; }
function phaseName() { const h = state.minutes / 60; return h < 6 ? "深夜" : h < 8 ? "清晨" : h < 12 ? "上午" : h < 13.5 ? "午餐" : h < 17 ? "下午" : h < 19.5 ? "黃昏" : h < 23 ? "夜晚" : "深夜"; }
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function updateLighting() {
  if (!world) return;
  const L = world._light || {}, h = state.minutes / 60;
  const day = smooth(5.5, 8, h) * (1 - smooth(18.3, 19.8, h));
  const gold = smooth(15, 18, h);
  const base = L.sunIntensity ?? 3;
  sun.intensity = base * day;
  sun.color.set(L.sunColor ?? 0xffc58a).lerp(new THREE.Color(0xff9c5a), gold * 0.5);
  hemi.color.set(L.hemiSky ?? 0xffd9a8).lerp(new THREE.Color(0x4a5a8a), 1 - day);
  hemi.groundColor.set(L.hemiGround ?? 0x3a2618);
  hemi.intensity = (L.hemiIntensity ?? 1.3) * (0.45 + 0.55 * day);
  ambient.color.set(L.ambient ?? 0x8a6448);
  ambient.intensity = 0.45 + 0.25 * day;
  const night = 1 + (1 - day) * 1.4;
  for (const l of world.candleLights || []) l.userData.night = night;
  for (const s of world.shafts || []) s.opacity = 0.3 * day * (0.7 + gold * 0.5);
  world.group.traverse(o => { if (o.userData.glass) o.material.color.setRGB(0.25 + 0.75 * day, 0.3 + 0.7 * day, 0.45 + 0.55 * day); });
  renderer.toneMappingExposure = 1.05 + 0.2 * day;
}

// ───────────────────────── HUD ─────────────────────────
let toastTimer = 0;
function toast(t, ms = 4200) { const el = $("#toast"); el.textContent = t; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => (el.hidden = true), ms); }
function updateLocationHud() {
  const p = PLACES.find(x => x.id === state.scene);
  $("#loc-name").textContent = world?.name || p.name;
  $("#loc-floor").textContent = world?.floorLabel || p.floor;
}
function updateQuestHud() {
  const q = state.quest;
  $("#quest-title").textContent = QUEST.title;
  $("#quest-step").textContent = QUEST.steps[Math.min(q.step, QUEST.steps.length - 1)];
  $("#quest-tracker").classList.toggle("done", q.step >= 3);
  $("#bag-count").textContent = state.inventory.length;
}
const mini = $("#minimap"), mctx = mini.getContext("2d");
function drawMinimap() {
  if (!world) return;
  const S = mini.width, W = world.size.w, D = world.size.d;
  mctx.clearRect(0, 0, S, S);
  mctx.save(); mctx.beginPath(); mctx.arc(S / 2, S / 2, S / 2 - 4, 0, Math.PI * 2); mctx.clip();
  mctx.fillStyle = "#3a2c20"; mctx.fillRect(0, 0, S, S);
  const sc = (S * 0.9) / Math.hypot(W, D);
  mctx.translate(S / 2, S / 2); mctx.rotate(YAW); mctx.scale(sc, sc); mctx.translate(-W / 2, -D / 2);
  mctx.fillStyle = "#b99c74"; mctx.fillRect(0, 0, W, D);
  mctx.fillStyle = "#5a4330"; for (const c of world.colliders) mctx.fillRect(c.x - c.w / 2, c.z - c.d / 2, c.w, c.d);
  mctx.fillStyle = "#f3cf7a"; for (const e of world.exits) mctx.fillRect(e.x - e.w / 2, e.z - e.d / 2, e.w, e.d);
  for (const hs of allHotspots()) { mctx.fillStyle = hs.kind === "人物" ? "#e9e2d2" : "#d9a845"; mctx.beginPath(); mctx.arc(hs.x, hs.z, 0.32, 0, Math.PI * 2); mctx.fill(); }
  const p = player.group.position;
  mctx.save(); mctx.translate(p.x, p.z); mctx.rotate(headingAngle);
  mctx.fillStyle = "#4aa8ff"; mctx.strokeStyle = "#fff"; mctx.lineWidth = 0.12;
  mctx.beginPath(); mctx.moveTo(0, -0.8); mctx.lineTo(0.55, 0.55); mctx.lineTo(0, 0.25); mctx.lineTo(-0.55, 0.55); mctx.closePath(); mctx.fill(); mctx.stroke();
  mctx.restore(); mctx.restore();
}
let headingAngle = 0; const lastMove = new THREE.Vector3(0, 0, -1);

// 面板
function closeAll() { document.querySelectorAll(".panel").forEach(p => (p.hidden = true)); closeActionMenu(); $("#dialog").hidden = true; }
function openPanel(id) { closeAll(); $(id).hidden = false; }
function renderBag() { $("#bag-list").innerHTML = state.inventory.map(i => `<li>${i}</li>`).join(""); }
function renderQuests() {
  $("#quest-list").innerHTML = QUEST.steps.slice(0, 3).map((s, i) => `<li class="${state.quest.step > i ? "ok" : state.quest.step === i ? "cur" : ""}">${s}</li>`).join("") + (state.quest.step >= 3 ? `<li class="ok">${QUEST.steps[3]}</li>` : "");
}
function renderMap() {
  const list = $("#map-list"); list.replaceChildren();
  for (const p of PLACES) {
    const b = document.createElement("button"), ok = available.has(p.id);
    b.className = "place" + (p.id === state.scene ? " current" : "");
    b.disabled = !ok || p.id === state.scene;
    b.innerHTML = `<span class="pi">${p.icon}</span><span><b>${p.name}</b><small>${p.floor}${ok ? "" : "・建置中"}</small></span>`;
    b.addEventListener("click", async () => { closeAll(); await travel(p.id, null); advance(10); });
    list.append(b);
  }
}
async function travel(id, from) {
  const f = $("#fade"); f.classList.add("on");
  await new Promise(r => setTimeout(r, 280));
  const ok = await enterScene(id, from);
  f.classList.remove("on");
  if (ok) toast(`你來到了${placeName(id)}。`);
  return ok;
}
$("#btn-bag").addEventListener("click", () => { renderBag(); openPanel("#panel-bag"); });
$("#btn-quest").addEventListener("click", () => { renderQuests(); openPanel("#panel-quest"); });
$("#btn-map").addEventListener("click", () => { renderMap(); openPanel("#panel-map"); });
$("#btn-menu").addEventListener("click", () => openPanel("#panel-menu"));
$("#quest-tracker").addEventListener("click", () => { renderQuests(); openPanel("#panel-quest"); });
document.querySelectorAll(".panel .close").forEach(b => b.addEventListener("click", closeAll));
$("#btn-art").addEventListener("click", () => openPanel("#panel-art"));
$("#btn-help").addEventListener("click", () => openPanel("#panel-help"));
$("#btn-save").addEventListener("click", () => { save(); closeAll(); toast("進度已儲存在這台裝置。"); });
$("#btn-load").addEventListener("click", async () => { closeAll(); const ok = await load(); toast(ok ? "已載入上次進度。" : "找不到可用的存檔。"); });

// ───────────────────────── 存檔 ─────────────────────────
function snapshot() {
  const p = player.group.position;
  return { ...state, player: { x: +p.x.toFixed(2), z: +p.z.toFixed(2) }, npc: director ? director.serialize() : state.npc, savedAt: Date.now() };
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot())); return true; } catch { return false; } }
async function load() {
  let data;
  try { data = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); } catch { data = null; }
  if (!data || data.version !== 2 || !PLACES.some(p => p.id === data.scene) || !Array.isArray(data.inventory)) return false;
  Object.assign(state, data);
  if (director && data.npc) director.load(data.npc);
  await enterScene(state.scene, null);
  if (Number.isFinite(data.player?.x) && !blockedAt(data.player.x, data.player.z)) player.group.position.set(data.player.x, 0, data.player.z);
  camTarget.copy(player.group.position);
  updateQuestHud();
  return true;
}

// ───────────────────────── NPC 介面 ─────────────────────────
function gameApi() { return { state, clock: clockObj(), advance, toast, give: item => { if (!state.inventory.includes(item)) state.inventory.push(item); }, quest: state.quest, flags: state.flags }; }
const npcApi = {
  spawnCharacter(look) { const c = new PaperCharacter(look); addBlob(c); scene.add(c.group); return c; },
  removeCharacter(c) { scene.remove(c.group); },
  findPath, blockedAt: (x, z, r) => blockedAt(x, z, r ?? 0.26), stepMove: (c, vx, vz, dt) => stepMove(c, vx, vz, dt, 0.26),
  faceFromWorld, sceneSpot: name => (world && world.npcSpots[name]) ? { x: world.npcSpots[name][0], z: world.npcSpots[name][1] } : null,
  exitTo: sceneId => { const e = world && world.exits.find(x => x.to === sceneId); return e ? { x: e.x, z: e.z } : (world ? { x: world.spawn.x, z: world.spawn.z } : null); },
  currentScene: () => state.scene, playerPos: () => player.group.position,
};
async function initNpcs() {
  try {
    const mod = await import("./npcs.js");
    director = new mod.NpcDirector(npcApi);
    if (state.npc) director.load(state.npc);
  } catch (e) { console.info("NPC 模組尚未就緒：", e.message); director = null; }
}

// ───────────────────────── 主迴圈 ─────────────────────────
const clock = new THREE.Clock();
let clockAcc = 0, exitCooldown = 0, transitioning = false;
function frame() {
  const dt = Math.min(0.05, clock.getDelta());
  const playing = $("#intro").hidden;
  // 輸入
  let ix = 0, iy = 0;
  if (playing && !uiBlocking()) {
    if (keys.has("a") || keys.has("ArrowLeft")) ix -= 1;
    if (keys.has("d") || keys.has("ArrowRight")) ix += 1;
    if (keys.has("w") || keys.has("ArrowUp")) iy += 1;
    if (keys.has("s") || keys.has("ArrowDown")) iy -= 1;
    if (joy.active) { ix = joy.x; iy = joy.y; }
  }
  let moving = false;
  const p = player.group.position;
  if (ix || iy) {
    path = null; pendingInteract = null; closeActionMenu();
    const m = Math.min(1, Math.hypot(ix, iy));
    const v = SCREEN_RIGHT.clone().multiplyScalar(ix).addScaledVector(SCREEN_UP, iy).normalize().multiplyScalar(SPEED * m);
    moving = stepMove(player, v.x, v.z, dt);
    player.face(ix, iy); lastMove.copy(v);
  } else if (path && path.length) {
    const t = path[0], dx = t.x - p.x, dz = t.z - p.z, d = Math.hypot(dx, dz);
    if (d < 0.08) { path.shift(); if (!path.length) { path = null; const cb = pendingInteract; pendingInteract = null; if (cb) cb(); } }
    else {
      const s = Math.min(SPEED, d / dt);
      moving = stepMove(player, (dx / d) * s, (dz / d) * s, dt);
      if (!moving) path = null;
      faceFromWorld(player, dx, dz); lastMove.set(dx, 0, dz);
    }
  }
  if (moving) headingAngle = Math.atan2(lastMove.x, -lastMove.z);
  player.walking = moving;
  player.update(dt, YAW);
  // 時間：真實 1 秒 = 遊戲 1 分鐘（開啟面板時暫停）
  if (playing && !uiBlocking()) { clockAcc += dt; if (clockAcc >= 1) { advance(Math.floor(clockAcc)); clockAcc %= 1; } }
  $("#clock").textContent = fmtClock() + "　" + phaseName();
  if (world) world.update(dt, clockObj());
  if (director) director.update(dt, clockObj());
  // 出口
  exitCooldown -= dt;
  if (world && !transitioning && exitCooldown <= 0) {
    for (const e of world.exits) {
      if (Math.abs(p.x - e.x) < e.w / 2 + 0.1 && Math.abs(p.z - e.z) < e.d / 2 + 0.1) {
        transitioning = true; path = null;
        const from = state.scene;
        travel(e.to, from).then(ok => {
          transitioning = false; exitCooldown = 1;
          if (!ok) { const back = findPath({ x: p.x, z: p.z }, world.spawn); if (back && back.length) { p.x += (back[0].x - p.x) * 0.25; p.z += (back[0].z - p.z) * 0.25; } }
          else advance(3);
        });
        break;
      }
    }
  }
  // 鏡頭
  camTarget.lerp(new THREE.Vector3(p.x, 0, p.z), 1 - Math.pow(0.002, dt));
  const off = new THREE.Vector3(Math.sin(YAW) * Math.cos(PITCH), Math.sin(PITCH), Math.cos(YAW) * Math.cos(PITCH)).multiplyScalar(camDist);
  camera.position.copy(camTarget).add(off).add(new THREE.Vector3(0, 0.6, 0));
  camera.lookAt(camTarget.x, 0.9, camTarget.z);
  if (ring && ring.visible) { ring.userData.t += dt; ring.scale.setScalar(1 + ring.userData.t * 1.5); ring.material.opacity = Math.max(0, 0.9 - ring.userData.t * 1.6); if (ring.userData.t > 0.6) ring.visible = false; }
  updateLighting();
  renderer.render(scene, camera);
  syncMarkers();
  updateNear();
  drawMinimap();
  requestAnimationFrame(frame);
}

// ───────────────────────── 啟動 ─────────────────────────
export async function boot() {
  resize();
  await probeScenes();
  await initNpcs();
  await enterScene("library", null);
  updateQuestHud();
  $("#btn-start").addEventListener("click", () => { $("#intro").hidden = true; toast("用 WASD／方向鍵或左下搖桿移動，點地面可自動走過去。靠近發光處按 E 或點擊互動。", 6500); });
  $("#btn-continue").hidden = !localStorage.getItem(SAVE_KEY);
  $("#btn-continue").addEventListener("click", async () => { $("#intro").hidden = true; const ok = await load(); toast(ok ? "已載入上次進度。" : "存檔無法讀取，從頭開始。"); });
  addEventListener("beforeunload", () => { if ($("#intro").hidden) save(); });
  document.body.classList.add("ready");
  requestAnimationFrame(frame);
  // 測試掛勾（不影響遊玩）
  window.__game = { state, player, get world() { return world; }, findPath, blockedAt, enterScene, travel, camera, renderer, get director() { return director; }, approach, allHotspots, setTime: m => { state.minutes = m; } };
}
