# Material You 壁纸工坊

纯前端的极简壁纸设计工具，支持波浪、圆石和等高线三种风格，适用于手机、桌面和高分辨率显示器。图片取色、绘制和导出都在本机浏览器完成。

## 功能

- **三种艺术风格**：极简波浪、有机圆石、等高纸艺；按风格展示有效参数。
- **颜色与质感**：12 组预设配色、自定义双色、随机和谐配色、渐变、微阴影和胶片颗粒。
- **图片取色**：选择或拖入本地图片，提取主色并生成有明度差的双色；透明像素和零星噪点不会主导取色。手动改色、撤销或新图片会取消旧分析，超过 20 秒提示重试，迟到结果不会覆盖当前作品。
- **可复现作品**：输入造型种子，或复制包含完整参数的分享链接。打开链接可还原同一作品。
- **自动恢复**：刷新或重新打开后恢复最近的作品和主题；分享链接优先于本地作品。存储不可用时仍可正常使用。
- **撤销与重做**：保留最近 25 个不同的作品状态；连续拖动滑块作为一次调整，重复选择不会占用历史。
- **输出尺寸**：6 种常用预设、自定义宽高和一键交换；单边最大 16384 像素，总像素不超过 6400 万。
- **PNG / SVG 导出**：共用轮廓和渐变数据，保留阴影和颗粒；PNG 按所选尺寸生成。SVG 的轮廓保持矢量，启用颗粒时内嵌小型位图纹理。不同浏览器或 SVG 查看器的阴影、混合效果可能略有差异。
- **后台 PNG 导出**：支持的浏览器使用 Worker 和 OffscreenCanvas，高分辨率生成时可继续编辑；提供生成 / 编码状态和取消操作。缺少后台画布支持时自动使用兼容路径，两种路径长时间未完成均提示重试并恢复按钮。
- **图片剪贴板**：在支持图片剪贴板的浏览器中直接复制 PNG；需要安全上下文和相应权限。
- **桌面挂件预览**：时钟、当前日期和 Dock 覆盖层，用于检查壁纸效果；不会加入导出图片。
- **移动端与键盘操作**：触摸手机 / 平板横竖屏均保留底部抽屉，窄屏支持完整编辑和导出；焦点约束、隐藏控件不参与 Tab 导航、减少动态效果偏好、可缩放页面。
- **界面配色**：随作品主色变化，修正按钮、标签文字和输入边框的对比度；深浅主题切换避免文字和背景同时渐变造成的闪烁。

图片最大 40 MB。所有字体均随站点提供，无需访问外部字体服务；字体许可证见 [public/fonts](public/fonts/README.md)。

## 快捷键

| 快捷键 | 操作 |
| --- | --- |
| `Space` | 随机造型（聚焦按钮时保留按钮的原生操作） |
| `M` | 切换挂件预览 |
| `H` | 展开 / 收起设置 |
| `Esc` | 关闭设置或分享弹窗 |
| `Ctrl/Cmd + Z` | 撤销 |
| `Ctrl/Cmd + Shift + Z` | 重做 |
| `Ctrl + Y` | 重做 |
| `Ctrl/Cmd + C` | 复制图片（选中文本时保留文本复制） |
| `Ctrl/Cmd + S` | 下载 PNG |

文本 / 数值输入中的按键留给原生输入操作；滑块和材质开关聚焦时仍支持作品撤销。分享弹窗打开时暂停作品快捷键。

## 开发与验证

需要 Node.js 22 或更新版本，以及 pnpm。

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm build
pnpm preview
```

首次运行浏览器测试时安装 Chromium：

```bash
pnpm exec playwright install chromium
pnpm test          # 核心逻辑与状态回归测试
pnpm test:browser  # 真实浏览器中的渲染、导出、交互和布局测试
pnpm test:production # 生产构建与子目录部署冒烟测试
pnpm check        # 全部测试与生产构建
pnpm exec playwright install firefox
pnpm test:firefox  # 可选的 Firefox 回归
```

本机存在 `/usr/bin/chromium` 时会自动使用；也可通过 `PLAYWRIGHT_CHROMIUM_EXECUTABLE` 指定浏览器路径。CI 会安装 Playwright 配套 Chromium。

本地浏览器测试默认串行运行，CI 默认并发 2。Firefox 和 WebKit 的完整组合通过 `pnpm test:cross-browser` 在 CI 检查；CI 使用 `playwright install --with-deps chromium firefox webkit` 安装系统依赖。Chromium 剪贴板测试读回系统 PNG；Linux 无头 Firefox / WebKit 检查原生写入成功及传入的 PNG 尺寸，未验证系统图片读回。

触摸横屏用例使用 Chromium / WebKit 的移动设备模拟；[Playwright 不支持 Firefox 的移动视口模拟](https://playwright.dev/docs/api/class-browser#browser-new-context-option-is-mobile)，因此 Firefox 跳过这两项用例，其余响应式布局测试照常运行。

高分辨率导出测量：启动开发服务后运行 `node scripts/benchmark-export.mjs`。通过 `WALLPAPER_BENCHMARK_URL` 指定地址、`WALLPAPER_BENCHMARK_BROWSER` 选择浏览器。测量条件及前后结果见 [导出性能记录](docs/benchmarks/README.md)。

字体更新工具：`python3 scripts/update-fonts.py`。添加新图标时同步更新其中的图标列表。

## 代码结构

```text
src/
├── constants/        # 配色和输出预设
├── core/
│   ├── modes/        # 三种模式的几何生成
│   ├── scene.js      # 共用场景与参数检查
│   ├── path.js       # Canvas / SVG 共用路径
│   ├── renderer.js   # 渲染与导出入口
│   ├── canvas-renderer.js # DOM / OffscreenCanvas 共用绘制
│   ├── png-export.js # 异步导出、取消与兼容路径
│   ├── png-worker.js # 后台生成与编码
│   ├── svg-exporter.js
│   ├── effects.js    # 可复现颗粒与渐变
│   ├── state.js      # 作品快照和输入校验
│   ├── validation.js # 共用参数与尺寸规则
│   ├── monet.js      # 主题配色与对比度调整
│   ├── session.js    # 本地恢复与分享链接
│   ├── history.js
│   ├── extractor.js  # 图片取色
│   ├── layout.js     # 比例适配与预览像素限制
│   └── color.js      # 共用颜色转换
├── ui/               # 控件、配色 / 图片导入、导出任务、面板焦点、通知和挂件
└── styles/
tests/
├── unit/
└── browser/
```

GitHub Actions 在推送 `main` 时先运行单元测试、Chromium / Firefox / WebKit 回归测试和生产构建，再部署到 GitHub Pages。构建使用相对资源路径，支持仓库子目录部署，生产检查覆盖 PNG Worker 资源地址。

持续优化进展记录在 [docs/WORK_LOG.md](docs/WORK_LOG.md)。
主题配色的修复原因、测量和验证范围见 [docs/THEME_CONTRAST.md](docs/THEME_CONTRAST.md)。
