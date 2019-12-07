CREATE OR REPLACE FUNCTION update_microsoft_threads_on_new_messages() RETURNS trigger
LANGUAGE plpgsql
AS $$
  BEGIN
    INSERT INTO email_threads (
      id,
      microsoft_credential,
      "user",
      brand,
      "subject",
      first_message_in_reply_to,
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
        microsoft_credentials."user",
        microsoft_credentials.brand,
        last_value(subject) OVER (w) AS "subject",
        first_value(new_messages.in_reply_to) OVER (w) AS first_message_in_reply_to,
        min(message_date) OVER (w) AS first_message_date,
        max(message_date) OVER (w) AS last_message_date,
        thread_recipients.recipients AS recipients,
        count(*) OVER (w) AS message_count
      FROM
        new_messages
        JOIN microsoft_credentials
          ON new_messages.microsoft_credential = microsoft_credentials.id
        JOIN thread_recipients USING (thread_key)
      WINDOW w AS (PARTITION BY thread_key ORDER BY message_date)
      ORDER BY
        new_messages.thread_key, message_date
    )
    ON CONFLICT (id) DO UPDATE SET
      updated_at = now(),
      last_message_date = EXCLUDED.last_message_date,
      recipients = (
        SELECT
          array_agg(DISTINCT recipient)
        FROM
          unnest(COALESCE(email_threads.recipients, '{}'::text[]) || COALESCE(EXCLUDED.recipients, '{}'::text[])) u(recipient)
      ),
      message_count = email_threads.message_count + EXCLUDED.message_count;

    RETURN NULL;
  END;
$$
