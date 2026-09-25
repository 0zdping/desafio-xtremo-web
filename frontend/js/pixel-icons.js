/* ==========================================================================
   pixel-icons.js · hand-drawn pixel art icons as crisp inline SVG.
   Each icon is a bitmap (one char = one pixel) plus a palette; '.' is
   transparent. Dark outline + light from the top-left, same rules as the
   event's resourcepack emojis.

   Usage: <span data-pixel="wood"></span> is filled on load, or
          DXPixel.svg('wood') returns the markup string.
   ========================================================================== */
(function () {
  const ICONS = {
    wood: {
      pal: { o: '#2b170b', b: '#5a3519', B: '#7a4a24', r: '#c7924f', R: '#a8733a', c: '#dcae68', C: '#f0cc8a' },
      rows: [
        '................',
        '.....oooooo.....',
        '...oobbbbbboo...',
        '..obbBrrrrBbbo..',
        '.obBrrRRRRrrBbo.',
        '.obrrRRrrRRrrbo.',
        'obBrRrrccrrRrBbo',
        'obrRrrcCCcrrRrbo',
        'obrRrrcCCcrrRrbo',
        'obBrRrrccrrRrBbo',
        '.obrrRRrrRRrrbo.',
        '.obBrrRRRRrrBbo.',
        '..obbBrrrrBbbo..',
        '...oobbbbbboo...',
        '.....oooooo.....',
        '................',
      ],
    },
    stone: {
      pal: { o: '#1b2322', w: '#f2f6f5', l: '#cdd7d4', L: '#9aa7a4', d: '#687573' },
      rows: [
        '................',
        '................',
        '......oooo......',
        '....oowwllooo...',
        '...owllLLLLllo..',
        '..owlLLLLLLLLlo.',
        '..olLLLLLLLLLdo.',
        '.olLLLLdLLLLLddo',
        '.olLLLddLLLLdddo',
        '.oLLLLLLLLLdLddo',
        'oLLLLLLLLLLLdddo',
        'oLdLLLLLLLLddddo',
        'odddLLLLLddddddo',
        '.oddddddddddddo.',
        '..oooooooooooo..',
        '................',
      ],
    },
    metal: {
      pal: { o: '#17202c', w: '#ffffff', h: '#dde6ef', H: '#a7b5c5', m: '#6c7b8e', t: '#37d6b4' },
      rows: [
        '................',
        '................',
        '................',
        '....oooooooo....',
        '...owwhhhhhho...',
        '...ohhhhhhhho...',
        '..oHHHHHHHHHHo..',
        '..oHHtHHHHHHmo..',
        '.oHHHHHHHHHHmmo.',
        '.oHHHHHHHHHmmmo.',
        'ommmmmmmmmmmmmmo',
        '.oooooooooooooo.',
        '................',
        '................',
        '................',
        '................',
      ],
      shiftY: 1,
    },
    cloth: {
      pal: { o: '#2a1f18', h: '#fff6e2', f: '#f1e3c4', F: '#d9c49d', S: '#b8a077', g: '#6ae6c5', G: '#2fa98c', D: '#1d7a64' },
      rows: [
        '................',
        '................',
        '...oooooooooo...',
        '..ohhffffffffo..',
        '..oFFFFFFFFFFo..',
        '..oSSSSSSSSSSo..',
        '.oooooooooooooo.',
        '.oggggggggggggo.',
        '.oGGGGGGGGGGGGo.',
        '.oDDDDDDDDDDDDo.',
        '.oooooooooooooo.',
        '..ohhffffffffo..',
        '..oFFFFFFFFFFo..',
        '..oSSSSSSSSSSo..',
        '..oooooooooooo..',
        '................',
      ],
    },
    map: {
      pal: { o: '#1a1410', b: '#1d6b5b', g: '#4aa35f', y: '#ebbd6f', x: '#ff4d6d', s: '#dcebf6' },
      rows: [
        '............',
        '.oooooooooo.',
        '.obbssbbbbo.',
        '.obbgggbbbo.',
        '.obgggggbbo.',
        '.obggxggbbo.',
        '.obgggyyybo.',
        '.obbgyyyybo.',
        '.obbbbbbbbo.',
        '.oooooooooo.',
        '............',
        '............',
      ],
      shiftY: 1,
    },
    pickaxe: {
      pal: { o: '#1b1512', s: '#a9b4b2', S: '#e2e8e6', b: '#8a5a30' },
      rows: [
        '............',
        '..oooooo....',
        '.osssssSo...',
        '.ooooosSSo..',
        '.....obsSo..',
        '....obo.oSo.',
        '...obo...oo.',
        '..obo.......',
        '.obo........',
        'obo.........',
        'oo..........',
        '............',
      ],
    },
    axe: {
      pal: { o: '#1b1512', s: '#a9b4b2', S: '#e2e8e6', b: '#8a5a30' },
      rows: [
        '......ooo...',
        '.....osSSo..',
        '....ossSSSo.',
        '....ossbSSo.',
        '.....oboooo.',
        '....obo.....',
        '...obo......',
        '..obo.......',
        '.obo........',
        'obo.........',
        'oo..........',
        '............',
      ],
    },
    hammer: {
      pal: { o: '#1b1512', s: '#a9b4b2', S: '#e2e8e6', b: '#8a5a30' },
      rows: [
        '............',
        '.oooooooooo.',
        '.oSSSSSSSso.',
        '.osssssssso.',
        '.oooobboooo.',
        '....obbo....',
        '....obbo....',
        '....obbo....',
        '....obbo....',
        '....obbo....',
        '....oooo....',
        '............',
      ],
    },
    bench: {
      pal: { o: '#2b170b', w: '#e0aa66', W: '#9c6630', m: '#a7b5c5' },
      rows: [
        '............',
        '............',
        'oooooooooooo',
        'owwwwmmwwwwo',
        'oWWWWWWWWWWo',
        'oooooooooooo',
        '.oWo....oWo.',
        '.oWwwwwwwWo.',
        '.oWo....oWo.',
        '.oWo....oWo.',
        '.ooo....ooo.',
        '............',
      ],
    },
    thermo: {
      pal: { o: '#1b1512', w: '#e9f7f0', r: '#ff5d3d', R: '#ff9a6b' },
      rows: [
        '.....oo.....',
        '....owwo....',
        '....owwo....',
        '....orwo....',
        '....orwo....',
        '....orwo....',
        '....orwo....',
        '...orrrro...',
        '..orrRRrro..',
        '..orRRRRro..',
        '..orrRRrro..',
        '...oooooo...',
      ],
    },
    hourglass: {
      pal: { o: '#1b1512', b: '#8a5a30', y: '#f3c65e' },
      rows: [
        'oooooooooooo',
        'obbbbbbbbbbo',
        'oooooooooooo',
        '.oyyyyyyyyo.',
        '..oyyyyyyo..',
        '...oyyyyo...',
        '....oyyo....',
        '...o.yy.o...',
        '..o.yyyy.o..',
        '.oyyyyyyyyo.',
        'oooooooooooo',
        'obbbbbbbbbbo',
      ],
    },
    clan: {
      pal: { o: '#1b1512', s: '#e0b48a', c: '#37d6b4', t: '#f3b45e' },
      rows: [
        '............',
        '.oooo.......',
        '.osso..oooo.',
        '.osso..osso.',
        '.oooo..osso.',
        'occcco.oooo.',
        'occcco.ottto',
        'occcco.ottto',
        'occcco.ottto',
        'oooooo.ooooo',
        '............',
        '............',
      ],
      shiftY: 1,
    },
    wheel: {
      pal: { o: '#1b1512', a: '#ff8a3d', b: '#ff4d6d', c: '#3fd98a', d: '#4aa8ff' },
      rows: [
        '....oooo....',
        '..ooaabboo..',
        '.oaaaabbbbo.',
        '.oaaaabbbbo.',
        'oaaaaabbbbbo',
        'oaaaaoobbbbo',
        'oddddoocccco',
        'odddddccccco',
        '.oddddcccco.',
        '.oddddcccco.',
        '..ooddccoo..',
        '....oooo....',
      ],
    },
    heart: {
      pal: { o: '#1b1512', r: '#ff4d6d', w: '#ffc2cf', d: '#c22c4a' },
      rows: [
        '............',
        '..oo....oo..',
        '.orro..orro.',
        'orwrroorrrro',
        'orwrrrrrrrro',
        'orrrrrrrrrdo',
        '.orrrrrrrdo.',
        '..orrrrrdo..',
        '...orrrdo...',
        '....orro....',
        '.....oo.....',
        '............',
      ],
    },
    bag: {
      pal: { o: '#1b1512', g: '#37d6b4', G: '#1f9c83', w: '#e9f7f0' },
      rows: [
        '............',
        '............',
        '............',
        '.oooooooooo.',
        'owwoggggggGo',
        'owwogggggGGo',
        'oooooooooooo',
        'oGGGGGGGGGGo',
        'oooooooooooo',
        '............',
        '............',
        '............',
      ],
    },
    spoon: {
      pal: { o: '#1b1512', s: '#dfe7ef', S: '#9fb0c2', g: '#f3c65e' },
      rows: [
        '........ooo.',
        '.......osSSo',
        '.......osSSo',
        '.......oSSo.',
        '......ogoo..',
        '.....ogo....',
        '....ogo.....',
        '...ogo......',
        '..ogo.......',
        '.ogo........',
        'ogo.........',
        'oo..........',
      ],
    },
  };

  function svg(name, opts) {
    const icon = ICONS[name];
    if (!icon) return '';
    opts = opts || {};
    const size = icon.rows.length;
    const dy = icon.shiftY || 0;
    let rects = '';
    icon.rows.forEach((row, y) => {
      // merge horizontal runs of the same color into one rect
      let x = 0;
      while (x < row.length) {
        const ch = row[x];
        if (ch === '.' || !icon.pal[ch]) {
          x++;
          continue;
        }
        let run = 1;
        while (x + run < row.length && row[x + run] === ch) run++;
        rects += `<rect x="${x}" y="${y + dy}" width="${run}" height="1" fill="${icon.pal[ch]}"/>`;
        x += run;
      }
    });
    const cls = opts.className ? ` class="${opts.className}"` : '';
    return `<svg${cls} viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects}</svg>`;
  }

  function hydrate(scope) {
    (scope || document).querySelectorAll('[data-pixel]').forEach((el) => {
      if (el.dataset.pixelDone) return;
      el.dataset.pixelDone = '1';
      el.innerHTML = svg(el.dataset.pixel, { className: 'px-icon' });
    });
  }

  window.DXPixel = { svg, hydrate, names: Object.keys(ICONS) };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => hydrate());
  else hydrate();
})();
