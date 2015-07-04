SELECT id
FROM alerts
WHERE shortlist = $1
ORDER BY created_at
DESC
