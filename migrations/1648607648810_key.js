const db = require('../lib/utils/db')
const request = require('request-promise-native')

const config = {
  url: 'https://webapi.elliman.com/token?username=emil@rechat.com&password=Skiing4-Monetize-Excitable'
}

const QUERY = `
  WITH u AS (
    SELECT * FROM json_to_recordset($1) AS (
      username TEXT,
      key INT
    )
  )

  UPDATE de.users SET username = u.key FROM u WHERE u.username = de.users.username
`

const getToken = async () => {
  const { token } = await request({
    uri: config.url,
    json: true
  })

  return token
}

const run = async () => {
  const { conn } = await db.conn.promise()

  const token = await getToken()

  const users = await request({
    uri: 'https://staging.webapi.elliman.com/api/rechat/users',
    headers: {
      Authorization: `Bearer ${token}`
    },
    json: true
  })

  await conn.query('BEGIN')
  await conn.query(QUERY, [JSON.stringify(users)])
  await conn.query('ALTER TABLE de.users RENAME username TO key')
  await conn.query('ALTER TABLE de.agents_offices RENAME username TO key')
  await conn.query('ALTER TABLE de.admins_offices RENAME username TO key')

  await conn.query('COMMIT')

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
