-- Up Migration
ALTER TABLE runs ADD COLUMN runs_count INTEGER NOT NULL DEFAULT 1;

-- Down Migration
ALTER TABLE runs DROP COLUMN runs_count;