// A tenda em 3D: tecido listrado, tapete, mesa redonda com toalha de veludo, velas, bola de cristal e fumaça.
import * as THREE from 'three';

export const MESA_Y = 0.745;           // altura do tampo (metros)
export const MESA_W = 1.5, MESA_D = .94;   // mesa de madeira retangular (largura, profundidade)

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
    // tapeçaria: fundo vinho com damasco dourado apagado e barras escuras entre os panos
    g.fillStyle = '#3e0d14'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 48) {
      const xx = x + ((y / 64) % 2 ? 24 : 0);
      g.fillStyle = 'rgba(160,96,40,.28)'; g.beginPath(); g.ellipse(xx, y + 30, 10, 18, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(90,20,24,.9)'; g.beginPath(); g.ellipse(xx, y + 30, 5, 10, 0, 0, 7); g.fill();
      g.strokeStyle = 'rgba(170,110,50,.22)'; g.lineWidth = 2; g.beginPath(); g.arc(xx + 14, y + 10, 10, 0, Math.PI); g.stroke();
      g.beginPath(); g.arc(xx - 14, y + 50, 10, Math.PI, 0); g.stroke();
    }
    for (let i = 0; i < 6; i++) { const x = i * w / 6; const gr = g.createLinearGradient(x - 30, 0, x + 30, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.5, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - 30, 0, 60, h); }
    // barra com franja
    g.fillStyle = '#5a3a14'; g.fillRect(0, h * .86, w, h * .05);
    g.fillStyle = '#c99532'; for (let x = 0; x < w; x += 20) { g.beginPath(); g.moveTo(x, h * .885); g.lineTo(x + 10, h * .865); g.lineTo(x + 20, h * .885); g.lineTo(x + 10, h * .905); g.fill(); }
    ruido(g, w, h, 22);
  }, [3, 1]);
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

  // ---------- mesa de madeira (como no quadro da Zaira) ----------
  const madeira = canvasTex(1024, 640, (g, w, h) => {
    const tabuas = 5, th = h / tabuas;
    for (let t = 0; t < tabuas; t++) {
      const tons = ['#5a2e16', '#4e2712', '#613419', '#56301a', '#4a2410'];
      g.fillStyle = tons[t]; g.fillRect(0, t * th, w, th);
      for (let k = 0; k < 90; k++) {                           // veios
        const y = t * th + Math.random() * th, a = .05 + Math.random() * .12;
        g.strokeStyle = `rgba(${Math.random() < .5 ? '30,12,4' : '120,66,34'},${a})`; g.lineWidth = .6 + Math.random() * 1.6;
        g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x / 90 + k) * 3 + Math.sin(x / 23 + t) * 1.2); g.stroke();
      }
      if (Math.random() < .8) { const nx = Math.random() * w, ny = t * th + th * (.3 + Math.random() * .4); for (let r = 14; r > 2; r -= 3) { g.strokeStyle = 'rgba(30,12,4,.35)'; g.beginPath(); g.ellipse(nx, ny, r * 1.8, r * .6, 0, 0, 7); g.stroke(); } }
      g.fillStyle = 'rgba(10,4,2,.9)'; g.fillRect(0, t * th, w, 3);  // fresta entre tábuas
      g.fillStyle = 'rgba(255,200,150,.07)'; g.fillRect(0, t * th + 3, w, 2);
    }
    ruido(g, w, h, 16);
  });
  const matMadeira = new THREE.MeshStandardMaterial({ map: madeira, roughness: .42, metalness: 0 });
  const matMadeiraLado = new THREE.MeshStandardMaterial({ color: 0x3a1c0c, roughness: .6 });
  const topo = new THREE.Mesh(new THREE.BoxGeometry(MESA_W, .05, MESA_D), [matMadeiraLado, matMadeiraLado, matMadeira, matMadeiraLado, matMadeiraLado, matMadeiraLado]);
  topo.position.y = MESA_Y - .025; topo.receiveShadow = true; topo.castShadow = true; scene.add(topo);
  const saia = new THREE.Mesh(new THREE.BoxGeometry(MESA_W - .12, .1, MESA_D - .12), matMadeiraLado);
  saia.position.y = MESA_Y - .1; scene.add(saia);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const perna = new THREE.Mesh(new THREE.CylinderGeometry(.035, .03, MESA_Y - .05, 12), matMadeiraLado);
    perna.position.set(sx * (MESA_W / 2 - .09), (MESA_Y - .05) / 2, sz * (MESA_D / 2 - .09)); perna.castShadow = true; scene.add(perna);
  }

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
  const latao = new THREE.MeshStandardMaterial({ color: 0xb08a3e, metalness: .85, roughness: .32 });
  function candelabro(x, z, alt, luz, sombra) {
    const g = new THREE.Group(); g.position.set(x, MESA_Y, z); scene.add(g);
    const perfil = [[.06, 0], [.06, .012], [.03, .02], [.014, .05], [.022, .08], [.012, .1], [.012, alt - .02], [.02, alt]].map(([r, y]) => new THREE.Vector2(r, y));
    const haste = new THREE.Mesh(new THREE.LatheGeometry(perfil, 24), latao); haste.castShadow = true; g.add(haste);
    const bracos = [[0, alt + .05, 0, .12]];
    for (const s of [-1, 1]) {
      const curva = new THREE.CatmullRomCurve3([V(0, alt - .01, 0), V(s * .05, alt - .03, 0), V(s * .1, alt - .005, 0), V(s * .11, alt + .02, 0)]);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curva, 16, .006, 8), latao));
      bracos.push([s * .11, alt + .02, 0, .09]);
    }
    bracos.forEach(([bx, by, bz, ca], k) => { vela(x + bx, MESA_Y + by, z + bz, ca, k === 0 ? luz : 0, sombra && k === 0); });
  }
  function V(x, y, z) { return new THREE.Vector3(x, y, z); }
  candelabro(-.6, -.22, .22, 1.6, true);
  candelabro(.62, -.2, .2, 1.3, false);
  // candelabros de chão
  for (const [x, z, alt] of [[-1.5, -1.2, 1.25], [1.6, -1.0, 1.05], [-1.9, .6, .9], [1.9, .9, 1.15]]) {
    const pe = new THREE.Mesh(new THREE.CylinderGeometry(.015, .05, alt, 12), new THREE.MeshStandardMaterial({ color: 0x5a3a14, metalness: .8, roughness: .4 }));
    pe.position.set(x, alt / 2, z); scene.add(pe);
    vela(x, alt, z, .16, 0);
  }

  const quente = new THREE.HemisphereLight(0x8a4020, 0x100406, .5); scene.add(quente);
  // luz de preenchimento fria (lua entrando pela fresta da tenda)
  const lua = new THREE.DirectionalLight(0x6a78c8, .35); lua.position.set(-2, 3, 2); scene.add(lua);
  // luz de rosto para a Zaira (vela oculta)
  const rosto = new THREE.PointLight(0xffb070, .5, 1.6, 1.8); rosto.position.set(.1, 1.32, -.3); scene.add(rosto);

  // ---------- bola de cristal ----------
  const bola = new THREE.Group(); bola.position.set(-.5, MESA_Y, -.36);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.045, .065, .05, 32), new THREE.MeshStandardMaterial({ color: 0xb8862e, metalness: .9, roughness: .25 }));
  base.position.y = .025; bola.add(base);
  const vidro = new THREE.Mesh(new THREE.SphereGeometry(.085, 48, 32), new THREE.MeshPhysicalMaterial({ color: 0xdfe6ff, metalness: .1, roughness: .02, transparent: true, opacity: .75, emissive: 0x3a2a70, emissiveIntensity: .35, clearcoat: 1, clearcoatRoughness: .02 }));
  vidro.position.y = .05 + .08; bola.add(vidro);
  const nevoa = new THREE.Mesh(new THREE.SphereGeometry(.06, 24, 16), new THREE.MeshBasicMaterial({ color: 0x9a70ff, transparent: true, opacity: .45, blending: THREE.AdditiveBlending, depthWrite: false }));
  nevoa.position.copy(vidro.position); bola.add(nevoa);
  const brilho = new THREE.PointLight(0x9a6cff, .1, .45, 2); brilho.position.copy(vidro.position); bola.add(brilho);
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
  const incenso = new THREE.Vector3(.5, MESA_Y + .01, -.38);
  const pote = new THREE.Mesh(new THREE.CylinderGeometry(.03, .022, .03, 16), new THREE.MeshStandardMaterial({ color: 0x3a2412, roughness: .7 }));
  pote.position.copy(incenso).add(new THREE.Vector3(0, .015, 0)); scene.add(pote);
  const vareta = new THREE.Mesh(new THREE.CylinderGeometry(.0015, .0015, .13, 6), new THREE.MeshStandardMaterial({ color: 0x5a2a14 }));
  vareta.position.copy(incenso).add(new THREE.Vector3(0, .085, 0)); vareta.rotation.z = .2; scene.add(vareta);
  const pontaIncenso = incenso.clone().add(new THREE.Vector3(-.013, .15, 0));

  // ---------- objetos da mesa e da tenda (do quadro da Zaira) ----------
  const vidroMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .05, transparent: true, opacity: .35, side: THREE.DoubleSide });
  function taca(x, z, liquido) {
    const g = new THREE.Group(); g.position.set(x, MESA_Y, z); scene.add(g);
    const perfil = [[.03, 0], [.03, .004], [.004, .01], [.004, .07], [.012, .08], [.034, .11], [.036, .16], [.035, .161]].map(([r, y]) => new THREE.Vector2(r, y));
    g.add(new THREE.Mesh(new THREE.LatheGeometry(perfil, 28), vidroMat));
    if (liquido) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.032, .02, .045, 24), new THREE.MeshStandardMaterial({ color: liquido, roughness: .1, transparent: true, opacity: .85, emissive: liquido, emissiveIntensity: .15 })); l.position.y = .105; g.add(l); }
  }
  taca(.55, .22, 0xc88a2a); taca(.66, .08, null);
  // pilão de latão
  const pilao = new THREE.Group(); pilao.position.set(.6, MESA_Y, .33); scene.add(pilao);
  pilao.add(new THREE.Mesh(new THREE.LatheGeometry([[.035, 0], [.045, .005], [.05, .05], [.055, .08], [.05, .082], [.04, .03], [0, .03]].map(([r, y]) => new THREE.Vector2(r, y)), 28), latao));
  const mao = new THREE.Mesh(new THREE.CylinderGeometry(.009, .013, .13, 12), latao); mao.position.set(.02, .1, 0); mao.rotation.z = -.5; pilao.add(mao);
  // livros com cristais
  const livros = new THREE.Group(); livros.position.set(-.6, MESA_Y, .26); livros.rotation.y = .3; scene.add(livros);
  [[0x4a1f14, .22, .15, .035], [0x2e2418, .2, .14, .03]].reduce((y, [cor, w, d, h]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: cor, roughness: .7 })); l.position.y = y + h / 2; l.castShadow = true; livros.add(l); return y + h; }, 0);
  for (const [cx, cz, cor, e] of [[-.04, 0, 0xd8a8e8, .04], [.03, .02, 0xf2c8d0, .03], [.0, -.03, 0xb890e0, .025]]) {
    const cr = new THREE.Mesh(new THREE.OctahedronGeometry(e, 0), new THREE.MeshPhysicalMaterial({ color: cor, roughness: .1, transparent: true, opacity: .9 }));
    cr.position.set(cx, .065 + e * .8, cz); cr.scale.set(.6, 1.3, .6); cr.rotation.z = (Math.random() - .5) * .5; livros.add(cr);
  }
  // maço de lavanda
  const erva = new THREE.Group(); erva.position.set(-.5, MESA_Y + .015, .38); erva.rotation.y = -.5; scene.add(erva);
  const talo = new THREE.MeshStandardMaterial({ color: 0x5f6b3a, roughness: .9 }), flor = new THREE.MeshStandardMaterial({ color: 0x8a78b8, roughness: .9 });
  for (let k = 0; k < 22; k++) {
    const a = (k / 22 - .5) * .35, comp = .22 + Math.random() * .06;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(.0015, .0015, comp, 4), talo); t.rotation.z = Math.PI / 2; t.rotation.y = a; t.position.set(0, (k % 3) * .005, 0); erva.add(t);
    const f = new THREE.Mesh(new THREE.CapsuleGeometry(.006, .04, 3, 6), flor); f.rotation.z = Math.PI / 2; f.position.set(-Math.cos(a) * comp / 2, (k % 3) * .005, Math.sin(a) * comp / 2); erva.add(f);
  }
  const amarra = new THREE.Mesh(new THREE.TorusGeometry(.014, .003, 6, 12), new THREE.MeshStandardMaterial({ color: 0xc8b890 })); amarra.rotation.y = Math.PI / 2; amarra.position.set(.03, .005, 0); erva.add(amarra);
  // lanterna pendurada atrás da Zaira
  const lanterna = new THREE.Group(); lanterna.position.set(-.55, 2.05, -1.45); scene.add(lanterna);
  const ferro = new THREE.MeshStandardMaterial({ color: 0x1e140c, metalness: .7, roughness: .5 });
  lanterna.add(new THREE.Mesh(new THREE.BoxGeometry(.16, .22, .16), new THREE.MeshStandardMaterial({ color: 0xffc070, emissive: 0xff9a40, emissiveIntensity: 1.2, transparent: true, opacity: .55 })));
  for (const [x, z] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(.012, .24, .012), ferro); b.position.set(x * .08, 0, z * .08); lanterna.add(b); }
  const tampa = new THREE.Mesh(new THREE.ConeGeometry(.13, .09, 4), ferro); tampa.position.y = .16; tampa.rotation.y = Math.PI / 4; lanterna.add(tampa);
  const corrente = new THREE.Mesh(new THREE.CylinderGeometry(.004, .004, 1.2, 6), ferro); corrente.position.y = .8; lanterna.add(corrente);
  const luzLanterna = new THREE.PointLight(0xffa050, .9, 3.5, 1.5); lanterna.add(luzLanterna); chama.push({ fl: { scale: { set() { } } }, halo: { material: {} }, pl: luzLanterna, base: .9, fase: 3 });
  // prateleira com frascos à esquerda
  const prat = new THREE.Group(); prat.position.set(-1.65, 0, -1.25); prat.rotation.y = .75; scene.add(prat);
  for (const y of [1.05, 1.45]) {
    const tabua = new THREE.Mesh(new THREE.BoxGeometry(.7, .03, .2), matMadeiraLado); tabua.position.y = y; prat.add(tabua);
    for (let k = 0; k < 5; k++) {
      const alt = .1 + Math.random() * .12, r = .025 + Math.random() * .02;
      const cor = [0x2f5a3a, 0x6a4a2a, 0x3a3a5a, 0x8a6a3a, 0x4a2a2a][k];
      const fr = new THREE.Mesh(new THREE.LatheGeometry([[r, 0], [r, alt * .7], [r * .4, alt * .85], [r * .35, alt], [0, alt]].map(([a, b]) => new THREE.Vector2(a, b)), 16), new THREE.MeshPhysicalMaterial({ color: cor, roughness: .15, transparent: true, opacity: .85 }));
      fr.position.set(-.28 + k * .14, y + .015, 0); prat.add(fr);
    }
  }
  // ramos de ervas secas pendurados
  for (const [x, z] of [[-1.2, -1.6], [-.9, -1.75], [1.1, -1.7], [1.35, -1.5]]) {
    const r = new THREE.Group(); r.position.set(x, 2.1, z); scene.add(r);
    for (let k = 0; k < 9; k++) { const f = new THREE.Mesh(new THREE.ConeGeometry(.02, .32, 5), new THREE.MeshStandardMaterial({ color: k % 2 ? 0x5a6a3a : 0x6f7a48, roughness: 1 })); f.position.set((Math.random() - .5) * .05, -.16, (Math.random() - .5) * .05); f.rotation.x = Math.PI + (Math.random() - .5) * .3; r.add(f); }
  }

  // cadeira de espaldar alto para a Zaira
  const cadeira = new THREE.Group(); cadeira.position.set(0, 0, -.92); scene.add(cadeira);
  const assento = new THREE.Mesh(new THREE.BoxGeometry(.5, .05, .46), matMadeiraLado); assento.position.y = .47; cadeira.add(assento);
  const almofada = new THREE.Mesh(new THREE.BoxGeometry(.46, .04, .42), new THREE.MeshStandardMaterial({ color: 0x6a1420, roughness: .9 })); almofada.position.y = .51; cadeira.add(almofada);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.04, sz < 0 ? 1.25 : .47, .04), matMadeiraLado); p.position.set(sx * .22, (sz < 0 ? 1.25 : .47) / 2, sz * .2); cadeira.add(p); }
  const espaldar = new THREE.Mesh(new THREE.BoxGeometry(.44, .55, .03), new THREE.MeshStandardMaterial({ color: 0x5a1220, roughness: .9 })); espaldar.position.set(0, .93, -.2); espaldar.rotation.x = -.08; cadeira.add(espaldar);
  const topoCad = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .5, 10), latao); topoCad.rotation.z = Math.PI / 2; topoCad.position.set(0, 1.25, -.2); cadeira.add(topoCad);
  // saia longa: cai do quadril sobre as coxas e até o chão, com pregas
  const saiaGeo2 = new THREE.PlaneGeometry(1, 1, 36, 40); const sp2 = saiaGeo2.attributes.position;
  const perfilSaia = new THREE.CatmullRomCurve3([V(0, .66, -.9), V(0, .6, -.74), V(0, .6, -.56), V(0, .52, -.46), V(0, .3, -.43), V(0, .02, -.40)]);
  for (let i = 0; i < sp2.count; i++) {
    const u = sp2.getX(i) + .5, v = .5 - sp2.getY(i);             // u: lado a lado, v: de cima para baixo
    const p = perfilSaia.getPointAt(v); const larg = .21 + .1 * v;
    const x = (u - .5) * 2 * larg; const prega = Math.sin(u * 38) * .012 * v;
    sp2.setXYZ(i, x, p.y + (Math.abs(u - .5) > .45 ? -.02 * v : 0), p.z + prega + Math.pow(Math.abs(u - .5) * 2, 3) * -.06 * v);
  }
  saiaGeo2.computeVertexNormals();
  const saiaZ = new THREE.Mesh(saiaGeo2, new THREE.MeshStandardMaterial({ color: 0x6e1622, roughness: .85, side: THREE.DoubleSide }));
  saiaZ.castShadow = true; scene.add(saiaZ);
  // laterais da saia
  for (const s of [-1, 1]) {
    const lat = new THREE.Mesh(new THREE.PlaneGeometry(.5, .6), saiaZ.material); lat.position.set(s * .27, .32, -.62); lat.rotation.y = Math.PI / 2; scene.add(lat);
  }

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
    brilho.intensity = .08 + .04 * Math.sin(t * 1.7);
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
