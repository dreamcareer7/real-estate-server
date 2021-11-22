WITH all_brands AS (
  SELECT
    b.id,
    ARRAY_AGG(bp.id) AS parents
  FROM
    brands AS b
    JOIN brands_roles AS br
      ON b.id = br.brand
    JOIN brands_users AS bu
      ON br.id = bu.role
    CROSS JOIN LATERAL brand_parents(b.id) AS bp(id)
  WHERE
    bu.user = $1::uuid
    AND b.deleted_at IS NULL
    AND br.deleted_at IS NULL
    AND bu.deleted_at IS NULL
  GROUP BY
    b.id
)
SELECT
  id
FROM
  all_brands ab1
WHERE
  NOT EXISTS (
    SELECT
      1
    FROM
      all_brands ab2
    WHERE
      ARRAY[ab2.id] && ab1.parents
      AND ab1.id != ab2.id
  );
