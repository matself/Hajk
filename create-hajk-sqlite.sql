-- Hajk SQLite Database Schema with Sample Data
-- This creates a minimal but complete database for testing

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Session table
CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sid" TEXT NOT NULL UNIQUE,
  "data" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL
);

-- User and authentication
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "fullName" TEXT NOT NULL,
  "strategy" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "LocalAccount" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  "email" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "expires" DATETIME,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Roles and permissions
CREATE TABLE IF NOT EXISTS "Role" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "title" TEXT,
  "description" TEXT,
  "systemCriticalRole" BOOLEAN NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "RoleOnUser" (
  "userId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  PRIMARY KEY ("userId", "roleId"),
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE
);

-- Projections
CREATE TABLE IF NOT EXISTS "Projection" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "locked" BOOLEAN NOT NULL DEFAULT 0,
  "code" TEXT NOT NULL UNIQUE,
  "definition" TEXT NOT NULL,
  "extent" TEXT NOT NULL DEFAULT '[]',
  "units" TEXT
);

-- Maps
CREATE TABLE IF NOT EXISTS "Map" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "locked" BOOLEAN NOT NULL DEFAULT 0,
  "name" TEXT NOT NULL UNIQUE,
  "options" TEXT NOT NULL DEFAULT '{}',
  "projectionId" INTEGER,
  "createdBy" TEXT,
  "createdDate" DATETIME,
  "lastSavedBy" TEXT,
  "lastSavedDate" DATETIME,
  FOREIGN KEY ("projectionId") REFERENCES "Projection"("id")
);

CREATE INDEX "Map_name_idx" ON "Map"("name");

CREATE TABLE IF NOT EXISTS "RoleOnMap" (
  "mapId" INTEGER NOT NULL,
  "roleId" TEXT NOT NULL,
  PRIMARY KEY ("mapId", "roleId"),
  FOREIGN KEY ("mapId") REFERENCES "Map"("id") ON DELETE CASCADE,
  FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE
);

-- Themes
CREATE TABLE IF NOT EXISTS "Theme" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "mapName" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "owner" TEXT,
  "description" TEXT,
  "keywords" TEXT NOT NULL DEFAULT '[]',
  "data" TEXT NOT NULL DEFAULT '{}',
  "createdBy" TEXT,
  "createdDate" DATETIME,
  "lastSavedBy" TEXT,
  "lastSavedDate" DATETIME,
  FOREIGN KEY ("mapName") REFERENCES "Map"("name") ON DELETE CASCADE
);

CREATE INDEX "Theme_mapName_idx" ON "Theme"("mapName");

-- Services
CREATE TABLE IF NOT EXISTS "Service" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "metadataId" TEXT UNIQUE,
  "projectionId" INTEGER,
  "name" TEXT NOT NULL,
  "locked" BOOLEAN NOT NULL DEFAULT 0,
  "url" TEXT NOT NULL,
  "version" TEXT NOT NULL DEFAULT '1.3.0',
  "imageFormat" TEXT NOT NULL DEFAULT 'image/png',
  "type" TEXT NOT NULL,
  "serverType" TEXT NOT NULL DEFAULT 'GEOSERVER',
  "workspace" TEXT,
  "getMapUrl" TEXT,
  "comment" TEXT,
  "createdBy" TEXT,
  "createdDate" DATETIME,
  "lastSavedBy" TEXT,
  "lastSavedDate" DATETIME,
  "healthStatus" TEXT,
  "healthCheckedAt" DATETIME,
  "deletedAt" DATETIME,
  FOREIGN KEY ("projectionId") REFERENCES "Projection"("id")
);

CREATE INDEX "Service_id_idx" ON "Service"("id");
CREATE INDEX "Service_deletedAt_idx" ON "Service"("deletedAt");

-- Metadata
CREATE TABLE IF NOT EXISTS "Metadata" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT,
  "description" TEXT,
  "owner" TEXT,
  "url" TEXT,
  "urlTitle" TEXT,
  "urlOpenData" TEXT,
  "attribution" TEXT,
  "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Display Layers (WMS, WMTS, etc)
CREATE TABLE IF NOT EXISTS "DisplayLayer" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "serviceId" TEXT NOT NULL,
  "metadataId" TEXT UNIQUE,
  "infoClickSettingsId" TEXT UNIQUE,
  "selectedLayers" TEXT NOT NULL DEFAULT '[]',
  "locked" BOOLEAN NOT NULL DEFAULT 0,
  "name" TEXT NOT NULL,
  "internalName" TEXT,
  "description" TEXT,
  "opacity" REAL NOT NULL DEFAULT 1,
  "maxZoom" INTEGER NOT NULL DEFAULT -1,
  "minZoom" INTEGER NOT NULL DEFAULT -1,
  "minMaxZoomAlertOnToggleOnly" BOOLEAN NOT NULL DEFAULT 0,
  "tiled" BOOLEAN NOT NULL DEFAULT 0,
  "singleTile" BOOLEAN NOT NULL DEFAULT 0,
  "hidpi" BOOLEAN NOT NULL DEFAULT 0,
  "legendOptions" TEXT,
  "legendUrl" TEXT,
  "legendIconUrl" TEXT,
  "style" TEXT,
  "customRatio" INTEGER NOT NULL DEFAULT 0,
  "showMetadata" BOOLEAN NOT NULL DEFAULT 0,
  "infoClickActive" BOOLEAN NOT NULL DEFAULT 1,
  "timeSliderVisible" BOOLEAN NOT NULL DEFAULT 0,
  "timeSliderStart" TEXT,
  "timeSliderEnd" TEXT,
  "hideExpandArrow" BOOLEAN NOT NULL DEFAULT 0,
  "zIndex" INTEGER NOT NULL DEFAULT 0,
  "createdBy" TEXT,
  "createdDate" DATETIME,
  "lastSavedBy" TEXT,
  "lastSavedDate" DATETIME,
  "deletedAt" DATETIME,
  "options" TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY ("serviceId") REFERENCES "Service"("id")
);

CREATE INDEX "DisplayLayer_serviceId_idx" ON "DisplayLayer"("serviceId");
CREATE INDEX "DisplayLayer_deletedAt_idx" ON "DisplayLayer"("deletedAt");

CREATE TABLE IF NOT EXISTS "RoleOnDisplayLayer" (
  "displayLayerId" TEXT NOT NULL PRIMARY KEY,
  "roleId" TEXT,
  FOREIGN KEY ("displayLayerId") REFERENCES "DisplayLayer"("id") ON DELETE CASCADE,
  FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE
);

-- Search Layers (WFS)
CREATE TABLE IF NOT EXISTS "SearchLayer" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "serviceId" TEXT NOT NULL,
  "metadataId" TEXT UNIQUE,
  "selectedLayers" TEXT NOT NULL DEFAULT '[]',
  "locked" BOOLEAN NOT NULL DEFAULT 0,
  "name" TEXT NOT NULL,
  "internalName" TEXT,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT 0,
  "url" TEXT,
  "searchFields" TEXT NOT NULL DEFAULT '[]',
  "primaryDisplayFields" TEXT NOT NULL DEFAULT '[]',
  "secondaryDisplayFields" TEXT NOT NULL DEFAULT '[]',
  "shortDisplayFields" TEXT NOT NULL DEFAULT '[]',
  "outputFormat" TEXT NOT NULL DEFAULT 'GML3',
  "geometryField" TEXT,
  "infobox" TEXT,
  "aliasDict" TEXT,
  "zIndex" INTEGER NOT NULL DEFAULT 0,
  "createdBy" TEXT,
  "createdDate" DATETIME,
  "lastSavedBy" TEXT,
  "lastSavedDate" DATETIME,
  "deletedAt" DATETIME,
  "options" TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY ("serviceId") REFERENCES "Service"("id")
);

CREATE INDEX "SearchLayer_serviceId_idx" ON "SearchLayer"("serviceId");
CREATE INDEX "SearchLayer_deletedAt_idx" ON "SearchLayer"("deletedAt");

CREATE TABLE IF NOT EXISTS "RoleOnSearchLayer" (
  "searchLayerId" TEXT NOT NULL PRIMARY KEY,
  "roleId" TEXT,
  FOREIGN KEY ("searchLayerId") REFERENCES "SearchLayer"("id") ON DELETE CASCADE,
  FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE
);

-- Editing Layers (WFST)
CREATE TABLE IF NOT EXISTS "EditingLayer" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "serviceId" TEXT NOT NULL,
  "selectedLayers" TEXT NOT NULL DEFAULT '[]',
  "locked" BOOLEAN NOT NULL DEFAULT 0,
  "name" TEXT NOT NULL,
  "internalName" TEXT,
  "description" TEXT,
  "geometryField" TEXT,
  "createdBy" TEXT,
  "createdDate" DATETIME,
  "lastSavedBy" TEXT,
  "lastSavedDate" DATETIME,
  "deletedAt" DATETIME,
  "options" TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY ("serviceId") REFERENCES "Service"("id")
);

CREATE INDEX "EditingLayer_serviceId_idx" ON "EditingLayer"("serviceId");
CREATE INDEX "EditingLayer_deletedAt_idx" ON "EditingLayer"("deletedAt");

CREATE TABLE IF NOT EXISTS "RoleOnEditingLayer" (
  "editingLayerId" TEXT NOT NULL PRIMARY KEY,
  "roleId" TEXT,
  FOREIGN KEY ("editingLayerId") REFERENCES "EditingLayer"("id") ON DELETE CASCADE,
  FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE
);

-- Tools/Plugins
CREATE TABLE IF NOT EXISTS "ToolType" (
  "type" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT
);

CREATE TABLE IF NOT EXISTS "Tool" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "locked" BOOLEAN NOT NULL DEFAULT 0,
  "type" TEXT NOT NULL,
  "title" TEXT,
  "options" TEXT NOT NULL DEFAULT '{}',
  "createdBy" TEXT,
  "createdDate" DATETIME,
  "lastSavedBy" TEXT,
  "lastSavedDate" DATETIME,
  "deletedAt" DATETIME,
  FOREIGN KEY ("type") REFERENCES "ToolType"("type")
);

CREATE INDEX "Tool_deletedAt_idx" ON "Tool"("deletedAt");

CREATE TABLE IF NOT EXISTS "ToolsOnMaps" (
  "mapName" TEXT NOT NULL,
  "toolId" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT 1,
  "index" INTEGER NOT NULL DEFAULT 0,
  "target" TEXT,
  "options" TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY ("mapName", "toolId"),
  FOREIGN KEY ("mapName") REFERENCES "Map"("name") ON DELETE CASCADE,
  FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "RoleOnTool" (
  "toolId" INTEGER NOT NULL,
  "roleId" TEXT NOT NULL,
  PRIMARY KEY ("toolId", "roleId"),
  FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE,
  FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE
);

-- Remove old RoleOnTool inserts as they reference wrong IDs

-- Groups
CREATE TABLE IF NOT EXISTS "Group" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "locked" BOOLEAN NOT NULL DEFAULT 0,
  "name" TEXT NOT NULL,
  "internalName" TEXT,
  "type" TEXT NOT NULL DEFAULT 'Layer',
  "createdBy" TEXT,
  "createdDate" DATETIME,
  "lastSavedBy" TEXT,
  "lastSavedDate" DATETIME
);

CREATE TABLE IF NOT EXISTS "RoleOnGroup" (
  "groupId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  PRIMARY KEY ("groupId", "roleId"),
  FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE,
  FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE
);

-- Layer Instances (a layer in a specific map/group)
CREATE TABLE IF NOT EXISTS "LayerInstance" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "displayLayerId" TEXT,
  "searchLayerId" TEXT,
  "editingLayerId" TEXT,
  "mapId" INTEGER,
  "groupId" TEXT,
  "usage" TEXT,
  "infoClickActive" BOOLEAN NOT NULL DEFAULT 1,
  "visibleAtStart" BOOLEAN NOT NULL DEFAULT 0,
  "zIndex" INTEGER NOT NULL DEFAULT 0,
  "options" TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY ("displayLayerId") REFERENCES "DisplayLayer"("id") ON DELETE CASCADE,
  FOREIGN KEY ("searchLayerId") REFERENCES "SearchLayer"("id") ON DELETE CASCADE,
  FOREIGN KEY ("editingLayerId") REFERENCES "EditingLayer"("id") ON DELETE CASCADE,
  FOREIGN KEY ("mapId") REFERENCES "Map"("id") ON DELETE CASCADE,
  FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE
);

CREATE INDEX "LayerInstance_displayLayerId_idx" ON "LayerInstance"("displayLayerId");
CREATE INDEX "LayerInstance_searchLayerId_idx" ON "LayerInstance"("searchLayerId");
CREATE INDEX "LayerInstance_editingLayerId_idx" ON "LayerInstance"("editingLayerId");
CREATE INDEX "LayerInstance_mapId_idx" ON "LayerInstance"("mapId");
CREATE INDEX "LayerInstance_groupId_idx" ON "LayerInstance"("groupId");

CREATE TABLE IF NOT EXISTS "RoleOnLayerInstance" (
  "layerInstanceId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  PRIMARY KEY ("layerInstanceId", "roleId"),
  FOREIGN KEY ("layerInstanceId") REFERENCES "LayerInstance"("id") ON DELETE CASCADE,
  FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE
);

-- Groups on Maps (hierarchy)
CREATE TABLE IF NOT EXISTS "GroupsOnMaps" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "mapName" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "parentGroupId" TEXT,
  "usage" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "toggled" BOOLEAN NOT NULL,
  "expanded" BOOLEAN NOT NULL,
  "exclusiveGroup" BOOLEAN NOT NULL DEFAULT 0,
  "infoDocument" BOOLEAN NOT NULL DEFAULT 0,
  "metadataId" TEXT,
  "index" INTEGER NOT NULL DEFAULT 0,
  "layerVisibleAtStart" BOOLEAN NOT NULL DEFAULT 0,
  "layerInfoBox" TEXT,
  FOREIGN KEY ("mapName") REFERENCES "Map"("name") ON DELETE CASCADE,
  FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE,
  FOREIGN KEY ("parentGroupId") REFERENCES "GroupsOnMaps"("id") ON DELETE CASCADE,
  FOREIGN KEY ("metadataId") REFERENCES "Metadata"("id")
);

CREATE INDEX "GroupsOnMaps_mapName_idx" ON "GroupsOnMaps"("mapName");
CREATE INDEX "GroupsOnMaps_groupId_idx" ON "GroupsOnMaps"("groupId");

-- Documents/InfoPanel
CREATE TABLE IF NOT EXISTS "DocumentFolder" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "toolId" INTEGER NOT NULL,
  "createdBy" TEXT,
  "createdDate" DATETIME,
  "lastSavedBy" TEXT,
  "lastSavedDate" DATETIME,
  UNIQUE("toolId", "name"),
  FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Document" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL DEFAULT '{"chapters":[]}',
  "toolId" INTEGER NOT NULL,
  "folderId" INTEGER NOT NULL,
  "createdBy" TEXT,
  "createdDate" DATETIME,
  "lastSavedBy" TEXT,
  "lastSavedDate" DATETIME,
  UNIQUE("toolId", "folderId", "name"),
  FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE,
  FOREIGN KEY ("folderId") REFERENCES "DocumentFolder"("id") ON DELETE RESTRICT
);

-- ===== SAMPLE DATA =====

-- Projections
INSERT INTO "Projection" ("code", "definition", "extent", "units") VALUES
  ('EPSG:3006', '+proj=utm +zone=33 +ellps=GRS80 +units=m +no_defs +type=crs', '[-1200000, 4700000, 2500000, 7500000]', 'm'),
  ('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs +type=crs', '[-180, -90, 180, 90]', 'degrees');

-- Services
INSERT INTO "Service" ("id", "name", "url", "type", "serverType", "createdBy", "createdDate") VALUES
  ('wms-geoserver', 'GeoServer WMS', 'http://localhost:8080/geoserver/wms', 'WMS', 'GEOSERVER', 'admin', CURRENT_TIMESTAMP),
  ('wfs-geoserver', 'GeoServer WFS', 'http://localhost:8080/geoserver/wfs', 'WFS', 'GEOSERVER', 'admin', CURRENT_TIMESTAMP),
  ('wmts-local', 'Local WMTS', 'http://localhost:8080/wmts', 'WMTS', 'GEOSERVER', 'admin', CURRENT_TIMESTAMP);

-- Tool Types
INSERT INTO "ToolType" ("type", "title", "description") VALUES
  ('layerswitcher', 'Layer Switcher', 'Switch between layers and groups'),
  ('search', 'Search', 'Search layers'),
  ('print', 'Print', 'Print map'),
  ('measure', 'Measurer', 'Measure distances and areas'),
  ('sketch', 'Sketch', 'Draw on map'),
  ('documenthandler', 'Document Handler', 'Display documents');

-- Roles
INSERT INTO "Role" ("id", "code", "title", "description", "systemCriticalRole") VALUES
  ('admin', 'ADMIN', 'Administrator', 'Full system access', 1),
  ('editor', 'EDITOR', 'Editor', 'Can edit maps and layers', 0),
  ('viewer', 'VIEWER', 'Viewer', 'Read-only access', 0);

-- Users
INSERT INTO "User" ("id", "email", "fullName", "strategy") VALUES
  ('u1', 'admin@hajk.local', 'Admin User', 'LOCAL'),
  ('u2', 'editor@hajk.local', 'Editor User', 'LOCAL'),
  ('u3', 'viewer@hajk.local', 'Viewer User', 'LOCAL');

INSERT INTO "LocalAccount" ("id", "userId", "email", "password", "fullName") VALUES
  ('la1', 'u1', 'admin@hajk.local', '$2b$10$dummy_hash_admin', 'Admin User'),
  ('la2', 'u2', 'editor@hajk.local', '$2b$10$dummy_hash_editor', 'Editor User'),
  ('la3', 'u3', 'viewer@hajk.local', '$2b$10$dummy_hash_viewer', 'Viewer User');

-- Assign roles to users
INSERT INTO "RoleOnUser" ("userId", "roleId") VALUES
  ('u1', 'admin'),
  ('u2', 'editor'),
  ('u3', 'viewer');

-- Maps
INSERT INTO "Map" ("name", "options", "projectionId", "createdBy", "createdDate") VALUES
  ('default', '{"center": [15.2, 62.0], "zoom": 4}', 1, 'admin', CURRENT_TIMESTAMP),
  ('districts', '{"center": [15.5, 62.5], "zoom": 5}', 1, 'admin', CURRENT_TIMESTAMP);

-- Display Layers
INSERT INTO "DisplayLayer" ("id", "serviceId", "name", "internalName", "selectedLayers", "createdBy", "createdDate") VALUES
  ('layer1', 'wms-geoserver', 'Buildings', 'geoserver:buildings', '["buildings"]', 'admin', CURRENT_TIMESTAMP),
  ('layer2', 'wms-geoserver', 'Roads', 'geoserver:roads', '["roads"]', 'admin', CURRENT_TIMESTAMP),
  ('layer3', 'wms-geoserver', 'Parks', 'geoserver:parks', '["parks"]', 'admin', CURRENT_TIMESTAMP);

-- Search Layers
INSERT INTO "SearchLayer" ("id", "serviceId", "name", "internalName", "searchFields", "primaryDisplayFields", "createdBy", "createdDate") VALUES
  ('search1', 'wfs-geoserver', 'Address Search', 'geoserver:addresses', '["address", "city"]', '["address", "city"]', 'admin', CURRENT_TIMESTAMP);

-- Groups
INSERT INTO "Group" ("id", "name", "type", "createdBy", "createdDate") VALUES
  ('g1', 'Infrastructure', 'Layer', 'admin', CURRENT_TIMESTAMP),
  ('g2', 'Environment', 'Layer', 'admin', CURRENT_TIMESTAMP),
  ('g3', 'Search Layers', 'Search', 'admin', CURRENT_TIMESTAMP);

-- Layer Instances in Map
INSERT INTO "LayerInstance" ("id", "displayLayerId", "mapId", "usage", "visibleAtStart", "zIndex") VALUES
  ('li1', 'layer1', 1, 'FOREGROUND', 1, 10),
  ('li2', 'layer2', 1, 'FOREGROUND', 1, 9),
  ('li3', 'layer3', 1, 'FOREGROUND', 0, 8),
  ('li4', 'layer1', 2, 'FOREGROUND', 1, 10);

-- Groups on Maps
INSERT INTO "GroupsOnMaps" ("id", "mapName", "groupId", "usage", "name", "toggled", "expanded", "index") VALUES
  ('gom1', 'default', 'g1', 'FOREGROUND', 'Infrastructure', 0, 1, 0),
  ('gom2', 'default', 'g2', 'FOREGROUND', 'Environment', 0, 1, 1),
  ('gom3', 'districts', 'g1', 'FOREGROUND', 'Infrastructure', 0, 1, 0);

-- Layer Instances in Groups
INSERT INTO "LayerInstance" ("id", "displayLayerId", "groupId", "usage", "visibleAtStart", "zIndex") VALUES
  ('li5', 'layer1', 'g1', 'FOREGROUND', 1, 5),
  ('li6', 'layer2', 'g1', 'FOREGROUND', 1, 4),
  ('li7', 'layer3', 'g2', 'FOREGROUND', 0, 3);

-- Tools
INSERT INTO "Tool" ("type", "title", "options", "createdBy", "createdDate") VALUES
  ('layerswitcher', 'Layer Switcher', '{}', 'admin', CURRENT_TIMESTAMP),
  ('search', 'Search Tool', '{}', 'admin', CURRENT_TIMESTAMP),
  ('print', 'Print Map', '{}', 'admin', CURRENT_TIMESTAMP),
  ('measure', 'Measure Tool', '{}', 'admin', CURRENT_TIMESTAMP),
  ('documenthandler', 'Info Documents', '{"folders": []}', 'admin', CURRENT_TIMESTAMP);

-- Tools on Maps (referencing auto-generated tool IDs)
INSERT INTO "ToolsOnMaps" ("mapName", "toolId", "active", "index", "target") VALUES
  ('default', (SELECT id FROM "Tool" WHERE type = 'layerswitcher' LIMIT 1), 1, 0, 'widgetLeft'),
  ('default', (SELECT id FROM "Tool" WHERE type = 'search' LIMIT 1), 1, 1, 'drawer'),
  ('default', (SELECT id FROM "Tool" WHERE type = 'print' LIMIT 1), 1, 2, 'controlButton'),
  ('default', (SELECT id FROM "Tool" WHERE type = 'measure' LIMIT 1), 1, 3, 'drawer'),
  ('default', (SELECT id FROM "Tool" WHERE type = 'documenthandler' LIMIT 1), 1, 4, 'drawer'),
  ('districts', (SELECT id FROM "Tool" WHERE type = 'layerswitcher' LIMIT 1), 1, 0, 'widgetLeft'),
  ('districts', (SELECT id FROM "Tool" WHERE type = 'print' LIMIT 1), 1, 1, 'controlButton');

-- Themes (Quick Access Presets)
INSERT INTO "Theme" ("mapName", "title", "owner", "description", "data", "createdBy", "createdDate") VALUES
  ('default', 'Summer Infrastructure', 'admin', 'Infrastructure visible, environment hidden', '{"visibleLayers": ["layer1", "layer2"]}', 'admin', CURRENT_TIMESTAMP),
  ('default', 'Environmental Focus', 'admin', 'Show only environmental layers', '{"visibleLayers": ["layer3"]}', 'admin', CURRENT_TIMESTAMP);
