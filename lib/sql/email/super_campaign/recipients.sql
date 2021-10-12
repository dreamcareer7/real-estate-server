WITH rb AS (
  SELECT
    DISTINCT bc.id
  FROM
    super_campaigns_recipients AS r
    LATERAL CROSS JOIN brand_children(r.brand) AS bc(id)
  WHERE
    r.super_campaign = $1::uuid
)
SELECT
  b.id AS brand,
  bu.user
FROM
  rb
  JOIN brands_roles AS br
    ON rb.id = br.brand
  JOIN brands_users AS bu
    ON bu.role = br.id