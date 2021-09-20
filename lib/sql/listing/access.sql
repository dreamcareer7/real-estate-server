SELECT
  listings.id
FROM
  listings
  LEFT JOIN agents
    ON listings.mls = agents.mls
  JOIN unnest($1::uuid[]) WITH ORDINALITY t(lid, ord) ON listings.id = lid
WHERE
  public_display IS TRUE
  OR agents.id = $2::uuid
ORDER BY
  t.ord
