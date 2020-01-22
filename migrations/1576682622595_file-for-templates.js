const db = require('../lib/utils/db')
const config = require('../lib/config')

const migrations = [
  'BEGIN',
  'ALTER TABLE templates ADD file uuid REFERENCES files(id)',
  'COMMIT'
]


const run = async () => {
  const { conn } = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  const { rows } = await conn.query('SELECT id, url FROM templates')

  for(const row of rows) {
    const url = row.url.replace(config.cdns.public, '')

    const {
      rows: inserted
    } = await conn.query('INSERT INTO files (public, name, path) VALUES ($1, $2, $3) RETURNING id', [
      true,
      'index.html',
      `${url}/index.html`
    ])

    const id = inserted[0].id

    await conn.query('UPDATE templates SET file = $1 WHERE id = $2', [
      id,
      row.id
    ])
  }

  await conn.query('ALTER TABLE templates ALTER file SET NOT NULL')

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
