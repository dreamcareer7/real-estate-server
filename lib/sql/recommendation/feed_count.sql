SELECT
    (COUNT(*))::INT AS count,
    'count' AS type
FROM recommendations
WHERE recommendations.referring_user = $1
  AND recommendations.referred_shortlist = $2
  AND recommendations.read IS FALSE
