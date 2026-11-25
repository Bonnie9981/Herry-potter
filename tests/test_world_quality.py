import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from validate_world import talent_values, validate


class WorldQualityTests(unittest.TestCase):
    def test_talent_table_values_are_extracted(self):
        sample = "| 天賦 | 數值 |\n|---|---:|\n| 記憶力 | 100 |\n| 魔力控制 | 0 |"
        self.assertEqual(talent_values(sample), [100, 0])

    def test_real_repository_invariants(self):
        self.assertEqual(validate(), [], "Repository world-quality checks must pass")


if __name__ == "__main__":
    unittest.main()
