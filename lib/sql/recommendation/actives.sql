SELECT id,
       (COUNT(*) OVER())::INT AS total
FROM recommendations
WHERE recommendations.referring_user = $1 AND
      recommendations.referred_shortlist = $2 AND
      (SELECT COUNT(*) FROM messages WHERE messages.message_room = recommendations.message_room) > 0
ORDER BY updated_at DESC
