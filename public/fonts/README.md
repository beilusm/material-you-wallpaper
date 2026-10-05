# 本地字体资源

- Material Symbols Rounded：Google Material Symbols，Apache License 2.0。
- Plus Jakarta Sans：Google Fonts，SIL Open Font License 1.1；仅包含拉丁字形，中文沿用系统字体。
- 已包含各自许可证全文。图标保留 FILL 0–1、wght 400–500、opsz 20–24；只下载项目使用的图标。
- 通过 `python3 scripts/update-fonts.py` 从官方 Google Fonts CSS API 更新。添加新图标时同步更新脚本中的 `ICONS`。
- 页面只请求同源字体，不依赖字体 CDN 的可访问性。
