INSERT INTO recommendations
(
  recommendation_type,
  source,
  source_url,
  referring_objects,
  room,
  listing,
  matrix_unique_id
)
VALUES
(
  $1,
  $2,
  $3,
  $4,
  $5,
  $6,
  $7
)
ON CONFLICT(room, listing) DO UPDATE SET source = EXCLUDED.source
RETURNING id
