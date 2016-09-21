WITH u AS
(
  SELECT id,
  (
    COALESCE(SIMILARITY(users.email, $1), 0) +
    COALESCE(SIMILARITY(users.phone_number, $1), 0) +
    COALESCE(SIMILARITY(users.first_name, $1), 0) +
    COALESCE(SIMILARITY(users.last_name, $1), 0)
  ) / 4.0 AS sim
  FROM users
  WHERE
    users.deleted_at IS NULL
  ORDER BY sim DESC
)
SELECT id,
       (COUNT(*) OVER())::INT AS total
FROM u
WHERE sim >= $3
LIMIT $2
