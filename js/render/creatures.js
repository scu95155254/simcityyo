/* 島丸模型：六種島丸的一般型與進化型造型，以及頭上的狀態泡泡。 */
'use strict';

function badgeTex(ch, bg){
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.fillStyle = bg; g.beginPath(); g.arc(32, 28, 22, 0, 7); g.fill(); g.beginPath(); g.moveTo(22, 44); g.lineTo(32, 60); g.lineTo(42, 44); g.fill();
  g.fillStyle = '#fff'; g.font = 'bold 30px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 32, 30);
  const t = new T3.CanvasTexture(c); t.encoding = T3.sRGBEncoding; return t;
}
let BADGE;


function glbCreature(key, stage, slot){
  const d = SP[key], g = new T3.Group(), size = new T3.Group(), body = new T3.Group(); g.add(size); size.add(body);
  const {obj, mixer, actions} = cloneArt(slot); obj.position.y = -.2; body.add(obj);
  if (stage > 1) size.scale.setScalar(1.28);
  const ring = new T3.Mesh(new T3.RingGeometry(.28, .33, 28), new T3.MeshBasicMaterial({color:d.color, transparent:true, opacity:.6, depthWrite:false}));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .02; g.add(ring);
  body.position.y = .22;
  g.userData = {body, parts:{flames:[], wings:[], rings:[]}, ring, ph:SPK.indexOf(key) * 1.7 + Math.random() * 3, heading:0, hop:0, glb:true, mixer, actions};
  return g;
}
function creature(key, stage = 1){
  if (ARTM.has(`spirit_${key}_s${stage}`)) return glbCreature(key, stage, `spirit_${key}_s${stage}`);
  const d = SP[key], g = new T3.Group(), size = new T3.Group(), body = new T3.Group(); g.add(size); size.add(body);
  const evo = stage > 1;
  const sm = (hex, o = {}) => Mt(hex, Object.assign({smooth:true, r:.5}, o));
  const put = (geo, mat, x = 0, y = 0, z = 0, parent = body) => { const m = add(parent, geo, mat, x, y, z); m.castShadow = true; return m; };
  const sph = (r, hex, x, y, z, sx = 1, sy = 1, sz = 1, o) => { const m = put(new T3.SphereGeometry(r, 18, 14), sm(hex, o), x, y, z); m.scale.set(sx, sy, sz); return m; };
  const lathe = (pts, seg = 22) => new T3.LatheGeometry(pts.map(([x, y]) => new T3.Vector2(x, y)), seg);
  const eye = (x, y, z, r = .028, parent = body) => {
    const e = put(new T3.SphereGeometry(r, 12, 10), sm('#1b2329', {r:.3}), x, y, z, parent); e.scale.set(1, 1.2, .7);
    put(new T3.SphereGeometry(r * .38, 8, 6), sm('#ffffff'), x + r * .35, y + r * .45, z + r * .55, parent);
  };
  const eyes = (y, gap, z, r) => { eye(-gap, y, z, r); eye(gap, y, z, r); };
  const cheeks = (y, gap, z) => { for (const s of [-1, 1]) sph(.026, '#ff8aa0', s * gap, y, z, 1, .6, .4, {t:.6}); };
  const parts = {flames:[], wings:[], rings:[]};
  switch (key){
    case 'ripple': {
      put(lathe([[0, -.2], [.12, -.18], [.175, -.09], [.165, .02], [.12, .11], [.06, .19], [0, .26]]), sm(d.color));
      sph(.1, '#d9f3ff', 0, -.07, .1, 1, 1, .55);
      for (const s of [-1, 1]){ const f = put(new T3.ConeGeometry(.055, .2, 10), sm('#9fdcfa'), s * .15, .06, -.01); f.rotation.z = -s * .9; f.scale.set(1, 1, .4); }
      const tail = put(new T3.TorusGeometry(.07, .024, 8, 18, Math.PI * 1.35), sm('#3fa4d8'), 0, -.07, -.19); tail.rotation.y = Math.PI / 2; tail.rotation.x = .3;
      for (const s of [-1, 1]) sph(.04, '#3fa4d8', s * .08, -.19, .05, 1.2, .6, 1.4);
      eyes(.0, .065, .145); cheeks(-.05, .11, .12);
      if (evo){
        [[-.05, .25, -.4], [0, .3, 0], [.05, .25, .4]].forEach(([x, y, r]) => { const c = put(new T3.ConeGeometry(.035, .14, 8), sm('#e8f8ff'), x, y, -.01); c.rotation.z = r; });
        for (const s of [-1, 1]){ const w = sph(.11, '#7fd0f5', s * .2, -.02, -.04, 1.5, .3, .8, {t:.85}); w.rotation.z = s * .4; parts.wings.push(w); }
        const t2 = put(new T3.TorusGeometry(.1, .02, 8, 18, Math.PI * 1.2), sm('#9fdcfa'), 0, -.02, -.24); t2.rotation.y = Math.PI / 2;
      }
      break;
    }
    case 'ember': {
      const len = evo ? .36 : .32;
      const log = put(new T3.CylinderGeometry(.14, .15, len, 12), Mt('#7a4a2e'), 0, -.04, 0); log.rotation.x = Math.PI / 2;
      for (let k = 0; k < 6; k++){ const r = put(new T3.BoxGeometry(.02, .02, len * .9), Mt('#5e3820'), Math.cos(k) * .145, -.04 + Math.sin(k) * .145, 0); }
      const cap = put(new T3.CylinderGeometry(.13, .13, .012, 18), sm('#e8b47e'), 0, -.04, len / 2 + .002); cap.rotation.x = Math.PI / 2;
      for (const r of [.05, .095]){ const ring = put(new T3.TorusGeometry(r, .005, 4, 20), sm('#c48a55'), 0, -.04, len / 2 + .008); }
      eyes(-.02, .055, len / 2 + .01, .026); cheeks(-.075, .09, len / 2 + .006);
      for (const [x, z] of [[-.09, .1], [.09, .1], [-.09, -.1], [.09, -.1]]) put(new T3.CylinderGeometry(.03, .035, .08, 7), Mt('#5e3820'), x, -.2, z);
      const fl = evo ? [[0, .1, .24, .075, '#ffae1a'], [-.07, .08, .17, .055, '#ff4a1a'], [.07, .08, .18, .055, '#ff4a1a'], [0, .06, .14, .05, '#ff6a1a']] : [[0, .08, .19, .065, '#ffae1a'], [-.06, .06, .13, .045, '#ff4a1a'], [.06, .06, .14, .045, '#ff4a1a']];
      fl.forEach(([x, z, h, r, c], n) => { const f = put(new T3.ConeGeometry(r, h, 8), Mt(c, {smooth:true, e:c, ei:.45, r:.4}), x, .1 + h / 2, z - .06 * n); parts.flames.push(f); });
      if (evo){
        for (const s of [-1, 1]){ const h = put(new T3.ConeGeometry(.03, .12, 6), Mt('#2a2422'), s * .09, .12, len / 2 - .04); h.rotation.x = .5; h.rotation.z = -s * .3; }
        for (let k = 0; k < 6; k++){ const a = k / 6 * Math.PI * 2, f = put(new T3.ConeGeometry(.035, .1, 6), Mt('#ff8a3d', {smooth:true, e:'#ff6a1a', ei:.9}), Math.cos(a) * .17, -.04 + Math.sin(a) * .17, -.02); f.rotation.z = a - Math.PI / 2; parts.flames.push(f); }
        const tf = put(new T3.ConeGeometry(.05, .16, 8), Mt('#ffd25c', {smooth:true, e:'#ffb000', ei:.9}), 0, .0, -len / 2 - .06); tf.rotation.x = -1.2; parts.flames.push(tf);
      }
      break;
    }
    case 'moss': {
      sph(.11, '#9edb7c', 0, -.13, .02, 1, .55, 1.8);
      sph(.075, '#9edb7c', 0, -.06, .14);
      for (const s of [-1, 1]){
        const st = put(new T3.CylinderGeometry(.009, .012, .1, 6), sm('#9edb7c'), s * .035, .03, .16); st.rotation.z = -s * .25;
        put(new T3.SphereGeometry(.03, 12, 10), sm('#ffffff'), s * .048, .085, .16);
        eye(s * .048, .085, .185, .016);
      }
      cheeks(-.07, .055, .2);
      const sh = sph(.15, '#7a8f3a', 0, .0, -.05, 1, 1, .85);
      for (const sx of [1, -1]){ const sp1 = put(new T3.TorusGeometry(.095, .022, 8, 22), sm('#4f9e45'), sx * .06, .0, -.05); sp1.rotation.y = Math.PI / 2; const sp2 = put(new T3.TorusGeometry(.045, .018, 8, 16), sm('#a8e07a'), sx * .13, .0, -.05); sp2.rotation.y = Math.PI / 2; }
      if (!evo){ put(new T3.CylinderGeometry(.02, .025, .07, 8), sm('#f4efe2'), .04, .17, -.07); put(new T3.SphereGeometry(.055, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), sm('#e0523f'), .04, .2, -.07); for (const [x, z] of [[.02, -.05], [.07, -.08], [.04, -.11]]) sph(.01, '#ffffff', x, .245, z); sph(.03, '#5fae4a', -.08, .14, -.02, 1.4, .5, 1); }
      else {
        put(new T3.CylinderGeometry(.02, .03, .14, 6), Mt('#7a5235'), 0, .19, -.05);
        put(new T3.IcosahedronGeometry(.13, 0), Mt('#4fa45a'), 0, .32, -.05); put(new T3.IcosahedronGeometry(.08, 0), Mt('#6cbc56'), .05, .41, -.02);
        [['#f39ab8', -.12, .05], ['#ffd45a', .12, -.08], ['#ffffff', -.06, -.18]].forEach(([c, x, z]) => sph(.03, c, x, .1, z));
      }
      break;
    }
    case 'pebble': {
      const stone = (r, hex, y, sy, rot) => { const m = put(new T3.DodecahedronGeometry(r, 0), Mt(hex), 0, y, 0); m.scale.set(1.15, sy, 1.05); m.rotation.y = rot; return m; };
      stone(.17, '#9a948b', -.13, .5, .3);
      stone(.14, d.color, .0, .62, 1.1);
      stone(.095, '#a8a199', .11, .6, .5);
      if (evo) stone(.07, '#c4beb4', .19, .65, 1.4);
      sph(.06, '#7cc26a', -.02, evo ? .25 : .17, -.01, 1.2, .35, 1);
      eyes(.01, .055, .14, .025); cheeks(-.035, .095, .12);
      parts.hands = [-1, 1].map(s => { const h = put(new T3.DodecahedronGeometry(.045, 0), Mt('#8c857c'), s * .25, -.02, .03); return h; });
      if (evo){
        [[.0, .3, 0, .06], [-.1, .14, -.08, .045], [.11, .06, -.1, .05]].forEach(([x, y, z, r]) => { const c = put(new T3.OctahedronGeometry(r, 0), Mt('#7fe0d8', {e:'#3fb0a8', ei:.5, r:.2}), x, y, z); c.scale.set(.7, 1.6, .7); });
      }
      break;
    }
    case 'fluff': {
      const skirt = put(lathe([[.0, .08], [.07, .07], [.12, .02], [.16, -.08], [.17, -.13], [.14, -.12]], 20), sm(d.color, {side:2}));
      skirt.material.side = T3.DoubleSide;
      for (let k = 0; k < (evo ? 8 : 5); k++){ const a = k / (evo ? 8 : 5) * Math.PI * 2, p = sph(.06, evo && k % 2 ? '#ffd1e4' : '#f48fbd', Math.sin(a) * .16, -.12, Math.cos(a) * .16, 1, .35, 1.5); p.rotation.y = a; p.rotation.x = .4; }
      sph(.1, '#fff4ec', 0, .15, 0);
      sph(.07, '#ffc2dc', 0, .23, -.02, 1.3, .6, 1.2);
      for (const s of [-1, 1]){ const a = put(new T3.CylinderGeometry(.006, .006, .1, 5), sm('#c76a96'), s * .04, .3, .0); a.rotation.z = -s * .4; sph(.02, '#ffe45a', s * .065, .35, 0); }
      eyes(.15, .038, .085, .022); cheeks(.12, .062, .075);
      const wn = evo ? 2 : 1;
      for (let q = 0; q < wn; q++) for (const s of [-1, 1]){ const w = put(new T3.SphereGeometry(.1, 12, 8), sm('#ffffff', {t:.6}), s * (.16 + q * .04), .14 - q * .1, -.08); w.scale.set(1.2 - q * .3, .25, .7 - q * .15); parts.wings.push(w); }
      if (evo){ const h = put(new T3.TorusGeometry(.08, .012, 8, 24), Mt('#ffd45a', {e:'#ffb000', ei:.6}), 0, .42, -.02); h.rotation.x = Math.PI / 2; }
      break;
    }
    case 'zap': {
      const r = evo ? .17 : .15;
      put(lathe([[0, .0], [r * .55, .0], [r * .95, .04], [r, .1], [r * .85, .19], [r * .5, .25], [0, .27]], 22), sm('#cfe4ff', {t:.32, r:.05, m:.1}));
      parts.bulb = put(new T3.SphereGeometry(.06, 14, 10), Mt('#ffe45a', {smooth:true, e:'#ffc800', ei:1.4}), 0, .1, 0);
      put(new T3.CylinderGeometry(.008, .008, .08, 6), sm('#ffb000'), 0, .1, 0);
      put(new T3.CylinderGeometry(r * .62, r * .5, .09, 16), sm(d.color, {m:.4, r:.4}), 0, -.045, 0);
      for (let k = 0; k < 3; k++) put(new T3.TorusGeometry(r * (.6 - k * .04), .008, 6, 18), sm('#5a57b8'), 0, -.02 - k * .025, 0).rotation.x = Math.PI / 2;
      eyes(.07, .055, r * .93, .026); cheeks(.025, .095, r * .82);
      const tn = evo ? 5 : 3;
      for (let k = 0; k < tn; k++){ const a = k / tn * Math.PI * 2 + .3, x = Math.sin(a) * .05, z = Math.cos(a) * .05; const t = put(new T3.CylinderGeometry(.008, .006, .16, 5), sm('#6f6cd8'), x, -.17, z); t.rotation.z = Math.sin(a) * .3; t.rotation.x = Math.cos(a) * .3; put(new T3.SphereGeometry(.016, 8, 6), Mt('#ffe45a', {smooth:true, e:'#ffd400', ei:.8}), x * 1.9, -.25, z * 1.9); }
      if (evo){
        for (const q of [0, 1]){ const ring = put(new T3.TorusGeometry(.24, .01, 6, 30), Mt('#ffe45a', {smooth:true, e:'#ffd400', ei:.8}), 0, .08, 0); ring.rotation.x = Math.PI / 2 + (q ? .5 : -.5); parts.rings.push(ring); }
        for (const s of [-1, 1]){ const at = put(new T3.CylinderGeometry(.006, .008, .12, 5), sm('#5a57b8'), s * .05, .31, 0); at.rotation.z = -s * .3; sph(.022, '#ffe45a', s * .07, .37, 0, 1, 1, 1, {e:'#ffd400', ei:.8}); }
      }
      break;
    }
  }
  const glow = (c, ei = 2.2) => Mt(c, {smooth:true, e:c, ei});
  const chrome = sm('#c9d2dc');
  if (CYBER_ON) switch (key){
    case 'ripple': {
      const arc = put(new T3.TorusGeometry(.172, .008, 6, 26, Math.PI), glow(CY), 0, -.09, 0); arc.rotation.x = Math.PI / 2;
      put(new T3.CylinderGeometry(.005, .007, .1, 5), chrome, .03, .3, 0).rotation.z = -.3; put(new T3.SphereGeometry(.014, 8, 6), glow(PK), .045, .35, 0);
      for (const s of [-1, 1]) put(new T3.BoxGeometry(.012, .05, .05), chrome, s * .155, -.0, .03);
      if (evo){ const a2 = put(new T3.TorusGeometry(.16, .007, 6, 26, Math.PI), glow(PK), 0, .02, 0); a2.rotation.x = Math.PI / 2; }
      break;
    }
    case 'ember': {
      const L = evo ? .36 : .32;
      for (const z of [-L * .3, L * .3]) put(new T3.TorusGeometry(.152, .012, 6, 20), chrome, 0, -.04, z);
      for (const s of [-1, 1]){ put(new T3.CylinderGeometry(.018, .022, .12, 8), chrome, s * .07, .14, -L / 2 + .04); put(new T3.CylinderGeometry(.016, .016, .015, 8), glow(OR), s * .07, .205, -L / 2 + .04); }
      put(new T3.BoxGeometry(.012, .06, .14), glow(OR), .152, -.04, 0);
      break;
    }
    case 'moss': {
      put(new T3.BoxGeometry(.012, .08, .1), chrome, .152, .0, -.05);
      for (const y of [-.02, .02]) put(new T3.SphereGeometry(.009, 6, 4), glow(CY), .16, y, -.03);
      put(new T3.BoxGeometry(.012, .008, .2), glow('#7dff8a', 1.8), .105, -.165, .04); put(new T3.BoxGeometry(.012, .008, .2), glow('#7dff8a', 1.8), -.105, -.165, .04);
      put(new T3.CylinderGeometry(.005, .006, .12, 5), chrome, -.08, .19, -.08).rotation.z = .4; put(new T3.SphereGeometry(.012, 8, 6), glow(PK), -.105, .25, -.08);
      break;
    }
    case 'pebble': {
      [[.0, .02, .135, .07, .012, .4], [-.06, -.12, .17, .05, .01, -.5], [.05, .12, .085, .04, .01, .9]].forEach(([x, y, z, w, h, r]) => { const c = put(new T3.BoxGeometry(w, h, .01), glow(CY), x, y, z); c.rotation.z = r; });
      (parts.hands || []).forEach(hd => { const t = add(hd, new T3.TorusGeometry(.05, .008, 6, 16), glow(PK, 1.8)); t.rotation.y = Math.PI / 2; });
      break;
    }
    case 'fluff': {
      const band = put(new T3.TorusGeometry(.105, .01, 6, 20, Math.PI), chrome, 0, .15, -.005); band.rotation.z = 0;
      for (const s of [-1, 1]){ const cup = put(new T3.CylinderGeometry(.032, .032, .025, 12), glow(PK, 1.6), s * .105, .15, 0); cup.rotation.z = Math.PI / 2; }
      parts.wings.forEach(w => { w.material = Mt('#9ff6ff', {smooth:true, t:.55, e:CY, ei:1.3}); });
      break;
    }
    case 'zap': {
      const r = evo ? .17 : .15; const t = put(new T3.TorusGeometry(r * .62, .01, 6, 22), glow(PK), 0, -.09, 0); t.rotation.x = Math.PI / 2;
      put(new T3.BoxGeometry(.06, .012, .012), glow(CY), 0, -.045, r * .62);
      break;
    }
  }
  if (evo) size.scale.setScalar(1.28);
  const ring = new T3.Mesh(new T3.RingGeometry(.28, .33, 28), new T3.MeshBasicMaterial({color:d.color, transparent:true, opacity:.6, depthWrite:false}));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .02; g.add(ring);
  body.position.y = .22;
  g.userData = {body, parts, ring, ph:SPK.indexOf(key) * 1.7 + Math.random() * 3, heading:0, hop:0};
  return g;
}
