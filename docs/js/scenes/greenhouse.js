// 溫室：石基座玻璃牆與鐵架拱頂、盆栽長架、中央泥土苗床、工作台、澆水處與漂浮的發光孢子。
import * as THREE from "three";
import * as T from "../textures.js";
import { createKit, finish, rep, rng, tex } from "./_props.js";

export function build() {
  const W = 16, D = 14, H = 4;
  const k = createKit(9);
  const { M, box, cyl, group, std } = k;
  const r = rng(19);

  // 地面：外圍草地、室內泥土 + 木板步道
  k.floor(W + 40, D + 40, std({ map: rep(T.grass(), 14, 14), color: "#d8c8a0" }), W / 2, D / 2 + 6, -.03);
  k.floor(W, D, std({ map: rep(tex.dirt(), 5, 4), color: "#c8b8a8" }), W / 2, D / 2, 0);
  const plank = std({ map: rep(T.wood("light"), 1, 6), color: "#c9b096", roughness: .8 });
  k.floor(1.6, D, plank, 5.2, D / 2, .02); k.floor(1.6, D, plank, 10.8, D / 2, .02);
  k.floor(W, 1.6, plank, W / 2, 12.6, .021);

  // 玻璃牆：北、西兩面（石基座 + 鐵框玻璃），南、東只有基座
  const glassMat = new THREE.MeshStandardMaterial({ color: "#dfeee4", transparent: true, opacity: .18, roughness: .05, metalness: .1, depthWrite: false, side: THREE.DoubleSide });
  const baseMat = std({ map: rep(T.stoneWall("warm"), 4, .3) });
  function glassWall(len, x, z, rot, door) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group.add(g);
    const pieces = door ? [[-len / 2, door - .9], [door + .9, len / 2]] : [[-len / 2, len / 2]];
    for (const [a, b] of pieces) {
      box(b - a, .9, .4, baseMat, (a + b) / 2, .45, 0, g);
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(b - a, H - .9), glassMat); pane.position.set((a + b) / 2, .9 + (H - .9) / 2, 0); g.add(pane);
    }
    if (door) { const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.8, H - 3), glassMat); pane.position.set(door, 3 + (H - 3) / 2, 0); g.add(pane); box(1.9, .1, .12, M.iron, door, 3, 0, g); }
    for (let p = -len / 2; p <= len / 2 + .01; p += 1.2) box(.07, H - .9, .07, M.iron, p, .9 + (H - .9) / 2, 0, g);
    for (const y of [1.9, 3, H]) box(len, .06, .08, M.iron, 0, y, 0, g);
    return g;
  }
  glassWall(W, W / 2, 0, 0);
  glassWall(D, 0, D / 2, Math.PI / 2, 10 - D / 2);
  box(W, .9, .4, baseMat, W / 2, .45, D); box(.4, .9, D, baseMat, W, .45, D / 2);
  // 南側入口缺口：以基座留出開口
  // 拱頂鐵肋（沿 x 方向的半圓拱，間隔 2.8 m），屋頂玻璃極淡
  const roofR = W / 2;
  for (let z = 0; z < D - 1; z += 2.8) {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(roofR, .05, 6, 40, Math.PI), M.iron);
    arc.position.set(W / 2, H, z); arc.scale.y = .26; k.add(arc);
  }
  const roofGlass = new THREE.Mesh(new THREE.CylinderGeometry(roofR, roofR, 11.2, 32, 1, true, -Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: "#e6f2ea", transparent: true, opacity: .07, depthWrite: false, side: THREE.DoubleSide }));
  roofGlass.rotation.x = Math.PI / 2; roofGlass.scale.set(1, 1, .26); roofGlass.position.set(W / 2, H, 5.6); group.add(roofGlass);
  box(.08, .08, 11.2, M.iron, W / 2, H + roofR * .26, 5.6);
  [W / 2 - 5, W / 2 + 5].forEach((x) => box(.06, .06, 11.2, M.iron, x, H + roofR * .26 * Math.sqrt(1 - (25 / (roofR * roofR))), 5.6));
  // 北牆外側鐵框門與牆角柱
  [[0, 0], [W, 0], [0, D], [W, D]].forEach(([x, z]) => box(.25, H, .25, M.iron, x, H / 2, z));

  // 盆栽長架：西側與東側各一排（工作台高度），擺滿盆栽
  const pots = ["#8a4a2a", "#9a5a36", "#6f4a3a", "#a0603a"];
  function potBench(x, z0, z1) {
    const len = z1 - z0;
    k.table(x, (z0 + z1) / 2, 1.2, len, .8, M.wood);
    for (let z = z0 + .4, i = 0; z < z1 - .2; z += .62, i++) {
      const pr = .17 + r() * .07;
      k.pot(x + (r() - .5) * .4, .8, z, pr, pots[i % 4]);
      k.plant(group, x + (r() - .5) * .2, .8 + pr * 1.45, z, (i + Math.floor(x)) % 4, .8 + r() * .5, i + Math.floor(x * 3));
    }
    // 下層架子：空盆與麻袋
    box(1, .05, len - .3, M.wood, x, .25, (z0 + z1) / 2);
    for (let z = z0 + .5; z < z1 - .3; z += 1.3) cyl(.14, .1, .2, std({ color: pots[(z | 0) % 4] }), x + .2, .37, z, 10);
  }
  potBench(2.2, 1.2, 8.6);
  potBench(13.8, 1.2, 11.4);

  // 中央苗床：木框泥土，種大型魔法植物
  const bx = 8, bz = 6.2, bw = 3.6, bd = 7.6;
  const frame = std({ map: rep(T.wood("dark"), 2, .3) });
  box(bw, .4, .14, frame, bx, .2, bz - bd / 2); box(bw, .4, .14, frame, bx, .2, bz + bd / 2);
  box(.14, .4, bd, frame, bx - bw / 2, .2, bz); box(.14, .4, bd, frame, bx + bw / 2, .2, bz);
  const soil = box(bw - .2, .35, bd - .2, k.M.dirt, bx, .175, bz); soil.castShadow = false;
  k.collide(bx, bz, bw + .2, bd + .2);
  for (let i = 0; i < 9; i++) {
    const px = bx - 1.1 + (i % 3) * 1.1, pz = bz - 2.8 + Math.floor(i / 3) * 2.6;
    k.plant(group, px, .35, pz, i % 4, 1.6 + r() * .8, 40 + i);
  }
  // 苗床上的大型捲鬚植物（會擺動）
  const big = k.plant(group, bx, .35, bz, 1, 3.2, 99);

  // 工作台（東北角）：工具、手套、肥料袋
  const wb = k.table(10.8, 1.2, 3.2, 1, .9, M.darkWood);
  box(.5, .3, .35, std({ color: "#a68a5a", roughness: 1 }), 9.8, 1.05, 1.1);
  const trowel = box(.06, .03, .4, M.iron, 11.2, .93, 1.3); trowel.rotation.y = .6;
  box(.18, .05, .25, std({ color: "#7a4a2a" }), 11.8, .93, 1);
  k.pot(12, .9, 1.3, .14, "#8a4a2a"); k.plant(group, 12, 1.1, 1.3, 2, .5, 7);
  // 掛在北牆的工具架
  box(3, .08, .08, M.darkWood, 10.8, 2.2, .2);
  [9.6, 10.2, 10.8, 11.4, 12].forEach((x, i) => { box(.04, .7 - (i % 2) * .2, .04, M.darkWood, x, 1.8, .25); box(.18, .14, .03, M.iron, x, 1.45 + (i % 2) * .1, .25); });

  // 澆水處（東南）：手壓幫浦、水桶、澆水壺
  k.barrel(14.6, 12.8);
  cyl(.06, .06, 1.2, M.iron, 13.7, .6, 12.9, 8);
  const handle = box(.5, .04, .04, M.iron, 13.9, 1.2, 12.9); handle.rotation.z = -.3;
  const spout = box(.25, .05, .05, M.iron, 13.6, 1, 12.9);
  cyl(.25, .22, .35, std({ color: "#6a6e72", metalness: .6, roughness: .4 }), 13.6, .18, 12.4, 12);
  const can = new THREE.Group(); can.position.set(12.9, 0, 12.6); group.add(can);
  cyl(.13, .15, .28, M.brass, 0, .14, 0, 12, can);
  const nose = box(.3, .04, .04, M.brass, .22, .25, 0, can); nose.rotation.z = .6;
  k.collide(13.8, 12.6, 1.4, 1);

  // 吊盆
  [[5.2, 3.4], [10.8, 4.4], [5.2, 9.2], [10.8, 10]].forEach(([x, z], i) => {
    cyl(.005, .005, 1.2, M.iron, x, H - .1, z, 3);
    k.pot(x, H - 1.1, z, .2, pots[i]);
    const p = k.plant(group, x, H - .8, z, 2, .7, 60 + i); p.rotation.x = Math.PI; p.position.y = H - .78;
  });

  // 發光孢子（緩慢飄移）
  const spores = [];
  for (let i = 0; i < 24; i++) {
    const s = k.glowSprite(1 + r() * (W - 2), .6 + r() * 2.6, 1 + r() * (D - 2), .18 + r() * .16, i % 3 ? "#d8ffb0" : "#ffd0f0");
    s.userData = { o: s.position.clone(), ph: r() * 6 };
    spores.push(s);
  }
  // 溫暖補光（像陽光在玻璃裡回彈）
  const fill = new THREE.PointLight("#ffe0a8", 6, 14, 1.3); fill.position.set(8, 3.4, 7); group.add(fill);

  // 邊界：北、西玻璃牆；南、東基座（留門）
  k.collide(W / 2, -.2, W, .5); k.collide(-.2, 4.5, .5, 9); k.collide(-.2, 12.5, .5, 3);
  k.collide(4, D, 8, .5); k.collide(W - 2, D, 4, .5); k.collide(W, D / 2, .5, D);

  k.hotspot("plant", "溫室植物", "物件", bx + 2.2, bz + 1.2, ["觀察", "照料"], "葉片邊緣有細小的水珠，捲鬚感覺到人靠近就慢慢縮了回去。");
  k.hotspot("assistant", "溫室助教", "人物", 10.4, 2.6, ["交談", "詢問植物"], "對方正在檢查一排盆栽，手套上都是泥土。");

  return finish(k, {
    id: "greenhouse", name: "溫室", floorLabel: "校園庭園",
    size: { w: W, d: D },
    spawn: { x: 10, z: 12.4 },
    exits: [
      { to: "courtyard", x: .3, z: 10, w: .6, d: 1.8, label: "庭院" },
      { to: "grounds", x: 10, z: D - .1, w: 4, d: .5, label: "黑湖湖畔" },
    ],
    lighting: { indoor: false, sunDir: [-1, .75, -.3], sunColor: 0xffd29a, sunIntensity: 3.4, ambient: 0x4e5a3a, skyColor: 0xf4e2b8, hemiIntensity: 1.4, background: 0xe7c497, fog: [0xe7c497, 40, 100] },
    npcSpots: { "中央": [5.2, 7], "盆栽架": [3.4, 5], "工作台": [10.6, 2.4], "澆水處": [12.4, 11.9], "苗床": [10.4, 6.8] },
    view: { x: 8, z: 7, dist: 30 },
    update(dt, clock, t) {
      spores.forEach((s) => { const { o, ph } = s.userData; s.position.set(o.x + Math.sin(t * .3 + ph) * .5, o.y + Math.sin(t * .5 + ph * 2) * .3, o.z + Math.cos(t * .25 + ph) * .5); s.material.opacity = .5 + .5 * Math.sin(t * 1.5 + ph); });
      big.rotation.y = Math.sin(t * .4) * .5;
    },
  });
}
