/* 居民與鎮長模型：Q 版人物、隨機服裝髮型、表情。 */
'use strict';

/* ---- villagers: chibi people with limbs, hair and faces ---- */
const PG = {};
function pgeo(){
  if (PG.head) return PG;
  PG.leg = new T3.CylinderGeometry(.017, .015, .085, 7); PG.leg.translate(0, -.0425, 0);
  PG.shoe = new T3.BoxGeometry(.032, .018, .046); PG.shoe.translate(0, -.085, .008);
  PG.torso = new T3.CylinderGeometry(.04, .048, .1, 9);
  PG.skirt = new T3.CylinderGeometry(.042, .068, .07, 10);
  PG.arm = new T3.CylinderGeometry(.014, .013, .075, 6); PG.arm.translate(0, -.0375, 0);
  PG.hand = new T3.SphereGeometry(.016, 8, 6); PG.hand.translate(0, -.08, 0);
  PG.head = new T3.SphereGeometry(.056, 16, 12);
  PG.eye = new T3.SphereGeometry(.011, 8, 6);
  PG.glint = new T3.SphereGeometry(.004, 4, 4);
  PG.cheek = new T3.SphereGeometry(.011, 8, 6);
  PG.smile = new T3.TorusGeometry(.016, .0035, 4, 10, Math.PI);
  PG.flat = new T3.BoxGeometry(.024, .005, .005);
  PG.hairCap = new T3.SphereGeometry(.06, 14, 10, 0, Math.PI * 2, 0, Math.PI * .55);
  PG.hairBack = new T3.BoxGeometry(.1, .08, .03);
  PG.bun = new T3.SphereGeometry(.026, 10, 8);
  PG.brim = new T3.CylinderGeometry(.085, .085, .008, 16);
  PG.crown = new T3.CylinderGeometry(.05, .058, .045, 14);
  PG.cap = new T3.SphereGeometry(.061, 14, 8, 0, Math.PI * 2, 0, Math.PI * .5);
  PG.visor = new T3.BoxGeometry(.07, .006, .05);
  PG.pack = new T3.BoxGeometry(.06, .07, .03);
  PG.collar = new T3.TorusGeometry(.036, .007, 5, 14);
  return PG;
}
const SHIRTS = ['#e86a5a', '#4f86d9', '#f2b84b', '#5aa36b', '#9a6ad0', '#ef8fb2', '#3fb0b0', '#f2f2ee', '#ff9f5a'];
const PANTS = ['#3d4a5c', '#5b4a3a', '#2f3b44', '#6a7a8a', '#3a5a8a'];
const SKINS = ['#f6d2b4', '#ebbd97', '#d39e78', '#a8714d', '#7a4e33'];
const HAIRS = ['#2a1f1a', '#4a3020', '#7a4a28', '#c99a5a', '#e8d6a0', '#9a3a2a', '#555a60'];

function glbPerson(o, slot){
  const r = Math.random, pick = a => a[(r() * a.length) | 0];
  const {obj, mixer, actions} = cloneArt(slot), g = new T3.Group(); g.add(obj);
  if (!o.mayor){
    const tint = {shirt:o.shirt || pick(SHIRTS), pants:o.pants || pick(PANTS), hair:o.hair || pick(HAIRS)};
    obj.traverse(m => { if (!m.isMesh) return; const mats = Array.isArray(m.material) ? m.material : [m.material];
      const nm = mats.map(mt => { const k = Object.keys(tint).find(k => (mt.name || '').toLowerCase().includes(k)); if (!k) return mt; const c = mt.clone(); c.color = col(tint[k]); return c; });
      m.material = Array.isArray(m.material) ? nm : nm[0]; });
  }
  const mouths = ['mouth_happy', 'mouth_neutral', 'mouth_sad'].map(n => obj.getObjectByName(n) || null);
  g.scale.setScalar(.78);
  g.userData = {glb:true, mixer, actions, mouths, mood:-1, wave:0};
  return g;
}
function personMesh(o = {}){
  const pslot = o.mayor ? 'person_mayor' : 'person_villager';
  if (ARTM.has(pslot)) return glbPerson(o, pslot);
  const P = pgeo(), r = Math.random, pick = a => a[(r() * a.length) | 0];
  const g = new T3.Group(), skin = o.skin || pick(SKINS), shirt = o.shirt || pick(SHIRTS), hairC = o.hair || pick(HAIRS), pants = o.pants || pick(PANTS);
  const sm = hex => Mt(hex, {smooth:true, r:.6});
  const mesh = (geo, mat, x, y, z, parent = g, shadow = false) => { const m = new T3.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = shadow; parent.add(m); return m; };
  const skirt = !o.mayor && r() < .3;
  // legs (pivot at hip)
  const legs = [-1, 1].map(s => {
    const pv = new T3.Group(); pv.position.set(s * .02, .1, 0); g.add(pv);
    mesh(P.leg, sm(skirt ? skin : pants), 0, 0, 0, pv, true);
    mesh(P.shoe, Mt(pick(['#3a2a20', '#2a2f36', '#f2f2ee', '#c94b3d']), {r:.7}), 0, 0, 0, pv);
    return pv;
  });
  // torso
  mesh(P.torso, sm(shirt), 0, .15, 0, g, true);
  if (skirt) mesh(P.skirt, sm(pick(['#e86a5a', '#4f86d9', '#9a6ad0', '#f2b84b', '#3fb0b0'])), 0, .115, 0);
  const cyb = CYBER_ON && !o.mayor && r() < .45, ncol = pick([CY, PK, PU, YL]);
  const col2 = mesh(P.collar, cyb ? Mt(ncol, {smooth:true, e:ncol, ei:1.8}) : sm(shadeHex(shirt, .35)), 0, .198, 0); col2.rotation.x = Math.PI / 2;
  if (cyb && r() < .6){ const wb = mesh(new T3.TorusGeometry(.047, .005, 5, 16), Mt(ncol, {smooth:true, e:ncol, ei:1.8}), 0, .115, 0); wb.rotation.x = Math.PI / 2; }
  if (o.mayor){ const sh = mesh(new T3.BoxGeometry(.014, .13, .1), sm('#e8c35a'), 0, .15, 0); sh.rotation.z = .6; }
  else if (r() < .25) mesh(P.pack, sm(pick(['#c9784a', '#4a6a8a', '#d9b46a'])), 0, .15, -.05);
  // arms (pivot at shoulder)
  const arms = [-1, 1].map(s => {
    const pv = new T3.Group(); pv.position.set(s * .052, .19, 0); pv.rotation.z = s * .12; g.add(pv);
    mesh(P.arm, sm(shirt), 0, 0, 0, pv);
    mesh(P.hand, sm(skin), 0, 0, 0, pv);
    return pv;
  });
  // head
  const head = new T3.Group(); head.position.set(0, .262, 0); g.add(head);
  mesh(P.head, sm(skin), 0, 0, 0, head, true);
  for (const s of [-1, 1]){
    mesh(P.eye, Mt('#1b2329', {smooth:true, r:.3}), s * .02, .006, .051, head).scale.set(1, 1.25, .6);
    mesh(P.glint, Mt('#ffffff', {smooth:true}), s * .02 + .003, .011, .056, head);
    mesh(P.cheek, Mt('#ff8f9e', {smooth:true, t:.55}), s * .034, -.012, .045, head).scale.set(1, .6, .4);
  }
  const smile = mesh(P.smile, Mt('#7a3328', {smooth:true}), 0, -.016, .053, head); smile.rotation.z = Math.PI;
  const flat = mesh(P.flat, Mt('#7a3328', {smooth:true}), 0, -.02, .053, head);
  const frown = mesh(P.smile, Mt('#7a3328', {smooth:true}), 0, -.028, .052, head);
  // hair / hat
  const style = o.mayor ? 5 : (r() * 5) | 0, hm = sm(hairC);
  if (style === 0){ mesh(P.hairCap, hm, 0, .006, -.006, head).rotation.x = -.62; }
  else if (style === 1){ mesh(P.hairCap, hm, 0, .006, -.006, head).rotation.x = -.62; mesh(P.hairBack, hm, 0, -.03, -.035, head); }
  else if (style === 2){ mesh(P.hairCap, hm, 0, .006, -.006, head).rotation.x = -.62; mesh(P.bun, hm, 0, .06, -.02, head); }
  else if (style === 3){ const hc = pick(['#d9b46a', '#3a5a8a', '#c94b3d', '#f2f2ee']); mesh(P.brim, sm(hc), 0, .03, 0, head); mesh(P.crown, sm(hc), 0, .05, 0, head); mesh(P.hairBack, hm, 0, -.025, -.032, head).scale.set(.9, .6, 1); }
  else if (style === 5){ mesh(P.hairBack, hm, 0, -.03, -.03, head).scale.set(.9, .5, 1); mesh(P.brim, sm('#1d1f24'), 0, .035, 0, head); mesh(P.crown, sm('#1d1f24'), 0, .075, 0, head).scale.set(.9, 2, .9); mesh(P.crown, sm('#c94b3d'), 0, .05, 0, head).scale.set(.93, .45, .93); mesh(P.flat, Mt('#4a3a30', {smooth:true}), 0, -.006, .056, head).scale.set(1.6, 2.4, 2); }
  else { const cc = pick(['#e86a5a', '#4f86d9', '#5aa36b', '#2f3b44']); mesh(P.cap, sm(cc), 0, .008, -.004, head).rotation.x = -.32; mesh(P.visor, sm(cc), 0, .034, .052, head).rotation.x = -.25; }
  if (cyb && r() < .55){ mesh(new T3.BoxGeometry(.1, .022, .02), Mt(ncol, {smooth:true, e:ncol, ei:2, t:.85}), 0, .032, .05, head); mesh(new T3.TorusGeometry(.058, .005, 4, 18, Math.PI), sm('#3a4048'), 0, .032, 0, head).rotation.y = Math.PI; }
  g.scale.setScalar(.78);
  g.userData = {legs, arms, head, mouths:[smile, flat, frown], mood:-1, wave:0};
  return g;
}
