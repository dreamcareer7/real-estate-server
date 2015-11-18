UPDATE rooms
SET client_type = $1,
    title = $2,
    owner = $3,
    status = $4,
    lead_agent = $5,
    updated_at = NOW()
WHERE id = $6
