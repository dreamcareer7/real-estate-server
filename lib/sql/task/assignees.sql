SELECT users.id
FROM task_contacts
INNER JOIN contacts
  ON task_contacts.contact = contacts.id
INNER JOIN users
  ON contacts.contact_user = users.id
WHERE task = $1
UNION SELECT "user"
FROM tasks
WHERE id = $1
