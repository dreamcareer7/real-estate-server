const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE showings ADD COLUMN title text',

  `UPDATE
    showings AS s
  SET
    title = a.street_address
  FROM (
    SELECT l.id AS listing,
      ARRAY_TO_STRING(
        ARRAY[
          street_number,
          street_dir_prefix,
          street_name,
          street_suffix,
          CASE
            WHEN ad.unit_number IS NULL THEN NULL
            WHEN ad.unit_number = '' THEN NULL
            ELSE 'Unit ' || ad.unit_number END
        ], ' ', NULL
      ) AS street_address
    FROM
      listings AS l
      JOIN properties AS p
        ON l.property_id = p.id
      JOIN addresses AS ad
        ON p.address_id = ad.id
  ) AS a
  WHERE
    s.listing = a.listing
  `,

  `UPDATE
    showings AS s
  SET
    title = d.title
  FROM
    deals AS d
  WHERE d.id = s.deal`,

  `UPDATE
    showings AS s
  SET
    title = STDADDR_TO_JSON(s.address)->>'line1'
  WHERE
    address IS NOT NULL`,

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
