SELECT id
FROM recommendations
WHERE referred_room = $1 AND
      object = $2
