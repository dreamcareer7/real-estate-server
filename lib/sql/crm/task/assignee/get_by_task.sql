SELECT
  a.id, a.user
FROM
  crm_tasks_assignees a
  JOIN crm_tasks t
    ON t.id = a.crm_task
  JOIN LATERAL user_brands(a.user, NULL) ub(brand)
    ON t.brand = ub.brand
WHERE
  a.crm_task = $1::uuid
  AND a.deleted_at IS NULL
