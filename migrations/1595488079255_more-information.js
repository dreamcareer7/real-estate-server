const db = require('../lib/utils/db')

require('../lib/models/Envelope')
require('../lib/models/Context')

const createContext = (conn, cb) => {
  const context = Context.create()

  context.set({
    db: conn
  })

  context.run(cb)
}

const refresh = async docusign_user => {
  try {
    await Envelope.refreshToken(docusign_user)
    console.log('Done Refreshing', docusign_user.user)
  } catch(e) {
    if (e.error !== 'invalid_grant')
      throw e
  }
}

const fetch = conn => {
  return new Promise((resolve, reject) => {
    createContext(conn, async () => {
      const { rows } = await conn.query('SELECT * FROM docusign_users')

      console.log('Refreshing', rows.length, 'tokens')

      try {
        await Promise.all(rows.map(refresh))
        console.log('Done Refreshing')
        resolve()
      } catch(e) {
        console.log('Err', e)
        reject(e)
      }

    })
  })
}

const run = async () => {
  const { conn } = await db.conn.promise()

  await conn.query('BEGIN')

  await conn.query('ALTER TABLE docusign_users ADD first_name TEXT')
  await conn.query('ALTER TABLE docusign_users ADD last_name  TEXT')
  await conn.query('ALTER TABLE docusign_users ADD email      TEXT')

  await fetch(conn)

  await conn.query('DELETE FROM docusign_users WHERE first_name IS NULL and last_name IS NULL and email IS NULL')

  await conn.query('ALTER TABLE docusign_users ALTER first_name SET NOT NULL')
  await conn.query('ALTER TABLE docusign_users ALTER last_name  SET NOT NULL')
  await conn.query('ALTER TABLE docusign_users ALTER email      SET NOT NULL')

  await conn.query('COMMIT')

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
