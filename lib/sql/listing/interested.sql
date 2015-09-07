SELECT DISTINCT(referred_shortlist) AS id
FROM recommendations
WHERE object = $1
