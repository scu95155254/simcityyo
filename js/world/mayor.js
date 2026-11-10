/* 鎮長：自動巡視、尋路、剪綵與關心住戶、收禮、前往收服島丸。 */
'use strict';

/* ---- mayor ---- */
let mayor = null;
const ribbonQ = [];
const EMO = {};
function emoTex(ch, fg){
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect(6, 6, 52, 42, 14); g.fill(); g.beginPath(); g.moveTo(24, 46); g.lineTo(32, 60); g.lineTo(38, 46); g.fill();
  g.fillStyle = fg; g.font = 'bold 30px "Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 32, 28);
  const t = new T3.CanvasTexture(c); t.encoding = T3.sRGBEncoding; return new T3.SpriteMaterial({map:t, depthTest:false});
}
function mayorMesh(){
  const g = personMesh({mayor:true, shirt:'#2f4a7a', pants:'#2a2f36', skin:'#f0c8a6', hair:'#6a5a4a'});
  g.scale.setScalar(.95);
  const mk = add(g, new T3.OctahedronGeometry(.04, 0), Mt('#ffc94d', {e:'#ffb000', ei:.6}), 0, .5, 0);
  const ring = new T3.Mesh(new T3.RingGeometry(.2, .25, 28), new T3.MeshBasicMaterial({color:'#ffc94d', transparent:true, opacity:.8, depthWrite:false}));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .01; g.add(ring);
  const emo = new T3.Sprite(EMO.heart); emo.scale.set(.3, .3, 1); emo.position.y = .62; emo.visible = false; emo.renderOrder = 11; g.add(emo);
  g.userData.marker = mk; g.userData.ring = ring; g.userData.emo = emo;
  return g;
}
function makeMayor(){
  const g = mayorMesh();
  const [x, z] = tileXZ(12, 12); g.position.set(x + .25, 0, z + .25);
  scene.add(g);
  mayor = {g, path:[], state:'idle', timer:2, task:null, run:false, emoT:0, giftCD:25, branchCD:20, dest:null, catchT:null};
}
function mayorG(){ return toG(mayor.g.position.x, mayor.g.position.z); }
function findPath(from, isGoal){
  const T = GW * N, dist = new Float32Array(T).fill(Infinity), prev = new Int32Array(T).fill(-1), done = new Uint8Array(T);
  const fid = from[1] * GW + from[0]; if (fid < 0 || fid >= T) return null;
  dist[fid] = 0;
  for (let it = 0; it < T; it++){
    let u = -1, best = Infinity;
    for (let k = 0; k < T; k++) if (!done[k] && dist[k] < best){ best = dist[k]; u = k; }
    if (u < 0) return null;
    const ui = u % GW, uj = (u / GW) | 0;
    if (isGoal(ui, uj)){ const p = []; let k = u; while (k !== fid && k >= 0){ p.push([k % GW, (k / GW) | 0]); k = prev[k]; } return p.reverse(); }
    done[u] = 1;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){
      const vi = ui + a, vj = uj + b; if (!gWalk(vi, vj) || !canStep(ui, uj, vi, vj)) continue;
      const v = vj * GW + vi, road = vi < N && S.bld[idx(vi, vj)]?.t === 'road', c = road || isBridge(vi, vj) ? 1 : 1.8;
      if (dist[u] + c < dist[v]){ dist[v] = dist[u] + c; prev[v] = u; }
    }
  }
  return null;
}
function goTo(goal, task, run){
  const p = findPath(mayorG(), goal); if (!p) return false;
  mayor.path = p; mayor.task = task; mayor.state = 'walk'; mayor.run = !!run; return true;
}
const near = (ti, tj) => (gi, gj) => Math.abs(gi - ti) + Math.abs(gj - tj) <= 1 && !(gi === ti && gj === tj && !gWalk(gi, gj));
function think(){
  while (ribbonQ.length){ const k = ribbonQ.shift(); if (S.bld[k] && S.bld[k].t !== 'road' && goTo(near(k % N, (k / N) | 0), {type:'ribbon', k})) return; }
  const r = Math.random(), [gi] = mayorG();
  if (gi >= OXI - 1 && r < .55){ const t = pickR([...HAB.meadow, ...HAB.hill]); if (t && goTo((a, b) => a === t[0] && b === t[1], {type:'stroll'})) return; }
  if (r < .25){ const parks = []; for (let k = 0; k < N * N; k++) if (S.bld[k]?.t === 'park') parks.push(k); if (parks.length){ const k = pickR(parks); if (goTo((a, b) => a === k % N && b === ((k / N) | 0), {type:'park'})) return; } }
  if (r < .45){ let worst = -1, wh = 101; for (const [k, inf] of E.info) if (S.bld[k]?.t === 'house' && inf.active && inf.happy < wh){ wh = inf.happy; worst = k; } if (worst >= 0 && goTo(near(worst % N, (worst / N) | 0), {type:'visit', k:worst})) return; }
  const roads = roadTiles(); if (roads.length){ const k = pickR(roads); if (goTo((a, b) => a === k % N && b === ((k / N) | 0), {type:'stroll'})) return; }
  mayor.state = 'idle'; mayor.timer = 2 + Math.random() * 3;
}
function emote(key, dur = 2.2){ const e = mayor.g.userData.emo; e.material = EMO[key]; e.visible = true; mayor.emoT = dur; }
function faceTile(k){ const [x, z] = tileXZ(k % N, (k / N) | 0); mayor.g.rotation.y = Math.atan2(x - mayor.g.position.x, z - mayor.g.position.z); }
function arrive(){
  const task = mayor.task || {}; mayor.state = 'idle'; mayor.timer = 2 + Math.random() * 3; mayor.run = false; mayor.dest = null;
  const u = mayor.g.userData;
  if (task.k != null && S.bld[task.k]) faceTile(task.k);
  if (task.type === 'ribbon' || (task.type === 'cmd' && task.k != null && ribbonQ.includes(task.k))){
    const k = task.k; const qi = ribbonQ.indexOf(k); if (qi >= 0) ribbonQ.splice(qi, 1);
    if (S.bld[k]){ const [x, z] = tileXZ(k % N, (k / N) | 0); confetti(x, .7, z); emote('cut'); u.wave = 1.6; mayor.timer = 3; }
  } else if (task.type === 'visit' || (task.type === 'cmd' && task.k != null && S.bld[task.k]?.t === 'house')){ emote('heart'); u.wave = 2; mayor.timer = 3; }
  else if (task.type === 'park'){ emote('note'); mayor.timer = 4; }
  else if (task.type === 'catch' && task.w && !task.w.gone){ startCatch(task.w); }
  if (selEnt === 'mayor') refreshInfo();
}
function commandMayor(gi, gj){
  if (gi >= N && !S.bridge && !isBridge(gi, gj)){ toast(`野外島的橋還沒開通（完成任務 1「${M[0].title}」）`, 'bad'); return; }
  let ok, task = {type:'cmd'};
  if (gWalk(gi, gj)) ok = goTo((a, b) => a === gi && b === gj, task, true);
  else if (inb(gi, gj) && S.bld[idx(gi, gj)]){ task.k = idx(gi, gj); ok = goTo(near(gi, gj), task, true); }
  else ok = goTo((a, b) => cheb(a, b, gi, gj) <= 1 && gWalk(a, b), task, true);
  if (!ok){ toast('鎮長走不到那裡', 'bad'); return; }
  mayor.dest = [gi, gj]; mayor.timer = 0;
  if (selEnt === 'mayor') refreshInfo();
}
function goCatch(w){
  if (!S.bridge){ toast(`野外島的橋還沒開通（完成任務 1「${M[0].title}」）`, 'bad'); return; }
  if (!freeSlot()){ toast(`隊伍已經有 ${TEAM_MAX} 隻了，先蓋島丸中心才能收服更多`, 'bad'); return; }
  const [ti, tj] = toG(w.o.position.x, w.o.position.z);
  if (!goTo((a, b) => cheb(a, b, ti, tj) <= 1 && gWalk(a, b), {type:'catch', w}, true)){ toast('鎮長走不到牠旁邊', 'bad'); return; }
  w.held = true; mayor.dest = [ti, tj];
  selEnt = 'mayor'; refreshInfo();
  toast(`鎮長出發去找${SP[w.sp].name}`);
}
function updateMayor(dt, t){
  const g = mayor.g, u = g.userData;
  let walking = false;
  if (mayor.state === 'walk'){
    const nx = mayor.path[0];
    if (!nx){ arrive(); }
    else if (!gWalk(nx[0], nx[1])){ mayor.state = 'idle'; mayor.timer = .3; mayor.path = []; }
    else {
      const [x, z] = gXZ(nx[0], nx[1]), sp = mayor.run ? 1.7 : .85;
      if (stepToward(g, x, z, sp, dt) < .02) mayor.path.shift();
      walking = true;
      if (mayor.task?.type === 'catch' && mayor.task.w && Math.hypot(mayor.task.w.o.position.x - g.position.x, mayor.task.w.o.position.z - g.position.z) < .9){ mayor.path = []; }
    }
  } else if (mayor.state === 'idle'){
    mayor.timer -= dt; if (mayor.timer <= 0 && !catchOpen) think();
  }
  const gy = groundY(g.position.x, g.position.z);
  g.position.y += (Math.max(0, gy) + .045 - g.position.y) * Math.min(1, dt * 10);
  const ph = t * (mayor.run ? 14 : 9);
  animPerson(u, walking, ph, t, dt, false);
  u.marker.rotation.y += dt * 2; u.marker.position.y = .5 + Math.sin(t * 3) * .02;
  u.ring.visible = selEnt === 'mayor';
  if (mayor.emoT > 0){ mayor.emoT -= dt; if (mayor.emoT <= 0) u.emo.visible = false; }
  if (u.mood !== 0){ u.mood = 0; u.mouths.forEach((m, n) => { if (m) m.visible = n === 0; }); }
  if (walking){
    mayor.giftCD -= dt; mayor.branchCD -= dt;
    if (mayor.giftCD <= 0 && people.some(p => Math.hypot(p.g.position.x - g.position.x, p.g.position.z - g.position.z) < .6)){
      mayor.giftCD = 35 + Math.random() * 30;
      const gift = pickR([['coin', 15 + rint(0, 15)], ['food', 10 + rint(0, 10)], ['wood', 6 + rint(0, 6)]]);
      S.res[gift[0]] += gift[1]; emote('gift'); toast(`居民送給鎮長 ${gift[1]} ${RES_NAME[gift[0]]}`); refreshHUD(); refreshTools();
    }
    const [gi, gj] = mayorG();
    if (mayor.branchCD <= 0){
      let tree = false; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++){ if (inb(gi + a, gj + b) && S.feat[idx(gi + a, gj + b)] === 1) tree = true; const w = wildAt(gi + a, gj + b); if (w?.tree) tree = true; }
      if (tree){ mayor.branchCD = 30 + Math.random() * 30; S.res.wood += 3; emote('gift', 1.6); toast('鎮長撿到樹枝 +3 木材'); refreshHUD(); }
    }
  }
  if (follow){ camT.tx = g.position.x; camT.tz = g.position.z; }
}
