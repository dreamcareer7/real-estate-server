WITH cluster AS (
  SELECT
    d2.contact
  FROM
    contacts_duplicate_clusters d1
    JOIN contacts_duplicate_clusters d2
      ON d1.cluster = d2.cluster 
  WHERE
    d1.contact = $1::uuid
    AND d2.contact <> $1::uuid
    AND d2.cluster = $2
)
UPDATE
  contacts_duplicate_pairs AS cdp
SET
  ignored_at = NOW()
FROM
  cluster
WHERE
  cdp.brand = $3::uuid
  AND (
    (cdp.a = $1::uuid AND cdp.b = cluster.contact)
    OR (cdp.b = $1::uuid AND cdp.a = cluster.contact)
  )
RETURNING
  (CASE WHEN cdp.a = $1::uuid THEN cdp.b ELSE cdp.a END) AS contact
