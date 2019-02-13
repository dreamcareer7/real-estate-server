const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE IF NOT EXISTS crm_tags (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand uuid NOT NULL REFERENCES brands(id),

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz,
  
    created_by uuid NOT NULL REFERENCES users(id),
    updated_by uuid REFERENCES users(id),
    deleted_by uuid REFERENCES users(id),

    tag text NOT NULL,

    UNIQUE (brand, tag)
  )`,
  'CREATE INDEX crm_tags_brand_idx ON crm_tags (brand)',
  `INSERT INTO
    crm_tags (
      brand,
      created_at,
      created_by,
      tag
    )
  SELECT DISTINCT ON (c.brand, ca.text)
    c.brand,
    ca.created_at,
    ca.created_by,
    ca.text AS tag
  FROM
    contacts_attributes AS ca
    JOIN contacts c
      ON ca.contact = c.id
  WHERE
    ca.deleted_at IS NULL
    AND c.deleted_at IS NULL
    AND ca.attribute_type = 'tag'
  ORDER BY
    c.brand,
    ca.text,
    ca.created_at`,
  'COMMIT'
]

const run = async () => {
  const { conn, done } = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  done()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
