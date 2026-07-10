# Alan-Toolkit 文档

## 目录结构

```
alan-toolkit/
├── index.html         主页导航
├── style.css          全局样式（@import assets/variables.css）
├── script.js          主页交互（fetch + fallback）
├── assets/
│   ├── variables.css  主题变量（light/dark）
│   ├── data/
│   │   └── tools.json 预设工具数据
│   ├── icons/
│   └── images/
├── dashboard/         仪表盘
├── tools/             独立工具
│   └── template/      工具模板
├── apps/              小型应用
│   └── template/      应用模板
└── docs/              项目文档
```

## 开发指南

- 纯静态，零依赖，直接双击 `index.html` 或通过 HTTP 服务器访问
- 文件协议下自动使用内置 fallback 数据，不发起 fetch
- CSS 变量集中在 `assets/variables.css`，全局共享
- 子页面引用 `style.css` 时自动引入变量
