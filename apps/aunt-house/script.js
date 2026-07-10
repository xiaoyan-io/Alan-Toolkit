const state = {
  projectName: '未命名项目',
  createdAt: new Date().toLocaleString('zh-CN'),
  files: [],
  selectedId: null,
};

const FILE_TYPES = ['svg', 'csv', 'ifc', 'json'];

function getFileType(name) {
  const ext = name.split('.').pop().toLowerCase();
  return FILE_TYPES.includes(ext) ? ext : 'unknown';
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function formatStatus(status) {
  const map = { loading: '加载中', loaded: '已加载', parsed: '已解析', error: '错误' };
  return map[status] || status;
}

/* ── IFC parser ── */
function parseIFC(text) {
  const meta = { description: '', name: '', time: '', schema: '', organization: '' };
  const descMatch = text.match(/FILE_DESCRIPTION\s*\(\s*\(\s*'([^']*)'/);
  if (descMatch) meta.description = descMatch[1];
  const nameMatch = text.match(/FILE_NAME\s*\(\s*'([^']*)'\s*,\s*'([^']*)'/);
  if (nameMatch) { meta.name = nameMatch[1]; meta.time = nameMatch[2]; }
  const orgMatch = text.match(/FILE_NAME[^;]*'[^']*'\s*,\s*'[^']*'\s*,\s*'[^']*'\s*,\s*'[^']*'\s*,\s*'[^']*'\s*,\s*'([^']*)'/);
  if (orgMatch) meta.organization = orgMatch[1];
  const schemaMatch = text.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']*)'/);
  if (schemaMatch) meta.schema = schemaMatch[1];
  return meta;
}

/* ── CSV parser ── */
function parseCSVLine(line) {
  const result = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && i + 1 < line.length && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQ = false; }
      else { cur += ch; }
    } else {
      if (ch === '"') { inQ = true; }
      else if (ch === ',') { result.push(cur); cur = ''; }
      else { cur += ch; }
    }
  }
  result.push(cur);
  return result;
}

function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map(l => parseCSVLine(l));
  return { headers, rows };
}

/* ── File reading ── */
function readFile(file) {
  return new Promise((resolve, reject) => {
    const type = getFileType(file.name);
    const reader = new FileReader();

    reader.onload = function (e) {
      const content = e.target.result;
      const entry = {
        id: 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        name: file.name,
        type: type,
        size: file.size,
        status: 'loaded',
        raw: content,
        metadata: {},
        error: null,
      };

      try {
        if (type === 'csv') {
          const parsed = parseCSV(content);
          entry.metadata = { headers: parsed.headers, rows: parsed.rows, rowCount: parsed.rows.length, colCount: parsed.headers.length };
          entry.status = 'parsed';
        } else if (type === 'ifc') {
          entry.metadata = parseIFC(content);
          entry.status = 'loaded';
        } else if (type === 'json') {
          const obj = JSON.parse(content);
          entry.metadata = { keys: Object.keys(obj), isArray: Array.isArray(obj), depth: getDepth(obj) };
          entry.status = 'parsed';
        } else if (type === 'svg') {
          entry.status = 'parsed';
        }
      } catch (err) {
        entry.status = 'error';
        entry.error = err.message;
      }

      resolve(entry);
    };

    reader.onerror = function () { reject(new Error('读取失败')); };

    if (type === 'ifc') {
      reader.readAsText(file);
    } else {
      reader.readAsText(file);
    }
  });
}

function getDepth(obj, d) {
  if (d === undefined) d = 0;
  if (d > 6) return d;
  if (typeof obj !== 'object' || obj === null) return d;
  let max = d;
  for (const k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      max = Math.max(max, getDepth(obj[k], d + 1));
    }
  }
  return max;
}

/* ── Render ── */
function render() {
  renderOverview();
  renderFileTable();
}

function renderOverview() {
  document.getElementById('project-name').textContent = state.projectName;
  document.getElementById('project-time').textContent = state.createdAt;
  document.getElementById('file-count').textContent = state.files.length;

  const badges = document.getElementById('type-badges');
  const counts = {};
  state.files.forEach(f => { counts[f.type] = (counts[f.type] || 0) + 1; });
  badges.innerHTML = Object.keys(counts).map(t =>
    '<span class="badge">' + t.toUpperCase() + ' ×' + counts[t] + '</span>'
  ).join('');
}

function renderFileTable() {
  const tbody = document.getElementById('file-tbody');
  const empty = document.getElementById('file-empty');

  if (state.files.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = state.files.map(f => {
    const sel = f.id === state.selectedId;
    return '<tr class="' + (sel ? 'selected' : '') + '" data-id="' + f.id + '">' +
      '<td>' + esc(f.name) + '</td>' +
      '<td><span class="file-type-tag ' + f.type + '">' + f.type + '</span></td>' +
      '<td>' + formatSize(f.size) + '</td>' +
      '<td><span class="status-indicator"><span class="status-dot ' + f.status + '"></span>' +
        (f.type === 'ifc' && f.status === 'loaded' ? '待解析' : formatStatus(f.status)) +
        (f.error ? ' (' + esc(f.error) + ')' : '') + '</span></td>' +
      '<td><button class="del-btn" data-id="' + f.id + '">删除</button></td>' +
      '</tr>';
  }).join('');
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

/* ── Preview ── */
function renderPreview(id) {
  const container = document.getElementById('preview-content');
  state.selectedId = id;
  renderFileTable();

  if (!id) {
    container.innerHTML = '<p class="empty-state">选择一个文件查看预览</p>';
    return;
  }

  const file = state.files.find(f => f.id === id);
  if (!file) { container.innerHTML = '<p class="empty-state">文件未找到</p>'; return; }

  if (file.status === 'error') {
    container.innerHTML = '<p class="empty-state">⚠️ 文件解析失败：' + esc(file.error) + '</p>';
    return;
  }

  switch (file.type) {
    case 'svg':
      previewSVG(file, container);
      break;
    case 'csv':
      previewCSV(file, container);
      break;
    case 'ifc':
      previewIFC(file, container);
      break;
    case 'json':
      previewJSON(file, container);
      break;
    default:
      container.innerHTML = '<p class="empty-state">暂不支持预览此类型</p>';
  }
}

function previewSVG(file, container) {
  const blob = new Blob([file.raw], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  container.innerHTML = '<div class="preview-svg-wrap"><img src="' + url + '" alt="' + esc(file.name) + '"></div>';
}

function previewCSV(file, container) {
  const meta = file.metadata;
  if (!meta.rows || meta.rows.length === 0) {
    container.innerHTML = '<p class="empty-state">CSV 无数据行</p>';
    return;
  }
  const maxRows = Math.min(meta.rows.length, 20);
  const headerRow = '<tr>' + meta.headers.map(h => '<th>' + esc(h) + '</th>').join('') + '</tr>';
  const bodyRows = meta.rows.slice(0, maxRows).map(r =>
    '<tr>' + meta.headers.map((_, i) => '<td>' + esc(r[i] || '') + '</td>').join('') + '</tr>'
  ).join('');

  container.innerHTML = '<div class="preview-csv-wrap">' +
    '<table><thead>' + headerRow + '</thead><tbody>' + bodyRows + '</tbody></table>' +
    (meta.rows.length > maxRows ? '<p class="empty-state" style="padding:8px">仅显示前 ' + maxRows + ' 行，共 ' + meta.rows.length + ' 行</p>' : '') +
    '</div>';
}

function previewIFC(file, container) {
  const m = file.metadata;
  container.innerHTML = '<div class="preview-ifc-wrap">' +
    '<div class="ifc-field"><span class="field-label">文件名</span><span>' + esc(file.name) + '</span></div>' +
    '<div class="ifc-field"><span class="field-label">Schema</span><span>' + esc(m.schema || '-') + '</span></div>' +
    '<div class="ifc-field"><span class="field-label">项目名称</span><span>' + esc(m.name || '-') + '</span></div>' +
    '<div class="ifc-field"><span class="field-label">创建时间</span><span>' + esc(m.time || '-') + '</span></div>' +
    '<div class="ifc-field"><span class="field-label">组织</span><span>' + esc(m.organization || '-') + '</span></div>' +
    '<div class="ifc-field"><span class="field-label">文件大小</span><span>' + formatSize(file.size) + '</span></div>' +
    '<div class="ifc-pending">⏳ IFC 模型解析功能即将推出，当前仅展示文件元数据</div>' +
    '</div>';
}

function previewJSON(file, container) {
  let obj;
  try { obj = JSON.parse(file.raw); } catch (e) {
    container.innerHTML = '<p class="empty-state">JSON 解析失败：' + esc(e.message) + '</p>';
    return;
  }
  const formatted = JSON.stringify(obj, null, 2);
  container.innerHTML = '<div class="preview-json-wrap"><pre>' + esc(formatted) + '</pre></div>';
}

/* ── File import ── */
function importFiles(fileList) {
  const promises = [];
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    if (state.files.some(f => f.name === file.name && f.size === file.size)) continue;
    const placeholder = {
      id: 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      name: file.name,
      type: getFileType(file.name),
      size: file.size,
      status: 'loading',
      raw: null,
      metadata: {},
      error: null,
    };
    state.files.push(placeholder);
    render();
    promises.push(readFile(file).then(entry => {
      const idx = state.files.findIndex(f => f.id === placeholder.id);
      if (idx !== -1) state.files[idx] = entry;
      render();
    }).catch(err => {
      const idx = state.files.findIndex(f => f.id === placeholder.id);
      if (idx !== -1) { state.files[idx].status = 'error'; state.files[idx].error = err.message; }
      render();
    }));
  }
  if (promises.length === 0) return;
}

/* ── Events ── */
function init() {
  /* Theme */
  const toggle = document.getElementById('themeToggle');
  const html = document.documentElement;
  function getTheme() { return localStorage.getItem('theme') || 'light'; }
  function saveTheme(t) { localStorage.setItem('theme', t); }
  html.setAttribute('data-theme', getTheme());
  toggle.textContent = getTheme() === 'dark' ? '☀️' : '🌙';
  toggle.addEventListener('click', function () {
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    toggle.textContent = next === 'dark' ? '☀️' : '🌙';
    saveTheme(next);
  });

  render();

  /* Drop zone */
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');

  dropZone.addEventListener('click', function () { fileInput.click(); });

  dropZone.addEventListener('dragenter', function (e) { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragover', function (e) { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('drag-over'); });
  dropZone.addEventListener('drop', function (e) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) importFiles(e.dataTransfer.files);
  });

  fileInput.addEventListener('change', function () {
    if (this.files.length > 0) { importFiles(this.files); this.value = ''; }
  });

  /* File table: row click for preview + delete button */
  document.getElementById('file-tbody').addEventListener('click', function (e) {
    const del = e.target.closest('.del-btn');
    if (del) {
      e.stopPropagation();
      const id = del.dataset.id;
      state.files = state.files.filter(f => f.id !== id);
      if (state.selectedId === id) state.selectedId = null;
      render();
      if (!state.selectedId) {
        document.getElementById('preview-content').innerHTML = '<p class="empty-state">选择一个文件查看预览</p>';
      }
      return;
    }

    const row = e.target.closest('tr');
    if (row) {
      const id = row.dataset.id;
      if (id) renderPreview(id);
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
