const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE showings_roles ADD COLUMN agent uuid REFERENCES agents(id)',
  `WITH first_agent AS (
     SELECT DISTINCT ON (ua.user)
       ua.user, ua.agent
     FROM users_agents AS ua
     ORDER BY ua.user, ua.id
   )
   UPDATE showings_roles AS sr SET agent = fa.agent
     FROM first_agent AS fa
     WHERE fa.user = sr.user`,
  // XXX: is it safe to delete all showings_roles where agent is still null?
  'DELETE FROM showings_roles WHERE agent IS NULL',
  'ALTER TABLE showings_roles ALTER COLUMN agent SET NOT NULL',
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
