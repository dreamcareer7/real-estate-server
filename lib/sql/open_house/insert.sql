INSERT INTO open_houses
(
  start_time,
  end_time,
  description,
  listing_mui,
  refreshments,
  type,
  matrix_unique_id
) VALUES (
  $1,
  $2,
  $3,
  $4,
  $5,
  $6,
  $7
)
ON CONFLICT (matrix_unique_id) DO UPDATE SET
  start_time = $1,
  end_time = $2,
  description = $3,
  listing_mui = $4,
  refreshments = $5,
  type = $6,
  updated_at = NOW()
  WHERE open_houses.matrix_unique_id = $7
RETURNING id