/* 3D 基礎：three.js 材質、幾何小工具（方塊、圓柱、屋頂、窗戶、樹叢）、招牌文字貼圖。 */
'use strict';

/* =========================================================
   3D WORLD
   ========================================================= */
const T3 = window.THREE;
const cv = document.getElementById('cv'), stage = document.getElementById('stage');
let renderer, scene, camera, sun, world, sky;
const col = hex => new T3.Color(hex).convertSRGBToLinear();
const MATS = new Map();
let GRAD = null;
function toonGrad(){
  if (!GRAD){ GRAD = new T3.DataTexture(new Uint8Array([80, 160, 255]), 3, 1, T3.LuminanceFormat); GRAD.minFilter = GRAD.magFilter = T3.NearestFilter; GRAD.generateMipmaps = false; GRAD.needsUpdate = true; }
  return GRAD;
}
function Mt(hex, o = {}){
  const key = hex + '|' + JSON.stringify(o, (k, v) => k === 'map' ? v.uuid : v);
  let m = MATS.get(key);
  if (!m){
    const p = {color:col(hex), roughness:o.r ?? .9, metalness:o.m ?? 0, flatShading:!o.smooth};
    if (o.e){ p.emissive = col(o.e); p.emissiveIntensity = o.ei ?? 1; }
    if (o.t !== undefined){ p.transparent = true; p.opacity = o.t; }
    if (o.map) p.map = o.map;
    m = new T3.MeshStandardMaterial(p); MATS.set(key, m);
  }
  return m;
}
const WIN = () => Mt('#cfe7ef', {e:'#ffd27a', ei:.22, r:.35});
const GLASS = () => Mt('#a9d6e6', {e:'#ffe2a6', ei:.18, r:.25, m:.1});
function add(g, geo, mat, x = 0, y = 0, z = 0){ const m = new T3.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; }
const bx = (g, w, h, d, hex, x = 0, y = 0, z = 0, o) => add(g, new T3.BoxGeometry(w, h, d), typeof hex === 'string' ? Mt(hex, o) : hex, x, y + h / 2, z);
const cyl = (g, rt, rb, h, seg, hex, x = 0, y = 0, z = 0, o) => add(g, new T3.CylinderGeometry(rt, rb, h, seg), typeof hex === 'string' ? Mt(hex, o) : hex, x, y + h / 2, z);
const cone = (g, r, h, seg, hex, x = 0, y = 0, z = 0, o) => add(g, new T3.ConeGeometry(r, h, seg), typeof hex === 'string' ? Mt(hex, o) : hex, x, y + h / 2, z);
const ico = (g, r, hex, x = 0, y = 0, z = 0, o, det = 0) => add(g, new T3.IcosahedronGeometry(r, det), typeof hex === 'string' ? Mt(hex, o) : hex, x, y, z);
function prism(w, d, h){
  const s = new T3.Shape(); s.moveTo(-d / 2, 0); s.lineTo(d / 2, 0); s.lineTo(0, h); s.closePath();
  const g = new T3.ExtrudeGeometry(s, {depth:w, bevelEnabled:false});
  g.rotateY(Math.PI / 2); g.translate(-w / 2, 0, 0); return g;
}
// gable roof running along local x; walls w x d, ridge height h above y
function roof(g, w, d, h, o, roofHex, wallHex, x = 0, y = 0, z = 0, rotY = 0){
  const r = new T3.Group(); r.position.set(x, y, z); r.rotation.y = rotY; g.add(r);
  add(r, prism(w, d, h), Mt(wallHex));
  const a = Math.atan2(h, d / 2), L = Math.hypot(h, d / 2) + o, th = .035;
  for (const s of [1, -1]){
    const m = add(r, new T3.BoxGeometry(w + o * 2, th, L), Mt(roofHex));
    const ez = s * (d / 2 + o * Math.cos(a)), ey = -o * Math.sin(a);
    m.position.set(0, (h + ey) / 2 + th / 2, ez / 2);
    m.rotation.x = s * a;
    // shingle lines
    for (let k = 1; k < 4; k++){
      const f = k / 4, ln = add(r, new T3.BoxGeometry(w + o * 2 + .004, .012, .018), Mt(roofHex === '#ffffff' ? '#dddddd' : shadeHex(roofHex, -.18)));
      ln.position.set(0, h + (ey - h) * f + th + .002, ez * f); ln.rotation.x = s * a;
    }
  }
  bx(r, w + o * 2 + .02, .035, .05, shadeHex(roofHex, -.25), 0, h - .005, 0);
  return r;
}
function shadeHex(hex, amt){
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = n >> 8 & 255, b = n & 255;
  const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
function pyramid(g, w, d, h, hex, x, y, z){ const m = add(g, new T3.ConeGeometry(Math.SQRT1_2, 1, 4), Mt(hex), x, y + h / 2, z); m.rotation.y = Math.PI / 4; m.scale.set(w, h, d); return m; }
function miniTree(g, x, z, s = 1, pine = false){
  cyl(g, .03 * s, .045 * s, .16 * s, 6, '#7a5235', x, 0, z);
  if (pine){ cone(g, .15 * s, .26 * s, 7, '#3d8a4f', x, .12 * s, z); cone(g, .11 * s, .2 * s, 7, '#4fa45a', x, .28 * s, z); }
  else { ico(g, .15 * s, '#4a9a52', x, .26 * s, z); ico(g, .1 * s, '#62b360', x + .03 * s, .38 * s, z + .02 * s); }
}
function bush(g, x, z, s = 1, hex = '#4f9e55'){ ico(g, .06 * s, hex, x, .045 * s, z); }
function windowF(g, w, h, x, y, z, rotY = 0){
  const r = new T3.Group(); r.position.set(x, y, z); r.rotation.y = rotY; g.add(r);
  bx(r, w + .03, h + .03, .012, '#f7f2e8', 0, -.015, -.002);
  bx(r, w, h, .02, WIN(), 0, 0, 0);
  bx(r, .012, h, .024, '#f7f2e8', 0, 0, 0);
  bx(r, w + .04, .02, .04, '#f7f2e8', 0, -.03, .01);
}

const ROOFS = ['#c8553f', '#3f6fb5', '#d99636', '#3e8a5c', '#8a5cc0', '#2e8c9a'];
const WALLS = ['#f2e8d6', '#e6edf0', '#f4dccb', '#efe2c4'];
const signTex = {};
function textTex(text, bg, fg){
  const k = text + bg; if (signTex[k]) return signTex[k];
  const c = document.createElement('canvas'); c.width = 256; c.height = 96; const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 96);
  g.fillStyle = fg; g.font = 'bold 58px "Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 52);
  const t = new T3.CanvasTexture(c); t.encoding = T3.sRGBEncoding; t.anisotropy = 4; signTex[k] = t; return t;
}
