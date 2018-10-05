WITH timeline_content AS (
  (
    SELECT crm_tasks.id, due_date as "timestamp", 'crm_task' as "type"
    FROM crm_tasks
    INNER JOIN crm_associations ON crm_tasks.id = crm_associations.crm_task
    WHERE
      contact = $1::uuid
      AND crm_tasks.brand = $2::uuid
      AND crm_associations.deleted_at IS NULL
      AND crm_tasks.deleted_at IS NULL
  )
  UNION ALL
  (
    SELECT
      id,
      created_at as "timestamp",
      'contact_attribute' AS "type"
    FROM
      contacts_attributes
    WHERE
      deleted_at IS NULL
      AND contact = $1::uuid
      AND attribute_type = 'note'
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
  WHEN $3::float IS NOT NULL THEN
    with_total."timestamp" <= to_timestamp($3)
  ELSE
    True
END
ORDER BY with_total."timestamp" DESC
LIMIT $4
