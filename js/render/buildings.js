/* 建築模型：每種建築的程式造型、升級外觀、2×2 合併外觀、動態效果（煙、旗子、噴泉）、道路。 */
'use strict';

/* ---- cyberpunk add-ons ---- */
const CYBER_ON = false;
const CY = '#2ef2ff', PK = '#ff3ea5', PU = '#a45cff', YL = '#ffd23e', OR = '#ff8a2a';
const neon = (hex, ei = 3) => CYBER_ON ? Mt(hex, {e:hex, ei}) : Mt(hex);
const HOUSE_GEO = [{x:0, w:.6, eave:.43, front:.2, ridge:.73, rz:-.04}, {x:0, w:.54, eave:.73, front:.175, ridge:.99, rz:-.05}, {x:-.12, w:.46, eave:.45, front:.08, ridge:.71, rz:-.12}];
const CYBER = {
  house(g, v, id){
    const c = [CY, PK, PU][id % 3], h = HOUSE_GEO[v];
    bx(g, h.w + .1, .018, .018, neon(c), h.x, h.eave - .04, h.front + .06);
    bx(g, .1, .08, .06, '#8a93a0', h.x + h.w / 2 + .035, .1, -.05); bx(g, .06, .06, .006, '#2f353d', h.x + h.w / 2 + .035, .11, -.018);
    bx(g, .012, .012, .07, neon(CY, 1.4), h.x + h.w / 2 + .035, .19, -.05);
    cyl(g, .006, .009, .24, 5, '#5a6470', h.x - h.w / 4, h.ridge - .02, h.rz);
    ico(g, .017, neon(PK), h.x - h.w / 4, h.ridge + .23, h.rz);
    const dish = add(g, new T3.SphereGeometry(.065, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2.6), Mt('#c9d0d8'), h.x + h.w / 4, h.ridge - .02, h.rz);
    dish.rotation.x = -1.1; dish.rotation.z = .4;
  },
  farm(g){
    bx(g, .92, .01, .01, neon(CY, 1.6), 0, .115, .465); bx(g, .01, .01, .92, neon(CY, 1.6), .465, .115, 0);
    cyl(g, .012, .016, .42, 6, '#5a6470', .4, .04, -.42); ico(g, .03, neon(CY), .4, .48, -.42);
    bx(g, .2, .012, .14, '#2b3a5c', -.3, .43, -.3); bx(g, .19, .006, .13, neon(PU, 1), -.3, .44, -.3);
  },
  lumber(g){
    bx(g, .46, .016, .016, neon(OR), -.16, .3, .03);
    cyl(g, .05, .06, .06, 10, '#3a4048', .33, .02, .05);
    const a1 = new T3.Group(); a1.position.set(.33, .08, .05); a1.rotation.z = .5; g.add(a1);
    bx(a1, .04, .26, .04, '#e8b43a', 0, 0, 0); ico(a1, .03, neon(CY), 0, .26, 0);
    const a2 = new T3.Group(); a2.position.set(0, .26, 0); a2.rotation.z = -1.6; a1.add(a2);
    bx(a2, .035, .2, .035, '#e8b43a', 0, 0, 0); bx(a2, .07, .03, .05, '#3a4048', 0, .2, 0);
  },
  plant(g){
    for (const y of [.33, .51, .66]){ const t = add(g, new T3.TorusGeometry(.108, .01, 6, 20), neon(CY), .24, y, -.24); t.rotation.x = Math.PI / 2; }
    bx(g, .58, .016, .016, neon(PK), -.12, .37, .285);
    for (const z of [.26, .4]) bx(g, .13, .01, .11, neon(CY, 1.8), .3, .185, z);
  },
  furnace(g){
    const p = add(g, new T3.CylinderGeometry(.025, .025, .34, 8), neon(OR, 1.6), -.38, .3, -.06); p.rotation.x = Math.PI / 2;
    bx(g, .64, .016, .016, neon(PK), -.08, .39, .18);
  },
  shop(g){
    bx(g, .46, .012, .012, neon(PK), -.07, .28, .18); bx(g, .46, .012, .012, neon(PK), -.07, .06, .18);
    bx(g, .012, .22, .012, neon(PK), -.3, .06, .18); bx(g, .012, .22, .012, neon(PK), .16, .06, .18);
    bx(g, .1, .2, .08, '#2a2f3a', .34, .03, .12); bx(g, .07, .1, .006, neon(CY, 1.6), .34, .1, .162);
  },
  park(g){
    const t = add(g, new T3.TorusGeometry(.2, .012, 6, 28), neon(CY), 0, .12, 0); t.rotation.x = Math.PI / 2;
  },
  center(g){
    const t = add(g, new T3.TorusGeometry(.36, .014, 6, 32), neon(CY), 0, .31, -.04); t.rotation.x = Math.PI / 2;
    bx(g, .28, .012, .012, neon(PK), 0, .29, .395);
  },
  school(g){
    bx(g, .96, .018, .018, neon(PU), 0, .5, .055);
    bx(g, .1, .14, .06, '#2a2f3a', -.4, .03, .12); bx(g, .07, .08, .006, neon(CY, 1.6), -.4, .09, .152);
  },
};
function levelBars(g, lv){ for (let q = 0; q < lv - 1; q++) bx(g, .09, .02, .03, neon(YL, 2.6), -.4 + q * .11, .03, .45); }
function apartment(g, id){
  const wl = WALLS[(id >> 1) % WALLS.length], rf = ROOFS[id % ROOFS.length], c = [CY, PK, PU][id % 3];
  bx(g, .9, .025, .9, '#a3cf7a'); bx(g, .64, .05, .56, '#8a8f99', 0, 0, -.04);
  for (let f = 0; f < 4; f++){
    const y = .05 + f * .26;
    bx(g, .58, .26, .5, f % 2 ? wl : shadeHex(wl, -.07), 0, y, -.04);
    for (const x of [-.18, 0, .18]) if (!(f === 0 && x === 0)) windowF(g, .09, .1, x, y + .09, .215);
    windowF(g, .09, .1, .29, y + .09, -.04, Math.PI / 2); windowF(g, .09, .1, .29, y + .09, -.2, Math.PI / 2);
    bx(g, .6, .014, .014, neon(c, 2.2), 0, y + .245, .216);
    if (f > 0){ bx(g, .22, .02, .09, '#cfd6df', -.18, y, .255); bx(g, .22, .05, .006, neon(PK, 1.4), -.18, y + .02, .3); }
  }
  bx(g, .62, .04, .54, shadeHex(rf, -.2), 0, 1.09, -.04);
  cyl(g, .07, .07, .15, 10, '#9aa3aa', .18, 1.13, -.18); cone(g, .075, .05, 10, '#7d8b94', .18, 1.28, -.18);
  bx(g, .3, .16, .02, '#1d2230', -.08, 1.15, -.22);
  add(g, new T3.PlaneGeometry(.28, .13), Mt('#ffffff', {map:textTex('島丸鎮', '#1d2230', c), e:c, ei:1.4}), -.08, 1.23, -.208);
  bx(g, .13, .2, .02, '#3f5d6b', 0, .05, .215); bx(g, .2, .012, .05, neon(c, 2), 0, .27, .23);
  cyl(g, .006, .008, .22, 5, '#5a6470', -.24, 1.13, .1); ico(g, .017, neon(PK), -.24, 1.36, .1);
}
const UPG = {
  farm(g, lv){
    const gh = new T3.Group(); gh.position.set(.25, .04, -.3); g.add(gh);
    bx(gh, .36, .2, .26, Mt('#c8f6ff', {t:.4, e:CY, ei:.3}), 0, 0, 0);
    for (const [x, z] of [[-.18, -.13], [.18, -.13], [-.18, .13], [.18, .13]]) bx(gh, .012, .2, .012, neon(CY, 1.6), x, 0, z);
    bx(gh, .37, .012, .27, neon(CY, 1.2), 0, .2, 0);
    for (let q = 0; q < 4; q++) ico(gh, .04, '#5fae4a', -.12 + q * .08, .05, 0);
    if (lv >= 3){
      const t = new T3.Group(); t.position.set(.3, .04, .28); g.add(t);
      bx(t, .24, .72, .24, Mt('#c8f6ff', {t:.35, e:CY, ei:.25}), 0, 0, 0);
      for (let q = 0; q < 5; q++){ bx(t, .22, .02, .22, '#3a4048', 0, q * .15, 0); for (let r = 0; r < 3; r++) ico(t, .03, '#6cbc56', -.06 + r * .06, q * .15 + .04, 0); bx(t, .22, .008, .008, neon('#7dff8a', 2), 0, q * .15 + .1, .115); }
      bx(t, .26, .03, .26, '#2a2f3a', 0, .72, 0); ico(t, .03, neon(PK), 0, .8, 0);
    }
  },
  lumber(g, lv){
    bx(g, .5, .04, .1, '#2a2f3a', .05, .02, .42); for (let q = 0; q < 6; q++) bx(g, .03, .042, .1, '#e8b43a', -.17 + q * .08, .02, .42);
    if (lv >= 3){
      cyl(g, .09, .09, .5, 12, '#9aa3aa', -.36, .03, .32); const r = add(g, new T3.TorusGeometry(.092, .01, 6, 20), neon(OR), -.36, .4, .32); r.rotation.x = Math.PI / 2;
      const saw = add(g, new T3.CylinderGeometry(.07, .07, .01, 16), Mt('#cfd6df', {e:CY, ei:.4}), -.02, .12, .42); saw.rotation.x = Math.PI / 2;
    }
  },
  plant(g, lv){
    const ct = add(g, new T3.LatheGeometry([[0, 0], [.14, 0], [.1, .22], [.12, .45], [0, .45]].map(([x, y]) => new T3.Vector2(x, y)), 16), Mt('#c7d1d6'), -.32, .03, -.3);
    ct.castShadow = true;
    const rr = add(g, new T3.TorusGeometry(.12, .008, 6, 20), neon(CY), -.32, .48, -.3); rr.rotation.x = Math.PI / 2;
    if (lv >= 3){
      ico(g, .09, Mt('#9ff6ff', {smooth:true, e:CY, ei:3}), -.12, .52, .06, undefined, 1);
      for (const a of [.6, -.6]){ const t = add(g, new T3.TorusGeometry(.14, .012, 6, 24), neon(PU), -.12, .52, .06); t.rotation.x = Math.PI / 2 + a; }
    }
  },
  furnace(g, lv){
    cyl(g, .055, .07, .42, 8, '#8a3a2a', -.3, .39, -.2); cyl(g, .07, .07, .03, 8, '#4a3a32', -.3, .81, -.2);
    if (lv >= 3){ cyl(g, .08, .09, .12, 12, '#4a4f55', .3, .03, .1); cyl(g, .065, .065, .01, 12, Mt('#ff9a3d', {e:'#ff6a1a', ei:2.4}), .3, .155, .1); bx(g, .3, .03, .06, '#2a2f3a', .15, .03, .24); }
  },
  shop(g, lv){
    bx(g, .56, .24, .4, '#e9eef2', 0, .5, -.12); for (const x of [-.16, 0, .16]) windowF(g, .1, .1, x, .6, .085);
    bx(g, .58, .014, .014, neon(CY, 2.2), 0, .73, .085);
    if (lv >= 3){
      bx(g, .46, .22, .34, '#dfe6ec', 0, .74, -.14); for (const x of [-.1, .1]) windowF(g, .1, .1, x, .83, .035);
      bx(g, .5, .2, .02, '#1d2230', 0, .98, -.12); add(g, new T3.PlaneGeometry(.46, .17), Mt('#ffffff', {map:textTex('大特價', '#1d2230', PK), e:PK, ei:1.4}), 0, 1.08, -.108);
    }
  },
  park(g, lv){
    const gz = new T3.Group(); gz.position.set(.3, .035, .3); g.add(gz);
    for (const [x, z] of [[-.1, -.1], [.1, -.1], [-.1, .1], [.1, .1]]) cyl(gz, .01, .01, .22, 5, '#e9e3d6', x, 0, z);
    pyramid(gz, .3, .3, .12, '#5d6a72', 0, .22, 0); bx(gz, .3, .012, .012, neon(PK, 2), 0, .22, .15); bx(gz, .3, .012, .012, neon(PK, 2), 0, .22, -.15);
    if (lv >= 3){ cyl(g, .02, .03, .3, 6, Mt('#9ff6ff', {e:CY, ei:1.5}), -.28, .14, .28); ico(g, .2, Mt('#9ff6ff', {t:.5, e:CY, ei:1.4}), -.28, .58, .28, undefined, 1); }
  },
  school(g, lv){
    bx(g, .3, .3, .28, '#efe0c0', .3, .03, .2); roof(g, .3, .28, .14, .03, '#c64b3f', '#efe0c0', .3, .33, .2); windowF(g, .1, .1, .3, .14, .345);
    if (lv >= 3){ add(g, new T3.SphereGeometry(.14, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), Mt('#cfd6df'), -.3, .74, -.18); bx(g, .03, .14, .02, neon(CY, 2), -.3, .76, -.04); cyl(g, .15, .15, .04, 14, '#9aa3aa', -.3, .72, -.18); }
  },
};
function groupOverlay(t, lv){
  const g = new T3.Group(), c = {house:PK, farm:'#7dff8a', lumber:OR, plant:CY, furnace:OR, shop:PK, park:CY, school:PU}[t];
  for (const s of [-1, 1]){ bx(g, 1.98, .02, .02, neon(c, 2.2), 0, .045, s * .985); bx(g, .02, .02, 1.98, neon(c, 2.2), s * .985, .045, 0); }
  const hb = t === 'house' ? [.3, .5, .78][lv - 1] : t === 'shop' ? [.3, .55, .78][lv - 1] : .3;
  if (t === 'plant' || t === 'furnace' || t === 'lumber'){
    for (const [x, z, rz] of [[0, -.5, 1], [0, .5, 1], [-.5, 0, 0], [.5, 0, 0]]){ const p = add(g, new T3.CylinderGeometry(.03, .03, .5, 8), Mt('#8b969c'), x, hb, z); if (rz) p.rotation.z = Math.PI / 2; else p.rotation.x = Math.PI / 2; bx(g, .04, .04, .04, neon(c, 1.8), x, hb - .02, z); }
  } else if (t !== 'farm' && t !== 'park'){
    for (const [x, z, along] of [[0, -.5, 'x'], [0, .5, 'x'], [-.5, 0, 'z'], [.5, 0, 'z']]){
      bx(g, along === 'x' ? .5 : .1, .06, along === 'x' ? .1 : .5, '#2a2f3a', x, hb, z);
      bx(g, along === 'x' ? .5 : .012, .012, along === 'x' ? .012 : .5, neon(c, 2), x + (along === 'z' ? .05 : 0), hb - .005, z + (along === 'x' ? .05 : 0));
    }
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  const sp = new T3.Sprite(CYBER_ON ? new T3.SpriteMaterial({map:holoTex(BIGNAME[t], c), transparent:true, depthWrite:false, blending:T3.AdditiveBlending}) : new T3.SpriteMaterial({map:textTex(BIGNAME[t], '#f3e2c0', '#5a3a20'), transparent:true}));
  const top = t === 'house' ? [.9, 1.15, 1.55][lv - 1] : t === 'farm' || t === 'park' ? .9 : 1.3;
  sp.scale.set(1, .44, 1); sp.position.y = top; g.add(sp); g.userData.sprite = sp;
  return g;
}
function holoTex(text, color){
  const k = 'holo:' + text + color; if (signTex[k]) return signTex[k];
  const c = document.createElement('canvas'); c.width = 256; c.height = 112; const g = c.getContext('2d');
  g.strokeStyle = color; g.lineWidth = 4; g.shadowColor = color; g.shadowBlur = 14; g.strokeRect(10, 10, 236, 92);
  g.fillStyle = color; g.font = 'bold 54px "Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 58);
  g.shadowBlur = 0; g.globalAlpha = .18; for (let y = 12; y < 100; y += 4) g.fillRect(12, y, 232, 1.5);
  const t = new T3.CanvasTexture(c); t.encoding = T3.sRGBEncoding; signTex[k] = t; return t;
}
const HOLO = {shop:['商店', PK, 0, .95, .05, .5], school:['學校', PU, 0, 1.32, -.18, .46], center:['島丸中心', CY, 0, 1.1, -.04, .62], furnace:['熔爐', OR, -.08, .78, -.06, .42]};
function holoDyn(t){
  const h = CYBER_ON && HOLO[t]; if (!h) return null;
  const g = new T3.Group(), [text, c, x, y, z, w] = h;
  const m = add(g, new T3.PlaneGeometry(w, w * .44), new T3.MeshBasicMaterial({map:holoTex(text, c), transparent:true, opacity:.9, blending:T3.AdditiveBlending, depthWrite:false, side:T3.DoubleSide, toneMapped:false}), x, y, z);
  const beam = add(g, new T3.CylinderGeometry(.008, .03, y - .5, 6, 1, true), new T3.MeshBasicMaterial({color:c, transparent:true, opacity:.35, blending:T3.AdditiveBlending, depthWrite:false}), x, (y + .5) / 2 - .02, z);
  g.userData.update = (tt, on) => { m.visible = beam.visible = on; m.material.opacity = .75 + Math.sin(tt * 3) * .1 + (Math.sin(tt * 37) > .96 ? -.5 : 0); m.position.y = y + Math.sin(tt * 1.5) * .02; m.rotation.y = Math.sin(tt * .4) * .25; };
  return g;
}
/* ---- building builders: local frame, ground at y=0, front faces +z ---- */
const BUILD = {
  house(g, v, id){
    const rf = ROOFS[id % ROOFS.length], wl = WALLS[(id >> 1) % WALLS.length];
    bx(g, .9, .025, .9, '#a3cf7a', 0, 0, 0);
    bx(g, .16, .028, .26, '#d8ccb6', v === 2 ? .2 : 0, 0, .33);
    if (v === 0){
      bx(g, .64, .05, .52, '#b9ae9c', 0, 0, -.04);
      bx(g, .6, .38, .48, wl, 0, .05, -.04);
      roof(g, .6, .48, .3, .07, rf, wl, 0, .43, -.04);
      bx(g, .09, .26, .09, '#a86454', .17, .52, -.16); bx(g, .11, .03, .11, '#7d4a3e', .17, .78, -.16);
      bx(g, .13, .22, .02, '#7a4e33', 0, .05, .2); bx(g, .02, .02, .02, '#e8c35a', .04, .15, .215);
      windowF(g, .11, .11, -.18, .2, .2); windowF(g, .11, .11, .18, .2, .2);
      windowF(g, .11, .11, .3, .2, -.04, Math.PI / 2);
      bush(g, -.3, .3); bush(g, .3, .31, .8, '#5aa85e'); bush(g, -.22, .34, .6, '#e58fb0');
    } else if (v === 1){
      bx(g, .58, .05, .48, '#b9ae9c', 0, 0, -.05);
      bx(g, .54, .68, .44, wl, 0, .05, -.05);
      bx(g, .56, .03, .46, shadeHex(wl, -.1), 0, .38, -.05);
      roof(g, .54, .44, .26, .06, rf, wl, 0, .73, -.05);
      bx(g, .13, .22, .02, '#3f5d6b', -.13, .05, .175);
      bx(g, .17, .03, .1, '#cfc6b6', -.13, .27, .21);
      windowF(g, .1, .1, .12, .18, .175); windowF(g, .1, .1, -.13, .5, .175); windowF(g, .1, .1, .12, .5, .175);
      windowF(g, .1, .1, .275, .5, -.05, Math.PI / 2); windowF(g, .1, .1, .275, .18, -.05, Math.PI / 2);
      bx(g, .24, .02, .1, '#d8d2c6', .12, .44, .22); for (let k = 0; k < 4; k++) bx(g, .012, .07, .012, '#d8d2c6', .02 + k * .07, .46, .265);
      bx(g, .24, .012, .012, '#d8d2c6', .12, .53, .265);
      bush(g, .3, .3); bush(g, -.32, .25, .9);
    } else {
      bx(g, .5, .05, .44, '#b9ae9c', -.12, 0, -.12);
      bx(g, .46, .4, .4, wl, -.12, .05, -.12);
      roof(g, .46, .4, .26, .06, rf, wl, -.12, .45, -.12);
      bx(g, .3, .3, .34, wl, .2, .05, .06);
      roof(g, .34, .3, .2, .05, rf, wl, .2, .35, .06, Math.PI / 2);
      bx(g, .12, .2, .02, '#7a4e33', .2, .05, .235);
      windowF(g, .1, .1, -.2, .22, .085); windowF(g, .1, .1, -.04, .22, .085);
      windowF(g, .09, .09, .355, .18, .06, Math.PI / 2);
      for (let k = 0; k < 6; k++) bx(g, .02, .09, .02, '#e9e3d6', -.42 + k * .07, 0, .38);
      bx(g, .4, .015, .015, '#e9e3d6', -.25, .06, .38);
      bush(g, -.33, .28, .9, '#e58fb0'); bush(g, -.18, .3);
    }
  },
  farm(g, v){
    bx(g, .96, .04, .96, '#8a6142');
    const plant = v % 2 ? 'cab' : 'wheat';
    const rows = [-.33, -.19, -.05, .09, .23, .37];
    rows.forEach((z, r) => {
      const x0 = r < 2 ? -.02 : -.4, len = .8 - (x0 + .4);
      bx(g, len, .04, .07, '#6e4b30', x0 + len / 2, .04, z);
      for (let x = x0 + .05; x < .4; x += .1){
        if (plant === 'wheat'){ cone(g, .03, .15, 5, (r + Math.round(x * 10)) % 3 ? '#e2c04f' : '#d4ad3c', x, .07, z); }
        else ico(g, .045, (r + Math.round(x * 10)) % 2 ? '#7cc45a' : '#5fae4a', x, .11, z);
      }
    });
    bx(g, .28, .24, .26, '#b8463b', -.3, .04, -.3);
    roof(g, .28, .26, .14, .03, '#f1ebe0', '#b8463b', -.3, .28, -.3);
    bx(g, .12, .14, .015, '#f1ebe0', -.3, .04, -.165);
    bx(g, .1, .01, .015, '#7a2f27', -.3, .1, -.157);
    cyl(g, .07, .07, .38, 10, '#cfd5da', -.12, .04, -.38); cone(g, .08, .08, 10, '#9aa3aa', -.12, .42, -.38);
    for (let k = 0; k < 7; k++){ bx(g, .022, .1, .022, '#c9a77a', -.45 + k * .15, .04, .46); bx(g, .022, .1, .022, '#c9a77a', .46, .04, -.45 + k * .15); }
    bx(g, .92, .016, .016, '#c9a77a', 0, .1, .46); bx(g, .016, .016, .92, '#c9a77a', .46, .1, 0);
  },
  lumber(g){
    bx(g, .94, .02, .94, '#b39270');
    bx(g, .44, .3, .34, '#9a6a46', -.16, .02, -.16);
    for (let k = 0; k < 5; k++) bx(g, .01, .3, .015, '#7d5338', -.37 + k * .1, .02, .012);
    roof(g, .44, .34, .16, .05, '#56703f', '#9a6a46', -.16, .32, -.16);
    bx(g, .14, .2, .02, '#4a3020', -.16, .02, .015);
    const log = (x, y, z) => { const m = add(g, new T3.CylinderGeometry(.045, .045, .38, 8), Mt('#a9774a'), x, y, z); m.rotation.z = Math.PI / 2;
      const e1 = add(g, new T3.CylinderGeometry(.034, .034, .385, 8), Mt('#e2b986'), x, y, z); e1.rotation.z = Math.PI / 2; };
    [[.12, .21, .3], [.165, .255], [.21]].forEach((row, r) => row.forEach(z => log(.18, .065 + r * .08, z)));
    cyl(g, .07, .08, .1, 9, '#8a5a3c', -.28, .02, .28); cyl(g, .068, .068, .006, 9, '#d9b07e', -.28, .12, .28);
    const ax = add(g, new T3.BoxGeometry(.012, .16, .012), Mt('#c9a77a'), -.26, .19, .28); ax.rotation.z = -.5;
    bx(g, .05, .035, .012, '#8b969c', -.23, .21, .28);
    miniTree(g, .32, -.3, .9, true);
  },
  plant(g){
    bx(g, .96, .03, .96, '#9aa3a6');
    bx(g, .54, .34, .42, '#c7d1d6', -.12, .03, .06);
    bx(g, .58, .04, .46, '#7d8b94', -.12, .37, .06);
    bx(g, .42, .07, .02, GLASS(), -.12, .2, .275);
    bx(g, .12, .18, .02, '#5d6a72', .06, .03, .275);
    const cx = .24, cz = -.24;
    cyl(g, .12, .14, .22, 12, '#aeb8be', cx, .03, cz);
    [['#c94b3d', .08], ['#f1f1ee', .1], ['#c94b3d', .08], ['#f1f1ee', .1], ['#c94b3d', .08]].reduce((y, [c, h]) => { cyl(g, .095, .1, h, 12, c, cx, y, cz); return y + h; }, .25);
    cyl(g, .11, .1, .04, 12, '#6f7a81', cx, .69, cz);
    const p = add(g, new T3.CylinderGeometry(.03, .03, .3, 8), Mt('#8b969c'), .08, .25, -.12); p.rotation.z = Math.PI / 2;
    bx(g, .12, .14, .1, '#7d8b94', .3, .03, .26); bx(g, .12, .14, .1, '#7d8b94', .3, .03, .4);
    bx(g, .13, .02, .11, '#f2c14e', .3, .17, .26); bx(g, .13, .02, .11, '#f2c14e', .3, .17, .4);
    for (let k = 0; k < 4; k++) bx(g, .02, .12, .02, '#5d6a72', .15 + k * .1, .03, .47);
  },
  furnace(g){
    bx(g, .96, .03, .96, '#b8a58c');
    bx(g, .6, .36, .44, '#b5523b', -.08, .03, -.06);
    for (let k = 1; k < 4; k++) bx(g, .612, .012, .452, '#94402e', -.08, .03 + k * .09, -.06);
    for (let k = 0; k < 4; k++) bx(g, .012, .09, .452, '#94402e', -.3 + k * .15 + (k % 2) * .05, .12, -.06);
    bx(g, .64, .04, .48, '#5d4a40', -.08, .39, -.06);
    bx(g, .22, .2, .03, '#2a1a14', -.08, .03, .165);
    bx(g, .16, .14, .02, Mt('#ff9a3d', {e:'#ff6a1a', ei:1.3}), -.08, .04, .175);
    bx(g, .26, .03, .05, '#7a3a2a', -.08, .23, .17);
    cyl(g, .07, .09, .55, 8, '#8a3a2a', .12, .43, -.18); cyl(g, .085, .085, .04, 8, '#4a3a32', .12, .98, -.18);
    bx(g, .13, .05, .07, '#4a4f55', .3, .12, .3); bx(g, .05, .08, .04, '#4a4f55', .3, .04, .3); bx(g, .1, .02, .08, '#4a4f55', .3, .03, .3);
    cyl(g, .05, .06, .1, 8, '#6a5a4a', .3, .03, .14);
    [[.12, .3], [.12, .38]].forEach(([x, z]) => { const m = add(g, new T3.CylinderGeometry(.04, .04, .3, 8), Mt('#a9774a'), -.3, .07, z); m.rotation.z = Math.PI / 2; });
    for (let k = 0; k < 3; k++) bx(g, .08, .03, .04, '#e8c35a', .14 + (k % 2) * .03, .03 + (k > 1 ? .03 : 0), .36 + (k % 2) * .05 - (k > 1 ? .02 : 0), {m:.5, r:.3});
    bush(g, -.4, -.38, .9);
  },
  shop(g, v){
    const awn = v % 2 ? '#3f7fd0' : '#e0523f', wall = v % 2 ? '#f6e3d0' : '#f3efe6';
    bx(g, .96, .03, .96, '#d9d3c7');
    bx(g, .66, .42, .48, wall, 0, .03, -.08);
    bx(g, .7, .05, .52, shadeHex(wall, -.15), 0, .45, -.08);
    bx(g, .42, .2, .02, GLASS(), -.07, .07, .165);
    bx(g, .44, .02, .03, '#5a6b75', -.07, .06, .17);
    bx(g, .12, .24, .02, '#5a6b75', .21, .03, .165);
    for (let k = 0; k < 7; k++){
      const m = add(g, new T3.BoxGeometry(.66 / 7, .018, .17), Mt(k % 2 ? '#fbf6ec' : awn), -.33 + (k + .5) * .66 / 7, .36, .24);
      m.rotation.x = .42;
    }
    bx(g, .4, .14, .035, '#2f3b44', 0, .5, .1);
    add(g, new T3.PlaneGeometry(.37, .12), Mt('#ffffff', {map:textTex('商店', '#ffc94d', '#2a1f00'), e:'#ffc94d', ei:.12}), 0, .57, .119);
    bx(g, .1, .1, .1, '#b8864f', .3, .03, .33); bx(g, .08, .08, .08, '#c99a63', .31, .13, .32);
    cyl(g, .05, .05, .13, 10, '#7d5a3a', -.32, .03, .33);
    bush(g, -.18, .36, .7, '#e58fb0'); bush(g, .08, .37, .7);
  },
  park(g){
    bx(g, .97, .035, .97, '#a3cf7a');
    bx(g, .97, .012, .15, '#e8d9a8', 0, .035, 0); bx(g, .15, .012, .97, '#e8d9a8', 0, .035, 0);
    cyl(g, .19, .2, .08, 14, '#d5dde2', 0, .035, 0);
    cyl(g, .16, .16, .012, 14, Mt('#6fc3e3', {e:'#3aa0c8', ei:.25, r:.2}), 0, .1, 0);
    cyl(g, .03, .04, .14, 8, '#d5dde2', 0, .1, 0); cyl(g, .075, .05, .03, 10, '#d5dde2', 0, .24, 0);
    miniTree(g, -.28, -.28, 1.15); miniTree(g, .3, .3, 1.05, true); miniTree(g, .32, -.3, .85);
    bx(g, .24, .1, .26, '#7a5a40', -.28, .035, .28);
    [['#f39ab8', -.34, .22], ['#ffd45a', -.24, .32], ['#ffffff', -.2, .22], ['#f39ab8', -.3, .36], ['#b48cf0', -.36, .3]].forEach(([c, x, z]) => ico(g, .035, c, x, .16, z));
    bx(g, .2, .02, .07, '#9a6a46', .28, .08, -.08 - .04); bx(g, .2, .06, .015, '#9a6a46', .28, .1, -.155);
    bx(g, .015, .08, .05, '#3b4247', .2, .035, -.12); bx(g, .015, .08, .05, '#3b4247', .36, .035, -.12);
    cyl(g, .012, .015, .4, 6, '#3b4247', -.1, .035, -.1); ico(g, .03, Mt('#fff2c0', {e:'#ffd27a', ei:.8}), -.1, .45, -.1);
  },
  center(g){
    bx(g, .97, .03, .97, '#d9e8e4');
    cyl(g, .34, .36, .3, 14, '#f4f1ea', 0, .03, -.04);
    cyl(g, .355, .355, .05, 14, '#3fb0a8', 0, .25, -.04);
    add(g, new T3.SphereGeometry(.34, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), Mt('#4fc3b8'), 0, .3, -.04);
    cyl(g, .02, .03, .1, 6, '#e8e2d4', 0, .62, -.04); ico(g, .055, Mt('#ffc94d', {e:'#ffb000', ei:.4}), 0, .76, -.04);
    bx(g, .24, .26, .16, '#f4f1ea', 0, .03, .27);
    bx(g, .14, .18, .02, GLASS(), 0, .03, .352);
    const aw = add(g, new T3.BoxGeometry(.3, .025, .14), Mt('#3fb0a8'), 0, .3, .33); aw.rotation.x = .3;
    bx(g, .32, .1, .02, '#2f3b44', 0, .34, .3);
    add(g, new T3.PlaneGeometry(.3, .085), Mt('#ffffff', {map:textTex('島丸中心', '#3fb0a8', '#ffffff'), e:'#3fb0a8', ei:.15}), 0, .39, .312);
    for (const a of [-1.15, 1.15, Math.PI]) windowF(g, .08, .08, Math.sin(a) * .345, .14, -.04 + Math.cos(a) * .345, a);
    bush(g, -.38, .38); bush(g, .38, .38, .9, '#e58fb0'); bush(g, -.42, .12, .8); bush(g, .42, -.3, .9);
    [['#f39ab8', .3, .45], ['#ffd45a', -.3, .46], ['#b48cf0', .2, .44]].forEach(([c, x, z]) => ico(g, .03, c, x, .06, z));
  },
  school(g){
    bx(g, .97, .03, .97, '#d7cdb8');
    bx(g, .86, .5, .4, '#efe0c0', 0, .03, -.18);
    bx(g, .88, .03, .42, '#d4c09b', 0, .28, -.18);
    roof(g, .86, .4, .22, .05, '#c64b3f', '#efe0c0', 0, .53, -.18);
    [-.33, -.17, .17, .33].forEach(x => { windowF(g, .1, .1, x, .13, .025); windowF(g, .1, .1, x, .39, .025); });
    bx(g, .16, .24, .02, '#7a4b33', 0, .03, .025); bx(g, .22, .03, .08, '#c64b3f', 0, .29, .05);
    bx(g, .18, .32, .18, '#efe0c0', 0, .6, -.18);
    pyramid(g, .26, .26, .2, '#c64b3f', 0, .92, -.18);
    const cf = add(g, new T3.CylinderGeometry(.06, .06, .012, 16), Mt('#ffffff'), 0, .78, -.085); cf.rotation.x = Math.PI / 2;
    bx(g, .008, .045, .006, '#333333', 0, .78, -.077); bx(g, .035, .008, .006, '#333333', .016, .78, -.077);
    cyl(g, .012, .012, .72, 6, '#eef2f4', .4, .03, .36); ico(g, .022, '#e8c35a', .4, .77, .36);
    bx(g, .18, .04, .1, '#e3d3a3', -.28, .03, .3); bx(g, .02, .12, .02, '#6f7a81', -.36, .03, .3); bx(g, .02, .12, .02, '#6f7a81', -.2, .03, .3); bx(g, .18, .02, .02, '#6f7a81', -.28, .15, .3);
    bush(g, .2, .1); bush(g, -.12, .1, .8);
  },
};

const DYN = {
  furnace(){
    const g = new T3.Group(), puffs = [], m = Mt('#7d7570', {t:.7, r:1});
    for (let k = 0; k < 5; k++){ puffs.push(add(g, new T3.IcosahedronGeometry(.06, 0), m, .12, 1, -.18)); }
    const glow = add(g, new T3.SphereGeometry(.09, 10, 8), new T3.MeshBasicMaterial({color:'#ff8a3a', transparent:true, opacity:.35, depthWrite:false}), -.08, .1, .2);
    g.userData.update = (t, on) => {
      glow.visible = on; glow.scale.setScalar(.9 + Math.sin(t * 13) * .12 + Math.sin(t * 7.3) * .08);
      puffs.forEach((p, k) => { const ph = (t * .25 + k / 5) % 1; p.visible = on; p.position.set(.12 - ph * .2, 1 + ph * .6, -.18 + ph * .1); const s = (.4 + ph * 1.2) * Math.sin(Math.PI * Math.min(1, ph * 1.2)); p.scale.setScalar(Math.max(.001, s)); });
    };
    return g;
  },
  plant(){
    const g = new T3.Group(), puffs = [];
    const m = Mt('#eef2f4', {t:.75, r:1});
    for (let k = 0; k < 6; k++){ const p = add(g, new T3.IcosahedronGeometry(.07, 0), m, .24, .75, -.24); puffs.push(p); }
    g.userData.update = (t, on) => puffs.forEach((p, k) => {
      const ph = (t * .22 + k / 6) % 1; p.visible = on;
      p.position.set(.24 + ph * .25, .76 + ph * .7, -.24 - ph * .1); const s = (.4 + ph * 1.4) * Math.sin(Math.PI * Math.min(1, ph * 1.2)); p.scale.setScalar(Math.max(.001, s)); p.rotation.set(ph * 3, ph * 2, 0);
    });
    return g;
  },
  school(){
    const g = new T3.Group();
    const f = add(g, new T3.BoxGeometry(.2, .12, .008), Mt('#ffc94d'), .5, .68, .36);
    f.geometry.translate(0, 0, 0);
    const piv = new T3.Group(); piv.position.set(.4, .68, .36); g.add(piv); g.remove(f); f.position.set(.1, 0, 0); piv.add(f);
    g.userData.update = t => { piv.rotation.y = Math.sin(t * 2.4) * .35 + .3; };
    return g;
  },
  park(){
    const g = new T3.Group();
    const s = add(g, new T3.CylinderGeometry(.012, .03, .2, 6), Mt('#d8f3ff', {t:.7, e:'#a9e3ff', ei:.4}), 0, .36, 0);
    g.userData.update = t => { const k = .7 + Math.abs(Math.sin(t * 3)) * .4; s.scale.set(1, k, 1); s.position.y = .27 + .1 * k; };
    return g;
  },
};
function buildRoad(g, mask, lamp){
  bx(g, 1, .03, 1, '#959ca3');
  const sides = [[-1, 0], [1, 0], [0, -1], [0, 1]], W = .15, top = .03;
  sides.forEach(([sx, sz], k) => {
    if (mask & (1 << k)){
      for (const f of [.12, .32]){ bx(g, sx ? .11 : .025, .006, sx ? .025 : .11, '#f2efe4', sx * f, top, sz * f); }
    } else {
      bx(g, sx ? W : 1, .045, sx ? 1 : W, '#cfc9bc', sx * (.5 - W / 2), 0, sz * (.5 - W / 2));
      bx(g, sx ? .02 : 1, .047, sx ? 1 : .02, '#a59f93', sx * (.5 - W - .01), 0, sz * (.5 - W - .01));
    }
  });
  for (const [cx, cz, a, b] of [[-1, -1, 0, 2], [1, -1, 1, 2], [-1, 1, 0, 3], [1, 1, 1, 3]]){
    if ((mask & (1 << a)) && (mask & (1 << b))) bx(g, W, .045, W, '#cfc9bc', cx * (.5 - W / 2), 0, cz * (.5 - W / 2));
  }
  if (!mask) bx(g, .1, .006, .1, '#f2efe4', 0, top, 0);
  if (lamp){
    const k = [0, 1, 2, 3].find(k => !(mask & (1 << k)));
    if (k !== undefined){
      const [sx, sz] = sides[k], px = sx ? sx * .44 : .3, pz = sz ? sz * .44 : .3;
      cyl(g, .014, .02, .5, 6, '#3b4247', px, .045, pz);
      bx(g, .1, .015, .015, '#3b4247', px - sx * .04, .53, pz - sz * .04);
      ico(g, .032, Mt('#fff4cc', {e:'#ffd27a', ei:1}), px - sx * .08, .51, pz - sz * .08);
    }
  }
}
