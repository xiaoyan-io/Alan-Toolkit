const state = {
  projectName: '未命名项目',
  createdAt: new Date().toLocaleString('zh-CN'),
  files: [],
  selectedId: null,
  wallDataMap: {},
  wallView: 'raw',
  wallPage: 0,
  wallPageSize: 50,
  wallSearch: '',
  wallStatusFilter: 'all',
  wallSelectedId: null,
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

/* ── CSV parser (with delimiter detection) ── */
function detectDelimiter(text) {
  const firstLine = text.split('\n').find(l => l.trim());
  if (!firstLine) return ',';
  const delimiters = [',', '\t', ';'];
  let best = ',', bestCount = -1;
  for (const d of delimiters) {
    const count = (firstLine.match(new RegExp(d === '\t' ? '\\t' : d === ';' ? ';' : ',', 'g')) || []).length;
    if (count > bestCount) { bestCount = count; best = d; }
  }
  return best;
}

function parseCSVLineWithDelimiter(line, delim) {
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
      else if (ch === delim) { result.push(cur); cur = ''; }
      else { cur += ch; }
    }
  }
  result.push(cur);
  return result;
}

function parseCSV(text) {
  const delim = detectDelimiter(text);
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [], delimiter: delim };
  const headers = parseCSVLineWithDelimiter(lines[0], delim);
  const rows = lines.slice(1).map(l => parseCSVLineWithDelimiter(l, delim));
  return { headers, rows, delimiter: delim };
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
          entry.metadata = { headers: parsed.headers, rows: parsed.rows, rowCount: parsed.rows.length, colCount: parsed.headers.length, delimiter: parsed.delimiter };
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

  const activeFile = state.files.find(f => f.id === state.selectedId);
  const hasWallData = activeFile && state.wallDataMap[activeFile.id];
  if (!hasWallData) {
    document.getElementById('wall-summary').style.display = 'none';
    document.getElementById('wall-table-section').style.display = 'none';
    document.getElementById('wall-view-tabs').style.display = 'none';
    document.getElementById('room-section').style.display = 'none';
    document.getElementById('topology-diagnostics').style.display = 'none';
  }
  const toggleLabel = document.getElementById('diag-toggle-label');
  if (toggleLabel && !hasWallData) toggleLabel.style.display = 'none';
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
  const tabs = document.getElementById('wall-view-tabs');
  state.selectedId = id;
  renderFileTable();

  if (!id) {
    container.innerHTML = '<p class="empty-state">选择一个文件查看预览</p>';
    tabs.style.display = 'none';
    return;
  }

  const file = state.files.find(f => f.id === id);
  if (!file) { container.innerHTML = '<p class="empty-state">文件未找到</p>'; tabs.style.display = 'none'; return; }

  if (file.status === 'error') {
    container.innerHTML = '<p class="empty-state">⚠️ 文件解析失败：' + esc(file.error) + '</p>';
    tabs.style.display = 'none';
    return;
  }

  const wallData = state.wallDataMap[file.id];

  switch (file.type) {
    case 'svg':
      tabs.style.display = 'none';
      previewSVG(file, container);
      break;
    case 'csv':
      if (wallData) {
        tabs.style.display = '';
        renderWallPreview(file);
      } else {
        tabs.style.display = 'none';
        previewCSV(file, container);
      }
      break;
    case 'ifc':
      tabs.style.display = 'none';
      previewIFC(file, container);
      break;
    case 'json':
      tabs.style.display = 'none';
      previewJSON(file, container);
      break;
    default:
      container.innerHTML = '<p class="empty-state">暂不支持预览此类型</p>';
      tabs.style.display = 'none';
  }
}

function renderWallPreview(file) {
  const wallData = state.wallDataMap[file.id];
  if (!wallData) return;

  const container = document.getElementById('preview-content');
  const view = state.wallView;

  if (view === 'raw') {
    previewCSV(file, container);
  } else if (view === 'list') {
    const filtered = getFilteredWalls(wallData);
    const previewItems = filtered.slice(0, 50);
    const bodyRows = previewItems.map(function (w) {
      return '<tr>' +
        '<td><strong>' + esc(w.wallId) + '</strong></td>' +
        '<td>' + (isNaN(w.startX.value) ? '—' : w.startX.value) + ', ' + (isNaN(w.startY.value) ? '—' : w.startY.value) + '</td>' +
        '<td>' + (isNaN(w.endX.value) ? '—' : w.endX.value) + ', ' + (isNaN(w.endY.value) ? '—' : w.endY.value) + '</td>' +
        '<td>' + (isNaN(w.thickness.value) ? '—' : w.thickness.value) + '</td>' +
        '<td>' + (isNaN(w.height.value) ? '—' : w.height.value) + '</td>' +
        '<td>' + (w.room || w.zone || '—') + '</td>' +
        '<td><span class="status-badge ' + w.status + '">' + (w.status === 'valid' ? '有效' : '无效') + '</span></td>' +
        '</tr>';
    }).join('');

    const headerRow = '<tr><th>Wall_ID</th><th>起点</th><th>终点</th><th>厚度</th><th>高度</th><th>房间/区域</th><th>状态</th></tr>';

    container.innerHTML = '<div class="preview-csv-wrap">' +
      '<p style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">预览前 ' + previewItems.length + ' 条 / 共 ' + filtered.length + ' 条（下方表格支持完整搜索筛选）</p>' +
      '<table><thead>' + headerRow + '</thead><tbody>' + (filtered.length === 0 ? '<tr><td colspan="7" style="text-align:center;color:var(--text-secondary)">无匹配数据</td></tr>' : bodyRows) + '</tbody></table>' +
      '</div>';
  } else if (view === 'svg') {
    container.innerHTML = '<div id="wall-svg-wrap" class="wall-svg-wrap"></div>';
    renderWallSVG(wallData, state.wallSelectedId);
  } else if (view === 'room') {
    const rooms = wallData.rooms || [];
    if (rooms.length === 0) {
      container.innerHTML = '<p class="empty-state">未检测到房间拓扑。请确认墙体数据有效并形成闭合区域。</p>';
    } else {
      container.innerHTML = '<div id="room-svg-wrap" class="wall-svg-wrap"></div>';
      renderRoomSVG(wallData);
    }
  }

  renderWallSummary(wallData);
  renderWallTable(wallData);

  const tabs = document.getElementById('wall-view-tabs');
  if (tabs) {
    const btns = tabs.querySelectorAll('.wall-tab');
    btns.forEach(function (b) { b.classList.toggle('active', b.dataset.view === view); });
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

  const wallData = state.wallDataMap[file.id];

  if (wallData && state.wallView !== 'raw') {
    return;
  }

  if (!wallData) {
    const colMap = detectWallHeaders(meta.headers);
    if (colMap) {
      const wd = parseWallsFromCSV(file);
      if (wd) {
        state.wallDataMap[file.id] = wd;
        renderWallPreview(file);
        return;
      }
    }
  }

  const maxRows = Math.min(meta.rows.length, 50);
  const delimLabel = meta.delimiter === '\t' ? 'Tab' : meta.delimiter;
  const headerRow = '<tr>' + meta.headers.map(h => '<th>' + esc(h) + '</th>').join('') + '</tr>';
  const bodyRows = meta.rows.slice(0, maxRows).map(r =>
    '<tr>' + meta.headers.map((_, i) => '<td>' + esc(r[i] || '') + '</td>').join('') + '</tr>'
  ).join('');

  container.innerHTML = '<div class="preview-csv-wrap">' +
    (wallData ? '<p style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">已识别为墙体数据（分隔符: ' + delimLabel + '），切换视图查看结构分析</p>' : '') +
    '<table><thead>' + headerRow + '</thead><tbody>' + bodyRows + '</tbody></table>' +
    (meta.rows.length > maxRows ? '<p class="empty-state" style="padding:8px">仅显示前 ' + maxRows + ' 行，共 ' + meta.rows.length + ' 行</p>' : '') +
    '</div>';

  if (!wallData) {
    const colMap = detectWallHeaders(meta.headers);
    if (colMap) {
      container.innerHTML += '<p class="empty-state" style="padding:12px;margin-top:8px;border:1px dashed var(--accent);border-radius:8px">🔍 检测到墙体数据字段：' + esc(Object.keys(colMap).join(', ')) + '。点击「墙体列表」或「SVG 画布」查看分析结果。</p>';
    }
  }
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

/* ════════════════════════════════════════
   Wall Data Model & Parser
   ════════════════════════════════════════ */

const HEADER_PATTERNS = {
  wallId: [/^wall[_\s-]?(id|number|no)?$/i, /^wallid$/i, /^wallno$/i],
  startX: [/^start[_\s-]?x$/i, /^x1$/i, /^startx$/i],
  startY: [/^start[_\s-]?y$/i, /^y1$/i, /^starty$/i],
  endX: [/^end[_\s-]?x$/i, /^x2$/i, /^endx$/i],
  endY: [/^end[_\s-]?y$/i, /^y2$/i, /^endy$/i],
  thickness: [/^thickness$/i, /^width$/i, /^wall[_\s-]?width$/i],
  height: [/^height$/i, /^wall[_\s-]?height$/i],
  room: [/^room$/i, /^room[_\s-]?name$/i, /^space$/i],
  zone: [/^zone$/i, /^zone[_\s-]?name$/i, /^area$/i],
};

const REQUIRED_WALL_FIELDS = ['wallId', 'startX', 'startY', 'endX', 'endY'];

function detectWallHeaders(headers) {
  const map = {};
  for (const [field, patterns] of Object.entries(HEADER_PATTERNS)) {
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i].trim();
      if (patterns.some(p => p.test(h))) {
        map[field] = i;
        break;
      }
    }
  }
  const hasRequired = REQUIRED_WALL_FIELDS.every(f => map[f] !== undefined);
  return hasRequired ? map : null;
}

function parseNumericValue(raw) {
  if (raw === undefined || raw === null) return { value: NaN, unit: null, raw: '' };
  const s = String(raw).trim();
  if (s === '') return { value: NaN, unit: null, raw: s };
  const m = s.match(/^(-?\d+(?:\.\d+)?)\s*(mm|cm|m)?$/i);
  if (m) {
    let v = parseFloat(m[1]);
    const u = (m[2] || '').toLowerCase() || null;
    if (u === 'cm') v *= 10;
    else if (u === 'm') v *= 1000;
    return { value: v, unit: u, raw: s };
  }
  const plain = parseFloat(s);
  if (!isNaN(plain)) return { value: plain, unit: null, raw: s };
  return { value: NaN, unit: null, raw: s };
}

function validateWallRow(row, colMap, seenIds) {
  const errors = [];
  const raw = function (field) { const i = colMap[field]; return i !== undefined ? (row[i] || '').trim() : ''; };

  const wallId = raw('wallId');
  if (!wallId) errors.push('缺少 Wall_ID');

  const sx = parseNumericValue(raw('startX'));
  const sy = parseNumericValue(raw('startY'));
  const ex = parseNumericValue(raw('endX'));
  const ey = parseNumericValue(raw('endY'));
  const thk = parseNumericValue(raw('thickness'));
  const hgt = parseNumericValue(raw('height'));

  if (isNaN(sx.value)) errors.push('Start_X 无法解析为数值' + (sx.raw ? ' (' + escAttr(sx.raw) + ')' : ''));
  if (isNaN(sy.value)) errors.push('Start_Y 无法解析为数值' + (sy.raw ? ' (' + escAttr(sy.raw) + ')' : ''));
  if (isNaN(ex.value)) errors.push('End_X 无法解析为数值' + (ex.raw ? ' (' + escAttr(ex.raw) + ')' : ''));
  if (isNaN(ey.value)) errors.push('End_Y 无法解析为数值' + (ey.raw ? ' (' + escAttr(ey.raw) + ')' : ''));
  if (isNaN(thk.value)) errors.push('Thickness 无法解析为数值' + (thk.raw ? ' (' + escAttr(thk.raw) + ')' : ''));
  if (isNaN(hgt.value)) errors.push('Height 无法解析为数值' + (hgt.raw ? ' (' + escAttr(hgt.raw) + ')' : ''));

  const isDup = seenIds.has(wallId);
  if (wallId) seenIds.add(wallId);

  const rawRoom = colMap.room !== undefined ? row[colMap.room] : '';
  const rawZone = colMap.zone !== undefined ? row[colMap.zone] : '';

  return {
    wallId: wallId || ('ROW_' + (row._line)),
    startX: sx,
    startY: sy,
    endX: ex,
    endY: ey,
    thickness: thk,
    height: hgt,
    room: rawRoom || null,
    zone: rawZone || null,
    status: errors.length > 0 ? 'invalid' : 'valid',
    errors: errors,
    originalRow: row._line,
    isDuplicate: isDup,
  };
}

function escAttr(s) { return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function parseWallsFromCSV(file) {
  const meta = file.metadata;
  const headers = meta.headers;
  const colMap = detectWallHeaders(headers);
  if (!colMap) return null;

  const seenIds = new Set();
  const duplicateIds = [];
  const walls = [];

  for (let i = 0; i < meta.rows.length; i++) {
    const row = meta.rows[i];
    row._line = i + 1;
    const wall = validateWallRow(row, colMap, seenIds);
    if (wall.isDuplicate) {
      if (!duplicateIds.includes(wall.wallId)) duplicateIds.push(wall.wallId);
    }
    walls.push(wall);
  }

  let missingCoordCount = 0;
  for (const w of walls) {
    if (isNaN(w.startX.value) || isNaN(w.startY.value) || isNaN(w.endX.value) || isNaN(w.endY.value)) {
      missingCoordCount++;
    }
  }

  const validCount = walls.filter(w => w.status === 'valid').length;
  const invalidCount = walls.filter(w => w.status === 'invalid').length;

  const wallData = {
    fileId: file.id,
    fileName: file.name,
    columnMap: colMap,
    walls: walls,
    summary: {
      totalCount: walls.length,
      validCount: validCount,
      invalidCount: invalidCount,
      duplicateIds: duplicateIds,
      missingCoordCount: missingCoordCount,
    },
    delimiter: meta.delimiter || ',',
  };

  try { computeWallTopology(wallData); detectRooms(wallData); computeTopologyDiagnostics(wallData); } catch (e) { /* best-effort */ }

  return wallData;
}

/* ════════════════════════════════════════
   Wall Topology & Room Detection
   ════════════════════════════════════════ */

const TOPOLOGY_TOL = 1; // mm tolerance for endpoint clustering
const ROOM_PALETTE = [
  { fill: 'rgba(76,175,80,0.12)', stroke: '#4caf50' },
  { fill: 'rgba(33,150,243,0.12)', stroke: '#2196f3' },
  { fill: 'rgba(255,152,0,0.12)', stroke: '#ff9800' },
  { fill: 'rgba(156,39,176,0.12)', stroke: '#9c27b0' },
  { fill: 'rgba(0,188,212,0.12)', stroke: '#00bcd4' },
  { fill: 'rgba(255,87,34,0.12)', stroke: '#ff5722' },
  { fill: 'rgba(139,195,74,0.12)', stroke: '#8bc34a' },
  { fill: 'rgba(233,30,99,0.12)', stroke: '#e91e63' },
  { fill: 'rgba(63,81,181,0.12)', stroke: '#3f51b5' },
  { fill: 'rgba(255,193,7,0.12)', stroke: '#ffc107' },
  { fill: 'rgba(0,150,136,0.12)', stroke: '#009688' },
  { fill: 'rgba(205,220,57,0.12)', stroke: '#cddc39' },
  { fill: 'rgba(103,58,183,0.12)', stroke: '#673ab7' },
  { fill: 'rgba(244,67,54,0.12)', stroke: '#f44336' },
  { fill: 'rgba(3,169,244,0.12)', stroke: '#03a9f4' },
];

function normalizeAngle(a) {
  while (a < -Math.PI) a += 2 * Math.PI;
  while (a > Math.PI) a -= 2 * Math.PI;
  return a;
}

function computeWallTopology(wallData) {
  const valid = wallData.walls.filter(function (w) { return w.status === 'valid'; });
  const tol = TOPOLOGY_TOL;

  /* collect non-degenerate endpoints */
  const eps = [];
  for (const w of valid) {
    if (isNaN(w.startX.value) || isNaN(w.startY.value) ||
        isNaN(w.endX.value) || isNaN(w.endY.value)) continue;
    if (w.startX.value === w.endX.value && w.startY.value === w.endY.value) continue;
    eps.push({ x: w.startX.value, y: w.startY.value, wall: w, side: 's' });
    eps.push({ x: w.endX.value, y: w.endY.value, wall: w, side: 'e' });
  }

  /* cluster nearby points into junctions */
  const junctions = [];
  const jOf = [];
  for (let i = 0; i < eps.length; i++) {
    const p = eps[i];
    let found = -1;
    for (let j = 0; j < junctions.length; j++) {
      if (Math.abs(p.x - junctions[j].x) <= tol && Math.abs(p.y - junctions[j].y) <= tol) {
        found = j; break;
      }
    }
    if (found >= 0) { jOf[i] = found; }
    else { jOf[i] = junctions.length; junctions.push({ x: p.x, y: p.y }); }
  }

  /* attach junction ids to walls */
  for (let i = 0; i < eps.length; i++) {
    const ji = jOf[i];
    if (eps[i].side === 's') { eps[i].wall._sj = ji; }
    else { eps[i].wall._ej = ji; }
  }

  wallData.junctions = junctions;
  wallData._jOf = jOf;
  return junctions;
}

function detectRooms(wallData) {
  const junctions = wallData.junctions;
  if (!junctions || junctions.length < 2) return [];

  const valid = wallData.walls.filter(function (w) {
    return w.status === 'valid' && w._sj !== undefined && w._ej !== undefined;
  });
  if (valid.length < 3) return [];

  /* build directed half-edges */
  const halfEdges = [];
  const used = new Set();
  for (const w of valid) {
    halfEdges.push({ from: w._sj, to: w._ej, wall: w });
    halfEdges.push({ from: w._ej, to: w._sj, wall: w });
  }
  for (const he of halfEdges) {
    he.angle = Math.atan2(
      junctions[he.to].y - junctions[he.from].y,
      junctions[he.to].x - junctions[he.from].x
    );
  }

  /* outgoing edges per junction, sorted CW (angle descending) */
  const outgoing = junctions.map(function () { return []; });
  for (const he of halfEdges) outgoing[he.from].push(he);
  for (const list of outgoing) list.sort(function (a, b) { return b.angle - a.angle; });

  function nextLeft(he) {
    const list = outgoing[he.to];
    if (list.length === 0) return null;
    /* find reverse edge (same wall, opposite direction) */
    let revIdx = -1;
    for (let i = 0; i < list.length; i++) {
      if (list[i].wall === he.wall && list[i].to === he.from) { revIdx = i; break; }
    }
    if (revIdx === -1) return null;
    const prevIdx = (revIdx - 1 + list.length) % list.length;
    const prev = list[prevIdx];
    /* dead-end: only the reverse edge exists */
    if (prev.to === he.from) return null;
    return prev;
  }

  /* walk faces on the left side of each half-edge */
  const faces = [];
  for (const startHe of halfEdges) {
    if (used.has(startHe)) continue;
    const face = [];
    let cur = startHe;
    let limit = halfEdges.length + 1;
    while (!used.has(cur) && limit-- > 0) {
      used.add(cur);
      face.push(cur);
      const nxt = nextLeft(cur);
      if (!nxt || nxt === startHe) break;
      cur = nxt;
    }
    if (face.length >= 3) faces.push(face);
  }

  function faceArea(face) {
    let a = 0;
    for (const he of face) {
      a += junctions[he.from].x * junctions[he.to].y -
           junctions[he.to].x * junctions[he.from].y;
    }
    return a / 2;
  }

  /* build room records from faces */
  const all = [];
  for (const face of faces) {
    const area = faceArea(face);
    if (Math.abs(area) < 1) continue;
    const wallIds = new Set();
    const poly = [];
    for (const he of face) {
      wallIds.add(he.wall.wallId);
      poly.push(junctions[he.from]);
    }
    const cx = poly.reduce(function (s, p) { return s + p.x; }, 0) / poly.length;
    const cy = poly.reduce(function (s, p) { return s + p.y; }, 0) / poly.length;
    all.push({
      area: Math.abs(area),
      areaSigned: area,
      isExterior: area < 0,
      walls: Array.from(wallIds),
      polygon: poly,
      centroid: { x: cx, y: cy },
      halfEdges: face,
    });
  }

  all.sort(function (a, b) { return b.area - a.area; });

  /* exterior = negative area face with largest abs area, rooms = positive area */
  let exterior = null;
  const rooms = [];
  for (const r of all) {
    if (r.areaSigned > 0) rooms.push(r);
    else if (!exterior || r.area > exterior.area) exterior = r;
  }

  rooms.sort(function (a, b) { return b.area - a.area; });
  rooms.forEach(function (r, i) { r.id = 'Room_' + (i + 1); });
  if (exterior) { exterior.id = 'Exterior'; rooms.push(exterior); }

  /* assign room to walls — interior rooms take priority */
  for (const w of valid) { delete w.roomId; delete w.roomName; }
  for (const r of rooms) {
    if (r.id === 'Exterior') continue;
    for (const wid of r.walls) {
      const w = valid.find(function (x) { return x.wallId === wid; });
      if (w) { w.roomId = r.id; w.roomName = r.id; }
    }
  }
  if (exterior) {
    for (const wid of exterior.walls) {
      const w = valid.find(function (x) { return x.wallId === wid; });
      if (w && !w.roomId) { w.roomId = 'Exterior'; w.roomName = '外部'; }
    }
  }

  /* room index lookup */
  wallData.roomById = {};
  for (const r of rooms) wallData.roomById[r.id] = r;
  wallData.rooms = rooms;
  return rooms;
}

function getRoomColor(roomId) {
  if (!roomId || roomId === 'Exterior') return { fill: 'transparent', stroke: 'var(--text-secondary)' };
  const idx = parseInt(roomId.replace('Room_', ''), 10) || 0;
  return ROOM_PALETTE[(idx - 1) % ROOM_PALETTE.length];
}

/* ════════════════════════════════════════
   Topology Diagnostics
   ════════════════════════════════════════ */

function computeTopologyDiagnostics(wallData) {
  const junctions = wallData.junctions || [];
  const valid = wallData.walls.filter(function (w) { return w.status === 'valid'; });
  const diag = {};

  /* 1. junction count */
  diag.junctionCount = junctions.length;

  /* 2. degree-1 dangling nodes */
  const degree = {};
  for (const w of valid) {
    if (w._sj !== undefined) { degree[w._sj] = (degree[w._sj] || 0) + 1; }
    if (w._ej !== undefined) { degree[w._ej] = (degree[w._ej] || 0) + 1; }
  }
  diag.danglingNodes = [];
  for (let j = 0; j < junctions.length; j++) {
    if (degree[j] === 1) {
      const wallIds = valid
        .filter(function (w) { return w._sj === j || w._ej === j; })
        .map(function (w) { return w.wallId; });
      diag.danglingNodes.push({ junctionIndex: j, x: junctions[j].x, y: junctions[j].y, wallIds: wallIds });
    }
  }

  /* 3. duplicate edges — walls sharing both endpoints (within tolerance) */
  const tol = TOPOLOGY_TOL;
  diag.duplicateEdges = [];
  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      const a = valid[i], b = valid[j];
      if (a.wallId === b.wallId) continue;
      const aStB = close(a.startX.value, b.startX.value, tol) && close(a.startY.value, b.startY.value, tol)
               && close(a.endX.value, b.endX.value, tol) && close(a.endY.value, b.endY.value, tol);
      const aRevB = close(a.startX.value, b.endX.value, tol) && close(a.startY.value, b.endY.value, tol)
                 && close(a.endX.value, b.startX.value, tol) && close(a.endY.value, b.startY.value, tol);
      if (aStB || aRevB) {
        diag.duplicateEdges.push({ wallId1: a.wallId, wallId2: b.wallId });
      }
    }
  }

  /* 4. zero-length walls (start ≈ end) */
  diag.zeroLengthWalls = [];
  for (const w of valid) {
    if (!isNaN(w.startX.value) && !isNaN(w.startY.value) && !isNaN(w.endX.value) && !isNaN(w.endY.value)) {
      if (close(w.startX.value, w.endX.value, tol) && close(w.startY.value, w.endY.value, tol)) {
        diag.zeroLengthWalls.push({ wallId: w.wallId, x: w.startX.value, y: w.startY.value });
      }
    }
  }

  /* 5. unclosed walls — valid with topology but not in any room face */
  const allRoomWallIds = new Set();
  const rooms = wallData.rooms || [];
  for (const r of rooms) {
    for (const wid of r.walls) allRoomWallIds.add(wid);
  }
  diag.unclosedWallIds = valid
    .filter(function (w) { return w._sj !== undefined && w._ej !== undefined && !allRoomWallIds.has(w.wallId); })
    .map(function (w) { return w.wallId; });

  /* 6. exterior area (largest negative-area face) */
  const exterior = rooms.find(function (r) { return r.id === 'Exterior'; });
  diag.exteriorArea = exterior ? exterior.area : 0;
  diag.exteriorWallCount = exterior ? exterior.walls.length : 0;

  /* 7. summary flags */
  diag.hasIssues = diag.danglingNodes.length > 0 || diag.duplicateEdges.length > 0
                || diag.zeroLengthWalls.length > 0 || diag.unclosedWallIds.length > 0;

  wallData.topologyDiagnostics = diag;
  return diag;
}

function close(a, b, tol) {
  return Math.abs(a - b) <= tol;
}

/* ════════════════════════════════════════
   Wall Renderers
   ════════════════════════════════════════ */

function renderWallSummary(wallData) {
  const s = wallData.summary;
  document.getElementById('stat-total').textContent = s.totalCount;
  document.getElementById('stat-valid').textContent = s.validCount;
  document.getElementById('stat-invalid').textContent = s.invalidCount;
  document.getElementById('stat-duplicate').textContent = s.duplicateIds.length;

  const rooms = wallData.rooms || [];
  const interiorRooms = rooms.filter(function (r) { return r.id !== 'Exterior'; });
  document.getElementById('stat-rooms').textContent = interiorRooms.length;

  const diag = wallData.topologyDiagnostics;
  const details = document.getElementById('summary-details');
  let detailHtml =
    '<span>缺失坐标: <strong>' + s.missingCoordCount + '</strong></span>' +
    '<span>分隔符: <strong>' + esc(wallData.delimiter === '\t' ? 'Tab' : wallData.delimiter) + '</strong></span>' +
    '<span>字段映射: <strong>' + esc(Object.keys(wallData.columnMap).join(', ')) + '</strong></span>' +
    (interiorRooms.length > 0 ? '<span>检测房间: <strong>' + interiorRooms.length + '</strong></span>' : '');

  if (diag) {
    detailHtml += '<span>拓扑节点: <strong>' + diag.junctionCount + '</strong></span>';
    if (diag.hasIssues) {
      const issues = [];
      if (diag.danglingNodes.length) issues.push('悬空节点 ' + diag.danglingNodes.length);
      if (diag.duplicateEdges.length) issues.push('重复边 ' + diag.duplicateEdges.length);
      if (diag.zeroLengthWalls.length) issues.push('零长度 ' + diag.zeroLengthWalls.length);
      if (diag.unclosedWallIds.length) issues.push('未闭合 ' + diag.unclosedWallIds.length);
      detailHtml += '<span class="diag-warn">⚠️ ' + issues.join(' · ') + '</span>';
    }
  }
  details.innerHTML = detailHtml;

  document.getElementById('wall-summary').style.display = '';
  document.getElementById('room-section').style.display = rooms.length > 0 ? '' : 'none';
  const toggleLabel = document.getElementById('diag-toggle-label');
  if (toggleLabel) toggleLabel.style.display = rooms.length > 0 ? '' : 'none';
  if (rooms.length > 0) {
    renderRoomGrid(wallData);
    if (diag && diag.hasIssues) renderDiagnostics(wallData);
  }
}

function getFilteredWalls(wallData) {
  let list = wallData.walls;
  const search = state.wallSearch.toLowerCase().trim();
  if (search) {
    list = list.filter(w => w.wallId.toLowerCase().includes(search));
  }
  const filter = state.wallStatusFilter;
  if (filter === 'valid') list = list.filter(w => w.status === 'valid');
  else if (filter === 'invalid') list = list.filter(w => w.status === 'invalid');
  return list;
}

function renderWallTable(wallData) {
  const filtered = getFilteredWalls(wallData);
  const totalFiltered = filtered.length;
  const pageSize = state.wallPageSize;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  if (state.wallPage >= totalPages) state.wallPage = totalPages - 1;
  if (state.wallPage < 0) state.wallPage = 0;
  const page = state.wallPage;

  const start = page * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  document.getElementById('wall-count-display').textContent =
    '显示 ' + (start + 1) + '–' + Math.min(start + pageSize, totalFiltered) + ' / 共 ' + totalFiltered + ' 条';

  const tbody = document.getElementById('wall-tbody');
  const empty = document.getElementById('wall-empty');

  if (pageItems.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    document.getElementById('wall-pagination').style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  document.getElementById('wall-pagination').style.display = '';

  tbody.innerHTML = pageItems.map(w => {
    const sel = w.wallId === state.wallSelectedId;
    const coord = function (v) { return isNaN(v.value) ? '—' : v.value + (v.unit ? ' (' + v.raw + ')' : ''); };
    return '<tr class="' + (sel ? 'selected ' : '') + 'row-' + w.status + '" data-wid="' + escAttr(w.wallId) + '">' +
      '<td><strong>' + esc(w.wallId) + '</strong></td>' +
      '<td>' + coord(w.startX) + ', ' + coord(w.startY) + '</td>' +
      '<td>' + coord(w.endX) + ', ' + coord(w.endY) + '</td>' +
      '<td>' + coord(w.thickness) + '</td>' +
      '<td>' + coord(w.height) + '</td>' +
      '<td>' +
        (w.roomId && w.roomId !== 'Exterior' ? '<span class="room-tag" style="color:' + getRoomColor(w.roomId).stroke + '">●</span> ' : '') +
        (w.roomName || w.room || w.zone || '—') +
      '</td>' +
      '<td><span class="status-badge ' + w.status + '">' + (w.status === 'valid' ? '有效' : '无效') + '</span></td>' +
      '</tr>';
  }).join('');

  document.getElementById('page-prev').disabled = page <= 0;
  document.getElementById('page-next').disabled = page >= totalPages - 1;
  document.getElementById('page-info').textContent = '第 ' + (page + 1) + ' / ' + totalPages + ' 页';

  document.getElementById('wall-table-section').style.display = '';
}

function renderWallSVG(wallData, highlightId) {
  const svg = document.getElementById('wall-svg');
  if (svg) svg.remove();

  const validWalls = wallData.walls.filter(w => w.status === 'valid');
  if (validWalls.length === 0) {
    const wrap = document.querySelector('.wall-svg-wrap');
    if (wrap) wrap.innerHTML = '<p class="empty-state">无有效墙体可绘制</p>';
    return;
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const w of validWalls) {
    if (!isNaN(w.startX.value) && !isNaN(w.startY.value)) {
      minX = Math.min(minX, w.startX.value, w.endX.value);
      minY = Math.min(minY, w.startY.value, w.endY.value);
      maxX = Math.max(maxX, w.startX.value, w.endX.value);
      maxY = Math.max(maxY, w.startY.value, w.endY.value);
    }
  }
  if (!isFinite(minX)) return;

  const pad = 40;
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const svgW = 800, svgH = 600;
  const scale = Math.min((svgW - pad * 2) / rangeX, (svgH - pad * 2) / rangeY);

  function tx(x) { return pad + (x - minX) * scale; }
  function ty(y) { return svgH - pad - (y - minY) * scale; }

  const ns = 'http://www.w3.org/2000/svg';
  const el = document.createElementNS(ns, 'svg');
  el.setAttribute('id', 'wall-svg');
  el.setAttribute('viewBox', '0 0 ' + svgW + ' ' + svgH);
  el.setAttribute('width', '100%');
  el.setAttribute('height', '100%');

  /* room-colored fills behind walls */
  const rooms = wallData.rooms || [];
  for (const r of rooms) {
    if (r.id === 'Exterior' || !r.polygon || r.polygon.length < 3) continue;
    const color = getRoomColor(r.id);
    const pts = r.polygon.map(function (p) { return tx(p.x) + ',' + ty(p.y); }).join(' ');
    const poly = document.createElementNS(ns, 'polygon');
    poly.setAttribute('points', pts);
    poly.setAttribute('fill', color.fill);
    poly.setAttribute('stroke', 'none');
    poly.setAttribute('class', 'room-svg-fill');
    el.appendChild(poly);

    /* room centroid label */
    const cx = tx(r.centroid.x);
    const cy = ty(r.centroid.y);
    const rlabel = document.createElementNS(ns, 'text');
    rlabel.setAttribute('x', cx);
    rlabel.setAttribute('y', cy + 4);
    rlabel.setAttribute('class', 'room-svg-label');
    rlabel.setAttribute('text-anchor', 'middle');
    rlabel.setAttribute('fill', color.stroke);
    rlabel.textContent = r.id;
    el.appendChild(rlabel);
  }

  for (const w of validWalls) {
    if (isNaN(w.startX.value)) continue;
    const color = getRoomColor(w.roomId);
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', tx(w.startX.value));
    line.setAttribute('y1', ty(w.startY.value));
    line.setAttribute('x2', tx(w.endX.value));
    line.setAttribute('y2', ty(w.endY.value));
    line.setAttribute('class', 'wall-svg-line' + (w.wallId === highlightId ? ' highlight' : ''));
    line.setAttribute('data-wid', w.wallId);
    line.setAttribute('stroke', color.stroke);
    el.appendChild(line);

    const mx = (tx(w.startX.value) + tx(w.endX.value)) / 2;
    const my = (ty(w.startY.value) + ty(w.endY.value)) / 2;
    const label = document.createElementNS(ns, 'text');
    label.setAttribute('x', mx);
    label.setAttribute('y', my - 6);
    label.setAttribute('class', 'wall-svg-label');
    label.setAttribute('text-anchor', 'middle');
    label.textContent = w.wallId;
    el.appendChild(label);
  }

  /* diagnostic overlay */
  if (document.getElementById('diag-toggle') && document.getElementById('diag-toggle').checked) {
    renderDiagOverlay(el, wallData, tx, ty);
  }

  const wrap = document.getElementById('wall-svg-wrap');
  if (wrap) {
    wrap.innerHTML = '';
    wrap.appendChild(el);
  }
}

function renderRoomSVG(wallData) {
  const svg = document.getElementById('room-svg');
  if (svg) svg.remove();

  const rooms = wallData.rooms || [];
  if (rooms.length === 0) {
    const wrap = document.querySelector('#room-svg-wrap');
    if (wrap) wrap.innerHTML = '<p class="empty-state">未检测到房间</p>';
    return;
  }

  /* compute bounds from all room polygons */
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of rooms) {
    if (!r.polygon) continue;
    for (const p of r.polygon) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  if (!isFinite(minX)) return;

  const pad = 40;
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const svgW = 800, svgH = 600;
  const scale = Math.min((svgW - pad * 2) / rangeX, (svgH - pad * 2) / rangeY);

  function tx(x) { return pad + (x - minX) * scale; }
  function ty(y) { return svgH - pad - (y - minY) * scale; }

  const ns = 'http://www.w3.org/2000/svg';
  const el = document.createElementNS(ns, 'svg');
  el.setAttribute('id', 'room-svg');
  el.setAttribute('viewBox', '0 0 ' + svgW + ' ' + svgH);
  el.setAttribute('width', '100%');
  el.setAttribute('height', '100%');

  for (const r of rooms) {
    if (!r.polygon || r.polygon.length < 3) continue;
    const color = getRoomColor(r.id);
    const pts = r.polygon.map(function (p) { return tx(p.x) + ',' + ty(p.y); }).join(' ');

    const poly = document.createElementNS(ns, 'polygon');
    poly.setAttribute('points', pts);
    poly.setAttribute('fill', r.id === 'Exterior' ? 'rgba(200,200,200,0.08)' : color.fill);
    poly.setAttribute('stroke', color.stroke);
    poly.setAttribute('stroke-width', '2');
    poly.setAttribute('class', 'room-svg-poly');
    el.appendChild(poly);

    const cx = tx(r.centroid.x);
    const cy = ty(r.centroid.y);
    const label = document.createElementNS(ns, 'text');
    label.setAttribute('x', cx);
    label.setAttribute('y', cy + 5);
    label.setAttribute('class', 'room-svg-label');
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('fill', r.id === 'Exterior' ? 'var(--text-secondary)' : color.stroke);
    label.textContent = r.id + ' (' + r.walls.length + ')';
    el.appendChild(label);
  }

  /* diagnostic overlay */
  if (document.getElementById('diag-toggle') && document.getElementById('diag-toggle').checked) {
    renderDiagOverlay(el, wallData, tx, ty);
  }

  const wrap = document.getElementById('room-svg-wrap');
  if (wrap) {
    wrap.innerHTML = '';
    wrap.appendChild(el);
  }
}

function renderWallDetail(wall) {
  const panel = document.getElementById('wall-detail-panel');
  const content = document.getElementById('detail-content');
  panel.style.display = '';
  document.body.style.overflow = 'hidden';

  const f = function (v) {
    if (v === undefined || v === null) return '—';
    if (typeof v === 'object' && v.value !== undefined) {
      if (isNaN(v.value)) return '无效 (' + esc(v.raw) + ')';
      return v.value + (v.unit ? ' (' + v.raw + ')' : '');
    }
    return esc(String(v));
  };

  let html = '<div class="detail-field"><span class="field-label">Wall_ID</span><span>' + esc(wall.wallId) + '</span></div>';
  html += '<div class="detail-field"><span class="field-label">起点 X</span><span>' + f(wall.startX) + '</span></div>';
  html += '<div class="detail-field"><span class="field-label">起点 Y</span><span>' + f(wall.startY) + '</span></div>';
  html += '<div class="detail-field"><span class="field-label">终点 X</span><span>' + f(wall.endX) + '</span></div>';
  html += '<div class="detail-field"><span class="field-label">终点 Y</span><span>' + f(wall.endY) + '</span></div>';
  html += '<div class="detail-field"><span class="field-label">厚度</span><span>' + f(wall.thickness) + '</span></div>';
  html += '<div class="detail-field"><span class="field-label">高度</span><span>' + f(wall.height) + '</span></div>';
  html += '<div class="detail-field"><span class="field-label">房间</span><span>' + esc(wall.room || '—') + '</span></div>';
  html += '<div class="detail-field"><span class="field-label">区域</span><span>' + esc(wall.zone || '—') + '</span></div>';
  if (wall.roomId) {
    const color = getRoomColor(wall.roomId);
    html += '<div class="detail-field"><span class="field-label">检测房间</span><span><span class="room-tag" style="color:' + color.stroke + '">●</span> ' + esc(wall.roomName) + '</span></div>';
  }
  if (wall._sj !== undefined && wall._ej !== undefined) {
    html += '<div class="detail-field"><span class="field-label">拓扑节点</span><span>' + wall._sj + ' ↔ ' + wall._ej + '</span></div>';
  }
  html += '<div class="detail-field"><span class="field-label">状态</span><span class="status-badge ' + wall.status + '">' + (wall.status === 'valid' ? '有效' : '无效') + '</span></div>';
  html += '<div class="detail-field"><span class="field-label">原始行号</span><span>' + wall.originalRow + '</span></div>';

  if (wall.errors.length > 0) {
    html += '<div class="detail-errors"><h4>验证错误</h4><ul>';
    for (const err of wall.errors) html += '<li>' + esc(err) + '</li>';
    html += '</ul></div>';
  }

  content.innerHTML = html;
}

function renderRoomGrid(wallData) {
  const rooms = wallData.rooms || [];
  const grid = document.getElementById('room-grid');
  const label = document.getElementById('room-count-label');
  const interiorRooms = rooms.filter(function (r) { return r.id !== 'Exterior'; });
  label.textContent = '检测到 ' + interiorRooms.length + ' 个房间' + (rooms.length > interiorRooms.length ? '（含外部轮廓）' : '');
  grid.innerHTML = rooms.map(function (r) {
    const isExt = r.id === 'Exterior';
    const color = getRoomColor(r.id);
    const wallList = r.walls.slice(0, 20).map(function (wid) {
      const w = wallData.walls.find(function (x) { return x.wallId === wid; });
      return w ? '<span class="room-wall-tag">' + esc(w.wallId) + '</span>' : '';
    }).join('');
    const extra = r.walls.length > 20 ? '&nbsp;…等' + r.walls.length + ' 面墙' : '';
    const areaLabel = r.area >= 1e6 ? (r.area / 1e6).toFixed(2) + ' m²' :
                      r.area >= 1e3 ? (r.area / 1e3).toFixed(1) + ' cm²' :
                      r.area.toFixed(0) + ' mm²';
    return '<div class="room-card' + (isExt ? ' room-exterior' : '') + '">' +
      '<div class="room-card-header">' +
        '<span class="room-color-dot" style="background:' + color.stroke + '"></span>' +
        '<strong>' + esc(r.id) + '</strong>' +
        '<span class="room-area">' + areaLabel + '</span>' +
      '</div>' +
      '<div class="room-card-walls">' + wallList + extra + '</div>' +
    '</div>';
  }).join('');
}

/* ════════════════════════════════════════
   Diagnostics Renderer
   ════════════════════════════════════════ */

function renderDiagnostics(wallData) {
  const diag = wallData.topologyDiagnostics;
  if (!diag || !diag.hasIssues) {
    document.getElementById('topology-diagnostics').style.display = 'none';
    return;
  }

  const el = document.getElementById('topology-diagnostics');
  el.style.display = '';

  const sections = [];

  if (diag.danglingNodes.length > 0) {
    sections.push('<div class="diag-section">' +
      '<h4>🔴 悬空节点 (' + diag.danglingNodes.length + ')</h4>' +
      '<div class="diag-items">' +
      diag.danglingNodes.slice(0, 20).map(function (n) {
        return '<span class="diag-tag diag-tag-warn">J' + n.junctionIndex +
          ' (' + n.x.toFixed(1) + ', ' + n.y.toFixed(1) + ') → ' + esc(n.wallIds.join(', ')) + '</span>';
      }).join('') +
      (diag.danglingNodes.length > 20 ? '<span class="diag-tag">…等 ' + diag.danglingNodes.length + ' 个</span>' : '') +
      '</div></div>');
  }

  if (diag.duplicateEdges.length > 0) {
    sections.push('<div class="diag-section">' +
      '<h4>🔁 重复边 (' + diag.duplicateEdges.length + ')</h4>' +
      '<div class="diag-items">' +
      diag.duplicateEdges.slice(0, 20).map(function (d) {
        return '<span class="diag-tag diag-tag-warn">' + esc(d.wallId1) + ' ↔ ' + esc(d.wallId2) + '</span>';
      }).join('') +
      (diag.duplicateEdges.length > 20 ? '<span class="diag-tag">…等 ' + diag.duplicateEdges.length + ' 对</span>' : '') +
      '</div></div>');
  }

  if (diag.zeroLengthWalls.length > 0) {
    sections.push('<div class="diag-section">' +
      '<h4>➖ 零长度墙体 (' + diag.zeroLengthWalls.length + ')</h4>' +
      '<div class="diag-items">' +
      diag.zeroLengthWalls.slice(0, 20).map(function (z) {
        return '<span class="diag-tag diag-tag-warn">' + esc(z.wallId) +
          ' @ (' + z.x.toFixed(1) + ', ' + z.y.toFixed(1) + ')</span>';
      }).join('') +
      (diag.zeroLengthWalls.length > 20 ? '<span class="diag-tag">…等 ' + diag.zeroLengthWalls.length + ' 面</span>' : '') +
      '</div></div>');
  }

  if (diag.unclosedWallIds.length > 0) {
    sections.push('<div class="diag-section">' +
      '<h4>🚫 未闭合墙体 (' + diag.unclosedWallIds.length + ')</h4>' +
      '<p class="diag-note">以下墙体有有效拓扑连接，但未参与任何闭合环：</p>' +
      '<div class="diag-items">' +
      diag.unclosedWallIds.slice(0, 30).map(function (wid) {
        return '<span class="diag-tag diag-tag-warn">' + esc(wid) + '</span>';
      }).join('') +
      (diag.unclosedWallIds.length > 30 ? '<span class="diag-tag">…等 ' + diag.unclosedWallIds.length + ' 面</span>' : '') +
      '</div></div>');
  }

  sections.push('<div class="diag-section diag-summary-row">' +
    '<span>🔗 节点总数: <strong>' + diag.junctionCount + '</strong></span>' +
    '<span>🏠 外部轮廓面积: <strong>' + formatArea(diag.exteriorArea) + '</strong></span>' +
    '<span>🧱 外部轮廓墙体: <strong>' + diag.exteriorWallCount + '</strong></span>' +
  '</div>');

  el.innerHTML = '<div class="diag-inner">' + sections.join('') + '</div>';
}

function formatArea(area) {
  if (area >= 1e6) return (area / 1e6).toFixed(2) + ' m²';
  if (area >= 1e3) return (area / 1e3).toFixed(1) + ' cm²';
  return area.toFixed(0) + ' mm²';
}

function renderDiagOverlay(svgEl, wallData, tx, ty) {
  const diag = wallData.topologyDiagnostics;
  const ns = 'http://www.w3.org/2000/svg';
  if (!diag) return;

  /* dangling nodes — red circles */
  for (const n of diag.danglingNodes) {
    const circle = document.createElementNS(ns, 'circle');
    circle.setAttribute('cx', tx(n.x));
    circle.setAttribute('cy', ty(n.y));
    circle.setAttribute('r', '6');
    circle.setAttribute('class', 'diag-svg-dangle');
    circle.setAttribute('fill', '#ef5350');
    circle.setAttribute('opacity', '0.8');
    circle.setAttribute('stroke', '#c62828');
    circle.setAttribute('stroke-width', '1.5');
    svgEl.appendChild(circle);
  }

  /* unclosed walls — dashed overlay */
  const unclosedSet = new Set(diag.unclosedWallIds);
  for (const w of wallData.walls) {
    if (!unclosedSet.has(w.wallId)) continue;
    if (isNaN(w.startX.value)) continue;
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', tx(w.startX.value));
    line.setAttribute('y1', ty(w.startY.value));
    line.setAttribute('x2', tx(w.endX.value));
    line.setAttribute('y2', ty(w.endY.value));
    line.setAttribute('class', 'diag-svg-unclosed');
    line.setAttribute('stroke', '#ff7043');
    line.setAttribute('stroke-width', '4');
    line.setAttribute('stroke-dasharray', '8,4');
    line.setAttribute('opacity', '0.7');
    line.setAttribute('fill', 'none');
    svgEl.appendChild(line);
  }
}

function exportValidationReport(wallData) {
  const report = {
    fileName: wallData.fileName,
    exportedAt: new Date().toISOString(),
    delimiter: wallData.delimiter === '\t' ? 'TAB' : wallData.delimiter,
    columnMap: wallData.columnMap,
    summary: wallData.summary,
    topologyDiagnostics: wallData.topologyDiagnostics || null,
    walls: wallData.walls.map(w => ({
      wallId: w.wallId,
      startX: { value: w.startX.value, unit: w.startX.unit, raw: w.startX.raw },
      startY: { value: w.startY.value, unit: w.startY.unit, raw: w.startY.raw },
      endX: { value: w.endX.value, unit: w.endX.unit, raw: w.endX.raw },
      endY: { value: w.endY.value, unit: w.endY.unit, raw: w.endY.raw },
      thickness: { value: w.thickness.value, unit: w.thickness.unit, raw: w.thickness.raw },
      height: { value: w.height.value, unit: w.height.unit, raw: w.height.raw },
      room: w.room,
      zone: w.zone,
      status: w.status,
      errors: w.errors,
      originalRow: w.originalRow,
    })),
  };

  const json = JSON.stringify(report, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = wallData.fileName.replace(/\.csv$/i, '') + '_验证报告.json';
  a.click();
  URL.revokeObjectURL(url);
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

  /* Parse wall data for any CSV that was just added */
  Promise.all(promises).then(function () {
    for (const f of state.files) {
      if (f.type === 'csv' && !state.wallDataMap[f.id]) {
        const colMap = f.metadata.headers ? detectWallHeaders(f.metadata.headers) : null;
        if (colMap) {
          const wd = parseWallsFromCSV(f);
          if (wd) state.wallDataMap[f.id] = wd;
        }
      }
    }
    render();
  });
}

function cleanWallData(fileId) {
  delete state.wallDataMap[fileId];
  state.wallSelectedId = null;
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
      cleanWallData(id);
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

  /* Wall table: row click for detail */
  document.getElementById('wall-tbody').addEventListener('click', function (e) {
    const row = e.target.closest('tr[data-wid]');
    if (!row) return;
    const wid = row.dataset.wid;
    const activeFile = state.files.find(f => f.id === state.selectedId);
    if (!activeFile) return;
    const wallData = state.wallDataMap[activeFile.id];
    if (!wallData) return;
    const wall = wallData.walls.find(w => w.wallId === wid);
    if (!wall) return;

    state.wallSelectedId = wid;
    renderWallDetail(wall);
    renderWallTable(wallData);

    const wd2 = state.wallDataMap[activeFile.id];
    if (wd2) renderWallSVG(wd2, wid);
  });

  /* Wall view tabs */
  document.getElementById('wall-view-tabs').addEventListener('click', function (e) {
    const tab = e.target.closest('.wall-tab');
    if (!tab || tab.classList.contains('active')) return;
    state.wallView = tab.dataset.view;
    state.wallPage = 0;
    const activeFile = state.files.find(f => f.id === state.selectedId);
    if (activeFile) renderWallPreview(activeFile);
  });

  /* Diagnostics toggle */
  document.getElementById('diag-toggle').addEventListener('change', function () {
    const activeFile = state.files.find(f => f.id === state.selectedId);
    if (!activeFile) return;
    const wd = state.wallDataMap[activeFile.id];
    if (!wd) return;
    if (state.wallView === 'svg') renderWallSVG(wd, state.wallSelectedId);
    else if (state.wallView === 'room') renderRoomSVG(wd);
  });

  /* Wall search */
  document.getElementById('wall-search').addEventListener('input', function () {
    state.wallSearch = this.value;
    state.wallPage = 0;
    const activeFile = state.files.find(f => f.id === state.selectedId);
    if (activeFile) {
      const wd = state.wallDataMap[activeFile.id];
      if (wd) renderWallTable(wd);
    }
  });

  /* Wall status filter */
  document.getElementById('wall-status-filter').addEventListener('change', function () {
    state.wallStatusFilter = this.value;
    state.wallPage = 0;
    const activeFile = state.files.find(f => f.id === state.selectedId);
    if (activeFile) {
      const wd = state.wallDataMap[activeFile.id];
      if (wd) renderWallTable(wd);
    }
  });

  /* Wall page size */
  document.getElementById('wall-page-size').addEventListener('change', function () {
    state.wallPageSize = parseInt(this.value, 10);
    state.wallPage = 0;
    const activeFile = state.files.find(f => f.id === state.selectedId);
    if (activeFile) {
      const wd = state.wallDataMap[activeFile.id];
      if (wd) renderWallTable(wd);
    }
  });

  /* Pagination buttons */
  document.getElementById('page-prev').addEventListener('click', function () {
    if (state.wallPage > 0) { state.wallPage--; }
    const activeFile = state.files.find(f => f.id === state.selectedId);
    if (activeFile) {
      const wd = state.wallDataMap[activeFile.id];
      if (wd) renderWallTable(wd);
    }
  });

  document.getElementById('page-next').addEventListener('click', function () {
    state.wallPage++;
    const activeFile = state.files.find(f => f.id === state.selectedId);
    if (activeFile) {
      const wd = state.wallDataMap[activeFile.id];
      if (wd) renderWallTable(wd);
    }
  });

  function closeDetail() {
    document.getElementById('wall-detail-panel').style.display = 'none';
    document.body.style.overflow = '';
    state.wallSelectedId = null;
    const activeFile = state.files.find(f => f.id === state.selectedId);
    if (activeFile) {
      const wd = state.wallDataMap[activeFile.id];
      if (wd) { renderWallTable(wd); renderWallSVG(wd, null); }
    }
  }

  document.getElementById('detail-close').addEventListener('click', closeDetail);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDetail(); });

  /* Export button */
  document.getElementById('export-report-btn').addEventListener('click', function () {
    const activeFile = state.files.find(f => f.id === state.selectedId);
    if (!activeFile) return;
    const wd = state.wallDataMap[activeFile.id];
    if (wd) exportValidationReport(wd);
  });
}

document.addEventListener('DOMContentLoaded', init);
