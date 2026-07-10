/* ════════════════════════════════════════
   State
   ════════════════════════════════════════ */
const state = {
  notes: [],
  filtered: [],
  allTags: [],
  activeCategory: 'all',
  activeTags: [],
  searchQuery: '',
  sortBy: 'updated',
  page: 0,
  pageSize: 50,
  maxRender: 200,
  selectedNote: null,
  editNoteId: null,
  tagPanelOpen: false,
  moreMenuOpen: false,
};

const LS_KEYS = {
  userNotes: 'pwn_user_notes',
  favorites: 'pwn_favorites',
  lastUsed: 'pwn_last_used',
};

const CATEGORIES = [
  { id: 'ai-prompts', label: 'AI 对话提示词', icon: '🤖' },
  { id: 'opencode', label: 'OpenCode / Codex', icon: '⚡' },
  { id: 'plan-build', label: 'Plan → Build 工作流', icon: '📋' },
  { id: 'git', label: 'Git / GitHub', icon: '🐙' },
  { id: 'termux', label: 'Termux', icon: '📱' },
  { id: 'aunt-house', label: 'AuntHouse', icon: '🏗️' },
  { id: 'me-solar', label: 'M&E / Solar', icon: '🔌' },
  { id: 'image-gen', label: '图片生成', icon: '🎨' },
];

const CATEGORY_MAP = {};
CATEGORIES.forEach(function (c) { CATEGORY_MAP[c.id] = c; });

/* ════════════════════════════════════════
   Fallback Data (sync with data/notes.json)
   ════════════════════════════════════════ */
const fallbackNotes = [
  {
    id: 'preset_plan_build',
    title: 'OpenCode Plan → Build 标准工作流',
    category: 'plan-build',
    tags: ['workflow', 'opencode', 'dev', 'template'],
    summary: '适用于大多数软件项目的 OpenCode 开发工作流，先规划后实施，每步验证。',
    prompt: '请分析当前项目结构，规划实施方案。目标：[描述目标]\n\n步骤：\n1. 使用 glob 和 grep 工具全面分析项目结构\n2. 输出实施计划，包含：\n   - 数据模型\n   - 页面改动\n   - 文件改动\n   - 实施步骤\n   - 验证方案\n   - 风险点\n3. 等待我确认后再开始实施\n4. 实施时每个功能独立完成并验证\n5. 完成后运行 lint/typecheck 验证',
    steps: ['1. 使用 task 工具分析项目，返回完整上下文', '2. 输出 plan 等待确认', '3. 逐功能实施，每个功能完成后运行验证命令', '4. 最终运行 node --check + 完整测试', '5. 提交前检查 git diff 确保无意外修改'],
    notes: '对大项目先用 explore 子代理分析结构，避免上下文溢出。Plan 必须包含回滚方案。',
    favorite: true,
    lastUsed: null,
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-05T10:00:00.000Z',
  },
  {
    id: 'preset_git_flow',
    title: 'Git 常用提交与推送流程',
    category: 'git',
    tags: ['git', 'github', 'workflow', 'version-control'],
    summary: '标准 Git 操作流程：查看状态 → 暂存 → 提交 → 推送，包含常见场景。',
    prompt: '执行以下 Git 操作流程：\n\n1. 检查状态\n   git status\n2. 查看变更\n   git diff\n3. 暂存意图中的文件\n   git add <file1> <file2>\n   或全部暂存：git add .\n4. 提交（commit 信息使用简洁英文或中文）\n   git commit -m "feat: 添加功能X"\n5. 查看提交记录确认\n   git log --oneline -5\n6. 推送\n   git push\n\n常用 commit 前缀：feat / fix / refactor / docs / chore / style',
    steps: ['git status 查看当前状态', 'git diff 审查具体变更', 'git add <file> 暂存目标文件', 'git commit -m "type: 描述" 提交', 'git log --oneline -5 确认提交', 'git push 推送到远程'],
    notes: '不要在 commit 信息中使用 emoji。推送前务必 git diff 确认没有意外包含敏感信息。',
    favorite: true,
    lastUsed: null,
    createdAt: '2026-07-02T09:00:00.000Z',
    updatedAt: '2026-07-06T14:00:00.000Z',
  },
  {
    id: 'preset_termux_setup',
    title: 'Termux 进入项目并启动 OpenCode',
    category: 'termux',
    tags: ['termux', 'android', 'opencode', 'setup'],
    summary: '在 Termux 中导航到项目目录并启动 OpenCode 开发会话。',
    prompt: '在 Termux 中执行以下操作进入项目并启动开发环境：\n\n1. 进入项目目录\n   cd /storage/emulated/0/Code/你的项目名\n\n2. 检查目录内容\n   ls -la\n\n3. 启动 OpenCode（如果已安装）\n   opencode\n\n4. 如果 opencode 命令不存在，使用 node 直接运行\n   npx opencode\n   或 node /path/to/opencode\n\n5. 常用工具命令：\n   - node --check script.js   # JS 语法检查\n   - python3 -m json.tool data.json > /dev/null  # JSON 验证\n   - ls -la apps/              # 查看所有应用\n\n6. 启动 HTTP 服务测试\n   python3 -m http.server 8080',
    steps: ['cd /storage/emulated/0/Code/项目名', 'ls -la 确认目录结构', 'opencode 或 npx opencode 启动', '进行开发工作', 'python3 -m http.server 8080 启动测试服务', '浏览器访问 http://localhost:8080 测试'],
    notes: 'Termux 后台运行时间过长可能被系统杀死。建议使用 tmux 或 screen 保持会话。',
    favorite: false,
    lastUsed: null,
    createdAt: '2026-07-02T10:00:00.000Z',
    updatedAt: '2026-07-04T16:00:00.000Z',
  },
  {
    id: 'preset_clarify_prompt',
    title: 'AI 模糊需求澄清提示词',
    category: 'ai-prompts',
    tags: ['ai', 'prompt-engineering', 'clarification', 'chatgpt'],
    summary: '当需求不明确时，用此提示词引导 AI 主动澄清需求细节，避免盲目开发。',
    prompt: '你是一个资深需求分析师。我需要你帮我明确以下需求。\n\n我的初步需求是：[在此描述模糊需求]\n\n请按以下结构分析：\n\n1. 需求理解 — 用两句话总结你理解的我的需求\n2. 关键假设 — 列出 3-5 个你不得不做的假设\n3. 澄清问题 — 提出 5-10 个帮助明确需求的具体问题\n4. 建议方案 — 基于常见情况给出 2-3 种可能的实现方向\n5. 优先级建议 — 哪些是 MVP 必须的，哪些可以后续迭代\n\n在确认所有细节之前，不要给出具体代码或实现方案。',
    steps: ['用 1-2 句话描述你的模糊需求', '粘贴此提示词并替换需求描述', '阅读 AI 的澄清问题和假设', '逐一回答澄清问题', '确认需求文档后开始实施'],
    notes: '对于极简单的需求（< 10 个字），不需要用此提示词，直接描述即可。对于大型项目，建议先用此提示词明确范围。',
    favorite: true,
    lastUsed: null,
    createdAt: '2026-07-01T07:00:00.000Z',
    updatedAt: '2026-07-03T12:00:00.000Z',
  },
  {
    id: 'preset_analyze_prompt',
    title: '项目文件分析提示词',
    category: 'ai-prompts',
    tags: ['ai', 'analysis', 'code-review', 'opencode'],
    summary: '用于分析现有代码文件或项目结构的通用提示词模板。',
    prompt: '请全面分析以下文件/项目，按以下结构输出：\n\n## 文件列表\n列出所有相关文件及其行数\n\n## 核心架构\n- 使用的模式（MVC、组件化等）\n- 数据流\n- 关键依赖\n\n## 每个文件分析\n### [文件名]\n- 用途：一句话说明\n- 关键函数/类：\n  - functionName() — 作用\n- 潜在问题：\n\n## 改进建议\n1. 可读性改进\n2. 性能优化\n3. 安全风险\n\n## 总结\n整体评价 + 建议优先级',
    steps: ['使用 glob 工具找到目标文件', '读取文件内容', '粘贴此提示词并将文件内容附在后面', '审阅 AI 的分析结果', '标记需要修复的问题'],
    notes: '对于大文件（> 500 行），建议逐个文件分析而非一次全部输入。对于 OpenCode，可以直接使用 read 工具获取文件内容。',
    favorite: false,
    lastUsed: null,
    createdAt: '2026-07-01T09:00:00.000Z',
    updatedAt: '2026-07-05T08:00:00.000Z',
  },
  {
    id: 'preset_image_gen',
    title: '图片生成提示词模板',
    category: 'image-gen',
    tags: ['ai', 'image-generation', 'midjourney', 'stable-diffusion', 'dalle'],
    summary: '通用图片生成提示词模板，支持 Midjourney / DALL-E / Stable Diffusion。',
    prompt: '请生成一张图片：\n\n主题：[描述主题]\n风格：[写实 / 卡通 / 油画 / 水彩 / 赛博朋克 / 极简] \n色调：[暖色 / 冷色 / 单色 / 鲜艳 / 柔和]\n构图：[特写 / 全景 / 中心构图 / 三分法 / 俯视 / 仰视]\n灯光：[自然光 / 戏剧光 / 背光 / 霓虹灯 / 柔光]\n\n参考艺术家：[可选：宫崎骏 / Moebius / 山水画风等]\n\n负面提示词（不希望出现的内容）：\n[模糊 / 变形 / 多余肢体 / 文字等]',
    steps: ['确定图片用途和风格方向', '填写主题、风格、色调、构图等参数', '选择参考艺术家（可选）', '指定负面提示词', '根据生成结果迭代调整'],
    notes: '不同的 AI 图片工具对提示词的敏感度不同。Midjourney 偏好简短关键词，DALL-E 接受自然语言描述。如未达到预期，尝试简化提示词。',
    favorite: false,
    lastUsed: null,
    createdAt: '2026-07-03T11:00:00.000Z',
    updatedAt: '2026-07-03T11:00:00.000Z',
  },
  {
    id: 'preset_aunt_house_flow',
    title: 'AuntHouse CSV 墙体分析流程',
    category: 'aunt-house',
    tags: ['aunt-house', 'csv', 'wall-analysis', 'blueprint'],
    summary: '使用 AuntHouse 工具分析 CSV 墙体数据的完整操作流程。',
    prompt: '使用 AuntHouse Blueprint Assistant 分析墙体数据：\n\n1. 打开应用\n   双击 apps/aunt-house/index.html 或用 HTTP 服务访问\n\n2. 导入 CSV 文件\n   拖拽 AuntHouse_wall_coordinates.csv 到导入区域\n   或点击「选择文件」按钮\n\n3. 查看验证结果\n   - 检查墙体总数、有效数、无效数、重复 Wall_ID\n   - 查看缺失坐标统计\n   - 确认分隔符识别是否正确\n\n4. 浏览墙体数据\n   - 使用搜索功能按 Wall_ID 查找\n   - 使用筛选功能查看有效/无效墙体\n   - 点击行查看墙体详情\n\n5. 可视化预览\n   - 切换到 SVG 画布查看墙体布局\n   - 点击表格行高亮对应墙体\n\n6. 导出报告\n   点击「导出验证报告 JSON」保存分析结果',
    steps: ['启动 AuntHouse 应用（双击 index.html 或 HTTP 服务）', '拖拽 CSV 文件到导入区', '查看验证摘要统计', '使用搜索和筛选浏览墙体数据', '切换到 SVG 画布查看可视化', '导出验证报告 JSON'],
    notes: 'CSV 文件必须包含 Wall_ID、Start_X、Start_Y、End_X、End_Y 等必要字段。支持的数值单位：mm、cm、m（自动转换为 mm）。',
    favorite: false,
    lastUsed: null,
    createdAt: '2026-07-04T15:00:00.000Z',
    updatedAt: '2026-07-06T09:00:00.000Z',
  },
  {
    id: 'preset_opencode_customize',
    title: 'OpenCode 自定义配置指南',
    category: 'opencode',
    tags: ['opencode', 'configuration', 'setup', 'agients'],
    summary: '配置 OpenCode 的 AGENTS.md 和自定义指令，优化 AI 助手行为。',
    prompt: '请帮我配置 OpenCode 以更好地适应我的项目：\n\n1. 创建/编辑 AGENTS.md\n   在项目根目录创建 AGENTS.md 文件，包含：\n   - 项目技术栈和框架\n   - 代码风格约定\n   - 测试命令（lint、typecheck、test）\n   - 目录结构说明\n   - 命名规范\n\n2. 配置 opencode.json（可选）\n   - 自定义快捷指令\n   - 设置代理行为偏好\n\n3. 编写技巧\n   - 每次任务开始时让 AI 先分析项目结构\n   - 明确告诉 AI 什么不能改（如 index.html 现有功能）\n   - 使用子代理处理大规模任务\n   - 分步确认制：Plan → Confirm → Build → Verify\n\n4. 可用子代理类型\n   - explore：快速探索代码库\n   - general：通用多步骤任务',
    steps: ['在项目根目录创建 AGENTS.md', '写入项目规范和验证命令', '测试：让 AI 执行一次简单任务确认配置生效', '根据实际使用反馈迭代优化 AGENTS.md'],
    notes: 'AGENTS.md 中的验证命令必须真实可用。使用 node --check 而不是 node --check script.js 如果项目包含多个 JS 文件。',
    favorite: false,
    lastUsed: null,
    createdAt: '2026-07-02T14:00:00.000Z',
    updatedAt: '2026-07-05T16:00:00.000Z',
  },
  {
    id: 'preset_me_solar_flow',
    title: 'M&E / Solar 项目实施模板',
    category: 'me-solar',
    tags: ['me', 'solar', 'project', 'template', 'engineering'],
    summary: 'M&E（机械与电气）/ Solar 项目的标准实施步骤模板。',
    prompt: '请按以下结构规划 M&E / Solar 项目实施：\n\n## 项目概述\n- 项目名称\n- 项目规模\n- 关键里程碑\n\n## 设计阶段\n1. 需求分析\n   - 现场勘查数据\n   - 负载计算\n   - 系统拓扑设计\n\n2. 图纸设计\n   - 平面布局图\n   - 单线图\n   - 接线图\n   - 设备清单\n\n## 采购阶段\n- 设备选型标准\n- 供应商评估\n- 采购订单管理\n\n## 实施阶段\n1. 基础施工\n2. 设备安装\n3. 布线接线\n4. 系统调试\n\n## 验收阶段\n- 功能测试\n- 安全测试\n- 文档归档\n\n## 运维阶段\n- 定期巡检计划\n- 故障处理流程',
    steps: ['收集项目需求和现场数据', '完成系统设计和设备选型', '生成图纸和 BOM 清单', '采购与施工并行推进', '系统调试和功能验证', '交付文档和运维培训'],
    notes: '安全是所有阶段的第一优先级。所有电气工作必须符合当地规范。建议使用项目管理工具跟踪每个阶段进度。',
    favorite: false,
    lastUsed: null,
    createdAt: '2026-07-03T13:00:00.000Z',
    updatedAt: '2026-07-06T11:00:00.000Z',
  },
];

/* ════════════════════════════════════════
   Utility
   ════════════════════════════════════════ */
function esc(s) {
  if (s == null) return '';
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function toast(msg) {
  var el = document.getElementById('toast');
  el.textContent = msg;
  el.style.display = '';
  setTimeout(function () { el.style.display = 'none'; }, 2500);
}

function confirmDialog(msg) {
  return new Promise(function (resolve) {
    var overlay = document.getElementById('confirmOverlay');
    var message = document.getElementById('confirmMessage');
    var yes = document.getElementById('confirmYes');
    var no = document.getElementById('confirmNo');
    message.textContent = msg;
    overlay.style.display = '';

    function cleanup() {
      overlay.style.display = 'none';
      yes.removeEventListener('click', onYes);
      no.removeEventListener('click', onNo);
    }

    function onYes() { cleanup(); resolve(true); }
    function onNo() { cleanup(); resolve(false); }

    yes.addEventListener('click', onYes);
    no.addEventListener('click', onNo);
  });
}

function debounce(fn, ms) {
  var timer = null;
  return function () {
    var ctx = this, args = arguments;
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () { fn.apply(ctx, args); timer = null; }, ms);
  };
}

function isPreset(id) { return id.indexOf('preset_') === 0; }

function nowISO() { return new Date().toISOString(); }

/* ════════════════════════════════════════
   Data Layer
   ════════════════════════════════════════ */
function loadLocalData() {
  var data = {};
  try {
    data.userNotes = JSON.parse(localStorage.getItem(LS_KEYS.userNotes)) || [];
    data.favorites = JSON.parse(localStorage.getItem(LS_KEYS.favorites)) || {};
    data.lastUsed = JSON.parse(localStorage.getItem(LS_KEYS.lastUsed)) || {};
  } catch (e) {
    data = { userNotes: [], favorites: {}, lastUsed: {} };
  }
  return data;
}

function saveUserNotes(notes) {
  try {
    localStorage.setItem(LS_KEYS.userNotes, JSON.stringify(notes));
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      toast('存储空间不足，请导出数据后清理');
    } else {
      toast('保存失败: ' + e.message);
    }
  }
}

function saveFavorites(fav) {
  try { localStorage.setItem(LS_KEYS.favorites, JSON.stringify(fav)); } catch (e) {}
}

function saveLastUsed(lu) {
  try { localStorage.setItem(LS_KEYS.lastUsed, JSON.stringify(lu)); } catch (e) {}
}

function mergeNotes(presets, local) {
  var map = {};
  presets.forEach(function (n) { map[n.id] = n; });
  local.forEach(function (n) { map[n.id] = n; });
  var result = Object.keys(map).map(function (id) { return map[id]; });

  var localData = loadLocalData();
  var favs = localData.favorites;
  var used = localData.lastUsed;

  result.forEach(function (n) {
    if (favs[n.id]) n.favorite = true;
    else if (isPreset(n.id)) n.favorite = false;
    if (used[n.id]) n.lastUsed = used[n.id];
  });

  return result;
}

function getAllTags(notes) {
  var set = {};
  notes.forEach(function (n) {
    if (n.tags && Array.isArray(n.tags)) {
      n.tags.forEach(function (t) { set[t.toLowerCase()] = true; });
    }
  });
  return Object.keys(set).sort();
}

function updateLastUsed(noteId) {
  var localData = loadLocalData();
  localData.lastUsed[noteId] = Date.now();
  saveLastUsed(localData.lastUsed);
  var found = state.notes.find(function (n) { return n.id === noteId; });
  if (found) found.lastUsed = localData.lastUsed[noteId];
}

async function loadNotes() {
  var localData = loadLocalData();

  if (location.protocol === 'file:') {
    state.notes = mergeNotes(fallbackNotes, localData.userNotes);
    state.allTags = getAllTags(state.notes);
    applyFilters();
    return;
  }

  try {
    var res = await fetch('data/notes.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var presets = await res.json();
    state.notes = mergeNotes(presets, localData.userNotes);
  } catch (e) {
    state.notes = mergeNotes(fallbackNotes, localData.userNotes);
  }

  state.allTags = getAllTags(state.notes);
  applyFilters();
}

/* ════════════════════════════════════════
   Filtering & Search
   ════════════════════════════════════════ */
function getFilteredNotes() {
  var list = state.notes.slice();

  // Category filter
  if (state.activeCategory !== 'all') {
    list = list.filter(function (n) { return n.category === state.activeCategory; });
  }

  // Tag filter
  if (state.activeTags.length > 0) {
    list = list.filter(function (n) {
      if (!n.tags || !Array.isArray(n.tags)) return false;
      var lower = n.tags.map(function (t) { return t.toLowerCase(); });
      return state.activeTags.every(function (t) { return lower.indexOf(t) !== -1; });
    });
  }

  // Search
  var q = state.searchQuery.toLowerCase().trim();
  if (q) {
    list = list.filter(function (n) {
      return (n.title && n.title.toLowerCase().indexOf(q) !== -1) ||
             (n.summary && n.summary.toLowerCase().indexOf(q) !== -1) ||
             (n.prompt && n.prompt.toLowerCase().indexOf(q) !== -1) ||
             (n.notes && n.notes.toLowerCase().indexOf(q) !== -1) ||
             (n.tags && n.tags.some(function (t) { return t.toLowerCase().indexOf(q) !== -1; })) ||
             (n.steps && Array.isArray(n.steps) && n.steps.some(function (s) { return s.toLowerCase().indexOf(q) !== -1; }));
    });
  }

  // Sort
  var sort = state.sortBy;
  list.sort(function (a, b) {
    if (sort === 'favorite') {
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    }
    if (sort === 'lastUsed') {
      var au = a.lastUsed || 0;
      var bu = b.lastUsed || 0;
      if (au !== bu) return bu - au;
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    }
    if (sort === 'created') {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    }
    return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
  });

  return list;
}

function applyFilters() {
  state.filtered = getFilteredNotes();
  state.page = 0;
  renderActiveFilters();
  renderAll();
}

/* ════════════════════════════════════════
   Rendering
   ════════════════════════════════════════ */
function renderAll() {
  renderNotes();
  renderPagination();
  renderTags();
  updateTabUI();
  updateSortUI();
}

function renderNotes() {
  var grid = document.getElementById('notesGrid');
  var empty = document.getElementById('emptyState');
  var total = state.filtered.length;
  var maxItems = total > state.maxRender ? state.pageSize : total;

  if (total === 0) {
    grid.innerHTML = '';
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  var start = 0;
  var end = total;
  if (total > state.maxRender) {
    start = state.page * state.pageSize;
    end = Math.min(start + state.pageSize, total);
  }

  var pageItems = state.filtered.slice(start, end);

  grid.innerHTML = pageItems.map(function (n) {
    var cat = CATEGORY_MAP[n.category] || { icon: '📋', label: n.category };
    var favStar = n.favorite ? '⭐' : '☆';
    var tagHtml = '';
    if (n.tags && Array.isArray(n.tags)) {
      tagHtml = n.tags.slice(0, 4).map(function (t) {
        return '<span class="note-card-tag">' + esc(t) + '</span>';
      }).join('');
      if (n.tags.length > 4) tagHtml += '<span class="note-card-tag">+' + (n.tags.length - 4) + '</span>';
    }

    var timeStr = '';
    if (n.updatedAt) {
      var d = new Date(n.updatedAt);
      timeStr = d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }

    return '<div class="note-card" data-id="' + esc(n.id) + '">' +
      '<div class="note-card-header">' +
        '<div class="note-card-title">' + esc(n.title) + '</div>' +
        '<span class="note-card-fav">' + favStar + '</span>' +
      '</div>' +
      '<span class="note-card-cat">' + esc(cat.icon + ' ' + cat.label) + '</span>' +
      '<div class="note-card-summary">' + esc(n.summary || '') + '</div>' +
      (tagHtml ? '<div class="note-card-tags">' + tagHtml + '</div>' : '') +
      '<div class="note-card-meta">' +
        '<span>' + timeStr + '</span>' +
        '<span>' + (isPreset(n.id) ? '预设' : '自建') + '</span>' +
      '</div>' +
      '</div>';
  }).join('');
}

function renderPagination() {
  var pag = document.getElementById('pagination');
  var total = state.filtered.length;
  if (total <= state.maxRender) {
    pag.style.display = 'none';
    return;
  }
  pag.style.display = '';

  var totalPages = Math.ceil(total / state.pageSize);
  if (state.page >= totalPages) state.page = totalPages - 1;
  if (state.page < 0) state.page = 0;

  document.getElementById('pagePrev').disabled = state.page <= 0;
  document.getElementById('pageNext').disabled = state.page >= totalPages - 1;
  document.getElementById('pageInfo').textContent = '第 ' + (state.page + 1) + ' / ' + totalPages + ' 页';
}

function renderTags() {
  var list = document.getElementById('tagList');
  var empty = document.getElementById('tagEmpty');

  if (state.allTags.length === 0) {
    list.innerHTML = '';
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  list.innerHTML = state.allTags.map(function (t) {
    var active = state.activeTags.indexOf(t) !== -1;
    return '<span class="tag-chip' + (active ? ' active' : '') + '" data-tag="' + esc(t) + '">' + esc(t) + '</span>';
  }).join('');
}

function updateTabUI() {
  var tabs = document.querySelectorAll('.cat-tab');
  tabs.forEach(function (tab) {
    tab.classList.toggle('active', tab.dataset.cat === state.activeCategory);
  });
}

function updateSortUI() {
  document.getElementById('sortSelect').value = state.sortBy;
  var total = state.filtered.length;
  document.getElementById('resultCount').textContent = total + ' 条笔记';
}

function renderActiveFilters() {
  var container = document.getElementById('activeFilters');
  var chips = [];

  if (state.activeCategory !== 'all') {
    var cat = CATEGORY_MAP[state.activeCategory];
    chips.push('<span class="filter-chip">' + esc(cat ? cat.icon + ' ' + cat.label : state.activeCategory) +
      ' <span class="chip-close" data-clear="category">✕</span></span>');
  }

  state.activeTags.forEach(function (t) {
    chips.push('<span class="filter-chip">#' + esc(t) +
      ' <span class="chip-close" data-clear="tag" data-tag="' + esc(t) + '">✕</span></span>');
  });

  if (state.searchQuery) {
    chips.push('<span class="filter-chip">🔍 ' + esc(state.searchQuery) +
      ' <span class="chip-close" data-clear="search">✕</span></span>');
  }

  if (chips.length > 0) {
    container.innerHTML = chips.join('');
    container.style.display = '';
  } else {
    container.innerHTML = '';
    container.style.display = 'none';
  }
}

/* ════════════════════════════════════════
   Detail Panel
   ════════════════════════════════════════ */
function showDetail(noteId) {
  var note = state.notes.find(function (n) { return n.id === noteId; });
  if (!note) return;
  state.selectedNote = noteId;

  updateLastUsed(noteId);
  applyFilters();

  var overlay = document.getElementById('detailOverlay');
  document.getElementById('detailTitle').textContent = note.title;

  var cat = CATEGORY_MAP[note.category] || { icon: '📋', label: note.category };
  document.getElementById('detailCategory').textContent = cat.icon + ' ' + cat.label;

  var body = document.getElementById('detailBody');
  var html = '';

  // Meta
  html += '<div class="detail-meta">';
  var created = note.createdAt ? new Date(note.createdAt).toLocaleString('zh-CN') : '-';
  var updated = note.updatedAt ? new Date(note.updatedAt).toLocaleString('zh-CN') : '-';
  html += '<span>创建: ' + created + '</span>';
  html += '<span>更新: ' + updated + '</span>';
  if (note.lastUsed) html += '<span>最近使用: ' + new Date(note.lastUsed).toLocaleString('zh-CN') + '</span>';
  html += '</div>';

  // Tags
  if (note.tags && note.tags.length > 0) {
    html += '<div class="detail-tags">';
    note.tags.forEach(function (t) {
      html += '<span class="tag-chip">' + esc(t) + '</span>';
    });
    html += '</div>';
  }

  // Summary
  if (note.summary) {
    html += '<div class="detail-section"><h4>摘要</h4><p>' + esc(note.summary) + '</p></div>';
  }

  // Prompt
  if (note.prompt) {
    html += '<div class="detail-section"><h4>完整提示词</h4><div class="prompt-box">' + esc(note.prompt) + '</div></div>';
  }

  // Steps
  if (note.steps && Array.isArray(note.steps) && note.steps.length > 0) {
    html += '<div class="detail-section"><h4>操作步骤</h4><ol>';
    note.steps.forEach(function (s) { html += '<li>' + esc(s) + '</li>'; });
    html += '</ol></div>';
  }

  // Notes
  if (note.notes) {
    html += '<div class="detail-section"><h4>注意事项</h4><p>' + esc(note.notes) + '</p></div>';
  }

  body.innerHTML = html;

  document.getElementById('detailFavorite').textContent = note.favorite ? '⭐ 已收藏' : '⭐ 收藏';
  overlay.style.display = '';
  document.body.style.overflow = 'hidden';
}

function closeDetail() {
  document.getElementById('detailOverlay').style.display = 'none';
  document.body.style.overflow = '';
}

function copyPrompt() {
  var note = state.notes.find(function (n) { return n.id === state.selectedNote; });
  if (!note || !note.prompt) { toast('没有可复制的提示词'); return; }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(note.prompt).then(function () {
      toast('✅ 提示词已复制');
    }).catch(function () {
      fallbackCopy(note.prompt);
    });
  } else {
    fallbackCopy(note.prompt);
  }
}

function fallbackCopy(text) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    toast('✅ 提示词已复制');
  } catch (e) {
    toast('⚠️ 复制失败，请手动复制');
  }
  document.body.removeChild(ta);
}

function toggleFavorite() {
  var note = state.notes.find(function (n) { return n.id === state.selectedNote; });
  if (!note) return;
  note.favorite = !note.favorite;

  var localData = loadLocalData();
  if (note.favorite) {
    localData.favorites[note.id] = true;
  } else {
    delete localData.favorites[note.id];
  }
  saveFavorites(localData.favorites);
  applyFilters();
  showDetail(note.id);
}

/* ════════════════════════════════════════
   Modal (Create / Edit)
   ════════════════════════════════════════ */
function openModal(noteId) {
  state.editNoteId = noteId || null;
  var modal = document.getElementById('noteModal');
  var title = document.getElementById('modalTitle');

  if (noteId) {
    title.textContent = '编辑笔记';
    var note = state.notes.find(function (n) { return n.id === noteId; });
    if (!note) return;
    document.getElementById('fieldTitle').value = note.title || '';
    document.getElementById('fieldCategory').value = note.category || 'ai-prompts';
    document.getElementById('fieldTags').value = (note.tags || []).join(', ');
    document.getElementById('fieldSummary').value = note.summary || '';
    document.getElementById('fieldPrompt').value = note.prompt || '';
    document.getElementById('fieldSteps').value = (note.steps || []).join('\n');
    document.getElementById('fieldNotes').value = note.notes || '';
  } else {
    title.textContent = '新建笔记';
    document.getElementById('noteForm').reset();
    document.getElementById('fieldCategory').value = state.activeCategory !== 'all' ? state.activeCategory : 'ai-prompts';
  }

  document.getElementById('formError').style.display = 'none';
  modal.style.display = '';
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('noteModal').style.display = 'none';
  document.body.style.overflow = '';
  state.editNoteId = null;
}

function saveNote(e) {
  e.preventDefault();
  var formError = document.getElementById('formError');

  var title = document.getElementById('fieldTitle').value.trim();
  if (!title) {
    formError.textContent = '标题不能为空';
    formError.style.display = '';
    return;
  }

  var category = document.getElementById('fieldCategory').value;
  var tagsRaw = document.getElementById('fieldTags').value.trim();
  var tags = tagsRaw ? tagsRaw.split(',').map(function (t) { return t.trim(); }).filter(Boolean) : [];
  var summary = document.getElementById('fieldSummary').value.trim();
  var prompt = document.getElementById('fieldPrompt').value;
  var stepsRaw = document.getElementById('fieldSteps').value.trim();
  var steps = stepsRaw ? stepsRaw.split('\n').map(function (s) { return s.trim(); }).filter(Boolean) : [];
  var notes = document.getElementById('fieldNotes').value.trim();

  // Size check
  var sizeEst = new Blob([title + category + JSON.stringify(tags) + summary + prompt + JSON.stringify(steps) + notes]).size;
  if (sizeEst > 51200) {
    formError.textContent = '笔记内容超限（上限 50KB），请精简内容';
    formError.style.display = '';
    return;
  }

  var now = nowISO();

  if (state.editNoteId) {
    // Edit existing user note
    var localData = loadLocalData();
    var userNotes = localData.userNotes;
    var idx = userNotes.findIndex(function (n) { return n.id === state.editNoteId; });
    if (idx !== -1) {
      userNotes[idx].title = title;
      userNotes[idx].category = category;
      userNotes[idx].tags = tags;
      userNotes[idx].summary = summary;
      userNotes[idx].prompt = prompt;
      userNotes[idx].steps = steps;
      userNotes[idx].notes = notes;
      userNotes[idx].updatedAt = now;
    }
    saveUserNotes(userNotes);
  } else {
    // Create new note
    var newNote = {
      id: 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      title: title,
      category: category,
      tags: tags,
      summary: summary,
      prompt: prompt,
      steps: steps,
      notes: notes,
      favorite: false,
      lastUsed: null,
      createdAt: now,
      updatedAt: now,
    };

    var localData = loadLocalData();
    localData.userNotes.push(newNote);
    saveUserNotes(localData.userNotes);
  }

  closeModal();
  toast(state.editNoteId ? '✅ 笔记已更新' : '✅ 笔记已创建');
  loadNotes();
}

async function deleteNote() {
  var note = state.notes.find(function (n) { return n.id === state.selectedNote; });
  if (!note) return;
  if (isPreset(note.id)) {
    toast('⚠️ 预设笔记不能删除');
    return;
  }

  var ok = await confirmDialog('确定删除笔记「' + note.title + '」？');
  if (!ok) return;

  var localData = loadLocalData();
  localData.userNotes = localData.userNotes.filter(function (n) { return n.id !== note.id; });
  saveUserNotes(localData.userNotes);

  closeDetail();
  toast('🗑️ 笔记已删除');
  loadNotes();
}

/* ════════════════════════════════════════
   Import / Export
   ════════════════════════════════════════ */
function exportUserData() {
  var localData = loadLocalData();
  var exportObj = {
    exportedAt: nowISO(),
    userNotes: localData.userNotes,
    favorites: localData.favorites,
    lastUsed: localData.lastUsed,
  };

  var json = JSON.stringify(exportObj, null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'prompt-notes-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('📤 数据已导出');
}

function importUserData(file) {
  var reader = new FileReader();
  reader.onload = function (e) {
    try {
      var data = JSON.parse(e.target.result);
      if (!data.userNotes || !Array.isArray(data.userNotes)) {
        toast('⚠️ 无效的导入文件格式');
        return;
      }

      var localData = loadLocalData();
      var existingIds = {};
      localData.userNotes.forEach(function (n) { existingIds[n.id] = true; });

      var imported = 0;
      data.userNotes.forEach(function (n) {
        if (!n.id) {
          n.id = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        }
        if (!existingIds[n.id]) {
          localData.userNotes.push(n);
          existingIds[n.id] = true;
          imported++;
        }
      });

      if (data.favorites) {
        Object.keys(data.favorites).forEach(function (id) {
          localData.favorites[id] = data.favorites[id];
        });
        saveFavorites(localData.favorites);
      }

      saveUserNotes(localData.userNotes);
      toast('📥 已导入 ' + imported + ' 条笔记');
      loadNotes();
    } catch (err) {
      toast('⚠️ 导入失败: ' + err.message);
    }
  };
  reader.readAsText(file);
}

/* ════════════════════════════════════════
   Init
   ════════════════════════════════════════ */
function init() {
  // Theme
  var toggle = document.getElementById('themeToggle');
  var html = document.documentElement;
  function getTheme() { return localStorage.getItem('theme') || 'light'; }
  function saveTheme(t) { localStorage.setItem('theme', t); }
  html.setAttribute('data-theme', getTheme());
  toggle.textContent = getTheme() === 'dark' ? '☀️' : '🌙';
  toggle.addEventListener('click', function () {
    var next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    toggle.textContent = next === 'dark' ? '☀️' : '🌙';
    saveTheme(next);
  });

  // Category tabs
  document.getElementById('categoryTabs').addEventListener('click', function (e) {
    var tab = e.target.closest('.cat-tab');
    if (!tab || tab.classList.contains('active')) return;
    state.activeCategory = tab.dataset.cat;
    state.activeTags = [];
    state.searchQuery = '';
    document.getElementById('searchInput').value = '';
    applyFilters();
  });

  // Tag filter toggle
  document.getElementById('filterToggle').addEventListener('click', function () {
    state.tagPanelOpen = !state.tagPanelOpen;
    document.getElementById('tagPanel').classList.toggle('collapsed', !state.tagPanelOpen);
  });

  // Tag click
  document.getElementById('tagList').addEventListener('click', function (e) {
    var chip = e.target.closest('.tag-chip');
    if (!chip) return;
    var tag = chip.dataset.tag;
    var idx = state.activeTags.indexOf(tag);
    if (idx === -1) {
      state.activeTags.push(tag);
    } else {
      state.activeTags.splice(idx, 1);
    }
    applyFilters();
  });

  // Active filter clear
  document.getElementById('activeFilters').addEventListener('click', function (e) {
    var close = e.target.closest('.chip-close');
    if (!close) return;
    var clear = close.dataset.clear;
    if (clear === 'category') { state.activeCategory = 'all'; }
    else if (clear === 'search') { state.searchQuery = ''; document.getElementById('searchInput').value = ''; }
    else if (clear === 'tag') {
      var tag = close.dataset.tag;
      state.activeTags = state.activeTags.filter(function (t) { return t !== tag; });
    }
    applyFilters();
  });

  // Search (debounced)
  var searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', debounce(function () {
    state.searchQuery = this.value;
    applyFilters();
  }, 300));

  // Sort
  document.getElementById('sortSelect').addEventListener('change', function () {
    state.sortBy = this.value;
    applyFilters();
  });

  // Pagination
  document.getElementById('pagePrev').addEventListener('click', function () {
    if (state.page > 0) { state.page--; renderNotes(); renderPagination(); }
  });
  document.getElementById('pageNext').addEventListener('click', function () {
    state.page++;
    renderNotes();
    renderPagination();
  });

  // Notes grid: click card
  document.getElementById('notesGrid').addEventListener('click', function (e) {
    var card = e.target.closest('.note-card');
    if (!card) return;
    var id = card.dataset.id;
    if (id) showDetail(id);
  });

  // Detail actions
  document.getElementById('detailClose').addEventListener('click', closeDetail);
  document.getElementById('detailOverlay').addEventListener('click', function (e) {
    if (e.target === this) closeDetail();
  });
  document.getElementById('detailCopy').addEventListener('click', copyPrompt);
  document.getElementById('detailFavorite').addEventListener('click', toggleFavorite);
  document.getElementById('detailEdit').addEventListener('click', function () {
    if (state.selectedNote) {
      if (isPreset(state.selectedNote)) {
        toast('⚠️ 预设笔记不能编辑，请创建副本');
        return;
      }
      closeDetail();
      openModal(state.selectedNote);
    }
  });
  document.getElementById('detailDelete').addEventListener('click', deleteNote);

  // Modal
  document.getElementById('addNoteBtn').addEventListener('click', function () { openModal(null); });
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('cancelNoteBtn').addEventListener('click', closeModal);
  document.getElementById('noteModal').addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });
  document.getElementById('noteForm').addEventListener('submit', saveNote);

  // More menu
  document.getElementById('moreMenuBtn').addEventListener('click', function () {
    state.moreMenuOpen = !state.moreMenuOpen;
    document.getElementById('moreMenu').style.display = state.moreMenuOpen ? '' : 'none';
  });
  document.getElementById('exportDataBtn').addEventListener('click', function () {
    state.moreMenuOpen = false;
    document.getElementById('moreMenu').style.display = 'none';
    exportUserData();
  });
  document.getElementById('importDataBtn').addEventListener('click', function () {
    state.moreMenuOpen = false;
    document.getElementById('moreMenu').style.display = 'none';
    document.getElementById('importFileInput').click();
  });
  document.getElementById('importFileInput').addEventListener('change', function () {
    if (this.files.length > 0) { importUserData(this.files[0]); this.value = ''; }
  });

  // Keyboard: Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (document.getElementById('detailOverlay').style.display !== 'none') closeDetail();
      else if (document.getElementById('noteModal').style.display !== 'none') closeModal();
      else if (document.getElementById('confirmOverlay').style.display !== 'none') {
        document.getElementById('confirmOverlay').style.display = 'none';
      }
    }
  });

  // Load data
  loadNotes();
}

document.addEventListener('DOMContentLoaded', init);
