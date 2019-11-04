const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'DROP TRIGGER update_microsoft_threads_on_new_messages ON microsoft_messages',
  'DROP FUNCTION update_microsoft_threads_on_new_messages()',

  `CREATE OR REPLACE FUNCTION update_microsoft_threads_on_new_messages() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
    BEGIN
      INSERT INTO microsoft_threads (
        id,
        microsoft_credential,
        "subject",
        first_message_date,
        last_message_date,
        recipients,
        message_count
      )
      (
        WITH thread_recipients AS (
          SELECT
            thread_key, array_agg(DISTINCT recipient) AS recipients
          FROM
            new_messages, unnest(recipients) AS t(recipient)
          GROUP BY
            thread_key
        )
        SELECT DISTINCT ON (new_messages.thread_key)
          new_messages.thread_key,
          microsoft_credential,
          last_value(subject) OVER (w) AS "subject",
          min(message_date) OVER (w) AS first_message_date,
          max(message_date) OVER (w) AS last_message_date,
          thread_recipients.recipients AS recipients,
          count(*) OVER (w) AS message_count
        FROM
          new_messages
          JOIN thread_recipients USING (thread_key)
        WINDOW w AS (PARTITION BY thread_key ORDER BY message_date)
        ORDER BY
          new_messages.thread_key, message_date
      )
      ON CONFLICT (id) DO UPDATE SET
        updated_at = now(),
        last_message_date = EXCLUDED.last_message_date,
        recipients = EXCLUDED.recipients,
        message_count = EXCLUDED.message_count;
    
      RETURN NULL;
    END;
  $$`,
  `CREATE TRIGGER update_microsoft_threads_on_new_messages
    AFTER INSERT ON microsoft_messages
    REFERENCING NEW TABLE AS new_messages
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_microsoft_threads_on_new_messages()`,

  'DROP TRIGGER update_google_threads_on_new_messages ON google_messages',
  'DROP FUNCTION update_google_threads_on_new_messages()',
  
  `CREATE OR REPLACE FUNCTION update_google_threads_on_new_messages() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
    BEGIN
      INSERT INTO google_threads (
        id,
        google_credential,
        "subject",
        first_message_date,
        last_message_date,
        recipients,
        message_count
      )
      (
        WITH thread_recipients AS (
          SELECT
            thread_key, array_agg(DISTINCT recipient) AS recipients
          FROM
            new_messages, unnest(recipients) AS t(recipient)
          GROUP BY
            thread_key
        )
        SELECT DISTINCT ON (new_messages.thread_key)
          new_messages.thread_key,
          google_credential,
          last_value(subject) OVER (w) AS "subject",
          min(message_date) OVER (w) AS first_message_date,
          max(message_date) OVER (w) AS last_message_date,
          thread_recipients.recipients AS recipients,
          count(*) OVER (w) AS message_count
        FROM
          new_messages
          JOIN thread_recipients USING (thread_key)
        WINDOW w AS (PARTITION BY thread_key ORDER BY message_date)
        ORDER BY
          new_messages.thread_key, message_date
      )
      ON CONFLICT (id) DO UPDATE SET
        updated_at = now(),
        last_message_date = EXCLUDED.last_message_date,
        recipients = EXCLUDED.recipients,
        message_count = EXCLUDED.message_count;
    
      RETURN NULL;
    END;
  $$`,

  `CREATE TRIGGER update_google_threads_on_new_messages
    AFTER INSERT ON google_messages
    REFERENCING NEW TABLE AS new_messages
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_google_threads_on_new_messages()`,

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