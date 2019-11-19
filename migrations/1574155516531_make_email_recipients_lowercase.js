const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `update google_messages SET
    "to" = lower("to"::text)::text[],
    cc   = lower(cc::text)::text[],
    bcc  = lower(bcc::text)::text[]`,

  'update google_messages set recipients = lower(recipients::text)::text[]',
  'update google_threads  set recipients = lower(recipients::text)::text[]',


  `update microsoft_messages SET
    "to" = lower("to"::text)::text[],
    cc   = lower(cc::text)::text[],
    bcc  = lower(bcc::text)::text[]`,

  'update microsoft_messages set recipients = lower(recipients::text)::text[]',
  'update microsoft_threads  set recipients = lower(recipients::text)::text[]',

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
