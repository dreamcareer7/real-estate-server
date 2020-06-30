const db = require('../lib/utils/db')
const Crypto = require('../lib/models/Crypto')


const run = async () => {
  const { conn } = await db.conn.promise()

  const m_result = await conn.query('SELECT id, access_token, refresh_token FROM microsoft_credentials')

  for(const row of m_result.rows) {
    await conn.query('UPDATE microsoft_credentials SET access_token = $1, refresh_token = $2 WHERE id = $3', [
      Crypto.encrypt(row.access_token),
      Crypto.encrypt(row.refresh_token),
      row.id
    ])
  }


  const g_result = await conn.query('SELECT id, access_token, refresh_token FROM google_credentials')

  for(const row of g_result.rows) {
    await conn.query('UPDATE google_credentials SET access_token = $1, refresh_token = $2 WHERE id = $3', [
      Crypto.encrypt(row.access_token),
      Crypto.encrypt(row.refresh_token),
      row.id
    ])
  }


  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
