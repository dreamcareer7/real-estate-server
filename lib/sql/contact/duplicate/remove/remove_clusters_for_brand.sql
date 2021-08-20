DELETE FROM
  contacts_duplicate_clusters
WHERE
  cluster = ANY(
    SELECT
      cluster
    FROM
      contacts_duplicate_clusters cl
      JOIN contacts c
        ON c.id = cl.contact
    WHERE
      c.brand = $1::uuid
  )
