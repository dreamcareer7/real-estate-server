UPDATE deals SET
  listing = $2,
  title = $3

WHERE id = $1
