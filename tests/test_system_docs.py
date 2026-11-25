"""P2-06: QA covers the new system specs (structure, contract fields, indexes)."""
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from validate_world import (  # noqa: E402
    SYSTEM_DOC_SPECS,
    check_system_docs,
    index_links,
    markdown_headings,
    section_text,
)

CHARACTER = "global/systems/character-state-and-progression.md"
ITEMS = "global/systems/item-and-world-interaction.md"
INDEXES = ("README.md", "global/README.md", "global/systems/README.md")


class HelperTests(unittest.TestCase):
    def test_headings_only_level_two_and_three(self):
        text = "# 標題\n## 一、物件類型\n### 1. 天賦\n#### 細節\n內文"
        self.assertEqual(markdown_headings(text), [(2, "一、物件類型"), (3, "1. 天賦")])

    def test_section_text_stops_at_same_or_higher_heading(self):
        text = "## 甲\nA1\n### 甲子\nA2\n## 乙\nB1"
        self.assertEqual(section_text(text, "甲"), "A1\n### 甲子\nA2")
        self.assertEqual(section_text(text, "甲子"), "A2")
        self.assertIsNone(section_text(text, "丙"))

    def test_index_links_resolve_relative_paths(self):
        index = ROOT / "global/systems/README.md"
        text = "- [a](state-model.md)\n- [b](../academics/README.md#x)\n- [c](https://example.org/a.md)"
        self.assertEqual(
            index_links(text, index, ROOT),
            {"global/systems/state-model.md", "global/academics/README.md"},
        )


class RepositoryTests(unittest.TestCase):
    def test_new_system_docs_are_specified(self):
        self.assertIn(CHARACTER, SYSTEM_DOC_SPECS)
        self.assertIn(ITEMS, SYSTEM_DOC_SPECS)

    def test_real_system_docs_pass(self):
        self.assertEqual(check_system_docs(ROOT), [])

    def test_workflow_runs_validator_and_tests_on_relevant_paths(self):
        workflow = (ROOT / ".github/workflows/world-quality.yml").read_text(encoding="utf-8")
        for path in ("global/**", "scripts/**", "tests/**"):
            self.assertEqual(workflow.count(f'"{path}"'), 2, f"push 與 pull_request 都應涵蓋 {path}")
        self.assertIn("python scripts/validate_world.py --report QA_REPORT.md", workflow)
        self.assertIn("python -m unittest discover -s tests -v", workflow)


class MutationTests(unittest.TestCase):
    """Break a copy of the repository docs and make sure the checks notice."""

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        for relative in (*INDEXES, CHARACTER, ITEMS):
            target = self.tmp / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / relative, target)

    def edit(self, relative, old, new):
        path = self.tmp / relative
        text = path.read_text(encoding="utf-8")
        self.assertIn(old, text)
        path.write_text(text.replace(old, new), encoding="utf-8")

    def errors(self):
        # Limit to the two new specs so the copy does not need every system doc.
        index = self.tmp / "global/systems/README.md"
        text = index.read_text(encoding="utf-8")
        kept = [line for line in text.splitlines()
                if "character-state" in line or "item-and-world" in line or not line.startswith("- ")]
        index.write_text("\n".join(kept) + "\n", encoding="utf-8")
        return check_system_docs(self.tmp)

    def test_copy_passes(self):
        self.assertEqual(self.errors(), [])

    def test_missing_section_is_reported(self):
        self.edit(ITEMS, "## 十、互動驗收", "## 十、其他")
        self.assertTrue(any("缺少必要章節：互動驗收" in e for e in self.errors()))

    def test_missing_contract_field_in_section_is_reported(self):
        self.edit(ITEMS, "- 持有人／保管者／目前位置", "- 保管者")
        problems = self.errors()
        self.assertTrue(any("物件資料欄位" in e and "持有人" in e for e in problems), problems)

    def test_field_outside_its_section_does_not_count(self):
        # "部分成功" still appears elsewhere, but must be in 判定流程 itself.
        self.edit(CHARACTER, "- 部分成功：", "- 局部達成：")
        problems = self.errors()
        self.assertTrue(any("判定流程" in e and "部分成功" in e for e in problems), problems)

    def test_mp_rule_is_enforced(self):
        self.edit(CHARACTER, "**不預設巫師有通用 MP 魔力條。**", "巫師有 MP。")
        self.assertTrue(any("MP" in e for e in self.errors()))

    def test_unlisted_doc_in_root_readme_is_reported(self):
        self.edit("README.md", "(global/systems/item-and-world-interaction.md)", "(global/systems/README.md)")
        self.assertIn(f"README.md 未列出系統文件：{ITEMS}", self.errors())

    def test_unlisted_doc_in_systems_index_is_reported(self):
        (self.tmp / "global/systems/new-system.md").write_text("# 新系統\n", encoding="utf-8")
        self.assertIn("global/systems/README.md 未列出系統文件：global/systems/new-system.md", self.errors())

    def test_missing_doc_is_reported(self):
        (self.tmp / CHARACTER).unlink()
        self.assertIn(f"缺少系統規格文件：{CHARACTER}", self.errors())


if __name__ == "__main__":
    unittest.main()
