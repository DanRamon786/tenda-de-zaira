// A tenda em 3D: tecido listrado, tapete, mesa redonda com toalha de veludo, velas, bola de cristal e fumaça.
import * as THREE from 'three';

export const MESA_Y = 0.745;           // altura do tampo (metros)
export const MESA_R = 0.62;

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}

function ruido(ctx, w, h, a) {
  const d = ctx.getImageData(0, 0, w, h), p = d.data;
  for (let i = 0; i < p.length; i += 4) { const n = (Math.random() - .5) * a; p[i] += n; p[i + 1] += n; p[i + 2] += n; }
  ctx.putImageData(d, 0, 0);
}

export function criaCena(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  const movel = matchMedia('(pointer: coarse)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio, movel ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = !movel; renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0508);
  scene.fog = new THREE.FogExp2(0x12070c, 0.16);

  const camera = new THREE.PerspectiveCamera(movel && innerWidth < innerHeight ? 58 : 42, innerWidth / innerHeight, 0.02, 40);
  camera.position.set(0, 1.3, 2.6);

  // ---------- tenda ----------
  const listras = canvasTex(1024, 512, (g, w, h) => {
    const cores = ['#4a0f22', '#2a0a18', '#5b1a2c', '#1e0913'];
    const n = 24;
    for (let i = 0; i < n; i++) { g.fillStyle = cores[i % cores.length]; g.fillRect(i * w / n, 0, w / n + 1, h); }
    g.fillStyle = '#b8862e'; for (let i = 0; i < n; i++) g.fillRect(i * w / n, 0, 2, h);
    // barra dourada com losangos
    g.fillStyle = '#6d4a17'; g.fillRect(0, h * .86, w, h * .06);
    g.fillStyle = '#d4a649'; for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, h * .89); g.lineTo(x + 8, h * .865); g.lineTo(x + 16, h * .89); g.lineTo(x + 8, h * .915); g.fill(); }
    ruido(g, w, h, 18);
  }, [2, 1]);
  const pano = new THREE.MeshStandardMaterial({ map: listras, roughness: .95, side: THREE.BackSide });
  const paredeGeo = new THREE.CylinderGeometry(3.1, 3.3, 3.4, 96, 8, true);
  // dobras do tecido
  const pp = paredeGeo.attributes.position;
  for (let i = 0; i < pp.count; i++) {
    const x = pp.getX(i), z = pp.getZ(i), a = Math.atan2(z, x), k = 1 + .025 * Math.sin(a * 48) + .01 * Math.sin(a * 13);
    pp.setX(i, x * k); pp.setZ(i, z * k);
  }
  paredeGeo.computeVertexNormals();
  const parede = new THREE.Mesh(paredeGeo, pano); parede.position.y = 1.7; parede.receiveShadow = true; scene.add(parede);
  const teto = new THREE.Mesh(new THREE.ConeGeometry(3.3, 1.6, 96, 4, true), new THREE.MeshStandardMaterial({ map: listras, roughness: .95, side: THREE.BackSide }));
  teto.position.y = 3.4 + .8; scene.add(teto);

  // tapete
  const tapete = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#2b0d12'; g.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const aneis = [['#5a1420', 480], ['#1c0a10', 450], ['#8a5a1c', 440], ['#3a0f1a', 430], ['#6e1b2a', 330], ['#b58a3a', 322], ['#26101a', 312], ['#4a1624', 200], ['#c49a4a', 192], ['#2a0c14', 184]];
    for (const [c, r] of aneis) { g.fillStyle = c; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); }
    g.strokeStyle = '#c49a4a'; g.lineWidth = 3;
    for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; g.beginPath(); g.moveTo(cx + Math.cos(a) * 200, cy + Math.sin(a) * 200); g.lineTo(cx + Math.cos(a + .2) * 310, cy + Math.sin(a + .2) * 310); g.lineTo(cx + Math.cos(a) * 420, cy + Math.sin(a) * 420); g.stroke(); }
    ruido(g, w, h, 26);
  });
  const chao = new THREE.Mesh(new THREE.CircleGeometry(3.3, 96), new THREE.MeshStandardMaterial({ map: tapete, roughness: 1 }));
  chao.rotation.x = -Math.PI / 2; chao.receiveShadow = true; scene.add(chao);

  // ---------- mesa ----------
  const toalhaTopo = canvasTex(1024, 1024, (g, w, h) => {
    const cx = w / 2, cy = h / 2;
    g.fillStyle = '#3a0b1d'; g.fillRect(0, 0, w, h);
    const rg = g.createRadialGradient(cx, cy, 0, cx, cy, w / 2); rg.addColorStop(0, '#4d1127'); rg.addColorStop(1, '#2a0714');
    g.fillStyle = rg; g.beginPath(); g.arc(cx, cy, w / 2, 0, 7); g.fill();
    g.strokeStyle = '#c9a04e'; g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, w * .47, 0, 7); g.stroke();
    g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, w * .455, 0, 7); g.stroke();
    // estrelas e luas bordadas na borda
    g.fillStyle = '#c9a04e';
    for (let i = 0; i < 28; i++) {
      const a = i * Math.PI * 2 / 28, x = cx + Math.cos(a) * w * .425, y = cy + Math.sin(a) * w * .425;
      g.save(); g.translate(x, y); g.rotate(a);
      if (i % 2) { g.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 4 : 10, b = k * Math.PI / 5; g.lineTo(Math.cos(b) * r, Math.sin(b) * r); } g.fill(); }
      else { g.beginPath(); g.arc(0, 0, 9, 0, 7); g.fill(); g.fillStyle = '#34091a'; g.beginPath(); g.arc(4, -2, 8, 0, 7); g.fill(); g.fillStyle = '#c9a04e'; }
      g.restore();
    }
    ruido(g, w, h, 14);
  });
  const veludo = new THREE.MeshPhysicalMaterial({ color: 0x5a0f24, roughness: .9, sheen: .5, sheenColor: new THREE.Color(0xa8405e), sheenRoughness: .6 });
  const topo = new THREE.Mesh(new THREE.CylinderGeometry(MESA_R, MESA_R, .02, 96), [veludo, new THREE.MeshPhysicalMaterial({ map: toalhaTopo, roughness: .92, sheen: .3, sheenColor: new THREE.Color(0x904060) }), veludo]);
  topo.position.y = MESA_Y - .01; topo.receiveShadow = true; scene.add(topo);
  const saiaGeo = new THREE.CylinderGeometry(MESA_R + .005, MESA_R + .09, MESA_Y - .02, 96, 6, true);
  const sp = saiaGeo.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    const x = sp.getX(i), z = sp.getZ(i), y = sp.getY(i), f = (.5 - y / (MESA_Y - .02)); // 0 em cima, 1 embaixo
    const a = Math.atan2(z, x), k = 1 + .045 * f * Math.sin(a * 22);
    sp.setX(i, x * k); sp.setZ(i, z * k);
  }
  saiaGeo.computeVertexNormals();
  const saia = new THREE.Mesh(saiaGeo, veludo); saia.position.y = (MESA_Y - .02) / 2; saia.castShadow = true; saia.receiveShadow = true; scene.add(saia);
  // franja dourada
  const franja = new THREE.Mesh(new THREE.TorusGeometry(MESA_R + .004, .006, 6, 96), new THREE.MeshStandardMaterial({ color: 0xc9a04e, metalness: .8, roughness: .35 }));
  franja.rotation.x = Math.PI / 2; franja.position.y = MESA_Y - .018; scene.add(franja);

  // ---------- luzes ----------
  scene.add(new THREE.HemisphereLight(0x5a2a40, 0x120408, .55));
  const chama = [];
  const texChama = canvasTex(64, 128, (g, w, h) => {
    const rg = g.createRadialGradient(w / 2, h * .62, 0, w / 2, h * .62, h * .5);
    rg.addColorStop(0, 'rgba(255,255,230,1)'); rg.addColorStop(.25, 'rgba(255,200,90,.95)'); rg.addColorStop(.6, 'rgba(255,110,30,.35)'); rg.addColorStop(1, 'rgba(255,80,0,0)');
    g.fillStyle = rg; g.fillRect(0, 0, w, h);
  });
  const texHalo = canvasTex(128, 128, (g, w, h) => {
    const rg = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    rg.addColorStop(0, 'rgba(255,190,110,.55)'); rg.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = rg; g.fillRect(0, 0, w, h);
  });
  function vela(x, y, z, alt = .12, luz = 1.2, sombra = false) {
    const g = new THREE.Group(); g.position.set(x, y, z);
    const cera = new THREE.Mesh(new THREE.CylinderGeometry(.022, .025, alt, 20), new THREE.MeshStandardMaterial({ color: 0xf1e2c4, roughness: .6, emissive: 0x3a1a05, emissiveIntensity: .4 }));
    cera.position.y = alt / 2; cera.castShadow = true; g.add(cera);
    const pires = new THREE.Mesh(new THREE.CylinderGeometry(.045, .05, .012, 24), new THREE.MeshStandardMaterial({ color: 0xb8862e, metalness: .85, roughness: .3 }));
    pires.position.y = .006; g.add(pires);
    const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: texChama, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    fl.scale.set(.03, .06, 1); fl.position.y = alt + .03; g.add(fl);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texHalo, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .8 }));
    halo.scale.set(.35, .35, 1); halo.position.y = alt + .03; g.add(halo);
    const pl = luz > 0 ? new THREE.PointLight(0xffa351, luz, 4.5, 1.6) : { intensity: 0 }; if (luz > 0) { pl.position.y = alt + .06; g.add(pl); }
    if (sombra && renderer.shadowMap.enabled) { pl.castShadow = true; pl.shadow.mapSize.set(512, 512); pl.shadow.bias = -.002; pl.shadow.radius = 4; }
    scene.add(g); chama.push({ fl, halo, pl, base: luz, fase: Math.random() * 10 });
    return g;
  }
  vela(-.44, MESA_Y, -.40, .13, 1.4, true);
  vela(.49, MESA_Y, -.34, .10, 1.1);
  // candelabros de chão
  for (const [x, z, alt] of [[-1.5, -1.2, 1.25], [1.6, -1.0, 1.05], [-1.9, .6, .9], [1.9, .9, 1.15]]) {
    const pe = new THREE.Mesh(new THREE.CylinderGeometry(.015, .05, alt, 12), new THREE.MeshStandardMaterial({ color: 0x5a3a14, metalness: .8, roughness: .4 }));
    pe.position.set(x, alt / 2, z); scene.add(pe);
    vela(x, alt, z, .16, 0);
  }

  const quente = new THREE.PointLight(0xff9a50, 1.2, 6, 1.2); quente.position.set(0, 1.6, -1.6); scene.add(quente);
  // luz de preenchimento fria (lua entrando pela fresta da tenda)
  const lua = new THREE.DirectionalLight(0x6a78c8, .35); lua.position.set(-2, 3, 2); scene.add(lua);
  // luz de rosto para a Zaira (vela oculta)
  const rosto = new THREE.PointLight(0xffb070, .5, 1.6, 1.8); rosto.position.set(.1, 1.32, -.3); scene.add(rosto);

  // ---------- bola de cristal ----------
  const bola = new THREE.Group(); bola.position.set(-.47, MESA_Y, -.1);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.045, .065, .05, 32), new THREE.MeshStandardMaterial({ color: 0xb8862e, metalness: .9, roughness: .25 }));
  base.position.y = .025; bola.add(base);
  const vidro = new THREE.Mesh(new THREE.SphereGeometry(.085, 48, 32), new THREE.MeshPhysicalMaterial({ color: 0xcfd8ff, metalness: 0, roughness: .03, transmission: .92, thickness: .15, ior: 1.45, transparent: true, opacity: .9, envMapIntensity: 1 }));
  vidro.position.y = .05 + .08; bola.add(vidro);
  const nevoa = new THREE.Mesh(new THREE.SphereGeometry(.06, 24, 16), new THREE.MeshBasicMaterial({ color: 0x8a5cff, transparent: true, opacity: .25, blending: THREE.AdditiveBlending, depthWrite: false }));
  nevoa.position.copy(vidro.position); bola.add(nevoa);
  const brilho = new THREE.PointLight(0x9a6cff, .25, .8, 2); brilho.position.copy(vidro.position); bola.add(brilho);
  scene.add(bola);

  // ---------- incensário e fumaça ----------
  const texFumaca = canvasTex(128, 128, (g, w, h) => {
    const rg = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    rg.addColorStop(0, 'rgba(210,170,200,.55)'); rg.addColorStop(.5, 'rgba(160,110,150,.2)'); rg.addColorStop(1, 'rgba(120,80,110,0)');
    g.fillStyle = rg; g.fillRect(0, 0, w, h);
  });
  const fumacas = [];
  const matFumaca = () => new THREE.SpriteMaterial({ map: texFumaca, transparent: true, depthWrite: false, opacity: 0, color: 0xcaa8c8 });
  function soltaFumaca(pos, n = 1, forca = 1, cor = 0xcaa8c8) {
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(matFumaca()); s.material.color.set(cor);
      s.position.copy(pos).add(new THREE.Vector3((Math.random() - .5) * .05 * forca, 0, (Math.random() - .5) * .05 * forca));
      const esc = .05 + Math.random() * .05; s.scale.set(esc, esc, 1);
      s.userData = { v: new THREE.Vector3((Math.random() - .5) * .08 * forca, (.06 + Math.random() * .1) * (forca > 1 ? 2 : 1), (Math.random() - .5) * .08 * forca), vida: 0, dur: 3 + Math.random() * 3, cresce: .08 + Math.random() * .12 * forca, alfa: forca > 1 ? .8 : .35 };
      scene.add(s); fumacas.push(s);
    }
  }
  const incenso = new THREE.Vector3(.36, MESA_Y + .01, -.52);
  const pote = new THREE.Mesh(new THREE.CylinderGeometry(.03, .022, .03, 16), new THREE.MeshStandardMaterial({ color: 0x3a2412, roughness: .7 }));
  pote.position.copy(incenso).add(new THREE.Vector3(0, .015, 0)); scene.add(pote);
  const vareta = new THREE.Mesh(new THREE.CylinderGeometry(.0015, .0015, .13, 6), new THREE.MeshStandardMaterial({ color: 0x5a2a14 }));
  vareta.position.copy(incenso).add(new THREE.Vector3(0, .085, 0)); vareta.rotation.z = .2; scene.add(vareta);
  const pontaIncenso = incenso.clone().add(new THREE.Vector3(-.013, .15, 0));

  // ---------- câmera com movimento suave ----------
  const rig = {
    pos: camera.position.clone(), alvo: new THREE.Vector3(0, 1.1, -.7), alvoAtual: new THREE.Vector3(0, 1.1, -.7),
    paralaxe: new THREE.Vector2(), paralaxeAtual: new THREE.Vector2(), vel: 1.6
  };
  const PONTOS = {
    porta: { p: [0, 1.32, 2.7], a: [0, 1.05, -.7] },
    rosto: { p: [0, 1.2, .92], a: [0, 1.08, -.72] },
    mesa: { p: [0, 1.5, .66], a: [.03, MESA_Y, -.03] },
    corte: { p: [0, 1.62, .62], a: [0, MESA_Y - .02, .26] }
  };
  function olhar(nome, vel = 1.6) {
    const q = PONTOS[nome]; rig.pos.set(...q.p); rig.alvo.set(...q.a); rig.vel = vel;
    // em tela em pé (celular), recua um pouco
    if (camera.aspect < .8) { const d = rig.pos.clone().sub(rig.alvo).multiplyScalar(nome === 'porta' ? 1 : 1.35); rig.pos.copy(rig.alvo).add(d); }
  }
  function olharPara(pos, alvo, vel = 1.6) {
    rig.pos.copy(pos); rig.alvo.copy(alvo); rig.vel = vel;
    if (camera.aspect < .8) { const d = rig.pos.clone().sub(rig.alvo).multiplyScalar(1.35); rig.pos.copy(rig.alvo).add(d); }
  }

  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.fov = camera.aspect < .8 ? 58 : 42; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);

  let escuro = 0; // 0..1 (para o desaparecimento)
  function atualiza(dt, t) {
    // velas tremulando
    for (const c of chama) {
      const f = .86 + .1 * Math.sin(t * 9 + c.fase) + .06 * Math.sin(t * 23 + c.fase * 2) + (Math.random() - .5) * .05;
      if (c.base) c.pl.intensity = c.base * f * (1 - .45 * escuro);
      c.fl.scale.set(.03 * (1 + (f - 1) * .5), .06 * f, 1);
      c.halo.material.opacity = .65 * f;
    }
    nevoa.rotation.y += dt * .6; nevoa.scale.setScalar(1 + .08 * Math.sin(t * 1.3));
    brilho.intensity = .22 + .08 * Math.sin(t * 1.7);
    // fumaça do incenso
    if (Math.random() < dt * 3.2) soltaFumaca(pontaIncenso, 1, .4);
    for (let i = fumacas.length - 1; i >= 0; i--) {
      const s = fumacas[i], u = s.userData; u.vida += dt;
      const k = u.vida / u.dur;
      if (k >= 1) { scene.remove(s); s.material.dispose(); fumacas.splice(i, 1); continue; }
      s.position.addScaledVector(u.v, dt); u.v.x += Math.sin(t * 1.3 + i) * dt * .01;
      const e = s.scale.x + u.cresce * dt; s.scale.set(e, e, 1);
      s.material.opacity = u.alfa * Math.sin(Math.PI * k);
      s.material.rotation += dt * .2;
    }
    // câmera
    const a = 1 - Math.exp(-dt * rig.vel);
    rig.paralaxeAtual.lerp(rig.paralaxe, 1 - Math.exp(-dt * 4));
    const alvoPos = rig.pos.clone(); alvoPos.x += rig.paralaxeAtual.x * .16; alvoPos.y += rig.paralaxeAtual.y * .08;
    camera.position.lerp(alvoPos, a);
    rig.alvoAtual.lerp(rig.alvo, a);
    camera.lookAt(rig.alvoAtual);
  }

  return {
    renderer, scene, camera, rig, olhar, olharPara, atualiza, soltaFumaca, canvasTex,
    set escuro(v) { escuro = v; }, get escuro() { return escuro; }
  };
}
