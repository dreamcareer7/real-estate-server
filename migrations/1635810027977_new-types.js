const db = require('../lib/utils/db')

const migrations = [
  `ALTER TYPE template_type
  ADD VALUE 'Recruitment'`,

  `ALTER TYPE template_type
  ADD VALUE 'Event'`,

  `ALTER TYPE template_type
  ADD VALUE 'MarketReport'`,

  `ALTER TYPE template_type
  ADD VALUE 'Blank'`,

  `ALTER TYPE template_type
  ADD VALUE 'News'`,

  `ALTER TYPE template_type
  ADD VALUE 'Blog'`,
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
