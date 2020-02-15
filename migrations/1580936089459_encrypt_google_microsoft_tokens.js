const db = require('../lib/utils/db')
const KMS = require('../lib/models/KMS')

const migrations = []


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

    await conn.query('UPDATE microsoft_credentials SET access_token = $1, refresh_token = $2 WHERE id = $3', [aToken, rToken, row.id ])
  }


  const g_result = await conn.query('SELECT id, access_token, refresh_token FROM google_credentials')

  for(const row of g_result.rows) {
    const tokens = {
      access_token: row.access_token,
      refresh_token: row.refresh_token
    }
    const { aToken, rToken } = await encryptTokens(tokens)

    await conn.query('UPDATE google_credentials SET access_token = $1, refresh_token = $2 WHERE id = $3', [aToken, rToken, row.id ])
  }


  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
