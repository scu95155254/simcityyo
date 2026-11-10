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
      const tail = put(new T3.TorusGeometry(.07, .024, 8, 18, Math.PI * 1.35), sm('#3fa4d8'), 0, -.07, -.19); tail.rotation.y = Math.PI / 2; tail.rotation.x = .3;
      eyes(.0, .065, .145);
      if (evo){
        for (const s of [-1, 1]) put(new T3.CylinderGeometry(.04, .04, .15, 10), sm('#68a8ed'), s * .2, .1, -.1).rotation.x = Math.PI / 2;
      }
      break;
    }
    case 'ember': { 
      const len = evo ? .36 : .32;
      const bodyPart = put(new T3.CylinderGeometry(.12, .14, len, 12), sm(d.color), 0, -.04, 0); 
      bodyPart.rotation.x = Math.PI / 2;
      eyes(-.02, .055, len / 2 + .01, .026);
      const fl = evo ? [[0, .0, -.24, .08, '#ffae1a']] : [[0, .0, -.19, .065, '#ffae1a']];
      fl.forEach(([x, y, z, r, c]) => { const f = put(new T3.ConeGeometry(r, .15, 8), Mt(c, {smooth:true, e:c, ei:.45}), x, y, z); parts.flames.push(f); });
      if (evo){
        for (const s of [-1, 1]){ const w = sph(.15, '#f58242', s * .22, .08, -.04, 1.8, .3, .9); w.rotation.z = s * .3; parts.wings.push(w); }
      }
      break;
    }
    case 'moss': { 
      sph(.11, '#9edb7c', 0, -.13, .02, 1, .55, 1.8);
      eyes(.05, .06, .12, .02);
      if (!evo){ 
        put(new T3.CylinderGeometry(.02, .025, .07, 8), sm('#f4efe2'), 0, .15, -.05); 
        put(new T3.SphereGeometry(.055, 14, 8), sm('#e0523f'), 0, .2, -.05); 
      } else {
        put(new T3.IcosahedronGeometry(.13, 0), sm('#4fa45a'), 0, .25, -.05); 
      }
      break;
    }
    case 'pebble': { 
      const stone = (r, hex, y, sy, rot) => { const m = put(new T3.DodecahedronGeometry(r, 0), Mt(hex), 0, y, 0); m.scale.set(1.15, sy, 1.05); m.rotation.y = rot; return m; };
      stone(.17, '#9a948b', -.13, .5, .3);
      stone(.14, d.color, .0, .62, 1.1);
      eyes(.01, .055, .14, .025);
      parts.hands = [-1, 1].map(s => put(new T3.DodecahedronGeometry(.045, 0), Mt('#8c857c'), s * .25, -.02, .03));
      break;
    }
    case 'fluff': { 
      sph(.12, d.color, 0, .05, 0, 1.2, 1.2, 1.2);
      eyes(.08, .05, .1, .025);
      cheeks(.04, .08, .09);
      if (evo){
        sph(.04, '#ff96c1', -.1, .2, 0);
        sph(.04, '#ff96c1', .1, .2, 0);
      }
      break;
    }
    case 'zap': { 
      put(new T3.CylinderGeometry(.12, .12, .1, 16), sm(d.color), 0, 0, 0).rotation.x = Math.PI / 2;
      for (const s of [-1, 1]){
        const mag = put(new T3.TorusGeometry(.08, .015, 6, 16, Math.PI), sm('#ff4a4a'), s * .14, 0, 0);
        mag.rotation.z = s * Math.PI / 2;
      }
      eye(0, .03, .1, .03);
      if (evo){
        const ring = put(new T3.TorusGeometry(.22, .01, 6, 24), sm('#ffc800'), 0, 0, 0);
        ring.rotation.x = Math.PI / 2;
        parts.rings.push(ring);
      }
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