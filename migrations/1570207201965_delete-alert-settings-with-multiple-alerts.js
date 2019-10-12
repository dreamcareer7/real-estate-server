const db = require('../lib/utils/db')

const migrations = [
  `CREATE OR REPLACE FUNCTION delete_alert_setting() RETURNS TRIGGER AS $$
  BEGIN
    DELETE FROM user_alert_settings
    WHERE "user" = OLD."user" AND
    alert IN (select id from alerts where room = OLD.room);

    RETURN OLD;
  END;
$$ LANGUAGE plpgsql;`
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
