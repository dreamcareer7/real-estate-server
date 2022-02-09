WITH input AS (
  SELECT
    matrix_unique_id,
    listing_mui,
    description,
    url,
    "order",
    revision,
    mls
  FROM json_populate_recordset(NULL::photos, $1::json)
)
INSERT INTO photos(
  matrix_unique_id,
  listing_mui,
  description,
  url,
  "order",
  revision,
  mls
)
SELECT * FROM input
ON CONFLICT (matrix_unique_id, mls) DO UPDATE SET
  description = EXCLUDED.description,
  url = EXCLUDED.url,
  "order" = EXCLUDED.order,
  revision = EXCLUDED.revision,
  deleted_at = NULL

WHERE photos.matrix_unique_id = EXCLUDED.matrix_unique_id AND photos.mls = EXCLUDED.mls AND photos.revision < EXCLUDED.revision

RETURNING id
