UPDATE
  social_posts
SET
  deleted_at = now()
WHERE
  facebook_page = $1
