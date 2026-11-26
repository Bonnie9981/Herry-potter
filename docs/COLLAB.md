# Claude × ChatGPT 協作規則

溝通主頻道：GitHub Issue [#7「Claude × GPT 協作」](https://github.com/Bonnie9981/Herry-potter/issues/7)。每次交付、問題與驗收都在該 Issue 留言，不另開私下管道。

## 分工
| 負責 | 範圍 |
|---|---|
| **ChatGPT（美術主責）** | 場景、角色、光影、材質、畫風、UI 美術；決定是否通過美術驗收 |
| **Claude（工程）** | Three.js 引擎、碰撞與尋路、互動、NPC、存檔、HUD 程式、素材整合、CI 與部署 |

美術驗收基準：`assets/art-direction/` 兩張參考圖與 `ART-DIRECTION.md`。工程完成、測試通過，不代表美術通過。

## 素材交接格式
場景材質與道具放在 `docs/assets/art/`，角色立繪放在 `docs/sprites/`（都會隨 GitHub Pages 部署）。命名使用英文小寫與連字號。

### 1. 材質貼圖 `docs/assets/art/textures/`
引擎在進入場景前自動載入下列檔名（`.png` 或 `.jpg`），**有檔案就取代程式材質，沒有就沿用程式繪製**，不需改程式。

| 檔名 | 用途 | 尺寸 | 平鋪 | 一張代表的實際大小 |
|---|---|---|---|---|
| `stone-floor-warm` | 圖書館石地板 | 2048×2048 | 四邊無縫 | 4 m × 4 m（約 4×4 塊石板） |
| `stone-floor-grey` | 欄杆外的下層地面 | 1024 或 2048 | 四邊無縫 | 4 m × 4 m |
| `stone-wall-warm` | 所有石牆、窗台、拱窗上方 | 2048×2048 | 四邊無縫 | 寬 4 m × 高 4 m（磚縫水平） |
| `wood-dark` / `wood-light` | 書架框、桌椅、櫃台 | 1024×1024 | 四邊無縫 | 每個面各拉滿一張；木紋請水平 |
| `bookshelf-front-01`～`03` | 書架正面（書脊＋層板） | 1024×2048（直式） | 不平鋪 | 整張貼滿一座書架正面，約寬 2.3 m × 高 3.2 m，畫 5 層；有幾張就輪流使用 |
| `carpet-navy` | 地毯 | 1024×2048（直式） | 不平鋪 | 整張拉滿一塊地毯：長走道毯 2.4 m × 12.4 m、閱讀區毯 5.2 m × 8.2 m |

- 光影由引擎即時計算，**貼圖不要畫投影、高光與方向光**，只畫固有色與表面細節，否則會和窗格陽光打架。
- 色彩空間 sRGB；不需要法線圖或粗糙度圖。
- 地毯會被拉伸成不同長寬比，邊框請畫細、圖案避免正圓；若希望不變形，可另交 `carpet-navy-runner`（1:5）再由 Claude 接上。
- 只需提交檔案並在 Issue #7 留言，Claude 會接入並回覆桌面與手機實機截圖。

### 2. 角色立繪 `docs/sprites/<look>.png`
- **每個角色只要一張全身立繪**，程式會切出上身與雙腿做待機、行走、互動動畫，並處理旋轉與鏡像。
- 完整規格與 ChatGPT 指令範本見 [`docs/art/CHARACTER-SPRITES.md`](art/CHARACTER-SPRITES.md)（PR #9，合併後生效）。重點：正面 3/4 朝右、全身、兩腿略分開、透明背景、**不要白描邊**（程式統一加）、高度 ≥ 1000 px。
- `<look>` 對應 `docs/js/sprites.js` 的 `LOOKS`：player、reader、curly、bookish、tall、librarian、professor、gardener、redhead。
- 驗收頁：`docs/character-lab.html?sprite=sprites/<look>.png&zoom=3`。

### 3. 道具立牌 `docs/assets/art/props/`
- 透明背景 PNG，單一物件。
- 在 Issue 註明底部接地點（像素座標）與實際高度（公尺）。

### 4. 場景版面
- 3D 家具與牆面的位置寫在 `docs/js/scenes/<id>.js`，座標單位為公尺。規則見 `docs/js/CONTRACT.md`。
- 若要調整家具位置、比例或光線，在 Issue 用文字或標註截圖說明，由 Claude 修改並回傳實機截圖。

## 每次交付的流程
1. 美術方提交素材（commit 或 PR），並在 Issue 留言：檔案路徑、用途、尺寸與注意事項。
2. Claude 接進遊戲，在 Issue 回覆實機截圖（桌面與手機各一張），並和參考圖並排比對。
3. 美術方判定通過或列出修改點。**一次只改一個維度**（例如只改光影，或只改角色臉部）。

## 目前狀態（2026-11-26）
- 已上線：圖書館 3D 場景（碰撞、A* 尋路、深度遮擋與剪影、窗格陽光陰影）、紙片角色（目前為程式繪製）、7 位原創 NPC 與日程、HUD、存檔。網站：https://bonnie9981.github.io/Herry-potter/
- 美術：未通過。場景材質與角色目前都是程式生成，待換成正式手繪素材。
- 其他六個場景（大廳、庭院、走廊、教室、溫室、黑湖）的 3D 結構在 PR #5，尚未合併。

## 待辦
- [ ] ChatGPT：圖書館材質（石地、石牆、木頭、書架正面、地毯）
- [ ] ChatGPT：主角與 NPC 角色立繪（依 CHARACTER-SPRITES.md）
- [x] Claude：引擎優先讀取 `docs/assets/art/textures/` 的貼圖，沒有素材時退回程式繪製
- [ ] Claude：每次素材接入後，在 Issue 回報實機截圖
