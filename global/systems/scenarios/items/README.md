# 互動物件可重播情境（P2-07）

這些 JSON 檔是 [道具與環境物件互動](../../item-and-world-interaction.md) 規格的可重播測試案例：系統示例，不新增正典事實。由 `scripts/item_scenarios.py` 決定性重播（純 Python、無 AI/API、無隨機），並由 `scripts/validate_world.py` 與 `tests/test_item_scenarios.py` 在 CI 中執行。

| 檔案 | 物件 | 重點 |
|---|---|---|
| `door-lock.json` | 門鎖 | 鑰匙／Alohomora 兩種解鎖路徑、有防護的門、開著不能上鎖 |
| `library-book.json` | 書籍 | 限制區權限、翻閱 → 做筆記、羊皮紙消耗、借出／歸還位置、受潮部分成功 |
| `cauldron.json` | 坩堝 | 沒有火源不能加熱、材料扣除、熬煮 30 分鐘後成品／失敗批次、清潔 |
| `letter.json` | 信件 | 先封口才能寄、貓頭鷹屋寄送、運送中無法接觸、送達、已拆閱不能再拆 |
| `pet.json` | 寵物 | 太餓不配合、不吃不合適食物、餵食扣除零食、飢餓隨時間回升 |

## 格式
- `start_time`：情境開始時間（`YYYY-MM-DD HH:MM`）。
- `actors`：角色 ID → 位置與已知咒語（`knows`）。
- `objects`：物件 ID → 名稱、類型、持有人（`holder`）**或**位置（`location`）、`quantity`（消耗品）、`state` 與可互動動詞。
- `verbs`：顯示名稱 → `canonical`（必須是規格「三、通用互動動詞」或「八、互動範例」中的動詞）、`requires`（前置條件，每條需有失敗理由）、`branches`（依序比對的結果分支：`success`／`partial`／`failure`，含耗時 `minutes` 與 `effects`）。
- `verb_templates` + `verbs_from`：多個同類物件共用動詞定義。
- `steps`：依回合遞增的步驟（互動、`move_to` 移動、`wait` 等待），每步以 `expect` 宣告結果、理由、時間、物件與角色狀態。

條件：`state`（搭配 `equals`／`in`／`lt`／`lte`／`gt`／`gte`，可用 `object` 指定其他物件）、`actor_knows`、`actor_holds`、`actor_at`、`holder`、`any`／`all`／`not`。
效果：`set`、`increment`、`take`、`give`、`place`、`consume`、`schedule`（延遲效果）、`event`。`$actor` 代表行動者，`$here` 代表行動者所在位置。

## 引擎規則
1. 目標必須可接觸（在行動者手上或同一位置），否則「目標不在可接觸範圍」。
2. 第一個不成立的前置條件會擋下嘗試（`blocked`），狀態不變。
3. 符合的分支先推進時間，再套用效果；延遲效果在時間到達時依序觸發。
4. 每步後檢查不變量：物件恰有一個持有人或一個位置、數量不為負、時間不倒流。
5. 每個情境至少跨兩個回合，並至少包含一個前置條件失敗案例。

執行：`python scripts/item_scenarios.py -v`
