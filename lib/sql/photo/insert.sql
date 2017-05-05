INSERT INTO photos(
    matrix_unique_id,
    listing_mui,
    description,
    url,
    "order",
    exif
)
VALUES ($1,
        $2,
        $3,
        $4,
        $5,
        $6
)
ON CONFLICT (matrix_unique_id) DO UPDATE SET
  description = $3,
  url = $4,
  "order" = $5,
  exif = $6,
  revision = photos.revision + 1

WHERE photos.matrix_unique_id = $1

RETURNING id