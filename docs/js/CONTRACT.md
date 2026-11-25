# 2.5D 引擎模組介面（整合用）

整合分支：`feat/2-5d-engine`。引擎主程式 `docs/js/main.js` 與 `docs/index.html` 由引擎 thread 負責；其他模組照下列介面寫，引擎負責接上。

## Three.js
- 版本 r170，檔案 `docs/vendor/three.module.min.js`（自含，無其他相依）。
- `index.html` 以 importmap 對應 `"three"`，模組內直接 `import * as THREE from "three";`。
- 獨立預覽頁同樣加：`<script type="importmap">{"imports":{"three":"./vendor/three.module.min.js"}}</script>`（路徑依頁面位置調整）。

## 世界座標
- 1 單位 = 1 公尺，Y 朝上，地面 y = 0。
- 場景範圍 x ∈ [0, W]、z ∈ [0, D]。北牆在 z = 0，西牆在 x = 0。
- 鏡頭：透視 fov 30°，**方位角固定** yaw = 0.62 rad（從 +x、+z 方向看向西北），俯角約 45°，跟隨玩家。
  - 鏡頭位置 = 目標 + (sin(yaw)·h, height, cos(yaw)·h)。
  - 因此南牆、東牆不要蓋高（最多約 1.1 m 欄杆），否則會擋住畫面。
- 參考尺寸：角色約 1.75 m（Q 版），桌面 0.8 m，書架 3–3.5 m，牆高 6 m。

## 場景模組 `docs/js/scenes/<id>.js`
```js
export function build(ctx) // ctx = { THREE, tex /* textures.js */, kit /* kit.js 共用家具 */ }
  return {
    id, name, floorLabel,
    size: { w, d },
    group,                       // THREE.Group，地面 y=0
    spawn: { x, z },
    colliders: [{ x, z, w, d }], // 地面 AABB，(x,z) 為中心
    hotspots: [{ id, name, kind: "人物"|"物件"|"環境", x, z, actions: ["閱讀","調查"], desc }],
    exits: [{ to, x, z, w, d, label }],  // 走進範圍即切換場景
    lighting: { indoor: true, sunDir: [x,y,z], sunColor: 0xffc890, sunIntensity: 2.4, ambient: 0x6a4a36 },
    npcSpots: { "書桌前": [x, z] },      // 給 NPC 日程用的具名位置
    update(dt, clock) {}                 // 可選：動畫（移動樓梯、水面等）
  };
```
- id 固定：library, hall, courtyard, corridor, classroom, greenhouse, grounds。
- 室內場景可在牆高處放 `colorWrite:false` 的天花板並 `castShadow`，讓陽光只從窗戶照進來。
- 共用貼圖用 `docs/js/textures.js`（全部 canvas 程序化繪製，不引用外部圖片）。

## 紙片角色 `docs/js/sprites.js`
- `new PaperCharacter(lookKey)`：`.group`（放到場景，腳底在原點）、`.walking`、`.face(screenDX, screenDY)`、`.update(dt, camYaw)`、`.addXray()`。
- 單張雙面平面：背面由 GPU 自然鏡像，不另畫背面；角度以固定角速度連續旋轉，轉向時經過 90° 細線。
- 外觀在 `LOOKS`，8 格圖集（0–1 待機、2–7 行走）。

## NPC `docs/js/npcs.js`
```js
export const NPCS = [{ id, name, look, role, schedule: [{ from: "08:00", to: "12:00", scene, spot, activity }], talk(state, ctx) }];
export class NpcDirector {
  constructor(api)   // api: { spawnCharacter(look), removeCharacter(c), findPath(from,to), sceneSpot(name), exitTo(sceneId) }
  enterScene(sceneId, clock)
  update(dt, clock)  // clock = { day, minutes }
  serialize() / load(data)
}
```
