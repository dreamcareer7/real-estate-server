INSERT INTO photos(
    matrix_unique_id,
    listing_mui,
    description,
    url,
    "order",
    exif,
    revision
)
VALUES ($1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7
)
ON CONFLICT (matrix_unique_id) WHERE (revision < $7) DO UPDATE SET
  description = $3,
  url = $4,
  "order" = $5,
  exif = $6,
  revision = $7

WHERE photos.matrix_unique_id = $1

RETURNING id
