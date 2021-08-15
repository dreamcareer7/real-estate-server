const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'CREATE INDEX envelopes_recipients_envelope ON envelopes_recipients(envelope)',
  'CREATE INDEX envelopes_documents_envelope ON envelopes_documents(envelope)',
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
