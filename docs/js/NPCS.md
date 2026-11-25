# NPC 系統（`docs/js/npcs.js`）

不 import three、不碰 DOM，可以直接在 Node 測試（`node --test tests/npcs.test.mjs`）。
預覽頁：`docs/npc-preview.html`，用真的紙片角色在簡易地板上跑日程、移動與對話。

## 角色
7 位原創 NPC，皆非原著角色。依模擬器規則用英文名稱呼，`zh` 為中文名。

| id | 名字 | look | 身分 | 主要出沒 |
|---|---|---|---|---|
| lenore | Lenore Ashford | bookish | 四年級，圖書館常客 | 圖書館、大廳 |
| tobias | Tobias Wynter | reader | 二年級，愛爭論 | 庭院、黑湖、走廊 |
| isla | Isla Fenwick | redhead | 一年級新生 | 走廊、圖書館、庭院、湖畔 |
| rafe | Rafe Okafor | tall | 七年級級長，夜間巡邏 | 庭院、湖畔、夜間走廊與圖書館 |
| hester | Hester Quill | librarian | 圖書館管理員 | 圖書館 |
| oswin | Professor Oswin Prescott | professor | 魔咒學教授 | 教室、圖書館、大廳 |
| maeve | Maeve Calloway | gardener | 溫室助教 | 溫室、湖畔 |

## 時間
- `clock = { day, minutes }`，minutes 為當天 0–1439。第 1 天是星期一，`days` 可用 `"weekday"`、`"weekend"` 或 `[1..7]`。
- 日程沒有涵蓋的時段，NPC 在宿舍或辦公室（不出現在任何場景）。

## 引擎要提供的 api
```js
new NpcDirector({
  spawnCharacter(look),   // 回傳 PaperCharacter，已加進場景
  removeCharacter(c),
  findPath(from, to),     // [{x,z}...]，空陣列或 null 時直線走
  sceneSpot(name),        // [x,z] 或 {x,z}；不存在回 null
  exitTo(sceneId),        // 通往該場景的出口座標；沒有相連出口回 null
  notify(evt),            // 可選：{ type: "arrive"|"leave"|"curfew", npcId, text }
  camYaw,                 // 可選，預設 0.62，用來把世界移動方向換成 face() 的畫面方向
})
```
- Director 只設定 `char.group.position`、`char.walking`、`char.face()`；**`char.update(dt, camYaw)` 由引擎每幀呼叫**。
- NPC 走到出口時不會觸發換場，引擎的出口偵測只對玩家。

## 每個場景需要的 `npcSpots`
缺少的名稱會退回 `中央`（並在 console 警告一次），所以每個場景至少要有 `中央`。
```
library:    中央 書桌前 靠窗書桌 書架間 索引櫃 借閱櫃台
hall:       中央 長桌東 長桌西 教師席 公告欄
courtyard:  中央 噴泉旁 拱廊 草地
corridor:   中央 樓梯口 肖像前 窗台
classroom:  中央 講台 前排座位 後排座位 練習區
greenhouse: 中央 盆栽架 工作台 澆水處
grounds:    中央 湖岸 草坡 林邊小徑
```
同一位置有多人時，後到的人會圍在旁邊約 0.8 公尺處。

## Director 方法
- `enterScene(sceneId, clock)`：清掉舊角色，在日程位置直接生成此刻在場的 NPC。
- `update(dt, clock)`：每幀呼叫。日程換段時 NPC 走到下一個位置；要去別的場景就走向對應出口後消失；新進場的 NPC 從上一段日程所在場景的出口走進來。
- `present()`：在場 NPC 的 `{ id, name, x, z, activity, leaving, walking, char }`，可用來做名牌或點擊判定。
- `where(npcId, clock?)`：此刻在哪個場景、做什麼。
- `talk(npcId, state)` 開啟對話；`talk(npcId, state, optionId)` 選擇選項。回傳 `{ speaker, text, options:[{id,label}], minutes, effects:{item?}, relationship }`。
  - `minutes`：這段互動花掉的遊戲時間，由引擎推進時鐘。
  - `effects.item`：幫忙後得到的物品，由引擎加進背包。
- `witness(eventId)`：玩家做了某件事時呼叫，只有在場且沒在離開途中的 NPC 會記住，之後閒聊會提起。目前台詞支援 `read-old-book`（讀了圖書館古書裡的紙條）。
- `relationship(npcId)`：`{ met, familiarity, trust, tier, tierLabel, flags }`。
- `serialize()` / `load(data)`：存進存檔的 `npc` 欄位。讀到舊存檔或壞資料時回到初始關係，不會丟錯。

## 互動規則
- 熟悉度、信任各 0–100，分成陌生、認識、朋友三層，不用單一好感度。
- 初次見面自我介紹；同一小時內搭話超過 4 次，對方會不耐煩並扣信任。
- 閒聊間隔兩小時以上才有完整的熟悉度成長。
- 上課等 `busy` 時段只會得到簡短回應。
- 不夠熟時問行程只會得到含糊回答；熟了才會說出下一段日程的時間和地點。
- 每段日程可以有一個每天限一次的幫忙選項，會加信任，部分會給物品。
- 級長夜間巡邏時（21:30 之後）和玩家在同一場景，會觸發一次宵禁事件，並記住這件事。
