/* 把遊戲狀態同步到 3D 場景：建築、合併外觀、狀態泡泡、拆除煙塵、剪綵彩帶。 */
'use strict';

/* ---- sync state -> scene ---- */
function syncWorld(){
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++){
    const k = idx(i, j), b = S.bld[k], cur = tileObjs.get(k);
    const d = b ? describe(b.t, i, j, b.id, b.lv || 1) : null;
    const key = d ? d.sig + '@' + d.rot.toFixed(2) : '';
    if (cur && cur.key === key) continue;
    if (cur){ world.remove(cur.obj); if (cur.dyn) dynList.splice(dynList.indexOf(cur.dyn), 1); tileObjs.delete(k); }
    if (!d) continue;
    const obj = instance(d.sig, d.build, b.t !== 'road');
    const [x, z] = tileXZ(i, j); obj.position.set(x, tileY(k), z); obj.rotation.y = d.rot;
    let dyn = null;
    if (d.dyn){ const dg = d.dyn(); obj.add(dg); dyn = {k, g:dg}; dynList.push(dyn); }
    world.add(obj);
    if (popIn.has(k)){ popIn.delete(k); obj.scale.setScalar(.01); anims.push({obj, t0:now(), d:.45}); }
    tileObjs.set(k, {key, obj, dyn});
  }
  const fs = S.feat.join('') + '|' + S.bld.map(b => b ? 1 : 0).join('');
  if (fs !== featSig){ featSig = fs; buildFeatures(); }
  const want = new Map();
  for (const [k, inf] of E.info){ if (!inf.active) want.set(k, 0); else if (S.bld[k]?.t === 'house' && inf.happy < 35) want.set(k, 1); }
  for (const [k, s] of sprites){ if (want.get(k) !== s.userData.kind){ scene.remove(s); sprites.delete(k); } }
  for (const [k, kind] of want){
    if (sprites.has(k)) continue;
    const s = new T3.Sprite(BADGE[kind]); s.scale.set(.42, .42, 1); s.renderOrder = 10;
    const i = k % N, j = (k / N) | 0, [x, z] = tileXZ(i, j); s.position.set(x, 1.15, z); s.userData = {kind, base:1.15};
    scene.add(s); sprites.set(k, s);
  }
  const groups = new Map();
  for (let k = 0; k < N * N; k++){ const b = S.bld[k]; if (b?.g){ if (!groups.has(b.g)) groups.set(b.g, []); groups.get(b.g).push(k); } }
  for (const [gid, o] of groupObjs){ const tl = groups.get(gid), b = tl && S.bld[tl[0]]; if (!tl || o.key !== b.t + '|' + (b.lv || 1) + '|' + tl.join(',')){ world.remove(o.obj); groupObjs.delete(gid); } }
  for (const [gid, tl] of groups){
    if (groupObjs.has(gid)) continue;
    const b = S.bld[tl[0]], i0 = Math.min(...tl.map(k => k % N)), j0 = Math.min(...tl.map(k => (k / N) | 0));
    const obj = groupOverlay(b.t, b.lv || 1), [x, z] = tileXZ(i0, j0); obj.position.set(x + .5, 0, z + .5); world.add(obj);
    groupObjs.set(gid, {key:b.t + '|' + (b.lv || 1) + '|' + tl.join(','), obj});
  }
  if (gate) gate.visible = !S.bridge;
  syncSpirits();
}

function puff(i, j){
  const [x, z] = tileXZ(i, j), m = Mt('#e9e4da', {t:.85});
  for (let q = 0; q < 8; q++){
    const p = add(scene, new T3.IcosahedronGeometry(.08 + Math.random() * .06, 0), m, x + (Math.random() - .5) * .5, .1, z + (Math.random() - .5) * .5);
    debris.push({p, vx:(Math.random() - .5) * .8, vy:.6 + Math.random() * .8, vz:(Math.random() - .5) * .8, t0:now(), life:.9, shrink:true});
  }
}
function confetti(x, y, z){
  const cols = ['#ffc94d', '#e86a5a', '#4f86d9', '#5aa36b', '#ef8fb2', '#ffffff'];
  for (let q = 0; q < 26; q++){
    const p = add(scene, new T3.BoxGeometry(.04, .006, .025), Mt(pickR(cols)), x, y, z);
    debris.push({p, vx:(Math.random() - .5) * 1.4, vy:1 + Math.random() * 1.2, vz:(Math.random() - .5) * 1.4, t0:now(), life:1.6, spin:Math.random() * 10});
  }
}
