# 霍格華茲人生模擬器｜總入口

本 repository 支援多次彼此獨立的模擬。全域資料庫只存放所有模擬共通的原著世界觀與系統；每次模擬的角色、自創內容及世界線變動都存放在自己的資料夾。

## 公開遊戲入口
- [開啟霍格華茲人生模擬器](docs/index.html)
- [玩家使用指南](docs/玩家使用指南.md)

## 開發與品質管理
- [開發 Progress](docs/開發Progress.md)
- [霍格華茲資料庫完整度稽核](docs/霍格華茲資料庫完整度稽核.md)
- [主持者自我反思與修正流程](docs/自我反思與修正流程.md)
- [每回合檢查清單](docs/模擬回合檢查清單.md)
- [玩家回報與改善說明](docs/玩家回報與改善.md)
- [提交錯誤、建議或主持品質回報](https://github.com/Bonnie9981/Herry-potter/issues/new/choose)
- `scripts/validate_world.py`：檢查資料隔離、天賦數值、存檔結構與模擬規則契約。
- `.github/workflows/world-quality.yml`：相關變更時自動執行 QA、單元測試並產生報告；不呼叫 AI API。
- `.github/workflows/pages.yml`：檢查入口網站並部署 GitHub Pages。

## 入口
- [全域資料庫](global/README.md)
- [霍格華茲資料庫](global/hogwarts/README.md)
- [世界觀資料庫](global/world/README.md)
- [魔法百科](global/magic/README.md)
- [模擬總目錄](simulations/README.md)
- [SIMULATION 001｜洛夏](simulations/SIM-001/README.md)
- [高自由度模擬引擎](global/systems/simulation-engine.md)
- [角色數值與成長系統](global/systems/character-state-and-progression.md)
- [道具互動系統](global/systems/item-and-world-interaction.md)
- [紅隊與玩家品鑑報告](docs/高自由度模擬器紅隊與玩家品鑑.md)
- [完整遊戲主持指令](docs/霍格華茲模擬器完整指令.md)

## 資料隔離規則
1. `global/` 只放跨模擬通用的原著資料、已確認世界規則與系統規範。
2. `simulations/SIM-XXX/` 放該次角色、家庭、天賦、物品、關係、劇情、原創人物、原創魔法、原創制度及世界線變動。
3. 某次模擬的自創內容預設只屬於該次模擬。只有玩家明確要求跨模擬共用，才整理至全域，並標示原創通用設定，不冒充原著。
4. 未確認內容標示待核對，不猜測。
5. 每次遊戲結束更新 GitHub 對應檔案；寫入成功後才能回報已存檔。
