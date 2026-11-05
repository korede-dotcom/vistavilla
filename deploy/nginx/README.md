# Nginx deployment

This configuration targets the existing Node process on port 9090 and preserves
its certificate paths. Confirm the Node process actually listens on 9090 (the
application uses the `Port` environment variable, defaulting to 9800).

On the Linux server, back up the existing virtual host, then copy
`test.vistavillaapartments.org.conf` over that host's sites-available file. Keep
its existing sites-enabled symlink; do not enable a second copy of the host.
Create the cache directory using the worker user from `/etc/nginx/nginx.conf`
(usually `www-data` on Ubuntu):

```sh
sudo mkdir -p /var/cache/nginx/vistavilla
sudo chown www-data:www-data /var/cache/nginx/vistavilla
sudo nginx -t
sudo systemctl reload nginx
```

Only reload after the configuration test succeeds. This file must be included
inside the `http` context, as is usual for sites-enabled on Ubuntu/Debian.

Verify after deployment:

```sh
curl -sS -D - -o /dev/null -H 'Accept-Encoding: gzip' https://test.vistavillaapartments.org/css/style.css
curl -sS -D - -o /dev/null https://test.vistavillaapartments.org/images/logo-2.png
curl -sS -D - -o /dev/null https://test.vistavillaapartments.org/images/logo-2.png
```

Expect `Content-Encoding: gzip` for the stylesheet and `X-Asset-Cache: HIT` on a
repeated successful image request without cookies. Existing upstream caching
headers determine asset freshness (currently seven days); the one-hour cache
validity is the fallback for assets with no freshness header. After changing an
asset, change its filename or URL query version to refresh both cache layers.
HTML and API responses are never cached by this configuration. External
Cloudinary requests bypass this server and need image optimization separately.

To undo, restore the previous host configuration, run `sudo nginx -t`, then
reload Nginx. No Cloudinary credentials are needed for this change.
