# Hajk Deployment Checklist

## Overview

Each Hajk instance needs its own port, hostname, and three config files updated.
The nginx reverse proxy handles SSL and routing. PM2 manages the Node process as user `mats`.

---

## 1. Files to update

### `.env`
```
PORT=3004               # unique port for this instance
NODE_ENV=production     # use 'development' only for local dev
```

### `App_Data/appConfig.json`
```json
"mapserviceBase": "https://[hostname]/api/v2"
```

### `App_Data/adminConfig.json`
Replace every occurrence of `http://localhost:302` with `https://[hostname]`.
Quick check after editing:
```bash
grep "localhost" /var/www/[instancedir]/App_Data/adminConfig.json
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

## 4. PM2 (run as user mats)

```bash
su mats
cd /var/www/[instancedir]
npm install
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
