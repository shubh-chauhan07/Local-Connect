CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  role text NOT NULL,
  name text NOT NULL,
  email text NOT NULL
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON users TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_users" ON users;
CREATE POLICY "anon_select_users" ON users FOR SELECT
  TO anon, authenticated USING (true);
