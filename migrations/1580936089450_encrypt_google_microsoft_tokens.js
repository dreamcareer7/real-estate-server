const db = require('../lib/utils/db')
const KMS = require('../lib/models/KMS')

const migrations = [
  'BEGIN',

  'ALTER TABLE google_credentials ALTER COLUMN access_token  TYPE TEXT',
  'ALTER TABLE google_credentials ALTER COLUMN refresh_token TYPE TEXT',

  'ALTER TABLE google_credentials DROP CONSTRAINT IF EXISTS google_credentials_access_token_key',
  'ALTER TABLE google_credentials DROP CONSTRAINT IF EXISTS google_credentials_refresh_token_key',

  'ALTER TABLE microsoft_credentials DROP CONSTRAINT IF EXISTS microsoft_credentials_access_token_key',
  'ALTER TABLE microsoft_credentials DROP CONSTRAINT IF EXISTS microsoft_credentials_refresh_token_key',

  'COMMIT'
]

const encryptTokens = async (tokens) => {
  const promises = []

  promises.push(KMS.encrypt(new Buffer(tokens.access_token, 'utf-8')))
  promises.push(KMS.encrypt(new Buffer(tokens.refresh_token, 'utf-8')))

  const result = await Promise.all(promises)

  return {
    aToken: result[0],
    rToken: result[1]
  }
}

const run = async () => {
  const { conn } = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }


  const m_result = await conn.query('SELECT id, access_token, refresh_token FROM microsoft_credentials')

  for(const row of m_result.rows) {
    const tokens = {
      access_token: row.access_token,
      refresh_token: row.refresh_token
    }
    const { aToken, rToken } = await encryptTokens(tokens)
    console.log('xxxx a =>', aToken, '\nxxxx r =>', rToken)

    await conn.query('UPDATE microsoft_credentials SET access_token = $1, refresh_token = $2 WHERE id = $3', [aToken, rToken, row.id ])
  }


  const g_result = await conn.query('SELECT id, access_token, refresh_token FROM google_credentials')

  for(const row of g_result.rows) {
    const tokens = {
      access_token: row.access_token,
      refresh_token: row.refresh_token
    }
    const { aToken, rToken } = await encryptTokens(tokens)
    console.log('\nxxxx a =>', aToken, '\nxxxx r =>', rToken)

    await conn.query('UPDATE google_credentials SET access_token = $1, refresh_token = $2 WHERE id = $3', [aToken, rToken, row.id ])
  }


  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
