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
      crm_activity = crm_activities.id
      AND deleted_at IS NULL
  ) as associations,
  get_files_by_role('CrmActivity', crm_activities.id) as files,
  brand,
  created_by,
  'crm_activity' as "type"
FROM
  crm_activities
JOIN unnest($1::uuid[]) WITH ORDINALITY t(did, ord) ON crm_activities.id = did
ORDER BY t.ord