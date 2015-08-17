SELECT id,
       (COUNT(*) OVER())::INT AS total
FROM recommendations
WHERE recommendations.referred_user = $1 AND
      recommendations.referred_shortlist = $2 AND
      (SELECT message_room_status FROM message_rooms WHERE id = recommendations.message_room) = 'Active'
ORDER BY updated_at DESC
