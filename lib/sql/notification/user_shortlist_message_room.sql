SELECT id
FROM notifications
WHERE notified_user = $1
AND shortlist = $2
AND object_class = 'MessageRoom'
AND object = $3
