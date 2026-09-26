// Olhos da Zaira: a webcam, analisada no próprio aparelho pelo MediaPipe Face Landmarker.
// Nenhuma imagem sai do navegador. Percebe: presença, posição do rosto, sorriso, aceno (sim) e balanço (não).
// se existir modelo/face_landmarker.task no site, usa o local; senão, o do servidor do Google
const MODELOS = [new URL('../modelo/face_landmarker.task', import.meta.url).href, 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'];

export const Olhos = {
  ligado: false, presente: false, x: .5, y: .5, sorriso: 0, video: null, ouvintes: new Set(),
  hist: [], ultimoGesto: 0,
  async liga(videoEl) {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
    videoEl.srcObject = stream; await videoEl.play(); this.video = videoEl; this.stream = stream;
    const { FaceLandmarker, FilesetResolver } = await import('../lib/mediapipe/vision_bundle.mjs');
    const fs = await FilesetResolver.forVisionTasks(new URL('../lib/mediapipe/wasm', import.meta.url).href);
    let modelo = MODELOS[1];
    try { const r = await fetch(MODELOS[0], { method: 'HEAD' }); if (r.ok) modelo = MODELOS[0]; } catch (e) { }
    const opcoes = d => ({ baseOptions: { modelAssetPath: modelo, delegate: d }, runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true, outputFacialTransformationMatrixes: true });
    try { this.fl = await FaceLandmarker.createFromOptions(fs, opcoes('GPU')); }
    catch (e) { this.fl = await FaceLandmarker.createFromOptions(fs, opcoes('CPU')); }
    this.ligado = true; this.ciclo();
    return true;
  },
  desliga() { this.ligado = false; this.stream?.getTracks().forEach(t => t.stop()); this.presente = false; },
  ciclo() {
    if (!this.ligado) return;
    const agora = performance.now();
    if (this.video.readyState >= 2 && agora - (this.ultimo || 0) > 80) {
      this.ultimo = agora;
      let r; try { r = this.fl.detectForVideo(this.video, agora); } catch (e) { r = null; }
      const ok = r && r.faceLandmarks && r.faceLandmarks.length;
      if (ok) {
        const lm = r.faceLandmarks[0]; let sx = 0, sy = 0; for (const p of lm) { sx += p.x; sy += p.y; }
        this.x = 1 - sx / lm.length; this.y = sy / lm.length;   // espelhado, como num espelho
        const bs = r.faceBlendshapes?.[0]?.categories || []; const v = n => bs.find(c => c.categoryName === n)?.score || 0;
        this.sorriso = (v('mouthSmileLeft') + v('mouthSmileRight')) / 2;
        const m = r.facialTransformationMatrixes?.[0]?.data;
        if (m) { const yaw = Math.atan2(m[8], m[10]), pitch = Math.asin(-Math.max(-1, Math.min(1, m[9]))); this.hist.push({ t: agora, yaw, pitch }); }
        this.visto = agora;
      }
      this.hist = this.hist.filter(h => agora - h.t < 1400);
      const antes = this.presente;
      this.presente = ok ? true : (agora - (this.visto || 0) < 1500 ? this.presente : false);
      if (antes !== this.presente) this.emite(this.presente ? 'chegou' : 'saiu');
      if (ok && this.sorriso > .55) { this.sorrindo = (this.sorrindo || 0) + 1; if (this.sorrindo === 8) this.emite('sorriso'); } else this.sorrindo = 0;
      this.gesto(agora);
    }
    requestAnimationFrame(() => this.ciclo());
  },
  // aceno de cabeça (sim) ou balanço (não): várias inversões de direção com amplitude suficiente
  gesto(agora) {
    if (agora - this.ultimoGesto < 1500 || this.hist.length < 8) return;
    const conta = k => { let inv = 0, dirAnt = 0, min = 1e9, max = -1e9; for (let i = 1; i < this.hist.length; i++) { const d = this.hist[i][k] - this.hist[i - 1][k]; min = Math.min(min, this.hist[i][k]); max = Math.max(max, this.hist[i][k]); if (Math.abs(d) > .012) { const s = Math.sign(d); if (dirAnt && s !== dirAnt) inv++; dirAnt = s; } } return { inv, amp: max - min }; };
    const p = conta('pitch'), y = conta('yaw');
    if (p.inv >= 2 && p.amp > .16 && y.amp < p.amp * .6) { this.ultimoGesto = agora; this.hist = []; this.emite('sim'); }
    else if (y.inv >= 2 && y.amp > .22 && p.amp < y.amp * .6) { this.ultimoGesto = agora; this.hist = []; this.emite('nao'); }
  },
  emite(ev) { for (const f of this.ouvintes) f(ev); },
  ouve(f) { this.ouvintes.add(f); return () => this.ouvintes.delete(f); }
};
