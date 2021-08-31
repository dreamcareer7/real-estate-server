const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE contacts ADD COLUMN tag_searchable text[]',
  'CREATE INDEX contacts_tag_idx ON contacts USING gin (tag_searchable)',
  `UPDATE
    contacts c
  SET
    tag_searchable = LOWER(tag::text)::text[]
  WHERE
    deleted_at IS NULL
    AND tag IS NOT NULL`,
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
