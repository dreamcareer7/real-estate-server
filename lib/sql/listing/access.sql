SELECT
  listings_filters.id
FROM
  listings_filters
  LEFT JOIN agents
    ON listings_filters.mls = agents.mls
  JOIN unnest($1::uuid[]) WITH ORDINALITY t(lid, ord) ON listings_filters.id = lid
WHERE
  public_display IS TRUE
  OR agents.id = $2::uuid
ORDER BY
  t.ord
