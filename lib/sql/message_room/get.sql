WITH invs AS
  (SELECT JSON_AGG("user") AS users,
          message_room
   FROM message_rooms_users
   WHERE message_room = $1
   GROUP BY message_room)
SELECT 'message_room' AS type,
       message_rooms.id,
       message_rooms.message_room_type,
       message_rooms.recommendation,
       message_rooms.shortlist,
       message_rooms.owner,
       invs.users,
       EXTRACT(EPOCH FROM created_at)::INT AS created_at,
       EXTRACT(EPOCH FROM updated_at)::INT AS updated_at
FROM message_rooms
LEFT JOIN invs ON message_rooms.id = invs.message_room
WHERE id = $1
