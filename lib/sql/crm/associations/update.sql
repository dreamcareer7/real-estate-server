WITH to_update AS (
  SELECT * FROM json_to_recordset($1::json) AS t(
    id uuid,
    index int,
    metadata json
  )
)
UPDATE
  crm_associations
SET
  metadata = to_update.metadata,
  index = to_update.index
FROM
  to_update
WHERE
  to_update.id = crm_associations.id
