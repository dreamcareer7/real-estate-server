SELECT agents.id,
       first_name,
       last_name
FROM agents
JOIN agents_emails ON agents.id = agents_emails.agent
WHERE LOWER(agents_emails.email) = LOWER($1)
LIMIT 1
