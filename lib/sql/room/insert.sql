INSERT INTO rooms(
    room_type,
    client_type,
    title,
    owner)
VALUES ($1,
        $2,
        $3,
        $4)
RETURNING id
