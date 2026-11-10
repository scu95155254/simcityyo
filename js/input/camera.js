/* 鏡頭與操作：平移縮放旋轉、滑鼠觸控、快捷鍵、點選角色。 */
'use strict';

/* ---- camera & picking ---- */
let W = 0, H = 0;
function resize(){
  const r = stage.getBoundingClientRect(); W = r.width; H = r.height;
  if (!renderer || !W || !H) return;
  renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); sizePost();
}
function homeCam(){ camT.tx = 0; camT.tz = 0; camT.dist = W < 640 ? 19 : 15; }
function applyCam(dt){
  const k = 1 - Math.exp(-dt * 9);
  cam.tx += (camT.tx - cam.tx) * k; cam.tz += (camT.tz - cam.tz) * k; cam.az += (camT.az - cam.az) * k; cam.dist += (camT.dist - cam.dist) * k;
  const pol = .78 + clamp((cam.dist - 3.5) / 38, 0, 1) * -.18 + .1;
  const sp = Math.sin(pol), cp = Math.cos(pol);
  camera.position.set(cam.tx + cam.dist * sp * Math.sin(cam.az), cam.dist * cp, cam.tz + cam.dist * sp * Math.cos(cam.az));
  camera.lookAt(cam.tx, 0, cam.tz);
  sky.position.copy(camera.position);
  scene.fog.near = cam.dist + 8; scene.fog.far = cam.dist + 70;
  sun.position.set(cam.tx - 9, 16, cam.tz + 7); sun.target.position.set(cam.tx, 0, cam.tz);
}
const ray = new T3.Raycaster(), ndc = new T3.Vector2();
function toTile(sx, sy){
  ndc.set(sx / W * 2 - 1, -(sy / H) * 2 + 1); ray.setFromCamera(ndc, camera);
  const o = ray.ray.origin, d = ray.ray.direction; if (Math.abs(d.y) < 1e-6) return [-1, -1];
  const t = -o.y / d.y, x = o.x + d.x * t, z = o.z + d.z * t;
  return [Math.floor(x + N / 2), Math.floor(z + N / 2)];
}
function panBy(dx, dy){
  const wpp = 2 * cam.dist * Math.tan(15 * Math.PI / 180) / H;
  const rx = Math.cos(cam.az), rz = -Math.sin(cam.az), fx = -Math.sin(cam.az), fz = -Math.cos(cam.az);
  camT.tx += (-rx * dx + fx * dy * 1.6) * wpp; camT.tz += (-rz * dx + fz * dy * 1.6) * wpp;
  camT.tx = clamp(camT.tx, -N / 2, OXI + N2 - N / 2); camT.tz = clamp(camT.tz, -N / 2, N / 2); if (follow) setFollow(false);
  cam.tx = camT.tx; cam.tz = camT.tz;
}
const zoomBy = f => { camT.dist = clamp(camT.dist * f, 3.5, 42); };
const rotBy = a => { camT.az += a; };

const pointers = new Map(); let drag = null, pinch = null, spaceDown = false;
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, {x:e.offsetX, y:e.offsetY});
  if (pointers.size === 2){
    const [a, b] = [...pointers.values()];
    pinch = {d:Math.hypot(a.x - b.x, a.y - b.y), a:Math.atan2(b.y - a.y, b.x - a.x), mx:(a.x + b.x) / 2, my:(a.y + b.y) / 2};
    drag = null; return;
  }
  const mode = e.pointerType === 'mouse' && e.button === 2 ? 'rot' : (e.pointerType !== 'mouse' || e.button === 1 || tool === 'inspect' || spaceDown) ? 'pan' : 'paint';
  drag = {id:e.pointerId, sx:e.offsetX, sy:e.offsetY, lx:e.offsetX, ly:e.offsetY, mode, moved:false, last:null, button:e.button, type:e.pointerType};
  if (mode === 'paint'){ const tl = toTile(e.offsetX, e.offsetY); drag.last = tl.join(); placeAt(tl[0], tl[1], false); }
});
cv.addEventListener('pointermove', e => {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, {x:e.offsetX, y:e.offsetY});
  if (e.pointerType === 'mouse') hover = toTile(e.offsetX, e.offsetY);
  if (pinch && pointers.size >= 2){
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y), an = Math.atan2(b.y - a.y, b.x - a.x), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    zoomBy(pinch.d / d); camT.dist = clamp(camT.dist, 3.5, 42);
    let da = an - pinch.a; if (da > Math.PI) da -= Math.PI * 2; if (da < -Math.PI) da += Math.PI * 2;
    rotBy(-da); panBy(mx - pinch.mx, my - pinch.my);
    pinch.d = d; pinch.a = an; pinch.mx = mx; pinch.my = my; return;
  }
  if (!drag || drag.id !== e.pointerId) return;
  const dx = e.offsetX - drag.lx, dy = e.offsetY - drag.ly;
  if (Math.hypot(e.offsetX - drag.sx, e.offsetY - drag.sy) > 6) drag.moved = true;
  if (drag.mode === 'pan' && drag.moved) panBy(dx, dy);
  else if (drag.mode === 'rot' && drag.moved) rotBy(-dx * .008);
  else if (drag.mode === 'paint'){ const tl = toTile(e.offsetX, e.offsetY), key = tl.join(); if (key !== drag.last){ drag.last = key; placeAt(tl[0], tl[1], true); } }
  drag.lx = e.offsetX; drag.ly = e.offsetY;
});
function endPointer(e){
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinch = null;
  if (drag && drag.id === e.pointerId){
    if (drag.mode === 'pan' && !drag.moved && (drag.type !== 'mouse' || drag.button === 0)){
      const tl = toTile(e.offsetX, e.offsetY);
      if (drag.type !== 'mouse') hover = tl;
      if (tool === 'inspect'){
        const ent = pickEntity(e.offsetX, e.offsetY);
        if (ent){ onEntity(ent); drag = null; return; }
        if (selEnt === 'mayor'){ commandMayor(tl[0], tl[1]); drag = null; return; }
      }
      placeAt(tl[0], tl[1], false);
    }
    drag = null;
  }
}
cv.addEventListener('pointerup', endPointer);
cv.addEventListener('pointercancel', e => { pointers.delete(e.pointerId); drag = null; pinch = null; });
cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hover = null; });
cv.addEventListener('wheel', e => { e.preventDefault(); zoomBy(Math.exp(e.deltaY * .0012)); }, {passive:false});
document.getElementById('rotL').onclick = () => rotBy(Math.PI / 4);
document.getElementById('rotR').onclick = () => rotBy(-Math.PI / 4);
document.getElementById('camHome').onclick = () => { setFollow(false); homeCam(); };
document.getElementById('camFollow').onclick = () => setFollow(!follow);

const KEYS = ['inspect', ...BUILD_TOOLS, 'bulldoze'];
window.addEventListener('keydown', e => {
  if (!document.getElementById('modal').hidden){ if (e.key === 'Escape' && !modalLocked && !catchOpen) closeModal(); return; }
  if (e.key === ' '){ spaceDown = true; e.preventDefault(); return; }
  if (e.key === 'Escape'){ setTool('inspect'); sel = null; selEnt = null; refreshInfo(); return; }
  if (e.key === 'p' || e.key === 'P'){ setSpeed(speed ? 0 : 1); return; }
  if (e.key === 'q' || e.key === 'Q'){ rotBy(Math.PI / 4); return; }
  if (e.key === 'e' || e.key === 'E'){ rotBy(-Math.PI / 4); return; }
  if (e.key === 'r' || e.key === 'R'){ setFollow(false); homeCam(); return; }
  if (e.key === 'f' || e.key === 'F'){ setFollow(!follow); return; }
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= 9){ const t = KEYS[n - 1]; if (t && (t === 'inspect' || S.unlockB.includes(t))) setTool(t); return; }
  if (e.key === '0' || e.key === 'x' || e.key === 'X'){ setTool('bulldoze'); return; }
  if (e.key === 'ArrowLeft' || e.key === 'a') panBy(40, 0);
  if (e.key === 'ArrowRight' || e.key === 'd') panBy(-40, 0);
  if (e.key === 'ArrowUp' || e.key === 'w') panBy(0, 40);
  if (e.key === 'ArrowDown' || e.key === 's') panBy(0, -40);
  if (e.key === '+' || e.key === '=') zoomBy(1 / 1.15);
  if (e.key === '-') zoomBy(1.15);
});
window.addEventListener('keyup', e => { if (e.key === ' ') spaceDown = false; });

const pv = new T3.Vector3();
function pickEntity(sx, sy){
  let best = null, bd = 30;
  const test = (o, id, h) => { pv.set(o.position.x, o.position.y + h, o.position.z).project(camera); if (pv.z > 1) return; const x = (pv.x + 1) / 2 * W, y = (1 - pv.y) / 2 * H, d = Math.hypot(x - sx, y - sy); if (d < bd){ bd = d; best = id; } };
  if (mayor) test(mayor.g, 'mayor', .22);
  wild.forEach((w, n) => { if (!w.gone) test(w.o, 'w:' + n, .2); });
  for (const [id, a] of agents) test(a.o, 's:' + id.slice(1), .2);
  return best;
}
function onEntity(ent){
  if (ent.startsWith('w:')){ const w = wild[+ent.slice(2)]; if (w) goCatch(w); return; }
  selEnt = ent; sel = null; refreshInfo(); refreshTools();
}
