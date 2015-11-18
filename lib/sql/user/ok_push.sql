SELECT ((CURRENT_TIME(0) AT TIME ZONE users.timezone)::time > '08:30:00'::time) AND
       ((CURRENT_TIME(0) AT TIME ZONE users.timezone)::time < '21:30:00'::time) AS ok
FROM users
WHERE id = $1
