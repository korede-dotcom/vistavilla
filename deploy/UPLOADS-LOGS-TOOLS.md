# Dedicated photos, searchable logs and app options

Deploy updated templates, scripts, CSS and server files, then restart Node.
No database migration is needed for these changes.

- Booking ID card uploads use the Cloudinary `ids` folder (one file, max 10 MB).
- Damage create/update uploads use `damages` (up to five files, max 10 MB each).
- Damage URLs/public IDs are taken directly from CloudinaryStorage, avoiding a
  second upload of the same photo. Existing image URLs remain valid and are not
  moved or deleted. All other upload types retain their configured folder.
- Authenticated Booking Details shows the customer's saved ID photo and full-size
  link. Damage rows have thumbnails and retain their full image gallery.
- Activity Logs supports description/customer/room/reference search, staff name,
  action, type, outcome, and inclusive Lagos-date filters. Choose 25/50/100 rows;
  next/previous preserve filters and disable at boundaries. CEO/manager access
  remains enforced by the server.
- One round App Options launcher at bottom-right contains the existing theme and
  install controls, preserving their event handlers. Close by the × button,
  Escape, launcher, or clicking outside. Inline portal installation remains on the
  login page. The service-worker version is bumped for the new public UI assets.

Existing IDs are only displayed on the authenticated portal, not added to public
receipts. These changes use the existing Cloudinary credentials and the folders
already created by the account owner. No live photos were uploaded during tests.
Verify actual folder placement, file preview, gallery, filters, pagination, and
mobile app options after deployment.
