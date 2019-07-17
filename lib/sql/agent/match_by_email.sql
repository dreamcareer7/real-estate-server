SELECT agents.id,
       first_name,
       last_name
FROM agents
JOIN agents_emails ON agents.matrix_unique_id = agents_emails.mui
                  AND agents.mls = agents_emails.mls
WHERE LOWER(agents_emails.email) = LOWER($1)
LIMIT 1
