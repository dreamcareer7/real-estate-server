INSERT INTO message_rooms(shortlist, message_room_type, owner, listing)
VALUES($1,
       $2,
       $3,
       $4)
RETURNING id;
