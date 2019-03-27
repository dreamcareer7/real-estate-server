INSERT INTO
  brands_lists (
    brand,
    name,
    filters,
    query,
    touch_freq,
    is_and_filter
  )
SELECT
  $1::uuid,
  name,
  filters,
  query,
  touch_freq,
  COALESCE(COALESCE(be.args, '{}'::jsonb)->>'filter_type' <> 'or', TRUE) AS is_and_filter
FROM
  json_to_recordset($2) AS be(
    name text,
    filters jsonb[],
    query text,
    touch_freq int,
    args jsonb
  )
RETURNING
  id
