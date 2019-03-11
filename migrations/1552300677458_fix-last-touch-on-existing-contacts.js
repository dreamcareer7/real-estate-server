const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `WITH to_update AS (
    SELECT array_agg(contact) AS ids FROM crm_associations WHERE deleted_at IS NULL
  ),
  lt AS (
    SELECT ltc.* FROM to_update, get_last_touch_for_contacts(to_update.ids) AS ltc
  ),
  nt AS (
    SELECT ntc.* FROM to_update, get_next_touch_for_contacts(to_update.ids) AS ntc
  )
  UPDATE
    contacts
  SET
    last_touch = tt.last_touch,
    next_touch = tt.next_touch
  FROM (
    SELECT
      nt.contact,
      lt.last_touch,
      nt.next_touch
    FROM
      lt
      JOIN nt
        ON lt.contact = nt.contact
  ) tt
  WHERE
    tt.contact = contacts.id
  RETURNING
    contacts.id
  `,
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
