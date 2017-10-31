INSERT INTO tasks
(room, checklist, title, task_type, submission, form) VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id