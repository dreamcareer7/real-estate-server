const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  // remoce old duplicates
  `DELETE FROM 
      notifications_tokens 
    WHERE 
      notifications_tokens.id NOT IN
        ((SELECT id FROM (SELECT DISTINCT ON (channel) * FROM notifications_tokens) as sub) ORDER BY created_at DESC)`,

  'ALTER TABLE notifications_tokens DROP CONSTRAINT notifications_tokens_user_channel_key',
  'ALTER TABLE notifications_tokens ADD CONSTRAINT notifications_tokens_channel UNIQUE (channel)',
  
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


/*
  Manual Test:

  CREATE TABLE notifs_upsert_test (
    "user" VARCHAR not null,
    channel VARCHAR not null
  );

  ALTER TABLE notifs_upsert_test ADD CONSTRAINT notifs_upsert_test_channel_unique UNIQUE (channel)

  INSERT INTO notifs_upsert_test
    ("user", channel)
  VALUES
    ('abbas', 'mashayekh-channel'),
    ('emil', 'sedgh-channel'),
    ('saeed', 'vayghani-channel');

  -- check unique constraint
  DELETE FROM notifs_upsert_test WHERE "user"='saeed' AND channel='vayghani-channel';

  -- upsert query
  INSERT INTO notifs_upsert_test ("user", channel) VALUES ('saeed-new', 'vayghani-channel')
  ON CONFLICT (channel) DO UPDATE SET "user" = 'saeed-new';
*/