const db = require('../lib/utils/db')

// update microsoft_contacts set data = jsonb_set(data, '{photo}', '"url"', false) where id = uuid;

const migrations = [
  'BEGIN',

  'ALTER TABLE microsoft_contacts ADD COLUMN processed_photo BOOLEAN DEFAULT FALSE',
  'ALTER TABLE microsoft_contacts ADD COLUMN photo TEXT DEFAULT NULL',
  
  'ALTER TABLE google_contacts ADD COLUMN processed_photo BOOLEAN DEFAULT FALSE',
  'ALTER TABLE google_contacts ADD COLUMN photo TEXT DEFAULT NULL',


  'UPDATE microsoft_contacts SET photo = null, processed_photo = true',
  'UPDATE google_contacts    SET photo = null, processed_photo = true',

  'UPDATE microsoft_contacts SET photo = data->>\'photo\'  WHERE data->>\'photo\' <> \'\'  AND data->>\'photo\'  IS NOT NULL',
  'UPDATE google_contacts    SET photo = entry->>\'photo\' WHERE entry->>\'photo\' <> \'\' AND entry->>\'photo\' IS NOT NULL',

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
