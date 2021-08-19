DELETE FROM
  contacts_duplicate_clusters
WHERE
  contact = ANY($1::uuid[])
RETURN
  cluster
