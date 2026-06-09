-- CreateTable
CREATE TABLE "DocumentFolder" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "mapName" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdDate" TIMESTAMPTZ(3),
    "lastSavedBy" TEXT,
    "lastSavedDate" TIMESTAMPTZ(3),

    CONSTRAINT "DocumentFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{"chapters":[]}',
    "mapName" TEXT NOT NULL,
    "folderId" INTEGER NOT NULL,
    "createdBy" TEXT,
    "createdDate" TIMESTAMPTZ(3),
    "lastSavedBy" TEXT,
    "lastSavedDate" TIMESTAMPTZ(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentFolder_mapName_name_key" ON "DocumentFolder"("mapName", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Document_mapName_folderId_name_key" ON "Document"("mapName", "folderId", "name");

-- AddForeignKey
ALTER TABLE "DocumentFolder" ADD CONSTRAINT "DocumentFolder_mapName_fkey" FOREIGN KEY ("mapName") REFERENCES "Map"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_mapName_fkey" FOREIGN KEY ("mapName") REFERENCES "Map"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "DocumentFolder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
