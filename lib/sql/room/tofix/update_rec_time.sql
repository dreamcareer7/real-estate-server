UPDATE recommendations
SET updated_at = NOW()
WHERE referred_room = $1 AND
      object = $2
