# 高分辨率 PNG 导出测量

2026-10-05，本机 Linux / Chromium 153.0.8010.52 无头浏览器，输出 5472 × 3648（约 2000 万像素），层数 6。每组测量一次，总耗时包括绘制和 PNG 编码；最长帧间隔由主页面 `requestAnimationFrame` 记录。数值受机器、浏览器、并发负载和首次启动影响，不作为所有设备的性能承诺。

| 模式 | 材质 | 原总耗时 ms | 后台导出 ms | 原最长帧间隔 ms | 后台最长帧间隔 ms |
| --- | --- | ---: | ---: | ---: | ---: |
| 波浪 | 无 | 659 | 197 | 133 | 83 |
| 波浪 | 全部 | 2697 | 2368 | 1550 | 33 |
| 圆石 | 无 | 110 | 120 | 33 | 17 |
| 圆石 | 全部 | 1531 | 1310 | 550 | 17 |
| 等高线 | 无 | 135 | 161 | 50 | 17 |
| 等高线 | 全部 | 2963 | 2721 | 1817 | 17 |

后台导出主要改善编辑界面的响应。六组输出的 PNG 字节大小前后一致；独立浏览器回归还将三个模式、横纵比例的后台和主线程输出逐像素比较，要求 RGBA 完全相同。

原始数据：[优化前](export-before-worker.json)、[优化后](export-after-worker.json)。

复现：

```bash
pnpm dev --host 127.0.0.1 --port 4174 --strictPort
# 另一个终端
node scripts/benchmark-export.mjs /tmp/export-report.json
```

默认地址是 `http://127.0.0.1:4174`，可用 `WALLPAPER_BENCHMARK_URL` 覆盖。`WALLPAPER_BENCHMARK_BROWSER` 可选 `chromium`、`firefox`、`webkit`，浏览器需先安装。
