SELECT DISTINCT (room) FROM recommendations t
WHERE COALESCE(ARRAY_LENGTH(referring_alerts, 1), 0) = 0 AND
      referred_room = $1 AND
      (SELECT COUNT(*) FROM messages where messages.room = t.room) = 0 AND
      (SELECT BOOL_OR(favorited) FROM recommendations r WHERE t.referred_room = $1 AND t.object = r.object) = FALSE
