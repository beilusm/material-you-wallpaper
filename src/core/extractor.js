/**
 * 从用户上传的图片中智能提取 Material You 极简双色搭配
 */
export function extractPaletteFromImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const sampleCanvas = document.createElement('canvas');
        const sampleSize = 100;
        sampleCanvas.width = sampleSize;
        sampleCanvas.height = sampleSize;
        const sCtx = sampleCanvas.getContext('2d');
        sCtx.drawImage(img, 0, 0, sampleSize, sampleSize);

        const imgData = sCtx.getImageData(0, 0, sampleSize, sampleSize).data;
        const colorBuckets = [];

        // 采样并计算亮度与饱和度
        for (let i = 0; i < imgData.length; i += 16) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          // 排除极黑和纯白
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          if (lum > 20 && lum < 245) {
            colorBuckets.push({ r, g, b, lum });
          }
        }

        if (colorBuckets.length === 0) {
          return resolve({ c1: '#b2ccc1', c2: '#e7f2ed' });
        }

        // 按亮度排序
        colorBuckets.sort((a, b) => a.lum - b.lum);

        // 选取较深主体色与较浅衬底色
        const darkSample = colorBuckets[Math.floor(colorBuckets.length * 0.25)];
        const lightSample = colorBuckets[Math.floor(colorBuckets.length * 0.85)];

        const toHex = (c) => '#' + [c.r, c.g, c.b].map(x => x.toString(16).padStart(2, '0')).join('');

        resolve({
          c1: toHex(darkSample),
          c2: toHex(lightSample)
        });
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
