// Zaira em 3D: modelo VRM (troque modelo/zaira.vrm pelo seu, feito no VRoid Studio).
// Sentada atrás da mesa, com braços e pernas guiados por cinemática inversa de dois ossos.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '../lib/three-vrm.module.min.js';
import { MESA_Y } from './cena.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3();

// cores do figurino (multiplicam as texturas do modelo)
const FIGURINO = [
  [/top|cloth.*top|tops/i, 0x8c1c3a],
  [/bottom/i, 0x2a1030],
  [/shoe/i, 0x2a1a10],
  [/hair/i, 0x5a3a34]
];

export async function carregaZaira(cena, url, progresso) {
  const loader = new GLTFLoader();
  loader.register(p => new VRMLoaderPlugin(p));
  const gltf = await loader.loadAsync(url, e => { if (e.lengthComputable && progresso) progresso(e.loaded / e.total); });
  const vrm = gltf.userData.vrm;
  VRMUtils.removeUnnecessaryVertices(gltf.scene);
  VRMUtils.combineSkeletons?.(gltf.scene);
  if (vrm.meta?.metaVersion === '0') VRMUtils.rotateVRM0(vrm);   // modelos VRM 0.x olham para -Z

  vrm.scene.traverse(o => {
    if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; }
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of mats) for (const [re, cor] of FIGURINO) if (re.test(m.name || '') && m.color) {
      m.color.multiply(new THREE.Color(cor).convertSRGBToLinear().multiplyScalar(1.6));
      if (m.shadeColorFactor) m.shadeColorFactor.multiply(new THREE.Color(cor).convertSRGBToLinear());
    }
  });
  cena.scene.add(vrm.scene);
  return new Zaira(vrm, cena);
}

class Zaira {
  constructor(vrm, cena) {
    this.vrm = vrm; this.cena = cena; this.t = 0;
    this.h = n => vrm.humanoid.getNormalizedBoneNode(n);
    this.acessorios();
    this.medeRepouso();
    this.falando = false; this.boca = 0; this.bocaAlvo = 0; this.vogal = 'aa'; this.proxSilaba = 0;
    this.piscar = 3; this.expr = { happy: 0, relaxed: .25, surprised: 0, sad: 0 }; this.exprAlvo = { ...this.expr };
    this.maos = {
      left: { alvo: this.repousoMao('left'), atual: this.repousoMao('left') },
      right: { alvo: this.repousoMao('right'), atual: this.repousoMao('right') }
    };
    this.gesto = null; this.embaralhando = false; this.visivel = true; this.inclina = 0;
    this.olhoAlvo = new THREE.Object3D(); cena.scene.add(this.olhoAlvo);
    if (vrm.lookAt) vrm.lookAt.target = this.olhoAlvo;
  }

  // posição de repouso: sentada, quadril a 55 cm do chão, 82 cm atrás do centro da mesa
  medeRepouso() {
    const vrm = this.vrm;
    vrm.scene.position.set(0, 0, 0); vrm.scene.updateMatrixWorld(true);
    const hips = this.h('hips'); const hy = hips.getWorldPosition(_v).y;
    const ls = this.h('leftUpperArm').getWorldPosition(new THREE.Vector3());
    const le = this.h('leftLowerArm').getWorldPosition(new THREE.Vector3());
    const lh = this.h('leftHand').getWorldPosition(new THREE.Vector3());
    const lul = this.h('leftUpperLeg').getWorldPosition(new THREE.Vector3());
    const lll = this.h('leftLowerLeg').getWorldPosition(new THREE.Vector3());
    const lf = this.h('leftFoot').getWorldPosition(new THREE.Vector3());
    this.L = { braco: ls.distanceTo(le), antebraco: le.distanceTo(lh), coxa: lul.distanceTo(lll), canela: lll.distanceTo(lf) };
    this.altura = this.h('head').getWorldPosition(_v).y;
    // escala para uma altura de ~1,62 m (modelos variam)
    const esc = 1.62 / (this.altura + .12);
    vrm.scene.scale.setScalar(esc); this.esc = esc;
    for (const k in this.L) this.L[k] *= esc;
    this.quadril = V(0, .56, -.86);
    vrm.scene.position.set(0, this.quadril.y - hy * esc, this.quadril.z);
    vrm.scene.rotation.y = 0; // o modelo VRM 1.0 olha para +Z, isto é, para o consulente
    vrm.scene.updateMatrixWorld(true);
  }

  repousoMao(lado) {
    const s = lado === 'left' ? 1 : -1;   // a esquerda da Zaira fica no +X do mundo
    return V(.17 * s, MESA_Y + .035, -.47);
  }

  acessorios() {
    // brincos de argola e uma tiara de moedas, presos ao osso normalizado da cabeça
    // (em repouso ele fica alinhado com o mundo: +Y para cima, +Z para a frente do rosto)
    const ouro = new THREE.MeshStandardMaterial({ color: 0xd4a649, metalness: .9, roughness: .3 });
    const cab = this.h('head');
    this.vrm.scene.updateMatrixWorld(true);
    // medidas da cabeça a partir da malha do rosto não são confiáveis; usa proporções padrão do VRoid
    const tiara = new THREE.Group();
    const R = .088;
    const aro = new THREE.Mesh(new THREE.TorusGeometry(R, .0022, 6, 72, Math.PI * 1.1), ouro);
    aro.rotation.x = Math.PI / 2; aro.rotation.z = Math.PI / 2 - Math.PI * 1.1 / 2 - Math.PI / 2 + Math.PI;
    tiara.add(aro);
    for (let i = -6; i <= 6; i++) {
      const a = i * .16;
      const moeda = new THREE.Mesh(new THREE.CylinderGeometry(.0055, .0055, .001, 14), ouro);
      moeda.position.set(Math.sin(a) * (R + .002), -.009 - .003 * Math.cos(i * .6), Math.cos(a) * (R + .002));
      moeda.rotation.set(Math.PI / 2, 0, 0); moeda.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), a);
      tiara.add(moeda);
    }
    tiara.position.set(0, .115, .012); tiara.rotation.x = -.18;
    cab.add(tiara); this.tiara = tiara;
    for (const s of [1, -1]) {
      const argola = new THREE.Mesh(new THREE.TorusGeometry(.011, .0018, 6, 20), ouro);
      argola.position.set(.071 * s, .025, .0); argola.rotation.y = Math.PI / 2;
      cab.add(argola);
    }
  }

  // ---------- cinemática inversa de dois ossos ----------
  // posiciona os ossos a (braço/coxa) e b (antebraço/canela) para que a ponta alcance "alvo";
  // "polo" indica para onde o cotovelo/joelho deve apontar
  ik(nA, nB, nC, alvo, polo) {
    const A = this.h(nA), B = this.h(nB), C = this.h(nC);
    A.quaternion.identity(); B.quaternion.identity();
    A.parent.updateMatrixWorld(true); A.updateMatrixWorld(true);
    const pa = A.getWorldPosition(new THREE.Vector3()), pb = B.getWorldPosition(new THREE.Vector3()), pc = C.getWorldPosition(new THREE.Vector3());
    const l1 = pa.distanceTo(pb), l2 = pb.distanceTo(pc);
    const dirRestAB = pb.clone().sub(pa).normalize(), dirRestBC = pc.clone().sub(pb).normalize();
    const d = alvo.clone().sub(pa); let dist = d.length(); d.normalize();
    dist = Math.min(Math.max(dist, Math.abs(l1 - l2) + 1e-3), l1 + l2 - 1e-3);
    const cosA = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist), ang = Math.acos(Math.min(1, Math.max(-1, cosA)));
    const p = polo.clone().sub(pa); p.sub(d.clone().multiplyScalar(p.dot(d))).normalize();
    const cotovelo = pa.clone().add(d.clone().multiplyScalar(Math.cos(ang) * l1)).add(p.multiplyScalar(Math.sin(ang) * l1));
    const alvoFinal = pa.clone().add(d.multiplyScalar(dist));
    // osso A: gira a direção de repouso para apontar ao cotovelo (em coordenadas do mundo)
    const parentQ = A.parent.getWorldQuaternion(new THREE.Quaternion());
    const qA = new THREE.Quaternion().setFromUnitVectors(dirRestAB, cotovelo.clone().sub(pa).normalize());
    A.quaternion.copy(parentQ.clone().invert().multiply(qA).multiply(parentQ));
    A.updateMatrixWorld(true);
    // osso B: a direção de repouso de B já foi girada por qA
    const dirB = dirRestBC.clone().applyQuaternion(qA);
    const qB = new THREE.Quaternion().setFromUnitVectors(dirB, alvoFinal.clone().sub(cotovelo).normalize());
    const parentBQ = B.parent.getWorldQuaternion(new THREE.Quaternion());
    const qBw = qB.multiply(parentBQ);
    B.quaternion.copy(parentBQ.clone().invert().multiply(qBw));
    B.updateMatrixWorld(true);
  }

  // ---------- gestos ----------
  maoPara(lado, pos, dur = .45) { const m = this.maos[lado]; m.alvo.copy(pos); m.dur = dur; }
  maoRepouso(lado) { this.maoPara(lado, this.repousoMao(lado)); }
  ladoPara(x) { return x >= 0 ? 'left' : 'right'; }
  async alcanca(pos, espera = 450) {
    const lado = this.ladoPara(pos.x);
    this.maoPara(lado, pos.clone().add(V(0, .03, .02)));
    await new Promise(r => setTimeout(r, espera));
    return lado;
  }
  set expressao(nome) { for (const k in this.exprAlvo) this.exprAlvo[k] = 0; this.exprAlvo.relaxed = .25; if (nome) this.exprAlvo[nome] = nome === 'happy' ? .7 : .8; }

  // ---------- fala: boca guiada pelo texto ----------
  falar(texto) { this.falando = true; this.texto = texto.toLowerCase(); this.idx = 0; this.proxSilaba = 0; }
  palavra(i) { this.idx = i; this.proxSilaba = 0; }  // chamado pelos eventos "boundary" da síntese de voz
  calar() { this.falando = false; this.bocaAlvo = 0; }

  atualiza(dt, camera) {
    if (!this.visivel) return;
    this.t += dt; const t = this.t, vrm = this.vrm;

    // olhar: sempre para o consulente (a câmera), com pequenas derivas
    this.olhoAlvo.position.copy(camera.position).add(V(Math.sin(t * .5) * .03, Math.sin(t * .37) * .02, 0));
    if (this.olharMesa) this.olhoAlvo.position.lerp(this.olharMesa, .85);

    // corpo: respiração e inclinação para a mesa
    const resp = Math.sin(t * 1.4) * .5 + .5;
    this.h('spine').rotation.set(.12 + this.inclina * .12 + resp * .012, Math.sin(t * .31) * .025, 0);
    this.h('chest').rotation.set(.04 + resp * .015, 0, Math.sin(t * .23) * .015);
    // cabeça acompanha o olhar (parcialmente)
    const cabeca = this.h('head'), pescoco = this.h('neck');
    const hp = cabeca.getWorldPosition(_v);
    const dir = this.olhoAlvo.position.clone().sub(hp);
    const yaw = Math.atan2(dir.x, dir.z), pitch = Math.atan2(-dir.y, Math.hypot(dir.x, dir.z));
    const cy = THREE.MathUtils.clamp(yaw, -.6, .6) * .5, cp = THREE.MathUtils.clamp(pitch - .12, -.4, .5) * .5;
    pescoco.rotation.set(cp * .4, cy * .4, Math.sin(t * .4) * .02);
    cabeca.rotation.set(cp * .6 - .04, cy * .6, Math.sin(t * .27 + 1) * .035 + (this.falando ? Math.sin(t * 3.1) * .015 : 0));

    // ombros levemente para baixo
    this.h('leftShoulder').rotation.z = -.08; this.h('rightShoulder').rotation.z = .08;
    this.vrm.scene.updateMatrixWorld(true);

    // mãos
    for (const lado of ['left', 'right']) {
      const m = this.maos[lado];
      let alvo = m.alvo;
      if (this.embaralhando) {
        const s = lado === 'left' ? 1 : -1, f = t * 7 + (s > 0 ? 0 : Math.PI);
        alvo = this.baralhoPos.clone().add(V(s * (.05 + .015 * Math.sin(f)), .045 + .025 * Math.max(0, Math.sin(f)), .02));
      }
      m.atual.lerp(alvo, 1 - Math.exp(-dt * (m.dur ? 3 / m.dur : 6)));
      const s = lado === 'left' ? 1 : -1;
      const ombro = this.h(lado + 'UpperArm').getWorldPosition(new THREE.Vector3());
      this.ik(lado + 'UpperArm', lado + 'LowerArm', lado + 'Hand', m.atual, ombro.clone().add(V(s * .45, -.35, -.4)));
      // mão espalmada sobre a mesa
      const mao = this.h(lado + 'Hand'); mao.rotation.set(0, 0, s * .15);
      this.h(lado + 'LowerArm').rotateX(-.9 * s * 0);
    }
    // pernas dobradas sob a mesa (escondidas pela toalha)
    for (const lado of ['left', 'right']) {
      const s = lado === 'left' ? 1 : -1;
      const quadril = this.h(lado + 'UpperLeg').getWorldPosition(new THREE.Vector3());
      this.ik(lado + 'UpperLeg', lado + 'LowerLeg', lado + 'Foot', V(.13 * s, .07, -.48), quadril.clone().add(V(.05 * s, 0, .8)));
    }

    // expressões
    const em = vrm.expressionManager;
    if (em) {
      this.piscar -= dt;
      let bl = 0; if (this.piscar < 0) { bl = Math.sin(Math.min(1, -this.piscar / .16) * Math.PI); if (this.piscar < -.16) this.piscar = 2 + Math.random() * 4; }
      em.setValue('blink', bl);
      for (const k in this.expr) { this.expr[k] += (this.exprAlvo[k] - this.expr[k]) * (1 - Math.exp(-dt * 4)); em.setValue(k, this.expr[k] * (bl > .3 ? .3 : 1)); }
      // boca: ciclos de sílabas a partir do texto
      if (this.falando) {
        this.proxSilaba -= dt;
        if (this.proxSilaba <= 0) {
          const ch = this.texto?.[this.idx] || 'a'; this.idx = (this.idx || 0) + 2;
          const mapa = { a: 'aa', á: 'aa', ã: 'aa', â: 'aa', e: 'ee', é: 'ee', ê: 'ee', i: 'ih', í: 'ih', o: 'oh', ó: 'oh', õ: 'oh', ô: 'oh', u: 'ou', ú: 'ou' };
          this.vogal = mapa[ch] || ['aa', 'oh', 'ee', 'ih', 'ou'][Math.floor(Math.random() * 5)];
          this.bocaAlvo = /[ ,.;:!?]/.test(ch) ? .05 : .35 + Math.random() * .5;
          this.proxSilaba = .07 + Math.random() * .08;
        }
      }
      this.boca += (this.bocaAlvo - this.boca) * (1 - Math.exp(-dt * 22));
      for (const v of ['aa', 'ee', 'ih', 'oh', 'ou']) em.setValue(v, v === this.vogal ? this.boca : 0);
    }
    vrm.update(dt);
  }

  some() { this.visivel = false; this.vrm.scene.visible = false; }
  aparece() { this.visivel = true; this.vrm.scene.visible = true; }
}
