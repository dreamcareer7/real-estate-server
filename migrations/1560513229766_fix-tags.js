const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `INSERT INTO
    crm_tags (
      brand,
      created_at,
      updated_at,
      created_by,
      updated_by,
      tag
    )
  SELECT DISTINCT ON (c.brand, ca.text)
    c.brand,
    ca.created_at,
    ca.updated_at,
    ca.created_by,
    ca.updated_by,
    ca.text
  FROM
    contacts AS c
    JOIN contacts_attributes AS ca
      ON c.id = ca.contact
  WHERE
    c.deleted_at IS NULL
    AND ca.deleted_at IS NULL
    AND ca.attribute_type = 'tag'
  ORDER BY
    c.brand,
    ca.text,
    ca.created_at
  ON CONFLICT (brand, tag) WHERE deleted_at IS NULL DO NOTHING;`,
  'COMMIT'
]


const run = async () => {
  const conn = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
