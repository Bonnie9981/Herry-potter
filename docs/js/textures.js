// 程序化手繪材質：所有貼圖在瀏覽器以 canvas 繪製，避免外部素材版權問題。
import * as THREE from "three";

export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")];
}

function hsl(h, s, l, a = 1) { return `hsla(${h},${s}%,${l}%,${a})`; }

function grain(ctx, w, h, r, amount = 0.08, size = 2) {
  for (let i = 0; i < (w * h) / (size * size * 3); i++) {
    const x = r() * w, y = r() * h, v = r();
    ctx.fillStyle = v > 0.5 ? `rgba(255,240,210,${amount * r()})` : `rgba(20,10,0,${amount * r()})`;
    ctx.fillRect(x, y, size, size);
  }
}

function brush(ctx, r, x, y, w, h, color, n = 18, alpha = 0.12) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.ellipse(x + r() * w, y + r() * h, 4 + r() * w * 0.25, 2 + r() * h * 0.12, r() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

const cache = new Map();
function cached(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

function toTex(c, { repeat = [1, 1], srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// 石板地：一張貼圖 = 4×4 塊石板（對應 4×4 公尺）。
export function stoneFloor(tone = "warm") {
  return cached("floor" + tone, () => {
    const S = 1024, [c, x] = canvas(S, S), r = rng(tone === "warm" ? 11 : 23);
    const base = tone === "warm" ? [32, 22, 52] : tone === "grey" ? [35, 8, 50] : [28, 18, 44];
    x.fillStyle = hsl(base[0], base[1], base[2] - 22);
    x.fillRect(0, 0, S, S);
    const n = 4, t = S / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const ox = (j % 2) * t * 0.5 * 0;
      const l = base[2] + (r() - 0.5) * 12, hue = base[0] + (r() - 0.5) * 10;
      const px = i * t + ox + 5, py = j * t + 5, s = t - 10;
      const g = x.createLinearGradient(px, py, px + s, py + s);
      g.addColorStop(0, hsl(hue, base[1], l + 5));
      g.addColorStop(1, hsl(hue, base[1], l - 6));
      x.fillStyle = g;
      x.beginPath();
      x.roundRect(px, py, s, s, 10);
      x.fill();
      brush(x, r, px, py, s, s, hsl(hue, base[1] - 5, l - 10), 14, 0.13);
      brush(x, r, px, py, s, s, hsl(hue, base[1] + 5, l + 10), 10, 0.12);
      // 細裂紋
      x.strokeStyle = hsl(hue, 20, l - 22, 0.35); x.lineWidth = 1.2;
      if (r() > 0.55) { x.beginPath(); let cx = px + r() * s, cy = py + r() * s; x.moveTo(cx, cy); for (let k = 0; k < 4; k++) { cx += (r() - 0.5) * 50; cy += (r() - 0.5) * 50; x.lineTo(cx, cy); } x.stroke(); }
      // 邊緣高光
      x.strokeStyle = hsl(hue, 30, l + 14, 0.35); x.lineWidth = 2;
      x.beginPath(); x.moveTo(px + 8, py + 2); x.lineTo(px + s - 8, py + 2); x.stroke();
    }
    grain(x, S, S, r, 0.1, 2);
    return toTex(c);
  });
}

export function stoneWall(tone = "warm") {
  return cached("wall" + tone, () => {
    const W = 1024, H = 1024, [c, x] = canvas(W, H), r = rng(77);
    const hue = tone === "cool" ? 30 : 34;
    x.fillStyle = hsl(hue, 18, 30); x.fillRect(0, 0, W, H);
    const rows = 8, rh = H / rows;
    for (let j = 0; j < rows; j++) {
      const off = (j % 2) * 64;
      for (let i = -1; i < 9; i++) {
        const bw = 128, px = i * bw + off + 3, py = j * rh + 3;
        const l = 52 + (r() - 0.5) * 12;
        const g = x.createLinearGradient(0, py, 0, py + rh);
        g.addColorStop(0, hsl(hue + (r() - 0.5) * 6, 22, l + 4));
        g.addColorStop(1, hsl(hue, 20, l - 8));
        x.fillStyle = g;
        x.beginPath(); x.roundRect(px, py, bw - 6, rh - 6, 6); x.fill();
        brush(x, r, px, py, bw - 6, rh - 6, hsl(hue, 15, l - 14), 6, 0.15);
      }
    }
    grain(x, W, H, r, 0.12, 2);
    return toTex(c);
  });
}

export function wood(tone = "dark") {
  return cached("wood" + tone, () => {
    const S = 512, [c, x] = canvas(S, S), r = rng(tone === "dark" ? 5 : 9);
    const L = tone === "dark" ? 24 : 36;
    x.fillStyle = hsl(24, 42, L); x.fillRect(0, 0, S, S);
    for (let i = 0; i < 140; i++) {
      const y = r() * S, l = L + (r() - 0.5) * 14;
      x.strokeStyle = hsl(22 + r() * 8, 40, l, 0.5); x.lineWidth = 1 + r() * 3;
      x.beginPath(); x.moveTo(0, y);
      for (let k = 0; k <= 8; k++) x.lineTo((k / 8) * S, y + Math.sin(k + i) * 3 * r());
      x.stroke();
    }
    for (let i = 0; i < 6; i++) { x.fillStyle = hsl(20, 45, L - 10, 0.5); x.beginPath(); x.ellipse(r() * S, r() * S, 10 + r() * 10, 4 + r() * 4, 0, 0, 7); x.fill(); }
    grain(x, S, S, r, 0.08, 2);
    return toTex(c);
  });
}

// 書架正面：書脊排列，含層板。
export function bookshelf(seed = 3, rows = 5) {
  return cached("shelf" + seed + "_" + rows, () => {
    const W = 512, H = 1024, [c, x] = canvas(W, H), r = rng(seed);
    x.fillStyle = hsl(22, 45, 14); x.fillRect(0, 0, W, H);
    const rh = H / rows;
    const pal = [[0, 45, 30], [215, 40, 30], [130, 25, 26], [30, 50, 38], [40, 30, 22], [350, 35, 26], [200, 25, 40], [45, 60, 42]];
    for (let j = 0; j < rows; j++) {
      const top = j * rh + 18, bottom = (j + 1) * rh - 14;
      let px = 14;
      // 層板陰影
      const sg = x.createLinearGradient(0, top, 0, bottom);
      sg.addColorStop(0, "rgba(0,0,0,.65)"); sg.addColorStop(1, "rgba(0,0,0,.1)");
      while (px < W - 20) {
        if (r() < 0.06) { px += 18 + r() * 30; continue; }
        const bw = 14 + r() * 22, bh = (bottom - top) * (0.62 + r() * 0.36);
        const p = pal[Math.floor(r() * pal.length)];
        const lean = r() < 0.07 ? (r() - 0.5) * 0.25 : 0;
        x.save(); x.translate(px + bw / 2, bottom); x.rotate(lean);
        const g = x.createLinearGradient(-bw / 2, 0, bw / 2, 0);
        g.addColorStop(0, hsl(p[0], p[1], p[2] - 10)); g.addColorStop(0.4, hsl(p[0], p[1], p[2] + 6)); g.addColorStop(1, hsl(p[0], p[1], p[2] - 14));
        x.fillStyle = g; x.fillRect(-bw / 2, -bh, bw, bh);
        x.fillStyle = hsl(45, 70, 60, 0.75);
        x.fillRect(-bw / 2 + 2, -bh + 10, bw - 4, 2.5); x.fillRect(-bw / 2 + 2, -18, bw - 4, 2.5);
        if (r() > 0.5) x.fillRect(-bw / 2 + 4, -bh * 0.55, bw - 8, 6);
        x.restore();
        px += bw + 1;
      }
      x.fillStyle = sg; x.fillRect(0, j * rh, W, rh * 0.28);
      // 層板
      const pg = x.createLinearGradient(0, bottom, 0, bottom + 14);
      pg.addColorStop(0, hsl(26, 45, 34)); pg.addColorStop(1, hsl(22, 45, 18));
      x.fillStyle = pg; x.fillRect(0, bottom, W, 14 + 18);
    }
    // 側框
    x.fillStyle = hsl(24, 45, 22); x.fillRect(0, 0, 14, H); x.fillRect(W - 14, 0, 14, H);
    grain(x, W, H, r, 0.08, 2);
    return toTex(c);
  });
}

export function carpet(color = "navy", seed = 4) {
  return cached("carpet" + color + seed, () => {
    const W = 512, H = 1024, [c, x] = canvas(W, H), r = rng(seed);
    const hue = color === "navy" ? 222 : color === "red" ? 356 : color === "green" ? 150 : 40;
    x.fillStyle = hsl(hue, 38, 26); x.fillRect(0, 0, W, H);
    x.strokeStyle = hsl(42, 55, 55, 0.85); x.lineWidth = 8; x.strokeRect(22, 22, W - 44, H - 44);
    x.lineWidth = 3; x.strokeRect(40, 40, W - 80, H - 80);
    // 邊飾
    x.fillStyle = hsl(42, 55, 55, 0.7);
    for (let y = 60; y < H - 60; y += 36) { x.beginPath(); x.moveTo(31, y); x.lineTo(38, y + 9); x.lineTo(31, y + 18); x.lineTo(24, y + 9); x.fill(); x.beginPath(); x.moveTo(W - 31, y); x.lineTo(W - 24, y + 9); x.lineTo(W - 31, y + 18); x.lineTo(W - 38, y + 9); x.fill(); }
    // 中央星紋
    function star(cx, cy, R, a) { x.save(); x.translate(cx, cy); x.globalAlpha = a; x.beginPath(); for (let i = 0; i < 8; i++) { const ang = (i * Math.PI) / 4; const rr = i % 2 ? R * 0.35 : R; x.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr); } x.closePath(); x.fill(); x.restore(); }
    for (let i = 0; i < 26; i++) star(70 + r() * (W - 140), 70 + r() * (H - 140), 8 + r() * 10, 0.45);
    x.strokeStyle = hsl(42, 50, 52, 0.55); x.lineWidth = 3;
    x.beginPath(); x.arc(W / 2, H / 2, 120, 0, 7); x.stroke(); star(W / 2, H / 2, 70, 0.6);
    grain(x, W, H, r, 0.12, 3);
    return toTex(c);
  });
}

// 窗外：暖色夕照與樹影。
export function windowView(seed = 1, night = false) {
  return cached("win" + seed + night, () => {
    const W = 256, H = 512, [c, x] = canvas(W, H), r = rng(seed + 40);
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#ffe7b0"); g.addColorStop(0.5, "#ffc979"); g.addColorStop(1, "#d9925a");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) { x.fillStyle = hsl(70 + r() * 40, 35, 35 + r() * 25, 0.55); x.beginPath(); x.arc(r() * W, H * 0.35 + r() * H * 0.7, 10 + r() * 30, 0, 7); x.fill(); }
    x.fillStyle = "rgba(255,240,200,.35)"; x.fillRect(0, 0, W, H);
    return toTex(c, { repeat: [1, 1] });
  });
}

export function banner(hue = 222, emblem = "star") {
  return cached("banner" + hue + emblem, () => {
    const W = 256, H = 640, [c, x] = canvas(W, H), r = rng(hue);
    x.clearRect(0, 0, W, H);
    x.beginPath(); x.moveTo(0, 0); x.lineTo(W, 0); x.lineTo(W, H - 90); x.lineTo(W / 2, H); x.lineTo(0, H - 90); x.closePath();
    const g = x.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, hsl(hue, 45, 18)); g.addColorStop(0.5, hsl(hue, 45, 30)); g.addColorStop(1, hsl(hue, 45, 16));
    x.fillStyle = g; x.fill();
    x.strokeStyle = hsl(42, 60, 58); x.lineWidth = 7; x.stroke();
    x.save(); x.translate(W / 2, H * 0.42); x.fillStyle = hsl(42, 65, 62);
    if (emblem === "star") { x.beginPath(); for (let i = 0; i < 16; i++) { const a = (i * Math.PI) / 8 - Math.PI / 2; const rr = i % 2 ? 14 : i % 4 ? 48 : 90; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.closePath(); x.fill(); }
    else if (emblem === "leaf") { x.beginPath(); x.ellipse(0, 0, 34, 70, 0, 0, 7); x.fill(); x.strokeStyle = hsl(hue, 45, 25); x.lineWidth = 4; x.beginPath(); x.moveTo(0, -60); x.lineTo(0, 66); x.stroke(); }
    else if (emblem === "moon") { x.beginPath(); x.arc(0, 0, 62, 0, 7); x.fill(); x.fillStyle = hsl(hue, 45, 26); x.beginPath(); x.arc(24, -12, 54, 0, 7); x.fill(); }
    else { x.beginPath(); x.moveTo(0, -80); x.lineTo(60, -20); x.lineTo(36, 70); x.lineTo(-36, 70); x.lineTo(-60, -20); x.closePath(); x.fill(); }
    x.restore();
    x.globalCompositeOperation = "source-atop"; grain(x, W, H, r, 0.15, 3);
    return toTex(c);
  });
}

export function blackboard() {
  return cached("board", () => {
    const W = 1024, H = 512, [c, x] = canvas(W, H), r = rng(8);
    x.fillStyle = "#24302b"; x.fillRect(0, 0, W, H);
    brush(x, r, 0, 0, W, H, "#3c4a43", 40, 0.18);
    x.strokeStyle = "rgba(235,230,210,.75)"; x.lineWidth = 3;
    x.beginPath(); x.arc(330, 250, 150, 0, 7); x.stroke(); x.beginPath(); x.arc(330, 250, 90, 0, 7); x.stroke();
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; x.beginPath(); x.moveTo(330 + Math.cos(a) * 90, 250 + Math.sin(a) * 90); x.lineTo(330 + Math.cos(a) * 165, 250 + Math.sin(a) * 165); x.stroke(); }
    x.font = "italic 38px Georgia"; x.fillStyle = "rgba(240,236,220,.8)";
    x.fillText("Lumen ~ ˈlu:mən", 560, 150); x.fillText("揮、點、輕抬", 560, 220);
    x.beginPath(); x.moveTo(560, 300); x.bezierCurveTo(640, 240, 720, 360, 860, 290); x.stroke();
    x.fillText("✦", 870, 300);
    x.strokeStyle = "#6b4a2b"; x.lineWidth = 24; x.strokeRect(0, 0, W, H);
    return toTex(c);
  });
}

export function painting(seed = 1) {
  return cached("paint" + seed, () => {
    const W = 256, H = 320, [c, x] = canvas(W, H), r = rng(seed * 13);
    const sky = x.createLinearGradient(0, 0, 0, H);
    const hues = [[30, 210], [200, 30], [280, 40], [40, 120]][seed % 4];
    sky.addColorStop(0, hsl(hues[0], 45, 60)); sky.addColorStop(1, hsl(hues[1], 30, 30));
    x.fillStyle = sky; x.fillRect(0, 0, W, H);
    if (seed % 2) { // 人像（原創）
      x.fillStyle = hsl(r() * 360, 35, 25); x.beginPath(); x.ellipse(W / 2, H * 0.95, 90, 110, 0, 0, 7); x.fill();
      x.fillStyle = hsl(28, 45, 72); x.beginPath(); x.ellipse(W / 2, H * 0.42, 44, 54, 0, 0, 7); x.fill();
      x.fillStyle = hsl(r() * 40, 30, 20 + r() * 50); x.beginPath(); x.ellipse(W / 2, H * 0.34, 50, 36, 0, Math.PI, 0); x.fill();
      x.fillStyle = "#2a1a12"; x.fillRect(W / 2 - 18, H * 0.42, 6, 6); x.fillRect(W / 2 + 12, H * 0.42, 6, 6);
    } else { // 風景
      x.fillStyle = hsl(120, 25, 28); x.beginPath(); x.moveTo(0, H * 0.7); for (let i = 0; i <= 8; i++) x.lineTo((i / 8) * W, H * (0.55 + r() * 0.2)); x.lineTo(W, H); x.lineTo(0, H); x.fill();
      x.fillStyle = hsl(30, 20, 35); x.fillRect(W * 0.55, H * 0.35, 30, 110); x.beginPath(); x.moveTo(W * 0.55 - 6, H * 0.35); x.lineTo(W * 0.55 + 15, H * 0.22); x.lineTo(W * 0.55 + 36, H * 0.35); x.fill();
    }
    brush(x, r, 0, 0, W, H, "#ffffff", 20, 0.05); grain(x, W, H, r, 0.15, 2);
    return toTex(c);
  });
}

export function grass() {
  return cached("grass", () => {
    const S = 512, [c, x] = canvas(S, S), r = rng(31);
    x.fillStyle = hsl(85, 35, 32); x.fillRect(0, 0, S, S);
    for (let i = 0; i < 2600; i++) { x.strokeStyle = hsl(70 + r() * 35, 40, 22 + r() * 30, 0.7); x.lineWidth = 1.5; const px = r() * S, py = r() * S; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - 0.5) * 6, py - 5 - r() * 8); x.stroke(); }
    for (let i = 0; i < 40; i++) { x.fillStyle = r() > 0.5 ? "rgba(255,240,180,.5)" : "rgba(240,200,220,.5)"; x.beginPath(); x.arc(r() * S, r() * S, 2, 0, 7); x.fill(); }
    return toTex(c);
  });
}

export function gravel() {
  return cached("gravel", () => {
    const S = 512, [c, x] = canvas(S, S), r = rng(41);
    x.fillStyle = hsl(32, 20, 42); x.fillRect(0, 0, S, S);
    for (let i = 0; i < 3000; i++) { x.fillStyle = hsl(30 + r() * 15, 15, 30 + r() * 35, 0.8); x.beginPath(); x.ellipse(r() * S, r() * S, 1 + r() * 4, 1 + r() * 3, r() * 3, 0, 7); x.fill(); }
    return toTex(c);
  });
}

export function water() {
  return cached("water", () => {
    const S = 512, [c, x] = canvas(S, S), r = rng(51);
    const g = x.createLinearGradient(0, 0, S, S); g.addColorStop(0, "#1f3a44"); g.addColorStop(1, "#14262e");
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 260; i++) { x.strokeStyle = `rgba(255,${200 + r() * 40},${150 + r() * 60},${0.08 + r() * 0.22})`; x.lineWidth = 1 + r() * 2; const px = r() * S, py = r() * S, w = 10 + r() * 40; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + w / 2, py - 3, px + w, py); x.stroke(); }
    return toTex(c);
  });
}

export function parchment() {
  return cached("parch", () => {
    const S = 256, [c, x] = canvas(S, S), r = rng(61);
    x.fillStyle = "#e9d6ad"; x.fillRect(0, 0, S, S);
    brush(x, r, 0, 0, S, S, "#c9a66d", 20, 0.15);
    x.strokeStyle = "rgba(60,40,20,.55)"; x.lineWidth = 2;
    for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(30, 40 + i * 22); x.lineTo(80 + r() * 140, 40 + i * 22); x.stroke(); }
    return toTex(c);
  });
}

// 光束：沿 V 方向漸淡。
export function lightShaft() {
  return cached("shaft", () => {
    const [c, x] = canvas(64, 256);
    const g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "rgba(255,214,150,0.55)"); g.addColorStop(1, "rgba(255,214,150,0)");
    x.fillStyle = g; x.fillRect(0, 0, 64, 256);
    const h = x.createLinearGradient(0, 0, 64, 0);
    h.addColorStop(0, "rgba(0,0,0,1)"); h.addColorStop(0.2, "rgba(0,0,0,0)"); h.addColorStop(0.8, "rgba(0,0,0,0)"); h.addColorStop(1, "rgba(0,0,0,1)");
    x.globalCompositeOperation = "destination-out"; x.fillStyle = h; x.fillRect(0, 0, 64, 256);
    return toTex(c, { srgb: true });
  });
}

export function glow(color = "255,200,120") {
  return cached("glow" + color, () => {
    const [c, x] = canvas(128, 128);
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, `rgba(${color},1)`); g.addColorStop(0.25, `rgba(${color},.55)`); g.addColorStop(1, `rgba(${color},0)`);
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return toTex(c);
  });
}

export function blob() {
  return cached("blob", () => {
    const [c, x] = canvas(128, 128);
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(20,10,5,.55)"); g.addColorStop(0.6, "rgba(20,10,5,.25)"); g.addColorStop(1, "rgba(20,10,5,0)");
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return toTex(c);
  });
}

export function foliage(hue = 95, seed = 1) {
  return cached("fol" + hue + seed, () => {
    const S = 256, [c, x] = canvas(S, S), r = rng(seed + 90);
    x.fillStyle = hsl(hue, 35, 26); x.fillRect(0, 0, S, S);
    for (let i = 0; i < 500; i++) { x.fillStyle = hsl(hue + (r() - 0.5) * 30, 40, 20 + r() * 32, 0.8); x.beginPath(); x.ellipse(r() * S, r() * S, 4 + r() * 8, 2 + r() * 5, r() * 3, 0, 7); x.fill(); }
    return toTex(c);
  });
}
