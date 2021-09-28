INSERT INTO photos(
  matrix_unique_id,
  listing_mui,
  description,
  url,
  "order",
  exif,
  revision,
  mls
)
VALUES (
  $1::text,
  $2,
  $3,
  $4,
  $5,
  $6,
  $7,
  $8::mls
)
ON CONFLICT (matrix_unique_id, mls) WHERE (revision < $7) DO UPDATE SET
  description = $3,
  url = $4,
  "order" = $5,
  exif = $6,
  revision = $7,
  deleted_at = NULL

WHERE photos.matrix_unique_id = $1::text AND photos.mls = $8::mls

RETURNING id
