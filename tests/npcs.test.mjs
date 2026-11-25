// NPC 模組測試：node --test tests/
// docs/ 沒有 package.json，.js 在舊版 Node 會被當成 CommonJS，所以先複製成 .mjs 再載入。
import { test } from "node:test";
import assert from "node:assert/strict";
import { copyFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tmp = join(mkdtempSync(join(tmpdir(), "npcs-")), "npcs.mjs");
copyFileSync(join(root, "docs/js/npcs.js"), tmp);
const M = await import(pathToFileURL(tmp).href);
const { NPCS, NpcDirector, scheduleAt, toMinutes, dayOfWeek, SCENE_NAMES, REQUIRED_SPOTS } = M;

const at = (day, hhmm) => ({ day, minutes: toMinutes(hhmm) });

// 模擬引擎：每個場景 20×14 公尺，具名位置依序排開，出口在四邊。
function mockApi(log = []) {
  const state = { scene: null, chars: new Set() };
  const exits = { library: [19, 7], hall: [10, 13], courtyard: [1, 7], corridor: [10, 1], classroom: [19, 1], greenhouse: [1, 13], grounds: [10, 13] };
  return {
    state,
    spawnCharacter(look) { const c = { look, walking: false, faced: [], group: { position: { set(x, y, z) { c.x = x; c.z = z; } } }, face(dx, dy) { c.faced.push([dx, dy]); } }; state.chars.add(c); return c; },
    removeCharacter(c) { state.chars.delete(c); },
    findPath(from, to) { return [{ x: (from.x + to.x) / 2, z: from.z }, { x: to.x, z: to.z }]; },
    sceneSpot(name) { const list = REQUIRED_SPOTS[state.scene] || []; const i = list.indexOf(name); return i < 0 ? null : [2 + i * 2.5, 5 + (i % 2) * 3]; },
    exitTo(id) { return exits[id] ? { x: exits[id][0], z: exits[id][1] } : null; },
    notify(evt) { log.push(evt); },
  };
}
function director(scene, clock, log) {
  const api = mockApi(log); api.state.scene = scene;
  const d = new NpcDirector(api); d.enterScene(scene, clock); return { d, api };
}
function run(d, clock, seconds) { for (let i = 0; i < seconds * 10; i++) d.update(0.1, clock); }

test("日程資料完整：場景、時間、具名位置都合法，同一天不重疊", () => {
  const canon = /Harry|Hermione|Ron |Weasley|Dumbledore|Snape|McGonagall|Hagrid|Filch|Pince|Sprout|Flitwick|Malfoy|Potter|Granger|Longbottom|Lovegood/i;
  const ids = new Set();
  for (const npc of NPCS) {
    assert.ok(!ids.has(npc.id), "重複 id " + npc.id); ids.add(npc.id);
    assert.ok(!canon.test(npc.name), "不得使用原著角色：" + npc.name);
    assert.ok(["reader", "curly", "bookish", "tall", "librarian", "professor", "gardener", "redhead"].includes(npc.look), npc.id + " look");
    for (const key of ["intro", "greet", "chat", "generic", "busy", "annoyed", "scheduleVague", "leaving", "saw"]) assert.ok(npc.lines[key], npc.id + " 缺台詞 " + key);
    for (let dow = 1; dow <= 7; dow++) {
      const today = npc.schedule.filter(e => !e.days || e.days === "all" || (e.days === "weekday" && dow <= 5) || (e.days === "weekend" && dow >= 6) || (Array.isArray(e.days) && e.days.includes(dow)))
        .map(e => [toMinutes(e.from), toMinutes(e.to), e]).sort((a, b) => a[0] - b[0]);
      for (let i = 0; i < today.length; i++) {
        const [f, t, e] = today[i];
        assert.ok(f < t && t <= 1440, `${npc.id} ${e.from}-${e.to}`);
        assert.ok(SCENE_NAMES[e.scene], `${npc.id} 未知場景 ${e.scene}`);
        for (const s of [].concat(e.spot)) assert.ok(REQUIRED_SPOTS[e.scene].includes(s), `${npc.id} ${e.scene} 缺位置 ${s}`);
        if (i) assert.ok(today[i - 1][1] <= f, `${npc.id} 星期${dow} ${today[i - 1][2].from} 與 ${e.from} 重疊`);
      }
    }
  }
  assert.ok(NPCS.length >= 6);
});

test("依星期與時間決定所在位置", () => {
  const lenore = NPCS.find(n => n.id === "lenore");
  assert.equal(dayOfWeek(1), 1); assert.equal(dayOfWeek(6), 6); assert.equal(dayOfWeek(8), 1);
  assert.equal(scheduleAt(lenore, at(1, "14:20")).scene, "library");
  assert.equal(scheduleAt(lenore, at(1, "09:30")).scene, "classroom");   // 星期一
  assert.equal(scheduleAt(lenore, at(2, "09:30")).scene, "greenhouse");  // 星期二
  assert.equal(scheduleAt(lenore, at(6, "09:30")).activity, "找書");     // 星期六
  assert.equal(scheduleAt(lenore, at(1, "23:00")), null);                 // 宿舍
  // 同一段日程內會在不同位置之間走動
  const a = scheduleAt(lenore, at(1, "13:05")), b = scheduleAt(lenore, at(1, "13:25"));
  assert.notEqual(a.spot, b.spot);
});

test("進入場景時生成在場 NPC，時間到了會走向出口並離開", () => {
  const log = [];
  const { d, api } = director("library", at(1, "14:20"), log);
  assert.deepEqual(d.present().map(p => p.id).sort(), ["hester", "lenore", "oswin", "rafe"]);
  assert.equal(api.state.chars.size, 4);
  run(d, at(1, "15:00"), 1);
  const oswin = d.present().find(p => p.id === "oswin");
  assert.ok(oswin && oswin.leaving, "教授應該正在離開");
  assert.ok(oswin.char.walking);
  run(d, at(1, "15:00"), 30);
  assert.ok(!d.present().some(p => p.id === "oswin"), "教授走到出口後應被移除");
  assert.equal(api.state.chars.size, 3);
  assert.ok(log.some(e => e.type === "leave" && e.npcId === "oswin" && e.text.includes("魔咒學教室")));
});

test("NPC 從上一個場景的門口進來，再走到日程位置", () => {
  const log = [];
  const { d } = director("library", at(1, "12:30"), log);
  assert.ok(!d.present().some(p => p.id === "lenore"));
  d.update(0.1, at(1, "13:00"));
  const l = d.present().find(p => p.id === "lenore");
  assert.ok(l, "Lenore 13:00 應進入圖書館");
  assert.ok(Math.hypot(l.x - 10, l.z - 13) < 0.5, "應從通往大廳的門進來");
  assert.ok(log.some(e => e.type === "arrive" && e.npcId === "lenore"));
  const start = { x: l.x, z: l.z };
  run(d, at(1, "13:00"), 20);
  const l2 = d.present().find(p => p.id === "lenore");
  assert.ok(Math.hypot(l2.x - start.x, l2.z - start.z) > 1, "應該走離門口");
  assert.equal(l2.walking, false, "到位後停下");
  assert.ok(l2.char.faced.length > 0, "移動時會轉向");
});

test("夜間巡邏遇到玩家觸發宵禁事件，一晚只觸發一次並記住", () => {
  const log = [];
  const { d } = director("corridor", at(1, "21:40"), log);
  d.update(0.1, at(1, "21:40"));
  d.update(0.1, at(1, "21:45"));
  const curfew = log.filter(e => e.type === "curfew");
  assert.equal(curfew.length, 1);
  assert.ok(d.relationship("rafe").flags.includes("caught-after-curfew"));
  assert.equal(d.relationship("rafe").trust, 7);
});

test("對話：初次見面、閒聊、行程、幫忙、上課中、太煩", () => {
  const { d } = director("library", at(1, "14:20"));
  let r = d.talk("lenore", {});
  assert.match(r.text, /Lenore Ashford/);
  assert.ok(d.relationship("lenore").met);
  assert.deepEqual(r.options.map(o => o.id), ["chat", "schedule", "favor", "bye"]);
  r = d.talk("lenore", {}, "schedule");
  assert.equal(r.text, NPCS.find(n => n.id === "lenore").lines.scheduleVague, "不熟時不透露行程");
  r = d.talk("lenore", {}, "chat");
  assert.ok(r.minutes > 0);
  r = d.talk("lenore", {}, "favor");
  assert.ok(r.text.includes("謝謝"));
  assert.ok(d.relationship("lenore").familiarity >= 12);
  assert.ok(!d.talk("lenore", {}).options.some(o => o.id === "favor"), "同一天只能幫一次");
  r = d.talk("lenore", {}, "schedule");
  assert.match(r.text, /15:30 我會在/);
  d.talk("lenore", {}); d.talk("lenore", {});
  r = d.talk("lenore", {});
  assert.equal(r.text, NPCS.find(n => n.id === "lenore").lines.annoyed);

  const { d: d2 } = director("greenhouse", at(1, "14:00"));
  const favor = d2.talk("maeve", {}, "favor");
  assert.equal(favor.effects.item, "銀脈蕨葉片");

  const { d: d3 } = director("classroom", at(1, "09:30"));
  assert.equal(d3.talk("oswin", {}).text, NPCS.find(n => n.id === "oswin").lines.busy);
  assert.match(d3.talk("maeve", {}).text, /不在這裡/);
});

test("NPC 只知道親眼看到的事", () => {
  const { d } = director("library", at(1, "14:20"));
  const seen = d.witness("read-old-book");
  assert.deepEqual(seen.sort(), ["hester", "lenore", "oswin", "rafe"]);
  assert.ok(!d.relationship("tobias").flags.includes("saw:read-old-book"));
  d.talk("lenore", {});
  assert.match(d.talk("lenore", {}, "chat").text, /紙/);
  assert.ok(!/紙條|拿出一張紙/.test(d.talk("lenore", {}, "chat").text), "同一件事只提一次");
});

test("存檔與讀檔：互動狀態保留，壞資料不會讓遊戲壞掉", () => {
  const { d } = director("library", at(1, "14:20"));
  d.talk("hester", {}); d.talk("hester", {}, "favor"); d.witness("read-old-book");
  const saved = JSON.parse(JSON.stringify(d.serialize()));
  const { d: d2 } = director("hall", at(3, "12:10"));
  assert.ok(d2.load(saved));
  assert.deepEqual(d2.relationship("hester"), d.relationship("hester"));
  assert.equal(d2.load({ v: 1, rel: { hester: { familiarity: "x", trust: 999, flags: [1, "ok"] }, ghost: {} } }), true);
  assert.equal(d2.relationship("hester").familiarity, 0);
  assert.equal(d2.relationship("hester").trust, 100);
  assert.deepEqual(d2.relationship("hester").flags, ["ok"]);
  assert.equal(d2.load(null), false);
  assert.equal(d2.relationship("hester").met, false);
});
