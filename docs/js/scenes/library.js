// 圖書館：以 assets/art-direction 兩張參考圖為基準的可走動場景。
// 西側高窗引入夕照（真實陰影投出窗格光斑），北牆整排書架，閱讀桌、天球儀、地球儀、星圖黑板。
import * as THREE from "three";
import * as T from "../textures.js";
import * as K from "../kit.js";

export const SUN_DIR = [1, -0.62, 0.28];

function catalogCabinet(b, x, z) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.3, 0.6), K.materials.woodDark()); body.position.y = 0.65; g.add(body);
  const knob = K.materials.brass();
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const dr = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.03), K.materials.woodLight()); dr.position.set(-0.57 + i * 0.38, 0.22 + j * 0.29, 0.31); g.add(dr);
    const k = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), knob); k.position.set(-0.57 + i * 0.38, 0.22 + j * 0.29, 0.34); g.add(k);
  }
  g.position.set(x, 0, z); b.add(g); b.collide(x, z, 1.7, 0.7);
}

export function build() {
  const W = 20, D = 15, H = 6.5;
  const b = new K.SceneBuilder("library", "圖書館", W, D);

  K.floor(b, T.stoneFloor("warm"), { tile: 2.6 });
  // 欄杆外的下層地面，避免畫面邊緣出現黑色空洞
  K.floor(b, T.stoneFloor("grey"), { tile: 3, x: -6, z: -2, w: 34, d: 28, y: -3.2 });
  K.ceilingShadow(b, H);

  // 西牆：三扇拱窗
  const windows = [3.2, 7.6, 12.0].map(c => ({ c, w: 2.2, sill: 0.9, h: 4.6, arch: true, kind: "window" }));
  K.wall(b, { axis: "z", at: 0, from: 0, to: D, h: H, openings: windows });
  for (const o of windows) K.windowShaft(b, { axis: "z", at: 0.05, c: o.c, w: o.w, sill: o.sill, top: o.sill + o.h, sunDir: SUN_DIR });
  K.banner(b, 0.08, 4.0, 5.4, { rot: Math.PI / 2, hue: 222, emblem: "star" });
  K.banner(b, 0.08, 4.0, 9.8, { rot: Math.PI / 2, hue: 222, emblem: "star" });

  // 北牆：門通往走廊
  K.wall(b, { axis: "x", at: 0, from: 0, to: W, h: H, openings: [{ c: 10.5, w: 2.2, sill: 0, h: 3.6, arch: true, kind: "door" }] });
  [1.75, 4.15, 6.55, 12.9, 15.3].forEach((x, i) => K.bookshelf(b, x, 0.36, { w: 2.4, h: 3.6, seed: 3 + i, rows: 5 }));
  K.starChart(b, 18.3, 2.3, 0.1, { w: 2.5, h: 1.9 });
  K.wallSconce(b, 8.75, 2.6, 0.06, { light: true });
  K.wallSconce(b, 12.25 - 0.1, 2.6, 0.06, { light: false });
  K.banner(b, 8.75, 4.9, 0.08, { hue: 222, emblem: "star", w: 0.9, h: 2.2 });
  K.exitMarker(b, 10.5, 0.9, 2.0, 1.2);
  b.exit({ to: "corridor", x: 10.5, z: 0.55, w: 2.0, d: 0.9, label: "往移動樓梯廊" });

  // 東、南兩側欄杆（不擋視線），南側中段為下樓梯口
  K.balustrade(b, 0.3, D, 8.6, D);
  K.balustrade(b, 12.4, D, W, D);
  K.balustrade(b, W, 0.6, W, D);
  K.exitMarker(b, 10.5, D - 0.4, 3.4, 1.0);
  b.exit({ to: "hall", x: 10.5, z: D - 0.1, w: 3.6, d: 0.8, label: "下樓往大廳" });

  // 地毯
  K.carpet(b, 10.5, 7.8, 2.4, 12.4, { color: "navy", seed: 4 });
  K.carpet(b, 5.0, 9.0, 5.2, 8.2, { color: "navy", seed: 7 });

  // 閱讀桌 A（任務古書）與 B
  for (const [z, seed] of [[6.6, 1], [11.4, 2]]) {
    const t = K.table(b, 5.0, z, { w: 3.0, d: 1.3 });
    const y = t.userData.top;
    K.candelabra(b, 4.0, y, z, { light: true });
    K.bookStack(b, 6.1, y, z - 0.25, { n: 3, seed });
    K.bookStack(b, 3.2, y, z + 0.3, { n: 2, seed: seed + 3, rot: 0.5 });
    for (const dx of [-0.9, 0.9]) { K.chair(b, 5.0 + dx, z - 1.0, { rot: 0 }); K.chair(b, 5.0 + dx, z + 1.0, { rot: Math.PI }); }
  }
  K.openBook(b, 5.2, 0.82, 6.6, { rot: 0.15 });

  // 前景書桌（參考圖右下）與管理員櫃台
  const d1 = K.desk(b, 15.2, 12.2, { w: 2.8, d: 1.2 });
  K.bookStack(b, 14.3, d1.userData.top, 12.1, { n: 4, seed: 5 });
  K.bookStack(b, 16.1, d1.userData.top, 12.3, { n: 2, seed: 6, rot: 0.3 });
  K.candle(b, 15.3, d1.userData.top, 12.0, { light: true, intensity: 1.6 });
  const d2 = K.desk(b, 14.6, 4.2, { w: 3.0, d: 1.1 });
  K.crystalBall(b, 15.6, d2.userData.top, 4.1);
  K.bookStack(b, 13.6, d2.userData.top, 4.2, { n: 3, seed: 8 });
  K.candle(b, 14.5, d2.userData.top, 4.0, {});

  // 東側獨立書架（玩家走到後方會被遮擋，並顯示剪影）
  K.bookshelf(b, 18.9, 9.6, { w: 2.2, h: 3.0, rot: Math.PI / 2, seed: 11 });
  K.bookshelf(b, 18.9, 12.4, { w: 2.2, h: 3.0, rot: Math.PI / 2, seed: 12 });

  // 天球儀、地球儀、索引櫃
  K.armillary(b, 2.0, 5.4, { scale: 0.85 });
  K.armillary(b, 17.6, 6.8, { scale: 1.0 });
  K.globe(b, 1.6, 13.8, { scale: 1 });
  K.globe(b, 8.6, 13.4, { scale: 0.9 });
  catalogCabinet(b, 8.6, 1.0);

  // 互動點
  b.hotspot({ id: "book", name: "桌上的古書", kind: "物件", x: 5.2, z: 6.6, actions: ["閱讀", "調查"], desc: "書頁間夾著一張折起來的羊皮紙。" });
  b.hotspot({ id: "shelf", name: "靠窗書架", kind: "物件", x: 4.15, z: 0.9, actions: ["尋找書籍", "調查"], desc: "其中一本書的書脊比其他書突出。" });
  b.hotspot({ id: "catalog", name: "索引櫃", kind: "物件", x: 8.6, z: 1.5, actions: ["查閱", "調查"], desc: "卡片依照作者與主題排列。" });
  b.hotspot({ id: "chart", name: "星圖黑板", kind: "物件", x: 18.3, z: 1.0, actions: ["觀察", "抄寫"], desc: "有人用粉筆在星座之間畫了一條新的連線。" });
  b.hotspot({ id: "armillary", name: "天球儀", kind: "物件", x: 17.6, z: 7.5, actions: ["調查", "轉動圓環"], desc: "黃銅圓環在無人觸碰的情況下緩慢轉動。" });
  b.hotspot({ id: "crystal", name: "櫃台上的水晶球", kind: "物件", x: 15.6, z: 4.8, actions: ["調查"], desc: "球心有一縷淡藍色的霧氣在打轉。" });
  b.hotspot({ id: "window", name: "高窗", kind: "環境", x: 1.0, z: 7.6, actions: ["眺望", "休息"], desc: "窗外是傍晚的庭園與樹梢。" });

  b.spot("管理員櫃台", 14.6, 5.4);
  b.spot("閱讀桌A", 5.9, 7.7);
  b.spot("閱讀桌B", 4.1, 10.3);
  b.spot("窗邊", 2.0, 9.6);
  b.spot("書架前", 13.4, 1.4);
  b.spot("星圖前", 17.9, 1.6);
  b.spot("書桌前", 15.0, 10.8);
  b.spot("天球儀旁", 16.4, 8.2);

  return b.result({
    floorLabel: "三樓",
    desc: "高聳書架、閱讀桌與午後陽光。",
    spawn: { x: 10.5, z: 13.2 },
    entries: { corridor: { x: 10.5, z: 1.9 }, hall: { x: 10.5, z: 13.4 } },
    lighting: { indoor: true, sunDir: SUN_DIR, sunColor: 0xffc58a, sunIntensity: 7.5, ambient: 0x9a7050, hemiSky: 0xffdcae, hemiGround: 0x4a3020, hemiIntensity: 1.4 },
  });
}
