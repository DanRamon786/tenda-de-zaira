// A Tenda de Zaira em 3D: o Maestro conduz a consulta (a mesma dramaturgia da Tenda 2D),
// agora com a cena em Three.js, a Zaira em VRM, voz, microfone e webcam.
import * as THREE from 'three';
import { criaCena, MESA_Y } from './cena.js';
import { carregaZaira } from './zaira.js';
import { Carta, Baralho, Leque, LUGAR, BARALHO, resolveImagens, texFrente, urlImagem, criaAura } from './cartas.js';
import { MotorV2 } from './motor.js';
import { POS, ACTS, cardIntro, synthesis, pick, REACAO, numeroFalado } from './textos.js';
import { Voz, Ouvido, contem, norma } from './voz.js';
import { Olhos } from './olhos.js';

const $ = s => document.querySelector(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- cena ----------
const cena = criaCena($('#mundo'));
cena.olhar('porta', 100);
let zaira = null, CARTAS = [];
const aura = criaAura(cena.scene);
const timer = new THREE.Timer(); let tempo = 0;
const veu = document.getElementById('veu');
const veuAberto = () => !veu.classList.contains('some');
function quadro() {
  timer.update(); const dt = Math.min(timer.getDelta(), .05); tempo += dt;
  if (Olhos.ligado && Olhos.presente) cena.rig.paralaxe.set((Olhos.x - .5) * 2, -(Olhos.y - .5) * 2); else cena.rig.paralaxe.set(0, 0);
  // com a cortina de entrada fechada, a cena não aparece: não gasta bateria desenhando
  if (!veuAberto()) {
    cena.atualiza(dt, tempo);
    if (zaira) zaira.atualiza(dt, cena.camera);
    if (aura.visible) aura.material.opacity = .75 + .25 * Math.sin(tempo * 3);
    cena.renderer.render(cena.scene, cena.camera);
  }
  requestAnimationFrame(quadro);
}
quadro();

// ---------- carregamento ----------
const btnEntrar = $('#entrar');
if (!Ouvido.existe) { $('#querMic').checked = false; $('#querMic').disabled = true; $('#optMic').classList.add('indisponivel'); $('#optMic span').textContent = 'Este navegador não reconhece fala. No Chrome ou no Edge, você poderá conversar com a Zaira.'; }
if (!navigator.mediaDevices?.getUserMedia) { $('#querCam').checked = false; $('#querCam').disabled = true; $('#optCam').classList.add('indisponivel'); }
(async () => {
  try {
    const [dados] = await Promise.all([
      fetch('./data/cartas.json').then(r => r.json()),
      carregaZaira(cena, './modelo/zaira.vrm', p => { $('#carga i').style.width = (p * 100).toFixed(0) + '%'; $('#cargaTxt').textContent = 'Zaira está chegando… ' + (p * 100).toFixed(0) + '%'; }).then(z => { zaira = z; })
    ]);
    CARTAS = dados;
    resolveImagens(CARTAS).then(n => console.log('imagens do Commons:', n));
    $('#carga i').style.width = '100%'; $('#cargaTxt').textContent = '';
    btnEntrar.disabled = false; btnEntrar.textContent = 'Entrar na tenda';
    window.PRONTO = true;
  } catch (e) {
    console.error(e); $('#cargaTxt').textContent = 'Não consegui preparar a tenda: ' + e.message;
  }
})();

// ---------- som ambiente ----------
let ac = null, master = null, somOn = true;
function iniciaSom() {
  if (ac) return; try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  master = ac.createGain(); master.gain.value = somOn ? .5 : 0; master.connect(ac.destination);
  const len = ac.sampleRate * 4, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0); let last = 0;
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + .02 * w) / 1.02; d[i] = last * 3.2 + (Math.random() < .0006 ? Math.random() * .8 : 0); }
  const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
  const g = ac.createGain(); g.gain.value = .12; src.connect(lp).connect(g).connect(master); src.start();
  [[55, .05], [82.4, .03], [110.5, .018]].forEach(([f, v]) => {
    const o = ac.createOscillator(); o.frequency.value = f; const og = ac.createGain(); og.gain.value = v;
    const l = ac.createOscillator(); l.frequency.value = .07 + Math.random() * .05; const lg = ac.createGain(); lg.gain.value = v * .6; l.connect(lg).connect(og.gain); l.start(); o.connect(og).connect(master); o.start();
  });
}
function sino(f = 660) { if (!ac || !somOn) return; const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, ac.currentTime); g.gain.linearRampToValueAtTime(.16, ac.currentTime + .01); g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + 2.2); o.connect(g).connect(master); o.start(); o.stop(ac.currentTime + 2.3); }
function sopro() {
  if (!ac || !somOn) return; const b = ac.createBuffer(1, ac.sampleRate * 1.6, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / d.length);
  const s = ac.createBufferSource(); s.buffer = b; const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(300, ac.currentTime); f.frequency.exponentialRampToValueAtTime(2400, ac.currentTime + 1.4); const g = ac.createGain(); g.gain.value = .35; s.connect(f).connect(g).connect(master); s.start();
}
function carteado() { if (!ac || !somOn) return; const b = ac.createBuffer(1, ac.sampleRate * .08, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3); const s = ac.createBufferSource(); s.buffer = b; const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1800; const g = ac.createGain(); g.gain.value = .25; s.connect(f).connect(g).connect(master); s.start(); }

// ---------- HUD ----------
function marca(el, v) { el.setAttribute('aria-pressed', v); }
$('#tVoz').onclick = () => { Voz.ligada = !Voz.ligada; marca($('#tVoz'), Voz.ligada); if (!Voz.ligada) Voz.cala(); };
$('#tSom').onclick = () => { somOn = !somOn; marca($('#tSom'), somOn); if (master) master.gain.value = somOn ? .5 : 0; };
$('#tMic').onclick = () => { if (Ouvido.ligado) { Ouvido.desliga(); marca($('#tMic'), false); $('#tMic').classList.remove('escutando'); } else ligaMic(); };
$('#tCam').onclick = () => { if (Olhos.ligado) { Olhos.desliga(); marca($('#tCam'), false); $('#espelho').classList.remove('on'); } else ligaCam(); };
function ligaMic() {
  if (!Ouvido.existe) return;
  Ouvido.aoNegar = () => { marca($('#tMic'), false); $('#tMic').classList.remove('escutando'); ouvi('O microfone foi bloqueado. Use os botões, ou libere o microfone no cadeado da barra de endereço.'); };
  if (Ouvido.liga()) { marca($('#tMic'), true); $('#tMic').classList.add('escutando'); }
}
async function ligaCam() {
  try {
    marca($('#tCam'), true); $('#espelho').classList.add('on');
    await Olhos.liga($('#espelho'));
  } catch (e) {
    console.warn(e); marca($('#tCam'), false); $('#espelho').classList.remove('on'); Olhos.desliga();
    ouvi('Não consegui usar a câmera. A consulta segue sem ela.');
  }
}
let ouviTimer = 0;
function ouvi(t, html = false) { const el = $('#ouvi'); if (html) el.innerHTML = t; else el.textContent = t; clearTimeout(ouviTimer); ouviTimer = setTimeout(() => el.textContent = '', 5000); }
Ouvido.ouve((alts, fim) => { if (alts[0]) ouvi('Ouvi: <b>' + esc(alts[0]) + '</b>' + (fim ? '' : '…'), true); });

// ---------- fala da Zaira ----------
let pulaDigitar = null;
$('#fala').addEventListener('click', () => { pulaDigitar?.(); });
async function diz(texto, { pausa = 350 } = {}) {
  const el = $('#fala'); el.innerHTML = '<span class="quem">ZAIRA</span><span class="txt"></span>'; const tx = el.querySelector('.txt');
  Ouvido.pausa(); zaira?.falar(texto);
  const voz = Voz.fala(texto, i => zaira?.palavra(i));
  let pula = false; pulaDigitar = () => { pula = true; Voz.cala(); };
  const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (let i = 0; i < texto.length && !pula && !calmo; i++) {
    tx.textContent = texto.slice(0, i + 1);
    const ch = texto[i]; await sleep(/[.!?…]/.test(ch) ? 240 : /[,;:]/.test(ch) ? 110 : 22);
  }
  tx.textContent = texto; pulaDigitar = null;
  if (Voz.ligada && !pula) await voz;
  zaira?.calar(); Ouvido.retoma();
  await sleep(pausa);
}
function limpaUI() { $('#ui').innerHTML = ''; }
function ato(t) { $('#ato').textContent = t; }

// escolha por botão, voz ou gesto de cabeça
function escolhe(opcoes, { dica = '' } = {}) {
  return new Promise(res => {
    const box = document.createElement('div'); box.style.display = 'contents';
    let feito = false; const fim = v => { if (feito) return; feito = true; limpaUI(); offV(); offO(); Voz.cala(); res(v); };
    if (dica) { const d = document.createElement('span'); d.className = 'dica'; d.innerHTML = dica; box.appendChild(d); }
    for (const o of opcoes) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn' + (o.fantasma ? ' fantasma' : '');
      b.textContent = o.label; b.onclick = () => fim(o.v); box.appendChild(b);
    }
    limpaUI(); $('#ui').appendChild(box); box.querySelector('button')?.focus({ preventScroll: true });
    const offV = Ouvido.ouve((alts, final) => { for (const o of opcoes) if (o.fala && (final || o.rapido) && contem(alts, o.fala)) { sino(880); fim(o.v); return; } });
    const offO = Olhos.ouve(ev => { for (const o of opcoes) if (o.gesto === ev) { sino(880); ouvi(ev === 'sim' ? 'Vi você acenar que sim.' : 'Vi você balançar a cabeça.'); fim(o.v); return; } });
  });
}

// texto por teclado ou voz
function pedeTexto(placeholder, ok, pular, limpa = s => s) {
  return new Promise(res => {
    limpaUI(); const f = document.createElement('form');
    f.innerHTML = `<input autocomplete="off" maxlength="140" placeholder="${esc(placeholder)}" aria-label="${esc(placeholder)}"><button class="btn" type="submit">${esc(ok)}</button>` + (pular ? `<button class="btn fantasma" type="button">${esc(pular)}</button>` : '');
    const inp = f.querySelector('input'); let feito = false, auto = 0;
    const fim = v => { if (feito) return; feito = true; clearTimeout(auto); off(); limpaUI(); res(v); };
    f.addEventListener('submit', e => { e.preventDefault(); const v = inp.value.trim(); if (!v && !pular) { inp.focus(); return; } fim(v); });
    inp.addEventListener('input', () => clearTimeout(auto));
    if (pular) f.querySelector('.fantasma').onclick = () => fim('');
    const off = Ouvido.ouve((alts, final) => {
      if (pular && final && contem(alts, ['guardar', 'guarde', 'silencio', 'segredo', 'nenhuma', 'pular'])) { fim(''); return; }
      const t = limpa(alts[0]); if (!t) return;
      inp.value = t;
      if (final) { clearTimeout(auto); auto = setTimeout(() => fim(inp.value.trim()), 1100); }
    });
    $('#ui').appendChild(f); if (!matchMedia('(pointer: coarse)').matches) inp.focus({ preventScroll: true });
  });
}
const limpaNome = s => {
  let t = s.replace(/^(meu nome (é|e)|eu sou (o|a)?|me chamo|pode me chamar de|sou (o|a)?|é|e)\s+/i, '').replace(/[.!?,]/g, '').trim();
  return t.split(/\s+/).slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

// ---------- detalhe da carta ----------
function mostraDetalhe(t) {
  const c = t.card, u = urlImagem(c) || texFrente(c).image?.toDataURL?.() || '';
  $('#detalhe').innerHTML = `<div class="fig"><img src="${u}" alt="${esc(c.pt_name)}" class="${t.rev ? 'inv' : ''}" crossorigin="anonymous">
    <div><h3>${esc(c.pt_name)}${t.rev ? ' <small style="font-size:.6em;color:var(--fumo)">(invertida)</small>' : ''}</h3><div class="pos">Casa ${t.pos} · ${esc(POS[t.pos].t)}</div></div></div>
    <dl><dt>A FIGURA</dt><dd>${esc(c.pt_desc)}</dd><dt>${t.rev ? 'NA POSIÇÃO INVERTIDA' : 'SIGNIFICADO GERAL'}</dt><dd>${esc(t.rev ? c.pt_rev : c.pt_up)}</dd></dl>
    <div class="fonte">Texto do TAROT (R. K. West, 1986), em português.</div>`;
  $('#detalhe').classList.add('on');
}
function escondeDetalhe() { $('#detalhe').classList.remove('on'); }

// ---------- mesa ----------
const S = { nome: '', pergunta: '', tiragem: [], cartas3d: [] };
let baralho = null;
function limpaMesa() {
  S.cartas3d.forEach(c => c.remove()); S.cartas3d = [];
  if (baralho) cena.scene.remove(baralho.g); baralho = null; aura.visible = false;
}
function lugarCarta(p) { const l = LUGAR[p]; return V(l.x, MESA_Y + (l.cruz ? .004 : .001), l.z); }
function focaCarta(p) { const pos = lugarCarta(p); cena.olharPara(pos.clone().add(V(-.02, .40, .34)), pos.clone().add(V(0, 0, -.03)), 1.4); }

// eventos da câmera durante a leitura
let sorriuPendente = false, saiuPendente = false;
Olhos.ouve(ev => { if (ev === 'sorriso') sorriuPendente = true; if (ev === 'saiu') saiuPendente = true; if (ev === 'chegou') saiuPendente = false; });
async function reageCamera() {
  if (saiuPendente && Olhos.ligado) {
    await diz(pick(REACAO.ausente));
    const t0 = performance.now(); while (!Olhos.presente && performance.now() - t0 < 12000) await sleep(200);
    saiuPendente = false;
  }
  if (sorriuPendente && !S.sorriu) { sorriuPendente = false; S.sorriu = true; zaira.expressao = 'happy'; await diz(pick(REACAO.sorriso)); zaira.expressao = null; }
}

const SIM = ['sim', 'quero', 'pode', 'leia', 'claro', 'vamos', 'aceito', 'por favor', 'uhum'];
const NAO = ['nao', 'hoje nao', 'agora nao', 'depois'];
const SEGUE = ['proxima', 'continue', 'continua', 'continuar', 'pode seguir', 'siga', 'segue', 'avante', 'ok', 'certo', 'vai', 'pode', 'entendi'];

// ---------- o Maestro ----------
const Maestro = {
  async ENTRADA() { cena.olhar('rosto', .6); await sleep(1800); return 'CONVITE'; },
  async CONVITE() {
    limpaMesa(); escondeDetalhe(); ato(''); zaira.aparece(); zaira.expressao = null; S.sorriu = false;
    cena.olhar('rosto', 1);
    if (Olhos.ligado && !Olhos.presente) {
      const t0 = performance.now(); while (!Olhos.presente && performance.now() - t0 < 5000) await sleep(150);
      if (!Olhos.presente) await diz('Chegue mais perto da luz das velas. Quero ver o seu rosto.');
      const t1 = performance.now(); while (!Olhos.presente && performance.now() - t1 < 6000) await sleep(150);
    }
    zaira.expressao = 'happy';
    await diz(pick(['Ah... você entrou. Eu sabia que viria alguém esta noite. Sente-se, a cadeira é sua.', 'Boas-vindas à minha tenda. Os incensos já estavam acesos, como se esperassem por você.']));
    zaira.expressao = null;
    await diz('Eu sou Zaira. Leio o Tarô como minha avó lia, e a avó dela antes. Deseja que eu abra as cartas para você?');
    const v = await escolhe([{ label: 'Sim, leia minha sorte', v: true, fala: SIM, gesto: 'sim' }, { label: 'Hoje não', v: false, fantasma: true, fala: NAO, gesto: 'nao' }]);
    return v ? 'NOME' : 'RECUSA';
  },
  async RECUSA() { zaira.expressao = 'sad'; await diz('Nem toda noite é noite de saber. A cortina estará aberta quando você voltar.'); zaira.expressao = null; return 'DESAPARECER'; },
  async NOME() {
    await diz('Como devo chamar você?');
    S.nome = (await pedeTexto('Seu nome', 'Dizer', null, limpaNome)).replace(/\s+/g, ' ').slice(0, 40) || 'viajante';
    zaira.expressao = 'relaxed';
    await diz(`${S.nome}... um nome bonito, carrega um som antigo. Agora pense numa pergunta. Pode dizê-la para mim, ou guardá-la só no seu coração.`);
    S.pergunta = await pedeTexto('Sua pergunta (opcional)', 'Perguntar', 'Guardar em silêncio', s => s.charAt(0).toUpperCase() + s.slice(1));
    return 'EMBARALHAR';
  },
  async EMBARALHAR() {
    const sem = MotorV2.semente(S.nome, new Date());
    MotorV2.s = sem.estado; S.baralho = MotorV2.novoBaralho(); S.passadas = 0;
    S.sorteio = { letras: (S.nome.toUpperCase() + '   ').slice(0, 3), cs: sem.cs, estado: sem.estado };
    baralho = new Baralho(cena.scene);
    cena.olharPara(V(0, 1.28, .62), V(.05, .86, -.45), 1.2);
    zaira.baralhoPos = BARALHO.clone(); zaira.embaralhando = true; zaira.inclina = 1; zaira.olharMesa = BARALHO.clone();
    baralho.comecaEmbaralhar();
    const ritmo = setInterval(() => { MotorV2.embaralha(S.baralho); S.passadas++; carteado(); }, 110);
    await diz('Concentre-se na sua pergunta enquanto eu embaralho. Quando sentir que é a hora, me diga para parar.', { pausa: 0 });
    zaira.olharMesa = null;
    while (S.passadas < 3) await sleep(60);
    await escolhe([{ label: 'Parar', v: 1, fala: ['pare', 'para', 'parar', 'chega', 'pronto', 'agora', 'basta', 'stop'], rapido: true }], { dica: Ouvido.ligado ? 'Diga <b>"pare"</b>' : '' });
    clearInterval(ritmo); baralho.paraEmbaralhar(); zaira.embaralhando = false; zaira.inclina = 0;
    zaira.maoRepouso('left'); zaira.maoRepouso('right'); sino(440);
    return 'CORTE';
  },
  async CORTE() {
    baralho.mostra(false);
    const leque = new Leque(cena.scene, cena.camera, $('#mundo'));
    cena.olhar('corte', 1.2);
    const atualiza = n => { const b = $('#corteN'); if (b) b.textContent = n; };
    leque.aoMudar = atualiza;
    await diz('Abri o baralho diante de você. Toque onde quer cortar, ou me diga um número de 1 a 77. As cartas acima do corte irão para baixo do monte.', { pausa: 0 });
    limpaUI(); $('#fala').innerHTML = '';
    const box = document.createElement('div'); box.style.display = 'contents';
    box.innerHTML = `<button class="btn redondo fantasma" type="button" aria-label="Uma carta para a esquerda">◀</button><span class="dica">Corte na carta <b id="corteN">${leque.corte}</b> de 78</span><button class="btn redondo fantasma" type="button" aria-label="Uma carta para a direita">▶</button><button class="btn" type="button">Cortar aqui</button>`;
    $('#ui').appendChild(box);
    const [menos, mais, cortar] = box.querySelectorAll('button');
    menos.onclick = () => leque.define(leque.corte - 1); mais.onclick = () => leque.define(leque.corte + 1);
    const teclas = e => { if (e.key === 'ArrowLeft') leque.define(leque.corte - 1); if (e.key === 'ArrowRight') leque.define(leque.corte + 1); };
    addEventListener('keydown', teclas);
    await new Promise(res => {
      let feito = false;
      const acaba = (atraso = 0) => { if (feito) return; feito = true; off(); setTimeout(res, atraso); };
      cortar.onclick = () => acaba(); cortar.focus({ preventScroll: true });
      const off = Ouvido.ouve((alts, final) => {
        if (!final) return;
        const n = numeroFalado(alts[0]);
        if (n && n >= 1 && n <= 77) { leque.define(n); if (contem(alts, ['corte', 'corta', 'cortar', 'aqui', 'na', 'no', 'carta'])) acaba(900); }
        else if (contem(alts, ['aqui', 'corte', 'corta', 'cortar', 'essa', 'esta', 'pode'])) acaba();
        else if (contem(alts, ['esquerda', 'menos'])) leque.define(leque.corte - 3);
        else if (contem(alts, ['direita', 'mais'])) leque.define(leque.corte + 3);
      });
    });
    removeEventListener('keydown', teclas); limpaUI();
    S.corte = leque.corte; S.baralho = MotorV2.corta(S.baralho, S.corte); sino(520);
    await leque.recolhe(); baralho.mostra(true);
    await diz(pick([`Na carta ${S.corte}. Assim seja.`, `Você cortou na carta ${S.corte}. As cartas já sabem o caminho.`]));
    return 'TIRAGEM';
  },
  async TIRAGEM() {
    S.tiragem = MotorV2.tira(S.baralho).map(t => ({ pos: t.pos, card: CARTAS[t.id - 1], rev: t.inv > 0 }));
    S.tiragem.forEach(t => texFrente(t.card));   // já começa a carregar as imagens
    cena.olhar('mesa', 1.1);
    const fala = diz('As cartas agora encontram seus lugares. Dez casas, uma cruz e um cajado.', { pausa: 0 });
    for (const t of S.tiragem) {
      const c = new Carta(cena.scene, t.card); S.cartas3d.push(c); t.c3d = c;
      c.g.position.copy(baralho.topo); c.g.rotation.y = baralho.g.rotation.y;
      baralho.n--; baralho.ajusta();
      const destino = lugarCarta(t.pos);
      const lado = zaira.ladoPara(destino.x < -.05 ? -1 : 1);
      zaira.maoPara(lado, baralho.topo.add(V(0, .02, .03)), .25);
      await sleep(180); carteado();
      zaira.maoPara(lado, destino.clone().add(V(0, .04, -.05)), .5);
      const yaw = (LUGAR[t.pos].cruz ? Math.PI / 2 : 0) + (t.rev ? Math.PI : 0);
      await c.voa(destino, { yaw, dur: 520 });
      sino(300 + t.pos * 30);
      zaira.maoRepouso(lado);
    }
    await fala; await sleep(600);
    return 'LEITURA';
  },
  async LEITURA() {
    for (const a of ACTS) {
      ato(a.name); cena.olhar('rosto', 2); await diz(pick(a.open));
      for (const p of a.pos) {
        await reageCamera();
        const t = S.tiragem[p - 1];
        focaCarta(p);
        const pos = lugarCarta(p); aura.position.copy(pos).add(V(0, -.0005, 0)); aura.rotation.z = LUGAR[p].cruz ? Math.PI / 2 : 0; aura.visible = true;
        zaira.olharMesa = pos;
        const lado = await zaira.alcanca(pos, 420);
        sino(t.card.arcana === 'major' ? 392 : 587);
        await t.c3d.virar(); zaira.maoRepouso(lado); zaira.olharMesa = null;
        mostraDetalhe(t);
        await diz(cardIntro(t, S.nome));
        await escolhe([{ label: p === 10 ? 'Continuar' : 'Próxima carta', v: 1, fala: SEGUE, gesto: 'sim' }]);
      }
    }
    aura.visible = false; escondeDetalhe();
    return 'SINTESE';
  },
  async SINTESE() {
    ato('A SÍNTESE'); cena.olhar('rosto', 2);
    await diz(synthesis(S.tiragem, S.nome, S.pergunta));
    await escolhe([{ label: 'Agradeço, Zaira', v: 1, fala: ['obrigado', 'obrigada', 'agradeco', 'valeu', 'grato', 'grata'], gesto: 'sim' }]);
    return 'DESPEDIDA';
  },
  async DESPEDIDA() {
    ato(''); zaira.expressao = 'happy';
    await diz(pick([`Obrigada por confiar em mim, ${S.nome}. Lembre-se: as cartas mostram caminhos, mas quem caminha é você.`, `Eu agradeço a sua visita, ${S.nome}. O que ouviu aqui é um mapa, não uma sentença. Use-o com coragem.`]));
    await diz('Leve com você só o que acender uma luz. O resto, deixe aqui na mesa, junto com a fumaça.');
    zaira.expressao = null;
    return 'DESAPARECER';
  },
  async DESAPARECER() {
    sopro(); const p = zaira.vrm.scene.position.clone().add(V(0, .5, .1));
    cena.soltaFumaca(p, 60, 3, 0xb89ab8); cena.escuro = 1;
    await sleep(700); zaira.some(); await sleep(1300); cena.escuro = 0;
    $('#fala').innerHTML = '<span class="txt" style="font-style:italic;color:var(--fumo)">A cadeira de Zaira está vazia. Só o cheiro de incenso ficou.</span>';
    const opcoes = [{ label: 'Nova consulta', v: 'VOLTA', fala: ['nova', 'outra', 'de novo', 'novamente'] }];
    if (S.tiragem.length) opcoes.push({ label: 'Rever', v: 'REVER', fantasma: true, fala: ['rever', 'ver', 'mostrar'] });
    opcoes.push({ label: 'Finalizar', v: 'FINALIZAR', fantasma: true, fala: ['finalizar', 'sair', 'terminar', 'encerrar', 'tchau'] });
    return await escolhe(opcoes);
  },
  async VOLTA() {
    const p = zaira.vrm.scene.position.clone().add(V(0, .5, .1)); sopro(); cena.soltaFumaca(p, 50, 3, 0xb89ab8);
    await sleep(600); zaira.aparece(); S.tiragem = []; limpaMesa();
    return 'CONVITE';
  },
  async REVER() {
    ato('A TIRAGEM'); cena.olhar('mesa', 1);
    $('#fala').innerHTML = `<span class="txt" style="font-size:.85em;color:var(--fumo)">Toque em qualquer carta da mesa, ou diga "carta 3", para ler de novo o que ela diz.</span>` +
      `<div id="sorteio">sorteio: letras ${esc(S.sorteio.letras)} · relógio ${S.sorteio.cs} · estado ${S.sorteio.estado} · passadas ${S.passadas} · corte ${S.corte}<br>no BASIC: tarotsrt V2 ${S.sorteio.estado} ${S.passadas} ${S.corte}</div>`;
    const mostra = p => { const t = S.tiragem[p - 1]; mostraDetalhe(t); const pos = lugarCarta(p); aura.position.copy(pos); aura.rotation.z = LUGAR[p].cruz ? Math.PI / 2 : 0; aura.visible = true; };
    mostra(1);
    const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(), dom = $('#mundo');
    const toque = e => {
      const r = dom.getBoundingClientRect(); ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
      ray.setFromCamera(ptr, cena.camera);
      const hit = ray.intersectObjects(S.cartas3d.map(c => c.g), true)[0];
      if (hit) { let o = hit.object; while (o && !o.userData.carta) o = o.parent; const i = S.cartas3d.indexOf(o?.userData.carta); if (i >= 0) mostra(i + 1); }
    };
    dom.addEventListener('pointerdown', toque);
    const off = Ouvido.ouve((alts, final) => { if (!final) return; const n = numeroFalado(alts[0]); if (n >= 1 && n <= 10) mostra(n); });
    const v = await escolhe([{ label: 'Nova consulta', v: 'VOLTA', fala: ['nova', 'outra', 'de novo', 'novamente'] }, { label: 'Finalizar', v: 'FINALIZAR', fantasma: true, fala: ['finalizar', 'sair', 'terminar', 'encerrar', 'tchau'] }]);
    dom.removeEventListener('pointerdown', toque); off(); escondeDetalhe(); aura.visible = false;
    return v;
  },
  async FINALIZAR() {
    Voz.cala(); if (master && ac) master.gain.setTargetAtTime(0, ac.currentTime, .4);
    limpaMesa(); escondeDetalhe(); ato(''); $('#fala').textContent = ''; limpaUI();
    Ouvido.desliga(); Olhos.desliga(); marca($('#tMic'), false); marca($('#tCam'), false); $('#tMic').classList.remove('escutando'); $('#espelho').classList.remove('on');
    cena.olhar('porta', .6);
    const v = $('#veu'); v.querySelector('.sub').textContent = 'A cortina se fechou. Obrigada pela visita. Quando quiser, Zaira estará à sua espera.';
    btnEntrar.textContent = 'Voltar à tenda'; v.classList.remove('some');
    return null;
  }
};
async function roda(estado) { while (estado) { window.ESTADO = estado; estado = await Maestro[estado](); } }

btnEntrar.addEventListener('click', async () => {
  iniciaSom(); if (ac?.state === 'suspended') ac.resume();
  if (master && ac) master.gain.setTargetAtTime(somOn ? .5 : 0, ac.currentTime, .3);
  if (Voz.ligada && 'speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); }
  $('#veu').classList.add('some');
  if ($('#querCam').checked) ligaCam();
  if ($('#querMic').checked) ligaMic();
  zaira.aparece(); S.tiragem = [];
  roda('ENTRADA');
});

// para testes automáticos
window.__zaira = { Maestro, S, cena, get zaira() { return zaira; }, Olhos, Ouvido, MotorV2 };
