WITH invs AS
  (SELECT JSON_AGG("user") AS users,
          message_room
   FROM message_rooms_users
   WHERE message_room = $1
   GROUP BY message_room)
SELECT 'message_room' AS type,
       message_rooms.id,
       message_rooms.message_room_type,
       message_rooms.listing,
       message_rooms.shortlist,
       message_rooms.owner,
       invs.users,
       (SELECT COUNT(*) FROM messages WHERE message_room = message_rooms.id AND image_url IS NOT NULL)::INT AS image_count,
       (SELECT COUNT(*) FROM messages WHERE message_room = message_rooms.id AND document_url IS NOT NULL)::INT AS document_count,
       (SELECT COUNT(*) FROM messages WHERE message_room = message_rooms.id AND video_url IS NOT NULL)::INT AS video_count,
       (SELECT COUNT(*) FROM messages WHERE message_room = message_rooms.id)::INT AS comment_count,
       (SELECT id FROM messages WHERE message_room = message_rooms.id ORDER BY messages.created_at DESC LIMIT 1) AS latest_message,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at
FROM message_rooms
LEFT JOIN invs ON message_rooms.id = invs.message_room
WHERE id = $1
