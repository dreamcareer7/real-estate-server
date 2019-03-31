const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `UPDATE contacts_attribute_defs
    SET singular = TRUE WHERE name = 'website'`,

  `CREATE OR REPLACE FUNCTION my_func(network TEXT) 
    RETURNS VOID
    LANGUAGE plpgsql
    AS $$
      BEGIN
    
        WITH to_update AS (
          SELECT
            id
          FROM
            contacts_attributes AS parent
          WHERE
            attribute_type='social'
            AND text LIKE '%' || network || '%'
            AND deleted_at IS NULL
            AND id = '1170ea99-8183-4dbb-a7d9-4ad8e3886723'
            AND NOT EXISTS (
              SELECT
                id
              FROM
                contacts_attributes AS child
              WHERE
                child.attribute_type = network
                AND child.contact = parent.contact
                AND child.deleted_at IS NULL
            )
        )
        UPDATE contacts_attributes
        SET
          attribute_def = (SELECT id FROM contacts_attribute_defs WHERE name = network AND global IS TRUE),
          attribute_type = network
        FROM
          to_update
        WHERE
          contacts_attributes.id = to_update.id;
    
      END;
  $$`,

  `SELECT
    my_func('facebook')`,

  `SELECT
    my_func('instagram')`,

  `SELECT
    my_func('linkedin')`,
  
  'DROP FUNCTION my_func(TEXT)',

  `UPDATE contacts_attributes
    SET deleted_at = NOW() WHERE attribute_type='social'`,

  `UPDATE contacts_attribute_defs
    SET deleted_at = NOW() WHERE name = 'social'`,

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