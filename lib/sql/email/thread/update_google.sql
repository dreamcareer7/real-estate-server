INSERT INTO email_threads (
  id,
  google_credential,
  "user",
  brand,
  "subject",
  first_message_in_reply_to,
  first_message_date,
  last_message_date,
  recipients,
  message_count,
  has_attachments,
  is_read,
  deleted_at
)
(
  WITH thread_recipients AS (
    SELECT
      thread_key, array_agg(DISTINCT recipient) AS recipients
    FROM
      google_messages, unnest(recipients) AS t(recipient)
    WHERE
      google_messages.thread_key = ANY($1::text[])
    GROUP BY
      thread_key
  )
  SELECT DISTINCT ON (google_messages.thread_key)
    google_messages.thread_key,
    google_credential,
    google_credentials."user",
    google_credentials.brand,
    last_value(subject) OVER (w ORDER BY message_date) AS "subject",
    first_value(google_messages.in_reply_to) OVER (w ORDER BY message_date) AS first_message_in_reply_to,
    min(message_date) OVER (w) AS first_message_date,
    max(message_date) OVER (w) AS last_message_date,
    thread_recipients.recipients AS recipients,
    count(*) OVER (w) AS message_count,
    SUM(has_attachments::int) OVER (w) > 0 AS has_attachments,
    SUM(is_read::int) OVER (w) > 0 AS is_read,
    google_messages.deleted_at
  FROM
    google_messages
    JOIN google_credentials
      ON google_messages.google_credential = google_credentials.id
    JOIN thread_recipients USING (thread_key)
  WHERE
    google_messages.thread_key = ANY($1::text[])
    AND google_messages.deleted_at IS NULL
  WINDOW w AS (PARTITION BY thread_key)
  ORDER BY
    google_messages.thread_key, message_date
)
ON CONFLICT (id) DO UPDATE SET
  deleted_at = CASE WHEN EXCLUDED.deleted_at IS NOT NULL THEN EXCLUDED.deleted_at ELSE NULL END,
  updated_at = now(),
  last_message_date = EXCLUDED.last_message_date,
  recipients = (
    SELECT
      array_agg(DISTINCT recipient)
    FROM
      unnest(COALESCE(EXCLUDED.recipients, '{}'::text[])) u(recipient)
  ),
  message_count = EXCLUDED.message_count,
  has_attachments = EXCLUDED.has_attachments,
  is_read = EXCLUDED.is_read