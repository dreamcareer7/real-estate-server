const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE tasks                   ADD required BOOLEAN NOT NULL DEFAULT FALSE',
  'ALTER TABLE brands_checklists_tasks ADD required BOOLEAN NOT NULL DEFAULT FALSE',
  `ALTER TYPE activity_type
    ADD VALUE 'UserRequiredTask'`,
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
