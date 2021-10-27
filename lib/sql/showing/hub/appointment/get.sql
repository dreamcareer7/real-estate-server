SELECT
  *
FROM
  showinghub.appointments AS a
  JOIN unnest($1::uuid[]) WITH ORDINALITY t(cid, ord) ON a.id = t.cid
ORDER BY
  t.ord
