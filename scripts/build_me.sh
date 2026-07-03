#!/bin/bash
# =============================================================================
# Hajk build and deploy script
#
# Builds backend, client and admin from a local Hajk git repository and
# deploys them to a destination directory from which Hajk can be run with:
#   node index.js
#
# Usage:
#   ./build.sh <git_dir> <dest_dir>
#
#   git_dir  - path to your local Hajk git repository
#   dest_dir - path to the directory where Hajk will be deployed and run from
#
# Example:
#   ./build.sh /home/user/hajk /srv/hajk
#
# BEFORE RUNNING THIS SCRIPT, make sure the following exist in dest_dir
# (the script will NOT create or overwrite them):
#   App_Data/   - your Hajk configuration and data files
#   static/     - will be created if missing, but existing content is preserved
#   .env        - created automatically from .env.example if missing, but you
#                 should review and edit it before starting Hajk
#   logs/       - created automatically by the backend where needed#
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
# MAPSERVICE BASE URL
# The URL the client uses to reach the backend API. This is patched into
# appConfig.json after the client build is copied to the destination, so
# the value here is always authoritative regardless of what was in the repo.
# Adjust the port if your backend runs on something other than 3002.
# -----------------------------------------------------------------------------
MAPSERVICE_BASE="http://localhost:3002/api/v2"

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
# Handle .env BEFORE building.
# If no .env exists in dest_dir, create one from the template in the repo.
# If .env already exists it is never touched.
# -----------------------------------------------------------------------------
if [ ! -f "$DEST_DIR/.env" ]; then
    echo "No .env found in destination. Creating from template..."
    if [ -f "$GIT_DIR/apps/backend/.env.example" ]; then
        cp "$GIT_DIR/apps/backend/.env.example" "$DEST_DIR/.env"
        sed -i "s/^HAJK_INSTANCE_ID=.*/HAJK_INSTANCE_ID=Hajk-$(hostname)/" "$DEST_DIR/.env"
        echo "Created .env with HAJK_INSTANCE_ID=Hajk-$(hostname)"
    else
        echo "Warning: .env.example not found in $GIT_DIR/apps/backend. You must create .env manually."
    fi
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

echo "Installing backend production dependencies in destination..."
# npm ci is run in the destination directory so that node_modules ends up
# there alongside the compiled code, ready to run with: node index.js
# --omit=dev installs only production dependencies.
cd "$DEST_DIR"
rm -rf node_modules
npm ci --omit=dev

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

# =============================================================================
echo ""
echo "======================================================="
echo "Build complete!"
echo "Destination: ${DEST_DIR}"
echo "To start Hajk, run: node ${DEST_DIR}/index.js"
echo "======================================================="