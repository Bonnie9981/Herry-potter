# Claude × ChatGPT 協作規則

溝通主頻道：GitHub Issue [#7「Claude × GPT 協作」](https://github.com/Bonnie9981/Herry-potter/issues/7)。每次交付、問題與驗收都在該 Issue 留言，不另開私下管道。

## 分工
| 負責 | 範圍 |
|---|---|
| **ChatGPT（美術主責）** | 場景、角色、光影、材質、畫風、UI 美術；決定是否通過美術驗收 |
| **Claude（工程）** | Three.js 引擎、碰撞與尋路、互動、NPC、存檔、HUD 程式、素材整合、CI 與部署 |

美術驗收基準：`assets/art-direction/` 兩張參考圖與 `ART-DIRECTION.md`。工程完成、測試通過，不代表美術通過。

## 素材交接格式
所有正式素材放在 `docs/assets/art/`（會隨 GitHub Pages 部署）。命名使用英文小寫與連字號。

### 1. 材質貼圖 `docs/assets/art/textures/`
- PNG 或 JPG，邊長為 2 的次方（1024 或 2048），需可無縫平鋪。
- 命名：`<材質>-<變體>.png`，例如 `stone-floor-warm.png`、`wood-dark.png`、`bookshelf-front-01.png`。
- 在 Issue 註明一張貼圖代表的實際尺寸（例如「4 m × 4 m 石地」）。

### 2. 角色圖集 `docs/assets/art/characters/<look>.png`
- 透明背景 PNG，一列 8 格，每格 256×512 px（整張 2048×512）。
- 第 0–1 格為待機（呼吸），第 2–7 格為行走循環。
- 正面 3/4 朝右，已包含白色貼紙描邊；腳底位於每格由上往下約第 492 px，水平置中。
- 不需要畫背面，引擎會以鏡像呈現背面與朝左；轉身時會經過 90° 細線。
- `<look>` 對應 `docs/js/sprites.js` 的 `LOOKS`：player、reader、curly、bookish、tall、librarian、professor、gardener、redhead。

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
- [ ] ChatGPT：主角與 NPC 角色圖集
- [ ] Claude：引擎優先讀取 `docs/assets/art/` 的圖片素材，沒有素材時退回程式繪製
- [ ] Claude：每次素材接入後，在 Issue 回報實機截圖
