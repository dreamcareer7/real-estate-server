const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `
  WITH removed_message AS (
      UPDATE
        microsoft_messages
      SET
        deleted_at = now()
      WHERE
        message_id IS NULL
      RETURNING
        thread_key
    ), to_delete AS (
    (
      SELECT
        thread_key
      FROM
        removed_message
    ) EXCEPT (
      SELECT
        thread_key
      FROM
        google_messages
        JOIN google_credentials
          ON google_messages.google_credential = google_credentials.id
      WHERE
        google_messages.deleted_at IS NULL
        AND google_credentials.deleted_at IS NULL
    ) EXCEPT (
      SELECT
        thread_key
      FROM
        microsoft_messages
        JOIN microsoft_credentials
          ON microsoft_messages.microsoft_credential = microsoft_credentials.id
      WHERE
        microsoft_messages.deleted_at IS NULL
        AND microsoft_credentials.deleted_at IS NULL
    )
  )
  UPDATE
    email_threads
  SET
    message_count = 0,
    deleted_at = now()
  FROM
    to_delete
  WHERE
    email_threads.id = to_delete.thread_key;
  `,
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
