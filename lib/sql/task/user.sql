WITH tc AS (
  SELECT task_contacts.task AS task,
         ARRAY_AGG(contacts.contact_user) AS users
  FROM task_contacts
  INNER JOIN contacts
    ON task_contacts.contact = contacts.id
  GROUP BY task_contacts.task
)
SELECT id
FROM tasks
FULL JOIN tc
  ON id = tc.task
WHERE (
        "user" = $1 OR
        $1 = ANY(tc.users)
      ) AND
      CASE WHEN (ARRAY_LENGTH($2::text[], 1) IS NULL) THEN TRUE ELSE status::text = ANY($2::text[]) END AND
      deleted_at IS NULL
