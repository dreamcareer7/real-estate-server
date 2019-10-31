SELECT
  'outlook' AS origin,
  microsoft_messages.id,
  microsoft_credential AS "owner",
  microsoft_credentials.email AS "owner_email",
  microsoft_credentials.display_name AS "owner_name",
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
  message_date
FROM
  microsoft_messages
JOIN
  microsoft_credentials on microsoft_messages.microsoft_credential = microsoft_credentials.id
WHERE
  microsoft_credential = $1
  AND message_id = $2