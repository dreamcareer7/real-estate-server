INSERT INTO websites_hostnames (website, hostname, "default") VALUES ($1, LOWER($2), $3)
ON CONFLICT (LOWER(hostname)) DO NOTHING
RETURNING *
