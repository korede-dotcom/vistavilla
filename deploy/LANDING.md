# Landing page and installable app

The public `/` route uses `views/landing.ejs` and the existing room categories and
special pricing. Its own CSS and JavaScript have no third-party dependencies.

Administrators (database `role_id = 1`, shown as CEO in the existing portal) can
open **Website & Landing Page** in the sidebar, or `/portal/landing-settings`.
They can edit hero and about images/text, amenities, contact details, the rooms
heading, and section visibility. Saving publishes the content immediately.
Room names, photos and prices still come from Room Categories and Pricing.
Image fields accept HTTPS URLs, including Cloudinary URLs. No new image upload
integration or credentials are required.

Settings are persisted in a new Sequelize `landing_settings` table, created
without `alter` on its first use. The application database user needs permission
to create that table. Deploy the new files and restart Node; retain your existing
database and environment configuration. No existing tables are changed by the
new settings model.

The manifest and service worker require HTTPS (or localhost). Supported browsers
can install from their browser menu; browsers exposing an install prompt also
show an Install Vistavilla button in the landing footer. iOS users can use
Share → Add to Home Screen. Browser install availability depends on the browser.

Only the public landing CSS/JS, app icons and offline page are stored by the
service worker. Public navigation shows an offline explanation when disconnected.
Room inventory, page HTML, booking/payment requests and admin responses are not
stored. Booking requires a connection. The worker and manifest use `no-cache`
response headers to allow update checks. Increment the worker cache version when
changing its precache contents; normal updates activate after old tabs close.

Checks:

```sh
node --test tests/landing.test.js
```

After deployment, verify desktop/mobile layout, edit and save settings, check
real room pricing, and install using an HTTPS browser. In browser developer tools,
check the manifest and worker, enable offline mode, and reload `/` to confirm the
offline page. Reconnect before booking. No remote server changes are made by
creating these repository files.
