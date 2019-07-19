UPDATE
  showings_credentials
SET
  selected_location = $1,
  selected_location_string = $2
WHERE "user" = $3 AND brand = $4