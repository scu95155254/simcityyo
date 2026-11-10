/* 遊戲規則與常數：建築、島丸、任務、等級，以及共用的小工具函式。 */
'use strict';

const N = 24, OXI = 27, N2 = 14, OZJ = 5, GW = OXI + N2, HS = .3;
const SAVE_KEY = 'lingshou-town-v1';
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;

/* =========================================================
   GAME RULES
   ========================================================= */
const B = {
  road:   {name:'道路', cost:{coin:5}, needsRoad:false, desc:'把建築串起來。除了公園，建築都要緊鄰道路才會運作。'},
  house:  {name:'住宅', cost:{coin:40, wood:10}, cap:6, power:1, upkeep:0, desc:'可住 6 位居民並繳稅。需要電力；附近有公園、商店會更幸福。'},
  farm:   {name:'農田', cost:{coin:30}, jobs:3, upkeep:.5, desc:'每天生產 6 份食物（需要 3 名工人）。每位居民每天吃 0.25 份。'},
  lumber: {name:'伐木場', cost:{coin:35}, jobs:3, upkeep:.5, desc:'每天生產 2 木材，周圍每棵樹再 +1（最多 +4）。'},
  plant:  {name:'發電站', cost:{coin:80, wood:20}, jobs:4, upkeep:2, pollute:{r:2, v:15}, desc:'供應 12 電力，但 2 格內的住宅滿意度 −15。'},
  furnace:{name:'熔爐', cost:{coin:70, wood:20}, jobs:3, upkeep:1, pollute:{r:1, v:8}, desc:'燒木材打造工具賣錢：每天用 2 木材，賺 12 金幣（需要 3 名工人）。1 格內住宅滿意度 −8。'},
  shop:   {name:'商店', cost:{coin:60, wood:15}, jobs:4, power:1, upkeep:1, aura:{r:2, v:8}, desc:'每天賺 8 金幣，2 格內住宅滿意度 +8。'},
  park:   {name:'公園', cost:{coin:30}, needsRoad:false, upkeep:.5, aura:{r:2, v:12}, desc:'2 格內住宅滿意度 +12，不需要道路。'},
  center: {name:'島丸中心', cost:{coin:100, wood:30}, power:1, upkeep:1, unique:true, desc:'存放隊伍帶不下的島丸，只能蓋一座。'},
  school: {name:'學校', cost:{coin:150, wood:40}, jobs:3, power:2, upkeep:2, aura:{r:3, v:12}, desc:'3 格內住宅滿意度 +12，每座學校讓全城稅收 +5%。'},
};
const BUILD_TOOLS = ['road','house','farm','lumber','plant','furnace','shop','park','center','school'];
const SP = {
  ripple:{evo:'滄瀾', name:'漣漪', el:'水', color:'#5ec2f0', hab:'lake', rare:1},
  moss:  {evo:'森苔', name:'苔苔', el:'草', color:'#6cc66a', hab:'meadow', rare:1},
  pebble:{evo:'磐石', name:'石墩', el:'岩', color:'#b9b1a6', hab:'hill', rare:1},
  ember: {evo:'熾炎', name:'燼燼', el:'火', color:'#ff8a3d', hab:'hill', rare:2},
  fluff: {evo:'綿雲', name:'棉棉', el:'妖精', color:'#f6a9cb', hab:'meadow', rare:3, fly:true},
  zap:   {evo:'雷鳴', name:'嗶嗶', el:'電', color:'#8f8cf2', hab:'hill', rare:3, fly:true},
};
const SPK = Object.keys(SP);
const HAB_NAME = {lake:'湖泊', meadow:'草原', hill:'山坡'};
const STARTERS = ['ripple', 'ember', 'moss'];
const STARTER_FX = {
  ripple:{target:'farm', mult:.25, text:'全城農田產量 +25%'},
  ember: {target:'plant', mult:.25, text:'全城發電站電力 +25%'},
  moss:  {target:'lumber', mult:.25, text:'全城伐木場產量 +25%，還會在鎮長身邊種出新樹'},
};
const TEAM_MAX = 6;
const LVM = [1, 1.5, 2], LV_CAP = [6, 10, 16];
const MERGEABLE = {house:1, farm:1, lumber:1, plant:1, furnace:1, shop:1, park:1, school:1};
const BIGNAME = {house:'大型公寓', farm:'大農場', lumber:'大伐木場', plant:'大型發電廠', furnace:'大熔爐', shop:'購物中心', park:'中央公園', school:'大學'};
const UPG_NEED = {2:{mission:2, happy:55}, 3:{mission:4, happy:70}};
const PRODUCERS = {farm:1, lumber:1, plant:1, furnace:1, shop:1};
const EVO_EXP = 150;
function spiritFx(sp, t, stage = 1){
  const f = baseFx(sp, t); if (!f || stage < 2) return f;
  return {mult:f.mult ? Math.round(f.mult * 150) / 100 : 0, cap:f.cap ? 5 : 0, power:f.power, aura:f.aura ? {r:3, v:16} : null};
}
function baseFx(sp, t){
  const prod = !!PRODUCERS[t];
  switch (sp){
    case 'ripple': return t === 'farm' ? {mult:.6} : prod ? {mult:.15} : null;
    case 'ember':  return t === 'furnace' ? {mult:.6} : prod ? {mult:.15} : null;
    case 'moss':   return t === 'lumber' ? {mult:.8} : prod ? {mult:.15} : null;
    case 'zap':    return t === 'plant' ? {mult:.6} : prod ? {mult:.15} : null;
    case 'pebble': return t === 'house' ? {cap:3} : prod ? {mult:.3} : null;
    case 'fluff':  return (t === 'house' || t === 'park' || t === 'school') ? {aura:{r:2, v:10}} : prod ? {mult:.15} : null;
  }
  return null;
}
const BEST = {ripple:'農田產量 +60%', ember:'熔爐產量 +60%', moss:'伐木場產量 +80%', zap:'發電站電力 +60%', pebble:'住宅多住 3 人；生產建築 +30%', fluff:'派到住宅、公園、學校：2 格內住宅滿意度 +10'};
function fxText(fx){
  const p = [];
  if (fx.mult) p.push(`產量 +${Math.round(fx.mult * 100)}%`);
  if (fx.power) p.push(`電力 +${fx.power}`);
  if (fx.cap) p.push(`可住 +${fx.cap} 人`);
  if (fx.aura) p.push(`${fx.aura.r} 格內住宅滿意度 +${fx.aura.v}`);
  return p.join('、');
}
const M = [
  {title:'小小聚落', story:'第一批居民到了。多蓋幾間住宅，讓聚落熱鬧起來。',
   goals:[{k:'pop', v:20, label:'人口'}], reward:{coin:150}, unlock:{b:['shop','park','furnace','center'], bridge:true}},
  {title:'初次結緣', story:'東邊的野外島住著野生島丸。讓鎮長過橋，用靈果和一隻島丸交朋友，再請牠到建築幫忙。',
   goals:[{k:'caught', v:1, label:'收服的島丸'}, {k:'assigned', v:1, label:'派駐中的島丸'}], reward:{coin:200, food:60}},
  {title:'豐收季', story:'人多了，糧倉也要跟上。水系島丸很會照顧田地。',
   goals:[{k:'food', v:200, label:'食物存量'}, {k:'n_farm', v:4, label:'運作中的農田'}], reward:{coin:200, wood:50}},
  {title:'燈火通明', story:'夜裡要有足夠的電，家家戶戶才點得起燈。',
   goals:[{k:'powerSurplus', v:15, label:'電力盈餘'}, {k:'n_house', v:12, label:'運作中的住宅'}], reward:{coin:250}, unlock:{b:['school']}},
  {title:'幸福小鎮', story:'公園、商店、學校，讓大家住得開心。',
   goals:[{k:'pop', v:100, label:'人口'}, {k:'happy', v:70, label:'平均滿意度'}], reward:{coin:400}},
  {title:'繁華之都', story:'鎮上的名聲傳開了，攢下一筆建設基金吧。',
   goals:[{k:'pop', v:200, label:'人口'}, {k:'coin', v:1500, label:'金幣存量'}], reward:{coin:500}},
  {title:'島丸之城', story:'把六種島丸都登記進圖鑑，打造人與島丸共生的城市。',
   goals:[{k:'pop', v:350, label:'人口'}, {k:'species', v:6, label:'圖鑑種類'}, {k:'happy', v:75, label:'平均滿意度'}], reward:{}, final:true},
];
const RES_NAME = {coin:'金幣', wood:'木材', food:'食物'};

const idx = (i, j) => j * N + i;
const inb = (i, j) => i >= 0 && j >= 0 && i < N && j < N;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const cheb = (a, b, c, d) => Math.max(Math.abs(a - c), Math.abs(b - d));
const hash = (i, j) => (((i * 73856093) ^ (j * 19349663) ^ 0x5bd1e995) >>> 0) % 1000 / 1000;
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const fmt = v => Math.floor(v).toLocaleString('zh-TW');
const fmtD = v => { const a = Math.abs(v); const s = a >= 10 ? Math.round(a) : Math.round(a * 10) / 10; return (v >= 0 ? '+' : '−') + s; };
const now = () => performance.now() / 1000;
const rint = (a, b) => a + ((Math.random() * (b - a + 1)) | 0);
const pickR = a => a[(Math.random() * a.length) | 0];
