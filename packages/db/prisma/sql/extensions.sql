-- Prisma-external SQL for MyFinds (docs/model.md §2.3, ARCHITECTURE.md §5).
-- Run with: bunx --bun prisma db execute --file prisma/sql/extensions.sql --scheme packages/db
-- (db push cannot manage generated columns or triggers.)

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Weighted full-text search column: title (A) > brand+color (B) > description (C)
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "searchVector" tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', coalesce("title", '')), 'A') ||
  setweight(to_tsvector('simple', coalesce("brand", '') || ' ' || coalesce("color", '')), 'B') ||
  setweight(to_tsvector('simple', coalesce("description", '')), 'C')
) STORED;
CREATE INDEX IF NOT EXISTS report_search_idx ON "Report" USING GIN ("searchVector");
CREATE INDEX IF NOT EXISTS report_title_trgm_idx ON "Report" USING GIN ("title" gin_trgm_ops);

-- StatusHistory is append-only (explicit constraint: NO status history deletions)
CREATE OR REPLACE FUNCTION forbid_update_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'StatusHistory is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS status_history_append_only ON "StatusHistory";
CREATE TRIGGER status_history_append_only
  BEFORE UPDATE OR DELETE ON "StatusHistory"
  FOR EACH ROW EXECUTE FUNCTION forbid_update_delete();
