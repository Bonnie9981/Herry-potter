import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from validate_world import talent_values, validate


class WorldQualityTests(unittest.TestCase):
    def test_talent_table_values_are_extracted(self):
        sample = "| 天賦 | 數值 |\n|---|---:|\n| 記憶力 | 100 |\n| 魔力控制 | 0 |"
        self.assertEqual(talent_values(sample), [100, 0])

    def test_real_repository_invariants(self):
        self.assertEqual(validate(), [], "Repository world-quality checks must pass")

    def test_reflection_loop_is_documented(self):
        text = (ROOT / "docs/自我反思與修正流程.md").read_text(encoding="utf-8")
        for phrase in ("根因", "反例", "回歸測試", "人工核准", "不自動合併"):
            self.assertIn(phrase, text)

    def test_turn_checklist_covers_state_and_npc_knowledge(self):
        text = (ROOT / "docs/模擬回合檢查清單.md").read_text(encoding="utf-8")
        for phrase in ("NPC", "時間", "物品", "存檔", "玩家"):
            self.assertIn(phrase, text)


if __name__ == "__main__":
    unittest.main()
