SELECT
  bt.id
FROM
  brand_triggers AS bt
WHERE
  deleted_at IS NULL AND
  bt.brand = $1::uuid
ORDER BY
  bt.created_at
  
