#!/usr/bin/env python3
"""Replayable, deterministic interaction-object scenarios (P2-07).

Implements the rules of ``global/systems/item-and-world-interaction.md`` as a
small state machine and replays the structured scenarios stored in
``global/systems/scenarios/items/*.json``. No AI/API calls, no randomness:
the same scenario always produces the same trace and final state.

Rules mapped from the spec:
- 四、互動判定 1: the target must be reachable (held by the actor, or lying
  at the actor's location) unless a verb is marked ``remote``.
- 四、互動判定 2–4: ``requires`` preconditions (knowledge, tools, keys,
  permissions, materials, object state). The first failing one blocks the
  attempt ("無法嘗試") with its stated reason; state is unchanged.
- 四、互動判定 5–6: each branch costs time, may consume items, leaves
  events/traces, and declares success / partial / failure.
- 五、物件狀態: state changes are explicit; scheduled effects model
  cause-and-effect over time (heating, letters in transit, pet hunger).
- 十、互動驗收: invariants are checked after every step (one holder *or*
  one location, non-negative quantities, monotonic clock).

Usage:
    python scripts/item_scenarios.py            # replay every scenario
    python scripts/item_scenarios.py -v FILE…   # replay with a step trace
"""
from __future__ import annotations

import argparse
import copy
import json
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCENARIO_DIR = Path("global/systems/scenarios/items")
RULES_DOC = Path("global/systems/item-and-world-interaction.md")
TIME_FORMAT = "%Y-%m-%d %H:%M"
REQUIRED_KINDS = ("door", "book", "cauldron", "letter", "pet")
OUTCOMES = ("success", "partial", "failure", "blocked")
STEP_OUTCOMES = OUTCOMES + ("moved", "waited")
UNREACHABLE = "目標不在可接觸範圍"
UNSUPPORTED = "此物件沒有這種互動方式"
COMPARATORS = ("equals", "in", "lt", "lte", "gt", "gte")


class ScenarioError(Exception):
    """A scenario is malformed (as opposed to failing its expectations)."""


def fmt(moment: datetime) -> str:
    return moment.strftime(TIME_FORMAT)


def parse_time(text: str) -> datetime:
    try:
        return datetime.strptime(text, TIME_FORMAT)
    except (TypeError, ValueError) as exc:
        raise ScenarioError(f"時間格式需為 YYYY-MM-DD HH:MM：{text!r}") from exc


# --------------------------------------------------------------------------
# Spec parsing


def allowed_verbs(doc_text: str) -> set:
    """Verbs from 三、通用互動動詞 plus the per-object verbs in 八、互動範例."""
    verbs = set()
    section = ""
    for line in doc_text.splitlines():
        if line.startswith("## "):
            section = line[3:].strip()
            continue
        if not line.startswith("- "):
            continue
        body = line[2:].strip()
        if section.startswith("三、"):
            parts = body.split("、")
        elif section.startswith("八、") and "：" in body:
            parts = re.split(r"[；。]", body.split("：", 1)[1], maxsplit=1)[0].split("、")
        else:
            continue
        for part in parts:
            verb = re.sub(r"（.*?）", "", part).strip()
            if verb:
                verbs.add(verb)
    return verbs


def doc_sections(doc_text: str) -> list:
    return [line[3:].strip() for line in doc_text.splitlines() if line.startswith("## ")]


# --------------------------------------------------------------------------
# Engine


class World:
    """Deterministic world state for one scenario replay."""

    def __init__(self, scenario: dict):
        self.clock = parse_time(scenario["start_time"])
        self.actors = copy.deepcopy(scenario["actors"])
        self.objects = copy.deepcopy(scenario["objects"])
        self.events = []
        self.pending = []  # (due, sequence, actor_id, object_id, effects, label)
        self._sequence = 0

    # -- lookups -----------------------------------------------------------
    def obj(self, object_id):
        if object_id not in self.objects:
            raise ScenarioError(f"未知物件：{object_id}")
        return self.objects[object_id]

    def actor(self, actor_id):
        if actor_id not in self.actors:
            raise ScenarioError(f"未知角色：{actor_id}")
        return self.actors[actor_id]

    def resolve(self, value, actor_id):
        if value == "$actor":
            return actor_id
        if value == "$here":
            return self.actor(actor_id)["location"]
        return value

    def reachable(self, actor_id, object_id) -> bool:
        item = self.obj(object_id)
        if item.get("holder") == actor_id:
            return True
        return item.get("holder") is None and item.get("location") == self.actor(actor_id)["location"]

    # -- conditions --------------------------------------------------------
    def check(self, cond: dict, actor_id: str, target_id: str) -> bool:
        if "any" in cond:
            return any(self.check(c, actor_id, target_id) for c in cond["any"])
        if "all" in cond:
            return all(self.check(c, actor_id, target_id) for c in cond["all"])
        if "not" in cond:
            return not self.check(cond["not"], actor_id, target_id)
        if "actor_knows" in cond:
            return cond["actor_knows"] in self.actor(actor_id).get("knows", [])
        if "actor_holds" in cond:
            item = self.obj(cond["actor_holds"])
            return (item.get("holder") == actor_id
                    and item.get("quantity", 1) >= cond.get("min_quantity", 1))
        if "actor_at" in cond:
            return self.actor(actor_id)["location"] == cond["actor_at"]
        if "holder" in cond:
            item = self.obj(cond.get("object", target_id))
            return item.get("holder") == self.resolve(cond["holder"], actor_id)
        if "state" in cond:
            item = self.obj(cond.get("object", target_id))
            key = cond["state"]
            if key not in item["state"]:
                raise ScenarioError(f"{cond.get('object', target_id)} 沒有狀態欄位 {key}")
            value = item["state"][key]
            for op in COMPARATORS:
                if op in cond:
                    expected = cond[op]
                    return {
                        "equals": lambda: value == expected,
                        "in": lambda: value in expected,
                        "lt": lambda: value < expected,
                        "lte": lambda: value <= expected,
                        "gt": lambda: value > expected,
                        "gte": lambda: value >= expected,
                    }[op]()
            raise ScenarioError(f"狀態條件缺少比較方式：{cond}")
        raise ScenarioError(f"未知條件：{cond}")

    # -- effects -----------------------------------------------------------
    def apply(self, effects, actor_id: str, target_id: str):
        for effect in effects:
            object_id = effect.get("object", target_id)
            item = self.obj(object_id)
            if "set" in effect:
                item["state"].update(effect["set"])
            elif "increment" in effect:
                for key, amount in effect["increment"].items():
                    item["state"][key] = item["state"].get(key, 0) + amount
            elif "take" in effect or "give" in effect:
                holder = self.resolve(effect.get("take", effect.get("give")), actor_id)
                self.actor(holder)
                item["holder"], item["location"] = holder, None
            elif "place" in effect:
                item["holder"], item["location"] = None, self.resolve(effect["place"], actor_id)
            elif "consume" in effect:
                amount = effect["consume"]
                quantity = item.get("quantity")
                if quantity is None or quantity < amount:
                    raise ScenarioError(f"{object_id} 數量不足以消耗 {amount}（應由前置條件擋下）")
                item["quantity"] = quantity - amount
                if item["quantity"] == 0:
                    item["state"]["status"] = "耗盡"
            elif "schedule" in effect:
                spec = effect["schedule"]
                self._sequence += 1
                self.pending.append((self.clock + timedelta(minutes=spec["after"]), self._sequence,
                                     actor_id, object_id, spec["effects"], spec.get("label", "")))
            elif "event" in effect:
                self.events.append(f"{fmt(self.clock)} {effect['event']}")
            else:
                raise ScenarioError(f"未知效果：{effect}")

    def advance(self, minutes: int):
        if minutes < 0:
            raise ScenarioError("時間不能倒流")
        target = self.clock + timedelta(minutes=minutes)
        while True:
            due = sorted(p for p in self.pending if p[0] <= target)
            if not due:
                break
            task = due[0]
            self.pending.remove(task)
            self.clock = task[0]
            self.apply(task[4], task[2], task[3])
        self.clock = target

    # -- steps -------------------------------------------------------------
    def perform(self, step: dict) -> dict:
        if "wait" in step:
            self.advance(step["wait"])
            return {"outcome": "waited", "reason": ""}
        actor_id = step["actor"]
        if "move_to" in step:
            self.actor(actor_id)
            self.advance(step.get("minutes", 0))
            self.actors[actor_id]["location"] = step["move_to"]
            return {"outcome": "moved", "reason": ""}

        target_id, verb = step["target"], step["verb"]
        item = self.obj(target_id)
        spec = item.get("verbs", {}).get(verb)
        if spec is None:
            return {"outcome": "blocked", "reason": UNSUPPORTED}
        if not spec.get("remote") and not self.reachable(actor_id, target_id):
            return {"outcome": "blocked", "reason": UNREACHABLE}
        for cond in spec.get("requires", []):
            if not self.check(cond, actor_id, target_id):
                self.advance(spec.get("blocked_minutes", 0))
                return {"outcome": "blocked", "reason": cond["reason"]}
        for branch in spec["branches"]:
            if all(self.check(c, actor_id, target_id) for c in branch.get("when", [])):
                self.advance(branch.get("minutes", 0))
                self.apply(branch.get("effects", []), actor_id, target_id)
                return {"outcome": branch["outcome"], "reason": branch.get("note", ""),
                        "branch": branch.get("id", "")}
        raise ScenarioError(f"{target_id}.{verb} 沒有符合的結果分支")

    def invariants(self) -> list:
        problems = []
        for object_id, item in self.objects.items():
            holder, location = item.get("holder"), item.get("location")
            if (holder is None) == (location is None):
                problems.append(f"{object_id} 必須恰好有一個持有人或一個位置（holder={holder}, location={location}）")
            if holder is not None and holder not in self.actors:
                problems.append(f"{object_id} 的持有人不存在：{holder}")
            quantity = item.get("quantity")
            if quantity is not None and (not isinstance(quantity, int) or quantity < 0):
                problems.append(f"{object_id} 數量無效：{quantity}")
        return problems

    def snapshot(self) -> dict:
        return {
            "clock": fmt(self.clock),
            "actors": copy.deepcopy(self.actors),
            "objects": {k: {f: v for f, v in o.items() if f != "verbs"} for k, o in self.objects.items()},
            "events": list(self.events),
        }


# --------------------------------------------------------------------------
# Loading, schema checks and replay


def load_scenario(path: Path) -> dict:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    templates = data.get("verb_templates", {})
    for object_id, item in data.get("objects", {}).items():
        template = item.pop("verbs_from", None)
        if template is not None:
            if template not in templates:
                raise ScenarioError(f"{object_id} 引用不存在的動詞模板：{template}")
            item["verbs"] = {**copy.deepcopy(templates[template]), **item.get("verbs", {})}
    return data


def _iter_conditions(conds):
    for cond in conds:
        yield cond
        for key in ("any", "all"):
            if key in cond:
                yield from _iter_conditions(cond[key])
        if "not" in cond:
            yield from _iter_conditions([cond["not"]])


def schema_errors(data: dict, verbs: set, sections: list) -> list:
    errors = []
    for key in ("id", "kind", "title", "rules", "start_time", "actors", "objects", "steps"):
        if key not in data:
            errors.append(f"缺少欄位：{key}")
    if errors:
        return errors
    try:
        parse_time(data["start_time"])
    except ScenarioError as exc:
        errors.append(str(exc))
    for rule in data["rules"]:
        if not any(rule in section for section in sections):
            errors.append(f"引用的規則章節不存在：{rule}")
    for actor_id, actor in data["actors"].items():
        if "location" not in actor:
            errors.append(f"角色 {actor_id} 缺少 location")
    object_ids = set(data["objects"])
    for object_id, item in data["objects"].items():
        for key in ("name", "type", "owner", "state"):
            if key not in item:
                errors.append(f"物件 {object_id} 缺少 {key}")
        if "holder" not in item or "location" not in item:
            errors.append(f"物件 {object_id} 需同時宣告 holder 與 location（其一為 null）")
        for verb_name, spec in item.get("verbs", {}).items():
            where = f"{object_id}.{verb_name}"
            if spec.get("canonical") not in verbs:
                errors.append(f"{where} 的 canonical 動詞不在互動規格中：{spec.get('canonical')}")
            if not spec.get("branches"):
                errors.append(f"{where} 缺少結果分支")
            for cond in spec.get("requires", []):
                if "reason" not in cond:
                    errors.append(f"{where} 的前置條件缺少失敗理由")
            all_conds = list(spec.get("requires", []))
            for branch in spec.get("branches", []):
                if branch.get("outcome") not in OUTCOMES[:3]:
                    errors.append(f"{where} 的分支結果無效：{branch.get('outcome')}")
                all_conds.extend(branch.get("when", []))
            for cond in _iter_conditions(all_conds):
                for key in ("actor_holds", "object"):
                    if key in cond and cond[key] not in object_ids:
                        errors.append(f"{where} 引用不存在的物件：{cond[key]}")
    steps = data["steps"]
    if not steps:
        errors.append("情境沒有任何步驟")
    turns = [step.get("turn") for step in steps]
    if any(not isinstance(t, int) for t in turns) or turns != sorted(turns):
        errors.append("步驟的 turn 必須是遞增整數")
    elif len(set(turns)) < 2:
        errors.append("情境需跨越至少兩個回合以驗證狀態保留")
    for index, step in enumerate(steps, 1):
        if "expect" not in step:
            errors.append(f"第 {index} 步缺少 expect")
        elif step["expect"].get("outcome") not in STEP_OUTCOMES:
            errors.append(f"第 {index} 步的預期結果無效：{step['expect'].get('outcome')}")
    if not any(step.get("expect", {}).get("outcome") == "blocked" for step in steps):
        errors.append("情境需包含至少一個前置條件失敗（blocked）的案例")
    return errors


def compare(world: World, result: dict, expect: dict) -> list:
    errors = []
    if expect.get("outcome") != result["outcome"]:
        errors.append(f"結果應為 {expect.get('outcome')}，實際為 {result['outcome']}（{result['reason']}）")
    if "reason_contains" in expect and expect["reason_contains"] not in result["reason"]:
        errors.append(f"理由應包含「{expect['reason_contains']}」，實際為「{result['reason']}」")
    if "clock" in expect and expect["clock"] != fmt(world.clock):
        errors.append(f"時間應為 {expect['clock']}，實際為 {fmt(world.clock)}")
    for object_id, fields in expect.get("objects", {}).items():
        item = world.objects.get(object_id)
        if item is None:
            errors.append(f"預期中的物件不存在：{object_id}")
            continue
        for field, value in fields.items():
            if field == "state":
                for key, expected in value.items():
                    actual = item["state"].get(key, "<缺少>")
                    if actual != expected:
                        errors.append(f"{object_id}.state.{key} 應為 {expected!r}，實際為 {actual!r}")
            elif item.get(field) != value:
                errors.append(f"{object_id}.{field} 應為 {value!r}，實際為 {item.get(field)!r}")
    for actor_id, fields in expect.get("actors", {}).items():
        actor = world.actors.get(actor_id, {})
        for field, value in fields.items():
            if actor.get(field) != value:
                errors.append(f"角色 {actor_id}.{field} 應為 {value!r}，實際為 {actor.get(field)!r}")
    for text in expect.get("events_contain", []):
        if not any(text in event for event in world.events):
            errors.append(f"事件紀錄應包含「{text}」")
    return errors


def replay(data: dict, trace=None) -> tuple:
    """Replay a scenario. Returns (errors, final snapshot)."""
    world = World(data)
    errors = []
    previous = world.clock
    for index, step in enumerate(data["steps"], 1):
        label = f"第 {index} 步（回合 {step['turn']}）"
        try:
            result = world.perform(step)
        except ScenarioError as exc:
            errors.append(f"{label}：情境錯誤：{exc}")
            break
        if trace is not None:
            action = step.get("verb") or ("移動→" + step["move_to"] if "move_to" in step else f"等待 {step.get('wait')} 分")
            who = step.get("actor", "")
            target = step.get("target", "")
            trace.append(f"  [{fmt(world.clock)}] T{step['turn']} {who} {action} {target} → "
                         f"{result['outcome']} {result['reason']}".rstrip())
        errors.extend(f"{label}：{problem}" for problem in compare(world, result, step["expect"]))
        errors.extend(f"{label}：不變量違反：{problem}" for problem in world.invariants())
        if world.clock < previous:
            errors.append(f"{label}：時間倒流")
        previous = world.clock
    return errors, world.snapshot()


def run_file(path: Path, root: Path = ROOT, trace=None) -> list:
    doc = (root / RULES_DOC).read_text(encoding="utf-8")
    try:
        data = load_scenario(path)
    except (ScenarioError, json.JSONDecodeError) as exc:
        return [f"無法載入：{exc}"]
    problems = schema_errors(data, allowed_verbs(doc), doc_sections(doc))
    if problems:
        return [f"格式錯誤：{p}" for p in problems]
    errors, _ = replay(data, trace)
    return errors


def scenario_files(root: Path = ROOT) -> list:
    return sorted((root / SCENARIO_DIR).glob("*.json"))


def validate_all(root: Path = ROOT) -> list:
    """Errors for world QA (empty list means every scenario replays as expected)."""
    if not (root / RULES_DOC).is_file():
        return [f"缺少互動規格：{RULES_DOC.as_posix()}"]
    files = scenario_files(root)
    errors = []
    kinds = set()
    for path in files:
        relative = path.relative_to(root).as_posix()
        errors.extend(f"互動情境 {relative}：{e}" for e in run_file(path, root))
        try:
            kinds.add(json.loads(path.read_text(encoding="utf-8")).get("kind"))
        except json.JSONDecodeError:
            pass
    for kind in REQUIRED_KINDS:
        if kind not in kinds:
            errors.append(f"互動情境缺少必要物件類型：{kind}（{SCENARIO_DIR.as_posix()}）")
    return errors


def main(argv=None):
    parser = argparse.ArgumentParser(description="Replay deterministic item interaction scenarios.")
    parser.add_argument("files", nargs="*", type=Path, help="Scenario JSON files (default: all).")
    parser.add_argument("-v", "--verbose", action="store_true", help="Print a step trace.")
    args = parser.parse_args(argv)
    files = args.files or scenario_files()
    failed = 0
    for path in files:
        trace = [] if args.verbose else None
        errors = run_file(path.resolve(), ROOT, trace)
        status = "FAIL" if errors else "PASS"
        print(f"{status} {path.name}")
        for line in trace or []:
            print(line)
        for error in errors:
            print(f"  - {error}")
        failed += bool(errors)
    print(f"{len(files) - failed}/{len(files)} scenarios passed")
    return 1 if failed or not files else 0


if __name__ == "__main__":
    sys.exit(main())
