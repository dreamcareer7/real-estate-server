SELECT DISTINCT(referred_shortlist) AS id
FROM recommendations
WHERE object = $1 AND
      (favorited IS TRUE OR
       added_tour IS TRUE)
