'use strict';
(() => {
  // ---------------------------------------------------------------- setup
  const $ = (s) => document.querySelector(s);
  const stage = $('#stage');
  const back = $('#back'), bctx = back.getContext('2d');
  const front = $('#front'), fctx = front.getContext('2d');
  const tray = $('#tray');

  // Scene coordinates match the furnace SVG viewBox.
  const VIEW_W = 360;
  const MOUTH = new Path2D('M112 372 V292 Q112 258 146 254 H214 Q248 258 248 292 V372 Z');
  const MOUTH_C = { x: 180, y: 340 };
  const DROP = { x0: 30, x1: 330, y0: 20, y1: 432 };
  const VENTS = [[140, 124], [170, 124], [200, 124]];
  const MAX_BURNING = 12;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DENSITY = reduced ? 0.45 : 1;
  const SERIF = '"Noto Serif TC", "Songti TC", "PMingLiU", serif';
  const MONO = '"Share Tech Mono", ui-monospace, monospace';

  const rand = (a, b) => a + Math.random() * (b - a);
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  function mulberry32(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  };

  // ---------------------------------------------------------------- paper art
  function speckle(ctx, w, h, r, color, n) {
    ctx.fillStyle = color;
    for (let i = 0; i < n; i++) {
      ctx.globalAlpha = r() * 0.22;
      ctx.fillRect(r() * w, r() * h, 1 + (r() * w) / 70, 1 + (r() * w) / 220);
    }
    ctx.globalAlpha = 1;
  }

  function foil(ctx, x, y, w, h, stops) {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    const s = ctx.createLinearGradient(x, y, x + w, y + h * 0.4);
    s.addColorStop(0.3, 'rgba(255,255,255,0)');
    s.addColorStop(0.45, 'rgba(255,255,255,.55)');
    s.addColorStop(0.6, 'rgba(255,255,255,0)');
    ctx.fillStyle = s;
    ctx.fillRect(x, y, w, h);
  }

  function text(ctx, str, x, y, size, color, font = SERIF, weight = 900) {
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }

  function fitSize(ctx, str, maxW, size, font, weight) {
    ctx.font = `${weight} ${size}px ${font}`;
    const w = ctx.measureText(str).width;
    return w > maxW ? size * (maxW / w) : size;
  }

  const PAPERS = [
    {
      id: 'tianjin', name: '天金', note: '敬天公・大願', seed: 11,
      draw(ctx, w, h, r) {
        const u = w / 160;
        ctx.fillStyle = '#cba35d'; ctx.fillRect(0, 0, w, h);
        speckle(ctx, w, h, r, '#5b3c12', 320);
        ctx.strokeStyle = '#b0141f'; ctx.lineWidth = 2 * u;
        ctx.strokeRect(5 * u, 5 * u, w - 10 * u, h - 10 * u);
        const fw = w * 0.5, fh = h * 0.56;
        foil(ctx, (w - fw) / 2, (h - fh) / 2, fw, fh, ['#fff4b8', '#f1c84b', '#b8861c', '#f6d76a']);
        text(ctx, '天金', w / 2, h / 2 + u, 24 * u, '#b0141f');
        text(ctx, '叩謝天恩', w / 2, 15 * u, 8 * u, '#8a0f19', SERIF, 700);
        text(ctx, '福德圓滿', w / 2, h - 15 * u, 8 * u, '#8a0f19', SERIF, 700);
      },
    },
    {
      id: 'shoujin', name: '壽金', note: '拜神明・祈福', seed: 23,
      draw(ctx, w, h, r) {
        const u = w / 160;
        ctx.fillStyle = '#c2954c'; ctx.fillRect(0, 0, w, h);
        speckle(ctx, w, h, r, '#4a300c', 320);
        const fw = w * 0.62, fh = h * 0.62, fx = (w - fw) / 2;
        foil(ctx, fx, (h - fh) / 2, fw, fh, ['#ffe991', '#e8b437', '#a87414', '#f4cf5c']);
        ctx.strokeStyle = '#a3101b'; ctx.lineWidth = 2 * u;
        ctx.beginPath(); ctx.arc(w / 2, h / 2, h * 0.21, 0, Math.PI * 2); ctx.stroke();
        text(ctx, '壽', w / 2, h / 2 + u, 24 * u, '#a3101b');
        text(ctx, '福', fx + 13 * u, h / 2, 12 * u, '#a3101b');
        text(ctx, '祿', fx + fw - 13 * u, h / 2, 12 * u, '#a3101b');
      },
    },
    {
      id: 'yinzhi', name: '銀紙', note: '祭祖先・好兄弟', seed: 37,
      draw(ctx, w, h, r) {
        const u = w / 160;
        ctx.fillStyle = '#d7cdb9'; ctx.fillRect(0, 0, w, h);
        speckle(ctx, w, h, r, '#5d5446', 320);
        const fw = w * 0.52, fh = h * 0.58;
        foil(ctx, (w - fw) / 2, (h - fh) / 2, fw, fh, ['#ffffff', '#c3cad2', '#7d8590', '#e6ebf0']);
        text(ctx, '銀', w / 2, h / 2 + u, 26 * u, '#36404c');
        text(ctx, '庫 銀', w / 2, 14 * u, 8 * u, '#4d4638', SERIF, 700);
        text(ctx, '平 安', w / 2, h - 14 * u, 8 * u, '#4d4638', SERIF, 700);
      },
    },
    {
      id: 'mingchao', name: '天地銀行', note: '冥鈔・壹億元', seed: 41,
      draw(ctx, w, h, r) {
        const u = w / 160;
        const g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, '#2c7363'); g.addColorStop(0.5, '#8fcfae'); g.addColorStop(1, '#2c7363');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 0.6 * u;
        for (let k = 0; k < 7; k++) {
          ctx.beginPath();
          for (let x = 0; x <= w; x += 2 * u) {
            const y = h / 2 + Math.sin((x / w) * Math.PI * 5 + k * 0.9) * h * 0.36;
            x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.stroke();
        }
        ctx.strokeStyle = '#f3e3a0'; ctx.lineWidth = 2 * u;
        ctx.strokeRect(4 * u, 4 * u, w - 8 * u, h - 8 * u);
        ctx.lineWidth = 0.8 * u;
        ctx.strokeRect(7 * u, 7 * u, w - 14 * u, h - 14 * u);
        text(ctx, '天地銀行', w / 2, 18 * u, 13 * u, '#7d0c17');
        text(ctx, 'HELL BANK NOTE', w / 2, 29 * u, 6 * u, '#0f2e27', MONO, 400);
        // portrait
        const cx = w * 0.72, cy = h * 0.6;
        ctx.fillStyle = '#f3e3a0'; ctx.strokeStyle = '#7d0c17'; ctx.lineWidth = 1.2 * u;
        ctx.beginPath(); ctx.ellipse(cx, cy, 19 * u, 24 * u, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.save(); ctx.clip();
        ctx.fillStyle = '#2c7363';
        ctx.beginPath(); ctx.arc(cx, cy - 4 * u, 8 * u, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx, cy + 20 * u, 17 * u, 13 * u, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#7d0c17'; ctx.fillRect(cx - 9 * u, cy - 16 * u, 18 * u, 5 * u);
        ctx.restore();
        text(ctx, '壹億', w * 0.32, h * 0.56, 22 * u, '#7d0c17');
        text(ctx, '100,000,000', w * 0.32, h * 0.76, 7 * u, '#0f2e27', MONO, 400);
        ['億', '億'].forEach((c, i) => {
          const x = i ? w - 16 * u : 16 * u, y = i ? 16 * u : h - 16 * u;
          ctx.fillStyle = '#7d0c17'; ctx.beginPath(); ctx.arc(x, y, 6 * u, 0, Math.PI * 2); ctx.fill();
          text(ctx, c, x, y + 0.5 * u, 7 * u, '#f3e3a0');
        });
      },
    },
    {
      id: 'cyber', name: '賽博冥幣', note: '鏈上供奉', seed: 59,
      draw(ctx, w, h, r) {
        const u = w / 160;
        ctx.fillStyle = '#0b0616'; ctx.fillRect(0, 0, w, h);
        ctx.lineWidth = 1 * u; ctx.lineCap = 'round';
        for (let i = 0; i < 16; i++) {
          ctx.strokeStyle = i % 3 ? 'rgba(34,230,255,.5)' : 'rgba(255,43,214,.5)';
          let x = r() * w, y = r() * h;
          ctx.beginPath(); ctx.moveTo(x, y);
          for (let s = 0; s < 3; s++) {
            const len = (8 + r() * 26) * u, dir = (r() * 4) | 0;
            x += [len, -len, 0, 0][dir]; y += [0, 0, len, -len][dir];
            if (r() < 0.4) { x += len * 0.4; y += len * 0.4; }
            ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.fillStyle = ctx.strokeStyle;
          ctx.beginPath(); ctx.arc(x, y, 1.6 * u, 0, Math.PI * 2); ctx.fill();
        }
        ctx.shadowColor = '#ff2bd6'; ctx.shadowBlur = 6 * u;
        ctx.strokeStyle = '#ff2bd6'; ctx.lineWidth = 1.5 * u;
        ctx.strokeRect(5 * u, 5 * u, w - 10 * u, h - 10 * u);
        ctx.shadowColor = '#22e6ff'; ctx.shadowBlur = 10 * u;
        text(ctx, '冥幣', w / 2, h / 2, 26 * u, '#ffffff');
        ctx.shadowBlur = 0;
        text(ctx, 'CYBER HELL COIN', w / 2, 17 * u, 7 * u, '#22e6ff', MONO, 400);
        text(ctx, '₿ 8,888,888.88', w / 2, h - 17 * u, 8 * u, '#ff7ae6', MONO, 400);
        const q = 3 * u, qx = w - 30 * u, qy = 12 * u;
        ctx.fillStyle = '#e8fbff';
        for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) if (r() < 0.5) ctx.fillRect(qx + i * q, qy + j * q, q, q);
      },
    },
    {
      id: 'wish', name: '願望紙', note: '寫下心願', seed: 73,
      draw(ctx, w, h, r, label) {
        const u = w / 160;
        const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.6);
        g.addColorStop(0, '#c8202d'); g.addColorStop(1, '#850a16');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        speckle(ctx, w, h, r, '#3d0006', 200);
        ctx.strokeStyle = '#f2c34d'; ctx.lineWidth = 2 * u;
        ctx.strokeRect(5 * u, 5 * u, w - 10 * u, h - 10 * u);
        ctx.lineWidth = 0.8 * u;
        ctx.strokeRect(9 * u, 9 * u, w - 18 * u, h - 18 * u);
        text(ctx, '祈　願', w / 2, 19 * u, 8 * u, '#f2c34d', SERIF, 700);
        text(ctx, '心誠則靈', w / 2, h - 18 * u, 7 * u, '#f2c34d', SERIF, 700);
        const size = fitSize(ctx, label, w * 0.76, 22 * u, SERIF, 900);
        ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 2 * u;
        text(ctx, label, w / 2, h / 2 + u, size, '#ffd96b');
        ctx.shadowBlur = 0;
      },
    },
  ];
  const byId = Object.fromEntries(PAPERS.map((p) => [p.id, p]));

  let wishText = store.get('cjp2-wish', '') || '';
  const labelFor = (p) => (p.id === 'wish' ? wishText || '心想事成' : p.name);

  // High-res art per paper (used for tray cards and flying papers).
  const ART_W = 320, ART_H = 208;
  const cardArt = new Map();
  function renderArt(p) {
    let c = cardArt.get(p.id);
    if (!c) { c = document.createElement('canvas'); c.width = ART_W; c.height = ART_H; cardArt.set(p.id, c); }
    const x = c.getContext('2d');
    x.clearRect(0, 0, ART_W, ART_H);
    p.draw(x, ART_W, ART_H, mulberry32(p.seed), labelFor(p));
    const img = tray.querySelector(`[data-id="${p.id}"] img`);
    if (img) img.src = c.toDataURL();
  }

  // ---------------------------------------------------------------- tray
  for (const p of PAPERS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'card';
    b.dataset.id = p.id;
    b.setAttribute('aria-label', `投入${p.name}`);
    b.innerHTML = `<img alt="" draggable="false"><span class="name">${p.name}</span><span class="note">${p.note}</span>`;
    tray.appendChild(b);
  }
  const renderAllArt = () => PAPERS.forEach(renderArt);
  renderAllArt();
  if (document.fonts) {
    Promise.all([
      document.fonts.load(`900 40px ${SERIF}`, '天金壽銀願冥幣'),
      document.fonts.load(`700 20px ${SERIF}`, '叩謝天恩福德圓滿'),
      document.fonts.load(`400 20px ${MONO}`, 'HELL'),
    ]).then(renderAllArt, () => {});
  }

  // ---------------------------------------------------------------- sizing
  let dpr = 1, S = stage.getBoundingClientRect(), K = S.width / VIEW_W;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    S = stage.getBoundingClientRect();
    K = S.width / VIEW_W;
    back.width = Math.round(S.width * dpr);
    back.height = Math.round(S.height * dpr);
    front.width = Math.round(innerWidth * dpr);
    front.height = Math.round(innerHeight * dpr);
  }
  addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  resize();

  const toScene = (cx, cy) => ({ x: (cx - S.left) / K, y: (cy - S.top) / K });

  // ---------------------------------------------------------------- sprites
  function glowSprite(stops, size = 64) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(([o, col]) => g.addColorStop(o, col));
    x.fillStyle = g;
    x.fillRect(0, 0, size, size);
    return c;
  }
  const FLAME = [
    glowSprite([[0, 'rgba(255,245,200,1)'], [0.35, 'rgba(255,190,70,.55)'], [1, 'rgba(255,110,0,0)']]),
    glowSprite([[0, 'rgba(255,170,50,.9)'], [0.4, 'rgba(255,95,20,.45)'], [1, 'rgba(200,30,0,0)']]),
    glowSprite([[0, 'rgba(255,70,40,.75)'], [0.45, 'rgba(210,25,60,.3)'], [1, 'rgba(110,0,50,0)']]),
    glowSprite([[0, 'rgba(255,50,190,.45)'], [0.5, 'rgba(150,20,170,.18)'], [1, 'rgba(60,0,90,0)']]),
  ];
  const SMOKE = glowSprite([[0, 'rgba(170,150,200,.55)'], [1, 'rgba(90,70,120,0)']]);

  // ---------------------------------------------------------------- burning paper
  const BURN_W = 128, BURN_H = 83;

  function valueNoise(w, h, gx, gy, r) {
    const g = Array.from({ length: (gx + 1) * (gy + 1) }, r);
    return (x, y) => {
      const fx = (x / w) * gx, fy = (y / h) * gy;
      const ix = fx | 0, iy = fy | 0, tx = fx - ix, ty = fy - iy;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const i = iy * (gx + 1) + ix;
      const a = g[i], b = g[i + 1], c = g[i + gx + 1], d = g[i + gx + 2];
      return lerp(lerp(a, b, sx), lerp(c, d, sx), sy);
    };
  }

  function makeBurner(paper, label, x, y, rot) {
    const c = document.createElement('canvas');
    c.width = BURN_W; c.height = BURN_H;
    const cx = c.getContext('2d', { willReadFrequently: true });
    paper.draw(cx, BURN_W, BURN_H, mulberry32(paper.seed), label);
    const img = cx.getImageData(0, 0, BURN_W, BURN_H);
    const src = new Uint8ClampedArray(img.data);

    // Burn map: distance from an ignition point on the bottom edge plus noise.
    const r = mulberry32((Math.random() * 1e9) | 0);
    const n1 = valueNoise(BURN_W, BURN_H, 6, 4, r), n2 = valueNoise(BURN_W, BURN_H, 14, 9, r);
    const ix = rand(0.2, 0.8) * BURN_W, iy = BURN_H * rand(0.85, 1.1);
    const map = new Float32Array(BURN_W * BURN_H);
    let lo = Infinity, hi = -Infinity;
    for (let j = 0; j < BURN_H; j++) {
      for (let i = 0; i < BURN_W; i++) {
        const d = Math.hypot(i - ix, (j - iy) * 1.3) / BURN_W;
        const v = d * 0.75 + n1(i, j) * 0.45 + n2(i, j) * 0.18;
        map[j * BURN_W + i] = v;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    for (let i = 0; i < map.length; i++) map[i] = (map[i] - lo) / (hi - lo);

    return { canvas: c, ctx: cx, img, src, map, x, y, rot, vr: rand(-0.15, 0.15), t: -0.08, dur: rand(2.3, 3.1), w: 62, squash: 0.55 };
  }

  const EDGE = 0.035, CHAR = 0.12;
  function paintBurn(b) {
    const d = b.img.data, src = b.src, map = b.map, t = b.t;
    for (let i = 0, p = 0; i < map.length; i++, p += 4) {
      const k = t - map[i];
      if (k < -0.12) {
        d[p] = src[p]; d[p + 1] = src[p + 1]; d[p + 2] = src[p + 2]; d[p + 3] = src[p + 3];
      } else if (k < 0) {
        const s = (1 + k / 0.12) * 0.8; // scorch toward brown
        d[p] = lerp(src[p], 70, s); d[p + 1] = lerp(src[p + 1], 32, s); d[p + 2] = lerp(src[p + 2], 12, s); d[p + 3] = 255;
      } else if (k < EDGE) {
        const s = k / EDGE; // glowing front
        d[p] = 255; d[p + 1] = 235 - 150 * s; d[p + 2] = 130 - 115 * s; d[p + 3] = 255;
      } else if (k < CHAR) {
        const s = (k - EDGE) / (CHAR - EDGE); // charred, crumbling
        d[p] = 20 + 50 * (1 - s); d[p + 1] = 14 + 16 * (1 - s); d[p + 2] = 18; d[p + 3] = 255 * (1 - s * s);
      } else {
        d[p + 3] = 0;
      }
    }
    b.ctx.putImageData(b.img, 0, 0);
  }

  // local paper pixel -> scene coords (paper lies flat: rotate, then squash)
  function burnerPoint(b, i, j) {
    const h = (b.w * BURN_H) / BURN_W;
    const lx = (i / BURN_W - 0.5) * b.w, ly = (j / BURN_H - 0.5) * h;
    const c = Math.cos(b.rot), s = Math.sin(b.rot);
    return { x: b.x + lx * c - ly * s, y: b.y + (lx * s + ly * c) * b.squash };
  }

  // ---------------------------------------------------------------- state
  const burning = [], fire = [], flyers = [];
  const embers = [], ashes = [], smoke = [], texts = [];
  const inner = [], exhaust = []; // debris drawn up the flue, and what's queued to come out the vents
  let ghost = null, heat = 0.3, draft = 0, time = 0, lastPop = -1;
  let fireAcc = 0, emberAcc = 0, mouthAcc = 0, smokeAcc = 0;

  const COALS = Array.from({ length: 22 }, () => ({ x: rand(120, 240), y: rand(362, 371), r: rand(5, 11), ph: rand(0, 6.28), sp: rand(1.5, 4) }));

  let total = +store.get('cjp2-total', 0) || 0;
  let session = 0;
  const totalEl = $('#total'), sessionEl = $('#session'), blessEl = $('#blessing');
  totalEl.textContent = total.toLocaleString();

  const BLESSINGS = [
    '招財進寶', '萬事如意', '平安喜樂', '財源廣進', '心想事成', '步步高升', '闔家安康',
    '好運連連', '貴人相助', '福氣滿滿', '年年有餘', '身體健康', '升級不當機', 'Bug 全消',
    '部署一次就過', '網速飛快', '電量永遠 100%', '歐氣爆棚', 'KPI 全達標', '零 Merge Conflict',
    '伺服器永不宕機', '抽卡必出 SSR',
  ];

  function bump(el) {
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  }

  // ---------------------------------------------------------------- particles
  function emitFire(x, y, spread, power) {
    fire.push({
      x: x + (Math.random() + Math.random() - 1) * spread, y: y + rand(-3, 3),
      vx: rand(-10, 10), vy: -rand(35, 70) * power,
      age: 0, life: rand(0.45, 0.95), size: rand(11, 20) * (0.75 + power * 0.3),
    });
  }
  function emitEmber(x, y, vx = rand(-35, 35), vy = -rand(60, 150)) {
    embers.push({ x, y, px: x, py: y, vx, vy, age: 0, life: rand(0.9, 2.2), size: rand(0.8, 1.8) });
  }
  function emitAsh(x, y, size = rand(2, 5), vy = -rand(15, 40)) {
    ashes.push({
      x, y, vx: rand(-15, 15), vy, rot: rand(0, 6.28), vr: rand(-4, 4), flip: rand(0, 6.28), vf: rand(3, 9),
      age: 0, life: rand(2.5, 4.5), size, glow: Math.random() < 0.65,
    });
  }
  function emitSmoke(x, y) {
    smoke.push({ x, y, vx: rand(-6, 6), vy: -rand(18, 30) * (1 + 1.3 * draft), age: 0, life: rand(2.5, 4), size: rand(10, 16) });
  }
  function emitInner(x, y, kind) {
    inner.push({
      x, y, px: x, py: y, vx: rand(-15, 15), vy: -rand(20, 50), age: 0, kind,
      size: kind === 'ash' ? rand(3, 6) : rand(0.8, 1.6), rot: rand(0, 6.28), vr: rand(-8, 8),
    });
  }
  // Stack effect: whatever the draft pulls up the flue comes out of a vent.
  function ventBurst(kind, size) {
    const [vx, vy] = pick(VENTS);
    const x = vx + rand(3, 17), y = vy + rand(4, 14), up = -rand(70, 150) * (0.8 + 0.5 * draft);
    if (kind === 'spark') emitEmber(x, y, rand(-30, 30), up * 1.3);
    else emitAsh(x, y, size, up);
  }

  // ---------------------------------------------------------------- actions
  // A throw is a toss to just in front of the mouth, then the draft sucks it in.
  // `sucked` papers (dragged close enough) skip the toss.
  function throwPaper(paper, from, sucked = false) {
    const x1 = MOUTH_C.x + rand(-28, 28);
    flyers.push({
      paper, label: labelFor(paper), art: cardArt.get(paper.id),
      x0: from.x, y0: from.y, w0: from.w,
      hx: sucked ? from.x : x1 + rand(-12, 12), hy: sucked ? from.y : rand(288, 300),
      x1, y1: MOUTH_C.y + rand(0, 14),
      t: 0, toss: sucked ? 0 : 0.55, dur: sucked ? 0.45 : rand(0.95, 1.1), whooshed: false,
      rot0: rand(-0.3, 0.3), spin: sucked ? rand(-0.8, 0.8) : rand(-2.2, 2.2),
    });
    if (navigator.vibrate) navigator.vibrate(10);
  }

  function throwFromCard(card) {
    const r = card.querySelector('img').getBoundingClientRect();
    const p = toScene(r.left + r.width / 2, r.top + r.height / 2);
    throwPaper(byId[card.dataset.id], { x: p.x, y: p.y, w: r.width / K });
  }

  function land(f) {
    if (burning.length >= MAX_BURNING) burning[0].t = Math.max(burning[0].t, 1); // hurry the oldest along
    burning.push(makeBurner(f.paper, f.label, f.x1, f.y1, f.rot0 + f.spin));
    for (let i = 0; i < 10 * DENSITY; i++) emitEmber(f.x1 + rand(-20, 20), f.y1 - rand(0, 10), rand(-60, 60), -rand(80, 200));
    for (let i = 0; i < 8 * DENSITY; i++) emitInner(f.x1 + rand(-20, 20), f.y1 - rand(0, 10), 'spark');
    Sound.ignite();

    total++; session++;
    totalEl.textContent = total.toLocaleString();
    sessionEl.textContent = session.toLocaleString();
    bump(totalEl);
    store.set('cjp2-total', total);

    const msg = f.paper.id === 'wish' ? `「${f.label}」已上達天聽` : pick(BLESSINGS);
    blessEl.textContent = `✦ ${msg} ✦`;
    if (time - lastPop > 0.8) { // don't restart the pop on every paper of a long-press stack
      lastPop = time;
      blessEl.classList.remove('pop'); void blessEl.offsetWidth; blessEl.classList.add('pop');
    }
    for (const t of texts) t.age = Math.max(t.age, t.life - 0.25); // fade out the previous one
    texts.push({ str: msg, x: 180, y: 30, age: 0, life: 2.2 });
  }

  // ---------------------------------------------------------------- update
  function update(dt) {
    time += dt;
    const target = 0.3 + 0.38 * burning.length;
    heat += (Math.min(target, 2.2) - heat) * Math.min(1, dt * (target > heat ? 4 : 0.7));
    const power = clamp(heat, 0.3, 1.6);
    draft = clamp(heat - 0.3, 0, 1.6);

    if (ghost) {
      // the draft tugs a dragged paper toward the mouth, and swallows it once it's close
      const dx = MOUTH_C.x - ghost.px, dy = 310 - ghost.py, d = Math.hypot(dx, dy);
      ghost.pull = clamp(1 - (d - 70) / 150, 0, 1) ** 2 * (0.5 + 0.25 * Math.min(draft, 1));
      ghost.x = ghost.px + dx * ghost.pull;
      ghost.y = ghost.py + dy * ghost.pull;
      if (d < 85 + 20 * Math.min(draft, 1)) {
        const g = ghost;
        ghost = null;
        throwPaper(g.paper, { x: g.x, y: g.y, w: 92 * (1 - 0.15 * g.pull) }, true);
        g.onSucked();
      }
    }

    // fire bed
    fireAcc += dt * (28 + 70 * power) * DENSITY;
    while (fireAcc >= 1) { emitFire(180, 364, 52, power); fireAcc--; }

    // burning papers
    for (const b of burning) {
      b.t += dt / b.dur;
      b.y -= dt * (3 + 16 * Math.max(0, b.t)); // lifted by the updraft as it burns
      b.rot += b.vr * dt;
      if (b.t > -0.05) paintBurn(b);
      if (b.t > 0 && b.t < 0.95 && Math.random() < dt * 40 * DENSITY) emitFire(b.x, b.y, 18, 1);
      for (let n = 0; n < 8; n++) {
        const idx = (Math.random() * b.map.length) | 0;
        const k = b.t - b.map[idx];
        if (k >= 0 && k < EDGE && Math.random() < 0.18 * DENSITY) {
          const p = burnerPoint(b, idx % BURN_W, (idx / BURN_W) | 0);
          emitInner(p.x, p.y, 'spark');
        } else if (k >= EDGE && k < CHAR && Math.random() < 0.07 * DENSITY) {
          const p = burnerPoint(b, idx % BURN_W, (idx / BURN_W) | 0);
          emitInner(p.x, p.y, 'ash');
        }
      }
    }
    for (let i = burning.length - 1; i >= 0; i--) if (burning[i].t > 1 + CHAR + 0.02) burning.splice(i, 1);

    for (let i = fire.length - 1; i >= 0; i--) {
      const p = fire[i];
      p.age += dt;
      if (p.age >= p.life) { fire.splice(i, 1); continue; }
      // the updraft pulls flames toward the centre and stretches them upward
      p.vx = (p.vx + rand(-70, 70) * dt + (MOUTH_C.x - p.x) * (0.6 + 1.4 * draft) * dt) * 0.97;
      p.vy -= (40 + 70 * draft) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }

    for (let i = inner.length - 1; i >= 0; i--) {
      const q = inner[i];
      q.age += dt;
      q.px = q.x; q.py = q.y;
      q.vx = (q.vx + rand(-60, 60) * dt + (MOUTH_C.x - q.x) * (1 + 2 * draft) * dt) * 0.97;
      q.vy = (q.vy - (90 + 120 * draft) * dt) * 0.985;
      q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt;
      if (q.y < 262) {
        inner.splice(i, 1);
        exhaust.push({ kind: q.kind, size: q.size, delay: rand(0.15, 0.45) });
      } else if (q.age > 3) inner.splice(i, 1);
    }
    for (let i = exhaust.length - 1; i >= 0; i--) {
      const e = exhaust[i];
      e.delay -= dt;
      if (e.delay <= 0) { exhaust.splice(i, 1); ventBurst(e.kind, e.size); }
    }

    // a steady draft keeps sparks and smoke coming out of the vents; a few sparks pop out of the mouth
    emberAcc += dt * (0.6 + 6 * draft) * DENSITY;
    while (emberAcc >= 1) { ventBurst('spark'); emberAcc--; }
    mouthAcc += dt * (1 + 3 * draft) * DENSITY;
    while (mouthAcc >= 1) { emitEmber(rand(130, 230), rand(300, 350)); mouthAcc--; }
    smokeAcc += dt * (1.2 + 8 * draft) * DENSITY;
    while (smokeAcc >= 1) { const v = pick(VENTS); emitSmoke(v[0] + 10, v[1] + 4); smokeAcc--; }

    for (let i = embers.length - 1; i >= 0; i--) {
      const e = embers[i];
      e.age += dt;
      if (e.age >= e.life) { embers.splice(i, 1); continue; }
      e.px = e.x; e.py = e.y;
      e.vx = (e.vx + rand(-120, 120) * dt) * 0.985;
      e.vy = (e.vy - 25 * dt) * 0.99;
      e.x += e.vx * dt; e.y += e.vy * dt;
    }
    for (let i = ashes.length - 1; i >= 0; i--) {
      const a = ashes[i];
      a.age += dt;
      if (a.age >= a.life) { ashes.splice(i, 1); continue; }
      a.vx = (a.vx + rand(-40, 40) * dt + Math.sin(time * 2 + a.flip) * 20 * dt) * 0.98;
      a.vy = (a.vy - 8 * dt) * 0.99;
      a.x += a.vx * dt; a.y += a.vy * dt; a.rot += a.vr * dt; a.flip += a.vf * dt;
    }
    for (let i = smoke.length - 1; i >= 0; i--) {
      const s = smoke[i];
      s.age += dt;
      if (s.age >= s.life) { smoke.splice(i, 1); continue; }
      s.vx += Math.sin(time * 0.7 + s.y * 0.02) * 6 * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      s.size += dt * 14;
    }
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      t.age += dt; t.y -= dt * 10;
      if (t.age >= t.life) texts.splice(i, 1);
    }

    for (let i = flyers.length - 1; i >= 0; i--) {
      const f = flyers[i];
      f.t += dt / f.dur;
      if (!f.whooshed && f.t >= f.toss) { f.whooshed = true; Sound.whoosh(); }
      if (f.t >= 1) { flyers.splice(i, 1); land(f); }
    }

    if (embers.length > 500) embers.splice(0, embers.length - 500);
    if (ashes.length > 300) ashes.splice(0, ashes.length - 300);
    if (inner.length > 400) inner.splice(0, inner.length - 400);
  }

  // ---------------------------------------------------------------- draw
  function flicker() {
    return 0.82 + 0.1 * Math.sin(time * 13.1) + 0.08 * Math.sin(time * 27.7 + 1.3);
  }

  function drawBack() {
    const c = bctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, back.width, back.height);
    c.setTransform(dpr * K, 0, 0, dpr * K, 0, 0);
    c.save();
    c.clip(MOUTH);

    const bg = c.createLinearGradient(0, 254, 0, 372);
    bg.addColorStop(0, '#0d0309');
    bg.addColorStop(1, '#300808');
    c.fillStyle = bg;
    c.fillRect(100, 250, 160, 130);

    const glow = clamp(heat, 0.3, 1.8) * flicker();
    c.globalCompositeOperation = 'lighter';
    const rg = c.createRadialGradient(180, 372, 0, 180, 372, 130);
    rg.addColorStop(0, `rgba(255,110,30,${0.42 * glow})`);
    rg.addColorStop(0.6, `rgba(200,20,90,${0.16 * glow})`);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = rg;
    c.fillRect(100, 250, 160, 130);

    // coals
    c.globalCompositeOperation = 'source-over';
    for (const k of COALS) {
      const b = 0.55 + 0.45 * Math.sin(time * k.sp + k.ph);
      c.fillStyle = `rgb(${(90 + 150 * b) | 0},${(20 + 70 * b) | 0},${(10 + 15 * b) | 0})`;
      c.beginPath(); c.ellipse(k.x, k.y, k.r, k.r * 0.45, 0, 0, Math.PI * 2); c.fill();
    }

    // papers lying in the fire
    for (const b of burning) {
      const h = (b.w * BURN_H) / BURN_W;
      c.save();
      c.translate(b.x, b.y);
      c.scale(1, b.squash);
      c.rotate(b.rot);
      c.drawImage(b.canvas, -b.w / 2, -h / 2, b.w, h);
      c.restore();
    }

    // paper ash being drawn up the flue
    for (const q of inner) {
      if (q.kind !== 'ash') continue;
      c.save();
      c.translate(q.x, q.y); c.rotate(q.rot);
      c.fillStyle = '#2a2026';
      c.strokeStyle = 'rgba(255,140,40,.9)';
      c.lineWidth = 0.7;
      c.fillRect(-q.size / 2, -q.size / 4, q.size, q.size / 2);
      c.strokeRect(-q.size / 2, -q.size / 4, q.size, q.size / 2);
      c.restore();
    }

    // flames on top
    c.globalCompositeOperation = 'lighter';
    c.lineCap = 'round';
    for (const q of inner) {
      if (q.kind !== 'spark') continue;
      c.strokeStyle = 'rgba(255,200,90,.9)';
      c.lineWidth = q.size;
      c.beginPath(); c.moveTo(q.px, q.py); c.lineTo(q.x, q.y + 0.01); c.stroke();
    }
    const dim = 0.55 / (0.7 + 0.3 * clamp(heat, 0.3, 2.2)); // keep a big fire from blowing out to white
    for (const p of fire) {
      const a = p.age / p.life;
      const spr = FLAME[a < 0.22 ? 0 : a < 0.5 ? 1 : a < 0.78 ? 2 : 3];
      const s = p.size * (1 - a * 0.45);
      c.globalAlpha = (1 - a) * Math.min(1, a * 8) * dim;
      const st = 1.25 + 0.4 * draft;
      c.drawImage(spr, p.x - s, p.y - s * st, s * 2, s * 2 * st);
    }
    c.globalAlpha = 1;
    c.restore();
  }

  function drawPaperSprite(c, art, x, y, w, rot, squash) {
    const h = (w * ART_H) / ART_W;
    c.save();
    c.translate(x, y);
    c.scale(1, squash);
    c.rotate(rot);
    c.shadowColor = 'rgba(0,0,0,.5)';
    c.shadowBlur = 8;
    c.shadowOffsetY = 4;
    c.drawImage(art, -w / 2, -h / 2, w, h);
    c.restore();
  }

  function drawFront() {
    const c = fctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, front.width, front.height);
    c.setTransform(dpr * K, 0, 0, dpr * K, dpr * S.left, dpr * S.top);

    // light spilling from the mouth and vents
    const glow = clamp(heat, 0.3, 1.8) * flicker();
    c.globalCompositeOperation = 'lighter';
    const rg = c.createRadialGradient(180, 330, 40, 180, 330, 190);
    rg.addColorStop(0, `rgba(255,120,40,${0.13 * glow})`);
    rg.addColorStop(1, 'rgba(255,40,120,0)');
    c.fillStyle = rg;
    c.fillRect(-20, 140, 400, 320);
    for (const [vx, vy] of VENTS) {
      c.fillStyle = `rgba(255,${(120 + 60 * glow) | 0},40,${0.18 + 0.3 * glow})`;
      c.fillRect(vx + 1.5, vy + 1.5, 17, 15);
    }

    c.globalCompositeOperation = 'source-over';
    for (const s of smoke) {
      const a = s.age / s.life;
      c.globalAlpha = Math.sin(Math.PI * a) * 0.22;
      c.drawImage(SMOKE, s.x - s.size, s.y - s.size, s.size * 2, s.size * 2);
    }
    for (const a of ashes) {
      const f = a.age / a.life;
      const hot = a.glow ? Math.max(0, 1 - f * 2.2) : 0;
      c.globalAlpha = (1 - f) * 0.8;
      const s = a.size;
      c.save();
      c.translate(a.x, a.y); c.rotate(a.rot); c.scale(Math.cos(a.flip), 1);
      c.beginPath();
      c.moveTo(-s / 2, -s * 0.3); c.lineTo(s * 0.4, -s * 0.4); c.lineTo(s / 2, s * 0.25); c.lineTo(-s * 0.35, s * 0.35);
      c.closePath();
      c.fillStyle = hot > 0 ? '#3a2a2a' : '#6e6878';
      c.fill();
      if (hot > 0) { c.strokeStyle = `rgba(255,150,40,${hot})`; c.lineWidth = 0.7; c.stroke(); }
      c.restore();
    }
    c.globalAlpha = 1;

    c.globalCompositeOperation = 'lighter';
    c.lineCap = 'round';
    for (const e of embers) {
      const f = e.age / e.life;
      c.strokeStyle = `hsla(${25 + 25 * (1 - f)},100%,${55 + 30 * (1 - f)}%,${1 - f})`;
      c.lineWidth = e.size;
      c.beginPath(); c.moveTo(e.px, e.py); c.lineTo(e.x, e.y + 0.01); c.stroke();
    }
    c.globalCompositeOperation = 'source-over';

    for (const f of flyers) {
      let x, y, w, rot, squash = 1;
      if (f.t < f.toss) {
        // toss: arc from the card to just in front of the mouth
        const e = 1 - (1 - f.t / f.toss) ** 2, u = 1 - e;
        const cx = (f.x0 + f.hx) / 2, cy = Math.min(f.y0, f.hy) - 110;
        x = u * u * f.x0 + 2 * u * e * cx + e * e * f.hx;
        y = u * u * f.y0 + 2 * u * e * cy + e * e * f.hy;
        w = lerp(f.w0, 74, e);
        rot = f.rot0 + f.spin * e;
      } else {
        // suction: hovers and flutters for a beat, then gets yanked in
        const s = f.toss >= 1 ? 1 : (f.t - f.toss) / (1 - f.toss), e = s * s * s;
        const flut = Math.min(1, s * 4) * (1 - e);
        x = lerp(f.hx, f.x1, e) + Math.sin(time * 31 + f.rot0 * 10) * 4 * flut;
        y = lerp(f.hy, f.y1, e);
        w = lerp(f.toss ? 74 : f.w0, 62, e);
        rot = f.rot0 + f.spin + Math.sin(time * 23 + f.x1) * 0.35 * flut;
        squash = lerp(1, 0.55, e);
      }
      drawPaperSprite(c, f.art, x, y, w, rot, squash);
    }

    if (ghost) {
      const over = inDrop(ghost.x, ghost.y);
      const rot = -0.12 + Math.sin(time * 6) * 0.03 + Math.sin(time * 29) * 0.35 * ghost.pull;
      drawPaperSprite(c, cardArt.get(ghost.paper.id), ghost.x, ghost.y, 92 * (1 - 0.15 * ghost.pull), rot, 1);
      if (over) {
        c.globalCompositeOperation = 'lighter';
        c.strokeStyle = `rgba(255,170,60,${0.5 + 0.3 * Math.sin(time * 10)})`;
        c.lineWidth = 2;
        c.setLineDash([6, 6]);
        c.lineDashOffset = -time * 30;
        c.beginPath(); c.ellipse(180, 316, 86, 76, 0, 0, Math.PI * 2); c.stroke();
        c.setLineDash([]);
        c.globalCompositeOperation = 'source-over';
      }
    }

    for (const t of texts) {
      const f = t.age / t.life;
      c.globalAlpha = Math.min(1, f * 6) * (1 - f * f);
      c.font = `900 17px ${SERIF}`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.shadowColor = '#ff8a00'; c.shadowBlur = 12;
      c.fillStyle = '#ffe38a';
      c.fillText(t.str, t.x, t.y);
      c.shadowBlur = 0;
    }
    c.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- sound
  const Sound = {
    on: false, ctx: null,
    init() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      const ctx = (this.ctx = new AC());
      this.master = ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(ctx.destination);

      const sr = ctx.sampleRate;
      const brown = ctx.createBuffer(1, sr * 3, sr), bd = brown.getChannelData(0);
      let last = 0;
      for (let i = 0; i < bd.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; bd[i] = last * 3.5; }
      this.white = ctx.createBuffer(1, sr, sr);
      const wd = this.white.getChannelData(0);
      for (let i = 0; i < wd.length; i++) wd[i] = Math.random() * 2 - 1;

      const bed = ctx.createBufferSource();
      bed.buffer = brown; bed.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 420;
      this.bedGain = ctx.createGain();
      this.bedGain.gain.value = 0;
      bed.connect(lp).connect(this.bedGain).connect(this.master);
      bed.start();
      return true;
    },
    toggle() {
      if (!this.ctx && !this.init()) return false;
      this.on = !this.on;
      if (this.on) this.ctx.resume(); else this.bedGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      return this.on;
    },
    noise(filterType, freq, q, gain, dur, offset = Math.random() * 0.8) {
      const c = this.ctx, t = c.currentTime;
      const src = c.createBufferSource(); src.buffer = this.white;
      const f = c.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
      const g = c.createGain();
      src.connect(f).connect(g).connect(this.master);
      src.start(t, offset, dur + 0.05);
      return { f, g, t };
    },
    crackle() {
      const { g, t } = this.noise('highpass', rand(1200, 4000), 0.7, 0, 0.06);
      g.gain.setValueAtTime(rand(0.12, 0.45), t);
      g.gain.exponentialRampToValueAtTime(0.001, t + rand(0.01, 0.05));
    },
    whoosh() {
      if (!this.on) return;
      const { f, g, t } = this.noise('bandpass', 300, 1.2, 0, 0.5, 0);
      f.frequency.setValueAtTime(300, t);
      f.frequency.exponentialRampToValueAtTime(1600, t + 0.4);
      g.gain.setValueAtTime(0.001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.15);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    },
    ignite() {
      if (!this.on) return;
      const { f, g, t } = this.noise('lowpass', 900, 0.5, 0, 0.9, 0);
      f.frequency.setValueAtTime(1800, t);
      f.frequency.exponentialRampToValueAtTime(300, t + 0.8);
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
      for (let i = 0; i < 4; i++) setTimeout(() => this.crackle(), rand(0, 400));
    },
    update(dt) {
      if (!this.on) return;
      this.bedGain.gain.setTargetAtTime(0.12 + 0.3 * Math.min(heat, 1.6), this.ctx.currentTime, 0.3);
      if (Math.random() < dt * (2 + 14 * Math.max(0, heat - 0.3))) this.crackle();
    },
  };

  const soundBtn = $('#soundBtn');
  soundBtn.addEventListener('click', () => {
    const on = Sound.toggle();
    soundBtn.setAttribute('aria-pressed', String(on));
    soundBtn.querySelector('.txt').textContent = on ? '音效：開' : '音效：關';
  });

  // ---------------------------------------------------------------- wish
  const wishInput = $('#wishText');
  wishInput.value = wishText;
  $('#wishForm').addEventListener('submit', (e) => {
    e.preventDefault();
    wishText = wishInput.value.trim();
    store.set('cjp2-wish', wishText);
    renderArt(byId.wish);
    wishInput.blur();
    const card = tray.querySelector('[data-id="wish"]');
    card.classList.remove('pulse'); void card.offsetWidth; card.classList.add('pulse');
    blessEl.textContent = '願望已寫上，投入金爐吧';
  });

  // ---------------------------------------------------------------- input
  const inDrop = (x, y) => x > DROP.x0 && x < DROP.x1 && y > DROP.y0 && y < DROP.y1;

  for (const card of tray.querySelectorAll('.card')) {
    let start = null, dragging = false, consumed = false, holdTimer = 0, feedTimer = 0, suppressClick = false;
    const onSucked = () => {
      dragging = false;
      consumed = true;
      card.classList.remove('lifted');
      if (navigator.vibrate) navigator.vibrate([8, 30, 16]);
    };
    const paper = byId[card.dataset.id];

    const stopFeeding = () => {
      clearTimeout(holdTimer); clearInterval(feedTimer);
      holdTimer = feedTimer = 0;
      card.classList.remove('feeding');
    };

    card.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      card.setPointerCapture(e.pointerId);
      start = { x: e.clientX, y: e.clientY };
      dragging = false;
      consumed = false;
      suppressClick = false;
      holdTimer = setTimeout(() => {
        suppressClick = true;
        card.classList.add('feeding');
        throwFromCard(card);
        feedTimer = setInterval(() => throwFromCard(card), 160);
      }, 420);
    });

    card.addEventListener('pointermove', (e) => {
      if (!start || consumed || !card.hasPointerCapture(e.pointerId)) return;
      if (!dragging && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10 && !feedTimer) {
        dragging = true;
        suppressClick = true;
        clearTimeout(holdTimer);
        card.classList.add('lifted');
      }
      if (dragging) {
        const p = toScene(e.clientX, e.clientY);
        if (!ghost) ghost = { paper, onSucked, pull: 0, x: p.x, y: p.y };
        ghost.px = p.x; ghost.py = p.y;
      }
    });

    const end = (e, cancelled) => {
      stopFeeding();
      if (dragging && ghost) {
        if (!cancelled && inDrop(ghost.x, ghost.y)) throwPaper(paper, { x: ghost.x, y: ghost.y, w: 92 });
        ghost = null;
      }
      dragging = false;
      start = null;
      card.classList.remove('lifted');
    };
    card.addEventListener('pointerup', (e) => end(e, false));
    card.addEventListener('pointercancel', (e) => end(e, true));
    card.addEventListener('contextmenu', (e) => e.preventDefault());

    card.addEventListener('click', () => {
      if (suppressClick) { suppressClick = false; return; }
      throwFromCard(card);
    });
  }

  // ---------------------------------------------------------------- loop
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    S = stage.getBoundingClientRect();
    K = S.width / VIEW_W;
    update(dt);
    drawBack();
    drawFront();
    Sound.update(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
