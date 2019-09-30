SELECT
  'outlook' AS origin,
  id,
  message_id,
  thread_id,
  thread_key,
  internet_message_id,
  has_attachments,
  attachments,
  in_bound,
  subject,
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
WHERE
  microsoft_credential = $1
  AND message_id = $2