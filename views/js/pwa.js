(function () {
  'use strict';
  if (window.vistavillaPwaReady) return;
  window.vistavillaPwaReady = true;
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch(error => console.warn('Vistavilla offline support unavailable', error));
  }
  let prompt;
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'pwa-install-button';
  button.textContent = 'Install Vistavilla';
  button.hidden = !!standalone();
  button.setAttribute('aria-haspopup', 'dialog');
  const dialog = document.createElement('dialog');
  dialog.className = 'pwa-install-dialog';
  dialog.setAttribute('aria-labelledby', 'pwa-install-title');
  dialog.innerHTML = '<img src="/images/vistavilla-app-192.png" width="80" height="80" alt="Vistavilla Apartments"><h2 id="pwa-install-title">Vistavilla on your device</h2><p>Use the full website and admin portal as an app.</p><ul><li>iPhone or iPad: open in Safari, tap Share, then Add to Home Screen.</li><li>Android: open the browser menu and choose Install app or Add to Home screen.</li><li>Laptop: use your browser’s install icon, or its Install app / Add to Dock menu option.</li></ul><p>Sign in to access the portal. Bookings and payments require an internet connection.</p><form method="dialog"><button>Close</button></form>';
  document.body.append(button, dialog);
  button.addEventListener('click', async () => {
    if (prompt) {
      await prompt.prompt();
      await prompt.userChoice;
      prompt = null;
    } else dialog.showModal();
  });
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    prompt = event;
    if (!standalone()) button.hidden = false;
  });
  window.addEventListener('appinstalled', () => { prompt = null; button.hidden = true; dialog.close(); });
})();
