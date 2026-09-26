"""Uso: python repinta.py AMOSTRA.vrm modelo/zaira.vrm  (precisa de Pillow e numpy)

Repinta a amostra VRM da pixiv para a Zaira de Dan: cabelo mel, olhos verdes,
blusa creme com corpete bordô bordado a ouro, saia bordô. Gera site/modelo/zaira.vrm."""
import json, struct, io, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import colorsys

import sys
SRC = sys.argv[1] if len(sys.argv) > 1 else 'VRM1_Constraint_Twist_Sample.vrm'   # amostra da pixiv (repositório pixiv/three-vrm)
DST = sys.argv[2] if len(sys.argv) > 2 else 'modelo/zaira.vrm'
b = open(SRC, 'rb').read()
L = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + L]); off = 20 + L + 8
BL = struct.unpack('<I', b[20 + L:24 + L])[0]; binc = bytearray(b[off:off + BL])
def img(i):
    bv = j['bufferViews'][j['images'][i]['bufferView']]; s = bv.get('byteOffset', 0)
    return Image.open(io.BytesIO(bytes(binc[s:s + bv['byteLength']]))).convert('RGB')
novos = {}

def hsv_map(im, f, mask_fn=None):
    a = np.asarray(im).astype(np.float32) / 255
    r, g, bb = a[..., 0], a[..., 1], a[..., 2]
    mx = a.max(-1); mn = a.min(-1); d = mx - mn + 1e-6
    h = np.where(mx == r, ((g - bb) / d) % 6, np.where(mx == g, (bb - r) / d + 2, (r - g) / d + 4)) / 6
    s = np.where(mx > 0, d / (mx + 1e-6), 0); v = mx
    h2, s2, v2 = f(h, s, v)
    i = np.floor(h2 * 6).astype(int) % 6; ff = h2 * 6 - np.floor(h2 * 6)
    p = v2 * (1 - s2); q = v2 * (1 - ff * s2); t = v2 * (1 - (1 - ff) * s2)
    out = np.zeros_like(a)
    for k, (x, y, z) in enumerate([(v2, t, p), (q, v2, p), (p, v2, t), (p, q, v2), (t, p, v2), (v2, p, q)]):
        m = i == k; out[..., 0][m] = x[m]; out[..., 1][m] = y[m]; out[..., 2][m] = z[m]
    if mask_fn is not None:
        m = mask_fn(h, s, v)[..., None]; out = np.where(m, out, a)
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8))

# cabelo cor de mel (castanho claro dourado)
mel = lambda h, s, v: (np.full_like(h, .095), np.clip(s * .95, 0, .62), np.clip(v * 1.45 + .1, 0, .97))
novos[15] = hsv_map(img(15), mel)
novos[5] = hsv_map(img(5), mel)
# sobrancelhas mais claras
novos[13] = hsv_map(img(13), lambda h, s, v: (np.full_like(h, .08), s * .8, np.clip(v * 1.5 + .05, 0, .8)), lambda h, s, v: s > .12)
# olhos verdes
novos[8] = hsv_map(img(8), lambda h, s, v: (np.full_like(h, .27), np.clip(s * .7, 0, .6), np.clip(v * .85, 0, 1)), lambda h, s, v: (s > .15) & (v > .08))

# ---------- blusa e corpete ----------
tops = img(4); g = np.asarray(tops.convert('L')).astype(np.float32)
sombra = np.clip((g - 190) / (254 - 190), 0, 1) * .28 + .72     # sombreamento original
W, H = tops.size
def colore(cor):
    c = np.array(cor, np.float32) / 255
    return (c[None, None, :] * sombra[..., None])
creme = colore((246, 241, 230))
base = Image.fromarray((np.clip(creme, 0, 1) * 255).astype(np.uint8))

def brocado(w, h, semente):
    random.seed(semente)
    t = Image.new('RGB', (w, h), (92, 20, 34)); d = ImageDraw.Draw(t, 'RGBA')
    ouro = (206, 162, 74, 200); ouro2 = (150, 108, 40, 170)
    for y in range(-20, h + 40, 44):
        for x in range(-20, w + 40, 40):
            xx = x + (22 if (y // 44) % 2 else 0)
            # flor: miolo, pétalas e volutas
            d.ellipse([xx - 4, y - 4, xx + 4, y + 4], fill=ouro)
            for k in range(6):
                a = k * math.pi / 3
                px, py = xx + math.cos(a) * 9, y + math.sin(a) * 9
                d.ellipse([px - 3.2, py - 3.2, px + 3.2, py + 3.2], outline=ouro, width=2)
            d.arc([xx + 6, y + 6, xx + 26, y + 26], 180, 300, fill=ouro2, width=2)
            d.arc([xx - 26, y + 6, xx - 6, y + 26], 240, 360, fill=ouro2, width=2)
            d.ellipse([xx + 16, y + 14, xx + 22, y + 22], fill=(170, 40, 50, 200))
    return t.filter(ImageFilter.GaussianBlur(.6))

def corpete(topo, fundo, x0, x1, costas=False):
    w, h = x1 - x0, fundo - topo
    c = brocado(w, h, 7 if costas else 3)
    m = Image.new('L', (w, h), 0); dm = ImageDraw.Draw(m)
    # borda de cima em "coração" na frente, reta nas costas
    pts = [(0, 30)]
    for k in range(0, w + 1, 8):
        u = k / w
        yy = 30 - 28 * math.sin(math.pi * u) if not costas else 10
        if not costas and abs(u - .5) < .08: yy = 26 + 40 * (1 - abs(u - .5) / .08)
        pts.append((k, yy))
    pts += [(w, h), (0, h)]
    dm.polygon(pts, fill=255)
    dc = ImageDraw.Draw(c, 'RGBA')
    # debrum dourado
    dc.line(pts[:-2], fill=(214, 172, 84, 255), width=7); dc.line(pts[:-2], fill=(120, 80, 28, 255), width=2)
    dc.rectangle([0, h - 12, w, h], fill=(190, 150, 70, 255))
    if not costas:
        cx = w // 2
        dc.rectangle([cx - 20, 40, cx + 20, h - 12], fill=(60, 12, 22, 255))
        for yy in range(52, h - 20, 26):         # ilhoses e cordão cruzado
            for s in (-1, 1): dc.ellipse([cx + s * 16 - 4, yy - 4, cx + s * 16 + 4, yy + 4], fill=(222, 190, 110, 255))
        for yy in range(52, h - 46, 26):
            dc.line([cx - 16, yy, cx + 16, yy + 26], fill=(236, 220, 180, 255), width=4)
            dc.line([cx + 16, yy, cx - 16, yy + 26], fill=(236, 220, 180, 255), width=4)
    # sombreado original por cima
    sh = Image.fromarray((sombra[topo:fundo, x0:x1] * 255).astype(np.uint8))
    c = Image.composite(Image.fromarray((np.asarray(c).astype(np.float32) * (np.asarray(sh)[..., None] / 255 * 1.05)).clip(0, 255).astype(np.uint8)), c, Image.new('L', (w, h), 255))
    base.paste(c, (x0, topo), m)

corpete(470, 842, 236, 786)                 # frente
corpete(1560, 1866, 236, 786, costas=True)  # costas
d = ImageDraw.Draw(base, 'RGBA')
# pregas do linho (linhas de sombra suaves) no corpo e nas mangas
random.seed(11)
for (x0, x1, y0, y1) in [(240, 780, 250, 520), (240, 780, 1290, 1570)]:
    for k in range(26):
        x = x0 + (x1 - x0) * k / 25 + random.uniform(-6, 6)
        d.line([(x, y0 + random.uniform(0, 30)), (x + random.uniform(-14, 14), y1)], fill=(150, 140, 128, 70), width=random.choice([2, 3, 4]))
for (cx, cy, s0) in [(150, 330, 1), (874, 330, -1), (150, 1400, 1), (874, 1400, -1)]:
    for k in range(10):
        d.arc([cx - 110 + k * 4, cy - 150 + k * 22, cx + 110 - k * 4, cy + 60 + k * 22], 200 if s0 > 0 else 250, 290 if s0 > 0 else 340, fill=(150, 140, 128, 80), width=3)
# babado franzido em volta do decote
for k in range(0, 181, 9):
    a = math.radians(k); x = 512 + math.cos(a) * 128; y = 214 + math.sin(a) * 96
    d.ellipse([x - 13, y - 9, x + 13, y + 11], fill=(250, 247, 240, 255), outline=(170, 160, 146, 255), width=2)
# cordão de amarrar no decote
d.line([(470, 300), (512, 318), (554, 300)], fill=(160, 40, 40, 255), width=4)
novos[4] = base

# saia (bottoms) bordô escuro
bo = np.asarray(img(2)).astype(np.float32) / 255; gg = bo.mean(-1)
saia = np.stack([.30 + gg * 1.2, .06 + gg * .5, .10 + gg * .6], -1)
novos[2] = Image.fromarray((np.clip(saia, 0, 1) * 255).astype(np.uint8))

# ---------- reescreve o GLB ----------
for i, im in novos.items():
    buf = io.BytesIO(); im.save(buf, 'PNG', optimize=True); data = buf.getvalue()
    while len(binc) % 4: binc.append(0)
    j['bufferViews'].append({'buffer': 0, 'byteOffset': len(binc), 'byteLength': len(data)})
    binc += data; j['images'][i]['bufferView'] = len(j['bufferViews']) - 1
while len(binc) % 4: binc.append(0)
j['buffers'][0]['byteLength'] = len(binc)
meta = j['extensions']['VRMC_vrm']['meta']
meta['name'] = 'Zaira (a partir da amostra VRM1 da pixiv)'
meta['authors'] = ['pixiv Inc.', 'Dan Ramon Ribeiro']
js = json.dumps(j, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(binc)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(binc), 0x004E4942) + bytes(binc)
open(DST, 'wb').write(out)
print('ok', len(out))
