export const MAX_OUTPUT_DIMENSION = 16384;
export const MAX_OUTPUT_PIXELS = 64000000;
export const MAX_SEED = 2147483646;

const renderRules = {
  bandCount: [2, 10, true], angle: [-360, 360, false], curvature: [0, 1, false],
  harmonics: [1, 3, true], grain: [0, 0.25, false], seed: [0, MAX_SEED, true]
};
// Editable snapshots match the controls; the drawing API retains its wider numeric ranges.
const snapshotRules = {
  ...renderRules, bandCount: [2, 6, true], angle: [-85, 85, true], curvature: [0.1, 0.9, false]
};
const labels = {
  bandCount: '层数', angle: '方向角度', curvature: '形状起伏',
  harmonics: '起伏频次', grain: '颗粒强度', seed: '造型种子'
};

export function validateDimensions(width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
      width > MAX_OUTPUT_DIMENSION || height > MAX_OUTPUT_DIMENSION || width * height > MAX_OUTPUT_PIXELS) {
    throw new RangeError('输出尺寸必须为正整数，单边不超过 16384 像素，总像素不超过 6400 万');
  }
}

export function validateArtworkParameters(value, { editable = false } = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('作品数据格式无效');
  if (!['waves', 'pebbles', 'topography'].includes(value.artMode)) throw new TypeError('未知艺术形态');
  if (![value.color1, value.color2].every(color => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color))) {
    throw new TypeError('作品颜色必须使用六位十六进制色值');
  }
  if (typeof value.hasShadow !== 'boolean' || typeof value.useGradient !== 'boolean') throw new TypeError('无效材质参数');
  for (const [key, [min, max, integer]] of Object.entries(editable ? snapshotRules : renderRules)) {
    const n = value[key];
    if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) {
      throw new RangeError(`${labels[key]}超出可用范围${integer ? '或不是整数' : ''}`);
    }
  }
}
