WITH aa as (
  SELECT activity
  FROM crm_associations
  WHERE contact = ANY($1) AND activity IS NOT NULL AND deleted_at IS NULL
),
ta as (
  SELECT crm_task
  FROM crm_associations
  WHERE contact = ANY($1) AND crm_task IS NOT NULL AND deleted_at IS NULL
)
SELECT *, count(*) over() as total FROM (
  (
    SELECT id, due_date as "timestamp", 'crm_task' as "type"
    FROM crm_tasks
    WHERE id = ANY(SELECT crm_task FROM ta) AND deleted_at IS NULL
  )
  UNION
  (
    SELECT id, created_at as "timestamp", 'activity' as "type"
    FROM activities
    WHERE (reference = ANY($1) OR id = ANY(SELECT activity FROM aa))
          AND is_visible = TRUE
          AND deleted_at IS NULL
  )
) as activ
ORDER BY activ."timestamp" DESC