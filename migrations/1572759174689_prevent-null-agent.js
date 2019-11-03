const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `ALTER TABLE email_campaigns_recipients ADD CONSTRAINT has_agent CHECK (
    (recipient_type = 'Agent' AND agent IS NOT NULL) OR (recipient_type <> 'Agent')
  )`,
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
