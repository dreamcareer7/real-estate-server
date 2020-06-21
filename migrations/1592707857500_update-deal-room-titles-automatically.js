const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `DROP TRIGGER IF EXISTS update_deal_room_titles_trigger ON deals;

CREATE OR REPLACE FUNCTION update_deal_room_titles(deal_id uuid)
RETURNS void
LANGUAGE SQL
AS
$$
  UPDATE rooms SET title = deals.title || ': ' || tasks.title
    FROM deals
    JOIN deals_checklists dc ON deals.id = dc.deal
    JOIN tasks ON dc.id = tasks.checklist
    WHERE rooms.id = tasks.room AND deals.id = $1;
$$;


CREATE OR REPLACE FUNCTION update_deal_room_titles_trigger()
RETURNS trigger AS
$$
  BEGIN
    PERFORM update_deal_room_titles(deals.id) FROM deals WHERE id = NEW.id;

    RETURN NEW;
  END;
$$
LANGUAGE PLPGSQL;

CREATE TRIGGER update_deal_room_titles_trigger AFTER UPDATE on deals
  FOR EACH ROW EXECUTE PROCEDURE update_deal_room_titles_trigger();`,

  'SELECT update_deal_room_titles(id) FROM deals',

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
