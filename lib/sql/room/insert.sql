INSERT INTO rooms(
    room_type,
    title,
    owner)
VALUES ($1,
        $2,
        $3)
RETURNING id
