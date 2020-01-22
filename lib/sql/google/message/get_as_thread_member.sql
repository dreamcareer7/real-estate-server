SELECT
  'gmail' AS origin,
  google_messages.id,
  google_credential AS "owner",
  google_credentials.email AS "owner_email",
  google_credentials.display_name AS "owner_name",
  message_id,
  thread_id,
  thread_key,
  internet_message_id,
  has_attachments,
  attachments,
  in_bound,
  is_read,
  COALESCE(subject, '') AS "subject",
  NULL AS "snippet",
  NULL AS "unique_body",
  NULL AS "html_body",
  NULL AS "text_body",
  "from",
  "to",
  cc,
  bcc,
  is_read,
  message_date
FROM
  google_messages
JOIN
  google_credentials on google_messages.google_credential = google_credentials.id
WHERE
  google_credential = $1
  AND message_id = $2