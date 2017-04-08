INSERT INTO photos(
    matrix_unique_id,
    listing_mui,
    description,
    url,
    "order",
    to_be_processed_at
)
VALUES ($1,
        $2,
        $3,
        $4,
        $5,
        CLOCK_TIMESTAMP()
)
ON CONFLICT (matrix_unique_id) DO UPDATE SET
  description = $3,
  "order" = $5,
  url = null,

   -- Mark for another update in 15 minutes from now.
   -- The reason is, apparently, when photos are updated in MLS
   -- their actually images are not updated immediately.
   -- So we have to delay actual download of the image for like 15 minutes.
   -- Otherwise, the image we get will be the old one we already had.

  to_be_processed_at = CLOCK_TIMESTAMP() + INTERVAL '15 minute'
  revision = photos.revision + 1

WHERE photos.matrix_unique_id = $1

RETURNING id