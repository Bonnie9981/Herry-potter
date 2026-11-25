// 大廳：四張學院長桌、教師席高台、西側尖拱窗夕照、鐵環吊燈。
// 原創設計：旗幟用自訂星／月／葉／盾徽記，不使用官方學院紋章。
import * as THREE from "three";
import * as T from "../textures.js";
import { createKit, finish, rep, rng, tex } from "./_props.js";

export function build() {
  const W = 24, D = 18, H = 8.5;
  const k = createKit(2);
  const { M, box, cyl, group } = k;
  const r = rng(42);

  // 地板與牆
  k.floor(W, D, k.std({ map: rep(T.stoneFloor("warm"), W / 4, D / 4) }));
  const north = k.wall(W, H, W / 2, -.25, 0);
  const winZ = [3.2, 7.4, 11.6, 15.6], winW = 1.9, winH = 5.2, sill = 2.4;
  // 窗洞高度到尖拱起拱點，尖拱部分是貼在牆面的彩繪玻璃
  const west = k.windowWall(D, H, -.25, D / 2, Math.PI / 2, winZ.map((z) => ({ c: z - D / 2, w: winW, sill, top: sill + winH - winW * .55 })));
  k.ceiling(W, D, H + .1);

  // 西牆四扇高窗 + 光束（夕陽從西方斜射入室）
  winZ.forEach((z, i) => {
    k.gothicWindow(west, z - D / 2, sill, winW, winH);
    k.lightShaft(.4, 6.6, z, 1.7, 9, [1, -.62, .3], .2);
    k.sconce(west, z - D / 2 + 2.1, 3.2, .3, i % 2 === 0);
  });

  // 北側教師席高台
  const daisD = 3.6, daisW = 19.6, daisX = .4 + daisW / 2;
  box(daisW, .45, daisD, k.std({ map: rep(T.stoneFloor("grey"), daisW / 4, 1) }), daisX, .225, daisD / 2 + .2);
  box(daisW, .08, .14, M.trim, daisX, .45, daisD + .2);
  k.stairs(W / 2, daisD + .2 + .75, 4, 3, .15, .3, 0);
  k.collide(daisX, (daisD + 1.1) / 2, daisW, daisD + 1.1);
  // 教師長桌與高背椅
  const tt = new THREE.Group(); tt.position.set(W / 2, .45, 1.9); group.add(tt);
  box(13, .1, 1.1, M.darkWood, 0, .78, 0, tt);
  box(13, .7, .08, M.darkWood, 0, .38, .5, tt);
  const cloth = k.std({ color: "#7a2630", roughness: 1 });
  box(13.05, .3, .02, cloth, 0, .62, .57, tt);
  for (let x = -6; x <= 6; x += 1.5) {
    const ch = new THREE.Group(); ch.position.set(x, 0, -.75); tt.add(ch);
    box(.6, .08, .55, M.darkWood, 0, .48, 0, ch);
    box(.6, 1.5, .08, M.darkWood, 0, 1.2, -.25, ch);
    box(.66, .1, .1, M.brass, 0, 1.95, -.25, ch);
    [-.25, .25].forEach((dx) => box(.06, .48, .06, M.darkWood, dx, .24, .2, ch));
    if (x === 0) { box(.9, 2.1, .1, M.darkWood, 0, 1.4, -.28, ch); box(.95, .12, .12, M.brass, 0, 2.5, -.28, ch); }
  }
  for (let x = -5.5; x <= 5.5; x += 2.75) k.candelabra(x, .83, 0, x === 0, tt);
  for (let x = -6; x <= 6; x += 1.5) { cyl(.16, .14, .02, M.brass, x, .84, .2, 14, tt); cyl(.04, .03, .14, M.brass, x + .25, .9, .05, 8, tt); }

  // 北牆：中央大圓窗 + 四面原創學院旗
  const rose = new THREE.Group(); rose.position.set(0, 5.6, .27); north.add(rose);
  const roseGlass = new THREE.Mesh(new THREE.CircleGeometry(1.5, 40), M.glass); rose.add(roseGlass);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55, .14, 8, 40), M.trim); rose.add(ring);
  for (let i = 0; i < 8; i++) { const b = box(.06, 3, .06, M.iron, 0, 0, .04, rose); b.rotation.z = i * Math.PI / 8; }
  const hub = new THREE.Mesh(new THREE.CircleGeometry(.35, 20), M.brass); hub.position.z = .06; rose.add(hub);
  k.lightShaft(W / 2, 5.6, .5, 2.2, 7, [0, -.7, 1], .14);
  [[-6.6, 355, "star"], [-3.4, 222, "moon"], [3.4, 140, "leaf"], [6.6, 42, "shield"]].forEach(([x, hue, em]) => k.banner(north, x, 4.6, hue, em, 1.3, 3.4, .32));
  k.painting(north, -9.8, 2.8, 5, .9, 1.2);

  // 北牆東側：通往走廊的拱門 + 門邊肖像
  const doorX = W - 1.6;
  const door = new THREE.Group(); door.position.set(doorX - W / 2, 0, .26); north.add(door);
  box(1.8, 2.9, .08, k.std({ color: "#1c130d" }), 0, 1.45, 0, door);
  const dshape = new THREE.Shape(); dshape.absarc(0, 0, .9, 0, Math.PI, false);
  const dtop = new THREE.Mesh(new THREE.ShapeGeometry(dshape), k.std({ color: "#1c130d" })); dtop.position.set(0, 2.9, 0); door.add(dtop);
  const leaf = k.std({ map: rep(T.wood("dark"), 1, 2) });
  box(.78, 2.8, .1, leaf, -.42, 1.4, .1, door); box(.78, 2.8, .1, leaf, .42, 1.4, .1, door);
  [-.1, .1].forEach((dx) => { const h = new THREE.Mesh(new THREE.TorusGeometry(.08, .015, 6, 12), M.brass); h.position.set(dx, 1.35, .17); door.add(h); });
  for (let i = 0; i < 9; i++) { const a = i / 8 * Math.PI; box(.32, .22, .2, M.trim, Math.cos(a) * 1.05, 2.9 + Math.sin(a) * 1.05, .02, door).rotation.z = a - Math.PI / 2; }
  k.painting(north, doorX - W / 2 - 2.1, 2.3, 7, .8, 1.05);

  // 四張學院長桌（沿 z 方向），兩側長凳，桌上餐具與燭台
  const plates = k.std({ color: "#d9cdb4", roughness: .5 });
  [4.6, 9.4, 14.2, 19].forEach((x, ti) => {
    const z0 = 5.4, len = 10.8, zc = z0 + len / 2;
    const tg = k.table(x, zc, 1.3, len, .8, M.wood, 0);
    k.bench(x - 1.05, zc, len - .4, Math.PI / 2);
    k.bench(x + 1.05, zc, len - .4, Math.PI / 2);
    // 桌旗（學院色）
    const runner = new THREE.Mesh(new THREE.PlaneGeometry(.45, len - .2), k.std({ color: new THREE.Color().setHSL([355, 222, 140, 42][ti] / 360, .45, .28), roughness: 1 }));
    runner.rotation.x = -Math.PI / 2; runner.position.set(x, .805, zc); runner.receiveShadow = true; group.add(runner);
    for (let z = z0 + .7; z < z0 + len - .4; z += .9) {
      [-.42, .42].forEach((dx) => {
        cyl(.15, .13, .02, plates, x + dx, .81, z, 14);
        if (r() > .35) cyl(.035, .03, .16, M.brass, x + dx * .6, .89, z + .25, 8);
      });
      if (r() > .6) cyl(.12, .1, .1, M.brass, x, .86, z + .45, 10);
    }
    for (let z = z0 + 1.6; z < z0 + len; z += 3.6) k.candelabra(x, .8, z, false);
    k.chandelier(x, 5.2, zc - 1.5, 1, 10, ti % 2 === 0 ? 7 : 0);
  });

  // 中央走道地毯（通往高台）
  k.carpet(11.8, 10.4, 1.6, 11.2, "crimson");

  // 西南角：學院公告欄（可互動）
  const nb = new THREE.Group(); nb.position.set(2.2, 0, 13.6); nb.rotation.y = .5; group.add(nb);
  box(.12, 2.4, .12, M.darkWood, -.95, 1.2, 0, nb); box(.12, 2.4, .12, M.darkWood, .95, 1.2, 0, nb);
  box(2.1, 1.4, .08, M.darkWood, 0, 1.55, 0, nb);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.25), k.std({ map: tex.notice() })); board.position.set(0, 1.55, .05); nb.add(board);
  const roof = box(2.3, .1, .45, M.darkWood, 0, 2.35, .05, nb); roof.rotation.x = .3;
  k.collide(2.2, 13.6, 2, .8);

  // 南側、東側低欄杆（鏡頭方向不遮擋），留出入口
  k.balustrade(4.5, D - .15, 9, 0); k.balustrade(W - 4.5, D - .15, 9, 0);
  k.balustrade(W - .15, 8.6, 9.8, Math.PI / 2);
  [9, W - 9].forEach((x) => { box(.6, 1.5, .6, M.trim, x, .75, D - .15); k.candle(x, 1.5, D - .15, group, false, 1.6); });
  k.collide(4.5, D - .15, 9, .4); k.collide(W - 4.5, D - .15, 9, .4); k.collide(W - .15, 8.6, .4, 9.8);
  // 角落裝飾：盔甲架改為原創銅製渾天儀、木箱
  k.globe(W - 1.2, 0, 14.6); k.collide(W - 1.2, 14.6, .6, .6);
  box(.5, .9, .5, M.trim, W - 1.2, .45, 4.6); k.globe(W - 1.2, .9, 4.6); k.collide(W - 1.2, 4.6, .7, .7);
  k.chest(1.2, 4.6, Math.PI / 2);

  // 邊界
  k.collide(W / 2, -.3, W, .6); k.collide(-.3, D / 2, .6, D);

  // 互動熱點（id 對應 game.js things.hall）
  k.hotspot("notice", "學院公告欄", "物件", 2.6, 14.4, ["閱讀", "調查"], "新公告覆蓋了幾張舊通知，最上面那張的墨跡還沒乾。");
  k.hotspot("portrait", "門邊肖像", "人物", doorX - 2.1, 4.6, ["交談", "觀察"], "肖像裡的人正打量著來往學生，似乎想說什麼。");
  k.hotspot("table", "學院長桌", "物件", 9.4, 13, ["查看", "坐下"], "桌上還有沒收拾完的餐具，銅杯還溫溫的。");

  return finish(k, {
    id: "hall", name: "大廳", floorLabel: "一樓",
    size: { w: W, d: D },
    spawn: { x: 11.8, z: 16.4 },
    exits: [
      { to: "corridor", x: doorX, z: .9, w: 1.8, d: 1, label: "移動樓梯廊" },
      { to: "courtyard", x: 11.8, z: D - .2, w: 5, d: .6, label: "庭院" },
    ],
    lighting: { indoor: true, sunDir: [-1, .62, -.3], sunColor: 0xffc58a, sunIntensity: 6.5, ambient: 0x4a3226, skyColor: 0xe8c79c, hemiIntensity: 1.05, background: 0x1a130e },
    npcSpots: { "中央": [11.8, 8.4], "長桌西": [2.8, 9], "長桌東": [20.6, 11.5], "教師席": [11.8, 5.3], "公告欄": [1.4, 15.2], "門邊": [doorX - .4, 5] },
    view: { x: 12, z: 9, dist: 40 },
  });
}
