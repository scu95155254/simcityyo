/* 遊戲狀態與模擬：開新地圖、經濟計算、每日更新、任務、建造／升級／合併／派駐等動作、存檔。 */
'use strict';

let S, E, speed = 1, tool = 'inspect', tab = 'build', sel = null, hover = null, selEnt = null, follow = false;

function noise2(r, g, size = N){
  const v = []; for (let k = 0; k < (g + 1) * (g + 1); k++) v.push(r());
  const sm = t => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = x / size * g, fy = y / size * g, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = sm(fx - x0), ty = sm(fy - y0);
    const at = (a, b) => v[Math.min(b, g) * (g + 1) + Math.min(a, g)];
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx;
    const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx;
    return a + (b - a) * ty;
  };
}
function newGame(seed){
  seed = seed ?? (Math.random() * 1e9) | 0;
  const r = mulberry32(seed), n1 = noise2(r, 5), n2 = noise2(r, 7), n3 = noise2(r, 4);
  const c = (N - 1) / 2, terr = [], feat = [], bld = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++){
    const d = Math.hypot(i - c, j - c) / c;
    let h = n1(i, j) * .55 + .5 - d * d * .62;
    if (n3(i, j) > .74 && d > .3 && d < .7) h -= .35;
    const centre = Math.hypot(i - c, j - c) < 4.2;
    let t = h < .28 ? 'w' : h < .34 ? 's' : 'g';
    if (centre) t = 'g';
    terr.push(t);
    let f = 0;
    if (t === 'g' && !centre){
      if (n2(i, j) > .6 && r() < .65) f = 1;
      else if (r() < .035) f = 2;
    }
    feat.push(f); bld.push(null);
  }
  // make sure the east shore reaches out on the bridge row
  for (let i = 12; i <= 19; i++){ const k = idx(i, 12); if (terr[k] === 'w') terr[k] = 's'; }
  S = {v:1, seed, day:1, res:{coin:250, wood:25, food:40}, pop:6, terr, feat, bld, nextId:1,
       mission:0, unlockB:['road','house','farm','lumber','plant'], won:false,
       starter:null, spirits:[], nextSpirit:1, bridge:false};
  const k = Math.round(c);
  const put = (i, j, t) => { S.bld[idx(i, j)] = {t, id:S.nextId++}; };
  for (let i = k - 3; i <= k + 3; i++) put(i, k, 'road');
  for (let j = k - 2; j <= k + 2; j++) if (j !== k) put(k, j, 'road');
  put(k - 3, k - 1, 'house'); put(k - 2, k - 1, 'house'); put(k - 1, k - 1, 'house');
  put(k + 1, k - 1, 'lumber'); put(k - 2, k + 1, 'farm'); put(k - 1, k + 1, 'farm'); put(k + 2, k + 1, 'plant');
  for (const [a, b] of [[k + 2, k - 2], [k + 1, k - 2], [k + 2, k - 1]]) if (!S.bld[idx(a, b)]) S.feat[idx(a, b)] = 1;
  sel = null; selEnt = null; tool = 'inspect';
}
function migrate(s){
  if (!s.spirits){
    s.spirits = []; s.nextSpirit = 1;
    for (const k of (s.recruited || [])) if (SP[k]) s.spirits.push({id:s.nextSpirit++, sp:k, loc:'team', at:null});
    const map = [0, 2, 3, 4, 5, 6];
    s.mission = map[s.mission] ?? s.mission;
    s.bridge = s.mission >= 1;
    if (s.bridge && !s.unlockB.includes('center')) s.unlockB.push('center');
    delete s.comps; delete s.recruited; delete s.unlockC;
  }
  if (s.bridge && !s.unlockB.includes('furnace')) s.unlockB.push('furnace');
  if (s.starter === undefined) s.starter = null;
  if (s.starter && !s.spirits.some(x => x.first)) s.spirits.unshift({id:s.nextSpirit++, sp:s.starter, loc:'team', at:null, first:true});
  for (let i = 12; i <= 19; i++){ const k = idx(i, 12); if (s.terr[k] === 'w') s.terr[k] = 's'; }
  return s;
}

const bAt = (i, j) => inb(i, j) ? S.bld[idx(i, j)] : null;
function hasRoad(i, j){
  for (const [a, b] of [[1,0],[-1,0],[0,1],[0,-1]]){ const o = bAt(i + a, j + b); if (o && o.t === 'road') return true; }
  return false;
}
function costOf(t){ return Object.assign({}, B[t].cost); }
const canAfford = c => Object.keys(c).every(r => S.res[r] >= c[r]);
const teamCount = () => S.spirits.filter(s => s.loc === 'team').length;
const centerTile = () => { for (let k = 0; k < N * N; k++) if (S.bld[k]?.t === 'center') return k; return -1; };
const freeSlot = () => teamCount() < TEAM_MAX ? 'team' : centerTile() >= 0 ? 'center' : null;
const spName = s => `${(s.stage || 1) > 1 ? SP[s.sp].evo : SP[s.sp].name} ${s.id}號`;
const workerAt = k => S.spirits.find(s => s.loc === 'work' && s.at === k);

function econ(){
  const e = {cap:0, jobs:0, demand:0, supply:0, food:0, wood:0, coin:0, upkeep:0, counts:{}, info:new Map(), houses:[], schools:0};
  const list = [], gAct = new Map();
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++){ const b = S.bld[idx(i, j)]; if (b?.g && hasRoad(i, j)) gAct.set(b.g, true); }
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++){
    const k = idx(i, j), b = S.bld[k]; if (!b || b.t === 'road') continue;
    const d = B[b.t], lv = b.lv || 1, mg = !!b.g, active = d.needsRoad === false || (mg ? !!gAct.get(b.g) : hasRoad(i, j));
    const w = workerAt(k), fx = w ? spiritFx(w.sp, b.t, w.stage) : null;
    const inf = {active, worker:w, fx, lv, mg}; e.info.set(k, inf);
    if (d.aura) inf.aura = {r:d.aura.r + (lv >= 3 ? 1 : 0) + (mg ? 1 : 0), v:d.aura.v + (lv - 1) * 4 + (mg ? 4 : 0)};
    if (!active) continue;
    e.counts[b.t] = (e.counts[b.t] || 0) + 1;
    list.push([i, j, b, d, inf]);
    if (d.cap){ inf.cap = Math.round(LV_CAP[lv - 1] * (mg ? 1.25 : 1)); e.cap += inf.cap + (fx?.cap || 0); }
    if (d.jobs) e.jobs += d.jobs * LVM[lv - 1];
    if (d.power) e.demand += d.power * lv;
    if (fx?.power) e.supply += fx.power;
    e.upkeep += (d.upkeep || 0) * lv;
    if (b.t === 'school') e.schools++;
  }
  const staff = e.jobs ? Math.min(1, S.pop / e.jobs) : 1; e.staff = staff;
  for (const [i, j, b, d, inf] of list){
    if (!d.jobs) continue;
    let boost = 1;
    if (inf.fx?.mult) boost += inf.fx.mult;
    inf.boost = boost; inf.staff = staff;
    const lm = LVM[inf.lv - 1] * (inf.mg ? 1.25 : 1); boost *= lm; inf.lm = lm;
    let out = 0;
    if (b.t === 'farm'){ out = 6 * staff * boost; e.food += out; }
    else if (b.t === 'lumber'){
      let trees = 0; for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) if ((a || c) && inb(i + a, j + c) && S.feat[idx(i + a, j + c)] === 1) trees++;
      inf.trees = trees; out = (2 + Math.min(4, trees)) * staff * boost; e.wood += out;
    }
    else if (b.t === 'plant'){ out = 12 * staff * boost; e.supply += out; }
    else if (b.t === 'shop'){ out = 8 * staff * boost; e.coin += out; }
    else if (b.t === 'furnace'){ const use = 2 * staff * LVM[inf.lv - 1]; inf.use = use; if (S.res.wood < use){ inf.noWood = true; out = 0; } else { e.wood -= use; out = 12 * staff * boost; e.coin += out; } }
    inf.out = out;
  }
  e.powerOK = e.supply >= e.demand;
  const fewJobs = S.pop > 10 && e.jobs < S.pop * .45;
  for (const [i, j, b, d, inf] of list){
    if (b.t !== 'house') continue;
    let plus = 0; const f = [];
    for (const [a, c, b2, d2, inf2] of list){
      if (inf2.aura && cheb(i, j, a, c) <= inf2.aura.r){ plus += inf2.aura.v; f.push([b2.g ? BIGNAME[b2.t] : d2.name, inf2.aura.v]); }
      if (d2.pollute && cheb(i, j, a, c) <= d2.pollute.r) f.push([d2.name + '污染', -d2.pollute.v]);
      if (inf2.fx?.aura && cheb(i, j, a, c) <= inf2.fx.aura.r){ plus += inf2.fx.aura.v; f.push([spName(inf2.worker), inf2.fx.aura.v]); }
    }
    let h = 50 + Math.min(plus, 45);
    for (const [, v] of f) if (v < 0) h += v;
    if (!e.powerOK){ h -= 20; f.push(['停電', -20]); }
    if (S.res.food <= 0){ h -= 25; f.push(['缺糧', -25]); }
    if (fewJobs){ h -= 10; f.push(['工作機會不足', -10]); }
    inf.happy = clamp(Math.round(h), 0, 100); inf.factors = f; inf.capped = plus > 45;
    e.houses.push(inf.happy);
  }
  e.happy = e.houses.length ? Math.round(e.houses.reduce((a, b) => a + b, 0) / e.houses.length) : 50;
  e.tax = S.pop * .6 * (e.happy / 70) * (1 + .05 * e.schools);
  e.foodUse = S.pop * .25;
  e.dCoin = e.coin + e.tax - e.upkeep; e.dFood = e.food - e.foodUse; e.dWood = e.wood;
  return e;
}

function tick(){
  const e = econ();
  S.day++;
  S.res.food = Math.max(0, S.res.food + e.dFood);
  S.res.wood = Math.max(0, S.res.wood + e.dWood);
  S.res.coin = Math.max(0, S.res.coin + e.dCoin);
  if (S.pop > e.cap) S.pop = e.cap;
  else if (S.res.food <= 0 && S.pop > 0) S.pop -= Math.max(1, Math.ceil(S.pop * .05));
  else if (e.happy < 30 && S.pop > 0) S.pop -= Math.max(1, Math.ceil(S.pop * .03));
  else if (e.powerOK && e.happy >= 40 && S.res.food > 0 && S.pop < e.cap) S.pop += Math.max(1, Math.ceil((e.cap - S.pop) * .08));
  S.pop = clamp(S.pop, 0, e.cap);
  for (const s of S.spirits){
    s.exp = (s.exp || 0) + ({work:2, team:1.5, center:.6}[s.loc] || 0);
    if ((s.stage || 1) < 2 && s.exp >= EVO_EXP && !s.told){ s.told = true; toast(`${spName(s)}可以進化了！到「島丸」分頁讓牠進化`, 'win'); refreshTools(); if (selEnt === 's:' + s.id) refreshInfo(); }
  }
  E = econ();
  checkMission();
  refreshHUD(); refreshMission();
  syncWorld();
  if (S.day % 4 === 0) save();
  if ((sel || selEnt) && S.day % 2 === 0) refreshInfo();
}

function stat(k){
  switch (k){
    case 'pop': return S.pop;
    case 'food': return S.res.food;
    case 'coin': return S.res.coin;
    case 'happy': return E.happy;
    case 'powerSurplus': return E.supply - E.demand;
    case 'caught': return S.spirits.filter(s => !s.first).length;
    case 'assigned': return S.spirits.filter(s => s.loc === 'work').length;
    case 'species': return new Set(S.spirits.map(s => s.sp)).size;
    default: if (k.startsWith('n_')) return E.counts[k.slice(2)] || 0;
  }
  return 0;
}
function checkMission(){
  const m = M[S.mission]; if (!m || S.won) return;
  if (!m.goals.every(g => stat(g.k) >= g.v)) return;
  for (const r in m.reward) S.res[r] += m.reward[r];
  for (const b of (m.unlock?.b || [])) if (!S.unlockB.includes(b)) S.unlockB.push(b);
  toast(`任務完成：${m.title}`, 'win');
  const un = (m.unlock?.b || []).map(b => B[b].name);
  if (un.length) setTimeout(() => toast('解鎖：' + un.join('、')), 400);
  if (m.unlock?.bridge){ S.bridge = true; setTimeout(() => toast('通往野外島的橋開通了！', 'win'), 900); }
  if (m.final){ S.won = true; setTimeout(showVictory, 600); }
  else S.mission++;
  E = econ(); refreshTools(); refreshMission(); refreshHUD(); syncWorld(); save();
}
function rewardText(m){
  const parts = [];
  for (const r in m.reward) parts.push(`${m.reward[r]} ${RES_NAME[r]}`);
  for (const b of (m.unlock?.b || [])) parts.push('解鎖' + B[b].name);
  if (m.unlock?.bridge) parts.push('開通野外島的橋');
  return parts.length ? parts.join('・') : '島丸之城的稱號';
}
function unlockMissionOf(key){ return M.findIndex(m => (m.unlock?.b || []).includes(key)); }

let lastToast = {msg:'', t:0};
function toast(msg, kind = ''){
  const t = now();
  if (msg === lastToast.msg && t - lastToast.t < 1.5) return;
  lastToast = {msg, t};
  const box = document.getElementById('toasts'), el = document.createElement('div');
  el.className = 'toast ' + kind; el.textContent = msg; box.appendChild(el);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => el.remove(), kind === 'win' ? 3800 : 2400);
}
function pay(c){ for (const r in c) S.res[r] -= c[r]; }
function whyCant(t, i, j){
  const k = idx(i, j);
  if (S.terr[k] === 'w') return '水面上不能蓋東西';
  if (isBridge(i, j)) return '這裡是橋';
  if (S.feat[k] === 2) return '這裡有岩石，先用「拆除」清掉';
  if (S.bld[k]) return S.bld[k].t === t ? 'same' : '這裡已經有建築了';
  if (B[t].unique && centerTile() >= 0) return `${B[t].name}只能蓋一座`;
  const c = costOf(t);
  for (const r in c) if (S.res[r] < c[r]) return `${RES_NAME[r]}不夠（需要 ${c[r]}）`;
  return '';
}
function placeAt(i, j, quiet){
  if (tool === 'inspect'){ if (inb(i, j)) select(i, j); return; }
  if (!inb(i, j)){ if (!quiet) toast('野外島不能蓋建築', 'bad'); return; }
  if (tool === 'bulldoze'){ bulldoze(i, j, quiet); return; }
  if (tool.startsWith('a:')){ assignAt(+tool.slice(2), i, j); return; }
  const why = whyCant(tool, i, j);
  if (why){ if (why !== 'same' && !(quiet && why.startsWith('這裡已經'))) toast(why, 'bad'); return; }
  const k = idx(i, j);
  pay(costOf(tool));
  if (S.feat[k] === 1){ S.feat[k] = 0; S.res.wood += 2; }
  S.bld[k] = {t:tool, id:S.nextId++};
  popIn.add(k);
  if (tool !== 'road'){ ribbonQ.push(k); if (ribbonQ.length > 5) ribbonQ.shift(); }
  changed();
}
function groupTiles(k){ const b = S.bld[k]; if (!b?.g) return [k]; const out = []; for (let q = 0; q < N * N; q++) if (S.bld[q]?.g === b.g) out.push(q); return out; }
function upgradeCost(k){
  const b = S.bld[k], n = groupTiles(k).length, base = B[b.t].cost, f = (b.lv || 1) === 1 ? 1.5 : 3;
  return {coin:Math.ceil(base.coin * f * n), wood:Math.ceil(Math.max(10, base.wood || 0) * f * n)};
}
function upgradeWhy(k){
  const b = S.bld[k]; if (!b || b.t === 'road' || b.t === 'center') return 'no';
  const lv = b.lv || 1; if (lv >= 3) return 'max';
  const need = UPG_NEED[lv + 1];
  if (S.mission < need.mission && !S.won) return `完成任務 ${need.mission}「${M[need.mission - 1].title}」後才能升到 Lv${lv + 1}`;
  if (!E.info.get(k)?.active) return '先接上道路才能升級';
  if (b.t === 'house'){ const lo = Math.min(...groupTiles(k).map(q => E.info.get(q)?.happy ?? 0)); if (lo < need.happy) return `住戶滿意度要 ${need.happy} 以上（目前 ${lo}）`; }
  const c = upgradeCost(k); for (const r in c) if (S.res[r] < c[r]) return `${RES_NAME[r]}不夠（需要 ${c[r]}）`;
  return '';
}
function upgradeAt(k){
  const why = upgradeWhy(k); if (why){ if (why !== 'max' && why !== 'no') toast(why, 'bad'); return; }
  pay(upgradeCost(k));
  const tiles = groupTiles(k), b = S.bld[k];
  for (const q of tiles){ S.bld[q].lv = (S.bld[q].lv || 1) + 1; popIn.add(q); }
  ribbonQ.push(k);
  toast(`${b.g ? BIGNAME[b.t] : B[b.t].name}升級到 Lv${S.bld[k].lv}！`, 'win');
  changed();
}
function mergeOption(i, j){
  const b = bAt(i, j); if (!b || !MERGEABLE[b.t] || b.g) return null;
  for (const [di, dj] of [[0, 0], [-1, 0], [0, -1], [-1, -1]]){
    const a = i + di, c = j + dj, tiles = [[a, c], [a + 1, c], [a, c + 1], [a + 1, c + 1]];
    if (tiles.every(([x, y]) => { const o = bAt(x, y); return o && o.t === b.t && (o.lv || 1) === (b.lv || 1) && !o.g; })) return {tiles:tiles.map(([x, y]) => idx(x, y)), i0:a, j0:c, cost:80 * (b.lv || 1)};
  }
  return null;
}
function mergeAt(i, j){
  const o = mergeOption(i, j); if (!o) return;
  if (S.res.coin < o.cost){ toast(`合併需要 ${o.cost} 金幣`, 'bad'); return; }
  S.res.coin -= o.cost; const gid = S.nextGroup = (S.nextGroup || 0) + 1;
  for (const k of o.tiles){ S.bld[k].g = gid; popIn.add(k); }
  ribbonQ.push(o.tiles[0]);
  toast(`合併成${BIGNAME[S.bld[o.tiles[0]].t]}！產量與加成再提高`, 'win');
  changed();
}
function bulldoze(i, j, quiet){
  const k = idx(i, j), b = S.bld[k];
  if (b && b.g){
    const tiles = groupTiles(k);
    for (const q of tiles){ const w = workerAt(q); if (w){ const dst = freeSlot(); if (!dst){ toast(`${spName(w)}沒地方去：隊伍滿了，也沒有島丸中心`, 'bad'); return; } w.loc = dst; w.at = null; } }
    let ref = 0; for (const q of tiles){ ref += Math.floor((B[b.t].cost.coin || 0) * .5 * (S.bld[q].lv || 1)); S.bld[q] = null; puff(q % N, (q / N) | 0); }
    S.res.coin += ref; sel = null; toast(`拆除${BIGNAME[b.t]}，退回 ${ref} 金幣`); changed(); return;
  }
  if (b){
    if (b.t === 'center' && S.spirits.some(s => s.loc === 'center')){ toast('島丸中心裡還有島丸，先把牠們接出來', 'bad'); return; }
    const w = workerAt(k);
    if (w){ const dst = freeSlot(); if (!dst){ toast(`${spName(w)}沒地方去：隊伍滿了，也沒有島丸中心`, 'bad'); return; } w.loc = dst; w.at = null; toast(`${spName(w)}回到${dst === 'team' ? '隊伍' : '島丸中心'}`); }
    const ref = Math.floor((B[b.t].cost.coin || 0) * .5 * (b.lv || 1)); S.res.coin += ref; S.bld[k] = null;
    if (sel && sel[0] === i && sel[1] === j) sel = null;
    if (!quiet && ref) toast(`拆除${B[b.t].name}，退回 ${ref} 金幣`);
    puff(i, j); changed(); return;
  }
  if (S.feat[k] === 1){ S.feat[k] = 0; S.res.wood += 3; puff(i, j); changed(); return; }
  if (S.feat[k] === 2){
    if (S.res.coin < 15){ toast('清除岩石需要 15 金幣', 'bad'); return; }
    S.res.coin -= 15; S.feat[k] = 0; puff(i, j); changed(); return;
  }
}
function assignAt(id, i, j){
  const s = S.spirits.find(x => x.id === id); if (!s) return;
  const k = idx(i, j), b = S.bld[k];
  if (!b || b.t === 'road'){ toast('點一棟建築，派牠去幫忙', 'bad'); return; }
  const fx = spiritFx(s.sp, b.t, s.stage);
  if (!fx){ toast(`${spName(s)}在${B[b.t].name}幫不上忙`, 'bad'); return; }
  if (s.loc === 'work' && s.at === k) return;
  const other = workerAt(k);
  if (other){ other.loc = s.loc === 'work' ? 'team' : s.loc; other.at = null; if (other.loc === 'team' && teamCount() > TEAM_MAX) other.loc = centerTile() >= 0 ? 'center' : 'team'; toast(`${spName(other)}換下來，回到${other.loc === 'team' ? '隊伍' : '島丸中心'}`); }
  s.loc = 'work'; s.at = k;
  toast(`${spName(s)}派駐到${B[b.t].name}：${fxText(fx)}`, 'win');
  setTool('inspect'); selEnt = 's:' + s.id; changed();
}
function moveSpirit(id, dst){
  const s = S.spirits.find(x => x.id === id); if (!s) return;
  if (dst === 'team' && teamCount() >= TEAM_MAX){ toast(`隊伍最多 ${TEAM_MAX} 隻（含起始夥伴）`, 'bad'); return; }
  if (dst === 'center' && centerTile() < 0){ toast('先蓋一座島丸中心', 'bad'); return; }
  s.loc = dst; s.at = null; changed();
}
function select(i, j){ sel = [i, j]; selEnt = null; refreshInfo(); }
function changed(){ E = econ(); checkMission(); refreshHUD(); refreshTools(); refreshInfo(); refreshMission(); syncWorld(); saveSoon(); }

let saveTimer = 0;
function save(){ try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
function saveSoon(){ clearTimeout(saveTimer); saveTimer = setTimeout(save, 600); }
function load(){
  try { const raw = localStorage.getItem(SAVE_KEY); if (!raw) return null; const s = JSON.parse(raw); return s && s.v === 1 && s.terr?.length === N * N ? migrate(s) : null; }
  catch (e) { return null; }
}
