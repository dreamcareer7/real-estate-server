SELECT id
FROM recommendations
WHERE room = $1 AND
      listing = $2
LIMIT 1
