UPDATE
  emails
SET
  html = NULL,
  text = NULL
WHERE
  id = $1::uuid
