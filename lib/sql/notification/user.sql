SELECT id
FROM notifications
WHERE notified_user = $1
AND NOT read
