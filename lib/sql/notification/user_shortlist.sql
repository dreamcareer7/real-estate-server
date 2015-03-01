SELECT id
FROM notifications
WHERE referring_user = $1
AND referring_shortlist = $2
