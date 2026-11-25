#!/usr/bin/env python3
"""Deterministic quality gates for the Hogwarts Simulator repository.

No AI/API calls are made. Checks repository structure and simulation contracts.
"""
from pathlib import Path
import argparse
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = [
    "global/systems/simulation-engine.md",
    "global/systems/state-model.md",
    "global/systems/npc-model.md",
    "global/rules/ability-system.md",
    "global/systems/talent/talent-catalogue.md",
    "docs/index.html",
    "docs/玩家使用指南.md",
    "docs/自我反思與修正流程.md",
    "docs/模擬回合檢查清單.md",
]


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
    }
    for relative, phrases in contracts.items():
        path = root / relative
        if path.is_file():
            content = path.read_text(encoding="utf-8")
            for phrase in phrases:
                if phrase not in content:
                    errors.append(f"{relative} 缺少必要模擬契約：{phrase}")

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
