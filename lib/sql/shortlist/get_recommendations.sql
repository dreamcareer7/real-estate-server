SELECT id
FROM recommendations
WHERE referred_shortlist = $1 AND
      object = $2
