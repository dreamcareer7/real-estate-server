SELECT id
FROM notifications
WHERE object_class = 'Message' AND
      object = $1
LIMIT 1
