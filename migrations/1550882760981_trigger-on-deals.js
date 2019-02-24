const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE OR REPLACE FUNCTION deals_updated_current_deal_context_trigger()
    RETURNS trigger AS
    $$
      BEGIN
        PERFORM update_current_deal_context(NEW.id);

        RETURN NEW;
      END;
    $$
    LANGUAGE PLPGSQL`,

  'DROP TRIGGER IF EXISTS update_current_deal_context ON deals',

  `CREATE TRIGGER update_current_deal_context AFTER INSERT OR UPDATE on deals
    FOR EACH ROW EXECUTE PROCEDURE deals_updated_current_deal_context_trigger()`,

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
