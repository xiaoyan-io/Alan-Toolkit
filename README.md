# Alan-Toolkit

个人工具导航与功能平台。

## 功能

- 工具导航主页（搜索、分类、自定义添加、删除）
- 深色/浅色主题切换（localStorage 持久化）
- 仪表盘、工具集、应用中心子页面
- 纯静态，零外部依赖，双击即用

## 使用

```bash
# 方式一：直接双击 index.html（file:// 协议）
# 方式二：启动本地 HTTP 服务器
python3 -m http.server 8080
# 访问 http://localhost:8080
```

## 开发

```bash
# 编辑 assets/data/tools.json 后，同步到 script.js 离线数据
node scripts/sync-tools-fallback.js
```

## 目录

| 目录 | 用途 |
|------|------|
| `assets/` | 共享资源（CSS 变量、数据、图标、图片） |
| `dashboard/` | 个人仪表盘 |
| `tools/` | 独立工具（含 template） |
| `apps/` | 小型应用（含 template） |
| `scripts/` | 开发工具脚本 |
| `docs/` | 项目文档 |
