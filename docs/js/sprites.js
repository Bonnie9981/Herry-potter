// 紙片角色：Q 版但修長的比例、手繪漸層、白色貼紙描邊，放進 3D 場景的一張雙面紙。
//
// 圖集（6 欄 × 3 列，每格 256×512）：
//   0–3   待機：呼吸 3 格 + 眨眼 1 格
//   4–11  行走：8 格完整步態（膝蓋彎曲、抬腳、身體起伏、手臂反向擺動）
//   12–17 互動：舉起魔杖、杖尖發光
// 紙片繞垂直軸連續旋轉：0° 正面（朝畫面右），90° 只剩一條白色紙緣，180° 由 GPU 自然鏡像。
import * as THREE from "three";
import { rng } from "./textures.js";

export const FRAME_W = 256, FRAME_H = 512;
export const COLS = 6, ROWS = 3, FRAMES = COLS * ROWS;
export const IDLE_FRAMES = [0, 1, 2, 3], WALK_FRAMES = [4, 5, 6, 7, 8, 9, 10, 11], INTERACT_FRAMES = [12, 13, 14, 15, 16, 17];
const INK = "rgba(52,32,24,0.9)";
const GROUND = 488, ANKLE = 474;

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

// 外部立繪（ChatGPT 等繪製的透明 PNG）：登記後會取代同名外觀的程式繪製版。
// 規格見 docs/art/CHARACTER-SPRITES.md。hem／legs／split 省略時會從圖片透明度自動偵測。
//   src：相對於 docs/js/ 的路徑；hem＝外袍下緣（腿開始擺動處，0–1 比例）；legs＝腿部左右範圍；split＝兩腿分界；hand＝互動光點位置
export const SPRITES = {
  // player: { src: "../sprites/player.png" },
};

// 執行時登記立繪（需在第一次建立該外觀的角色之前呼叫）
export function registerSprite(look, spec) {
  SPRITES[look] = spec;
  atlasCache.delete(look);
}

// 角色外觀規格
export const LOOKS = {
  // image：依美術基準繪製的立繪（透明 PNG，正面 3/4 朝右）；載入前以透明畫面代替，不閃出程式繪製版
  //   hem＝外袍下緣（腿部開始擺動的高度）、legs＝腿部左右範圍、split＝兩腿分界、hand＝持杖手的位置（皆為圖片比例）
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
  // 瀏海在額頭投下的柔和陰影
  const bs = x.createLinearGradient(0, hy - 34, 0, hy - 6);
  bs.addColorStop(0, "rgba(120,60,40,.32)"); bs.addColorStop(1, "rgba(120,60,40,0)");
  x.save(); x.beginPath(); x.ellipse(cx + 2, hy - 2, 56, 66, 0, 0, 7); x.clip(); x.fillStyle = bs; x.fillRect(cx - 60, hy - 40, 120, 36); x.restore();
  // 眼睛（3/4 朝右）：大而柔和，上睫毛順著眼形，不上挑
  const eyes = [[cx - 16, 15, 19], [cx + 30, 13, 18]];
  for (const [ex, ew, eh] of eyes) {
    const ey = hy + 8;
    if (blink) { x.strokeStyle = INK; x.lineWidth = 3; x.beginPath(); x.moveTo(ex - ew, ey + 2); x.quadraticCurveTo(ex, ey + 9, ex + ew, ey + 2); x.stroke(); continue; }
    x.fillStyle = "#fffaf2"; x.beginPath(); x.ellipse(ex, ey, ew, eh, 0, 0, 7); x.fill();
    x.save(); x.beginPath(); x.ellipse(ex, ey, ew, eh, 0, 0, 7); x.clip();
    const ig = x.createLinearGradient(0, ey - eh, 0, ey + eh); ig.addColorStop(0, shade(L.eyes, -0.5)); ig.addColorStop(0.55, L.eyes); ig.addColorStop(1, shade(L.eyes, 0.45));
    x.fillStyle = ig; x.beginPath(); x.ellipse(ex + 2, ey + 2, ew * 0.82, eh - 1, 0, 0, 7); x.fill();
    x.strokeStyle = shade(L.eyes, -0.55); x.lineWidth = 1.6; x.stroke();
    x.fillStyle = "#170d09"; x.beginPath(); x.ellipse(ex + 2, ey + 2, ew * 0.4, eh * 0.45, 0, 0, 7); x.fill();
    x.fillStyle = "rgba(40,20,10,.25)"; x.fillRect(ex - ew, ey - eh, ew * 2, 6); // 上眼瞼陰影
    x.restore();
    x.fillStyle = "#fff"; x.beginPath(); x.ellipse(ex - 3, ey - 6, 5, 6, -0.3, 0, 7); x.fill(); x.beginPath(); x.arc(ex + 6, ey + 9, 2.4, 0, 7); x.fill();
    x.strokeStyle = "#24140e"; x.lineWidth = 3.6; x.lineCap = "round";
    x.beginPath(); x.moveTo(ex - ew - 2, ey - 3); x.quadraticCurveTo(ex, ey - eh - 7, ex + ew + 3, ey - 5); x.stroke();
    x.lineWidth = 1.4; x.beginPath(); x.moveTo(ex - ew * 0.5, ey + eh - 1); x.quadraticCurveTo(ex, ey + eh + 2, ex + ew * 0.6, ey + eh - 2); x.stroke();
  }
  // 眉
  x.strokeStyle = shade(L.hair, -0.1); x.lineWidth = 2;
  x.beginPath(); x.moveTo(cx - 29, hy - 22); x.quadraticCurveTo(cx - 17, hy - 29, cx - 5, hy - 24); x.stroke();
  x.beginPath(); x.moveTo(cx + 21, hy - 24); x.quadraticCurveTo(cx + 32, hy - 30, cx + 43, hy - 23); x.stroke();
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
    const pts = [[cx + 56, hy - 6], [cx + 46, hy - 36], [cx + 30, hy - 20], [cx + 16, hy - 44], [cx, hy - 22], [cx - 14, hy - 46], [cx - 30, hy - 20], [cx - 42, hy - 40], [cx - 58, hy + 6]];
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
      if (L.hairStyle === "longwave") { for (let k = 0; k < 4; k++) x.quadraticCurveTo(sx + side * (k % 2 ? 14 : 2), hy - 30 + k * 40 + 20, sx + side * (6 + k * 2), hy - 30 + (k + 1) * 40); }
      else if (L.hairStyle === "curly") { for (let k = 0; k < 5; k++) x.quadraticCurveTo(sx + side * (k % 2 ? 18 : -2), hy - 20 + k * 30 + 15, sx + side * 4, hy - 20 + (k + 1) * 30); }
      else x.quadraticCurveTo(sx + side * 16, hy + len * 0.5, sx + side * 2, hy + len);
      x.lineTo(sx - side * 12, hy + len - 20); x.quadraticCurveTo(sx - side * 4, hy + 10, sx - side * 6, hy - 30); x.closePath();
      fillStroke(x, g, 2.4);
    }
  }
  // 髮絲：深色分線 + 暖色高光
  if (L.hairStyle !== "crop") {
    x.save(); x.strokeStyle = shade(h, -0.4); x.lineWidth = 1.6; x.lineCap = "round";
    for (const [sx, ex2] of [[-30, -46], [-8, -14], [14, 20], [34, 44]]) { x.beginPath(); x.moveTo(cx + sx * 0.4, hy - 80); x.quadraticCurveTo(cx + sx, hy - 66, cx + ex2, hy - 30); x.stroke(); }
    x.restore();
  }
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

function stickerize(src, r, color = "#fffaf0") {
  const c = document.createElement("canvas"); c.width = src.width; c.height = src.height;
  const x = c.getContext("2d");
  // 白色描邊：多方向位移輪廓
  const sil = document.createElement("canvas"); sil.width = src.width; sil.height = src.height;
  const s = sil.getContext("2d"); s.drawImage(src, 0, 0); s.globalCompositeOperation = "source-in"; s.fillStyle = color; s.fillRect(0, 0, sil.width, sil.height);
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

// ---- 步態：雙腿以髖關節為軸擺動，擺動腿膝蓋彎曲抬腳，支撐腳貼地，身體高度由腿長決定 ----
function legPose(L, cx, hipBase, phase, walking) {
  const legLen = ANKLE - hipBase, thigh = legLen * 0.5, shin = legLen * 0.5;
  const amp = L.lower === "longrobe" ? 0.55 : 0.4;
  const legs = [{ dx: -10, off: Math.PI, far: true }, { dx: 10, off: 0, far: false }].map((leg) => {
    const p = phase + leg.off;
    const a = walking ? Math.sin(p) * amp : 0;                       // 髖角，正值＝往前（畫面右）
    const b = walking ? Math.pow(Math.max(0, Math.cos(p)), 1.4) * 0.95 : 0; // 擺動期膝蓋彎曲
    return { ...leg, a, b };
  });
  let lowest = -Infinity;
  for (const leg of legs) {
    const kx = Math.sin(leg.a) * thigh, ky = Math.cos(leg.a) * thigh;
    leg.knee = [kx, ky];
    leg.ankle = [kx + Math.sin(leg.a - leg.b) * shin, ky + Math.cos(leg.a - leg.b) * shin];
    lowest = Math.max(lowest, leg.ankle[1]);
  }
  const bob = legLen - lowest; // 雙腿張開時身體下沉
  const hip = hipBase + bob;
  for (const leg of legs) {
    const hx = cx + leg.dx;
    leg.hipPt = [hx, hip];
    leg.knee = [hx + leg.knee[0], hip + leg.knee[1]];
    leg.ankle = [hx + leg.ankle[0], hip + leg.ankle[1]];
    leg.toe = -leg.b * 0.45 + (leg.a < 0 && !leg.b ? 0 : 0);
  }
  return { legs, bob };
}

function drawLeg(x, L, leg) {
  const stock = L.lower === "trousers" ? "#2a2b30" : "#26242a";
  const col = leg.far ? shade(stock, -0.25) : stock;
  x.lineCap = "round"; x.lineJoin = "round";
  x.beginPath(); x.moveTo(...leg.hipPt); x.lineTo(...leg.knee); x.lineTo(...leg.ankle);
  x.strokeStyle = INK; x.lineWidth = L.lower === "trousers" ? 23 : 19; x.stroke();
  x.strokeStyle = col; x.lineWidth = L.lower === "trousers" ? 19 : 15; x.stroke();
  // 腿部受光
  x.beginPath(); x.moveTo(leg.knee[0] - 4, leg.knee[1] - 10); x.lineTo(leg.ankle[0] - 4, leg.ankle[1] - 8);
  x.strokeStyle = "rgba(255,225,190,.16)"; x.lineWidth = 3; x.stroke();
  // 鞋：跟著抬腳角度轉動
  x.save(); x.translate(...leg.ankle); x.rotate(leg.toe);
  x.beginPath(); x.moveTo(-9, -8); x.quadraticCurveTo(-12, 14, 0, 14); x.lineTo(20, 14); x.quadraticCurveTo(24, 2, 8, -8); x.closePath();
  fillStroke(x, sideGrad(x, -12, 24, leg.far ? "#3a2216" : "#4a2c1d"), 2.2);
  x.fillStyle = "rgba(255,230,200,.35)"; x.fillRect(-2, -2, 11, 3);
  x.fillStyle = "rgba(20,10,5,.5)"; x.fillRect(-11, 11, 33, 3);
  x.restore();
}

function drawArm(x, L, cx, sh, side, rot, opts = {}) {
  const ax = cx + side * 44, ay = sh + 14;
  x.save(); x.translate(ax, ay); x.rotate(rot + side * 0.06); if (opts.shorten) x.scale(1, 1 - opts.shorten);
  const robe = side < 0 ? shade(L.robe, -0.18) : L.robe;
  x.beginPath(); x.moveTo(-13, 0); x.quadraticCurveTo(-19, 60, -18, 108); x.lineTo(19, 113); x.quadraticCurveTo(18, 60, 13, 0); x.closePath();
  fillStroke(x, sideGrad(x, -18, 18, robe), 2.4);
  // 袖子皺褶
  x.strokeStyle = "rgba(0,0,0,.28)"; x.lineWidth = 1.6;
  x.beginPath(); x.moveTo(-6, 34); x.quadraticCurveTo(0, 60, -4, 92); x.stroke();
  x.fillStyle = L.house[0]; x.fillRect(-17, 100, 36, 6);
  x.beginPath(); x.ellipse(1, 120, 10, 11, 0, 0, Math.PI * 2); fillStroke(x, side < 0 ? shade(L.skin, -0.12) : L.skin, 2);
  x.restore();
  if (opts.holdBook) {
    x.save(); x.translate(cx + 22, sh + 96); x.rotate(-0.15);
    x.beginPath(); x.rect(-26, -32, 52, 62); fillStroke(x, sideGrad(x, -26, 26, "#6b2b24"), 2);
    x.fillStyle = "#d9b46a"; x.fillRect(-18, -20, 36, 3); x.fillRect(-18, 16, 36, 3); x.restore();
  }
}

const ease = (t) => t * t * (3 - 2 * t);

function drawFrame(x, L, f) {
  const cx = FRAME_W / 2;
  let walking = false, phase = 0, breathe = 0, blink = false, raise = 0, spark = 0;
  if (f < 4) { breathe = [0, 1.5, 3, 1.5][f]; blink = f === 3; }
  else if (f < 12) { walking = true; phase = ((f - 4) / 8) * Math.PI * 2; }
  else { const k = f - 12; raise = ease(Math.min(1, k / 2.5)); spark = k >= 2 ? 0.45 + 0.55 * Math.abs(Math.sin(k * 1.3)) : 0; breathe = 1; }
  const hipBase = L.lower === "longrobe" ? 440 : 368;
  const { legs, bob } = legPose(L, cx, hipBase, phase, walking);
  const lift = -breathe * 0.6;
  const top = 40 + bob + lift + (L.adult ? -6 : 8);
  const sh = top + 168;
  const near = legs.find((l) => !l.far), far = legs.find((l) => l.far);
  x.save();
  drawLeg(x, L, far);
  drawLeg(x, L, near);
  // 走路時上身微微前傾（以髖為軸）
  if (walking) { x.translate(cx, hipBase + bob); x.rotate(0.035); x.translate(-cx, -(hipBase + bob)); }
  if (raise) { x.translate(cx, hipBase); x.rotate(0.03 * raise); x.translate(-cx, -hipBase); }
  drawHairBack(x, L, cx, top);
  drawArm(x, L, cx, sh, -1, far.a * 0.8, {});
  drawBody(x, L, cx, sh, phase, walking, breathe);
  const frontRot = near.a * 0.8 * (1 - raise) - 2.6 * raise;
  drawArm(x, L, cx, sh, 1, frontRot, { holdBook: L.book && !raise, wand: raise > 0, spark, shorten: 0.3 * raise });
  const hy = drawHead(x, L, cx, top, blink);
  drawHairFront(x, L, cx, top, hy);
  if (L.hat) drawHat(x, L, cx, hy);
  if (raise > 0) drawWand(x, L, cx, sh, frontRot, 0.3 * raise, spark);
  x.restore();
}

// 魔杖畫在頭髮之上：從手掌往前上方伸出，杖尖發光
function drawWand(x, L, cx, sh, rot, shorten, spark) {
  const r = rot + 0.06, ly = 120 * (1 - shorten);
  const hx = cx + 44 - Math.sin(r) * ly, hy = sh + 14 + Math.cos(r) * ly;
  const dx = 0.2, dy = -0.98, len = 55;
  const tx = hx + dx * len, ty = hy + dy * len;
  x.save();
  x.lineCap = "round";
  x.strokeStyle = INK; x.lineWidth = 7; x.beginPath(); x.moveTo(hx - dx * 6, hy - dy * 6); x.lineTo(tx, ty); x.stroke();
  x.strokeStyle = "#5a3826"; x.lineWidth = 4; x.stroke();
  x.strokeStyle = "#c79a5a"; x.lineWidth = 5; x.beginPath(); x.moveTo(hx - dx * 6, hy - dy * 6); x.lineTo(hx + dx * 4, hy + dy * 4); x.stroke();
  if (spark > 0) {
    const R = 26 * spark, g = x.createRadialGradient(tx, ty, 0, tx, ty, R);
    g.addColorStop(0, "rgba(255,250,220,.95)"); g.addColorStop(0.35, "rgba(255,214,130,.6)"); g.addColorStop(1, "rgba(255,190,90,0)");
    x.fillStyle = g; x.beginPath(); x.arc(tx, ty, R, 0, 7); x.fill();
    x.fillStyle = "#fffbea"; x.beginPath();
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4 + spark, rr = i % 2 ? 3.5 * spark : 13 * spark; x.lineTo(tx + Math.cos(a) * rr, ty + Math.sin(a) * rr); }
    x.closePath(); x.fill();
  }
  // 握杖的手蓋在杖上
  x.beginPath(); x.ellipse(hx, hy, 10, 11, 0, 0, Math.PI * 2); fillStroke(x, L.skin, 2);
  x.restore();
}

const atlasCache = new Map();
const EW = 8; // 紙緣圖集每格寬度

// 共用：把一格畫面貼上描邊後寫進圖集，並依每列是否有像素產生紙緣圖集
function writeCell(atlasCtx, edgeCtx, st, f, cw, ch) {
  const col = f % COLS, row = Math.floor(f / COLS);
  atlasCtx.clearRect(col * cw, row * ch, cw, ch);
  atlasCtx.drawImage(st, col * cw, row * ch);
  const data = st.getContext("2d").getImageData(0, 0, cw, ch).data;
  edgeCtx.clearRect(col * EW, row * ch, EW, ch);
  for (let y = 0; y < ch; y++) {
    let on = false;
    for (let xx = 0; xx < cw; xx += 2) if (data[(y * cw + xx) * 4 + 3] > 128) { on = true; break; }
    if (!on) continue;
    edgeCtx.fillStyle = "#fbf5ea"; edgeCtx.fillRect(col * EW, row * ch + y, EW, 1);
    edgeCtx.fillStyle = "#d9c6a6"; edgeCtx.fillRect(col * EW + 3, row * ch + y, 2, 1);
  }
}

function newAtlas(cw, ch) {
  const atlas = document.createElement("canvas"); atlas.width = cw * COLS; atlas.height = ch * ROWS;
  const edge = document.createElement("canvas"); edge.width = EW * COLS; edge.height = ch * ROWS;
  const mk = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const out = { tex: mk(atlas), edge: mk(edge), cell: [cw, ch], ready: Promise.resolve() };
  out.edge.generateMipmaps = false; out.edge.minFilter = THREE.LinearFilter;
  return out;
}

function buildAtlas(key) {
  const L = LOOKS[key] || LOOKS.reader;
  const sp = SPRITES[key] || L.image;
  if (sp) return buildImageAtlas(key, { image: sp });
  const out = newAtlas(FRAME_W, FRAME_H);
  const ax = out.tex.image.getContext("2d"), ex = out.edge.image.getContext("2d");
  for (let f = 0; f < FRAMES; f++) {
    const fc = document.createElement("canvas"); fc.width = FRAME_W; fc.height = FRAME_H;
    const fx = fc.getContext("2d");
    fx.translate(FRAME_W * 0.06, FRAME_H * 0.05); fx.scale(0.88, 0.9);
    drawFrame(fx, L, f);
    paintTexture(fc, 100 + f);
    writeCell(ax, ex, stickerize(fc, 7), f, FRAME_W, FRAME_H);
  }
  atlasCache.set(key, out);
  return out;
}

// ---- 繪製立繪：切成上身與兩條腿，以切件方式做出待機、行走、互動 ----
const IMG_SCALE = 1.5; // 立繪圖集解析度是程式繪製版的 1.5 倍
function buildImageAtlas(key, L) {
  const cw = FRAME_W * IMG_SCALE, ch = FRAME_H * IMG_SCALE;
  const out = newAtlas(cw, ch);
  const img = new Image();
  img.decoding = "async";
  out.ready = new Promise((resolve) => {
    img.onload = () => {
      Object.assign(L.image, { ...detectLegs(img), ...L.image });
      const ax = out.tex.image.getContext("2d"), ex = out.edge.image.getContext("2d");
      for (let f = 0; f < FRAMES; f++) writeCell(ax, ex, stickerize(drawImageFrame(img, L.image, f, cw, ch), 6 * IMG_SCALE, "#fff4e2"), f, cw, ch);
      out.tex.needsUpdate = true; out.edge.needsUpdate = true;
      resolve();
    };
    img.onerror = () => { console.warn("角色立繪載入失敗：" + L.image.src); resolve(); };
  });
  img.src = new URL(L.image.src, import.meta.url).href;
  atlasCache.set(key, out);
  return out;
}

// 從透明度自動找腿部：由下往上，寬度明顯窄於全身最寬處的列視為腿
function detectLegs(img) {
  const w = 200, h = Math.round((img.height / img.width) * w);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const x = c.getContext("2d"); x.drawImage(img, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h).data;
  const rows = [];
  for (let y = 0; y < h; y++) {
    let l = -1, r = -1;
    for (let i = 0; i < w; i++) if (d[(y * w + i) * 4 + 3] > 128) { if (l < 0) l = i; r = i; }
    rows.push(l < 0 ? null : [l, r]);
  }
  const maxW = Math.max(...rows.map((v) => (v ? v[1] - v[0] : 0)));
  let y = h - 1; while (y > 0 && !rows[y]) y--;
  let l = w, r = 0; const bottom = y;
  while (y > h * 0.5 && rows[y] && rows[y][1] - rows[y][0] < maxW * 0.5) { l = Math.min(l, rows[y][0]); r = Math.max(r, rows[y][1]); y--; }
  if (bottom - y < h * 0.08) return { hem: 0.75, legs: [0.35, 0.72], split: 0.53, hand: [0.85, 0.6] };
  return { hem: (y + 2) / h, legs: [l / w, (r + 1) / w], split: (l + r + 1) / 2 / w, hand: [Math.min(0.9, (r + 1) / w + 0.15), 0.6] };
}

function drawImageFrame(img, spec, f, cw, ch) {
  const c = document.createElement("canvas"); c.width = cw; c.height = ch;
  const x = c.getContext("2d");
  x.imageSmoothingQuality = "high";
  // 腳底對齊程式繪製版的地面線，身高約佔格子 86%
  const groundY = (GROUND / FRAME_H) * ch, H = ch * 0.86, W = H * (img.width / img.height);
  const left = (cw - W) / 2, top = groundY - H;
  const iw = img.width, ih = img.height;
  let walking = false, phase = 0, breathe = 0, raise = 0, spark = 0;
  if (f < 4) breathe = [0, 0.5, 1, 0.5][f];
  else if (f < 12) { walking = true; phase = ((f - 4) / 8) * Math.PI * 2; }
  else { const k = f - 12; raise = ease(Math.min(1, k / 2.5)); spark = k >= 2 ? 0.45 + 0.55 * Math.abs(Math.sin(k * 1.3)) : 0; }
  const hemY = spec.hem * ih, splitX = spec.split * iw;
  const legX0 = spec.legs[0] * iw, legX1 = spec.legs[1] * iw;
  // 行走：兩腿以外袍下緣為軸前後擺動，擺動腿抬起；身體在跨步最大時下沉
  const amp = 0.16;
  const aFar = walking ? Math.sin(phase + Math.PI) * amp : 0, aNear = walking ? Math.sin(phase) * amp : 0;
  const liftFar = walking ? Math.max(0, Math.cos(phase + Math.PI)) * 0.012 * H : 0;
  const liftNear = walking ? Math.max(0, Math.cos(phase)) * 0.012 * H : 0;
  const bob = walking ? (1 - Math.cos(aNear)) * 0.5 * H * 0.9 : 0;
  const s = H / ih;
  function leg(x0, x1, ang, lift, dark) {
    const px = left + ((x0 + x1) / 2) * s, py = top + hemY * s + bob;
    x.save(); x.translate(px, py - lift); x.rotate(-ang);
    x.drawImage(img, x0, hemY - 2, x1 - x0, ih - hemY + 2, (x0 - (x0 + x1) / 2) * s, -2 * s, (x1 - x0) * s, (ih - hemY + 2) * s);
    if (dark) { x.globalCompositeOperation = "source-atop"; x.fillStyle = "rgba(20,10,10,.22)"; x.fillRect(-W, -10, W * 2, H); }
    x.restore();
  }
  // 遠側腿（較暗）→ 近側腿 → 上身
  x.save();
  leg(splitX, legX1, aFar, liftFar, true);
  leg(legX0, splitX, aNear, liftNear, false);
  x.restore();
  // 上身（外袍下緣以上）：呼吸時以腰部為基準微微伸縮；走路時隨步伐起伏並微前傾
  const upH = hemY + 1;
  x.save();
  const hipX = left + W / 2, hipY = top + hemY * s + bob;
  x.translate(hipX, hipY);
  if (walking) x.rotate(0.025);
  if (raise) x.rotate(0.02 * raise);
  x.scale(1, 1 + breathe * 0.008);
  x.drawImage(img, 0, 0, iw, upH, -W / 2, -hemY * s, W, upH * s);
  x.restore();
  // 互動：手邊升起魔法光點
  if (spark > 0) {
    const hx = left + spec.hand[0] * W, hy = top + spec.hand[1] * H - raise * H * 0.04;
    const R = 0.07 * H * spark, g = x.createRadialGradient(hx, hy, 0, hx, hy, R);
    g.addColorStop(0, "rgba(255,250,225,.95)"); g.addColorStop(0.35, "rgba(255,214,130,.6)"); g.addColorStop(1, "rgba(255,190,90,0)");
    x.fillStyle = g; x.beginPath(); x.arc(hx, hy, R, 0, 7); x.fill();
    x.fillStyle = "#fffbea"; x.beginPath();
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4 + spark, rr = i % 2 ? R * 0.12 : R * 0.45; x.lineTo(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr); }
    x.closePath(); x.fill();
  }
  return c;
}

export function characterAtlas(key) {
  return (atlasCache.get(key) || buildAtlas(key)).tex;
}

// 立繪角色要等圖片載入；程式繪製角色立即完成
export function characterReady(key) {
  return (atlasCache.get(key) || buildAtlas(key)).ready;
}

// 頭像（對話框用）：取待機第 0 格的上半部
export function portraitDataURL(key) {
  const tex = characterAtlas(key), cw = tex.image.width / COLS;
  const c = document.createElement("canvas"); c.width = 160; c.height = 160;
  c.getContext("2d").drawImage(tex.image, 0, cw * 0.05, cw, cw, 0, 0, 160, 160);
  return c.toDataURL();
}

function frameUV(tex, f) {
  tex.offset.set((f % COLS) / COLS, 1 - (Math.floor(f / COLS) + 1) / ROWS);
}

const wrap180 = (d) => { while (d > 180) d -= 360; while (d < -180) d += 360; return d; };

// 紙片角色：一張雙面平面。背面由 GPU 自然呈現鏡像，不另畫背面。
// 公開介面：.group、.walking、.face(screenDX, screenDY)、.update(dt, camYaw)、.addXray()
//          .setState("idle"|"walk"|"interact")、.interact() → Promise、.state、.paperAngle（度）
export class PaperCharacter {
  constructor(key, { height = 2.3, thickness = 0.026 } = {}) {
    this.key = key;
    this.height = height;
    atlasCache.get(key) || buildAtlas(key);
    const base = atlasCache.get(key);
    this.tex = base.tex.clone(); this.tex.needsUpdate = true; this.tex.repeat.set(1 / COLS, 1 / ROWS);
    this.edgeTex = base.edge.clone(); this.edgeTex.needsUpdate = true; this.edgeTex.repeat.set(1 / COLS, 1 / ROWS);
    // 立繪圖片載入完成後，複本貼圖也要重新上傳
    this.ready = base.ready.then(() => { this.tex.needsUpdate = true; this.edgeTex.needsUpdate = true; });
    const w = height * (FRAME_W / FRAME_H);
    this.w = w;
    const yOff = height / 2 - height * 0.035;
    // 細分平面：行走與轉身時讓紙張微微彎曲
    const geo = new THREE.PlaneGeometry(w, height, 8, 12);
    geo.translate(0, yOff, 0);
    this.geo = geo;
    this.base = Float32Array.from(geo.attributes.position.array);
    // 紙片受場景光影響，但保留 45% 自發光，維持貼紙的清晰可讀（背光時也不會整張變黑）
    this.mat = new THREE.MeshLambertMaterial({ map: this.tex, emissiveMap: this.tex, emissive: 0xffffff, emissiveIntensity: 0.45, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.castShadow = true;
    this.mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: this.tex, alphaTest: 0.5 });
    // 紙緣：與紙面垂直的細條，側向 90° 時看得到一條白色厚度邊
    const egeo = new THREE.PlaneGeometry(thickness, height);
    egeo.translate(0, yOff, 0);
    this.edgeMat = new THREE.MeshLambertMaterial({ map: this.edgeTex, emissiveMap: this.edgeTex, emissive: 0xffffff, emissiveIntensity: 0.45, alphaTest: 0.5, side: THREE.DoubleSide });
    this.edge = new THREE.Mesh(egeo, this.edgeMat);
    this.edge.rotation.y = Math.PI / 2;
    this.group = new THREE.Group();
    this.pivot = new THREE.Group();
    this.pivot.add(this.mesh, this.edge);
    this.group.add(this.pivot);
    this.frame = -1; this.t = Math.random() * 3; this.walking = false;
    this.stepPhase = 0;       // 步態相位（圈數），依實際移動距離推進，避免滑步
    this.stride = 1.15 * (height / 1.85); // 一個完整步態（兩步）前進的距離
    this.paperAngle = 0;      // 紙片相對鏡頭的角度（度）
    this.targetAngle = 0;
    this.turnSpeed = 720;     // 度／秒；180° 轉身約 0.25 秒，會經過 90° 細線
    this.facingRight = true;
    this._omega = 0; this._bend = 0;
    this._interact = null;
    this._blinkIn = 2 + Math.random() * 3; this._blinkT = 0;
    this._last = null;
    this._frozen = null;
    this.setFrame(0);
  }
  get state() { return this._interact ? "interact" : this.walking ? "walk" : "idle"; }
  setState(s) {
    if (s === "interact") return this.interact();
    this.walking = s === "walk";
  }
  // 播放一次互動動畫（舉杖、杖尖發光），結束後回到待機／行走
  interact(duration = 0.9) {
    if (this._interact) return this._interact.promise;
    let resolve; const promise = new Promise((r) => (resolve = r));
    this._interact = { t: 0, duration, resolve, promise };
    return promise;
  }
  addXray(scene) {
    // 被家具擋住時顯示淡淡剪影，避免玩家迷失位置
    const m = new THREE.MeshBasicMaterial({ map: this.tex, alphaTest: 0.5, side: THREE.DoubleSide, color: 0x6a5a8a, transparent: true, opacity: 0.38, depthFunc: THREE.GreaterDepth, depthWrite: false });
    const x = new THREE.Mesh(this.mesh.geometry, m); x.renderOrder = 10;
    this.mesh.add(x);
  }
  setFrame(f) {
    if (f === this.frame) return;
    this.frame = f; frameUV(this.tex, f); frameUV(this.edgeTex, f);
  }
  // screenDX>0 表示在畫面上往右走；screenDY>0 表示往畫面上方（遠離鏡頭）走
  face(screenDX, screenDY) {
    if (Math.abs(screenDX) > 0.15) this.facingRight = screenDX > 0;
    const away = screenDY > 0.35;
    // 面向右：0°（正面 3/4），面向左：180°（鏡像）。背對鏡頭時多轉 35°，紙片變窄。
    this.targetAngle = this.facingRight ? (away ? -35 : 0) : (away ? 215 : 180);
  }
  // 除錯／展示：固定角度、狀態與畫格（null 解除）
  freeze(opts) { this._frozen = opts; }
  update(dt, camYaw) {
    dt = Math.min(dt, 0.1);
    this.t += dt;
    const p = this.group.position;
    const moved = this._last ? Math.hypot(p.x - this._last.x, p.z - this._last.z) : 0;
    this._last = { x: p.x, z: p.z };
    let frame;
    const fr = this._frozen;
    if (this._interact) {
      const it = this._interact; it.t += dt;
      const k = Math.min(INTERACT_FRAMES.length - 1, Math.floor((it.t / it.duration) * INTERACT_FRAMES.length));
      frame = INTERACT_FRAMES[k];
      if (it.t >= it.duration) { this._interact = null; it.resolve(); }
    } else if (this.walking) {
      this.stepPhase += (moved > 1e-4 && moved < 1 ? moved : 1.6 * dt) / this.stride;
      frame = WALK_FRAMES[Math.floor(this.stepPhase * 8) % 8];
    } else {
      this._blinkIn -= dt;
      if (this._blinkIn <= 0) { this._blinkT = 0.14; this._blinkIn = 2.5 + Math.random() * 3; }
      if (this._blinkT > 0) { this._blinkT -= dt; frame = 3; }
      else frame = [0, 1, 2, 1][Math.floor(this.t * 2.2) % 4];
    }
    if (fr && fr.frame != null) frame = fr.frame;
    this.setFrame(frame);
    // 連續 Y 軸旋轉：以固定角速度追上目標角度，轉向時會經過 90° 細線
    const prev = this.paperAngle;
    if (fr && fr.angle != null) this.paperAngle = fr.angle;
    else {
      const d = wrap180(this.targetAngle - this.paperAngle);
      const step = this.turnSpeed * dt;
      this.paperAngle += Math.abs(d) <= step ? d : Math.sign(d) * step;
    }
    this._omega = dt > 0 ? wrap180(this.paperAngle - prev) / dt : 0;
    this.pivot.rotation.y = camYaw + (this.paperAngle * Math.PI) / 180;
    // 紙緣只在接近側面時顯示；俯視的透視鏡頭下，正面時它會變成穿過角色中央的一條白線
    this.edge.visible = Math.abs(Math.cos((this.paperAngle * Math.PI) / 180)) < 0.3;
    this.bend(dt, fr);
  }
  // 紙張彎曲：轉身時受空氣阻力向後捲、行走時隨步伐輕微起伏
  bend(dt, fr) {
    const walkB = this.walking && !this._interact ? Math.sin(this.stepPhase * Math.PI * 4) * 0.018 : 0;
    const turnB = THREE.MathUtils.clamp(-this._omega / this.turnSpeed, -1, 1) * 0.07;
    const target = fr && fr.bend != null ? fr.bend : walkB + turnB;
    this._bend += (target - this._bend) * Math.min(1, dt * 14);
    const sway = this.walking ? Math.sin(this.stepPhase * Math.PI * 2) * 0.02 : 0;
    const pos = this.geo.attributes.position, a = pos.array, b = this.base, hw = this.w / 2, h = this.height;
    for (let i = 0; i < a.length; i += 3) {
      const xn = b[i] / hw, yn = Math.max(0, b[i + 1] / h);
      a[i + 2] = this._bend * (xn * xn - 0.3) * hw * 2 + sway * yn * yn;
    }
    pos.needsUpdate = true;
    this.geo.computeVertexNormals();
  }
}
