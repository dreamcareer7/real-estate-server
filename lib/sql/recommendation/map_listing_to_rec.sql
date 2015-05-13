SELECT id
FROM recommendations
WHERE referring_user = $1 AND
      referred_shortlist = $2 AND
      object = $3
LIMIT 1
