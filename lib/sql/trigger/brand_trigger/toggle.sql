UPDATE brand_triggers AS bt SET
  bt.deleted_at = (CASE WHEN $1::boolean THEN NULL ELSE now() END)
WHERE
  bt.id = $2::uuid AND
  bt.brand = $3::uuid
  
