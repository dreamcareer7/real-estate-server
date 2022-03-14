UPDATE
  social_posts
SET
  failed_at = NOW(),
  failure = $2
WHERE
  id = $1
