const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE crm_tags ALTER COLUMN created_by DROP NOT NULL',
  `WITH default_tags(tag, touch_freq) AS ( VALUES
    ('Warm List', 30),
    ('Hot List', 7),
    ('Past Client', 60),
    ('Seller', NULL),
    ('Agent', NULL),
    ('Buyer', NULL)
  ), missing_tags AS (
    SELECT
      brands.id AS brand, lower(default_tags.tag) AS tag
    FROM
      brands, default_tags
    WHERE
      brands.deleted_at IS NULL

    EXCEPT

    (
      SELECT
        brand, lower(tag) AS tag
      FROM
        crm_tags
      WHERE
        deleted_at IS NULL
    )
  )
  INSERT INTO crm_tags (
    brand,
    tag,
    touch_freq
  )
  SELECT
    m.brand, d.tag, d.touch_freq
  FROM
    missing_tags m JOIN default_tags d ON m.tag = lower(d.tag)
  `,
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
