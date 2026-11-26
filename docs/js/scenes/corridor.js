// 移動樓梯廊：南側平台可走動，北側是深井，懸空石階與平台貼著掛滿肖像的高牆；其中一段樓梯會緩慢轉向。
import * as THREE from "three";
import * as T from "../textures.js";
import { createKit, finish, rep, rng } from "./_props.js";

export function build() {
  const W = 18, D = 16, TOP = 15, PIT = -8, EDGE = 8.4;
  const k = createKit(5);
  const { M, box, group, std } = k;
  const r = rng(5);

  // 可走平台（南半部）與深井
  k.floor(W, D - EDGE, std({ map: rep(T.stoneFloor("warm"), W / 4, (D - EDGE) / 4) }), W / 2, (D + EDGE) / 2);
  box(W, 1.2, .5, std({ map: rep(T.stoneWall("warm"), W / 4, .3) }), W / 2, -.6, EDGE + .25);
  k.floor(W, EDGE, std({ color: "#1d1611", roughness: 1 }), W / 2, EDGE / 2, PIT);
  // 深井內側的石牆（平台下方的立面）
  const under = std({ map: rep(T.stoneWall("cool"), W / 4, 2), color: "#8a7a6a" });
  const uw = box(W, -PIT, .4, under, W / 2, PIT / 2, EDGE + .2); uw.castShadow = false;
  k.balustrade(3.2, EDGE + .1, 2.6); k.balustrade(11.6, EDGE + .1, 12.8);
  k.collide(W / 2, EDGE / 2, W, EDGE);

  // 高牆（向下延伸到井底）
  const wallH = TOP - PIT;
  const north = k.wall(W, wallH, W / 2, -.25, 0); north.position.y = PIT;
  const west = k.windowWall(D, wallH, -.25, D / 2, Math.PI / 2, [{ c: 12 - D / 2, w: 1.6, sill: -PIT + 1, top: -PIT + 4.2 }]); west.position.y = PIT;
  k.gothicWindow(west, 12 - D / 2, -PIT + 1, 1.6, 4.8);
  k.lightShaft(.4, 4.2, 12, 1.4, 6, [1, -.55, .2], .22);
  k.ceiling(W, D, TOP + .1);
  // 窗台座椅
  box(1.8, .5, .7, M.trim, .6, .25, 12);
  k.collide(.6, 12, .8, 1.8);

  // 牆上滿滿的肖像（原創畫作，大小錯落）
  const frames = [];
  for (let i = 0; i < 26; i++) {
    const onNorth = i < 17;
    const w = .7 + r() * .7, h = w * (1.15 + r() * .35);
    const along = onNorth ? 1 + r() * (W - 2) : EDGE + .4 + r() * 2.6 - D / 2;
    const y = (onNorth ? 1.2 + r() * 12 : 1.6 + r() * 2.2) - PIT;
    frames.push([onNorth, along, y, w, h]);
  }
  frames.forEach(([n, a, y, w, h], i) => k.painting(n ? north : west, n ? a - W / 2 : a, y, i + 3, w, h, .3));

  // 懸空平台（貼北牆）與連接樓梯
  const ledgeMat = std({ map: rep(T.stoneFloor("grey"), 1, 1) });
  function ledge(x0, x1, z1, y) {
    const w = x1 - x0;
    box(w, .5, z1, ledgeMat, (x0 + x1) / 2, y - .25, z1 / 2);
    // 托架
    for (let x = x0 + .4; x < x1; x += 1.4) { const b = box(.3, 1.2, .3, M.trim, x, y - 1, .3); b.scale.set(1, 1, 1); }
    k.balustrade((x0 + x1) / 2, z1 - .1, w, 0, .9, group, y);
  }
  ledge(1.2, 8, 4, 3);
  ledge(13.2, 17.6, 3.4, 6.5);
  ledge(1.2, 8.4, 3, 10);
  ledge(6.2, 12.4, 2.6, 13);
  // 第一段：平台 → 3 m
  k.stairs(5, 9.6, 2, 15, .2, .4, 0, ledgeMat);
  // 底部延伸的樑托，讓懸空樓梯看起來有支撐
  box(.5, 6, .5, M.trim, 5, 0, 6.6).position.y = -2.6;
  // 第二段：3 m → 6.5 m（朝東上升）
  k.stairs(8.2, 1.6, 1.8, 13, .27, .39, -Math.PI / 2, ledgeMat, 3);
  // 第三段：會轉向的樓梯，從 6.5 m 平台向西延伸到 10 m 平台
  const pivot = new THREE.Group(); pivot.position.set(13.2, 6.5, 1.8); group.add(pivot);
  k.stairs(0, 0, 1.8, 13, .27, .39, Math.PI / 2, ledgeMat, 0, pivot);
  box(.6, .6, .6, M.brass, 0, -.3, 0, pivot);
  // 第四段：10 m → 13 m
  k.stairs(2.2, 1.2, 1.4, 11, .27, .4, -Math.PI / 2, ledgeMat, 10);

  // 火把與燭台
  [[3, 3.6], [15, 7.4], [5, 11.2], [13, 14.2]].forEach(([x, y], i) => k.sconce(north, x - W / 2, y - PIT, .3, i < 3));
  k.sconce(west, 14.6 - D / 2, 2.6 - PIT);
  k.chandelier(9, 9, 6, 1.2, 10, 8);

  // 深井裡漂浮的燈籠：緩慢上下，標出井的深度
  const lanterns = [];
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group(); g.position.set(2 + r() * 14, PIT + 2 + r() * 12, 1.5 + r() * 6); group.add(g);
    box(.22, .3, .22, std({ color: "#ffe0a0", emissive: "#ffa040", emissiveIntensity: 1.4 }), 0, 0, 0, g).castShadow = false;
    box(.28, .05, .28, M.iron, 0, .17, 0, g); box(.28, .05, .28, M.iron, 0, -.17, 0, g);
    k.glowSprite(0, 0, 0, 1, "#ffc070", g);
    g.userData = { y: g.position.y, ph: r() * 6 };
    lanterns.push(g);
  }
  const pl = new THREE.PointLight("#ffa860", 10, 16, 1.2); pl.position.set(9, PIT + 3, 4); group.add(pl);

  // 平台陳設：盆栽、長凳、地毯
  k.carpet(11, 12.2, 2, 6, "crimson", Math.PI / 2);
  k.bench(9.6, D - .8, 2.4);
  k.pot(2.2, 0, D - 1, .3); k.plant(group, 2.2, .42, D - 1, 2, 1.2, 5); k.collide(2.2, D - 1, .7, .7);
  k.pot(16.2, 0, 9.4, .3, "#6a4a3a"); k.plant(group, 16.2, .42, 9.4, 0, 1.2, 6); k.collide(16.2, 9.4, .7, .7);
  // 南、東低欄
  k.balustrade(4.6, D - .1, 9.2); k.balustrade(W - 2.5, D - .1, 5);
  k.balustrade(W - .1, 10.4, 4, Math.PI / 2);
  k.collide(4.6, D - .1, 9.2, .4); k.collide(W - 2.5, D - .1, 5, .4); k.collide(W - .1, 10.4, .4, 4);
  k.collide(-.3, D / 2, .6, D);

  k.hotspot("stairs", "移動樓梯", "物件", 10.4, EDGE + .9, ["等待", "觀察"], "上方那段階梯正在緩慢轉向，石頭摩擦發出低沉的聲音。");
  k.hotspot("portrait2", "會說話的肖像", "人物", 1.2, 10.4, ["交談", "詢問路線"], "畫框裡的人清了清喉嚨，似乎知道一條捷徑。");

  return finish(k, {
    id: "corridor", name: "移動樓梯廊", floorLabel: "二至四樓",
    size: { w: W, d: D },
    spawn: { x: 9, z: 13.8 },
    exits: [
      { to: "hall", x: 11.6, z: D - .2, w: 3.6, d: .6, label: "大廳" },
      { to: "library", x: 5, z: 10, w: 2, d: .8, label: "圖書館（上樓）" },
      { to: "classroom", x: W - .2, z: 14.2, w: .6, d: 2.8, label: "魔咒學教室" },
    ],
    lighting: { indoor: true, sunDir: [-1, .5, -.25], sunColor: 0xffc58a, sunIntensity: 6, ambient: 0x5a3e2c, skyColor: 0xf0cfa4, hemiIntensity: 1.5, background: 0x15100c },
    npcSpots: { "中央": [10, 12.4], "樓梯口": [6.6, 10.4], "肖像前": [1.6, 10.6], "窗台": [1.6, 13.4] },
    view: { x: 9, z: 9, dist: 40 },
    update(dt, clock, t) {
      lanterns.forEach((g) => { g.position.y = g.userData.y + Math.sin(t * .5 + g.userData.ph) * .4; g.rotation.y = t * .2 + g.userData.ph; });
      // 每約 25 秒擺動一次，停在兩端時稍作停留
      const s = Math.max(-1, Math.min(1, Math.sin(t * .25) * 1.6));
      pivot.rotation.y = .6 * (1 - s);
    },
  });
}
