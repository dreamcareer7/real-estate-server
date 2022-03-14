UPDATE
  social_posts
SET
  deleted_at = now()
WHERE
  id = $1
