SELECT DISTINCT (message_room) FROM recommendations
WHERE COALESCE(ARRAY_LENGTH(referring_alerts, 1), 0) = 0 AND
      referred_shortlist = $1 AND
      (SELECT COUNT(*) FROM messages where messages.message_room = recommendations.message_room) = 0
