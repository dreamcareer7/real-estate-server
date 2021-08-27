UPDATE brand_triggers SET
  deleted_at = (CASE WHEN $1::boolean THEN NULL ELSE now() END)
WHERE
  id = $2::uuid
