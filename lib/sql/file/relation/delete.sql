WITH to_be_deleted AS (
  SELECT * FROM json_populate_recordset(NULL::files_relations, $1)
),

ids AS  (
  SELECT fr.id FROM files_relations fr
  JOIN to_be_deleted tbd
  ON  fr.file    = tbd.file
  AND fr.role    = tbd.role
  AND fr.role_id = tbd.role_id
)

UPDATE files_relations SET deleted_at = NOW()
WHERE id IN(
  SELECT ids.id FROM ids
)
