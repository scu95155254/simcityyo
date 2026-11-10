/* 場景：渲染器、燈光、海、雲、遠方小島與貨船、島嶼地形、樹木岩石、野外島、橋。 */
'use strict';

/* ---- scene ---- */
const tileObjs = new Map(), groupObjs = new Map();
const popIn = new Set(), anims = [], dynList = [], debris = [];
let terrainGroup, featGroup, wildGroup, bridgeGroup, gate, featSig = '', waterGeo, waterBase, foamMesh, hoverMesh, hoverEdge, radMesh, selEdge, destRing, ghost = null, ghostSig = '', ghostMat;
const sprites = new Map(), people = [], clouds = [];
const cam = {tx:0, tz:0, az:Math.PI / 4, dist:20}, camT = {tx:0, tz:0, az:Math.PI / 4, dist:20};
const HORIZON = '#9fd8d1', ZENITH = '#9fd8d1';
function initScene(){
  renderer = new T3.WebGLRenderer({canvas:cv, antialias:true, powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, coarse ? 1.75 : 2));
  renderer.outputEncoding = T3.sRGBEncoding;
  renderer.toneMapping = T3.ACESFilmicToneMapping; renderer.toneMappingExposure = .96;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T3.PCFSoftShadowMap;
  scene = new T3.Scene();
  scene.fog = new T3.Fog(col(HORIZON), 30, 80);
  scene.background = col(HORIZON);
  camera = new T3.PerspectiveCamera(30, 1, 1, 220);

  const sg = new T3.SphereGeometry(180, 32, 16), cols = [];
  const h = col(HORIZON), z = col(ZENITH), tmp = new T3.Color();
  for (let k = 0; k < sg.attributes.position.count; k++){ const y = sg.attributes.position.getY(k) / 180; tmp.copy(h).lerp(z, clamp(y * 2.2, 0, 1)); cols.push(tmp.r, tmp.g, tmp.b); }
  sg.setAttribute('color', new T3.Float32BufferAttribute(cols, 3));
  sky = new T3.Mesh(sg, new T3.MeshBasicMaterial({vertexColors:true, side:T3.BackSide, fog:false, depthWrite:false}));
  sky.visible = false; scene.add(sky);

  scene.add(new T3.HemisphereLight(col('#f4fbff'), col('#a9b98e'), .72));
  sun = new T3.DirectionalLight(col('#fff4e2'), 1.3);
  sun.position.set(-9, 16, 7); sun.castShadow = true;
  sun.shadow.mapSize.set(coarse ? 1536 : 2048, coarse ? 1536 : 2048);
  Object.assign(sun.shadow.camera, {left:-17, right:17, top:17, bottom:-17, near:1, far:50});
  sun.shadow.bias = -.0005; sun.shadow.normalBias = .025;
  scene.add(sun, sun.target);

  waterGeo = new T3.PlaneGeometry(140, 140, 90, 90); waterGeo.rotateX(-Math.PI / 2);
  waterBase = Float32Array.from(waterGeo.attributes.position.array);
  const water = new T3.Mesh(waterGeo, new T3.MeshStandardMaterial({color:col('#8fd3ca'), roughness:.35, metalness:0, flatShading:true, transparent:true, opacity:.92}));
  water.position.y = -.2; water.receiveShadow = true; scene.add(water);
  const floor = new T3.Mesh(new T3.PlaneGeometry(140, 140), Mt('#86c9c0')); floor.rotation.x = -Math.PI / 2; floor.position.y = -1.4; scene.add(floor);

  world = new T3.Group(); scene.add(world);
  ghostMat = new T3.MeshStandardMaterial({color:col('#8ee0a4'), transparent:true, opacity:.55, depthWrite:false, emissive:col('#2a7a46'), emissiveIntensity:.4});
  hoverMesh = new T3.Mesh(new T3.PlaneGeometry(1, 1), new T3.MeshBasicMaterial({color:'#8ee0a4', transparent:true, opacity:.3, depthWrite:false}));
  hoverMesh.rotation.x = -Math.PI / 2; hoverMesh.renderOrder = 5; scene.add(hoverMesh);
  const sq = new T3.BufferGeometry().setFromPoints([new T3.Vector3(-.5, 0, -.5), new T3.Vector3(.5, 0, -.5), new T3.Vector3(.5, 0, .5), new T3.Vector3(-.5, 0, .5)]);
  hoverEdge = new T3.LineLoop(sq, new T3.LineBasicMaterial({color:'#8ee0a4'})); scene.add(hoverEdge);
  selEdge = new T3.LineLoop(sq, new T3.LineBasicMaterial({color:'#ffc94d'})); scene.add(selEdge);
  radMesh = new T3.Mesh(new T3.PlaneGeometry(1, 1), new T3.MeshBasicMaterial({color:'#ffe08a', transparent:true, opacity:.2, depthWrite:false}));
  radMesh.rotation.x = -Math.PI / 2; radMesh.renderOrder = 4; scene.add(radMesh);

  destRing = new T3.Mesh(new T3.RingGeometry(.3, .38, 32), new T3.MeshBasicMaterial({color:'#ffc94d', transparent:true, opacity:.85, depthWrite:false}));
  destRing.rotation.x = -Math.PI / 2; destRing.renderOrder = 6; scene.add(destRing);
  for (let k = 0; k < 9; k++){
    const c = new T3.Group(), m = Mt('#ffffff', {smooth:true, r:1});
    const n = 3 + (k % 3);
    for (let q = 0; q < n; q++){ const p = add(c, new T3.SphereGeometry(.32 + hash(k, q) * .3, 16, 12), m, q * .45 - n * .22, hash(q, k) * .2, (hash(k + 3, q) - .5) * .45); p.castShadow = true; }
    c.position.set((hash(k, 1) - .5) * 72 + 4, 4.5 + hash(1, k) * 1.5, (hash(k, 9) - .5) * 40);
    c.userData.v = .25 + hash(k, 5) * .3; scene.add(c); clouds.push(c);
  }
}


let post = null;
function initPost(){
  if (!renderer.capabilities.isWebGL2 && !renderer.extensions.has('WEBGL_depth_texture')) return;
  const rt = new T3.WebGLRenderTarget(2, 2, {minFilter:T3.LinearFilter, magFilter:T3.LinearFilter, type:renderer.capabilities.isWebGL2 ? T3.HalfFloatType : T3.UnsignedByteType});
  rt.depthTexture = new T3.DepthTexture(2, 2); rt.depthTexture.type = T3.UnsignedIntType;
  const mat = new T3.ShaderMaterial({
    uniforms:{tColor:{value:rt.texture}, tDepth:{value:rt.depthTexture}, res:{value:new T3.Vector2(2, 2)}, near:{value:camera.near}, far:{value:camera.far}, th:{value:1}, ss:{value:1}, fogN:{value:30}, fogF:{value:80}, exposure:{value:.62}},
    vertexShader:'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader:`uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 res; uniform float near, far, th, ss, fogN, fogF, exposure; varying vec2 vUv;
      float lin(vec2 uv){ float z = texture2D(tDepth, uv).x * 2. - 1.; return 2. * near * far / (far + near - z * (far - near)); }
      vec3 aces(vec3 x){ x *= exposure; return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
      void main(){
        vec2 px = 1. / res; vec3 c;
        if (ss > 1.){ vec2 h = px * .5; c = (texture2D(tColor, vUv + vec2(-h.x, -h.y)).rgb + texture2D(tColor, vUv + vec2(h.x, -h.y)).rgb + texture2D(tColor, vUv + vec2(-h.x, h.y)).rgb + texture2D(tColor, vUv + vec2(h.x, h.y)).rgb) * .25; }
        else c = texture2D(tColor, vUv).rgb;
        float d = lin(vUv); vec2 o = px * th;
        float lx = lin(vUv + vec2(o.x, 0.)) + lin(vUv - vec2(o.x, 0.)) - 2. * d;
        float ly = lin(vUv + vec2(0., o.y)) + lin(vUv - vec2(0., o.y)) - 2. * d;
        float e = max(lx, ly) / d;
        float edge = smoothstep(.035, .09, e) * (1. - smoothstep(fogN * .8, fogF * .7, d));
        vec3 gl = vec3(0.);
        for (int k = 0; k < 12; k++){ float a = float(k) * .5236; vec2 off = vec2(cos(a), sin(a)) * px * th * (k < 6 ? 3. : 6.5); gl += max(texture2D(tColor, vUv + off).rgb - vec3(.95), 0.); }
        c += gl * .14;
        c = pow(aces(c), vec3(1. / 2.2));
        float l = dot(c, vec3(.299, .587, .114)); c = clamp(mix(vec3(l), c, 1.22), 0., 1.);
        c = mix(c, vec3(.12, .09, .13), edge * .95);
        gl_FragColor = vec4(c, 1.);
      }`,
    depthTest:false, depthWrite:false});
  const quad = new T3.Mesh(new T3.PlaneGeometry(2, 2), mat); quad.frustumCulled = false;
  const ps = new T3.Scene(); ps.add(quad);
  post = {rt, mat, ps, cam:new T3.OrthographicCamera(-1, 1, 1, -1, 0, 1)};
}
function sizePost(){
  if (!post || !W || !H) return;
  const pr = renderer.getPixelRatio(), ss = pr < 1.5 ? 2 : 1, w = Math.round(W * pr * ss), h = Math.round(H * pr * ss);
  post.rt.setSize(w, h); const u = post.mat.uniforms; u.res.value.set(w, h); u.ss.value = ss; u.th.value = Math.max(1.5, pr * ss * 1.05);
}
function renderFrame(){
  if (!post){ renderer.render(scene, camera); return; }
  const u = post.mat.uniforms; u.fogN.value = scene.fog.near; u.fogF.value = scene.fog.far;
  renderer.setRenderTarget(post.rt); renderer.render(scene, camera);
  renderer.setRenderTarget(null); renderer.render(post.ps, post.cam);
}
let ship = null;
function buildScenery(){
  const g = new T3.Group(); scene.add(g);
  for (let k = 0; k < 7; k++){
    const a = k / 7 * Math.PI * 2 + .4, r = 22 + hash(k, 3) * 10, x = Math.cos(a) * r + 7, z = Math.sin(a) * r * .8, s = .7 + hash(3, k) * .9;
    const il = new T3.Group(); il.position.set(x, -.22, z); il.scale.setScalar(s); g.add(il);
    add(il, new T3.CylinderGeometry(1.1, 1.25, .3, 18), Mt('#ecd9ad', {smooth:true}));
    add(il, new T3.CylinderGeometry(.85, .9, .08, 18), Mt('#abd283', {smooth:true}), 0, .17, 0);
    if (hash(k, 7) > .3){ cyl(il, .05, .07, .3, 6, '#7a5235', .1, .2, 0); ico(il, .28, '#62b360', .1, .62, 0, {smooth:true}, 1); }
    il.traverse(o => { if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
  }
  ship = new T3.Group();
  bx(ship, 2.2, .26, .62, '#33414f', 0, 0, 0); bx(ship, 2.22, .06, .64, '#c8553a', 0, -.02, 0);
  const cc = ['#c8553a', '#2f6db5', '#e0a03a', '#5f9f72', '#f2f2ee'];
  for (let q = 0; q < 7; q++) for (let r2 = 0; r2 < 2; r2++) bx(ship, .26, .2, .26, cc[(q * 3 + r2) % cc.length], -.8 + q * .27, .26 + r2 * .2, 0);
  bx(ship, .32, .5, .52, '#f2f2ee', .92, .26, 0); bx(ship, .34, .06, .54, '#33414f', .92, .76, 0);
  ship.traverse(o => { if (o.isMesh) o.castShadow = true; });
  ship.position.set(-20, -.12, 15); ship.userData.t = 0; scene.add(ship);
}
function updateScenery(dt, t){
  if (!ship || reduceMotion) return;
  ship.userData.t += dt * .018;
  const a = ship.userData.t % (Math.PI * 2), x = Math.cos(a) * 30 + 6, z = Math.sin(a) * 22;
  ship.position.set(x, -.14 + Math.sin(t * 1.3) * .02, z); ship.rotation.y = -a; ship.rotation.z = Math.sin(t * 1.1) * .02;
}
function buildTerrain(){
  if (terrainGroup){ world.remove(terrainGroup); terrainGroup.traverse(o => o.geometry && o.geometry.dispose()); }
  terrainGroup = new T3.Group(); world.add(terrainGroup);
  const land = [], shallow = [], foam = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++){
    const k = idx(i, j);
    if (S.terr[k] !== 'w') land.push([i, j, k]);
    else {
      let near = false; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (inb(i + a, j + b) && S.terr[idx(i + a, j + b)] !== 'w') near = true;
      if (near) shallow.push([i, j]);
    }
    if (S.terr[k] !== 'w') [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([a, b]) => { if (!inb(i + a, j + b) || S.terr[idx(i + a, j + b)] === 'w') foam.push([i, j, a, b]); });
  }
  const dm = new T3.Object3D(), c = new T3.Color();
  const turf = new T3.InstancedMesh(new T3.BoxGeometry(1, .14, 1), Mt('#ffffff'), land.length);
  const soil = new T3.InstancedMesh(new T3.BoxGeometry(1, 1.3, 1), Mt('#ecd9ad'), land.length);
  land.forEach(([i, j, k], n) => {
    const [x, z] = tileXZ(i, j), y = tileY(k), hs = hash(i, j);
    dm.position.set(x, y - .07, z); dm.updateMatrix(); turf.setMatrixAt(n, dm.matrix);
    c.copy(col(S.terr[k] === 's' ? (hs > .5 ? '#ecd8a0' : '#e6d096') : (hs > .66 ? '#b2d68a' : hs > .33 ? '#abd283' : '#a5cd7c')));
    turf.setColorAt(n, c);
    dm.position.set(x, y - .14 - .65, z); dm.updateMatrix(); soil.setMatrixAt(n, dm.matrix);
  });
  turf.receiveShadow = true; soil.receiveShadow = true; turf.castShadow = true;
  terrainGroup.add(turf, soil);
  const sh = new T3.InstancedMesh(new T3.BoxGeometry(1, .5, 1), Mt('#d9c48e'), Math.max(1, shallow.length));
  shallow.forEach(([i, j], n) => { const [x, z] = tileXZ(i, j); dm.position.set(x, -.75 - hash(i, j) * .15, z); dm.updateMatrix(); sh.setMatrixAt(n, dm.matrix); });
  sh.count = shallow.length; terrainGroup.add(sh);
  foamMesh = new T3.InstancedMesh(new T3.BoxGeometry(1, .02, .12), new T3.MeshBasicMaterial({color:'#ffffff', transparent:true, opacity:.55, depthWrite:false}), Math.max(1, foam.length));
  foam.forEach(([i, j, a, b], n) => {
    const [x, z] = tileXZ(i, j); dm.position.set(x + a * .55, -.17, z + b * .55); dm.rotation.set(0, a ? Math.PI / 2 : 0, 0); dm.updateMatrix(); foamMesh.setMatrixAt(n, dm.matrix);
  });
  dm.rotation.set(0, 0, 0);
  foamMesh.count = foam.length; terrainGroup.add(foamMesh);
}

function buildFeatures(){
  if (featGroup){ world.remove(featGroup); featGroup.children.forEach(o => o.geometry.dispose()); }
  featGroup = new T3.Group(); world.add(featGroup);
  const trees = [], rocks = [], deco = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++){
    const k = idx(i, j);
    if (S.feat[k] === 1) trees.push([i, j, k]); else if (S.feat[k] === 2) rocks.push([i, j, k]);
    else if (S.terr[k] === 'g' && !S.bld[k] && hash(j, i) < .45) deco.push([i, j, k]);
  }
  const mk = (geo, hex, n) => { const cap = Math.max(1, n), m = new T3.InstancedMesh(geo, Mt(hex), cap); m.instanceColor = new T3.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3); m.castShadow = true; m.receiveShadow = true; m.count = 0; featGroup.add(m); return m; };
  const trunk = mk(new T3.CylinderGeometry(.045, .07, .32, 6), '#ffffff', trees.length);
  const can1 = mk(new T3.IcosahedronGeometry(.27, 0), '#ffffff', trees.length);
  const can2 = mk(new T3.IcosahedronGeometry(.19, 0), '#ffffff', trees.length);
  const pine1 = mk(new T3.ConeGeometry(.28, .46, 7), '#ffffff', trees.length);
  const pine2 = mk(new T3.ConeGeometry(.2, .36, 7), '#ffffff', trees.length);
  const rock = mk(new T3.DodecahedronGeometry(.2, 0), '#ffffff', rocks.length * 2);
  const tuft = mk(new T3.ConeGeometry(.025, .1, 4), '#ffffff', deco.length * 3);
  const flower = mk(new T3.IcosahedronGeometry(.03, 0), '#ffffff', deco.length * 2);
  const dm = new T3.Object3D(), c = new T3.Color();
  const put = (m, x, y, z, s, sy, ry, hex) => { dm.position.set(x, y, z); dm.scale.set(s, sy ?? s, s); dm.rotation.set(0, ry || 0, 0); dm.updateMatrix(); m.setMatrixAt(m.count, dm.matrix); if (hex) m.setColorAt(m.count, c.copy(col(hex))); m.count++; };
  const greens = ['#3f8f4e', '#4a9a52', '#58a55a', '#3a8648', '#62a95a'];
  for (const [i, j, k] of trees){
    const [x0, z0] = tileXZ(i, j), y = tileY(k), hs = hash(i, j), h2 = hash(j + 5, i);
    const x = x0 + (hs - .5) * .3, z = z0 + (h2 - .5) * .3, s = .85 + hash(i + 2, j) * .35, ry = hs * 6;
    put(trunk, x, y + .16 * s, z, s, null, ry, '#7a5235');
    const g1 = greens[(i * 7 + j) % greens.length];
    if (h2 > .42){ put(can1, x, y + .45 * s, z, s, null, ry, g1); put(can2, x + .05 * s, y + .66 * s, z + .03 * s, s, null, ry + 1, shadeHex(g1, .15)); }
    else { put(pine1, x, y + .45 * s, z, s, null, ry, shadeHex(g1, -.08)); put(pine2, x, y + .7 * s, z, s, null, ry, g1); }
  }
  for (const [i, j, k] of rocks){
    const [x, z] = tileXZ(i, j), hs = hash(i, j);
    put(rock, x - .08, tileY(k) + .08, z, 1.1, .7, hs * 6, '#9aa3a8'); put(rock, x + .15, tileY(k) + .05, z + .12, .6, .55, hs * 3, '#b0b8bc');
  }
  const fl = ['#f39ab8', '#ffd45a', '#ffffff', '#b48cf0', '#ff8a6b'];
  for (const [i, j] of deco){
    const [x, z] = tileXZ(i, j);
    for (let q = 0; q < 3; q++) put(tuft, x + (hash(i + q, j) - .5) * .8, .05, z + (hash(i, j + q) - .5) * .8, 1, 1, 0, q % 2 ? '#5fa850' : '#6db85a');
    if (hash(i * 2, j) < .5) for (let q = 0; q < 2; q++) put(flower, x + (hash(i + q + 9, j) - .5) * .7, .05, z + (hash(i, j + q + 9) - .5) * .7, 1, 1, 0, fl[(i + j + q) % fl.length]);
  }
  for (const m of featGroup.children){ m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
}



function buildWild(){
  if (wildGroup){ scene.remove(wildGroup); wildGroup.traverse(o => o.geometry && o.geometry.dispose()); }
  wildGroup = new T3.Group(); scene.add(wildGroup);
  const dm = new T3.Object3D(), c = new T3.Color();
  const land = [], lake = [], foam = [];
  for (let b = 0; b < N2; b++) for (let a = 0; a < N2; a++){
    const w = WT[b * N2 + a], gi = a + OXI, gj = b + OZJ;
    if (w.land) land.push([gi, gj, w]); else if (w.zone === 'lake') lake.push([gi, gj]);
    if (w.land) [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([x, z]) => { const n = wildAt(gi + x, gj + z); if ((!n || !n.land) && !isBridge(gi + x, gj + z)) foam.push([gi, gj, x, z, w]); });
  }
  const mk = (geo, mat, n) => { const m = new T3.InstancedMesh(geo, mat, Math.max(1, n)); m.instanceColor = new T3.InstancedBufferAttribute(new Float32Array(Math.max(1, n) * 3).fill(1), 3); m.count = 0; m.castShadow = m.receiveShadow = true; wildGroup.add(m); return m; };
  const put = (m, x, y, z, sx, sy, sz, ry, hex) => { dm.position.set(x, y, z); dm.scale.set(sx, sy, sz); dm.rotation.set(0, ry || 0, 0); dm.updateMatrix(); m.setMatrixAt(m.count, dm.matrix); if (hex) m.setColorAt(m.count, c.copy(col(hex))); m.count++; };
  const turf = mk(new T3.BoxGeometry(1, .14, 1), Mt('#ffffff'), land.length);
  const soil = mk(new T3.BoxGeometry(1, 1, 1), Mt('#ffffff'), land.length);
  const tall = mk(new T3.ConeGeometry(.035, .22, 4), Mt('#ffffff'), land.length * 5);
  const flower = mk(new T3.IcosahedronGeometry(.035, 0), Mt('#ffffff'), land.length * 3);
  const trunk = mk(new T3.CylinderGeometry(.045, .07, .32, 6), Mt('#ffffff'), land.length);
  const can = mk(new T3.IcosahedronGeometry(.27, 0), Mt('#ffffff'), land.length);
  const pine = mk(new T3.ConeGeometry(.26, .5, 7), Mt('#ffffff'), land.length * 2);
  const rock = mk(new T3.DodecahedronGeometry(.2, 0), Mt('#ffffff'), land.length * 3);
  const fl = ['#f39ab8', '#ffd45a', '#ffffff', '#b48cf0', '#ff8a6b'];
  for (const [gi, gj, w] of land){
    const [x, z] = gXZ(gi, gj), top = gY(gi, gj), hs = hash(gi, gj);
    const tc = w.zone === 'hill' ? (w.h === 2 ? (hs > .5 ? '#c9c79a' : '#c2c093') : (hs > .5 ? '#a6c77c' : '#9fc275')) : w.zone === 'shore' ? (hs > .5 ? '#ecd8a0' : '#e6d096') : (hs > .5 ? '#b2d68a' : '#abd283');
    put(turf, x, top - .07, z, 1, 1, 1, 0, tc);
    const sh = top + 1.44 - .14; put(soil, x, top - .14 - sh / 2, z, 1, sh, 1, 0, w.zone === 'hill' ? '#d9c79a' : '#ecd9ad');
    if (w.tall) for (let q = 0; q < 5; q++) put(tall, x + (hash(gi + q, gj) - .5) * .8, top + .1, z + (hash(gi, gj + q) - .5) * .8, 1, .7 + hash(q, gi) * .6, 1, 0, q % 2 ? '#5aa84a' : '#6cbc56');
    if (w.flower) for (let q = 0; q < 3; q++) put(flower, x + (hash(gi + q + 7, gj) - .5) * .7, top + .06, z + (hash(gi, gj + q + 7) - .5) * .7, 1, 1, 1, 0, fl[(gi + gj + q) % fl.length]);
    if (w.tree){
      const s = .9 + hs * .3;
      put(trunk, x, top + .16 * s, z, s, s, s, hs * 6, '#7a5235');
      if (w.zone === 'hill'){ put(pine, x, top + .45 * s, z, s, s, s, hs * 6, '#3a8648'); put(pine, x, top + .72 * s, z, s * .75, s * .75, s * .75, hs * 3, '#4a9a52'); }
      else put(can, x, top + .45 * s, z, s, s, s, hs * 6, hs > .5 ? '#4a9a52' : '#58a55a');
    }
    if (w.rock){ put(rock, x - .08, top + .1, z, 1.3, .9, 1.2, hs * 6, '#9aa3a8'); put(rock, x + .18, top + .05, z + .14, .7, .6, .7, hs * 3, '#b0b8bc'); }
    else if (w.zone === 'hill' && hs < .35) put(rock, x + (hs - .2) * 1.5, top + .03, z + .2, .45, .35, .45, hs * 9, '#a9a399');
  }
  const sh = mk(new T3.BoxGeometry(1, .5, 1), Mt('#ffffff'), lake.length + foam.length);
  for (const [gi, gj] of lake){ const [x, z] = gXZ(gi, gj); put(sh, x, -.62, z, 1, 1, 1, 0, '#c9c08a'); }
  for (const m of wildGroup.children){ m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; }
  const fm = new T3.InstancedMesh(new T3.BoxGeometry(1, .02, .12), foamMesh.material, Math.max(1, foam.length));
  foam.forEach(([gi, gj, a, b], n) => { const [x, z] = gXZ(gi, gj); dm.position.set(x + a * .55, -.17, z + b * .55); dm.scale.set(1, 1, 1); dm.rotation.set(0, a ? Math.PI / 2 : 0, 0); dm.updateMatrix(); fm.setMatrixAt(n, dm.matrix); });
  fm.count = foam.length; wildGroup.add(fm);
  // stone stairs
  const sg0 = new T3.Group();
  for (const st of STAIRS){
    const g = new T3.Group(), [cx, cz] = gXZ(st.li, st.lj), rise = st.y1 - st.y0, n = 4, dep = .46 / n;
    g.position.set(cx, 0, cz); g.rotation.y = Math.atan2(-st.dz, st.dx);
    for (let k = 0; k < n; k++){
      const hgt = rise * (k + 1) / n, u = .04 + k * dep;
      bx(g, dep + .005, hgt + .03, .58, k % 2 ? '#cfc7b6' : '#c3baa8', u + dep / 2, st.y0 - .03, 0);
      for (const s of [-1, 1]) bx(g, dep + .005, hgt + .07, .06, '#9d9483', u + dep / 2, st.y0 - .03, s * .32);
    }
    bx(g, .06, rise + .12, .07, '#8a8173', .5, st.y0 - .03, .32); bx(g, .06, rise + .12, .07, '#8a8173', .5, st.y0 - .03, -.32);
    sg0.add(g);
  }
  sg0.traverse(o => { if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
  wildGroup.add(sg0);
  // sign at the landing
  const sg = new T3.Group(), [sx, sz] = gXZ(OXI + 1, BR.j - 1); sg.position.set(sx + .2, 0, sz + .3); sg.rotation.y = -Math.PI / 2;
  cyl(sg, .02, .025, .5, 6, '#7a5235', -.22, 0, 0); cyl(sg, .02, .025, .5, 6, '#7a5235', .22, 0, 0);
  bx(sg, .56, .2, .03, '#9a6a46', 0, .3, 0);
  add(sg, new T3.PlaneGeometry(.52, .17), Mt('#ffffff', {map:textTex('島丸野外島', '#f3e2c0', '#5a3a20')}), 0, .4, .017);
  sg.traverse(o => { if (o.isMesh) o.castShadow = true; }); wildGroup.add(sg);
  buildBridge();
}
function buildBridge(){
  if (bridgeGroup) scene.remove(bridgeGroup);
  bridgeGroup = new T3.Group(); scene.add(bridgeGroup);
  const len = BR.i1 - BR.i0 + 1, [x0, z] = gXZ(BR.i0, BR.j), xc = x0 + (len - 1) / 2;
  const deck = new T3.Group(); bridgeGroup.add(deck);
  for (let q = 0; q < len * 5; q++) bx(deck, .18, .05, .78, q % 2 ? '#b8875a' : '#a9784e', x0 - .5 + .1 + q * .2, .03, z);
  for (const s of [-1, 1]){
    bx(deck, len, .04, .05, '#8a5a3c', xc, .3, z + s * .38);
    for (let q = 0; q <= len; q++){ bx(deck, .06, .32, .06, '#7a4e33', x0 - .5 + q, .03, z + s * .38); cyl(deck, .05, .06, .9, 6, '#6a4630', x0 - .5 + q, -.85, z + s * .36); }
  }
  for (const [ex, dir] of [[x0 - .5, -1], [x0 - .5 + len, 1]]){
    const rp = add(deck, new T3.BoxGeometry(.34, .03, .7), Mt('#a9784e'), ex + dir * .15, .035, z); rp.rotation.z = dir * .22;
  }
  deck.traverse(o => { if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
  gate = new T3.Group(); const [gx] = gXZ(BR.i0, BR.j);
  for (let q = 0; q < 2; q++) bx(gate, .06, .5, .8, q ? '#f1ebe0' : '#c94b3d', gx - .35 + q * .06, .05, z);
  for (let q = 0; q < 4; q++) bx(gate, .07, .1, .8, q % 2 ? '#c94b3d' : '#f1ebe0', gx - .3, .15 + q * .1, z);
  gate.traverse(o => { if (o.isMesh) o.castShadow = true; });
  bridgeGroup.add(gate);
}
