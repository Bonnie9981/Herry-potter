#!/usr/bin/env python3
"""Deterministic quality gates for the Hogwarts Simulator repository.

No AI/API calls are made. This script checks repository structure and invariants.
"""
from pathlib import Path
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

    # Global rules must never contain a particular player's save or identity.
    global_dir = root / "global"
    if global_dir.exists():
        for path in global_dir.rglob("*.md"):
            text = path.read_text(encoding="utf-8")
            for forbidden in ("SIM-001", "洛夏"):
                if forbidden in text:
                    errors.append(f"全域資料混入單次模擬內容：{path.relative_to(root)}（{forbidden}）")

    # Every talent score in shared and sample character tables must be 0..100.
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

    # Every save must have a minimum resumable structure.
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
                text = path.read_text(encoding="utf-8")
                foreign_ids = re.findall(r"\bSIM-(\d{3})\b", text)
                for number in foreign_ids:
                    if f"SIM-{number}" != sim.name:
                        errors.append(f"存檔引用其他模擬 ID：{path.relative_to(root)}（SIM-{number}）")

    # Core fairness invariants must remain explicit in the system specifications.
    engine = root / "global/systems/simulation-engine.md"
    if engine.is_file():
        text = engine.read_text(encoding="utf-8")
        for phrase in ("玩家意圖優先", "NPC", "資訊傳播", "不保證玩家成功", "未知"):
            if phrase not in text:
                errors.append(f"模擬引擎缺少核心原則：{phrase}")

    state = root / "global/systems/state-model.md"
    if state.is_file():
        text = state.read_text(encoding="utf-8")
        for phrase in ("已知資訊", "物品", "時間", "事件", "快照"):
            if phrase not in text:
                errors.append(f"世界狀態模型缺少追蹤項目：{phrase}")

    npc = root / "global/systems/npc-model.md"
    if npc.is_file():
        text = npc.read_text(encoding="utf-8")
        for phrase in ("確定知道", "不會主動透露", "目前所在地", "玩家不在場"):
            if phrase not in text:
                errors.append(f"NPC 模型缺少自主性／知識邊界：{phrase}")

    return errors


if __name__ == "__main__":
    problems = validate()
    if problems:
        print("WORLD QA FAILED")
        for problem in problems:
            print(f"- {problem}")
        sys.exit(1)
    print("WORLD QA PASSED — repository invariants are intact.")
