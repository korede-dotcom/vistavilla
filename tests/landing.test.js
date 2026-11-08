'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ejs = require('ejs');
const { defaults, validate } = require('../utils/landingContent');

test('content validation rejects executable image URLs and preserves section controls', () => {
  assert.throws(() => validate({ ...defaults, heroImage: 'javascript:alert(1)' }));
  assert.throws(() => validate({ ...defaults, heroImage: '/images/../secret.png' }));
  assert.throws(() => validate({ ...defaults, email: 'invalid' }));
  assert.throws(() => validate({ ...defaults, headline: 'x'.repeat(301) }));
  const content = validate({ ...defaults, showRooms: undefined, heroImage: 'https://res.cloudinary.com/example/image/upload/a.jpg' });
  assert.equal(content.showRooms, false);
  assert.equal(content.showAbout, true);
  assert.equal(content.heroImage.startsWith('https:'), true);
});

test('landing renders live pricing, escapes admin content and hides disabled sections', () => {
  const source = fs.readFileSync(path.join(__dirname, '../views/landing.ejs'), 'utf8');
  const render = content => ejs.render(source, {
    content, activeMarquees: null,
    pkgs: [{ category_name: 'City suite', price: '125000', hasSpecialPrice: true, picture: [] }]
  });
  const html = render({ ...defaults, headline: '<script>alert(1)</script>' });
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('125,000'));
  assert.ok(html.includes('Special rate available'));
  assert.ok(!html.includes('jquery'));
  const hidden = render({ ...defaults, showRooms: false, showAmenities: false, showAbout: false });
  assert.ok(!hidden.includes('id="apartments"'));
  assert.ok(!hidden.includes('id="about-title"'));
  assert.ok(!hidden.includes('id="amenities-title"'));
});

test('service worker leaves API requests, external requests and POSTs untouched', () => {
  const handlers = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../views/sw.js'), 'utf8'), {
    URL,
    self: { location: { origin: 'https://example.com' }, addEventListener: (name, fn) => { handlers[name] = fn; } }
  });
  for (const pathname of ['/portal/dashboard', '/payments/result', '/check-availability', '/auth/login', '/available-rooms']) {
    handlers.fetch({ request: { method: 'GET', url: `https://example.com${pathname}`, mode: 'cors' }, respondWith() { assert.fail(`Intercepted ${pathname}`); } });
  }
  handlers.fetch({ request: { method: 'POST', url: 'https://example.com/', mode: 'navigate' }, respondWith() { assert.fail('Intercepted POST'); } });
  handlers.fetch({ request: { method: 'GET', url: 'https://external.com/css/landing.css' }, respondWith() { assert.fail('Intercepted external request'); } });
});

test('manifest icons exist at their declared sizes and offline files are available', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../views/manifest.webmanifest')));
  assert.equal(manifest.display, 'standalone');
  for (const icon of manifest.icons) {
    const png = fs.readFileSync(path.join(__dirname, '../views', icon.src));
    assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes);
  }
  assert.ok(fs.existsSync(path.join(__dirname, '../views/offline.html')));
});

// Exercise the real editor routes without opening a connection to the live DB.
let role = 1;
let saved;
function stub(relative, exports) {
  const filename = require.resolve(relative);
  require.cache[filename] = { id: filename, filename, loaded: true, exports };
}
stub('../middleware/checkAuthCookie', (req, res, next) => { req.user = { _id: 1, name: 'Admin', email: 'admin@example.com', roleName: 'ceo' }; next(); });
stub('../models/User', { findByPk: async () => ({ role_id: role }) });
stub('../models/LandingSettings', { get: async () => defaults, save: async content => { saved = content; } });
process.env.JWT_SECRET = 'test-only-secret';
const router = require('../routes/Landing');
function request(method, body = {}) {
  return new Promise((resolve, reject) => {
    const req = { method, url: '/', query: {}, cookies: { jwtToken: 'test-session' }, body, headers: {} };
    const res = {
      statusCode: 200, set() {}, status(code) { this.statusCode = code; return this; },
      render(filename, data) { resolve({ status: this.statusCode, data }); },
      send(message) { resolve({ status: this.statusCode, message }); },
      redirect(url) { resolve({ status: 302, url }); }
    };
    router.handle(req, res, error => error ? reject(error) : reject(new Error('Route did not respond')));
  });
}
test('admin editor denies other roles and forged submissions, saves valid changes', async () => {
  role = 2;
  assert.equal((await request('GET')).status, 403);
  role = 1;
  const editor = await request('GET');
  assert.equal(editor.status, 200);
  assert.equal((await request('POST', { ...defaults, csrf: 'forged' })).status, 403);
  assert.equal(saved, undefined);
  const invalid = await request('POST', { ...defaults, csrf: editor.data.csrf, heroImage: 'http://bad.example/a.png' });
  assert.equal(invalid.status, 400);
  assert.equal(saved, undefined);
  const valid = await request('POST', { ...defaults, csrf: editor.data.csrf, headline: 'A new welcome' });
  assert.equal(valid.status, 302);
  assert.equal(saved.headline, 'A new welcome');
});

test('restored homepage keeps carousel and booking form with neutral theme controls and PWA', () => {
  const filename = path.join(__dirname, '../views/index.ejs');
  const html = ejs.render(fs.readFileSync(filename, 'utf8'), {
    content: defaults, landingDefaults: defaults, activeMarquees: null, pkgs: []
  }, { filename });
  assert.ok(html.includes('Experience Luxury Living'));
  assert.ok(html.includes('id="bookingForm"'));
  assert.ok(html.includes('modern-hero-carousel'));
  assert.ok(html.includes('/css/theme.css?v=5'));
  assert.ok(!html.includes('/css/landing-accents.css'));
  assert.ok(html.includes('/manifest.webmanifest?v=3'));
  assert.ok(!html.includes('class="preloader"'));
  const css = fs.readFileSync(path.join(__dirname, '../views/css/theme.css'),'utf8');
  for (const color of ['#76d6ff', '#66ccff', '#36454f']) assert.ok(!css.includes(color));
});
