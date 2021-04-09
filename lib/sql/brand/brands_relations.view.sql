CREATE OR REPLACE VIEW brands_relations AS (
  SELECT id,
  (
    SELECT
      brands.name
    FROM
      brands as b
      JOIN brand_parents(brands.id) bp(id) using (id)
    WHERE
      b.brand_type = 'Office'
    LIMIT 1
  ) AS office,

  (
    SELECT
      brands.name
    FROM
      brands as b
      JOIN brand_parents(brands.id) bp(id) using (id)
    WHERE
      b.brand_type = 'Region'
    LIMIT 1
  ) AS region

  FROM
    brands
)
