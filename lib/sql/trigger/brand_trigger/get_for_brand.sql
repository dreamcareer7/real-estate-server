SELECT
  bt.id
FROM
  brand_triggers AS bt
WHERE
  bt.brand = $1::uuid
ORDER BY
  bt.created_at
  
