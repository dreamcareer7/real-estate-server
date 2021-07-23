const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE OR REPLACE FUNCTION propose_brand_agents(brand_id uuid, "user_id" uuid) RETURNS TABLE(
  "agent" uuid,
  mui    bigint,
  mls    mls,
  "user" uuid,
  is_me boolean,
  has_contact boolean
)
AS
$$
  WITH peers AS (
    SELECT DISTINCT contacts_users.user as "user"
    FROM contacts
    JOIN contacts_users ON contacts.id = contacts_users.contact
    WHERE contacts.user =  user_id
  )

  SELECT 
  brand_agents.agent as "agent",
  brand_agents.mui   as mui,
  brand_agents.mls   as mls,
  brand_agents.user  as "user",
  (
    CASE WHEN user_id::uuid IS NULL THEN false
        WHEN brand_agents.user = user_id::uuid THEN true
        ELSE false
    END
  )::boolean as is_me,

  peers.user IS NOT NULL as has_contact

  FROM get_brand_agents(brand_id) brand_agents
  LEFT JOIN peers ON peers.user = brand_agents.user
  WHERE enabled IS TRUE
$$
STABLE
PARALLEL SAFE
LANGUAGE sql;`,

  'DROP FUNCTIOn user_has_contact_with_another',
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
