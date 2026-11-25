// 黑湖湖畔：起伏湖岸、木棧橋、蘆葦與岩石、林邊小徑，對岸是暗色森林與山丘上的城堡剪影（原創造型）。
import * as THREE from "three";
import * as T from "../textures.js";
import { createKit, finish, rep, rng, tex } from "./_props.js";

export function build() {
  const W = 26, D = 22;
  const k = createKit(11);
  const { M, box, cyl, group, std } = k;
  const r = rng(23);
  const shore = (x) => 8.2 + 1.4 * Math.sin(x * .32) + .8 * Math.sin(x * .77 + 1.3);

  // 湖面（大片延伸到遠方）
  const waterTex = rep(T.water(), 10, 8);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(140, 90), new THREE.MeshStandardMaterial({ map: waterTex, color: "#c8d8d4", roughness: .25, metalness: 0, emissive: "#3a4a50", emissiveIntensity: .6 }));
  water.rotation.x = -Math.PI / 2; water.position.set(W / 2, -.32, -30); water.receiveShadow = true; group.add(water);
  // 夕陽在水面的反光
  const glints = [];
  for (let i = 0; i < 26; i++) { const s = k.glowSprite(-2 + r() * 22, -.25, -2 + r() * 9, .3 + r() * .5, "#ffd49a"); s.userData.ph = r() * 6; glints.push(s); }

  // 湖岸地面：上緣是曲線岸線，側面成泥土河岸
  const shape = new THREE.Shape();
  shape.moveTo(-30, -shore(-30));
  for (let x = -30; x <= 60; x += .5) shape.lineTo(x, -shore(x));
  shape.lineTo(60, -60); shape.lineTo(-30, -60); shape.closePath();
  const grassTex = rep(T.grass(), .25, .25);
  const bank = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .5, bevelEnabled: true, bevelThickness: .2, bevelSize: .5, bevelSegments: 2, curveSegments: 4 }), [std({ map: grassTex, color: "#d8cca0" }), std({ map: rep(tex.dirt(), .3, .3), color: "#9a8a70" })]);
  bank.rotation.x = -Math.PI / 2; bank.position.y = -.7; bank.receiveShadow = true; group.add(bank);

  // 草坡上的小徑（碎石）從南方入口延伸到棧橋與林邊
  const gravel = std({ map: rep(T.gravel(), 1, 1), color: "#a9b0b4" });
  const pathPts = [[13, D + 1], [12.6, 18], [11.4, 15], [9.6, 12.4], [8.4, 10.4]];
  const branch = [[11.4, 15], [15, 14.2], [19, 13.6], [23, 13.4], [W + 1, 13.6]];
  for (const pts of [pathPts, branch]) for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
    const len = Math.hypot(x1 - x0, z1 - z0);
    const seg = new THREE.Mesh(new THREE.PlaneGeometry(1.5, len + .8), gravel);
    seg.rotation.set(-Math.PI / 2, 0, Math.atan2(x1 - x0, z1 - z0)); seg.position.set((x0 + x1) / 2, .02 + i * .001, (z0 + z1) / 2); seg.receiveShadow = true; group.add(seg);
  }
  // 踏腳石
  for (let i = 0; i < 6; i++) { const s = cyl(.32, .36, .1, std({ color: "#9a9080", roughness: 1 }), 8.6 - i * .05 + (i % 2) * .4, .03, 10.2 - i * .02, 9); s.scale.z = .8; }

  // 木棧橋：從岸邊伸入湖中
  const dx = 8, dz0 = shore(8) + .6, dz1 = 1.4;
  const planks = std({ map: rep(T.wood("light"), 1, 3), color: "#b59a7a" });
  box(1.8, .12, dz0 - dz1, planks, dx, .06, (dz0 + dz1) / 2);
  for (let z = dz1 + .3; z < dz0; z += 1.6) [-.8, .8].forEach((o) => cyl(.09, .09, 1.6, M.darkWood, dx + o, -.6, z, 8));
  [-.85, .85].forEach((o) => { for (let z = dz1 + .3; z < dz0 - 1; z += 1.6) cyl(.06, .06, .8, M.darkWood, dx + o, .45, z, 6); box(.06, .06, dz0 - dz1 - 1, M.darkWood, dx + o, .82, (dz0 - 1 + dz1) / 2); });
  // 棧橋盡頭：小船與燈籠
  const boat = new THREE.Group(); boat.position.set(dx + 1.8, -.25, dz1 + 1.2); boat.rotation.y = .25; group.add(boat);
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, 2.6, 12, 1, false, 0, Math.PI), std({ map: rep(T.wood("dark"), 1, 1), side: THREE.DoubleSide }));
  hull.rotation.set(Math.PI / 2, 0, Math.PI / 2); hull.scale.set(1, 1, .55); hull.position.y = .3; k.add(hull, boat);
  box(1, .05, .3, M.wood, 0, .25, 0, boat);
  cyl(.05, .05, 1.6, M.iron, dx + .85, .8, dz1 + .3, 6);
  box(.24, .32, .24, std({ color: "#ffe0a0", emissive: "#ffa040", emissiveIntensity: 1.3 }), dx + .85, 1.7, dz1 + .3).castShadow = false;
  k.glowSprite(dx + .85, 1.7, dz1 + .3, 1.4, "#ffc070");
  const lamp = new THREE.PointLight("#ffb060", 4, 8, 1.4); lamp.position.set(dx + .85, 1.6, dz1 + .3); group.add(lamp);

  // 岸邊岩石與蘆葦
  [[3, 1], [5.2, 2], [14, 3], [17.5, 4], [21, 5], [24.5, 6], [1.2, 7]].forEach(([x, s], i) => k.rock(x, shore(x) + .3, .5 + (i % 3) * .25, s, -.15, false));
  [[16, 11.6, 1.2, 8], [4.2, 15.2, .9, 9], [20.2, 18.6, 1.1, 10]].forEach(([x, z, s, sd]) => k.rock(x, z, s, sd));
  const reedMat = std({ color: "#8a8a4a", roughness: 1 });
  const reeds = [];
  for (let i = 0; i < 70; i++) {
    const x = r() * W, z = shore(x) - .2 + r() * .9;
    if (Math.abs(x - dx) < 1.4) continue;
    const h = .7 + r() * .7;
    const m = new THREE.Mesh(new THREE.ConeGeometry(.025, h, 3), reedMat); m.position.set(x, h / 2 - .1, z); m.rotation.z = (r() - .5) * .3; k.add(m); reeds.push(m);
    if (r() > .7) { const tip = cyl(.04, .04, .18, std({ color: "#5a3a24" }), x, h - .1, z, 6); }
  }
  // 草坡上的花與小灌木
  for (let i = 0; i < 18; i++) { const x = 1 + r() * (W - 2), z = shore(x) + 2 + r() * (D - shore(x) - 3); if (Math.abs(x - 11.5) < 2) continue; k.plant(group, x, 0, z, 3 + (i % 2) * 0, .6 + r() * .5, 70 + i); }

  // 林邊（東側）：一排樹，小徑從中穿過
  const trees = [[22.5, 8.4, 6, 1], [25, 10.4, 7, 2], [19.6, 9, 5, 6], [26.5, 6, 6, 7], [25.4, 16.4, 4.2, 3]];
  [[22, 18.4], [24.6, 19.6], [20.4, 20.6]].forEach(([x, z], i) => k.plant(group, x, 0, z, 3, 2.2, 80 + i));
  trees.forEach(([x, z, h, s]) => k.tree(x, z, h, s, 110 + s * 3));
  // 南側入口附近的大樹與長凳
  k.tree(3, 18.6, 6.4, 21, 96);
  k.bench(16.4, 16.6, 2.2, -.2);
  // 路燈
  [[12, 19.6], [10.4, 13]].forEach(([x, z]) => {
    cyl(.07, .1, 2.6, M.iron, x, 1.3, z, 8);
    box(.3, .4, .3, std({ color: "#ffe2a8", emissive: "#ffb55a", emissiveIntensity: 1.2 }), x, 2.75, z).castShadow = false;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(.28, .25, 4), M.iron); cap.position.set(x, 3.08, z); cap.rotation.y = Math.PI / 4; k.add(cap);
    k.glowSprite(x, 2.75, z, 1.1, "#ffcf88"); k.collide(x, z, .4, .4);
  });

  // 對岸：暗色森林帶、山丘、城堡剪影
  const far = std({ color: "#33402e", roughness: 1, flatShading: true });
  for (let i = 0; i < 46; i++) {
    const x = -24 + i * 1.6 + r(), z = -9 - r() * 6, h = 4 + r() * 5;
    const c = new THREE.Mesh(new THREE.ConeGeometry(1.1 + r() * .6, h, 6), far); c.position.set(x, h / 2 - .3, z); group.add(c);
  }
  const hill = new THREE.Mesh(new THREE.SphereGeometry(30, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), std({ color: "#4a5238", roughness: 1, flatShading: true }));
  hill.scale.set(1.4, .32, .5); hill.position.set(-2, -1, -30); group.add(hill);
  const castle = std({ color: "#5a5260", roughness: 1 });
  const lit = std({ color: "#ffd28a", emissive: "#ffb050", emissiveIntensity: 1.6 });
  const cg = new THREE.Group(); cg.position.set(-4, 7, -28); group.add(cg);
  [[0, 0, 3, 18], [-7, 2, 2.2, 14], [6, 1, 2.6, 22], [12, 3, 1.8, 13], [-13, 3, 1.6, 11], [3, -3, 1.4, 26]].forEach(([x, z, rr, h]) => {
    const t = cyl(rr, rr * 1.1, h, castle, x, h / 2, z, 10, cg); t.castShadow = false;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(rr * 1.3, rr * 2.6, 10), std({ color: "#3a3850" })); roof.position.set(x, h + rr * 1.3, z); cg.add(roof);
    for (let i = 0; i < 4; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(.5, .9), lit); w.position.set(x + (i - 1.5) * .7, h * (.4 + .12 * i), z + rr + .02); cg.add(w); }
  });
  box(26, 8, 6, castle, 0, 4, 0, cg).castShadow = false;
  for (let i = 0; i < 9; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(.7, 1.2), lit); w.position.set(-11 + i * 2.8, 4 + (i % 2) * 1.5, 3.02); cg.add(w); }

  // 碰撞：湖水（棧橋除外）
  for (let x = -1; x <= W + 1; x += 1) {
    if (Math.abs(x - dx) < 1.1) continue;
    const zs = shore(x) - .5;
    k.collide(x, (zs - 10) / 2, 1, zs + 10);
  }
  k.collide(dx, dz1 - 5, 2, 10);
  k.collide(dx - 1.05, (dz1 + dz0) / 2, .3, dz0 - dz1); k.collide(dx + 1.05, (dz1 + dz0) / 2, .3, dz0 - dz1 - 1);

  k.hotspot("lake", "黑湖", "環境", dx, dz1 + 1, ["觀察", "休息"], "湖面反射著城堡的輪廓，水下好像有什麼巨大的影子緩緩游過。");
  k.hotspot("path", "林間小徑", "環境", 22, 13.4, ["查看", "觀察"], "小徑通往更遠的樹影之間。再往裡走就是不該獨自進去的地方了。");

  const sky = 0xeab88a;
  return finish(k, {
    id: "grounds", name: "黑湖湖畔", floorLabel: "校園外圍",
    size: { w: W, d: D },
    spawn: { x: 12.8, z: 19.4 },
    exits: [
      { to: "courtyard", x: 13, z: D - .2, w: 3, d: .6, label: "庭院" },
      { to: "greenhouse", x: W - .2, z: 13.6, w: .6, d: 2.4, label: "溫室" },
    ],
    lighting: { indoor: false, sunDir: [-1, .55, -.45], sunColor: 0xffbf80, sunIntensity: 3.6, ambient: 0x6a5a50, skyColor: 0xf6d6a8, hemiIntensity: 1.7, background: sky, fog: [sky, 35, 95] },
    npcSpots: { "中央": [12, 15.6], "湖岸": [5.4, 11], "草坡": [16, 18.6], "林邊小徑": [20.4, 13.4], "棧橋": [dx, 4] },
    view: { x: 12, z: 10, dist: 44 },
    update(dt, clock, t) {
      waterTex.offset.x = t * .006; waterTex.offset.y = t * .012;
      glints.forEach((g) => { g.material.opacity = .3 + .7 * Math.max(0, Math.sin(t * 1.3 + g.userData.ph)); });
      boat.rotation.z = Math.sin(t * .8) * .03; boat.position.y = -.25 + Math.sin(t * .9) * .03;
      reeds.forEach((m, i) => { m.rotation.x = Math.sin(t * 1.2 + i) * .06; });
    },
  });
}
