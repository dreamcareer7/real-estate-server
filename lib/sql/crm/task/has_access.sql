SELECT
  id,
  check_task_read_access(crm_tasks, $2) AS "read",
  check_task_write_access(crm_tasks, $2) AS "write"
FROM
  crm_tasks
JOIN unnest($1::uuid[]) WITH ORDINALITY t(did, ord) ON crm_tasks.id = did
