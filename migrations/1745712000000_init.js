export const up = (pgm) => {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TABLE users (
      id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      email         TEXT        NOT NULL,
      password_hash TEXT        NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX users_email_idx ON users (email);

    CREATE TRIGGER users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TABLE targets (
      id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      url        TEXT        NOT NULL,
      label      TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX targets_user_id_idx ON targets (user_id);

    CREATE TABLE runs (
      id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      target_id    UUID        NOT NULL REFERENCES targets(id) ON DELETE CASCADE,
      user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      device       TEXT        NOT NULL,
      status       TEXT        NOT NULL DEFAULT 'pending',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );

    CREATE INDEX runs_target_id_idx ON runs (target_id);
    CREATE INDEX runs_user_id_idx   ON runs (user_id);

    CREATE TABLE metrics (
      id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      run_id     UUID        NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      name       TEXT        NOT NULL,
      value      NUMERIC     NOT NULL,
      unit       TEXT        NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX metrics_run_id_idx ON metrics (run_id);

    CREATE TABLE run_artifacts (
      id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      run_id     UUID        NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      lhr_json   JSONB       NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX run_artifacts_run_id_idx ON run_artifacts (run_id);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS run_artifacts;
    DROP TABLE IF EXISTS metrics;
    DROP TABLE IF EXISTS runs;
    DROP TABLE IF EXISTS targets;
    DROP TABLE IF EXISTS users;
    DROP FUNCTION IF EXISTS update_updated_at_column();
  `);
};