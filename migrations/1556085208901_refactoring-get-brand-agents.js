const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'DROP FUNCTION get_brand_agents(uuid)',

  `CREATE OR REPLACE FUNCTION get_brand_agents(id uuid) RETURNS TABLE (
   "user"     uuid,
   agent      uuid,
   mlsid      text,
   brand_user uuid,
   brand_role uuid,
   brand      uuid,
   enabled    boolean
) AS
$$
  SELECT
    users.id           as "user",
    agents.id          as agent,
    agents.mlsid       as mlsid,
    brands_users.id    as brand_user,
    brands_roles.id    as brand_role,
    brands_roles.brand as brand,
    (brands_users.deleted_at IS NULL AND brands_roles.deleted_at IS NULL) as enabled

  FROM users
  LEFT JOIN agents  ON users.agent = agents.id
  JOIN brands_users ON brands_users.user = users.id
  JOIN brands_roles ON brands_users.role = brands_roles.id
  WHERE
    users.user_type = 'Agent'
    AND
    brands_roles.brand IN(
      SELECT brand_children($1)
    )
$$
LANGUAGE sql`,

  `CREATE OR REPLACE FUNCTION propose_brand_agents(brand_id uuid, "user_id" uuid) RETURNS TABLE(
  "agent" uuid,
  "user" uuid,
  mlsid text,
  is_me boolean,
  has_contact boolean
)
AS
$$
  SELECT
  brand_agents.agent as "agent",
  brand_agents.user as "user",
  brand_agents.mlsid as mlsid,
  (
    CASE WHEN "user_id"::uuid IS NULL THEN false
        WHEN brand_agents.user = "user_id"::uuid THEN true
        ELSE false
    END
  )::boolean as is_me,
  (
    CASE WHEN "user_id"::uuid IS NULL THEN false ELSE
    (
      SELECT user_has_contact_with_another("user_id", brand_agents.user)
    ) END
  )::boolean as has_contact
  FROM get_brand_agents(brand_id) brand_agents
  WHERE enabled IS TRUE
$$
LANGUAGE sql`,

  'COMMIT'
]


const run = async () => {
  const conn = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
