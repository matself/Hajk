#!/bin/bash
# =============================================================================
# Hajk build, deploy and install script
#
# Builds backend, client and admin from a local Hajk git repository and
# deploys them to a destination directory, prompting for this instance's
# hostname, port and instance name and writing them into .env,
# appConfig.json and admin's config.json — no hand-editing of config files
# required. A short install.sh is written into dest_dir for the target
# Ubuntu/PM2 server to run afterwards, handling ownership and dependency
# installation as the user PM2 runs as.
#
# For a local dev/test copy, answer "localhost" and a port number at the
# prompts (localhost and 3002 are the defaults) to get the same
# http://localhost:3002/api/v2 setup as a plain default build.
#
# Usage:
#   ./installbuild_me.sh <git_dir> <dest_dir>
#
#   git_dir  - path to your local Hajk git repository
#   dest_dir - path to the directory where Hajk will be deployed and run from
#
# Example:
#   ./installbuild_me.sh /home/user/hajk /srv/hajk
#
# BEFORE RUNNING THIS SCRIPT, make sure the following exist in dest_dir
# (the script will NOT create or overwrite them):
#   App_Data/   - your Hajk configuration and data files
#   static/     - will be created if missing, but existing content is preserved
#   logs/       - created automatically by the backend where needed
#
# .env is created automatically from .env.example if missing. PORT and
# HAJK_INSTANCE_ID are patched on every run to match what you enter when
# prompted; every other line in .env is left untouched.
#
# REQUIREMENTS:
#   - git
#   - Node.js and npm  (check required versions in the Hajk documentation)
# =============================================================================

# =============================================================================
# LOCAL CONFIGURATION
# This is the only section you may need to edit before running the script.
# All settings below are optional and commented out by default.
# =============================================================================

# -----------------------------------------------------------------------------
# NODE VERSION (optional)
# If you manage multiple Node versions with nvm, uncomment these lines and set
# the version number to match what Hajk requires (check .nvmrc in the repo root
# or the engines field in apps/backend/package.json).
# If you have a single system-wide Node installation, leave this commented out.
# -----------------------------------------------------------------------------
# export NVM_DIR="$HOME/.nvm"
# [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
# nvm use 18        # <-- change 18 to the required Node version if needed

# -----------------------------------------------------------------------------
# GIT BRANCH (optional)
# By default the script builds whatever branch is currently checked out in
# git_dir. Uncomment and set this if you always want to build a specific branch.
# Common values: "main", "master", or a release tag such as "v4.2.0".
# -----------------------------------------------------------------------------
# BUILD_BRANCH="master"

# -----------------------------------------------------------------------------
# Instance settings (hostname, port, instance name) are no longer hardcoded
# here. The script prompts for them interactively every run and writes them
# into .env, appConfig.json and admin's config.json, so they are always
# authoritative regardless of what was in the repo or a previous build.
# -----------------------------------------------------------------------------

# =============================================================================
# Main program
# =============================================================================

show_usage() {
    echo "Usage: $0 git_dir dest_dir" 1>&2
    exit 1
}

prompt() {
    read -p "Warning: This will RESET ALL LOCAL CHANGES in the git directory.
Press (y) to continue or any other key to abort: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
}

if [ $# -ne 2 ]; then
    show_usage
fi

# Validate git directory (first argument)
if [ -d "$1" ]; then
    GIT_DIR=$(cd "$1" && pwd)
else
    echo "Error: Invalid git directory: $1"
    exit 1
fi

# Validate destination directory (second argument)
if [ -d "$2" ]; then
    DEST_DIR=$(cd "$2" && pwd)
else
    echo "Error: Invalid destination directory: $2"
    exit 1
fi

echo "-------------------------------------------------------"
echo "Building from: ${GIT_DIR}"
echo "Deploying to:   ${DEST_DIR}"
echo "-------------------------------------------------------"

# -----------------------------------------------------------------------------
# Prompt for this instance's settings.
# These three values drive every config file this script touches, so they are
# asked once up front, before any building happens.
#
# HOSTNAME of "localhost" means no reverse proxy is involved: URLs include the
# port directly (http://localhost:$PORT), matching how a local dev/test copy
# has always been reached. Any other hostname is assumed to sit behind nginx,
# so the port is left out of the public URL (https://hostname) and only used
# internally for PORT in .env and nginx's proxy_pass.
# -----------------------------------------------------------------------------
read -p "Hostname the client/admin should use ('localhost' for a local dev/test copy) [localhost]: " INPUT_HOSTNAME
HOSTNAME="${INPUT_HOSTNAME:-localhost}"

read -p "Backend port (PORT in .env) [3002]: " INPUT_PORT
PORT="${INPUT_PORT:-3002}"

# The default is derived from the destination folder name (e.g. "hajk44" for
# /var/www/hajk44), NOT from `hostname`. `hostname` would bake the *build*
# machine's name (e.g. "Hajk-OPTIPLEX9020") into HAJK_INSTANCE_ID and the log
# file names, which is meaningless once the build is dropped onto the server.
DEFAULT_INSTANCE_NAME="$(basename "$DEST_DIR")"
read -p "Instance name (HAJK_INSTANCE_ID, also suggested as the PM2 process name) [${DEFAULT_INSTANCE_NAME}]: " INPUT_INSTANCE_NAME
INSTANCE_NAME="${INPUT_INSTANCE_NAME:-$DEFAULT_INSTANCE_NAME}"

if [ "$HOSTNAME" = "localhost" ]; then
    ADMIN_BASE="http://localhost:${PORT}"
else
    ADMIN_BASE="https://${HOSTNAME}"
fi
MAPSERVICE_BASE="${ADMIN_BASE}/api/v2"

echo "-------------------------------------------------------"
echo "Mapservice base: ${MAPSERVICE_BASE}"
echo "Admin base:      ${ADMIN_BASE}"
echo "Port:            ${PORT}"
echo "Instance name:   ${INSTANCE_NAME}"
echo "-------------------------------------------------------"

# -----------------------------------------------------------------------------
# Handle .env BEFORE building.
# If no .env exists in dest_dir, create one from the template in the repo.
# PORT and HAJK_INSTANCE_ID are then patched unconditionally (every run) so
# they always match what was just entered above; every other line in .env is
# left untouched.
# -----------------------------------------------------------------------------
if [ ! -f "$DEST_DIR/.env" ]; then
    echo "No .env found in destination. Creating from template..."
    if [ -f "$GIT_DIR/apps/backend/.env.example" ]; then
        cp "$GIT_DIR/apps/backend/.env.example" "$DEST_DIR/.env"
    else
        echo "Warning: .env.example not found in $GIT_DIR/apps/backend. You must create .env manually."
    fi
fi

if [ -f "$DEST_DIR/.env" ]; then
    sed -i "s/^PORT=.*/PORT=${PORT}/" "$DEST_DIR/.env"
    sed -i "s/^HAJK_INSTANCE_ID=.*/HAJK_INSTANCE_ID=${INSTANCE_NAME}/" "$DEST_DIR/.env"
    echo "Patched .env with PORT=${PORT} and HAJK_INSTANCE_ID=${INSTANCE_NAME}"
fi

# -----------------------------------------------------------------------------
# Prepare Git repository
# -----------------------------------------------------------------------------
cd "$GIT_DIR"

if [ -n "$BUILD_BRANCH" ]; then
    echo "Switching to branch: ${BUILD_BRANCH}"
    git checkout "$BUILD_BRANCH"
fi

echo "Current branch: $(git rev-parse --abbrev-ref HEAD)"

prompt

echo "Fetching latest code and resetting repository..."
# git fetch --all
# git reset --hard origin/$(git rev-parse --abbrev-ref HEAD)

# =============================================================================
# Part 1: Backend
# =============================================================================
echo ""
echo "--- Part 1: Backend ---"
cd "$GIT_DIR/apps/backend"

echo "Installing backend dependencies..."
# npm ci installs exactly what is in package-lock.json for reproducible builds.
# node_modules is NOT removed first — npm ci handles that itself, and removing
# it manually is very slow on Windows due to the large number of small files.
npm ci

echo "Building backend..."
npm run compile
# The compile step produces a dist/ directory with the compiled backend files.

echo "Deploying backend to destination..."
# Protect .env across the copy: save it, copy backend files, then restore it.
# The dist/* glob does not expand dotfiles in bash, but this guard ensures
# .env survives regardless of what the backend build produces in dist/.
[ -f "$DEST_DIR/.env" ] && cp "$DEST_DIR/.env" "$DEST_DIR/.env.bak"
cp -r dist/* "$DEST_DIR"
cp package*.json "$DEST_DIR"
[ -f "$DEST_DIR/.env.bak" ] && mv "$DEST_DIR/.env.bak" "$DEST_DIR/.env"

echo "Deploying App_Data to destination..."
# App_Data holds map and layer configuration (layers.json, map_*.json, etc).
# It is not part of the compiled dist/ output so must be copied explicitly.
# Existing files in dest App_Data are overwritten to keep config in sync with
# the repo, but any files present only in the destination are left untouched
# (e.g. extra map configs created via the admin UI).
mkdir -p "$DEST_DIR/App_Data"
cp -r "$GIT_DIR/apps/backend/App_Data/." "$DEST_DIR/App_Data"

# Backend production dependencies (npm ci --omit=dev) are intentionally NOT
# installed here. On a real deployment, dest_dir is typically owned by root
# (or whoever ran this script) at this point, but PM2 needs to run as a
# specific system user. Installing node_modules now would leave them owned by
# the wrong user. Instead, the generated install.sh (see end of this script)
# sets ownership first and then installs dependencies as the correct user.

# =============================================================================
# Part 2: Client UI
# =============================================================================
echo ""
echo "--- Part 2: Client UI ---"
cd "$GIT_DIR/apps/client"

echo "Installing client dependencies..."
npm ci

echo "Building Client UI..."
npm run build
# Depending on the version of Hajk/Vite, the output directory may be named
# either 'build/' (older, Create React App) or 'dist/' (newer, Vite).
if [ -d "dist" ]; then
    CLIENT_BUILD_DIR="$GIT_DIR/apps/client/dist"
elif [ -d "build" ]; then
    CLIENT_BUILD_DIR="$GIT_DIR/apps/client/build"
else
    echo "ERROR: Could not find client build output. Expected 'dist/' or 'build/' in $GIT_DIR/apps/client"
    exit 1
fi
echo "Client build output found in: ${CLIENT_BUILD_DIR}"

echo "Copying client to destination..."
# Wipe destination first to remove stale files from previous builds.
# The trailing /. on the source copies the *contents* of the build directory,
# not the directory itself, so files land in static/client/ directly.
rm -rf "$DEST_DIR/static/client"
mkdir -p "$DEST_DIR/static/client"
cp -r "$CLIENT_BUILD_DIR/." "$DEST_DIR/static/client"

# Patch mapserviceBase in appConfig.json so the deployed client always points
# to the correct backend, regardless of what was committed in the repo.
APPCONFIG="$DEST_DIR/static/client/appConfig.json"
if [ -f "$APPCONFIG" ]; then
    sed -i "s|\"mapserviceBase\":.*|\"mapserviceBase\": \"${MAPSERVICE_BASE}\",|" "$APPCONFIG"
    echo "Patched mapserviceBase to: ${MAPSERVICE_BASE}"
else
    echo "WARNING: appConfig.json not found at ${APPCONFIG} - mapserviceBase not patched."
fi

# =============================================================================
# Part 3: Admin UI
# =============================================================================
echo ""
echo "--- Part 3: Admin UI ---"
cd "$GIT_DIR/apps/admin"

echo "Installing admin dependencies..."
npm ci

echo "Building Admin UI..."
npm run build
# Same build output detection as client above.
if [ -d "dist" ]; then
    ADMIN_BUILD_DIR="$GIT_DIR/apps/admin/dist"
elif [ -d "build" ]; then
    ADMIN_BUILD_DIR="$GIT_DIR/apps/admin/build"
else
    echo "ERROR: Could not find admin build output. Expected 'dist/' or 'build/' in $GIT_DIR/apps/admin"
    exit 1
fi
echo "Admin build output found in: ${ADMIN_BUILD_DIR}"

echo "Copying admin to destination..."
rm -rf "$DEST_DIR/static/admin"
mkdir -p "$DEST_DIR/static/admin"
cp -r "$ADMIN_BUILD_DIR/." "$DEST_DIR/static/admin"

# Patch admin's config.json: every url_* field hardcodes the backend origin as
# http://localhost:3002 (e.g. "http://localhost:3002/api/v2/mapconfig/list").
# Replace just the origin with ADMIN_BASE so the existing "/api/v2/..." paths
# are preserved untouched.
ADMINCONFIG="$DEST_DIR/static/admin/config.json"
if [ -f "$ADMINCONFIG" ]; then
    sed -i "s|http://localhost:3002|${ADMIN_BASE}|g" "$ADMINCONFIG"
    echo "Patched admin config.json origin to: ${ADMIN_BASE}"
else
    echo "WARNING: config.json not found at ${ADMINCONFIG} - admin URLs not patched."
fi

# =============================================================================
# Part 4: Installation script
# =============================================================================
echo ""
echo "--- Part 4: Installation script ---"
# Write a short script into dest_dir for the target Ubuntu/PM2 server. It is
# run there (not here) because ownership and dependency installation must
# happen as the user PM2 will actually run as, which this build script has no
# way of knowing or becoming.
INSTALL_SCRIPT="$DEST_DIR/install.sh"
cat > "$INSTALL_SCRIPT" <<'EOF'
#!/bin/bash
# =============================================================================
# Hajk installation script
#
# Run this once on the target server, from inside the deployed folder, after
# the build archive has been extracted here (e.g. /var/www/[instancedir]):
#   sudo ./install.sh
#
# It sets file ownership to the user that will run Hajk via PM2, then installs
# backend production dependencies as that user.
# =============================================================================
set -e

cd "$(dirname "$0")"

if [ "$(id -u)" -ne 0 ]; then
    echo "Error: this script changes file ownership and must be run as root, e.g.: sudo ./install.sh" 1>&2
    exit 1
fi

read -p "Which system user will own these files and run Hajk via PM2? " OWNER

if ! id "$OWNER" >/dev/null 2>&1; then
    echo "Error: user '$OWNER' does not exist on this system." 1>&2
    exit 1
fi

echo "Setting ownership of $(pwd) to ${OWNER}:${OWNER}..."
chown -R "${OWNER}:${OWNER}" .

echo "Installing backend production dependencies as ${OWNER}..."
rm -rf node_modules
sudo -u "$OWNER" npm ci --omit=dev

echo ""
echo "======================================================="
echo "Installation complete."
echo "Start Hajk with:   node index.js"
echo "Or, with PM2:      pm2 start index.js --name INSTANCE_NAME_PLACEHOLDER"
echo "(run the PM2 command as ${OWNER}, e.g.: su ${OWNER})"
echo "======================================================="
EOF
sed -i "s/INSTANCE_NAME_PLACEHOLDER/${INSTANCE_NAME}/" "$INSTALL_SCRIPT"
chmod +x "$INSTALL_SCRIPT"
echo "Wrote installation script: ${INSTALL_SCRIPT}"

# =============================================================================
# Part 5: Single-archive artifact (server builds only)
# =============================================================================
# For a server deployment the build must cross machines (build host -> VPS).
# Copying the folder as a tree (WinSCP, scp -r, drag-and-drop) can silently
# drop individual files, producing a deployment that's missing e.g. a single
# service module and crashes on startup. Packaging the whole build into ONE
# .tar.gz (written inside dest_dir itself) makes the transfer atomic - it either
# arrives whole or the extract fails loudly - and preserves the execute bit on
# install.sh, which per-file transfers routinely strip. node_modules is excluded
# (install.sh rebuilds it on the server), keeping the archive small.
#
# Skipped for localhost builds, which never leave this machine.
ARCHIVE_PATH=""
if [ "$HOSTNAME" != "localhost" ]; then
    echo ""
    echo "--- Part 5: Packaging single-archive artifact ---"
    DEST_PARENT="$(dirname "$DEST_DIR")"
    DEST_BASENAME="$(basename "$DEST_DIR")"
    ARCHIVE_NAME="${DEST_BASENAME}.tar.gz"

    # The finished archive lives INSIDE dest_dir. Two reasons:
    #   1. dest_dir is always writable (the build just filled it), which sidesteps
    #      the failure of writing a sibling next to a dest at e.g. a Windows drive
    #      root (C:\FOO -> C:\FOO.tar.gz, blocked without admin).
    #   2. The deployable package lives next to the files it contains, so the
    #      build output and the thing you copy to the server never drift apart,
    #      and the package is easy to inspect (tar tzf) right where you built it.
    # tar reads the tree from the parent so it unpacks as dest_dir/... on the
    # server, excluding the archive itself and node_modules (install.sh rebuilds
    # node_modules there).
    ARCHIVE_PATH="${DEST_DIR}/${ARCHIVE_NAME}"
    rm -f "$ARCHIVE_PATH"

    # Build the archive in a temp file OUTSIDE dest_dir, then move it in.
    # Writing it directly inside the folder being archived makes tar warn
    # "file changed as we read it" and exit non-zero (the directory's contents
    # change as the archive file grows), even though the archive is fine. A temp
    # build keeps tar's exit status trustworthy, and the finished package still
    # lands inside dest_dir. The excludes still drop a stale archive from a
    # previous run and node_modules.
    TMP_ARCHIVE="$(mktemp 2>/dev/null || echo "${HOME}/.hajk-pkg.$$.tmp")"
    if tar czf "$TMP_ARCHIVE" -C "$DEST_PARENT" \
        --exclude="${DEST_BASENAME}/${ARCHIVE_NAME}" \
        --exclude="${DEST_BASENAME}/node_modules" \
        "$DEST_BASENAME"; then
        mv -f "$TMP_ARCHIVE" "$ARCHIVE_PATH"
        echo "Wrote deployment archive: ${ARCHIVE_PATH}"
    else
        rm -f "$TMP_ARCHIVE" 2>/dev/null
        echo "WARNING: build in ${DEST_DIR} is complete, but packaging the archive failed." 1>&2
        ARCHIVE_PATH=""
    fi
fi

# =============================================================================
echo ""
echo "======================================================="
echo "Build complete!"
echo "Destination: ${DEST_DIR}"
if [ "$HOSTNAME" = "localhost" ]; then
    echo "Local copy - start it directly, no install.sh needed:"
    echo "  cd ${DEST_DIR} && npm ci --omit=dev && node index.js"
elif [ -n "$ARCHIVE_PATH" ]; then
    echo "Deployment archive: ${ARCHIVE_PATH}"
    echo ""
    echo "Drop-and-run on the target server (as one atomic file - no tree copy):"
    echo "  1. Transfer the ONE archive:   scp ${ARCHIVE_PATH} user@server:/tmp/"
    echo "  2. Extract into the site dir:  sudo tar xzf /tmp/${ARCHIVE_NAME} -C /var/www/"
    echo "  3. Install (chown + deps):     cd /var/www/${DEST_BASENAME} && sudo ./install.sh"
else
    echo "Build is complete in ${DEST_DIR}, but the archive was not created (see WARNING above)."
fi
echo "======================================================="
