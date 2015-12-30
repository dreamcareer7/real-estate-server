DELETE FROM task_contacts
WHERE "task" = $1 AND
      contact = $2
