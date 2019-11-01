const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `DROP TABLE google_threads`,
  `DROP TABLE microsoft_threads`,

  `CREATE TABLE IF NOT EXISTS google_threads (
    id text NOT NULL PRIMARY KEY,
    google_credential uuid NOT NULL REFERENCES google_credentials (id),
    "subject" text,
    first_message_date timestamptz NOT NULL,
    last_message_date timestamptz,
    recipients text[],
    message_count int
  )`,
  `INSERT INTO google_threads (
    id,
    google_credential,
    "subject",
    first_message_date,
    last_message_date,
    recipients,
    message_count
  ) (
    WITH thread_recipients AS (
      SELECT
        thread_key, array_agg(DISTINCT recipient) AS recipients
      FROM
        google_messages, unnest(recipients) AS t(recipient)
      GROUP BY
        thread_key
    )
    SELECT DISTINCT ON (google_messages.thread_key)
      google_messages.thread_key,
      google_credential,
      last_value(subject) OVER (w) AS "subject",
      min(message_date) OVER (w) AS first_message_date,
      max(message_date) OVER (w) AS last_message_date,
      thread_recipients.recipients AS recipients,
      count(*) OVER (w) AS message_count
    FROM
      google_messages
      JOIN thread_recipients USING (thread_key)
    WINDOW w AS (PARTITION BY thread_key ORDER BY message_date)
    ORDER BY
      google_messages.thread_key, message_date
  )`,

  `CREATE TABLE IF NOT EXISTS microsoft_threads (
    id text NOT NULL PRIMARY KEY,
    microsoft_credential uuid NOT NULL REFERENCES microsoft_credentials (id),
    "subject" text,
    first_message_date timestamptz NOT NULL,
    last_message_date timestamptz,
    recipients text[],
    message_count int
  )`,
  `INSERT INTO microsoft_threads (
    id,
    microsoft_credential,
    "subject",
    first_message_date,
    last_message_date,
    recipients,
    message_count
  ) (
    WITH thread_recipients AS (
      SELECT
        thread_key, array_agg(DISTINCT recipient) AS recipients
      FROM
        microsoft_messages, unnest(recipients) AS t(recipient)
      GROUP BY
        thread_key
    )
    SELECT DISTINCT ON (microsoft_messages.thread_key)
      microsoft_messages.thread_key,
      microsoft_credential,
      last_value(subject) OVER (w) AS "subject",
      min(message_date) OVER (w) AS first_message_date,
      max(message_date) OVER (w) AS last_message_date,
      thread_recipients.recipients AS recipients,
      count(*) OVER (w) AS message_count
    FROM
      microsoft_messages
      JOIN thread_recipients USING (thread_key)
    WINDOW w AS (PARTITION BY thread_key ORDER BY message_date)
    ORDER BY
      microsoft_messages.thread_key, message_date
  )`,

  `CREATE OR REPLACE FUNCTION update_google_threads_on_new_messages() RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $$
    BEGIN
      INSERT INTO google_threads (
        id,
        "subject",
        google_credential,
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
      ON CONFLICT (thread_key) DO UPDATE SET
        updated_at = now(),
        last_message_date = EXCLUDED.last_message_date,
        recipients = EXCLUDED.recipients,
        message_count = EXCLUDED.message_count;
    END;
  $$`,
  `CREATE OR REPLACE FUNCTION update_microsoft_threads_on_new_messages() RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $$
    BEGIN
      INSERT INTO microsoft_threads (
        id,
        "subject",
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
      ON CONFLICT (thread_key) DO UPDATE SET
        updated_at = now(),
        last_message_date = EXCLUDED.last_message_date,
        recipients = EXCLUDED.recipients,
        message_count = EXCLUDED.message_count;
    END;
  $$`,
  `CREATE TRIGGER update_google_threads_on_new_messages
    AFTER INSERT ON google_messages
    REFERENCING NEW TABLE AS new_messages
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_google_threads_on_new_messages()`,
  `CREATE TRIGGER update_microsoft_threads_on_new_messages
    AFTER INSERT ON microsoft_messages
    REFERENCING NEW TABLE AS new_messages
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_microsoft_threads_on_new_messages()`,
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
