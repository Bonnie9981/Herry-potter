# 霍格華茲人生模擬器｜總入口

本 repository 支援多次彼此獨立的模擬。全域資料庫只存放所有模擬共通的原著世界觀與系統；每次模擬的角色、自創內容及世界線變動都存放在自己的資料夾。

## 入口
- [全域資料庫](global/README.md)
- [霍格華茲資料庫](global/hogwarts/README.md)
- [世界觀資料庫](global/world/README.md)
- [魔法百科](global/magic/README.md)
- [模擬總目錄](simulations/README.md)
- [SIMULATION 001｜洛夏](simulations/SIM-001/README.md)
- [完整遊戲主持指令](docs/霍格華茲模擬器完整指令.md)

## 資料隔離規則
1. `global/` 只放跨模擬通用的原著資料、已確認世界規則與系統規範。
2. `simulations/SIM-XXX/` 放該次角色、家庭、天賦、物品、關係、劇情、原創人物、原創魔法、原創制度及世界線變動。
3. 某次模擬的自創內容預設只屬於該模擬。只有玩家明確要求跨模擬共用，才整理至全域，並標示為原創通用設定，不冒充原著。
4. 未確認內容標示待核對，不猜測。
5. 每次遊戲結束更新 GitHub 對應檔案；寫入成功後才能回報已存檔。

## 目錄
- `global/hogwarts/`：學校、學院、教師、課程、考試、校規、地點、魁地奇。
- `global/world/`：正典層級、歷史、政府、法律與社會。
- `global/magic/`：咒語、魔藥、魔杖及魔法規則。
- `global/creatures/`、`plants/`、`objects/`：生物、植物與物品百科。
- `simulations/`：每次獨立模擬。