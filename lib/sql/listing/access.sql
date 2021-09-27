SELECT
  listings_filters.id
FROM
  listings_filters
  LEFT JOIN agents
    ON listings_filters.mls = agents.mls
WHERE
  listings_filters.id = ANY($1::uuid[])
  AND (
    public_display IS TRUE
    OR agents.id = $2::uuid
  )