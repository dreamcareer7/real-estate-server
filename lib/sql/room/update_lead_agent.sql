UPDATE rooms
SET lead_agent = $2
WHERE id = $1
