'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');
function setup(stored, blocked = false) {
  const events = {}, windowEvents = {}, elements = {};
  const root = { dataset: {}, style: {} };
  const storage = { value: stored };
  const document = {
    documentElement: root,
    getElementById: id => elements[id],
    querySelector: () => null,
    addEventListener: (name, cb) => { events[name] = cb; },
    createElement: () => ({ attributes: {}, setAttribute(key, value) { this.attributes[key] = value; }, addEventListener(name, cb) { this[name] = cb; } }),
    body: { appendChild(button) { elements[button.id] = button; } }
  };
  vm.runInNewContext(fs.readFileSync('views/js/theme.js', 'utf8'), {
    document, location: { pathname: '/portal/dashboard' },
    localStorage: { getItem() { if (blocked) throw Error(); return storage.value; }, setItem(key,value) { if (blocked) throw Error(); storage.value = value; } },
    window: { addEventListener(name, cb) { windowEvents[name] = cb; } }
  });
  return {root, events, windowEvents, elements, storage};
}
test('saved light preference applies before DOM readiness, toggles and persists', () => {
  const app = setup('light');
  assert.equal(app.root.dataset.theme,'light');
  assert.equal(app.root.dataset.area,'admin');
  app.events.DOMContentLoaded();
  const button = app.elements['theme-toggle'];
  assert.equal(button.textContent,'☾ Dark mode');
  button.click();
  assert.equal(app.root.dataset.theme,'dark');
  assert.equal(app.storage.value,'dark');
  assert.equal(button.attributes['aria-pressed'],'true');
  app.windowEvents.storage({key:'vistavilla-theme',newValue:'light'});
  assert.equal(app.root.dataset.theme,'light');
});
test('blocked storage still allows the theme switch to function', () => {
  const app = setup(null,true);
  assert.equal(app.root.dataset.theme,'dark');
  app.events.DOMContentLoaded();
  app.elements['theme-toggle'].click();
  assert.equal(app.root.dataset.theme,'light');
});
test('every standalone EJS page and shared admin head includes the theme', () => {
  function visit(dir) {
    for (const item of fs.readdirSync(dir,{withFileTypes:true})) {
      const file = dir+'/'+item.name;
      if (item.isDirectory()) visit(file);
      else if (file.endsWith('.ejs')) {
        const source=fs.readFileSync(file,'utf8');
        if (!source.includes('<head>')) continue;
        assert.ok(source.includes('/js/theme.js?v=1'),file);
        assert.ok(source.includes('/css/theme.css?v=5'),file);
        assert.ok(source.indexOf('/js/theme.js') < source.indexOf('</head>'),file);
      }
    }
  }
  visit('views');
});
