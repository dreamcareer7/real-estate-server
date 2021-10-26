const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE users_agents (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "user" uuid NOT NULL REFERENCES users(id),
    agent uuid NOT NULL REFERENCES agents(id)
  )`,
  `INSERT INTO users_agents ("user", agent)
   SELECT id, agent FROM users WHERE agent IS NOT NULL`,
  'ALTER TABLE users DROP agent',

  `CREATE OR REPLACE FUNCTION get_brand_agents(id uuid) RETURNS TABLE (
     "user"     uuid,
     agent      uuid,
     mui        bigint,
     mls        mls,
     brand_user uuid,
     brand_role uuid,
     brand      uuid,
     enabled    boolean
  ) AS
  $$
    SELECT
      users.id                as "user",
      agents.id               as agent,
      agents.matrix_unique_id as mui,
      agents.mls              as mls,
      brands_users.id         as brand_user,
      brands_roles.id         as brand_role,
      brands_roles.brand      as brand,
      (brands_users.deleted_at IS NULL AND brands_roles.deleted_at IS NULL) as enabled

    FROM users
    LEFT JOIN users_agents ON users_agents.user = users.id
    LEFT JOIN agents       ON users_agents.agent = agents.id
    JOIN brands_users      ON brands_users.user = users.id
    JOIN brands_roles      ON brands_users.role = brands_roles.id
    WHERE
      users.user_type = 'Agent'
      AND
      brands_roles.brand IN(
        SELECT brand_children($1)
      )
  $$
  STABLE
  PARALLEL SAFE
  LANGUAGE sql`,

  'COMMIT'
]


const run = async () => {
  const { conn } = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
