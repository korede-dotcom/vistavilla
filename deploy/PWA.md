# Vistavilla app installation

Deploy the updated source, static files and app icons, then restart Node. The app
must be served over HTTPS. The existing Nginx host configuration already proxies
the manifest and root service worker without response caching. Express serves
both with revalidation headers. No new credentials or database changes are needed
for PWA installation.

All public pages, portal pages and login screens include the same manifest and
root-scoped service worker. The installed app opens `/portal/dashboard`; existing
authentication redirects unauthenticated users to login. Website, bookings and
calendar shortcuts remain within its scope. The app does not bypass sign-in or
provide new account access.

An **Install Vistavilla** control appears above the theme switch. On browsers
supporting an installation prompt it opens that prompt; otherwise it shows device
instructions. It disappears in standalone mode. On iPhone/iPad, use Safari's
Share → Add to Home Screen. On Android or supported desktop browsers, use Install
app in the browser menu or address-bar installation control. On macOS Safari,
use Add to Dock where available. Browser wording and install support vary.

The app icon uses the existing Vistavilla logo, composited on an opaque dark tile
at 180, 192 and 512 pixels with maskable-safe padding. The deterministic asset
preparation source is `scripts/create-app-icons.swift` (macOS AppKit). Icon names are new so old
monogram icons aren't reused by the browser's asset cache. An existing installed
app may need to be removed and reinstalled to refresh its OS-level icon/name.

The entire app works online in an installed window. Only public static app
resources and the offline explanation are stored offline. Portal HTML, guest
records, sessions, APIs and payment submissions are never cached by the service
worker. No offline mutation queue exists. Navigation while disconnected shows an
offline explanation and retry option. Portal responses also use `no-store`.

Visible titles, labels, email templates, account links and contact addresses now
use Vistavilla. Existing Cloudinary URLs, folder names and upload preset IDs retain
the old resource identifier to keep uploaded pictures and image uploads working.
Those identifiers are not visible branding and require a separate provider-side
migration to rename. SMTP credentials and `.env` were not changed.

Before production rollout, check on a phone/tablet and desktop: login, sidebar,
bookings, calendar, room transfer, balance collection, theme selection and install.
Toggle offline and verify no private records appear. Reconnect before submitting
changes. Tests: `node --test tests/pwa.test.js tests/theme.test.js tests/landing.test.js tests/transfer.test.js`.
