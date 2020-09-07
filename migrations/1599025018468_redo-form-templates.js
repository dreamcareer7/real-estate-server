const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE brands_forms_templates RENAME TO brands_form_templates',
  'DELETE FROM brands_form_templates',
  'ALTER TABLE brands_form_templates DROP submission',
  'ALTER TABLE brands_form_templates DROP name',
  'ALTER TABLE brands_form_templates DROP deal_types',
  'ALTER TABLE brands_form_templates DROP property_types',
  'ALTER TABLE brands_form_templates ADD created_by uuid NOT NULL REFERENCES users(id)',
  'ALTER TABLE brands_form_templates ADD field TEXT NOT NULL',
  'ALTER TABLE brands_form_templates ADD value TEXT NOT NULL',
  'ALTER TABLE brands_form_templates ADD CONSTRAINT unique_brand_form UNIQUE(brand,form,field)',
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
