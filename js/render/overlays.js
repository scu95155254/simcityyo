/* 畫面提示：游標格子、放置預覽、影響範圍、選取框、海面波動。 */
'use strict';

/* ---- per-frame overlays ---- */
function radiusFor(i, j){
  if (tool.startsWith('a:')){ const s = S.spirits.find(x => x.id === +tool.slice(2)); return s?.sp === 'fluff' ? {r:2, col:SP.fluff.color} : null; }
  if (tool !== 'inspect' && tool !== 'bulldoze'){ const d = B[tool]; if (d.aura) return {r:d.aura.r, col:'#ffe08a'}; if (d.pollute) return {r:d.pollute.r, col:'#ff8a74'}; return null; }
  if (!inb(i, j)) return null;
  const b = S.bld[idx(i, j)]; if (!b) return null; const d = B[b.t];
  const au = E.info.get(idx(i, j))?.aura; if (au) return {r:au.r, col:'#ffe08a'};
  if (d.aura) return {r:d.aura.r, col:'#ffe08a'}; if (d.pollute) return {r:d.pollute.r, col:'#ff8a74'};
  return null;
}
function updateOverlays(t){
  const building = tool !== 'inspect';
  const h = hover && inb(hover[0], hover[1]) ? hover : null;
  let ok = false;
  if (h){
    const [i, j] = h, k = idx(i, j);
    if (tool === 'bulldoze') ok = !!(S.bld[k] || S.feat[k]);
    else if (tool.startsWith('a:')){ const s = S.spirits.find(x => x.id === +tool.slice(2)); ok = !!(s && S.bld[k] && S.bld[k].t !== 'road' && spiritFx(s.sp, S.bld[k].t, s.stage)); }
    else if (tool !== 'inspect') ok = !whyCant(tool, i, j);
  }
  const show = building && h;
  hoverMesh.visible = hoverEdge.visible = !!show;
  if (show){
    const [x, z] = tileXZ(h[0], h[1]), y = tileY(idx(h[0], h[1])) + (tool.startsWith('a:') ? .9 : 0);
    const c = tool === 'bulldoze' ? (ok ? '#ff8a74' : '#7f8c90') : ok ? '#8ee0a4' : '#ff8a74';
    hoverMesh.position.set(x, y + .05, z); hoverMesh.material.color.set(c); hoverEdge.position.set(x, y + .06, z); hoverEdge.material.color.set(c);
  }
  let gs = '';
  if (show && ok && tool !== 'bulldoze' && !tool.startsWith('a:')){ const d = describe(tool, h[0], h[1], S.nextId); gs = d.sig + '@' + d.rot; }
  if (gs !== ghostSig){
    if (ghost){ scene.remove(ghost); ghost = null; }
    ghostSig = gs;
    if (gs){ const d = describe(tool, h[0], h[1], S.nextId); ghost = instance(d.sig, d.build, false); ghost.rotation.y = d.rot; ghost.traverse(o => { if (o.isMesh){ o.material = ghostMat; o.castShadow = false; } }); scene.add(ghost); }
  }
  if (ghost && h){ const [x, z] = tileXZ(h[0], h[1]); ghost.position.set(x, tileY(idx(h[0], h[1])) + .01, z); ghostMat.opacity = .45 + Math.sin(t * 4) * .1; }
  let focus = building ? h : sel;
  const se = selEnt?.startsWith?.('s:') ? S.spirits.find(x => 's:' + x.id === selEnt) : null;
  if (!building && se?.loc === 'work'){ focus = [se.at % N, (se.at / N) | 0]; }
  const rad = focus ? (se?.loc === 'work' && se.sp === 'fluff' ? {r:2, col:SP.fluff.color} : radiusFor(focus[0], focus[1])) : null;
  const mo = !building && sel && !rad && inb(sel[0], sel[1]) ? mergeOption(sel[0], sel[1]) : null;
  if (mo){ const [x, z] = tileXZ(mo.i0, mo.j0); radMesh.visible = true; radMesh.position.set(x + .5, .05, z + .5); radMesh.scale.set(2, 2, 1); radMesh.material.color.set('#ffe08a'); }
  else radMesh.visible = !!rad;
  if (rad){ const [x, z] = tileXZ(focus[0], focus[1]); radMesh.position.set(x, .045, z); radMesh.scale.set(rad.r * 2 + 1, rad.r * 2 + 1, 1); radMesh.material.color.set(rad.col); }
  const edgeAt = !building && (sel || (se?.loc === 'work' ? focus : null));
  selEdge.visible = !!edgeAt;
  if (edgeAt){ const [x, z] = tileXZ(edgeAt[0], edgeAt[1]); selEdge.position.set(x, tileY(idx(edgeAt[0], edgeAt[1])) + .07, z); const s = 1 + Math.sin(t * 4) * .03; selEdge.scale.set(s, 1, s); }
  for (const [id, a] of agents) a.o.userData.ring.visible = selEnt === 's:' + id.slice(1) || tool === 'a:' + id.slice(1);
  for (const w of wild) w.o.userData.ring.visible = w.held;
  destRing.visible = !!(mayor && mayor.dest && mayor.state === 'walk');
  if (destRing.visible){ const [x, z] = gXZ(mayor.dest[0], mayor.dest[1]); destRing.position.set(x, Math.max(0, gY(mayor.dest[0], mayor.dest[1])) + .06, z); destRing.scale.setScalar(1 + Math.sin(t * 5) * .1); }
}
let waterT = 0;
function updateWater(t){
  if (reduceMotion && waterT) return; waterT = 1;
  const p = waterGeo.attributes.position.array;
  for (let k = 0; k < p.length; k += 3){ const x = waterBase[k], z = waterBase[k + 2]; p[k + 1] = Math.sin(x * .8 + t * 1.1) * .035 + Math.cos(z * 1.05 + t * .85) * .03 + Math.sin((x + z) * .4 + t * .6) * .02; }
  waterGeo.attributes.position.needsUpdate = true;
  if (foamMesh) foamMesh.material.opacity = .35 + Math.sin(t * 1.6) * .2;
}
