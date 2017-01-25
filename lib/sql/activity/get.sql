SELECT *,
       'contact_activity' AS type
FROM contacts_activities
WHERE id = $1
LIMIT 1
