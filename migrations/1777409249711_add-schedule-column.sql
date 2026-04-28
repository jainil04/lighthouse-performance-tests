-- Up Migration
ALTER TABLE targets ADD COLUMN schedule TEXT;
ALTER TABLE targets ADD COLUMN scheduled_audits_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Down Migration
ALTER TABLE targets DROP COLUMN scheduled_audits_enabled;
ALTER TABLE targets DROP COLUMN schedule;
