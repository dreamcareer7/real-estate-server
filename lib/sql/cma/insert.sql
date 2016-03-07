INSERT INTO cmas
  (
    "user",
    room,
    suggested_price,
    comment,
    listings
  )
VALUES ($1, $2, $3, $4, $5) RETURNING id;
