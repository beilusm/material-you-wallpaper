/**
 * 伪随机数生成器 (基于 Lehmer LCG 算法，确保相同 seed 时造型确定复现)
 */
export function createRNG(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * 为每道波浪生成独特的相位、微频差与振幅扰动
 */
export function generateWaveParameters(seed, maxBands = 10) {
  const rng = createRNG(seed);
  const params = [];
  for (let i = 0; i < maxBands; i++) {
    params.push({
      p1: rng() * Math.PI * 2,
      p2: rng() * Math.PI * 2,
      p3: rng() * Math.PI * 2,
      f1Ratio: 0.92 + rng() * 0.16,
      f2Ratio: 1.85 + rng() * 0.3,
      ampVariance: 0.85 + rng() * 0.3
    });
  }
  return params;
}

/**
 * 计算单条分割边界曲线及闭合多边形顶点
 */
export function calculateBandPolygon({
  index,
  totalBands,
  width,
  height,
  angleDeg,
  curvature,
  harmonics,
  waveParam,
  steps = 140
}) {
  const rad = (angleDeg * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);

  // 切线 (沿波浪流动方向) 与法线 (垂直分割方向)
  const tx = cosA, ty = sinA;
  const nx = -sinA, ny = cosA;

  const cx = width / 2;
  const cy = height / 2;

  // 旋转边界包围框投影范围
  const Ln = Math.abs(width * sinA) + Math.abs(height * cosA);
  const Lt = Math.abs(width * cosA) + Math.abs(height * sinA);

  const S_max = Lt * 0.75;
  const D_max = Ln * 0.75;

  const baseAmp = Ln * 0.12 * curvature;
  const d_nom = -Ln / 2 + (index * Ln) / totalBands;

  const pts = [];

  for (let sIdx = 0; sIdx <= steps; sIdx++) {
    const s = -S_max + (sIdx * (2 * S_max)) / steps;
    const u = s / Lt;

    let offset = baseAmp * waveParam.ampVariance * Math.sin(2 * Math.PI * harmonics * waveParam.f1Ratio * u + waveParam.p1);
    if (harmonics >= 2) {
      offset += (baseAmp * 0.32) * Math.sin(2 * Math.PI * 2 * waveParam.f2Ratio * u + waveParam.p2);
    }
    if (harmonics >= 3) {
      offset += (baseAmp * 0.14) * Math.sin(2 * Math.PI * 3 * u + waveParam.p3);
    }

    const d = d_nom + offset;
    const px = cx + s * tx + d * nx;
    const py = cy + s * ty + d * ny;
    pts.push({ x: px, y: py });
  }

  // 闭合外部顶点
  const p_c1 = { x: cx + S_max * tx + D_max * nx, y: cy + S_max * ty + D_max * ny };
  const p_c2 = { x: cx - S_max * tx + D_max * nx, y: cy - S_max * ty + D_max * ny };

  return {
    curvePoints: pts,
    closingPoints: [p_c1, p_c2],
    polygon: [...pts, p_c1, p_c2],
    nx,
    ny,
    Ln
  };
}
