# Public booking by WhatsApp

Online payment initiation at `/payments/paystack/initialize` is temporarily disabled before it can create a booking or call the gateway. Public room pages show “Online payment is coming soon” with call/WhatsApp contact **09117777221** (`https://wa.me/2349117777221`). The WhatsApp booking link includes the selected category, room and dates. A customer enquiry is not an automatic booking confirmation.

Availability searches, authenticated reception bookings, internal payment recording and existing gateway callback processing remain available. Deploy and restart the application to activate the endpoint guard.

Hero photos use responsive Cloudinary deliveries up to 3840px with high-quality automatic formats. New room/category uploads preserve images up to 3840px, without upscaling smaller originals. Existing low-resolution uploads cannot regain detail through delivery settings: reupload the original high-resolution files if needed. IDs and damage photos keep their existing 1600px upload limits.
