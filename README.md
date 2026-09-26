# Material You 极简波浪壁纸工坊 (Material You Wallpaper Studio)

面向高分辨率显示屏（如 Surface 3:2 2736×1824、4K、5.4K Retina）的纯前端算法驱动壁纸设计与导出工程。完全遵循 Google Material 3 / Material You 极简波浪美学，杜绝 AI 生图的杂乱噪点与失真。

---

## 🌟 核心特性

- **纯前端矢量几何计算**：基于参数化调和正弦波与旋转投影算法，保证边缘绝对平滑纯粹。
- **点对点像素输出**：预设 `2736 × 1824`（3:2 屏幕点对点匹配，告别系统低分辨率提示）、`5472 × 3648`（5.4K 超高清视网膜）、`3840 × 2160`（4K UHD）等。
- **双模态无损导出**：
  - 📥 **高清 PNG**：基于离线高精度 Canvas 渲染，零画质损失。
  - 📐 **矢量 SVG**：输出纯净 XML 矢量路径，无限放大永不失真。
- **Material You 色彩美学**：内置原版鼠尾草绿、薰衣草、冰川蓝、浅抹茶、暖暮沙、墨夜深色等自然色调，支持自定义颜色与色彩互换。
- **现代化工程化架构**：基于 Vite + 原生 ES Modules，极速构建，模块解耦，开箱即用。

---

## 📁 项目结构

```text
material-you-wallpaper/
├── index.html              # HTML5 应用入口
├── package.json            # 工程依赖与 npm 脚本
├── .npmrc                  # 包管理构建配置
├── .gitignore              # Git 忽略规则
├── public/                 # 静态资源目录
│   └── favicon.svg         # 矢量 Favicon
├── src/                    # 源码目录
│   ├── main.js             # 应用引导与视口自适应
│   ├── styles/             # 样式系统
│   │   ├── tokens.css      # Material 3 基础 Token（色阶、圆角、阴影）
│   │   ├── main.css        # 全局视口与画布容器排版
│   │   └── components.css  # 侧边栏、卡片、滑块与悬浮控制钮
│   ├── constants/          # 常量配置
│   │   ├── palettes.js     # 预设自然调色板与色彩和谐算法
│   │   └── presets.js      # 设备分辨率列表 (Surface, 4K, 2K, 手机)
│   ├── core/               # 核心算法模块
│   │   ├── geometry.js     # 旋转投影、多重谐波波浪与封闭多边形计算
│   │   ├── renderer.js     # 高精度 Canvas 绘制与离线渲染导出引擎
│   │   └── svg-exporter.js # 矢量 SVG 生成引擎
│   └── ui/                 # 交互逻辑模块
│       ├── controls.js     # 控制面板交互、滑块联动与键盘快捷键
│       └── toast.js        # 现代化消息吐司提示
└── dist/                   # 生产打包构建产物
```

---

## 🚀 快速上手与运行

### 1. 开发环境运行 (支持 HMR 热更新)
```bash
pnpm dev
# 或 npm run dev
```
打开浏览器访问控制台输出的本地服务地址（如 `http://localhost:5173/`）。

### 2. 生产打包
```bash
pnpm build
```
打包产物将输出至 `dist/` 目录，可直接用任何静态网页服务器托管。

### 3. 生产产物本地预览
```bash
pnpm preview
```

---

## ⌨️ 快捷键速查

| 快捷键 | 功能描述 |
| :--- | :--- |
| `Space (空格键)` | 随机生成全新几何形态与角度 (🎲 换一个) |
| `H` | 隐藏 / 呼出侧边栏控制面板 (纯净预览) |
| `Ctrl + S` / `Cmd + S` | 快速导出当前分辨率高清 PNG 壁纸 |

---

## 🛠️ 后续迭代路线图 (Roadmap)

1. **更多 Material 几何图案**：
   - 鹅卵石波点 (Material You Organic Pebbles)
   - 渐变立体缎带 (Fluid Gradient Ribbons)
   - 极简多重折叠 (Minimalist Paper Fold)
2. **质感着色增强**：
   - 模拟自然胶片颗粒噪点 (Subtle Film Grain Texture)
   - 双色线性/径向平滑渐变映射
3. **Linux / Hyprland 本地自动化脚本**：
   - 编写 Node/Python CLI 工具，支持终端执行直接生成壁纸并通过 `swww` 或 `hyprpaper` 换壁纸：
     `pnpm wall:apply --seed 123`
