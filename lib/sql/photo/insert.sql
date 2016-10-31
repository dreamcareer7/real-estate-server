INSERT INTO photos(
    matrix_unique_id,
    listing_mui,
    description,
    url,
    "order")
VALUES ($1,
        $2,
        $3,
        $4,
        $5)
ON CONFLICT (matrix_unique_id) DO UPDATE SET
  description = $3,
  "order" = $5,
  url = null,
  last_processed = null,
  revision = photos.revision + 1
  WHERE photos.matrix_unique_id = $1
RETURNING id