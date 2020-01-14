WITH cluster AS (
  SELECT
    array_agg(d.contact) AS ids
  FROM
    contacts_duplicate_clusters d
  WHERE
    AND d.cluster = $1
), combinations AS (
  SELECT
    combs
  FROM
    cluster,
    compute_combinations(cluster.ids) AS c(combs)
)
UPDATE
  contacts_duplicate_pairs AS cdp
SET
  ignored_at = NOW()
FROM
  combinations cmb
WHERE
  cdp.brand = $2::uuid
  AND (cdp.a = cmb.a AND cdp.b = cmb.b)
RETURNING
  cdp.a, cdp.b
