UPDATE
  facebook_pages
SET
  deleted_at = now()
WHERE
  id = $1