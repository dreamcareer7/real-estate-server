INSERT INTO tasks
(room, deal, title, status, task_type, submission) VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id