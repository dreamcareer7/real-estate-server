(
  SELECT
    'gmail' AS origin,
    google_credential AS "owner",
    thread_key
  FROM
    google_messages
  WHERE
    thread_key = $1
  LIMIT 1
)
UNION ALL
(
  SELECT
    'outlook' AS origin,
    microsoft_credential AS "owner",
    thread_key
  FROM
    microsoft_messages
  WHERE
    thread_key = $1
  LIMIT 1
)