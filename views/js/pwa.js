(function () {
  'use strict';
  if (window.vistavillaPwaReady) return;
  window.vistavillaPwaReady = true;
  let prompt = null;
  let refresh = () => {};
  // Capture immediately in the head, before page assets or UI finish loading.
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    prompt = event;
    refresh();
  });
  function initialize() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch(error => console.warn('Vistavilla offline support unavailable', error));
    }
    const admin = /^\/portal(?:\/|$)/.test(location.pathname);
    const appName = admin ? 'Vistavilla Admin' : 'Vistavilla';
    const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pwa-install-button';
    button.textContent = 'Install ' + appName;
    button.setAttribute('aria-haspopup', 'dialog');
    const dialog = document.createElement('dialog');
    dialog.className = 'pwa-install-dialog';
    dialog.setAttribute('aria-labelledby', 'pwa-install-title');
    dialog.innerHTML = '<img src="/images/vistavilla-app-192.png" width="80" height="80" alt="Vistavilla Apartments"><h2 id="pwa-install-title">Install ' + appName + '</h2><p data-install-status></p><ul><li>iPhone or iPad: open this page in Safari, tap Share, then Add to Home Screen.</li><li>Android: open this page in Chrome, then use its menu → Install app or Add to Home screen.</li><li>Laptop: use your browser’s install icon, or Install app / Add to Dock menu option.</li></ul><p>Bookings and payments require an internet connection.</p><form method="dialog"><button>Close</button></form>';
    document.body.append(button, dialog);
    const installButtons = [button, ...document.querySelectorAll('[data-pwa-install]')];
    const sections = document.querySelectorAll('[data-pwa-install-section]');
    refresh = () => {
      installButtons.forEach(control => { control.hidden = !!standalone(); });
      sections.forEach(section => { section.hidden = !!standalone(); });
      dialog.querySelector('[data-install-status]').textContent = prompt
        ? 'Installation is ready. Close these instructions and tap Install again.'
        : 'Your browser has not offered an installation prompt. If this app is already installed, open it from your home screen. Otherwise use the browser menu below; an in-app browser may need Open in Chrome or Safari first.';
    };
    refresh();
    installButtons.forEach(control => control.addEventListener('click', async () => {
      if (!prompt) { refresh(); dialog.showModal(); return; }
      const current = prompt;
      prompt = null;
      try {
        // Invoke synchronously from the click to preserve user activation.
        await current.prompt();
        const choice = await current.userChoice;
        if (choice.outcome === 'accepted') {
          installButtons.forEach(item => { item.hidden = true; });
          sections.forEach(section => { section.hidden = true; });
        }
      } catch (error) {
        console.warn('Install prompt unavailable', error);
        refresh();
        dialog.showModal();
      }
    }));
    window.addEventListener('appinstalled', () => {
      prompt = null;
      installButtons.forEach(control => { control.hidden = true; });
      sections.forEach(section => { section.hidden = true; });
      dialog.close();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
