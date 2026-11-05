(function () {
  'use strict';
  const key = 'vistavilla-theme';
  const root = document.documentElement;
  let selected = 'dark';
  try {
    const stored = localStorage.getItem(key);
    if (stored === 'light' || stored === 'dark') selected = stored;
  } catch (_) {}
  root.dataset.area = location.pathname.startsWith('/portal') ? 'admin' : 'public';
  function apply(theme) {
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    const button = document.getElementById('theme-toggle');
    if (button) {
      button.textContent = theme === 'dark' ? '☀ Light mode' : '☾ Dark mode';
      button.setAttribute('aria-label', 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode');
      button.setAttribute('aria-pressed', String(theme === 'dark'));
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#090c0f' : '#ffffff');
  }
  apply(selected);
  document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('theme-toggle')) return;
    const button = document.createElement('button');
    button.id = 'theme-toggle';
    button.type = 'button';
    button.className = 'theme-toggle';
    button.addEventListener('click', function () {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      apply(next);
      try { localStorage.setItem(key, next); } catch (_) {}
    });
    document.body.appendChild(button);
    apply(root.dataset.theme);
  });
  window.addEventListener('storage', function (event) {
    if (event.key === key) apply(event.newValue === 'light' ? 'light' : 'dark');
  });
})();
