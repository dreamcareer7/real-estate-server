INSERT INTO message_rooms(shortlist, message_room_type, owner)
VALUES($1,
       $2,
       $3)
RETURNING id;
