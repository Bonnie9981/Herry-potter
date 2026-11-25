// 魔咒學教室：北牆黑板與講台、三排雙人課桌、西窗夕照、東側練習區（漂浮羽毛與軟墊）。
import * as THREE from "three";
import * as T from "../textures.js";
import { createKit, finish, rep, rng, tex } from "./_props.js";

export function build() {
  const W = 18, D = 14, H = 6.5;
  const k = createKit(7);
  const { M, box, cyl, group, std } = k;
  const r = rng(9);

  k.floor(W, D, std({ map: rep(T.wood("light"), W / 3, D / 3), roughness: .7 }));
  const north = k.wall(W, H, W / 2, -.25, 0);
  const wins = [3, 7, 11];
  const west = k.windowWall(D, H, -.25, D / 2, Math.PI / 2, wins.map((z) => ({ c: z - D / 2, w: 1.5, sill: 1.3, top: 1.3 + 4 - 1.5 * .55 })));
  wins.forEach((z) => { k.gothicWindow(west, z - D / 2, 1.3, 1.5, 4); k.lightShaft(.4, 4.2, z, 1.3, 7, [1, -.6, .3], .2); });
  k.ceiling(W, D, H + .1);
  // 護牆板（下半部木飾）
  const panel = std({ map: rep(T.wood("dark"), 4, .4) });
  box(W, 1.1, .08, panel, W / 2, .55, .05);
  box(.08, 1.1, D, panel, .05, .55, D / 2).visible = true;

  // 講台與黑板
  const stage = std({ map: rep(T.wood("dark"), 3, 1) });
  box(9, .3, 3, stage, 8, .15, 1.6); box(9, .05, .1, M.brass, 8, .3, 3.1);
  k.collide(8, 1.5, 9, 3.2);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), std({ map: tex.charmsBoard(), roughness: .95 }));
  board.position.set(8, 2.6, .07); group.add(board);
  box(6.2, .08, .2, M.darkWood, 8, 1.06, .12);
  [6.6, 7, 9.4].forEach((x) => box(.08, .03, .03, M.paper, x, 1.12, .15));
  // 講桌
  const desk = new THREE.Group(); desk.position.set(8, .3, 2.6); group.add(desk);
  box(2.4, .9, .9, M.darkWood, 0, .45, 0, desk); box(2.6, .08, 1.05, M.darkWood, 0, .94, 0, desk);
  box(2.2, .6, .05, std({ color: "#5a3a5a", roughness: 1 }), 0, .55, .48, desk);
  k.bookStack(desk, -.8, .98, 0, 4, rng(3)); k.candelabra(.85, .98, -.1, true, desk);
  const quill = box(.02, .02, .35, std({ color: "#f2ece0" }), .2, 1, .1, desk); quill.rotation.set(.3, .6, 0);
  // 黑板旁：書架與原創星象儀
  k.bookshelf(15.2, .5, 2.4, 3.2, 0, 11);
  k.bookshelf(1.8, .5, 2.4, 3.2, 0, 12);
  k.globe(13.2, .3, 2);

  // 課桌：三排 × 兩列，每桌兩張凳
  const deskSpots = [];
  for (let row = 0; row < 3; row++) for (let col = 0; col < 2; col++) {
    const x = 4 + col * 4.4, z = 6 + row * 2.4;
    k.table(x, z, 2.6, .8, .78, M.wood);
    [-.6, .6].forEach((dx) => { cyl(.2, .18, .05, M.darkWood, x + dx, .46, z + .75, 10); cyl(.04, .04, .44, M.darkWood, x + dx, .22, z + .75, 6); });
    k.collide(x, z + .75, 2, .5);
    k.bookStack(group, x - .7, .8, z - .05, 2, rng(row * 3 + col + 1));
    if ((row + col) % 2 === 0) { const p = new THREE.Mesh(new THREE.PlaneGeometry(.4, .3), M.paper); p.rotation.set(-Math.PI / 2, 0, r() - .5); p.position.set(x + .5, .805, z); group.add(p); }
    // 每張桌上一根練習用羽毛
    const f = new THREE.Mesh(new THREE.ConeGeometry(.04, .32, 4), std({ color: "#f6efe0", roughness: .8 })); f.rotation.z = Math.PI / 2; f.position.set(x + .1, .83, z + .15); k.add(f);
    deskSpots.push([x, z + 1.45]);
  }

  // 東側練習區：地毯、軟墊、漂浮羽毛與書本
  k.carpet(14.2, 9.4, 4.2, 5.6, "navy");
  const cushion = std({ color: "#8a3a3a", roughness: 1 });
  [[13, 8], [15.4, 8.4], [13.6, 10.8], [15.6, 11]].forEach(([x, z], i) => { const c = cyl(.45, .48, .22, i % 2 ? std({ color: "#3a4e7a", roughness: 1 }) : cushion, x, .11, z, 14); c.scale.z = .8; });
  const tbl = k.table(14.4, 6, 2, .8, .8, M.darkWood);
  k.bookStack(group, 13.8, .8, 6, 3, rng(8));
  const floaters = [];
  for (let i = 0; i < 7; i++) {
    const f = i < 5 ? new THREE.Mesh(new THREE.ConeGeometry(.05, .4, 4), std({ color: "#f6efe0" })) : new THREE.Mesh(new THREE.BoxGeometry(.3, .06, .22), std({ color: i === 5 ? "#6b2a2a" : "#2e3e5c" }));
    f.position.set(13 + r() * 2.8, 1.2 + r() * 1.2, 7.8 + r() * 3.4); f.castShadow = true; group.add(f);
    f.userData = { y: f.position.y, ph: r() * 6 };
    floaters.push(f);
    k.glowSprite(0, 0, 0, .35, "#cfe0ff", f);
  }
  k.chest(16.8, 12.6, -Math.PI / 2);
  k.barrel(16.9, 4.8);

  // 吊燈
  k.chandelier(6.2, 4.8, 7.6, .8, 8, 6);
  k.chandelier(14.2, 4.8, 9.2, .7, 6, 0);
  k.sconce(north, 3.6 - W / 2, 3);

  // 南、東低欄與出口
  k.balustrade(4.2, D - .1, 8.4); k.balustrade(W - 3, D - .1, 6);
  k.balustrade(W - .1, D / 2, D, Math.PI / 2);
  k.collide(4.2, D - .1, 8.4, .4); k.collide(W - 3, D - .1, 6, .4); k.collide(W - .1, D / 2, .4, D);
  k.collide(W / 2, -.3, W, .6); k.collide(-.3, D / 2, .6, D);

  k.hotspot("board", "黑板上的咒語", "物件", 6.4, 3.6, ["閱讀", "抄寫"], "黑板上留著上一堂課的筆記：手腕轉半圈，再輕彈。");
  k.hotspot("tools", "練習用器具", "物件", 14.4, 7, ["查看", "練習"], "羽毛和舊課本整齊地放在講桌旁，有幾根羽毛還在半空中輕輕晃。");

  return finish(k, {
    id: "classroom", name: "魔咒學教室", floorLabel: "三樓",
    size: { w: W, d: D },
    spawn: { x: 10.5, z: 12.8 },
    exits: [{ to: "corridor", x: 10.5, z: D - .2, w: 3, d: .6, label: "移動樓梯廊" }],
    lighting: { indoor: true, sunDir: [-1, .6, -.3], sunColor: 0xffc58a, sunIntensity: 6, ambient: 0x4a3226, skyColor: 0xecca9e, hemiIntensity: 1.2, background: 0x1a130e },
    npcSpots: { "中央": [10.4, 9.8], "講台": [10.6, 3.6], "前排座位": deskSpots[0], "後排座位": deskSpots[5], "練習區": [14.4, 9.6] },
    view: { x: 9, z: 7, dist: 32 },
    update(dt, clock, t) {
      floaters.forEach((f) => { f.position.y = f.userData.y + Math.sin(t * 1.2 + f.userData.ph) * .18; f.rotation.y = t * .5 + f.userData.ph; f.rotation.x = Math.sin(t + f.userData.ph) * .3; });
    },
  });
}
