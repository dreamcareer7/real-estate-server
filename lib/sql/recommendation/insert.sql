INSERT INTO recommendations
(
  recommendation_type,
  source,
  source_url,
  referring_objects,
  room,
  listing
)
VALUES
(
  $1,
  $2,
  $3,
  $4,
  $5,
  $6
)
ON CONFLICT(room, listing) DO NOTHING
RETURNING id
