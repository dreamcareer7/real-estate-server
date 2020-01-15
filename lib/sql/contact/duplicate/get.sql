SELECT
  cluster AS id,
  array_agg(c.id ORDER BY c.updated_at) AS contacts,
  'contact_duplicate' AS "type"
FROM
  contacts_duplicate_clusters
  JOIN contacts AS c
    ON contacts_duplicate_clusters.contact = c.id
  JOIN unnest($1::int[]) WITH ORDINALITY t(cid, ord)
    ON contacts_duplicate_clusters.cluster = t.cid
WHERE
  deleted_at IS NULL
GROUP BY
  cluster
ORDER BY
  t.ord
