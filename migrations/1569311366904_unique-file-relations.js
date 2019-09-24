const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `WITH pairs AS (
    SELECT
      row_number() over(ORDER BY fr1.file, fr1.role, fr1.role_id) as num,
      fr1.id,
      fr1.file,
      fr1.role,
      fr1.role_id,
      fr1.deleted_at as d1,
      fr2.deleted_at as d2
    FROM files_relations fr1
    JOIN files_relations fr2
      ON  fr1.file = fr2.file
      AND fr1.role = fr2.role
      AND fr1.role_id = fr2.role_id
      AND fr1.id <> fr2.id
    ORDER BY num
  )
  DELETE FROM files_relations WHERE id IN (
    SELECT id FROM pairs WHERE num % 2 = 1
  )`,
  'ALTER TABLE files_relations ADD CONSTRAINT files_relations_unique UNIQUE(file, role, role_id)',
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
