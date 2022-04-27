const db = require('../lib/utils/db')

const migrations = [
  `ALTER TYPE template_type
  ADD VALUE 'Ramadan'`,

  `ALTER TYPE template_type
  ADD VALUE 'BoxingDay'`,

  `ALTER TYPE template_type
  ADD VALUE 'EidalFitr'`,

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
