/* 模型快取與外部美術：把靜態模型合併成少量網格，以及載入、套用外包的 GLB 模型。 */
'use strict';

/* ---- bake: merge static meshes per material ---- */
const CACHE = new Map();
function bakeGroup(root){
  root.updateMatrixWorld(true);
  const buckets = new Map();
  const walk = o => { for (const ch of o.children){ if (ch.isMesh){ let g = ch.geometry.index ? ch.geometry.toNonIndexed() : ch.geometry.clone(); g.applyMatrix4(ch.matrixWorld); if (!buckets.has(ch.material)) buckets.set(ch.material, []); buckets.get(ch.material).push(g); ch.geometry.dispose(); } walk(ch); } };
  walk(root);
  const out = [];
  for (const [mat, geos] of buckets){
    let n = 0; for (const g of geos) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), hasUV = geos.every(g => g.attributes.uv), uv = hasUV ? new Float32Array(n * 2) : null;
    let o = 0;
    for (const g of geos){ pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); if (uv) uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; g.dispose(); }
    const geo = new T3.BufferGeometry();
    geo.setAttribute('position', new T3.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T3.BufferAttribute(nor, 3)); if (uv) geo.setAttribute('uv', new T3.BufferAttribute(uv, 2));
    geo.computeBoundingSphere();
    out.push([geo, mat]);
  }
  return out;
}
/* ---- external art (GLB) ----
   File names map straight to slots. Published art lives next to the page under art/ and is listed in ART_FILES;
   anything missing falls back to the procedural models above. */
const ART_FILES = {};
const ART_SLOTS = [];
for (const k of ['ripple', 'ember', 'moss', 'pebble', 'fluff', 'zap']) for (const st of [1, 2]) ART_SLOTS.push(`spirit_${k}_s${st}`);
for (const t of ['house', 'farm', 'lumber', 'plant', 'furnace', 'shop', 'park', 'school']) for (let lv = 1; lv <= 3; lv++) ART_SLOTS.push(`building_${t}_lv${lv}`);
ART_SLOTS.push('building_center_lv1', 'person_villager', 'person_mayor');
const ARTM = new Map(), TOONC = new Map();
let gltfLoader = null;
function getLoader(){ if (!gltfLoader && T3.GLTFLoader) gltfLoader = new T3.GLTFLoader(); return gltfLoader; }
function toonMat(m, skinned){
  const key = m.uuid + (skinned ? 's' : '');
  if (TOONC.has(key)) return TOONC.get(key);
  const p = {color:m.color ? m.color.clone() : new T3.Color(1, 1, 1), roughness:.85, metalness:0, transparent:!!m.transparent, opacity:m.opacity ?? 1, side:m.side ?? T3.FrontSide, skinning:!!skinned, vertexColors:!!m.vertexColors};
  if (m.map) p.map = m.map;
  if (m.emissive && (m.emissive.r + m.emissive.g + m.emissive.b) > 0){ p.emissive = m.emissive.clone(); p.emissiveIntensity = m.emissiveIntensity ?? 1; if (m.emissiveMap) p.emissiveMap = m.emissiveMap; }
  if (m.alphaTest) p.alphaTest = m.alphaTest;
  const t = new T3.MeshStandardMaterial(p); t.name = m.name || ''; TOONC.set(key, t); return t;
}
function registerArt(slot, gltf){
  const root = gltf.scene || gltf.scenes?.[0]; if (!root) return false;
  root.traverse(o => { if (o.isMesh){ o.castShadow = o.receiveShadow = true; o.material = Array.isArray(o.material) ? o.material.map(m => toonMat(m, o.isSkinnedMesh)) : toonMat(o.material, o.isSkinnedMesh); } });
  const wrap = new T3.Group(); wrap.add(root);
  root.updateMatrixWorld(true);
  const box = new T3.Box3().setFromObject(root), sz = box.getSize(new T3.Vector3());
  let s = 1;
  if (slot.startsWith('building_')){ const fp = Math.max(sz.x, sz.z); if (fp > 1.02 || fp < .5) s = .92 / fp; }
  else if (slot.startsWith('spirit_')) s = sz.y > 0 ? .45 / sz.y : 1;
  else if (slot.startsWith('person_')) s = sz.y > 0 ? .31 / sz.y : 1;
  root.scale.multiplyScalar(s);
  root.updateMatrixWorld(true);
  const b2 = new T3.Box3().setFromObject(root), c = b2.getCenter(new T3.Vector3());
  root.position.x -= c.x; root.position.z -= c.z; root.position.y -= b2.min.y;
  ARTM.set(slot, {root:wrap, anims:gltf.animations || []});
  return true;
}
function cloneArt(slot){
  const a = ARTM.get(slot);
  const obj = T3.SkeletonUtils ? T3.SkeletonUtils.clone(a.root) : a.root.clone(true);
  let mixer = null; const actions = {};
  if (a.anims.length){ mixer = new T3.AnimationMixer(obj); for (const clip of a.anims) actions[clip.name.toLowerCase()] = mixer.clipAction(clip); }
  return {obj, mixer, actions};
}
function playAnim(u, names){
  if (!u.mixer) return;
  let act = null;
  for (const n of names){ for (const k in u.actions) if (k.includes(n)){ act = u.actions[k]; break; } if (act) break; }
  if (!act){ const first = Object.values(u.actions)[0]; act = first || null; }
  if (!act || u.curAct === act) return;
  if (u.curAct) u.curAct.fadeOut(.2);
  act.reset().fadeIn(.2).play(); u.curAct = act;
}
function loadArtAll(){
  const ld = getLoader(), list = Object.entries(ART_FILES);
  if (!ld || !list.length) return;
  Promise.all(list.map(([slot, url]) => new Promise(res => ld.load(url, g => { registerArt(slot, g); res(); }, undefined, () => res())))).then(() => artChanged());
}
function importArtFiles(files, done){
  const ld = getLoader(); if (!ld){ done({ok:[], bad:[...files].map(f => f.name), reason:'模型載入器沒有載入成功'}); return; }
  const ok = [], bad = [];
  Promise.all([...files].map(f => new Promise(res => {
    const slot = f.name.replace(/\.(glb|gltf)$/i, '').toLowerCase();
    if (!ART_SLOTS.includes(slot)){ bad.push(f.name); res(); return; }
    f.arrayBuffer().then(buf => ld.parse(buf, '', g => { if (registerArt(slot, g)) ok.push(slot); else bad.push(f.name); res(); }, () => { bad.push(f.name); res(); }), () => { bad.push(f.name); res(); });
  }))).then(() => { if (ok.length) artChanged(); done({ok, bad}); });
}
function artChanged(){
  for (const [, o] of tileObjs) o.key = '#';
  for (const [, a] of agents) scene.remove(a.o); agents.clear();
  for (const w of wild) scene.remove(w.o); wild = []; for (let q = 0; q < 8; q++) spawnWild();
  for (const p of people){ scene.remove(p.g); if (p.pet) scene.remove(p.pet); } people.length = 0;
  if (mayor){ const old = mayor.g, g = mayorMesh(); g.position.copy(old.position); g.rotation.y = old.rotation.y; scene.remove(old); scene.add(g); mayor.g = g; }
  syncWorld(); makeThumbs(); buildToolButtons();
}

function instance(sig, build, shadow = true){
  if (sig.startsWith('glb:')){ const out = new T3.Group(); out.add(cloneArt(sig.slice(4)).obj); return out; }
  let parts = CACHE.get(sig);
  if (!parts){ const g = new T3.Group(); build(g); parts = bakeGroup(g); CACHE.set(sig, parts); }
  const out = new T3.Group();
  for (const [geo, mat] of parts){ const m = new T3.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = true; out.add(m); }
  return out;
}
