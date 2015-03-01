SELECT id
FROM notifications
WHERE referred_user = $1
AND referred_shortlist = $2
