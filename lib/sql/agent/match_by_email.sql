SELECT id
FROM agents
WHERE agents.matrix_unique_id IN
(
  SELECT mui
  FROM agents_emails
  WHERE LOWER(email) = $1
  LIMIT 1
)
LIMIT 1
