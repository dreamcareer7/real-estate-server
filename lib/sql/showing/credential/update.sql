UPDATE
  showings_credentials
SET
  username = $1,
  password = $2,
  selected_location = $3,
  selected_location_string = $4
WHERE "user" = $5 AND brand = $6