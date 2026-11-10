/* 會動的角色：隊伍與派駐中的島丸、野生島丸、街上的居民和寵物、無人機。 */
'use strict';

/* ---- creature agents ---- */
const agents = new Map();
let wild = [], wildTimer = 0;
function turnTo(o, a, dt){ let da = a - o.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); o.rotation.y += da * Math.min(1, dt * 8); }
function stepToward(o, tx, tz, sp, dt){
  const dx = tx - o.position.x, dz = tz - o.position.z, d = Math.hypot(dx, dz);
  if (d < .01) return 0;
  const m = Math.min(d, sp * dt); o.position.x += dx / d * m; o.position.z += dz / d * m; turnTo(o, Math.atan2(dx, dz), dt);
  return d - m;
}
function groundY(x, z){
  const [gi, gj] = toG(x, z); let y = gY(gi, gj);
  const st = STAIR_AT.get(gj * GW + gi);
  if (st){
    const [cx, cz] = gXZ(gi, gj);
    for (const s of st){ const u = (x - cx) * s.dx + (z - cz) * s.dz, v = (x - cx) * s.dz - (z - cz) * s.dx; if (u > .04 && Math.abs(v) < .36) y = Math.max(y, s.y0 + clamp((u - .04) / .46, 0, 1) * (s.y1 - s.y0)); }
  }
  if (gj === BR.j && (gi === BR.i0 - 1 || gi === BR.i1 + 1)){
    const [cx] = gXZ(gi, gj), edge = gi === BR.i0 - 1 ? cx + .5 : cx - .5, d = Math.abs(x - edge);
    if (d < .3) y = Math.max(y, .07 - d / .3 * (.07 - y));
  }
  return y;
}
function animCreature(o, t, dt, moving, fly){
  const u = o.userData, b = u.body;
  if (u.glb){
    let y = .22;
    if (!reduceMotion && !moving && !fly && u.hop <= 0 && Math.random() < dt * .18) u.hop = 1;
    if (u.hop > 0){ u.hop -= dt * 2.2; if (!u.mixer) y += Math.sin(Math.max(0, u.hop) * Math.PI) * .14; }
    if (fly && !reduceMotion) y += Math.sin(t * 2.2 + u.ph) * .05;
    b.position.y = y;
    playAnim(u, fly ? ['fly', 'walk', 'idle'] : u.hop > 0 ? ['hop', 'idle'] : moving ? ['walk', 'idle'] : ['idle']);
    if (u.mixer) u.mixer.update(dt);
    return;
  }
  let y = .22 + (fly ? Math.sin(t * 2.2 + u.ph) * .05 : Math.sin(t * 3 + u.ph) * .02);
  if (!reduceMotion){
    if (!fly && !moving && u.hop <= 0 && Math.random() < dt * .18) u.hop = 1;
    if (moving && !fly) y += Math.abs(Math.sin(t * 11 + u.ph)) * .035;
    if (u.hop > 0){ u.hop -= dt * 2.2; y += Math.sin(Math.max(0, u.hop) * Math.PI) * .14; }
    const sq = 1 + Math.sin(t * 6 + u.ph) * .02; b.scale.set(1 / sq, sq, 1 / sq);
    if (u.parts.flames) u.parts.flames.forEach((f, n) => { const s = .85 + Math.abs(Math.sin(t * 9 + n * 2)) * .35; f.scale.set(1, s, 1); });
    if (u.parts.bulb) u.parts.bulb.material.emissiveIntensity = .6 + Math.abs(Math.sin(t * 4)) * .9;
    if (u.parts.rings) u.parts.rings.forEach((r, n) => { r.rotation.z += dt * (n ? -2 : 2.5); });
    if (u.parts.hands) u.parts.hands.forEach((h, n) => { h.position.y = -.02 + Math.sin(t * 3 + n * 2) * .03; h.rotation.y += dt; });
    if (u.parts.wings) u.parts.wings.forEach((w, n) => { w.rotation.z = (n ? -1 : 1) * (.3 + Math.sin(t * (fly ? 16 : 8)) * .4); });
  }
  b.position.y = reduceMotion ? .22 : y;
}
function newCreature(sp, scale = 1, stage = 1){
  const o = creature(sp, stage); o.scale.setScalar(.01); o.userData.ring.visible = false; o.userData.size = scale;
  anims.push({obj:o, t0:now(), d:.5, to:scale}); scene.add(o); return o;
}
function syncSpirits(){
  const want = new Map();
  let shown = 0;
  for (const s of S.spirits){ if (s.loc === 'center' && shown++ >= 6) continue; want.set('s' + s.id, s.sp + '|' + (s.stage || 1)); }
  for (const [id, a] of agents) if (!want.has(id) || want.get(id) !== a.key){ scene.remove(a.o); agents.delete(id); }
  for (const [id, key] of want){
    if (agents.has(id)) continue;
    const [sp, st] = key.split('|'), o = newCreature(sp, .64, +st);
    const start = mayor ? [mayor.g.position.x, mayor.g.position.z] : [0, 0];
    o.position.set(start[0], groundY(start[0], start[1]), start[1]);
    agents.set(id, {id, sp, key, o, wp:null, pause:0, fly:!!SP[sp].fly});
  }
  for (const [id, a] of agents){
    const s = S.spirits.find(x => 's' + x.id === id);
    a.mode = s.loc; a.at = s?.at ?? null; a.spirit = s;
  }
}
function zoneOk(gi, gj, zone){
  if (zone === 'lake'){ const w = wildAt(gi, gj); return !!(w && w.zone === 'lake'); }
  const w = wildAt(gi, gj); return !!(w && w.land && !w.tree && !w.rock && (zone === 'meadow' ? (w.zone === 'meadow' || w.zone === 'shore') : w.zone === zone));
}
function nextWP(a, home, r, ok){
  if (a.fly){ const gi = home[0] + rint(-r, r), gj = home[1] + rint(-r, r); const [x, z] = gXZ(gi, gj); return [x + (Math.random() - .5) * .6, z + (Math.random() - .5) * .6]; }
  const [ci, cj] = toG(a.o.position.x, a.o.position.z), opts = [];
  for (const [p, q] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){ const gi = ci + p, gj = cj + q; if (cheb(gi, gj, home[0], home[1]) <= r && ok(gi, gj) && canStep(ci, cj, gi, gj)) opts.push([gi, gj]); }
  const [gi, gj] = opts.length ? pickR(opts) : home; const [x, z] = gXZ(gi, gj);
  return [x + (Math.random() - .5) * .5, z + (Math.random() - .5) * .5];
}
// mayor breadcrumb trail for the team to follow
const trail = [];
function trailPoint(dist){
  if (!mayor) return [0, 0];
  let px = mayor.g.position.x, pz = mayor.g.position.z, acc = 0;
  for (let n = trail.length - 1; n >= 0; n--){
    const [x, z] = trail[n], d = Math.hypot(x - px, z - pz);
    if (acc + d >= dist){ const f = (dist - acc) / d; return [px + (x - px) * f, pz + (z - pz) * f]; }
    acc += d; px = x; pz = z;
  }
  return [px, pz];
}
function updateAgents(dt, t){
  if (mayor){
    const p = mayor.g.position, l = trail[trail.length - 1];
    if (!l || Math.hypot(l[0] - p.x, l[1] - p.z) > .05){ trail.push([p.x, p.z]); if (trail.length > 300) trail.shift(); }
  }
  const team = [...agents.values()].filter(a => a.mode === 'team').sort((a, b) => (a.spirit?.first ? -1 : b.spirit?.first ? 1 : a.id.localeCompare(b.id, undefined, {numeric:true})));
  team.forEach((a, n) => {
    const [tx, tz] = trailPoint(.42 + n * .36);
    const d = Math.hypot(tx - a.o.position.x, tz - a.o.position.z);
    const sp = d > 2.5 ? 4 : clamp(d * 3.2, 0, 2.4);
    const rem = stepToward(a.o, tx, tz, sp, dt);
    const moving = rem > .03 && sp > .2;
    const gy = groundY(a.o.position.x, a.o.position.z) + (a.fly ? .35 : 0);
    a.o.position.y += (gy - a.o.position.y) * Math.min(1, dt * 10);
    if (!moving && mayor) turnTo(a.o, mayor.g.rotation.y, dt * .5);
    animCreature(a.o, t, dt, moving, a.fly);
  });
  for (const a of agents.values()){
    if (a.mode === 'team') continue;
    let home, r, ok;
    if (a.mode === 'work' && a.at != null){ home = [a.at % N, (a.at / N) | 0]; r = 1; ok = (gi, gj) => inb(gi, gj) && walkable(idx(gi, gj)); }
    else { const ck = centerTile(); home = ck >= 0 ? [ck % N, (ck / N) | 0] : [12, 12]; r = 2; ok = (gi, gj) => inb(gi, gj) && walkable(idx(gi, gj)); }
    if (!a.wp || (a.pause <= 0 && Math.hypot(a.wp[0] - a.o.position.x, a.wp[1] - a.o.position.z) < .05)){
      if (a.wp && Math.random() < .5 && a.pause <= 0) a.pause = 1 + Math.random() * 3;
      else if (a.pause <= 0) a.wp = nextWP(a, home, r, ok);
    }
    if (!a.wp){ const [x, z] = gXZ(home[0], home[1]); a.wp = [x + .42, z + .42]; }
    a.pause -= dt;
    const rem = a.pause > 0 ? 0 : stepToward(a.o, a.wp[0], a.wp[1], a.fly ? .7 : .5, dt);
    const gy = groundY(a.o.position.x, a.o.position.z) + (a.fly ? .5 : 0);
    a.o.position.y += (gy - a.o.position.y) * Math.min(1, dt * 8);
    animCreature(a.o, t, dt, rem > .02, a.fly);
  }
  // wild spirits
  wildTimer -= dt;
  const target = 9;
  if (wild.length < target && wildTimer <= 0 && WT.length){ spawnWild(); wildTimer = 2.5; }
  for (let q = wild.length - 1; q >= 0; q--){
    const w = wild[q];
    if (w.gone){ w.gone -= dt; w.o.scale.multiplyScalar(Math.max(0, 1 - dt * 4)); if (w.gone <= 0){ scene.remove(w.o); wild.splice(q, 1); } continue; }
    if (w.held){ animCreature(w.o, t, dt, false, w.fly); if (mayor) turnTo(w.o, Math.atan2(mayor.g.position.x - w.o.position.x, mayor.g.position.z - w.o.position.z), dt); continue; }
    if (!w.wp || (w.pause <= 0 && Math.hypot(w.wp[0] - w.o.position.x, w.wp[1] - w.o.position.z) < .05)){
      if (w.wp && Math.random() < .45 && w.pause <= 0) w.pause = 1 + Math.random() * 3;
      else if (w.pause <= 0) w.wp = nextWP(w, w.home, 3, (gi, gj) => zoneOk(gi, gj, w.zone));
    }
    w.pause -= dt;
    const rem = w.pause > 0 ? 0 : stepToward(w.o, w.wp[0], w.wp[1], w.fly ? .6 : .45, dt);
    const [gi, gj] = toG(w.o.position.x, w.o.position.z), wt = wildAt(gi, gj);
    const gy = w.zone === 'lake' && wt && !wt.land ? -.3 : groundY(w.o.position.x, w.o.position.z) + (w.fly ? .55 : 0);
    w.o.position.y += (gy - w.o.position.y) * Math.min(1, dt * 8);
    animCreature(w.o, t, dt, rem > .02, w.fly);
  }
}
function spawnWild(){
  const pool = []; for (const k of SPK){ const wt = [0, 6, 3, 1.4][SP[k].rare]; for (let q = 0; q < wt * 10; q++) pool.push(k); }
  const sp = pickR(pool), d = SP[sp], tiles = HAB[d.hab]; if (!tiles.length) return;
  const home = pickR(tiles), o = newCreature(sp, .75), [x, z] = gXZ(home[0], home[1]);
  o.position.set(x, gY(home[0], home[1]), z);
  wild.push({sp, o, home, zone:d.hab, wp:null, pause:0, fly:!!d.fly, held:false});
}

/* ---- villagers ---- */
const drones = [];
function makeDrone(){
  const g = new T3.Group(), rot = [];
  bx(g, .16, .035, .1, '#2a2f3a', 0, 0, 0); bx(g, .1, .02, .06, neon(pickR([CY, PK, PU])), 0, -.005, 0);
  for (const [x, z] of [[-.1, -.07], [.1, -.07], [-.1, .07], [.1, .07]]){ bx(g, .015, .015, .015, '#3a4048', x * .8, .02, z * .8); const r = add(g, new T3.CylinderGeometry(.05, .05, .006, 12), new T3.MeshBasicMaterial({color:'#cfd6df', transparent:true, opacity:.45, depthWrite:false}), x, .05, z); rot.push(r); }
  const led = add(g, new T3.SphereGeometry(.014, 6, 4), Mt(PK, {smooth:true, e:PK, ei:2.4}), .085, .015, 0);
  if (Math.random() < .5){ bx(g, .004, .1, .004, '#3a4048', 0, -.12, 0); bx(g, .08, .07, .08, '#c9925a', 0, -.19, 0); bx(g, .081, .012, .081, '#e0523f', 0, -.15, 0); }
  g.traverse(o => { if (o.isMesh && o.material.type !== 'MeshBasicMaterial') o.castShadow = true; });
  scene.add(g);
  return {g, rot, led, wp:null, sp:.9 + Math.random() * .8, ph:Math.random() * 6};
}
function updateDrones(dt, t){
  if (!CYBER_ON) return;
  const want = Math.min(10, 3 + Math.floor(S.pop / 40));
  while (drones.length < want){ const d = makeDrone(); d.g.position.set((Math.random() - .5) * 14, 2.4, (Math.random() - .5) * 14); drones.push(d); }
  for (const d of drones){
    if (!d.wp || Math.hypot(d.wp[0] - d.g.position.x, d.wp[2] - d.g.position.z) < .2){ const k = rint(0, N * N - 1); const [x, z] = tileXZ(k % N, (k / N) | 0); d.wp = [x, 1.9 + Math.random() * 1.2, z]; }
    const dx = d.wp[0] - d.g.position.x, dz = d.wp[2] - d.g.position.z, dist = Math.hypot(dx, dz), m = Math.min(dist, d.sp * dt);
    if (!reduceMotion){ d.g.position.x += dx / dist * m; d.g.position.z += dz / dist * m; d.g.position.y += (d.wp[1] + Math.sin(t * 2 + d.ph) * .05 - d.g.position.y) * Math.min(1, dt * 2); }
    turnTo(d.g, Math.atan2(dx, dz) + Math.PI / 2, dt * .6);
    d.g.rotation.z = -.15; d.rot.forEach(r => { r.rotation.y += dt * 40; });
    d.led.visible = Math.sin(t * 6 + d.ph) > -.2;
  }
}
function roadTiles(){ const r = []; for (let k = 0; k < N * N; k++) if (S.bld[k]?.t === 'road') r.push(k); return r; }
function animPerson(u, walking, ph, t, dt, canWave){
  if (u.glb){
    if (!walking && canWave && !reduceMotion && u.wave <= 0 && Math.random() < dt * .15) u.wave = 2;
    if (u.wave > 0) u.wave -= dt;
    playAnim(u, u.wave > 0 ? ['wave', 'idle'] : walking ? ['walk', 'idle'] : ['idle']);
    if (u.mixer) u.mixer.update(dt);
    return;
  }
  const sw = walking && !reduceMotion ? Math.sin(ph) : 0;
  u.legs[0].rotation.x = sw * .65; u.legs[1].rotation.x = -sw * .65;
  if (!walking && canWave && !reduceMotion && u.wave <= 0 && Math.random() < dt * .15) u.wave = 2;
  if (u.wave > 0){ u.wave -= dt; u.arms[0].rotation.set(0, 0, -2.5 + Math.sin(t * 12) * .35); u.arms[1].rotation.set(0, 0, .12); }
  else { u.arms[0].rotation.set(-sw * .55, 0, -.12); u.arms[1].rotation.set(sw * .55, 0, .12); }
  u.head.rotation.y = walking ? Math.sin(ph * .5) * .08 : Math.sin(t * .8 + (u.hp || 0)) * .35;
}
function updatePeople(dt, t){
  const roads = roadTiles();
  const want = roads.length ? Math.min(40, Math.round(S.pop / 3.5)) : 0;
  while (people.length < want){
    const k = roads[(Math.random() * roads.length) | 0], g = personMesh();
    const p = {g, at:k, to:k, f:1, ox:(Math.random() - .5) * .62, oz:(Math.random() - .5) * .62, sp:.45 + Math.random() * .35, ph:Math.random() * 6, prev:-1, pet:null};
    g.userData.hp = p.ph;
    if (Math.random() < .2){ const o = newCreature(pickR(SPK), .38); p.pet = o; }
    scene.add(g); people.push(p);
  }
  while (people.length > want){ const p = people.pop(); scene.remove(p.g); if (p.pet) scene.remove(p.pet); }
  const mood = E.happy >= 60 ? 0 : E.happy >= 40 ? 1 : 2;
  for (const p of people){
    if (S.bld[p.at]?.t !== 'road' || S.bld[p.to]?.t !== 'road'){ p.at = p.to = roads[(Math.random() * roads.length) | 0]; p.f = 1; }
    if (p.f >= 1){
      p.prev = p.at; p.at = p.to; p.f = 0;
      const i = p.at % N, j = (p.at / N) | 0, opts = [];
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (bAt(i + a, j + b)?.t === 'road') opts.push(idx(i + a, j + b));
      const fwd = opts.filter(o => o !== p.prev);
      p.to = fwd.length ? fwd[(Math.random() * fwd.length) | 0] : opts.length ? opts[0] : p.at;
      if (p.to === p.at) p.f = 1 - Math.random() * .5;
    }
    const i0 = p.at % N, j0 = (p.at / N) | 0, i1 = p.to % N, j1 = (p.to / N) | 0;
    const dist = p.to === p.at ? 0 : 1;
    p.f += dist ? p.sp * dt : dt * .5;
    const f = Math.min(1, p.f), [x0, z0] = tileXZ(i0, j0), [x1, z1] = tileXZ(i1, j1);
    const x = x0 + (x1 - x0) * f + p.ox, z = z0 + (z1 - z0) * f + p.oz;
    const u = p.g.userData, walking = !!dist && f < 1, ph = t * 10 * p.sp + p.ph;
    const bob = walking && !reduceMotion ? Math.abs(Math.cos(ph)) * .012 : 0;
    p.g.position.set(x, .045 + bob, z);
    if (dist) turnTo(p.g, Math.atan2(x1 - x0, z1 - z0), dt * 1.25);
    animPerson(u, walking, ph, t, dt, true);
    if (u.mood !== mood){ u.mood = mood; u.mouths.forEach((m, n) => { if (m) m.visible = n === mood; }); }
    if (p.pet){
      const ry = p.g.rotation.y, tx = x - Math.sin(ry) * .2 + Math.cos(ry) * .1, tz = z - Math.cos(ry) * .2 - Math.sin(ry) * .1;
      const rem = stepToward(p.pet, tx, tz, 1.2, dt); p.pet.position.y = .045; animCreature(p.pet, t, dt, rem > .02, false);
    }
  }
}
