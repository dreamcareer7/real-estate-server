SELECT id
FROM alerts
WHERE room = $1 AND
      archived = FALSE
ORDER BY created_at
DESC
