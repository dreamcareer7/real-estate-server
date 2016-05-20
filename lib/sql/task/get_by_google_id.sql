SELECT 'task' AS TYPE,
       * FROM tasks
WHERE google_id = $1
