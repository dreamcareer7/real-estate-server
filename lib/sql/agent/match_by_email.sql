SELECT id,
       first_name,
       last_name
FROM agents
WHERE agents.matrix_unique_id IN
(
  SELECT mui
  FROM agents_emails
  WHERE LOWER(email) = LOWER($1)
  LIMIT 1
)
LIMIT 1
