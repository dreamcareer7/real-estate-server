UPDATE tasks
SET title = $1,
      due_date = $2
WHERE google_id = $3
