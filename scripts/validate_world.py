#!/usr/bin/env python3
"""Deterministic quality gates for the Hogwarts Simulator repository.

No AI/API calls are made. Checks repository structure and simulation contracts.
"""
from pathlib import Path
import argparse
import re
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
import item_scenarios  # noqa: E402  (P2-07 replayable interaction scenarios)

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = [
    "global/systems/simulation-engine.md",
    "global/systems/state-model.md",
    "global/systems/npc-model.md",
    "global/systems/character-state-and-progression.md",
    "global/systems/item-and-world-interaction.md",
    "global/rules/ability-system.md",
    "global/systems/talent/talent-catalogue.md",
    "docs/index.html",
    "docs/玩家使用指南.md",
    "docs/自我反思與修正流程.md",
    "docs/模擬回合檢查清單.md",
    "docs/霍格華茲資料庫完整度稽核.md",
]


# Structural contracts for system specs added in Phase 2 (P2-02 / P2-03).
# "sections": headings (## / ###) that must exist; matched by substring.
# "section_fields": phrases that must appear inside the body of that section.
# "indexes": entry documents that must link to the spec.
SYSTEM_DOC_SPECS = {
    "global/systems/character-state-and-progression.md": {
        "sections": (
            "四種不可混用的數值層", "天賦", "基礎能力", "技能與熟練度", "當下狀態",
            "關係與聲望", "判定流程", "成長", "角色建立與日常查詢", "避免數值膨脹",
        ),
        "section_fields": {
            "基礎能力": ("1–10", "力量", "敏捷", "感知", "意志"),
            "技能與熟練度": ("0–100", "初學", "合格", "專精"),
            "當下狀態": ("疲勞", "傷勢", "飢餓", "壓力", "不預設巫師有通用 MP 魔力條"),
            "關係與聲望": ("熟悉", "信任", "尊重", "戒心", "敵意", "聲望"),
            "判定流程": ("自動成功", "成功但付代價", "部分成功", "失敗但有進展", "無法嘗試"),
            "成長": ("練習", "投入時間"),
        },
        "indexes": ("global/systems/README.md", "global/README.md", "README.md"),
    },
    "global/systems/item-and-world-interaction.md": {
        "sections": (
            "物件類型", "物件資料欄位", "通用互動動詞", "互動判定", "物件狀態與連鎖互動",
            "物件組合與實驗", "場景互動密度", "互動範例", "經濟與物品流向", "互動驗收",
        ),
        "section_fields": {
            "物件資料欄位": (
                "持有人", "目前位置", "狀態", "前置條件", "互動耗時", "消耗", "風險", "轉移紀錄",
            ),
            "通用互動動詞": ("打開", "解鎖", "閱讀", "拿取", "交付"),
            "互動判定": ("可接觸", "鑰匙", "時間", "部分成功"),
            "物件狀態與連鎖互動": ("門", "書", "坩堝", "信件", "時間與因果"),
            "互動範例": ("門鎖", "坩堝", "寵物", "圖書館書籍"),
            "互動驗收": ("跨回合", "同一物件不會同時出現在兩個位置"),
        },
        "indexes": ("global/systems/README.md", "global/README.md", "README.md"),
    },
}
SYSTEMS_INDEX = "global/systems/README.md"

HEADING_RE = re.compile(r"^(#{2,3})\s+(.+?)\s*$")
LINK_RE = re.compile(r"\]\(([^)#\s]+)(?:#[^)]*)?\)")


def markdown_headings(markdown: str):
    """Return (level, title) for every ## / ### heading."""
    headings = []
    for line in markdown.splitlines():
        match = HEADING_RE.match(line)
        if match:
            headings.append((len(match.group(1)), match.group(2)))
    return headings


def section_text(markdown: str, phrase: str):
    """Body of the first ##/### heading containing ``phrase`` (None if absent).

    The body runs until the next heading of the same or a higher level.
    """
    lines = markdown.splitlines()
    for index, line in enumerate(lines):
        match = HEADING_RE.match(line)
        if not match or phrase not in match.group(2):
            continue
        level = len(match.group(1))
        body = []
        for following in lines[index + 1:]:
            other = HEADING_RE.match(following)
            if other and len(other.group(1)) <= level:
                break
            body.append(following)
        return "\n".join(body)
    return None


def index_links(markdown: str, index_path: Path, root: Path):
    """Resolve relative Markdown links in an index file to root-relative POSIX paths."""
    targets = set()
    base = index_path.parent
    for target in LINK_RE.findall(markdown):
        if "://" in target:
            continue
        resolved = (base / target).resolve()
        try:
            targets.add(resolved.relative_to(root.resolve()).as_posix())
        except ValueError:
            continue
    return targets


def check_system_docs(root: Path = ROOT, specs=None):
    """P2-06: structural, contract-field and index checks for system specs."""
    specs = SYSTEM_DOC_SPECS if specs is None else specs
    errors = []
    link_cache = {}

    def links_of(relative):
        if relative not in link_cache:
            path = root / relative
            link_cache[relative] = (
                index_links(path.read_text(encoding="utf-8"), path, root) if path.is_file() else None
            )
        return link_cache[relative]

    for relative, spec in specs.items():
        path = root / relative
        if not path.is_file():
            errors.append(f"缺少系統規格文件：{relative}")
            continue
        content = path.read_text(encoding="utf-8")
        titles = [title for _, title in markdown_headings(content)]
        for section in spec.get("sections", ()):
            if not any(section in title for title in titles):
                errors.append(f"{relative} 缺少必要章節：{section}")
        for section, phrases in spec.get("section_fields", {}).items():
            body = section_text(content, section)
            if body is None:
                if section not in spec.get("sections", ()):
                    errors.append(f"{relative} 缺少必要章節：{section}")
                continue
            for phrase in phrases:
                if phrase not in body:
                    errors.append(f"{relative}「{section}」章節缺少契約欄位：{phrase}")
        for index in spec.get("indexes", ()):
            links = links_of(index)
            if links is None:
                errors.append(f"缺少索引文件：{index}")
            elif relative not in links:
                errors.append(f"{index} 未列出系統文件：{relative}")

    # Every top-level system spec must be reachable from the systems index.
    systems_dir = root / "global/systems"
    links = links_of(SYSTEMS_INDEX)
    if systems_dir.is_dir() and links is not None:
        for path in sorted(systems_dir.glob("*.md")):
            relative = path.relative_to(root).as_posix()
            if path.name != "README.md" and relative not in links:
                errors.append(f"{SYSTEMS_INDEX} 未列出系統文件：{relative}")
    return errors


def talent_values(markdown: str):
    """Extract numeric talent values from Markdown table rows."""
    values = []
    for line in markdown.splitlines():
        if not line.lstrip().startswith("|"):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if len(cells) >= 2 and re.fullmatch(r"\d{1,3}", cells[1]):
            values.append(int(cells[1]))
    return values


def validate(root: Path = ROOT):
    errors = []
    for relative in REQUIRED:
        if not (root / relative).is_file():
            errors.append(f"缺少必要檔案：{relative}")

    global_dir = root / "global"
    if global_dir.exists():
        for path in global_dir.rglob("*.md"):
            content = path.read_text(encoding="utf-8")
            for forbidden in ("SIM-001", "洛夏"):
                if forbidden in content:
                    errors.append(f"全域資料混入單次模擬內容：{path.relative_to(root)}（{forbidden}）")

    talent_files = [
        root / "global/systems/talent/talent-catalogue.md",
        *sorted((root / "simulations").glob("SIM-*/character/talents.md")),
    ]
    for path in talent_files:
        if not path.is_file():
            continue
        for value in talent_values(path.read_text(encoding="utf-8")):
            if not 0 <= value <= 100:
                errors.append(f"天賦數值超出 0–100：{path.relative_to(root)}（{value}）")

    simulations = root / "simulations"
    if simulations.exists():
        for sim in sorted(simulations.glob("SIM-*")):
            if not sim.is_dir():
                continue
            for relative in ("README.md", "character/profile.md", "character/talents.md",
                             "state/current.md", "timeline.md"):
                if not (sim / relative).is_file():
                    errors.append(f"模擬存檔缺少必要欄位：{sim.name}/{relative}")
            for path in sim.rglob("*.md"):
                content = path.read_text(encoding="utf-8")
                foreign_ids = re.findall(r"\bSIM-(\d{3})\b", content)
                for number in foreign_ids:
                    if f"SIM-{number}" != sim.name:
                        errors.append(f"存檔引用其他模擬 ID：{path.relative_to(root)}（SIM-{number}）")

    contracts = {
        "global/systems/simulation-engine.md": (
            "玩家意圖優先", "資訊傳播", "不保證玩家成功", "部分成功",
            "重大分歧", "狀態", "原創內容",
        ),
        "global/systems/state-model.md": ("已知資訊", "物品", "時間", "事件", "快照"),
        "global/systems/npc-model.md": ("確定知道", "不會主動透露", "目前所在地", "玩家不在場"),
        "global/systems/character-state-and-progression.md": (
            "天賦", "基礎能力", "技能與熟練度", "當下狀態", "不預設巫師有通用 MP 魔力條",
        ),
        "global/systems/item-and-world-interaction.md": (
            "物件資料欄位", "通用互動動詞", "互動判定", "物件狀態與連鎖互動",
        ),
    }
    for relative, phrases in contracts.items():
        path = root / relative
        if path.is_file():
            content = path.read_text(encoding="utf-8")
            for phrase in phrases:
                if phrase not in content:
                    errors.append(f"{relative} 缺少必要模擬契約：{phrase}")

    errors.extend(check_system_docs(root))
    errors.extend(item_scenarios.validate_all(root))

    reflection = root / "docs/自我反思與修正流程.md"
    if reflection.is_file():
        content = reflection.read_text(encoding="utf-8")
        for phrase in ("根因", "反例", "回歸測試", "人工核准", "不自動合併"):
            if phrase not in content:
                errors.append(f"自我改善流程缺少安全閘門：{phrase}")

    return errors


def write_report(path: Path, errors):
    status = "FAILED" if errors else "PASSED"
    lines = [
        "# Hogwarts Simulator — World QA",
        "",
        f"- Result: **{status}**",
        f"- Checks: deterministic repository and simulation-contract checks",
        f"- Errors: {len(errors)}",
        "",
        "## Findings",
    ]
    lines.extend([f"- {item}" for item in errors] if errors else ["- No violations found."])
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description="Run deterministic Hogwarts simulator QA.")
    parser.add_argument("--report", type=Path, help="Write a Markdown QA report to this path.")
    args = parser.parse_args()

    problems = validate()
    if args.report:
        write_report(args.report, problems)

    summary = "WORLD QA FAILED" if problems else "WORLD QA PASSED — repository invariants are intact."
    print(summary)
    if problems:
        for problem in problems:
            print(f"- {problem}")

    summary_path = __import__("os").environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        report_path = args.report or Path("QA_REPORT.md")
        if not args.report:
            write_report(report_path, problems)
        with open(summary_path, "a", encoding="utf-8") as summary_file:
            summary_file.write(report_path.read_text(encoding="utf-8") + "\n")

    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
