# hajk-backend

Hajk backend

## Quick start

1. Review settings in `.env`
2. Install dependencies

```shell
# install deps
npm install
```

3. Run

```shell
# run in development mode with auto-reload on file changes
npm run dev

# or debug it, to enable debugging in e.g. VS Code

npm run dev:debug
```

4. Ensure that client and admin are using the new backend
   This is pretty obvious, but it's worth to be reminded of. Make sure that `client/appConfig.json` and `admin/config.json` point to the new API (which be default would be running on http://localhost:3002/api/v1/).

   A note regarding admin: some endpoints have changed, to ensure that admin-specific methods can't be accessed from any client. In short, you need to replace `/config` with `/mapconfig` in your `admin/config.json`. For example:

   ```json
   // Before:
   "url_map_list": "http://localhost:55630/config/list",

   // After:
   "url_map_list": "http://localhost:3002/api/v1/mapconfig/list",
   ```

   The `/config` endpoints is still there, but in a scenario where ActiveDirectory authentication is active, the response sent by `/config` will be "washed" to respect any restrictions on layers and map configurations. We want the admin UI to always show the entire contents of our data store, and therefore another endpoint is now used for those requests.

## Deploy

First compile the application:

```shell
npm run compile
```

This will create a new folder, `/dist`.

You can now start the app in production mode (`npm start`). But it's preferable to move the contents of `/dist` to some other location, outside of the development branch. Do something like:

```shell
# Copy the compiled files
cp dist/* /opt/wwwroot/hajk

# Bring the settings from .env
cp .env /opt/wwwroot/hajk

# Bring the App_Data folder (our map and layers configuration) 
cp -r App_Data /opt/wwwroot/hajk

# Bring info on NPM modules too
cp package*.json /opt/wwwroot/hajk

# Get there…
cd /opt/wwwroot/hajk

# Install modules
npm i

# Ready to run
node index.js
```

### Run as a service

Optionally, install PM2 to ensure that the app is run as a service (auto-started on server reboots, etc).

### Serve client and admin from Node too

Optionally, you can make this Node process serve the static client and admin apps as well.

To do that, move the previously compiled (`build` folders) from `client` and `admin` into `/opt/wwwroot/hajk/public`. Or, even better, move `admin` into a directory in `/public`, but let contents of `client/build` be the root of `public`. In this scenario, you can access Hajk's client app on localhost:3002, the API will be running on localhost:3002/api/v1, and `admin` will be available on localhost:3002/admin. Make sure to edit `client/appConfig.json` and `admin/config.json` to talk to the API on correct endpoint.

### Protecting `/admin` without Active Directory

Hajk normally restricts `/admin` and its API (`mapconfig`, `settings`, `ad`) by AD group
membership (see `RESTRICT_ADMIN_ACCESS_TO_AD_GROUPS` and the `AD_*` settings in `.env`).
If you don't run AD - e.g. a plain Ubuntu/Nginx deployment - you can instead protect the
admin interface with a single shared password, changeable at any time:

1. Generate a password hash (run from `apps/backend`):

   ```shell
   npm run hash-admin-password -- "yourPassword"
   ```

2. Paste the printed `salt:hash` value into `.env` as `ADMIN_PASSWORD_HASH`.
3. Make sure `EXPOSE_AND_RESTRICT_STATIC_ADMIN` is set to a non-empty value (the default
   `GIS_ADMIN` is fine - its actual content is ignored in password mode, but the key must
   be present for the `/admin` gate to be wired up at all).
4. Make sure `AD_LOOKUP_ACTIVE` is not `"true"` (password mode only engages when AD is off).
5. Restart the backend.

Visiting `/admin` (or calling the admin API directly) now requires logging in with the
shared password first. A successful login grants a signed, 6-hour session cookie -
no user list, nothing to manage beyond the one password.

To change the password later: repeat steps 1-2 with the new password and restart the
backend - no code changes needed. To disable password protection again, remove
`ADMIN_PASSWORD_HASH` from `.env` and restart.

If you're also running Nginx (or another reverse proxy) in front of Hajk, this native gate
covers both `/admin` and its API in one place, so you can drop any proxy-level Basic Auth
you may have added for `/admin` alone - just keep the proxy handling TLS termination.
