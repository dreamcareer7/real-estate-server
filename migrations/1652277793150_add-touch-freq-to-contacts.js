const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `ALTER TABLE contacts
     ADD COLUMN touch_freq integer`,

  `WITH touch_freqs AS (
     SELECT lm.contact, l.touch_freq
     FROM
       crm_lists AS l
       JOIN crm_lists_members AS lm ON lm.list = l.id
     WHERE
       l.touch_freq IS NOT NULL AND
       l.deleted_at IS NULL AND
       lm.deleted_at IS NULL

     UNION ALL

     SELECT c.id AS contact, t.touch_freq
     FROM
       contacts AS c
       JOIN crm_tags AS t ON t.brand = c.brand AND t.tag = any(c.tag)
     WHERE
       t.touch_freq IS NOT NULL AND
       t.deleted_at IS NULL AND
       c.deleted_at IS NULL
   ), min_touch_freqs AS (
     SELECT
       tf.contact,
       min(tf.touch_freq) AS min_touch_freq
     FROM touch_freqs AS tf
     GROUP BY tf.contact
   )
   UPDATE contacts AS c SET
     touch_freq = mtf.min_touch_freq
   FROM min_touch_freqs AS mtf
   WHERE c.id = mtf.contact`,

  `CREATE OR REPLACE VIEW crm_touch_freqs AS (
     SELECT id AS contact, touch_freq from contacts
   )`,

  `CREATE OR REPLACE FUNCTION get_contact_touch_freqs(contact_ids uuid[])
   RETURNS TABLE (
     id uuid,
     touch_freq integer
   )
   STABLE LANGUAGE SQL AS $$
     SELECT id, touch_freq FROM contacts where id = ANY(contact_ids)
   $$`,
  
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
