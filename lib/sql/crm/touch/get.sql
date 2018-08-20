SELECT
  id,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at,
  EXTRACT(EPOCH FROM deleted_at) AS deleted_at,
  "description",
  activity_type,
  outcome,
  EXTRACT(EPOCH FROM "timestamp") AS "timestamp",
  (
    SELECT
      ARRAY_AGG(id ORDER BY "created_at")
    FROM
      crm_associations
    WHERE
      touch = touches.id
      AND deleted_at IS NULL
  ) as associations,
  get_files_by_role('Touch', touches.id) as files,
  brand,
  created_by,
  'touch' as "type"
FROM
  touches
JOIN unnest($1::uuid[]) WITH ORDINALITY t(did, ord) ON touches.id = did
ORDER BY t.ord