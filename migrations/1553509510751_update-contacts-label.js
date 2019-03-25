const db = require('../lib/utils/db')


// issue: https://gitlab.com/rechat/server/issues/1249
const migrations = [
  'BEGIN',
  
  `UPDATE contacts_attribute_defs SET labels = labels || ARRAY['WhatsApp'] WHERE name = 'phone_number'`,
  `UPDATE contacts_attribute_defs SET labels = array_remove(labels, 'Pager') WHERE name = 'phone_number';`,
  `UPDATE contacts_attribute_defs SET labels = labels || ARRAY['Investment Property'] WHERE section = 'Addresses'`,
  
  'COMMIT'
];

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
