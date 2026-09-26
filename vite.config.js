import { defineConfig } from 'vite';

export default defineConfig({
  // 使用相对路径 base，确保在 GitHub Pages 的二级目录 (https://<username>.github.io/<repo>/) 下资源加载正常
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
});
