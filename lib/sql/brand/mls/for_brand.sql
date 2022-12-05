SELECT DISTINCT
  mls
FROM
  brands_mls m
  JOIN brand_parents($1::uuid) p(id)
    ON m.brand = p.id
