(() => {
  const bg = document.querySelector('.captcha-bg');
  const block = document.querySelector('.captcha-block');
  if (!bg || !block) return '0';

  const bgCtx = bg.getContext('2d');
  const blockCtx = block.getContext('2d');
  const w = bg.width, h = bg.height;
  const bw = block.width, bh = block.height;
  const bgData = bgCtx.getImageData(0, 0, w, h).data;
  const blockData = blockCtx.getImageData(0, 0, bw, bh).data;

  let pieceMinX = bw, pieceMaxX = 0, pieceMinY = bh, pieceMaxY = 0;
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const i = (y * bw + x) * 4;
      if (blockData[i + 3] > 50) {
        if (x < pieceMinX) pieceMinX = x;
        if (x > pieceMaxX) pieceMaxX = x;
        if (y < pieceMinY) pieceMinY = y;
        if (y > pieceMaxY) pieceMaxY = y;
      }
    }
  }

  const pieceW = pieceMaxX - pieceMinX + 1;
  const pieceH = pieceMaxY - pieceMinY + 1;
  let bestX = 0, bestScore = Infinity;

  for (let tx = 40; tx <= w - pieceW; tx++) {
    let score = 0, count = 0;
    for (let py = 0; py < pieceH; py++) {
      for (let px = 0; px < pieceW; px++) {
        const bi = ((pieceMinY + py) * bw + (pieceMinX + px)) * 4;
        if (blockData[bi + 3] > 50) {
          const sx = tx + px;
          const sy = pieceMinY + py;
          if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
            const si = (sy * w + sx) * 4;
            const dr = bgData[si] - blockData[bi];
            const dg = bgData[si + 1] - blockData[bi + 1];
            const db = bgData[si + 2] - blockData[bi + 2];
            score += dr * dr + dg * dg + db * db;
            count++;
          }
        }
      }
    }
    if (count > 0 && score / count < bestScore) {
      bestScore = score / count;
      bestX = tx;
    }
  }

  return String(bestX);
})()
