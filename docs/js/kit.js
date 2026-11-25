// 共用場景零件：牆、窗、書架、桌椅、燭台、地球儀、天球儀、旗幟、欄杆等。
// 所有零件都會把地面碰撞範圍加進 builder.colliders。
import * as THREE from "three";
import * as T from "./textures.js";

const matCache = new Map();
export function mat(key, make) { if (!matCache.has(key)) matCache.set(key, make()); return matCache.get(key); }

export function texRepeat(tex, rx, ry) {
  const t = tex.clone(); t.repeat.set(rx, ry); t.needsUpdate = true; return t;
}

const M = {
  woodDark: () => mat("woodDark", () => new THREE.MeshStandardMaterial({ map: T.wood("dark"), roughness: 0.62, metalness: 0.02 })),
  woodLight: () => mat("woodLight", () => new THREE.MeshStandardMaterial({ map: T.wood("light"), roughness: 0.6 })),
  brass: () => mat("brass", () => new THREE.MeshStandardMaterial({ color: 0xc9953f, roughness: 0.32, metalness: 0.85, emissive: 0x2a1600 })),
  stoneTrim: () => mat("stoneTrim", () => new THREE.MeshStandardMaterial({ color: 0xb79a78, roughness: 0.85 })),
  paper: () => mat("paper", () => new THREE.MeshStandardMaterial({ color: 0xefdfbd, roughness: 0.9 })),
  wax: () => mat("wax", () => new THREE.MeshStandardMaterial({ color: 0xf4ead2, roughness: 0.6, emissive: 0x2a1a08 })),
  shadowOnly: () => mat("shadowOnly", () => new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })),
};
export { M as materials };

export class SceneBuilder {
  constructor(id, name, w, d) {
    this.id = id; this.name = name; this.size = { w, d };
    this.group = new THREE.Group(); this.group.name = id;
    this.colliders = []; this.hotspots = []; this.exits = []; this.npcSpots = {};
    this.updaters = []; this.lights = []; this.shafts = [];
  }
  add(obj, { cast = true, receive = true, parent } = {}) {
    obj.traverse(o => { if (o.isMesh) { o.castShadow = cast && !o.userData.noShadow; o.receiveShadow = receive && !o.userData.noShadow; } });
    (parent || this.group).add(obj); return obj;
  }
  collide(x, z, w, d) { this.colliders.push({ x, z, w, d }); }
  hotspot(h) { this.hotspots.push(h); return h; }
  exit(e) { this.exits.push(e); }
  spot(name, x, z) { this.npcSpots[name] = [x, z]; }
  onUpdate(fn) { this.updaters.push(fn); }
  result(extra = {}) {
    const updaters = this.updaters;
    return {
      id: this.id, name: this.name, size: this.size, group: this.group,
      colliders: this.colliders, hotspots: this.hotspots, exits: this.exits, npcSpots: this.npcSpots,
      shafts: this.shafts, candleLights: this.lights,
      update(dt, clock) { for (const f of updaters) f(dt, clock); },
      ...extra,
    };
  }
}

function box(w, h, d, material) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); }
function cyl(rt, rb, h, material, seg = 16) { return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material); }

export function floor(b, tex, { tile = 4, x = 0, z = 0, w = b.size.w, d = b.size.d, y = 0, roughness = 0.82 } = {}) {
  const m = new THREE.MeshStandardMaterial({ map: texRepeat(tex, w / tile, d / tile), roughness });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m);
  p.rotation.x = -Math.PI / 2; p.position.set(x + w / 2, y, z + d / 2);
  b.add(p, { cast: false, receive: true });
  return p;
}

export function ceilingShadow(b, h) {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(b.size.w + 8, b.size.d + 8), M.shadowOnly());
  p.rotation.x = Math.PI / 2; p.position.set(b.size.w / 2, h, b.size.d / 2);
  p.castShadow = true; p.receiveShadow = false; b.group.add(p);
}

function wallMat(tex, len, h) {
  return new THREE.MeshStandardMaterial({ map: texRepeat(tex, len / 4, h / 4), roughness: 0.9 });
}

// 牆壁：axis = "x"（沿 x 方向，位於 z=at）或 "z"（沿 z 方向，位於 x=at）。
// openings: [{ c: 中心位置, w: 寬, sill: 窗台高 (0 為門), h: 開口高, arch: true, kind: "window"|"door" }]
export function wall(b, { axis = "x", at = 0, from = 0, to, h = 6.5, t = 0.45, tex = T.stoneWall(), openings = [], night = false }) {
  const len = to - from;
  const g = new THREE.Group();
  const place = (m, c, y, along) => {
    if (axis === "x") { m.position.set(c, y, at - t / 2); } else { m.position.set(at - t / 2, y, c); m.rotation.y = Math.PI / 2; }
    g.add(m);
  };
  const ops = [...openings].sort((a, b2) => a.c - b2.c);
  let cur = from;
  const seg = (a, z) => { if (z - a < 0.01) return; const m = box(z - a, h, t, wallMat(tex, z - a, h)); place(m, (a + z) / 2, h / 2); };
  for (const o of ops) {
    const a = o.c - o.w / 2, z = o.c + o.w / 2;
    seg(cur, a);
    const top = o.sill + o.h;
    if (o.sill > 0) { const m = box(o.w, o.sill, t, wallMat(tex, o.w, o.sill)); place(m, o.c, o.sill / 2); }
    const archR = o.arch ? o.w / 2 : 0;
    const rectTop = top - archR;
    if (h - top > 0.01) { const m = box(o.w, h - top, t, wallMat(tex, o.w, h - top)); place(m, o.c, top + (h - top) / 2); }
    if (archR) {
      // 拱頂：矩形扣掉半圓
      const s = new THREE.Shape(); s.moveTo(-o.w / 2, 0); s.lineTo(o.w / 2, 0); s.lineTo(o.w / 2, archR); s.lineTo(-o.w / 2, archR); s.closePath();
      const hole = new THREE.Path(); hole.absarc(0, 0, archR - 0.001, 0, Math.PI, false); hole.closePath(); s.holes.push(hole);
      const geo = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 20 });
      geo.translate(0, 0, -t / 2);
      const m = new THREE.Mesh(geo, wallMat(tex, o.w, archR));
      place(m, o.c, rectTop);
    }
    // 窗框石材飾邊
    const trim = M.stoneTrim();
    const jamb = (dx) => { const m = box(0.16, rectTop - o.sill, t + 0.12, trim); place(m, o.c + dx, o.sill + (rectTop - o.sill) / 2); };
    jamb(-o.w / 2 - 0.08); jamb(o.w / 2 + 0.08);
    if (o.kind !== "door") {
      const sill = box(o.w + 0.4, 0.14, t + 0.3, trim); place(sill, o.c, o.sill);
      // 玻璃
      const glassShape = new THREE.Shape(); glassShape.moveTo(-o.w / 2, 0); glassShape.lineTo(o.w / 2, 0); glassShape.lineTo(o.w / 2, rectTop - o.sill);
      if (archR) glassShape.absarc(0, rectTop - o.sill, o.w / 2, 0, Math.PI, false); else glassShape.lineTo(-o.w / 2, rectTop - o.sill);
      glassShape.closePath();
      const gg = new THREE.ShapeGeometry(glassShape, 20);
      // 重新計算 UV
      const pos = gg.attributes.position, uv = gg.attributes.uv, H = top - o.sill;
      for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / o.w + 0.5, pos.getY(i) / H);
      const glass = new THREE.Mesh(gg, mat("glass" + night, () => new THREE.MeshBasicMaterial({ map: T.windowView(1, night), color: night ? 0x445577 : 0xffffff, side: THREE.DoubleSide })));
      glass.castShadow = false; glass.userData.glass = true; glass.userData.noShadow = true; glass.material = glass.material.clone();
      const gwrap = new THREE.Group(); gwrap.add(glass); glass.position.y = 0;
      if (axis === "x") { gwrap.position.set(o.c, o.sill, at - t * 0.75); } else { gwrap.position.set(at - t * 0.75, o.sill, o.c); gwrap.rotation.y = Math.PI / 2; }
      g.add(gwrap);
      // 窗櫺（會投下格狀陰影）
      const mull = mat("mullion", () => new THREE.MeshStandardMaterial({ color: 0x3b2a1e, roughness: 0.6, metalness: 0.3 }));
      const cols = Math.max(2, Math.round(o.w / 0.7));
      for (let i = 1; i < cols; i++) { const m = box(0.06, rectTop - o.sill + archR * 0.9, 0.06, mull); place(m, o.c - o.w / 2 + (i * o.w) / cols, o.sill + (rectTop - o.sill + archR * 0.9) / 2); m.position[axis === "x" ? "z" : "x"] -= t * 0.25; }
      const rows = Math.round((rectTop - o.sill) / 0.8);
      for (let j = 1; j <= rows; j++) { const m = box(o.w, 0.05, 0.05, mull); place(m, o.c, o.sill + (j * (rectTop - o.sill)) / (rows + 0.3)); m.position[axis === "x" ? "z" : "x"] -= t * 0.25; }
      o._top = top;
    } else {
      // 門洞：深色門板內退
      const door = box(o.w, rectTop + archR * 0.9, 0.08, mat("doorDark", () => new THREE.MeshStandardMaterial({ color: 0x1b120c, roughness: 1 })));
      place(door, o.c, (rectTop + archR * 0.9) / 2);
      door.position[axis === "x" ? "z" : "x"] -= t * 0.6;
      if (archR) { const lintel = new THREE.Mesh(new THREE.TorusGeometry(archR + 0.08, 0.09, 8, 24, Math.PI), trim); place(lintel, o.c, rectTop); }
    }
    cur = z;
  }
  seg(cur, to);
  // 牆腳與牆頂線腳
  const base = box(len, 0.35, t + 0.12, M.woodDark()); place(base, from + len / 2, 0.175);
  const cornice = box(len, 0.25, t + 0.25, M.stoneTrim()); place(cornice, from + len / 2, h - 0.12);
  b.add(g);
  // 碰撞：門洞處留空
  let c0 = from;
  for (const o of ops) { if (o.kind === "door") { addWallCollider(b, axis, at, t, c0, o.c - o.w / 2); c0 = o.c + o.w / 2; } }
  addWallCollider(b, axis, at, t, c0, to);
  return ops;
}

function addWallCollider(b, axis, at, t, a, z) {
  if (z - a <= 0) return;
  if (axis === "x") b.collide((a + z) / 2, at + 0.1, z - a, t + 0.6);
  else b.collide(at + 0.1, (a + z) / 2, t + 0.6, z - a);
}

// 光束：從窗戶沿陽光方向射入地面（加法混色）
export function windowShaft(b, { axis = "z", at = 0, c, w, sill, top, sunDir, strength = 0.32 }) {
  const dir = new THREE.Vector3(...sunDir).normalize(); // 光的前進方向（往下）
  const edge = (y) => {
    const p0 = axis === "z" ? new THREE.Vector3(at, y, c - w / 2) : new THREE.Vector3(c - w / 2, y, at);
    const p1 = axis === "z" ? new THREE.Vector3(at, y, c + w / 2) : new THREE.Vector3(c + w / 2, y, at);
    const t = -y / dir.y;
    return [p0, p1, p0.clone().addScaledVector(dir, t), p1.clone().addScaledVector(dir, t)];
  };
  const material = new THREE.MeshBasicMaterial({ map: T.lightShaft(), transparent: true, opacity: strength, fog: false, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, color: 0xffc98a });
  for (const y of [top * 0.92, sill + 0.2]) {
    const [a, bb, c2, d] = edge(y);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute([...a.toArray(), ...bb.toArray(), ...c2.toArray(), ...d.toArray()], 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
    geo.setIndex([0, 2, 1, 1, 2, 3]);
    const m = new THREE.Mesh(geo, material); m.renderOrder = 5;
    b.group.add(m);
  }
  b.shafts.push(material);
}

// 書架。rot：0 正面朝 +z；Math.PI/2 正面朝 +x；-Math.PI/2 正面朝 -x；Math.PI 正面朝 -z
export function bookshelf(b, x, z, { w = 2.4, h = 3.4, d = 0.6, rot = 0, seed = 3, rows = 5, collide = true } = {}) {
  const g = new THREE.Group();
  const body = box(w, h, d, M.woodDark()); body.position.y = h / 2; g.add(body);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.12, h - 0.35), new THREE.MeshStandardMaterial({ map: texRepeat(T.bookshelf(seed, rows), 1, 1), roughness: 0.85 }));
  front.position.set(0, (h - 0.35) / 2 + 0.12, d / 2 + 0.005); g.add(front);
  const crown = box(w + 0.2, 0.18, d + 0.16, M.woodDark()); crown.position.y = h + 0.04; g.add(crown);
  const crest = box(w * 0.5, 0.3, 0.08, M.woodDark()); crest.position.set(0, h + 0.28, d / 2 - 0.05); g.add(crest);
  const plinth = box(w + 0.1, 0.16, d + 0.1, M.woodDark()); plinth.position.y = 0.08; g.add(plinth);
  for (const s of [-1, 1]) { const p = box(0.12, h, 0.12, M.woodDark()); p.position.set(s * (w / 2 + 0.02), h / 2, d / 2 + 0.02); g.add(p); }
  g.position.set(x, 0, z); g.rotation.y = rot;
  b.add(g);
  if (collide) { const vert = Math.abs(Math.sin(rot)) > 0.5; b.collide(x, z, vert ? d + 0.1 : w + 0.1, vert ? w + 0.1 : d + 0.1); }
  return g;
}

export function table(b, x, z, { w = 2.6, d = 1.2, h = 0.82, rot = 0, light = false, collide = true } = {}) {
  const g = new THREE.Group();
  const m = light ? M.woodLight() : M.woodDark();
  const top = box(w, 0.1, d, m); top.position.y = h - 0.05; g.add(top);
  const apron = box(w - 0.2, 0.18, d - 0.2, m); apron.position.y = h - 0.19; g.add(apron);
  // 桌腳：雕花感的兩段柱
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const l = cyl(0.07, 0.09, h - 0.1, m, 8); l.position.set(sx * (w / 2 - 0.15), (h - 0.1) / 2, sz * (d / 2 - 0.15)); g.add(l);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), m); knob.position.set(sx * (w / 2 - 0.15), h * 0.45, sz * (d / 2 - 0.15)); g.add(knob);
  }
  const stretcher = box(w - 0.3, 0.08, 0.08, m); stretcher.position.y = 0.2; g.add(stretcher);
  g.position.set(x, 0, z); g.rotation.y = rot; b.add(g);
  if (collide) { const vert = Math.abs(Math.sin(rot)) > 0.5; b.collide(x, z, (vert ? d : w) + 0.1, (vert ? w : d) + 0.1); }
  g.userData.top = h;
  return g;
}

// 書桌（附抽屜的櫃式桌，參考圖前景那種）
export function desk(b, x, z, { w = 2.4, d = 1.1, h = 0.9, rot = 0 } = {}) {
  const g = new THREE.Group();
  const body = box(w, h - 0.08, d, M.woodDark()); body.position.y = (h - 0.08) / 2; g.add(body);
  const top = box(w + 0.12, 0.08, d + 0.12, M.woodDark()); top.position.y = h - 0.04; g.add(top);
  const panelMat = mat("panel", () => new THREE.MeshStandardMaterial({ map: T.wood("light"), roughness: 0.55, color: 0xb08868 }));
  for (let i = 0; i < 3; i++) { const p = box(w / 3 - 0.14, h - 0.32, 0.03, panelMat); p.position.set(-w / 3 + (i * w) / 3, h / 2 - 0.04, d / 2 + 0.015); g.add(p); }
  g.position.set(x, 0, z); g.rotation.y = rot; b.add(g);
  const vert = Math.abs(Math.sin(rot)) > 0.5; b.collide(x, z, (vert ? d : w) + 0.15, (vert ? w : d) + 0.15);
  g.userData.top = h;
  return g;
}

export function chair(b, x, z, { rot = 0 } = {}) {
  const g = new THREE.Group(), m = M.woodDark();
  const seat = box(0.5, 0.06, 0.5, m); seat.position.y = 0.48; g.add(seat);
  const cushion = box(0.44, 0.05, 0.44, mat("cushion", () => new THREE.MeshStandardMaterial({ color: 0x34385a, roughness: 0.9 }))); cushion.position.y = 0.53; g.add(cushion);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = box(0.06, 0.48, 0.06, m); l.position.set(sx * 0.2, 0.24, sz * 0.2); g.add(l); }
  const back = box(0.5, 0.6, 0.06, m); back.position.set(0, 0.85, -0.22); g.add(back);
  g.position.set(x, 0, z); g.rotation.y = rot; b.add(g);
  b.collide(x, z, 0.5, 0.5);
  return g;
}

export function bench(b, x, z, { w = 3, rot = 0 } = {}) {
  const g = new THREE.Group(), m = M.woodDark();
  const seat = box(w, 0.08, 0.42, m); seat.position.y = 0.46; g.add(seat);
  for (const s of [-1, 1]) { const l = box(0.08, 0.46, 0.36, m); l.position.set(s * (w / 2 - 0.2), 0.23, 0); g.add(l); }
  g.position.set(x, 0, z); g.rotation.y = rot; b.add(g);
  const vert = Math.abs(Math.sin(rot)) > 0.5; b.collide(x, z, vert ? 0.45 : w, vert ? w : 0.45);
  return g;
}

// 蠟燭：火焰光暈＋閃爍；light=true 時附點光源（每場景請控制在 6 盞以內）
export function candle(b, x, y, z, { light = false, h = 0.22, intensity = 4, distance = 8 } = {}) {
  const g = new THREE.Group();
  const c = cyl(0.035, 0.04, h, M.wax(), 10); c.position.y = h / 2; g.add(c);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), mat("flame", () => new THREE.MeshBasicMaterial({ color: 0xffe2a0 })));
  flame.scale.y = 1.8; flame.position.y = h + 0.05; g.add(flame);
  const glowMat = mat("candleGlow", () => new THREE.SpriteMaterial({ map: T.glow(), color: 0xffb35a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  const s = new THREE.Sprite(glowMat); s.scale.set(0.55, 0.55, 1); s.position.y = h + 0.05; g.add(s);
  g.position.set(x, y, z);
  b.add(g, { cast: false });
  let pl = null;
  if (light) {
    pl = new THREE.PointLight(0xffa64d, intensity, distance, 1.3);
    pl.position.set(x, y + h + 0.15, z); b.group.add(pl);
    b.lights.push(pl); pl.userData.base = intensity;
  }
  const seed = Math.random() * 10;
  b.onUpdate((dt, clock) => {
    const t = performance.now() / 1000 + seed;
    const f = 1 + Math.sin(t * 13) * 0.06 + Math.sin(t * 7.3) * 0.05;
    flame.scale.set(1, 1.8 * f, 1); s.scale.setScalar(0.55 * f);
    if (pl) pl.intensity = pl.userData.base * (pl.userData.night ?? 1) * f;
  });
  return g;
}

export function candelabra(b, x, y, z, { light = true } = {}) {
  const g = new THREE.Group();
  const stem = cyl(0.03, 0.08, 0.42, M.brass(), 10); stem.position.y = 0.21; g.add(stem);
  const base = cyl(0.12, 0.14, 0.04, M.brass(), 14); base.position.y = 0.02; g.add(base);
  const arm = box(0.42, 0.03, 0.03, M.brass()); arm.position.y = 0.38; g.add(arm);
  g.position.set(x, y, z); b.add(g);
  candle(b, x - 0.2, y + 0.4, z, {}); candle(b, x, y + 0.44, z, { light }); candle(b, x + 0.2, y + 0.4, z, {});
  return g;
}

export function bookStack(b, x, y, z, { n = 3, rot = 0, seed = 1 } = {}) {
  const r = T.rng(seed * 7 + 3), g = new THREE.Group();
  const cols = [0x6b2b24, 0x2b3d66, 0x2f4b33, 0x5a4022, 0x4a2a4a, 0x7a5a2a];
  let yy = 0;
  for (let i = 0; i < n; i++) {
    const w = 0.32 + r() * 0.12, d = 0.24 + r() * 0.06, h = 0.05 + r() * 0.04;
    const bk = box(w, h, d, mat("book" + (i + seed) % cols.length, () => new THREE.MeshStandardMaterial({ color: cols[(i + seed) % cols.length], roughness: 0.7 })));
    bk.position.y = yy + h / 2; bk.rotation.y = (r() - 0.5) * 0.4; g.add(bk);
    const pages = box(w - 0.03, h - 0.015, d - 0.02, M.paper()); pages.position.copy(bk.position); pages.position.x += 0.016; pages.rotation.y = bk.rotation.y; g.add(pages);
    yy += h;
  }
  g.position.set(x, y, z); g.rotation.y = rot; b.add(g); return g;
}

export function openBook(b, x, y, z, { rot = 0 } = {}) {
  const g = new THREE.Group();
  const cover = box(0.62, 0.03, 0.42, mat("cover", () => new THREE.MeshStandardMaterial({ color: 0x5a2a20, roughness: 0.7 }))); cover.position.y = 0.015; g.add(cover);
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.03, 0.38), mat("pageTex", () => new THREE.MeshStandardMaterial({ map: T.parchment(), roughness: 0.9 })));
    p.position.set(s * 0.15, 0.045, 0); p.rotation.z = s * -0.08; g.add(p);
  }
  g.position.set(x, y, z); g.rotation.y = rot; b.add(g); return g;
}

export function globe(b, x, z, { y = 0, scale = 1, stand = true } = {}) {
  const g = new THREE.Group();
  const gm = mat("globe", () => {
    const c = document.createElement("canvas"); c.width = 512; c.height = 256; const x2 = c.getContext("2d"), r = T.rng(5);
    x2.fillStyle = "#28456a"; x2.fillRect(0, 0, 512, 256);
    x2.fillStyle = "#c9a45e"; for (let i = 0; i < 9; i++) { x2.beginPath(); const cx = r() * 512, cy = 50 + r() * 156; for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; x2.lineTo(cx + Math.cos(a) * (20 + r() * 40), cy + Math.sin(a) * (15 + r() * 30)); } x2.fill(); }
    x2.strokeStyle = "rgba(230,200,140,.35)"; for (let i = 0; i < 12; i++) { x2.beginPath(); x2.moveTo(i * 43, 0); x2.lineTo(i * 43, 256); x2.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.45, metalness: 0.1 });
  });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.38 * scale, 32, 20), gm); sphere.position.y = (stand ? 1.15 : 0.42) * scale; sphere.rotation.z = 0.4; g.add(sphere);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.43 * scale, 0.018 * scale, 6, 40), M.brass()); ring.position.copy(sphere.position); ring.rotation.y = Math.PI / 2; ring.rotation.x = 0.4; g.add(ring);
  if (stand) {
    const leg = cyl(0.04, 0.06, 0.75 * scale, M.woodDark(), 10); leg.position.y = 0.38 * scale; g.add(leg);
    const foot = cyl(0.3 * scale, 0.34 * scale, 0.08, M.woodDark(), 16); foot.position.y = 0.04; g.add(foot);
    b.collide(x, z, 0.8 * scale, 0.8 * scale);
  }
  g.position.set(x, y, z); b.add(g);
  b.onUpdate(dt => { sphere.rotation.y += dt * 0.15; });
  return g;
}

// 天球儀：石座＋三層黃銅環慢速旋轉
export function armillary(b, x, z, { scale = 1, pedestal = 1.1 } = {}) {
  const g = new THREE.Group();
  const ped = box(0.9 * scale, pedestal, 0.9 * scale, M.woodDark()); ped.position.y = pedestal / 2; g.add(ped);
  const capm = box(1.05 * scale, 0.1, 1.05 * scale, M.woodDark()); capm.position.y = pedestal; g.add(capm);
  const stem = cyl(0.05, 0.12, 0.5 * scale, M.brass(), 10); stem.position.y = pedestal + 0.25 * scale; g.add(stem);
  const core = new THREE.Group(); core.position.y = pedestal + 1.15 * scale; g.add(core);
  const rings = [];
  for (let i = 0; i < 4; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry((0.62 - i * 0.07) * scale, 0.025 * scale, 8, 48), M.brass());
    r.rotation.set(i * 0.7, i * 1.1, i * 0.4); core.add(r); rings.push(r);
  }
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.66 * scale, 0.05 * scale, 6, 48), M.brass()); band.rotation.x = Math.PI / 2 + 0.4; core.add(band);
  core.add(new THREE.Mesh(new THREE.SphereGeometry(0.1 * scale, 16, 12), M.brass()));
  const sup = new THREE.Mesh(new THREE.TorusGeometry(0.7 * scale, 0.03 * scale, 6, 48, Math.PI), M.brass()); sup.position.y = pedestal + 1.15 * scale; sup.rotation.z = Math.PI; g.add(sup);
  g.position.set(x, 0, z); b.add(g);
  b.collide(x, z, 1.1 * scale, 1.1 * scale);
  b.onUpdate(dt => { rings.forEach((r, i) => { r.rotation.y += dt * (0.12 + i * 0.05); r.rotation.x += dt * 0.03 * (i % 2 ? 1 : -1); }); });
  return g;
}

export function banner(b, x, y, z, { rot = 0, hue = 222, emblem = "star", w = 1.1, h = 2.8 } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h, 1, 8), new THREE.MeshStandardMaterial({ map: T.banner(hue, emblem), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.95 }));
  const pos = m.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin((pos.getY(i) / h) * 3) * 0.04);
  m.geometry.computeVertexNormals();
  m.position.set(x, y, z); m.rotation.y = rot; b.add(m, { cast: false });
  const rod = cyl(0.03, 0.03, w + 0.3, M.brass(), 8); rod.rotation.z = Math.PI / 2; rod.position.set(x, y + h / 2 + 0.05, z); rod.rotation.y = rot; b.add(rod);
  return m;
}

export function carpet(b, x, z, w, d, { color = "navy", rot = 0, seed = 4 } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: T.carpet(color, seed), roughness: 1 }));
  m.rotation.x = -Math.PI / 2; m.rotation.z = rot; m.position.set(x, 0.012, z);
  b.add(m, { cast: false }); return m;
}

// 欄杆：從 (x1,z1) 到 (x2,z2)
export function balustrade(b, x1, z1, x2, z2, { h = 1.05 } = {}) {
  const len = Math.hypot(x2 - x1, z2 - z1), ang = Math.atan2(z2 - z1, x2 - x1);
  const g = new THREE.Group(), stone = M.stoneTrim();
  const rail = box(len, 0.14, 0.3, stone); rail.position.y = h; g.add(rail);
  const base = box(len, 0.16, 0.34, stone); base.position.y = 0.08; g.add(base);
  const n = Math.floor(len / 0.32);
  const bgeo = new THREE.CylinderGeometry(0.06, 0.09, h - 0.2, 8);
  for (let i = 0; i < n; i++) { const p = new THREE.Mesh(bgeo, stone); p.position.set(-len / 2 + 0.16 + i * (len / n), h / 2, 0); g.add(p); }
  for (const s of [-1, 1]) { const post = box(0.36, h + 0.15, 0.4, stone); post.position.set((s * len) / 2, (h + 0.15) / 2, 0); g.add(post); }
  g.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2); g.rotation.y = -ang; b.add(g);
  const horiz = Math.abs(Math.cos(ang)) > 0.5;
  b.collide((x1 + x2) / 2, (z1 + z2) / 2, horiz ? len : 0.5, horiz ? 0.5 : len);
  return g;
}

export function pillar(b, x, z, { h = 6.5, r = 0.35 } = {}) {
  const g = new THREE.Group(), stone = mat("pillar", () => new THREE.MeshStandardMaterial({ map: texRepeat(T.stoneWall(), 0.5, 2), roughness: 0.9 }));
  const s = cyl(r, r * 1.08, h, stone, 16); s.position.y = h / 2; g.add(s);
  const base = box(r * 2.8, 0.4, r * 2.8, M.stoneTrim()); base.position.y = 0.2; g.add(base);
  const cap = box(r * 2.8, 0.3, r * 2.8, M.stoneTrim()); cap.position.y = h - 0.15; g.add(cap);
  g.position.set(x, 0, z); b.add(g);
  b.collide(x, z, r * 2.8, r * 2.8);
  return g;
}

export function wallFrame(b, x, y, z, { rot = 0, w = 1.1, h = 1.4, seed = 1 } = {}) {
  const g = new THREE.Group();
  const frame = box(w + 0.18, h + 0.18, 0.08, M.brass()); g.add(frame);
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: T.painting(seed), roughness: 0.8 })); pic.position.z = 0.045; g.add(pic);
  g.position.set(x, y, z); g.rotation.y = rot; b.add(g, { cast: false }); return g;
}

export function starChart(b, x, y, z, { rot = 0, w = 3.2, h = 2.2 } = {}) {
  const g = new THREE.Group();
  const frame = box(w + 0.3, h + 0.3, 0.12, M.woodDark()); g.add(frame);
  const c = document.createElement("canvas"); c.width = 1024; c.height = 700; const x2 = c.getContext("2d"), r = T.rng(19);
  x2.fillStyle = "#1d2a2a"; x2.fillRect(0, 0, 1024, 700);
  x2.strokeStyle = "rgba(210,190,140,.55)"; x2.lineWidth = 2;
  for (let i = 1; i < 6; i++) { x2.beginPath(); x2.arc(512, 350, i * 62, 0, 7); x2.stroke(); }
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; x2.beginPath(); x2.moveTo(512, 350); x2.lineTo(512 + Math.cos(a) * 330, 350 + Math.sin(a) * 330); x2.stroke(); }
  x2.fillStyle = "#f2e2b0"; const stars = [];
  for (let i = 0; i < 60; i++) { const sx = r() * 1024, sy = r() * 700; stars.push([sx, sy]); x2.beginPath(); x2.arc(sx, sy, 1 + r() * 3, 0, 7); x2.fill(); }
  x2.strokeStyle = "rgba(240,220,160,.7)"; for (let i = 0; i < 14; i++) { const a = stars[i * 2], z2 = stars[i * 2 + 1]; x2.beginPath(); x2.moveTo(a[0], a[1]); x2.lineTo(z2[0], z2[1]); x2.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, emissive: 0x111511 })); board.position.z = 0.065; g.add(board);
  g.position.set(x, y, z); g.rotation.y = rot; b.add(g); return g;
}

export function crystalBall(b, x, y, z) {
  const g = new THREE.Group();
  const stand = cyl(0.08, 0.14, 0.16, M.brass(), 12); stand.position.y = 0.08; g.add(stand);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 16), new THREE.MeshStandardMaterial({ color: 0xb8c8ff, emissive: 0x5566cc, emissiveIntensity: 0.9, transparent: true, opacity: 0.85, roughness: 0.05 }));
  ball.position.y = 0.32; g.add(ball);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow("150,170,255"), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.set(0.9, 0.9, 1); s.position.y = 0.32; g.add(s);
  g.position.set(x, y, z); b.add(g, { cast: false });
  b.onUpdate(() => { const t = performance.now() / 1000; ball.material.emissiveIntensity = 0.7 + Math.sin(t * 2) * 0.25; });
  return g;
}

export function wallSconce(b, x, y, z, { rot = 0, light = true } = {}) {
  const g = new THREE.Group();
  const plate = box(0.18, 0.4, 0.05, M.brass()); g.add(plate);
  const arm = box(0.05, 0.05, 0.3, M.brass()); arm.position.set(0, -0.1, 0.15); g.add(arm);
  g.position.set(x, y, z); g.rotation.y = rot; b.add(g);
  const off = new THREE.Vector3(0, -0.1, 0.3).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
  candle(b, x + off.x - 0.07 * Math.cos(rot), y + off.y, z + off.z, {});
  candle(b, x + off.x + 0.07 * Math.cos(rot), y + off.y, z + off.z, { light, intensity: 3, distance: 7 });
}

// 出口拱門的發光標記（地面）
export function exitMarker(b, x, z, w, d) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: T.glow("255,220,150"), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0.03, z); b.group.add(m);
  b.onUpdate(() => { m.material.opacity = 0.35 + Math.sin(performance.now() / 500) * 0.15; });
}
