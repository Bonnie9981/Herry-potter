// 紙片角色繪製：Q 版但修長的比例、手繪漸層、白色貼紙描邊。
// 每個角色產生一張 8 格圖集：0–1 待機呼吸、2–7 行走循環。
import * as THREE from "three";
import { rng } from "./textures.js";

export const FRAME_W = 256, FRAME_H = 512, FRAMES = 8;
const INK = "rgba(52,32,24,0.9)";

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = amt < 0 ? 0 : 255, t = Math.abs(amt);
  r = Math.round((f - r) * t + r); g = Math.round((f - g) * t + g); b = Math.round((f - b) * t + b);
  return `rgb(${r},${g},${b})`;
}

function fillStroke(x, fill, lw = 2.6) {
  x.fillStyle = fill; x.fill();
  x.lineWidth = lw; x.strokeStyle = INK; x.lineJoin = "round"; x.stroke();
}

function sideGrad(x, x0, x1, color) {
  const g = x.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, shade(color, 0.18)); g.addColorStop(0.45, color); g.addColorStop(1, shade(color, -0.35));
  return g;
}

// 角色外觀規格
export const LOOKS = {
  player: { skin: "#f2cdb0", hair: "#3b2a24", hairStyle: "longwave", eyes: "#4a3426", house: ["#8e2430", "#d7a645"], robe: "#2b2a2e", lower: "skirt" },
  reader: { skin: "#f0c9a6", hair: "#c89a5a", hairStyle: "short", eyes: "#3f5b6e", house: ["#22406e", "#b7a06a"], robe: "#29292d", lower: "trousers" },
  curly: { skin: "#f3d0b5", hair: "#9a6a45", hairStyle: "curly", eyes: "#5a3b26", house: ["#2c5a3a", "#c0c4c8"], robe: "#2a2a2c", lower: "skirt" },
  bookish: { skin: "#d9a67e", hair: "#1f1a1a", hairStyle: "bob", eyes: "#2e2018", house: ["#b38a2a", "#2b2b2b"], robe: "#28272b", lower: "skirt", book: true },
  tall: { skin: "#a8724f", hair: "#1c1513", hairStyle: "crop", eyes: "#24170f", house: ["#22406e", "#b7a06a"], robe: "#2a2a2e", lower: "trousers" },
  librarian: { skin: "#ecc7a8", hair: "#b9b2a8", hairStyle: "bun", eyes: "#4b4a48", house: ["#5b3b6e", "#d1b36c"], robe: "#3a2f45", lower: "longrobe", adult: true },
  professor: { skin: "#e3b893", hair: "#6c4f3a", hairStyle: "short", eyes: "#3d2a1e", house: ["#2f5b4a", "#d1b36c"], robe: "#203a33", lower: "longrobe", adult: true, hat: true },
  gardener: { skin: "#f0c09c", hair: "#c2683a", hairStyle: "ponytail", eyes: "#3a5a2e", house: ["#6b5a2a", "#c9b06a"], robe: "#4b4330", lower: "longrobe", adult: true },
  redhead: { skin: "#f6d6c0", hair: "#b44f2a", hairStyle: "ponytail", eyes: "#3c5b3c", house: ["#8e2430", "#d7a645"], robe: "#2b2a2e", lower: "trousers" },
};

function drawHairBack(x, L, cx, top) {
  const h = L.hair;
  x.beginPath();
  if (L.hairStyle === "longwave" || L.hairStyle === "curly") {
    const len = L.hairStyle === "longwave" ? 300 : 250;
    x.moveTo(cx - 62, top + 70);
    for (let i = 0; i <= 6; i++) { const yy = top + 70 + (i / 6) * (len - 70); x.quadraticCurveTo(cx - 80 - (i % 2) * 10, yy - 15, cx - 70 + (i % 2) * 6, yy); }
    x.lineTo(cx + 64, top + len - 10);
    for (let i = 6; i >= 0; i--) { const yy = top + 70 + (i / 6) * (len - 80); x.quadraticCurveTo(cx + 82 + (i % 2) * 8, yy + 12, cx + 66, yy); }
    x.closePath();
    const g = x.createLinearGradient(cx - 80, 0, cx + 80, 0); g.addColorStop(0, shade(h, 0.12)); g.addColorStop(1, shade(h, -0.35));
    fillStroke(x, g);
  } else if (L.hairStyle === "ponytail") {
    x.moveTo(cx + 40, top + 50); x.quadraticCurveTo(cx + 110, top + 90, cx + 76, top + 210); x.quadraticCurveTo(cx + 60, top + 140, cx + 30, top + 80); x.closePath();
    fillStroke(x, sideGrad(x, cx + 30, cx + 110, h));
  } else if (L.hairStyle === "bun") {
    x.arc(cx + 8, top + 2, 30, 0, Math.PI * 2); fillStroke(x, sideGrad(x, cx - 20, cx + 40, h));
  } else if (L.hairStyle === "bob") {
    x.moveTo(cx - 66, top + 60); x.quadraticCurveTo(cx - 76, top + 150, cx - 52, top + 160); x.lineTo(cx + 62, top + 160); x.quadraticCurveTo(cx + 80, top + 140, cx + 68, top + 60); x.closePath();
    fillStroke(x, sideGrad(x, cx - 76, cx + 80, h));
  }
}

function drawLegs(x, L, cx, hip, phase, walking) {
  const sw = walking ? Math.sin(phase) : 0;
  const legs = [{ dx: -14, s: sw }, { dx: 14, s: -sw }];
  // 後腳先畫
  legs.sort((a, b) => a.s - b.s);
  for (const leg of legs) {
    const fx = cx + leg.dx + leg.s * 20, lift = walking ? Math.max(0, -leg.s) * 10 : 0;
    const foot = 488 - lift;
    x.beginPath();
    x.moveTo(cx + leg.dx - 9, hip); x.lineTo(cx + leg.dx + 9, hip);
    x.lineTo(fx + 8, foot - 22); x.lineTo(fx - 8, foot - 22); x.closePath();
    const stock = L.lower === "trousers" ? "#2a2b30" : "#26242a";
    fillStroke(x, sideGrad(x, fx - 10, fx + 10, stock), 2.2);
    // 鞋
    x.beginPath(); x.moveTo(fx - 10, foot - 24); x.quadraticCurveTo(fx - 12, foot, fx + 2, foot); x.lineTo(fx + 20, foot); x.quadraticCurveTo(fx + 22, foot - 12, fx + 9, foot - 24); x.closePath();
    fillStroke(x, sideGrad(x, fx - 12, fx + 22, "#4a2c1d"), 2.2);
    x.fillStyle = "rgba(255,230,200,.35)"; x.fillRect(fx - 4, foot - 18, 10, 3);
  }
}

function drawBody(x, L, cx, sh, phase, walking, breathe) {
  const sway = walking ? Math.sin(phase) * 5 : 0;
  const hem = L.lower === "longrobe" ? 470 : 392;
  const wide = L.lower === "longrobe" ? 74 : 64;
  const robe = L.robe;
  // 斗篷後片
  x.beginPath();
  x.moveTo(cx - 40, sh); x.quadraticCurveTo(cx - 58, sh + 90, cx - wide + sway, hem);
  x.quadraticCurveTo(cx, hem + 10, cx + wide + sway, hem - 4);
  x.quadraticCurveTo(cx + 56, sh + 90, cx + 42, sh); x.closePath();
  fillStroke(x, sideGrad(x, cx - wide, cx + wide, robe));
  // 下擺／裙子（短袍角色）
  if (L.lower === "skirt") {
    x.beginPath(); x.moveTo(cx - 30, 318); x.lineTo(cx + 34, 318); x.lineTo(cx + 40 + sway * 0.5, 376); x.lineTo(cx - 34 + sway * 0.5, 376); x.closePath();
    fillStroke(x, sideGrad(x, cx - 34, cx + 40, "#3a3a44"), 2);
    x.strokeStyle = "rgba(0,0,0,.25)"; x.lineWidth = 1.5; for (let i = -2; i <= 2; i++) { x.beginPath(); x.moveTo(cx + i * 12, 320); x.lineTo(cx + i * 14 + sway * 0.4, 374); x.stroke(); }
  }
  // 前襟內層：襯衫＋毛衣
  x.beginPath(); x.moveTo(cx - 22, sh + 4); x.lineTo(cx + 26, sh + 4); x.lineTo(cx + 22, 322 + breathe); x.lineTo(cx - 18, 322 + breathe); x.closePath();
  fillStroke(x, sideGrad(x, cx - 22, cx + 26, "#5c5a60"), 2);
  // 襯衫領
  x.beginPath(); x.moveTo(cx - 20, sh + 2); x.lineTo(cx + 2, sh + 30); x.lineTo(cx + 24, sh + 2); x.lineTo(cx + 2, sh + 12); x.closePath();
  fillStroke(x, "#f3eee4", 2);
  // 領帶（學院色條紋）
  x.beginPath(); x.moveTo(cx - 4, sh + 18); x.lineTo(cx + 8, sh + 18); x.lineTo(cx + 11, sh + 92); x.lineTo(cx + 2, sh + 104); x.lineTo(cx - 7, sh + 92); x.closePath();
  x.save(); x.clip();
  for (let i = 0; i < 9; i++) { x.fillStyle = i % 2 ? L.house[1] : L.house[0]; x.save(); x.translate(cx, sh + 18 + i * 12); x.rotate(-0.5); x.fillRect(-20, 0, 40, 6); x.restore(); }
  x.restore();
  x.beginPath(); x.moveTo(cx - 4, sh + 18); x.lineTo(cx + 8, sh + 18); x.lineTo(cx + 11, sh + 92); x.lineTo(cx + 2, sh + 104); x.lineTo(cx - 7, sh + 92); x.closePath();
  x.lineWidth = 1.6; x.strokeStyle = INK; x.stroke();
  // 斗篷前襟（左右片）
  for (const side of [-1, 1]) {
    x.beginPath();
    x.moveTo(cx + side * 22, sh - 2);
    x.quadraticCurveTo(cx + side * 50, sh + 2, cx + side * 46, sh + 40);
    x.quadraticCurveTo(cx + side * (wide - 4) + sway, hem - 60, cx + side * (wide - 2) + sway, hem - (side > 0 ? 4 : 0));
    x.lineTo(cx + side * 26 + sway * 0.6, hem - 6);
    x.quadraticCurveTo(cx + side * 22, sh + 120, cx + side * 20, sh + 26);
    x.closePath();
    fillStroke(x, sideGrad(x, cx - wide, cx + wide, robe), 2.4);
  }
  // 學院色內襯
  x.strokeStyle = L.house[0]; x.lineWidth = 4;
  for (const side of [-1, 1]) { x.beginPath(); x.moveTo(cx + side * 22, sh + 22); x.quadraticCurveTo(cx + side * 22, sh + 120, cx + side * 27 + sway * 0.6, hem - 10); x.stroke(); }
  // 帽兜／領片
  x.beginPath(); x.moveTo(cx - 44, sh + 4); x.quadraticCurveTo(cx, sh + 34, cx + 46, sh + 4); x.quadraticCurveTo(cx, sh - 14, cx - 44, sh + 4);
  fillStroke(x, sideGrad(x, cx - 44, cx + 46, shade(robe, 0.08)), 2.2);
  // 胸前徽章（原創星紋）
  x.save(); x.translate(cx - 32, sh + 64); x.fillStyle = L.house[1]; x.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4 - Math.PI / 2, rr = i % 2 ? 3 : 8; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.closePath(); x.fill(); x.restore();
}

function drawArm(x, L, cx, sh, side, swing, holdBook) {
  const ax = cx + side * 44, ay = sh + 14;
    x.save(); x.translate(ax, ay); x.rotate(swing * 0.2 + side * 0.06);
  x.beginPath(); x.moveTo(-13, 0); x.quadraticCurveTo(-18, 60, -16, 108); x.lineTo(18, 112); x.quadraticCurveTo(18, 60, 13, 0); x.closePath();
  fillStroke(x, sideGrad(x, -18, 18, L.robe), 2.4);
  x.fillStyle = L.house[0]; x.fillRect(-16, 100, 34, 6);
  x.beginPath(); x.ellipse(1, 120, 10, 11, 0, 0, Math.PI * 2); fillStroke(x, L.skin, 2);
  x.restore();
  if (holdBook && side > 0) {
    x.save(); x.translate(cx + 22, sh + 96); x.rotate(-0.15);
    x.beginPath(); x.rect(-26, -32, 52, 62); fillStroke(x, sideGrad(x, -26, 26, "#6b2b24"), 2);
    x.fillStyle = "#d9b46a"; x.fillRect(-18, -20, 36, 3); x.fillRect(-18, 16, 36, 3); x.restore();
  }
}

function drawHead(x, L, cx, top, blink) {
  const hy = top + 92;
  // 脖子
  x.beginPath(); x.rect(cx - 10, hy + 46, 22, 26); fillStroke(x, shade(L.skin, -0.12), 2);
  // 臉
  x.beginPath();
  x.moveTo(cx - 54, hy - 10);
  x.quadraticCurveTo(cx - 56, hy + 40, cx - 18, hy + 60);
  x.quadraticCurveTo(cx + 6, hy + 72, cx + 30, hy + 56);
  x.quadraticCurveTo(cx + 60, hy + 34, cx + 58, hy - 10);
  x.quadraticCurveTo(cx + 54, hy - 70, cx + 2, hy - 72);
  x.quadraticCurveTo(cx - 50, hy - 70, cx - 54, hy - 10);
  const fg = x.createRadialGradient(cx - 10, hy - 10, 10, cx + 10, hy + 10, 80);
  fg.addColorStop(0, shade(L.skin, 0.12)); fg.addColorStop(1, shade(L.skin, -0.16));
  fillStroke(x, fg, 2.6);
  // 腮紅
  x.fillStyle = "rgba(235,120,110,.28)";
  x.beginPath(); x.ellipse(cx - 28, hy + 26, 13, 7, 0, 0, 7); x.fill();
  x.beginPath(); x.ellipse(cx + 38, hy + 24, 11, 6, 0, 0, 7); x.fill();
  // 眼睛（3/4 朝右）
  const eyes = [[cx - 16, 15], [cx + 30, 13]];
  for (const [ex, ew] of eyes) {
    const ey = hy + 6;
    if (blink) { x.strokeStyle = INK; x.lineWidth = 3; x.beginPath(); x.moveTo(ex - ew, ey + 4); x.quadraticCurveTo(ex, ey + 10, ex + ew, ey + 4); x.stroke(); continue; }
    x.fillStyle = "#fffaf2"; x.beginPath(); x.ellipse(ex, ey, ew, 17, 0, 0, 7); x.fill();
    const ig = x.createLinearGradient(0, ey - 16, 0, ey + 16); ig.addColorStop(0, shade(L.eyes, -0.45)); ig.addColorStop(1, shade(L.eyes, 0.35));
    x.fillStyle = ig; x.beginPath(); x.ellipse(ex + 2, ey + 2, ew * 0.78, 15, 0, 0, 7); x.fill();
    x.fillStyle = "#170d09"; x.beginPath(); x.ellipse(ex + 2, ey + 3, ew * 0.38, 8, 0, 0, 7); x.fill();
    x.fillStyle = "#fff"; x.beginPath(); x.arc(ex - 3, ey - 6, 4.2, 0, 7); x.fill(); x.beginPath(); x.arc(ex + 6, ey + 8, 2, 0, 7); x.fill();
    x.strokeStyle = "#24140e"; x.lineWidth = 3.4; x.beginPath(); x.moveTo(ex - ew - 1, ey - 5); x.quadraticCurveTo(ex - 2, ey - 25, ex + ew + 5, ey - 9); x.stroke();
  }
  // 眉
  x.strokeStyle = shade(L.hair, -0.1); x.lineWidth = 2;
  x.beginPath(); x.moveTo(cx - 28, hy - 30); x.quadraticCurveTo(cx - 16, hy - 37, cx - 5, hy - 33); x.stroke();
  x.beginPath(); x.moveTo(cx + 21, hy - 33); x.quadraticCurveTo(cx + 32, hy - 38, cx + 42, hy - 31); x.stroke();
  // 鼻、嘴
  x.strokeStyle = "rgba(150,80,60,.6)"; x.lineWidth = 2; x.beginPath(); x.moveTo(cx + 10, hy + 22); x.lineTo(cx + 13, hy + 28); x.stroke();
  x.strokeStyle = "#8a4a3e"; x.lineWidth = 2.4; x.beginPath(); x.moveTo(cx + 2, hy + 40); x.quadraticCurveTo(cx + 10, hy + 45, cx + 18, hy + 39); x.stroke();
  if (L.beard) { x.beginPath(); x.moveTo(cx - 40, hy + 26); x.quadraticCurveTo(cx - 20, hy + 96, cx + 10, hy + 100); x.quadraticCurveTo(cx + 44, hy + 90, cx + 50, hy + 24); x.quadraticCurveTo(cx + 10, hy + 54, cx - 40, hy + 26); fillStroke(x, sideGrad(x, cx - 40, cx + 50, L.hair), 2.2); }
  return hy;
}

function drawHairFront(x, L, cx, top, hy) {
  const h = L.hair, g = sideGrad(x, cx - 70, cx + 70, h);
  x.beginPath();
  if (L.hairStyle === "crop") {
    x.moveTo(cx - 56, hy - 4); x.quadraticCurveTo(cx - 64, hy - 80, cx + 2, hy - 84); x.quadraticCurveTo(cx + 66, hy - 82, cx + 60, hy - 6);
    x.quadraticCurveTo(cx + 46, hy - 46, cx + 4, hy - 44); x.quadraticCurveTo(cx - 40, hy - 46, cx - 56, hy - 4);
  } else {
    // 頭頂圓頂
    x.moveTo(cx - 62, hy + 18);
    x.quadraticCurveTo(cx - 74, hy - 82, cx + 2, hy - 88);
    x.quadraticCurveTo(cx + 78, hy - 86, cx + 66, hy + 16);
    // 瀏海（鋸齒）
    const pts = [[cx + 54, hy - 8], [cx + 40, hy - 30], [cx + 28, hy - 2], [cx + 12, hy - 34], [cx - 4, hy - 6], [cx - 18, hy - 36], [cx - 34, hy - 4], [cx - 44, hy - 30], [cx - 58, hy + 8]];
    for (let i = 0; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]);
    x.closePath();
  }
  fillStroke(x, g, 2.6);
  // 側髮
  if (L.hairStyle === "longwave" || L.hairStyle === "curly" || L.hairStyle === "bob") {
    for (const side of [-1, 1]) {
      x.beginPath(); const sx = cx + side * 58;
      x.moveTo(sx, hy - 30);
      const len = L.hairStyle === "bob" ? 70 : 150;
      if (L.hairStyle === "curly") { for (let k = 0; k < 5; k++) x.quadraticCurveTo(sx + side * (k % 2 ? 18 : -2), hy - 20 + k * 30 + 15, sx + side * 4, hy - 20 + (k + 1) * 30); }
      else x.quadraticCurveTo(sx + side * 16, hy + len * 0.5, sx + side * 2, hy + len);
      x.lineTo(sx - side * 12, hy + len - 20); x.quadraticCurveTo(sx - side * 4, hy + 10, sx - side * 6, hy - 30); x.closePath();
      fillStroke(x, g, 2.4);
    }
  }
  // 髮絲高光
  x.strokeStyle = "rgba(255,235,200,.35)"; x.lineWidth = 3;
  x.beginPath(); x.arc(cx - 6, hy - 40, 42, Math.PI * 1.15, Math.PI * 1.55); x.stroke();
}

function drawHat(x, L, cx, hy) {
  x.beginPath(); x.ellipse(cx + 2, hy - 62, 84, 18, -0.05, 0, Math.PI * 2);
  fillStroke(x, sideGrad(x, cx - 84, cx + 86, shade(L.robe, -0.1)), 2.4);
  x.beginPath(); x.moveTo(cx - 46, hy - 64); x.quadraticCurveTo(cx - 20, hy - 120, cx + 10, hy - 170);
  x.quadraticCurveTo(cx + 34, hy - 186, cx + 52, hy - 168); x.quadraticCurveTo(cx + 30, hy - 160, cx + 26, hy - 130);
  x.quadraticCurveTo(cx + 40, hy - 90, cx + 50, hy - 64); x.closePath();
  fillStroke(x, sideGrad(x, cx - 46, cx + 52, L.robe), 2.4);
  x.fillStyle = L.house[1]; x.fillRect(cx - 44, hy - 80, 94, 9);
}

function drawFrame(x, L, frame) {
  const cx = FRAME_W / 2;
  const walking = frame >= 2, phase = walking ? ((frame - 2) / 6) * Math.PI * 2 : 0;
  const bob = walking ? Math.abs(Math.sin(phase)) * -5 : 0;
  const breathe = frame === 1 ? 1.5 : 0;
  const top = 40 + bob + breathe * 0.5 + (L.adult ? -6 : 8);
  const sh = top + 168;
  const hip = L.lower === "longrobe" ? 440 : 368;
  x.save();
  drawHairBack(x, L, cx, top);
  drawLegs(x, L, cx, hip, phase, walking);
  const swing = walking ? Math.sin(phase) : 0;
  drawArm(x, L, cx, sh, -1, swing, false);
  drawBody(x, L, cx, sh, phase, walking, breathe);
  drawArm(x, L, cx, sh, 1, -swing, L.book);
  const hy = drawHead(x, L, cx, top, false);
  drawHairFront(x, L, cx, top, hy);
  if (L.hat) drawHat(x, L, cx, hy);
  x.restore();
}

function stickerize(src, r) {
  const c = document.createElement("canvas"); c.width = src.width; c.height = src.height;
  const x = c.getContext("2d");
  // 白色描邊：多方向位移輪廓
  const sil = document.createElement("canvas"); sil.width = src.width; sil.height = src.height;
  const s = sil.getContext("2d"); s.drawImage(src, 0, 0); s.globalCompositeOperation = "source-in"; s.fillStyle = "#fffaf0"; s.fillRect(0, 0, sil.width, sil.height);
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; x.drawImage(sil, Math.cos(a) * r, Math.sin(a) * r); }
  x.drawImage(sil, 0, 0);
  // 描邊外圈淡陰影，增加紙片厚度感
  x.globalCompositeOperation = "destination-over"; x.globalAlpha = 0.25;
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; x.filter = "brightness(0.2)"; x.drawImage(sil, Math.cos(a) * (r + 1.5), Math.sin(a) * (r + 1.5) + 1); }
  x.filter = "none"; x.globalAlpha = 1; x.globalCompositeOperation = "source-over";
  x.drawImage(src, 0, 0);
  return c;
}

function paintTexture(c, seed) {
  const x = c.getContext("2d"), r = rng(seed);
  x.save(); x.globalCompositeOperation = "source-atop";
  // 窗光側的暖色邊光
  const g = x.createLinearGradient(0, 0, c.width, 0);
  g.addColorStop(0, "rgba(255,200,130,.16)"); g.addColorStop(0.5, "rgba(255,200,130,0)"); g.addColorStop(1, "rgba(40,20,60,.10)");
  x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 5000; i++) { x.fillStyle = r() > 0.5 ? `rgba(255,240,220,${0.05 * r()})` : `rgba(30,15,5,${0.06 * r()})`; x.fillRect(r() * c.width, r() * c.height, 2, 2); }
  x.restore();
}

const atlasCache = new Map();
export function characterAtlas(key) {
  if (atlasCache.has(key)) return atlasCache.get(key);
  const L = LOOKS[key] || LOOKS.reader;
  const atlas = document.createElement("canvas"); atlas.width = FRAME_W * FRAMES; atlas.height = FRAME_H;
  const ax = atlas.getContext("2d");
  for (let f = 0; f < FRAMES; f++) {
    const fc = document.createElement("canvas"); fc.width = FRAME_W; fc.height = FRAME_H;
    const fx = fc.getContext("2d");
    fx.translate(FRAME_W * 0.06, FRAME_H * 0.05); fx.scale(0.88, 0.9);
    drawFrame(fx, L, f);
    paintTexture(fc, 100 + f);
    ax.drawImage(stickerize(fc, 7), f * FRAME_W, 0);
  }
  const tex = new THREE.CanvasTexture(atlas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  atlasCache.set(key, tex);
  return tex;
}

// 頭像（對話框用）
export function portraitDataURL(key) {
  const tex = characterAtlas(key);
  const c = document.createElement("canvas"); c.width = 160; c.height = 160;
  c.getContext("2d").drawImage(tex.image, 0, 0, FRAME_W, FRAME_W, 0, 0, 160, 160);
  return c.toDataURL();
}

// 紙片角色：一張雙面平面。背面由 GPU 自然呈現鏡像，不另畫背面。
export class PaperCharacter {
  constructor(key, { height = 1.85 } = {}) {
    this.key = key;
    const base = characterAtlas(key);
    this.tex = base.clone();
    this.tex.needsUpdate = true;
    this.tex.repeat.set(1 / FRAMES, 1);
    const w = height * (FRAME_W / FRAME_H);
    const geo = new THREE.PlaneGeometry(w, height);
    geo.translate(0, height / 2 - height * 0.035, 0);
    this.mat = new THREE.MeshStandardMaterial({ map: this.tex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9, metalness: 0 });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.castShadow = true;
    this.mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: this.tex, alphaTest: 0.5 });
    this.group = new THREE.Group();
    this.pivot = new THREE.Group();
    this.pivot.add(this.mesh);
    this.group.add(this.pivot);
    this.frame = 0; this.t = Math.random() * 3; this.walking = false;
    this.paperAngle = 0;      // 紙片相對鏡頭的角度（度）
    this.targetAngle = 0;
    this.facingRight = true;
  }
  addXray(scene) {
    // 被家具擋住時顯示淡淡剪影，避免玩家迷失位置
    const m = new THREE.MeshBasicMaterial({ map: this.tex, alphaTest: 0.5, side: THREE.DoubleSide, color: 0x6a5a8a, transparent: true, opacity: 0.38, depthFunc: THREE.GreaterDepth, depthWrite: false });
    const x = new THREE.Mesh(this.mesh.geometry, m); x.renderOrder = 10;
    this.mesh.add(x);
  }
  setFrame(f) { if (f !== this.frame) { this.frame = f; this.tex.offset.x = f / FRAMES; } }
  // screenDX>0 表示在畫面上往右走；screenDY>0 表示往畫面上方（遠離鏡頭）走
  face(screenDX, screenDY) {
    if (Math.abs(screenDX) > 0.15) this.facingRight = screenDX > 0;
    const away = screenDY > 0.35;
    // 面向右：0°（正面 3/4），面向左：180°（鏡像）。背對鏡頭時多轉 35°，紙片變窄。
    this.targetAngle = this.facingRight ? (away ? -35 : 0) : (away ? 215 : 180);
  }
  update(dt, camYaw) {
    this.t += dt;
    if (this.walking) this.setFrame(2 + Math.floor(this.t * 10) % 6);
    else this.setFrame(Math.floor(this.t * 1.6) % 2);
    // 連續 Y 軸旋轉：以固定角速度追上目標角度，轉向時會經過 90° 細線
    let d = this.targetAngle - this.paperAngle;
    while (d > 180) d -= 360; while (d < -180) d += 360;
    const step = 900 * dt;
    this.paperAngle += Math.abs(d) <= step ? d : Math.sign(d) * step;
    this.pivot.rotation.y = camYaw + (this.paperAngle * Math.PI) / 180;
    // 行走時紙片輕微晃動
    this.pivot.position.y = this.walking ? Math.abs(Math.sin(this.t * 10 * Math.PI / 3)) * 0.03 : 0;
    this.mesh.rotation.z = this.walking ? Math.sin(this.t * 10 * Math.PI / 6) * 0.025 : 0;
  }
}
