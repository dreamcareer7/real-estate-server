UPDATE microsoft_credentials
SET
  email = $2
WHERE
  id = $1