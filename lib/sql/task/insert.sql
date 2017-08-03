INSERT INTO tasks
(room, checklist, title, status, task_type, submission, form) VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id