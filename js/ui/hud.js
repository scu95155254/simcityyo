/* 介面資訊：上方資源列、任務卡、右下資訊卡、進化動畫。 */
'use strict';

const ICON = {
  coin:'<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#ffc94d"/><circle cx="10" cy="10" r="5.2" fill="none" stroke="#c98e12" stroke-width="1.6"/></svg>',
  wood:'<svg viewBox="0 0 20 20"><rect x="2" y="6" width="14" height="8" rx="4" fill="#b07a4c"/><ellipse cx="15" cy="10" rx="3" ry="4" fill="#e2b986"/><ellipse cx="15" cy="10" rx="1.2" ry="1.7" fill="#b07a4c"/></svg>',
  food:'<svg viewBox="0 0 20 20"><path d="M10 18V7" stroke="#d9b54a" stroke-width="1.6"/><ellipse cx="7.4" cy="8" rx="2.2" ry="3.4" fill="#e9c75a" transform="rotate(-25 7.4 8)"/><ellipse cx="12.6" cy="8" rx="2.2" ry="3.4" fill="#e9c75a" transform="rotate(25 12.6 8)"/><ellipse cx="10" cy="4.5" rx="2" ry="3" fill="#f2d775"/><ellipse cx="7.6" cy="13" rx="2" ry="3" fill="#e9c75a" transform="rotate(-25 7.6 13)"/><ellipse cx="12.4" cy="13" rx="2" ry="3" fill="#e9c75a" transform="rotate(25 12.4 13)"/></svg>',
  power:'<svg viewBox="0 0 20 20"><path d="M11.5 1.5 4 11h5l-1.5 7.5L16 8.5h-5z" fill="#8fd3ff"/></svg>',
  pop:'<svg viewBox="0 0 20 20"><circle cx="7" cy="6.5" r="3" fill="#f2c9a8"/><path d="M1.5 17c0-4 2.5-6 5.5-6s5.5 2 5.5 6z" fill="#7fb6e8"/><circle cx="14" cy="7.5" r="2.5" fill="#e9b893"/><path d="M10.5 17c.3-3.3 1.8-5 3.5-5s3.6 1.7 4.5 5z" fill="#9bd38a"/></svg>',
  happy:'<svg viewBox="0 0 20 20"><path d="M10 17.5S2 12.6 2 7.3A4.3 4.3 0 0 1 10 5a4.3 4.3 0 0 1 8 2.3c0 5.3-8 10.2-8 10.2z" fill="#ff8fab"/></svg>',
};
const resEl = document.getElementById('res');
resEl.innerHTML = [['coin','金幣'],['wood','木材'],['food','食物'],['power','電力'],['pop','人口'],['happy','滿意度']]
  .map(([k, n]) => `<div class="chip" id="chip-${k}" title="${n}">${ICON[k]}<div><div class="v num" id="v-${k}"></div><div class="d num" id="d-${k}"></div></div></div>`).join('');
function setD(id, v, txt){
  const el = document.getElementById('d-' + id);
  el.textContent = txt ?? (fmtD(v) + '/日');
  el.className = 'd num' + (v > .05 ? ' up' : v < -.05 ? ' down' : '');
}
function refreshHUD(){
  document.getElementById('day').textContent = `第 ${S.day} 天`;
  document.getElementById('v-coin').textContent = fmt(S.res.coin); setD('coin', E.dCoin);
  document.getElementById('v-wood').textContent = fmt(S.res.wood); setD('wood', E.dWood);
  document.getElementById('v-food').textContent = fmt(S.res.food); setD('food', E.dFood);
  const sur = E.supply - E.demand;
  document.getElementById('v-power').textContent = `${Math.round(E.supply)}/${E.demand}`;
  setD('power', sur, sur >= 0 ? `盈餘 ${Math.round(sur)}` : `不足 ${Math.round(-sur)}`);
  document.getElementById('chip-power').classList.toggle('alert', sur < 0);
  document.getElementById('chip-food').classList.toggle('alert', S.res.food <= 0);
  document.getElementById('v-pop').textContent = `${S.pop}/${E.cap}`;
  setD('pop', 0, E.cap > S.pop ? `空屋 ${E.cap - S.pop}` : '住滿了');
  document.getElementById('v-happy').textContent = E.happy;
  const hd = document.getElementById('d-happy');
  hd.textContent = E.happy >= 70 ? '很開心' : E.happy >= 40 ? '還不錯' : E.happy >= 30 ? '不太滿意' : '想搬走';
  hd.className = 'd' + (E.happy >= 70 ? ' up' : E.happy < 40 ? ' down' : '');
  document.getElementById('chip-happy').classList.toggle('alert', E.happy < 40);
}
let missionCollapsed = window.innerWidth < 640;
function refreshMission(){
  const el = document.getElementById('mission');
  const m = S.won ? M[M.length - 1] : M[S.mission];
  el.classList.toggle('collapsed', missionCollapsed);
  const goals = m.goals.map(g => {
    const v = stat(g.k), p = clamp(v / g.v, 0, 1), done = v >= g.v || S.won;
    return `<div class="goal${done ? ' done' : ''}"><div class="goal-row"><span>${g.label}</span><span class="num">${fmt(Math.max(0, v))} / ${fmt(g.v)}</span></div><div class="bar"><i style="width:${(done ? 1 : p) * 100}%"></i></div></div>`;
  }).join('');
  el.innerHTML = `<button class="mission-head" id="mHead" aria-expanded="${!missionCollapsed}">
      <div><div class="m-step">${S.won ? '全部任務完成' : `任務 ${S.mission + 1} / ${M.length}`}</div><div class="m-title">${m.title}</div></div>
      <span class="m-caret" aria-hidden="true">▾</span></button>
    <div class="mission-body"><div class="m-story">${m.story}</div>${goals}<div class="reward">獎勵：<b>${rewardText(m)}</b></div></div>`;
  document.getElementById('mHead').onclick = () => { missionCollapsed = !missionCollapsed; refreshMission(); };
}

function costHTML(c){ return `<div class="cost">${Object.keys(c).map(r => `<span class="num${S.res[r] < c[r] ? ' short' : ''}">${RES_NAME[r]} ${c[r]}</span>`).join('')}</div>`; }
function evolve(id){
  const s = S.spirits.find(x => x.id === id); if (!s || (s.stage || 1) > 1 || (s.exp || 0) < EVO_EXP) return;
  const d = SP[s.sp], before = spName(s);
  openModal(`<h2>咦？${before}的樣子……</h2><div class="catch"><canvas id="evoCv" width="300" height="300" aria-label="進化動畫"></canvas></div><p id="evoMsg" aria-live="polite">牠全身開始發光！</p><div class="btns"><button class="btn primary" id="evoOk" disabled>……</button></div>`, true);
  const cv2 = document.getElementById('evoCv'), g = cv2.getContext('2d');
  const load = src => { const i = new Image(); i.src = src; return i; };
  const a1 = load(thumbs['c:' + s.sp]), a2 = load(thumbs['c2:' + s.sp]);
  const sil = img => { const c = document.createElement('canvas'); c.width = 160; c.height = 124; const x = c.getContext('2d'); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#ffffff'; x.fillRect(0, 0, 160, 124); return c; };
  let s1, s2, done = false; const t0 = performance.now(), DUR = 3.4;
  const draw = () => {
    if (modal.hidden) return;
    const t = (performance.now() - t0) / 1000;
    g.clearRect(0, 0, 300, 300);
    const grd = g.createRadialGradient(150, 150, 10, 150, 150, 150); grd.addColorStop(0, t < DUR ? '#3f6f7c' : '#5b8a74'); grd.addColorStop(1, '#13303a');
    g.fillStyle = grd; g.beginPath(); g.arc(150, 150, 148, 0, 7); g.fill();
    if (!s1 && a1.complete && a2.complete){ s1 = sil(a1); s2 = sil(a2); }
    if (s1){
      if (t < .8) g.drawImage(a1, 70, 88, 160, 124);
      else if (t < DUR){
        const f = 1.5 + (t - .8) * 4, show2 = Math.sin(t * f * Math.PI) > 0;
        for (let k = 0; k < 10; k++){ const a = k / 10 * Math.PI * 2 + t * 2, r = 120 - ((t * 60 + k * 12) % 100); g.fillStyle = 'rgba(255,240,200,.7)'; g.beginPath(); g.arc(150 + Math.cos(a) * r, 150 + Math.sin(a) * r, 2.5, 0, 7); g.fill(); }
        g.drawImage(show2 ? s2 : s1, 70, 88, 160, 124);
      } else {
        const a = t - DUR;
        if (a < .5){ g.fillStyle = `rgba(255,255,255,${1 - a * 2})`; g.beginPath(); g.arc(150, 150, 148, 0, 7); g.fill(); }
        g.drawImage(a2, 70, 88, 160, 124);
        for (let k = 0; k < 8; k++){ const ang = k / 8 * Math.PI * 2 + a * .8, r = 50 + a * 40; g.fillStyle = `rgba(255,214,90,${Math.max(0, 1 - a / 2)})`; g.save(); g.translate(150 + Math.cos(ang) * r, 150 + Math.sin(ang) * r); g.rotate(a * 3); g.fillRect(-4, -4, 8, 8); g.restore(); }
        if (!done){
          done = true; s.stage = 2;
          document.getElementById('evoMsg').textContent = `恭喜！${before}進化成${spName(s)}了！派駐效果提升 50%。`;
          const ok = document.getElementById('evoOk'); ok.disabled = false; ok.textContent = '太棒了'; ok.focus();
          ok.onclick = () => { closeModal(); buildToolButtons(); refreshInfo(); };
          changed(); save();
        }
      }
    }
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
}
const MAYOR_DOING = {ribbon:'正要替新建築剪綵', visit:'去關心住戶', park:'去公園休息', stroll:'在街上巡視', cmd:'照你的指示移動', catch:'前往野外結緣'};
function spiritButtons(s){
  const b = [];
  if ((s.stage || 1) < 2 && (s.exp || 0) >= EVO_EXP) b.push(`<button class="btn primary" data-evolve>進化</button>`);
  if (s.loc !== 'team') b.push(`<button class="btn" data-mv="team">帶在隊伍</button>`);
  if (s.loc !== 'center') b.push(`<button class="btn" data-mv="center">送到島丸中心</button>`);
  b.push(`<button class="btn primary" data-assign>${s.loc === 'work' ? '換一棟建築' : '派駐到建築'}</button>`);
  return `<div class="btns">${b.join('')}</div>`;
}
function refreshInfo(){
  const el = document.getElementById('info');
  let h = '';
  const fine = matchMedia('(pointer:fine)').matches;
  const close = '<button class="info-close" data-close aria-label="關閉">×</button>';
  if (tool.startsWith('a:')){
    const s = S.spirits.find(x => x.id === +tool.slice(2));
    h = `<h3>派駐${s ? spName(s) : ''}${close}</h3><p>點一棟建築，讓牠去幫忙。</p><p>${s ? BEST[s.sp] : ''}；其他生產建築大多 +15%。</p>`;
  } else if (tool !== 'inspect' && tool !== 'bulldoze'){
    const d = B[tool];
    h = `<h3>${d.name}${close}</h3><p>${d.desc}</p>${costHTML(costOf(tool))}
         <p>${fine ? '點擊放置，按住拖曳可以連續蓋。右鍵拖曳旋轉視角，中鍵或空白鍵加拖曳移動地圖。' : '點地圖放置，單指拖曳移動，雙指縮放與旋轉。'}</p>`;
  } else if (tool === 'bulldoze'){
    h = `<h3>拆除${close}</h3><p>拆掉建築退回一半金幣，派駐的島丸會回到隊伍或島丸中心。砍樹得 3 木材，清岩石要 15 金幣。</p>`;
  } else if (selEnt === 'mayor' && mayor){
    const doing = mayor.state === 'walk' ? MAYOR_DOING[mayor.task?.type] || '走動中' : '停下來看看四周';
    h = `<h3>鎮長<span class="tag ok">主角</span>${close}</h3>
      <div class="row"><span>現在</span><span>${doing}</span></div>
      <p>平常會自己巡視：替新建築剪綵、關心不開心的住戶、去公園休息，路上偶爾會收到居民的禮物。</p>
      <p><b>點地圖上的任何位置，他就會跑過去。</b>點野外島上的島丸，他會過橋去結緣。</p>
      <div class="btns"><button class="btn" data-follow>${follow ? '停止跟隨' : '鏡頭跟隨鎮長'}</button></div>`;
  } else if (selEnt?.startsWith('s:')){
    const s = S.spirits.find(x => 's:' + x.id === selEnt);
    if (s){
      const d = SP[s.sp], where = s.loc === 'team' ? '跟著鎮長' : s.loc === 'center' ? '在島丸中心休息' : `派駐在${B[S.bld[s.at]?.t]?.name || '建築'}`;
      const fx = s.loc === 'work' && S.bld[s.at] ? spiritFx(s.sp, S.bld[s.at].t, s.stage) : null;
      h = `<h3>${spName(s)}<span class="tag">${d.el}系${s.first ? '・起始夥伴' : ''}</span>${close}</h3>
        <div class="row"><span>現在</span><span>${where}</span></div>${fx ? `<div class="row"><span>效果</span><span>${fxText(fx)}</span></div>` : ''}
        <div class="row"><span>成長</span><span class="num">${(s.stage || 1) > 1 ? '已進化' : `${Math.min(EVO_EXP, Math.floor(s.exp || 0))} / ${EVO_EXP}`}</span></div>${(s.stage || 1) > 1 ? '' : `<div class="bar"><i style="width:${Math.min(100, (s.exp || 0) / EVO_EXP * 100)}%"></i></div>`}
        <p>最拿手：${BEST[s.sp]}${(s.stage || 1) > 1 ? '（進化後效果 +50%）' : ''}</p>${spiritButtons(s)}`;
    } else selEnt = null;
  } else if (selEnt?.startsWith('w:')){
    const w = wild[+selEnt.slice(2)];
    if (w){ const d = SP[w.sp]; h = `<h3>野生的${d.name}<span class="tag">${d.el}系 ${'★'.repeat(d.rare)}</span>${close}</h3><p>${BEST[w.sp]}</p>`; }
  } else if (sel && inb(sel[0], sel[1])){
    const [i, j] = sel, k = idx(i, j), b = S.bld[k];
    if (b){
      const d = B[b.t], inf = E.info.get(k);
      h = `<h3>${d.name}`;
      if (b.t !== 'road') h += inf.active ? '<span class="tag ok">運作中</span>' : '<span class="tag bad">沒接到道路</span>';
      h += close + '</h3>';
      if (b.t !== 'road' && b.t !== 'center') h += `<div class="row"><span>等級</span><span>Lv ${inf.lv} / 3${b.g ? `・${BIGNAME[b.t]}（+25%）` : ''}</span></div>`;
      if (b.t === 'road'){ h += `<p>${d.desc}</p>`; }
      else if (!inf.active){ h += '<p>在它旁邊（上下左右）鋪一格道路就會開始運作。</p>'; }
      else if (b.t === 'house'){
        const capH = (inf.cap || 6) + (inf.fx?.cap || 0), per = E.cap ? Math.min(capH, Math.round(S.pop * capH / E.cap)) : 0;
        h += `<div class="row"><span>居民</span><span class="num">約 ${per} / ${capH} 人</span></div><div class="row"><span>滿意度</span><span class="num">${inf.happy}</span></div>`;
        h += `<div class="factors"><span>基礎 50</span>${inf.factors.map(([n, v]) => `<span class="${v > 0 ? 'pos' : 'neg'}">${n} ${v > 0 ? '+' : '−'}${Math.abs(v)}</span>`).join('')}${inf.capped ? '<span>（正面加成最多 +45）</span>' : ''}</div>`;
      } else if (d.jobs){
        const unit = {farm:'食物', lumber:'木材', plant:'電力', shop:'金幣', furnace:'金幣'}[b.t];
        if (unit) h += `<div class="row"><span>產出</span><span class="num">${unit} ${fmtD(inf.out)}/日</span></div>`;
        h += `<div class="row"><span>工人到位</span><span class="num">${Math.round(inf.staff * 100)}%</span></div>`;
        if (b.t === 'furnace') h += inf.noWood ? '<p>木材不夠，熔爐停工了。</p>' : `<div class="row"><span>消耗</span><span class="num">木材 −${Math.round(inf.use * 10) / 10}/日</span></div>`;
        if (b.t === 'lumber') h += `<div class="row"><span>周圍樹木</span><span class="num">${inf.trees} 棵</span></div>`;
        if (inf.staff < 1) h += '<p>人手不夠，多蓋住宅吸引居民。</p>';
        if (inf.aura) h += `<p>${inf.aura.r} 格內住宅滿意度 +${inf.aura.v}。</p>`;
        if (d.pollute) h += `<p>${d.pollute.r} 格內住宅滿意度 −${d.pollute.v}。</p>`;
      } else if (b.t === 'center'){
        const n = S.spirits.filter(s => s.loc === 'center').length;
        h += `<div class="row"><span>寄放中</span><span class="num">${n} 隻</span></div><p>${d.desc}</p>`;
      } else { h += `<p>${d.desc}</p>`; }
      if (b.t !== 'road'){
        if (inf.worker) h += `<div class="row"><span>派駐島丸</span><span>${spName(inf.worker)}（${fxText(inf.fx)}）</span></div>`;
        else if (b.t !== 'center' && SPK.some(sp => spiritFx(sp, b.t))) h += `<p>可以派一隻島丸來幫忙。</p>`;
        if (b.t !== 'center'){
          const why = upgradeWhy(k), mo = mergeOption(i, j), btn = [];
          if (why !== 'max' && why !== 'no'){ const c = upgradeCost(k); btn.push(`<button class="btn primary" data-upg ${why ? 'disabled' : ''}>升級到 Lv${inf.lv + 1}（${c.coin} 金幣・${c.wood} 木）</button>`); }
          if (mo) btn.push(`<button class="btn" data-merge>合併成${BIGNAME[b.t]}（${mo.cost} 金幣）</button>`);
          if (btn.length) h += `<div class="btns">${btn.join('')}</div>`;
          if (why && why !== 'max' && why !== 'no') h += `<p>${why}</p>`;
          else if (why === 'max' && !mo && !b.g && MERGEABLE[b.t]) h += '<p>已經是最高等級。四棟同等級的同類建築排成 2×2 就能合併。</p>';
          else if (!mo && !b.g && MERGEABLE[b.t] && inf.lv < 3) h += '<p>四棟同等級的同類建築排成 2×2，就能合併成更大的建築。</p>';
        }
      }
    } else {
      const ter = S.terr[k], f = S.feat[k];
      const nm = ter === 'w' ? '水域' : f === 1 ? '樹林' : f === 2 ? '岩石' : ter === 's' ? '沙灘' : '草地';
      const tip = ter === 'w' ? '水面上不能蓋東西。' : f === 1 ? '伐木場蓋在樹旁邊產量更高。直接在這裡蓋建築會順便砍樹（+2 木材）。' : f === 2 ? '要先用「拆除」清掉才能蓋（15 金幣）。' : '空地，可以蓋建築。';
      h = `<h3>${nm}${close}</h3><p>${tip}</p>`;
    }
  } else {
    h = `<p>選建築後點地圖就能蓋。點<b>鎮長</b>（頭上有金色菱形）可以指揮他；點野外島上的島丸，鎮長會去結緣。${fine ? '右鍵拖曳旋轉，滾輪縮放。' : '雙指可以縮放和旋轉。'}</p>`;
  }
  el.innerHTML = h;
  el.classList.toggle('idle', h.startsWith('<p>選建築後'));
  el.querySelector('[data-close]')?.addEventListener('click', () => { if (tool !== 'inspect') setTool('inspect'); else { sel = null; selEnt = null; refreshInfo(); } });
  el.querySelector('[data-follow]')?.addEventListener('click', () => { setFollow(!follow); refreshInfo(); });
  el.querySelectorAll('[data-mv]').forEach(b => b.addEventListener('click', () => moveSpirit(+selEnt.slice(2), b.dataset.mv)));
  el.querySelector('[data-evolve]')?.addEventListener('click', () => evolve(+selEnt.slice(2)));
  el.querySelector('[data-upg]')?.addEventListener('click', () => sel && upgradeAt(idx(sel[0], sel[1])));
  el.querySelector('[data-merge]')?.addEventListener('click', () => sel && mergeAt(sel[0], sel[1]));
  el.querySelector('[data-assign]')?.addEventListener('click', () => { const id = +selEnt.slice(2); setTool('a:' + id); });
}
