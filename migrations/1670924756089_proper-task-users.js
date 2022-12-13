const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  // For #2450
  `DELETE FROM rooms_users WHERE id IN(
    SELECT ru.id FROM tasks
    JOIN      rooms_users ru ON tasks.room = ru.room
    JOIN      deals_checklists dc ON dc.id = tasks.checklist
    JOIN      deals ON deals.id = dc.deal
    JOIN      users ON ru.user = users.id
    JOIN deals_roles dr  ON deals.id = dr.deal AND dr.user = users.id
    WHERE NOT(tasks.acl @> ARRAY['Agents']::task_acl[]) AND ru.notification_setting = 'N_ALL'
  )`,


  // For #2420
  `UPDATE rooms_users SET notification_setting = 'N_MENTIONS' WHERE id IN(
    SELECT ru.id FROM tasks
    JOIN      rooms_users ru ON tasks.room = ru.room
    JOIN      deals_checklists dc ON dc.id = tasks.checklist
    JOIN      deals ON deals.id = dc.deal
    JOIN      users ON ru.user = users.id
    LEFT JOIN deals_roles dr  ON deals.id = dr.deal AND dr.user = users.id
    WHERE NOT(tasks.acl @> ARRAY['Agents']::task_acl[])
    AND dr.id IS NOT NULL
    AND ru.notification_setting = 'N_ALL'
  )`,

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
