WITH timeline_content AS (
  (
    SELECT crm_tasks.id, due_date as "timestamp", 'crm_task' as "type"
    FROM crm_tasks
    INNER JOIN crm_associations ON crm_tasks.id = crm_associations.crm_task
    WHERE
      contact = ANY($1)
      AND crm_associations.deleted_at IS NULL
      AND crm_tasks.deleted_at IS NULL
  )
  UNION
  (
    SELECT crm_activities.id, "timestamp", 'crm_activity' as "type"
    FROM crm_activities
    INNER JOIN crm_associations ON crm_activities.id = crm_associations.crm_activity
    WHERE
      contact = ANY($1)
      AND crm_associations.deleted_at IS NULL
      AND crm_activities.deleted_at IS NULL
  )
  UNION
  (
    SELECT id, created_at as "timestamp", 'activity' as "type"
    FROM activities
    WHERE (reference = ANY($1))
          AND is_visible = TRUE
          AND deleted_at IS NULL
  )
)
SELECT *, (count(*) over())::INT as total FROM timeline_content
WHERE CASE
  WHEN $2::float IS NOT NULL THEN
    timeline_content."timestamp" <= to_timestamp($2)
  ELSE True
END
ORDER BY timeline_content."timestamp" DESC
LIMIT $3