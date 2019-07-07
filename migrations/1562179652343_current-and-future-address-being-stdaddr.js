const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE deals_roles RENAME current_address TO old_current_address',
  'ALTER TABLE deals_roles RENAME future_address  TO old_future_address',

  'ALTER TABLE deals_roles ADD current_address stdaddr',
  'ALTER TABLE deals_roles ADD future_address  stdaddr',

  `UPDATE deals_roles SET
    current_address = standardize_address('us_lex', 'us_gaz', 'us_rules', REPLACE(old_current_address, ', USA', ''))
    WHERE old_current_address IS NOT NULL AND LENGTH(old_current_address) > 0`,

  `UPDATE deals_roles SET
    future_address = standardize_address('us_lex', 'us_gaz', 'us_rules', REPLACE(old_future_address, ', USA', ''))
    WHERE old_current_address IS NOT NULL AND LENGTH(old_current_address) > 0`,

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
