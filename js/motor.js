// Sorteio v2 da Tenda de Zaira: o mesmo algoritmo do TAROTSRT.BAS (modo V2), aprovado por Dan em 25/09/2026.
// Gerador RND do runtime BASCOM 5.60 (TAROT.EXE, 1986): estado = (estado*214013 + 2531011) mod 2^24.
// Semente = 3 primeiras letras do nome XOR relógio em centésimos; embaralha até o consulente mandar parar;
// corte no ponto escolhido; 10 cartas do topo; inversões pela regra de 1986 (3 sorteios de 1 a 78).
export const MotorV2 = {
  s: 0,
  next() { this.s = (this.s * 0x343FD + 0x1A9EC3) % 0x1000000; return this.s; },
  rndInt(n) {                                   // INT(RND*n) com o arredondamento MBF de 1986
    let p = this.next() * n; const bl = p ? Math.floor(Math.log2(p)) + 1 : 0;
    if (bl > 24) { const h = 2 ** (bl - 24); let q = Math.floor(p / h); if (p % h >= h / 2) q++; p = q * h; }
    return Math.floor(p / 0x1000000);
  },
  semente(nome, agora) {
    const l = (nome.trim().toUpperCase() + '   ').slice(0, 3);
    const letras = ((l.charCodeAt(0) & 255) << 16) | ((l.charCodeAt(1) & 255) << 8) | (l.charCodeAt(2) & 255);
    const cs = ((agora.getHours() * 3600 + agora.getMinutes() * 60 + agora.getSeconds()) * 100 + Math.floor(agora.getMilliseconds() / 10));
    return { letras, cs, estado: (letras ^ cs) & 0xFFFFFF };
  },
  novoBaralho() { return Array.from({ length: 78 }, (_, i) => i + 1); },
  embaralha(b) { for (let i = 78; i >= 2; i--) { const j = this.rndInt(i) + 1; [b[i - 1], b[j - 1]] = [b[j - 1], b[i - 1]]; } },
  corta(b, c) { return b.slice(c).concat(b.slice(0, c)); },
  tira(b) {
    const t = b.slice(0, 10).map((id, i) => ({ pos: i + 1, id, inv: 0 }));
    for (let k = 0; k < 3; k++) { const r = this.rndInt(78) + 1; if (r <= 10) t[r - 1].inv++; }
    return t;
  }
};
