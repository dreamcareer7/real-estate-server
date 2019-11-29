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
      microsoft_messages, unnest(recipients) AS t(recipient)
    WHERE
      microsoft_messages.thread_key = ANY($1::text[])
    GROUP BY
      thread_key
  )
  SELECT DISTINCT ON (microsoft_messages.thread_key)
    microsoft_messages.thread_key,
    microsoft_credential,
    microsoft_credentials."user",
    microsoft_credentials.brand,
    last_value(subject) OVER (w) AS "subject",
    first_value(microsoft_messages.in_reply_to) OVER (w) AS first_message_in_reply_to,
    min(message_date) OVER (w) AS first_message_date,
    max(message_date) OVER (w) AS last_message_date,
    thread_recipients.recipients AS recipients,
    count(*) OVER (w) AS message_count
  FROM
    microsoft_messages
    JOIN microsoft_credentials
      ON microsoft_messages.microsoft_credential = microsoft_credentials.id
    JOIN thread_recipients USING (thread_key)
  WHERE
    microsoft_messages.thread_key = ANY($1::text[])
    AND microsoft_messages.deleted_at IS NULL
  WINDOW w AS (PARTITION BY thread_key ORDER BY message_date)
  ORDER BY
    microsoft_messages.thread_key, message_date
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
