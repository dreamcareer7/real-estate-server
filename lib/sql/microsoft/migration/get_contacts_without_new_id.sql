SELECT
  id,
  remote_id
FROM
  microsoft_contacts
WHERE
  microsoft_credential = $1 AND new_remote_id IS NULL AND source = 'contacts'
ORDER BY 
  id
LIMIT
  $2
OFFSET
  $3