# Shared button feedback

Public pages, portal pages and receipt layouts load `/js/button-loading.js` and `/css/button-loading.css`. Buttons and links receive brief click feedback; request actions, form submissions and navigation show a neutral spinner with `aria-busy`. Existing native spinners are retained. Repeated clicks on a busy action are blocked.

The helper tracks fetch and XMLHttpRequest actions initiated by the clicked control, plus controls that existing handlers disable during processing (including uploads and receipt downloads). It does not replace labels, change form values, or enable controls disabled by business rules. Failed/completed requests clear loading state. Navigation indicators have a fallback reset and browser Back/Forward clears stale indicators. Menus, tabs and close controls remain immediate. Reduced-motion preferences are respected.

For custom actions that await work before their first request and do not disable their button, use `window.AppButtonLoading.run(button, async () => { /* complete action */ })` so the full operation is tracked.

Deploy the script, stylesheet and updated EJS layouts together, then restart and refresh the app. Automated tests cover success/failure, double-click prevention, concurrent requests, native disabled-state handling, XHR, navigation, validation cancellation and shared-layout coverage. A deployed browser check remains recommended.
