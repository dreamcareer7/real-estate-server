SELECT id
FROM alerts
WHERE shortlist = $1 AND
      archived = FALSE
ORDER BY created_at
DESC
