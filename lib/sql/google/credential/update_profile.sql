UPDATE google_credentials
SET
  display_name = $1,
  first_name = $2,
  last_name = $3,
  photo = $4
WHERE
  id = $5