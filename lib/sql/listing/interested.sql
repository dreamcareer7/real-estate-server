SELECT
  DISTINCT(rooms_users."user") AS id
FROM recommendations
FULL JOIN rooms_users
  ON rooms_users.room = recommendations.room
WHERE
  recommendations.listing = $1
