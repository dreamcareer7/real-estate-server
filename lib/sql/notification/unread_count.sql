SELECT COUNT(*) AS total_count
FROM notifications
WHERE notified_user = $1
AND read = FALSE
