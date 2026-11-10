/* 地圖：格子座標、建築朝向、城鎮＋橋＋野外島的行走格子、野外島地形與石階。 */
'use strict';

/* ---- tile model descriptors ---- */
const tileXZ = (i, j) => [i - N / 2 + .5, j - N / 2 + .5];
const tileY = k => S.terr[k] === 's' ? -.03 : 0;
function roadMask(i, j){ let m = 0; [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([a, b], k) => { if (bAt(i + a, j + b)?.t === 'road') m |= 1 << k; }); return m; }
function facing(i, j){
  if (bAt(i, j + 1)?.t === 'road') return 0;
  if (bAt(i + 1, j)?.t === 'road') return Math.PI / 2;
  if (bAt(i, j - 1)?.t === 'road') return Math.PI;
  if (bAt(i - 1, j)?.t === 'road') return -Math.PI / 2;
  return 0;
}
function describe(t, i, j, id, lv = 1){
  if (t === 'road'){ const m = roadMask(i, j), lamp = hash(j * 3, i) < .3 ? 1 : 0; return {sig:`road:${m}:${lamp}`, build:g => buildRoad(g, m, lamp), rot:0}; }
  const bslot = `building_${t}_lv${lv}`;
  if (ARTM.has(bslot)) return {sig:'glb:' + bslot, build:null, rot:facing(i, j), dyn:null};
  const v = t === 'house' ? (lv === 2 ? 1 : id % 3) : id % 2;
  const sig = (t === 'house' ? `house:${v}:${id % ROOFS.length}:${(id >> 1) % WALLS.length}` : `${t}:${v}`) + `:L${lv}`;
  const dyn = (DYN[t] || (CYBER_ON && HOLO[t])) ? () => { const g = new T3.Group(), parts = []; if (DYN[t]){ const a = DYN[t](); g.add(a); parts.push(a); } const hd = holoDyn(t); if (hd){ g.add(hd); parts.push(hd); } g.userData.update = (tt, on) => parts.forEach(p => p.userData.update(tt, on)); return g; } : null;
  if (t === 'house' && lv === 3) return {sig, build:g => { apartment(g, id); levelBars(g, 3); }, rot:facing(i, j), dyn};
  return {sig, build:g => { BUILD[t](g, v, id); if (CYBER_ON && CYBER[t]) CYBER[t](g, v, id); if (lv > 1 && UPG[t]) UPG[t](g, lv); levelBars(g, lv); }, rot:facing(i, j), dyn};
}

/* ---- unified walking grid: town (0..N-1), bridge, wild island (OXI..GW-1) ---- */
let WT = [], HAB = {lake:[], meadow:[], hill:[]};
const BR = {j:12, i0:0, i1:0};
const gXZ = tileXZ;
const toG = (x, z) => [Math.floor(x + N / 2), Math.floor(z + N / 2)];
const isBridge = (gi, gj) => gj === BR.j && gi >= BR.i0 && gi <= BR.i1;
function wildAt(gi, gj){ const a = gi - OXI, b = gj - OZJ; if (a < 0 || b < 0 || a >= N2 || b >= N2) return null; return WT[b * N2 + a]; }
function walkable(k){ if (S.terr[k] === 'w') return false; const b = S.bld[k]; if (b) return b.t === 'road' || b.t === 'park'; return !S.feat[k]; }
function gWalk(gi, gj){
  if (gj < 0 || gj >= N || gi < 0 || gi >= GW) return false;
  if (isBridge(gi, gj)) return S.bridge;
  if (gi < N) return walkable(idx(gi, gj));
  const w = wildAt(gi, gj); return !!(w && w.land && !w.tree && !w.rock);
}
function gY(gi, gj){
  if (isBridge(gi, gj)) return .07;
  if (gi >= 0 && gi < N && gj >= 0 && gj < N) return S.terr[idx(gi, gj)] === 'w' ? -.2 : tileY(idx(gi, gj));
  const w = wildAt(gi, gj); if (w && w.land) return w.h * HS - (w.zone === 'shore' ? .03 : 0);
  return -.2;
}
function genWild(seed){
  const r = mulberry32((seed ^ 0x9e3779b9) >>> 0), n1 = noise2(r, 4, N2), n2 = noise2(r, 4, N2), n3 = noise2(r, 3, N2), n4 = noise2(r, 5, N2);
  WT = []; HAB = {lake:[], meadow:[], hill:[]};
  const c = (N2 - 1) / 2, wb = BR.j - OZJ;
  for (let b = 0; b < N2; b++) for (let a = 0; a < N2; a++){
    const d = Math.hypot(a - c, b - c) / c;
    const land = n1(a, b) * .45 + .7 - d * d * .62 > .3 || (b === wb && a <= 3);
    const w = {land, h:0, zone:'meadow', tree:false, rock:false, tall:false, flower:false};
    if (land){
      if (d > .88) w.zone = 'shore';
      else if (n2(a, b) > .7 && d < .7) { w.zone = 'lake'; w.land = false; }
      else if (n3(a, b) > .52){ w.zone = 'hill'; w.h = n3(a, b) > .66 ? 2 : 1; }
      if (b === wb && a <= 3){ w.zone = a === 0 ? 'shore' : 'meadow'; w.land = true; w.h = 0; }
      if (w.land){
        const q = r();
        if (w.zone === 'meadow'){ if (n4(a, b) > .66 && q < .5) w.tree = true; else { w.tall = r() < .55; w.flower = r() < .4; } }
        else if (w.zone === 'hill'){ if (q < .12) w.rock = true; else if (q < .22) w.tree = true; }
        if (b === wb && a <= 3){ w.tree = w.rock = false; }
      }
    }
    WT.push(w);
  }
  // guarantee a lake and a hill exist
  if (!WT.some(w => w.zone === 'lake')) for (const [a, b] of [[8, 9], [9, 9], [8, 10], [9, 10], [10, 10]]){ const w = WT[b * N2 + a]; Object.assign(w, {land:false, zone:'lake', h:0, tree:false, rock:false, tall:false}); }
  if (!WT.some(w => w.zone === 'hill')) for (const [a, b] of [[8, 3], [9, 3], [8, 4], [9, 4], [10, 4], [9, 5]]){ const w = WT[b * N2 + a]; Object.assign(w, {land:true, zone:'hill', h:(a + b) % 2 + 1, tree:false, tall:false}); }
  for (let b = 0; b < N2; b++) for (let a = 0; a < N2; a++){
    const w = WT[b * N2 + a]; const gi = a + OXI, gj = b + OZJ;
    if (w.zone === 'lake') HAB.lake.push([gi, gj]);
    else if (w.land && w.zone === 'hill' && !w.tree && !w.rock) HAB.hill.push([gi, gj]);
    else if (w.land && (w.zone === 'meadow' || w.zone === 'shore') && !w.tree) HAB.meadow.push([gi, gj]);
  }
  let iL = 0; for (let i = 0; i < N; i++) if (S.terr[idx(i, BR.j)] !== 'w') iL = i;
  BR.i0 = iL + 1; BR.i1 = OXI - 1;
  buildStairs();
}
/* stairs between height levels: every raised area gets at least one way up */
let STAIRS = [], STAIR_SET = new Set(), STAIR_AT = new Map();
const ekey = (a, b, c, d) => { const k1 = b * GW + a, k2 = d * GW + c; return k1 < k2 ? k1 + '|' + k2 : k2 + '|' + k1; };
const wildWalk = (gi, gj) => { const w = wildAt(gi, gj); return !!(w && w.land && !w.tree && !w.rock); };
function canStep(ai, aj, bi, bj){
  const wa = wildAt(ai, aj), wb = wildAt(bi, bj);
  if (!wa || !wb || !wa.land || !wb.land || wa.h === wb.h) return true;
  return STAIR_SET.has(ekey(ai, aj, bi, bj));
}
function buildStairs(){
  STAIRS = []; STAIR_SET = new Set(); STAIR_AT = new Map();
  const reg = new Map(); let R = 0;
  for (let b = 0; b < N2; b++) for (let a = 0; a < N2; a++){
    const gi = a + OXI, gj = b + OZJ, key = gj * GW + gi;
    if (!wildWalk(gi, gj) || reg.has(key)) continue;
    const h = wildAt(gi, gj).h, q = [[gi, gj]]; reg.set(key, R);
    while (q.length){ const [x, y] = q.pop(); for (const [p, r] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){ const nx = x + p, ny = y + r, nk = ny * GW + nx; if (!reg.has(nk) && wildWalk(nx, ny) && wildAt(nx, ny).h === h){ reg.set(nk, R); q.push([nx, ny]); } } }
    R++;
  }
  const par = [...Array(R).keys()], find = x => par[x] === x ? x : (par[x] = find(par[x]));
  const cands = [];
  for (let b = 0; b < N2; b++) for (let a = 0; a < N2; a++){
    const gi = a + OXI, gj = b + OZJ; if (!wildWalk(gi, gj)) continue;
    for (const [p, r] of [[1, 0], [0, 1]]){
      const ni = gi + p, nj = gj + r; if (!wildWalk(ni, nj)) continue;
      const ha = wildAt(gi, gj).h, hb = wildAt(ni, nj).h; if (Math.abs(ha - hb) !== 1) continue;
      const lo = ha < hb ? [gi, gj] : [ni, nj], hi = ha < hb ? [ni, nj] : [gi, gj];
      cands.push({lo, hi, ra:reg.get(gj * GW + gi), rb:reg.get(nj * GW + ni), w:hash(gi * 7 + nj, gj * 3 + ni)});
    }
  }
  cands.sort((x, y) => x.w - y.w);
  const pairCount = new Map(), used = new Set();
  const addStair = c => {
    const [li, lj] = c.lo, [hi, hj] = c.hi, lk = lj * GW + li;
    const dx = hi - li, dz = hj - lj, sk = lk + ':' + dx + ':' + dz;
    if (used.has(sk)) return; used.add(sk);
    const st = {li, lj, dx, dz, y0:gY(li, lj), y1:gY(hi, hj)};
    STAIRS.push(st); STAIR_SET.add(ekey(li, lj, hi, hj));
    if (!STAIR_AT.has(lk)) STAIR_AT.set(lk, []); STAIR_AT.get(lk).push(st);
    const w = wildAt(li, lj); w.tall = false; w.flower = false;
  };
  for (const c of cands){
    const pa = find(c.ra), pb = find(c.rb), pk = Math.min(c.ra, c.rb) + '-' + Math.max(c.ra, c.rb);
    if (pa !== pb){ par[pa] = pb; addStair(c); pairCount.set(pk, 1); }
    else if (c.w < .18 && (pairCount.get(pk) || 0) < 2){ addStair(c); pairCount.set(pk, (pairCount.get(pk) || 0) + 1); }
  }
}
