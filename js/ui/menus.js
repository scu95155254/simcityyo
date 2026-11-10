/* 選單與對話框：玩法說明、選起始夥伴、美術資源頁、開新地圖、開場選單。 */
'use strict';

const modal = document.getElementById('modal'), card = document.getElementById('modalCard');
let speedBefore = 1, modalLocked = false;
function openModal(html, locked = false){ if (modal.hidden) speedBefore = speed; setSpeed(0); modalLocked = locked; card.innerHTML = html; modal.hidden = false; card.querySelector('button')?.focus(); }
function closeModal(){ modal.hidden = true; modalLocked = false; catchOpen = false; setSpeed(speedBefore || 1); }
modal.addEventListener('click', e => { if (e.target === modal && !modalLocked && !catchOpen) closeModal(); });
function helpHTML(){
  return `<ul>
    <li>從下方選建築，點地圖就能蓋。除了公園，建築都要<b>上下左右緊鄰道路</b>才會運作。</li>
    <li>點建築可以<b>升級</b>（最高 Lv3）；四棟同等級的同類建築排成 2×2 還能<b>合併</b>成更大的建築。</li>
    <li>人口在<b>有食物、有電、滿意度 40 以上</b>時才會成長。公園、商店、學校讓人開心；發電站的污染讓人不開心。</li>
    <li><b>鎮長</b>是你在城裡的化身，會自己巡視、剪綵、關心住戶。點他再點地圖，他就會跑過去。</li>
    <li>完成任務 1 後，通往<b>野外島</b>的橋會開通。點野生島丸，鎮長會過去，用靈果結緣。</li>
    <li>島丸（包括起始夥伴）可以<b>派駐到建築</b>提高產量。隊伍最多 ${TEAM_MAX} 隻，多的要放在<b>島丸中心</b>。</li>
    <li><b>視角</b>：手機單指拖曳移動、雙指縮放與旋轉；電腦右鍵拖曳旋轉、滾輪縮放、中鍵或空白鍵加拖曳移動。快捷鍵 1–9 選建築、0 拆除、Q/E 旋轉、F 跟隨鎮長、P 暫停。</li>
  </ul>`;
}
function starterHTML(){
  return `<div class="starters">${STARTERS.map(k => `<button class="starter" data-k="${k}"><img src="${thumbs['c:' + k] || ''}" alt=""><span class="st-text"><span class="sn">${SP[k].name}<span class="tag">${SP[k].el}系</span></span><span class="sd">${BEST[k]}</span></span></button>`).join('')}</div>`;
}
function chooseStarter(intro){
  openModal(`<h2>${intro ? '歡迎來到島丸鎮' : '選一隻起始夥伴'}</h2>
    <p>${intro ? '海上浮起一座小島，已經有三戶人家、兩塊田、一座伐木場和一座發電站。你是新上任的鎮長，' : '島丸鎮迎來了新鎮長，也就是你。'}先選一隻島丸當夥伴：牠會先跟在你身邊，之後也能派駐到建築幫忙，或送到島丸中心休息。</p>
    ${starterHTML()}<p>其他島丸可以之後到野外島結緣。</p>`, true);
  card.querySelectorAll('.starter').forEach(b => b.onclick = () => {
    const k = b.dataset.k; S.starter = k; S.spirits.unshift({id:S.nextSpirit++, sp:k, loc:'team', at:null, first:true});
    toast(`${SP[k].name}成為你的夥伴！`, 'win');
    try { localStorage.setItem(SAVE_KEY + '-help', '1'); } catch (e) {}
    modalLocked = false; changed(); buildToolButtons();
    if (intro){ card.innerHTML = `<h2>怎麼玩</h2>${helpHTML()}<div class="btns"><button class="btn primary" id="hGo">開始建設</button></div>`; document.getElementById('hGo').onclick = closeModal; document.getElementById('hGo').focus(); }
    else closeModal();
  });
}
document.getElementById('menuBtn').onclick = () => {
  openModal(`<h2>怎麼玩</h2>${helpHTML()}<p>遊戲進度會自動存在這台裝置的瀏覽器裡。</p><div class="btns"><button class="btn primary" id="mClose">繼續遊戲</button><button class="btn" id="mArt">美術資源</button><button class="btn danger" id="mNew">開新地圖</button></div>`);
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mArt').onclick = artPanel;
  document.getElementById('mNew').onclick = () => {
    card.innerHTML = `<h2>開新地圖？</h2><p>目前的城鎮（第 ${S.day} 天，${S.pop} 位居民、${S.spirits.length} 隻收服的島丸）會被新的島嶼取代，這個動作無法復原。</p>
      <div class="btns"><button class="btn danger" id="mYes">開始新的島嶼</button><button class="btn" id="mNo">取消</button></div>`;
    document.getElementById('mNo').onclick = closeModal;
    document.getElementById('mYes').onclick = () => {
      resetWorld(); newGame(); genWild(S.seed); buildTerrain(); buildWild(); E = econ(); syncWorld(); resetMayor(); homeCam(); setTab('build'); refreshAll(); save();
      modal.hidden = true; chooseStarter(false);
    };
  };
};
const SLOT_LABEL = s => {
  const p = s.split('_');
  if (p[0] === 'spirit') return `${p[2] === 's2' ? SP[p[1]].evo : SP[p[1]].name}`;
  if (p[0] === 'building') return `${B[p[1]].name} ${p[2].toUpperCase()}`;
  return p[1] === 'mayor' ? '鎮長' : '居民';
};
function artPanel(msg = ''){
  const n = ART_SLOTS.filter(s => ARTM.has(s)).length;
  const grp = (title, pre) => `<h3 class="art-h">${title}</h3><div class="art-grid">${ART_SLOTS.filter(s => s.startsWith(pre)).map(s => `<div class="art-slot${ARTM.has(s) ? ' on' : ''}" title="${s}.glb"><span>${SLOT_LABEL(s)}</span><code>${s}</code></div>`).join('')}</div>`;
  card.innerHTML = `<h2>美術資源</h2><p>已換成外部模型：<b>${n} / ${ART_SLOTS.length}</b>，其餘使用程式造型。檔名要符合美術規格書的命名規則。</p>
    <div class="btns"><label class="btn primary" for="artIn">匯入模型預覽</label><input type="file" id="artIn" accept=".glb,.gltf" multiple hidden><button class="btn" id="artBack">返回遊戲</button></div>
    <p id="artMsg" aria-live="polite">${msg || '預覽只在這台裝置、這次開啟有效。確認沒問題後，把檔案傳給 Claude 正式加進遊戲。'}</p>
    ${grp('島丸', 'spirit_')}${grp('建築', 'building_')}${grp('角色', 'person_')}`;
  if (modal.hidden){ speedBefore = speed; setSpeed(0); modal.hidden = false; }
  document.getElementById('artBack').onclick = closeModal;
  document.getElementById('artIn').onchange = e => {
    const fs = e.target.files; if (!fs.length) return;
    document.getElementById('artMsg').textContent = `讀取 ${fs.length} 個檔案中……`;
    importArtFiles(fs, r => artPanel(r.reason ? r.reason : `已載入 ${r.ok.length} 個模型${r.bad.length ? `；檔名對不上或讀取失敗：${r.bad.join('、')}` : '。'}`));
  };
}
function resetWorld(){
  for (const [, o] of tileObjs) world.remove(o.obj); tileObjs.clear(); dynList.length = 0;
  for (const [, o] of groupObjs) world.remove(o.obj); groupObjs.clear();
  for (const [, s] of sprites) scene.remove(s); sprites.clear();
  for (const [, a] of agents) scene.remove(a.o); agents.clear();
  for (const w of wild) scene.remove(w.o); wild = []; setTimeout(() => { for (let q = 0; q < 8; q++) spawnWild(); }, 50);
  for (const p of people){ scene.remove(p.g); if (p.pet) scene.remove(p.pet); } people.length = 0; featSig = ''; ribbonQ.length = 0; trail.length = 0;
}
function resetMayor(){ const [x, z] = tileXZ(12, 12); mayor.g.position.set(x + .25, 0, z + .25); mayor.state = 'idle'; mayor.timer = 2; mayor.path = []; mayor.dest = null; }
function showVictory(){
  openModal(`<h2>島丸之城誕生了！</h2><p>第 ${S.day} 天，${S.pop} 位居民和 ${S.spirits.length + 1} 隻島丸住在一起，平均滿意度 ${E.happy}。</p>
    <p>你可以繼續經營，或開一座新島嶼重新挑戰。</p>
    <div class="btns"><button class="btn primary" id="vGo">繼續經營</button></div>`);
  document.getElementById('vGo').onclick = closeModal;
}
let menuOpen = false;
function showMenu(fresh){
  menuOpen = true; speedBefore = speed || 1; setSpeed(0);
  const el = document.getElementById('menu');
  const hasSave = !fresh && S.day > 1;
  el.innerHTML = `<div class="menu-card glass">
      <div class="logo-badge"><img src="${thumbs['c:' + (S.starter || 'ripple')] || ''}" alt=""></div>
      <h1 class="logo">島丸築城</h1>
      <p class="tagline">在海上的小島當鎮長，和島丸一起把聚落變成城市</p>
      <div class="menu-buttons">
        <button class="big primary" id="mnGo">${hasSave ? '繼續經營' : '開始建設'}<small>${hasSave ? `第 ${S.day} 天・${S.pop} 位居民・${S.spirits.length} 隻島丸` : '從三戶人家和一隻島丸夥伴開始'}</small></button>
        ${hasSave ? '<button class="big" id="mnNew">開新島嶼<small>重新產生一座島，目前進度會被取代</small></button>' : ''}
        <button class="big ghost" id="mnHelp">玩法說明</button>
      </div>
      <p class="note">進度會自動存在這台裝置的瀏覽器裡</p>
    </div>`;
  el.hidden = false; document.getElementById('app').classList.add('menu-on');
  document.getElementById('mnGo').onclick = () => { hideMenu(); if (!S.starter) chooseStarter(fresh); };
  document.getElementById('mnHelp').onclick = () => { openModal(`<h2>怎麼玩</h2>${helpHTML()}<div class="btns"><button class="btn primary" id="hClose">知道了</button></div>`); document.getElementById('hClose').onclick = () => { modal.hidden = true; }; };
  const nb = document.getElementById('mnNew');
  if (nb) nb.onclick = () => {
    el.querySelector('.menu-buttons').innerHTML = `<p class="tagline" style="margin:0 0 6px">目前的城鎮會被新的島嶼取代，這個動作無法復原。</p><button class="big primary" id="mnYes">確定開新島嶼</button><button class="big ghost" id="mnNo">取消</button>`;
    document.getElementById('mnNo').onclick = () => showMenu(false);
    document.getElementById('mnYes').onclick = () => { resetWorld(); newGame(); genWild(S.seed); buildTerrain(); buildWild(); E = econ(); syncWorld(); resetMayor(); setTab('build'); refreshAll(); save(); hideMenu(); chooseStarter(false); };
  };
  document.getElementById('mnGo').focus();
}
function hideMenu(){ menuOpen = false; document.getElementById('menu').hidden = true; document.getElementById('app').classList.remove('menu-on'); homeCam(); setSpeed(speedBefore || 1); }
function refreshAll(){ refreshHUD(); refreshMission(); buildToolButtons(); refreshInfo(); }
