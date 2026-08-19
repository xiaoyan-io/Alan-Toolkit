(function () {
  'use strict';

  var STORAGE_KEY = 'projectHub_projects';
  var projects = [];
  var editingId = null;

  var STATUS_LABELS = { planning: '规划中', active: '进行中', paused: '暂停', completed: '已完成', archived: '已归档' };
  var PRIORITY_LABELS = { low: '低', medium: '中', high: '高' };

  /* ── Theme ── */
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

  /* ── Data ── */
  function loadProjects() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) { projects = JSON.parse(raw); }
    } catch (e) { projects = []; }
    if (!projects || projects.length === 0) { projects = getPresets(); saveProjects(); }
  }

  function saveProjects() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }

  function generateId() {
    return 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  }

  function getPresets() {
    var now = new Date().toISOString();
    return [
      { id: generateId(), name: 'Alan-Toolkit', status: 'active', priority: 'high', tags: ['docs', 'ui'], repo: 'https://github.com/anomalyco/alan-toolkit', desc: '开发工具集与 AI 辅助工作流平台', notes: '核心项目', createdAt: now, updatedAt: now },
      { id: generateId(), name: 'AuntHouse V2', status: 'active', priority: 'high', tags: ['frontend', '算法'], repo: '', desc: 'CSV 墙体数据解析、拓扑分析与房间检测', notes: '拓扑+房间检测已完成，下一步是尺寸标注', createdAt: now, updatedAt: now },
      { id: generateId(), name: 'Project Hub', status: 'active', priority: 'medium', tags: ['frontend'], repo: '', desc: '开发项目管理工具', notes: '', createdAt: now, updatedAt: now },
      { id: generateId(), name: 'Prompt Workflow Notes', status: 'active', priority: 'medium', tags: ['frontend', 'data'], repo: '', desc: 'AI 指令流程笔记管理', notes: '基础 CRUD 已完成，待完善导入导出和批量操作', createdAt: now, updatedAt: now },
      { id: generateId(), name: 'KSWEB 部署脚本', status: 'completed', priority: 'low', tags: ['devops', 'shell'], repo: '', desc: '自动化部署脚本与完整性检查', notes: '', createdAt: now, updatedAt: now },
    ];
  }

  /* ── Render ── */
  function render() {
    renderStats();
    renderProjects();
  }

  function renderStats() {
    var total = projects.length;
    var counts = { active: 0, planning: 0, paused: 0, completed: 0, archived: 0 };
    for (var i = 0; i < projects.length; i++) {
      var s = projects[i].status;
      if (counts[s] !== undefined) counts[s]++;
    }
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-active').textContent = counts.active;
    document.getElementById('stat-planning').textContent = counts.planning;
    document.getElementById('stat-completed').textContent = counts.completed;
    document.getElementById('stat-archived').textContent = counts.archived;
  }

  function getFiltered() {
    var q = document.getElementById('search-input').value.trim().toLowerCase();
    var statusFilter = document.getElementById('status-filter').value;
    var sortKey = document.getElementById('sort-select').value;

    var list = projects.slice();

    if (q) {
      list = list.filter(function (p) { return p.name.toLowerCase().includes(q); });
    }
    if (statusFilter !== 'all') {
      list = list.filter(function (p) { return p.status === statusFilter; });
    }

    list.sort(function (a, b) {
      switch (sortKey) {
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'priority-desc': return priorityWeight(b.priority) - priorityWeight(a.priority);
        case 'priority-asc': return priorityWeight(a.priority) - priorityWeight(b.priority);
        case 'updated-asc': return (a.updatedAt || '').localeCompare(b.updatedAt || '');
        default: return (b.updatedAt || '').localeCompare(a.updatedAt || '');
      }
    });

    return list;
  }

  function priorityWeight(p) {
    return p === 'high' ? 3 : p === 'medium' ? 2 : 1;
  }

  function renderProjects() {
    var list = getFiltered();
    var grid = document.getElementById('projects-grid');
    var empty = document.getElementById('projects-empty');

    if (list.length === 0) {
      grid.innerHTML = '';
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';

    grid.innerHTML = list.map(function (p) {
      var tags = (p.tags || []).map(function (t) {
        return '<span class="project-tag">' + esc(t) + '</span>';
      }).join('');
      var time = formatTime(p.updatedAt || p.createdAt);
      var repoHtml = p.repo ? '<a href="' + escAttr(p.repo) + '" class="project-repo" target="_blank">' + esc(shortenUrl(p.repo)) + '</a>' : '';
      return '<div class="project-card" data-id="' + p.id + '">' +
        '<div class="project-card-header">' +
          '<span class="project-name">' + esc(p.name) + '</span>' +
          '<div class="project-badges">' +
            '<span class="priority-dot ' + p.priority + '"></span>' +
            '<span class="project-status-badge ' + p.status + '">' + STATUS_LABELS[p.status] + '</span>' +
          '</div>' +
        '</div>' +
        (p.desc ? '<div class="project-desc">' + esc(p.desc) + '</div>' : '') +
        (tags ? '<div class="project-tags">' + tags + '</div>' : '') +
        '<div class="project-footer">' +
          '<span>' + time + '</span>' +
          repoHtml +
        '</div>' +
      '</div>';
    }).join('');
  }

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function escAttr(s) {
    return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function shortenUrl(url) {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }

  function formatTime(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso);
      var mm = String(d.getMonth() + 1).padStart(2, '0');
      var dd = String(d.getDate()).padStart(2, '0');
      var hh = String(d.getHours()).padStart(2, '0');
      var mi = String(d.getMinutes()).padStart(2, '0');
      return d.getFullYear() + '-' + mm + '-' + dd + ' ' + hh + ':' + mi;
    } catch (e) { return iso; }
  }

  /* ── Modal ── */
  function openModal(p) {
    editingId = p ? p.id : null;
    document.getElementById('modal-title').textContent = p ? '编辑项目' : '新建项目';
    document.getElementById('edit-name').value = p ? p.name : '';
    document.getElementById('edit-status').value = p ? p.status : 'active';
    document.getElementById('edit-priority').value = p ? p.priority : 'medium';
    document.getElementById('edit-tags').value = p ? (p.tags || []).join(', ') : '';
    document.getElementById('edit-repo').value = p ? (p.repo || '') : '';
    document.getElementById('edit-desc').value = p ? (p.desc || '') : '';
    document.getElementById('edit-notes').value = p ? (p.notes || '') : '';
    document.getElementById('modal-delete').style.display = p ? '' : 'none';
    document.getElementById('modal-overlay').style.display = '';
    document.getElementById('edit-name').focus();
  }

  function closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
    editingId = null;
  }

  function saveFromModal() {
    var name = document.getElementById('edit-name').value.trim();
    if (!name) { alert('请输入项目名称'); return; }

    var tags = document.getElementById('edit-tags').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    var now = new Date().toISOString();

    if (editingId) {
      var p = projects.find(function (x) { return x.id === editingId; });
      if (p) {
        p.name = name;
        p.status = document.getElementById('edit-status').value;
        p.priority = document.getElementById('edit-priority').value;
        p.tags = tags;
        p.repo = document.getElementById('edit-repo').value.trim();
        p.desc = document.getElementById('edit-desc').value.trim();
        p.notes = document.getElementById('edit-notes').value.trim();
        p.updatedAt = now;
      }
    } else {
      projects.push({
        id: generateId(),
        name: name,
        status: document.getElementById('edit-status').value,
        priority: document.getElementById('edit-priority').value,
        tags: tags,
        repo: document.getElementById('edit-repo').value.trim(),
        desc: document.getElementById('edit-desc').value.trim(),
        notes: document.getElementById('edit-notes').value.trim(),
        createdAt: now,
        updatedAt: now,
      });
    }

    saveProjects();
    closeModal();
    render();
  }

  function deleteProject(id) {
    if (!confirm('确认删除此项目？')) return;
    projects = projects.filter(function (p) { return p.id !== id; });
    saveProjects();
    closeModal();
    render();
  }

  /* ── Export / Import ── */
  function exportProjects() {
    var data = JSON.stringify(projects, null, 2);
    var blob = new Blob([data], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'project-hub-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importProjects(file) {
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var data = JSON.parse(e.target.result);
        if (!Array.isArray(data)) throw new Error('格式错误：需要数组');
        if (!confirm('导入 ' + data.length + ' 个项目，将覆盖现有数据。确认？')) return;
        projects = data;
        saveProjects();
        render();
        alert('已导入 ' + data.length + ' 个项目');
      } catch (err) {
        alert('导入失败：' + err.message);
      }
    };
    reader.readAsText(file);
  }

  /* ── Init ── */
  function init() {
    loadProjects();
    render();

    /* Add button */
    document.getElementById('add-btn').addEventListener('click', function () { openModal(null); });

    /* Modal */
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-cancel').addEventListener('click', closeModal);
    document.getElementById('modal-save').addEventListener('click', saveFromModal);
    document.getElementById('modal-delete').addEventListener('click', function () {
      if (editingId) deleteProject(editingId);
    });
    document.getElementById('modal-overlay').addEventListener('click', function (e) {
      if (e.target === this) closeModal();
    });

    /* Project card click */
    document.getElementById('projects-grid').addEventListener('click', function (e) {
      var card = e.target.closest('.project-card');
      if (!card) return;
      var id = card.dataset.id;
      var p = projects.find(function (x) { return x.id === id; });
      if (p) openModal(p);
    });

    /* Search / Filter / Sort */
    document.getElementById('search-input').addEventListener('input', renderProjects);
    document.getElementById('status-filter').addEventListener('change', renderProjects);
    document.getElementById('sort-select').addEventListener('change', renderProjects);

    /* Export / Import */
    document.getElementById('export-btn').addEventListener('click', exportProjects);
    document.getElementById('import-btn').addEventListener('click', function () {
      document.getElementById('import-input').click();
    });
    document.getElementById('import-input').addEventListener('change', function () {
      if (this.files.length > 0) { importProjects(this.files[0]); this.value = ''; }
    });

    /* Keyboard */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
