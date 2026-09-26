// Voz da Zaira (síntese do navegador, pt-BR) e ouvido (reconhecimento de fala do navegador).
// Nada é gravado: o áudio do microfone é tratado pelo próprio navegador.

export const Voz = {
  ligada: true, voz: null,
  escolhe() {
    const vs = speechSynthesis.getVoices();
    this.voz = vs.find(v => /pt[-_]BR/i.test(v.lang) && /female|luciana|francisca|maria|vit|thalita|leticia/i.test(v.name))
      || vs.find(v => /pt[-_]BR/i.test(v.lang)) || vs.find(v => /^pt/i.test(v.lang)) || null;
  },
  fala(texto, aoPalavra) {
    return new Promise(res => {
      if (!this.ligada || !('speechSynthesis' in window)) return res();
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(texto.replace(/[“”"]/g, ''));
      u.lang = 'pt-BR'; if (this.voz) u.voice = this.voz; u.rate = .95; u.pitch = 1.08;
      let fim = false; const acaba = () => { if (!fim) { fim = true; res(); } };
      u.onend = acaba; u.onerror = acaba; u.onboundary = e => aoPalavra?.(e.charIndex);
      setTimeout(acaba, 1500 + texto.length * 90);
      speechSynthesis.speak(u);
    });
  },
  cala() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }
};
if ('speechSynthesis' in window) { Voz.escolhe(); speechSynthesis.onvoiceschanged = () => Voz.escolhe(); }

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const Ouvido = {
  existe: !!SR, ligado: false, rec: null, pausado: true, ouvintes: new Set(), ultimo: '',
  liga() {
    if (!SR) return false;
    this.ligado = true;
    if (!this.rec) {
      const r = new SR(); r.lang = 'pt-BR'; r.continuous = true; r.interimResults = true; r.maxAlternatives = 3;
      r.onresult = e => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i]; const alts = [...res].map(a => a.transcript.trim());
          this.ultimo = alts[0];
          for (const f of this.ouvintes) f(alts, res.isFinal);
        }
      };
      r.onend = () => { this.ativo = false; if (this.ligado && !this.pausado) setTimeout(() => this.inicia(), 250); };
      r.onerror = e => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { this.ligado = false; this.aoNegar?.(); } };
      this.rec = r;
    }
    this.pausado = false; this.inicia(); return true;
  },
  inicia() { if (!this.rec || this.ativo || this.pausado || !this.ligado) return; try { this.rec.start(); this.ativo = true; } catch (e) { } },
  pausa() { this.pausado = true; try { this.rec?.stop(); } catch (e) { } },
  retoma() { if (!this.ligado) return; this.pausado = false; this.inicia(); },
  desliga() { this.ligado = false; this.pausa(); },
  ouve(f) { this.ouvintes.add(f); return () => this.ouvintes.delete(f); }
};

// normaliza para comparar palavras ("Não!" -> "nao")
export const norma = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
export function contem(alts, palavras) {
  return alts.some(a => { const n = ' ' + norma(a) + ' '; return palavras.some(p => n.includes(' ' + norma(p) + ' ')); });
}
