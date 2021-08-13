const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `DROP TRIGGER IF EXISTS update_deal_checklist_property_types ON deals;

CREATE TRIGGER update_deal_checklist_property_types AFTER UPDATE on deals
FOR EACH ROW
WHEN (OLD.property_type IS DISTINCT FROM NEW.property_type OR OLD.deal_type IS DISTINCT FROM NEW.deal_type)
EXECUTE PROCEDURE update_deal_checklist_property_types();`,
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
