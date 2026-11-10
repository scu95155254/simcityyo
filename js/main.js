/* 主迴圈與啟動：每一幀的更新與繪製、遊戲啟動流程。 */
'use strict';

/* =========================================================
   LOOP & BOOT
   ========================================================= */
let lastT = 0, acc = 0;
const INTERVAL = [Infinity, 1.2, .6, .3];
function frame(ts){
  const t = ts / 1000, dt = Math.min(.1, t - (lastT || t)); lastT = t;
  if (speed > 0){ acc += dt; let n = 0; while (acc >= INTERVAL[speed] && n < 4){ acc -= INTERVAL[speed]; tick(); n++; } }
  else acc = 0;
  if (menuOpen && !reduceMotion){ camT.az += dt * .06; camT.dist = W < 640 ? 40 : 34; camT.tx = 0; camT.tz = 0; }
  applyCam(dt);
  updateWater(t);
  for (let q = anims.length - 1; q >= 0; q--){
    const a = anims[q], p = (now() - a.t0) / a.d, to = a.to || 1;
    if (p >= 1){ a.obj.scale.setScalar(to); anims.splice(q, 1); continue; }
    const c1 = 1.70158, c3 = c1 + 1, e = 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
    a.obj.scale.setScalar(Math.max(.01, e * to));
  }
  for (let q = debris.length - 1; q >= 0; q--){
    const d = debris[q], a = now() - d.t0;
    if (a > d.life){ scene.remove(d.p); d.p.geometry.dispose(); debris.splice(q, 1); continue; }
    d.p.position.x += d.vx * dt; d.p.position.z += d.vz * dt; d.p.position.y += d.vy * dt; d.vy -= dt * (d.shrink ? .8 : 2.2);
    if (d.shrink) d.p.scale.setScalar(1 - a / d.life); else { d.p.rotation.x += d.spin * dt; d.p.rotation.z += d.spin * dt * .7; d.vx *= .98; d.vz *= .98; }
  }
  if (!reduceMotion) for (const d of dynList) d.g.userData.update(t, E.info.get(d.k)?.active !== false);
  for (const [, s] of sprites) s.position.y = s.userData.base + (reduceMotion ? 0 : Math.sin(t * 3) * .05);
  if (CYBER_ON) for (const [, o] of groupObjs){ const sp = o.obj.userData.sprite; sp.material.opacity = .82 + Math.sin(t * 3) * .1 + (Math.sin(t * 29 + o.obj.position.x) > .97 ? -.45 : 0); }
  for (const c of clouds){ if (!reduceMotion) c.position.x += c.userData.v * dt; if (c.position.x > 40) c.position.x = -32; c.visible = c.position.distanceTo(camera.position) > 13; }
  updateMayor(dt, t);
  updateScenery(dt, t);
  updateAgents(dt, t);
  updatePeople(dt, t);
  updateDrones(dt, t);
  updateOverlays(t);
  renderFrame();
  requestAnimationFrame(frame);
}

function webglOK(){ try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (e) { return false; } }
function start(data){
  if (!T3 || !webglOK()){
    stage.insertAdjacentHTML('beforeend', '<div class="fail">這台裝置或瀏覽器目前無法顯示 3D 畫面。<br>請確認瀏覽器已開啟硬體加速，或換一個瀏覽器再試一次。</div>');
    return;
  }
  const snap = data && data.S;
  S = (snap && snap.v === 1) ? migrate(snap) : load();
  const fresh = !S;
  if (!S) newGame();
  BADGE = [new T3.SpriteMaterial({map:badgeTex('!', '#ff5a48'), depthTest:false}), new T3.SpriteMaterial({map:badgeTex('…', '#ffa94d'), depthTest:false})];
  EMO.heart = emoTex('♥', '#e8496a'); EMO.note = emoTex('♪', '#3f7fd0'); EMO.cut = emoTex('✂', '#c94b3d'); EMO.gift = emoTex('★', '#e0a020');
  initScene(); buildScenery();
  new ResizeObserver(resize).observe(stage); resize();
  homeCam();
  if (data && data.cam) Object.assign(camT, data.cam);
  Object.assign(cam, camT);
  genWild(S.seed);
  E = econ();
  buildTerrain(); buildWild();
  makeMayor();
  syncWorld();
  for (let q = 0; q < 8; q++) spawnWild();
  makeThumbs();
  refreshAll();
  loadArtAll();
  window.claude?.hot?.snapshot?.(() => ({S, cam:{...camT}}));
  addEventListener('pagehide', save);
  requestAnimationFrame(frame);
  let seen = false; try { seen = localStorage.getItem(SAVE_KEY + '-help') === '1'; } catch (e) {}
  showMenu(fresh || !seen);
}
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
