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
- 外觀在 `LOOKS`，6×3 格圖集（0–3 待機呼吸與眨眼、4–11 行走 8 格、12–17 互動舉杖）。
- 行走步態依 `.group.position` 的實際位移推進（不滑步）；`.walking = true` 但沒移動時以 1.6 m/s 推算（原地踏步）。
- 新增：`.setState("idle"|"walk"|"interact")`、`.interact(duration?) → Promise`（播一次互動動畫後回到原狀態）、`.state`、`.paperAngle`（度）、`.turnSpeed`（預設 720°/s）、`.freeze({angle, frame, bend})`（展示／除錯用，`null` 解除）。
- 外部立繪：在 `SPRITES` 登記或呼叫 `registerSprite(look, { src })`，同名外觀改用立繪並以切件方式做動畫；交付規格見 `docs/art/CHARACTER-SPRITES.md`。
- 側向 90° 時會顯示白色紙緣（`.edge`），轉身與行走時紙張會微彎。
- 示範與驗收頁：`docs/character-lab.html`（`?angles=1` 角度對照、`?yaw=90` 固定角度、`?frame=n` 固定畫格、`?look=professor`、`?zoom=3`、`?ui=0`）。

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
