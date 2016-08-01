SELECT
  title,
  number,
  parent
FROM mls_areas
WHERE
(
  ($2::text IS NULL) OR (
    parent = ANY($2::int[])
  )
)
AND
(
  ($1::text IS NULL) OR (
    title ILIKE '%' || $1 || '%'
  )
)