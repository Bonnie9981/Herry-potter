// NPC 系統：原創角色、依遊戲時間的日程、場景內移動與可存檔的互動狀態。
// 本模組不 import three，也不碰 DOM；所有畫面相關動作都透過引擎提供的 api。
// 介面見 docs/js/CONTRACT.md 與 docs/js/NPCS.md。

export const SCENE_NAMES = {
  library: "圖書館", hall: "大廳", courtyard: "庭院", corridor: "移動樓梯廊",
  classroom: "魔咒學教室", greenhouse: "溫室", grounds: "黑湖湖畔",
};

// 各場景需要提供的 npcSpots 名稱（缺少時退回「中央」）。
export const REQUIRED_SPOTS = {
  library: ["中央", "書桌前", "靠窗書桌", "書架間", "索引櫃", "借閱櫃台"],
  hall: ["中央", "長桌東", "長桌西", "教師席", "公告欄"],
  courtyard: ["中央", "噴泉旁", "拱廊", "草地"],
  corridor: ["中央", "樓梯口", "肖像前", "窗台"],
  classroom: ["中央", "講台", "前排座位", "後排座位", "練習區"],
  greenhouse: ["中央", "盆栽架", "工作台", "澆水處"],
  grounds: ["中央", "湖岸", "草坡", "林邊小徑"],
};

const WALK_SPEED = 1.35;          // 公尺／秒（真實時間）
const CURFEW_FROM = 21 * 60 + 30; // 21:30 之後算夜遊
const CURFEW_TO = 5 * 60;
const DEFAULT_CAM_YAW = 0.62;

export const toMinutes = s => { const [h, m] = String(s).split(":").map(Number); return h * 60 + m; };
export const fmt = m => String(Math.floor(m / 60) % 24).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
// 第 1 天為星期一。
export const dayOfWeek = day => ((Math.max(1, day | 0) - 1) % 7) + 1;
const absMinutes = c => (c.day - 1) * 1440 + c.minutes;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const pick = (arr, seed) => arr[Math.abs(seed | 0) % arr.length];

function dayMatches(days, dow) {
  if (!days || days === "all") return true;
  if (days === "weekday") return dow <= 5;
  if (days === "weekend") return dow >= 6;
  return Array.isArray(days) && days.includes(dow);
}

// ---------- 原創角色 ----------
// 所有名字與設定為本遊戲原創，不使用原著角色。依模擬器規則，稱呼用英文名。
export const NPCS = [
  {
    id: "lenore", name: "Lenore Ashford", zh: "莉諾・艾許福德", look: "bookish",
    role: "四年級學生，圖書館常客",
    profile: "做事有條理，筆記抄得比教科書還整齊。表面冷淡，其實很在意別人是否尊重書。最近在找一本被人借走後就沒還回來的舊咒語書。",
    home: { label: "宿舍", via: "corridor", alt: "hall" },
    schedule: [
      { from: "07:30", to: "08:20", scene: "hall", spot: "長桌東", activity: "早餐" },
      { days: [1, 3, 5], from: "09:00", to: "10:30", scene: "classroom", spot: "前排座位", activity: "魔咒學課", busy: true },
      { days: [2, 4], from: "09:00", to: "10:30", scene: "greenhouse", spot: "工作台", activity: "藥草學課", busy: true },
      { days: "weekday", from: "10:40", to: "12:00", scene: "library", spot: ["書桌前", "書架間"], dwell: 25, activity: "自習" },
      { days: "weekend", from: "09:00", to: "12:00", scene: "library", spot: ["靠窗書桌", "書架間", "索引櫃"], dwell: 30, activity: "找書" },
      { from: "12:00", to: "12:50", scene: "hall", spot: "長桌東", activity: "午餐" },
      { from: "13:00", to: "15:30", scene: "library", spot: ["書桌前", "書架間", "索引櫃"], dwell: 20, activity: "抄筆記",
        favor: { label: "幫她找參考書", minutes: 20, familiarity: 5, trust: 5, text: "你們在書架間找了二十分鐘，終於翻到她要的那本。Lenore 鬆了口氣：「謝謝。很少有人願意陪我翻這麼久。」" } },
      { days: [2, 4], from: "15:30", to: "16:30", scene: "courtyard", spot: "拱廊", activity: "透氣散步" },
      { days: [1, 3, 5, 6, 7], from: "15:30", to: "18:00", scene: "library", spot: ["靠窗書桌", "書架間"], dwell: 30, activity: "找那本失蹤的書" },
      { days: [2, 4], from: "16:30", to: "18:00", scene: "library", spot: ["靠窗書桌", "書架間"], dwell: 30, activity: "找那本失蹤的書" },
      { from: "18:00", to: "19:00", scene: "hall", spot: "長桌東", activity: "晚餐" },
      { from: "19:00", to: "21:00", scene: "library", spot: "靠窗書桌", activity: "夜讀" },
    ],
    lines: {
      intro: "她抬起頭，筆尖停在半空。「Lenore Ashford，四年級。你如果要借這一區的書，請先登記。」",
      greet: ["Lenore 瞥了你一眼，又低頭寫字。「有事嗎？」", "Lenore 把筆記往旁邊挪了挪，示意你可以坐。", "Lenore 一看到你就把剛抄好的一頁推過來：「你看這段，我覺得寫得很妙。」"],
      chat: {
        "抄筆記": ["「上課講太快，我只好來這裡把它補完整。」", "她指著一行小字：「這個咒語的手腕角度，課本寫錯了。」"],
        "找那本失蹤的書": ["「我在找一本舊的咒語註解書。借書卡上最後一個名字被墨水塗掉了。」", "「我懷疑有人故意不還。可是證據不夠，不能亂說。」"],
        "夜讀": ["「圖書館九點關門，我習慣讀到最後一刻。」"],
        "早餐": ["「早餐吃太飽會想睡，所以我只喝茶。」"],
      },
      generic: ["「你知道嗎，安靜是這裡最珍貴的東西。」", "「如果你也常來，記得別把書放錯架子。」"],
      busy: "Lenore 用口型對你說：「上課中，等一下。」",
      annoyed: "Lenore 放下筆，嘆了口氣：「你今天已經打斷我好幾次了。」",
      scheduleVague: "「我大多時候都在圖書館。其他的，你不需要知道。」",
      leaving: "「抱歉，我得走了。」她把書抱在胸前，快步離開。",
      saw: { "read-old-book": "她壓低聲音：「我看到你從那本古書裡拿出一張紙。……裡面寫了什麼？那本書，就是我在找的那一套。」" },
    },
  },
  {
    id: "tobias", name: "Tobias Wynter", zh: "托比亞斯・溫特", look: "reader",
    role: "二年級學生，坐不住的辯論家",
    profile: "好動又愛爭論，作業常常寫一半就跑去湖邊打水漂。怕被級長抓到，但總是在宵禁前最後一刻才回宿舍。",
    home: { label: "宿舍", via: "corridor", alt: "courtyard" },
    schedule: [
      { from: "07:40", to: "08:30", scene: "hall", spot: "長桌西", activity: "早餐" },
      { days: "weekday", from: "09:00", to: "10:30", scene: "greenhouse", spot: "盆栽架", activity: "藥草學課", busy: true },
      { days: "weekday", from: "10:40", to: "12:00", scene: "classroom", spot: "後排座位", activity: "魔咒學課", busy: true },
      { days: "weekend", from: "09:30", to: "12:00", scene: "grounds", spot: ["湖岸", "草坡"], dwell: 20, activity: "打水漂" },
      { from: "12:00", to: "13:00", scene: "hall", spot: "長桌西", activity: "午餐" },
      { from: "13:00", to: "13:40", scene: "corridor", spot: ["樓梯口", "肖像前"], dwell: 15, activity: "在樓梯上迷路" },
      { from: "13:40", to: "16:00", scene: "courtyard", spot: ["噴泉旁", "草地"], dwell: 25, activity: "和同學爭論作業" },
      { from: "16:00", to: "18:00", scene: "grounds", spot: ["湖岸", "草坡", "湖岸"], dwell: 20, activity: "打水漂",
        favor: { label: "一起打水漂", minutes: 25, familiarity: 5, trust: 2, text: "你挑了一顆扁平的石頭，跳了四下。Tobias 不服氣地又丟了三顆：「再一次！這次我一定贏。」" } },
      { from: "18:00", to: "19:00", scene: "hall", spot: "長桌西", activity: "晚餐" },
      { from: "19:00", to: "20:40", scene: "courtyard", spot: ["噴泉旁", "拱廊"], dwell: 25, activity: "趕作業" },
      { from: "20:40", to: "21:20", scene: "corridor", spot: "窗台", activity: "拖拖拉拉回宿舍" },
    ],
    lines: {
      intro: "「嘿！你是新來的吧？我是 Tobias。先說好，魔咒學作業那題我是對的。」",
      greet: ["Tobias 正要開口，又把話吞回去：「呃，你好。」", "「嘿，你來得正好！」Tobias 對你揮手。", "Tobias 遠遠就喊你的名字，像是等你很久了。"],
      chat: {
        "和同學爭論作業": ["「懸浮咒到底是手腕先動還是咒語先念？他們都說我錯，你評評理。」"],
        "打水漂": ["「聽說湖裡有東西會把石頭丟回來。我還沒親眼看過。」", "「我最好的紀錄是七下。不要跟別人說我其實數錯了。」"],
        "在樓梯上迷路": ["「這座樓梯剛剛明明往左轉……算了，你知道去教室怎麼走嗎？」"],
        "趕作業": ["「明天要交的論文，我只寫了標題。」"],
      },
      generic: ["「你覺得級長們晚上真的會巡到天亮嗎？」", "「這裡每天都有怪事，好棒。」"],
      busy: "Tobias 對你擠眉弄眼，但教授正看著這邊，他只好假裝在抄筆記。",
      annoyed: "「哇，你今天真黏人。」Tobias 笑著揮揮手，但顯然想去做別的事了。",
      scheduleVague: "「我？哪裡好玩我就在哪裡。」",
      leaving: "「我得走了，再晚會被唸！」Tobias 一溜煙跑掉了。",
      saw: { "read-old-book": "「我看到你在圖書館翻那本超舊的書！裡面有藏寶圖嗎？」" },
    },
  },
  {
    id: "isla", name: "Isla Fenwick", zh: "艾拉・芬威克", look: "redhead",
    role: "一年級新生，和你同一屆",
    profile: "麻瓜家庭出身，對一切都好奇，口袋裡總是裝著一本自己畫的城堡地圖，地圖上錯誤百出。",
    home: { label: "宿舍", via: "corridor", alt: "hall" },
    schedule: [
      { from: "07:20", to: "08:10", scene: "hall", spot: ["公告欄", "長桌西"], dwell: 20, activity: "邊吃早餐邊看公告" },
      { days: "weekday", from: "09:00", to: "10:30", scene: "classroom", spot: "前排座位", activity: "魔咒學課", busy: true },
      { days: "weekday", from: "10:40", to: "12:00", scene: "greenhouse", spot: "工作台", activity: "藥草學課", busy: true },
      { days: "weekend", from: "09:00", to: "12:00", scene: "corridor", spot: ["樓梯口", "肖像前", "窗台"], dwell: 20, activity: "畫城堡地圖" },
      { from: "12:00", to: "12:50", scene: "hall", spot: "長桌西", activity: "午餐" },
      { from: "13:00", to: "14:30", scene: "corridor", spot: ["肖像前", "窗台"], dwell: 20, activity: "和肖像聊天",
        favor: { label: "幫她修正地圖", minutes: 15, familiarity: 4, trust: 3, item: "艾拉的手繪地圖（副本）", text: "你指出她地圖上三個畫反的走廊。Isla 很開心，撕下一張副本塞給你：「這張給你，我們一起把它畫完！」" } },
      { from: "14:30", to: "16:30", scene: "library", spot: ["索引櫃", "書架間"], dwell: 20, activity: "查魔法生物圖鑑" },
      { from: "16:30", to: "18:00", scene: "courtyard", spot: ["草地", "噴泉旁"], dwell: 20, activity: "練習魔杖動作" },
      { from: "18:00", to: "19:00", scene: "hall", spot: "長桌西", activity: "晚餐" },
      { from: "19:00", to: "20:30", scene: "grounds", spot: "草坡", activity: "看星星" },
    ],
    lines: {
      intro: "「你也是一年級？太好了！我是 Isla。我正在畫一張城堡地圖，不過它好像一直在改變。」",
      greet: ["Isla 有點害羞地點頭：「嗨。」", "「嗨！」Isla 揮著手上的地圖向你跑來。", "Isla 一見到你就笑開了：「我發現一件超奇怪的事，你一定要聽。」"],
      chat: {
        "和肖像聊天": ["「這幅肖像說他以前是城堡的鐘錶匠，可是他講的時間都是錯的。」"],
        "畫城堡地圖": ["「我發現有一段樓梯星期五會消失一階，你踩過嗎？」"],
        "查魔法生物圖鑑": ["「圖鑑裡說有些生物只在月光下現形。我想去湖邊看看。」"],
        "練習魔杖動作": ["「揮、再輕點……我一直把羽毛吹到別人頭上。」"],
        "看星星": ["「家裡看不到這麼多星星。這裡的天空好像比較靠近。」"],
      },
      generic: ["「你有沒有覺得走廊的畫像都在偷聽？」", "「我爸媽以為這裡是一所寄宿學校而已。嗯，某種程度上沒錯啦。」"],
      busy: "Isla 對你比了個「等等」的手勢，繼續盯著黑板。",
      annoyed: "「我很喜歡跟你聊天，但我真的得專心一下……」",
      scheduleVague: "「我到處跑！你在城堡裡繞一繞就會遇到我。」",
      leaving: "「我先走了，晚點見！」",
      saw: { "read-old-book": "「圖書館那張紙條，我看見了！上面寫什麼？是不是線索？」" },
    },
  },
  {
    id: "rafe", name: "Rafe Okafor", zh: "拉夫・奧卡佛", look: "tall",
    role: "七年級級長，負責夜間巡邏",
    profile: "沉穩、講規矩，但不愛刁難人。他在意的是學生安全，不是扣分。晚上會提著燈在走廊與圖書館巡邏。",
    home: { label: "級長休息室", via: "corridor", alt: "hall" },
    schedule: [
      { from: "07:00", to: "08:00", scene: "hall", spot: "公告欄", activity: "更新公告" },
      { days: "weekday", from: "09:00", to: "12:00", scene: "classroom", spot: "練習區", activity: "協助低年級練習" },
      { from: "12:00", to: "13:00", scene: "hall", spot: "長桌東", activity: "午餐" },
      { from: "13:00", to: "15:00", scene: "library", spot: "靠窗書桌", activity: "準備畢業考", busy: true },
      { from: "15:00", to: "17:00", scene: "courtyard", spot: ["拱廊", "噴泉旁"], dwell: 30, activity: "巡視庭院" },
      { from: "17:00", to: "18:00", scene: "grounds", spot: ["湖岸", "林邊小徑"], dwell: 20, activity: "提醒學生回城堡" },
      { from: "18:00", to: "19:00", scene: "hall", spot: "長桌東", activity: "晚餐" },
      { from: "21:00", to: "22:30", scene: "corridor", spot: ["樓梯口", "肖像前", "窗台"], dwell: 15, activity: "夜間巡邏", patrol: true },
      { from: "22:30", to: "23:30", scene: "library", spot: ["借閱櫃台", "書架間"], dwell: 15, activity: "夜間巡邏", patrol: true },
      { from: "23:30", to: "24:00", scene: "corridor", spot: "樓梯口", activity: "夜間巡邏", patrol: true },
    ],
    lines: {
      intro: "「Rafe Okafor，七年級級長。有事可以找我，迷路也可以。」",
      greet: ["Rafe 點了點頭：「有什麼需要嗎？」", "「又見面了。」Rafe 的語氣緩和了一點。", "Rafe 對你微笑：「今天還好嗎？」"],
      chat: {
        "夜間巡邏": ["「這個時間你應該在宿舍。我送你回去，這次就不扣分。」"],
        "巡視庭院": ["「庭院的噴泉下面有一塊鬆動的石磚，別在附近跑。」"],
        "提醒學生回城堡": ["「天快黑了。禁林那邊不要靠近，我是認真的。」"],
        "更新公告": ["「新的社團招募公告貼在左邊，你可以看看。」"],
      },
      generic: ["「規則不是為了為難你，是因為城堡比你想的更危險。」"],
      busy: "Rafe 頭也不抬：「畢業考，抱歉，晚點再說。」",
      annoyed: "Rafe 揉了揉眉心：「我很忙，有急事再找我。」",
      scheduleVague: "「級長的行程不方便說。不過晚上別亂跑就對了。」",
      leaving: "「我得去下一個巡邏點了。」",
      curfew: "一道燈光照過來。Rafe 舉著油燈：「宵禁已經過了。這次我記下了，回宿舍去。」",
      saw: {},
    },
  },
  {
    id: "hester", name: "Hester Quill", zh: "海絲特・奎爾", look: "librarian",
    role: "圖書館管理員",
    profile: "記得每一本書放在哪個架子、被誰借走、晚還了幾天。對愛惜書的學生格外寬容。",
    home: { label: "管理員室", via: "corridor", alt: "hall" },
    schedule: [
      { from: "07:30", to: "08:00", scene: "hall", spot: "教師席", activity: "早餐" },
      { from: "08:00", to: "12:00", scene: "library", spot: ["借閱櫃台", "書架間", "借閱櫃台"], dwell: 30, activity: "整理書架" },
      { from: "12:00", to: "12:40", scene: "hall", spot: "教師席", activity: "午餐" },
      { from: "12:40", to: "18:00", scene: "library", spot: ["借閱櫃台", "索引櫃", "書架間"], dwell: 35, activity: "整理書架",
        favor: { label: "幫忙歸還書籍", minutes: 20, familiarity: 3, trust: 5, text: "你把一整車書放回原位。Quill 女士檢查了一遍，罕見地點頭：「放得很對。以後有找不到的書，可以來問我。」" } },
      { from: "18:00", to: "18:40", scene: "hall", spot: "教師席", activity: "晚餐" },
      { from: "18:40", to: "21:00", scene: "library", spot: "借閱櫃台", activity: "夜間值班" },
    ],
    lines: {
      intro: "管理員從眼鏡上方打量你。「Quill。這裡的書都有編號，借了就要還。」",
      greet: ["Quill 女士豎起一根手指：「小聲。」", "「找書嗎？」Quill 女士放下手中的登記簿。", "Quill 女士看見你，語氣柔和了：「今天想讀什麼？」"],
      chat: {
        "整理書架": ["「總有人把書塞回錯的架子。我每天都要重排一次。」", "「那本舊咒語註解書？最後借出的紀錄……被人塗掉了。這種事很少見。」"],
        "夜間值班": ["「九點準時關門。不要讓我趕人。」"],
      },
      generic: ["「書會記得是誰對它好。」"],
      busy: "Quill 女士正在登記借書，示意你稍等。",
      annoyed: "「圖書館不是聊天的地方。」",
      scheduleVague: "「我在圖書館。一直都在。」",
      leaving: "「我要去用餐了。別碰櫃台上的東西。」",
      saw: { "read-old-book": "Quill 女士壓低聲音：「你從那本古書裡拿走了什麼？書裡的東西，也屬於圖書館。」" },
    },
  },
  {
    id: "oswin", name: "Professor Oswin Prescott", zh: "奧斯溫・普雷斯考特教授", look: "professor",
    role: "魔咒學教授",
    profile: "說話慢條斯理，喜歡用奇怪的比喻講解咒語。下午固定有辦公時間，願意花時間回答認真的問題。",
    home: { label: "教職員宿舍", via: "corridor", alt: "hall" },
    schedule: [
      { from: "07:30", to: "08:30", scene: "hall", spot: "教師席", activity: "早餐" },
      { days: "weekday", from: "09:00", to: "12:00", scene: "classroom", spot: "講台", activity: "上課", busy: true },
      { days: "weekend", from: "09:00", to: "11:30", scene: "greenhouse", spot: "盆栽架", activity: "和溫室助教喝茶" },
      { from: "12:00", to: "13:00", scene: "hall", spot: "教師席", activity: "午餐" },
      { from: "14:00", to: "15:00", scene: "library", spot: ["書架間", "索引櫃"], dwell: 25, activity: "查閱舊咒語書" },
      { days: "weekday", from: "15:00", to: "17:00", scene: "classroom", spot: ["講台", "練習區"], dwell: 30, activity: "辦公時間",
        favor: { label: "請教咒語", minutes: 30, familiarity: 3, trust: 4, text: "Prescott 教授拿起一根羽毛示範：「想像你的手腕是一扇門，咒語是推門的風。」你試了三次，第三次羽毛終於離開桌面。" } },
      { from: "18:00", to: "19:00", scene: "hall", spot: "教師席", activity: "晚餐" },
    ],
    lines: {
      intro: "「啊，新面孔。我是 Prescott，教魔咒學。上課時坐前面一點，好嗎？」",
      greet: ["Prescott 教授客氣地點頭：「有什麼問題嗎？」", "「啊，是你。」教授的眼睛笑彎了。", "「我正想到你上次問的問題。」Prescott 教授說。"],
      chat: {
        "辦公時間": ["「魔咒是一種對話。你得先學會聽，才能讓它回應。」"],
        "查閱舊咒語書": ["「有一本我常用的註解書不見了，Quill 女士氣壞了。」"],
        "和溫室助教喝茶": ["「Calloway 小姐泡的茶有股泥土味，但我喜歡。」"],
      },
      generic: ["「好奇心是最好的魔杖。」"],
      busy: "Prescott 教授正在講課，對你比了一個「請坐好」的手勢。",
      annoyed: "「我很樂意回答問題，但不是同一個問題問三遍。」",
      scheduleVague: "「教授的行程是祕密——開玩笑的，看課表吧。」",
      leaving: "「抱歉，我得去準備下一堂課了。」",
      saw: { "read-old-book": "教授若有所思地看著你：「聽說你在圖書館發現了一張紙條。有時候，舊書比新書更多話。」" },
    },
  },
  {
    id: "maeve", name: "Maeve Calloway", zh: "梅芙・卡洛威", look: "gardener",
    role: "溫室助教",
    profile: "爽朗、手上永遠沾著泥土。對植物比對人有耐心，但會記住每一個幫過忙的學生。",
    home: { label: "溫室小屋", via: "grounds", alt: "courtyard" },
    schedule: [
      { from: "07:00", to: "07:40", scene: "hall", spot: "教師席", activity: "早餐" },
      { from: "08:00", to: "12:00", scene: "greenhouse", spot: ["澆水處", "盆栽架", "工作台"], dwell: 30, activity: "照料植物" },
      { from: "12:00", to: "12:50", scene: "hall", spot: "教師席", activity: "午餐" },
      { from: "13:00", to: "17:00", scene: "greenhouse", spot: ["盆栽架", "澆水處", "工作台"], dwell: 30, activity: "照料植物",
        favor: { label: "幫忙照料植物", minutes: 25, familiarity: 3, trust: 5, item: "銀脈蕨葉片", text: "你幫 Maeve 替一整排銀脈蕨換盆。她剪下一片葉子給你：「拿去，泡水會發出微光。你手很穩。」" } },
      { from: "17:00", to: "17:50", scene: "grounds", spot: ["湖岸", "林邊小徑"], dwell: 25, activity: "採集湖邊水草" },
      { from: "18:00", to: "19:00", scene: "hall", spot: "教師席", activity: "晚餐" },
    ],
    lines: {
      intro: "「小心那盆，它會咬人。我是 Maeve，溫室助教。你是來幫忙的，還是來迷路的？」",
      greet: ["Maeve 頭也不抬：「戴手套。」", "「喔，是你！」Maeve 把鏟子插進土裡。", "Maeve 笑著遞給你一雙手套：「來得正好。」"],
      chat: {
        "照料植物": ["「這盆在下雨前會捲起葉子。比預言課準多了。」", "「植物不會說謊。它們不舒服，你一眼就看得出來。」"],
        "採集湖邊水草": ["「湖邊的水草要在黃昏前採，晚一點就會縮回水裡。」"],
      },
      generic: ["「你身上有股書的味道。多來曬曬太陽吧。」"],
      busy: "Maeve 正在示範換盆，只能對你點個頭。",
      annoyed: "「我手上這株再不處理就要枯了，晚點聊？」",
      scheduleVague: "「找我？去有泥土的地方。」",
      leaving: "「我得去採水草了，天要黑了。」",
      saw: {},
    },
  },
];

const NPC_BY_ID = new Map(NPCS.map(n => [n.id, n]));

// 依時間計算 NPC 該在哪裡。回傳 null 表示不在任何場景（宿舍、辦公室等）。
export function scheduleAt(npc, clock) {
  const dow = dayOfWeek(clock.day);
  const m = ((clock.minutes % 1440) + 1440) % 1440;
  const list = npc.schedule;
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (!dayMatches(e.days, dow)) continue;
    const from = toMinutes(e.from), to = toMinutes(e.to);
    if (m < from || m >= to) continue;
    let spot = e.spot, spotIndex = 0;
    if (Array.isArray(spot) && typeof spot[0] === "string") {
      spotIndex = Math.floor((m - from) / (e.dwell || 20)) % spot.length;
      spot = spot[spotIndex];
    }
    return { entry: e, index: i, scene: e.scene, spot, spotKey: i + ":" + spotIndex, activity: e.activity, from, to };
  }
  return null;
}

// 當天接下來的日程（不含目前這段）。
export function nextEntries(npc, clock, count = 2) {
  const dow = dayOfWeek(clock.day), m = clock.minutes;
  return npc.schedule
    .filter(e => dayMatches(e.days, dow) && toMinutes(e.from) > m)
    .sort((a, b) => toMinutes(a.from) - toMinutes(b.from))
    .slice(0, count);
}

// 進場前一段日程所在的場景，用來決定 NPC 從哪個門進來。
function previousScene(npc, clock, current) {
  const dow = dayOfWeek(clock.day);
  const start = current.from;
  let best = null;
  for (const e of npc.schedule) {
    if (!dayMatches(e.days, dow)) continue;
    const to = toMinutes(e.to);
    if (to <= start && start - to <= 30 && (!best || to > toMinutes(best.to))) best = e;
  }
  return best ? best.scene : npc.home.via;
}

function newRelation() {
  return { met: false, familiarity: 0, trust: 10, flags: [], talkLog: [], lastChatAt: -1e9, favorDay: 0, curfewNight: 0 };
}

export function tierOf(rel) {
  if (!rel.met) return 0;
  if (rel.familiarity >= 40 && rel.trust >= 30) return 2;
  return rel.familiarity >= 12 ? 1 : 0;
}
export const TIER_LABELS = ["陌生", "認識", "朋友"];

export class NpcDirector {
  constructor(api = {}, { npcs = NPCS } = {}) {
    this.api = api;
    this.npcs = npcs;
    this.byId = new Map(npcs.map(n => [n.id, n]));
    this.rel = Object.fromEntries(npcs.map(n => [n.id, newRelation()]));
    this.actors = new Map();
    this.scene = null;
    this.clock = { day: 1, minutes: 0 };
    this.events = [];
    this.camYaw = Number.isFinite(api.camYaw) ? api.camYaw : DEFAULT_CAM_YAW;
    this._warned = new Set();
  }

  // ---------- 位置 ----------
  resolveSpot(sceneId, spot) {
    if (Array.isArray(spot) && spot.length === 2 && spot.every(Number.isFinite)) return { x: spot[0], z: spot[1] };
    const toPoint = p => p ? (Array.isArray(p) ? { x: p[0], z: p[1] } : { x: p.x, z: p.z }) : null;
    let p = toPoint(this.api.sceneSpot ? this.api.sceneSpot(spot) : null);
    if (!p) {
      const key = sceneId + "/" + spot;
      if (!this._warned.has(key)) { this._warned.add(key); console.warn("[npcs] 場景缺少 npcSpots：" + key + "，改用「中央」"); }
      p = toPoint(this.api.sceneSpot ? this.api.sceneSpot("中央") : null);
    }
    return p;
  }
  // 同一個具名位置有多人時，後到的人圍在旁邊站，避免疊在一起。
  _spotFor(npcId, want) {
    const p = this.resolveSpot(this.scene, want.spot);
    if (!p) return null;
    const key = JSON.stringify(want.spot);
    let slot = 0;
    for (const a of this.actors.values()) if (a.id !== npcId && a.mode !== "leave" && a.spotName === key) slot++;
    if (!slot) return p;
    const ang = slot * 2.1;
    return { x: p.x + Math.cos(ang) * 0.8, z: p.z + Math.sin(ang) * 0.8 };
  }
  exitPoint(toScene, fallbackScene) {
    const get = s => {
      if (!s || s === this.scene || !this.api.exitTo) return null;
      const p = this.api.exitTo(s);
      return p ? (Array.isArray(p) ? { x: p[0], z: p[1] } : { x: p.x, z: p.z }) : null;
    };
    return get(toScene) || get(fallbackScene) || null;
  }

  // ---------- 生命週期 ----------
  enterScene(sceneId, clock) {
    for (const a of this.actors.values()) this._despawn(a);
    this.actors.clear();
    this.scene = sceneId;
    if (clock) this.clock = { day: clock.day, minutes: clock.minutes };
    for (const npc of this.npcs) {
      const want = scheduleAt(npc, this.clock);
      if (!want || want.scene !== sceneId) continue;
      const p = this._spotFor(npc.id, want);
      if (p) this._spawn(npc, p, want, false);
    }
  }

  update(dt, clock) {
    if (clock) this.clock = { day: clock.day, minutes: clock.minutes };
    if (!this.scene) return;
    for (const npc of this.npcs) {
      const want = scheduleAt(npc, this.clock);
      const a = this.actors.get(npc.id);
      const here = want && want.scene === this.scene;
      if (a) {
        if (!here) {
          if (a.mode !== "leave") {
            const dest = want ? want.scene : npc.home.via;
            const door = this.exitPoint(dest, npc.home.via === this.scene ? npc.home.alt : npc.home.via);
            a.mode = "leave"; a.leavingTo = dest;
            if (door) this._route(a, door); else { this._remove(npc, a, dest); continue; }
          }
        } else if (a.mode === "leave" || want.spotKey !== a.spotKey) {
          const p = this._spotFor(npc.id, want);
          a.mode = "walk"; a.spotKey = want.spotKey; a.want = want; a.spotName = JSON.stringify(want.spot);
          if (p) this._route(a, p);
        } else {
          a.want = want;
        }
        this._step(a, dt);
        if (a.mode === "leave" && !a.path.length) this._remove(npc, a, a.leavingTo);
      } else if (here) {
        const spot = this._spotFor(npc.id, want);
        if (!spot) continue;
        const from = previousScene(npc, this.clock, want);
        const door = this.exitPoint(from, npc.home.via === this.scene ? npc.home.alt : npc.home.via);
        const actor = this._spawn(npc, door || spot, want, !!door);
        if (door) this._route(actor, spot);
        this._emit({ type: "arrive", npcId: npc.id, text: npc.name + " 走了進來。" });
      }
      this._checkCurfew(npc);
    }
  }

  _spawn(npc, p, want, walking) {
    const char = this.api.spawnCharacter ? this.api.spawnCharacter(npc.look) : null;
    const actor = { id: npc.id, char, pos: { x: p.x, z: p.z }, path: [], mode: walking ? "walk" : "idle", spotKey: want.spotKey, spotName: JSON.stringify(want.spot), want };
    this._place(actor);
    this.actors.set(npc.id, actor);
    return actor;
  }
  _despawn(a) { if (a.char && this.api.removeCharacter) this.api.removeCharacter(a.char); }
  _remove(npc, a, dest) {
    this._despawn(a);
    this.actors.delete(npc.id);
    const where = SCENE_NAMES[dest] || npc.home.label;
    this._emit({ type: "leave", npcId: npc.id, text: npc.name + " 往" + where + "去了。" });
  }
  _route(a, to) {
    let path = this.api.findPath ? this.api.findPath({ x: a.pos.x, z: a.pos.z }, { x: to.x, z: to.z }) : null;
    if (!Array.isArray(path) || !path.length) path = [{ x: to.x, z: to.z }];
    a.path = path.map(p => ({ x: p.x, z: p.z }));
  }
  _step(a, dt) {
    let budget = WALK_SPEED * Math.max(0, dt);
    let moved = false, mdx = 0, mdz = 0;
    while (budget > 0 && a.path.length) {
      const t = a.path[0], dx = t.x - a.pos.x, dz = t.z - a.pos.z, d = Math.hypot(dx, dz);
      if (d <= budget) { a.pos.x = t.x; a.pos.z = t.z; a.path.shift(); budget -= d; }
      else { a.pos.x += dx / d * budget; a.pos.z += dz / d * budget; budget = 0; }
      if (d > 1e-6) { mdx = dx; mdz = dz; moved = true; }
    }
    if (!a.path.length && a.mode === "walk") a.mode = "idle";
    if (a.char) {
      a.char.walking = moved;
      if (moved && a.char.face) {
        const c = Math.cos(this.camYaw), s = Math.sin(this.camYaw), n = Math.hypot(mdx, mdz) || 1;
        // 世界 (x,z) → 畫面：右 = (cos, -sin)，往畫面上方 = (-sin, -cos)
        a.char.face((mdx * c - mdz * s) / n, (-mdx * s - mdz * c) / n);
      }
    }
    this._place(a);
  }
  _place(a) {
    if (a.char && a.char.group && a.char.group.position) a.char.group.position.set(a.pos.x, 0, a.pos.z);
  }
  _emit(evt) {
    this.events.push(evt);
    if (this.events.length > 50) this.events.shift();
    if (typeof this.api.notify === "function") this.api.notify(evt);
  }
  drainEvents() { const e = this.events; this.events = []; return e; }

  _checkCurfew(npc) {
    const a = this.actors.get(npc.id);
    if (!a || a.mode === "leave" || !a.want || !a.want.entry.patrol) return;
    const m = this.clock.minutes;
    if (!(m >= CURFEW_FROM || m < CURFEW_TO)) return;
    const night = m < CURFEW_TO ? this.clock.day - 1 : this.clock.day;
    const rel = this.rel[npc.id];
    if (rel.curfewNight === night) return;
    rel.curfewNight = night;
    rel.trust = clamp(rel.trust - 3, 0, 100);
    this._flag(rel, "caught-after-curfew");
    this._emit({ type: "curfew", npcId: npc.id, text: npc.lines.curfew || (npc.name + " 發現你在宵禁後還在外面。") });
  }

  // ---------- 查詢 ----------
  present() {
    return [...this.actors.values()].map(a => ({
      id: a.id, name: this.byId.get(a.id).name, x: a.pos.x, z: a.pos.z,
      activity: a.want ? a.want.activity : "", leaving: a.mode === "leave", walking: a.path.length > 0,
      char: a.char,
    }));
  }
  where(npcId, clock = this.clock) {
    const npc = this.byId.get(npcId); if (!npc) return null;
    const w = scheduleAt(npc, clock);
    return w ? { scene: w.scene, spot: w.spot, activity: w.activity, busy: !!w.entry.busy } : { scene: null, label: npc.home.label };
  }
  relationship(npcId) {
    const r = this.rel[npcId]; if (!r) return null;
    return { met: r.met, familiarity: r.familiarity, trust: r.trust, tier: tierOf(r), tierLabel: TIER_LABELS[tierOf(r)], flags: [...r.flags] };
  }

  // 玩家做了某件事，在場（且沒在離開途中）的 NPC 會記住。
  witness(eventId, sceneId = this.scene) {
    if (sceneId !== this.scene) return [];
    const seen = [];
    for (const a of this.actors.values()) {
      if (a.mode === "leave") continue;
      if (this._flag(this.rel[a.id], "saw:" + eventId)) seen.push(a.id);
    }
    return seen;
  }
  _flag(rel, f) { if (rel.flags.includes(f)) return false; rel.flags.push(f); if (rel.flags.length > 40) rel.flags.shift(); return true; }

  // ---------- 對話 ----------
  // talk(npcId, state) 開啟對話；talk(npcId, state, optionId) 回應選項。
  // 回傳 { speaker, text, options:[{id,label}], minutes, effects:{item?}, relationship }
  talk(npcId, state = {}, optionId = null) {
    const npc = this.byId.get(npcId);
    if (!npc) return { speaker: "", text: "這裡沒有這個人。", options: [], minutes: 0 };
    const a = this.actors.get(npcId);
    const rel = this.rel[npcId];
    const now = absMinutes(this.clock);
    const want = scheduleAt(npc, this.clock);
    const out = (text, options = [], minutes = 0, effects = {}) =>
      ({ speaker: npc.name, text, options, minutes, effects, relationship: this.relationship(npcId) });

    if (!a || !want || want.scene !== this.scene) return out(npc.name + " 不在這裡。");
    if (a.mode === "leave") return out(npc.lines.leaving || "對方正要離開。");
    const entry = want.entry;
    if (entry.busy) return out(npc.lines.busy, [], 1);

    const opts = () => {
      const list = [{ id: "chat", label: "閒聊" }, { id: "schedule", label: "詢問行程" }];
      if (entry.favor && rel.favorDay !== this.clock.day) list.push({ id: "favor", label: entry.favor.label });
      list.push({ id: "bye", label: "告辭" });
      return list;
    };

    if (!optionId) {
      rel.talkLog = rel.talkLog.filter(t => now - t < 60);
      rel.talkLog.push(now);
      if (rel.talkLog.length > 4) {
        rel.trust = clamp(rel.trust - 1, 0, 100);
        return out(npc.lines.annoyed, [{ id: "bye", label: "告辭" }], 1);
      }
      if (!rel.met) {
        rel.met = true;
        rel.familiarity = clamp(rel.familiarity + 4, 0, 100);
        return out(npc.lines.intro, opts(), 2);
      }
      return out(npc.lines.greet[Math.min(tierOf(rel), npc.lines.greet.length - 1)], opts(), 1);
    }

    if (optionId === "bye") return out("你向 " + npc.name + " 道別。", [], 0);

    if (optionId === "chat") {
      // 先聊玩家做過、而 NPC 親眼看到的事
      const saw = rel.flags.find(f => f.startsWith("saw:") && !rel.flags.includes("discussed:" + f.slice(4)) && npc.lines.saw[f.slice(4)]);
      let text;
      if (saw) { text = npc.lines.saw[saw.slice(4)]; this._flag(rel, "discussed:" + saw.slice(4)); }
      else {
        const pool = (npc.lines.chat[entry.activity] || []).concat(npc.lines.generic);
        text = pick(pool, now / 7);
      }
      const gain = now - rel.lastChatAt >= 120 ? 3 : 1;
      rel.familiarity = clamp(rel.familiarity + gain, 0, 100);
      if (gain === 3) rel.trust = clamp(rel.trust + 1, 0, 100);
      rel.lastChatAt = now;
      return out(text, opts().filter(o => o.id !== "chat"), 10);
    }

    if (optionId === "schedule") {
      const next = nextEntries(npc, this.clock, 1)[0];
      const knows = rel.familiarity >= 12 || rel.trust >= 25;
      if (!knows) return out(npc.lines.scheduleVague, opts().filter(o => o.id !== "schedule"), 2);
      const text = next
        ? "「" + next.from + " 我會在" + SCENE_NAMES[next.scene] + "，" + next.activity + "。」"
        : "「今天剩下的時間我會回" + npc.home.label + "。」";
      this._flag(rel, "told-schedule");
      return out(text, opts().filter(o => o.id !== "schedule"), 2);
    }

    if (optionId === "favor") {
      const f = entry.favor;
      if (!f || rel.favorDay === this.clock.day) return out("「今天已經幫過我了，謝謝。」", opts(), 1);
      rel.favorDay = this.clock.day;
      rel.familiarity = clamp(rel.familiarity + (f.familiarity || 0), 0, 100);
      rel.trust = clamp(rel.trust + (f.trust || 0), 0, 100);
      this._flag(rel, "helped:" + entry.activity);
      return out(f.text, opts().filter(o => o.id !== "favor"), f.minutes || 15, f.item ? { item: f.item } : {});
    }
    return out("……", opts(), 0);
  }

  // ---------- 存檔 ----------
  serialize() {
    const rel = {};
    for (const [id, r] of Object.entries(this.rel)) {
      rel[id] = { met: r.met, familiarity: r.familiarity, trust: r.trust, flags: [...r.flags],
        talkLog: r.talkLog.slice(-6), lastChatAt: r.lastChatAt, favorDay: r.favorDay, curfewNight: r.curfewNight };
    }
    return { v: 1, rel };
  }
  load(data) {
    this.rel = Object.fromEntries(this.npcs.map(n => [n.id, newRelation()]));
    if (!data || data.v !== 1 || typeof data.rel !== "object" || !data.rel) return false;
    for (const [id, r] of Object.entries(data.rel)) {
      if (!this.rel[id] || !r || typeof r !== "object") continue;
      const num = (v, d, lo = -1e12, hi = 1e12) => Number.isFinite(v) ? clamp(v, lo, hi) : d;
      Object.assign(this.rel[id], {
        met: r.met === true,
        familiarity: num(r.familiarity, 0, 0, 100),
        trust: num(r.trust, 10, 0, 100),
        flags: Array.isArray(r.flags) ? r.flags.filter(f => typeof f === "string").slice(-40) : [],
        talkLog: Array.isArray(r.talkLog) ? r.talkLog.filter(Number.isFinite).slice(-6) : [],
        lastChatAt: num(r.lastChatAt, -1e9),
        favorDay: num(r.favorDay, 0, 0),
        curfewNight: num(r.curfewNight, 0, 0),
      });
    }
    return true;
  }
}

export const npcById = id => NPC_BY_ID.get(id);
