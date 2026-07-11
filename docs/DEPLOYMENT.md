# Hajk Deployment Checklist

## Overview

Each Hajk instance needs its own port, hostname, and instance name.
The nginx reverse proxy handles SSL and routing. PM2 manages the Node process, running
as whichever system user owns the deployed files.

---

## 1. Build and install

Run `scripts/installbuild_me.sh <git_dir> <dest_dir>`. It prompts for this instance's
hostname, port, and instance name, then writes them into `.env`,
`static/client/appConfig.json`, and `static/admin/config.json` — no hand-editing of
those files needed:

```
Hostname the client/admin should use ('localhost' for a local dev/test copy) [localhost]: [hostname]
Backend port (PORT in .env) [3002]: [port]
Instance name (HAJK_INSTANCE_ID, also suggested as the PM2 process name) [Hajk-...]: [instancename]
```

For `localhost`, URLs keep the port (e.g. `http://localhost:3004/api/v2`) since there's
no reverse proxy in front — this reproduces a plain local dev/test copy. For any other
hostname, URLs drop the port (`https://[hostname]/...`) since nginx is assumed to front it.

The script also writes an `install.sh` into `dest_dir`. On the target server, run it once:

```bash
cd /var/www/[instancedir]
sudo ./install.sh
```

It prompts for the system user that should own the files and run Hajk via PM2, `chown -R`s
the deployed folder to that user, and installs backend production dependencies
(`npm ci --omit=dev`) as that user — so `node_modules` is never left root-owned.

Quick check that nothing still points at localhost (skip this for a `localhost` build):
```bash
grep "localhost" /var/www/[instancedir]/static/admin/config.json /var/www/[instancedir]/static/client/appConfig.json
```
Should return nothing.

---

## 2. nginx

Create `/etc/nginx/sites-available/[hostname]`:

```nginx
server {
    server_name [hostname];

    location /Upload/ {
        alias /var/www/[instancedir]/App_Data/Upload/;
        try_files $uri =404;
    }

    location / {
        proxy_pass http://localhost:[port]/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /admin {
        proxy_pass http://localhost:[port]/admin;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /api/ {
        proxy_pass http://localhost:[port]/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    listen 80;
}
```

Enable and issue certificate:
```bash
sudo ln -s /etc/nginx/sites-available/[hostname] /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d [hostname]
```

---

## 3. DNS

Add an A record for `[hostname]` pointing to `193.168.172.66` (webkarta.se IP).
Wait for propagation before running Certbot.

Check propagation:
```bash
nslookup [hostname] 8.8.8.8
```

---

## 4. PM2 (run as the owner set in step 1's install.sh)

`install.sh` already installed dependencies as the owning user, so no `npm install` here.

```bash
su [owner]
cd /var/www/[instancedir]
pm2 start index.js --name [instancename]
pm2 save
```

Check status:
```bash
pm2 list
```

---

## 5. Lantmäteriet proxy layers

If the instance uses Lantmäteriet WMTS or WMS layers via the webkarta.se nginx proxy,
the GeoServer CORS allowlist on geowebb.se must include the new hostname.

Edit `/path/to/tomcat/webapps/geoserver/WEB-INF/web.xml`:
```xml
<init-param>
    <param-name>cors.allowed.origins</param-name>
    <param-value>https://webkarta.se,https://[hostname]</param-value>
</init-param>
```

Then restart Tomcat:
```bash
sudo systemctl restart tomcat9
```

---

## 6. Verify

- `https://[hostname]` loads the map
- `https://[hostname]/admin` loads the admin UI with correct layer and map lists
- Browser dev tools show no CORS errors and no requests to wrong hostnames

---

## Current instances

| Hostname | Port | PM2 name | Directory | Notes |
|---|---|---|---|---|
| webkarta.se | 3002 | HAJK | /var/www/webkarta.se | Live 4.1 instance, Stensho map |
| test.webkarta.se | 3004 | HAJK44 | /var/www/hajk44 | 4.4 dev/test instance |
