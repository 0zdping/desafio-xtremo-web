/* ==========================================================================
   island.js · procedural pixel-art island (the "Un mundo nuevo" map)

   Deterministic (seeded) so every visitor sees the same island: snow to the
   north, forest in the middle, desert to the south, matching the three
   biomes of the game design doc. Rendered 1 cell = 1 canvas pixel and scaled
   up by CSS with image-rendering:pixelated, so it costs a ~23k-pixel
   ImageData, not a big image download.

   DXIsland.create(canvas, { seed, width, height, sparkle })
     -> { biomeCenter(name) -> {x,y} in 0..1, randomLand(biome, rng) -> {x,y},
          destroy() }
   ========================================================================== */
(function () {
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeNoise(rng) {
    const SIZE = 256;
    const perm = new Uint8Array(SIZE * 2);
    const vals = new Float32Array(SIZE);
    for (let i = 0; i < SIZE; i++) {
      perm[i] = i;
      vals[i] = rng();
    }
    for (let i = SIZE - 1; i > 0; i--) {
      const j = (rng() * (i + 1)) | 0;
      const t = perm[i];
      perm[i] = perm[j];
      perm[j] = t;
    }
    for (let i = 0; i < SIZE; i++) perm[i + SIZE] = perm[i];
    const smooth = (t) => t * t * (3 - 2 * t);
    const lattice = (x, y) => vals[perm[(perm[x & 255] + y) & 255]];
    function noise(x, y) {
      const xi = Math.floor(x), yi = Math.floor(y);
      const xf = x - xi, yf = y - yi;
      const u = smooth(xf), v = smooth(yf);
      const a = lattice(xi, yi), b = lattice(xi + 1, yi);
      const c = lattice(xi, yi + 1), d = lattice(xi + 1, yi + 1);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }
    return function fbm(x, y, oct) {
      let amp = 0.5, freq = 1, sum = 0, norm = 0;
      for (let o = 0; o < (oct || 5); o++) {
        sum += noise(x * freq, y * freq) * amp;
        norm += amp;
        amp *= 0.5;
        freq *= 2.03;
      }
      return sum / norm;
    };
  }

  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const P = {
    deep: hex('#03120f'), sea: hex('#062622'), shallow: hex('#0b3d35'), foam: hex('#1d6b5b'),
    snow: { beach: hex('#9fb4ba'), low: hex('#dcebf6'), mid: hex('#c3d8e8'), high: hex('#a7c1d6'), rock: hex('#7f98ab'), peak: hex('#ffffff'), tree: hex('#2d5e52') },
    forest: { beach: hex('#c2ad76'), low: hex('#4aa35f'), mid: hex('#37884c'), high: hex('#2a6e3d'), rock: hex('#5d6e64'), peak: hex('#a3b0a8'), tree: hex('#1a4d2c') },
    desert: { beach: hex('#e6c07a'), low: hex('#ebbd6f'), mid: hex('#dba75b'), high: hex('#c88f47'), rock: hex('#a8663a'), peak: hex('#d7925a'), tree: hex('#6e8f3b') },
  };

  function shade(c, k) {
    return [Math.max(0, Math.min(255, c[0] * k)), Math.max(0, Math.min(255, c[1] * k)), Math.max(0, Math.min(255, c[2] * k))];
  }

  function create(canvas, opts) {
    opts = opts || {};
    const W = opts.width || 192;
    const H = opts.height || 120;
    const rng = mulberry32(opts.seed || 20260925);
    const fbm = makeNoise(rng);
    const fbm2 = makeNoise(mulberry32((opts.seed || 20260925) ^ 0x9e3779b9));

    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(W, H);
    const data = img.data;

    const height = new Float32Array(W * H);
    const biome = new Uint8Array(W * H); // 0 snow, 1 forest, 2 desert
    const cx = W / 2, cy = H / 2, rx = W * 0.42, ry = H * 0.43;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dx = (x - cx) / rx, dy = (y - cy) / ry;
        const d = Math.sqrt(dx * dx + dy * dy);
        const n = fbm(x / 34, y / 34, 5);
        const coast = fbm2(x / 14, y / 14, 3);
        // gentle dome (low, walkable land) + noise that pushes up a few
        // mountain ranges; the coast term makes the shoreline ragged
        let h = (n - 0.5) * 1.05 + (1 - d) * 0.36 - 0.1 + (coast - 0.5) * 0.2;
        // hard falloff near the frame so it always reads as an island
        if (d > 0.78) h -= (d - 0.78) * 1.6;
        height[y * W + x] = h;
        const t = y / H + (fbm2(x / 22 + 40, y / 22, 3) - 0.5) * 0.22;
        biome[y * W + x] = t < 0.37 ? 0 : t > 0.64 ? 2 : 1;
      }
    }

    const names = ['snow', 'forest', 'desert'];
    const sums = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const waterIdx = [];

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const h = height[i];
        let col;
        if (h < 0) {
          col = h < -0.2 ? P.deep : h < -0.08 ? P.sea : h < -0.025 ? P.shallow : P.foam;
          if (h < -0.02) waterIdx.push(i);
          // gentle wave stripes on open water
          if (h < -0.07 && (x + y * 3) % 23 === 0 && fbm2(x / 6, y / 6, 2) > 0.62) col = P.shallow;
        } else {
          const b = biome[i];
          const pal = P[names[b]];
          if (h < 0.035) col = pal.beach;
          else if (h < 0.14) col = pal.low;
          else if (h < 0.24) col = pal.mid;
          else if (h < 0.33) col = pal.high;
          else if (h < 0.42) col = pal.rock;
          else col = pal.peak;
          // relief shading: light comes from the top-left
          const up = y > 0 && x > 0 ? height[i - W - 1] : h;
          const slope = h - up;
          col = shade(col, slope > 0.012 ? 1.12 : slope < -0.012 ? 0.8 : 1);
          // vegetation / props scattered on low-mid land
          if (h > 0.05 && h < 0.3) {
            const r = fbm2(x * 1.7, y * 1.7, 1);
            if (b === 1 && r > 0.66) col = pal.tree;
            else if (b === 0 && r > 0.74) col = pal.tree;
            else if (b === 2 && r > 0.87) col = pal.tree;
          }
          if (h > 0.035) {
            sums[b][0] += x;
            sums[b][1] += y;
            sums[b][2]++;
          }
        }
        const o = i * 4;
        data[o] = col[0];
        data[o + 1] = col[1];
        data[o + 2] = col[2];
        data[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    const base = new Uint8ClampedArray(data);

    /* water sparkle: a handful of pixels blink lighter, a tiny sign of life */
    let timer = null;
    let visible = true;
    const sparkles = [];
    function sparkleTick() {
      sparkles.forEach((i) => {
        const o = i * 4;
        data[o] = base[o];
        data[o + 1] = base[o + 1];
        data[o + 2] = base[o + 2];
      });
      sparkles.length = 0;
      for (let k = 0; k < 26; k++) {
        const i = waterIdx[(rng() * waterIdx.length) | 0];
        if (i == null) continue;
        const o = i * 4;
        data[o] = 70;
        data[o + 1] = 170;
        data[o + 2] = 150;
        sparkles.push(i);
      }
      ctx.putImageData(img, 0, 0);
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let io = null;
    if (opts.sparkle !== false && !reduced) {
      if ('IntersectionObserver' in window) {
        io = new IntersectionObserver((entries) => {
          visible = entries[0].isIntersecting;
        });
        io.observe(canvas);
      }
      timer = setInterval(() => {
        if (visible && !document.hidden) sparkleTick();
      }, 520);
    }

    const localRng = mulberry32(99);
    return {
      width: W,
      height: H,
      biomeCenter(name) {
        const b = names.indexOf(name);
        const s = sums[b];
        return s && s[2] ? { x: s[0] / s[2] / W, y: s[1] / s[2] / H } : { x: 0.5, y: 0.5 };
      },
      randomLand(name, r) {
        r = r || localRng;
        const b = name ? names.indexOf(name) : -1;
        for (let tries = 0; tries < 400; tries++) {
          const x = (r() * W) | 0, y = (r() * H) | 0;
          const i = y * W + x;
          if (height[i] > 0.06 && height[i] < 0.3 && (b < 0 || biome[i] === b)) return { x: (x + 0.5) / W, y: (y + 0.5) / H };
        }
        return { x: 0.5, y: 0.5 };
      },
      destroy() {
        if (timer) clearInterval(timer);
        if (io) io.disconnect();
      },
    };
  }

  window.DXIsland = { create, rng: mulberry32 };
})();
