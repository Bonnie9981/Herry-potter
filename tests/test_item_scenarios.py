"""P2-07: replayable, deterministic interaction-object scenarios."""
import copy
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import item_scenarios as sc  # noqa: E402

DOC = (ROOT / sc.RULES_DOC).read_text(encoding="utf-8")
VERBS = sc.allowed_verbs(DOC)
SECTIONS = sc.doc_sections(DOC)


def load(name):
    return sc.load_scenario(ROOT / sc.SCENARIO_DIR / name)


def mini_door(**state):
    """A one-door world used for focused engine tests."""
    door_state = {"open": False, "locked": True}
    door_state.update(state)
    return {
        "id": "T", "kind": "door", "title": "t", "rules": ["四、互動判定"],
        "start_time": "1991-09-01 12:00",
        "actors": {"a": {"location": "走廊", "knows": []}},
        "objects": {
            "door": {
                "name": "門", "type": "互動環境", "owner": "霍格華茲", "holder": None, "location": "走廊",
                "state": door_state,
                "verbs": {
                    "打開": {"canonical": "打開",
                             "requires": [{"state": "locked", "equals": False, "reason": "門上鎖"}],
                             "branches": [{"outcome": "success", "minutes": 1,
                                           "effects": [{"set": {"open": True}}]}]},
                },
            },
        },
        "steps": [],
    }


class ScenarioFileTests(unittest.TestCase):
    def test_every_scenario_replays_as_expected(self):
        files = sc.scenario_files(ROOT)
        self.assertGreaterEqual(len(files), 5)
        for path in files:
            with self.subTest(scenario=path.name):
                self.assertEqual(sc.run_file(path, ROOT), [])

    def test_required_object_kinds_are_covered(self):
        kinds = {load(p.name)["kind"] for p in sc.scenario_files(ROOT)}
        self.assertTrue(set(sc.REQUIRED_KINDS) <= kinds, kinds)
        self.assertEqual(sc.validate_all(ROOT), [])

    def test_each_scenario_has_failing_precondition_and_multiple_turns(self):
        for path in sc.scenario_files(ROOT):
            data = load(path.name)
            with self.subTest(scenario=path.name):
                self.assertEqual(sc.schema_errors(data, VERBS, SECTIONS), [])
                outcomes = [s["expect"]["outcome"] for s in data["steps"]]
                self.assertIn("blocked", outcomes)
                self.assertGreaterEqual(len({s["turn"] for s in data["steps"]}), 2)

    def test_replay_is_deterministic(self):
        for path in sc.scenario_files(ROOT):
            data = load(path.name)
            with self.subTest(scenario=path.name):
                trace_a, trace_b = [], []
                errors_a, final_a = sc.replay(copy.deepcopy(data), trace_a)
                errors_b, final_b = sc.replay(copy.deepcopy(data), trace_b)
                self.assertEqual(errors_a, [])
                self.assertEqual(trace_a, trace_b)
                self.assertEqual(final_a, final_b)

    def test_scenario_does_not_mutate_its_source(self):
        data = load("door-lock.json")
        before = json.dumps(data, sort_keys=True, ensure_ascii=False)
        sc.replay(data)
        self.assertEqual(before, json.dumps(data, sort_keys=True, ensure_ascii=False))


class RequiredFailureCaseTests(unittest.TestCase):
    """The precondition failures named in P2-07 are pinned explicitly."""

    def expect_step(self, name, verb, target, outcome, reason):
        steps = [s for s in load(name)["steps"] if s.get("verb") == verb and s.get("target") == target]
        self.assertTrue(any(s["expect"]["outcome"] == outcome and reason in s["expect"].get("reason_contains", "")
                            for s in steps), f"{name} 缺少 {verb}→{outcome}（{reason}）")

    def test_locked_door_without_key_or_alohomora(self):
        self.expect_step("door-lock.json", "打開", "classroom-door", "blocked", "門上鎖")
        self.expect_step("door-lock.json", "解鎖", "classroom-door", "blocked", "鑰匙")
        self.expect_step("door-lock.json", "使用 Alohomora", "classroom-door", "blocked", "不會開鎖咒")

    def test_protected_door_resists_alohomora(self):
        self.expect_step("door-lock.json", "使用 Alohomora", "storeroom-door", "failure", "防護")

    def test_letter_already_opened(self):
        self.expect_step("letter.json", "拆信", "letter-home", "blocked", "已經拆閱")

    def test_cauldron_without_fire(self):
        self.expect_step("cauldron.json", "加熱", "cauldron", "blocked", "沒有火源")

    def test_restricted_book_without_permission(self):
        self.expect_step("library-book.json", "借閱", "restricted-tome", "blocked", "教授簽名")

    def test_hungry_pet_refuses_training(self):
        self.expect_step("pet.json", "訓練", "owl", "failure", "太餓")


class RunnerCatchesRegressionsTests(unittest.TestCase):
    """Wrong expectations or broken rules must make the replay fail."""

    def test_wrong_expected_state_is_reported(self):
        data = load("door-lock.json")
        data["steps"][0]["expect"]["objects"]["classroom-door"]["state"]["locked"] = False
        errors, _ = sc.replay(data)
        self.assertTrue(any("classroom-door.state.locked" in e for e in errors), errors)

    def test_wrong_expected_outcome_is_reported(self):
        data = load("letter.json")
        data["steps"][-1]["expect"]["outcome"] = "success"
        errors, _ = sc.replay(data)
        self.assertTrue(any("結果應為 success" in e for e in errors), errors)

    def test_wrong_clock_is_reported(self):
        data = load("cauldron.json")
        for step in data["steps"]:
            if step.get("wait") == 1:
                step["expect"]["clock"] = "1991-10-17 14:30"
        errors, _ = sc.replay(data)
        self.assertTrue(any("時間應為" in e for e in errors), errors)

    def test_removing_a_precondition_breaks_the_scenario(self):
        data = load("cauldron.json")
        heat = data["objects"]["cauldron"]["verbs"]["加熱"]
        heat["requires"] = [c for c in heat["requires"] if c.get("object") != "burner"]
        errors, _ = sc.replay(data)
        self.assertTrue(errors, "cauldron heated without fire should break the replay")

    def test_skipping_consumption_breaks_the_scenario(self):
        data = load("library-book.json")
        notes = data["objects"]["charm-reference"]["verbs"]["做筆記"]
        notes["branches"][0]["effects"] = [e for e in notes["branches"][0]["effects"] if "consume" not in e]
        errors, _ = sc.replay(data)
        self.assertTrue(any("parchment" in e for e in errors), errors)


class EngineTests(unittest.TestCase):
    def test_blocked_attempt_leaves_state_and_clock_unchanged(self):
        world = sc.World(mini_door())
        result = world.perform({"actor": "a", "verb": "打開", "target": "door"})
        self.assertEqual(result, {"outcome": "blocked", "reason": "門上鎖"})
        self.assertEqual(world.objects["door"]["state"], {"open": False, "locked": True})
        self.assertEqual(sc.fmt(world.clock), "1991-09-01 12:00")

    def test_unreachable_target_is_blocked_before_preconditions(self):
        data = mini_door(locked=False)
        data["actors"]["a"]["location"] = "大廳"
        result = sc.World(data).perform({"actor": "a", "verb": "打開", "target": "door"})
        self.assertEqual(result["reason"], sc.UNREACHABLE)

    def test_unknown_verb_is_blocked_not_invented(self):
        result = sc.World(mini_door()).perform({"actor": "a", "verb": "變成鳥", "target": "door"})
        self.assertEqual(result, {"outcome": "blocked", "reason": sc.UNSUPPORTED})

    def test_success_applies_effects_and_time(self):
        world = sc.World(mini_door(locked=False))
        self.assertEqual(world.perform({"actor": "a", "verb": "打開", "target": "door"})["outcome"], "success")
        self.assertTrue(world.objects["door"]["state"]["open"])
        self.assertEqual(sc.fmt(world.clock), "1991-09-01 12:01")

    def test_scheduled_effects_fire_in_due_order(self):
        world = sc.World(mini_door())
        world.apply([
            {"schedule": {"after": 20, "effects": [{"set": {"mark": "late"}}]}},
            {"schedule": {"after": 10, "effects": [{"set": {"mark": "early"}}, {"event": "early"}]}},
        ], "a", "door")
        world.advance(15)
        self.assertEqual(world.objects["door"]["state"]["mark"], "early")
        self.assertEqual(world.events, ["1991-09-01 12:10 early"])
        world.advance(5)
        self.assertEqual(world.objects["door"]["state"]["mark"], "late")

    def test_invariant_flags_object_in_two_places(self):
        world = sc.World(mini_door())
        world.objects["door"]["holder"] = "a"
        self.assertTrue(any("恰好有一個持有人或一個位置" in p for p in world.invariants()))

    def test_invariant_flags_negative_quantity_and_unknown_holder(self):
        world = sc.World(mini_door())
        world.objects["door"].update({"holder": "ghost", "location": None, "quantity": -1})
        problems = world.invariants()
        self.assertTrue(any("持有人不存在" in p for p in problems))
        self.assertTrue(any("數量無效" in p for p in problems))

    def test_over_consumption_is_a_scenario_error(self):
        world = sc.World(mini_door())
        world.objects["door"]["quantity"] = 0
        with self.assertRaises(sc.ScenarioError):
            world.apply([{"consume": 1}], "a", "door")


class SchemaTests(unittest.TestCase):
    def test_spec_verbs_are_parsed(self):
        for verb in ("打開", "解鎖", "閱讀", "交付", "充能", "借閱", "放材料", "餵食", "訓練", "使用 Alohomora"):
            self.assertIn(verb, VERBS)

    def test_canonical_verb_must_come_from_spec(self):
        data = mini_door()
        data["objects"]["door"]["verbs"]["打開"]["canonical"] = "瞬移"
        data["steps"] = [{"turn": 1, "actor": "a", "verb": "打開", "target": "door",
                          "expect": {"outcome": "blocked"}},
                         {"turn": 2, "wait": 1, "expect": {"outcome": "waited"}}]
        self.assertTrue(any("canonical" in e for e in sc.schema_errors(data, VERBS, SECTIONS)))

    def test_scenario_without_blocked_case_or_single_turn_is_rejected(self):
        data = mini_door(locked=False)
        data["steps"] = [{"turn": 1, "actor": "a", "verb": "打開", "target": "door",
                          "expect": {"outcome": "success"}}]
        errors = sc.schema_errors(data, VERBS, SECTIONS)
        self.assertTrue(any("blocked" in e for e in errors))
        self.assertTrue(any("兩個回合" in e for e in errors))

    def test_precondition_without_reason_and_unknown_object_are_rejected(self):
        data = mini_door()
        data["objects"]["door"]["verbs"]["打開"]["requires"] = [{"actor_holds": "no-such-key"}]
        errors = sc.schema_errors(data, VERBS, SECTIONS)
        self.assertTrue(any("失敗理由" in e for e in errors))
        self.assertTrue(any("no-such-key" in e for e in errors))

    def test_rule_reference_must_exist_in_spec(self):
        data = mini_door()
        data["rules"] = ["十一、不存在的章節"]
        self.assertTrue(any("規則章節不存在" in e for e in sc.schema_errors(data, VERBS, SECTIONS)))


if __name__ == "__main__":
    unittest.main()
