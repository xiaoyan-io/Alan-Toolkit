# AuntHouse Blueprint Assistant

图纸辅助分析工具，支持蓝图文件导入与预览。

## 支持格式

| 格式 | 预览 | 状态 |
|------|------|------|
| SVG | 图片渲染预览 | ✅ 已完成 |
| CSV | 表格预览（前 20 行） | ✅ 已完成 |
| IFC | 元数据展示 + 待解析标识 | ✅ 已完成 |
| JSON | 格式化结构预览 | ✅ 已完成 |

## 使用

双击 `apps/aunt-house/index.html` 或通过 HTTP 服务访问。

```
python3 -m http.server 8080
# 访问 http://localhost:8080/apps/aunt-house/
```

## 功能

- 文件拖拽与选择导入
- 文件状态列表（名称、类型、大小、状态）
- 文件删除
- 类型专属预览
- 深色/浅色主题切换
