(() => {
"use strict";
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const state={day:1,hour:14,minute:20,location:"library",inventory:["學生用品","空白羊皮紙","羽毛筆"],questDone:false};
const places=[
{id:"library",name:"圖書館",floor:"三樓",desc:"高聳書架、閱讀桌與午後陽光。",open:true,icon:"▤"},
{id:"hall",name:"大廳",floor:"一樓",desc:"學院長桌、教師席與通往各處的門廊。",open:true,icon:"♜"},
{id:"courtyard",name:"庭院",floor:"室外",desc:"石拱門、草地與通往庭園的小徑。",open:true,icon:"❧"},
{id:"corridor",name:"移動樓梯廊",floor:"二至四樓",desc:"樓梯會改變方向，肖像也有自己的脾氣。",open:true,icon:"⌁"},
{id:"classroom",name:"魔咒學教室",floor:"三樓",desc:"課桌、黑板與等待上課的練習器具。",open:true,icon:"✧"},
{id:"greenhouse",name:"溫室",floor:"校園庭園",desc:"潮濕泥土、玻璃屋頂與各種魔法植物。",open:true,icon:"♧"},
{id:"common",name:"交誼廳",floor:"學院專屬",desc:"需要知道入口與通行方式才能進入。",open:false,icon:"⌂"},
{id:"grounds",name:"黑湖湖畔",floor:"校園外圍",desc:"湖水、草坡與遠處的禁忌森林。",open:true,icon:"≈"}];
const things={
library:[["book","桌上的古書","物件","閱讀,調查","書頁間夾著一張折起來的羊皮紙。",51,65],["shelf","靠窗書架","物件","尋找書籍,調查","其中一本書的書脊比其他書突出。",18,38],["student","埋首讀書的學生","人物","交談,觀察","對方正在抄寫一段很長的筆記。",78,53],["catalog","索引櫃","物件","查閱,調查","卡片依照作者與主題排列。",32,76]],
hall:[["notice","學院公告欄","物件","閱讀,調查","新公告覆蓋了幾張舊通知。"],["portrait","門邊肖像","人物","交談,觀察","肖像裡的人正打量著來往學生。"],["table","學院長桌","物件","查看,坐下","桌上還有沒收拾完的餐具。"]],
courtyard:[["fountain","石雕噴泉","物件","調查,休息","水聲蓋過了遠處的談話。"],["students","庭院裡的學生","人物","交談,觀察","兩人似乎在爭論某堂課的作業。"]],
corridor:[["stairs","移動樓梯","物件","等待,觀察","階梯正在緩慢轉向。"],["portrait2","會說話的肖像","人物","交談,詢問路線","肖像似乎知道一條捷徑。"]],
classroom:[["board","黑板上的咒語","物件","閱讀,抄寫","黑板上留著上一堂課的練習。"],["tools","練習用器具","物件","查看,練習","器具整齊地放在講桌旁。"]],
greenhouse:[["plant","溫室植物","物件","觀察,照料","葉片邊緣有細小的水珠。"],["assistant","溫室助教","人物","交談,詢問植物","對方正在檢查一排盆栽。"]],
grounds:[["lake","黑湖","環境","觀察,休息","湖面反射著城堡的輪廓。"],["path","林間小徑","環境","查看,觀察","小徑通往更遠的樹影之間。"]]};
function say(t){$("#message").textContent=t}
function tick(n=5){state.minute+=n;while(state.minute>=60){state.minute-=60;state.hour++}if(state.hour>=24){state.hour=0;state.day++}$("#clock").textContent="第 "+state.day+" 天　"+String(state.hour).padStart(2,"0")+":"+String(state.minute).padStart(2,"0")}
function closePanels(){$$(".panel").forEach(x=>x.hidden=true);$("#map-modal").hidden=true}
function render(){
const p=places.find(x=>x.id===state.location);$("#place-floor").textContent=p.floor;$("#place-desc").textContent=p.desc;$("#scene-title").textContent=p.name;
$("#scene-art").src=state.location==="library"?"./assets/art-direction/霍格華茲圖書館奇遇-2.png":"";$("#scene-art").style.display=state.location==="library"?"block":"none";$("#scene").dataset.location=state.location;
$("#hotspots").replaceChildren();
(things[state.location]||[]).forEach((o,i)=>{const b=document.createElement("button");b.className="hotspot";b.textContent=(o[2]==="人物"?"♟ ":"✧ ")+o[1];b.style.left=(o[5]||[28,52,73,43][i%4])+"%";b.style.top=(o[6]||[42,58,40,76][i%4])+"%";b.addEventListener("click",()=>target(o));$("#hotspots").append(b)});
$("#location-list").replaceChildren();places.forEach(x=>{const b=document.createElement("button");b.className="location-option"+(x.id===state.location?" current":"");b.disabled=!x.open;b.innerHTML="<span>"+x.icon+"</span><span><b>"+x.name+"</b><small>"+x.floor+(x.open?"":" · 尚未開放")+"</small></span>";b.addEventListener("click",()=>travel(x.id));$("#location-list").append(b)});
$("#inventory-count").textContent=state.inventory.length;$("#inventory").textContent=state.inventory.join("、");$("#quest-status").textContent=state.questDone?"已完成":"進行中";$("#quest-progress").textContent=state.questDone?"你找到了夾在古書裡的紙條。":"找到古書裡夾著的紙條。";tick(0)}
function travel(id){const p=places.find(x=>x.id===id);if(!p||!p.open)return;state.location=id;closePanels();$("#target-card").hidden=true;tick(3);say("你前往了"+p.name+"。"+p.desc);render()}
function target(o){$("#target-kind").textContent=o[2];$("#target-name").textContent=o[1];$("#target-desc").textContent=o[4];$("#target-actions").replaceChildren();o[3].split(",").forEach(action=>{const b=document.createElement("button");b.textContent=action;b.addEventListener("click",()=>act(o,action));$("#target-actions").append(b)});$("#target-card").hidden=false}
function act(o,a){let t=o[4];if(o[0]==="book"&&a==="閱讀"){state.questDone=true;if(!state.inventory.includes("折起來的羊皮紙"))state.inventory.push("折起來的羊皮紙");t="你翻開古書，發現一張折起來的羊皮紙。上面寫著：「別在鐘聲響起後走東側樓梯。」"}else if(a==="交談")t="對方停下手邊的事，抬頭看向你：「嗯？有什麼事嗎？」";else if(a==="休息")t="你找了個安靜的位置休息片刻。疲勞稍微緩和了。";else if(a==="觀察")t+=" 你暫時沒有打擾對方。";else t+=" 你花了一點時間完成「"+a+"」。";tick(a==="休息"?15:5);say(t);$("#target-card").hidden=true;render()}
$("#enter").addEventListener("click",()=>$("#intro").hidden=true);$("#map-button").addEventListener("click",()=>$("#map-modal").hidden=false);$("#bag-button").addEventListener("click",()=>{closePanels();$("#panel-bag").hidden=false});$("#quest-button").addEventListener("click",()=>{closePanels();$("#panel-quest").hidden=false});
$("#close-target").addEventListener("click",()=>$("#target-card").hidden=true);$("#close-map").addEventListener("click",()=>$("#map-modal").hidden=true);$(".close-panel").forEach(b=>b.addEventListener("click",e=>e.currentTarget.closest(".panel").hidden=true));
$("#save-button").addEventListener("click",()=>{localStorage.setItem("hogwarts-save-v1",JSON.stringify(state));say("進度已儲存在這台裝置。")});$("#load-button").addEventListener("click",()=>{try{const v=localStorage.getItem("hogwarts-save-v1");if(!v){say("找不到存檔。");return}const data=JSON.parse(v);if(!data||!places.some(p=>p.id===data.location)||!Array.isArray(data.inventory))throw new Error("invalid save");Object.assign(state,data);render();placePlayer();say("已載入上次進度。")}catch(e){say("存檔讀取失敗，資料可能已損壞。")}});

// 玩家角色：點擊地面移動，方向鍵／WASD 行走。
const player=$("#player"), playerBody=$("#player-body"), scene=$("#scene");
state.playerX=Number.isFinite(state.playerX)?state.playerX:50;
state.playerY=Number.isFinite(state.playerY)?state.playerY:76;
state.facing=Number.isFinite(state.facing)?state.facing:180;
function placePlayer(){player.style.left=state.playerX+"%";player.style.top=state.playerY+"%";playerBody.style.transform="rotateY("+state.facing+"deg)"}
function movePlayer(dx,dy){
 const oldX=state.playerX, oldY=state.playerY;
 state.playerX=Math.max(5,Math.min(95,state.playerX+dx));
 state.playerY=Math.max(43,Math.min(91,state.playerY+dy));
 if(Math.abs(state.playerX-oldX)>.05)state.facing=state.playerX<oldX?0:180;
 placePlayer();player.classList.add("walking");
 window.clearTimeout(player._walkTimer);player._walkTimer=window.setTimeout(()=>player.classList.remove("walking"),210);
}
scene.addEventListener("click",e=>{
 if(e.target.closest(".hotspot")||e.target.closest("#player")||e.target.closest("#topbar,#scene-header,#bottom,#message,#target-card,#map-modal,.panel,#intro,button"))return;
 const r=scene.getBoundingClientRect();
 const x=(e.clientX-r.left)/r.width*100,y=(e.clientY-r.top)/r.height*100;
 const dx=Math.max(-45,Math.min(45,x-state.playerX));
 const dy=Math.max(-25,Math.min(25,y-state.playerY));
 state.playerX=Math.max(5,Math.min(95,x));state.playerY=Math.max(43,Math.min(91,y));
 if(Math.abs(dx)>1)state.facing=dx<0?0:180;
 placePlayer();player.classList.add("walking");
 window.clearTimeout(player._walkTimer);player._walkTimer=window.setTimeout(()=>player.classList.remove("walking"),420);
 tick(Math.max(1,Math.round(Math.hypot(dx,dy)/5)));say("你走到了新的位置。");
});
const heldKeys=new Set();let keyLoop=null;
function keyMove(){let dx=0,dy=0;if(heldKeys.has("ArrowLeft")||heldKeys.has("a"))dx-=1;if(heldKeys.has("ArrowRight")||heldKeys.has("d"))dx+=1;if(heldKeys.has("ArrowUp")||heldKeys.has("w"))dy-=1;if(heldKeys.has("ArrowDown")||heldKeys.has("s"))dy+=1;if(dx||dy){const n=Math.hypot(dx,dy);movePlayer(dx/n*1.25,dy/n*1.25)}}
document.addEventListener("keydown",e=>{if(e.target.matches("input,textarea,select")||!$("#intro").hidden||!$("#map-modal").hidden===false)return;const k=e.key.length===1?e.key.toLowerCase():e.key;if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","w","a","s","d"].includes(k)){e.preventDefault();heldKeys.add(k);if(!keyLoop)keyLoop=window.setInterval(keyMove,45)}});
document.addEventListener("keyup",e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;heldKeys.delete(k);if(!heldKeys.size&&keyLoop){window.clearInterval(keyLoop);keyLoop=null;player.classList.remove("walking")}});
window.addEventListener("blur",()=>{heldKeys.clear();if(keyLoop){window.clearInterval(keyLoop);keyLoop=null}player.classList.remove("walking")});
const originalRender=render;
const renderWithPlayer=()=>{originalRender();placePlayer()};
renderWithPlayer();
})();