const presetTools = [
  { id: 'gh', name: 'GitHub', url: 'https://github.com', category: 'dev', icon: '🐙', color: '#24292e' },
  { id: 'so', name: 'Stack Overflow', url: 'https://stackoverflow.com', category: 'dev', icon: '📚', color: '#f48024' },
  { id: 'mdn', name: 'MDN Web Docs', url: 'https://developer.mozilla.org', category: 'dev', icon: '📖', color: '#000000' },
  { id: 'npm', name: 'npm', url: 'https://www.npmjs.com', category: 'dev', icon: '📦', color: '#cb3837' },
  { id: 'vsc', name: 'VSCode', url: 'https://code.visualstudio.com', category: 'dev', icon: '💻', color: '#007acc' },
  { id: 'devtools', name: 'DevTools', url: 'https://developer.chrome.com/docs/devtools', category: 'dev', icon: '🛠️', color: '#4285f4' },
  { id: 'cp', name: 'CodePen', url: 'https://codepen.io', category: 'dev', icon: '✏️', color: '#1e1f26' },
  { id: 'vite', name: 'Vite', url: 'https://vitejs.dev', category: 'dev', icon: '⚡', color: '#646cff' },
  { id: 'wp', name: 'Webpack', url: 'https://webpack.js.org', category: 'dev', icon: '🧩', color: '#8dd6f9' },
  { id: 'chatgpt', name: 'ChatGPT', url: 'https://chat.openai.com', category: 'ai', icon: '🤖', color: '#10a37f' },
  { id: 'claude', name: 'Claude', url: 'https://claude.ai', category: 'ai', icon: '🧠', color: '#6b4fa0' },
  { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com', category: 'ai', icon: '✨', color: '#4285f4' },
  { id: 'copilot', name: 'GitHub Copilot', url: 'https://github.com/features/copilot', category: 'ai', icon: '👨‍💻', color: '#58a6ff' },
  { id: 'perplexity', name: 'Perplexity', url: 'https://www.perplexity.ai', category: 'ai', icon: '🔍', color: '#1a1a2e' },
  { id: 'poe', name: 'Poe', url: 'https://poe.com', category: 'ai', icon: '💬', color: '#6c63ff' },
];

const categories = [
  { id: 'all', label: '全部' },
  { id: 'dev', label: '💻 开发工具' },
  { id: 'ai', label: '🤖 AI 工具' },
];

let currentCategory = 'all';
let searchTerm = '';

function getCustomTools() {
  try {
    return JSON.parse(localStorage.getItem('customTools')) || [];
  } catch {
    return [];
  }
}

function saveCustomTools(tools) {
  localStorage.setItem('customTools', JSON.stringify(tools));
}

function getTheme() {
  return localStorage.getItem('theme') || 'light';
}

function saveTheme(t) {
  localStorage.setItem('theme', t);
}

function renderTabs() {
  const container = document.getElementById('tabs');
  container.innerHTML = categories.map(c =>
    `<button class="tab${c.id === currentCategory ? ' active' : ''}" data-cat="${c.id}">${c.label}</button>`
  ).join('');
}

function renderCards() {
  const grid = document.getElementById('grid');
  const customTools = getCustomTools();
  const allTools = [...presetTools, ...customTools];

  const filtered = allTools.filter(t => {
    if (currentCategory !== 'all' && t.category !== currentCategory) return false;
    if (searchTerm && !t.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty">没有找到工具，试试其他关键词或 <a href="#" id="addFromEmpty">添加一个</a></div>`;
    return;
  }

  const customIds = new Set(customTools.map(t => t.id));

  grid.innerHTML = filtered.map(t => {
    const isCustom = customIds.has(t.id);
    return `
      <a href="${t.url}" class="card" target="_blank" rel="noopener noreferrer" style="--card-color: ${t.color}">
        <span class="card-icon">${t.icon}</span>
        <span class="card-name">${t.name}</span>
        ${isCustom ? `<button class="card-del" data-id="${t.id}" title="删除">×</button>` : ''}
      </a>
    `;
  }).join('');
}

function init() {
  const theme = getTheme();
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('themeToggle').textContent = theme === 'dark' ? '☀️' : '🌙';

  renderTabs();
  renderCards();

  document.getElementById('themeToggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    document.getElementById('themeToggle').textContent = next === 'dark' ? '☀️' : '🌙';
    saveTheme(next);
  });

  document.getElementById('searchInput').addEventListener('input', e => {
    searchTerm = e.target.value;
    renderCards();
  });

  document.getElementById('tabs').addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    currentCategory = tab.dataset.cat;
    renderTabs();
    renderCards();
  });

  document.getElementById('grid').addEventListener('click', e => {
    const del = e.target.closest('.card-del');
    if (!del) return;
    e.preventDefault();
    e.stopPropagation();
    const id = del.dataset.id;
    let custom = getCustomTools();
    custom = custom.filter(t => t.id !== id);
    saveCustomTools(custom);
    renderCards();
  });

  document.getElementById('grid').addEventListener('click', e => {
    if (e.target.id === 'addFromEmpty') {
      e.preventDefault();
      openModal();
    }
  });

  document.getElementById('addBtn').addEventListener('click', openModal);

  document.getElementById('modalCancel').addEventListener('click', closeModal);

  document.getElementById('modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });

  document.getElementById('addForm').addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const name = fd.get('name').trim();
    const url = fd.get('url').trim();
    if (!name || !url) return;
    const custom = getCustomTools();
    custom.push({
      id: 'c_' + Date.now(),
      name,
      url: url.startsWith('http') ? url : 'https://' + url,
      category: fd.get('category'),
      icon: fd.get('icon').trim() || '🔗',
      color: '#6c63ff',
    });
    saveCustomTools(custom);
    closeModal();
    renderCards();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
}

function openModal() {
  document.getElementById('modal').classList.add('open');
  document.getElementById('addForm').reset();
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

document.addEventListener('DOMContentLoaded', init);
