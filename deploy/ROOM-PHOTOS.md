# Public room photos

After deploying and restarting the app, open **Portal → Rooms**. Receptionists have a **Room Photos** button; CEO and manager can use **Actions → Manage Images**. Select up to 10 photos per upload (JPEG, PNG or WebP, maximum 10 MB each).

Uploads are linked to the selected room and published immediately. They are stored once in Cloudinary under `images/rooms/<room-id>`. Available-room search results and room details show the selected room's photos. Room categories collect photos belonging to their rooms.

The homepage and website gallery read only the public Cloudinary `images` folder and its subfolders. Existing images in that folder also appear in the gallery. `GALLERY_FOLDER` can override this public folder; the default requires no additional environment setting. Photos in the old mixed upload folder are no longer displayed publicly: move public website photos into `images` using Cloudinary if needed. Do not move customer IDs or damage evidence there.

Customer ID and damage upload flows remain in `ids` and `damages`; these folders are excluded from public photo queries and results. Gallery results are cached for 60 seconds, and room upload/delete operations invalidate the cache. Live Cloudinary uploads and a browser check should be verified after deployment.
