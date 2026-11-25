// 場景道具工具（大廳、庭院、走廊、教室、溫室、黑湖共用）：道具、碰撞與熱點登記。
// 介面見 docs/js/CONTRACT.md。單位：公尺；Y 朝上；地面 y=0；x∈[0,W]、z∈[0,D]，北牆 z=0、西牆 x=0。
// 共用貼圖取自 ../textures.js；此檔只補少數場景專屬貼圖。美術方向見 assets/art-direction/ART-DIRECTION.md。
import * as THREE from "three";
import * as T from "../textures.js";

export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// 共用貼圖有快取，要改 repeat 必須複製一份。
export function rep(t, x, y = x) {
  const c = t.clone();
  c.repeat.set(x, y);
  c.needsUpdate = true;
  return c;
}

const cache = new Map();
function canvasTex(key, w, h, draw) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, t);
  return t;
}

function speckle(g, w, h, r, n, alpha, light = false) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = light ? `rgba(255,240,210,${alpha * r()})` : `rgba(30,18,10,${alpha * r()})`;
    g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
  }
}

// ---------- 場景專屬貼圖 ----------
export const tex = {
  dirt() {
    return canvasTex("dirt", 256, 256, (g, w, h) => {
      const r = rng(13); g.fillStyle = "#5e4129"; g.fillRect(0, 0, w, h);
      speckle(g, w, h, r, 4000, .45); speckle(g, w, h, r, 1200, .25, true);
    });
  },
  plaster(base = "#c9b291") {
    return canvasTex("plaster" + base, 256, 256, (g, w, h) => {
      const r = rng(5); g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${r() > .5 ? "90,70,50" : "255,240,215"},${.06 * r()})`; g.beginPath(); g.arc(r() * w, r() * h, 10 + r() * 40, 0, 7); g.fill(); }
      speckle(g, w, h, r, 1500, .18);
    });
  },
  // 魔咒學黑板：中文粉筆筆記與原創手勢圖
  charmsBoard() {
    return canvasTex("charmsBoard", 1024, 512, (g, w, h) => {
      const r = rng(31);
      g.fillStyle = "#24302b"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(200,210,200,${.03 + r() * .04})`; g.fillRect(r() * w, r() * h, 80 + r() * 120, 10 + r() * 14); }
      g.fillStyle = "rgba(240,236,220,.9)"; g.strokeStyle = "rgba(240,236,220,.8)"; g.lineWidth = 4;
      g.font = "bold 54px serif"; g.fillText("懸浮咒・基礎", 60, 96);
      g.font = "36px serif";
      ["一、手腕先轉半圈，再輕彈", "二、發音清楚，不要拖長尾音", "三、先練羽毛，再練書本"].forEach((t, i) => g.fillText(t, 60, 180 + i * 64));
      g.beginPath(); g.arc(800, 250, 140, 0, 7); g.stroke(); g.beginPath(); g.arc(800, 250, 88, 0, 7); g.stroke();
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; g.beginPath(); g.moveTo(800 + Math.cos(a) * 88, 250 + Math.sin(a) * 88); g.lineTo(800 + Math.cos(a) * 140, 250 + Math.sin(a) * 140); g.stroke(); }
      g.beginPath(); g.moveTo(660, 440); g.bezierCurveTo(740, 360, 860, 470, 940, 400); g.stroke();
      g.beginPath(); g.moveTo(925, 392); g.lineTo(942, 400); g.lineTo(930, 416); g.stroke();
      g.strokeStyle = "#5a3d24"; g.lineWidth = 26; g.strokeRect(0, 0, w, h);
    });
  },
  notice() {
    return canvasTex("notice", 512, 384, (g, w, h) => {
      g.fillStyle = "#6b4b2e"; g.fillRect(0, 0, w, h);
      const r = rng(21);
      for (let i = 0; i < 11; i++) {
        const pw = 90 + r() * 60, ph = 90 + r() * 70, x = 20 + r() * (w - pw - 40), y = 20 + r() * (h - ph - 40);
        g.save(); g.translate(x + pw / 2, y + ph / 2); g.rotate((r() - .5) * .25);
        g.fillStyle = ["#f1e3c4", "#e8d3a8", "#f4ead2", "#dfc79b"][i % 4]; g.fillRect(-pw / 2, -ph / 2, pw, ph);
        g.fillStyle = "rgba(60,40,30,.65)"; g.fillRect(-pw / 2 + 10, -ph / 2 + 14, pw * .6, 5);
        for (let l = 0; l < 6; l++) g.fillRect(-pw / 2 + 10, -ph / 2 + 30 + l * 11, pw - 20 - r() * 30, 3);
        g.fillStyle = "#9a2a2a"; g.beginPath(); g.arc(0, -ph / 2 + 6, 5, 0, 7); g.fill(); g.restore();
      }
    });
  },
  sky(top = "#7b8fb0", mid = "#efb67c", bottom = "#f9dca8") {
    return canvasTex("sky" + top + mid + bottom, 16, 256, (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, top); grd.addColorStop(.62, mid); grd.addColorStop(1, bottom);
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
    });
  },
};

// ---------- 場景建構器 ----------
export function createKit(seed = 1) {
  const group = new THREE.Group();
  const colliders = [];
  const hotspots = [];
  const updaters = [];
  const M = {};
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: .85, metalness: 0, ...o });
  // 同色材質共用，讓靜態網格可以合併成少量 draw call
  const colorMats = new Map();
  const solid = (key) => {
    if (!colorMats.has(key)) { const [color, f] = key.split("|"); colorMats.set(key, std({ color, roughness: .8, side: f === "ds" ? THREE.DoubleSide : THREE.FrontSide })); }
    return colorMats.get(key);
  };
  M.wood = std({ map: T.wood("light"), roughness: .7 });
  M.darkWood = std({ map: T.wood("dark"), roughness: .7 });
  M.stone = std({ map: T.stoneWall("warm") });
  M.trim = std({ color: "#a48b6b" });
  M.brass = std({ color: "#c29a52", metalness: .7, roughness: .38 });
  M.iron = std({ color: "#3a322c", metalness: .55, roughness: .5 });
  M.paper = std({ map: T.parchment() });
  M.flame = new THREE.MeshBasicMaterial({ color: "#ffd890" });
  M.wax = std({ color: "#f3e6c8", roughness: .6 });
  M.glass = new THREE.MeshBasicMaterial({ map: T.windowView(seed) });
  M.dirt = std({ map: tex.dirt() });
  const glowTex = T.glow();
  const shaftTex = T.lightShaft();

  const add = (mesh, parent = group) => { mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh; };
  const box = (w, h, d, mat, x = 0, y = 0, z = 0, parent) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return add(m, parent); };
  const cyl = (rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 12, parent) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); return add(m, parent); };
  const collide = (x, z, w, d) => colliders.push({ x, z, w, d });
  const hotspot = (id, name, kind, x, z, actions, desc) => hotspots.push({ id, name, kind, x, z, actions, desc });
  // 依旋轉角換算 AABB 寬深
  const rotWD = (w, d, rot) => (Math.abs(Math.sin(rot)) > .7 ? [d, w] : [w, d]);

  const kit = {
    group, colliders, hotspots, updaters, M, add, box, cyl, collide, hotspot, std, solid,

    floor(w, d, mat, x = w / 2, z = d / 2, y = 0) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
      m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; group.add(m); return m;
    },
    // 只遮陽光、不畫出來的天花板：讓陽光只從窗戶照入
    ceiling(w, d, h) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w + 2, .2, d + 2), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
      m.position.set(w / 2, h, d / 2); m.castShadow = true; group.add(m); return m;
    },
    // 北牆：rot=0，正面朝 +z；西牆：rot=π/2，正面朝 +x。回傳牆的區域群組，窗戶等可掛在其上。
    wall(len, h, x, z, rot = 0, mat = M.stone, thick = .5) {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group.add(g);
      const t = mat.clone();
      if (t.map) t.map = rep(t.map, len / 4, h / 4);
      box(len, h, thick, t, 0, h / 2, 0, g);
      box(len, .35, thick + .18, M.trim, 0, .175, 0, g);
      box(len, .25, thick + .22, M.trim, 0, h - .12, 0, g);
      return g;
    },
    // 有窗洞的牆：窗洞讓陽光真的照進來，在地上投出窗格光影。openings: [{ c: 沿牆中心, w, sill, top }]（區域座標，c 以牆中心為 0）
    windowWall(len, h, x, z, rot, openings, mat = M.stone, thick = .5) {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group.add(g);
      const piece = (x0, x1, y0, y1) => {
        if (x1 - x0 < .01 || y1 - y0 < .01) return;
        const t = mat.clone(); if (t.map) t.map = rep(t.map, (x1 - x0) / 4, (y1 - y0) / 4);
        box(x1 - x0, y1 - y0, thick, t, (x0 + x1) / 2, (y0 + y1) / 2, 0, g);
      };
      const ops = [...openings].sort((a, b) => a.c - b.c);
      let cur = -len / 2;
      for (const o of ops) {
        piece(cur, o.c - o.w / 2, 0, h);
        piece(o.c - o.w / 2, o.c + o.w / 2, 0, o.sill);
        piece(o.c - o.w / 2, o.c + o.w / 2, o.top, h);
        cur = o.c + o.w / 2;
      }
      piece(cur, len / 2, 0, h);
      box(len, .35, thick + .18, M.trim, 0, .175, 0, g);
      box(len, .25, thick + .22, M.trim, 0, h - .12, 0, g);
      return g;
    },
    // 哥德式尖拱窗（掛在牆群組上，區域座標）。opening=true 時會在牆上「挖洞」：用一塊發光玻璃覆蓋。
    gothicWindow(parent, x, y, w, h, z = .27) {
      const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
      const shape = new THREE.Shape();
      shape.moveTo(-w / 2, 0); shape.lineTo(-w / 2, h - w * .55);
      shape.quadraticCurveTo(-w / 2, h - w * .05, 0, h);
      shape.quadraticCurveTo(w / 2, h - w * .05, w / 2, h - w * .55);
      shape.lineTo(w / 2, 0); shape.closePath();
      const outer = shape.clone();
      const frame = new THREE.Mesh(new THREE.ShapeGeometry(outer), M.trim);
      frame.scale.set(1.16, 1.07, 1); frame.position.set(0, -.1, .005); g.add(frame);
      const glass = new THREE.Mesh(new THREE.ShapeGeometry(shape), M.glass); glass.position.z = .02; g.add(glass);
      const bars = Math.max(2, Math.round(w / .45));
      for (let i = 1; i < bars; i++) box(.05, h - w * .25, .06, M.iron, -w / 2 + i * w / bars, (h - w * .25) / 2, .05, g);
      for (let yy = h * .2; yy < h - w * .45; yy += h * .2) box(w, .05, .06, M.iron, 0, yy, .05, g);
      box(w + .5, .14, .36, M.trim, 0, -.07, .12, g);
      return g;
    },
    // 光束：從 (x,y,z) 往 dir 方向斜射的半透明面片
    lightShaft(x, y, z, w, len, dir = [1, -1, .4], opacity = .3) {
      const mat = new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, color: "#ffd9a0" });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, len), mat);
      m.geometry.translate(0, -len / 2, 0);
      m.position.set(x, y, z);
      const d = new THREE.Vector3(...dir).normalize();
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), d);
      group.add(m);
      const ph = x + z;
      updaters.push((dt, t) => { mat.opacity = opacity * (.85 + .15 * Math.sin(t * .6 + ph)); });
      return m;
    },
    glowSprite(x, y, z, s = .5, color = "#ffd38a", parent = group) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      sp.position.set(x, y, z); sp.scale.set(s, s, s); parent.add(sp); return sp;
    },
    candle(x, y, z, parent = group, light = false, size = 1) {
      const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(size); parent.add(g);
      cyl(.03, .035, .22, M.wax, 0, .11, 0, 8, g);
      const f = new THREE.Mesh(new THREE.ConeGeometry(.022, .08, 6), M.flame); f.position.y = .27; f.userData.dynamic = true; g.add(f);
      const sp = kit.glowSprite(0, .27, 0, .3, "#ffcf80", g);
      const ph = Math.random() * 10;
      updaters.push((dt, t) => { const k = 1 + .12 * Math.sin(t * 9 + ph) + .06 * Math.sin(t * 23 + ph); f.scale.set(1, k, 1); sp.scale.setScalar(.3 * k); });
      if (light) { const l = new THREE.PointLight("#ffb56b", 2.5, 6, 1.6); l.position.y = .45; g.add(l); updaters.push((dt, t) => { l.intensity = 2.5 * (1 + .08 * Math.sin(t * 11 + ph)); }); }
      return g;
    },
    candelabra(x, y, z, light = true, parent = group) {
      const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
      cyl(.08, .12, .05, M.brass, 0, .025, 0, 10, g); cyl(.02, .02, .4, M.brass, 0, .22, 0, 6, g);
      box(.36, .025, .025, M.brass, 0, .4, 0, g);
      [-.18, 0, .18].forEach((dx, i) => kit.candle(dx, i === 1 ? .44 : .41, 0, g, light && i === 1));
      return g;
    },
    sconce(parent, x, y, z = .3, light = true) {
      const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
      box(.14, .3, .05, M.brass, 0, 0, -.03, g); box(.04, .04, .26, M.brass, 0, -.06, .1, g);
      cyl(.07, .04, .05, M.brass, 0, -.04, .22, 8, g);
      kit.candle(0, -.02, .22, g, light);
      return g;
    },
    // 吊燈：鐵環 + 一圈蠟燭 + 一盞點光
    chandelier(x, y, z, r = .9, n = 8, intensity = 6) {
      const g = new THREE.Group(); g.position.set(x, y, z); g.userData.dynamic = true; group.add(g);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, .04, 6, 28), M.iron); ring.rotation.x = Math.PI / 2; g.add(ring);
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(r * .55, .03, 6, 20), M.iron); ring2.rotation.x = Math.PI / 2; ring2.position.y = .25; g.add(ring2);
      for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; const s = box(.025, .025, r, M.iron, Math.cos(a) * r / 2, .12, Math.sin(a) * r / 2, g); s.rotation.y = -a + Math.PI / 2; }
      cyl(.012, .012, 6, M.iron, 0, 3.2, 0, 4, g);
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; kit.candle(Math.cos(a) * r, .02, Math.sin(a) * r, g, false); }
      if (intensity) { const l = new THREE.PointLight("#ffb46a", intensity, 12, 1.3); l.position.y = -.2; g.add(l); }
      const ph = x;
      updaters.push((dt, t) => { g.rotation.y = Math.sin(t * .3 + ph) * .05; });
      return g;
    },
    banner(parent, x, y, hue, emblem, w = 1, h = 2.5, z = .3) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: T.banner(hue, emblem), transparent: true, alphaTest: .35, side: THREE.DoubleSide, roughness: 1 }));
      m.position.set(x, y, z); m.castShadow = true; parent.add(m);
      box(w + .2, .05, .05, M.brass, x, y + h / 2, z, parent);
      return m;
    },
    painting(parent, x, y, seed, w = .9, h = 1.15, z = .3) {
      const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
      box(w + .2, h + .2, .08, M.brass, 0, 0, 0, g);
      box(w + .06, h + .06, .09, M.darkWood, 0, 0, 0, g);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: T.painting(seed), roughness: .9 }));
      p.position.z = .05; g.add(p);
      return g;
    },
    pillar(x, z, h, r = .35, mat = M.stone) {
      const g = new THREE.Group(); g.position.set(x, 0, z); group.add(g);
      box(r * 2.6, .4, r * 2.6, M.trim, 0, .2, 0, g);
      box(r * 2.2, .2, r * 2.2, M.trim, 0, .5, 0, g);
      const t = mat.clone(); if (t.map) t.map = rep(t.map, 1, h / 3);
      cyl(r, r * 1.05, h - 1, t, 0, h / 2, 0, 14, g);
      box(r * 2.2, .2, r * 2.2, M.trim, 0, h - .5, 0, g);
      box(r * 2.6, .4, r * 2.6, M.trim, 0, h - .2, 0, g);
      collide(x, z, r * 2.6, r * 2.6);
      return g;
    },
    // 半圓拱門洞（一片牆面，中間拱形開口）
    arch(x, z, span, h, rot = 0, thick = .6, mat = M.stone) {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group.add(g);
      const r = span / 2, top = h + r + .5;
      const shape = new THREE.Shape();
      shape.moveTo(-r - .5, 0); shape.lineTo(-r - .5, top); shape.lineTo(r + .5, top); shape.lineTo(r + .5, 0);
      shape.lineTo(r, 0); shape.lineTo(r, h); shape.absarc(0, h, r, 0, Math.PI, false); shape.lineTo(-r, 0); shape.closePath();
      const t = mat.clone(); if (t.map) t.map = rep(t.map, .3, .3);
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false }), t);
      m.position.z = -thick / 2; add(m, g);
      // 拱心石
      box(.4, .5, thick + .1, M.trim, 0, h + r + .1, 0, g);
      return g;
    },
    table(x, z, w, d, h = .8, mat = M.wood, rot = 0) {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group.add(g);
      box(w, .08, d, mat, 0, h - .04, 0, g);
      box(w - .14, .14, d - .14, mat, 0, h - .15, 0, g);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(.11, h - .08, .11, mat, a * (w / 2 - .14), (h - .08) / 2, b * (d / 2 - .14), g));
      if (w > 2.4) box(w - .4, .07, .07, mat, 0, .2, 0, g);
      const [cw, cd] = rotWD(w, d, rot); collide(x, z, cw, cd);
      return g;
    },
    bench(x, z, w, rot = 0, mat = M.darkWood) {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group.add(g);
      box(w, .07, .38, mat, 0, .45, 0, g);
      for (let p = -w / 2 + .2; p <= w / 2 - .1; p += Math.max(1.2, (w - .4) / Math.ceil((w - .4) / 2))) box(.08, .42, .3, mat, p, .21, 0, g);
      box(.08, .42, .3, mat, w / 2 - .2, .21, 0, g);
      const [cw, cd] = rotWD(w, .4, rot); collide(x, z, cw, cd);
      return g;
    },
    books(parent, x, y, z, n = 5, r = rng(2), along = "x") {
      const cols = ["#6b2a2a", "#2e3e5c", "#3f5233", "#7a5a2a", "#4a2f4a", "#8a6a3a", "#5a4632"];
      let off = 0;
      for (let i = 0; i < n; i++) {
        const w = .05 + r() * .04, h = .18 + r() * .1;
        const mat = solid(cols[(r() * cols.length) | 0]);
        if (along === "x") box(w, h, .17, mat, x + off, y + h / 2, z, parent);
        else box(.17, h, w, mat, x, y + h / 2, z + off, parent);
        off += w + .006;
      }
    },
    bookStack(parent, x, y, z, n = 3, r = rng(4)) {
      const cols = ["#6b2a2a", "#2e3e5c", "#3f5233", "#7a5a2a", "#4a2f4a"];
      let yy = y;
      for (let i = 0; i < n; i++) { const h = .05 + r() * .03; const b = box(.3 + r() * .08, h, .22 + r() * .05, solid(cols[(r() * cols.length) | 0]), x, yy + h / 2, z, parent); b.rotation.y = (r() - .5) * .5; yy += h; }
    },
    bookshelf(x, z, w = 1.6, h = 3, rot = 0, seed = 3) {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group.add(g);
      box(w, h, .1, M.darkWood, 0, h / 2, -.22, g);
      box(.1, h, .5, M.darkWood, -w / 2, h / 2, 0, g); box(.1, h, .5, M.darkWood, w / 2, h / 2, 0, g);
      box(w + .2, .12, .56, M.darkWood, 0, h + .06, 0, g);
      const front = new THREE.Mesh(new THREE.PlaneGeometry(w - .1, h - .1), std({ map: T.bookshelf(seed, 5) }));
      front.position.set(0, h / 2, -.16); g.add(front);
      for (let s = 0; s <= 5; s++) box(w - .1, .05, .44, M.darkWood, 0, .05 + s * (h - .1) / 5, 0, g);
      const r = rng(seed);
      for (let s = 0; s < 5; s++) kit.books(g, -w / 2 + .1, .075 + s * (h - .1) / 5, -.02, Math.floor((w - .3) / .085), r);
      const [cw, cd] = rotWD(w + .1, .6, rot); collide(x, z, cw, cd);
      return g;
    },
    // 石階：沿 -z 方向上升（rot 轉向），回傳群組
    stairs(x, z, w, steps, rise, run, rot = 0, mat = M.stone, y = 0, parent = group) {
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot; parent.add(g);
      for (let i = 0; i < steps; i++) { box(w, rise * (i + 1), run, mat, 0, rise * (i + 1) / 2, -i * run, g); box(w + .02, .04, .06, M.trim, 0, rise * (i + 1) - .02, -i * run + run / 2 - .03, g); }
      return g;
    },
    balustrade(x, z, len, rot = 0, h = .95, parent = group, y = 0) {
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot; parent.add(g);
      box(len, .14, .3, M.trim, 0, h, 0, g); box(len, .14, .3, M.trim, 0, .07, 0, g);
      for (let p = -len / 2 + .15; p <= len / 2 - .1; p += .3) cyl(.05, .07, h - .14, M.trim, p, (h - .07) / 2 + .07, 0, 8, g);
      return g;
    },
    pot(x, y, z, r = .25, color = "#8a4a2a", parent = group) {
      const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
      const mat = solid(color);
      cyl(r, r * .72, r * 1.4, mat, 0, r * .7, 0, 14, g);
      cyl(r * 1.1, r * 1.08, r * .2, mat, 0, r * 1.4, 0, 14, g);
      cyl(r * .95, r * .95, .02, M.dirt, 0, r * 1.46, 0, 14, g);
      return g;
    },
    // 程序化魔法植物：寬葉、捲鬚發光花苞、高莖蕨、圓果
    plant(parent, x, y, z, kind = 0, size = 1, seed = 1) {
      const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(size); parent.add(g);
      const r = rng(seed * 17 + kind);
      const leafCol = ["#4f6b34", "#6c7d3a", "#3d5a3f", "#7d6a3a", "#5b7a48"][(kind + seed) % 5];
      const leafMat = solid(leafCol + "|ds");
      const k = kind % 4;
      if (k === 0) {
        for (let i = 0; i < 10; i++) {
          const leaf = new THREE.Mesh(new THREE.SphereGeometry(.2, 8, 6), leafMat);
          leaf.scale.set(.38, .07, 1); const a = i / 10 * Math.PI * 2 + r();
          leaf.position.set(Math.cos(a) * .17, .12 + r() * .22, Math.sin(a) * .17);
          leaf.rotation.set(-.5 - r() * .3, -a + Math.PI / 2, 0, "YXZ"); add(leaf, g);
        }
      } else if (k === 1) {
        const budMat = std({ color: "#f0b0d4", emissive: "#d0609a", emissiveIntensity: 1 });
        for (let i = 0; i < 6; i++) {
          const pts = []; const a = r() * 6.28, h = .5 + r() * .4;
          for (let t = 0; t <= 1.001; t += .1) pts.push(new THREE.Vector3(Math.cos(a + t * 5) * .12 * t, t * h, Math.sin(a + t * 5) * .12 * t));
          add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 18, .016, 5), leafMat), g);
          const bud = new THREE.Mesh(new THREE.SphereGeometry(.045, 8, 6), budMat); bud.position.copy(pts[pts.length - 1]); g.add(bud);
        }
        g.userData.dynamic = true; const ph = r() * 6; updaters.push((dt, t) => { g.rotation.y = Math.sin(t * .8 + ph) * .3; });
      } else if (k === 2) {
        for (let i = 0; i < 8; i++) {
          const leaf = new THREE.Mesh(new THREE.ConeGeometry(.06, .75, 4), leafMat);
          const a = i / 8 * Math.PI * 2; leaf.position.set(Math.cos(a) * .07, .36, Math.sin(a) * .07);
          leaf.rotation.set(Math.sin(a) * .35, 0, -Math.cos(a) * .35); add(leaf, g);
        }
      } else {
        const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(.25, 1), std({ map: T.foliage(100, seed), flatShading: true }));
        bush.position.y = .25; add(bush, g);
        const fruit = std({ color: "#e0a040", emissive: "#a05010", emissiveIntensity: .5 });
        for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(.04, 6, 5), fruit); const a = r() * 6.28; f.position.set(Math.cos(a) * .22, .2 + r() * .2, Math.sin(a) * .22); g.add(f); }
      }
      return g;
    },
    tree(x, z, h = 5, seed = 1, hue = 95, collide_ = true) {
      const g = new THREE.Group(); g.position.set(x, 0, z); group.add(g);
      const r = rng(seed);
      cyl(.16, .3, h * .55, std({ color: "#4a3626", roughness: 1 }), 0, h * .27, 0, 8, g);
      const leaf = std({ map: T.foliage(hue, seed), roughness: .95, flatShading: true });
      for (let i = 0; i < 7; i++) {
        const s = h * (.2 + r() * .12);
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), leaf);
        m.position.set((r() - .5) * h * .4, h * (.55 + r() * .32), (r() - .5) * h * .4);
        add(m, g);
      }
      if (collide_) collide(x, z, .7, .7);
      return g;
    },
    rock(x, z, s = .6, seed = 1, y = 0, solid = true) {
      const r = rng(seed);
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), std({ color: "#837766", roughness: 1, flatShading: true }));
      m.position.set(x, y + s * .3, z); m.scale.set(1, .55 + r() * .4, .8 + r() * .4); m.rotation.y = r() * 6;
      add(m);
      if (solid) collide(x, z, s * 1.6, s * 1.4);
      return m;
    },
    chest(x, z, rot = 0) {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group.add(g);
      box(.9, .5, .55, M.darkWood, 0, .25, 0, g);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(.275, .275, .9, 10, 1, false, 0, Math.PI), M.darkWood);
      lid.rotation.z = Math.PI / 2; lid.position.y = .5; add(lid, g);
      box(.92, .06, .57, M.brass, 0, .3, 0, g);
      const [cw, cd] = rotWD(.9, .6, rot); collide(x, z, cw, cd);
      return g;
    },
    globe(x, y, z) {
      const g = new THREE.Group(); g.position.set(x, y, z); group.add(g);
      cyl(.1, .14, .3, M.brass, 0, .15, 0, 8, g);
      const s = new THREE.Mesh(new THREE.SphereGeometry(.26, 20, 14), std({ color: "#3d5a78", roughness: .6 }));
      s.position.y = .55; s.userData.dynamic = true; add(s, g);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.3, .015, 6, 24), M.brass); ring.position.y = .55; ring.rotation.z = .4; g.add(ring);
      updaters.push((dt, t) => { s.rotation.y = t * .2; });
      return g;
    },
    barrel(x, z, y = 0) {
      const g = new THREE.Group(); g.position.set(x, y, z); group.add(g);
      cyl(.3, .26, .8, M.wood, 0, .4, 0, 12, g);
      [.12, .68].forEach((yy) => cyl(.305, .305, .05, M.iron, 0, yy, 0, 12, g));
      collide(x, z, .65, .65);
      return g;
    },
    carpet(x, z, w, d, color = "navy", rot = 0) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), std({ map: T.carpet(color), roughness: 1 }));
      m.rotation.set(-Math.PI / 2, 0, rot); m.position.set(x, .012, z); m.receiveShadow = true; group.add(m);
      return m;
    },
  };
  return kit;
}

// 把 kit 打包成場景契約（見 CONTRACT.md）
// 合併靜態網格：同材質、同陰影設定的網格併成一個，大幅減少 draw call。
// 會動的物件（userData.dynamic 或其祖先有標記）與半透明物件不合併。
export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const victims = [];
  root.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material) || o.material.transparent || !o.visible) return;
    for (let p = o; p && p !== root; p = p.parent) if (p.userData.dynamic) return;
    const g = o.geometry;
    if (!g.attributes.position || !g.attributes.normal || !g.attributes.uv) return;
    const key = o.material.uuid + (o.castShadow ? "c" : "") + (o.receiveShadow ? "r" : "");
    if (!buckets.has(key)) buckets.set(key, { mat: o.material, cast: o.castShadow, recv: o.receiveShadow, list: [] });
    buckets.get(key).list.push(o);
  });
  const m4 = new THREE.Matrix4(), n3 = new THREE.Matrix3();
  for (const b of buckets.values()) {
    if (b.list.length < 2) continue;
    let count = 0;
    const parts = b.list.map((o) => { const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry; count += g.attributes.position.count; return [o, g]; });
    const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), uv = new Float32Array(count * 2);
    let off = 0;
    const v = new THREE.Vector3();
    for (const [o, g] of parts) {
      m4.multiplyMatrices(inv, o.matrixWorld); n3.getNormalMatrix(m4);
      const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i).applyMatrix4(m4); pos.set([v.x, v.y, v.z], (off + i) * 3);
        v.fromBufferAttribute(N, i).applyMatrix3(n3).normalize(); nor.set([v.x, v.y, v.z], (off + i) * 3);
        uv[(off + i) * 2] = U.getX(i); uv[(off + i) * 2 + 1] = U.getY(i);
      }
      off += P.count;
      victims.push(o);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, b.mat); mesh.castShadow = b.cast; mesh.receiveShadow = b.recv;
    root.add(mesh);
  }
  for (const o of victims) { o.parent.remove(o); o.geometry.dispose?.(); }
}

export function finish(kit, spec) {
  const { group, colliders, hotspots, updaters } = kit;
  mergeStatic(group);
  let t = 0;
  const own = spec.update;
  return {
    ...spec,
    group, colliders, hotspots,
    update(dt, clock) {
      t += dt;
      for (const u of updaters) u(dt, t, clock);
      if (own) own(dt, clock, t);
    },
  };
}
