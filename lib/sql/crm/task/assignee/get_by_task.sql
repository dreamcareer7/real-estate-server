SELECT
  a.id, a.user
FROM
  crm_tasks_assignees a
  JOIN crm_tasks t
    ON t.id = a.crm_task
  JOIN brands_roles br
    ON br.brand = t.brand
  JOIN brands_users bu
    ON bu.role = br.id
WHERE
  a.crm_task = $1::uuid
  AND a.deleted_at IS NULL
  AND br.deleted_at IS NULL
  AND bu.deleted_at IS NULL
  AND bu.user = a.user
