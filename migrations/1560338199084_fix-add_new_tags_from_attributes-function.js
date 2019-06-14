const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE OR REPLACE FUNCTION add_new_tags_from_attributes() RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
      BEGIN
        WITH new_tag_attrs AS (
          SELECT DISTINCT ON (ca.text)
            c.brand,
            ca.created_at,
            ca.created_by,
            ca.text AS tag
          FROM
            new_attrs AS ca
            JOIN contacts c
              ON ca.contact = c.id
          WHERE
            ca.deleted_at IS NULL
            AND c.deleted_at IS NULL
            AND ca.attribute_type = 'tag'
          ORDER BY
            ca.text,
            ca.created_at
        ), current_tags AS (
          SELECT
            tag
          FROM
            crm_tags
          WHERE
            brand = (SELECT brand FROM new_tag_attrs LIMIT 1)
            AND deleted_at IS NULL
        ), new_tags AS (
          SELECT
            tag
          FROM
            new_tag_attrs
    
          EXCEPT
    
          SELECT
            tag
          FROM
            current_tags
        )
        INSERT INTO
          crm_tags (
            brand,
            created_at,
            created_by,
            tag
          )
        SELECT
          brand,
          created_at,
          created_by,
          tag
        FROM
          new_tag_attrs
        WHERE
          tag IN (SELECT tag FROM new_tags);
    
        RETURN NULL;
      END;
    $$`,
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
