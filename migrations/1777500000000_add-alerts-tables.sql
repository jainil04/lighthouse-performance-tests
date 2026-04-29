-- Up Migration

CREATE TABLE alert_configs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id   UUID        NOT NULL REFERENCES targets(id) ON DELETE CASCADE,
  metric      TEXT        NOT NULL,
  threshold   NUMERIC     NOT NULL,
  comparison  TEXT        NOT NULL CHECK (comparison IN ('below', 'above')),
  enabled     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ NULL
);

-- Partial unique index: soft-deleted rows must not occupy the unique slot,
-- so a table-level UNIQUE constraint is wrong here.
CREATE UNIQUE INDEX idx_alert_configs_target_metric_active
  ON alert_configs(target_id, metric)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_alert_configs_target_enabled
  ON alert_configs(target_id)
  WHERE enabled = TRUE AND deleted_at IS NULL;

CREATE TABLE alert_events (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_config_id  UUID        NOT NULL REFERENCES alert_configs(id) ON DELETE CASCADE,
  run_id           UUID        NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  metric_value     NUMERIC     NOT NULL,
  threshold        NUMERIC     NOT NULL,
  email_sent_at    TIMESTAMPTZ,
  email_error      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alert_events_config
  ON alert_events(alert_config_id, created_at DESC);

-- Down Migration

DROP TABLE alert_events;
DROP TABLE alert_configs;
