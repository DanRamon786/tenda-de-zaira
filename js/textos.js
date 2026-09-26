// Falas e dramaturgia da Zaira (as mesmas da Tenda 2D, revisadas por Dan).
export function rand() { const u = new Uint32Array(1); crypto.getRandomValues(u); return u[0] / 4294967296; }
export const pick = a => a[Math.floor(rand() * a.length)];
const lower1 = s => s.charAt(0).toLowerCase() + s.slice(1);

// posições da Cruz Celta (como no TAROT.EXE)
export const POS = [
  null,
  { t: 'A atmosfera que envolve sua vida até hoje' },
  { t: 'Sua personalidade e sua capacidade de agir dentro dessa atmosfera' },
  { t: 'Sua consciência: objetivos, propósitos e influências que você percebe' },
  { t: 'Seu inconsciente: forças internas que talvez você não perceba' },
  { t: 'Influências presentes que em breve deixarão sua vida' },
  { t: 'O futuro imediato' },
  { t: 'Você e seu comportamento no futuro' },
  { t: 'Influências e situações importantes que virão' },
  { t: 'Pensamentos que cruzarão sua mente enquanto o futuro se desenrola' },
  { t: 'A culminância de tudo o que esta leitura descreve' }
];

export const ACTS = [
  { name: 'O PASSADO', pos: [1, 4, 5], open: ['Comecemos pelo que ficou para trás. O passado é a raiz de tudo o que ainda vai florescer.', 'Antes do amanhã, vamos ouvir o que já foi. As primeiras cartas falam do chão onde você pisa.'] },
  { name: 'O PRESENTE', pos: [2, 3], open: ['Agora, o presente. Aquilo que você é neste instante, aqui diante de mim.', 'Voltemos ao agora. Estas cartas mostram quem você é hoje, e o que você busca.'] },
  { name: 'O FUTURO', pos: [6, 7, 8, 9, 10], open: ['E então, o que ainda não aconteceu. Não tenha pressa. O futuro gosta de ser olhado com calma.', 'Chegamos ao futuro. Ele não está escrito em pedra, mas as cartas conhecem seus caminhos.'] }
];

export const SUIT = {
  cups: { n: 'Copas', d: 'das emoções, do amor e dos laços' },
  pentacles: { n: 'Ouros', d: 'do dinheiro, do trabalho e das coisas concretas' },
  swords: { n: 'Espadas', d: 'da mente, dos conflitos e das decisões difíceis' },
  wands: { n: 'Paus', d: 'da ação, da energia e das iniciativas' }
};

function articleMinor(c) { return (c.rank === 1 ? 'a ' : 'o ') + c.pt_name; }

export function cardIntro(t, nome) {
  const c = t.card, pos = POS[t.pos].t;
  const open = pick([`${pos}.`, `Esta casa guarda ${lower1(pos)}.`, `Aqui, na casa ${t.pos}: ${lower1(pos)}.`]);
  const reveal = c.arcana === 'major'
    ? pick([`E quem aparece é ${c.pt_name}, um dos Arcanos Maiores. Uma força grande, ${nome}.`, `${c.pt_name}. Arcano Maior. Quando ele vem, o destino fala mais alto.`, `Veja só... ${c.pt_name}.`])
    : pick([`Surge ${articleMinor(c)}.`, `Vem ${articleMinor(c)}, carta ${SUIT[c.suit].d}.`, `${c.pt_name}. O naipe ${SUIT[c.suit].d}.`]);
  const rv = t.rev ? pick([' Mas ela chegou de cabeça para baixo, e isso muda o que ela quer dizer.', ' Ela veio invertida. Preste atenção.', ' Invertida... a energia dela está travada.']) : '';
  const mean = t.rev ? c.pt_rev : c.pt_up;
  return `${open} ${reveal}${rv} ${mean}`;
}

export function synthesis(tiragem, nome, pergunta) {
  const maj = tiragem.filter(t => t.card.arcana === 'major').length;
  const rev = tiragem.filter(t => t.rev).length;
  const cnt = {}; tiragem.forEach(t => { if (t.card.suit) cnt[t.card.suit] = (cnt[t.card.suit] || 0) + 1; });
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
  const fim = tiragem[9], ime = tiragem[5];
  let s = pergunta ? `Você me trouxe uma pergunta: “${pergunta}”. ` : 'Você guardou sua pergunta em silêncio, e as cartas respeitaram isso. ';
  s += maj >= 4 ? `Há ${maj} Arcanos Maiores na mesa. Forças maiores do que a vontade de um dia estão em movimento na sua vida. `
    : maj === 0 ? 'Nenhum Arcano Maior apareceu. O que vem pela frente depende das suas escolhas de todo dia, não do destino. '
      : `${maj === 1 ? 'Um Arcano Maior marca' : maj + ' Arcanos Maiores marcam'} os pontos em que o destino encosta a mão no seu caminho. `;
  if (top && top[1] >= 3) s += `O naipe de ${SUIT[top[0]].n} domina a tiragem: este é um tempo ${SUIT[top[0]].d}. `;
  s += rev === 0 ? 'Nenhuma carta se voltou contra você. ' : rev === 1 ? 'Uma carta veio invertida: é ali que mora o nó a desatar. ' : `${rev} cartas vieram invertidas. Há energias presas pedindo cuidado. `;
  s += `No futuro imediato, ${ime.card.pt_name}${ime.rev ? ' invertida' : ''}. E tudo culmina em ${fim.card.pt_name}${fim.rev ? ', invertida' : ''}.`;
  return s;
}

// reações da Zaira ao que a câmera percebe
export const REACAO = {
  sorriso: ['Esse sorriso... as cartas gostam de quem chega de coração aberto.', 'Vejo um sorriso. Guarde essa leveza, ela vai ajudar você.'],
  ausente: ['Não se afaste, as cartas ainda estão falando com você.', 'Volte para perto da mesa. Ainda não terminamos.']
};

// números por extenso (para "corte na trinta e dois")
const UN = { um: 1, uma: 1, dois: 2, duas: 2, 'três': 3, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9 };
const ESP = { dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19 };
const DEZ = { vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, 'cinqüenta': 50, sessenta: 60, setenta: 70 };
export function numeroFalado(txt) {
  const d = txt.match(/\b(\d{1,2})\b/); if (d) return +d[1];
  const w = txt.toLowerCase().split(/[^a-zà-ú]+/); let n = 0, achou = false;
  for (const p of w) {
    if (DEZ[p]) { n += DEZ[p]; achou = true; } else if (ESP[p]) { n += ESP[p]; achou = true; } else if (UN[p]) { n += UN[p]; achou = true; }
  }
  return achou ? n : null;
}
