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

## KSWEB 部署

通过 KSWEB（Lighttpd）在 Android 手机上提供 HTTP 服务。

| 项目 | 路径 |
|------|------|
| 开发目录 | `/storage/emulated/0/Code/Alan-Toolkit` |
| 部署目录 | `/storage/emulated/0/htdocs/Alan-Toolkit` |
| 部署命令 | `bash scripts/deploy-ksweb.sh` |
| 检查命令 | `bash scripts/check-ksweb-deploy.sh` |

### 本机访问

```
http://localhost:8080/Alan-Toolkit/
http://localhost:8080/Alan-Toolkit/apps/prompt-workflow-notes/
http://localhost:8080/Alan-Toolkit/apps/aunt-house/
```

### 局域网访问

```
http://192.168.x.x:8080/Alan-Toolkit/
```

将 `192.168.x.x` 替换为设备的实际局域网 IP。

### 注意事项

- KSWEB Lighttpd 必须保持运行状态
- 修改项目文件后需要重新执行 `bash scripts/deploy-ksweb.sh`
- 部署脚本仅同步文件到部署目录，不会删除开发目录中的任何文件
- 部署目录中已不存在于源项目的文件会被自动清理（`--delete`）

## 目录

| 目录 | 用途 |
|------|------|
| `assets/` | 共享资源（CSS 变量、数据、图标、图片） |
| `dashboard/` | 个人仪表盘 |
| `tools/` | 独立工具（含 template） |
| `apps/` | 小型应用（含 template） |
| `scripts/` | 开发工具脚本 |
| `docs/` | 项目文档 |
