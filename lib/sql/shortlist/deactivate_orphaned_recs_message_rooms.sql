SELECT DISTINCT (message_room) FROM recommendations t
WHERE COALESCE(ARRAY_LENGTH(referring_alerts, 1), 0) = 0 AND
      referred_shortlist = $1 AND
      (SELECT COUNT(*) FROM messages where messages.message_room = t.message_room) = 0 AND
      (SELECT BOOL_OR(favorited) FROM recommendations r WHERE t.referred_shortlist = $1 AND t.object = r.object) = FALSE
