SELECT
  microsoft_threads.id,
  microsoft_credential,
  brand,
  subject,
  extract(epoch FROM first_message_date) AS first_message_date,
  extract(epoch FROM last_message_date) AS last_message_date,
  recipients,
  message_count,
  extract(epoch FROM microsoft_threads.created_at) AS created_at,
  extract(epoch FROM microsoft_threads.updated_at) AS updated_at
FROM
  microsoft_threads
  JOIN microsoft_credentials
    ON microsoft_credentials.id = microsoft_threads.microsoft_credential
  JOIN unnest($1::text[]) WITH ORDINALITY t(tkey, ord)
    ON microsoft_threads.id = t.tkey
ORDER BY
  t.ord
