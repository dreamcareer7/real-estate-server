INSERT INTO websites_hostnames (website, hostname, "default") VALUES ($1, $2, $3)
ON CONFLICT (hostname) DO NOTHING
RETURNING *
