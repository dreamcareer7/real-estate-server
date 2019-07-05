INSERT INTO open_houses
(
  start_time,
  end_time,
  description,
  listing_mui,
  refreshments,
  type,
  tz,
  matrix_unique_id,
  mls
) VALUES (
  $1,
  $2,
  $3,
  $4,
  $5,
  $6,
  $7,
  $8,
  $9::mls
)
ON CONFLICT (matrix_unique_id, mls) DO UPDATE SET
  start_time = $1,
  end_time = $2,
  description = $3,
  listing_mui = $4,
  refreshments = $5,
  type = $6,
  tz = $7,
  updated_at = CLOCK_TIMESTAMP()
  WHERE open_houses.matrix_unique_id = $8 AND open_houses.mls = $9::mls
RETURNING id
