/* Background dot matrix — gelombang lembut, warna PHR. Ringan: ±24 fps, berhenti saat tab tidak aktif,
   statis bila pengguna memilih "reduce motion". */
(() => {
  'use strict';
  const cv = document.getElementById('dots');
  if (!cv || !cv.getContext) return;
  const ctx = cv.getContext('2d');
  const GAP = 18, R0 = 1.05;
  const COLS = [[0, 93, 168], [126, 138, 31], [227, 38, 45]]; // phr-blue, green-700, phr-red
  const still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, dpr = 1, raf = 0, last = 0;

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    const s = t / 1000;
    for (let y = GAP / 2; y < H; y += GAP) {
      const fadeY = 1 - (y / H) * 0.55;                       // lebih terang di atas
      for (let x = GAP / 2; x < W; x += GAP) {
        // dua gelombang diagonal yang bergerak pelan
        const w1 = Math.sin(x * 0.012 + y * 0.008 - s * 0.9);
        const w2 = Math.sin(x * 0.005 - y * 0.011 + s * 0.55);
        const k = Math.max(0, (w1 + w2) / 2);                  // 0..1
        const glow = k * k * k;
        const ci = ((x / GAP | 0) + (y / GAP | 0)) % 7 === 0 ? 2 : ((x / GAP | 0) % 2 ? 0 : 1);
        if (glow > 0.18) {
          const c = COLS[ci];
          ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${(0.10 + glow * 0.42) * fadeY})`;
          ctx.beginPath(); ctx.arc(x, y, R0 + glow * 0.9, 0, 6.2832); ctx.fill();
        } else {
          ctx.fillStyle = `rgba(117,117,122,${0.16 * fadeY})`;
          ctx.fillRect(x - R0 * 0.8, y - R0 * 0.8, R0 * 1.6, R0 * 1.6);
        }
      }
    }
  }

  function loop(t) {
    raf = requestAnimationFrame(loop);
    if (t - last < 42) return;   // ±24 fps
    last = t; draw(t);
  }

  size();
  if (still) draw(0); else raf = requestAnimationFrame(loop);
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { size(); draw(performance.now()); }, 120); });
  document.addEventListener('visibilitychange', () => {
    if (still) return;
    if (document.hidden) cancelAnimationFrame(raf); else raf = requestAnimationFrame(loop);
  });
})();
