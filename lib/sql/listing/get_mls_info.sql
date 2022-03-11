SELECT
  *,
  mls AS id,
  'mls_info' AS "type"
FROM
  mls_info
JOIN unnest($1::mls[]) WITH ORDINALITY t(m, ord) ON mls_info.mls = m
ORDER BY t.ord