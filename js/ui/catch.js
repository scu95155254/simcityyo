/* 收服小遊戲：丟靈果的時機判定與動畫。 */
'use strict';

/* =========================================================
   CATCH MINI-GAME
   ========================================================= */
let catchOpen = false;
const BERRY = 15;
function startCatch(w){
  if (!freeSlot()){ toast(`隊伍已經有 ${TEAM_MAX} 隻了，先蓋島丸中心才能收服更多`, 'bad'); w.held = false; return; }
  catchOpen = true;
  const d = SP[w.sp], T = [0, 1.7, 1.35, 1.05][d.rare], band = [0, 15, 11, 8][d.rare], base = [0, .42, .28, .16][d.rare];
  openModal(`<h2>野生的${d.name}</h2>
    <p>${d.el}系・${'★'.repeat(d.rare)}${'☆'.repeat(3 - d.rare)}・住在${HAB_NAME[d.hab]}。派駐效果：${BEST[w.sp]}</p>
    <div class="catch"><canvas id="catchCv" width="300" height="300" aria-label="收服小遊戲"></canvas></div>
    <p id="catchMsg" aria-live="polite">白色光圈縮到金色範圍時丟出靈果，越準越容易成功。每顆靈果用 ${BERRY} 份食物做成。</p>
    <div class="btns"><button class="btn primary" id="throwBtn">丟出靈果（${BERRY} 食物）</button><button class="btn" id="leaveBtn">離開</button></div>`);
  const cv2 = document.getElementById('catchCv'), g = cv2.getContext('2d'), img = new Image(); img.src = thumbs['c:' + w.sp];
  const msg = document.getElementById('catchMsg'), btn = document.getElementById('throwBtn');
  let t0 = performance.now(), state = 'aim', st = 0, result = null, rAt = 0;
  const ringR = tt => 142 - 112 * ((tt % T) / T), TR = 86;
  const draw = () => {
    if (!catchOpen) return;
    const tt = (performance.now() - t0) / 1000;
    g.clearRect(0, 0, 300, 300);
    const grd = g.createRadialGradient(150, 150, 10, 150, 150, 150); grd.addColorStop(0, '#2c5a68'); grd.addColorStop(1, '#13303a');
    g.fillStyle = grd; g.beginPath(); g.arc(150, 150, 148, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,201,77,.35)'; g.lineWidth = band * 2; g.beginPath(); g.arc(150, 150, TR, 0, 7); g.stroke();
    g.strokeStyle = '#ffc94d'; g.lineWidth = 2; g.beginPath(); g.arc(150, 150, TR - band, 0, 7); g.stroke(); g.beginPath(); g.arc(150, 150, TR + band, 0, 7); g.stroke();
    let dx = 0, dy = 0, sc = 1;
    if (state === 'result' && !result.ok){ const a = (performance.now() - st) / 1000; dx = Math.sin(a * 30) * 6 * Math.max(0, 1 - a); }
    if (state === 'result' && result.ok){ const a = (performance.now() - st) / 1000; dy = -Math.abs(Math.sin(a * 6)) * 12; sc = 1 + Math.min(.15, a * .3); }
    if (img.complete) g.drawImage(img, 150 - 52 * sc + dx, 150 - 40 * sc + dy - 4, 104 * sc, 80 * sc);
    if (state === 'aim'){ g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.beginPath(); g.arc(150, 150, ringR(tt), 0, 7); g.stroke(); }
    if (state === 'throw'){
      const a = Math.min(1, (performance.now() - st) / 450), bx2 = 150, by = 290 - 150 * a - Math.sin(a * Math.PI) * 60;
      g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 3; g.beginPath(); g.arc(150, 150, rAt, 0, 7); g.stroke();
      g.fillStyle = '#e8496a'; g.beginPath(); g.arc(bx2, by, 11 - a * 3, 0, 7); g.fill(); g.fillStyle = '#5aa84a'; g.beginPath(); g.ellipse(bx2 + 3, by - 10 + a * 2, 5, 3, .6, 0, 7); g.fill();
      if (a >= 1){ state = 'result'; st = performance.now(); showResult(); }
    }
    if (state === 'result' && result.ok){
      const a = (performance.now() - st) / 1000;
      for (let q = 0; q < 6; q++){ const ang = q / 6 * Math.PI * 2 + a, r = 40 + a * 50; g.fillStyle = `rgba(255,140,170,${Math.max(0, 1 - a / 1.5)})`; heart(g, 150 + Math.cos(ang) * r, 140 + Math.sin(ang) * r - a * 20, 8); }
    }
    requestAnimationFrame(draw);
  };
  const heart = (c, x, y, s) => { c.beginPath(); c.moveTo(x, y + s * .6); c.bezierCurveTo(x - s * 1.2, y - s * .2, x - s * .5, y - s * 1.1, x, y - s * .4); c.bezierCurveTo(x + s * .5, y - s * 1.1, x + s * 1.2, y - s * .2, x, y + s * .6); c.fill(); };
  const showResult = () => {
    if (result.ok){
      const dst = freeSlot();
      const s = {id:S.nextSpirit++, sp:w.sp, loc:dst || 'team', at:null}; S.spirits.push(s);
      msg.textContent = `${result.word === '差了一點…' ? '運氣不錯！' : result.word}${d.name}願意跟你回鎮上，成為${spName(s)}，${dst === 'center' ? '隊伍滿了，先送到島丸中心' : '加入鎮長的隊伍'}。到「島丸」分頁可以派牠去建築幫忙。`;
      btn.textContent = '太好了'; btn.disabled = false; btn.onclick = finish;
      w.gone = .4; w.held = false; scene.remove(w.o);
      const i = wild.indexOf(w); if (i >= 0) wild.splice(i, 1);
      changed();
    } else if (result.flee){
      msg.textContent = `${result.word}${d.name}嚇了一跳，跑掉了。`;
      btn.textContent = '離開'; btn.disabled = false; btn.onclick = finish; w.gone = .6; w.held = false;
    } else {
      msg.textContent = `${result.word}${d.name}聞了聞靈果，還在猶豫。再試一次吧。`;
      state = 'aim'; t0 = performance.now(); btn.disabled = S.res.food < BERRY;
      if (btn.disabled) msg.textContent += `（食物不足 ${BERRY}）`;
    }
  };
  const doThrow = () => {
    if (state !== 'aim') return;
    if (S.res.food < BERRY){ msg.textContent = `食物不夠做靈果（需要 ${BERRY}）。`; return; }
    S.res.food -= BERRY; refreshHUD();
    rAt = ringR((performance.now() - t0) / 1000);
    const off = Math.abs(rAt - TR), acc = clamp(1 - off / (band * 2.6), 0, 1), inBand = off <= band;
    const p = base + acc * .52 + (inBand ? .05 : 0), ok = Math.random() < p;
    result = {ok, flee:!ok && Math.random() < .25, word: acc > .85 ? '完美！' : acc > .5 ? '不錯！' : '差了一點…'};
    state = 'throw'; st = performance.now(); btn.disabled = true;
  };
  const finish = () => { catchOpen = false; w.held = false; closeModal(); if (mayor){ mayor.state = 'idle'; mayor.timer = 1.5; } };
  btn.onclick = doThrow; cv2.onclick = doThrow;
  document.getElementById('leaveBtn').onclick = finish;
  if (S.res.food < BERRY){ btn.disabled = true; msg.textContent = `食物不夠做靈果（需要 ${BERRY}）。多蓋幾塊農田再來。`; }
  requestAnimationFrame(draw);
}
