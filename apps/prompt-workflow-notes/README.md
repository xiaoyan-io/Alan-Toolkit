# AI 指令流程笔记

保存和管理常用 AI 指令、提示词、操作步骤和工作流程。

## 功能

- 搜索、分类筛选、标签筛选
- 收藏与最近使用追踪
- 一键复制提示词
- 新建 / 编辑 / 删除笔记
- 导入 / 导出用户数据 JSON
- 预设示例笔记（8 条覆盖全分类）

## 使用

双击 `index.html` 或通过 HTTP 服务访问：

```bash
python3 -m http.server 8080
# 访问 http://localhost:8080/apps/prompt-workflow-notes/
```

## 分类

| 分类 | 描述 |
|------|------|
| AI 对话提示词 | 通用 AI 交互提示词模板 |
| OpenCode / Codex | OpenCode 开发指令 |
| Plan → Build 工作流 | 项目实施工作流模板 |
| Git / GitHub | Git 操作流程 |
| Termux | Termux 移动端操作 |
| AuntHouse | AuntHouse 图纸工具流程 |
| M&E / Solar | 机电 / 太阳能项目模板 |
| 图片生成 | AI 图片生成提示词 |

## 数据

- 预设数据：`data/notes.json`
- 用户数据：localStorage（`pwn_user_notes`、`pwn_favorites`、`pwn_last_used`）
- 支持导出/导入 JSON 备份
