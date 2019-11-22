SELECT
  google_threads.id,
  google_credential,
  brand,
  subject,
  extract(epoch FROM first_message_date) AS first_message_date,
  extract(epoch FROM last_message_date) AS last_message_date,
  recipients,
  message_count,
  extract(epoch FROM google_threads.created_at) AS created_at,
  extract(epoch FROM google_threads.updated_at) AS updated_at
FROM
  google_threads
  JOIN google_credentials
    ON google_credentials.id = google_threads.google_credential
  JOIN unnest($1::text[]) WITH ORDINALITY t(tkey, ord)
    ON google_threads.id = t.tkey
ORDER BY
  t.ord
