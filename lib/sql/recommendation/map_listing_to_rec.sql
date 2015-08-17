SELECT id
FROM recommendations
WHERE referred_user = $1 AND
      referred_shortlist = $2 AND
      object = $3
LIMIT 1
