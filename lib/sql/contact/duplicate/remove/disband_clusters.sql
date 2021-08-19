DELETE FROM
  contacts_duplicate_clusters
WHERE
  cluster = ANY($1::int[])
RETURNING
  contact
