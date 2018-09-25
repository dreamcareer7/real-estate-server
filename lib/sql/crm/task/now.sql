SELECT
  ct.id
FROM
  crm_tasks AS ct
  LEFT JOIN notifications AS n
    ON ct.id = n.subject
WHERE
  n.id IS NULL
  AND ct.id = n.object
  AND n.subject_class = 'CrmTask'
  AND n.object_class = 'CrmTask'
  AND ct.deleted_at IS NULL
  AND ct.due_date <  (now() + interval '20 seconds')
  AND ct.due_date >= (now() - interval '6 hours')
  AND ct.due_date >= ct.updated_at
