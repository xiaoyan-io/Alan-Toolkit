# Alan-Toolkit AI 开发指南

## 项目规范

- **语言**：纯 HTML/CSS/JS，零外部依赖
- **主题**：CSS 变量位于 `assets/variables.css`，通过 `style.css` 的 `@import` 全局共享
- **数据**：工具预设数据在 `assets/data/tools.json`，JS 通过 fetch 加载，file:// 协议下使用 fallback
- **存储**：用户自定义工具和主题偏好使用 localStorage

## 文件操作约束

- **不改** `index.html` / `style.css` / `script.js` 的现有功能
- **子页面**在对应目录下创建，引用 `../style.css` 获取主题变量和基础样式
- **新工具**复制 `tools/template/`，**新应用**复制 `apps/template/`

## 验证命令

```bash
# 检查 JS 语法
node --check script.js

# 检查 JSON 格式
python3 -m json.tool assets/data/tools.json > /dev/null

# 检查文件完整性
ls -la assets/variables.css assets/data/tools.json

# 检查路径引用
grep -rn 'href=".*style\.css"' *.html */index.html */template/index.html
grep -rn 'src=".*script\.js"' *.html */index.html */template/index.html
```
