UPDATE recommendations
SET status = CASE WHEN status = 'Unacknowledged' THEN 'Unpinned' ELSE status END
WHERE COALESCE(ARRAY_LENGTH(referring_alerts, 1), 0) = 0 AND
      referred_shortlist = $1
