const db = require('../lib/utils/db')
const htmlToText = require('html-to-text')

const add_column = 'ALTER TABLE email_campaigns ADD text text'
const get = 'SELECT id, html FROM email_campaigns'
const update = 'UPDATE email_campaigns SET text = $1 WHERE id = $2'

const run = async () => {
  const conn = await db.conn.promise()

  await conn.query('BEGIN')

  await conn.query(add_column)

  const { rows } = await conn.query(get)

  for(const row of rows) {
    const text = htmlToText.fromString(row.html, {
      ignoreImage: true,
      wordwrap: 130
    }).trim()

    await conn.query(update, [
      text,
      row.id
    ])
  }

  await conn.query('COMMIT')

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
