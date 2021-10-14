SELECT
  *
FROM
  showinghub.showable_listings AS s
  JOIN unnest($1::uuid[]) WITH ORDINALITY t(cid, ord) ON s.id = t.cid
ORDER BY
  t.ord
