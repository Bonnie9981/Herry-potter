// 庭院：北側與西側迴廊拱廊、八角石雕噴泉、四塊草坪與樹、遠方城堡塔樓。
import * as THREE from "three";
import * as T from "../textures.js";
import { createKit, finish, rep, rng } from "./_props.js";

export function build() {
  const W = 24, D = 20;
  const k = createKit(3);
  const { M, box, cyl, group, std } = k;
  const r = rng(77);

  // 地面：石板 + 四塊草坪（十字步道）
  k.floor(W + 40, D + 40, std({ map: rep(T.grass(), (W + 40) / 4, (D + 40) / 4), color: "#d8c8a0" }), W / 2, D / 2 + 8, -.02);
  k.floor(W, D, std({ map: rep(T.stoneFloor("grey"), W / 4, D / 4) }));
  const grass = std({ map: rep(T.grass(), 2, 2) });
  const hedge = std({ map: T.foliage(100, 3), roughness: 1 });
  const lawns = [[7.6, 9.4], [16.6, 9.4], [7.6, 15.8], [16.6, 15.8]];
  lawns.forEach(([x, z]) => {
    const w = 6, d = 4.4;
    k.floor(w, d, grass, x, z, .02);
    box(w, .12, .12, M.trim, x, .06, z - d / 2); box(w, .12, .12, M.trim, x, .06, z + d / 2);
    box(.12, .12, d, M.trim, x - w / 2, .06, z); box(.12, .12, d, M.trim, x + w / 2, .06, z);
    // 草坪角落的矮樹籬
    [[-1, -1], [1, 1]].forEach(([a, b]) => { const hg = box(1.4, .6, .5, hedge, x + a * (w / 2 - .9), .3, z + b * (d / 2 - .45)); hg.scale.y = 1; });
  });
  // 花叢
  lawns.forEach(([x, z], i) => { for (let j = 0; j < 4; j++) k.plant(group, x - 2 + r() * 4, .02, z - 1.5 + r() * 3, 3 + (j % 2), .9, i * 4 + j); });

  // 北側：城堡立面 + 迴廊
  const H = 9;
  const north = k.wall(W, H, W / 2, -.25, 0);
  [3, 8, 16, 21].forEach((x) => k.gothicWindow(north, x - W / 2, 4.6, 1.3, 3.2));
  const west = k.wall(D, H, -.25, D / 2, Math.PI / 2);
  [6, 14].forEach((z) => k.gothicWindow(west, z - D / 2, 4.6, 1.3, 3.2));

  // 迴廊：拱圈面板 + 柱 + 斜屋頂
  function arcade(axis, from, to, depth) {
    const n = Math.round((to - from) / 3.2);
    const step = (to - from) / n;
    for (let i = 0; i <= n; i++) {
      const p = from + i * step;
      if (axis === "x") k.pillar(p, depth, 3.6, .28); else k.pillar(depth, p, 3.6, .28);
    }
    for (let i = 0; i < n; i++) {
      const p = from + (i + .5) * step;
      // 拱圈：用 arch 做一片有拱洞的牆，上緣接屋頂
      const a = axis === "x" ? k.arch(p, depth, step - .9, 2.6, 0, .5) : k.arch(depth, p, step - .9, 2.6, Math.PI / 2, .5);
      a.scale.set(1, 1, 1);
    }
    // 簷口：拱廊頂端的石樑與雉堞（不加屋頂，讓鏡頭看得到廊下）
    const len = to - from + 1;
    if (axis === "x") box(len, .7, .6, M.trim, (from + to) / 2, 4.5, depth); else box(.6, .7, len, M.trim, depth, 4.5, (from + to) / 2);
    for (let p = from; p <= to; p += 1.2) { if (axis === "x") box(.6, .4, .6, M.trim, p, 5.05, depth); else box(.6, .4, .6, M.trim, depth, 5.05, p); }
  }
  arcade("x", 3.6, W - .4, 3.4);
  arcade("z", 3.6, D - .4, 3.4);
  // 迴廊角柱與屋頂轉角
  k.pillar(3.4, 3.4, 3.6, .34);
  // 迴廊內：牆上燭台、長凳
  [6, 12, 18].forEach((x) => k.sconce(north, x - W / 2, 2.6));
  [8, 14].forEach((z) => k.sconce(west, z - D / 2, 2.6));
  k.bench(9.5, 1.1, 2.4); k.bench(15.5, 1.1, 2.4);
  k.bench(1.1, 10, 2.4, Math.PI / 2);

  // 中央八角噴泉
  const fx = 12.1, fz = 12.6;
  const basin = std({ map: rep(T.stoneWall("warm"), 2, .3) });
  basin.side = THREE.DoubleSide;
  const rim = k.add(new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.4, .65, 8, 1, true), basin)); rim.position.set(fx, .325, fz); rim.rotation.y = Math.PI / 8;
  const inner = k.add(new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, .6, 8, 1, true), basin)); inner.position.set(fx, .3, fz); inner.rotation.y = Math.PI / 8;
  const lip = k.add(new THREE.Mesh(new THREE.RingGeometry(2.08, 2.45, 8), M.trim)); lip.rotation.x = -Math.PI / 2; lip.position.set(fx, .66, fz); lip.rotation.z = Math.PI / 8; 
  const waterTex = rep(T.water(), 2, 2);
  const water = new THREE.Mesh(new THREE.CircleGeometry(2.15, 8), new THREE.MeshStandardMaterial({ map: waterTex, color: "#b8d8dc", roughness: .12, metalness: .2, emissive: "#20383c", transparent: true, opacity: .95 }));
  water.rotation.set(-Math.PI / 2, 0, Math.PI / 8); water.position.set(fx, .5, fz); water.receiveShadow = true; group.add(water);
  cyl(.35, .5, 1.6, M.stone, fx, 1.2, fz, 10);
  cyl(1.1, .35, .3, M.trim, fx, 2.05, fz, 16);
  const bowlWater = new THREE.Mesh(new THREE.CircleGeometry(1, 16), water.material); bowlWater.rotation.x = -Math.PI / 2; bowlWater.position.set(fx, 2.19, fz); group.add(bowlWater);
  cyl(.15, .22, .9, M.stone, fx, 2.6, fz, 10);
  const fin = new THREE.Mesh(new THREE.OctahedronGeometry(.22, 0), M.brass); fin.position.set(fx, 3.2, fz); k.add(fin);
  // 水柱與水花（半透明，動畫）
  const jetMat = new THREE.MeshBasicMaterial({ color: "#d8eef0", transparent: true, opacity: .45, depthWrite: false });
  const jets = [];
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(fx + Math.cos(a) * .95, 2.2, fz + Math.sin(a) * .95), new THREE.Vector3(fx + Math.cos(a) * 1.5, 2.5, fz + Math.sin(a) * 1.5), new THREE.Vector3(fx + Math.cos(a) * 1.9, .6, fz + Math.sin(a) * 1.9));
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, .03, 5), jetMat); group.add(m); jets.push(m);
  }
  const sparkles = [];
  for (let i = 0; i < 10; i++) { const s = k.glowSprite(fx, .7, fz, .25, "#fff2d0"); s.userData.a = i / 10 * Math.PI * 2; sparkles.push(s); }
  k.collide(fx, fz, 4.8, 4.8);

  // 樹與長凳
  k.tree(5.4, 8.2, 5.6, 11, 92); k.plant(group, 19.2, .02, 17.2, 3, 2, 9); k.tree(19.6, 8, 4.4, 14, 100);
  k.bench(fx, fz + 3.5, 2.2); k.bench(fx, fz - 3.5, 2.2); k.bench(fx - 3.6, fz, 2.2, Math.PI / 2);
  // 燈柱
  [[8.8, 6.6], [15.4, 6.6], [8.8, 18.6], [15.4, 18.6]].forEach(([x, z], i) => {
    cyl(.07, .1, 2.6, M.iron, x, 1.3, z, 8);
    box(.32, .42, .32, M.iron, x, 2.75, z);
    const glass = box(.26, .34, .26, std({ color: "#ffe2a8", emissive: "#ffb55a", emissiveIntensity: 1.2 }), x, 2.75, z); glass.castShadow = false;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(.28, .25, 4), M.iron); cap.position.set(x, 3.08, z); cap.rotation.y = Math.PI / 4; k.add(cap);
    k.glowSprite(x, 2.75, z, 1.1, "#ffcf88");
    if (i < 2) { const l = new THREE.PointLight("#ffb56b", 3, 7, 1.5); l.position.set(x, 2.6, z); group.add(l); }
    k.collide(x, z, .4, .4);
  });

  // 南側、東側低矮石欄（鏡頭不擋），留出口
  k.balustrade(4.5, D - .1, 9); k.balustrade(W - 4.5, D - .1, 9);
  k.balustrade(W - .1, 5.5, 4.2, Math.PI / 2); k.balustrade(W - .1, 15.5, 8.4, Math.PI / 2);
  [9.1, 14.9].forEach((x) => { box(.7, 1.6, .7, M.trim, x, .8, D - .1); const b = new THREE.Mesh(new THREE.SphereGeometry(.28, 12, 8), M.trim); b.position.set(x, 1.85, D - .1); k.add(b); });
  k.collide(4.5, D - .1, 9, .4); k.collide(W - 4.5, D - .1, 9, .4);
  k.collide(W - .1, 5.5, .4, 4.2); k.collide(W - .1, 15.5, .4, 8.4);

  // 北牆中央：通往大廳的大門
  const door = new THREE.Group(); door.position.set(0, 0, .27); north.add(door);
  box(2.2, 3.4, .06, std({ color: "#1c130d" }), 0, 1.7, 0, door);
  const leaf = std({ map: rep(T.wood("dark"), 1, 2) });
  box(1.05, 3.3, .1, leaf, -.55, 1.65, .08, door); box(1.05, 3.3, .1, leaf, .55, 1.65, .08, door);
  for (let i = 0; i < 4; i++) { box(2.2, .06, .14, M.iron, 0, .5 + i * .8, .14, door); }
  box(2.8, .4, .5, M.trim, 0, 3.6, .1, door);

  // 背景：城牆後方的塔樓（原創造型）
  const towerMat = std({ map: rep(T.stoneWall("warm"), 2, 3) });
  const roofT = std({ color: "#3e4a5a", roughness: .7, flatShading: true });
  [[2, -4, 2.2, 17], [10, -6, 1.6, 15], [20, -3.5, 2.6, 19], [-4, 8, 2, 16], [-5, 18, 1.8, 13]].forEach(([x, z, rr, h]) => {
    cyl(rr, rr * 1.05, h, towerMat, x, h / 2, z, 16);
    const c = new THREE.Mesh(new THREE.ConeGeometry(rr * 1.25, rr * 2.4, 16), roofT); c.position.set(x, h + rr * 1.2, z); k.add(c);
    for (let i = 0; i < 3; i++) { const a = i * 2.1 + .6; const w = box(.4, .9, .1, M.glass, x + Math.sin(a) * rr, h * .7 - i * 3, z + Math.cos(a) * rr); w.rotation.y = a; w.castShadow = false; }
  });

  k.collide(W / 2, -.3, W, .6); k.collide(-.3, D / 2, .6, D);

  k.hotspot("fountain", "石雕噴泉", "物件", fx + 1.4, fz + 2.8, ["調查", "休息"], "水聲蓋過了遠處的談話。池底有幾枚被人丟進去許願的銅幣。");
  k.hotspot("students", "庭院裡的學生", "人物", 16.6, 12.4, ["交談", "觀察"], "兩人似乎在爭論某堂課的作業。");

  const sky = new THREE.Color(0xe9bd8a);
  return finish(k, {
    id: "courtyard", name: "庭院", floorLabel: "室外",
    size: { w: W, d: D },
    spawn: { x: 12, z: 4.6 },
    exits: [
      { to: "hall", x: 12, z: .8, w: 2.2, d: 1, label: "大廳" },
      { to: "grounds", x: 12, z: D - .2, w: 5, d: .6, label: "黑湖湖畔" },
      { to: "greenhouse", x: W - .2, z: 9.8, w: .6, d: 3.6, label: "溫室" },
    ],
    lighting: { indoor: false, sunDir: [-1, .7, -.35], sunColor: 0xffc890, sunIntensity: 3.6, ambient: 0x6a5040, skyColor: 0xf6dcae, hemiIntensity: 1.3, background: sky.getHex(), fog: [0xe9bd8a, 40, 110] },
    npcSpots: { "中央": [fx + 3, fz - 3.4], "噴泉旁": [fx + 2.8, fz + 2.6], "拱廊": [10, 2.2], "草地": [16.6, 12.6], "樹下": [6.6, 9.8] },
    view: { x: 12, z: 10, dist: 42 },
    update(dt, clock, t) {
      waterTex.offset.x = t * .02; waterTex.offset.y = t * .013;
      jets.forEach((j, i) => { j.material.opacity = .35 + .1 * Math.sin(t * 6 + i); });
      sparkles.forEach((s) => { const a = s.userData.a + t * .3, rr = 1.6 + .3 * Math.sin(t * 3 + s.userData.a * 3); s.position.set(fx + Math.cos(a) * rr, .65 + .05 * Math.sin(t * 5 + a), fz + Math.sin(a) * rr); s.material.opacity = .5 + .5 * Math.sin(t * 4 + a * 7); });
    },
  });
}
