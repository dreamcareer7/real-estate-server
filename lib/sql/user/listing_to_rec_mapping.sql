SELECT id
FROM recommendations
WHERE referred_shortlist = $1 AND
      referred_user = $2 AND
      object = $3
LIMIT 1
