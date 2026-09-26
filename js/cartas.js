// Cartas em 3D: verso desenhado, frente do baralho Rider-Waite-Smith de 1909 (domínio público,
// carregado do Wikimedia Commons), baralho, embaralhar, leque de corte, Cruz Celta e virada.
import * as THREE from 'three';
import { MESA_Y } from './cena.js';

export const CW = .1, CH = .172, ESP = .0006;       // carta: largura, altura, espessura
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const easeInOut = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// posições da Cruz Celta sobre a mesa (x, z) e rotação; a carta "de pé" aponta para a Zaira
export const LUGAR = [null,
  { x: -.1, z: .02 }, { x: -.1, z: .02, cruz: true }, { x: -.1, z: -.19 }, { x: -.1, z: .23 },
  { x: -.31, z: .02 }, { x: .11, z: .02 },
  { x: .35, z: .33 }, { x: .35, z: .13 }, { x: .35, z: -.07 }, { x: .35, z: -.27 }];
export const BARALHO = V(.13, MESA_Y, -.37);

// ---------- texturas ----------
function texCanvas(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const texVerso = texCanvas(256, 440, (g, w, h) => {
  g.fillStyle = '#f3e6c8'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#4a0f24'; g.fillRect(9, 9, w - 18, h - 18);
  g.strokeStyle = '#c9a04e'; g.lineWidth = 3; g.strokeRect(17, 17, w - 34, h - 34);
  g.lineWidth = 1.2; g.strokeRect(23, 23, w - 46, h - 46);
  // treliça de losangos
  g.save(); g.beginPath(); g.rect(24, 24, w - 48, h - 48); g.clip();
  g.strokeStyle = 'rgba(201,160,78,.35)';
  for (let i = -h; i < w + h; i += 22) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke(); }
  g.restore();
  // sol e lua
  const cx = w / 2, cy = h / 2;
  g.fillStyle = '#4a0f24'; g.beginPath(); g.arc(cx, cy, 62, 0, 7); g.fill();
  g.strokeStyle = '#c9a04e'; g.lineWidth = 2.5; g.beginPath(); g.arc(cx, cy, 60, 0, 7); g.stroke();
  g.fillStyle = '#e0bb62';
  for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; g.beginPath(); g.moveTo(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30); g.lineTo(cx + Math.cos(a + .12) * 50, cy + Math.sin(a + .12) * 50); g.lineTo(cx + Math.cos(a + .24) * 30, cy + Math.sin(a + .24) * 30); g.fill(); }
  g.beginPath(); g.arc(cx, cy, 28, 0, 7); g.fill();
  g.fillStyle = '#4a0f24'; g.beginPath(); g.arc(cx + 11, cy - 6, 24, 0, 7); g.fill();
  g.fillStyle = '#e0bb62'; g.font = '20px serif'; g.textAlign = 'center';
  g.fillText('✦', cx, 70); g.fillText('✦', cx, h - 56);
});

const NAIPE = { cups: '🏆', pentacles: '⛤', swords: '⚔', wands: '⚚' };
const ROM = ['Rei', 'Rainha', 'Cavaleiro', 'Valete', 'Ás', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
function texFrenteDesenhada(c) {
  return texCanvas(256, 440, (g, w, h) => {
    g.fillStyle = '#f3e6c8'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#2b1a10'; g.lineWidth = 3; g.strokeRect(14, 14, w - 28, h - 28);
    g.fillStyle = '#2b1a10'; g.textAlign = 'center';
    g.font = 'bold 30px Georgia, serif'; g.fillText(c.arcana === 'major' ? c.number : ROM[c.rank], w / 2, 62);
    g.font = '96px serif'; g.fillText(c.arcana === 'major' ? '✶' : NAIPE[c.suit], w / 2, h / 2 + 30);
    g.font = 'bold 19px Georgia, serif';
    const palavras = c.pt_name.toUpperCase().split(' '); let linha = '', y = h - 70; const linhas = [];
    for (const p of palavras) { if ((linha + ' ' + p).trim().length > 16) { linhas.push(linha.trim()); linha = p; } else linha += ' ' + p; }
    linhas.push(linha.trim()); y = h - 40 - (linhas.length - 1) * 22;
    for (const l of linhas) { g.fillText(l, w / 2, y); y += 22; }
  });
}

// resolve os endereços das imagens no Commons (API com CORS aberto)
const urls = {};
export async function resolveImagens(cartas) {
  const nomes = [...new Set(cartas.flatMap(c => c.commons))];
  const lotes = []; for (let i = 0; i < nomes.length; i += 45) lotes.push(nomes.slice(i, i + 45));
  const achados = {};
  await Promise.all(lotes.map(async l => {
    const u = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo&iiprop=url&iiurlwidth=420&titles=' +
      encodeURIComponent(l.map(n => 'File:' + n).join('|'));
    try {
      const r = await fetch(u); const j = await r.json();
      const norm = {}; (j.query.normalized || []).forEach(n => norm[n.to] = n.from);
      for (const p of Object.values(j.query.pages || {})) {
        const ii = p.imageinfo?.[0]; if (!ii) continue;
        const orig = (norm[p.title] || p.title).replace(/^File:/, '');
        achados[orig] = ii.thumburl || ii.url; achados[p.title.replace(/^File:/, '')] = ii.thumburl || ii.url;
      }
    } catch (e) { console.warn('Commons indisponível', e); }
  }));
  for (const c of cartas) for (const n of c.commons) if (achados[n] || achados[n.replace(/_/g, ' ')]) { urls[c.id] = achados[n] || achados[n.replace(/_/g, ' ')]; break; }
  return Object.keys(urls).length;
}
const cacheTex = {};
const loader = new THREE.TextureLoader(); loader.setCrossOrigin('anonymous');
export function texFrente(c) {
  if (cacheTex[c.id]) return cacheTex[c.id];
  const tex = texFrenteDesenhada(c); cacheTex[c.id] = tex;
  if (urls[c.id]) loader.load(urls[c.id], t => {
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    tex.image = t.image; tex.needsUpdate = true; tex.real = true; tex.url = urls[c.id];
  }, undefined, () => console.warn('sem imagem', c.pt_name));
  return tex;
}
export const urlImagem = c => urls[c.id] || null;

// ---------- a carta ----------
const geoPlano = new THREE.PlaneGeometry(CW, CH);
const matVerso = new THREE.MeshStandardMaterial({ map: texVerso, roughness: .55 });
const matBorda = new THREE.MeshStandardMaterial({ color: 0xe9dcc0, roughness: .8 });
const geoBorda = new THREE.BoxGeometry(CW * .995, ESP * .9, CH * .995);

export class Carta {
  constructor(scene, dados = null) {
    this.g = new THREE.Group();            // posição e giro sobre a mesa
    this.vira = new THREE.Group();         // virada (gira em X)
    this.g.add(this.vira);
    const verso = new THREE.Mesh(geoPlano, matVerso); verso.rotation.x = -Math.PI / 2; verso.position.y = ESP / 2; verso.castShadow = true;
    this.vira.add(verso);
    this.borda = new THREE.Mesh(geoBorda, matBorda); this.vira.add(this.borda);
    this.frente = new THREE.Mesh(geoPlano, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .6 }));
    this.frente.rotation.x = Math.PI / 2; this.frente.position.y = -ESP / 2; this.vira.add(this.frente);
    this.g.userData.carta = this;
    scene.add(this.g); this.scene = scene;
    if (dados) this.define(dados);
  }
  define(c) { this.dados = c; this.frente.material.map = texFrente(c); this.frente.material.needsUpdate = true; }
  remove() { this.scene.remove(this.g); }
  // voo em arco até um ponto
  async voa(dest, { yaw = null, dur = 600, altura = .12 } = {}) {
    const p0 = this.g.position.clone(), y0 = this.g.rotation.y, y1 = yaw ?? y0; const t0 = performance.now();
    return new Promise(res => {
      const passo = () => {
        const k = Math.min(1, (performance.now() - t0) / dur), e = easeInOut(k);
        this.g.position.lerpVectors(p0, dest, e); this.g.position.y += Math.sin(Math.PI * k) * altura;
        this.g.rotation.y = y0 + (y1 - y0) * e;
        if (k < 1) requestAnimationFrame(passo); else res();
      };
      passo();
    });
  }
  async virar(dur = 700) {
    const t0 = performance.now(), base = this.g.position.y;
    return new Promise(res => {
      const passo = () => {
        const k = Math.min(1, (performance.now() - t0) / dur), e = easeInOut(k);
        this.vira.rotation.x = Math.PI * e; this.vira.position.y = Math.sin(Math.PI * k) * .06;
        if (k < 1) requestAnimationFrame(passo); else { this.vira.position.y = 0; this.aberta = true; res(); }
      };
      passo();
    });
  }
}

// ---------- o baralho sobre a mesa ----------
export class Baralho {
  constructor(scene) {
    this.scene = scene; this.n = 78;
    this.g = new THREE.Group(); this.g.position.copy(BARALHO); this.g.rotation.y = .15;
    this.corpo = new THREE.Mesh(new THREE.BoxGeometry(CW, 1, CH), [matBorda, matBorda, matVerso, matBorda, matBorda, matBorda]);
    this.corpo.castShadow = true; this.g.add(this.corpo);
    this.ajusta(); scene.add(this.g);
    this.voando = [];
  }
  ajusta() { const h = Math.max(this.n, 1) * ESP * 1.4; this.corpo.scale.y = h; this.corpo.position.y = h / 2; this.corpo.visible = this.n > 0; }
  get topo() { return this.g.position.clone().add(V(0, this.n * ESP * 1.4 + .001, 0)); }
  mostra(v) { this.g.visible = v; }

  // embaralhar: cartas saltam de um monte para o outro, sem parar, até mandarem parar
  comecaEmbaralhar() {
    this.embaralhando = true; const cartas = [];
    for (let i = 0; i < 8; i++) { const c = new Carta(this.scene); c.g.visible = false; cartas.push(c); }
    let i = 0;
    const loop = async () => {
      while (this.embaralhando) {
        const c = cartas[i++ % cartas.length]; c.g.visible = true;
        const lado = (i % 2 ? 1 : -1);
        c.g.position.copy(this.topo).add(V(lado * .07, 0, 0)); c.g.rotation.y = this.g.rotation.y + lado * .2;
        c.voa(this.topo.add(V(0, .002, 0)), { yaw: this.g.rotation.y, dur: 260, altura: .05 }).then(() => { c.g.visible = false; });
        await sleep(95);
      }
      cartas.forEach(c => c.remove());
    };
    loop();
  }
  paraEmbaralhar() { this.embaralhando = false; }
}

// ---------- leque para o corte ----------
export class Leque {
  constructor(scene, camera, dom) {
    this.scene = scene; this.camera = camera; this.dom = dom;
    this.cartas = []; this.corte = 39; this.g = new THREE.Group(); scene.add(this.g);
    const centro = V(0, MESA_Y, .38), R = .40;
    for (let i = 0; i < 78; i++) {
      const a = THREE.MathUtils.degToRad(-58 + 116 * i / 77);
      const m = new THREE.Mesh(geoPlano, matVerso.clone());
      m.rotation.x = -Math.PI / 2;
      const h = new THREE.Group(); h.add(m);
      h.position.set(centro.x + Math.sin(a) * R, MESA_Y + .001 + i * .0004, centro.z - Math.cos(a) * R);
      h.rotation.y = -a; h.userData.i = i; m.userData.i = i;
      this.g.add(h); this.cartas.push(h);
    }
    this.ray = new THREE.Raycaster(); this.ptr = new THREE.Vector2();
    this.marca();
    this.onPtr = e => {
      if (e.type === 'pointermove' && !e.buttons && e.pointerType !== 'mouse') return;
      const r = dom.getBoundingClientRect();
      this.ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.ray.setFromCamera(this.ptr, camera);
      const hit = this.ray.intersectObjects(this.cartas.map(h => h.children[0]))[0];
      if (hit) { this.corte = Math.max(1, Math.min(77, hit.object.userData.i + 1)); this.marca(); this.aoMudar?.(this.corte); if (e.type === 'pointerdown') this.aoTocar?.(this.corte); }
    };
    dom.addEventListener('pointermove', this.onPtr); dom.addEventListener('pointerdown', this.onPtr);
  }
  define(n) { this.corte = Math.max(1, Math.min(77, n)); this.marca(); this.aoMudar?.(this.corte); }
  marca() {
    this.cartas.forEach((h, i) => {
      const m = h.children[0], em = i < this.corte;
      m.position.y = em ? .004 : 0; m.position.z = em ? -.012 : 0;
      m.material.emissive = new THREE.Color(em ? 0x3a2408 : 0x000000);
      m.material.emissiveIntensity = em ? 1 : 0;
    });
  }
  async recolhe() {
    this.dom.removeEventListener('pointermove', this.onPtr); this.dom.removeEventListener('pointerdown', this.onPtr);
    const t0 = performance.now(), ini = this.cartas.map(h => ({ p: h.position.clone(), y: h.rotation.y }));
    await new Promise(res => {
      const passo = () => {
        const k = Math.min(1, (performance.now() - t0) / 700), e = easeInOut(k);
        this.cartas.forEach((h, i) => { h.position.lerpVectors(ini[i].p, BARALHO.clone().add(V(0, i * .0003, 0)), e); h.rotation.y = ini[i].y + (.15 - ini[i].y) * e; });
        if (k < 1) requestAnimationFrame(passo); else res();
      };
      passo();
    });
    this.scene.remove(this.g);
  }
}

// brilho dourado sob a carta em destaque
export function criaAura(scene) {
  const tex = texCanvas(128, 128, (g, w, h) => {
    const rg = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    rg.addColorStop(0, 'rgba(255,210,120,.9)'); rg.addColorStop(.5, 'rgba(255,170,60,.35)'); rg.addColorStop(1, 'rgba(255,140,40,0)');
    g.fillStyle = rg; g.fillRect(0, 0, w, h);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(CW * 2.6, CH * 1.9), new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m);
  return m;
}
