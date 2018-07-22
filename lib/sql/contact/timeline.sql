WITH cusers AS (
  SELECT
    user_id AS id
  FROM
    get_users_for_contacts(ARRAY[$1::uuid])
),
timeline_content AS (
  (
    SELECT crm_tasks.id, due_date as "timestamp", 'crm_task' as "type"
    FROM crm_tasks
    INNER JOIN crm_associations ON crm_tasks.id = crm_associations.crm_task
    WHERE
      contact = $1::uuid
      AND crm_associations.deleted_at IS NULL
      AND crm_tasks.deleted_at IS NULL
  )
  UNION ALL
  (
    SELECT crm_activities.id, "timestamp", 'crm_activity' as "type"
    FROM crm_activities
    INNER JOIN crm_associations ON crm_activities.id = crm_associations.crm_activity
    WHERE
      contact = $1::uuid
      AND crm_associations.deleted_at IS NULL
      AND crm_activities.deleted_at IS NULL
  )
  UNION ALL
  (
    SELECT id, created_at as "timestamp", 'activity' as "type"
    FROM activities
    WHERE (reference = ANY(SELECT id FROM cusers))
          AND is_visible IS True
          AND deleted_at IS NULL
  )
),
with_total AS (
  SELECT *, (count(*) over())::int AS total
  FROM timeline_content
)
SELECT
  id, "timestamp", "type", total
FROM
  with_total
WHERE CASE
  WHEN $2::float IS NOT NULL THEN
    with_total."timestamp" <= to_timestamp($2)
  ELSE
    True
END
ORDER BY with_total."timestamp" DESC
LIMIT $3