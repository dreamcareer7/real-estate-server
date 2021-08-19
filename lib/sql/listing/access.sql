SELECT
  id
FROM
  listings
  JOIN unnest($1::uuid[]) WITH ORDINALITY t(lid, ord) ON listings.id = lid
WHERE
  public_display IS TRUE
  OR mls = $2::mls
ORDER BY
  t.ord
