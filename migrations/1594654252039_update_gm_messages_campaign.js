const db = require('../lib/utils/db')

const run = async () => {
  const { conn } = await db.conn.promise()

  conn.query('BEGIN')


  const m_result = await conn.query('SELECT id,thread_key,google_credential,microsoft_credential FROM email_campaigns WHERE (google_credential IS NOT NULL OR microsoft_credential IS NOT NULL) AND thread_key IS NOT NULL')

  for(const row of m_result.rows) {
    const data = [row.id, row.thread_key ]

    if ( row.google_credential ) {
      await conn.query('UPDATE google_messages SET campaign = $1 WHERE thread_key = $2', data)
    }

    if ( row.microsoft_credential ) {
      await conn.query('UPDATE microsoft_messages SET campaign = $1 WHERE thread_key = $2', data)
    }
  }


  conn.query('COMMIT')

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
