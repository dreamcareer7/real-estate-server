const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `INSERT INTO contacts_attribute_defs
  (
   name,
   data_type,
   label,
   section,
   required,
   global,
   singular,
   show,
   editable,
   searchable,
   has_label,
   labels
  )
  VALUES (
   'county',
   'text',
   'County',
   'Addresses',
   False,
   True,
   False,
   True,
   True,
   True,
   True,
   '{Home,Work,"Investment Property",Other}'::text[]
  )`,
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
