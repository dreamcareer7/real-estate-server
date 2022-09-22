const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `WITH
   tag_def AS (
     SELECT
       def.id
     FROM contacts_attribute_defs AS def
     WHERE
       def.deleted_at IS NULL AND
       def.global IS TRUE AND
       def.name = 'tag'
     LIMIT 1
   ),
   unsub_data AS (
     SELECT
       ee.recipient,
       ec.brand,
       ec.created_by AS "user"
     FROM emails_events AS ee
     JOIN email_campaigns AS ec ON ec.id = ee.campaign
     WHERE
       ee.event = 'unsubscribed' AND
       ec.deleted_at IS NULL
   ),
   contacts_to_update AS (
     SELECT
       c.id,
       array_length(c.tag, 1) AS tag_count,
       ud.brand,
       ud.user
     FROM unsub_data AS ud
     -- TODO: take care of contact roles (lead assignment)
     JOIN contacts AS c ON c.brand = ud.brand AND c.user = ud.user
     LEFT JOIN unnest(c.tag) AS ct ON LOWER(ct) = 'unsubscribed'
     WHERE
       c.deleted_at IS NULL AND
       ct IS NULL
   ),
   insert_tag_attrs AS (
     INSERT INTO contacts_attributes (
       contact,
       created_by,
       index,
       attribute_def,
       "text",
       attribute_type,
       is_partner
     )
     SELECT
       c.id,
       c.user,
       c.tag_count,
       tag_def.id,
       'Unsubscribed',
       'Tag',
       FALSE
     FROM contacts_to_update AS c
     CROSS JOIN tag_def
   ),
   update_tag_summaries AS (
     UPDATE contacts AS c SET
       tag = c.tag || ARRAY['Unsubscribed']
     FROM contacts_to_update
     WHERE c.id = contacts_to_update.id
   )
   SELECT 1`,
  'COMMIT',
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
