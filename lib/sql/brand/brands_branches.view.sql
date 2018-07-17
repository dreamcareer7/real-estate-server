CREATE OR REPLACE VIEW brands_branches AS (
  SELECT id, (
    SELECT
      messages->>'branch_title' AS branch_title
    FROM
      brands as b
      JOIN brand_parents(brands.id) bp(id) using (id)
    WHERE
      messages->>'branch_title' IS NOT NULL
    LIMIT 1
  ) AS branch_title
  FROM
    brands
)
