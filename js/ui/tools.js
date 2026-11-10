/* 建築列：縮圖、建築與島丸按鈕、工具切換、速度切換。 */
'use strict';

/* thumbnails rendered with the same models */
const thumbs = {};
function makeThumbs(){
  const tw = 160, th = 124;
  let tr;
  try { tr = new T3.WebGLRenderer({antialias:true, alpha:true, preserveDrawingBuffer:true}); } catch (e) { return; }
  tr.setPixelRatio(1); tr.setSize(tw, th); tr.outputEncoding = T3.sRGBEncoding; tr.toneMapping = T3.ACESFilmicToneMapping; tr.toneMappingExposure = 1.1;
  const ts = new T3.Scene();
  ts.add(new T3.HemisphereLight(col('#dff1ff'), col('#8a7550'), .8));
  const dl = new T3.DirectionalLight(col('#fff0d2'), 1.3); dl.position.set(-3, 6, 4); ts.add(dl);
  const tc = new T3.PerspectiveCamera(26, tw / th, .1, 50);
  const shoot = (obj, h = .3, dist = 3.1, ground = true) => {
    const g = new T3.Group();
    if (ground){ bx(g, 1, .12, 1, '#abd283', 0, -.12, 0); bx(g, 1, .25, 1, '#ecd9ad', 0, -.37, 0); }
    g.add(obj); ts.add(g);
    tc.position.set(dist * .62, dist * .72, dist * .62); tc.lookAt(0, h, 0);
    tr.render(ts, tc); const url = tr.domElement.toDataURL(); ts.remove(g); return url;
  };
  for (const t of BUILD_TOOLS){
    const d = t === 'road' ? {sig:'road:3:1', build:g => buildRoad(g, 3, 1)} : describe(t, 0, 0, t === 'house' ? 4 : 1);
    const o = instance(d.sig, d.build, false); if (d.dyn) o.add(d.dyn());
    thumbs[t] = shoot(o, t === 'school' ? .4 : .28, t === 'school' || t === 'plant' || t === 'center' || t === 'furnace' ? 3.4 : 3);
  }
  for (const k of SPK) for (const st of [1, 2]){ const c = creature(k, st); c.userData.ring.visible = false; c.scale.setScalar(st > 1 ? 1.6 : 2.1); c.rotation.y = .5; thumbs[(st > 1 ? 'c2:' : 'c:') + k] = shoot(c, st > 1 ? .5 : .45, 2.7); }
  const m = personMesh({mayor:true, shirt:'#2f4a7a', pants:'#2a2f36', skin:'#f0c8a6', hair:'#6a5a4a'}); m.scale.setScalar(2.6); m.rotation.y = .6;
  thumbs.mayor = shoot(m, .45, 2.4);
  tr.dispose(); try { tr.forceContextLoss(); } catch (e) {}
  thumbs.inspect = icon2d('inspect'); thumbs.bulldoze = icon2d('bulldoze'); thumbs.island = icon2d('island');
}
function icon2d(kind){
  const c = document.createElement('canvas'); c.width = 160; c.height = 124; const g = c.getContext('2d');
  g.translate(80, 70);
  g.fillStyle = '#86c26d'; g.beginPath(); g.moveTo(0, -26); g.lineTo(52, 0); g.lineTo(0, 26); g.lineTo(-52, 0); g.closePath(); g.fill();
  g.fillStyle = '#8f6a48'; g.beginPath(); g.moveTo(-52, 0); g.lineTo(0, 26); g.lineTo(0, 38); g.lineTo(-52, 12); g.fill();
  g.fillStyle = '#6f5238'; g.beginPath(); g.moveTo(0, 26); g.lineTo(52, 0); g.lineTo(52, 12); g.lineTo(0, 38); g.fill();
  if (kind === 'inspect'){
    g.strokeStyle = '#ffc94d'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -26); g.lineTo(52, 0); g.lineTo(0, 26); g.lineTo(-52, 0); g.closePath(); g.stroke();
    g.strokeStyle = '#ffffff'; g.lineWidth = 7; g.beginPath(); g.arc(-6, -30, 18, 0, 7); g.stroke(); g.lineCap = 'round'; g.beginPath(); g.moveTo(7, -17); g.lineTo(22, -2); g.stroke();
  } else if (kind === 'island'){
    g.fillStyle = '#2696bb'; g.beginPath(); g.ellipse(0, 4, 74, 40, 0, 0, 7); g.fill();
    g.fillStyle = '#86c26d'; g.beginPath(); g.moveTo(0, -26); g.lineTo(52, 0); g.lineTo(0, 26); g.lineTo(-52, 0); g.closePath(); g.fill();
    g.fillStyle = '#9d9a74'; g.beginPath(); g.moveTo(-6, -8); g.lineTo(14, -46); g.lineTo(36, -6); g.fill();
    g.fillStyle = '#b9b49a'; g.beginPath(); g.moveTo(14, -46); g.lineTo(36, -6); g.lineTo(22, -6); g.fill();
    g.fillStyle = '#5ec2f0'; g.beginPath(); g.ellipse(-20, 6, 16, 7, 0, 0, 7); g.fill();
    g.fillStyle = '#3f8f4e'; for (const [x, y] of [[-30, -12], [-14, -16], [-38, 2]]){ g.beginPath(); g.arc(x, y - 8, 9, 0, 7); g.fill(); }
    g.fillStyle = '#f6a9cb'; g.beginPath(); g.arc(8, 8, 6, 0, 7); g.fill();
  } else {
    g.fillStyle = '#e9a23b'; g.beginPath(); g.roundRect(-30, -40, 44, 22, 5); g.fill();
    g.fillStyle = '#c47f1f'; g.fillRect(-16, -56, 20, 18); g.fillStyle = '#9fd8ef'; g.fillRect(-12, -52, 12, 10);
    g.fillStyle = '#5a6066'; g.beginPath(); g.moveTo(16, -34); g.lineTo(36, -42); g.lineTo(36, -14); g.lineTo(16, -18); g.fill();
    g.fillStyle = '#3a3f44'; g.beginPath(); g.arc(-20, -16, 7, 0, 7); g.arc(4, -16, 7, 0, 7); g.fill();
  }
  return c.toDataURL();
}



const toolsEl = document.getElementById('tools');
function buildToolButtons(){
  toolsEl.innerHTML = '';
  if (tab === 'build'){
    KEYS.forEach((t, n) => {
      const btn = document.createElement('button'); btn.className = 'tool'; btn.dataset.tool = t;
      const nm = t === 'inspect' ? '檢視' : t === 'bulldoze' ? '拆除' : B[t].name;
      btn.innerHTML = `${n < 9 ? `<span class="key">${n + 1}</span>` : t === 'bulldoze' ? '<span class="key">0</span>' : ''}<img alt="" src="${thumbs[t] || ''}"><span class="tn">${nm}</span><span class="tc num"></span>`;
      btn.onclick = () => { if (btn.classList.contains('locked')){ const mi = unlockMissionOf(t); toast(`完成任務 ${mi + 1}「${M[mi].title}」後解鎖${nm}`); return; } setTool(t); };
      toolsEl.appendChild(btn);
    });
  } else {
    const mk = (id, img, name, el, color, onclick) => {
      const btn = document.createElement('button'); btn.className = 'tool'; btn.dataset.ent = id;
      btn.innerHTML = `${el ? `<span class="el" style="background:${color}">${el}</span>` : ''}<img alt="" src="${img || ''}"><span class="tn">${name}</span><span class="tc"></span>`;
      btn.onclick = onclick; toolsEl.appendChild(btn); return btn;
    };
    mk('mayor', thumbs.mayor, '鎮長', '', '', () => { setTool('inspect'); selEnt = 'mayor'; setFollow(true); refreshInfo(); refreshTools(); });
    mk('island', thumbs.island, '野外島', '', '', () => { const [x, z] = gXZ(OXI + N2 / 2, OZJ + N2 / 2); setFollow(false); camT.tx = x; camT.tz = z; camT.dist = Math.max(camT.dist, 16); if (!S.bridge) toast(`完成任務 1「${M[0].title}」後橋會開通`); });
    for (const s of S.spirits){
      const d = SP[s.sp];
      mk('s:' + s.id, thumbs[((s.stage || 1) > 1 ? 'c2:' : 'c:') + s.sp], `${(s.stage || 1) > 1 ? d.evo : d.name}${s.id}`, d.el, d.color, () => {
        setTool('inspect'); selEnt = 's:' + s.id; setFollow(false);
        const a = agents.get('s' + s.id); if (a){ camT.tx = a.o.position.x; camT.tz = a.o.position.z; }
        else if (s.loc === 'center'){ const k = centerTile(); if (k >= 0){ const [x, z] = tileXZ(k % N, (k / N) | 0); camT.tx = x; camT.tz = z; } }
        refreshInfo(); refreshTools();
      });
    }
  }
  refreshTools();
}
function refreshTools(){
  document.getElementById('tab-comp').textContent = `島丸 ${teamCount()}/${TEAM_MAX}`;
  if (tab !== 'build' && toolsEl.children.length !== 2 + S.spirits.length) return buildToolButtons();
  for (const btn of toolsEl.children){
    const tc = btn.querySelector('.tc');
    if (btn.dataset.ent){
      const id = btn.dataset.ent;
      btn.setAttribute('aria-pressed', String(selEnt === id || tool === 'a:' + id.slice(2)));
      if (id === 'mayor') tc.textContent = follow ? '鏡頭跟隨中' : '主角';
      else if (id === 'island') tc.textContent = S.bridge ? '前往看看' : '任務 1';
      else { const s = S.spirits.find(x => 's:' + x.id === id); const ready = s && (s.stage || 1) < 2 && (s.exp || 0) >= EVO_EXP; tc.className = 'tc' + (ready ? ' ready' : ''); if (ready) tc.textContent = '可以進化！'; else if (s) tc.textContent = s.loc === 'team' ? (s.first ? '起始夥伴' : '隊伍中') : s.loc === 'center' ? '島丸中心' : `在${B[S.bld[s.at]?.t]?.name || '建築'}`; }
      continue;
    }
    const t = btn.dataset.tool;
    btn.setAttribute('aria-pressed', String(t === tool));
    if (t === 'inspect' || t === 'bulldoze'){ tc.textContent = t === 'inspect' ? 'Esc' : '退一半'; continue; }
    const un = S.unlockB.includes(t);
    btn.classList.toggle('locked', !un);
    if (!un){ tc.textContent = `任務 ${unlockMissionOf(t) + 1}`; tc.className = 'tc'; continue; }
    const c = costOf(t);
    tc.textContent = Object.keys(c).map(r => c[r] + (r === 'wood' ? '木' : '')).join('・');
    tc.className = 'tc num' + (canAfford(c) ? '' : ' short');
  }
}
function setTool(t){ tool = t; if (t !== 'inspect') sel = null; if (!t.startsWith('a:') && t !== 'inspect') selEnt = null; refreshTools(); refreshInfo(); }
function setFollow(v){ follow = v; document.getElementById('camFollow').setAttribute('aria-pressed', String(v)); if (v && mayor) camT.dist = Math.min(camT.dist, 12); refreshTools(); }
function setTab(name){
  tab = name;
  document.querySelectorAll('.tabs button').forEach(x => x.setAttribute('aria-selected', String(x.dataset.tab === name)));
  buildToolButtons();
}
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => setTab(b.dataset.tab));
function setSpeed(v){ speed = v; document.querySelectorAll('.speed button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.speed === v))); }
document.querySelectorAll('.speed button').forEach(b => b.onclick = () => setSpeed(+b.dataset.speed));
