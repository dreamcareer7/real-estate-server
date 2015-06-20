UPDATE recommendations
SET hidden = TRUE
WHERE COALESCE(ARRAY_LENGTH(referring_alerts, 1), 0) = 0 AND
      referred_shortlist = $1
