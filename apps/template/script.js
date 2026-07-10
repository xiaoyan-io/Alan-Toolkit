(function () {
  const toggle = document.getElementById('themeToggle');
  const html = document.documentElement;
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
