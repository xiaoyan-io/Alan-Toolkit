(function () {
  /* ════════════════════════════════════════
     State
     ════════════════════════════════════════ */
  var activeTab = 'format';

  var TABS = [
    { id: 'format', label: '格式化', icon: '🎨' },
    { id: 'validate', label: '验证', icon: '✅' },
    { id: 'minify', label: '压缩', icon: '📦' },
    { id: 'compare', label: '对比', icon: '🔍' },
    { id: 'tree', label: '树形', icon: '🌳' },
  ];

  /* ════════════════════════════════════════
     Theme
     ════════════════════════════════════════ */
  (function initTheme() {
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
  })();

  /* ════════════════════════════════════════
     Utilities
     ════════════════════════════════════════ */
  function esc(s) {
    if (s == null) return '';
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:10px;font-size:14px;background:var(--text);color:var(--bg);z-index:2000;box-shadow:0 4px 12px var(--shadow);display:none;';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.display = '';
    setTimeout(function () { el.style.display = 'none'; }, 2500);
  }

  function getInput() { return document.getElementById('inputArea').value; }
  function getInput2() { return document.getElementById('inputArea2').value; }
  function setOutput(html) {
    document.getElementById('outputArea').innerHTML = html;
  }
  function getOutputEl() { return document.getElementById('outputArea'); }

  function updateCharCount() {
    var text = getInput();
    document.getElementById('charCount').textContent = text.length + ' 字符';
  }

  /* ════════════════════════════════════════
     JSON Syntax Highlight
     ════════════════════════════════════════ */
  function highlightJSON(json) {
    return esc(json).replace(
      /("(?:[^"\\]|\\.)*")\s*:/g,
      '<span class="json-key">$1</span>:'
    ).replace(
      /("(?:[^"\\]|\\.)*")/g,
      function (m) { return m.indexOf('json-key') === -1 ? '<span class="json-str">' + m + '</span>' : m; }
    ).replace(
      /\b(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g,
      '<span class="json-num">$1</span>'
    ).replace(
      /\b(true|false)\b/g,
      '<span class="json-bool">$1</span>'
    ).replace(
      /\bnull\b/g,
      '<span class="json-null">null</span>'
    );
  }

  /* ════════════════════════════════════════
     Tab Functions
     ════════════════════════════════════════ */
  function renderTabs() {
    var bar = document.getElementById('tabBar');
    bar.innerHTML = TABS.map(function (t) {
      return '<button class="tab-btn' + (t.id === activeTab ? ' active' : '') + '" data-tab="' + t.id + '">' + t.icon + ' ' + t.label + '</button>';
    }).join('');
  }

  function switchTab(tabId) {
    activeTab = tabId;
    renderTabs();

    var input2 = document.getElementById('inputArea2');
    var indentGroup = document.getElementById('indentGroup');
    var runBtn = document.getElementById('runBtn');

    input2.style.display = (tabId === 'compare') ? '' : 'none';
    indentGroup.style.display = (tabId === 'format' || tabId === 'minify' || tabId === 'tree') ? '' : 'none';
    document.getElementById('inputTitle').textContent = tabId === 'compare' ? 'JSON A' : '输入';
    document.getElementById('outputTitle').textContent = tabId === 'validate' ? '验证结果' : tabId === 'compare' ? '差异' : '输出';

    var labels = {
      format: '▶ 格式化',
      validate: '▶ 验证',
      minify: '▶ 压缩',
      compare: '▶ 对比',
      tree: '▶ 生成树形',
    };
    runBtn.textContent = labels[tabId] || '▶ 执行';

    setOutput('');
    document.getElementById('statusBadge').textContent = '';
    document.getElementById('statusBadge').className = 'status-badge';
  }

  /* ════════════════════════════════════════
     Try Parse
     ════════════════════════════════════════ */
  function tryParse(text) {
    try {
      var data = JSON.parse(text);
      return { ok: true, data: data };
    } catch (e) {
      var msg = e.message;
      var match = msg.match(/position\s+(\d+)/i);
      var pos = match ? parseInt(match[1], 10) : -1;
      var line = 1, col = 1;
      if (pos > 0) {
        var before = text.slice(0, pos);
        line = before.split('\n').length;
        col = pos - before.lastIndexOf('\n');
      }
      return { ok: false, error: msg, line: line, col: col, pos: pos };
    }
  }

  /* ════════════════════════════════════════
     Format
     ════════════════════════════════════════ */
  function doFormat() {
    var input = getInput().trim();
    if (!input) { setOutput('<div class="json-error">请粘贴 JSON</div>'); return; }
    var result = tryParse(input);
    if (!result.ok) {
      showError(result);
      return;
    }
    var indentVal = document.getElementById('indentSelect').value;
    var indent = indentVal === 'tab' ? '\t' : parseInt(indentVal, 10);
    var formatted = JSON.stringify(result.data, null, indent);
    setOutput('<pre style="margin:0">' + highlightJSON(formatted) + '</pre>');
    setStatus(true);
  }

  /* ════════════════════════════════════════
     Validate
     ════════════════════════════════════════ */
  function doValidate() {
    var input = getInput().trim();
    if (!input) { setOutput('<div class="json-error">请粘贴 JSON</div>'); return; }
    var result = tryParse(input);
    if (result.ok) {
      setOutput('<div style="padding:14px;color:#2e7d32;font-size:14px">✅ 有效的 JSON</div>');
      setStatus(true);
    } else {
      var msg = '❌ ' + esc(result.error);
      if (result.line > 0) {
        msg += '<br><br><span class="error-location">位置：第 ' + result.line + ' 行，第 ' + result.col + ' 列</span>';
        var lines = input.split('\n');
        if (result.line <= lines.length) {
          msg += '<br><br><div style="background:var(--input-bg);padding:10px;border-radius:6px;border:1px solid var(--card-border)">';
          var start = Math.max(0, result.line - 2);
          var end = Math.min(lines.length, result.line + 1);
          for (var i = start; i < end; i++) {
            var prefix = (i + 1 === result.line) ? '→ ' : '  ';
            var hl = (i + 1 === result.line) ? ' style="background:#ffebee;color:#c62828"' : '';
            msg += '<div' + hl + '>' + esc(prefix + lines[i]) + '</div>';
          }
          if (result.col > 0) {
            msg += '<div style="color:#ef5350">' + esc(new Array(result.col + 3).join(' ')) + '↑</div>';
          }
          msg += '</div>';
        }
      }
      setOutput('<div class="json-error">' + msg + '</div>');
      setStatus(false);
    }
  }

  /* ════════════════════════════════════════
     Minify
     ════════════════════════════════════════ */
  function doMinify() {
    var input = getInput().trim();
    if (!input) { setOutput('<div class="json-error">请粘贴 JSON</div>'); return; }
    var result = tryParse(input);
    if (!result.ok) { showError(result); return; }
    var minified = JSON.stringify(result.data);
    setOutput('<pre style="margin:0">' + esc(minified) + '</pre>');
    setStatus(true);
  }

  /* ════════════════════════════════════════
     Compare
     ════════════════════════════════════════ */
  function doCompare() {
    var a = getInput().trim();
    var b = getInput2().trim();
    if (!a || !b) { setOutput('<div class="json-error">请粘贴两个 JSON</div>'); return; }

    var ra = tryParse(a), rb = tryParse(b);
    if (!ra.ok) { setOutput('<div class="json-error">JSON A 错误：' + esc(ra.error) + '</div>'); return; }
    if (!rb.ok) { setOutput('<div class="json-error">JSON B 错误：' + esc(rb.error) + '</div>'); return; }

    var fa = JSON.stringify(ra.data, null, 2);
    var fb = JSON.stringify(rb.data, null, 2);

    if (fa === fb) {
      setOutput('<div style="padding:14px;color:#2e7d32;font-size:14px">✅ 两个 JSON 完全相同</div>');
      return;
    }

    var linesA = fa.split('\n');
    var linesB = fb.split('\n');
    var maxLen = Math.max(linesA.length, linesB.length);
    var html = '';
    for (var i = 0; i < maxLen; i++) {
      var la = i < linesA.length ? linesA[i] : '';
      var lb = i < linesB.length ? linesB[i] : '';
      if (la === lb) {
        html += '<div class="diff-line diff-neutral">  ' + esc(la) + '</div>';
      } else {
        if (la) html += '<div class="diff-line diff-removed">- ' + esc(la) + '</div>';
        if (lb) html += '<div class="diff-line diff-added">+ ' + esc(lb) + '</div>';
      }
    }
    setOutput(html);
    setStatus(false);
  }

  /* ════════════════════════════════════════
     Tree
     ════════════════════════════════════════ */
  function doTree() {
    var input = getInput().trim();
    if (!input) { setOutput('<div class="json-error">请粘贴 JSON</div>'); return; }
    var result = tryParse(input);
    if (!result.ok) { showError(result); return; }
    setOutput('<div class="tree-root">' + renderTreeValue(result.data, '') + '</div>');
    setStatus(true);
  }

  function renderTreeValue(val, key) {
    var html = '';
    if (key) {
      html += '<span class="tree-key">' + esc(JSON.stringify(key)) + '</span>: ';
    }
    if (val === null) {
      html += '<span class="json-null">null</span>';
    } else if (typeof val === 'boolean') {
      html += '<span class="json-bool">' + val + '</span>';
    } else if (typeof val === 'number') {
      html += '<span class="json-num">' + val + '</span>';
    } else if (typeof val === 'string') {
      html += '<span class="json-str">' + esc(JSON.stringify(val)) + '</span>';
    } else if (Array.isArray(val)) {
      if (val.length === 0) {
        html += '<span class="json-bracket">[]</span>';
      } else {
        html += '<span class="json-collapse" data-expand="true">▼</span><span class="json-bracket">[</span>';
        html += '<span class="tree-ellipsis" style="display:none"> … </span>';
        html += '<ul class="tree-children">';
        for (var i = 0; i < val.length; i++) {
          var comma = i < val.length - 1 ? ' <span class="tree-comma">,</span>' : '';
          html += '<li class="tree-leaf">' + renderTreeValue(val[i], null) + comma + '</li>';
        }
        html += '</ul><span class="json-bracket">]</span>';
      }
    } else if (typeof val === 'object') {
      var keys = Object.keys(val);
      if (keys.length === 0) {
        html += '<span class="json-bracket">{}</span>';
      } else {
        html += '<span class="json-collapse" data-expand="true">▼</span><span class="json-bracket">{</span>';
        html += '<span class="tree-ellipsis" style="display:none"> … </span>';
        html += '<ul class="tree-children">';
        for (var j = 0; j < keys.length; j++) {
          var comma2 = j < keys.length - 1 ? ' <span class="tree-comma">,</span>' : '';
          html += '<li class="tree-leaf">' + renderTreeValue(val[keys[j]], keys[j]) + comma2 + '</li>';
        }
        html += '</ul><span class="json-bracket">}</span>';
      }
    }
    return html;
  }

  /* ════════════════════════════════════════
     Shared
     ════════════════════════════════════════ */
  function setStatus(valid) {
    var badge = document.getElementById('statusBadge');
    badge.textContent = valid ? '✅ 有效' : '⚠️ 无效';
    badge.className = 'status-badge ' + (valid ? 'valid' : 'invalid');
  }

  function showError(result) {
    var msg = '❌ ' + esc(result.error);
    if (result.line > 0) {
      msg += '<br><span class="error-location">第 ' + result.line + ' 行，第 ' + result.col + ' 列</span>';
    }
    setOutput('<div class="json-error">' + msg + '</div>');
    setStatus(false);
  }

  /* ════════════════════════════════════════
     Copy
     ════════════════════════════════════════ */
  function copyOutput() {
    var el = getOutputEl();
    var text = el.textContent || el.innerText;
    if (!text.trim()) { toast('没有可复制的内容'); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('✅ 已复制'); }).catch(function () { fallbackCopy(text); });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('✅ 已复制'); } catch (e) { toast('⚠️ 复制失败'); }
    document.body.removeChild(ta);
  }

  /* ════════════════════════════════════════
     Tree Collapse Toggle (delegated)
     ════════════════════════════════════════ */
  function handleTreeClick(e) {
    var target = e.target;
    if (target.classList.contains('json-collapse')) {
      var expanded = target.dataset.expand === 'true';
      target.dataset.expand = expanded ? 'false' : 'true';
      target.textContent = expanded ? '▶' : '▼';
      var children = target.parentElement.querySelector('.tree-children');
      var ellipsis = target.parentElement.querySelector('.tree-ellipsis');
      if (children) children.style.display = expanded ? 'none' : '';
      if (ellipsis) ellipsis.style.display = expanded ? '' : 'none';
    }
  }

  /* ════════════════════════════════════════
     Init
     ════════════════════════════════════════ */
  function init() {
    renderTabs();

    // Tab switching
    document.getElementById('tabBar').addEventListener('click', function (e) {
      var btn = e.target.closest('.tab-btn');
      if (btn && btn.dataset.tab) switchTab(btn.dataset.tab);
    });

    // Run button
    document.getElementById('runBtn').addEventListener('click', function () {
      var actions = {
        format: doFormat,
        validate: doValidate,
        minify: doMinify,
        compare: doCompare,
        tree: doTree,
      };
      var fn = actions[activeTab];
      if (fn) fn();
    });

    // Clear
    document.getElementById('clearBtn').addEventListener('click', function () {
      document.getElementById('inputArea').value = '';
      document.getElementById('inputArea2').value = '';
      setOutput('');
      document.getElementById('statusBadge').textContent = '';
      document.getElementById('statusBadge').className = 'status-badge';
      updateCharCount();
    });

    // Paste
    document.getElementById('pasteBtn').addEventListener('click', function () {
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(function (text) {
          document.getElementById('inputArea').value = text;
          updateCharCount();
          toast('📋 已粘贴');
        }).catch(function () { toast('⚠️ 无法读取剪贴板'); });
      } else {
        toast('⚠️ 浏览器不支持读取剪贴板');
      }
    });

    // Copy output
    document.getElementById('copyBtn').addEventListener('click', copyOutput);

    // Char count
    document.getElementById('inputArea').addEventListener('input', updateCharCount);
    document.getElementById('inputArea2').addEventListener('input', updateCharCount);

    // Keyboard shortcut: Ctrl+Enter to run
    document.getElementById('inputArea').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        document.getElementById('runBtn').click();
      }
    });
    document.getElementById('inputArea2').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        document.getElementById('runBtn').click();
      }
    });

    // Tree collapse toggle
    document.getElementById('outputArea').addEventListener('click', handleTreeClick);

    // Start with sample JSON
    document.getElementById('inputArea').value = '{\n  "name": "Alan-Toolkit",\n  "version": "2.0",\n  "features": ["json", "tools", "apps"],\n  "active": true,\n  "meta": null\n}';
    updateCharCount();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
