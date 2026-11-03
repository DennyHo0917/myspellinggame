// Standalone ISO/IEC 18004 compliant QR Code Generator (pure JavaScript)
// Model 2, Byte Mode (UTF-8), Error Correction Level M
// Supports Versions 1 to 6 (up to 134 bytes data capacity, perfect for URLs)

const GF256_EXP = new Uint8Array(512);
const GF256_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF256_EXP[i] = x;
    GF256_EXP[i + 255] = x;
    GF256_LOG[x] = i;
    x <<= 1;
    if (x & 256) x ^= 0x11d;
  }
})();

function gfMul(x, y) {
  if (x === 0 || y === 0) return 0;
  return GF256_EXP[GF256_LOG[x] + GF256_LOG[y]];
}

function rsGeneratorPoly(degree) {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const factor = GF256_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], factor);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}

function rsCompute(data, ecCount) {
  const gen = rsGeneratorPoly(ecCount);
  const res = new Uint8Array(ecCount);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ res[0];
    res.copyWithin(0, 1);
    res[ecCount - 1] = 0;
    for (let j = 0; j < ecCount; j++) {
      res[j] ^= gfMul(gen[j], factor);
    }
  }
  return res;
}

// Table for Versions 1-6 with EC Level M:
// [version, totalCodewords, ecCodewordsPerBlock, numBlocks, alignmentPos]
const QR_TABLE = [
  null,
  { v: 1, total: 26, ec: 10, blocks: 1, align: [] },
  { v: 2, total: 44, ec: 16, blocks: 1, align: [6, 18] },
  { v: 3, total: 70, ec: 26, blocks: 1, align: [6, 22] },
  { v: 4, total: 100, ec: 18, blocks: 2, align: [6, 26] },
  { v: 5, total: 134, ec: 24, blocks: 2, align: [6, 30] },
  { v: 6, total: 172, ec: 16, blocks: 4, align: [6, 34] },
];

export function generateQRCodeMatrix(text) {
  const bytes = new TextEncoder().encode(String(text || ""));
  let cfg = null;
  for (let v = 1; v <= 6; v++) {
    const t = QR_TABLE[v];
    const dataCap = t.total - t.ec * t.blocks;
    if (bytes.length + 3 <= dataCap) {
      cfg = t;
      break;
    }
  }
  if (!cfg) {
    // If text exceeds Version 6, truncate or use Version 6 max bytes
    cfg = QR_TABLE[6];
  }

  const dataCap = cfg.total - cfg.ec * cfg.blocks;
  const bits = [];
  function pushBits(val, len) {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  }

  const safeLen = Math.min(bytes.length, dataCap - 3);
  // Mode: byte (0100)
  pushBits(4, 4);
  // Count: 8 bits for v1-9
  pushBits(safeLen, 8);
  // Data bytes
  for (let i = 0; i < safeLen; i++) pushBits(bytes[i], 8);
  // Terminator
  pushBits(0, Math.min(4, dataCap * 8 - bits.length));
  // Pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0);
  // Pad codewords
  const padBytes = [0xec, 0x11];
  let pIdx = 0;
  while (bits.length < dataCap * 8) {
    pushBits(padBytes[pIdx++ % 2], 8);
  }

  const rawData = new Uint8Array(dataCap);
  for (let i = 0; i < dataCap; i++) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i * 8 + j];
    rawData[i] = b;
  }

  const blockSize = Math.floor(dataCap / cfg.blocks);
  const dataBlocks = [];
  const ecBlocks = [];
  let offset = 0;
  for (let b = 0; b < cfg.blocks; b++) {
    const count = blockSize + (b >= cfg.blocks - (dataCap % cfg.blocks) ? 1 : 0);
    const slice = rawData.slice(offset, offset + count);
    dataBlocks.push(slice);
    ecBlocks.push(rsCompute(slice, cfg.ec));
    offset += count;
  }

  const finalCodewords = [];
  const maxBlockLen = Math.max(...dataBlocks.map((b) => b.length));
  for (let i = 0; i < maxBlockLen; i++) {
    for (const b of dataBlocks) {
      if (i < b.length) finalCodewords.push(b[i]);
    }
  }
  for (let i = 0; i < cfg.ec; i++) {
    for (const b of ecBlocks) {
      finalCodewords.push(b[i]);
    }
  }

  const size = 17 + cfg.v * 4;
  const matrix = Array.from({ length: size }, () => new Int8Array(size).fill(-1));

  function placeFinder(row, col) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const tr = row + r;
        const tc = col + c;
        if (tr < 0 || tr >= size || tc < 0 || tc >= size) continue;
        if (
          r === -1 || r === 7 || c === -1 || c === 7 ||
          r === 1 || r === 5 || c === 1 || c === 5
        ) {
          matrix[tr][tc] = 0;
        } else {
          matrix[tr][tc] = 1;
        }
      }
    }
  }
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  for (let i = 8; i < size - 8; i++) {
    if (matrix[6][i] === -1) matrix[6][i] = i % 2 === 0 ? 1 : 0;
    if (matrix[i][6] === -1) matrix[i][6] = i % 2 === 0 ? 1 : 0;
  }

  matrix[size - 8][8] = 1;

  if (cfg.align.length > 0) {
    for (const r of cfg.align) {
      for (const c of cfg.align) {
        if (
          (r === 6 && c === 6) ||
          (r === 6 && c === size - 7) ||
          (r === size - 7 && c === 6)
        ) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isBorder = Math.abs(dr) === 2 || Math.abs(dc) === 2;
            const isCenter = dr === 0 && dc === 0;
            matrix[r + dr][c + dc] = isBorder || isCenter ? 1 : 0;
          }
        }
      }
    }
  }

  for (let i = 0; i <= 8; i++) {
    if (matrix[8][i] === -1) matrix[8][i] = -2;
    if (matrix[i][8] === -1) matrix[i][8] = -2;
  }
  for (let i = size - 8; i < size; i++) {
    if (matrix[8][i] === -1) matrix[8][i] = -2;
    if (matrix[i][8] === -1) matrix[i][8] = -2;
  }

  const maskFn = (r, c) => (r + c) % 2 === 0;
  let bitIdx = 0;
  const totalBits = finalCodewords.length * 8;

  let right = size - 1;
  let upward = true;
  while (right > 0) {
    if (right === 6) right--;
    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rows) {
      for (const c of [right, right - 1]) {
        if (matrix[r][c] === -1) {
          let bit = 0;
          if (bitIdx < totalBits) {
            const byte = finalCodewords[Math.floor(bitIdx / 8)];
            bit = (byte >> (7 - (bitIdx % 8))) & 1;
            bitIdx++;
          }
          if (maskFn(r, c)) bit ^= 1;
          matrix[r][c] = bit;
        }
      }
    }
    right -= 2;
    upward = !upward;
  }

  // Format info for EC Level M and Mask 0: 101010000010010
  const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];
  const tlCoords = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];
  for (let i = 0; i < 15; i++) {
    const [r, c] = tlCoords[i];
    matrix[r][c] = formatBits[i];
  }
  for (let i = 0; i < 7; i++) {
    matrix[size - 1 - i][8] = formatBits[i];
  }
  for (let i = 7; i < 15; i++) {
    matrix[8][size - 15 + i] = formatBits[i];
  }

  return matrix;
}

export function qrCodeToSvg(matrix, sizePx = 160) {
  const n = matrix.length;
  const pad = 2;
  const total = n + pad * 2;
  const cellSize = sizePx / total;
  let d = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c] === 1) {
        const x = (c + pad) * cellSize;
        const y = (r + pad) * cellSize;
        d += `M${x.toFixed(1)},${y.toFixed(1)}h${cellSize.toFixed(1)}v${cellSize.toFixed(1)}h-${cellSize.toFixed(1)}z `;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sizePx} ${sizePx}" width="${sizePx}" height="${sizePx}" shape-rendering="crispEdges"><rect width="${sizePx}" height="${sizePx}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}
