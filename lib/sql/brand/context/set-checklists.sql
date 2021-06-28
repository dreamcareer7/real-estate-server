WITH to_delete AS (
  DELETE FROM brands_contexts_checklists
  WHERE context = $1 AND checklist IN(SELECT id FROM brands_checklists WHERE brand = $3)
)

INSERT INTO brands_contexts_checklists
  (context, checklist, is_required)
  SELECT
    $1,
    checklist,
    COALESCE(is_required,  FALSE)
  FROM json_populate_recordset(NULL::brands_contexts_checklists, $2::json)
  RETURNING id
