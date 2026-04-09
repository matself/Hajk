-- Allow multiple Service rows with the same url (and type). Primary key remains `id`.
-- Prisma/Postgres typically names this unique index `Service_url_type_key`.
DROP INDEX IF EXISTS "Service_url_type_key";
