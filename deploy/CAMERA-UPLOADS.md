# Camera-enabled photo uploads

Portal photo upload fields now receive a **Take Picture** button in addition to
the existing file chooser. This includes booking ID cards, damage images, room
images, categories and promotions. Image-compatible or unrestricted upload fields
are enhanced; document-only file inputs are left unchanged.

Phones/tablets use a separate native image capture input with the rear-camera
hint. The operating system/browser decides which camera/picker options appear.
Laptops with HTTPS and camera support use a preview dialog with Capture, Switch
camera and Close controls. Camera permission is requested only after a click.
Streams stop on close, cancellation, leaving the page or hiding the page.

Pictures are attached to the original field and fire the existing change event,
so existing previews, compression, form submission and Cloudinary upload code
remain in use. Multiple-file fields retain selected images, except the category
editor which already manages its own cumulative preview/upload queue. The damage
field enforces the existing five-photo limit; booking ID photos are limited to
10 MB. Capturing does not submit the booking or damage report automatically.

Deploy source/static assets and restart Node to refresh templates. No database
changes or new credentials are needed. Test using a real phone/tablet camera and
laptop webcam over HTTPS, including denial/cancellation, multiple captures,
existing file selection, preview, and final form submission.

```sh
node --test tests/camera-upload.test.js
```

Automated tests cover attachment merging, limits and template integration. Live
camera permissions and capture are browser/device verification steps.
